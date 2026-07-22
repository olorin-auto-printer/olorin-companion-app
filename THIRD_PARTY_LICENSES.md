# Third-party licenses

## SumatraPDF

`resources/win32/SumatraPDF.exe` is an unmodified copy of the official
64-bit portable build of [SumatraPDF](https://www.sumatrapdfreader.org/)
(version 3.6.1), used on Windows to send rendered PDFs to the printer.

SumatraPDF is licensed under the GNU General Public License version 3
(see `resources/win32/LICENSE-SumatraPDF.txt`). Olorin Companion invokes it
as a separate process (`execFile`) and does not link against it; the two
programs are merely aggregated in one installer, so the companion app's own
MIT license is unaffected.

- Source code: https://github.com/sumatrapdfreader/sumatrapdf
- Download used: https://www.sumatrapdfreader.org/dl/rel/3.6.1/SumatraPDF-3.6.1-64.exe
- SHA-256: see `resources/win32/SumatraPDF.exe.sha256`

To upgrade the vendored binary, bump `SUMATRA_VERSION` in
`scripts/fetch-sumatra.mjs`, run `npm run fetch-sumatra -- --update`, and
commit the new exe and hash together.
