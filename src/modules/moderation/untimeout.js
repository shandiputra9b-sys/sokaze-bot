const {
  ensureActionPermission,
  removeTimeout,
  resolveMemberFromMessage,
  validateTargetMember
} = require("./moderationSystem");
const { normalizeReasonFromArgs, replyWithActionText, replyWithError } = require("./commandHelpers");

module.exports = {
  name: "untimeout",
  description: "Cabut timeout dari member.",
  aliases: ["unmute"],
  category: "moderation",
  usage: "untimeout @user [alasan]",
  async execute(message, args, client) {
    const permissionError = ensureActionPermission(message.member, "untimeout");

    if (permissionError) {
      await replyWithError(message, permissionError);
      return;
    }

    const targetMember = await resolveMemberFromMessage(message, args[0]);

    if (!targetMember) {
      await replyWithError(message, "Target tidak ditemukan. Mention member atau reply pesan target.");
      return;
    }

    const targetError = validateTargetMember("untimeout", message.member, targetMember);

    if (targetError) {
      await replyWithError(message, targetError);
      return;
    }

    const reason = normalizeReasonFromArgs(args);
    const result = await removeTimeout(targetMember, message.author, reason, client);

    await replyWithActionText(
      message,
      [
        `Timeout milik ${targetMember} telah dicabut.`,
        `Alasan: ${reason}`,
        `Case: #${result.caseEntry.id}`
      ].join("\n")
    );
  }
};
