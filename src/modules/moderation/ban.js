const {
  banMember,
  ensureActionPermission,
  resolveMemberFromMessage,
  validateTargetMember
} = require("./moderationSystem");
const { normalizeReasonFromArgs, replyWithActionText, replyWithError } = require("./commandHelpers");

module.exports = {
  name: "ban",
  description: "Ban member dari server.",
  category: "moderation",
  usage: "ban @user [alasan]",
  async execute(message, args, client) {
    const permissionError = ensureActionPermission(message.member, "ban");

    if (permissionError) {
      await replyWithError(message, permissionError);
      return;
    }

    const targetMember = await resolveMemberFromMessage(message, args[0]);

    if (!targetMember) {
      await replyWithError(message, "Target tidak ditemukan. Mention member atau reply pesan target.");
      return;
    }

    const targetError = validateTargetMember("ban", message.member, targetMember);

    if (targetError) {
      await replyWithError(message, targetError);
      return;
    }

    const reason = normalizeReasonFromArgs(args);
    const result = await banMember(targetMember, message.author, reason, client);

    await replyWithActionText(
      message,
      [
        `<@${result.caseEntry.targetId}> telah di-ban.`,
        `Alasan: ${reason}`,
        `Case: #${result.caseEntry.id}`
      ].join("\n")
    );
  }
};
