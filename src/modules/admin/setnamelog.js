const { PermissionFlagsBits } = require("discord.js");
const { updateGuildSettings } = require("../../services/guildConfigService");
const { resolveTextChannel } = require("../../utils/channelResolver");

module.exports = {
  name: "setnamelog",
  description: "Atur channel log untuk request name.",
  category: "admin",
  usage: "setnamelog [#channel]",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await message.reply("Kamu butuh permission Manage Server untuk command ini.");
      return;
    }

    const channel = resolveTextChannel(message, args[0]);

    if (!channel) {
      await message.reply("Channel log request name tidak valid.");
      return;
    }

    updateGuildSettings(message.guild.id, (current) => ({
      ...current,
      nameRequests: {
        ...client.config.nameRequests,
        ...(current.nameRequests || {}),
        logChannelId: channel.id
      }
    }));

    await message.reply(`Name request log channel diset ke ${channel}.`);
  }
};
