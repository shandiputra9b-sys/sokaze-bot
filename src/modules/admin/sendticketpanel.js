const { PermissionFlagsBits } = require("discord.js");
const { resolveTextChannel } = require("../../utils/channelResolver");
const { buildTicketPanel } = require("../tickets/ticketSystem");
const { updateGuildSettings } = require("../../services/guildConfigService");

module.exports = {
  name: "sendticketpanel",
  description: "Kirim panel tombol untuk membuka ticket.",
  category: "admin",
  usage: "sendticketpanel [#channel]",
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

    await channel.send(buildTicketPanel(client, message.guild.id));

    updateGuildSettings(message.guild.id, (current) => ({
      ...current,
      tickets: {
        ...client.config.tickets,
        ...(current.tickets || {}),
        panelChannelId: channel.id
      }
    }));

    await message.reply(`Ticket panel dikirim ke ${channel}.`);
  }
};
