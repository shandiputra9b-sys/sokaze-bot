const { PermissionFlagsBits } = require("discord.js");
const { resolveTextChannel } = require("../../utils/channelResolver");
const { buildPublicWelcomeText } = require("../community/welcome");
const { getEffectiveGuildSettings } = require("../../utils/guildSettings");

module.exports = {
  name: "testpublicwelcome",
  description: "Preview pesan welcome public chat ke channel target atau channel public chat aktif.",
  category: "admin",
  usage: "testpublicwelcome [#channel]",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await message.reply("Kamu butuh permission Manage Server untuk command ini.");
      return;
    }

    const { welcome } = getEffectiveGuildSettings(message.guild.id, client);
    const targetChannel = args[0]
      ? resolveTextChannel(message, args[0])
      : await message.guild.channels.fetch(welcome.publicChannelId).catch(() => null);

    if (!targetChannel) {
      await message.reply("Public chat channel belum valid. Atur dulu dengan `sksetpublicchat #channel` atau kirim channel target.");
      return;
    }

    await targetChannel.send({
      content: buildPublicWelcomeText(message.member, client)
    });

    if (args[0]) {
      await message.reply(`Preview public welcome dikirim ke ${targetChannel}.`);
      return;
    }

    await message.reply("Preview public welcome dikirim ke public chat aktif.");
  }
};
