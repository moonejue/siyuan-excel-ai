"use strict";

const { Plugin, showMessage } = require("siyuan");

const PLUGIN_NAME = "siyuan-excel-ai";
const PLUGIN_VERSION = "0.1.23";
const SETTINGS_FILE = "settings.json";
const MESSAGE_PREFIX = "siyuan-excel-ai:";

class SiyuanExcelAI extends Plugin {
  onload() {
    this.handleFrameMessage = this.handleFrameMessage.bind(this);
    this.handleEmbedPointer = this.handleEmbedPointer.bind(this);
    this.restoreEmbedScroll = this.restoreEmbedScroll.bind(this);
    window.addEventListener("message", this.handleFrameMessage);
    this.embedObserver = new MutationObserver(() => this.decorateEmbeddedFrames());
    this.embedObserver.observe(document.body, { childList: true, subtree: true });
    ["pointerdown", "mousedown", "mouseup", "click", "dblclick", "focusin"].forEach((type) => {
      document.addEventListener(type, this.handleEmbedPointer, true);
    });
    this.addTopBar({
      icon: "iconTable",
      title: this.i18n?.open || "插入 Excel AI 表格",
      position: "right",
      callback: () => this.insertEditorBlock(),
    });
    window.setTimeout(() => this.decorateEmbeddedFrames(), 500);
  }

  onunload() {
    window.removeEventListener("message", this.handleFrameMessage);
    this.embedObserver?.disconnect();
    ["pointerdown", "mousedown", "mouseup", "click", "dblclick", "focusin"].forEach((type) => {
      document.removeEventListener(type, this.handleEmbedPointer, true);
    });
  }

  async uninstall() {
    try {
      await this.removeData(SETTINGS_FILE);
    } catch (error) {
      console.warn(`[${PLUGIN_NAME}] remove settings failed`, error);
    }
    try {
      localStorage.removeItem(`${PLUGIN_NAME}:settings`);
    } catch (error) {
      console.warn(`[${PLUGIN_NAME}] remove legacy settings failed`, error);
    }
  }

  async siyuanPost(path, data = {}) {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const payload = await response.json();
    if (!response.ok || payload.code !== 0) throw new Error(payload.msg || `思源接口失败：${path}`);
    return payload.data;
  }

  getActiveProtyle() {
    return (
      document.querySelector(".layout__wnd--active .protyle:not(.fn__none)") ||
      document.querySelector(".protyle:not(.fn__none)") ||
      document
    );
  }

  getCurrentBlockID() {
    const selection = window.getSelection?.();
    const anchor = selection?.anchorNode;
    const anchorElement = anchor?.nodeType === Node.ELEMENT_NODE ? anchor : anchor?.parentElement;
    const selectedBlock = anchorElement?.closest?.(".protyle-wysiwyg [data-node-id]");
    if (selectedBlock?.dataset?.nodeId) return selectedBlock.dataset.nodeId;

    const protyle = this.getActiveProtyle();
    const focusedBlock =
      document.activeElement?.closest?.(".protyle-wysiwyg [data-node-id]") ||
      protyle.querySelector?.(".protyle-wysiwyg [data-node-id].protyle-wysiwyg--select") ||
      protyle.querySelector?.(".protyle-wysiwyg [data-node-id]");
    return focusedBlock?.dataset?.nodeId || "";
  }

  getCurrentDocID() {
    const protyle = this.getActiveProtyle();
    return protyle.querySelector?.(".protyle-title[data-node-id]")?.dataset?.nodeId || "";
  }

  editorIframeMarkdown() {
    const pageUrl = `/plugins/${PLUGIN_NAME}/dist/index.html?v=${encodeURIComponent(PLUGIN_VERSION)}&embedded=1`;
    return `<iframe src="${pageUrl}" style="display: block; width: 100%; height: 720px; min-height: 720px; border: 1px solid var(--b3-border-color); border-radius: 6px; background: var(--b3-theme-background); vertical-align: top;" allowfullscreen allowpopups></iframe>`;
  }

  isExcelFrameElement(element) {
    return element?.matches?.(`iframe[src*="/plugins/${PLUGIN_NAME}/dist/"], iframe[src*="${PLUGIN_NAME}/dist/"]`);
  }

  findExcelFrameFromEvent(event) {
    const path = event.composedPath?.() || [];
    return path.find((item) => this.isExcelFrameElement(item));
  }

