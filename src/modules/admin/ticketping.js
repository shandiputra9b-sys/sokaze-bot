const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { updateGuildSettings } = require("../../services/guildConfigService");
const { getEffectiveGuildSettings } = require("../../utils/guildSettings");
const { getTicketType, getTicketTypeChoices } = require("../tickets/ticketSystem");

function getTicketPingSettings(guildId, client) {
  return getEffectiveGuildSettings(guildId, client).tickets?.pingRoleIdsByType || {};
}

function getRoleIdsForType(guildId, ticketTypeKey, client) {
  const settings = getTicketPingSettings(guildId, client);
  const roleIds = settings[ticketTypeKey];

  if (!Array.isArray(roleIds)) {
    return [];
  }

  return [...new Set(roleIds.filter(Boolean))];
}

function updateTicketPingRoles(guildId, client, updater) {
  return updateGuildSettings(guildId, (current) => {
    const currentTickets = {
      ...client.config.tickets,
      ...(current.tickets || {}),
      pingRoleIdsByType: {
        ...(client.config.tickets?.pingRoleIdsByType || {}),
        ...(current.tickets?.pingRoleIdsByType || {})
      }
    };

    return {
      ...current,
      tickets: updater(currentTickets)
    };
  });
}

function setRoleIdsForType(guildId, ticketTypeKey, roleIds, client) {
  return updateTicketPingRoles(guildId, client, (tickets) => ({
    ...tickets,
    pingRoleIdsByType: {
      ...tickets.pingRoleIdsByType,
      [ticketTypeKey]: [...new Set(roleIds.filter(Boolean))]
    }
  }));
}

function addRoleForType(guildId, ticketTypeKey, roleId, client) {
  const current = getRoleIdsForType(guildId, ticketTypeKey, client);
  return setRoleIdsForType(guildId, ticketTypeKey, [...current, roleId], client);
}

function removeRoleForType(guildId, ticketTypeKey, roleId, client) {
  const current = getRoleIdsForType(guildId, ticketTypeKey, client).filter((entry) => entry !== roleId);
  return setRoleIdsForType(guildId, ticketTypeKey, current, client);
}

function clearRolesForType(guildId, ticketTypeKey, client) {
  return setRoleIdsForType(guildId, ticketTypeKey, [], client);
}

function formatRoleMentions(roleIds) {
  if (!roleIds.length) {
    return "`Tidak ada role ping`";
  }

  return roleIds.map((roleId) => `<@&${roleId}>`).join(", ");
}

function buildOverviewEmbed(guild, client) {
  const lines = getTicketTypeChoices().map((choice) => {
    const roleIds = getRoleIdsForType(guild.id, choice.value, client);
    return `**${choice.name}**\n${formatRoleMentions(roleIds)}`;
  });

  return new EmbedBuilder()
    .setColor("#111214")
    .setTitle("Ticket Ping Roles")
    .setDescription(lines.join("\n\n"))
    .setFooter({
      text: "Role ini akan ikut diping saat ticket jenis tersebut dibuka."
    });
}

function buildTypeEmbed(guildId, ticketTypeKey, client) {
  const ticketType = getTicketType(ticketTypeKey);
  const roleIds = getRoleIdsForType(guildId, ticketTypeKey, client);

  return new EmbedBuilder()
    .setColor("#111214")
    .setTitle(`Ticket Ping • ${ticketType?.label || ticketTypeKey}`)
    .setDescription(formatRoleMentions(roleIds))
    .setFooter({
      text: "Gunakan add/remove/clear untuk mengubah daftar role ping."
    });
}

