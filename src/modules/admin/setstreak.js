const { PermissionFlagsBits } = require("discord.js");
const { getStreakSettings, resolveMemberFromId, setStreakValue } = require("../streak/streakSystem");

function extractMentionId(value) {
  return value?.replace(/[<@!>]/g, "") || "";
}

module.exports = {
  name: "setstreak",
  description: "Set nilai streak pasangan user untuk testing admin.",
  category: "admin",
  usage: "setstreak @user1 @user2 <value>",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await message.reply("Kamu butuh permission Manage Server untuk command ini.");
      return;
    }

    const userAId = extractMentionId(args[0]);
    const userBId = extractMentionId(args[1]);
    const streakValue = Number.parseInt(args[2], 10);

    if (!userAId || !userBId || userAId === userBId) {
      await message.reply("Masukkan dua mention user yang valid dan berbeda.");
      return;
    }

    if (!Number.isInteger(streakValue) || streakValue < 1) {
      await message.reply("Nilai streak harus angka bulat minimal 1.");
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

    const pair = setStreakValue(
      message.guild.id,
      userAId,
      userBId,
      streakValue,
      getStreakSettings(message.guild.id, client).timezone
    );

    await message.reply(
      [
        `Streak ${memberA} x ${memberB} diset ke **${pair.currentStreak}**.`,
        `Best streak: **${pair.bestStreak}**`
      ].join("\n")
    );
  }
};
