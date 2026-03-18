const { PermissionFlagsBits } = require("discord.js");
const { replyWithTemporaryMessage, resetStreakValue } = require("../streak/streakSystem");

function extractMentionId(value) {
  return value?.replace(/[<@!>]/g, "") || "";
}

module.exports = {
  name: "resetstreak",
  description: "Reset satu pasangan streak.",
  category: "admin",
  usage: "resetstreak @user1 @user2",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await replyWithTemporaryMessage(message, "Kamu butuh permission Manage Server untuk command ini.", client);
      return;
    }

    const userAId = extractMentionId(args[0]);
    const userBId = extractMentionId(args[1]);

    if (!userAId || !userBId || userAId === userBId) {
      await replyWithTemporaryMessage(message, "Masukkan dua mention user yang valid dan berbeda.", client);
      return;
    }

    const deleted = resetStreakValue(message.guild.id, userAId, userBId);

    if (!deleted) {
      await replyWithTemporaryMessage(message, "Pair streak itu belum ada.", client);
      return;
    }

    await replyWithTemporaryMessage(
      message,
      `Streak untuk <@${userAId}> dan <@${userBId}> berhasil di-reset.`,
      client
    );
  }
};
