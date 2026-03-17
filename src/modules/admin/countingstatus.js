const { PermissionFlagsBits } = require("discord.js");
const { getEffectiveGuildSettings } = require("../../utils/guildSettings");
const { getCountingState } = require("../../services/countingStore");

module.exports = {
  name: "countingstatus",
  description: "Lihat status counting saat ini.",
  category: "admin",
  usage: "countingstatus",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await message.reply("Kamu butuh permission Manage Server untuk command ini.");
      return;
    }

    const { counting } = getEffectiveGuildSettings(message.guild.id, client);
    const state = getCountingState(message.guild.id, {
      startNumber: counting.startNumber
    });

    if (!counting.channelId) {
      await message.reply("Counting channel belum diatur.");
      return;
    }

    await message.reply(
      [
        `Channel: <#${counting.channelId}>`,
        `Start number: **${counting.startNumber || 1}**`,
        `Current number: **${state.currentNumber}**`,
        `Next number: **${state.currentNumber + 1}**`,
        `Last user: ${state.lastUserId ? `<@${state.lastUserId}>` : "`-`"}`
      ].join("\n")
    );
  }
};
