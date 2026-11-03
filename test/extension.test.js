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
    Range: class {},
    Position: class {},
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
