const { canManageTicketTemplates } = require("./templateUtils");
const { sendTicketThanksPrompt } = require("./ticketFeedbackSystem");

module.exports = {
  name: "thanks",
  aliases: ["terimakasih", "thankyou"],
  description: "Kirim pesan terima kasih dan ajakan rating pelayanan ticket.",
  category: "tickets",
  usage: "thanks",
  async execute(message, args, client) {
    if (!await canManageTicketTemplates(message, client)) {
      await message.reply("Kamu tidak punya izin untuk mengirim template thank you ticket.");
      return;
    }

    await sendTicketThanksPrompt(message, client);
  }
};
