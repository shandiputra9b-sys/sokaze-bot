const { PermissionFlagsBits } = require("discord.js");
const { resolveTextChannel } = require("../../utils/channelResolver");
const {
  replyWithTemporaryMessage,
  sendUniversalTempVoiceInterface
} = require("../temp-voice/tempVoiceSystem");

module.exports = {
  name: "sendtempvoiceinterface",
  description: "Kirim interface universal Temp Voice ke channel target.",
  aliases: ["sendtvinterface", "sendtempvoiceui"],
  category: "admin",
  usage: "sendtempvoiceinterface [#channel]",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await replyWithTemporaryMessage(message, "Kamu butuh permission Manage Server untuk command ini.", client);
      return;
    }

    const channel = resolveTextChannel(message, args[0]);

    if (!channel) {
      await replyWithTemporaryMessage(
        message,
        "Channel interface universal tidak valid. Mention channel teks atau jalankan di channel target.",
        client
      );
      return;
    }

    const sent = await sendUniversalTempVoiceInterface(channel, client);

    await replyWithTemporaryMessage(
      message,
      sent
        ? `Interface universal Temp Voice berhasil dikirim ke ${channel}.`
        : `Gagal mengirim interface universal Temp Voice ke ${channel}.`,
      client
    );
  }
};
