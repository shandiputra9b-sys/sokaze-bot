const {
  getGuildPanel,
  hasRolePanelPermission,
  isValidHttpUrl,
  syncRolePanelMessage,
  updateReactionRolePanel
} = require("./reactionRoleSystem");
const { replyRolePanelError, replyRolePanelSuccess } = require("./commandHelpers");

module.exports = {
  name: "setrolepanelimage",
  prefixEnabled: false,
  description: "Atur atau hapus header image/banner untuk panel role.",
  aliases: ["setrolepanelbanner"],
  category: "admin",
  usage: "setrolepanelimage <panel_id> <image_url|off>",
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

    const imageInput = args.slice(1).join(" ").trim();

    if (!imageInput) {
      await replyRolePanelError(message, "Masukkan image URL atau `off` untuk menghapus banner.");
      return;
    }

    const nextImageUrl = imageInput.toLowerCase() === "off" ? "" : imageInput;

    if (nextImageUrl && !isValidHttpUrl(nextImageUrl)) {
      await replyRolePanelError(message, "Image URL tidak valid. Gunakan link `http` atau `https` langsung ke gambar/gif.");
      return;
    }

    const updated = updateReactionRolePanel(message.guild.id, panelId, (current) => ({
      ...current,
      imageUrl: nextImageUrl
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
      nextImageUrl
        ? `Header image untuk panel #${panelId} berhasil diatur.\n${nextImageUrl}`
        : `Header image untuk panel #${panelId} berhasil dihapus.`
    );
  }
};
