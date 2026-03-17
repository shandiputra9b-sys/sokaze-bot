const { PermissionFlagsBits } = require("discord.js");
const { updateGuildSettings } = require("../../services/guildConfigService");
const { resolveTextChannel } = require("../../utils/channelResolver");

module.exports = {
  name: "setintro",
  description: "Atur channel perkenalan yang ditampilkan di welcome message.",
  category: "admin",
  usage: "setintro [#channel]",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await message.reply("Kamu butuh permission Manage Server untuk command ini.");
      return;
    }

    const channel = resolveTextChannel(message, args[0]);

    if (!channel) {
      await message.reply("Channel tidak valid. Kirim mention channel teks atau jalankan di channel target.");
      return;
    }

    updateGuildSettings(message.guild.id, (current) => ({
      ...current,
      welcome: {
        ...client.config.welcome,
        ...(current.welcome || {}),
        introChannelId: channel.id
      }
    }));

    await message.reply(`Intro channel diset ke ${channel}.`);
  }
};
