const { buildPurgeConfirmation, ensureActionPermission } = require("./moderationSystem");
const { replyWithError } = require("./commandHelpers");

module.exports = {
  name: "purge",
  description: "Hapus banyak pesan dengan confirm button.",
  aliases: ["clear"],
  category: "moderation",
  usage: "purge <1-100>",
  async execute(message, args, client) {
    const permissionError = ensureActionPermission(message.member, "purge");

    if (permissionError) {
      await replyWithError(message, permissionError);
      return;
    }

    const amount = Number.parseInt(args[0], 10);

    if (!Number.isInteger(amount) || amount < 1 || amount > 100) {
      await replyWithError(message, "Masukkan jumlah pesan antara `1` sampai `100`.");
      return;
    }

    await message.reply(buildPurgeConfirmation(client, message.channel, amount, message.author.id));
  }
};