  handleEmbedPointer(event) {
    const frame = this.findExcelFrameFromEvent(event);
    if (!frame) return;
    this.captureEmbedScroll(frame);
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
    this.scheduleEmbedScrollRestore();
  }

  decorateEmbeddedFrames() {
    document.querySelectorAll(`iframe[src*="/plugins/${PLUGIN_NAME}/dist/"], iframe[src*="${PLUGIN_NAME}/dist/"]`).forEach((frame) => {
      frame.classList.add("moon-excel-ai-embed__frame");
      frame.setAttribute("allowfullscreen", "");
      frame.setAttribute("allowpopups", "");
      frame.setAttribute("draggable", "false");
      frame.style.display = "block";
      frame.style.width = "100%";
      frame.style.height = "720px";
      frame.style.minHeight = "720px";
      frame.style.maxHeight = "720px";
      frame.style.verticalAlign = "top";

      const hostBlock = frame.closest(".protyle-wysiwyg [data-node-id]");
      hostBlock?.classList.add("moon-excel-ai-embed-block");
      hostBlock?.setAttribute("spellcheck", "false");
      this.attachFrameScrollGuard(frame);
    });
  }

  getEmbedScroller(frame) {
    return frame.closest(".protyle-content") || frame.closest(".layout-tab-container") || document.scrollingElement || document.documentElement;
  }

  captureEmbedScroll(frame, options = {}) {
    const scroller = this.getEmbedScroller(frame);
    if (options.preferExisting && this.embedScrollSnapshot?.frame === frame && this.embedScrollSnapshot?.scroller === scroller) {
      this.embedScrollSnapshot.capturedAt = Date.now();
      return;
    }
    this.embedScrollSnapshot = {
      frame,
      scroller,
      scrollTop: scroller?.scrollTop || 0,
      scrollLeft: scroller?.scrollLeft || 0,
      windowX: window.scrollX || 0,
      windowY: window.scrollY || 0,
      frameTop: frame.getBoundingClientRect?.().top,
      frameLeft: frame.getBoundingClientRect?.().left,
      capturedAt: Date.now(),
    };
  }

  restoreEmbedScroll() {
    const snapshot = this.embedScrollSnapshot;
    if (!snapshot?.scroller?.isConnected) return;
    if (snapshot.frame?.isConnected && Number.isFinite(snapshot.frameTop)) {
      const rect = snapshot.frame.getBoundingClientRect();
      const topDelta = rect.top - snapshot.frameTop;
      const leftDelta = rect.left - snapshot.frameLeft;
      if (Math.abs(topDelta) > 0.5) snapshot.scroller.scrollTop += topDelta;
      if (Math.abs(leftDelta) > 0.5) snapshot.scroller.scrollLeft += leftDelta;
    }
    snapshot.scroller.scrollTop = snapshot.scrollTop;
    snapshot.scroller.scrollLeft = snapshot.scrollLeft;
    if (window.scrollX !== snapshot.windowX || window.scrollY !== snapshot.windowY) {
      window.scrollTo(snapshot.windowX, snapshot.windowY);
    }
  }

  scheduleEmbedScrollRestore() {
    window.requestAnimationFrame(() => {
      this.restoreEmbedScroll();
      window.requestAnimationFrame(this.restoreEmbedScroll);
    });
    window.setTimeout(this.restoreEmbedScroll, 0);
    window.setTimeout(this.restoreEmbedScroll, 50);
    window.setTimeout(this.restoreEmbedScroll, 150);
    window.setTimeout(this.restoreEmbedScroll, 350);
    window.setTimeout(this.restoreEmbedScroll, 800);
  }

  attachFrameScrollGuard(frame) {
    if (frame.dataset.moonExcelScrollGuard === "true") return;
    try {
      const install = () => {
        try {
          const doc = frame.contentDocument;
          const win = frame.contentWindow;
          if (!doc || !win || doc.__moonExcelScrollGuard) return;
          doc.__moonExcelScrollGuard = true;
          const guard = () => {
            this.captureEmbedScroll(frame);
            this.scheduleEmbedScrollRestore();
          };
          ["pointerdown", "mousedown", "mouseup", "click", "dblclick", "focusin"].forEach((type) => {
            doc.addEventListener(type, guard, true);
          });
          win.addEventListener("focus", guard, true);
        } catch (error) {
          console.warn(`[${PLUGIN_NAME}] install iframe scroll guard failed`, error);
        }
      };
      frame.dataset.moonExcelScrollGuard = "true";
      frame.addEventListener("load", install);
      this.captureEmbedScroll(frame);
      install();
    } catch (error) {
      console.warn(`[${PLUGIN_NAME}] attach iframe scroll guard failed`, error);
    }
  }

