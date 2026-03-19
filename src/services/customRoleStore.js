const fs = require("node:fs");
const path = require("node:path");

const dataDirectory = path.join(__dirname, "..", "..", "data");
const dataFile = path.join(dataDirectory, "custom-roles.json");

function ensureStore() {
  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
  }

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, `${JSON.stringify({
      customRoles: {},
      donorGrants: {},
      shopGrants: {},
      pendingIconRequests: {}
    }, null, 2)}\n`, "utf8");
  }
}

function readStore() {
  ensureStore();

  try {
    const raw = fs.readFileSync(dataFile, "utf8");
    const parsed = JSON.parse(raw || "{}");

    return {
      customRoles: parsed.customRoles || {},
      donorGrants: parsed.donorGrants || {},
      shopGrants: parsed.shopGrants || {},
      pendingIconRequests: parsed.pendingIconRequests || {}
    };
  } catch (error) {
    console.error("Failed to read custom role store:", error);
    return {
      customRoles: {},
      donorGrants: {},
      shopGrants: {},
      pendingIconRequests: {}
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

function readSectionEntry(section, guildId, userId) {
  const store = readStore();
  return store[section][buildUserKey(guildId, userId)] || null;
}

function updateSectionEntry(section, guildId, userId, updater) {
  const store = readStore();
  const key = buildUserKey(guildId, userId);
  const current = store[section][key] || null;
  const next = updater(current);

  if (next === null) {
    delete store[section][key];
  } else {
    store[section][key] = next;
  }

  writeStore(store);
  return next;
}

function listSectionEntries(section, guildId = "") {
  const store = readStore();

  return Object.values(store[section]).filter((entry) => {
    if (!guildId) {
      return true;
    }

    return entry.guildId === guildId;
  });
}

function getCustomRoleRecord(guildId, userId) {
  return readSectionEntry("customRoles", guildId, userId);
}

function upsertCustomRoleRecord(guildId, userId, patch) {
  return updateSectionEntry("customRoles", guildId, userId, (current) => ({
    guildId,
    userId,
    ...(current || {}),
    ...(patch || {})
  }));
}

function deleteCustomRoleRecord(guildId, userId) {
  return updateSectionEntry("customRoles", guildId, userId, () => null);
}

function listCustomRoleRecords(guildId = "") {
  return listSectionEntries("customRoles", guildId);
}

function getDonorGrant(guildId, userId) {
  return readSectionEntry("donorGrants", guildId, userId);
}

function upsertDonorGrant(guildId, userId, patch) {
  return updateSectionEntry("donorGrants", guildId, userId, (current) => ({
    guildId,
    userId,
    ...(current || {}),
    ...(patch || {})
  }));
}

function deleteDonorGrant(guildId, userId) {
  return updateSectionEntry("donorGrants", guildId, userId, () => null);
}

function listDonorGrants(guildId = "") {
  return listSectionEntries("donorGrants", guildId);
}

function getShopGrant(guildId, userId) {
  return readSectionEntry("shopGrants", guildId, userId);
}

function upsertShopGrant(guildId, userId, patch) {
  return updateSectionEntry("shopGrants", guildId, userId, (current) => ({
    guildId,
    userId,
    ...(current || {}),
    ...(patch || {})
  }));
}

function deleteShopGrant(guildId, userId) {
  return updateSectionEntry("shopGrants", guildId, userId, () => null);
}

function listShopGrants(guildId = "") {
  return listSectionEntries("shopGrants", guildId);
}

function getPendingIconRequest(guildId, userId) {
  return readSectionEntry("pendingIconRequests", guildId, userId);
}

function upsertPendingIconRequest(guildId, userId, patch) {
  return updateSectionEntry("pendingIconRequests", guildId, userId, (current) => ({
    guildId,
    userId,
    ...(current || {}),
    ...(patch || {})
  }));
}

function clearPendingIconRequest(guildId, userId) {
  return updateSectionEntry("pendingIconRequests", guildId, userId, () => null);
}

function listPendingIconRequests(guildId = "") {
  return listSectionEntries("pendingIconRequests", guildId);
}

module.exports = {
  clearPendingIconRequest,
  deleteCustomRoleRecord,
  deleteDonorGrant,
  deleteShopGrant,
  getCustomRoleRecord,
  getDonorGrant,
  getPendingIconRequest,
  getShopGrant,
  listCustomRoleRecords,
  listDonorGrants,
  listPendingIconRequests,
  listShopGrants,
  upsertCustomRoleRecord,
  upsertDonorGrant,
  upsertShopGrant,
  upsertPendingIconRequest
};
