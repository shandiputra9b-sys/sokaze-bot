const fs = require("node:fs");
const path = require("node:path");

const dataDirectory = path.join(__dirname, "..", "..", "data");
const dataFile = path.join(dataDirectory, "confessions.json");

function ensureStore() {
  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
  }

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, `${JSON.stringify({ lastId: 0, entries: {} }, null, 2)}\n`, "utf8");
  }
}

function readStore() {
  ensureStore();

  try {
    const raw = fs.readFileSync(dataFile, "utf8");
    const parsed = JSON.parse(raw || "{}");

    return {
      lastId: parsed.lastId || 0,
      entries: parsed.entries || {}
    };
  } catch (error) {
    console.error("Failed to read confession store:", error);
    return {
      lastId: 0,
      entries: {}
    };
  }
}

function writeStore(store) {
  ensureStore();
  fs.writeFileSync(dataFile, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function createEntry(entry) {
  const store = readStore();
  const nextId = store.lastId + 1;
  const normalizedId = String(nextId);

  store.lastId = nextId;
  store.entries[normalizedId] = {
    id: normalizedId,
    ...entry
  };

  writeStore(store);

  return store.entries[normalizedId];
}

function updateEntry(id, updater) {
  const store = readStore();
  const current = store.entries[id];

  if (!current) {
    return null;
  }

  store.entries[id] = updater(current);
  writeStore(store);
  return store.entries[id];
}

function getEntry(id) {
  const store = readStore();
  return store.entries[id] || null;
}

module.exports = {
  createEntry,
  getEntry,
  updateEntry
};
