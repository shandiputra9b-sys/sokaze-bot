const { PermissionFlagsBits } = require("discord.js");
const { updateGuildSettings } = require("../../services/guildConfigService");
const { resolveTextChannel } = require("../../utils/channelResolver");

module.exports = {
  name: "setconfessionlog",
  description: "Atur channel log admin untuk confession.",
  category: "admin",
  usage: "setconfessionlog [#channel]",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await message.reply("Kamu butuh permission Manage Server untuk command ini.");
      return;
    }

    const channel = resolveTextChannel(message, args[0]);

    if (!channel) {
      await message.reply("Channel log confession tidak valid.");
      return;
    }

    updateGuildSettings(message.guild.id, (current) => ({
      ...current,
      confessions: {
        ...client.config.confessions,
        ...(current.confessions || {}),
        logChannelId: channel.id
      }
    }));

    await message.reply(`Confession log channel diset ke ${channel}.`);
  }
};
