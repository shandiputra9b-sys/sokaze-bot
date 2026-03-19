const fs = require("node:fs");
const path = require("node:path");

const dataDirectory = path.join(__dirname, "..", "..", "data");
const dataFile = path.join(dataDirectory, "profiles.json");

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
    console.error("Failed to read profile store:", error);
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

function getProfileEntry(guildId, userId) {
  const store = readStore();
  return store.entries[buildUserKey(guildId, userId)] || null;
}

function upsertProfileEntry(guildId, userId, patch) {
  const store = readStore();
  const key = buildUserKey(guildId, userId);
  const current = store.entries[key] || null;

  store.entries[key] = {
    guildId,
    userId,
    ...(current || {}),
    ...(patch || {})
  };

  writeStore(store);
  return store.entries[key];
}

function listProfileEntries(guildId = "") {
  const store = readStore();

  return Object.values(store.entries).filter((entry) => {
    if (!guildId) {
      return true;
    }

    return entry.guildId === guildId;
  });
}

module.exports = {
  getProfileEntry,
  listProfileEntries,
  upsertProfileEntry
};
