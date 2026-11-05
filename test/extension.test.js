const mockState = {
  values: {},
  inspect: {},
  commands: {},
  documentChangeHandler: null,
  configurationChangeHandler: null,
  activeEditorChangeHandler: null,
  visibleEditorsChangeHandler: null,
  visibleRangesChangeHandler: null,
  decorationTypes: [],
  update: jest.fn((key, value) => {
    mockState.values[key] = value;
    return Promise.resolve();
  }),
};

jest.mock(
  "vscode",
  () => ({
    ConfigurationTarget: { Global: 1, Workspace: 2 },
    DecorationRangeBehavior: { ClosedClosed: 1 },
    Range: class {
      constructor(start, end) {
        this.start = start;
        this.end = end;
      }
    },
    Position: class {
      constructor(line, character) {
        this.line = line;
        this.character = character;
      }
    },
    commands: {
      registerCommand: (name, handler) => {
        mockState.commands[name] = handler;
        return { dispose() {} };
      },
    },
    window: {
      visibleTextEditors: [],
      setStatusBarMessage: jest.fn(),
      createTextEditorDecorationType: (options) => {
        const type = { options, dispose: jest.fn() };
        mockState.decorationTypes.push(type);
        return type;
      },
      onDidChangeActiveTextEditor: (handler) => {
        mockState.activeEditorChangeHandler = handler;
        return { dispose() {} };
      },
      onDidChangeVisibleTextEditors: (handler) => {
        mockState.visibleEditorsChangeHandler = handler;
        return { dispose() {} };
      },
      onDidChangeTextEditorVisibleRanges: (handler) => {
        mockState.visibleRangesChangeHandler = handler;
        return { dispose() {} };
      },
    },
    workspace: {
      getConfiguration: () => ({
        get: (key, fallback) =>
          key in mockState.values ? mockState.values[key] : fallback,
        inspect: (key) => mockState.inspect[key],
        update: mockState.update,
      }),
      onDidChangeTextDocument: (handler) => {
        mockState.documentChangeHandler = handler;
        return { dispose() {} };
      },
      onDidChangeConfiguration: (handler) => {
        mockState.configurationChangeHandler = handler;
        return { dispose() {} };
      },
    },
  }),
  { virtual: true },
);

const { activate, deactivate } = require("../src/extension");
const manifest = require("../package.json");

const Target = { Global: 1, Workspace: 2 };

beforeAll(() => activate({ subscriptions: [] }));
afterAll(() => deactivate());

beforeEach(() => {
  mockState.values = {};
  mockState.inspect = {};
  mockState.decorationTypes = [];
  require("vscode").window.visibleTextEditors = [];
  mockState.update.mockClear();
});

const run = (name) => mockState.commands[name]();

test("registered commands match the commands declared in package.json", () => {
  const declared = manifest.contributes.commands.map((c) => c.command).sort();
  expect(Object.keys(mockState.commands).sort()).toEqual(declared);
});

describe("settings scope", () => {
  test("defaults to Global", () => {
    run("bionicCodeReader.increaseStrength");
    expect(mockState.update).toHaveBeenCalledWith(
      "fixationStrength",
      0.4,
      Target.Global,
    );
  });

  test("uses Workspace when the workspace overrides the key", () => {
    mockState.inspect.fixationStrength = { workspaceValue: 0.5 };
    run("bionicCodeReader.increaseStrength");
    expect(mockState.update.mock.calls[0][2]).toBe(Target.Workspace);
  });
});

