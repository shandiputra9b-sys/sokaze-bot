const {
  clearWarnings,
  ensureActionPermission,
  resolveMemberFromMessage,
  validateTargetMember
} = require("./moderationSystem");
const { normalizeReasonFromArgs, replyWithError } = require("./commandHelpers");

module.exports = {
  name: "clearwarnings",
  description: "Bersihkan semua warning aktif member.",
  aliases: ["clearwarns"],
  category: "moderation",
  usage: "clearwarnings @user [alasan]",
  async execute(message, args, client) {
    const permissionError = ensureActionPermission(message.member, "clear-warnings");

    if (permissionError) {
      await replyWithError(message, permissionError);
      return;
    }

    const targetMember = await resolveMemberFromMessage(message, args[0]);

    if (!targetMember) {
      await replyWithError(message, "Target tidak ditemukan. Mention member atau reply pesan target.");
      return;
    }

    const targetError = validateTargetMember("warn", message.member, targetMember);

    if (targetError) {
      await replyWithError(message, targetError);
      return;
    }

    const result = await clearWarnings(targetMember, message.author, normalizeReasonFromArgs(args), client);

    if (!result.ok) {
      await replyWithError(message, result.reason);
      return;
    }

    await message.reply({
      embeds: [result.embed]
    });
  }
};
