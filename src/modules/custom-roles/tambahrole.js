const {
  PermissionFlagsBits,
  SlashCommandBuilder
} = require("discord.js");
const {
  grantTemporaryDonatorRole,
  hasCustomRoleAdminPermission
} = require("./customRoleSystem");

const slashData = new SlashCommandBuilder()
  .setName("tambahrole")
  .setDescription("Berikan role donatur sementara untuk akses custom role")
  .setDMPermission(false)
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addRoleOption((option) =>
    option
      .setName("role")
      .setDescription("Role donatur yang mau diberikan")
      .setRequired(true)
  )
  .addUserOption((option) =>
    option
      .setName("member")
      .setDescription("Member target")
      .setRequired(true)
  )
  .addIntegerOption((option) =>
    option
      .setName("days")
      .setDescription("Jumlah hari aktif role donatur")
      .setMinValue(1)
      .setRequired(true)
  );

module.exports = {
  adminOnly: true,
  slashData,
  async executeSlash(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: "Command ini hanya bisa dipakai di server.",
        ephemeral: true
      });
      return;
    }

    if (!hasCustomRoleAdminPermission(interaction.member)) {
      await interaction.reply({
        content: "Kamu butuh permission Manage Server atau Manage Roles untuk memberi akses donatur sementara.",
        ephemeral: true
      });
      return;
    }

    await grantTemporaryDonatorRole(interaction);
  }
};
