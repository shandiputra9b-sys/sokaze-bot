const { PermissionFlagsBits } = require("discord.js");
const {
  replyWithTemporaryMessage,
  setDonatorValue
} = require("../leaderboards/leaderboardSystem");

function extractMentionId(value) {
  return value?.replace(/[<@!>]/g, "") || "";
}

function parseAmount(raw) {
  const normalized = String(raw || "").replace(/[^\d]/g, "");
  return Number.parseInt(normalized, 10);
}

module.exports = {
  name: "setdonatur",
  description: "Set nominal donatur untuk leaderboard manual.",
  aliases: ["setdonor", "setdonation"],
  category: "admin",
  usage: "setdonatur @user <amount>",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await replyWithTemporaryMessage(message, "Kamu butuh permission Manage Server untuk command ini.", client);
      return;
    }

    const userId = extractMentionId(args[0]);
    const amount = parseAmount(args[1]);

    if (!userId) {
      await replyWithTemporaryMessage(message, "Mention user donatur yang valid.", client);
      return;
    }

    if (!Number.isInteger(amount) || amount < 0) {
      await replyWithTemporaryMessage(message, "Nominal donatur harus berupa angka valid.", client);
      return;
    }

    setDonatorValue(message.guild.id, userId, amount);

    await replyWithTemporaryMessage(
      message,
      `Nominal donatur untuk <@${userId}> diset ke **Rp ${new Intl.NumberFormat("id-ID").format(amount)}**. Jalankan \`skrefreshdonaturboard\` untuk update panel.`,
      client
    );
  }
};
