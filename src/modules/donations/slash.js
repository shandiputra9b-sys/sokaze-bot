const {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder
} = require("discord.js");
const {
  hasDonationAdminPermission,
  openDonationModal,
  setDonationChannel,
  showDonationSettings
} = require("./donationSystem");

const slashData = new SlashCommandBuilder()
  .setName("donasi")
  .setDescription("Kelola pencatatan donasi server")
  .setDMPermission(false)
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("set-channel")
      .setDescription("Atur channel tempat log donasi dikirim")
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription("Channel target log donasi")
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("kirim")
      .setDescription("Buka modal untuk mencatat donasi baru")
      .addUserOption((option) =>
        option
          .setName("member")
          .setDescription("Member donor jika ingin total top donatur ikut ter-update")
          .setRequired(false)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("status")
      .setDescription("Lihat pengaturan donation log server")
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

    if (!hasDonationAdminPermission(interaction.member)) {
      await interaction.reply({
        content: "Kamu butuh permission Manage Server atau Manage Messages untuk mencatat donasi.",
        ephemeral: true
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "set-channel") {
      await setDonationChannel(interaction);
      return;
    }

    if (subcommand === "kirim") {
      await openDonationModal(interaction);
      return;
    }

    if (subcommand === "status") {
      await showDonationSettings(interaction);
    }
  }
};
