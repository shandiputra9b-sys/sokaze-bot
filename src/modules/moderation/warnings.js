const {
  buildWarningsEmbed,
  ensureActionPermission,
  getActiveWarnings,
  resolveMemberFromMessage
} = require("./moderationSystem");
const { replyWithError } = require("./commandHelpers");

module.exports = {
  name: "warnings",
  description: "Lihat warning aktif milik member.",
  aliases: ["warns"],
  category: "moderation",
  usage: "warnings @user atau reply pesan target",
  async execute(message, args) {
    const permissionError = ensureActionPermission(message.member, "cases");

    if (permissionError) {
      await replyWithError(message, permissionError);
      return;
    }

    const targetMember = await resolveMemberFromMessage(message, args[0]);

    if (!targetMember) {
      await replyWithError(message, "Target tidak ditemukan. Mention member atau reply pesan target.");
      return;
    }

    await message.reply({
      embeds: [buildWarningsEmbed(targetMember, getActiveWarnings(message.guild.id, targetMember.id))]
    });
  }
};