const slashData = new SlashCommandBuilder()
  .setName("ticketping")
  .setDescription("Atur role yang diping untuk tiap jenis ticket")
  .setDMPermission(false)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("list")
      .setDescription("Lihat semua setting ping ticket")
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("show")
      .setDescription("Lihat role ping untuk satu jenis ticket")
      .addStringOption((option) => {
        option
          .setName("ticket")
          .setDescription("Jenis ticket")
          .setRequired(true);
        for (const choice of getTicketTypeChoices()) {
          option.addChoices(choice);
        }
        return option;
      })
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("add")
      .setDescription("Tambah role ping untuk satu jenis ticket")
      .addStringOption((option) => {
        option
          .setName("ticket")
          .setDescription("Jenis ticket")
          .setRequired(true);
        for (const choice of getTicketTypeChoices()) {
          option.addChoices(choice);
        }
        return option;
      })
      .addRoleOption((option) =>
        option
          .setName("role")
          .setDescription("Role yang ingin diping")
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("remove")
      .setDescription("Hapus role ping dari satu jenis ticket")
      .addStringOption((option) => {
        option
          .setName("ticket")
          .setDescription("Jenis ticket")
          .setRequired(true);
        for (const choice of getTicketTypeChoices()) {
          option.addChoices(choice);
        }
        return option;
      })
      .addRoleOption((option) =>
        option
          .setName("role")
          .setDescription("Role yang ingin dihapus")
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("clear")
      .setDescription("Kosongkan semua role ping untuk satu jenis ticket")
      .addStringOption((option) => {
        option
          .setName("ticket")
          .setDescription("Jenis ticket")
          .setRequired(true);
        for (const choice of getTicketTypeChoices()) {
          option.addChoices(choice);
        }
        return option;
      })
  );

module.exports = {
  name: "ticketping",
  category: "admin",
  adminOnly: true,
  description: "Atur role yang diping saat ticket tertentu dibuka.",
  usage: "ticketping <list|show|add|remove|clear> <jenis-ticket> [@role]",
  slashData,
  async execute(message, args, client) {
    const action = String(args[0] || "list").trim().toLowerCase();

    if (action === "list" || action === "status") {
      await message.reply({
        embeds: [buildOverviewEmbed(message.guild, client)]
      });
      return;
    }

    const ticketTypeKey = String(args[1] || "").trim().toLowerCase();
    const ticketType = getTicketType(ticketTypeKey);

    if (!ticketType) {
      await message.reply("Jenis ticket tidak valid. Gunakan salah satu key ticket yang tersedia.");
      return;
    }

    if (action === "show") {
      await message.reply({
        embeds: [buildTypeEmbed(message.guild.id, ticketType.key, client)]
      });
      return;
    }

    if (action === "clear") {
      clearRolesForType(message.guild.id, ticketType.key, client);
      await message.reply({
        content: `Semua role ping untuk ticket **${ticketType.label}** berhasil dikosongkan.`,
        embeds: [buildTypeEmbed(message.guild.id, ticketType.key, client)]
      });
      return;
    }

    const roleId = args[2]?.replace(/[<@&>]/g, "");
    const role = roleId ? message.guild.roles.cache.get(roleId) : null;

    if (!role) {
      await message.reply("Role tidak valid. Mention role yang benar.");
      return;
    }

    if (action === "add") {
      addRoleForType(message.guild.id, ticketType.key, role.id, client);
      await message.reply({
        content: `${role} berhasil ditambahkan ke ping ticket **${ticketType.label}**.`,
        embeds: [buildTypeEmbed(message.guild.id, ticketType.key, client)]
      });
      return;
    }

    if (action === "remove" || action === "delete") {
      removeRoleForType(message.guild.id, ticketType.key, role.id, client);
      await message.reply({
        content: `${role} berhasil dihapus dari ping ticket **${ticketType.label}**.`,
        embeds: [buildTypeEmbed(message.guild.id, ticketType.key, client)]
      });
      return;
    }

    await message.reply("Gunakan `sk ticketping list`, `show`, `add`, `remove`, atau `clear`.");
  },
  async executeSlash(interaction, client) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: "Command ini hanya bisa dipakai di server.",
        ephemeral: true
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "list") {
      await interaction.reply({
        embeds: [buildOverviewEmbed(interaction.guild, client)],
        ephemeral: true
      });
      return;
    }

    const ticketTypeKey = interaction.options.getString("ticket", true);
    const ticketType = getTicketType(ticketTypeKey);

    if (!ticketType) {
      await interaction.reply({
        content: "Jenis ticket tidak valid.",
        ephemeral: true
      });
      return;
    }

    if (subcommand === "show") {
      await interaction.reply({
        embeds: [buildTypeEmbed(interaction.guildId, ticketType.key, client)],
        ephemeral: true
      });
      return;
    }

    if (subcommand === "clear") {
      clearRolesForType(interaction.guildId, ticketType.key, client);
      await interaction.reply({
        content: `Semua role ping untuk ticket **${ticketType.label}** berhasil dikosongkan.`,
        embeds: [buildTypeEmbed(interaction.guildId, ticketType.key, client)],
        ephemeral: true
      });
      return;
    }

    const role = interaction.options.getRole("role", true);

    if (subcommand === "add") {
      addRoleForType(interaction.guildId, ticketType.key, role.id, client);
      await interaction.reply({
        content: `${role} berhasil ditambahkan ke ping ticket **${ticketType.label}**.`,
        embeds: [buildTypeEmbed(interaction.guildId, ticketType.key, client)],
        ephemeral: true
      });
      return;
    }

    removeRoleForType(interaction.guildId, ticketType.key, role.id, client);
    await interaction.reply({
      content: `${role} berhasil dihapus dari ping ticket **${ticketType.label}**.`,
      embeds: [buildTypeEmbed(interaction.guildId, ticketType.key, client)],
      ephemeral: true
    });
  }
};
