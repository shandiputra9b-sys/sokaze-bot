const fs = require("node:fs");
const path = require("node:path");

const dataDirectory = path.join(__dirname, "..", "..", "data");
const dataFile = path.join(dataDirectory, "stickies.json");

function ensureStore() {
  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
  }

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, `${JSON.stringify({ stickies: {} }, null, 2)}\n`, "utf8");
  }
}

function readStore() {
  ensureStore();

  try {
    const raw = fs.readFileSync(dataFile, "utf8");
    const parsed = JSON.parse(raw || "{}");

    return {
      stickies: parsed.stickies || {}
    };
  } catch (error) {
    console.error("Failed to read sticky store:", error);
    return {
      stickies: {}
    };
  }
}

function writeStore(store) {
  ensureStore();
  fs.writeFileSync(dataFile, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function getStickyKey(guildId, channelId) {
  return `${guildId}:${channelId}`;
}

function getSticky(guildId, channelId) {
  const store = readStore();
  return store.stickies[getStickyKey(guildId, channelId)] || null;
}

function upsertSticky(guildId, channelId, entry) {
  const store = readStore();
  const key = getStickyKey(guildId, channelId);
  const current = store.stickies[key] || {};

  store.stickies[key] = {
    guildId,
    channelId,
    ...current,
    ...entry
  };

  writeStore(store);
  return store.stickies[key];
}

function deleteSticky(guildId, channelId) {
  const store = readStore();
  const key = getStickyKey(guildId, channelId);
  const sticky = store.stickies[key];

  if (!sticky) {
    return null;
  }

  delete store.stickies[key];
  writeStore(store);
  return sticky;
}

function listStickies(matcher = () => true) {
  const store = readStore();

  return Object.values(store.stickies)
    .filter(matcher)
    .sort((left, right) => String(left.channelId).localeCompare(String(right.channelId)));
}

module.exports = {
  deleteSticky,
  getSticky,
  listStickies,
  upsertSticky
};
