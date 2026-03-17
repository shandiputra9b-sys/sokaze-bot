const { PermissionFlagsBits } = require("discord.js");
const { getEffectiveGuildSettings } = require("../../utils/guildSettings");
const { resetCountingState } = require("../../services/countingStore");

module.exports = {
  name: "resetcounting",
  description: "Reset counting ke angka awal yang sudah diatur.",
  category: "admin",
  usage: "resetcounting",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await message.reply("Kamu butuh permission Manage Server untuk command ini.");
      return;
    }

    const { counting } = getEffectiveGuildSettings(message.guild.id, client);
    const startNumber = counting.startNumber || 1;

    resetCountingState(message.guild.id, startNumber);

    await message.reply(`Counting berhasil direset. Mulai lagi dari **${startNumber}**.`);
  }
};
