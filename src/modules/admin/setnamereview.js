const { PermissionFlagsBits } = require("discord.js");
const { updateGuildSettings } = require("../../services/guildConfigService");
const { resolveTextChannel } = require("../../utils/channelResolver");

module.exports = {
  name: "setnamereview",
  description: "Atur channel review request name.",
  category: "admin",
  usage: "setnamereview [#channel]",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await message.reply("Kamu butuh permission Manage Server untuk command ini.");
      return;
    }

    const channel = resolveTextChannel(message, args[0]);

    if (!channel) {
      await message.reply("Channel review request name tidak valid.");
      return;
    }

    updateGuildSettings(message.guild.id, (current) => ({
      ...current,
      nameRequests: {
        ...client.config.nameRequests,
        ...(current.nameRequests || {}),
        reviewChannelId: channel.id
      }
    }));

    await message.reply(`Name request review channel diset ke ${channel}.`);
  }
};
