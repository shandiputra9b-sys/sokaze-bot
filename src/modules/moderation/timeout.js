const {
  ensureActionPermission,
  parseDuration,
  resolveMemberFromMessage,
  timeoutMember,
  validateTargetMember
} = require("./moderationSystem");
const { normalizeReasonFromArgs, replyWithError } = require("./commandHelpers");

module.exports = {
  name: "timeout",
  description: "Berikan timeout ke member.",
  aliases: ["mute"],
  category: "moderation",
  usage: "timeout @user <durasi> [alasan]",
  async execute(message, args, client) {
    const permissionError = ensureActionPermission(message.member, "timeout");

    if (permissionError) {
      await replyWithError(message, permissionError);
      return;
    }

    const targetMember = await resolveMemberFromMessage(message, args[0]);

    if (!targetMember) {
      await replyWithError(message, "Target tidak ditemukan. Mention member atau reply pesan target.");
      return;
    }

    const targetError = validateTargetMember("timeout", message.member, targetMember);

    if (targetError) {
      await replyWithError(message, targetError);
      return;
    }

    const durationMs = parseDuration(args[1]);
    const maxDurationMs = 28 * 24 * 60 * 60 * 1000;

    if (!durationMs || durationMs < 60 * 1000 || durationMs > maxDurationMs) {
      await replyWithError(message, "Durasi timeout tidak valid. Gunakan format seperti `30m`, `2h`, atau `1d`.");
      return;
    }

    const result = await timeoutMember(targetMember, message.author, durationMs, normalizeReasonFromArgs(args, 2), client);

    await message.reply({
      embeds: [result.embed]
    });
  }
};
