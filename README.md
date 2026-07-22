# Olorin Companion App

A small Electron tray app that gives the Olorin browser extension the
ability to print silently. It listens on a local WebSocket
(`ws://127.0.0.1:9696`), receives slip HTML from the extension, renders it
to PDF, and sends it to the right printer — receipts, stickers, labels, or
full sheets — based on the printer mappings saved from the extension's
settings page.

Works on Windows, macOS, and Linux. Installation files are on the
[release page](https://github.com/olorin-auto-printer/olorin-companion-app/releases).

The browser extension (one shared codebase for Chrome and Firefox) lives in
the `olorin-browser-extension` repository.

## Setup

1. Install the companion app and set it to run at login. The app lives in
   the system tray; closing the window just hides it.
2. Install the Olorin browser extension and use its Settings page to map
   each logical printer (receipt, sticker, paper, full sheet, label) to a
   real printer. Settings are stored by the companion app in
   `olorin_options.json`, so all browsers on the machine share them.
3. See the extension README for the Koha side (print buttons in notice
   templates and the `IntranetSlipPrinterJS` system preference).

## How printing works

- Slip HTML is rendered in a hidden, sandboxed window (JavaScript disabled)
  and converted to PDF with Electron's `printToPDF`. Page sizes and margins
  are in inches.
- **Windows**: the PDF is printed by the bundled
  [SumatraPDF](https://www.sumatrapdfreader.org/) (`resources/win32/`), a
  GPLv3 program invoked as a separate process — see
  `THIRD_PARTY_LICENSES.md`.
- **macOS / Linux**: the PDF is printed with the CUPS `lp` command (the
  Linux packages depend on `cups-client`).
- Printer enumeration uses Electron's `getPrintersAsync` — the app has no
  native/compiled dependencies.

The WebSocket protocol, including backward compatibility with the 1.x
extensions, is documented in [docs/PROTOCOL.md](docs/PROTOCOL.md).

## Configuration

- `olorin_options.json` — created in the app's user data directory on first
  save; several legacy locations are also searched (see
  [docs/PROTOCOL.md](docs/PROTOCOL.md)).
- `OLORIN_CONFIG_FILE` — environment variable forcing a specific options
  file path.
- `OLORIN_PORT` — override the WebSocket port (default 9696).
- `allowed_origins` — optional array in `olorin_options.json` restricting
  which web page origins may talk to the app.

## Development

Requires Node 24+ (see `.nvmrc`).

```sh
npm install
npm start           # run the app
npm test            # vitest unit + integration tests
npm run lint        # eslint + prettier
npm run make        # build platform packages into out/make/
npm run fetch-sumatra  # re-download + verify the vendored SumatraPDF (upgrades only)
```

## License

MIT. The bundled SumatraPDF binary is GPLv3 — see
`THIRD_PARTY_LICENSES.md`.
