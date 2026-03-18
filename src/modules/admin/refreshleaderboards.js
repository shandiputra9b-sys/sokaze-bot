const { PermissionFlagsBits } = require("discord.js");
const { refreshLeaderboardHubForGuild, replyWithTemporaryMessage } = require("../leaderboards/leaderboardSystem");

module.exports = {
  name: "refreshleaderboards",
  description: "Paksa refresh panel leaderboard otomatis.",
  aliases: ["refreshleaderboard", "updatelb"],
  category: "admin",
  usage: "refreshleaderboards",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await replyWithTemporaryMessage(message, "Kamu butuh permission Manage Server untuk command ini.", client);
      return;
    }

    const boardsRefreshed = await refreshLeaderboardHubForGuild(
      message.guild,
      client,
      { force: true }
    ).catch(() => false);

    await replyWithTemporaryMessage(
      message,
      boardsRefreshed
        ? "Panel leaderboard berhasil diperbarui."
        : "Panel leaderboard belum bisa diperbarui. Pastikan channel leaderboard sudah diset.",
      client
    );
  }
};
