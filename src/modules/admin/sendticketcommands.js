const { PermissionFlagsBits } = require("discord.js");
const { resolveTextChannel } = require("../../utils/channelResolver");
const { updateGuildSettings } = require("../../services/guildConfigService");
const { buildTicketCommandList } = require("../tickets/ticketCommandList");

module.exports = {
  name: "sendticketcommands",
  description: "Kirim daftar command pelayanan tiket ke channel target.",
  category: "admin",
  usage: "sendticketcommands [#channel]",
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

    await channel.send(buildTicketCommandList(client, message.guild.id));

    updateGuildSettings(message.guild.id, (current) => ({
      ...current,
      tickets: {
        ...client.config.tickets,
        ...(current.tickets || {}),
        commandListChannelId: channel.id
      }
    }));

    await message.reply(`Daftar command ticket dikirim ke ${channel}.`);
  }
};
