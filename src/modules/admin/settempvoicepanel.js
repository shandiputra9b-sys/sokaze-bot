const { PermissionFlagsBits } = require("discord.js");
const { resolveTextChannel } = require("../../utils/channelResolver");
const {
  replyWithTemporaryMessage,
  setTempVoicePanelChannel,
  syncTempVoiceRoomsForGuild
} = require("../temp-voice/tempVoiceSystem");

module.exports = {
  name: "settempvoicepanel",
  description: "Atur text channel untuk panel kontrol Temp Voice.",
  aliases: ["settvpanel", "settempvoicecontrol"],
  category: "admin",
  usage: "settempvoicepanel [#channel]",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await replyWithTemporaryMessage(message, "Kamu butuh permission Manage Server untuk command ini.", client);
      return;
    }

    const channel = resolveTextChannel(message, args[0]);

    if (!channel) {
      await replyWithTemporaryMessage(
        message,
        "Channel panel Temp Voice tidak valid. Mention channel teks atau jalankan di channel target.",
        client
      );
      return;
    }

    setTempVoicePanelChannel(message.guild.id, channel.id);
    await syncTempVoiceRoomsForGuild(message.guild, client).catch(() => null);

    await replyWithTemporaryMessage(
      message,
      `Panel Temp Voice diset ke ${channel}. Room aktif akan mencoba sync panel ke sana.`,
      client
    );
  }
};
