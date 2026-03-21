const {
  PermissionFlagsBits,
  PermissionsBitField,
  SlashCommandBuilder
} = require("discord.js");
const {
  hasCustomRoleAdminPermission,
  revokeTemporaryDonatorRole
} = require("./customRoleSystem");
const {
  getBotPermissionSettings,
  hasBotPermissionAccess
} = require("../../utils/botPermissions");

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

async function canUseTicketRoleAccess(interaction, client) {
  if (await hasBotPermissionAccess(interaction.member, "ticket", client)) {
    return true;
  }

  return hasCustomRoleAdminPermission(interaction.member);
}

async function handleGeneralRoleRemoval(interaction, client) {
  const role = interaction.options.getRole("role", true);
  const member = interaction.options.getMember("member")
    || await interaction.guild.members.fetch(interaction.options.getUser("member", true).id).catch(() => null);

  if (!await canUseTicketRoleAccess(interaction, client)) {
    await interaction.reply({
      content: "Kamu butuh akses bot `ticket` atau permission Manage Roles / Manage Server untuk melepas role lewat command ini.",
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
      content: "Role itu termasuk role sensitif/admin dan tidak bisa dilepas lewat `/lepasrole role`.",
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

  if (!member.roles.cache.has(role.id)) {
    await interaction.reply({
      content: `${member} tidak punya ${role}.`,
      ephemeral: true
    });
    return;
  }

  await member.roles.remove(role, `Removed by ${interaction.user.tag} via /lepasrole role`);

  await interaction.reply({
    content: `${role} berhasil dilepas dari ${member}.`,
    ephemeral: true
  });
}

const slashData = new SlashCommandBuilder()
  .setName("lepasrole")
  .setDescription("Lepas role untuk kebutuhan ticket atau cabut donatur sementara")
  .setDMPermission(false)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("role")
      .setDescription("Lepas role member untuk kebutuhan ticket minta role / verifikasi")
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
      .setDescription("Cabut role donatur sementara untuk akses custom role")
      .addUserOption((option) =>
        option
          .setName("member")
          .setDescription("Member target")
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
      await handleGeneralRoleRemoval(interaction, client);
      return;
    }

    if (!hasCustomRoleAdminPermission(interaction.member)) {
      await interaction.reply({
        content: "Kamu butuh permission Manage Server atau Manage Roles untuk mencabut akses donatur sementara.",
        ephemeral: true
      });
      return;
    }

    await revokeTemporaryDonatorRole(interaction);
  }
};
