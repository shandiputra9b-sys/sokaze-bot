const fs = require("node:fs");
const path = require("node:path");

const dataDirectory = path.join(__dirname, "..", "..", "data");
const dataFile = path.join(dataDirectory, "leaderboards.json");

function ensureStore() {
  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
  }

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, `${JSON.stringify({
      chat: {},
      voiceTotals: {},
      voiceSessions: {},
      voicePairs: {},
      voicePairSessions: {},
      donators: {}
    }, null, 2)}\n`, "utf8");
  }
}

function readStore() {
  ensureStore();

  try {
    const raw = fs.readFileSync(dataFile, "utf8");
    const parsed = JSON.parse(raw || "{}");

    return {
      chat: parsed.chat || {},
      voiceTotals: parsed.voiceTotals || {},
      voiceSessions: parsed.voiceSessions || {},
      voicePairs: parsed.voicePairs || {},
      voicePairSessions: parsed.voicePairSessions || {},
      donators: parsed.donators || {}
    };
  } catch (error) {
    console.error("Failed to read leaderboard store:", error);
    return {
      chat: {},
      voiceTotals: {},
      voiceSessions: {},
      voicePairs: {},
      voicePairSessions: {},
      donators: {}
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

function normalizePairUserIds(userIdA, userIdB) {
  return [String(userIdA || "").trim(), String(userIdB || "").trim()]
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
}

function buildPairKey(guildId, userIdA, userIdB) {
  const [left, right] = normalizePairUserIds(userIdA, userIdB);
  return left && right ? `${guildId}:${left}:${right}` : "";
}

function readEntry(section, guildId, userId) {
  const store = readStore();
  return store[section][buildUserKey(guildId, userId)] || null;
}

function updateEntry(section, guildId, userId, updater) {
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

function readPairEntry(section, guildId, userIdA, userIdB) {
  const pairKey = buildPairKey(guildId, userIdA, userIdB);

  if (!pairKey) {
    return null;
  }

  const store = readStore();
  return store[section][pairKey] || null;
}

function updatePairEntry(section, guildId, userIdA, userIdB, updater) {
  const pairKey = buildPairKey(guildId, userIdA, userIdB);

  if (!pairKey) {
    return null;
  }

  const [leftUserId, rightUserId] = normalizePairUserIds(userIdA, userIdB);
  const store = readStore();
  const current = store[section][pairKey] || null;
  const next = updater(current, { leftUserId, rightUserId, pairKey });

  if (next === null) {
    delete store[section][pairKey];
  } else {
    store[section][pairKey] = next;
  }

  writeStore(store);
  return next;
}

function incrementChatCount(guildId, userId, amount = 1) {
  return updateEntry("chat", guildId, userId, (current) => ({
    guildId,
    userId,
    totalMessages: (current?.totalMessages || 0) + amount,
    updatedAt: new Date().toISOString()
  }));
}

function listChatEntries(guildId) {
  const store = readStore();
  return Object.values(store.chat).filter((entry) => entry.guildId === guildId);
}

function startVoiceSession(guildId, userId, channelId, startedAt = new Date().toISOString()) {
  return updateEntry("voiceSessions", guildId, userId, (current) => ({
    guildId,
    userId,
    channelId,
    startedAt: current?.startedAt || startedAt
  }));
}

function touchVoiceSession(guildId, userId, channelId) {
  return updateEntry("voiceSessions", guildId, userId, (current) => ({
    guildId,
    userId,
    channelId,
    startedAt: current?.startedAt || new Date().toISOString()
  }));
}

function getVoiceSession(guildId, userId) {
  return readEntry("voiceSessions", guildId, userId);
}

function addVoiceDuration(guildId, userId, durationMs) {
  return updateEntry("voiceTotals", guildId, userId, (current) => ({
    guildId,
    userId,
    totalMs: Math.max(0, (current?.totalMs || 0) + Math.max(0, durationMs)),
    updatedAt: new Date().toISOString()
  }));
}

function stopVoiceSession(guildId, userId, endedAt = new Date().toISOString()) {
  const session = getVoiceSession(guildId, userId);

  if (!session) {
    return null;
  }

  const durationMs = Math.max(0, new Date(endedAt).getTime() - new Date(session.startedAt).getTime());
  addVoiceDuration(guildId, userId, durationMs);
  updateEntry("voiceSessions", guildId, userId, () => null);

  return {
    ...session,
    endedAt,
    durationMs
  };
}

function listVoiceTotals(guildId) {
  const store = readStore();
  const totals = Object.values(store.voiceTotals).filter((entry) => entry.guildId === guildId);
  const sessions = Object.values(store.voiceSessions).filter((entry) => entry.guildId === guildId);
  const sessionMap = new Map(sessions.map((entry) => [entry.userId, entry]));

  return totals.map((entry) => ({
    ...entry,
    activeSession: sessionMap.get(entry.userId) || null
  })).concat(
    sessions
      .filter((entry) => !totals.some((total) => total.userId === entry.userId))
      .map((entry) => ({
        guildId,
        userId: entry.userId,
        totalMs: 0,
        activeSession: entry
      }))
  );
}

function listVoiceSessions(guildId) {
  const store = readStore();
  return Object.values(store.voiceSessions).filter((entry) => entry.guildId === guildId);
}

function startVoicePairSession(guildId, userIdA, userIdB, channelId, startedAt = new Date().toISOString()) {
  return updatePairEntry("voicePairSessions", guildId, userIdA, userIdB, (current, meta) => ({
    guildId,
    userIds: [meta.leftUserId, meta.rightUserId],
    channelId,
    startedAt: current?.startedAt || startedAt
  }));
}

function getVoicePairSession(guildId, userIdA, userIdB) {
  return readPairEntry("voicePairSessions", guildId, userIdA, userIdB);
}

function addVoicePairDuration(guildId, userIdA, userIdB, durationMs) {
  return updatePairEntry("voicePairs", guildId, userIdA, userIdB, (current, meta) => ({
    guildId,
    userIds: [meta.leftUserId, meta.rightUserId],
    totalMs: Math.max(0, (current?.totalMs || 0) + Math.max(0, durationMs)),
    updatedAt: new Date().toISOString()
  }));
}

function stopVoicePairSession(guildId, userIdA, userIdB, endedAt = new Date().toISOString()) {
  const session = getVoicePairSession(guildId, userIdA, userIdB);

  if (!session) {
    return null;
  }

  const durationMs = Math.max(0, new Date(endedAt).getTime() - new Date(session.startedAt).getTime());
  addVoicePairDuration(guildId, userIdA, userIdB, durationMs);
  updatePairEntry("voicePairSessions", guildId, userIdA, userIdB, () => null);

  return {
    ...session,
    endedAt,
    durationMs
  };
}

function listVoicePairSessions(guildId) {
  const store = readStore();
  return Object.values(store.voicePairSessions).filter((entry) => entry.guildId === guildId);
}

function listVoicePairsForUser(guildId, userId) {
  const store = readStore();
  const totals = Object.values(store.voicePairs).filter((entry) =>
    entry.guildId === guildId
    && Array.isArray(entry.userIds)
    && entry.userIds.includes(userId)
  );
  const sessions = Object.values(store.voicePairSessions).filter((entry) =>
    entry.guildId === guildId
    && Array.isArray(entry.userIds)
    && entry.userIds.includes(userId)
  );
  const sessionMap = new Map(sessions.map((entry) => [buildPairKey(guildId, entry.userIds[0], entry.userIds[1]), entry]));

  return totals.map((entry) => ({
    ...entry,
    activeSession: sessionMap.get(buildPairKey(guildId, entry.userIds[0], entry.userIds[1])) || null
  })).concat(
    sessions
      .filter((entry) => !totals.some((total) => buildPairKey(guildId, total.userIds[0], total.userIds[1]) === buildPairKey(guildId, entry.userIds[0], entry.userIds[1])))
      .map((entry) => ({
        guildId,
        userIds: entry.userIds,
        totalMs: 0,
        activeSession: entry
      }))
  );
}

function setDonatorAmount(guildId, userId, amount) {
  const store = readStore();
  const donators = store.donators[guildId] || {};

  donators[userId] = {
    guildId,
    userId,
    amount,
    updatedAt: new Date().toISOString()
  };

  store.donators[guildId] = donators;
  writeStore(store);
  return donators[userId];
}

function getDonator(guildId, userId) {
  const store = readStore();
  return store.donators[guildId]?.[userId] || null;
}

function incrementDonatorAmount(guildId, userId, amount) {
  const store = readStore();
  const donators = store.donators[guildId] || {};
  const currentAmount = Number.parseInt(String(donators[userId]?.amount || 0), 10) || 0;
  const increment = Math.max(0, Number.parseInt(String(amount || 0), 10) || 0);

  donators[userId] = {
    guildId,
    userId,
    amount: currentAmount + increment,
    updatedAt: new Date().toISOString()
  };

  store.donators[guildId] = donators;
  writeStore(store);
  return donators[userId];
}

function removeDonator(guildId, userId) {
  const store = readStore();
  const donators = store.donators[guildId] || {};
  const current = donators[userId] || null;

  if (current) {
    delete donators[userId];
    store.donators[guildId] = donators;
    writeStore(store);
  }

  return current;
}

function listDonators(guildId) {
  const store = readStore();
  return Object.values(store.donators[guildId] || {});
}

module.exports = {
  getDonator,
  getVoicePairSession,
  getVoiceSession,
  incrementDonatorAmount,
  incrementChatCount,
  listChatEntries,
  listDonators,
  listVoicePairSessions,
  listVoicePairsForUser,
  listVoiceSessions,
  listVoiceTotals,
  removeDonator,
  startVoicePairSession,
  setDonatorAmount,
  startVoiceSession,
  stopVoicePairSession,
  stopVoiceSession,
  touchVoiceSession
};
