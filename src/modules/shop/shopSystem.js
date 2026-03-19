const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { addCoins, getEconomyEntry, spendCoins, updateEconomyEntry } = require("../../services/economyStore");
const { listVoiceSessions } = require("../../services/leaderboardStore");
const {
  SHOP_PROFILE_THEMES,
  SHOP_PROFILE_TITLES,
  buildProfileSnapshot,
  unlockProfileThemePurchase,
  unlockProfileTitlePurchase
} = require("../profile/profileSystem");
const {
  clearDirectRenameCooldown,
  getDirectRenameAccess,
  getMemberLevelInfo
} = require("../levels/levelSystem");
const { grantShopCustomRoleAccess, reconcileCustomRoleMember } = require("../custom-roles/customRoleSystem");
const { extendOwnedPrivateRoom } = require("../private-rooms/privateRoomSystem");
const { findPrivateRoomByOwner } = require("../../services/privateRoomStore");

const SHOP_ACCESS_LEVEL = 4;
const CHAT_COIN_COOLDOWN_MS = 60 * 1000;
const VOICE_COIN_INTERVAL_MS = 15 * 60 * 1000;
const CHAT_COIN_REWARD = {
  4: 4,
  5: 5
};
const VOICE_COIN_REWARD = {
  4: 10,
  5: 12
};

const SHOP_ITEMS = [
  {
    key: "rename-reset",
    label: "Rename Reset",
    minLevel: 4,
    cost: 420,
    category: "utility",
    description: "Reset cooldown fast rename biar bisa pakai lagi lebih cepat."
  },
  {
    key: "custom-role-pass",
    label: "Custom Role Pass 30 Hari",
    minLevel: 5,
    cost: 1850,
    category: "premium",
    description: "Buka akses custom role sementara selama 30 hari lewat shop."
  },
  {
    key: "private-room-extend",
    label: "Extend Private Room +12 Jam",
    minLevel: 5,
    cost: 480,
    category: "premium",
    description: "Tambah durasi active private room kamu selama 12 jam."
  },
  ...SHOP_PROFILE_THEMES.map((theme) => ({
    key: `theme:${theme.key}`,
    label: `Theme ${theme.label}`,
    minLevel: theme.minLevel,
    cost: theme.minLevel >= 5 ? 650 : 360,
    category: "theme",
    unlockKey: theme.key,
    description: `Unlock theme profile shop-only ${theme.label}.`
  })),
  ...SHOP_PROFILE_TITLES.map((title) => ({
    key: `title:${title.key}`,
    label: `Title ${title.label}`,
    minLevel: title.minLevel,
    cost: title.minLevel >= 5 ? 520 : 280,
    category: "title",
    unlockKey: title.key,
    description: `Unlock title profile shop-only ${title.label}.`
  }))
];

function formatCoins(value) {
  return `${new Intl.NumberFormat("id-ID").format(Math.max(0, value || 0))} coin`;
}

function hasShopAdminPermission(member) {
  return member.permissions.has(PermissionFlagsBits.ManageGuild);
}

function canUseShop(guildId, userId) {
  return getMemberLevelInfo(guildId, userId).level >= SHOP_ACCESS_LEVEL;
}

function ensureShopAccess(guildId, userId, member) {
  if (canUseShop(guildId, userId)) {
    return { ok: true };
  }

  if (member && hasShopAdminPermission(member)) {
    return { ok: true, adminBypass: true };
  }

  return {
    ok: false,
    reason: "Shop dan coin baru terbuka mulai Level 4."
  };
}

function getEconomySummary(guildId, userId) {
  const entry = getEconomyEntry(guildId, userId) || null;

  return {
    balance: entry?.balance || 0,
    totalEarned: entry?.totalEarned || 0,
    totalSpent: entry?.totalSpent || 0,
    lastChatCoinAt: entry?.lastChatCoinAt || "",
    lastVoiceCoinAt: entry?.lastVoiceCoinAt || ""
  };
}

function getShopItemByKey(itemKey) {
  return SHOP_ITEMS.find((item) => item.key === itemKey) || null;
}

function isProfileUnlockOwned(snapshot, item) {
  if (item.category === "theme") {
    return snapshot.profileEntry?.unlockedThemeKeys?.includes(item.unlockKey);
  }

  if (item.category === "title") {
    return snapshot.profileEntry?.unlockedTitleKeys?.includes(item.unlockKey);
  }

  return false;
}

function buildShopBalanceEmbed(targetMember, levelInfo, summary) {
  return new EmbedBuilder()
    .setColor("#111214")
    .setTitle("Shop Balance")
    .setDescription(
      [
        `User: ${targetMember}`,
        `Tier: **${levelInfo.code} ${levelInfo.name}**`,
        `Saldo: **${formatCoins(summary.balance)}**`
      ].join("\n")
    )
    .addFields(
      {
        name: "Total Earned",
        value: formatCoins(summary.totalEarned),
        inline: true
      },
      {
        name: "Total Spent",
        value: formatCoins(summary.totalSpent),
        inline: true
      },
      {
        name: "Shop Status",
        value: levelInfo.level >= SHOP_ACCESS_LEVEL ? "Terbuka" : "Terkunci sampai Level 4",
        inline: true
      }
    )
    .setTimestamp();
}

