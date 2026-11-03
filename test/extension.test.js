const mockState = {
  values: {},
  inspect: {},
  commands: {},
  documentChangeHandler: null,
  update: jest.fn(() => Promise.resolve()),
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
      createTextEditorDecorationType: () => ({ dispose() {} }),
      onDidChangeActiveTextEditor: () => ({ dispose() {} }),
      onDidChangeVisibleTextEditors: () => ({ dispose() {} }),
      onDidChangeTextEditorVisibleRanges: () => ({ dispose() {} }),
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
      onDidChangeConfiguration: () => ({ dispose() {} }),
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
    await run("bionicCodeReader.toggle");
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
    await run("bionicCodeReader.toggle");
    const firstPassCount = visited.length;
    visited.length = 0;
    await run("bionicCodeReader.toggle");

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
      await run("bionicCodeReader.toggle");

      visited.length = 0;
      editor.document.version += 1;
      mockState.documentChangeHandler({
        document: editor.document,
        contentChanges: [{ range: { start: { line: 450 } } }],
      });
      await run("bionicCodeReader.toggle");

      expect(visited).toEqual(
        Array.from({ length: 201 }, (_, index) => index + 400),
      );
    } finally {
      jest.clearAllTimers();
      jest.useRealTimers();
    }
  });
});
