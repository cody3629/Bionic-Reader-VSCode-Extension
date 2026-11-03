# Bionic Code Reader 0.2.0

A lightweight VS Code extension that applies Bionic-style emphasis as editor decorations. It does not rewrite source files, change clipboard contents, or modify your editor's base font weight.

## What's new in 0.2.0

- Independent emphasis weight (`bionicCodeReader.fontWeight`); your `editor.fontWeight` stays untouched.
- Minimum word length, so short words can be ignored.
- New commands to increase/decrease minimum word length and saccades (0–10), alongside the existing saccades toggle.
- Commands write to workspace settings when the workspace already overrides that setting, and to user settings otherwise.
- Only the visible lines plus a margin of 100 lines above and below are decorated, so large files stay responsive.
- Reading algorithm extracted into a pure module.
- Jest unit tests cover the reading algorithm and the extension commands; no runtime dependencies.
- `npm run package` builds a `.vsix` using the locally installed `@vscode/vsce`.

## Settings

| Setting                              |   Default | Purpose                                                      |
| ------------------------------------ | --------: | ------------------------------------------------------------ |
| `bionicCodeReader.enabled`           |    `true` | Enable/disable emphasis                                      |
| `bionicCodeReader.fixationStrength`  |    `0.35` | Fraction of each eligible word emphasized                    |
| `bionicCodeReader.saccades`          |       `0` | Number of eligible words skipped after each emphasized word  |
| `bionicCodeReader.minimumWordLength` |       `1` | Ignore words shorter than this length                        |
| `bionicCodeReader.fontWeight`        |     `700` | Emphasis weight (400–900); independent of editor font weight |
| `bionicCodeReader.excludedLanguages` | `["log"]` | Language IDs excluded from formatting                        |
| `bionicCodeReader.updateDelay`       |     `120` | Debounce delay after edits, in milliseconds                  |

## Commands

- Toggle: `Ctrl+Alt+B` (`Cmd+Alt+B` on macOS)
- Increase/decrease fixation strength
- Increase/decrease minimum word length
- Increase/decrease saccades (0–10)
- Toggle saccades between 0 and 1

## Testing

Run:

```sh
npm test
npm run check
```

`npm run test:watch` re-runs Jest on changes.

The reading engine is intentionally independent of VS Code so its segmentation and reading behavior can be tested quickly. Its tests cover fixation strength, saccades, minimum word length, offsets across lines, Unicode letters, clamping, empty input, and source-text immutability. The extension tests mock the `vscode` API to check command registration, settings scope, and value limits.

## Packaging

```sh
npm install
npm run package
```

This produces a `.vsix` file in the project root.

## Current limitations

This release is language-agnostic: it emphasizes word starts across identifiers, keywords, comments, strings, and numbers alike. It does not yet classify syntax tokens or offer separate controls for keywords, identifiers, comments, strings, or per-language profiles. Those are candidates for a later syntax-aware release.

Settings apply to the whole window. Per-folder settings in multi-root workspaces are not supported.
