const { PermissionFlagsBits } = require("discord.js");
const { resolveCategoryChannel } = require("../../utils/channelResolver");
const {
  replyWithTemporaryMessage,
  setTempVoiceCategory
} = require("../temp-voice/tempVoiceSystem");

module.exports = {
  name: "settempvoicecategory",
  description: "Atur category untuk room Temp Voice yang baru dibuat.",
  aliases: ["settvcategory"],
  category: "admin",
  usage: "settempvoicecategory <#category>",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await replyWithTemporaryMessage(message, "Kamu butuh permission Manage Server untuk command ini.", client);
      return;
    }

    const channel = resolveCategoryChannel(message, args[0]);

    if (!channel) {
      await replyWithTemporaryMessage(
        message,
        "Category Temp Voice tidak valid. Mention category channel yang benar.",
        client
      );
      return;
    }

    setTempVoiceCategory(message.guild.id, channel.id);
    await replyWithTemporaryMessage(
      message,
      `Category Temp Voice untuk room baru diset ke **${channel.name}**.`,
      client
    );
  }
};
