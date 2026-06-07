const PLUGIN_NAME = "siyuan-excel-ai";
const MESSAGE_PREFIX = "siyuan-excel-ai:";
const LEGACY_SETTINGS_KEY = `${PLUGIN_NAME}:settings`;

const PROVIDER_PRESETS = {
  ollama: { label: "Ollama（本机）", protocol: "ollama", endpoint: "http://127.0.0.1:11434", model: "" },
  lmstudio: { label: "LM Studio（本机）", protocol: "openai", endpoint: "http://127.0.0.1:1234", model: "" },
  openai: { label: "OpenAI", protocol: "openai", endpoint: "https://api.openai.com/v1", model: "gpt-4.1-mini" },
  deepseek: { label: "DeepSeek", protocol: "openai", endpoint: "https://api.deepseek.com", model: "deepseek-chat" },
  siliconflow: { label: "硅基流动 SiliconFlow", protocol: "openai", endpoint: "https://api.siliconflow.cn/v1", model: "" },
  moonshot: { label: "月之暗面 Kimi", protocol: "openai", endpoint: "https://api.moonshot.cn/v1", model: "moonshot-v1-8k" },
  zhipu: { label: "智谱 GLM", protocol: "openai", endpoint: "https://open.bigmodel.cn/api/paas/v4", model: "glm-4-flash" },
  dashscope: { label: "阿里云百炼 / 通义千问", protocol: "openai", endpoint: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-plus" },
  openrouter: { label: "OpenRouter", protocol: "openai", endpoint: "https://openrouter.ai/api/v1", model: "" },
  anthropic: { label: "Anthropic Claude", protocol: "anthropic", endpoint: "https://api.anthropic.com/v1", model: "claude-sonnet-4-5" },
  gemini: { label: "Google Gemini", protocol: "openai", endpoint: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-2.5-flash" },
  custom: { label: "自定义第三方 API", protocol: "openai", endpoint: "", model: "" },
};

const DEFAULT_SETTINGS = {
  preset: "ollama",
  protocol: "ollama",
  endpoint: "http://127.0.0.1:11434",
  model: "",
  apiKey: "",
};

const OPERATIONS = {
  summary: {
    title: "内容总结",
    icon: "",
    hint: "压缩长文本，生成清晰摘要",
    output: "AI 总结",
  },
  custom: {
    title: "自定义 AI",
    icon: "",
    hint: "按自定义指令处理每一行",
    output: "AI 结果",
  },
  classify: {
    title: "智能分类",
    icon: "",
    hint: "从候选分类中选择最匹配的一项",
    output: "AI 分类",
  },
  extract: {
    title: "智能提取",
    icon: "",
    hint: "提取姓名、电话、标签等结构化信息",
    output: "AI 提取",
  },
  formula: {
    title: "公式计算",
    icon: "",
    hint: "使用类 Excel 公式自动补全数字列",
    output: "公式结果",
  },
};

const LUCKYSHEET_TOOLBAR = [
  "undo",
  "redo",
  "paintFormat",
  "|",
  "font",
  "fontSize",
  "|",
  "bold",
  "italic",
  "strikethrough",
  "underline",
  "textColor",
  "|",
  "fillColor",
  "border",
  "mergeCell",
  "|",
  "horizontalAlignMode",
  "verticalAlignMode",
  "textWrapMode",
  "textRotateMode",
  "|",
  "currencyFormat",
  "percentageFormat",
  "numberIncrease",
  "numberDecrease",
  "moreFormats",
  "|",
  "link",
  "postil",
  "|",
  "function",
  "frozenMode",
  "sortAndFilter",
  "conditionalFormat",
  "dataVerification",
  "splitColumn",
  "findAndReplace",
  "protection",
];

const LUCKYSHEET_CONTEXT_MENU = {
  copy: true,
  copyAs: true,
  paste: true,
  insertRow: true,
  insertColumn: true,
  deleteRow: true,
  deleteColumn: true,
  deleteCell: true,
  hideRow: true,
  hideColumn: true,
  rowHeight: true,
  columnWidth: true,
  clear: true,
  matrix: false,
  sort: false,
  filter: false,
  chart: false,
  image: false,
  link: false,
  data: true,
  cellFormat: true,
};

const $ = (selector) => document.querySelector(selector);
const byRole = (name) => document.querySelector(`[data-role="${name}"]`);
const byField = (name) => document.querySelector(`[data-field="${name}"]`);

let operation = "summary";
let settings = { ...DEFAULT_SETTINGS };
let running = false;
let xlsxModulePromise;
let sheetApi = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setStatus(message) {
  byRole("status").textContent = message;
}

function setProgress(message, type = "") {
  const element = byRole("progress");
  element.className = `moon-excel-progress ${type}`.trim();
  element.textContent = message;
}

function notify(message) {
  setStatus(message);
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: `${MESSAGE_PREFIX}show-message`, payload: { message } }, "*");
  }
}

