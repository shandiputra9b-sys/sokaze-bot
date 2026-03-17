const {
  buildRolePanelDetailEmbed,
  buildRolePanelsEmbed,
  getGuildPanel,
  getGuildPanels,
  hasRolePanelPermission
} = require("./reactionRoleSystem");
const { replyRolePanelError } = require("./commandHelpers");

module.exports = {
  name: "rolepanels",
  prefixEnabled: false,
  description: "Lihat daftar panel dropdown role di server ini.",
  category: "admin",
  usage: "rolepanels [panel_id]",
  async execute(message, args) {
    if (!hasRolePanelPermission(message.member)) {
      await replyRolePanelError(message, "Kamu butuh permission Manage Roles atau Manage Server untuk command ini.");
      return;
    }

    if (args[0]) {
      const panel = getGuildPanel(message.guild.id, args[0]);

      if (!panel) {
        await replyRolePanelError(message, "Panel tidak ditemukan di server ini.");
        return;
      }

      await message.reply({
        embeds: [buildRolePanelDetailEmbed(message.guild, panel)]
      });
      return;
    }

    await message.reply({
      embeds: [buildRolePanelsEmbed(message.guild, getGuildPanels(message.guild.id))]
    });
  }
};
