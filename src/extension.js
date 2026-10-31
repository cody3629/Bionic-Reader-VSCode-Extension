const vscode = require('vscode');

let decoration;
let timer;
let enabled = true;
let updating = false;

function getConfig() {
  return vscode.workspace.getConfiguration('bionicCodeReader');
}

function createDecoration() {
  const weight = getConfig().get('fontWeight', '700');
  if (decoration) decoration.dispose();
  decoration = vscode.window.createTextEditorDecorationType({
    fontWeight: weight,
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
  });
}

function getRanges(document) {
  const config = getConfig();
  const strength = Math.max(0.1, Math.min(1, config.get('fixationStrength', 0.35)));
  const saccades = Math.max(0, config.get('saccades', 0));
  const excluded = config.get('excludedLanguages', ['log']);
  if (excluded.includes(document.languageId)) return [];

  const ranges = [];
  let wordIndex = 0;
  const wordPattern = /[\p{L}\p{N}_$]+/gu;

  for (let lineNumber = 0; lineNumber < document.lineCount; lineNumber++) {
    const line = document.lineAt(lineNumber).text;
    wordPattern.lastIndex = 0;
    let match;
    while ((match = wordPattern.exec(line)) !== null) {
      const word = match[0];
      const currentIndex = wordIndex++;
      if (saccades > 0 && currentIndex % (saccades + 1) !== 0) continue;

      const count = Math.max(1, Math.min(word.length, Math.ceil(word.length * strength)));
      ranges.push(new vscode.Range(
        lineNumber, match.index,
        lineNumber, match.index + count
      ));
    }
  }
  return ranges;
}

function refreshEditor(editor) {
  if (!editor || !decoration) return;
  if (!enabled || !getConfig().get('enabled', true)) {
    editor.setDecorations(decoration, []);
    return;
  }
  editor.setDecorations(decoration, getRanges(editor.document));
}

function refreshVisibleEditors() {
  if (updating) return;
  updating = true;
  try {
    for (const editor of vscode.window.visibleTextEditors) refreshEditor(editor);
  } finally {
    updating = false;
  }
}

function scheduleRefresh() {
  if (timer) clearTimeout(timer);
  const delay = getConfig().get('updateDelay', 120);
  timer = setTimeout(refreshVisibleEditors, delay);
}

function setEnabled(value) {
  enabled = value;
  getConfig().update('enabled', value, vscode.ConfigurationTarget.Global);
  refreshVisibleEditors();
  vscode.window.setStatusBarMessage(
    `Bionic Code Reader ${value ? 'enabled' : 'disabled'}`, 2500
  );
}

function adjustStrength(delta) {
  const config = getConfig();
  const current = config.get('fixationStrength', 0.35);
  const next = Math.max(0.1, Math.min(1, Math.round((current + delta) * 100) / 100));
  config.update('fixationStrength', next, vscode.ConfigurationTarget.Global);
  scheduleRefresh();
  vscode.window.setStatusBarMessage(`Bionic fixation strength: ${Math.round(next * 100)}%`, 2500);
}

function activate(context) {
  enabled = getConfig().get('enabled', true);
  createDecoration();

  context.subscriptions.push(
    vscode.commands.registerCommand('bionicCodeReader.toggle', () => setEnabled(!getConfig().get('enabled', true))),
    vscode.commands.registerCommand('bionicCodeReader.increaseStrength', () => adjustStrength(0.05)),
    vscode.commands.registerCommand('bionicCodeReader.decreaseStrength', () => adjustStrength(-0.05)),
    vscode.commands.registerCommand('bionicCodeReader.toggleSaccades', () => {
      const config = getConfig();
      const next = config.get('saccades', 0) === 0 ? 1 : 0;
      config.update('saccades', next, vscode.ConfigurationTarget.Global);
      scheduleRefresh();
      vscode.window.setStatusBarMessage(`Bionic saccades: ${next}`, 2500);
    }),
    vscode.window.onDidChangeActiveTextEditor(refreshEditor),
    vscode.window.onDidChangeVisibleTextEditors(refreshVisibleEditors),
    vscode.workspace.onDidChangeTextDocument(event => {
      if (vscode.window.visibleTextEditors.some(e => e.document === event.document)) scheduleRefresh();
    }),
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('bionicCodeReader')) {
        createDecoration();
        refreshVisibleEditors();
      }
    })
  );

  refreshVisibleEditors();
}

function deactivate() {
  if (timer) clearTimeout(timer);
  if (decoration) decoration.dispose();
}

module.exports = { activate, deactivate };
