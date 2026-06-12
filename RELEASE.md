# Release Notes

## v0.1.25

Workbook fidelity and interaction fix for Excel AI Editor.

### Highlights

- Fix saved cell styles being lost after reopening the note.
- Preserve formulas as formulas instead of restoring only the displayed value.
- Preserve full Luckysheet cell objects, including bold, italic, horizontal/vertical alignment, text color, fill color, number format, and other cell-level properties.
- Preserve styled empty cells during serialization.
- Restore workbook data with a safe sheet shell first, then reapply Luckysheet configuration such as borders, merges, row heights, column widths, frozen panes, filters, conditional formats, data validation, images, and charts.
- Fix drag-selecting a range inside the embedded Excel frame being collapsed back to the first cell.
- Prime blank workbooks during initialization so newly inserted tables keep a stable multi-cell selection.
- Keep the render guard that prevents reopened sheets from staying stuck on the Luckysheet loading overlay.

### Validation

- Reopened a saved workbook and verified formula `=SUM(A1:A2)` remains a formula object.
- Verified bold, italic, right alignment, vertical alignment, text color, background color, and borders persist after saving and reopening.
- Verified a newly inserted blank sheet can keep a drag-selected `A1:C4` range instead of returning to `A1`.
- Verified the Luckysheet loading overlay is hidden after restore and the workbook status shows restored data.

### Privacy

Only the selected spreadsheet range is sent to the configured model provider when AI actions are run. API keys stay in the current SiYuan client storage. Local providers such as Ollama and LM Studio remain supported.

### Package

Upload `package.zip` as the GitHub Release asset for tag `v0.1.25`.
