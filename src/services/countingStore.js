const fs = require("node:fs");
const path = require("node:path");

const dataDirectory = path.join(__dirname, "..", "..", "data");
const dataFile = path.join(dataDirectory, "counting.json");

function ensureStore() {
  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
  }

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, "{}\n", "utf8");
  }
}

function readStore() {
  ensureStore();

  try {
    return JSON.parse(fs.readFileSync(dataFile, "utf8") || "{}");
  } catch (error) {
    console.error("Failed to read counting store:", error);
    return {};
  }
}

function writeStore(store) {
  ensureStore();
  fs.writeFileSync(dataFile, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function getCountingState(guildId, defaults = {}) {
  const store = readStore();
  const current = store[guildId] || {};

  return {
    currentNumber: typeof current.currentNumber === "number"
      ? current.currentNumber
      : Math.max((defaults.startNumber || 1) - 1, 0),
    lastUserId: current.lastUserId || null
  };
}

function updateCountingState(guildId, updater) {
  const store = readStore();
  const current = store[guildId] || {};
  store[guildId] = updater(current);
  writeStore(store);
  return store[guildId];
}

function resetCountingState(guildId, startNumber = 1) {
  return updateCountingState(guildId, () => ({
    currentNumber: Math.max(startNumber - 1, 0),
    lastUserId: null
  }));
}

module.exports = {
  getCountingState,
  resetCountingState,
  updateCountingState
};
