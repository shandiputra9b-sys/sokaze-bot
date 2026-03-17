const { PermissionFlagsBits } = require("discord.js");
const { updateGuildSettings } = require("../../services/guildConfigService");
const { resolveTextChannel } = require("../../utils/channelResolver");

module.exports = {
  name: "setwelcome",
  description: "Atur channel welcome untuk server ini.",
  category: "admin",
  usage: "setwelcome [#channel]",
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

    const settings = updateGuildSettings(message.guild.id, (current) => ({
      ...current,
      welcome: {
        ...client.config.welcome,
        ...(current.welcome || {}),
        channelId: channel.id
      }
    }));

    await message.reply(`Welcome channel diset ke ${channel}. Accent saat ini: \`${settings.welcome.accentColor}\``);
  }
};
