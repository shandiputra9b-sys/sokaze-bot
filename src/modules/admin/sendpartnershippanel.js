const { PermissionFlagsBits } = require("discord.js");
const { resolveTextChannel } = require("../../utils/channelResolver");
const { updateGuildSettings } = require("../../services/guildConfigService");
const { buildPartnershipTicketPanel } = require("../tickets/ticketSystem");

module.exports = {
  name: "sendpartnershippanel",
  description: "Kirim panel khusus untuk ticket partnership.",
  category: "admin",
  usage: "sendpartnershippanel [#channel]",
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

    await channel.send(buildPartnershipTicketPanel(client, message.guild.id));

    updateGuildSettings(message.guild.id, (current) => ({
      ...current,
      tickets: {
        ...client.config.tickets,
        ...(current.tickets || {}),
        partnershipPanelChannelId: channel.id
      }
    }));

    await message.reply(`Partnership ticket panel dikirim ke ${channel}.`);
  }
};
