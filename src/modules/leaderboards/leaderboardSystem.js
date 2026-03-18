const { EmbedBuilder } = require("discord.js");
const { getGuildSettings, updateGuildSettings } = require("../../services/guildConfigService");
const {
  incrementChatCount,
  listChatEntries,
  listDonators,
  listVoiceSessions,
  listVoiceTotals,
  removeDonator,
  setDonatorAmount,
  startVoiceSession,
  stopVoiceSession,
  touchVoiceSession
} = require("../../services/leaderboardStore");
const { createLeaderboardCard } = require("./leaderboardCard");
const { refreshStreakTopBoardForGuild, setStreakTopChannel } = require("../streak/streakSystem");

const DEFAULT_LEADERBOARD_SETTINGS = {
  channelId: "",
  chatChannelId: "1482505425973936180",
  lastAutoRefreshDate: "",
  temporaryResponseSeconds: 90,
  messageIds: {
    chat: "",
    voice: "",
    booster: "",
    donator: ""
  }
};

const AUTO_BOARD_KEYS = ["chat", "voice", "booster"];
const RAW_STREAK_COMMAND_PATTERN = /^streak\s+<@!?(\d+)>\s*$/i;
const RAW_INFO_STREAK_PATTERN = /^infostreak(?:\s+<@!?(\d+)>)?(?:\s+(\d+))?\s*$/i;
const BOARD_META = {
  chat: {
    key: "chat",
    title: "Top Chat",
    kicker: "SOKAZE TOP CHAT",
    subtitle: "Leaderboard chat valid dari channel general yang ditrack.",
    accentColor: "#38bdf8",
    footerRight: "Chat Tracker",
    fileName: "sokaze-top-chat.png"
  },
  voice: {
    key: "voice",
    title: "Top Voice",
    kicker: "SOKAZE TOP VOICE",
    subtitle: "Akumulasi waktu voice dari semua room, termasuk AFK dan mute/deafen.",
    accentColor: "#a855f7",
    footerRight: "Voice Tracker",
    fileName: "sokaze-top-voice.png"
  },
  booster: {
    key: "booster",
    title: "Top Booster",
    kicker: "SOKAZE TOP BOOSTER",
    subtitle: "Booster aktif dengan durasi boost terlama di server.",
    accentColor: "#ec4899",
    footerRight: "Booster Board",
    fileName: "sokaze-top-booster.png"
  },
  donator: {
    key: "donator",
    title: "Top Donatur",
    kicker: "SOKAZE TOP DONATUR",
    subtitle: "Leaderboard donatur manual yang diinput admin.",
    accentColor: "#f59e0b",
    footerRight: "Donatur Board",
    fileName: "sokaze-top-donatur.png"
  }
};

function getLeaderboardSettings(guildId, client) {
  const settings = getGuildSettings(guildId, {
    leaderboards: client?.config?.leaderboards || DEFAULT_LEADERBOARD_SETTINGS
  }).leaderboards;

  return {
    ...DEFAULT_LEADERBOARD_SETTINGS,
    ...settings,
    messageIds: {
      ...DEFAULT_LEADERBOARD_SETTINGS.messageIds,
      ...(settings.messageIds || {})
    }
  };
}

function updateLeaderboardSettings(guildId, updater) {
  return updateGuildSettings(guildId, (current) => {
    const currentSettings = {
      ...DEFAULT_LEADERBOARD_SETTINGS,
      ...(current.leaderboards || {}),
      messageIds: {
        ...DEFAULT_LEADERBOARD_SETTINGS.messageIds,
        ...(current.leaderboards?.messageIds || {})
      }
    };
    const nextSettings = updater(currentSettings);

    return {
      ...current,
      leaderboards: {
        ...DEFAULT_LEADERBOARD_SETTINGS,
        ...nextSettings,
        messageIds: {
          ...DEFAULT_LEADERBOARD_SETTINGS.messageIds,
          ...(nextSettings.messageIds || {})
        }
      }
    };
  });
}

