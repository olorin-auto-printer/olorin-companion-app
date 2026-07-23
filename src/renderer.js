// Renderer for the companion window: printer settings editor, test prints,
// and the live job log. Talks to the main process only through the
// window.olorin bridge exposed by preload.js.

const PRINTERS = [
  { key: "receipt_printer", labelKey: "printerReceipt" },
  { key: "sticker_printer", labelKey: "printerSticker" },
  { key: "paper_printer", labelKey: "printerPaper" },
  { key: "full_sheet_printer", labelKey: "printerFullSheet" },
  { key: "label_printer", labelKey: "printerLabel" },
];

const NUMBER_FIELDS = [
  ["_width", "Width"],
  ["_height", "Height"],
  ["_margin_top", "Top"],
  ["_margin_bottom", "Bottom"],
  ["_margin_left", "Left"],
  ["_margin_right", "Right"],
];

const Units = window.OlorinUnits;
const Locales = window.OlorinLocales;

// Active string table; loadStatus() swaps it for the OS locale before the
// rest of the UI is built. Missing keys fall back to English, then the key.
let strings = Locales.RENDERER_LOCALES.en;

function t(key, vars) {
  let text = strings[key] ?? Locales.RENDERER_LOCALES.en[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, value);
    }
  }
  return text;
}

// Translate the static HTML: every element carrying data-i18n gets its text
// replaced by the string for that key; data-i18n-title does the same for the
// title (tooltip) attribute.
function applyTranslations() {
  for (const node of document.querySelectorAll("[data-i18n]")) {
    node.textContent = t(node.getAttribute("data-i18n"));
  }
  for (const node of document.querySelectorAll("[data-i18n-title]")) {
    node.title = t(node.getAttribute("data-i18n-title"));
  }
}

// All six number fields are dimensions; stored values are always inches, the
// fields display the active unit ("in" or "mm", persisted as options.units).
const DIMENSION_SUFFIXES = NUMBER_FIELDS.map(([suffix]) => suffix);
const isDimensionField = (id) => DIMENSION_SUFFIXES.some((suffix) => id.endsWith(suffix));

let activeUnits = "in";

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (name === "text") {
      node.textContent = value;
    } else {
      node.setAttribute(name, value);
    }
  }
  for (const child of children) {
    node.append(child);
  }
  return node;
}

// Fill the width/height fields from a preset, converted to the active unit.
// Only the fields change — nothing is saved until the Save button.
function applyPreset(key, select) {
  const preset = Units.getPreset(select.value);
  select.value = "";
  if (!preset) {
    return;
  }
  document.getElementById(key + "_width").value = Units.toDisplay(preset.width, activeUnits);
  document.getElementById(key + "_height").value = Units.toDisplay(preset.height, activeUnits);
}

function buildRow({ key, labelKey }) {
  const row = el("tr");

  row.append(el("td", { class: "printer-label", text: t(labelKey) }));

  const device = el("select", { id: key });
  device.append(el("option", { value: "", text: t("select") }));
  row.append(el("td", {}, [device]));

  const preset = el("select", { id: key + "_preset", class: "preset" });
  preset.append(el("option", { value: "", text: t("presetsPlaceholder") }));
  for (const { id, label } of Units.PAPER_PRESETS) {
    // Preset names are translated when a key exists; label is the fallback.
    preset.append(el("option", { value: id, text: strings[`preset_${id}`] || label }));
  }
  preset.addEventListener("change", () => applyPreset(key, preset));
  row.append(el("td", {}, [preset]));

  for (const [suffix] of NUMBER_FIELDS) {
    row.append(
      el("td", {}, [el("input", { id: key + suffix, type: "number", step: "0.01", min: "0" })]),
    );
  }

  const orientation = el("select", { id: key + "_orientation" });
  for (const [value, text] of [
    ["", t("select")],
    ["Portrait", t("orientationPortrait")],
    ["Landscape", t("orientationLandscape")],
    ["Automatic", t("orientationAutomatic")],
  ]) {
    orientation.append(el("option", { value, text }));
  }
  row.append(el("td", {}, [orientation]));

  row.append(
    el("td", {}, [
      el("input", { id: key + "_copies", type: "number", min: "1", step: "1", placeholder: "1" }),
    ]),
  );

  const duplex = el("select", { id: key + "_duplex" });
  for (const [value, text] of [
    ["", t("duplexOff")],
    ["long", t("duplexLong")],
    ["short", t("duplexShort")],
  ]) {
    duplex.append(el("option", { value, text }));
  }
  row.append(el("td", {}, [duplex]));

  const testButton = el("button", { type: "button", text: t("testButton") });
  testButton.addEventListener("click", () => testPrint(key, testButton));
  const drawerButton = el("button", {
    type: "button",
    text: t("drawerButton"),
    title: t("drawerTitle"),
  });
  drawerButton.addEventListener("click", () => kickDrawer(key, drawerButton));
  row.append(el("td", { class: "actions" }, [testButton, drawerButton]));

  return row;
}

