# Changelog

## 0.1.26

- Add `package.json` project metadata so the repository matches the full marketplace publishing checklist in addition to the official bazaar automated checks.
- Bump plugin and asset versions for a clean marketplace refresh.

## 0.1.25

- Fix workbook restore for rich cell state: formulas, bold, italic, alignment, font color, background color, number format, and other cell properties are now preserved.
- Preserve styled empty cells instead of dropping them during serialization.
- Restore workbook data through a safe sheet shell, then reapply Luckysheet configuration such as borders, merges, row/column sizes, frozen panes, filters, conditional formats, validation, images, and charts.
- Fix range selection being collapsed after drag-selecting an area inside the embedded Excel frame.
- Prime blank workbooks during initialization so Luckysheet keeps a full editable grid without asynchronously resetting the user's selected range.
- Keep the render-completion guard from the local test build so reopened sheets do not stay stuck on the Luckysheet loading overlay.

## 0.1.24

- Fix workbook data disappearing after closing and reopening SiYuan.
- Save embedded workbook files directly through SiYuan kernel file APIs, keyed by the current iframe block ID.
- Store workbook file metadata on the block attributes and keep the parent-plugin message channel only as a fallback.
- Report save failures instead of silently falling back to temporary browser storage in embedded mode.

## 0.1.23

- Add a workbook save button to persist each embedded Excel block.
- Restore saved workbook data when reopening the same note page.
- Store workbook data per embedded block and overwrite the saved copy on each manual save.

## 0.1.22

- Add a complete Chinese user guide `MANUAL_zh_CN.md` with installation, AI workflows, model setup, privacy notes, and troubleshooting.
- Link the Chinese guide from the marketplace README.

## 0.1.21

- Add a redesigned Moon Teacher style logo and refreshed marketplace icon.
- Replace the marketplace preview with a real Excel AI interface screenshot.
- Rewrite Chinese and English README files for a clearer public listing.
- Compress public images to reduce package size while keeping the interface readable.

## 0.1.20

- Prepare the first public GitHub and SiYuan Bazaar release.
- Add funding metadata and reward code documentation.
- Refine Chinese and English README files for marketplace listing.
- Remove unused Luckysheet source map and iconfont demo files to reduce package size.

## 0.1.19

- Keep AI action buttons fixed at the bottom of the AI panel.
- Split the AI panel into a fixed header, independent scroll area, and fixed footer.
- Remove iframe `pointerover` scroll restoration to prevent the panel from jumping back while moving the mouse.

## 0.1.18

- Redesign the AI panel with a calm Moon Teacher style.
- Fix hidden form fields being displayed because scoped label styles overrode browser `[hidden]` behavior.
- Reduce bundled resources by removing unused legacy vendor directories.

## 0.1.17

- Fix Luckysheet border button behavior.
- Ensure blank sheets initialize with a valid data matrix.
- Improve AI panel layout and sheet resizing when opening or closing the side panel.

## 0.1.0

- Initial implementation: embedded Excel editor, `.xlsx` import/export, AI applications, model presets, and result-column writeback.