function setLeaderboardChannel(guildId, channelId) {
  return updateLeaderboardSettings(guildId, (current) => ({
    ...current,
    channelId,
    lastAutoRefreshDate: "",
    messageIds: {
      chat: "",
      voice: "",
      booster: "",
      donator: ""
    }
  }));
}

function getChatTrackerChannelId(settings) {
  return settings.chatChannelId || DEFAULT_LEADERBOARD_SETTINGS.chatChannelId;
}

function getTemporaryResponseSeconds(settings) {
  const value = Number.parseInt(String(settings.temporaryResponseSeconds || DEFAULT_LEADERBOARD_SETTINGS.temporaryResponseSeconds), 10);
  return Number.isInteger(value) && value > 0 ? value : DEFAULT_LEADERBOARD_SETTINGS.temporaryResponseSeconds;
}

async function sendTemporaryMessage(channel, payload, settings, options = {}) {
  const seconds = options.seconds || getTemporaryResponseSeconds(settings);
  const sentMessage = await channel.send(typeof payload === "string" ? { content: payload } : payload).catch(() => null);

  if (sentMessage) {
    setTimeout(() => {
      sentMessage.delete().catch(() => null);
    }, seconds * 1000);
  }

  return sentMessage;
}

async function replyWithTemporaryMessage(message, payload, client, secondsOverride) {
  const settings = getLeaderboardSettings(message.guild.id, client);
  const seconds = secondsOverride || getTemporaryResponseSeconds(settings);
  const replyPayload = typeof payload === "string" ? { content: payload } : payload;
  const sentMessage = await message.reply(replyPayload).catch(() => null);

  if (sentMessage) {
    setTimeout(() => {
      sentMessage.delete().catch(() => null);
    }, seconds * 1000);
  }

  return sentMessage;
}

function isRawTextBotCommand(content, prefix) {
  const trimmed = content.trim();

  return trimmed.toLowerCase().startsWith(prefix.toLowerCase())
    || RAW_STREAK_COMMAND_PATTERN.test(trimmed)
    || RAW_INFO_STREAK_PATTERN.test(trimmed);
}

function isCommandBlockedInGeneralChannel(guildId, channelId, client) {
  const settings = getLeaderboardSettings(guildId, client);
  return Boolean(channelId) && channelId === getChatTrackerChannelId(settings);
}

async function handleBlockedGeneralChannelCommand(message, client, context) {
  if (!isCommandBlockedInGeneralChannel(message.guild.id, message.channel.id, client)) {
    return false;
  }

  const isBotCommand = Boolean(context) || isRawTextBotCommand(message.content, client.config.prefix);

  if (!isBotCommand) {
    return false;
  }

  const settings = getLeaderboardSettings(message.guild.id, client);
  const deleted = await message.delete().then(() => true).catch(() => false);

  await sendTemporaryMessage(
    message.channel,
    deleted
      ? "Command bot tidak bisa dipakai di channel general ini. Gunakan channel bot ya."
      : "Command bot tidak bisa dipakai di channel general ini.",
    settings,
    { seconds: 20 }
  );

  return true;
}

async function trackChatMessage(message, client) {
  const settings = getLeaderboardSettings(message.guild.id, client);

  if (message.channel.id !== getChatTrackerChannelId(settings)) {
    return false;
  }

  if (isRawTextBotCommand(message.content, client.config.prefix)) {
    return false;
  }

  incrementChatCount(message.guild.id, message.author.id, 1);
  return true;
}

function formatNumber(value) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatCurrency(value) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(value)}`;
}

function formatDuration(ms) {
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}h ${hours}j`;
  }

  if (hours > 0) {
    return `${hours}j ${minutes}m`;
  }

  return `${minutes}m`;
}

function formatDateKey(date, timezone) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getTodayDateKey(timezone) {
  return formatDateKey(new Date(), timezone);
}

function getUpdatedLabel(timezone) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date());
}

