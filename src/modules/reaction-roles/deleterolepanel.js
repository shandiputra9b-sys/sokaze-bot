const {
  deleteReactionRolePanel,
  deleteRolePanelMessage,
  getGuildPanel,
  hasRolePanelPermission
} = require("./reactionRoleSystem");
const { replyRolePanelError, replyRolePanelSuccess } = require("./commandHelpers");

module.exports = {
  name: "deleterolepanel",
  prefixEnabled: false,
  description: "Hapus panel dropdown role beserta message-nya.",
  category: "admin",
  usage: "deleterolepanel <panel_id>",
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

    await deleteRolePanelMessage(client, panel);
    deleteReactionRolePanel(message.guild.id, panelId);

    await replyRolePanelSuccess(message, `Panel #${panelId} berhasil dihapus.`);
  }
};
