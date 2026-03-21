const {
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  PermissionsBitField,
  SlashCommandBuilder
} = require("discord.js");
const {
  grantTemporaryDonatorRole,
  hasCustomRoleAdminPermission
} = require("./customRoleSystem");
const {
  getBotPermissionSettings,
  hasBotPermissionAccess
} = require("../../utils/botPermissions");
const { getEffectiveGuildSettings } = require("../../utils/guildSettings");

const RESTRICTED_ROLE_PERMISSIONS = new PermissionsBitField([
  PermissionFlagsBits.Administrator,
  PermissionFlagsBits.ManageGuild,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageMessages,
  PermissionFlagsBits.ManageWebhooks,
  PermissionFlagsBits.ManageNicknames,
  PermissionFlagsBits.ModerateMembers,
  PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.MentionEveryone
]);

function isRestrictedTargetRole(guildId, role) {
  if (!role) {
    return true;
  }

  if (role.permissions.has(RESTRICTED_ROLE_PERMISSIONS)) {
    return true;
  }

  const settings = getBotPermissionSettings(guildId);

  return Object.values(settings.accessRoles || {})
    .some((roleIds) => roleIds.includes(role.id));
}

function canBotManageTargetRole(guild, role) {
  if (!guild?.members?.me || !role) {
    return false;
  }

  return !role.managed
    && guild.members.me.roles.highest.comparePositionTo(role) > 0;
}

async function canUseTicketRoleGrant(interaction, client) {
  if (await hasBotPermissionAccess(interaction.member, "ticket", client)) {
    return true;
  }

  return hasCustomRoleAdminPermission(interaction.member);
}

async function sendRoleActionLog(interaction, client, action, member, role, extraLines = []) {
  const { tickets } = getEffectiveGuildSettings(interaction.guildId, client);
  const logChannelId = tickets.logChannelId || "";

  if (!logChannelId) {
    return;
  }

  const logChannel = interaction.guild.channels.cache.get(logChannelId)
    || await interaction.guild.channels.fetch(logChannelId).catch(() => null);

  if (!logChannel || logChannel.type !== ChannelType.GuildText) {
    return;
  }

  const actionLabel = action === "add" ? "Tambah Role" : "Tambah Role Donatur";

  await logChannel.send({
    embeds: [
      new EmbedBuilder()
        .setColor("#111214")
        .setTitle(`Log ${actionLabel}`)
        .setDescription(
          [
            `**Staff**: ${interaction.user} (${interaction.user.tag})`,
            `**Target**: ${member}`,
            `**Role**: ${role}`,
            `**Command**: \`/${interaction.commandName} ${interaction.options.getSubcommand()}\``,
            ...extraLines
          ].join("\n")
        )
        .setTimestamp()
    ]
  }).catch(() => null);
}

async function handleGeneralRoleGrant(interaction, client) {
  const role = interaction.options.getRole("role", true);
  const member = interaction.options.getMember("member")
    || await interaction.guild.members.fetch(interaction.options.getUser("member", true).id).catch(() => null);

  if (!await canUseTicketRoleGrant(interaction, client)) {
    await interaction.reply({
      content: "Kamu butuh akses bot `ticket` atau permission Manage Roles / Manage Server untuk memberi role lewat command ini.",
      ephemeral: true
    });
    return;
  }

  if (!member || member.user.bot) {
    await interaction.reply({
      content: "Member target tidak valid atau merupakan bot.",
      ephemeral: true
    });
    return;
  }

  if (isRestrictedTargetRole(interaction.guildId, role)) {
    await interaction.reply({
      content: "Role itu termasuk role sensitif/admin dan tidak bisa dibagikan lewat `/tambahrole role`.",
      ephemeral: true
    });
    return;
  }

  if (!canBotManageTargetRole(interaction.guild, role)) {
    await interaction.reply({
      content: "Bot tidak bisa mengelola role itu. Pastikan posisinya di bawah role bot dan bukan managed role.",
      ephemeral: true
    });
    return;
  }

  if (member.roles.cache.has(role.id)) {
    await interaction.reply({
      content: `${member} sudah punya ${role}.`,
      ephemeral: true
    });
    return;
  }

  await member.roles.add(role, `Granted by ${interaction.user.tag} via /tambahrole role`);

  await interaction.reply({
    content: `${role} berhasil diberikan ke ${member}.`,
    ephemeral: true
  });

  await sendRoleActionLog(interaction, client, "add", member, role);
}

const slashData = new SlashCommandBuilder()
  .setName("tambahrole")
  .setDescription("Berikan role untuk kebutuhan ticket atau donatur sementara")
  .setDMPermission(false)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("role")
      .setDescription("Berikan role member untuk kebutuhan ticket minta role / verifikasi")
      .addRoleOption((option) =>
        option
          .setName("role")
          .setDescription("Role target")
          .setRequired(true)
      )
      .addUserOption((option) =>
        option
          .setName("member")
          .setDescription("Member target")
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("donatur")
      .setDescription("Berikan role donatur sementara untuk akses custom role")
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
      )
  );

module.exports = {
  slashData,
  async executeSlash(interaction, client) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: "Command ini hanya bisa dipakai di server.",
        ephemeral: true
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "role") {
      await handleGeneralRoleGrant(interaction, client);
      return;
    }

    if (!hasCustomRoleAdminPermission(interaction.member)) {
      await interaction.reply({
        content: "Kamu butuh permission Manage Server atau Manage Roles untuk memberi akses donatur sementara.",
        ephemeral: true
      });
      return;
    }

    const result = await grantTemporaryDonatorRole(interaction);

    if (result?.ok) {
      await sendRoleActionLog(interaction, client, "donatur", result.member, result.role, [
        `**Durasi**: ${result.days} hari`,
        `**Expired**: <t:${Math.floor(new Date(result.expiresAt).getTime() / 1000)}:F>`
      ]);
    }
  }
};
