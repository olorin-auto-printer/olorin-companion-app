// Error type for failures in the print pipeline. The message is safe to send
// back to the extension and show in a notification.
class PrintError extends Error {
  constructor(message) {
    super(message);
    this.name = "PrintError";
  }
}

module.exports = { PrintError };
