const { PermissionFlagsBits } = require("discord.js");
const {
  getStreakSettings,
  replyWithTemporaryMessage,
  resolveMemberFromId,
  setStreakValue
} = require("../streak/streakSystem");

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
      await replyWithTemporaryMessage(message, "Kamu butuh permission Manage Server untuk command ini.", client);
      return;
    }

    const userAId = extractMentionId(args[0]);
    const userBId = extractMentionId(args[1]);
    const streakValue = Number.parseInt(args[2], 10);

    if (!userAId || !userBId || userAId === userBId) {
      await replyWithTemporaryMessage(message, "Masukkan dua mention user yang valid dan berbeda.", client);
      return;
    }

    if (!Number.isInteger(streakValue) || streakValue < 1) {
      await replyWithTemporaryMessage(message, "Nilai streak harus angka bulat minimal 1.", client);
      return;
    }

    const [memberA, memberB] = await Promise.all([
      resolveMemberFromId(message.guild, userAId),
      resolveMemberFromId(message.guild, userBId)
    ]);

    if (!memberA || !memberB) {
      await replyWithTemporaryMessage(message, "Salah satu member tidak ditemukan di server.", client);
      return;
    }

    const pair = setStreakValue(
      message.guild.id,
      userAId,
      userBId,
      streakValue,
      getStreakSettings(message.guild.id, client).timezone
    );

    await replyWithTemporaryMessage(
      message,
      [
        `Streak ${memberA} x ${memberB} diset ke **${pair.currentStreak}**.`,
        `Best streak: **${pair.bestStreak}**`
      ].join("\n"),
      client
    );
  }
};
