# Release Notes

## v0.1.26

Marketplace metadata refresh for Excel AI Editor.

### Highlights

- Add `package.json` project metadata with name, version, license, repository, homepage, issue tracker, keywords, and package file list.
- Keep the previously verified v0.1.25 workbook fixes: formulas, cell styles, borders, alignment, row/column sizes, render guard, and stable range selection.
- Bump plugin and asset versions to `0.1.26` so the GitHub Release and SiYuan Bazaar check pick up a fresh installable package.
- Refresh documentation and changelog for the marketplace publishing checklist.

### Validation

- Verified `plugin.json` and `package.json` versions match.
- Verified `package.zip` contains `package.json`, `plugin.json`, `index.js`, `dist/app.js`, `icon.png`, `preview.png`, `README.md`, and `LICENSE` at the package root.
- Verified the official SiYuan Bazaar PR check is expected to read the latest Release and `package.zip`.

### Privacy

Only the selected spreadsheet range is sent to the configured model provider when AI actions are run. API keys stay in the current SiYuan client storage. Local providers such as Ollama and LM Studio remain supported.

### Package

Upload `package.zip` as the GitHub Release asset for tag `v0.1.26`.
