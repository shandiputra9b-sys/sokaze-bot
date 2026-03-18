const {
  clearWarnings,
  ensureActionPermission,
  resolveMemberFromMessage,
  validateTargetMember
} = require("./moderationSystem");
const { normalizeReasonFromArgs, replyWithActionText, replyWithError } = require("./commandHelpers");

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

    const reason = normalizeReasonFromArgs(args);
    const result = await clearWarnings(targetMember, message.author, reason, client);

    if (!result.ok) {
      await replyWithError(message, result.reason);
      return;
    }

    await replyWithActionText(
      message,
      [
        `Semua warning aktif milik ${targetMember} telah dibersihkan.`,
        `Jumlah yang dibersihkan: ${result.caseEntry.count || 0}`,
        `Alasan: ${reason}`,
        `Case: #${result.caseEntry.id}`
      ].join("\n")
    );
  }
};
