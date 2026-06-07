# Release Notes

## v0.1.20

First public release of Excel AI Editor for SiYuan.

### Highlights

- Insert an editable Excel spreadsheet into the current SiYuan document.
- Import and export `.xlsx` workbooks.
- Run AI applications on selected rows: summary, custom AI, classification, extraction, and formula calculation.
- Support local models such as Ollama and LM Studio, plus OpenAI-compatible APIs and major cloud providers.
- Write AI results into a new column without overwriting original data.
- Preview the first 3 rows before applying to the full selection.

### Privacy

Only the selected spreadsheet range is sent to the configured model provider. API keys are stored in the current SiYuan client plugin data.

### Package

Upload `package.zip` as the GitHub Release asset for tag `v0.1.20`.
