const fs = require("node:fs");
const path = require("node:path");

const dataDirectory = path.join(__dirname, "..", "..", "data");
const dataFile = path.join(dataDirectory, "afk.json");

function ensureStore() {
  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
  }

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, `${JSON.stringify({ entries: {} }, null, 2)}\n`, "utf8");
  }
}

function readStore() {
  ensureStore();

  try {
    const raw = fs.readFileSync(dataFile, "utf8");
    const parsed = JSON.parse(raw || "{}");

    return {
      entries: parsed.entries || {}
    };
  } catch (error) {
    console.error("Failed to read AFK store:", error);
    return {
      entries: {}
    };
  }
}

function writeStore(store) {
  ensureStore();
  fs.writeFileSync(dataFile, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function buildUserKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

function getAfkEntry(guildId, userId) {
  const store = readStore();
  return store.entries[buildUserKey(guildId, userId)] || null;
}

function setAfkEntry(guildId, userId, patch) {
  const store = readStore();
  const key = buildUserKey(guildId, userId);

  store.entries[key] = {
    guildId,
    userId,
    ...(store.entries[key] || {}),
    ...(patch || {})
  };

  writeStore(store);
  return store.entries[key];
}

function deleteAfkEntry(guildId, userId) {
  const store = readStore();
  const key = buildUserKey(guildId, userId);
  const current = store.entries[key] || null;

  if (current) {
    delete store.entries[key];
    writeStore(store);
  }

  return current;
}

module.exports = {
  deleteAfkEntry,
  getAfkEntry,
  setAfkEntry
};
