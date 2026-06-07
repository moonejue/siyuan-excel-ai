# Excel AI Editor

Insert an editable Excel spreadsheet into the current SiYuan document, then run AI operations on selected rows. It is designed for notes that contain reading excerpts, course lists, research tables, customer lists, topic plans, and other spreadsheet-shaped knowledge.

中文用户请阅读：[中文介绍](README_zh_CN.md) / [完整中文使用说明](MANUAL_zh_CN.md)。

![Excel AI Editor Logo](assets/logo.png)

## Preview

![Excel AI Editor Preview](preview.png)

## What It Does

- Insert an Excel editor block into the current document instead of opening a separate page.
- Import `.xlsx` files and export the edited workbook as `.xlsx`.
- Use common spreadsheet editing features: cells, formatting, borders, sheet switching, and range selection.
- Run AI applications on selected ranges: summary, custom AI, classification, extraction, and formula calculation.
- Preview the first 3 rows before applying to the full selection.
- Write AI results into a new result column by default, without overwriting original data.

## AI Applications

- Summary: turn long text into a clear short result.
- Custom AI: process each row with your own instruction.
- Classification: choose the best label from candidate categories.
- Extraction: extract names, phone numbers, tags, book titles, authors, and other structured information.
- Formula: calculate with simple Excel-like formulas, or ask AI to generate a formula from natural language.

## Model Support

The default preset connects to local Ollama. The plugin also supports:

- Local models: Ollama and LM Studio.
- Mainstream APIs: OpenAI, DeepSeek, Kimi, Zhipu GLM, Alibaba Cloud Bailian / Tongyi Qianwen, Google Gemini, and Anthropic Claude.
- Aggregators and custom endpoints: SiliconFlow, OpenRouter, and custom OpenAI-compatible APIs.

Local endpoints on `localhost`, `127.0.0.1`, or `::1` are fetched directly. Remote endpoints are proxied through SiYuan `/api/network/forwardProxy` to avoid browser CORS restrictions.

## Usage

1. Enable the plugin and click the spreadsheet icon in the SiYuan top bar.
2. The plugin inserts an Excel AI spreadsheet block into the current document.
3. Edit the default sheet or click `Import .xlsx` to import a workbook.
4. Select the range you want to process.
5. Click `AI Applications`, choose an operation, and confirm model settings.
6. Click `Preview first 3 rows`.
7. Click `Apply to selection`; results are written to a new column.

## Formula Examples

```text
={Unit Price}*{Quantity}
ROUND(AVG({Chinese},{Math}), 1)
SUM({Income},-{Expense})
```

Supported functions: `SUM`, `AVG`, `MIN`, `MAX`, `ROUND`, `ABS`, `COUNT`, `POW`, and `SQRT`.

## Privacy

- When using local models, selected content is sent only to the configured local service.
- When using third-party cloud APIs, selected content is sent to the configured provider.
- API keys are stored only in the current SiYuan client plugin data.
- The plugin processes only the spreadsheet range you select; it does not upload the whole document.

## Manual Installation

Download `package.zip` from GitHub Releases, unzip it, and place the plugin folder into:

```text
SiYuan/data/plugins/siyuan-excel-ai
```

Restart SiYuan and enable the plugin from the downloaded plugins list.

## Current Limits

- This version focuses on `.xlsx` import and export.
- Import/export prioritizes cell values. Complex Excel styles, macros, and advanced workbook objects are not the primary compatibility target yet.
- AI writeback always creates a new result column and does not overwrite the selected range.
- The editor runs inside an iframe embedded in the current document. Mobile is not the primary target for this first version.

## Support

If this plugin saves you time, you can support its maintenance here:

![Reward code](assets/reward.jpg)

## Credits

This plugin replicates and extends the Excel editor shape of [muhanstudio/siyuan-excel](https://github.com/muhanstudio/siyuan-excel). Spreadsheet editing is powered by Luckysheet, and `.xlsx` IO is powered by SheetJS.

## License

[MIT](LICENSE)
