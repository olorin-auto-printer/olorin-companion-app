# Olorin Companion App

A small Electron tray app that gives the Olorin browser extension the
ability to print silently. It listens on a local WebSocket
(`ws://127.0.0.1:9696`), receives slip HTML from the extension, renders it
to PDF, and sends it to the right printer — receipts, stickers, labels, or
full sheets — based on the printer mappings saved from the extension's
settings page. Olorin was developed for the Koha ILS and works with it out
of the box, but any web application that embeds its print markup can use
it — see the extension README.

Works on Windows, macOS, and Linux. Installation files are on the
[release page](https://github.com/olorin-auto-printer/olorin-companion-app/releases).

The browser extension (one shared codebase for Chrome and Firefox) lives in
the `olorin-browser-extension` repository.

## Setup

1. Install the companion app and set it to run at login. The app lives in
   the system tray; closing the window just hides it.
2. Map each logical printer (receipt, sticker, paper, full sheet, label) to
   a real printer — either in the companion app's own window or in the
   browser extension's Settings page; both edit the same settings, stored
   by the companion app in `olorin_options.json` and shared by every
   browser on the machine. Per-printer page size, margins, orientation,
   copies, and duplex are supported. Use the Test button on each row to
   verify a mapping.
3. See the extension README for the web-page side: the print-button
   markup any application can embed, plus Koha specifics (notice
   templates and the `IntranetSlipPrinterJS` system preference).

The app window also shows a live log of recent print jobs, and each printer
row has a Drawer button that opens a cash drawer connected to that printer
(standard ESC/POS kick; web pages can trigger the same via a
`data-action="cash-drawer"` button — see the extension docs).

On Windows and macOS the app updates itself automatically from published
GitHub releases (on macOS, keep the app in /Applications).

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

## Signing and releases

Tagging `vX.Y.Z` runs the Release workflow, which builds installers on all
three platforms and uploads them to a **draft** GitHub release; publish the
draft to ship. Published releases feed the Windows auto-updater.

Code signing activates automatically when credentials are present in the
build environment (set them as repository secrets and export them in the
release workflow when available):

- **macOS** (four repository secrets):
  - `APPLE_CERTIFICATE_P12` — the "Developer ID Application" certificate
    exported from Keychain Access as a .p12, base64-encoded
    (`base64 -i cert.p12 | pbcopy`)
  - `APPLE_CERTIFICATE_PASSWORD` — the password chosen for that .p12 export
  - `APPLE_ID` — the Apple Account email of the enrolled developer
  - `APPLE_APP_SPECIFIC_PASSWORD` — an app-specific password generated at
    account.apple.com (Sign-In and Security → App-Specific Passwords)
  - `APPLE_TEAM_ID` — the 10-character Team ID from the developer account's
    membership page

  The release workflow imports the certificate into the runner's keychain
  and Forge signs, hardens, and notarizes the app automatically. Once the
  first notarized release ships, macOS auto-update can be enabled in
  `src/index.js`.

- **Windows**: `SQUIRREL_SIGN_PARAMS` — the signtool parameter string
  (certificate or Azure Trusted Signing invocation).

Troubleshooting: the app writes a log via electron-log (on macOS
`~/Library/Logs/olorin_companion/main.log`; on Windows
`%USERPROFILE%\AppData\Roaming\olorin_companion\logs\main.log`).

## License

MIT. The bundled SumatraPDF binary is GPLv3 — see
`THIRD_PARTY_LICENSES.md`.
