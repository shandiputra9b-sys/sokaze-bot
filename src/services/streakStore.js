const fs = require("node:fs");
const path = require("node:path");

const dataDirectory = path.join(__dirname, "..", "..", "data");
const dataFile = path.join(dataDirectory, "streaks.json");

function ensureStore() {
  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
  }

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, `${JSON.stringify({ pairs: {} }, null, 2)}\n`, "utf8");
  }
}

function readStore() {
  ensureStore();

  try {
    const raw = fs.readFileSync(dataFile, "utf8");
    const parsed = JSON.parse(raw || "{}");

    return {
      pairs: parsed.pairs || {}
    };
  } catch (error) {
    console.error("Failed to read streak store:", error);
    return {
      pairs: {}
    };
  }
}

function writeStore(store) {
  ensureStore();
  fs.writeFileSync(dataFile, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function buildPairKey(userAId, userBId) {
  return [userAId, userBId].sort((left, right) => left.localeCompare(right)).join(":");
}

function buildStoreKey(guildId, pairKey) {
  return `${guildId}:${pairKey}`;
}

function getPairByKey(guildId, pairKey) {
  const store = readStore();
  const entry = store.pairs[buildStoreKey(guildId, pairKey)];

  return entry || null;
}

function getPair(guildId, userAId, userBId) {
  return getPairByKey(guildId, buildPairKey(userAId, userBId));
}

function upsertPair(guildId, userAId, userBId, updater) {
  const pairKey = buildPairKey(userAId, userBId);
  const storeKey = buildStoreKey(guildId, pairKey);
  const store = readStore();
  const current = store.pairs[storeKey] || {
    guildId,
    pairKey,
    userIds: pairKey.split(":"),
    currentStreak: 0,
    bestStreak: 0,
    acceptedAt: "",
    lastCompletedDate: "",
    pendingInvite: null,
    dailyState: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const next = updater(current);

  store.pairs[storeKey] = {
    ...next,
    guildId,
    pairKey,
    userIds: current.userIds,
    updatedAt: new Date().toISOString()
  };
  writeStore(store);

  return store.pairs[storeKey];
}

function deletePair(guildId, userAId, userBId) {
  const pairKey = buildPairKey(userAId, userBId);
  const storeKey = buildStoreKey(guildId, pairKey);
  const store = readStore();
  const current = store.pairs[storeKey] || null;

  if (current) {
    delete store.pairs[storeKey];
    writeStore(store);
  }

  return current;
}

function listPairs(filter) {
  const store = readStore();
  const entries = Object.values(store.pairs);

  return typeof filter === "function" ? entries.filter(filter) : entries;
}

module.exports = {
  buildPairKey,
  deletePair,
  getPair,
  getPairByKey,
  listPairs,
  upsertPair
};
