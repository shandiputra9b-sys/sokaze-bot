const { ensureActionPermission, unbanUser } = require("./moderationSystem");
const { normalizeReasonFromArgs, replyWithError } = require("./commandHelpers");

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

    const result = await unbanUser(message.guild, args[0], message.author, normalizeReasonFromArgs(args), client);

    if (!result.ok) {
      await replyWithError(message, result.reason);
      return;
    }

    await message.reply({
      embeds: [result.embed]
    });
  }
};
