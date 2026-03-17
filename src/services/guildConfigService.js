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

function getGuildSettings(guildId, defaults = {}) {
  const store = readStore();
  const guildSettings = store[guildId] || {};

  return {
    welcome: {
      ...defaults.welcome,
      ...(guildSettings.welcome || {})
    },
    tickets: {
      ...defaults.tickets,
      ...(guildSettings.tickets || {})
    },
    confessions: {
      ...defaults.confessions,
      ...(guildSettings.confessions || {})
    },
    counting: {
      ...defaults.counting,
      ...(guildSettings.counting || {})
    },
    nameRequests: {
      ...defaults.nameRequests,
      ...(guildSettings.nameRequests || {})
    }
  };
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
