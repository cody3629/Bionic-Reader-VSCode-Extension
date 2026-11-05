const vscode = require("vscode");
const {
  countEligibleWords,
  getEmphasisRangesForLines,
} = require("./reading-engine");

let decoration;
let timer;
let eligibleWordPrefixCache = new WeakMap();

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
    fontWeight: getConfig().get("fontWeight", "600"),
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
  });
}

const windowMargin = 100;

function getRenderWindows(editor) {
  const { visibleRanges } = editor;
  const lastDocumentLine = Math.max(0, editor.document.lineCount - 1);
  if (visibleRanges.length === 0) {
    return [
      { startLine: 0, endLine: Math.min(lastDocumentLine, windowMargin * 2) },
    ];
  }

  const windows = visibleRanges
    .map((range) => ({
      startLine: Math.max(0, range.start.line - windowMargin),
      endLine: Math.min(lastDocumentLine, range.end.line + windowMargin),
    }))
    .sort((a, b) => a.startLine - b.startLine);
  const merged = [];

  for (const window of windows) {
    const previous = merged.at(-1);
    if (previous && window.startLine <= previous.endLine) {
      previous.endLine = Math.max(previous.endLine, window.endLine);
    } else {
      merged.push(window);
    }
  }

  return merged;
}

function getEligibleWordPrefix(document, endLine, minimumWordLength) {
  let cache = eligibleWordPrefixCache.get(document);
  if (
    !cache ||
    cache.version !== document.version ||
    cache.minimumWordLength !== minimumWordLength
  ) {
    cache = {
      version: document.version,
      minimumWordLength,
      eligibleWordPrefixCounts: [0],
    };
    eligibleWordPrefixCache.set(document, cache);
  }

  while (cache.eligibleWordPrefixCounts.length <= endLine) {
    const line = cache.eligibleWordPrefixCounts.length - 1;
    cache.eligibleWordPrefixCounts.push(
      cache.eligibleWordPrefixCounts[line] +
        countEligibleWords(document.lineAt(line).text, minimumWordLength),
    );
  }

  return cache.eligibleWordPrefixCounts[endLine];
}

function invalidateEligibleWordPrefix(event) {
  const cache = eligibleWordPrefixCache.get(event.document);
  if (!cache) return;

  const firstChangedLine = event.contentChanges.reduce(
    (line, change) => Math.min(line, change.range.start.line),
    Infinity,
  );
  if (Number.isFinite(firstChangedLine)) {
    cache.eligibleWordPrefixCounts.length = Math.min(
      cache.eligibleWordPrefixCounts.length,
      firstChangedLine + 1,
    );
  } else {
    cache.eligibleWordPrefixCounts.length = 1;
  }
  cache.version = event.document.version;
}

function getRanges(document, windows) {
  const config = getConfig();
  const excluded = config.get("excludedLanguages", ["log"]);
  if (excluded.includes(document.languageId)) return [];

  const fixationStrength = config.get("fixationStrength", 0.35);
  const saccades = config.get("saccades", 0);
  const minimumWordLength = config.get("minimumWordLength", 1);
  const ranges = [];

  for (const { startLine, endLine } of windows) {
    const eligibleWordOffset =
      saccades === 0
        ? 0
        : getEligibleWordPrefix(document, startLine, minimumWordLength);
    const lines = [];
    for (let line = startLine; line <= endLine; line += 1) {
      lines.push({ line, text: document.lineAt(line).text });
    }

    if (saccades !== 0) {
      const cache = eligibleWordPrefixCache.get(document);
      for (const { line, text } of lines) {
        if (cache.eligibleWordPrefixCounts.length === line + 1) {
          cache.eligibleWordPrefixCounts.push(
            cache.eligibleWordPrefixCounts[line] +
              countEligibleWords(text, minimumWordLength),
          );
        }
      }
    }

    for (const item of getEmphasisRangesForLines(lines, {
      fixationStrength,
      saccades,
      minimumWordLength,
      eligibleWordOffset,
    })) {
      ranges.push(
        new vscode.Range(
          new vscode.Position(item.line, item.start),
          new vscode.Position(item.line, item.end),
        ),
      );
    }
  }

  return ranges;
}

function refreshEditor(editor) {
  if (!editor || !decoration) return;
  const isEnabled = getConfig().get("enabled", true);
  editor.setDecorations(
    decoration,
    isEnabled ? getRanges(editor.document, getRenderWindows(editor)) : [],
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

async function adjustStrength(delta) {
  const config = getConfig();
  const current = config.get("fixationStrength", 0.35);
  const next = Math.max(
    0.1,
    Math.min(1, Math.round((current + delta) * 100) / 100),
  );
  await updateSetting("fixationStrength", next);
  refreshVisibleEditors();
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
  refreshVisibleEditors();
  vscode.window.setStatusBarMessage(
    `Bionic minimum word length: ${next}`,
    2500,
  );
}

async function adjustSaccades(delta) {
  const config = getConfig();
  const next = Math.max(0, Math.min(10, config.get("saccades", 0) + delta));
  await updateSetting("saccades", next);
  refreshVisibleEditors();
  vscode.window.setStatusBarMessage(`Bionic saccades: ${next}`, 2500);
}

async function toggleSaccades() {
  const config = getConfig();
  const current = config.get("saccades", 0);
  const next = current === 0 ? 1 : 0;
  await updateSetting("saccades", next);
  refreshVisibleEditors();
  vscode.window.setStatusBarMessage(`Bionic saccades: ${next}`, 2500);
}

async function adjustDelay(integer) {
  const config = getConfig();
  const current = config.get("updateDelay", 120);
  const next = Math.max(0, current + integer);
  await updateSetting("updateDelay", next);
  vscode.window.setStatusBarMessage(`Bionic update delay: ${next} ms`, 2500);
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
    vscode.commands.registerCommand("bionicCodeReader.increaseDelay", () =>
      adjustDelay(10),
    ),
    vscode.commands.registerCommand("bionicCodeReader.decreaseDelay", () =>
      adjustDelay(-10),
    ),
    vscode.window.onDidChangeActiveTextEditor(refreshEditor),
    vscode.window.onDidChangeVisibleTextEditors(refreshVisibleEditors),
    vscode.window.onDidChangeTextEditorVisibleRanges(scheduleRefresh),
    vscode.workspace.onDidChangeTextDocument((event) => {
      invalidateEligibleWordPrefix(event);
      if (
        vscode.window.visibleTextEditors.some(
          (editor) => editor.document === event.document,
        )
      )
        scheduleRefresh();
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration("bionicCodeReader")) return;

      if (event.affectsConfiguration("bionicCodeReader.fontWeight")) {
        createDecoration();
      }

      refreshVisibleEditors();
    }),
  );

  refreshVisibleEditors();
}

function deactivate() {
  if (timer) clearTimeout(timer);
  if (decoration) decoration.dispose();
}

module.exports = { activate, deactivate };