function getGuildIconUrl(guild) {
  return guild.iconURL({
    extension: "png",
    forceStatic: true,
    size: 256
  }) || null;
}

async function resolveMemberFromId(guild, memberId) {
  return guild.members.cache.get(memberId) || guild.members.fetch(memberId).catch(() => null);
}

function buildFallbackUser(userId) {
  return {
    id: userId,
    username: `User ${userId}`,
    globalName: "",
    displayAvatarURL() {
      return "";
    }
  };
}

async function buildChatBoardEntries(guild) {
  const entries = listChatEntries(guild.id)
    .sort((left, right) => (right.totalMessages || 0) - (left.totalMessages || 0))
    .slice(0, 10);

  return Promise.all(entries.map(async (entry, index) => {
    const member = await resolveMemberFromId(guild, entry.userId);
    const user = member?.user || buildFallbackUser(entry.userId);

    return {
      rank: index + 1,
      user,
      name: member?.displayName || user.globalName || user.username,
      handle: `@${user.username}`,
      primary: `${formatNumber(entry.totalMessages || 0)} pesan`,
      secondary: "Chat valid"
    };
  }));
}

async function buildVoiceBoardEntries(guild) {
  const now = Date.now();
  const entries = listVoiceTotals(guild.id)
    .map((entry) => ({
      ...entry,
      effectiveTotalMs: (entry.totalMs || 0) + (entry.activeSession
        ? Math.max(0, now - new Date(entry.activeSession.startedAt).getTime())
        : 0)
    }))
    .sort((left, right) => right.effectiveTotalMs - left.effectiveTotalMs)
    .slice(0, 10);

  return Promise.all(entries.map(async (entry, index) => {
    const member = await resolveMemberFromId(guild, entry.userId);
    const user = member?.user || buildFallbackUser(entry.userId);

    return {
      rank: index + 1,
      user,
      name: member?.displayName || user.globalName || user.username,
      handle: `@${user.username}`,
      primary: formatDuration(entry.effectiveTotalMs),
      secondary: entry.activeSession ? "Sedang di VC" : "Total akumulasi"
    };
  }));
}

async function buildBoosterBoardEntries(guild) {
  const members = await guild.members.fetch().catch(() => guild.members.cache);
  const boosters = [...members.values()]
    .filter((member) => !member.user.bot && member.premiumSinceTimestamp)
    .sort((left, right) => left.premiumSinceTimestamp - right.premiumSinceTimestamp)
    .slice(0, 10);

  return boosters.map((member, index) => {
    const totalDays = Math.max(1, Math.floor((Date.now() - member.premiumSinceTimestamp) / (1000 * 60 * 60 * 24)));
    const startedAt = new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(new Date(member.premiumSinceTimestamp));

    return {
      rank: index + 1,
      user: member.user,
      name: member.displayName || member.user.globalName || member.user.username,
      handle: `@${member.user.username}`,
      primary: `${formatNumber(totalDays)} hari`,
      secondary: `Boost sejak ${startedAt}`
    };
  });
}

async function buildDonatorBoardEntries(guild) {
  const entries = listDonators(guild.id)
    .sort((left, right) => (right.amount || 0) - (left.amount || 0))
    .slice(0, 10);

  return Promise.all(entries.map(async (entry, index) => {
    const member = await resolveMemberFromId(guild, entry.userId);
    const user = member?.user || buildFallbackUser(entry.userId);

    return {
      rank: index + 1,
      user,
      name: member?.displayName || user.globalName || user.username,
      handle: `@${user.username}`,
      primary: formatCurrency(entry.amount || 0),
      secondary: "Input admin"
    };
  }));
}

