const {
  banMember,
  ensureActionPermission,
  resolveMemberFromMessage,
  validateTargetMember
} = require("./moderationSystem");
const { normalizeReasonFromArgs, replyWithError } = require("./commandHelpers");

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

    const result = await banMember(targetMember, message.author, normalizeReasonFromArgs(args), client);

    await message.reply({
      embeds: [result.embed]
    });
  }
};
