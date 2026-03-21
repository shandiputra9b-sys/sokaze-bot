const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { buildAdminAccessState } = require("../../utils/adminAccess");
const {
  addAccessRole,
  buildAccessListLines,
  buildAccessShowLines,
  clearAccessRoles,
  getBotPermissionSettings,
  normalizeAccessName,
  removeAccessRole
} = require("../../utils/botPermissions");

function buildOverviewEmbed(guild) {
  const settings = getBotPermissionSettings(guild.id);

  return new EmbedBuilder()
    .setColor("#111214")
    .setTitle("Bot Permission Access")
    .setDescription(buildAccessListLines(settings))
    .setFooter({
      text: "Hanya bot owner yang bisa mengatur akses ini."
    });
}

function buildAccessEmbed(guildId, accessName) {
  const details = buildAccessShowLines(guildId, accessName);

  return new EmbedBuilder()
    .setColor("#111214")
    .setTitle(`Akses: ${details.accessName || "tidak valid"}`)
    .setDescription(details.description)
    .setFooter({
      text: "Gunakan /botperm add atau /botperm remove untuk mengubah daftar role."
    });
}

async function ensureBotOwner(interaction, client) {
  const access = await buildAdminAccessState(interaction.member, client);

  if (access.botOwner) {
    return { ok: true };
  }

  return {
    ok: false,
    reason: "Command ini hanya bisa dipakai oleh bot owner."
  };
}

const slashData = new SlashCommandBuilder()
  .setName("botperm")
  .setDescription("Atur akses fitur bot berdasarkan role")
  .setDMPermission(false)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("list")
      .setDescription("Lihat semua akses yang sudah diset")
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("show")
      .setDescription("Lihat daftar role untuk satu akses")
      .addStringOption((option) =>
        option
          .setName("access")
          .setDescription("Nama akses, bebas misalnya ticket atau event")
          .setMinLength(1)
          .setMaxLength(32)
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("add")
      .setDescription("Tambah role ke akses tertentu")
      .addStringOption((option) =>
        option
          .setName("access")
          .setDescription("Nama akses, bebas misalnya ticket atau event")
          .setMinLength(1)
          .setMaxLength(32)
          .setRequired(true)
      )
      .addRoleOption((option) =>
        option
          .setName("role")
          .setDescription("Role yang mau diberi akses")
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("remove")
      .setDescription("Hapus role dari akses tertentu")
      .addStringOption((option) =>
        option
          .setName("access")
          .setDescription("Nama akses, bebas misalnya ticket atau event")
          .setMinLength(1)
          .setMaxLength(32)
          .setRequired(true)
      )
      .addRoleOption((option) =>
        option
          .setName("role")
          .setDescription("Role yang mau dihapus dari akses")
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("clear")
      .setDescription("Kosongkan semua role dari satu akses")
      .addStringOption((option) =>
        option
          .setName("access")
          .setDescription("Nama akses yang mau dikosongkan")
          .setMinLength(1)
          .setMaxLength(32)
          .setRequired(true)
      )
  );

module.exports = {
  category: "admin",
  botOwnerOnly: true,
  prefixEnabled: false,
  slashData,
  async executeSlash(interaction, client) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: "Command ini hanya bisa dipakai di server.",
        ephemeral: true
      });
      return;
    }

    const ownerCheck = await ensureBotOwner(interaction, client);

    if (!ownerCheck.ok) {
      await interaction.reply({
        content: ownerCheck.reason,
        ephemeral: true
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "list") {
      await interaction.reply({
        embeds: [buildOverviewEmbed(interaction.guild)],
        ephemeral: true
      });
      return;
    }

    const rawAccessName = interaction.options.getString("access", true);
    const accessName = normalizeAccessName(rawAccessName);

    if (!accessName) {
      await interaction.reply({
        content: "Nama akses tidak valid. Gunakan huruf, angka, `-`, atau `_`.",
        ephemeral: true
      });
      return;
    }

    if (subcommand === "show") {
      await interaction.reply({
        embeds: [buildAccessEmbed(interaction.guildId, accessName)],
        ephemeral: true
      });
      return;
    }

    if (subcommand === "clear") {
      clearAccessRoles(interaction.guildId, accessName);
      await interaction.reply({
        content: `Akses \`${accessName}\` berhasil dikosongkan.`,
        embeds: [buildAccessEmbed(interaction.guildId, accessName)],
        ephemeral: true
      });
      return;
    }

    const role = interaction.options.getRole("role", true);

    if (subcommand === "add") {
      addAccessRole(interaction.guildId, accessName, role.id);
      await interaction.reply({
        content: `${role} berhasil ditambahkan ke akses \`${accessName}\`.`,
        embeds: [buildAccessEmbed(interaction.guildId, accessName)],
        ephemeral: true
      });
      return;
    }

    removeAccessRole(interaction.guildId, accessName, role.id);
    await interaction.reply({
      content: `${role} berhasil dihapus dari akses \`${accessName}\`.`,
      embeds: [buildAccessEmbed(interaction.guildId, accessName)],
      ephemeral: true
    });
  }
};
