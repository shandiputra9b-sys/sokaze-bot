const { PermissionFlagsBits } = require("discord.js");
const { resolveTextChannel } = require("../../utils/channelResolver");
const { updateGuildSettings } = require("../../services/guildConfigService");
const { resetCountingState } = require("../../services/countingStore");

module.exports = {
  name: "setcounting",
  description: "Atur channel counting dan reset ke angka awal.",
  category: "admin",
  usage: "setcounting [#channel] [start_number]",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await message.reply("Kamu butuh permission Manage Server untuk command ini.");
      return;
    }

    const channel = resolveTextChannel(message, args[0]);
    const startNumber = args[1] ? Number.parseInt(args[1], 10) : 1;

    if (!channel) {
      await message.reply("Channel counting tidak valid.");
      return;
    }

    if (!Number.isInteger(startNumber) || startNumber < 1) {
      await message.reply("Start number harus angka bulat minimal 1.");
      return;
    }

    updateGuildSettings(message.guild.id, (current) => ({
      ...current,
      counting: {
        ...client.config.counting,
        ...(current.counting || {}),
        channelId: channel.id,
        startNumber
      }
    }));

    resetCountingState(message.guild.id, startNumber);

    await message.reply(`Counting channel diset ke ${channel} dan direset ke **${startNumber}**.`);
  }
};
