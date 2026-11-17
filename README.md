# Bionic Code Reader

[![CI](https://github.com/cody3629/Bionic-Reader-VSCode-Extension/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/cody3629/Bionic-Reader-VSCode-Extension/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A lightweight VS Code extension that applies Bionic-style emphasis as editor decorations. It does not rewrite source files, change clipboard contents, or modify your editor's base font weight.

## Bionic Code Reader in Action

![Code example demonstrating bionic reading on code](<Bionic code example.png>)

## What is Bionic Reading?

Bionic reading is a reading mode that partially bolds words to make text easier to read for certain individuals. It strategically anchors parts of the text to provide focal points which makes processing what's being read more comprehensible to the user. For more information on Bionic Reading, check out this article from [Indiana Wesleyan University](https://www.indwes.edu/articles/2022/09/what-is-bionic-reading).

## What is the purpose of this extension and why should I check it out?

This extension brings Bionic-style reading directly into the VS Code editor, applying emphasis to source code to make it easier to follow and navigate.

I originally developed it for myself after finding Bionic Reading helpful when reading conventional text. I wanted to bring that same approach to source code without requiring a separate font or modifying the underlying files.

If you sometimes struggle with reading or maintaining focus while working with code, give it a try and see if it improves your experience!

## Installation

You can install directly from the extensions tab or from the marketplace link once available and move on with no edits needed! If you wish to edit the settings to your personal preference, continue reading.

## Default Settings

| Setting                              |   Default | Purpose                                                                                    |
| ------------------------------------ | --------: | ------------------------------------------------------------------------------------------ |
| `bionicCodeReader.enabled`           |    `true` | Enable/disable emphasis                                                                    |
| `bionicCodeReader.fixationStrength`  |    `0.35` | Fraction of each eligible word emphasized                                                  |
| `bionicCodeReader.saccades`          |       `0` | Number of eligible words skipped after each emphasized word                                |
| `bionicCodeReader.minimumWordLength` |       `1` | Ignore words shorter than this length                                                      |
| `bionicCodeReader.fontWeight`        |     `600` | Font weight applied to emphasized characters; independent of editor font weight (400–900); |
| `bionicCodeReader.excludedLanguages` | `["log"]` | Language IDs excluded from formatting                                                      |
| `bionicCodeReader.updateDelay`       |     `120` | Debounce delay after edits, in milliseconds                                                |

You can also reference this JSON example below if you wish to edit these settings directly in your `settings.json`. Here is an example of how it would look using the default settings:

```json
{
  "bionicCodeReader.enabled": true,
  "bionicCodeReader.fixationStrength": 0.35,
  "bionicCodeReader.saccades": 0,
  "bionicCodeReader.minimumWordLength": 1,
  "bionicCodeReader.fontWeight": "600"
}
```

## Commands

- Toggle: `Ctrl+Alt+B` (`Cmd+Alt+B` on macOS)
- Increase/decrease fixation strength
- Increase/decrease minimum word length
- Increase/decrease saccades (0–10)
- Toggle saccades between 0 and 1

\*All commands are available through the Command Palette. Search for `Bionic Code Reader` to see the available actions. You can also modify settings directly through your `settings.json`.

## Current limitations

- This release is language-agnostic: it emphasizes word starts across identifiers, keywords, comments, strings, and numbers alike. It does not classify syntax tokens or offer separate controls for keywords, identifiers, comments, strings, or per-language profiles.
- Bionic emphasis is currently unavailable in VS Code diff editors, including Source Control diffs. This is due to a limitation in VS Code's diff-editor decoration rendering and is outside the extension's control.
- Per-folder settings in multi-root workspaces are not supported - settings are applied at the global or workspace level rather than independently per workspace folder.

## Future plans

The project is intended to remain lightweight and focused on its core functionality. Future releases will primarily concentrate on maintenance, bug fixes, compatibility updates, and performance improvements. Additional features will be considered where they meaningfully improve the reading experience.

# Contributing

This extension is open source and anyone who would like to contribute to the improvement of this extension is welcome to do so! Continue reading if your're interested in contributing.

## Getting Started (Contributing)

- Fork the repo and clone your fork locally ([Bionic-Reader-VSCode-Extension](https://github.com/cody3629/Bionic-Reader-VSCode-Extension)).
- Run `npm ci` to install dependencies.
- Create a feature branch from main - do **not** push to the main branch directly.
- Make your changes, and if applicable make sure they are tested with written unit tests, or update existing unit tets if applicable.
- Run the test suite and verify your changes with `npm test` and `npm run check`
- Push your feature branch to your fork and open a PR against the original repo.
- Provide a clear, detailed summary explaining what you changed and why
- PR will be code-reviewed and either accepted or rejected.

## Rules when contributing

- Do not push the `.vsix` file itself to the repo
- Follow the code/syntax patterns established
- Code must be readable and comprehensive
- Code must have a purpose (Solving a real issue, improving an aspect, etc.)

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

This produces a `.vsix` file in the project root. Do **\*not** commit or push the generated `.vsix` file to the repo. Packaging should only be necessary when testing the extension locally or validating a release build.

## License

This project is licensed under the [MIT License](LICENSE). You are free to use, modify, and distribute this software in accordance with its terms.
