# Bionic Code Reader 0.2.0

A dependency-free VS Code extension that applies Bionic-style emphasis as editor decorations. It does not rewrite source files, change clipboard contents, or modify your editor's base font weight.

## What's new in 0.2.0

- Independent emphasis weight (`bionicCodeReader.fontWeight`); your `editor.fontWeight` stays untouched.
- Minimum word length, so short words can be ignored.
- Reading algorithm extracted into a pure module and covered by automated unit tests.
- Jest unit tests; no runtime dependencies.

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

The reading engine is intentionally independent of VS Code so its segmentation and reading behavior can be tested quickly with Node. Tests cover fixation strength, saccades, minimum word length, offsets across lines, Unicode letters, clamping, empty input, and source-text immutability.

## Current limitations

This release is language-agnostic: it emphasizes word starts across identifiers, keywords, comments, strings, and numbers alike. It does not yet classify syntax tokens or offer separate controls for keywords, identifiers, comments, strings, or per-language profiles. Those are candidates for a later syntax-aware release.
