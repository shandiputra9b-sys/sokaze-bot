const { ChannelType, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { getGuildSettings, updateGuildSettings } = require("../../services/guildConfigService");
const { getLevelEntry, listLevelEntries, upsertLevelEntry } = require("../../services/levelStore");
const { listVoiceSessions } = require("../../services/leaderboardStore");
const { createLevelUpCard } = require("./levelUpCard");

const LEVEL_MIN = 1;
const LEVEL_MAX = 5;

const LEVEL_META = {
  1: {
    level: 1,
    code: "L1",
    name: "Veil",
    renameCooldownDays: 0,
    renameEnabled: false,
    ticketFlair: ""
  },
  2: {
    level: 2,
    code: "L2",
    name: "Shroud",
    renameCooldownDays: 14,
    renameEnabled: true,
    ticketFlair: ""
  },
  3: {
    level: 3,
    code: "L3",
    name: "Obscura",
    renameCooldownDays: 10,
    renameEnabled: true,
    ticketFlair: ""
  },
  4: {
    level: 4,
    code: "L4",
    name: "Noctis",
    renameCooldownDays: 7,
    renameEnabled: true,
    ticketFlair: "[L4 NOCTIS]"
  },
  5: {
    level: 5,
    code: "L5",
    name: "Eclipse",
    renameCooldownDays: 3,
    renameEnabled: true,
    ticketFlair: "[L5 ECLIPSE]"
  }
};

const DEFAULT_LEVEL_SETTINGS = {
  thresholds: {
    1: 0,
    2: 800,
    3: 2500,
    4: 6500,
    5: 14000
  },
  xpRewards: {
    chat: 8,
    voice: 15,
    streak: 20
  },
  chatCooldownMinutes: 5,
  voiceIntervalMinutes: 20,
  minimumChatLength: 10,
  announceChannelId: "",
  roleIds: {
    1: "",
    2: "",
    3: "",
    4: "",
    5: ""
  }
};

function clampLevel(level) {
  const parsed = Number.parseInt(String(level || LEVEL_MIN), 10);

  if (!Number.isInteger(parsed)) {
    return LEVEL_MIN;
  }

  return Math.max(LEVEL_MIN, Math.min(LEVEL_MAX, parsed));
}

function getLevelMeta(level) {
  return LEVEL_META[clampLevel(level)] || LEVEL_META[LEVEL_MIN];
}

function buildLevelPreviewInfo(guildId, level, client = null) {
  const settings = getLevelSettings(guildId, client);
  const targetLevel = clampLevel(level);
  const meta = getLevelMeta(targetLevel);

  return {
    guildId,
    userId: "",
    ...meta,
    xp: getThresholdForLevel(settings, targetLevel),
    currentThreshold: getThresholdForLevel(settings, targetLevel),
    nextThreshold: targetLevel >= LEVEL_MAX ? getThresholdForLevel(settings, targetLevel) : getThresholdForLevel(settings, targetLevel + 1),
    remainingXp: targetLevel >= LEVEL_MAX ? 0 : Math.max(0, getThresholdForLevel(settings, targetLevel + 1) - getThresholdForLevel(settings, targetLevel)),
    progressRatio: targetLevel >= LEVEL_MAX ? 1 : 0,
    roleId: settings.roleIds[String(targetLevel)] || "",
    thresholds: settings.thresholds,
    xpRewards: settings.xpRewards,
    announceChannelId: settings.announceChannelId || "",
    lastDirectRenameAt: "",
    lastChatXpAt: "",
    lastVoiceXpAt: "",
    updatedAt: "",
    source: "preview"
  };
}

function getLevelSettings(guildId, client = null) {
  const settings = getGuildSettings(guildId, {
    levels: client?.config?.levels || DEFAULT_LEVEL_SETTINGS
  }).levels;

  return {
    ...DEFAULT_LEVEL_SETTINGS,
    ...(settings || {}),
    thresholds: {
      ...DEFAULT_LEVEL_SETTINGS.thresholds,
      ...(settings?.thresholds || {})
    },
    xpRewards: {
      ...DEFAULT_LEVEL_SETTINGS.xpRewards,
      ...(settings?.xpRewards || {})
    },
    roleIds: {
      ...DEFAULT_LEVEL_SETTINGS.roleIds,
      ...(settings?.roleIds || {})
    }
  };
}

function updateLevelSettings(guildId, updater) {
  return updateGuildSettings(guildId, (current) => {
    const currentSettings = {
      ...DEFAULT_LEVEL_SETTINGS,
      ...(current.levels || {}),
      thresholds: {
        ...DEFAULT_LEVEL_SETTINGS.thresholds,
        ...(current.levels?.thresholds || {})
      },
      xpRewards: {
        ...DEFAULT_LEVEL_SETTINGS.xpRewards,
        ...(current.levels?.xpRewards || {})
      },
      roleIds: {
        ...DEFAULT_LEVEL_SETTINGS.roleIds,
        ...(current.levels?.roleIds || {})
      }
    };
    const nextSettings = updater(currentSettings);

    return {
      ...current,
      levels: {
        ...DEFAULT_LEVEL_SETTINGS,
        ...(nextSettings || {}),
        thresholds: {
          ...DEFAULT_LEVEL_SETTINGS.thresholds,
          ...(nextSettings?.thresholds || {})
        },
        xpRewards: {
          ...DEFAULT_LEVEL_SETTINGS.xpRewards,
          ...(nextSettings?.xpRewards || {})
        },
        roleIds: {
          ...DEFAULT_LEVEL_SETTINGS.roleIds,
          ...(nextSettings?.roleIds || {})
        }
      }
    };
  });
}

function getThresholdForLevel(settings, level) {
  const targetLevel = clampLevel(level);
  return Number.parseInt(String(settings.thresholds[targetLevel] || 0), 10) || 0;
}

function resolveLevelFromXp(settings, xp) {
  const totalXp = Math.max(0, Number.parseInt(String(xp || 0), 10) || 0);
  let resolved = LEVEL_MIN;

  for (let level = LEVEL_MIN; level <= LEVEL_MAX; level += 1) {
    if (totalXp >= getThresholdForLevel(settings, level)) {
      resolved = level;
    }
  }

  return resolved;
}

function getResolvedXp(guildId, userId, client = null) {
  const entry = getLevelEntry(guildId, userId);
  const settings = getLevelSettings(guildId, client);

  if (typeof entry?.xp === "number") {
    return Math.max(0, entry.xp);
  }

  return getThresholdForLevel(settings, clampLevel(entry?.level || LEVEL_MIN));
}

function getXpProgressInfo(guildId, userId, client = null) {
  const settings = getLevelSettings(guildId, client);
  const xp = getResolvedXp(guildId, userId, client);
  const level = resolveLevelFromXp(settings, xp);
  const currentThreshold = getThresholdForLevel(settings, level);
  const nextThreshold = level >= LEVEL_MAX ? currentThreshold : getThresholdForLevel(settings, level + 1);
  const gainedWithinLevel = level >= LEVEL_MAX ? xp - currentThreshold : Math.max(0, xp - currentThreshold);
  const neededWithinLevel = level >= LEVEL_MAX ? 0 : Math.max(1, nextThreshold - currentThreshold);
  const remainingXp = level >= LEVEL_MAX ? 0 : Math.max(0, nextThreshold - xp);
  const progressRatio = level >= LEVEL_MAX ? 1 : Math.min(1, gainedWithinLevel / neededWithinLevel);

  return {
    xp,
    level,
    currentThreshold,
    nextThreshold,
    gainedWithinLevel,
    neededWithinLevel,
    remainingXp,
    progressRatio
  };
}

function formatRelativeCooldown(ms) {
  const totalMinutes = Math.max(1, Math.ceil(ms / 60000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days} hari ${hours} jam`;
  }

  if (hours > 0) {
    return `${hours} jam ${minutes} menit`;
  }

  return `${minutes} menit`;
}

function buildProgressBar(progressRatio, width = 12) {
  const filled = Math.max(0, Math.min(width, Math.round(progressRatio * width)));
  return `${"=".repeat(filled)}${"-".repeat(Math.max(0, width - filled))}`;
}

function getMemberLevelInfo(guildId, userId, client = null) {
  const entry = getLevelEntry(guildId, userId);
  const settings = getLevelSettings(guildId, client);
  const progress = getXpProgressInfo(guildId, userId, client);
  const meta = getLevelMeta(progress.level);
  const roleId = settings.roleIds[String(progress.level)] || "";

  return {
    guildId,
    userId,
    ...meta,
    xp: progress.xp,
    currentThreshold: progress.currentThreshold,
    nextThreshold: progress.nextThreshold,
    remainingXp: progress.remainingXp,
    progressRatio: progress.progressRatio,
    roleId,
    thresholds: settings.thresholds,
    xpRewards: settings.xpRewards,
    announceChannelId: settings.announceChannelId || "",
    lastDirectRenameAt: entry?.lastDirectRenameAt || "",
    lastChatXpAt: entry?.lastChatXpAt || "",
    lastVoiceXpAt: entry?.lastVoiceXpAt || "",
    updatedAt: entry?.updatedAt || "",
    source: entry?.source || "manual"
  };
}

function setMemberLevel(guildId, userId, level, extra = {}, client = null) {
  const settings = getLevelSettings(guildId, client);
  const nextLevel = clampLevel(level);
  const explicitXp = typeof extra.xp === "number"
    ? Math.max(0, Math.floor(extra.xp))
    : getThresholdForLevel(settings, nextLevel);

  return upsertLevelEntry(guildId, userId, {
    level: resolveLevelFromXp(settings, explicitXp),
    xp: explicitXp,
    updatedAt: new Date().toISOString(),
    ...extra
  });
}

function getRenameCooldownMs(levelInfo) {
  if (!levelInfo?.renameEnabled || !levelInfo?.renameCooldownDays) {
    return 0;
  }

  if (!levelInfo.lastDirectRenameAt) {
    return 0;
  }

  const nextAllowedAt = new Date(levelInfo.lastDirectRenameAt).getTime()
    + (levelInfo.renameCooldownDays * 24 * 60 * 60 * 1000);

  return Math.max(0, nextAllowedAt - Date.now());
}

function getDirectRenameAccess(guildId, userId, client = null) {
  const levelInfo = getMemberLevelInfo(guildId, userId, client);
  const cooldownMs = getRenameCooldownMs(levelInfo);

  return {
    ...levelInfo,
    directRenameAllowed: Boolean(levelInfo.renameEnabled && cooldownMs <= 0),
    cooldownMs
  };
}

function markDirectRenameUsed(guildId, userId, client = null) {
  const levelInfo = getMemberLevelInfo(guildId, userId, client);
  return setMemberLevel(guildId, userId, levelInfo.level, {
    xp: levelInfo.xp,
    lastDirectRenameAt: new Date().toISOString()
  }, client);
}

function clearDirectRenameCooldown(guildId, userId, client = null) {
  const levelInfo = getMemberLevelInfo(guildId, userId, client);
  return setMemberLevel(guildId, userId, levelInfo.level, {
    xp: levelInfo.xp,
    lastDirectRenameAt: ""
  }, client);
}

function getTicketPriorityFlair(guildId, userId, client = null) {
  const levelInfo = getMemberLevelInfo(guildId, userId, client);
  return levelInfo.ticketFlair || "";
}

function hasLevelAdminPermission(member) {
  return member.permissions.has(PermissionFlagsBits.ManageGuild);
}

function formatXp(value) {
  return new Intl.NumberFormat("id-ID").format(Math.max(0, value || 0));
}

function ensureNonNegativeInteger(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

function validateThresholdUpdate(settings, level, value) {
  if (level <= LEVEL_MIN) {
    return {
      ok: false,
      reason: "Threshold Level 1 tetap 0 XP dan tidak perlu diubah."
    };
  }

  const targetThreshold = ensureNonNegativeInteger(value);
  const previousThreshold = getThresholdForLevel(settings, level - 1);
  const nextThreshold = level >= LEVEL_MAX ? null : getThresholdForLevel(settings, level + 1);

  if (targetThreshold <= previousThreshold) {
    return {
      ok: false,
      reason: `Threshold Level ${level} harus lebih besar dari Level ${level - 1} (${formatXp(previousThreshold)} XP).`
    };
  }

  if (nextThreshold !== null && targetThreshold >= nextThreshold) {
    return {
      ok: false,
      reason: `Threshold Level ${level} harus lebih kecil dari Level ${level + 1} (${formatXp(nextThreshold)} XP).`
    };
  }

  return {
    ok: true,
    value: targetThreshold
  };
}

function buildLevelStatusEmbed(guild, user, levelInfo) {
  const renameLine = !levelInfo.renameEnabled
    ? "Belum terbuka"
    : getRenameCooldownMs(levelInfo) > 0
      ? `Tersedia lagi dalam ${formatRelativeCooldown(getRenameCooldownMs(levelInfo))}`
      : "Tersedia sekarang";
  const xpLine = levelInfo.level >= LEVEL_MAX
    ? `XP: **${formatXp(levelInfo.xp)}** (MAX)`
    : `XP: **${formatXp(levelInfo.xp)} / ${formatXp(levelInfo.nextThreshold)}**`;
  const progressLine = levelInfo.level >= LEVEL_MAX
    ? "Progress: **MAX TIER**"
    : `Progress: \`${buildProgressBar(levelInfo.progressRatio)}\` | kurang **${formatXp(levelInfo.remainingXp)} XP**`;

  return new EmbedBuilder()
    .setColor("#111214")
    .setTitle("Level Status")
    .setDescription(
      [
        `User: ${user}`,
        `Tier: **${levelInfo.code} ${levelInfo.name}**`,
        xpLine,
        progressLine,
        `Fast Rename: **${renameLine}**`,
        levelInfo.roleId ? `Role Tier: <@&${levelInfo.roleId}>` : "Role Tier: `Belum diatur`",
        levelInfo.ticketFlair ? `Ticket Flair: \`${levelInfo.ticketFlair}\`` : "Ticket Flair: `-`"
      ].join("\n")
    )
    .setTimestamp();
}

function buildLevelRoleStatusEmbed(guildId, client = null) {
  const settings = getLevelSettings(guildId, client);
  const levelLines = [];
  const thresholdLines = [];

  for (let level = LEVEL_MIN; level <= LEVEL_MAX; level += 1) {
    const meta = getLevelMeta(level);
    const roleId = settings.roleIds[String(level)] || "";
    levelLines.push(`${meta.code} ${meta.name}: ${roleId ? `<@&${roleId}>` : "`Belum diatur`"}`);
    thresholdLines.push(`${meta.code}: ${formatXp(getThresholdForLevel(settings, level))} XP`);
  }

  return new EmbedBuilder()
    .setColor("#111214")
    .setTitle("Level Role & XP Settings")
    .addFields(
      {
        name: "Role Mapping",
        value: levelLines.join("\n"),
        inline: false
      },
      {
        name: "XP Threshold",
        value: thresholdLines.join("\n"),
        inline: false
      },
      {
        name: "Reward",
        value: [
          `Chat: ${settings.xpRewards.chat} XP / ${settings.chatCooldownMinutes} menit`,
          `Voice: ${settings.xpRewards.voice} XP / ${settings.voiceIntervalMinutes} menit`,
          `Streak: ${settings.xpRewards.streak} XP`,
          `Minimal karakter chat: ${settings.minimumChatLength}`
        ].join("\n"),
        inline: false
      },
      {
        name: "Level Up Channel",
        value: settings.announceChannelId ? `<#${settings.announceChannelId}>` : "Auto follow context / system channel",
        inline: false
      }
    )
    .setTimestamp();
}

function setLevelRole(guildId, level, roleId) {
  const targetLevel = clampLevel(level);
  return updateLevelSettings(guildId, (current) => ({
    ...current,
    roleIds: {
      ...current.roleIds,
      [String(targetLevel)]: roleId || ""
    }
  }));
}

function setLevelThreshold(guildId, level, threshold, client = null) {
  const settings = getLevelSettings(guildId, client);
  const targetLevel = clampLevel(level);
  const validation = validateThresholdUpdate(settings, targetLevel, threshold);

  if (!validation.ok) {
    return validation;
  }

  updateLevelSettings(guildId, (current) => ({
    ...current,
    thresholds: {
      ...current.thresholds,
      [String(targetLevel)]: validation.value
    }
  }));

  return {
    ok: true,
    value: validation.value
  };
}

function setLevelXpReward(guildId, source, amount) {
  const rewardKey = String(source || "").trim().toLowerCase();

  if (!["chat", "voice", "streak"].includes(rewardKey)) {
    return {
      ok: false,
      reason: "Sumber XP harus chat, voice, atau streak."
    };
  }

  const nextAmount = ensureNonNegativeInteger(amount);

  updateLevelSettings(guildId, (current) => ({
    ...current,
    xpRewards: {
      ...current.xpRewards,
      [rewardKey]: nextAmount
    }
  }));

  return {
    ok: true,
    value: nextAmount
  };
}

function setLevelCadence(guildId, cadenceKey, minutes) {
  const target = String(cadenceKey || "").trim().toLowerCase();
  const normalizedMinutes = Math.max(1, ensureNonNegativeInteger(minutes, 1));

  if (target !== "chat" && target !== "voice") {
    return {
      ok: false,
      reason: "Cadence hanya bisa diatur untuk chat atau voice."
    };
  }

  updateLevelSettings(guildId, (current) => ({
    ...current,
    ...(target === "chat"
      ? { chatCooldownMinutes: normalizedMinutes }
      : { voiceIntervalMinutes: normalizedMinutes })
  }));

  return {
    ok: true,
    value: normalizedMinutes
  };
}

function setLevelMinimumChatLength(guildId, length) {
  const nextLength = Math.max(0, ensureNonNegativeInteger(length));

  updateLevelSettings(guildId, (current) => ({
    ...current,
    minimumChatLength: nextLength
  }));

  return {
    ok: true,
    value: nextLength
  };
}

function setLevelAnnounceChannel(guildId, channelId) {
  return updateLevelSettings(guildId, (current) => ({
    ...current,
    announceChannelId: channelId || ""
  }));
}

async function resolveAnnouncementChannel(guild, preferredChannelId = "", client = null) {
  const isUsableText = (channel) => channel
    && (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement)
    && channel.isTextBased()
    && typeof channel.send === "function";
  const settings = getLevelSettings(guild.id, client);
  const candidates = [
    preferredChannelId,
    settings.announceChannelId || "",
    guild.systemChannelId || ""
  ].filter(Boolean);

  for (const channelId of candidates) {
    const channel = guild.channels.cache.get(channelId)
      || await guild.channels.fetch(channelId).catch(() => null);

    if (isUsableText(channel)) {
      return channel;
    }
  }

  return null;
}

function canAssignRole(guild, role) {
  return Boolean(role)
    && !role.managed
    && guild.members.me
    && guild.members.me.roles.highest.comparePositionTo(role) > 0;
}

function ensureMemberLevelRecord(guildId, userId, client = null) {
  const current = getLevelEntry(guildId, userId);

  if (current) {
    return current;
  }

  return setMemberLevel(guildId, userId, LEVEL_MIN, {
    xp: getThresholdForLevel(getLevelSettings(guildId, client), LEVEL_MIN),
    source: "system"
  }, client);
}

async function syncLevelRoleForMember(member, client = null) {
  if (!member || member.user?.bot) {
    return {
      ok: false,
      changed: false
    };
  }

  const settings = getLevelSettings(member.guild.id, client);
  const levelInfo = getMemberLevelInfo(member.guild.id, member.id, client);
  const configuredRoleIds = Object.values(settings.roleIds).filter(Boolean);

  if (!configuredRoleIds.length) {
    return {
      ok: true,
      changed: false
    };
  }

  const rolesToRemove = configuredRoleIds.filter((roleId) => roleId !== levelInfo.roleId && member.roles.cache.has(roleId));
  const roleToAdd = levelInfo.roleId
    ? member.guild.roles.cache.get(levelInfo.roleId) || await member.guild.roles.fetch(levelInfo.roleId).catch(() => null)
    : null;
  let changed = false;

  for (const roleId of rolesToRemove) {
    const role = member.guild.roles.cache.get(roleId) || await member.guild.roles.fetch(roleId).catch(() => null);

    if (role && canAssignRole(member.guild, role)) {
      await member.roles.remove(role, "Removing outdated level role").catch(() => null);
      changed = true;
    }
  }

  if (roleToAdd && !member.roles.cache.has(roleToAdd.id) && canAssignRole(member.guild, roleToAdd)) {
    await member.roles.add(roleToAdd, "Syncing current level role").catch(() => null);
    changed = true;
  }

  return {
    ok: true,
    changed
  };
}

async function syncLevelRolesForGuild(guild, client = null, targetUserId = "") {
  const members = targetUserId
    ? [guild.members.cache.get(targetUserId) || await guild.members.fetch(targetUserId).catch(() => null)]
    : [...(await guild.members.fetch().catch(() => guild.members.cache)).values()];
  let synced = 0;

  for (const member of members) {
    if (!member || member.user.bot) {
      continue;
    }

    ensureMemberLevelRecord(guild.id, member.id, client);
    await syncLevelRoleForMember(member, client);
    synced += 1;
  }

  return synced;
}

async function sendLevelUpNotification(guild, member, previousLevelInfo, nextLevelInfo, client, preferredChannelId = "", source = "") {
  const destination = await resolveAnnouncementChannel(guild, preferredChannelId, client);

  if (!destination) {
    return false;
  }

  const card = await createLevelUpCard(member, previousLevelInfo, nextLevelInfo).catch(() => null);
  if (!card) {
    return false;
  }

  await destination.send({
    files: [card]
  }).catch(() => null);

  return true;
}

async function sendLevelUpTestNotification(guild, member, targetLevel, client, preferredChannelId = "") {
  const nextLevel = clampLevel(targetLevel);
  const previousLevel = Math.max(LEVEL_MIN, nextLevel - 1);
  const previousLevelInfo = buildLevelPreviewInfo(guild.id, previousLevel, client);
  const nextLevelInfo = buildLevelPreviewInfo(guild.id, nextLevel, client);

  return sendLevelUpNotification(
    guild,
    member,
    previousLevelInfo,
    nextLevelInfo,
    client,
    preferredChannelId,
    "manual"
  );
}

async function applyXpToMember(member, amount, source, client, options = {}) {
  if (!member || member.user?.bot) {
    return {
      ok: false,
      reason: "Member target tidak valid."
    };
  }

  const increment = Math.max(0, Math.floor(Number(amount) || 0));

  if (!increment) {
    return {
      ok: false,
      reason: "XP increment harus lebih besar dari 0."
    };
  }

  ensureMemberLevelRecord(member.guild.id, member.id, client);
  const previousLevelInfo = getMemberLevelInfo(member.guild.id, member.id, client);
  const nextXp = previousLevelInfo.xp + increment;
  const nextLevel = resolveLevelFromXp(getLevelSettings(member.guild.id, client), nextXp);
  const nextEntry = setMemberLevel(member.guild.id, member.id, nextLevel, {
    xp: nextXp,
    source,
    ...(options.entryPatch || {})
  }, client);
  const nextLevelInfo = getMemberLevelInfo(member.guild.id, member.id, client);
  const leveledUp = nextLevelInfo.level > previousLevelInfo.level;

  await syncLevelRoleForMember(member, client);

  if (leveledUp && options.notify !== false) {
    await sendLevelUpNotification(
      member.guild,
      member,
      previousLevelInfo,
      nextLevelInfo,
      client,
      options.preferredChannelId || "",
      source
    );
  }

  return {
    ok: true,
    entry: nextEntry,
    previousLevelInfo,
    nextLevelInfo,
    leveledUp
  };
}

async function syncManualLevelForMember(member, level, client, extra = {}) {
  const nextEntry = setMemberLevel(member.guild.id, member.id, level, extra, client);
  await syncLevelRoleForMember(member, client);
  return nextEntry;
}

async function awardTrackedChatXp(message, client) {
  const settings = getLevelSettings(message.guild.id, client);
  const content = `${message.content || ""}`.trim();

  if (content.length < settings.minimumChatLength && !message.attachments.size) {
    return false;
  }

  const levelInfo = getMemberLevelInfo(message.guild.id, message.author.id, client);
  const cooldownMs = Math.max(1, settings.chatCooldownMinutes) * 60 * 1000;
  const lastAwardAt = levelInfo.lastChatXpAt ? new Date(levelInfo.lastChatXpAt).getTime() : 0;

  if (lastAwardAt && (Date.now() - lastAwardAt) < cooldownMs) {
    return false;
  }

  await applyXpToMember(message.member, settings.xpRewards.chat, "chat", client, {
    preferredChannelId: message.channel.id,
    entryPatch: {
      lastChatXpAt: new Date().toISOString()
    }
  });

  return true;
}

async function awardStreakXp(guild, userIds, client, preferredChannelId = "") {
  const settings = getLevelSettings(guild.id, client);

  for (const userId of userIds) {
    const member = guild.members.cache.get(userId)
      || await guild.members.fetch(userId).catch(() => null);

    if (!member || member.user.bot) {
      continue;
    }

    await applyXpToMember(member, settings.xpRewards.streak, "streak", client, {
      preferredChannelId
    });
  }
}

async function processVoiceXpAwards(client) {
  const guilds = [...client.guilds.cache.values()];

  for (const guild of guilds) {
    const settings = getLevelSettings(guild.id, client);
    const intervalMs = Math.max(1, settings.voiceIntervalMinutes) * 60 * 1000;
    const sessions = listVoiceSessions(guild.id);

    for (const session of sessions) {
      const member = guild.members.cache.get(session.userId)
        || await guild.members.fetch(session.userId).catch(() => null);

      if (!member || member.user.bot) {
        continue;
      }

      const channel = member.voice?.channel;

      if (!channel || channel.id !== session.channelId) {
        continue;
      }

      const activeHumans = channel.members.filter((voiceMember) => !voiceMember.user.bot).size;

      if (activeHumans < 2) {
        continue;
      }

      const levelInfo = getMemberLevelInfo(guild.id, member.id, client);
      const baselineTime = levelInfo.lastVoiceXpAt
        ? new Date(levelInfo.lastVoiceXpAt).getTime()
        : new Date(session.startedAt).getTime();
      const elapsedMs = Date.now() - baselineTime;
      const intervals = Math.floor(elapsedMs / intervalMs);

      if (intervals <= 0) {
        continue;
      }

      const reward = intervals * settings.xpRewards.voice;
      const nextAwardTime = new Date(baselineTime + (intervals * intervalMs)).toISOString();

      await applyXpToMember(member, reward, "voice", client, {
        entryPatch: {
          lastVoiceXpAt: nextAwardTime
        }
      });
    }
  }
}

async function reconcileLevelState(client) {
  const guildIds = [...new Set(listLevelEntries().map((entry) => entry.guildId))];

  for (const guildId of guildIds) {
    const guild = client.guilds.cache.get(guildId)
      || await client.guilds.fetch(guildId).catch(() => null);

    if (!guild) {
      continue;
    }

    const entries = listLevelEntries(guild.id);

    for (const entry of entries) {
      const member = guild.members.cache.get(entry.userId)
        || await guild.members.fetch(entry.userId).catch(() => null);

      if (!member || member.user.bot) {
        continue;
      }

      const resolvedLevel = resolveLevelFromXp(getLevelSettings(guild.id, client), getResolvedXp(guild.id, entry.userId, client));

      setMemberLevel(guild.id, entry.userId, resolvedLevel, {
        xp: getResolvedXp(guild.id, entry.userId, client),
        lastDirectRenameAt: entry.lastDirectRenameAt || "",
        lastChatXpAt: entry.lastChatXpAt || "",
        lastVoiceXpAt: entry.lastVoiceXpAt || "",
        source: entry.source || "manual"
      }, client);

      await syncLevelRoleForMember(member, client);
    }
  }
}

function startLevelProgressionScheduler(client) {
  if (client.levelProgressionScheduler) {
    return;
  }

  const run = async () => {
    await processVoiceXpAwards(client);
  };

  run().catch((error) => {
    console.error("Initial level progression sync failed:", error);
  });

  client.levelProgressionScheduler = setInterval(() => {
    run().catch((error) => {
      console.error("Scheduled level progression sync failed:", error);
    });
  }, 5 * 60 * 1000);

  if (typeof client.levelProgressionScheduler.unref === "function") {
    client.levelProgressionScheduler.unref();
  }
}

module.exports = {
  DEFAULT_LEVEL_SETTINGS,
  LEVEL_MAX,
  LEVEL_META,
  LEVEL_MIN,
  applyXpToMember,
  awardStreakXp,
  awardTrackedChatXp,
  buildLevelRoleStatusEmbed,
  buildLevelStatusEmbed,
  buildLevelPreviewInfo,
  buildProgressBar,
  clampLevel,
  clearDirectRenameCooldown,
  ensureMemberLevelRecord,
  formatRelativeCooldown,
  getDirectRenameAccess,
  getLevelMeta,
  getLevelSettings,
  getMemberLevelInfo,
  getThresholdForLevel,
  getTicketPriorityFlair,
  getXpProgressInfo,
  hasLevelAdminPermission,
  markDirectRenameUsed,
  processVoiceXpAwards,
  reconcileLevelState,
  resolveLevelFromXp,
  sendLevelUpNotification,
  sendLevelUpTestNotification,
  setLevelAnnounceChannel,
  setLevelCadence,
  setLevelMinimumChatLength,
  setLevelRole,
  setLevelThreshold,
  setMemberLevel,
  setLevelXpReward,
  startLevelProgressionScheduler,
  syncLevelRoleForMember,
  syncLevelRolesForGuild,
  syncManualLevelForMember
};
