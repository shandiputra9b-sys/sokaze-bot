const { PermissionFlagsBits } = require("discord.js");
const { resolveTextChannel } = require("../../utils/channelResolver");
const {
  replyWithTemporaryMessage,
  setStreakNotificationChannel
} = require("../streak/streakSystem");

module.exports = {
  name: "setstreaknotifchannel",
  description: "Atur channel khusus notifikasi streak.",
  aliases: ["setstreaknotificationchannel"],
  category: "admin",
  usage: "setstreaknotifchannel [#channel]",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await replyWithTemporaryMessage(message, "Kamu butuh permission Manage Server untuk command ini.", client);
      return;
    }

    const channel = resolveTextChannel(message, args[0]);

    if (!channel) {
      await replyWithTemporaryMessage(
        message,
        "Channel notifikasi streak tidak valid. Mention channel teks atau jalankan di channel target.",
        client
      );
      return;
    }

    setStreakNotificationChannel(message.guild.id, channel.id);
    await replyWithTemporaryMessage(
      message,
      `Channel notifikasi streak diset ke ${channel}.`,
      client
    );
  }
};
