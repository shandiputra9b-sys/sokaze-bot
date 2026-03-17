const { PermissionFlagsBits } = require("discord.js");
const { updateGuildSettings } = require("../../services/guildConfigService");
const { resolveTextChannel } = require("../../utils/channelResolver");

module.exports = {
  name: "setnamepanel",
  description: "Atur channel panel request name.",
  category: "admin",
  usage: "setnamepanel [#channel]",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await message.reply("Kamu butuh permission Manage Server untuk command ini.");
      return;
    }

    const channel = resolveTextChannel(message, args[0]);

    if (!channel) {
      await message.reply("Channel panel request name tidak valid.");
      return;
    }

    updateGuildSettings(message.guild.id, (current) => ({
      ...current,
      nameRequests: {
        ...client.config.nameRequests,
        ...(current.nameRequests || {}),
        panelChannelId: channel.id
      }
    }));

    await message.reply(`Name request panel channel diset ke ${channel}.`);
  }
};
