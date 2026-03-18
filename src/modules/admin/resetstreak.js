const { PermissionFlagsBits } = require("discord.js");
const { resetStreakValue } = require("../streak/streakSystem");

function extractMentionId(value) {
  return value?.replace(/[<@!>]/g, "") || "";
}

module.exports = {
  name: "resetstreak",
  description: "Reset satu pasangan streak.",
  category: "admin",
  usage: "resetstreak @user1 @user2",
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await message.reply("Kamu butuh permission Manage Server untuk command ini.");
      return;
    }

    const userAId = extractMentionId(args[0]);
    const userBId = extractMentionId(args[1]);

    if (!userAId || !userBId || userAId === userBId) {
      await message.reply("Masukkan dua mention user yang valid dan berbeda.");
      return;
    }

    const deleted = resetStreakValue(message.guild.id, userAId, userBId);

    if (!deleted) {
      await message.reply("Pair streak itu belum ada.");
      return;
    }

    await message.reply(`Streak untuk <@${userAId}> dan <@${userBId}> berhasil di-reset.`);
  }
};