async function buildBoardPayload(guild, boardKey, timezone) {
  const meta = BOARD_META[boardKey];
  let entries = [];

  if (boardKey === "chat") {
    entries = await buildChatBoardEntries(guild);
  } else if (boardKey === "voice") {
    entries = await buildVoiceBoardEntries(guild);
  } else if (boardKey === "booster") {
    entries = await buildBoosterBoardEntries(guild);
  } else if (boardKey === "donator") {
    entries = await buildDonatorBoardEntries(guild);
  }

  const card = await createLeaderboardCard({
    ...meta,
    updatedLabel: getUpdatedLabel(timezone),
    entries,
    footerLeft: "Sokaze Assistant"
  });

  const embed = new EmbedBuilder()
    .setColor(meta.accentColor)
    .setAuthor({
      name: meta.title,
      iconURL: getGuildIconUrl(guild) || undefined
    })
    .setFooter({
      text: "Sokaze Assistant",
      iconURL: getGuildIconUrl(guild) || undefined
    })
    .setTimestamp()
    .setImage(`attachment://${card.name}`);

  return {
    embeds: [embed],
    files: [card]
  };
}

async function getLeaderboardChannel(guild, client) {
  const settings = getLeaderboardSettings(guild.id, client);
  const channelId = settings.channelId;

  if (!channelId) {
    return null;
  }

  const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
  return channel?.isTextBased?.() && channel.messages ? channel : null;
}

async function upsertBoardMessage(guild, client, boardKey, payload) {
  const settings = getLeaderboardSettings(guild.id, client);
  const channel = await getLeaderboardChannel(guild, client);

  if (!channel) {
    return null;
  }

  const messageId = settings.messageIds?.[boardKey] || "";
  let boardMessage = messageId ? await channel.messages.fetch(messageId).catch(() => null) : null;

  if (boardMessage) {
    await boardMessage.edit(payload).catch(() => null);
  } else {
    boardMessage = await channel.send(payload).catch(() => null);
  }

  if (!boardMessage) {
    return null;
  }

  updateLeaderboardSettings(guild.id, (current) => ({
    ...current,
    messageIds: {
      ...current.messageIds,
      [boardKey]: boardMessage.id
    }
  }));

  return boardMessage;
}

async function boardMessageExists(guild, client, boardKey) {
  const settings = getLeaderboardSettings(guild.id, client);
  const messageId = settings.messageIds?.[boardKey] || "";

  if (!messageId) {
    return false;
  }

  const channel = await getLeaderboardChannel(guild, client);

  if (!channel) {
    return false;
  }

  const message = await channel.messages.fetch(messageId).catch(() => null);
  return Boolean(message);
}

async function refreshDonatorBoardForGuild(guild, client) {
  const channel = await getLeaderboardChannel(guild, client);

  if (!channel) {
    return false;
  }

  const payload = await buildBoardPayload(guild, "donator", client.config.streak.timezone || "Asia/Jakarta");
  const boardMessage = await upsertBoardMessage(guild, client, "donator", payload);
  return Boolean(boardMessage);
}

async function refreshLeaderboardHubForGuild(guild, client, options = {}) {
  const settings = getLeaderboardSettings(guild.id, client);
  const channel = await getLeaderboardChannel(guild, client);

  if (!channel) {
    return false;
  }

  const timezone = client.config.streak.timezone || "Asia/Jakarta";
  const todayDateKey = getTodayDateKey(timezone);
  const force = Boolean(options.force);

  await refreshStreakTopBoardForGuild(guild, client, { force }).catch(() => null);

  let refreshedAny = false;

  for (const boardKey of AUTO_BOARD_KEYS) {
    const shouldRefresh = force
      || settings.lastAutoRefreshDate !== todayDateKey
      || !await boardMessageExists(guild, client, boardKey);

    if (!shouldRefresh) {
      continue;
    }

    const payload = await buildBoardPayload(guild, boardKey, timezone);
    const boardMessage = await upsertBoardMessage(guild, client, boardKey, payload);

    if (boardMessage) {
      refreshedAny = true;
    }
  }

  const shouldRefreshDonator = Boolean(options.includeDonator)
    || !await boardMessageExists(guild, client, "donator");

  if (shouldRefreshDonator) {
    const refreshedDonator = await refreshDonatorBoardForGuild(guild, client).catch(() => false);
    refreshedAny = refreshedAny || refreshedDonator;
  }

  if (refreshedAny || force) {
    updateLeaderboardSettings(guild.id, (current) => ({
      ...current,
      lastAutoRefreshDate: todayDateKey
    }));
  }

  return refreshedAny;
}