  findFrameByWindow(source) {
    return [...document.querySelectorAll(`iframe[src*="/plugins/${PLUGIN_NAME}/dist/"], iframe[src*="${PLUGIN_NAME}/dist/"]`)].find(
      (frame) => frame.contentWindow === source
    );
  }

  safeWorkbookID(value) {
    return String(value || "")
      .trim()
      .replace(/[^A-Za-z0-9_-]/g, "_")
      .slice(0, 96);
  }

  getFrameWorkbookID(source) {
    const frame = this.findFrameByWindow(source);
    const hostBlock = frame?.closest?.(".protyle-wysiwyg [data-node-id]");
    const urlID = (() => {
      try {
        return new URL(frame?.getAttribute("src") || "", window.location.origin).searchParams.get("workbook");
      } catch {
        return "";
      }
    })();
    const id = this.safeWorkbookID(hostBlock?.dataset?.nodeId || frame?.dataset?.moonExcelId || urlID);
    if (!id) throw new Error("无法定位当前 Excel 表格块，请重新插入表格后再保存");
    return id;
  }

  workbookDataFile(workbookID) {
    return `workbook-${this.safeWorkbookID(workbookID)}.json`;
  }

  async insertEditorBlock() {
    try {
      const data = this.editorIframeMarkdown();
      const previousID = this.getCurrentBlockID();
      if (previousID) {
        await this.siyuanPost("/api/block/insertBlock", {
          dataType: "markdown",
          data,
          previousID,
        });
      } else {
        const parentID = this.getCurrentDocID();
        if (!parentID) throw new Error("请先打开一个笔记页面，再插入 Excel AI 表格");
        await this.siyuanPost("/api/block/appendBlock", {
          dataType: "markdown",
          data,
          parentID,
        });
      }
      showMessage("已在当前笔记插入 Excel AI 表格");
    } catch (error) {
      console.error(`[${PLUGIN_NAME}] insert editor failed`, error);
      showMessage(`插入失败：${error.message}`);
    }
  }

  async handleFrameMessage(event) {
    const message = event.data || {};
    if (!message || typeof message.type !== "string" || !message.type.startsWith(MESSAGE_PREFIX)) return;
    const reply = (payload) => event.source?.postMessage({ ...payload, id: message.id }, "*");
    try {
      if (message.type === `${MESSAGE_PREFIX}load-settings`) {
        const stored = (await this.loadData(SETTINGS_FILE)) || {};
        reply({ type: `${MESSAGE_PREFIX}settings`, ok: true, data: stored });
        return;
      }
      if (message.type === `${MESSAGE_PREFIX}save-settings`) {
        await this.saveData(SETTINGS_FILE, message.payload || {});
        reply({ type: `${MESSAGE_PREFIX}settings-saved`, ok: true });
        return;
      }
      if (message.type === `${MESSAGE_PREFIX}load-workbook`) {
        const workbookID = this.getFrameWorkbookID(event.source);
        const stored = (await this.loadData(this.workbookDataFile(workbookID))) || null;
        reply({ type: `${MESSAGE_PREFIX}workbook`, ok: true, data: { workbookID, workbook: stored } });
        return;
      }
      if (message.type === `${MESSAGE_PREFIX}save-workbook`) {
        const workbookID = this.getFrameWorkbookID(event.source);
        const workbook = message.payload?.workbook;
        if (!workbook || !Array.isArray(workbook.sheets)) throw new Error("没有可保存的工作簿数据");
        await this.saveData(this.workbookDataFile(workbookID), {
          ...workbook,
          workbookID,
          savedAt: new Date().toISOString(),
        });
        reply({ type: `${MESSAGE_PREFIX}workbook-saved`, ok: true, data: { workbookID } });
        return;
      }
      if (message.type === `${MESSAGE_PREFIX}show-message`) {
        showMessage(String(message.payload?.message || ""));
        reply({ type: `${MESSAGE_PREFIX}message-shown`, ok: true });
      }
    } catch (error) {
      reply({ type: `${MESSAGE_PREFIX}error`, ok: false, error: error.message });
    }
  }
}

module.exports = SiyuanExcelAI;
