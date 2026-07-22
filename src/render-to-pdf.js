const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const { PrintError } = require("./errors");

// Chromium rejects data: URLs beyond ~2 MB; fall back to a temp file well
// before that.
const DATA_URL_LIMIT = 1_500_000;

// Render slip HTML to a PDF buffer in a hidden, hardened window. The HTML
// comes off the wire, so the window runs sandboxed with JavaScript disabled —
// slips are static markup captured from an already-rendered page.
function createRenderToPdf({ BrowserWindow, tempDir, timeoutMs = 15000 }) {
  return async function renderToPdf(html, pdfOptions) {
    if (typeof html !== "string" || html.length === 0) {
      throw new PrintError("No content to print");
    }

    const window = new BrowserWindow({
      show: false,
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        javascript: false,
      },
    });

    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new PrintError("Timed out loading print content")),
        timeoutMs,
      );
    });

    let tempHtmlPath;
    try {
      const dataUrl = `data:text/html;charset=UTF-8,${encodeURIComponent(html)}`;

      let load;
      if (dataUrl.length > DATA_URL_LIMIT) {
        tempHtmlPath = path.join(tempDir, `olorin-print-${Date.now()}-${randomUUID()}.html`);
        await fs.promises.writeFile(tempHtmlPath, html);
        load = window.loadFile(tempHtmlPath);
      } else {
        load = window.loadURL(dataUrl);
      }

      await Promise.race([load, timeout]);

      return await window.webContents.printToPDF(pdfOptions);
    } catch (error) {
      if (error instanceof PrintError) {
        throw error;
      }
      throw new PrintError(`Failed to render print content: ${error.message}`);
    } finally {
      clearTimeout(timer);
      if (tempHtmlPath) {
        fs.promises.unlink(tempHtmlPath).catch(() => {});
      }
      if (!window.isDestroyed()) {
        window.destroy();
      }
    }
  };
}

module.exports = { createRenderToPdf, DATA_URL_LIMIT };
