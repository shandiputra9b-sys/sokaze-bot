const {
  ensureActionPermission,
  kickMember,
  resolveMemberFromMessage,
  validateTargetMember
} = require("./moderationSystem");
const { normalizeReasonFromArgs, replyWithError } = require("./commandHelpers");

module.exports = {
  name: "kick",
  description: "Kick member dari server.",
  category: "moderation",
  usage: "kick @user [alasan]",
  async execute(message, args, client) {
    const permissionError = ensureActionPermission(message.member, "kick");

    if (permissionError) {
      await replyWithError(message, permissionError);
      return;
    }

    const targetMember = await resolveMemberFromMessage(message, args[0]);

    if (!targetMember) {
      await replyWithError(message, "Target tidak ditemukan. Mention member atau reply pesan target.");
      return;
    }

    const targetError = validateTargetMember("kick", message.member, targetMember);

    if (targetError) {
      await replyWithError(message, targetError);
      return;
    }

    const result = await kickMember(targetMember, message.author, normalizeReasonFromArgs(args), client);

    await message.reply({
      embeds: [result.embed]
    });
  }
};
