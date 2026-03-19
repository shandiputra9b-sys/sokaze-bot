const {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder
} = require("discord.js");
const {
  hasSuggestionAdminPermission,
  sendSuggestionPanel,
  setSuggestionChannel,
  setSuggestionStaffRole,
  showSuggestionSettings
} = require("./suggestionSystem");

const slashData = new SlashCommandBuilder()
  .setName("suggestionpanel")
  .setDescription("Kelola panel suggestion modern")
  .setDMPermission(false)
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("send")
      .setDescription("Kirim panel suggestion ke channel")
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
      .setName("set-channel")
      .setDescription("Atur channel tempat suggestion dikirim")
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription("Channel target suggestion")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("set-staff-role")
      .setDescription("Atur role staff yang boleh review suggestion")
      .addRoleOption((option) =>
        option
          .setName("role")
          .setDescription("Role staff review")
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("status")
      .setDescription("Lihat pengaturan suggestion system")
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

    if (!hasSuggestionAdminPermission(interaction.member)) {
      await interaction.reply({
        content: "Kamu butuh permission Manage Server atau Manage Messages untuk mengatur suggestion panel.",
        ephemeral: true
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "send") {
      await sendSuggestionPanel(interaction);
      return;
    }

    if (subcommand === "set-channel") {
      await setSuggestionChannel(interaction);
      return;
    }

    if (subcommand === "set-staff-role") {
      await setSuggestionStaffRole(interaction);
      return;
    }

    if (subcommand === "status") {
      await showSuggestionSettings(interaction);
    }
  }
};
