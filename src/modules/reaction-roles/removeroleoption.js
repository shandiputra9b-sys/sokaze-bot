const {
  deleteRolePanelMessage,
  extractRoleId,
  getGuildPanel,
  hasRolePanelPermission,
  syncRolePanelMessage,
  updateReactionRolePanel
} = require("./reactionRoleSystem");
const { replyRolePanelError, replyRolePanelSuccess } = require("./commandHelpers");

module.exports = {
  name: "removeroleoption",
  prefixEnabled: false,
  description: "Hapus opsi role dari panel dropdown.",
  category: "admin",
  usage: "removeroleoption <panel_id> <@role|role_id>",
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

    const roleId = extractRoleId(args[1]);

    if (!roleId) {
      await replyRolePanelError(message, "Masukkan role mention atau role ID yang valid.");
      return;
    }

    if (!panel.options.some((option) => option.roleId === roleId)) {
      await replyRolePanelError(message, "Role itu tidak ada di panel ini.");
      return;
    }

    const updated = updateReactionRolePanel(message.guild.id, panelId, (current) => ({
      ...current,
      options: current.options.filter((option) => option.roleId !== roleId)
    }));

    if (updated.messageId && !updated.options.length) {
      await deleteRolePanelMessage(client, updated);
      updateReactionRolePanel(message.guild.id, panelId, (current) => ({
        ...current,
        messageId: ""
      }));
    }

    if (updated.messageId && updated.options.length) {
      const syncResult = await syncRolePanelMessage(client, updated);

      if (!syncResult.ok) {
        await replyRolePanelError(message, syncResult.reason);
        return;
      }
    }

    await replyRolePanelSuccess(message, `Role option berhasil dihapus dari panel #${panelId}.`);
  }
};
