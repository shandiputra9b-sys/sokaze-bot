const { PermissionFlagsBits } = require("discord.js");
const { resolveVoiceChannel } = require("../../utils/channelResolver");
const {
  replyWithTemporaryMessage,
  setTempVoiceAnchorChannel
} = require("../temp-voice/tempVoiceSystem");

module.exports = {
  name: "settempvoiceanchor",
  description: "Atur anchor voice channel untuk posisi Temp Voice baru.",
  aliases: ["settvanchor", "settempvoiceposition"],
  category: "admin",
  usage: "settempvoiceanchor <#voice-channel>",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await replyWithTemporaryMessage(message, "Kamu butuh permission Manage Server untuk command ini.", client);
      return;
    }

    const channel = resolveVoiceChannel(message, args[0]);

    if (!channel) {
      await replyWithTemporaryMessage(
        message,
        "Anchor Temp Voice tidak valid. Mention voice channel target atau jalankan dari voice channel anchor.",
        client
      );
      return;
    }

    setTempVoiceAnchorChannel(message.guild.id, channel.id);
    await replyWithTemporaryMessage(
      message,
      `Anchor Temp Voice diset ke ${channel}. Room baru akan mencoba muncul tepat di atas channel itu.`,
      client
    );
  }
};
