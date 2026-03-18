const { PermissionFlagsBits } = require("discord.js");
const { createStreakNotificationCard } = require("../streak/streakCard");
const {
  getStreakTier,
  resolveMemberFromId
} = require("../streak/streakSystem");

function extractMentionId(value) {
  return value?.replace(/[<@!>]/g, "") || "";
}

module.exports = {
  name: "previewstreak",
  description: "Preview kartu notifikasi streak tanpa mengubah state pair.",
  category: "admin",
  usage: "previewstreak @user1 @user2 [value]",
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await message.reply("Kamu butuh permission Manage Server untuk command ini.");
      return;
    }

    const userAId = extractMentionId(args[0]);
    const userBId = extractMentionId(args[1]);
    const streakValue = Number.parseInt(args[2] || "1", 10);

    if (!userAId || !userBId || userAId === userBId) {
      await message.reply("Masukkan dua mention user yang valid dan berbeda.");
      return;
    }

    if (!Number.isInteger(streakValue) || streakValue < 1) {
      await message.reply("Nilai preview streak harus angka bulat minimal 1.");
      return;
    }

    const [memberA, memberB] = await Promise.all([
      resolveMemberFromId(message.guild, userAId),
      resolveMemberFromId(message.guild, userBId)
    ]);

    if (!memberA || !memberB) {
      await message.reply("Salah satu member tidak ditemukan di server.");
      return;
    }

    const tier = getStreakTier(streakValue);
    const card = await createStreakNotificationCard({
      leftUser: memberA.user,
      rightUser: memberB.user,
      streakCount: streakValue,
      tier
    }).catch((error) => {
      console.error("Failed to render preview streak card:", error);
      return null;
    });

    if (!card) {
      await message.reply("Gagal membuat preview streak card.");
      return;
    }

    await message.reply({
      content: `Preview tier **${tier.label}** untuk streak **${streakValue}**.`,
      files: [card]
    });
  }
};
