const { PermissionFlagsBits } = require("discord.js");
const { updateGuildSettings } = require("../../services/guildConfigService");
const { resolveTextChannel } = require("../../utils/channelResolver");

module.exports = {
  name: "setticketfeedback",
  description: "Atur channel publik untuk feedback pelayanan ticket.",
  category: "admin",
  usage: "setticketfeedback [#channel]",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await message.reply("Kamu butuh permission Manage Server untuk command ini.");
      return;
    }

    const channel = resolveTextChannel(message, args[0]);

    if (!channel) {
      await message.reply("Channel feedback tidak valid. Kirim mention channel teks atau jalankan di channel target.");
      return;
    }

    updateGuildSettings(message.guild.id, (current) => ({
      ...current,
      tickets: {
        ...client.config.tickets,
        ...(current.tickets || {}),
        feedbackChannelId: channel.id
      }
    }));

    await message.reply(`Channel feedback ticket diset ke ${channel}.`);
  }
};
