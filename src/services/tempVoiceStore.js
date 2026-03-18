const fs = require("node:fs");
const path = require("node:path");

const dataDirectory = path.join(__dirname, "..", "..", "data");
const dataFile = path.join(dataDirectory, "temp-voice.json");

const DEFAULT_ROOM_STATE = {
  guildId: "",
  channelId: "",
  ownerId: "",
  creatorChannelId: "",
  panelChannelId: "",
  panelMessageId: "",
  textChannelId: "",
  trustedUserIds: [],
  invitedUserIds: [],
  blockedUserIds: [],
  isPrivate: false,
  waitingRoomEnabled: false,
  userLimit: 0,
  region: "",
  createdAt: "",
  updatedAt: ""
};

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
    console.error("Failed to read temp voice store:", error);
    return {};
  }
}

function writeStore(store) {
  ensureStore();
  fs.writeFileSync(dataFile, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function uniqueIds(values) {
  return [...new Set((values || []).map((value) => String(value).trim()).filter(Boolean))];
}

function normalizeRoom(room = {}) {
  return {
    ...DEFAULT_ROOM_STATE,
    ...room,
    trustedUserIds: uniqueIds(room.trustedUserIds),
    invitedUserIds: uniqueIds(room.invitedUserIds),
    blockedUserIds: uniqueIds(room.blockedUserIds),
    isPrivate: Boolean(room.isPrivate),
    waitingRoomEnabled: Boolean(room.waitingRoomEnabled),
    userLimit: Number.isInteger(room.userLimit) ? room.userLimit : 0,
    region: room.region || "",
    createdAt: room.createdAt || new Date().toISOString(),
    updatedAt: room.updatedAt || new Date().toISOString()
  };
}

function normalizeGuildState(guildState = {}) {
  const rooms = guildState.rooms || {};
  const normalizedRooms = {};

  for (const [channelId, room] of Object.entries(rooms)) {
    normalizedRooms[channelId] = normalizeRoom(room);
  }

  return {
    rooms: normalizedRooms
  };
}

function getGuildState(guildId) {
  const store = readStore();
  return normalizeGuildState(store[guildId] || {});
}

function listRooms(guildId, predicate = null) {
  const rooms = Object.values(getGuildState(guildId).rooms);
  return predicate ? rooms.filter(predicate) : rooms;
}

function getRoom(guildId, channelId) {
  const guildState = getGuildState(guildId);
  return guildState.rooms[channelId] || null;
}

function findRoomByOwner(guildId, ownerId) {
  return listRooms(guildId, (room) => room.ownerId === ownerId)[0] || null;
}

function upsertRoom(guildId, channelId, updater) {
  const store = readStore();
  const guildState = normalizeGuildState(store[guildId] || {});
  const current = guildState.rooms[channelId] || {
    ...DEFAULT_ROOM_STATE,
    guildId,
    channelId
  };
  const next = normalizeRoom({
    ...current,
    ...updater(current),
    guildId,
    channelId,
    updatedAt: new Date().toISOString()
  });

  guildState.rooms[channelId] = next;
  store[guildId] = guildState;
  writeStore(store);

  return next;
}

function deleteRoom(guildId, channelId) {
  const store = readStore();
  const guildState = normalizeGuildState(store[guildId] || {});
  const current = guildState.rooms[channelId] || null;

  if (!current) {
    return null;
  }

  delete guildState.rooms[channelId];
  store[guildId] = guildState;
  writeStore(store);

  return current;
}

module.exports = {
  DEFAULT_ROOM_STATE,
  deleteRoom,
  findRoomByOwner,
  getRoom,
  listRooms,
  upsertRoom
};