async function refreshAllLeaderboardHubs(client, options = {}) {
  const guilds = [...client.guilds.cache.values()];

  await Promise.allSettled(guilds.map(async (guild) => {
    try {
      await refreshLeaderboardHubForGuild(guild, client, options);
    } catch (error) {
      console.error(`Failed to refresh leaderboard hub for guild ${guild.id}:`, error);
    }
  }));
}

function startLeaderboardScheduler(client) {
  if (client.leaderboardScheduler) {
    return;
  }

  const runRefresh = async () => {
    await refreshAllLeaderboardHubs(client);
  };

  runRefresh().catch((error) => {
    console.error("Initial leaderboard refresh failed:", error);
  });

  client.leaderboardScheduler = setInterval(() => {
    runRefresh().catch((error) => {
      console.error("Scheduled leaderboard refresh failed:", error);
    });
  }, 60 * 60 * 1000);

  if (typeof client.leaderboardScheduler.unref === "function") {
    client.leaderboardScheduler.unref();
  }
}

async function reconcileVoiceSessionsForGuild(guild) {
  const activeStates = [...guild.voiceStates.cache.values()].filter((state) => state.channelId && !state.member?.user?.bot);
  const activeUserIds = new Set(activeStates.map((state) => state.id));
  const storedSessions = listVoiceSessions(guild.id);

  for (const session of storedSessions) {
    if (!activeUserIds.has(session.userId)) {
      stopVoiceSession(guild.id, session.userId);
    }
  }

  for (const state of activeStates) {
    touchVoiceSession(guild.id, state.id, state.channelId);
  }
}

async function bootstrapVoiceSessions(client) {
  const guilds = [...client.guilds.cache.values()];

  await Promise.allSettled(guilds.map(async (guild) => {
    try {
      await guild.members.fetch().catch(() => null);
      await reconcileVoiceSessionsForGuild(guild);
    } catch (error) {
      console.error(`Failed to bootstrap voice sessions for guild ${guild.id}:`, error);
    }
  }));
}

async function handleVoiceStateTracking(oldState, newState) {
  const guild = newState.guild || oldState.guild;

  if (!guild) {
    return false;
  }

  const member = newState.member || oldState.member;

  if (!member || member.user.bot) {
    return false;
  }

  const userId = member.id;
  const oldChannelId = oldState.channelId;
  const newChannelId = newState.channelId;

  if (!oldChannelId && newChannelId) {
    startVoiceSession(guild.id, userId, newChannelId);
    return true;
  }

  if (oldChannelId && !newChannelId) {
    stopVoiceSession(guild.id, userId);
    return true;
  }

  if (oldChannelId && newChannelId && oldChannelId !== newChannelId) {
    touchVoiceSession(guild.id, userId, newChannelId);
    return true;
  }

  return false;
}

function setDonatorValue(guildId, userId, amount) {
  return setDonatorAmount(guildId, userId, amount);
}

function removeDonatorValue(guildId, userId) {
  return removeDonator(guildId, userId);
}

module.exports = {
  DEFAULT_LEADERBOARD_SETTINGS,
  bootstrapVoiceSessions,
  getLeaderboardSettings,
  handleBlockedGeneralChannelCommand,
  handleVoiceStateTracking,
  isCommandBlockedInGeneralChannel,
  refreshDonatorBoardForGuild,
  refreshLeaderboardHubForGuild,
  removeDonatorValue,
  replyWithTemporaryMessage,
  setDonatorValue,
  setLeaderboardChannel,
  startLeaderboardScheduler,
  trackChatMessage
};
