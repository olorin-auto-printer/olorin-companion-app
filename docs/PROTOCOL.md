# Olorin Companion WebSocket protocol

The companion app listens on `ws://127.0.0.1:9696` (override the port with the
`OLORIN_PORT` environment variable). Messages are single JSON objects. Every
request must carry a truthy `id` and a `text` command; every request receives
exactly one JSON response.

## Commands

### `hello`

Request:

```json
{ "id": "hello", "text": "hello" }
```

Response: the app version and protocol version. Companion apps older than
2.0.0 send no response to unknown commands, so callers should treat a
timeout as "version unknown".

```json
{ "id": "hello", "version": "2.0.0", "protocol": 2 }
```

### `list-printer`

Request:

```json
{ "id": "printerList", "text": "list-printer" }
```

Response: the installed printers as reported by Electron's
`webContents.getPrintersAsync()`. The `name` field is guaranteed.

```json
{ "id": "printerList", "printer": [{ "name": "EPSON_TM_T88V", "displayName": "..." }] }
```

### `printer-command`

Request:

```json
{
  "id": "print",
  "text": "printer-command",
  "content": "<div>slip HTML</div>",
  "printer": "receipt_printer",
  "pageWidth": "3.125",
  "pageHeight": "8",
  "marginTop": "0",
  "marginRight": "0",
  "marginBottom": "0",
  "marginLeft": "0",
  "orientation": "Portrait"
}
```

Only `content` and `printer` are required. Dimension fields are in inches.
Saved options take precedence over inline fields (`options[key + "_width"] ||
message.pageWidth`, and so on).

Two further print settings are supported, both resolvable from saved options
(`<key>_copies`, `<key>_duplex`) or inline (`copies`, `duplex`): `copies` is
an integer ≥ 1 (default 1), and `duplex` is `"long"` or `"short"`
(double-sided binding edge; anything else means single-sided).

Response (always sent, after the job is handed to the OS spooler or fails):

```json
{ "id": "print", "success": true, "printer": "EPSON_TM_T88V" }
{ "id": "print", "success": false, "error": "Unknown printer 'x'" }
```

#### Printer resolution

1. If the saved options contain the requested value as a key
   (`options["receipt_printer"]` → device name), it is treated as a **logical
   printer key**. This is the current extension model. The five logical keys
   are `receipt_printer`, `sticker_printer`, `paper_printer`,
   `full_sheet_printer`, and `label_printer`.
2. Otherwise the value is matched (case-insensitively) against the installed
   printers' `name` and `displayName` and used as a **raw device name**. This
   keeps the legacy Firefox extension (v1.1), which sent device names,
   working.
3. If neither matches, the response is an error.

### `kick-drawer`

Opens the cash drawer attached to a receipt printer by sending the standard
ESC/POS pulse command (ESC p 0 25 250) as a raw print job.

Request (`printer` resolves exactly like `printer-command`'s):

```json
{ "id": "kick", "text": "kick-drawer", "printer": "receipt_printer" }
```

Response:

```json
{ "id": "kick", "success": true, "printer": "EPSON_TM_T88V" }
{ "id": "kick", "success": false, "error": "..." }
```

### `get-options`

Request:

```json
{ "id": "get-options", "text": "get-options" }
```

Response: the saved options object, **unwrapped** (fields on the response
root — the extension options page depends on this shape), or `{}` when
nothing has been saved.

### `set-options`

Request:

```json
{ "id": "set-options", "text": "set-options", "options": { "receipt_printer": "..." } }
```

Response:

```json
{ "id": "set-options", "success": true }
```

`allowed_origins` cannot be set through this command: it is the setting that
restricts which pages may use this socket, so letting the socket change it
would defeat the point. Any `allowed_origins` in the payload is ignored and
the stored value is preserved; it is editable only in the companion app's
own window.

### Errors

Malformed JSON, a missing `id`, or an unknown `text` produce:

```json
{ "success": false, "error": "..." }
```

## Connection policy

- The server binds to 127.0.0.1 only.
- Connections with no `Origin` header (local tools) are allowed.
- `chrome-extension://` and `moz-extension://` origins are always allowed.
- `http(s)` page origins are allowed by default. Setting a non-empty
  `allowed_origins` array in `olorin_options.json` (e.g.
  `["https://staff.mylibrary.org"]`) restricts page origins to that list;
  extension origins remain allowed.
- Anything else (`file://`, the literal `null` origin) is rejected with 403.

## Options file

Settings are stored in `olorin_options.json`. The file is searched for in the
following locations; the last one that exists wins:

1. The current working directory
2. The user's home directory
3. The per-user application data directory (`appData`)
4. The app's own data directory (`userData`) — new files are created here
5. The app's session data directory
6. `C:\` (Windows only)

Setting the `OLORIN_CONFIG_FILE` environment variable to a fully qualified
path makes the app use only that file.
