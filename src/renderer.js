// Renderer for the companion window: printer settings editor, test prints,
// and the live job log. Talks to the main process only through the
// window.olorin bridge exposed by preload.js.

const PRINTERS = [
  { key: "receipt_printer", label: "Receipt" },
  { key: "sticker_printer", label: "Sticker" },
  { key: "paper_printer", label: "Paper" },
  { key: "full_sheet_printer", label: "Full Sheet" },
  { key: "label_printer", label: "Label" },
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

function buildRow({ key, label }) {
  const row = el("tr");

  row.append(el("td", { class: "printer-label", text: label }));

  const device = el("select", { id: key });
  device.append(el("option", { value: "", text: "Select" }));
  row.append(el("td", {}, [device]));

  const preset = el("select", { id: key + "_preset", class: "preset" });
  preset.append(el("option", { value: "", text: "Presets…" }));
  for (const { id, label: presetLabel } of Units.PAPER_PRESETS) {
    preset.append(el("option", { value: id, text: presetLabel }));
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
    ["", "Select"],
    ["Portrait", "Portrait"],
    ["Landscape", "Landscape"],
    ["Automatic", "Automatic"],
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
    ["", "Off"],
    ["long", "Long edge"],
    ["short", "Short edge"],
  ]) {
    duplex.append(el("option", { value, text }));
  }
  row.append(el("td", {}, [duplex]));

  const testButton = el("button", { type: "button", text: "Test" });
  testButton.addEventListener("click", () => testPrint(key, testButton));
  const drawerButton = el("button", {
    type: "button",
    text: "Drawer",
    title: "Open the cash drawer attached to this printer",
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
  document.getElementById("status-line").textContent = status.running
    ? `v${status.version} — listening on port ${status.port}`
    : `v${status.version} — server not running`;
  document.getElementById("options-path").textContent = `Settings file: ${status.optionsPath}`;
}

async function loadPrinters({ preserveSelections = false } = {}) {
  const printers = await window.olorin.listPrinters();
  for (const { key } of PRINTERS) {
    const select = document.getElementById(key);
    const previous = select.value;
    select.replaceChildren(el("option", { value: "", text: "Select" }));
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
  const abbrev = activeUnits === "mm" ? "mm" : "in";
  for (const th of document.querySelectorAll("th[data-dimension]")) {
    th.textContent = `${th.dataset.dimension} (${abbrev})`;
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
      alert(`Test print failed: ${result.error}`);
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
      alert(`Drawer kick failed: ${result.error}`);
    }
  } finally {
    button.disabled = false;
  }
}

// Update banner (Linux packaged builds; other platforms auto-update).
let updateUrl = null;

function showUpdateBanner({ version, url }) {
  updateUrl = url;
  document.getElementById("update-banner-text").textContent = `Version ${version} available`;
  document.getElementById("update-banner").classList.remove("hide");
}

function jobLine(job) {
  const time = new Date(job.time).toLocaleTimeString();
  const what = job.type === "kick" ? "Drawer kick" : "Print";
  const item = el("li", { class: job.success ? "job-ok" : "job-failed" });
  item.textContent = job.success
    ? `${time} — ${what} to ${job.printer}`
    : `${time} — ${what} to ${job.printer} FAILED: ${job.error}`;
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

  window.olorin.onJob(addJob);

  await loadStatus();
  await loadPrinters();
  await loadOptions();
  for (const job of (await window.olorin.getRecentJobs()).reverse()) {
    addJob(job);
  }
}

init();
