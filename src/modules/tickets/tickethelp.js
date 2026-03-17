const { canManageTicketTemplates } = require("./templateUtils");

module.exports = {
  name: "tickethelp",
  description: "Menampilkan daftar command pelayanan tiket untuk staff.",
  category: "tickets",
  usage: "tickethelp",
  async execute(message, args, client) {
    if (!canManageTicketTemplates(message, client)) {
      await message.reply("Kamu tidak punya izin untuk melihat command pelayanan tiket.");
      return;
    }

    const lines = [
      "**Daftar Command Pelayanan Tiket**",
      "",
      `\`${client.config.prefix}support\``,
      "Untuk tiket minta role dan hapus role.",
      "",
      `\`${client.config.prefix}iklan\``,
      "Untuk tiket pasang iklan.",
      "",
      `\`${client.config.prefix}verifikasi\``,
      "Untuk tiket verifikasi girl.",
      "",
      `\`${client.config.prefix}lapor\``,
      "Untuk tiket laporan dan keluh kesah member.",
      "",
      `\`${client.config.prefix}media\``,
      "Untuk tiket media partner.",
      "",
      `\`${client.config.prefix}partnership\``,
      "Untuk tiket partnership server.",
      "",
      `\`${client.config.prefix}partnershiphelp\``,
      "Untuk bantuan singkat soal syarat dan alur partnership."
    ];

    await message.reply({
      content: lines.join("\n")
    });
  }
};
