const {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder
} = require("discord.js");
const {
  hasCustomRoleAdminPermission,
  revokeTemporaryDonatorRole,
  sendCustomRolePanel,
  setDonatorRole,
  showCustomRoleStatus
} = require("./customRoleSystem");

const slashData = new SlashCommandBuilder()
  .setName("customrole")
  .setDescription("Kelola sistem custom role booster/donatur")
  .setDMPermission(false)
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("send-panel")
      .setDescription("Kirim panel klaim custom role")
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription("Channel target panel")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("set-donatur-role")
      .setDescription("Atur role donatur yang boleh klaim custom role")
      .addRoleOption((option) =>
        option
          .setName("role")
          .setDescription("Role donatur akses custom role")
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("cabut-donatur")
      .setDescription("Cabut akses donatur sementara dari member")
      .addUserOption((option) =>
        option
          .setName("member")
          .setDescription("Member target")
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("status")
      .setDescription("Lihat status sistem custom role")
  );

module.exports = {
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
        content: "Kamu butuh permission Manage Server atau Manage Roles untuk mengatur custom role.",
        ephemeral: true
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "send-panel") {
      await sendCustomRolePanel(interaction);
      return;
    }

    if (subcommand === "set-donatur-role") {
      await setDonatorRole(interaction);
      return;
    }

    if (subcommand === "cabut-donatur") {
      await revokeTemporaryDonatorRole(interaction);
      return;
    }

    if (subcommand === "status") {
      await showCustomRoleStatus(interaction);
    }
  }
};