function buildShopCatalogEmbed(snapshot) {
  const available = SHOP_ITEMS.filter((item) => snapshot.levelInfo.level >= item.minLevel);
  const locked = SHOP_ITEMS.filter((item) => snapshot.levelInfo.level < item.minLevel);

  const formatItemLine = (item) => {
    const owned = isProfileUnlockOwned(snapshot, item);
    return `- \`${item.key}\` • ${item.label} • ${formatCoins(item.cost)}${owned ? " • owned" : ""}`;
  };

  return new EmbedBuilder()
    .setColor("#111214")
    .setTitle("Sokaze Shop")
    .setDescription(
      [
        `Tier kamu: **${snapshot.levelInfo.code} ${snapshot.levelInfo.name}**`,
        `Saldo saat ini: **${formatCoins(getEconomySummary(snapshot.guild.id, snapshot.member.id).balance)}**`,
        "",
        "Item utility dan cosmetic profile di bawah bisa dibeli dengan coin."
      ].join("\n")
    )
    .addFields(
      {
        name: "Tersedia",
        value: available.map(formatItemLine).join("\n") || "-",
        inline: false
      },
      {
        name: "Terkunci",
        value: locked.map((item) => `- \`${item.key}\` • ${item.label} • buka di Level ${item.minLevel}`).join("\n") || "-",
        inline: false
      }
    )
    .setFooter({
      text: "Gunakan /shop buy item:<kode-item>"
    })
    .setTimestamp();
}

function getChatRewardForLevel(level) {
  return CHAT_COIN_REWARD[level] || 0;
}

function getVoiceRewardForLevel(level) {
  return VOICE_COIN_REWARD[level] || 0;
}

async function awardTrackedChatCoins(message) {
  const levelInfo = getMemberLevelInfo(message.guild.id, message.author.id);

  if (levelInfo.level < SHOP_ACCESS_LEVEL) {
    return false;
  }

  const meaningfulLength = `${message.content || ""}`.trim().length;

  if (meaningfulLength < 6 && !message.attachments.size) {
    return false;
  }

  const entry = getEconomyEntry(message.guild.id, message.author.id);
  const lastAwardAt = entry?.lastChatCoinAt ? new Date(entry.lastChatCoinAt).getTime() : 0;

  if (lastAwardAt && (Date.now() - lastAwardAt) < CHAT_COIN_COOLDOWN_MS) {
    return false;
  }

  const reward = getChatRewardForLevel(levelInfo.level);

  if (!reward) {
    return false;
  }

  addCoins(message.guild.id, message.author.id, reward, {
    lastChatCoinAt: new Date().toISOString()
  });

  return true;
}

async function processVoiceCoinAwards(client) {
  const guilds = [...client.guilds.cache.values()];

  for (const guild of guilds) {
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

      const levelInfo = getMemberLevelInfo(guild.id, member.id);

      if (levelInfo.level < SHOP_ACCESS_LEVEL) {
        continue;
      }

      const entry = getEconomyEntry(guild.id, member.id);
      const lastAwardAt = entry?.lastVoiceCoinAt ? new Date(entry.lastVoiceCoinAt).getTime() : 0;

      if (lastAwardAt && (Date.now() - lastAwardAt) < VOICE_COIN_INTERVAL_MS) {
        continue;
      }

      const reward = getVoiceRewardForLevel(levelInfo.level);

      if (!reward) {
        continue;
      }

      addCoins(guild.id, member.id, reward, {
        lastVoiceCoinAt: new Date().toISOString()
      });
    }
  }
}

function startShopEconomyScheduler(client) {
  if (client.shopEconomyScheduler) {
    return;
  }

  const run = async () => {
    await processVoiceCoinAwards(client);
  };

  run().catch((error) => {
    console.error("Initial shop economy sync failed:", error);
  });

  client.shopEconomyScheduler = setInterval(() => {
    run().catch((error) => {
      console.error("Scheduled shop economy sync failed:", error);
    });
  }, 5 * 60 * 1000);

  if (typeof client.shopEconomyScheduler.unref === "function") {
    client.shopEconomyScheduler.unref();
  }
}

function grantCoinsToMember(guildId, userId, amount) {
  const increment = Math.max(0, Number.parseInt(String(amount || 0), 10) || 0);

  if (!increment) {
    return {
      ok: false,
      reason: "Jumlah coin harus lebih besar dari 0."
    };
  }

  const entry = addCoins(guildId, userId, increment);
  return {
    ok: true,
    entry
  };
}

