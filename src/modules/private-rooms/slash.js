const {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder
} = require("discord.js");
const {
  closeOwnedPrivateRoom,
  createPrivateRoom,
  hasPrivateRoomAdminPermission,
  inviteToPrivateRoom,
  removeFromPrivateRoom,
  setPrivateRoomCategory,
  showPrivateRoomAdminStatus,
  showPrivateRoomStatus
} = require("./privateRoomSystem");

const slashData = new SlashCommandBuilder()
  .setName("privateroom")
  .setDescription("Kelola temporary private channel untuk member elite")
  .setDMPermission(false)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("create")
      .setDescription("Buat temporary private room milikmu")
      .addStringOption((option) =>
        option
          .setName("name")
          .setDescription("Nama room opsional")
          .setMaxLength(50)
          .setRequired(false)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("status")
      .setDescription("Lihat status private room milikmu")
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("invite")
      .setDescription("Undang member ke private room milikmu")
      .addUserOption((option) =>
        option
          .setName("member")
          .setDescription("Member target")
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("remove")
      .setDescription("Cabut akses member dari private room milikmu")
      .addUserOption((option) =>
        option
          .setName("member")
          .setDescription("Member target")
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("close")
      .setDescription("Tutup private room milikmu")
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("set-category")
      .setDescription("Atur category untuk channel private room")
      .addChannelOption((option) =>
        option
          .setName("category")
          .setDescription("Category target")
          .addChannelTypes(ChannelType.GuildCategory)
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("admin-status")
      .setDescription("Lihat status sistem private room")
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

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "set-category" || subcommand === "admin-status") {
      if (!hasPrivateRoomAdminPermission(interaction.member)) {
        await interaction.reply({
          content: "Kamu butuh permission Manage Server atau Manage Channels untuk mengatur private room.",
          ephemeral: true
        });
        return;
      }

      if (subcommand === "set-category") {
        await setPrivateRoomCategory(interaction);
        return;
      }

      await showPrivateRoomAdminStatus(interaction);
      return;
    }

    if (subcommand === "create") {
      await createPrivateRoom(interaction);
      return;
    }

    if (subcommand === "status") {
      await showPrivateRoomStatus(interaction);
      return;
    }

    if (subcommand === "invite") {
      await inviteToPrivateRoom(interaction);
      return;
    }

    if (subcommand === "remove") {
      await removeFromPrivateRoom(interaction);
      return;
    }

    if (subcommand === "close") {
      await closeOwnedPrivateRoom(interaction);
    }
  }
};
