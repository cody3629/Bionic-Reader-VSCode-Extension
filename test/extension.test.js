const mockState = {
  values: {},
  inspect: {},
  commands: {},
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
      onDidChangeTextDocument: () => ({ dispose() {} }),
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
      getText: () =>
        Array.from({ length: 1000 }, () => "alpha beta").join("\n"),
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

  test("spans all visible ranges when code is folded", async () => {
    const lines = await decoratedLines(
      makeEditor([range(300, 310), range(700, 710)]),
    );
    expect([Math.min(...lines), Math.max(...lines)]).toEqual([200, 810]);
  });

  test("falls back to the top of the file when there are no visible ranges", async () => {
    const lines = await decoratedLines(makeEditor([]));
    expect([Math.min(...lines), Math.max(...lines)]).toEqual([0, 200]);
  });
});
