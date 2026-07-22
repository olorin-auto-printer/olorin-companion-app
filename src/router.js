// Dispatches incoming WebSocket messages to their handlers and returns the
// response object to send back. Every message now gets a response; see
// docs/PROTOCOL.md for the full contract and backward-compatibility rules.
function createRouter({ optionsStore, listPrinters, executePrint, logger = console }) {
  async function route(rawMessage) {
    let data;
    try {
      data = JSON.parse(rawMessage);
    } catch {
      return { success: false, error: "Invalid JSON message" };
    }

    if (!data || typeof data !== "object" || !data.id) {
      return { success: false, error: "Message must include an id" };
    }

    switch (data.text) {
      case "list-printer":
        try {
          const printers = await listPrinters();
          return { id: "printerList", printer: printers };
        } catch (error) {
          logger.error("list-printer failed:", error);
          return { success: false, error: `Failed to list printers: ${error.message}` };
        }

      case "printer-command":
        try {
          const result = await executePrint(data);
          return { id: "print", success: true, printer: result.printer };
        } catch (error) {
          logger.error("printer-command failed:", error);
          return { id: "print", success: false, error: error.message };
        }

      case "get-options":
        // The options object is sent unwrapped: the extension options page
        // reads fields directly off the response root.
        return optionsStore.load();

      case "set-options":
        if (!data.options || typeof data.options !== "object") {
          return { id: "set-options", success: false, error: "Missing options object" };
        }
        try {
          optionsStore.save(data.options);
          return { id: "set-options", success: true };
        } catch (error) {
          logger.error("set-options failed:", error);
          return { id: "set-options", success: false, error: error.message };
        }

      default:
        return { success: false, error: `Unknown command '${data.text}'` };
    }
  }

  return { route };
}

module.exports = { createRouter };
