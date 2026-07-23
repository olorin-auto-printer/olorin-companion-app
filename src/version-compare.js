// Compare two simple x.y.z version strings numerically. Returns -1, 0, or 1
// (a < b, a == b, a > b). A leading "v" is tolerated and missing segments
// count as 0 ("2.1" equals "2.1.0"). Prerelease suffixes are not supported —
// release tags here are always plain x.y.z.
function compareVersions(a, b) {
  const segments = (version) =>
    String(version)
      .trim()
      .replace(/^v/i, "")
      .split(".")
      .map((part) => {
        const n = parseInt(part, 10);
        return Number.isFinite(n) ? n : 0;
      });

  const left = segments(a);
  const right = segments(b);
  const length = Math.max(left.length, right.length);

  for (let i = 0; i < length; i++) {
    const diff = (left[i] || 0) - (right[i] || 0);
    if (diff !== 0) {
      return diff < 0 ? -1 : 1;
    }
  }
  return 0;
}

module.exports = { compareVersions };
