const {
  ROLE_PANEL_OPTION_LIMIT,
  extractRoleId,
  getGuildPanel,
  hasRolePanelPermission,
  isRoleManageable,
  parseRoleOptionEmoji,
  splitPipeSegments,
  syncRolePanelMessage,
  updateReactionRolePanel
} = require("./reactionRoleSystem");
const { replyRolePanelError, replyRolePanelSuccess } = require("./commandHelpers");

module.exports = {
  name: "addroleoption",
  prefixEnabled: false,
  description: "Tambah opsi role ke dropdown panel.",
  category: "admin",
  usage: "addroleoption <panel_id> <@role> <label> | [description] | [emoji]",
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
    const role = roleId ? message.guild.roles.cache.get(roleId) || await message.guild.roles.fetch(roleId).catch(() => null) : null;

    if (!role) {
      await replyRolePanelError(message, "Role target tidak ditemukan.");
      return;
    }

    if (!isRoleManageable(role, message.guild)) {
      await replyRolePanelError(message, "Role itu tidak bisa dikelola bot. Pastikan posisinya di bawah role bot.");
      return;
    }

    if (panel.options.some((option) => option.roleId === role.id)) {
      await replyRolePanelError(message, "Role itu sudah ada di panel ini.");
      return;
    }

    if (panel.options.length >= ROLE_PANEL_OPTION_LIMIT) {
      await replyRolePanelError(message, `Satu panel maksimal punya ${ROLE_PANEL_OPTION_LIMIT} opsi role.`);
      return;
    }

    const [label, description, emojiInput] = splitPipeSegments(args.slice(2).join(" "));

    if (!label) {
      await replyRolePanelError(message, "Masukkan label untuk opsi role ini.");
      return;
    }

    const emojiData = emojiInput ? parseRoleOptionEmoji(emojiInput) : null;

    if (emojiInput && !emojiData) {
      await replyRolePanelError(message, "Emoji tidak valid. Gunakan emoji Unicode atau custom emoji server seperti `<:ml:1234567890>`.");
      return;
    }

    const updated = updateReactionRolePanel(message.guild.id, panelId, (current) => ({
      ...current,
      options: [
        ...current.options,
        {
          roleId: role.id,
          label: label.slice(0, 100),
          description: description ? description.slice(0, 100) : "",
          emoji: emojiInput || "",
          emojiData: emojiData || null
        }
      ]
    }));

    if (updated.messageId) {
      const syncResult = await syncRolePanelMessage(client, updated);

      if (!syncResult.ok) {
        await replyRolePanelError(message, syncResult.reason);
        return;
      }
    }

    await replyRolePanelSuccess(
      message,
      `Role ${role} berhasil ditambahkan ke panel #${panelId}.`
    );
  }
};
