// String tables for the control panel (en/fr/es). The renderer picks the
// table matching the OS locale's language prefix, defaulting to English.
// Wording follows the browser extension's fr/es translations where the same
// concepts appear (its _locales/{fr,es}/messages.json).
//
// Dual-environment module: loaded as a plain <script> by the renderer (where
// it attaches window.OlorinLocales) and required as CommonJS by the tests.
(function () {
  const RENDERER_LOCALES = {
    en: {
      statusStarting: "Starting …",
      statusListening: "v{version} — listening on port {port}",
      statusNotRunning: "v{version} — server not running",
      optionsFile: "Settings file: {path}",
      revealLog: "Reveal log",
      printersHeading: "Printers",
      printersHint:
        "Web pages (Koha slips, for example) pick one of these five printer types; map each " +
        "one you use to a real printer. Sizes and margins are in the selected unit. These are " +
        "the same settings the browser extension edits.",
      unitsLabel: "Units",
      unitsInches: "Inches",
      unitsMillimeters: "Millimeters",
      unitAbbrevIn: "in",
      unitAbbrevMm: "mm",
      refreshPrinters: "Refresh Printers",
      save: "Save",
      savedToast: "Saved",
      colPrinter: "Printer",
      colDevice: "Device",
      colWidth: "Width",
      colHeight: "Height",
      colTop: "Top",
      colBottom: "Bottom",
      colLeft: "Left",
      colRight: "Right",
      colOrientation: "Orientation",
      colCopies: "Copies",
      colDuplex: "Duplex",
      printerReceipt: "Receipt",
      printerSticker: "Sticker",
      printerPaper: "Paper",
      printerFullSheet: "Full Sheet",
      printerLabel: "Label",
      select: "Select",
      presetsPlaceholder: "Presets…",
      preset_receipt_80mm: "80mm receipt",
      preset_receipt_57mm: "57mm receipt",
      preset_dymo_30252: "DYMO 30252 address label",
      preset_dymo_30256: "DYMO 30256 shipping label",
      preset_barcode_label: "Barcode label",
      preset_a4: "A4",
      preset_letter: "Letter",
      orientationPortrait: "Portrait",
      orientationLandscape: "Landscape",
      orientationAutomatic: "Automatic",
      duplexOff: "Off",
      duplexLong: "Long edge",
      duplexShort: "Short edge",
      testButton: "Test",
      drawerButton: "Drawer",
      drawerTitle: "Open the cash drawer attached to this printer",
      accessHeading: "Access control",
      accessHint:
        "By default any web page on this computer may send print jobs. To restrict printing " +
        "to your own web application (e.g. your Koha staff site), list its origins here, one " +
        "per line (e.g. https://staff.mylibrary.org). Browser extensions always keep access. " +
        "Leave empty to allow all pages.",
      recentJobsHeading: "Recent jobs",
      noJobs: "No jobs yet.",
      jobPrint: "Print",
      jobKick: "Drawer kick",
      jobLineOk: "{time} — {what} to {printer}",
      jobLineFailed: "{time} — {what} to {printer} FAILED: {error}",
      retry: "Retry",
      legacyTag: "legacy client",
      legacyTitle: "Sent with the old device-name format; update the browser extension",
      testPrintFailed: "Test print failed: {error}",
      drawerKickFailed: "Drawer kick failed: {error}",
      retryFailed: "Retry failed: {error}",
      updateAvailable: "Version {version} available",
      updateDownload: "Download",
      updateDismiss: "Dismiss",
    },

    fr: {
      statusStarting: "Démarrage …",
      statusListening: "v{version} — à l'écoute sur le port {port}",
      statusNotRunning: "v{version} — serveur non démarré",
      optionsFile: "Fichier de configuration : {path}",
      revealLog: "Afficher le journal",
      printersHeading: "Imprimantes",
      printersHint:
        "Les pages web (les tickets Koha, par exemple) choisissent l'un de ces cinq types " +
        "d'imprimante ; associez chacun de ceux que vous utilisez à une imprimante réelle. " +
        "Les tailles et marges sont dans l'unité sélectionnée. Ce sont les mêmes paramètres " +
        "que ceux de l'extension de navigateur.",
      unitsLabel: "Unités",
      unitsInches: "Pouces",
      unitsMillimeters: "Millimètres",
      unitAbbrevIn: "po",
      unitAbbrevMm: "mm",
      refreshPrinters: "Actualiser les imprimantes",
      save: "Enregistrer",
      savedToast: "Enregistré",
      colPrinter: "Imprimante",
      colDevice: "Imprimante système",
      colWidth: "Largeur",
      colHeight: "Hauteur",
      colTop: "Haut",
      colBottom: "Bas",
      colLeft: "Gauche",
      colRight: "Droite",
      colOrientation: "Orientation",
      colCopies: "Copies",
      colDuplex: "Recto verso",
      printerReceipt: "Tickets",
      printerSticker: "Autocollants",
      printerPaper: "Papier",
      printerFullSheet: "Pleine page",
      printerLabel: "Étiquettes",
      select: "Choisir",
      presetsPlaceholder: "Modèles…",
      preset_receipt_80mm: "Ticket 80 mm",
      preset_receipt_57mm: "Ticket 57 mm",
      preset_dymo_30252: "Étiquette d'adresse DYMO 30252",
      preset_dymo_30256: "Étiquette d'expédition DYMO 30256",
      preset_barcode_label: "Étiquette code-barres",
      preset_a4: "A4",
      preset_letter: "Lettre US",
      orientationPortrait: "Portrait",
      orientationLandscape: "Paysage",
      orientationAutomatic: "Automatique",
      duplexOff: "Désactivé",
      duplexLong: "Bord long",
      duplexShort: "Bord court",
      testButton: "Tester",
      drawerButton: "Tiroir",
      drawerTitle: "Ouvrir le tiroir-caisse relié à cette imprimante",
      accessHeading: "Contrôle d'accès",
      accessHint:
        "Par défaut, toute page web sur cet ordinateur peut envoyer des impressions. Pour " +
        "restreindre l'impression à votre propre application web (p. ex. votre interface " +
        "professionnelle Koha), listez ses origines ici, une par ligne (p. ex. " +
        "https://staff.mylibrary.org). Les extensions de navigateur conservent toujours " +
        "l'accès. Laissez vide pour autoriser toutes les pages.",
      recentJobsHeading: "Travaux récents",
      noJobs: "Aucun travail pour l'instant.",
      jobPrint: "Impression",
      jobKick: "Ouverture du tiroir",
      jobLineOk: "{time} — {what} vers {printer}",
      jobLineFailed: "{time} — {what} vers {printer} ÉCHEC : {error}",
      retry: "Réessayer",
      legacyTag: "client ancien format",
      legacyTitle:
        "Envoyé avec l'ancien format (nom d'imprimante) ; mettez à jour l'extension de navigateur",
      testPrintFailed: "Échec de l'impression test : {error}",
      drawerKickFailed: "Échec de l'ouverture du tiroir : {error}",
      retryFailed: "Échec de la nouvelle tentative : {error}",
      updateAvailable: "Version {version} disponible",
      updateDownload: "Télécharger",
      updateDismiss: "Fermer",
    },

    es: {
      statusStarting: "Iniciando …",
      statusListening: "v{version} — escuchando en el puerto {port}",
      statusNotRunning: "v{version} — servidor no iniciado",
      optionsFile: "Archivo de configuración: {path}",
      revealLog: "Mostrar el registro",
      printersHeading: "Impresoras",
      printersHint:
        "Las páginas web (los recibos de Koha, por ejemplo) eligen uno de estos cinco tipos " +
        "de impresora; asigne cada uno de los que use a una impresora real. Los tamaños y " +
        "márgenes están en la unidad seleccionada. Son los mismos ajustes que edita la " +
        "extensión del navegador.",
      unitsLabel: "Unidades",
      unitsInches: "Pulgadas",
      unitsMillimeters: "Milímetros",
      unitAbbrevIn: "pulg",
      unitAbbrevMm: "mm",
      refreshPrinters: "Actualizar impresoras",
      save: "Guardar",
      savedToast: "Guardado",
      colPrinter: "Impresora",
      colDevice: "Impresora del sistema",
      colWidth: "Ancho",
      colHeight: "Alto",
      colTop: "Superior",
      colBottom: "Inferior",
      colLeft: "Izquierdo",
      colRight: "Derecho",
      colOrientation: "Orientación",
      colCopies: "Copias",
      colDuplex: "Dúplex",
      printerReceipt: "Recibos",
      printerSticker: "Pegatinas",
      printerPaper: "Papel",
      printerFullSheet: "Página completa",
      printerLabel: "Etiquetas",
      select: "Seleccionar",
      presetsPlaceholder: "Preajustes…",
      preset_receipt_80mm: "Recibo de 80 mm",
      preset_receipt_57mm: "Recibo de 57 mm",
      preset_dymo_30252: "Etiqueta de dirección DYMO 30252",
      preset_dymo_30256: "Etiqueta de envío DYMO 30256",
      preset_barcode_label: "Etiqueta de código de barras",
      preset_a4: "A4",
      preset_letter: "Carta",
      orientationPortrait: "Vertical",
      orientationLandscape: "Horizontal",
      orientationAutomatic: "Automática",
      duplexOff: "Desactivado",
      duplexLong: "Borde largo",
      duplexShort: "Borde corto",
      testButton: "Probar",
      drawerButton: "Cajón",
      drawerTitle: "Abrir el cajón portamonedas conectado a esta impresora",
      accessHeading: "Control de acceso",
      accessHint:
        "De forma predeterminada, cualquier página web de este equipo puede enviar trabajos " +
        "de impresión. Para restringir la impresión a su propia aplicación web (p. ej., su " +
        "sitio de personal de Koha), liste aquí sus orígenes, uno por línea (p. ej., " +
        "https://staff.mylibrary.org). Las extensiones del navegador siempre conservan el " +
        "acceso. Déjelo vacío para permitir todas las páginas.",
      recentJobsHeading: "Trabajos recientes",
      noJobs: "Aún no hay trabajos.",
      jobPrint: "Impresión",
      jobKick: "Apertura del cajón",
      jobLineOk: "{time} — {what} a {printer}",
      jobLineFailed: "{time} — {what} a {printer} FALLÓ: {error}",
      retry: "Reintentar",
      legacyTag: "cliente de formato antiguo",
      legacyTitle:
        "Enviado con el formato antiguo (nombre de impresora); actualice la extensión del navegador",
      testPrintFailed: "Error en la impresión de prueba: {error}",
      drawerKickFailed: "Error al abrir el cajón: {error}",
      retryFailed: "Error al reintentar: {error}",
      updateAvailable: "Versión {version} disponible",
      updateDownload: "Descargar",
      updateDismiss: "Cerrar",
    },
  };

  // "fr-FR", "fr_CA", "fr" all pick fr; anything unknown falls back to en.
  function pickLocale(locale) {
    const prefix = String(locale || "")
      .toLowerCase()
      .split(/[-_]/)[0];
    return Object.prototype.hasOwnProperty.call(RENDERER_LOCALES, prefix) ? prefix : "en";
  }

  const OlorinLocales = { RENDERER_LOCALES, pickLocale };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = OlorinLocales;
  }
  if (typeof window !== "undefined") {
    window.OlorinLocales = OlorinLocales;
  }
})();
