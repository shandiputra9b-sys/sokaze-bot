const { PermissionFlagsBits } = require("discord.js");
const {
  refreshDonatorBoardForGuild,
  replyWithTemporaryMessage
} = require("../leaderboards/leaderboardSystem");

module.exports = {
  name: "refreshdonaturboard",
  description: "Refresh manual panel top donatur.",
  aliases: ["refreshdonatur", "refreshdonorboard"],
  category: "admin",
  usage: "refreshdonaturboard",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await replyWithTemporaryMessage(message, "Kamu butuh permission Manage Server untuk command ini.", client);
      return;
    }

    const refreshed = await refreshDonatorBoardForGuild(message.guild, client).catch(() => false);

    await replyWithTemporaryMessage(
      message,
      refreshed
        ? "Panel top donatur berhasil diperbarui."
        : "Panel top donatur belum bisa diperbarui. Pastikan channel leaderboard sudah diset.",
      client
    );
  }
};