function hostRequest(type, payload = {}, timeout = 3000) {
  if (!window.parent || window.parent === window) return Promise.reject(new Error("standalone"));
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener("message", listener);
      reject(new Error("host timeout"));
    }, timeout);
    const listener = (event) => {
      const message = event.data || {};
      if (message.id !== id) return;
      window.clearTimeout(timer);
      window.removeEventListener("message", listener);
      if (message.ok === false) reject(new Error(message.error || "host request failed"));
      else resolve(message.data);
    };
    window.addEventListener("message", listener);
    window.parent.postMessage({ id, type: `${MESSAGE_PREFIX}${type}`, payload }, "*");
  });
}

function loadLegacySettings() {
  try {
    return JSON.parse(localStorage.getItem(LEGACY_SETTINGS_KEY) || "{}");
  } catch {
    return {};
  }
}

async function loadSettings() {
  let stored = {};
  try {
    stored = (await hostRequest("load-settings")) || {};
  } catch {
    stored = {};
  }
  const legacy = loadLegacySettings();
  settings = { ...DEFAULT_SETTINGS, ...legacy, ...stored };
  if (Object.keys(legacy).length && !Object.keys(stored).length) await saveSettings(settings);
  fillSettings(settings);
}

async function saveSettings(nextSettings) {
  settings = { ...DEFAULT_SETTINGS, ...nextSettings };
  localStorage.setItem(LEGACY_SETTINGS_KEY, JSON.stringify(settings));
  try {
    await hostRequest("save-settings", settings, 5000);
  } catch {
    // Standalone previews keep using localStorage.
  }
  return settings;
}

function fillSettings(value) {
  byField("preset").value = value.preset;
  byField("protocol").value = value.protocol;
  byField("endpoint").value = value.endpoint;
  byField("model").value = value.model;
  byField("apiKey").value = value.apiKey;
}

function readSettings() {
  return {
    preset: byField("preset").value,
    protocol: byField("protocol").value,
    endpoint: byField("endpoint").value.trim(),
    model: byField("model").value.trim(),
    apiKey: byField("apiKey").value.trim(),
  };
}

function compactEndpoint(endpoint) {
  return String(endpoint || "").replace(/\/+$/, "");
}

function isLocalEndpoint(url) {
  try {
    return ["127.0.0.1", "localhost", "::1"].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

async function siyuanPost(path, data = {}) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const payload = await response.json();
  if (!response.ok || payload.code !== 0) throw new Error(payload.msg || `思源接口失败: ${path}`);
  return payload.data;
}

async function apiFetch(url, { method = "GET", headers = {}, body, timeout = 120000 } = {}) {
  if (isLocalEndpoint(url)) {
    const response = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await response.text();
    let payload;
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = text;
    }
    if (!response.ok) throw new Error(payload?.error?.message || payload?.error || payload?.message || `${response.status}`);
    return payload;
  }
  const result = await siyuanPost("/api/network/forwardProxy", {
    url,
    method,
    timeout,
    headers: Object.entries(headers).map(([key, value]) => ({ [key]: value })),
    payload: body || {},
  });
  let payload;
  try {
    payload = result.body ? JSON.parse(result.body) : {};
  } catch {
    payload = result.body;
  }
  if (result.status < 200 || result.status >= 300) {
    throw new Error(payload?.error?.message || payload?.error || payload?.message || `HTTP ${result.status}`);
  }
  return payload;
}

function openAIBase(endpoint) {
  const base = compactEndpoint(endpoint);
  return /\/(v1|v4|openai)$/i.test(base) ? base : `${base}/v1`;
}

