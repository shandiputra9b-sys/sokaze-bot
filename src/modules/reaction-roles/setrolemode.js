const {
  getGuildPanel,
  hasRolePanelPermission,
  syncRolePanelMessage,
  updateReactionRolePanel
} = require("./reactionRoleSystem");
const { replyRolePanelError, replyRolePanelSuccess } = require("./commandHelpers");

module.exports = {
  name: "setrolemode",
  prefixEnabled: false,
  description: "Ubah mode dropdown panel menjadi single atau multi.",
  category: "admin",
  usage: "setrolemode <panel_id> <single|multi>",
  async execute(message, args, client) {
    if (!hasRolePanelPermission(message.member)) {
      await replyRolePanelError(message, "Kamu butuh permission Manage Roles atau Manage Server untuk command ini.");
      return;
    }

    const panelId = args[0];
    const nextMode = args[1]?.toLowerCase();
    const panel = getGuildPanel(message.guild.id, panelId);

    if (!panel) {
      await replyRolePanelError(message, "Panel tidak ditemukan di server ini.");
      return;
    }

    if (nextMode !== "single" && nextMode !== "multi") {
      await replyRolePanelError(message, "Mode panel harus `single` atau `multi`.");
      return;
    }

    const updated = updateReactionRolePanel(message.guild.id, panelId, (current) => ({
      ...current,
      mode: nextMode
    }));

    if (updated.messageId) {
      const syncResult = await syncRolePanelMessage(client, updated);

      if (!syncResult.ok) {
        await replyRolePanelError(message, syncResult.reason);
        return;
      }
    }

    await replyRolePanelSuccess(message, `Mode panel #${panelId} diubah ke \`${nextMode}\`.`);
  }
};
