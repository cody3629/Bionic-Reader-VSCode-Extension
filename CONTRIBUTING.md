# Contributing

Thank you for helping improve Bionic Code Reader. Participation is subject to
the [code of conduct](CODE_OF_CONDUCT.md).

## Issues and triage

Search [existing issues](https://github.com/cody3629/Bionic-Reader-VSCode-Extension/issues)
before opening a report. To submit one, go to **Issues**, select **New issue**,
and choose the appropriate form:

- **Bug report:** Describe what happened and what you expected, provide
  reproduction steps, and include the extension, VS Code, and OS versions.
- **Feature request:** Describe the problem and your proposed solution; add
  alternatives or other context if useful.

Complete the required fields and submit the issue. GitHub automatically labels
bug reports `bug` and feature requests `enhancement`. An issue starts a
discussion; a separate pull request can be opened to propose code changes.
Report security vulnerabilities privately as described in [SECURITY.md](SECURITY.md),
not in public issues.

The maintainer will review reports, request missing information when needed,
and use labels such as `bug`, `enhancement`, `duplicate`, and `help wanted` to
organize them. For substantial changes, open an issue before starting work to
discuss whether the change fits the project.

## Pull requests

1. Fork the repository, clone your fork, and create a branch from `main`.
2. Use Node.js 22, as in CI, and run `npm ci`.
3. Make a focused change following existing patterns. Add or update tests for
   changed behavior and update documentation when applicable.
4. Run `npm run check`, `npm test`, and `npm run package`. For changes to
   editor behavior, also install the VSIX in VS Code and test the affected
   workflow. Do not commit the generated VSIX.
5. Push your branch and open a pull request against `main`. Explain the
   motivation, link related issues, and describe your testing.

The maintainer reviews pull requests for correctness, project fit, tests, and
documentation. CI must pass before merging; address review comments and
resolve conversations. Reviews may take time. A contribution can be declined
if it does not fit the project's scope or cannot be maintained; the maintainer
should explain the decision respectfully in the issue or pull request.