async function listModels(modelSettings) {
  const endpoint = compactEndpoint(modelSettings.endpoint);
  if (!endpoint) throw new Error("请填写接口地址");
  if (modelSettings.protocol === "ollama") {
    const payload = await apiFetch(`${endpoint}/api/tags`);
    return (payload.models || []).map((item) => item.name);
  }
  if (modelSettings.protocol === "anthropic") {
    throw new Error("Anthropic 不提供模型列表，请手动填写模型名称");
  }
  const payload = await apiFetch(`${openAIBase(endpoint)}/models`, {
    headers: modelSettings.apiKey ? { Authorization: `Bearer ${modelSettings.apiKey}` } : {},
  });
  return (payload.data || []).map((item) => item.id);
}

async function callModel(modelSettings, prompt) {
  const endpoint = compactEndpoint(modelSettings.endpoint);
  if (!endpoint) throw new Error("请先填写 API 接口地址");
  if (!modelSettings.model) throw new Error("请先选择或填写模型名称");
  if (modelSettings.protocol === "ollama") {
    const payload = await apiFetch(`${endpoint}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { model: modelSettings.model, stream: false, messages: [{ role: "user", content: prompt }] },
    });
    const text = String(payload.message?.content || "").trim();
    if (!text) throw new Error("模型返回为空");
    return text;
  }
  if (modelSettings.protocol === "anthropic") {
    const payload = await apiFetch(`${endpoint}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": modelSettings.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: { model: modelSettings.model, max_tokens: 2048, messages: [{ role: "user", content: prompt }] },
    });
    const text = String(payload.content?.map((item) => item.text || "").join("") || "").trim();
    if (!text) throw new Error("模型返回为空");
    return text;
  }
  const payload = await apiFetch(`${openAIBase(endpoint)}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(modelSettings.apiKey ? { Authorization: `Bearer ${modelSettings.apiKey}` } : {}),
    },
    body: { model: modelSettings.model, temperature: 0.2, messages: [{ role: "user", content: prompt }] },
  });
  const text = String(payload.choices?.[0]?.message?.content || "").trim();
  if (!text) throw new Error("模型返回为空");
  return text;
}

function columnName(index) {
  let name = "";
  let value = index + 1;
  while (value > 0) {
    const mod = (value - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    value = Math.floor((value - mod) / 26);
  }
  return name;
}

function blankCell() {
  return { v: "", m: "", ct: { fa: "General", t: "g" } };
}

function normalizeCell(value) {
  if (value === null || value === undefined || value === "") return blankCell();
  return { v: value, m: String(value), ct: { fa: "General", t: "g" } };
}

function cellText(cell) {
  if (cell === null || cell === undefined) return "";
  if (typeof cell !== "object") return String(cell);
  if (cell.m !== undefined && cell.m !== null) return String(cell.m);
  if (cell.v !== undefined && cell.v !== null) return String(cell.v);
  if (cell.f !== undefined && cell.f !== null) return String(cell.f);
  return "";
}

function defaultSheet(name = "Cell", index = 0) {
  const rowCount = 36;
  const columnCount = 18;
  return {
    name,
    color: index === 0 ? "dark" : "",
    index,
    status: index === 0 ? 1 : 0,
    order: index,
    hide: 0,
    row: rowCount,
    column: columnCount,
    defaultRowHeight: 19,
    defaultColWidth: 73,
    celldata: [],
    data: Array.from({ length: rowCount }, () => Array.from({ length: columnCount }, () => blankCell())),
    config: {
      merge: {},
      rowlen: {},
      columnlen: {},
      rowhidden: {},
      colhidden: {},
      borderInfo: [],
      authority: {},
    },
    scrollLeft: 0,
    scrollTop: 0,
    luckysheet_select_save: [],
    calcChain: [],
    isPivotTable: false,
    pivotTable: {},
    filter_select: {},
    filter: null,
    luckysheet_alternateformat_save: [],
    luckysheet_alternateformat_save_modelCustom: [],
    luckysheet_conditionformat_save: {},
    frozen: {},
    chart: [],
    zoomRatio: 1,
    image: [],
    showGridLines: 1,
    dataVerification: {},
  };
}

function sheetFromAoa(name, index, aoa) {
  const width = Math.max(18, ...aoa.map((row) => row.length));
  const height = Math.max(36, aoa.length);
  const sheet = defaultSheet(name, index);
  sheet.status = index === 0 ? 1 : 0;
  sheet.order = index;
  sheet.row = height;
  sheet.column = width;
  sheet.data = Array.from({ length: height }, (_, rowIndex) =>
    Array.from({ length: width }, (_, colIndex) => normalizeCell(aoa[rowIndex]?.[colIndex]))
  );
  return sheet;
}

function getLuckysheetFiles() {
  const api = getSheetApi();
  return api?.getLuckysheetfile?.() || api?.getluckysheetfile?.() || [];
}

function getSheetApi() {
  return sheetApi || window.luckysheet || globalThis.luckysheet;
}

function getActiveSheet() {
  const files = getLuckysheetFiles();
  return files.find((sheet) => sheet.status === 1) || files[0];
}

function getSheetData() {
  const sheet = getActiveSheet();
  const api = getSheetApi();
  const data = api?.getSheetData?.(sheet?.index) || api?.flowdata?.() || sheet?.data || [];
  return Array.isArray(data) ? data : [];
}

function usedMaxColumn(data) {
  let max = -1;
  data.forEach((row) => {
    (row || []).forEach((cell, index) => {
      if (cellText(cell).trim()) max = Math.max(max, index);
    });
  });
  return max;
}

function usedMaxRow(data) {
  let max = -1;
  data.forEach((row, index) => {
    if ((row || []).some((cell) => cellText(cell).trim())) max = index;
  });
  return max;
}

function getSelectionRange() {
  const sheet = getActiveSheet();
  const api = getSheetApi();
  const ranges = api?.getluckysheet_select_save?.() || api?.getRange?.() || sheet?.luckysheet_select_save || [];
  const range = Array.isArray(ranges) ? ranges[ranges.length - 1] : ranges;
  if (!range) throw new Error("请先在表格中选择要处理的区域");
  const row = range.row || [range.row_focus ?? range.r, range.row_focus ?? range.r];
  const column = range.column || [range.column_focus ?? range.c, range.column_focus ?? range.c];
  if (!row || !column || row[0] === undefined || column[0] === undefined) throw new Error("无法读取当前选区，请重新选择区域");
  const rowStart = Number(row[0]);
  const rowEnd = Number(row[1]);
  const colStart = Number(column[0]);
  const colEnd = Number(column[1]);
  if (![rowStart, rowEnd, colStart, colEnd].every(Number.isFinite)) throw new Error("无法读取当前选区，请重新选择区域");
  return {
    row: [Math.min(rowStart, rowEnd), Math.max(rowStart, rowEnd)],
    column: [Math.min(colStart, colEnd), Math.max(colStart, colEnd)],
  };
}

function rangeMatrix(range, data) {
  const matrix = [];
  for (let row = range.row[0]; row <= range.row[1]; row += 1) {
    const line = [];
    for (let col = range.column[0]; col <= range.column[1]; col += 1) {
      line.push(cellText(data[row]?.[col]).trim());
    }
    matrix.push(line);
  }
  return matrix;
}

function findResultColumn(data, startCol, rows, headerRow, hasHeader) {
  const rowIndexes = new Set(rows.map((row) => row.rowIndex));
  if (hasHeader) rowIndexes.add(headerRow);
  let col = Math.max(0, startCol);
  while ([...rowIndexes].some((rowIndex) => cellText(data[rowIndex]?.[col]).trim())) col += 1;
  return col;
}

function uniqueHeaderName(baseName, headerRowValues) {
  const base = String(baseName || "AI 结果").trim() || "AI 结果";
  const existing = new Set(headerRowValues.map((item) => String(item || "").trim()).filter(Boolean));
  if (!existing.has(base)) return base;
  let index = 2;
  while (existing.has(`${base} ${index}`)) index += 1;
  return `${base} ${index}`;
}

function selectedDataset() {
  const range = getSelectionRange();
  const data = getSheetData();
  const matrix = rangeMatrix(range, data);
  const hasHeader = byField("header-row").checked;
  const headerRow = range.row[0];
  const dataStartOffset = hasHeader ? 1 : 0;
  if (dataStartOffset >= matrix.length) throw new Error("选区只有表头，没有可处理的数据行");
  const fields = [];
  for (let offset = 0; offset < matrix[0].length; offset += 1) {
    const col = range.column[0] + offset;
    const header = hasHeader ? matrix[0][offset] : "";
    fields.push(header || columnName(col));
  }
  const rows = [];
  for (let matrixRow = dataStartOffset; matrixRow < matrix.length; matrixRow += 1) {
    const rowIndex = range.row[0] + matrixRow;
    const rawCells = matrix[matrixRow];
    const rowData = {};
    for (let offset = 0; offset < fields.length; offset += 1) {
      rowData[fields[offset]] = rawCells[offset] || "";
    }
    if (rawCells.some(Boolean)) {
      rows.push({
        rowIndex,
        rowNumber: rowIndex + 1,
        rowData,
        rawCells,
      });
    }
  }
  if (!rows.length) throw new Error("选区中没有可处理的数据");
  const resultCol = findResultColumn(data, range.column[1] + 1, rows, headerRow, hasHeader);
  const resultName = uniqueHeaderName(byField("result-name").value, (data[headerRow] || []).map(cellText));
  const columnRange =
    range.column[0] === range.column[1]
      ? columnName(range.column[0])
      : `${columnName(range.column[0])}:${columnName(range.column[1])}`;
  return { range, data, fields, rows, hasHeader, headerRow, resultCol, resultName, columnRange };
}

function operationPrompt(row) {
  const rowData = row.rowData || row;
  const input = JSON.stringify(rowData, null, 2);
  const base = `你正在处理 Excel 表格中的一行数据。当前数据来自第 ${row.rowNumber || row.rowIndex + 1 || "未知"} 行，选区列为 ${
    row.columnRange || "当前选区"
  }。只输出将要写入单元格的最终结果，不要解释，不要使用 Markdown。`;
  if (operation === "summary") return `${base}\n请总结以下内容，保留关键事实，语言简洁：\n${input}`;
  if (operation === "classify") {
    const categories = byField("categories").value.trim();
    if (!categories) throw new Error("请填写候选分类");
    return `${base}\n请从候选分类中只选择一个最匹配的分类。候选分类：${categories}\n数据：\n${input}`;
  }
  if (operation === "extract") {
    return `${base}\n提取要求：${byField("instruction").value.trim() || "提取最重要的信息"}\n数据：\n${input}`;
  }
  return `${base}\n处理要求：${byField("instruction").value.trim() || "整理并补全这行数据"}\n数据：\n${input}`;
}

function evaluateFormula(formula, rowData) {
  let expression = String(formula || "").trim().replace(/^=/, "");
  if (!expression) throw new Error("请输入公式");
  expression = expression.replace(/\{([^}]+)\}/g, (_, field) => {
    const raw = String(rowData[field.trim()] ?? "").replace(/,/g, "");
    const number = Number(raw);
    return Number.isFinite(number) ? String(number) : "0";
  });
  if (!/^[\d\s+\-*/%().,A-Z_a-z]+$/.test(expression)) throw new Error("公式只支持数字、字段引用和基础函数");
  const functions = {
    SUM: (...items) => items.reduce((sum, item) => sum + Number(item || 0), 0),
    AVG: (...items) => (items.length ? functions.SUM(...items) / items.length : 0),
    MIN: (...items) => Math.min(...items),
    MAX: (...items) => Math.max(...items),
    ROUND: (number, digits = 0) => Number(Number(number).toFixed(Number(digits))),
    ABS: Math.abs,
    COUNT: (...items) => items.filter((item) => item !== "" && item !== null && item !== undefined).length,
    POW: Math.pow,
    SQRT: Math.sqrt,
  };
  const names = Object.keys(functions);
  const unknown = expression.match(/[A-Za-z_]+/g) || [];
  if (unknown.some((name) => !names.includes(name.toUpperCase()))) throw new Error("公式中包含不支持的函数");
  const args = names.map((name) => functions[name]);
  const result = Function(...names, `"use strict"; return (${expression.toUpperCase()});`)(...args);
  if (!Number.isFinite(Number(result))) throw new Error("公式结果不是有效数字");
  return Number(result);
}

async function calculateRow(row) {
  const rowData = row.rowData || row;
  if (operation === "formula") return evaluateFormula(byField("formula").value, rowData);
  return callModel(readSettings(), operationPrompt(row));
}

function setCellValue(row, col, value) {
  const cellValue = value === null || value === undefined ? "" : value;
  const api = getSheetApi();
  if (api?.setCellValue) {
    api.setCellValue(row, col, cellValue, { isRefresh: false });
    return;
  }
  if (api?.setcellvalue) {
    api.setcellvalue(row, col, null, cellValue);
    return;
  }
  const data = getSheetData();
  while (data.length <= row) data.push([]);
  while (data[row].length <= col) data[row].push(blankCell());
  data[row][col] = normalizeCell(cellValue);
}

function refreshSheet() {
  const api = getSheetApi();
  if (api?.refresh) api.refresh();
  if (api?.refreshFormula) api.refreshFormula();
  try {
    if (api?.luckysheetrefreshgrid) api.luckysheetrefreshgrid();
  } catch {
    // Older Luckysheet builds refresh automatically after setcellvalue.
  }
}

function resizeSheet() {
  window.dispatchEvent(new Event("resize"));
  try {
    refreshSheet();
  } catch {
    // Resize is best-effort; Luckysheet also listens to window resize.
  }
}

function scheduleSheetResize() {
  window.requestAnimationFrame(() => {
    resizeSheet();
    window.requestAnimationFrame(resizeSheet);
  });
  window.setTimeout(resizeSheet, 80);
  window.setTimeout(resizeSheet, 220);
}

async function runPreview() {
  try {
    const dataset = selectedDataset();
    const rows = dataset.rows.slice(0, 3).map((row) => ({ ...row, columnRange: dataset.columnRange }));
    setProgress("正在生成预览...");
    const results = [];
    for (const row of rows) results.push(await calculateRow(row));
    byRole("preview").innerHTML = rows
      .map(
        (row, index) =>
          `<div class="moon-excel-preview__row"><strong>第 ${row.rowIndex + 1} 行</strong><span>${escapeHtml(
            String(results[index])
          )}</span></div>`
      )
      .join("");
    byRole("preview").hidden = false;
    setProgress("预览完成", "success");
  } catch (error) {
    setProgress(`预览失败：${error.message}`, "error");
  }
}

async function runSelection() {
  if (running) return;
  running = true;
  toggleActionButtons(true);
  try {
    const dataset = selectedDataset();
    const results = [];
    for (let index = 0; index < dataset.rows.length; index += 1) {
      const row = dataset.rows[index];
      const currentRow = { ...row, columnRange: dataset.columnRange };
      setProgress(`正在处理第 ${index + 1} / ${dataset.rows.length} 行（表格第 ${row.rowNumber} 行）...`);
      try {
        results.push({ rowIndex: row.rowIndex, value: await calculateRow(currentRow) });
      } catch (error) {
        results.push({ rowIndex: row.rowIndex, value: `处理失败：${error.message}` });
      }
    }
    if (dataset.hasHeader) setCellValue(dataset.headerRow, dataset.resultCol, dataset.resultName);
    results.forEach((item) => setCellValue(item.rowIndex, dataset.resultCol, item.value));
    refreshSheet();
    setProgress(`完成：已写入 ${results.length} 个结果到 ${columnName(dataset.resultCol)} 列`, "success");
    notify(`Excel AI 应用完成：已写入 ${results.length} 个结果`);
  } catch (error) {
    setProgress(`执行失败：${error.message}`, "error");
  } finally {
    running = false;
    toggleActionButtons(false);
  }
}

function toggleActionButtons(disabled) {
  document.querySelectorAll('[data-action="preview"], [data-action="run"], [data-action="complete-formula"]').forEach((button) => {
    button.disabled = disabled;
  });
}

async function importXlsx(file) {
  if (!file) return;
  if (!/\.xlsx$/i.test(file.name)) throw new Error("目前只支持导入 .xlsx 文件");
  setStatus("正在读取 Excel...");
  const XLSX = await loadXlsx();
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheets = workbook.SheetNames.map((name, index) => {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: "", raw: false, blankrows: false });
    return sheetFromAoa(name, index, rows);
  });
  if (!sheets.length) throw new Error("没有读取到工作表");
  getSheetApi().destroy();
  createLuckysheet(sheets, file.name.replace(/\.xlsx$/i, ""));
  setStatus(`已导入：${file.name}`);
}

async function exportXlsx() {
  setStatus("正在导出 Excel...");
  const XLSX = await loadXlsx();
  const workbook = XLSX.utils.book_new();
  const files = getLuckysheetFiles().filter((sheet) => sheet && sheet.hide !== 1);
  files.forEach((sheet, index) => {
    const data = sheet.data || [];
    const maxRow = Math.max(0, usedMaxRow(data));
    const maxCol = Math.max(0, usedMaxColumn(data));
    const aoa = [];
    for (let row = 0; row <= maxRow; row += 1) {
      const line = [];
      for (let col = 0; col <= maxCol; col += 1) line.push(cellText(data[row]?.[col]));
      aoa.push(line);
    }
    const worksheet = XLSX.utils.aoa_to_sheet(aoa.length ? aoa : [[""]]);
    XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName(sheet.name || `Sheet${index + 1}`));
  });
  if (!workbook.SheetNames.length) XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([[""]]), "Sheet1");
  const output = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([output], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `Excel-AI-${Date.now()}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  setStatus("导出完成");
}

