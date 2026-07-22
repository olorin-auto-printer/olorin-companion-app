import { describe, it, expect, beforeEach, vi } from "vitest";

import { createRouter } from "../src/router";

describe("router", () => {
  let optionsStore;
  let listPrinters;
  let executePrint;
  let router;

  beforeEach(() => {
    optionsStore = {
      load: vi.fn().mockReturnValue({ receipt_printer: "EPSON" }),
      save: vi.fn(),
    };
    listPrinters = vi.fn().mockResolvedValue([{ name: "EPSON" }]);
    executePrint = vi.fn().mockResolvedValue({ printer: "EPSON" });
    router = createRouter({
      optionsStore,
      listPrinters,
      executePrint,
      logger: { error: vi.fn() },
    });
  });

  function send(message) {
    return router.route(JSON.stringify(message));
  }

  it("responds to list-printer with the printer list", async () => {
    const response = await send({ id: "printerList", text: "list-printer" });
    expect(response).toEqual({ id: "printerList", printer: [{ name: "EPSON" }] });
  });

  it("responds with an error when listing printers fails", async () => {
    listPrinters.mockRejectedValue(new Error("boom"));
    const response = await send({ id: "printerList", text: "list-printer" });
    expect(response.success).toBe(false);
    expect(response.error).toMatch(/boom/);
  });

  it("responds to printer-command with success and the resolved printer", async () => {
    const message = {
      id: "print",
      text: "printer-command",
      content: "<p>x</p>",
      printer: "receipt_printer",
    };
    const response = await send(message);
    expect(executePrint).toHaveBeenCalledWith(expect.objectContaining(message));
    expect(response).toEqual({ id: "print", success: true, printer: "EPSON" });
  });

  it("responds to printer-command with an error when printing fails", async () => {
    executePrint.mockRejectedValue(new Error("Unknown printer 'nope'"));
    const response = await send({ id: "print", text: "printer-command", printer: "nope" });
    expect(response).toEqual({ id: "print", success: false, error: "Unknown printer 'nope'" });
  });

  it("responds to get-options with the raw, unwrapped options object", async () => {
    const response = await send({ id: "get-options", text: "get-options" });
    // The extension options page reads fields directly off the response root,
    // so there must be no wrapper object.
    expect(response).toEqual({ receipt_printer: "EPSON" });
  });

  it("saves options and confirms on set-options", async () => {
    const options = { receipt_printer: "Star TSP100" };
    const response = await send({ id: "set-options", text: "set-options", options });
    expect(optionsStore.save).toHaveBeenCalledWith(options);
    expect(response).toEqual({ id: "set-options", success: true });
  });

  it("rejects set-options without an options object", async () => {
    const response = await send({ id: "set-options", text: "set-options" });
    expect(response.success).toBe(false);
    expect(optionsStore.save).not.toHaveBeenCalled();
  });

  it("responds with an error when saving options fails", async () => {
    optionsStore.save.mockImplementation(() => {
      throw new Error("EACCES");
    });
    const response = await send({ id: "set-options", text: "set-options", options: {} });
    expect(response).toEqual({ id: "set-options", success: false, error: "EACCES" });
  });

  it("responds with an error to malformed JSON instead of throwing", async () => {
    const response = await router.route("{not json");
    expect(response).toEqual({ success: false, error: "Invalid JSON message" });
  });

  it("responds with an error when the message has no id", async () => {
    const response = await send({ text: "list-printer" });
    expect(response.success).toBe(false);
  });

  it("responds with an error to unknown commands", async () => {
    const response = await send({ id: "x", text: "make-coffee" });
    expect(response).toEqual({ success: false, error: "Unknown command 'make-coffee'" });
  });
});
