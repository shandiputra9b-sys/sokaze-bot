const {
  createReactionRolePanel,
  hasRolePanelPermission,
  splitPipeSegments
} = require("./reactionRoleSystem");
const { replyRolePanelError, replyRolePanelSuccess, splitOptionalChannel } = require("./commandHelpers");

module.exports = {
  name: "createrolepanel",
  prefixEnabled: false,
  description: "Buat draft dropdown role panel baru.",
  category: "admin",
  usage: "createrolepanel [#channel] <single|multi> <title> | <description> | <placeholder>",
  async execute(message, args) {
    if (!hasRolePanelPermission(message.member)) {
      await replyRolePanelError(message, "Kamu butuh permission Manage Roles atau Manage Server untuk command ini.");
      return;
    }

    const { channel, remainingArgs } = splitOptionalChannel(message, args);

    if (!channel) {
      await replyRolePanelError(message, "Channel target tidak valid.");
      return;
    }

    const mode = remainingArgs[0]?.toLowerCase();

    if (mode !== "single" && mode !== "multi") {
      await replyRolePanelError(message, "Mode panel harus `single` atau `multi`.");
      return;
    }

    const [title, description, placeholder] = splitPipeSegments(remainingArgs.slice(1).join(" "));

    if (!title || !description || !placeholder) {
      await replyRolePanelError(
        message,
        "Format belum lengkap. Gunakan `title | description | placeholder` setelah mode panel."
      );
      return;
    }

    const panel = createReactionRolePanel({
      guildId: message.guild.id,
      channelId: channel.id,
      mode,
      title: title.slice(0, 256),
      description: description.slice(0, 1500),
      placeholder: placeholder.slice(0, 100),
      createdBy: message.author.id
    });

    await replyRolePanelSuccess(
      message,
      [
        `Panel #${panel.id} berhasil dibuat sebagai draft.`,
        `Channel: ${channel}`,
        `Mode: \`${panel.mode}\``,
        "Langkah berikutnya: tambahkan opsi role lalu deploy panel."
      ].join("\n")
    );
  }
};