function safeSheetName(name) {
  const cleaned = String(name || "Sheet").replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 31);
  return cleaned || "Sheet";
}

function loadXlsx() {
  if (!xlsxModulePromise) xlsxModulePromise = import("../xlsx.mjs");
  return xlsxModulePromise;
}

function createLuckysheet(data, title = "思源 Excel AI 编辑器") {
  const api = getSheetApi();
  if (!api) throw new Error("Luckysheet 未加载");
  const normalizedData = data.map(normalizeSheetForLuckysheet);
  api.create({
    container: "luckysheet",
    title,
    lang: "zh",
    row: 36,
    column: 18,
    allowEdit: true,
    showinfobar: false,
    showtoolbar: true,
    showtoolbarConfig: LUCKYSHEET_TOOLBAR,
    cellRightClickConfig: LUCKYSHEET_CONTEXT_MENU,
    uploadImage: () => false,
    plugins: [],
    data: normalizedData,
  });
  window.__moonExcelAIState = { ready: true, sheetCount: normalizedData.length, title };
  scheduleActiveSheetDataInit();
  scheduleSheetResize();
}

function normalizeSheetForLuckysheet(sheet) {
  const next = { ...sheet, config: { ...(sheet.config || {}) } };
  if (Array.isArray(next.data) && next.data.length) delete next.celldata;
  if (!Array.isArray(next.config.borderInfo)) next.config.borderInfo = [];
  next.config.merge ||= {};
  next.config.rowlen ||= {};
  next.config.columnlen ||= {};
  next.config.rowhidden ||= {};
  next.config.colhidden ||= {};
  next.config.authority ||= {};
  return next;
}

