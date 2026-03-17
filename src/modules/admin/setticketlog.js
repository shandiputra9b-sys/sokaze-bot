const { PermissionFlagsBits } = require("discord.js");
const { updateGuildSettings } = require("../../services/guildConfigService");
const { resolveTextChannel } = require("../../utils/channelResolver");

module.exports = {
  name: "setticketlog",
  description: "Atur channel log untuk ticket.",
  category: "admin",
  usage: "setticketlog [#channel]",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await message.reply("Kamu butuh permission Manage Server untuk command ini.");
      return;
    }

    const channel = resolveTextChannel(message, args[0]);

    if (!channel) {
      await message.reply("Channel log tidak valid. Kirim mention channel teks atau jalankan di channel target.");
      return;
    }

    updateGuildSettings(message.guild.id, (current) => ({
      ...current,
      tickets: {
        ...client.config.tickets,
        ...(current.tickets || {}),
        logChannelId: channel.id
      }
    }));

    await message.reply(`Ticket log channel diset ke ${channel}.`);
  }
};