async function redeemShopItem(guild, member, itemKey) {
  const levelInfo = getMemberLevelInfo(guild.id, member.id);
  const item = getShopItemByKey(itemKey);

  if (!item) {
    return {
      ok: false,
      reason: "Item shop tidak ditemukan."
    };
  }

  if (levelInfo.level < item.minLevel) {
    return {
      ok: false,
      reason: `Item **${item.label}** baru bisa dibeli mulai Level ${item.minLevel}.`
    };
  }

  if (item.category === "utility") {
    const renameAccess = getDirectRenameAccess(guild.id, member.id);

    if (!renameAccess.renameEnabled) {
      return {
        ok: false,
        reason: "Fast rename belum terbuka di level kamu."
      };
    }

    if (renameAccess.cooldownMs <= 0) {
      return {
        ok: false,
        reason: "Cooldown rename kamu sedang tidak aktif, jadi item ini belum diperlukan."
      };
    }
  }

  if (item.category === "theme") {
    const preview = await buildProfileSnapshot(guild, member);

    if (preview.profileEntry?.unlockedThemeKeys?.includes(item.unlockKey)) {
      return {
        ok: false,
        reason: "Theme itu sudah pernah kamu beli."
      };
    }
  }

  if (item.category === "title") {
    const preview = await buildProfileSnapshot(guild, member);

    if (preview.profileEntry?.unlockedTitleKeys?.includes(item.unlockKey)) {
      return {
        ok: false,
        reason: "Title itu sudah pernah kamu beli."
      };
    }
  }

  if (item.key === "private-room-extend" && !findPrivateRoomByOwner(guild.id, member.id)) {
    return {
      ok: false,
      reason: "Kamu belum punya private room aktif untuk diperpanjang."
    };
  }

  const payment = spendCoins(guild.id, member.id, item.cost);

  if (!payment.ok) {
    return {
      ok: false,
      reason: `Coin kamu belum cukup. Butuh **${formatCoins(item.cost)}** untuk item ini.`
    };
  }

  if (item.category === "utility") {
    clearDirectRenameCooldown(guild.id, member.id);

    return {
      ok: true,
      item,
      message: `Cooldown fast rename kamu berhasil di-reset. Sisa saldo: **${formatCoins(payment.entry.balance)}**.`
    };
  }

  if (item.category === "theme") {
    const result = unlockProfileThemePurchase(guild.id, member.id, item.unlockKey);

    if (!result.ok) {
      updateEconomyEntry(guild.id, member.id, (current) => ({
        balance: (current.balance || 0) + item.cost,
        totalSpent: Math.max(0, (current.totalSpent || 0) - item.cost)
      }));
      return result;
    }

    return {
      ok: true,
      item,
      message: `Theme **${result.theme.label}** berhasil dibuka. Sisa saldo: **${formatCoins(payment.entry.balance)}**.`
    };
  }

  if (item.category === "title") {
    const result = unlockProfileTitlePurchase(guild.id, member.id, item.unlockKey);

    if (!result.ok) {
      updateEconomyEntry(guild.id, member.id, (current) => ({
        balance: (current.balance || 0) + item.cost,
        totalSpent: Math.max(0, (current.totalSpent || 0) - item.cost)
      }));
      return result;
    }

    return {
      ok: true,
      item,
      message: `Title **${result.title.label}** berhasil dibuka. Sisa saldo: **${formatCoins(payment.entry.balance)}**.`
    };
  }

  if (item.key === "custom-role-pass") {
    const { expiresAt } = grantShopCustomRoleAccess(guild.id, member.id, 30, "shop");
    await reconcileCustomRoleMember(member, guild.client).catch(() => null);

    return {
      ok: true,
      item,
      message: `Custom role pass aktif sampai <t:${Math.floor(new Date(expiresAt).getTime() / 1000)}:F>. Sisa saldo: **${formatCoins(payment.entry.balance)}**.`
    };
  }

  if (item.key === "private-room-extend") {
    const extension = extendOwnedPrivateRoom(guild.id, member.id, 12);

    if (!extension.ok) {
      updateEconomyEntry(guild.id, member.id, (current) => ({
        balance: (current.balance || 0) + item.cost,
        totalSpent: Math.max(0, (current.totalSpent || 0) - item.cost)
      }));

      return extension;
    }

    return {
      ok: true,
      item,
      message: `Private room kamu diperpanjang 12 jam. Expire baru: <t:${Math.floor(new Date(extension.expiresAt).getTime() / 1000)}:F>. Sisa saldo: **${formatCoins(payment.entry.balance)}**.`
    };
  }

  return {
    ok: false,
    reason: "Item shop belum punya efek yang valid."
  };
}

module.exports = {
  SHOP_ACCESS_LEVEL,
  SHOP_ITEMS,
  awardTrackedChatCoins,
  buildShopBalanceEmbed,
  buildShopCatalogEmbed,
  canUseShop,
  ensureShopAccess,
  formatCoins,
  getEconomySummary,
  getShopItemByKey,
  grantCoinsToMember,
  hasShopAdminPermission,
  redeemShopItem,
  startShopEconomyScheduler
};
