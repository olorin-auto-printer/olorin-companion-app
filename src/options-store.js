const fs = require("fs");
const path = require("path");

// Storage for olorin_options.json. The file is searched for in several
// locations for backward compatibility with existing installs; the LAST
// existing path in the list wins, matching the original search loop.
//
// Setting the environment variable OLORIN_CONFIG_FILE to a fully qualified
// file path ( e.g. "C:\opt\olorin_options.json" ) causes the companion
// application to use *only* that path and file.
function createOptionsStore({
  envPath = process.env.OLORIN_CONFIG_FILE,
  appPaths,
  platform = process.platform,
  filename = "olorin_options.json",
  logger = console,
} = {}) {
  function searchPaths() {
    if (envPath) {
      return [envPath];
    }

    const paths = [
      // Relative to the current working directory (historically the exe dir)
      filename,
      path.join(appPaths.home, filename),
      path.join(appPaths.appData, filename),
      path.join(appPaths.userData, filename),
      path.join(appPaths.sessionData, filename),
    ];

    if (platform === "win32") {
      paths.push("C:\\" + filename);
    }

    return paths;
  }

  function resolvePath() {
    let found = "";
    for (const p of searchPaths()) {
      if (fs.existsSync(p)) {
        found = p;
      }
    }

    if (found) {
      return found;
    }

    // No file exists yet: honor the env override if set, otherwise create
    // new files in the per-user data directory.
    return envPath || path.join(appPaths.userData, filename);
  }

  function load() {
    const fileToUse = resolvePath();

    if (!fs.existsSync(fileToUse)) {
      return {};
    }

    try {
      return JSON.parse(fs.readFileSync(fileToUse, "utf8"));
    } catch (error) {
      logger.warn(`Failed to read options file '${fileToUse}': ${error.message}`);
      return {};
    }
  }

  function save(options) {
    const fileToUse = resolvePath();
    fs.writeFileSync(fileToUse, JSON.stringify(options));
    return fileToUse;
  }

  return { resolvePath, load, save };
}

module.exports = { createOptionsStore };
