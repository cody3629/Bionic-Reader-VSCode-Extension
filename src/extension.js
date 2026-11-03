const vscode = require("vscode");
const { getEmphasisRanges } = require("./reading-engine");

let decoration;
let timer;

function getConfig() {
  return vscode.workspace.getConfiguration("bionicCodeReader");
}

function updateSetting(key, value) {
  const info = getConfig().inspect(key);
  const target =
    info?.workspaceValue !== undefined
      ? vscode.ConfigurationTarget.Workspace
      : vscode.ConfigurationTarget.Global;
  return getConfig().update(key, value, target);
}

function createDecoration() {
  if (decoration) decoration.dispose();
  decoration = vscode.window.createTextEditorDecorationType({
    fontWeight: getConfig().get("fontWeight", "700"),
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
  });
}

const windowMargin = 100;

function getRenderWindow(editor) {
  const { visibleRanges } = editor;
  if (visibleRanges.length === 0) {
    return { startLine: 0, endLine: windowMargin * 2 };
  }
  const first = Math.min(...visibleRanges.map((r) => r.start.line));
  const last = Math.max(...visibleRanges.map((r) => r.end.line));
  return {
    startLine: Math.max(0, first - windowMargin),
    endLine: last + windowMargin,
  };
}

function getRanges(document, lines) {
  const config = getConfig();
  const excluded = config.get("excludedLanguages", ["log"]);
  if (excluded.includes(document.languageId)) return [];

  const text = document.getText();
  return getEmphasisRanges(text, {
    fixationStrength: config.get("fixationStrength", 0.35),
    saccades: config.get("saccades", 0),
    minimumWordLength: config.get("minimumWordLength", 1),
    ...lines,
  }).map(
    (item) =>
      new vscode.Range(
        new vscode.Position(item.line, item.start),
        new vscode.Position(item.line, item.end),
      ),
  );
}

function refreshEditor(editor) {
  if (!editor || !decoration) return;
  const isEnabled = getConfig().get("enabled", true);
  editor.setDecorations(
    decoration,
    isEnabled ? getRanges(editor.document, getRenderWindow(editor)) : [],
  );
}

function refreshVisibleEditors() {
  for (const editor of vscode.window.visibleTextEditors) refreshEditor(editor);
}

function scheduleRefresh() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(
    refreshVisibleEditors,
    getConfig().get("updateDelay", 120),
  );
}

async function setEnabled(value) {
  await updateSetting("enabled", value);
  refreshVisibleEditors();
  vscode.window.setStatusBarMessage(
    `Bionic Code Reader ${value ? "enabled" : "disabled"}`,
    2500,
  );
}

function adjustStrength(delta) {
  const config = getConfig();
  const current = config.get("fixationStrength", 0.35);
  const next = Math.max(
    0.1,
    Math.min(1, Math.round((current + delta) * 100) / 100),
  );
  updateSetting("fixationStrength", next);
  scheduleRefresh();
  vscode.window.setStatusBarMessage(
    `Bionic fixation strength: ${Math.round(next * 100)}%`,
    2500,
  );
}

async function adjustMinimumWordLength(integer) {
  const config = getConfig();
  const current = config.get("minimumWordLength", 1);
  const next = Math.max(1, Math.min(20, current + integer));
  await updateSetting("minimumWordLength", next);
  scheduleRefresh();
  vscode.window.setStatusBarMessage(
    `Bionic minimum word length: ${next}`,
    2500,
  );
}

async function adjustSaccades(delta) {
  const config = getConfig();
  const next = Math.max(0, Math.min(10, config.get("saccades", 0) + delta));
  await updateSetting("saccades", next);
  scheduleRefresh();
  vscode.window.setStatusBarMessage(`Bionic saccades: ${next}`, 2500);
}

function toggleSaccades() {
  const config = getConfig();
  const current = config.get("saccades", 0);
  const next = current === 0 ? 1 : 0;
  updateSetting("saccades", next);
  scheduleRefresh();
  vscode.window.setStatusBarMessage(`Bionic saccades: ${next}`, 2500);
}

function activate(context) {
  createDecoration();

  context.subscriptions.push(
    vscode.commands.registerCommand("bionicCodeReader.toggle", async () => {
      await setEnabled(!getConfig().get("enabled", true));
    }),
    vscode.commands.registerCommand("bionicCodeReader.increaseStrength", () =>
      adjustStrength(0.05),
    ),
    vscode.commands.registerCommand("bionicCodeReader.decreaseStrength", () =>
      adjustStrength(-0.05),
    ),
    vscode.commands.registerCommand(
      "bionicCodeReader.increaseMinimumWordLength",
      () => adjustMinimumWordLength(1),
    ),
    vscode.commands.registerCommand(
      "bionicCodeReader.decreaseMinimumWordLength",
      () => adjustMinimumWordLength(-1),
    ),
    vscode.commands.registerCommand("bionicCodeReader.increaseSaccades", () =>
      adjustSaccades(1),
    ),
    vscode.commands.registerCommand("bionicCodeReader.decreaseSaccades", () =>
      adjustSaccades(-1),
    ),
    vscode.commands.registerCommand("bionicCodeReader.toggleSaccades", () => {
      toggleSaccades();
    }),
    vscode.window.onDidChangeActiveTextEditor(refreshEditor),
    vscode.window.onDidChangeVisibleTextEditors(refreshVisibleEditors),
    vscode.window.onDidChangeTextEditorVisibleRanges(scheduleRefresh),
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (
        vscode.window.visibleTextEditors.some(
          (editor) => editor.document === event.document,
        )
      )
        scheduleRefresh();
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("bionicCodeReader")) {
        createDecoration();
        refreshVisibleEditors();
      }
    }),
  );

  refreshVisibleEditors();
}

function deactivate() {
  if (timer) clearTimeout(timer);
  if (decoration) decoration.dispose();
}

module.exports = { activate, deactivate };