describe("value clamping", () => {
  const lastValue = () => mockState.update.mock.calls.at(-1)[1];

  test("fixation strength stays within 0.1 to 1", () => {
    mockState.values.fixationStrength = 1;
    run("bionicCodeReader.increaseStrength");
    expect(lastValue()).toBe(1);

    mockState.values.fixationStrength = 0.1;
    run("bionicCodeReader.decreaseStrength");
    expect(lastValue()).toBe(0.1);
  });

  test("minimum word length stays within 1 to 20", () => {
    mockState.values.minimumWordLength = 20;
    run("bionicCodeReader.increaseMinimumWordLength");
    expect(lastValue()).toBe(20);

    mockState.values.minimumWordLength = 1;
    run("bionicCodeReader.decreaseMinimumWordLength");
    expect(lastValue()).toBe(1);
  });

  test("saccades stay within 0 to 10", () => {
    mockState.values.saccades = 10;
    run("bionicCodeReader.increaseSaccades");
    expect(lastValue()).toBe(10);

    mockState.values.saccades = 0;
    run("bionicCodeReader.decreaseSaccades");
    expect(lastValue()).toBe(0);
  });

  test("toggleSaccades flips between 0 and 1", () => {
    mockState.values.saccades = 0;
    run("bionicCodeReader.toggleSaccades");
    expect(lastValue()).toBe(1);

    mockState.values.saccades = 3;
    run("bionicCodeReader.toggleSaccades");
    expect(lastValue()).toBe(0);
  });

  test("toggle command disables and re-enables editor decorations", async () => {
    const vscode = require("vscode");
    const editor = makeTestEditor("javascript", [
      { start: { line: 0 }, end: { line: 0 } },
    ]);
    vscode.window.visibleTextEditors = [editor];

    await run("bionicCodeReader.toggle");
    expect(mockState.values.enabled).toBe(false);
    expect(editor.setDecorations.mock.calls.at(-1)[1]).toEqual([]);

    await run("bionicCodeReader.toggle");
    expect(mockState.values.enabled).toBe(true);
    expect(editor.setDecorations.mock.calls.at(-1)[1].length).toBeGreaterThan(
      0,
    );
  });
});

describe("awaited setting updates", () => {
  const delayedUpdate = (key, value) =>
    new Promise((resolve) => {
      setTimeout(() => {
        mockState.values[key] = value;
        resolve();
      }, 0);
    });

  test("minimum word length commands apply sequential increments", async () => {
    mockState.update
      .mockImplementationOnce(delayedUpdate)
      .mockImplementationOnce(delayedUpdate);

    await run("bionicCodeReader.increaseMinimumWordLength");
    await run("bionicCodeReader.increaseMinimumWordLength");

    expect(mockState.values.minimumWordLength).toBe(3);
  });

  test("saccade commands apply sequential increments", async () => {
    mockState.update
      .mockImplementationOnce(delayedUpdate)
      .mockImplementationOnce(delayedUpdate);

    await run("bionicCodeReader.increaseSaccades");
    await run("bionicCodeReader.increaseSaccades");

    expect(mockState.values.saccades).toBe(2);
  });

  test("update-delay commands apply sequential increments", async () => {
    mockState.update
      .mockImplementationOnce(delayedUpdate)
      .mockImplementationOnce(delayedUpdate);

    await run("bionicCodeReader.increaseDelay");
    await run("bionicCodeReader.increaseDelay");

    expect(mockState.values.updateDelay).toBe(140);
  });

  test("emphasis adjustments refresh immediately; delay adjustments do not refresh", async () => {
    jest.useFakeTimers();
    try {
      const vscode = require("vscode");
      const editor = makeTestEditor("javascript", [
        { start: { line: 0 }, end: { line: 0 } },
      ]);
      vscode.window.visibleTextEditors = [editor];

      await run("bionicCodeReader.increaseStrength");
      expect(editor.setDecorations).toHaveBeenCalledTimes(1);

      editor.setDecorations.mockClear();
      await run("bionicCodeReader.increaseDelay");
      expect(editor.setDecorations).not.toHaveBeenCalled();
    } finally {
      jest.clearAllTimers();
      jest.useRealTimers();
    }
  });
});

