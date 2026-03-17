const fs = require("node:fs");
const path = require("node:path");

const dataDirectory = path.join(__dirname, "..", "..", "data");
const dataFile = path.join(dataDirectory, "name-requests.json");

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
    console.error("Failed to read name request store:", error);
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

function createNameRequest(entry) {
  const store = readStore();
  const nextId = store.lastId + 1;
  const id = String(nextId);

  store.lastId = nextId;
  store.entries[id] = {
    id,
    ...entry
  };

  writeStore(store);
  return store.entries[id];
}

function getNameRequest(id) {
  const store = readStore();
  return store.entries[id] || null;
}

function updateNameRequest(id, updater) {
  const store = readStore();
  const current = store.entries[id];

  if (!current) {
    return null;
  }

  store.entries[id] = updater(current);
  writeStore(store);
  return store.entries[id];
}

function findPendingByUser(guildId, userId) {
  const store = readStore();

  return Object.values(store.entries).find((entry) =>
    entry.guildId === guildId && entry.userId === userId && entry.status === "pending"
  ) || null;
}

module.exports = {
  createNameRequest,
  findPendingByUser,
  getNameRequest,
  updateNameRequest
};
