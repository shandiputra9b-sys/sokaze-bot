const { PermissionFlagsBits } = require("discord.js");
const {
  removeDonatorValue,
  replyWithTemporaryMessage
} = require("../leaderboards/leaderboardSystem");

function extractMentionId(value) {
  return value?.replace(/[<@!>]/g, "") || "";
}

module.exports = {
  name: "removedonatur",
  description: "Hapus satu donatur dari leaderboard manual.",
  aliases: ["removedonor", "deletedonatur"],
  category: "admin",
  usage: "removedonatur @user",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await replyWithTemporaryMessage(message, "Kamu butuh permission Manage Server untuk command ini.", client);
      return;
    }

    const userId = extractMentionId(args[0]);

    if (!userId) {
      await replyWithTemporaryMessage(message, "Mention user donatur yang valid.", client);
      return;
    }

    const deleted = removeDonatorValue(message.guild.id, userId);

    if (!deleted) {
      await replyWithTemporaryMessage(message, "Data donatur untuk user itu belum ada.", client);
      return;
    }

    await replyWithTemporaryMessage(
      message,
      `Data donatur untuk <@${userId}> berhasil dihapus. Jalankan \`skrefreshdonaturboard\` untuk update panel.`,
      client
    );
  }
};
