const {
  getGuildPanel,
  hasRolePanelPermission,
  splitPipeSegments,
  syncRolePanelMessage,
  updateReactionRolePanel
} = require("./reactionRoleSystem");
const { replyRolePanelError, replyRolePanelSuccess } = require("./commandHelpers");

module.exports = {
  name: "editrolepanel",
  prefixEnabled: false,
  description: "Ubah title, description, dan placeholder panel role.",
  category: "admin",
  usage: "editrolepanel <panel_id> <title> | <description> | <placeholder>",
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

    const [title, description, placeholder] = splitPipeSegments(args.slice(1).join(" "));

    if (!title || !description || !placeholder) {
      await replyRolePanelError(message, "Gunakan format `title | description | placeholder`.");
      return;
    }

    const updated = updateReactionRolePanel(message.guild.id, panelId, (current) => ({
      ...current,
      title: title.slice(0, 256),
      description: description.slice(0, 1500),
      placeholder: placeholder.slice(0, 100)
    }));

    if (updated.messageId) {
      const syncResult = await syncRolePanelMessage(client, updated);

      if (!syncResult.ok) {
        await replyRolePanelError(message, syncResult.reason);
        return;
      }
    }

    await replyRolePanelSuccess(message, `Panel #${panelId} berhasil diperbarui.`);
  }
};