const fieldIds = () =>
  PRINTERS.flatMap(({ key }) => [
    key,
    ...NUMBER_FIELDS.map(([suffix]) => key + suffix),
    key + "_orientation",
    key + "_copies",
    key + "_duplex",
  ]);

async function loadStatus() {
  const status = await window.olorin.getStatus();
  strings = Locales.RENDERER_LOCALES[Locales.pickLocale(status.locale)];
  document.getElementById("status-line").textContent = status.running
    ? t("statusListening", { version: status.version, port: status.port })
    : t("statusNotRunning", { version: status.version });
  document.getElementById("options-path").textContent = t("optionsFile", {
    path: status.optionsPath,
  });
}

async function loadPrinters({ preserveSelections = false } = {}) {
  const printers = await window.olorin.listPrinters();
  for (const { key } of PRINTERS) {
    const select = document.getElementById(key);
    const previous = select.value;
    select.replaceChildren(el("option", { value: "", text: t("select") }));
    for (const printer of printers) {
      select.append(el("option", { value: printer.name, text: printer.name }));
    }
    if (preserveSelections && previous) {
      select.value = previous;
    }
  }
}

// Update the dimension column headers, placeholders, and input steps for the
// active unit.
function applyUnits() {
  const abbrev = t(activeUnits === "mm" ? "unitAbbrevMm" : "unitAbbrevIn");
  for (const th of document.querySelectorAll("th[data-dimension]")) {
    th.textContent = `${t(th.dataset.dimension)} (${abbrev})`;
  }
  for (const id of fieldIds()) {
    if (isDimensionField(id)) {
      const field = document.getElementById(id);
      field.placeholder = abbrev;
      field.step = activeUnits === "mm" ? "0.1" : "0.01";
    }
  }
}

// Convert the displayed dimension values in place when the unit changes.
// The stored file keeps inches and is only rewritten on Save.
function setUnits(next) {
  if (next === activeUnits) {
    return;
  }
  for (const id of fieldIds()) {
    if (isDimensionField(id)) {
      const field = document.getElementById(id);
      field.value = Units.toDisplay(Units.toStored(field.value, activeUnits), next);
    }
  }
  activeUnits = next;
  applyUnits();
}

async function loadOptions() {
  const options = await window.olorin.getOptions();
  activeUnits = options.units === "mm" ? "mm" : "in";
  document.getElementById("units").value = activeUnits;
  applyUnits();
  for (const id of fieldIds()) {
    const field = document.getElementById(id);
    const value = options[id];
    if (field && value !== undefined && value !== null) {
      field.value = isDimensionField(id) ? Units.toDisplay(value, activeUnits) : value;
    }
  }
  const origins = Array.isArray(options.allowed_origins) ? options.allowed_origins : [];
  document.getElementById("allowed-origins").value = origins.join("\n");
}

