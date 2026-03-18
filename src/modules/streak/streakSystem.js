const { EmbedBuilder } = require("discord.js");
const { getGuildSettings, updateGuildSettings } = require("../../services/guildConfigService");
const {
  deletePair,
  getPair,
  listPairs,
  upsertPair
} = require("../../services/streakStore");
const { createStreakNotificationCard } = require("./streakCard");
const { createStreakInfoCard } = require("./streakInfoCard");

const STREAK_TIERS = [
  { key: "ember", min: 1, max: 6, emojiName: "streak_ember", assetFile: "ember.png", label: "Ember" },
  { key: "blaze", min: 7, max: 24, emojiName: "streak_blaze", assetFile: "blaze.png", label: "Blaze" },
  { key: "flare", min: 25, max: 49, emojiName: "streak_flare", assetFile: "flare.png", label: "Flare" },
  { key: "goldfire", min: 50, max: 99, emojiName: "streak_goldfire", assetFile: "goldfire.png", label: "Goldfire" },
  { key: "bluefire", min: 100, max: 149, emojiName: "streak_bluefire", assetFile: "bluefire.png", label: "Bluefire" },
  { key: "sapphire", min: 150, max: 249, emojiName: "streak_sapphire", assetFile: "sapphire.png", label: "Sapphire" },
  { key: "soulfire", min: 250, max: 364, emojiName: "streak_soulfire", assetFile: "soulfire.png", label: "Soulfire" },
  { key: "eternal", min: 365, max: 499, emojiName: "streak_eternal", assetFile: "eternal.png", label: "Eternal" },
  { key: "mythic", min: 500, max: Number.POSITIVE_INFINITY, emojiName: "streak_mythic", assetFile: "mythic.png", label: "Mythic" }
];

const DEFAULT_STREAK_SETTINGS = {
  channelId: "",
  timezone: "Asia/Jakarta"
};

function getStreakSettings(guildId, client) {
  return getGuildSettings(guildId, {
    streak: client?.config?.streak || DEFAULT_STREAK_SETTINGS
  }).streak;
}

function setStreakChannel(guildId, channelId) {
  return updateGuildSettings(guildId, (current) => ({
    ...current,
    streak: {
      ...DEFAULT_STREAK_SETTINGS,
      ...(current.streak || {}),
      channelId
    }
  }));
}

function parseRawStreakCommand(content) {
  const match = content.trim().match(/^streak\s+<@!?(\d+)>\s*$/i);
  return match ? match[1] : null;
}

