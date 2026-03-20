const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const {
  addAdminUser,
  buildAdminAccessEmbedLines,
  buildAdminAccessState,
  clearAdminUsers,
  getAdminAccessSettings,
  removeAdminUser
} = require("../../utils/adminAccess");
const { resolveGuildMember } = require("../../utils/memberResolver");

function buildStatusEmbed(guild) {
  const settings = getAdminAccessSettings(guild.id);

  return new EmbedBuilder()
    .setColor("#111214")
    .setTitle("Admin Access")
    .setDescription(buildAdminAccessEmbedLines(settings))
    .setFooter({
      text: "Hanya bot owner yang bisa mengubah daftar admin ini."
    });
}

async function ensureBotOwnerContext(target, client) {
  const member = target.member;
  const access = await buildAdminAccessState(member, client);

  if (access.botOwner) {
    return { ok: true };
  }

  return {
    ok: false,
    reason: "Command ini hanya bisa dipakai oleh bot owner."
  };
}

async function resolveTargetMember(guild, rawValue) {
  if (!rawValue) {
    return null;
  }

  return resolveGuildMember(guild, rawValue);
}

const slashData = new SlashCommandBuilder()
  .setName("adminaccess")
  .setDescription("Atur daftar admin command server ini")
  .setDMPermission(false)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("list")
      .setDescription("Lihat daftar admin command server")
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("add")
      .setDescription("Tambah user ke daftar admin command")
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
      .setDescription("Hapus user dari daftar admin command")
      .addUserOption((option) =>
        option
          .setName("member")
          .setDescription("Member target")
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("clear")
      .setDescription("Kosongkan semua admin command server ini")
  );

module.exports = {
  name: "adminaccess",
  aliases: ["setadmin", "botadmin"],
  category: "admin",
  botOwnerOnly: true,
  description: "Atur daftar admin command yang boleh memakai fitur admin bot.",
  usage: "adminaccess <list|add|remove|clear>",
  slashData,
  async execute(message, args, client) {
    const ownerCheck = await ensureBotOwnerContext(message, client);

    if (!ownerCheck.ok) {
      await message.reply(ownerCheck.reason);
      return;
    }

    const action = String(args[0] || "list").trim().toLowerCase();

    if (action === "list" || action === "status") {
      await message.reply({
        embeds: [buildStatusEmbed(message.guild)]
      });
      return;
    }

    if (action === "clear") {
      clearAdminUsers(message.guild.id);
      await message.reply({
        embeds: [buildStatusEmbed(message.guild)]
      });
      return;
    }

    const targetMember = await resolveTargetMember(message.guild, args[1]);

    if (!targetMember || targetMember.user.bot) {
      await message.reply("Member target tidak valid atau merupakan bot.");
      return;
    }

    if (action === "add") {
      addAdminUser(message.guild.id, targetMember.id);
      await message.reply({
        content: `${targetMember} berhasil ditambahkan ke daftar admin command.`,
        embeds: [buildStatusEmbed(message.guild)]
      });
      return;
    }

    if (action === "remove" || action === "delete") {
      removeAdminUser(message.guild.id, targetMember.id);
      await message.reply({
        content: `${targetMember} berhasil dihapus dari daftar admin command.`,
        embeds: [buildStatusEmbed(message.guild)]
      });
      return;
    }

    await message.reply("Gunakan `sk adminaccess list`, `add @user`, `remove @user`, atau `clear`.");
  },
  async executeSlash(interaction, client) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: "Command ini hanya bisa dipakai di server.",
        ephemeral: true
      });
      return;
    }

    const ownerCheck = await ensureBotOwnerContext(interaction, client);

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
        embeds: [buildStatusEmbed(interaction.guild)],
        ephemeral: true
      });
      return;
    }

    if (subcommand === "clear") {
      clearAdminUsers(interaction.guildId);
      await interaction.reply({
        content: "Daftar admin command berhasil dikosongkan.",
        embeds: [buildStatusEmbed(interaction.guild)],
        ephemeral: true
      });
      return;
    }

    const targetUser = interaction.options.getUser("member", true);
    const targetMember = interaction.options.getMember("member")
      || await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember || targetMember.user.bot) {
      await interaction.reply({
        content: "Member target tidak valid atau merupakan bot.",
        ephemeral: true
      });
      return;
    }

    if (subcommand === "add") {
      addAdminUser(interaction.guildId, targetMember.id);
      await interaction.reply({
        content: `${targetMember} berhasil ditambahkan ke daftar admin command.`,
        embeds: [buildStatusEmbed(interaction.guild)],
        ephemeral: true
      });
      return;
    }

    removeAdminUser(interaction.guildId, targetMember.id);
    await interaction.reply({
      content: `${targetMember} berhasil dihapus dari daftar admin command.`,
      embeds: [buildStatusEmbed(interaction.guild)],
      ephemeral: true
    });
  }
};