describe("render window", () => {
  const vscode = require("vscode");
  const makeEditor = (visibleRanges) => ({
    visibleRanges,
    document: {
      languageId: "javascript",
      fileName: "big.js",
      lineCount: 1000,
      version: 1,
      lineAt: jest.fn(() => ({ text: "alpha beta" })),
    },
    setDecorations: jest.fn(),
  });
  const range = (start, end) => ({
    start: { line: start },
    end: { line: end },
  });
  const decoratedLines = async (editor) => {
    vscode.window.visibleTextEditors = [editor];
    mockState.activeEditorChangeHandler(editor);
    return editor.setDecorations.mock.calls.at(-1)[1].map((r) => r.start.line);
  };

  afterEach(() => {
    vscode.window.visibleTextEditors = [];
  });

  test("decorates only the viewport plus a margin", async () => {
    const lines = await decoratedLines(makeEditor([range(500, 540)]));
    expect([Math.min(...lines), Math.max(...lines)]).toEqual([400, 640]);
  });

  test("leaves large folded gaps between visible ranges undecorated", async () => {
    const editor = makeEditor([range(300, 310), range(700, 710)]);
    const visited = [];
    editor.document.lineAt = jest.fn((line) => {
      visited.push(line);
      return { text: "alpha beta" };
    });

    const lines = await decoratedLines(editor);

    expect([Math.min(...lines), Math.max(...lines)]).toEqual([200, 810]);
    expect(lines).not.toContain(500);
    expect(lines).toHaveLength(844);
    expect(visited).toHaveLength(422);
    expect(visited).not.toContain(500);
  });

  test("falls back to the top of the file when there are no visible ranges", async () => {
    const lines = await decoratedLines(makeEditor([]));
    expect([Math.min(...lines), Math.max(...lines)]).toEqual([0, 200]);
  });

  test("does not decorate excluded language IDs", () => {
    const editor = makeEditor([range(10, 20)]);
    editor.document.languageId = "log";

    mockState.activeEditorChangeHandler(editor);

    expect(editor.setDecorations.mock.calls.at(-1)[1]).toEqual([]);
    expect(editor.document.lineAt).not.toHaveBeenCalled();
  });

  test("refreshes each visible editor using its own viewport", () => {
    const first = makeEditor([range(100, 110)]);
    const second = makeEditor([range(700, 710)]);
    vscode.window.visibleTextEditors = [first, second];

    mockState.visibleEditorsChangeHandler();

    const firstLines = first.setDecorations.mock.calls
      .at(-1)[1]
      .map((r) => r.start.line);
    const secondLines = second.setDecorations.mock.calls
      .at(-1)[1]
      .map((r) => r.start.line);
    expect([Math.min(...firstLines), Math.max(...firstLines)]).toEqual([
      0, 210,
    ]);
    expect([Math.min(...secondLines), Math.max(...secondLines)]).toEqual([
      600, 810,
    ]);
  });

  test("refreshes decorations when visible ranges change", () => {
    jest.useFakeTimers();
    try {
      const editor = makeEditor([range(100, 110)]);
      vscode.window.visibleTextEditors = [editor];
      mockState.activeEditorChangeHandler(editor);
      editor.setDecorations.mockClear();

      editor.visibleRanges = [range(700, 710)];
      mockState.visibleRangesChangeHandler({ textEditor: editor });
      jest.advanceTimersByTime(120);

      const lines = editor.setDecorations.mock.calls
        .at(-1)[1]
        .map((r) => r.start.line);
      expect([Math.min(...lines), Math.max(...lines)]).toEqual([600, 810]);
    } finally {
      jest.clearAllTimers();
      jest.useRealTimers();
    }
  });

  test("recreates the decoration type and refreshes editors after configuration changes", () => {
    const editor = makeEditor([range(100, 110)]);
    vscode.window.visibleTextEditors = [editor];
    mockState.activeEditorChangeHandler(editor);
    const oldDecoration = editor.setDecorations.mock.calls.at(-1)[0];
    const oldDecorationCount = mockState.decorationTypes.length;
    editor.setDecorations.mockClear();

    mockState.values.fontWeight = "900";
    mockState.configurationChangeHandler({
      affectsConfiguration: (section) =>
        section === "bionicCodeReader" ||
        section === "bionicCodeReader.fontWeight",
    });

    const newDecoration = editor.setDecorations.mock.calls.at(-1)[0];
    expect(oldDecoration.dispose).toHaveBeenCalled();
    expect(mockState.decorationTypes).toHaveLength(oldDecorationCount + 1);
    expect(newDecoration).not.toBe(oldDecoration);
    expect(newDecoration.options.fontWeight).toBe("900");
  });

  test("reads only requested lines and caches the saccade prefix", async () => {
    mockState.values.saccades = 1;
    const editor = makeEditor([range(500, 500)]);
    const firstLineAt = editor.document.lineAt;
    const visited = [];
    editor.document.lineAt = jest.fn((line) => {
      visited.push(line);
      return firstLineAt();
    });

    vscode.window.visibleTextEditors = [editor];
    mockState.activeEditorChangeHandler(editor);
    const firstPassCount = visited.length;
    visited.length = 0;
    mockState.activeEditorChangeHandler(editor);

    expect(visited).toEqual(
      Array.from({ length: 201 }, (_, index) => index + 400),
    );
    expect(firstPassCount).toBe(601);
  });

  test("reuses unaffected prefix counts after an edit", async () => {
    jest.useFakeTimers();
    try {
      mockState.values.saccades = 1;
      const editor = makeEditor([range(500, 500)]);
      const visited = [];
      editor.document.lineAt = jest.fn((line) => {
        visited.push(line);
        return { text: "alpha beta" };
      });
      vscode.window.visibleTextEditors = [editor];
      mockState.activeEditorChangeHandler(editor);

      visited.length = 0;
      editor.document.version += 1;
      mockState.documentChangeHandler({
        document: editor.document,
        contentChanges: [{ range: { start: { line: 450 } } }],
      });
      mockState.activeEditorChangeHandler(editor);

      expect(visited).toEqual(
        Array.from({ length: 201 }, (_, index) => index + 400),
      );
    } finally {
      jest.clearAllTimers();
      jest.useRealTimers();
    }
  });

  test.each(["insert", "delete"])(
    "invalidates prefix counts after a line %s",
    (operation) => {
      jest.useFakeTimers();
      try {
        mockState.values.saccades = 1;
        const lines = Array.from({ length: 700 }, (_, i) => `word${i} value`);
        const document = {
          languageId: "javascript",
          fileName: "edited.js",
          version: 1,
          get lineCount() {
            return lines.length;
          },
          lineAt: jest.fn((line) => ({ text: lines[line] })),
        };
        const editor = {
          visibleRanges: [range(500, 500)],
          document,
          setDecorations: jest.fn(),
        };
        vscode.window.visibleTextEditors = [editor];
        mockState.activeEditorChangeHandler(editor);

        const changedLine = 250;
        if (operation === "insert") {
          lines.splice(changedLine, 0, "inserted extra words");
        } else {
          lines.splice(changedLine, 1);
        }
        document.version += 1;
        mockState.documentChangeHandler({
          document,
          contentChanges: [{ range: { start: { line: changedLine } } }],
        });
        mockState.activeEditorChangeHandler(editor);

        const expected = require("../src/reading-engine")
          .getEmphasisRanges(lines.join("\n"), { saccades: 1 })
          .filter((item) => item.line >= 400 && item.line <= 600)
          .map(({ line, start, end }) => [line, start, end]);
        const actual = editor.setDecorations.mock.calls
          .at(-1)[1]
          .map((item) => [
            item.start.line,
            item.start.character,
            item.end.character,
          ]);
        expect(actual).toEqual(expected);
      } finally {
        jest.clearAllTimers();
        jest.useRealTimers();
      }
    },
  );
});

function makeTestEditor(languageId, visibleRanges) {
  return {
    visibleRanges,
    document: {
      languageId,
      fileName: "test.js",
      lineCount: 20,
      version: 1,
      lineAt: jest.fn(() => ({ text: "alpha beta" })),
    },
    setDecorations: jest.fn(),
  };
}
