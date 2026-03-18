const { PermissionFlagsBits } = require("discord.js");
const { resolveTextChannel } = require("../../utils/channelResolver");
const { setStreakChannel } = require("../streak/streakSystem");

module.exports = {
  name: "setstreakchannel",
  description: "Atur channel khusus streak.",
  category: "admin",
  usage: "setstreakchannel [#channel]",
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await message.reply("Kamu butuh permission Manage Server untuk command ini.");
      return;
    }

    const channel = resolveTextChannel(message, args[0]);

    if (!channel) {
      await message.reply("Channel streak tidak valid. Mention channel teks atau jalankan di channel target.");
      return;
    }

    setStreakChannel(message.guild.id, channel.id);
    await message.reply(`Channel streak diset ke ${channel}. Command \`streak @user\` hanya aktif di sana.`);
  }
};
