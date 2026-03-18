const fs = require("node:fs");
const path = require("node:path");

const dataDirectory = path.join(__dirname, "..", "..", "data");
const dataFile = path.join(dataDirectory, "id-cards.json");

function ensureStore() {
  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
  }

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, `${JSON.stringify({ cards: {} }, null, 2)}\n`, "utf8");
  }
}

function readStore() {
  ensureStore();

  try {
    const raw = fs.readFileSync(dataFile, "utf8");
    const parsed = JSON.parse(raw || "{}");

    return {
      cards: parsed.cards || {}
    };
  } catch (error) {
    console.error("Failed to read id card store:", error);
    return {
      cards: {}
    };
  }
}

function writeStore(store) {
  ensureStore();
  fs.writeFileSync(dataFile, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function getCardKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

function getIdCard(guildId, userId) {
  const store = readStore();
  return store.cards[getCardKey(guildId, userId)] || null;
}

function upsertIdCard(guildId, userId, entry) {
  const store = readStore();
  const key = getCardKey(guildId, userId);
  const current = store.cards[key] || {};

  store.cards[key] = {
    guildId,
    userId,
    ...current,
    ...entry
  };

  writeStore(store);
  return store.cards[key];
}

function deleteIdCard(guildId, userId) {
  const store = readStore();
  const key = getCardKey(guildId, userId);

  if (!store.cards[key]) {
    return null;
  }

  const deleted = store.cards[key];
  delete store.cards[key];
  writeStore(store);
  return deleted;
}

module.exports = {
  deleteIdCard,
  getIdCard,
  upsertIdCard
};
