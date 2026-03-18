const { ensureActionPermission, unbanUser } = require("./moderationSystem");
const { normalizeReasonFromArgs, replyWithActionText, replyWithError } = require("./commandHelpers");

module.exports = {
  name: "unban",
  description: "Buka ban user dengan user ID.",
  category: "moderation",
  usage: "unban <user_id> [alasan]",
  async execute(message, args, client) {
    const permissionError = ensureActionPermission(message.member, "unban");

    if (permissionError) {
      await replyWithError(message, permissionError);
      return;
    }

    if (!args[0]) {
      await replyWithError(message, "Masukkan user ID yang ingin di-unban.");
      return;
    }

    const reason = normalizeReasonFromArgs(args);
    const result = await unbanUser(message.guild, args[0], message.author, reason, client);

    if (!result.ok) {
      await replyWithError(message, result.reason);
      return;
    }

    await replyWithActionText(
      message,
      [
        `User \`${result.caseEntry.targetTag}\` telah di-unban.`,
        `Alasan: ${reason}`,
        `Case: #${result.caseEntry.id}`
      ].join("\n")
    );
  }
};
