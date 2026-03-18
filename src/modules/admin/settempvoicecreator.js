const { PermissionFlagsBits } = require("discord.js");
const { resolveVoiceChannel } = require("../../utils/channelResolver");
const {
  replyWithTemporaryMessage,
  setTempVoiceCreatorChannel
} = require("../temp-voice/tempVoiceSystem");

module.exports = {
  name: "settempvoicecreator",
  description: "Atur voice creator channel untuk Temp Voice.",
  aliases: ["settempvoice", "settempvoicechannel"],
  category: "admin",
  usage: "settempvoicecreator <#voice-channel>",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await replyWithTemporaryMessage(message, "Kamu butuh permission Manage Server untuk command ini.", client);
      return;
    }

    const channel = resolveVoiceChannel(message, args[0]);

    if (!channel) {
      await replyWithTemporaryMessage(
        message,
        "Voice creator channel tidak valid. Mention voice channel atau jalankan dari voice channel target.",
        client
      );
      return;
    }

    setTempVoiceCreatorChannel(message.guild.id, channel.id);
    await replyWithTemporaryMessage(
      message,
      `Temp Voice creator diset ke ${channel}. Member yang join ke sana akan dibuatkan room pribadi.`,
      client
    );
  }
};
