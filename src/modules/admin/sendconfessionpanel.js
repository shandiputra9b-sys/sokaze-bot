const { PermissionFlagsBits } = require("discord.js");
const { updateGuildSettings } = require("../../services/guildConfigService");
const { resolveTextChannel } = require("../../utils/channelResolver");
const { buildConfessionPanel } = require("../confessions/confessionSystem");

module.exports = {
  name: "sendconfessionpanel",
  description: "Kirim panel confession ke channel target.",
  category: "admin",
  usage: "sendconfessionpanel [#channel]",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await message.reply("Kamu butuh permission Manage Server untuk command ini.");
      return;
    }

    const channel = resolveTextChannel(message, args[0]);

    if (!channel) {
      await message.reply("Channel confession panel tidak valid.");
      return;
    }

    await channel.send(buildConfessionPanel(client, message.guild.id));

    updateGuildSettings(message.guild.id, (current) => ({
      ...current,
      confessions: {
        ...client.config.confessions,
        ...(current.confessions || {}),
        panelChannelId: channel.id
      }
    }));

    await message.reply(`Confession panel dikirim ke ${channel}.`);
  }
};
