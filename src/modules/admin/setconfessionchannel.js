const { PermissionFlagsBits } = require("discord.js");
const { updateGuildSettings } = require("../../services/guildConfigService");
const { resolveTextChannel } = require("../../utils/channelResolver");

module.exports = {
  name: "setconfessionchannel",
  description: "Atur channel utama untuk post confession.",
  category: "admin",
  usage: "setconfessionchannel [#channel]",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await message.reply("Kamu butuh permission Manage Server untuk command ini.");
      return;
    }

    const channel = resolveTextChannel(message, args[0]);

    if (!channel) {
      await message.reply("Channel confession tidak valid.");
      return;
    }

    updateGuildSettings(message.guild.id, (current) => ({
      ...current,
      confessions: {
        ...client.config.confessions,
        ...(current.confessions || {}),
        channelId: channel.id
      }
    }));

    await message.reply(`Confession channel diset ke ${channel}.`);
  }
};
