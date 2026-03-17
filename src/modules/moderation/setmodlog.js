const { PermissionFlagsBits } = require("discord.js");
const { resolveTextChannel } = require("../../utils/channelResolver");
const { setModerationLogChannel } = require("./moderationSystem");
const { replyWithError, replyWithSuccess } = require("./commandHelpers");

module.exports = {
  name: "setmodlog",
  description: "Atur channel log khusus moderasi.",
  category: "admin",
  usage: "setmodlog [#channel]",
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await replyWithError(message, "Kamu butuh permission Manage Server untuk command ini.");
      return;
    }

    const channel = resolveTextChannel(message, args[0]);

    if (!channel) {
      await replyWithError(message, "Channel log tidak valid. Mention channel teks atau jalankan di channel target.");
      return;
    }

    setModerationLogChannel(message.guild.id, channel.id);
    await replyWithSuccess(message, `Moderation log channel diset ke ${channel}.`);
  }
};
