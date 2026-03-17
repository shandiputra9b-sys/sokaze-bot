const {
  getGuildPanel,
  hasRolePanelPermission,
  syncRolePanelMessage
} = require("./reactionRoleSystem");
const { replyRolePanelError, replyRolePanelSuccess } = require("./commandHelpers");

module.exports = {
  name: "sendrolepanel",
  prefixEnabled: false,
  description: "Kirim atau refresh dropdown role panel ke channel target.",
  aliases: ["deployrolepanel", "refreshrolepanel"],
  category: "admin",
  usage: "sendrolepanel <panel_id>",
  async execute(message, args, client) {
    if (!hasRolePanelPermission(message.member)) {
      await replyRolePanelError(message, "Kamu butuh permission Manage Roles atau Manage Server untuk command ini.");
      return;
    }

    const panelId = args[0];
    const panel = getGuildPanel(message.guild.id, panelId);

    if (!panel) {
      await replyRolePanelError(message, "Panel tidak ditemukan di server ini.");
      return;
    }

    const result = await syncRolePanelMessage(client, panel);

    if (!result.ok) {
      await replyRolePanelError(message, result.reason);
      return;
    }

    await replyRolePanelSuccess(
      message,
      `Panel #${panelId} berhasil di-deploy ke <#${result.panel.channelId}>.`
    );
  }
};
