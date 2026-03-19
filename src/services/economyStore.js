const fs = require("node:fs");
const path = require("node:path");

const dataDirectory = path.join(__dirname, "..", "..", "data");
const dataFile = path.join(dataDirectory, "economy.json");

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
    console.error("Failed to read economy store:", error);
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

function getEconomyEntry(guildId, userId) {
  const store = readStore();
  return store.entries[buildUserKey(guildId, userId)] || null;
}

function updateEconomyEntry(guildId, userId, updater) {
  const store = readStore();
  const key = buildUserKey(guildId, userId);
  const current = store.entries[key] || {
    guildId,
    userId,
    balance: 0,
    totalEarned: 0,
    totalSpent: 0,
    chatDailyDate: "",
    chatDailyCount: 0,
    lastChatFingerprint: "",
    lastChatMessageAt: "",
    lastChatCoinAt: "",
    lastVoiceCoinAt: "",
    lastVoiceProgressAt: "",
    voiceSessionStartedAt: "",
    voiceSessionEarned: 0,
    voiceEligibilityState: "idle",
    updatedAt: new Date().toISOString()
  };
  const next = updater(current);

  store.entries[key] = {
    ...current,
    ...(next || {}),
    guildId,
    userId,
    updatedAt: new Date().toISOString()
  };

  writeStore(store);
  return store.entries[key];
}

function addCoins(guildId, userId, amount, patch = {}) {
  const increment = Math.max(0, Number.parseInt(String(amount || 0), 10) || 0);

  return updateEconomyEntry(guildId, userId, (current) => ({
    ...patch,
    balance: (current.balance || 0) + increment,
    totalEarned: (current.totalEarned || 0) + increment
  }));
}

function spendCoins(guildId, userId, amount, patch = {}) {
  const decrement = Math.max(0, Number.parseInt(String(amount || 0), 10) || 0);
  const current = getEconomyEntry(guildId, userId) || {
    balance: 0,
    totalSpent: 0
  };

  if ((current.balance || 0) < decrement) {
    return {
      ok: false,
      entry: current
    };
  }

  const next = updateEconomyEntry(guildId, userId, (entry) => ({
    ...patch,
    balance: Math.max(0, (entry.balance || 0) - decrement),
    totalSpent: (entry.totalSpent || 0) + decrement
  }));

  return {
    ok: true,
    entry: next
  };
}

function listEconomyEntries(guildId = "") {
  const store = readStore();

  return Object.values(store.entries).filter((entry) => {
    if (!guildId) {
      return true;
    }

    return entry.guildId === guildId;
  });
}

module.exports = {
  addCoins,
  getEconomyEntry,
  listEconomyEntries,
  spendCoins,
  updateEconomyEntry
};
