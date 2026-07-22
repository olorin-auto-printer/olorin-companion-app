const path = require("path");
const fs = require("fs");
const { FusesPlugin } = require("@electron-forge/plugin-fuses");
const { FuseV1Options, FuseVersion } = require("@electron/fuses");

module.exports = {
  packagerConfig: {
    // Extensionless: packager picks icon.ico on Windows and icon.png elsewhere
    icon: path.join(__dirname, "src", "icon"),
    asar: {
      // SumatraPDF must live outside the asar archive to be executable
      unpack: "**/resources/win32/**",
    },
    // Development-only files that have no business inside the shipped app
    ignore: [
      /^\/\.github/,
      /^\/\.gitignore$/,
      /^\/\.nvmrc$/,
      /^\/\.prettierignore$/,
      /^\/\.prettierrc\.json$/,
      /^\/docs/,
      /^\/scripts/,
      /^\/test/,
      /^\/eslint\.config\.mjs$/,
      /^\/vitest\.config\.mjs$/,
    ],
  },
  hooks: {
    // Keep the Windows-only SumatraPDF binary out of macOS/Linux packages
    packageAfterCopy: async (config, buildPath, electronVersion, platform) => {
      if (platform !== "win32") {
        fs.rmSync(path.join(buildPath, "resources", "win32"), { recursive: true, force: true });
      }
    },
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        setupIcon: path.join(__dirname, "src", "icon.ico"),
      },
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin"],
    },
    {
      name: "@electron-forge/maker-deb",
      config: {
        options: {
          icon: path.join(__dirname, "src", "icon.png"),
          depends: ["cups-client"],
        },
      },
    },
    {
      name: "@electron-forge/maker-rpm",
      config: {
        options: {
          requires: ["cups-client"],
        },
      },
    },
  ],
  plugins: [
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