function ensureActiveSheetData() {
  const api = getSheetApi();
  if (!api || api.flowdata?.()?.length) return;
  if (api.setRangeValue) {
    api.setRangeValue([[blankCell()]], { range: { row: [0, 0], column: [0, 0] } });
  }
}

function scheduleActiveSheetDataInit() {
  window.requestAnimationFrame(ensureActiveSheetData);
  window.setTimeout(ensureActiveSheetData, 60);
  window.setTimeout(ensureActiveSheetData, 180);
}

function initLuckysheet() {
  sheetApi = window.luckysheet || globalThis.luckysheet;
  if (!sheetApi) {
    setStatus("Luckysheet 加载失败");
    window.__moonExcelAIState = { ready: false, error: "Luckysheet 加载失败" };
    return;
  }
  createLuckysheet([defaultSheet("Cell", 0), defaultSheet("Sheet2", 1), defaultSheet("Sheet3", 2)]);
}

function renderOperationCards() {
  byRole("operation-cards").innerHTML = Object.entries(OPERATIONS)
    .map(
      ([id, item]) => `<button type="button" class="moon-excel-card${id === operation ? " active" : ""}" data-operation="${id}" aria-pressed="${id === operation ? "true" : "false"}">
        <span class="moon-excel-card__icon">${item.icon}</span>
        <span><strong>${item.title}</strong><small>${item.hint}</small></span>
        <span class="moon-excel-badge">AI</span>
      </button>`
    )
    .join("");
  document.querySelectorAll("[data-operation]").forEach((button) => {
    button.addEventListener("click", () => updateOperation(button.dataset.operation));
  });
}

