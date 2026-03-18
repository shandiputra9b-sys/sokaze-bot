const {
  ensureActionPermission,
  getActiveWarnings,
  resolveMemberFromMessage,
  validateTargetMember,
  warnMember
} = require("./moderationSystem");
const { normalizeReasonFromArgs, replyWithActionText, replyWithError } = require("./commandHelpers");

module.exports = {
  name: "warn",
  description: "Berikan warning ke member dengan tampilan card modern.",
  category: "moderation",
  usage: "warn @user [alasan]",
  async execute(message, args, client) {
    const permissionError = ensureActionPermission(message.member, "warn");

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
    const result = await warnMember(targetMember, message.author, reason, client);
    const activeWarnings = getActiveWarnings(message.guild.id, targetMember.id).length;

    await replyWithActionText(
      message,
      [
        `${targetMember} telah diberi warning.`,
        `Alasan: ${reason}`,
        `Case: #${result.caseEntry.id}`,
        `Warning aktif: ${activeWarnings}`
      ].join("\n")
    );
  }
};
