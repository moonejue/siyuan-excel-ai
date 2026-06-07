# Changelog

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
