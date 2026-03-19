const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { getLevelEntry, upsertLevelEntry } = require("../../services/levelStore");

const LEVEL_MIN = 1;
const LEVEL_MAX = 5;

const LEVEL_META = {
  1: {
    level: 1,
    code: "L1",
    name: "Basic",
    renameCooldownDays: 0,
    renameEnabled: false,
    ticketFlair: ""
  },
  2: {
    level: 2,
    code: "L2",
    name: "Trusted",
    renameCooldownDays: 14,
    renameEnabled: true,
    ticketFlair: ""
  },
  3: {
    level: 3,
    code: "L3",
    name: "Regular",
    renameCooldownDays: 10,
    renameEnabled: true,
    ticketFlair: ""
  },
  4: {
    level: 4,
    code: "L4",
    name: "Core",
    renameCooldownDays: 7,
    renameEnabled: true,
    ticketFlair: "[L4 CORE]"
  },
  5: {
    level: 5,
    code: "L5",
    name: "Elite",
    renameCooldownDays: 3,
    renameEnabled: true,
    ticketFlair: "[L5 ELITE]"
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

function getMemberLevelInfo(guildId, userId) {
  const entry = getLevelEntry(guildId, userId);
  const meta = getLevelMeta(entry?.level || LEVEL_MIN);

  return {
    guildId,
    userId,
    ...meta,
    lastDirectRenameAt: entry?.lastDirectRenameAt || "",
    updatedAt: entry?.updatedAt || "",
    source: entry?.source || "manual"
  };
}

function setMemberLevel(guildId, userId, level, extra = {}) {
  const nextLevel = clampLevel(level);

  return upsertLevelEntry(guildId, userId, {
    level: nextLevel,
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

function getDirectRenameAccess(guildId, userId) {
  const levelInfo = getMemberLevelInfo(guildId, userId);
  const cooldownMs = getRenameCooldownMs(levelInfo);

  return {
    ...levelInfo,
    directRenameAllowed: Boolean(levelInfo.renameEnabled && cooldownMs <= 0),
    cooldownMs
  };
}

function markDirectRenameUsed(guildId, userId) {
  const levelInfo = getMemberLevelInfo(guildId, userId);
  return setMemberLevel(guildId, userId, levelInfo.level, {
    lastDirectRenameAt: new Date().toISOString()
  });
}

function clearDirectRenameCooldown(guildId, userId) {
  const levelInfo = getMemberLevelInfo(guildId, userId);
  return setMemberLevel(guildId, userId, levelInfo.level, {
    lastDirectRenameAt: ""
  });
}

function getTicketPriorityFlair(guildId, userId) {
  const levelInfo = getMemberLevelInfo(guildId, userId);
  return levelInfo.ticketFlair || "";
}

function hasLevelAdminPermission(member) {
  return member.permissions.has(PermissionFlagsBits.ManageGuild);
}

function buildLevelStatusEmbed(guild, user, levelInfo) {
  const renameLine = !levelInfo.renameEnabled
    ? "Belum terbuka"
    : getRenameCooldownMs(levelInfo) > 0
      ? `Tersedia lagi dalam ${formatRelativeCooldown(getRenameCooldownMs(levelInfo))}`
      : "Tersedia sekarang";

  return new EmbedBuilder()
    .setColor("#111214")
    .setTitle("Level Status")
    .setDescription(
      [
        `User: ${user}`,
        `Tier: **${levelInfo.code} ${levelInfo.name}**`,
        `Fast Rename: **${renameLine}**`,
        levelInfo.ticketFlair ? `Ticket Flair: \`${levelInfo.ticketFlair}\`` : "Ticket Flair: `-`"
      ].join("\n")
    )
    .setTimestamp();
}

module.exports = {
  LEVEL_MAX,
  LEVEL_META,
  LEVEL_MIN,
  buildLevelStatusEmbed,
  clampLevel,
  clearDirectRenameCooldown,
  formatRelativeCooldown,
  getDirectRenameAccess,
  getMemberLevelInfo,
  getTicketPriorityFlair,
  hasLevelAdminPermission,
  markDirectRenameUsed,
  setMemberLevel
};
