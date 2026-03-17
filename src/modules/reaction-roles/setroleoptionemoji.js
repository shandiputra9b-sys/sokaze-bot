const {
  extractRoleId,
  getGuildPanel,
  hasRolePanelPermission,
  parseRoleOptionEmoji,
  syncRolePanelMessage,
  updateReactionRolePanel
} = require("./reactionRoleSystem");
const { replyRolePanelError, replyRolePanelSuccess } = require("./commandHelpers");

module.exports = {
  name: "setroleoptionemoji",
  prefixEnabled: false,
  description: "Atur atau hapus emoji untuk satu opsi role di panel.",
  aliases: ["setroleemoji"],
  category: "admin",
  usage: "setroleoptionemoji <panel_id> <@role|role_id> <emoji|off>",
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

    const emojiInput = args.slice(2).join(" ").trim();

    if (!emojiInput) {
      await replyRolePanelError(message, "Masukkan emoji atau `off` untuk menghapus emoji opsi.");
      return;
    }

    const clearEmoji = emojiInput.toLowerCase() === "off";
    const emojiData = clearEmoji ? null : parseRoleOptionEmoji(emojiInput);

    if (!clearEmoji && !emojiData) {
      await replyRolePanelError(message, "Emoji tidak valid. Gunakan emoji Unicode atau custom emoji server.");
      return;
    }

    const updated = updateReactionRolePanel(message.guild.id, panelId, (current) => ({
      ...current,
      options: current.options.map((option) => {
        if (option.roleId !== roleId) {
          return option;
        }

        return {
          ...option,
          emoji: clearEmoji ? "" : emojiInput,
          emojiData: emojiData
        };
      })
    }));

    if (updated.messageId && updated.options.length) {
      const syncResult = await syncRolePanelMessage(client, updated);

      if (!syncResult.ok) {
        await replyRolePanelError(message, syncResult.reason);
        return;
      }
    }

    await replyRolePanelSuccess(
      message,
      clearEmoji
        ? `Emoji opsi role di panel #${panelId} berhasil dihapus.`
        : `Emoji opsi role di panel #${panelId} berhasil diatur ke ${emojiInput}.`
    );
  }
};
