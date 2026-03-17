const fs = require("node:fs");
const path = require("node:path");

const dataDirectory = path.join(__dirname, "..", "..", "data");
const dataFile = path.join(dataDirectory, "reaction-roles.json");

function ensureStore() {
  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
  }

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, `${JSON.stringify({ lastPanelId: 0, panels: {} }, null, 2)}\n`, "utf8");
  }
}

function readStore() {
  ensureStore();

  try {
    const raw = fs.readFileSync(dataFile, "utf8");
    const parsed = JSON.parse(raw || "{}");

    return {
      lastPanelId: parsed.lastPanelId || 0,
      panels: parsed.panels || {}
    };
  } catch (error) {
    console.error("Failed to read reaction role store:", error);
    return {
      lastPanelId: 0,
      panels: {}
    };
  }
}

function writeStore(store) {
  ensureStore();
  fs.writeFileSync(dataFile, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function createPanel(entry) {
  const store = readStore();
  const nextId = store.lastPanelId + 1;
  const id = String(nextId);

  store.lastPanelId = nextId;
  store.panels[id] = {
    id,
    ...entry
  };

  writeStore(store);
  return store.panels[id];
}

function getPanel(id) {
  const store = readStore();
  return store.panels[id] || null;
}

function updatePanel(id, updater) {
  const store = readStore();
  const current = store.panels[id];

  if (!current) {
    return null;
  }

  store.panels[id] = updater(current);
  writeStore(store);
  return store.panels[id];
}

function deletePanel(id) {
  const store = readStore();
  const current = store.panels[id];

  if (!current) {
    return null;
  }

  delete store.panels[id];
  writeStore(store);
  return current;
}

function listPanels(matcher = () => true) {
  const store = readStore();

  return Object.values(store.panels)
    .filter(matcher)
    .sort((left, right) => Number(left.id) - Number(right.id));
}

module.exports = {
  createPanel,
  deletePanel,
  getPanel,
  listPanels,
  updatePanel
};