async function save() {
  const options = {};
  for (const id of fieldIds()) {
    const raw = document.getElementById(id).value;
    options[id] = isDimensionField(id) ? Units.toStored(raw, activeUnits) : raw;
  }
  options.units = activeUnits;

  const origins = document
    .getElementById("allowed-origins")
    .value.split("\n")
    .map((line) => line.trim().replace(/\/+$/, ""))
    .filter((line) => line.length > 0);
  if (origins.length > 0) {
    options.allowed_origins = origins;
  }

  await window.olorin.setOptions(options);

  const toast = document.getElementById("save-msg");
  toast.classList.remove("hide");
  setTimeout(() => toast.classList.add("hide"), 3000);
}

async function testPrint(printerKey, button) {
  button.disabled = true;
  try {
    const result = await window.olorin.testPrint(printerKey);
    if (!result.success) {
      alert(t("testPrintFailed", { error: result.error }));
    }
  } finally {
    button.disabled = false;
  }
}

async function kickDrawer(printerKey, button) {
  button.disabled = true;
  try {
    const result = await window.olorin.kickDrawer(printerKey);
    if (!result.success) {
      alert(t("drawerKickFailed", { error: result.error }));
    }
  } finally {
    button.disabled = false;
  }
}

// Update banner (Linux packaged builds; other platforms auto-update).
let updateUrl = null;

function showUpdateBanner({ version, url }) {
  updateUrl = url;
  document.getElementById("update-banner-text").textContent = t("updateAvailable", { version });
  document.getElementById("update-banner").classList.remove("hide");
}

async function retryJob(jobTime, button) {
  button.disabled = true;
  try {
    const result = await window.olorin.retryJob(jobTime);
    if (!result.success) {
      alert(t("retryFailed", { error: result.error }));
    }
  } finally {
    button.disabled = false;
  }
}

function jobLine(job) {
  const time = new Date(job.time).toLocaleTimeString();
  const what = t(job.type === "kick" ? "jobKick" : "jobPrint");
  const item = el("li", { class: job.success ? "job-ok" : "job-failed" });
  item.textContent = job.success
    ? t("jobLineOk", { time, what, printer: job.printer })
    : t("jobLineFailed", { time, what, printer: job.printer, error: job.error });
  if (job.legacy) {
    item.append(el("span", { class: "tag-legacy", text: t("legacyTag"), title: t("legacyTitle") }));
  }
  if (!job.success) {
    const retryButton = el("button", { type: "button", class: "retry", text: t("retry") });
    retryButton.addEventListener("click", () => retryJob(job.time, retryButton));
    item.append(retryButton);
  }
  return item;
}

function addJob(job) {
  const list = document.getElementById("jobs");
  const empty = document.getElementById("no-jobs");
  if (empty) {
    empty.remove();
  }
  list.prepend(jobLine(job));
  while (list.children.length > 20) {
    list.lastChild.remove();
  }
}

async function init() {
  // Fetch the status first: it carries the OS locale, which must be known
  // before any translated text (static or generated) is rendered.
  await loadStatus();
  applyTranslations();

  const tbody = document.querySelector("#printers tbody");
  for (const printer of PRINTERS) {
    tbody.append(buildRow(printer));
  }

  document.getElementById("save").addEventListener("click", save);
  document
    .getElementById("refresh")
    .addEventListener("click", () => loadPrinters({ preserveSelections: true }));
  document.getElementById("units").addEventListener("change", (event) => {
    setUnits(event.target.value);
  });
  document.getElementById("update-download").addEventListener("click", () => {
    if (updateUrl) {
      window.olorin.openReleasePage(updateUrl);
    }
  });
  document.getElementById("update-dismiss").addEventListener("click", () => {
    document.getElementById("update-banner").classList.add("hide");
  });
  window.olorin.onUpdateAvailable(showUpdateBanner);
  document.getElementById("reveal-log").addEventListener("click", () => window.olorin.revealLog());

  window.olorin.onJob(addJob);

  await loadPrinters();
  await loadOptions();
  for (const job of (await window.olorin.getRecentJobs()).reverse()) {
    addJob(job);
  }
}

init();