function updateOperation(next) {
  operation = next;
  const config = OPERATIONS[operation];
  byField("result-name").value = config.output;
  document.querySelectorAll("[data-operation]").forEach((card) => {
    const isActive = card.dataset.operation === operation;
    card.classList.toggle("active", isActive);
    card.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
  byRole("instruction-wrap").hidden = !["custom", "extract"].includes(operation);
  byRole("categories-wrap").hidden = operation !== "classify";
  byRole("formula-wrap").hidden = operation !== "formula";
  byRole("formula-assist-wrap").hidden = operation !== "formula";
  byRole("preview").hidden = true;
  setProgress("");
}

async function completeFormula() {
  try {
    const dataset = selectedDataset();
    setProgress("正在让 AI 补全公式...");
    const prompt = `你是 Excel 公式助手。当前选区字段为：${dataset.fields.join("、")}。
请根据要求生成一个公式：${byField("formula-request").value.trim()}。
只输出公式，不解释。字段引用必须写成 {字段名}。可用函数：SUM、AVG、MIN、MAX、ROUND、ABS、COUNT、POW、SQRT。`;
    byField("formula").value = await callModel(readSettings(), prompt);
    setProgress("公式已补全，请预览确认", "success");
  } catch (error) {
    setProgress(`补全失败：${error.message}`, "error");
  }
}

function bindEvents() {
  document.addEventListener(
    "click",
    (event) => {
      const control = event.target?.closest?.("[data-action]");
      if (!control || control.matches("input[type='file']")) return;
      const action = control.dataset.action;
      if (action === "toggle-ai") {
        event.preventDefault();
        setAiPanelOpen(!document.querySelector(".moon-excel-app").classList.contains("ai-open"));
      } else if (action === "toggle-settings") {
        event.preventDefault();
        byRole("settings").classList.toggle("open");
      } else if (action === "export-file") {
        event.preventDefault();
        exportXlsx().catch((error) => setStatus(`导出失败：${error.message}`));
      } else if (action === "preview") {
        event.preventDefault();
        runPreview();
      } else if (action === "run") {
        event.preventDefault();
        runSelection();
      } else if (action === "complete-formula") {
        event.preventDefault();
        completeFormula();
      } else if (action === "save-settings") {
        event.preventDefault();
        saveSettings(readSettings()).then(() => {
          byRole("model-status").textContent = "设置已保存，重启后仍会保留";
        });
      } else if (action === "detect-models") {
        event.preventDefault();
        detectModels();
      }
    },
    true
  );
  $("[data-action='import-file']").addEventListener("change", (event) => {
    importXlsx(event.target.files?.[0]).catch((error) => setStatus(`导入失败：${error.message}`));
    event.target.value = "";
  });
  byField("preset").addEventListener("change", () => {
    const preset = PROVIDER_PRESETS[byField("preset").value];
    if (!preset) return;
    byField("protocol").value = preset.protocol;
    byField("endpoint").value = preset.endpoint;
    byField("model").value = preset.model;
    byRole("model-status").textContent =
      byField("preset").value === "custom" ? "请填写第三方接口地址、API Key 和模型名称" : `已切换到 ${preset.label}`;
  });
}

function setAiPanelOpen(open) {
  const app = document.querySelector(".moon-excel-app");
  app.classList.toggle("ai-open", open);
  byRole("ai-panel").classList.toggle("open", open);
  byRole("ai-panel").setAttribute("aria-hidden", open ? "false" : "true");
  const toggleButtons = document.querySelectorAll('[data-action="toggle-ai"]');
  toggleButtons.forEach((button) => {
    if (button.classList.contains("moon-excel-ai-button")) button.textContent = open ? "收起 AI" : "AI 应用";
  });
  scheduleSheetResize();
}

async function detectModels() {
  byRole("model-status").textContent = "正在检测...";
  try {
    const models = await listModels(readSettings());
    byRole("model-status").textContent = models.length ? `检测到：${models.join(", ")}` : "接口可用，但没有模型";
    if (!byField("model").value && models[0]) byField("model").value = models[0];
  } catch (error) {
    byRole("model-status").textContent = `连接失败：${error.message}`;
  }
}

function initSettingsOptions() {
  byField("preset").innerHTML = Object.entries(PROVIDER_PRESETS)
    .map(([id, item]) => `<option value="${escapeHtml(id)}">${escapeHtml(item.label)}</option>`)
    .join("");
}

async function main() {
  initSettingsOptions();
  renderOperationCards();
  updateOperation("summary");
  bindEvents();
  await loadSettings();
  initLuckysheet();
}

main().catch((error) => {
  console.error(`[${PLUGIN_NAME}] init failed`, error);
  setStatus(`初始化失败：${error.message}`);
});
