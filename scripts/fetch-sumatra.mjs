// Downloads the vendored SumatraPDF binary and verifies it against the
// recorded sha256. Only needed when upgrading the pinned version: update
// SUMATRA_VERSION below, run 'npm run fetch-sumatra -- --update' to record
// the new hash, and commit the new exe + hash together.
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SUMATRA_VERSION = "3.6.1";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const exePath = path.join(root, "resources", "win32", "SumatraPDF.exe");
const hashPath = exePath + ".sha256";
const url = `https://www.sumatrapdfreader.org/dl/rel/${SUMATRA_VERSION}/SumatraPDF-${SUMATRA_VERSION}-64.exe`;

const updateHash = process.argv.includes("--update");

console.log(`Downloading SumatraPDF ${SUMATRA_VERSION} (64-bit portable) ...`);
const response = await fetch(url, { redirect: "follow" });
if (!response.ok) {
  console.error(`Download failed: ${response.status} ${response.statusText} for ${url}`);
  process.exit(1);
}

const data = Buffer.from(await response.arrayBuffer());
const actualHash = createHash("sha256").update(data).digest("hex");

if (updateHash) {
  fs.mkdirSync(path.dirname(exePath), { recursive: true });
  fs.writeFileSync(exePath, data);
  fs.writeFileSync(hashPath, actualHash + "\n");
  console.log(`Wrote ${exePath}`);
  console.log(`Recorded sha256 ${actualHash}`);
  process.exit(0);
}

const expectedHash = fs.readFileSync(hashPath, "utf8").trim();
if (actualHash !== expectedHash) {
  console.error("sha256 mismatch!");
  console.error(`  expected: ${expectedHash}`);
  console.error(`  actual:   ${actualHash}`);
  process.exit(1);
}

fs.writeFileSync(exePath, data);
console.log(`Wrote ${exePath} (sha256 verified)`);
