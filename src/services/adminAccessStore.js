const fs = require("node:fs");
const path = require("node:path");

const dataDirectory = path.join(__dirname, "..", "..", "data");
const dataFile = path.join(dataDirectory, "admin-access.json");

function ensureStore() {
  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
  }

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, `${JSON.stringify({ guilds: {} }, null, 2)}\n`, "utf8");
  }
}

function readStore() {
  ensureStore();

  try {
    const raw = fs.readFileSync(dataFile, "utf8");
    const parsed = JSON.parse(raw || "{}");

    return {
      guilds: parsed.guilds || {}
    };
  } catch (error) {
    console.error("Failed to read admin access store:", error);
    return {
      guilds: {}
    };
  }
}

function writeStore(store) {
  ensureStore();
  fs.writeFileSync(dataFile, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function normalizeUserIds(values) {
  return [...new Set((values || [])
    .map((value) => String(value || "").trim())
    .filter(Boolean))];
}

function getAdminAccessSettings(guildId) {
  const store = readStore();
  const current = store.guilds[String(guildId || "")] || null;

  return {
    guildId: String(guildId || ""),
    adminUserIds: normalizeUserIds(current?.adminUserIds)
  };
}

function updateAdminAccessSettings(guildId, updater) {
  const store = readStore();
  const key = String(guildId || "");
  const current = {
    guildId: key,
    adminUserIds: normalizeUserIds(store.guilds[key]?.adminUserIds)
  };
  const next = updater ? updater(current) : current;

  store.guilds[key] = {
    guildId: key,
    adminUserIds: normalizeUserIds(next?.adminUserIds)
  };

  writeStore(store);
  return store.guilds[key];
}

function addAdminUser(guildId, userId) {
  return updateAdminAccessSettings(guildId, (current) => ({
    ...current,
    adminUserIds: [...current.adminUserIds, String(userId || "").trim()]
  }));
}

function removeAdminUser(guildId, userId) {
  return updateAdminAccessSettings(guildId, (current) => ({
    ...current,
    adminUserIds: current.adminUserIds.filter((entry) => entry !== String(userId || "").trim())
  }));
}

function clearAdminUsers(guildId) {
  return updateAdminAccessSettings(guildId, (current) => ({
    ...current,
    adminUserIds: []
  }));
}

module.exports = {
  addAdminUser,
  clearAdminUsers,
  getAdminAccessSettings,
  removeAdminUser,
  updateAdminAccessSettings
};
