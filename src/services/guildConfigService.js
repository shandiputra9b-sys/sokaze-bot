const fs = require("node:fs");
const path = require("node:path");

const dataDirectory = path.join(__dirname, "..", "..", "data");
const dataFile = path.join(dataDirectory, "guild-config.json");

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
    const raw = fs.readFileSync(dataFile, "utf8");
    return JSON.parse(raw || "{}");
  } catch (error) {
    console.error("Failed to read guild config store:", error);
    return {};
  }
}

function writeStore(store) {
  ensureStore();
  fs.writeFileSync(dataFile, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mergeSettings(defaults, current) {
  if (!isPlainObject(defaults) || !isPlainObject(current)) {
    return current === undefined ? defaults : current;
  }

  const merged = {
    ...defaults,
    ...current
  };

  for (const key of Object.keys(defaults)) {
    if (key in current) {
      merged[key] = mergeSettings(defaults[key], current[key]);
    }
  }

  return merged;
}

function getGuildSettings(guildId, defaults = {}) {
  const store = readStore();
  const guildSettings = store[guildId] || {};

  return mergeSettings(defaults, guildSettings);
}

function updateGuildSettings(guildId, updater) {
  const store = readStore();
  const current = store[guildId] || {};
  const next = updater(current);

  store[guildId] = next;
  writeStore(store);

  return next;
}

module.exports = {
  getGuildSettings,
  updateGuildSettings
};
