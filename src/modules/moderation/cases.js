const {
  buildCasesEmbed,
  ensureActionPermission,
  getRecentCases,
  resolveMemberFromMessage
} = require("./moderationSystem");
const { replyWithError } = require("./commandHelpers");

module.exports = {
  name: "cases",
  description: "Lihat riwayat kasus moderasi member.",
  category: "moderation",
  usage: "cases @user atau user_id",
  async execute(message, args) {
    const permissionError = ensureActionPermission(message.member, "cases");

    if (permissionError) {
      await replyWithError(message, permissionError);
      return;
    }

    const targetMember = await resolveMemberFromMessage(message, args[0]);
    const targetId = targetMember?.id || (args[0] ? args[0].replace(/[<@!>]/g, "") : "");

    if (!targetId) {
      await replyWithError(message, "Target tidak ditemukan. Mention member, reply pesan, atau kirim user ID.");
      return;
    }

    const targetLabel = targetMember ? targetMember.user.tag : targetId;

    await message.reply({
      embeds: [buildCasesEmbed(targetLabel, targetId, getRecentCases(message.guild.id, targetId))]
    });
  }
};
