const path = require("path");
const fs = require("fs");
const { FusesPlugin } = require("@electron-forge/plugin-fuses");
const { FuseV1Options, FuseVersion } = require("@electron/fuses");

// macOS signing + notarization activate automatically when the environment
// provides credentials; see the "Signing and releases" section of README.md.
const osxSigning = process.env.APPLE_ID
  ? {
      osxSign: {},
      osxNotarize: {
        appleId: process.env.APPLE_ID,
        appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
        teamId: process.env.APPLE_TEAM_ID,
      },
    }
  : {};

module.exports = {
  packagerConfig: {
    // Extensionless: packager picks icon.ico on Windows and icon.png elsewhere
    icon: path.join(__dirname, "src", "icon"),
    asar: {
      // SumatraPDF and the raw-print helper must live outside the asar
      // archive to be executable
      unpack: "**/resources/win32/**",
    },
    ...osxSigning,
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
        // Windows code signing when credentials are provided, e.g.
        // '/f cert.pfx /p password /tr http://timestamp...' or an Azure
        // Trusted Signing invocation
        ...(process.env.SQUIRREL_SIGN_PARAMS
          ? { signWithParams: process.env.SQUIRREL_SIGN_PARAMS }
          : {}),
      },
    },
    {
      // MSI for GPO/Intune fleet deployment. Requires the WiX v3 toolset on
      // the build machine (preinstalled on GitHub windows runners).
      name: "@electron-forge/maker-wix",
      config: {
        language: 1033,
        manufacturer: "Kyle M Hall",
        icon: path.join(__dirname, "src", "icon.ico"),
        ui: {
          chooseDirectory: true,
        },
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
          // The packaged binary is named after productName, not name
          bin: "Olorin Companion",
          icon: path.join(__dirname, "src", "icon.png"),
          depends: ["cups-client"],
        },
      },
    },
    {
      name: "@electron-forge/maker-rpm",
      config: {
        options: {
          bin: "Olorin Companion",
          requires: ["cups-client"],
        },
      },
    },
  ],
  publishers: [
    {
      name: "@electron-forge/publisher-github",
      config: {
        repository: {
          owner: "olorin-auto-printer",
          name: "olorin-companion-app",
        },
        draft: true,
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
