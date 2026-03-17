const { buildModerationPanel, ensureActionPermission, resolveMemberFromMessage } = require("./moderationSystem");
const { replyWithError } = require("./commandHelpers");

module.exports = {
  name: "modpanel",
  description: "Buka panel moderasi modern untuk target member.",
  category: "moderation",
  usage: "modpanel @user atau reply pesan target",
  async execute(message, args) {
    const permissionError = ensureActionPermission(message.member, "modpanel");

    if (permissionError) {
      await replyWithError(message, permissionError);
      return;
    }

    const targetMember = await resolveMemberFromMessage(message, args[0]);

    if (!targetMember) {
      await replyWithError(message, "Target tidak ditemukan. Mention member atau reply pesan target.");
      return;
    }

    await message.reply(buildModerationPanel(targetMember));
  }
};
