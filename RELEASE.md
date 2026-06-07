# Release Notes

## v0.1.23

Workbook persistence update for Excel AI Editor.

### Highlights

- Add a `保存` button to the top toolbar.
- Save the current Luckysheet workbook into SiYuan plugin data for the current embedded Excel block.
- Reopen the same note page and automatically restore the saved workbook.
- Saving overwrites the latest saved copy for that Excel block without changing other embedded Excel blocks.

### Included From Previous Release

- Add `MANUAL_zh_CN.md`, a complete Chinese user guide covering installation, quick start, table editing, AI workflows, model configuration, privacy, and troubleshooting.
- Link the new Chinese guide from `README_zh_CN.md` so users can reach the full tutorial from GitHub and the SiYuan Bazaar listing.
- Add a new Moon Teacher style logo: a soft spreadsheet, crescent moon, and quiet star mark.
- Refresh the marketplace preview with a real embedded Excel AI interface screenshot.
- Rewrite the Chinese and English README files for clearer installation, AI workflow, privacy, and support information.
- Compress public images so the plugin package stays light.

### Core Features

- Insert an editable Excel spreadsheet into the current SiYuan document.
- Import and export `.xlsx` workbooks.
- Run AI applications on selected rows: summary, custom AI, classification, extraction, and formula calculation.
- Support local models such as Ollama and LM Studio, plus OpenAI-compatible APIs and major cloud providers.
- Write AI results into a new column without overwriting original data.
- Preview the first 3 rows before applying to the full selection.

### Privacy

Only the selected spreadsheet range is sent to the configured model provider. API keys are stored in the current SiYuan client plugin data.

### Package

Upload `package.zip` as the GitHub Release asset for tag `v0.1.23`.
