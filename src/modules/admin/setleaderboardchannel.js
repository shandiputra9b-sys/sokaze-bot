const { PermissionFlagsBits } = require("discord.js");
const { resolveTextChannel } = require("../../utils/channelResolver");
const {
  refreshLeaderboardHubForGuild,
  replyWithTemporaryMessage,
  setLeaderboardChannel
} = require("../leaderboards/leaderboardSystem");
const { setStreakTopChannel } = require("../streak/streakSystem");

module.exports = {
  name: "setleaderboardchannel",
  description: "Atur channel hub untuk panel top streak, chat, voice, booster, dan donatur.",
  aliases: ["setleaderboardhub", "setlbchannel"],
  category: "admin",
  usage: "setleaderboardchannel [#channel]",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await replyWithTemporaryMessage(message, "Kamu butuh permission Manage Server untuk command ini.", client);
      return;
    }

    const channel = resolveTextChannel(message, args[0]);

    if (!channel) {
      await replyWithTemporaryMessage(
        message,
        "Channel leaderboard tidak valid. Mention channel teks atau jalankan di channel target.",
        client
      );
      return;
    }

    setLeaderboardChannel(message.guild.id, channel.id);
    setStreakTopChannel(message.guild.id, channel.id);

    const leaderboardRefreshed = await refreshLeaderboardHubForGuild(
      message.guild,
      client,
      { force: true, includeDonator: true }
    ).catch(() => false);

    await replyWithTemporaryMessage(
      message,
      leaderboardRefreshed
        ? `Leaderboard hub diset ke ${channel} dan panel berhasil diperbarui.`
        : `Leaderboard hub diset ke ${channel}, tapi panel belum sempat dikirim sekarang.`,
      client
    );
  }
};
