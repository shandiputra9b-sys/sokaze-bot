const fs = require("node:fs");
const path = require("node:path");

const dataDirectory = path.join(__dirname, "..", "..", "data");
const dataFile = path.join(dataDirectory, "bot-permissions.json");

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
    console.error("Failed to read bot permission store:", error);
    return {
      guilds: {}
    };
  }
}

function writeStore(store) {
  ensureStore();
  fs.writeFileSync(dataFile, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function normalizeAccessName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 32);
}

function normalizeRoleIds(values) {
  return [...new Set((values || [])
    .map((value) => String(value || "").trim())
    .filter(Boolean))];
}

function normalizeAccessMap(accessMap) {
  const entries = Object.entries(accessMap || {})
    .map(([accessName, roleIds]) => [normalizeAccessName(accessName), normalizeRoleIds(roleIds)])
    .filter(([accessName, roleIds]) => accessName && roleIds.length);

  return Object.fromEntries(entries);
}

function getBotPermissionSettings(guildId) {
  const store = readStore();
  const key = String(guildId || "");
  const current = store.guilds[key] || null;

  return {
    guildId: key,
    accessRoles: normalizeAccessMap(current?.accessRoles)
  };
}

function updateBotPermissionSettings(guildId, updater) {
  const store = readStore();
  const key = String(guildId || "");
  const current = {
    guildId: key,
    accessRoles: normalizeAccessMap(store.guilds[key]?.accessRoles)
  };
  const next = updater ? updater(current) : current;

  store.guilds[key] = {
    guildId: key,
    accessRoles: normalizeAccessMap(next?.accessRoles)
  };

  writeStore(store);
  return store.guilds[key];
}

function addAccessRole(guildId, accessName, roleId) {
  const normalizedAccess = normalizeAccessName(accessName);
  const normalizedRoleId = String(roleId || "").trim();

  return updateBotPermissionSettings(guildId, (current) => ({
    ...current,
    accessRoles: {
      ...current.accessRoles,
      [normalizedAccess]: [
        ...(current.accessRoles[normalizedAccess] || []),
        normalizedRoleId
      ]
    }
  }));
}

function removeAccessRole(guildId, accessName, roleId) {
  const normalizedAccess = normalizeAccessName(accessName);
  const normalizedRoleId = String(roleId || "").trim();

  return updateBotPermissionSettings(guildId, (current) => {
    const nextAccessRoles = {
      ...current.accessRoles,
      [normalizedAccess]: (current.accessRoles[normalizedAccess] || [])
        .filter((entry) => entry !== normalizedRoleId)
    };

    if (!nextAccessRoles[normalizedAccess]?.length) {
      delete nextAccessRoles[normalizedAccess];
    }

    return {
      ...current,
      accessRoles: nextAccessRoles
    };
  });
}

function clearAccessRoles(guildId, accessName) {
  const normalizedAccess = normalizeAccessName(accessName);

  return updateBotPermissionSettings(guildId, (current) => {
    const nextAccessRoles = {
      ...current.accessRoles
    };

    delete nextAccessRoles[normalizedAccess];

    return {
      ...current,
      accessRoles: nextAccessRoles
    };
  });
}

module.exports = {
  addAccessRole,
  clearAccessRoles,
  getBotPermissionSettings,
  normalizeAccessName,
  removeAccessRole,
  updateBotPermissionSettings
};
