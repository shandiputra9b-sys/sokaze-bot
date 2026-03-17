const { PermissionFlagsBits } = require("discord.js");
const { updateGuildSettings } = require("../../services/guildConfigService");
const { resolveTextChannel } = require("../../utils/channelResolver");
const { buildNameRequestPanel } = require("../name-requests/nameRequestSystem");

module.exports = {
  name: "sendnamepanel",
  description: "Kirim panel request name ke channel target.",
  category: "admin",
  usage: "sendnamepanel [#channel]",
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

    await channel.send(buildNameRequestPanel(client, message.guild.id));

    updateGuildSettings(message.guild.id, (current) => ({
      ...current,
      nameRequests: {
        ...client.config.nameRequests,
        ...(current.nameRequests || {}),
        panelChannelId: channel.id
      }
    }));

    await message.reply(`Name request panel dikirim ke ${channel}.`);
  }
};
