const { buildProfileSnapshot } = require("../profile/profileSystem");
const {
  buildShopBalanceEmbed,
  buildShopCatalogEmbed,
  ensureShopAccess,
  getEconomySummary,
  grantCoinsToMember,
  hasShopAdminPermission,
  redeemShopItem
} = require("./shopSystem");
const { getMemberLevelInfo } = require("../levels/levelSystem");
const { resolveGuildMember } = require("../../utils/memberResolver");

module.exports = {
  name: "shop",
  aliases: ["coinshop", "market"],
  category: "levels",
  description: "Lihat saldo coin dan belanja reward Sokaze.",
  usage: "shop <balance|catalog|buy|grant>",
  async execute(message, args) {
    const action = (args[0] || "catalog").toLowerCase();

    if (action === "grant") {
      if (!hasShopAdminPermission(message.member)) {
        await message.reply("Kamu butuh permission Manage Server untuk menambah coin member.");
        return;
      }

      const targetMember = await resolveGuildMember(message.guild, args[1]);
      const amount = Number.parseInt(args[2], 10);

      if (!targetMember || targetMember.user.bot) {
        await message.reply("Member target tidak valid atau merupakan bot.");
        return;
      }

      const result = grantCoinsToMember(message.guild.id, targetMember.id, amount);
      await message.reply(result.ok
        ? `Berhasil menambahkan coin untuk ${targetMember}. Saldo baru: **${result.entry.balance.toLocaleString("id-ID")} coin**.`
        : result.reason);
      return;
    }

    const access = ensureShopAccess(message.guild.id, message.author.id, message.member);

    if (!access.ok) {
      await message.reply(access.reason);
      return;
    }

    if (action === "catalog") {
      const snapshot = await buildProfileSnapshot(message.guild, message.member);
      await message.reply({
        embeds: [buildShopCatalogEmbed(snapshot)]
      });
      return;
    }

    if (action === "balance") {
      const targetMember = args[1] ? await resolveGuildMember(message.guild, args[1]) : message.member;

      if (!targetMember || targetMember.user.bot) {
        await message.reply("Member target tidak valid atau merupakan bot.");
        return;
      }

      const targetLevel = getMemberLevelInfo(message.guild.id, targetMember.id);

      if (!access.adminBypass && targetLevel.level < 4) {
        await message.reply("Member itu belum membuka sistem coin dan shop karena masih di bawah Level 4.");
        return;
      }

      await message.reply({
        embeds: [buildShopBalanceEmbed(targetMember, targetLevel, getEconomySummary(message.guild.id, targetMember.id))]
      });
      return;
    }

    if (action === "buy") {
      const itemKey = String(args[1] || "").trim().toLowerCase();

      if (!itemKey) {
        await message.reply("Gunakan `sk shop buy <item-key>`.");
        return;
      }

      const result = await redeemShopItem(message.guild, message.member, itemKey);
      await message.reply(result.ok ? result.message : result.reason);
      return;
    }

    await message.reply("Gunakan `sk shop catalog`, `sk shop balance`, `sk shop buy <item>`, atau `sk shop grant @user <jumlah>`.");
  }
};
