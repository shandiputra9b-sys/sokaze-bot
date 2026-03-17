const {
  ensureActionPermission,
  resolveMemberFromMessage,
  validateTargetMember,
  warnMember
} = require("./moderationSystem");
const { normalizeReasonFromArgs, replyWithError } = require("./commandHelpers");

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

    const result = await warnMember(targetMember, message.author, normalizeReasonFromArgs(args), client);

    await message.reply({
      embeds: [result.embed]
    });
  }
};