function parseRawInfoStreakCommand(content) {
  const match = content.trim().match(/^infostreak(?:\s+<@!?(\d+)>)?(?:\s+(\d+))?\s*$/i);

  if (!match) {
    return null;
  }

  return {
    targetId: match[1] || null,
    page: match[2] ? Number.parseInt(match[2], 10) : 1
  };
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

function shiftDateKey(dateKey, days) {
  const anchor = new Date(`${dateKey}T00:00:00.000Z`);
  anchor.setUTCDate(anchor.getUTCDate() + days);
  return anchor.toISOString().slice(0, 10);
}

function getStreakTier(streakCount) {
  return STREAK_TIERS.find((tier) => streakCount >= tier.min && streakCount <= tier.max) || STREAK_TIERS[0];
}

function normalizePage(value, fallback = 1) {
  const page = Number.parseInt(String(value || fallback), 10);
  return Number.isInteger(page) && page > 0 ? page : fallback;
}

function truncateLabel(value, maxLength = 20) {
  if (!value) {
    return "Unknown User";
  }

  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function formatStatusLine(pair, timezone) {
  const today = getTodayDateKey(timezone);
  const completedToday = pair.lastCompletedDate === today;

  return [
    `Streak sekarang: **${pair.currentStreak || 0}**`,
    `Best streak: **${pair.bestStreak || 0}**`,
    `Tier: **${getStreakTier(Math.max(pair.currentStreak, 1)).label}**`,
    `Status hari ini: ${completedToday ? "`selesai`" : "`belum complete`"}`
  ].join("\n");
}

async function resolveMemberFromId(guild, memberId) {
  return guild.members.cache.get(memberId) || guild.members.fetch(memberId).catch(() => null);
}

function buildAcceptedPair(guildId, userAId, userBId, dateKey, pendingInvite, acceptedMessageId) {
  return upsertPair(guildId, userAId, userBId, (current) => ({
    ...current,
    acceptedAt: current.acceptedAt || new Date().toISOString(),
    currentStreak: 1,
    bestStreak: Math.max(current.bestStreak || 0, 1),
    lastCompletedDate: dateKey,
    pendingInvite: null,
    dailyState: {
      dateKey,
      participants: {
        [pendingInvite.requesterId]: {
          source: "invite",
          messageId: pendingInvite.messageId,
          at: pendingInvite.createdAt
        },
        [pendingInvite.targetId]: {
          source: "accept",
          messageId: acceptedMessageId,
          at: new Date().toISOString()
        }
      },
      completedAt: new Date().toISOString(),
      completionMessageId: acceptedMessageId
    }
  }));
}

async function reactWithTierEmoji(message, pair) {
  const tier = getStreakTier(Math.max(pair.currentStreak, 1));
  const guildEmoji = message.guild.emojis.cache.find((emoji) => emoji.name === tier.emojiName)
    || await message.guild.emojis.fetch().then((emojis) => emojis.find((emoji) => emoji.name === tier.emojiName)).catch(() => null);

  if (!guildEmoji) {
    return;
  }

  await message.react(guildEmoji).catch(() => null);
}

async function sendStreakNotification(message, pair) {
  const [leftMember, rightMember] = await Promise.all([
    resolveMemberFromId(message.guild, pair.userIds[0]),
    resolveMemberFromId(message.guild, pair.userIds[1])
  ]);

  if (!leftMember || !rightMember) {
    return;
  }

  const tier = getStreakTier(Math.max(pair.currentStreak, 1));
  const card = await createStreakNotificationCard({
    leftUser: leftMember.user,
    rightUser: rightMember.user,
    streakCount: pair.currentStreak,
    tier
  }).catch((error) => {
    console.error("Failed to render streak notification card:", error);
    return null;
  });

  const content = `${leftMember} x ${rightMember} baru menyelesaikan streak hari **${pair.currentStreak}**.`;
  const payload = card
    ? { content, files: [card] }
    : { content };

  await message.channel.send(payload).catch(() => null);
}

async function buildStreakInfoData(guild, client, targetMember, requestedPage = 1) {
  const settings = getStreakSettings(guild.id, client);
  const todayDateKey = getTodayDateKey(settings.timezone);
  const allPairs = listPairs((pair) =>
    pair.guildId === guild.id
    && isActivatedPair(pair)
    && pair.userIds.includes(targetMember.id)
  ).sort((left, right) => {
    if ((right.currentStreak || 0) !== (left.currentStreak || 0)) {
      return (right.currentStreak || 0) - (left.currentStreak || 0);
    }

    if ((right.bestStreak || 0) !== (left.bestStreak || 0)) {
      return (right.bestStreak || 0) - (left.bestStreak || 0);
    }

    return new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime();
  });

  const perPage = 7;
  const totalPages = Math.max(1, Math.ceil(allPairs.length / perPage));
  const page = Math.min(normalizePage(requestedPage, 1), totalPages);
  const pagePairs = allPairs.slice((page - 1) * perPage, page * perPage);

  const entries = await Promise.all(pagePairs.map(async (pair, index) => {
    const partnerId = pair.userIds.find((userId) => userId !== targetMember.id);
    const partnerMember = partnerId ? await resolveMemberFromId(guild, partnerId) : null;
    const partnerName = truncateLabel(partnerMember?.user?.username || partnerMember?.displayName || `User ${partnerId}`);
    const partnerHandle = partnerMember
      ? `@${truncateLabel(partnerMember.user.username, 18)}`
      : `@${truncateLabel(`user_${partnerId}`, 18)}`;

    return {
      rank: ((page - 1) * perPage) + index + 1,
      partnerUser: partnerMember?.user || {
        id: partnerId || "0",
        username: partnerName,
        displayAvatarURL() {
          return "";
        }
      },
      partnerName,
      partnerHandle,
      currentStreak: pair.currentStreak || 0,
      bestStreak: pair.bestStreak || 0,
      tier: getStreakTier(Math.max(pair.currentStreak || 1, 1)),
      completedToday: pair.lastCompletedDate === todayDateKey
    };
  }));

  return {
    targetMember,
    entries,
    page,
    totalPages,
    totalPartners: allPairs.length,
    timezone: settings.timezone
  };
}

async function buildStreakInfoEmbed(guild, client, targetMember, requestedPage = 1) {
  const data = await buildStreakInfoData(guild, client, targetMember, requestedPage);
  const todayDateKey = getTodayDateKey(data.timezone);
  const emojiCollection = await guild.emojis.fetch().catch(() => guild.emojis.cache);
  const emojiByName = new Map(emojiCollection.map((emoji) => [emoji.name, emoji]));

  if (!data.totalPartners) {
    return new EmbedBuilder()
      .setColor("#38bdf8")
      .setTitle(`Streak Info - ${targetMember.user.username}`)
      .setDescription("Belum ada partner streak yang aktif untuk user ini.")
      .setFooter({
        text: "Halaman 1/1 · Total partner: 0"
      })
      .setTimestamp();
  }

  const lines = data.entries.map((entry) => {
    const tier = entry.tier;
    const tierEmoji = emojiByName.get(tier.emojiName)?.toString() || "🔥";
    const statusLabel = entry.completedToday && data.page && todayDateKey ? "✅ Nyala Hari Ini" : "❌ Belum Nyala 😴";

    return `#${entry.rank} ${entry.partnerName} - ${entry.currentStreak} ${tierEmoji} (${entry.bestStreak}) - ${statusLabel}`;
  });

  return new EmbedBuilder()
    .setColor("#38bdf8")
    .setTitle(`Streak Info - ${targetMember.user.username}`)
    .setDescription(lines.join("\n"))
    .setFooter({
      text: `Halaman ${data.page}/${data.totalPages} · Total partner: ${data.totalPartners}`
    })
    .setTimestamp();
}

async function sendStreakInfo(message, client, options = {}) {
  const targetId = options.targetId || message.author.id;
  const targetMember = await resolveMemberFromId(message.guild, targetId);

  if (!targetMember) {
    await message.reply("User streak yang diminta tidak ditemukan di server ini.");
    return true;
  }

  const data = await buildStreakInfoData(message.guild, client, targetMember, options.page || 1);
  const card = await createStreakInfoCard(data).catch((error) => {
    console.error("Failed to render streak info card:", error);
    return null;
  });

  if (card) {
    await message.reply({
      content: `Streak board milik ${targetMember}.`,
      files: [card]
    }).catch(() => null);
    return true;
  }

  const embed = await buildStreakInfoEmbed(message.guild, client, targetMember, options.page || 1);

  await message.reply({
    embeds: [embed]
  }).catch(() => null);

  return true;
}

function getMentionTargetId(message) {
  if (message.mentions.users.size !== 1) {
    return null;
  }

  return message.mentions.users.first()?.id || null;
}

async function getReplyTargetId(message) {
  if (!message.reference?.messageId) {
    return null;
  }

  const referencedMessage = await message.fetchReference().catch(() => null);

  if (!referencedMessage || referencedMessage.author.bot) {
    return null;
  }

  return referencedMessage.author.id;
}

function isActivatedPair(pair) {
  return Boolean(pair?.acceptedAt);
}

function ensureCurrentDayState(pair, dateKey) {
  if (!pair.dailyState || pair.dailyState.dateKey !== dateKey) {
    return {
      dateKey,
      participants: {},
      completedAt: "",
      completionMessageId: ""
    };
  }

  return {
    ...pair.dailyState,
    participants: {
      ...(pair.dailyState.participants || {})
    }
  };
}

function recordDailyInteraction(pair, actorId, source, messageId, dateKey) {
  const dailyState = ensureCurrentDayState(pair, dateKey);

  dailyState.participants[actorId] = {
    source,
    messageId,
    at: new Date().toISOString()
  };

  return dailyState;
}

function finalizeDailyCompletion(pair, dateKey, completionMessageId, dailyState) {
  const previousDateKey = shiftDateKey(dateKey, -1);
  const nextStreak = pair.lastCompletedDate === previousDateKey
    ? (pair.currentStreak || 0) + 1
    : 1;

  return {
    ...pair,
    currentStreak: nextStreak,
    bestStreak: Math.max(pair.bestStreak || 0, nextStreak),
    lastCompletedDate: dateKey,
    dailyState: {
      ...dailyState,
      completedAt: new Date().toISOString(),
      completionMessageId
    }
  };
}

async function completePairStreak(message, pair) {
  await Promise.allSettled([
    reactWithTierEmoji(message, pair),
    sendStreakNotification(message, pair)
  ]);
}

async function handlePendingAcceptance(message, client, settings, pendingTargetId) {
  const mentionTargetId = getMentionTargetId(message);
  const replyTargetId = await getReplyTargetId(message);
  const relevantPairs = listPairs((pair) =>
    pair.guildId === message.guild.id
    && pair.pendingInvite
    && pair.pendingInvite.targetId === message.author.id
    && pair.pendingInvite.channelId === message.channel.id
  );

  const pendingPair = relevantPairs.find((pair) => {
    const pending = pair.pendingInvite;

    if (new Date(pending.expiresAt).getTime() < Date.now()) {
      return false;
    }

    return pending.requesterId === pendingTargetId
      || pending.requesterId === mentionTargetId
      || pending.requesterId === replyTargetId;
  });

  if (!pendingPair) {
    return false;
  }

  const pending = pendingPair.pendingInvite;
  const dateKey = getTodayDateKey(settings.timezone);
  const acceptedPair = buildAcceptedPair(
    message.guild.id,
    pending.requesterId,
    pending.targetId,
    dateKey,
    pending,
    message.id
  );

  await message.reply(
    [
      `${message.author} menerima streak dari <@${pending.requesterId}>.`,
      `Streak dimulai di hari **${acceptedPair.currentStreak}**.`,
      `Tier: **${getStreakTier(acceptedPair.currentStreak).label}**`
    ].join("\n")
  ).catch(() => null);

  await completePairStreak(message, acceptedPair);
  return true;
}

async function handleStreakCommand(message, client, targetId) {
  const settings = getStreakSettings(message.guild.id, client);

  if (!settings.channelId || message.channel.id !== settings.channelId) {
    return false;
  }

  if (message.author.id === targetId) {
    await message.reply("Kamu tidak bisa membuat streak dengan dirimu sendiri.");
    return true;
  }

  const targetMember = await resolveMemberFromId(message.guild, targetId);

  if (!targetMember || targetMember.user.bot) {
    await message.reply("Target streak tidak valid.");
    return true;
  }

  if (await handlePendingAcceptance(message, client, settings, targetId)) {
    return true;
  }

  const existingPair = getPair(message.guild.id, message.author.id, targetId);

  if (existingPair?.pendingInvite) {
    const expiresAt = new Date(existingPair.pendingInvite.expiresAt).getTime();

    if (expiresAt > Date.now()) {
      await message.reply(
        `${targetMember}, invitation streak dari ${message.author} masih pending. Balas pesan invite sebelumnya atau mention balik untuk menerima.`
      );
      return true;
    }
  }

  if (existingPair && isActivatedPair(existingPair)) {
    await message.reply(
      [
        `${message.author}, streak kamu dengan ${targetMember}:`,
        formatStatusLine(existingPair, settings.timezone)
      ].join("\n")
    );
    return true;
  }

  const pendingInvite = {
    requesterId: message.author.id,
    targetId,
    channelId: message.channel.id,
    messageId: message.id,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString()
  };

  upsertPair(message.guild.id, message.author.id, targetId, (current) => ({
    ...current,
    pendingInvite
  }));

  await message.reply(
    [
      `${targetMember}, ${message.author} ngajak kamu bikin streak.`,
      "Balas pesan ini atau mention balik user yang ngajak dalam 24 jam untuk menerima."
    ].join("\n")
  );

  return true;
}

async function findActivePairForInteraction(message, partnerId) {
  const pair = getPair(message.guild.id, message.author.id, partnerId);

  if (!pair || !isActivatedPair(pair)) {
    return null;
  }

  return pair;
}

async function handleDailyInteraction(message, client) {
  const settings = getStreakSettings(message.guild.id, client);

  if (!settings.channelId || message.channel.id !== settings.channelId) {
    return false;
  }

  const replyTargetId = await getReplyTargetId(message);
  const mentionTargetId = getMentionTargetId(message);
  const partnerId = replyTargetId || mentionTargetId;

  if (!partnerId || partnerId === message.author.id) {
    return false;
  }

  const pair = await findActivePairForInteraction(message, partnerId);

  if (!pair) {
    return false;
  }

  const dateKey = getTodayDateKey(settings.timezone);
  const dailyState = recordDailyInteraction(
    pair,
    message.author.id,
    replyTargetId ? "reply" : "mention",
    message.id,
    dateKey
  );

  if (dailyState.completedAt) {
    upsertPair(message.guild.id, pair.userIds[0], pair.userIds[1], (current) => ({
      ...current,
      dailyState
    }));
    return false;
  }

  const partnerInteracted = Boolean(dailyState.participants[partnerId]);
  const actorAlreadyRecorded = Boolean(dailyState.participants[message.author.id]);
  const sameDayAlreadyCompleted = pair.lastCompletedDate === dateKey;

  if (!actorAlreadyRecorded || sameDayAlreadyCompleted || !partnerInteracted) {
    upsertPair(message.guild.id, pair.userIds[0], pair.userIds[1], (current) => ({
      ...current,
      dailyState
    }));
    return false;
  }

  const completedPair = upsertPair(message.guild.id, pair.userIds[0], pair.userIds[1], (current) =>
    finalizeDailyCompletion(current, dateKey, message.id, dailyState)
  );

  await completePairStreak(message, completedPair);
  return true;
}

async function handleStreakMessage(message, client, options = {}) {
  const settings = getStreakSettings(message.guild.id, client);

  if (!settings.channelId || message.channel.id !== settings.channelId) {
    return false;
  }

  if (options.hasPrefixedCommand) {
    return false;
  }

  const rawTargetId = parseRawStreakCommand(message.content);
  const rawInfoRequest = parseRawInfoStreakCommand(message.content);

  if (rawTargetId) {
    return handleStreakCommand(message, client, rawTargetId);
  }

  if (rawInfoRequest) {
    return sendStreakInfo(message, client, rawInfoRequest);
  }

  if (await handlePendingAcceptance(message, client, settings)) {
    return true;
  }

  return handleDailyInteraction(message, client);
}

function resolveStreakTierFromValue(value) {
  return getStreakTier(value);
}

function setStreakValue(guildId, userAId, userBId, streakValue, timezone) {
  const dateKey = getTodayDateKey(timezone || DEFAULT_STREAK_SETTINGS.timezone);

  return upsertPair(guildId, userAId, userBId, (current) => ({
    ...current,
    acceptedAt: current.acceptedAt || new Date().toISOString(),
    currentStreak: streakValue,
    bestStreak: Math.max(current.bestStreak || 0, streakValue),
    lastCompletedDate: dateKey,
    pendingInvite: null,
    dailyState: {
      dateKey,
      participants: {
        [userAId]: {
          source: "admin",
          messageId: "",
          at: new Date().toISOString()
        },
        [userBId]: {
          source: "admin",
          messageId: "",
          at: new Date().toISOString()
        }
      },
      completedAt: new Date().toISOString(),
      completionMessageId: ""
    }
  }));
}

function resetStreakValue(guildId, userAId, userBId) {
  return deletePair(guildId, userAId, userBId);
}

module.exports = {
  DEFAULT_STREAK_SETTINGS,
  formatStatusLine,
  getStreakSettings,
  getStreakTier,
  handleStreakMessage,
  resetStreakValue,
  resolveMemberFromId,
  resolveStreakTierFromValue,
  sendStreakNotification,
  sendStreakInfo,
  setStreakChannel,
  setStreakValue
};
