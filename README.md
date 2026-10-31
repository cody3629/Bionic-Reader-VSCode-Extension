# Bionic Code Reader

A small, dependency-free VS Code extension that applies configurable Bionic-style emphasis directly to source text using editor decorations. It does not modify files or clipboard contents.

## Features
- Toggle formatting with `Ctrl+Alt+B` (`Cmd+Alt+B` on macOS).
- Configurable fixation strength (10–100% of each word).
- Saccades: skip a configurable number of words between emphasized words.
- Adjustable emphasis font weight.
- Works directly in source editors, including JS/JSX, TS/TSX, HTML, CSS/SCSS, JSON and Markdown.
- No external dependencies, network requests, telemetry, or filesystem operations.

## Commands
- `Bionic Code Reader: Toggle`
- `Bionic Code Reader: Increase Fixation Strength`
- `Bionic Code Reader: Decrease Fixation Strength`
- `Bionic Code Reader: Toggle Saccades`

## Settings
- `bionicCodeReader.enabled`: enabled by default.
- `bionicCodeReader.fixationStrength`: default `0.35`.
- `bionicCodeReader.saccades`: default `0` (emphasize every word); `1` skips every second word.
- `bionicCodeReader.fontWeight`: default `700`.
- `bionicCodeReader.excludedLanguages`: language IDs to exclude.
- `bionicCodeReader.updateDelay`: debounce delay in milliseconds.

## Important implementation note
This first version emphasizes the beginning of words across the entire document text, including identifiers, keywords, comments, and string contents. It uses regular-expression word boundaries rather than a language parser. This keeps the extension small and language-agnostic, but punctuation-heavy syntax and some Unicode identifiers may not be segmented exactly as a language parser would.

Formatting is an editor decoration only: source text, syntax token colors, saved files, and copied text are not changed.
