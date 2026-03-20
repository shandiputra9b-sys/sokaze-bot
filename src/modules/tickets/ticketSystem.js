const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits
} = require("discord.js");
const { getGuildSettings } = require("../../services/guildConfigService");
const { getEffectiveGuildSettings } = require("../../utils/guildSettings");
const { getTicketPriorityFlair } = require("../levels/levelSystem");

const CLOSE_TICKET_BUTTON_ID = "ticket:close";
const TICKET_TYPE_PREFIX = "ticket:type:";

const TICKET_TYPES = [
  { key: "verifikasi-girl", label: "Verifikasi Girl", emoji: "\uD83D\uDC97", style: ButtonStyle.Secondary, panel: "main" },
  { key: "minta-role", label: "Minta Role", emoji: "\uD83C\uDFAD", style: ButtonStyle.Primary, panel: "main" },
  { key: "hapus-role", label: "Hapus Role", emoji: "\uD83E\uDDF9", style: ButtonStyle.Secondary, panel: "main" },
  { key: "laporan", label: "Laporan", emoji: "\uD83D\uDEA8", style: ButtonStyle.Danger, panel: "main" },
  { key: "pasang-iklan", label: "Pasang Iklan", emoji: "\uD83D\uDCE2", style: ButtonStyle.Success, panel: "main" },
  { key: "media-partner", label: "Media Partner", emoji: "\uD83D\uDCE1", style: ButtonStyle.Primary, panel: "main" },
  { key: "custom-role", label: "Custom Role", emoji: "\u2728", style: ButtonStyle.Primary, panel: "custom-role" },
  { key: "partnership", label: "Partnership", emoji: "\uD83E\uDD1D", style: ButtonStyle.Success, panel: "partnership" }
];

function getTicketType(customIdOrKey) {
  const key = customIdOrKey.startsWith(TICKET_TYPE_PREFIX)
    ? customIdOrKey.slice(TICKET_TYPE_PREFIX.length)
    : customIdOrKey;

  return TICKET_TYPES.find((type) => type.key === key) || null;
}

function buildTicketPanel(client, guildId) {
  const { tickets } = getEffectiveGuildSettings(guildId, client);
  const mainTypes = TICKET_TYPES.filter((type) => type.panel === "main");
  const panelLines = [
    "Gunakan loket ini kalau kamu butuh bantuan dari tim Sokaze.",
    "",
    "**Loket tersedia untuk:**",
    "- \uD83D\uDC97 Verifikasi Girl",
    "- \uD83C\uDFAD Minta Role",
    "- \uD83E\uDDF9 Hapus Role",
    "- \uD83D\uDEA8 Laporan",
    "- \uD83D\uDCE2 Pasang Iklan",
    "- \uD83D\uDCE1 Media Partner",
    "",
    "**SOP Pengambilan Tiket:**",
    "- \uD83D\uDD58 Jam aktif loket: `09.00 WIB - 02.00 WIB`",
    "- \uD83D\uDC69 Verifikasi Girl wajib siap ditemani admin perempuan",
    "- \uD83D\uDEAB Dilarang membuat laporan palsu",
    "- \uD83D\uDD15 Dilarang tag role yang diinginkan",
    "- \uD83D\uDCDD Contoh yang dilarang: <@&1482710348380373123>",
    "- \u23F3 Dilarang spam loket sebelum `2x24 jam`",
    "- \uD83D\uDDF4 Tiket akan ditutup dalam `6 jam` tanpa balasan",
    "",
    "Klik tombol di bawah untuk membuka tiket."
  ];

  const embed = new EmbedBuilder()
    .setColor(tickets.panelAccentColor)
    .setTitle("OPEN TIKET")
    .setDescription(panelLines.join("\n"));

  const components = [
    new ActionRowBuilder().addComponents(
      ...mainTypes.slice(0, 3).map((type) =>
        new ButtonBuilder()
          .setCustomId(`${TICKET_TYPE_PREFIX}${type.key}`)
          .setLabel(type.label)
          .setEmoji(type.emoji)
          .setStyle(type.style)
      )
    ),
    new ActionRowBuilder().addComponents(
      ...mainTypes.slice(3).map((type) =>
        new ButtonBuilder()
          .setCustomId(`${TICKET_TYPE_PREFIX}${type.key}`)
          .setLabel(type.label)
          .setEmoji(type.emoji)
          .setStyle(type.style)
      )
    )
  ];

  return {
    embeds: [embed],
    components
  };
}

function buildPartnershipTicketPanel(client, guildId) {
  const { tickets } = getEffectiveGuildSettings(guildId, client);
  const partnershipType = getTicketType("partnership");
  const partnershipOpen = tickets.partnershipEnabled !== false;
  const statusLabel = partnershipOpen ? "PARTNERSHIP OPEN" : "PARTNERSHIP CLOSED";
  const statusLine = partnershipOpen
    ? "\u25C8 Status: **OPEN**"
    : "\u25C8 Status: **CLOSED**";

  const embed = new EmbedBuilder()
    .setColor(tickets.panelAccentColor)
    .setTitle(statusLabel)
    .setDescription(
      [
        "Halo, welcome to Sokaze.",
        partnershipOpen
          ? "Gerbang partnership kami terbuka untuk komunitas yang ingin tumbuh bersama dalam kerja sama yang sehat dan saling menguntungkan."
          : "Saat ini partnership sedang ditutup sementara. Silakan pantau panel ini sampai loket dibuka kembali.",
        "",
        statusLine,
        "",
        "\u25C8 Benefit Partnership",
        "\u25B8 Promosi server di channel partnership Sokaze",
        "\u25B8 Relasi dengan komunitas aktif dan berkembang",
        "\u25B8 Dukungan kerja sama timbal balik untuk memperluas jangkauan komunitas",
        "",
        "\u25C8 Syarat Partnership",
        "\u25B8 Minimal 500 member aktif",
        "\u25B8 Member tidak termasuk bot",
        "\u25B8 Wajib siap untuk promosi timbal balik",
        "\u25B8 Tidak mengandung konten yang melanggar ToS Discord",
        "\u25B8 Tidak mengandung unsur NSFW",
        "",
        "\u25C8 Ketentuan Tambahan",
        "\u25B8 Mohon informasikan kepada staff jika server mengalami perubahan penting",
        "\u25B8 Jangan keluar dari server tanpa alasan dan konfirmasi yang jelas",
        "\u25B8 Partnership dapat dilepas jika ketentuan dilanggar",
        "\u25B8 Perwakilan server diharapkan aktif selama masa kerja sama",
        "",
        partnershipOpen
          ? "Tekan tombol di bawah untuk membuka Ticket Partnership."
          : "Tombol akan aktif kembali ketika partnership dibuka."
      ].join("\n")
    );

  const components = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${TICKET_TYPE_PREFIX}${partnershipType.key}`)
        .setLabel(partnershipOpen ? "Ticket Here" : "Coming Soon")
        .setEmoji(partnershipType.emoji)
        .setStyle(partnershipOpen ? partnershipType.style : ButtonStyle.Secondary)
        .setDisabled(!partnershipOpen)
    )
  ];

  return {
    embeds: [embed],
    components
  };
}

function buildTicketCloseRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CLOSE_TICKET_BUTTON_ID)
      .setLabel("Close Ticket")
      .setStyle(ButtonStyle.Danger)
  );
}

function buildTicketOpenedEmbed(user, supportRoleId, ticketType, ticketFlair = "") {
  const supportLine = supportRoleId ? `<@&${supportRoleId}>` : "Tim support belum diatur.";

  return new EmbedBuilder()
    .setColor("#1f1f1f")
    .setTitle(`Tiket Dibuka: ${ticketType.label}`)
    .setDescription(
      [
        `${user}, tiketmu sudah dibuka.`,
        ticketFlair ? `Priority Flair: **${ticketFlair}**` : null,
        `Jenis tiket: **${ticketType.label}**`,
        `Support: ${supportLine}`,
        "",
        "Jelaskan kebutuhanmu dengan jelas agar tim bisa bantu lebih cepat.",
        "Template detail akan dikirim lewat command `sksupport`."
      ].filter(Boolean).join("\n")
    );
}

async function findExistingTicketChannel(guild, userId) {
  return guild.channels.cache.find((channel) =>
    channel.type === ChannelType.GuildText && channel.topic?.startsWith(`ticket-owner:${userId}|`)
  ) || null;
}

async function createTicketChannel(interaction, client, ticketTypeKey) {
  const { tickets } = getEffectiveGuildSettings(interaction.guildId, client);
  const ticketType = getTicketType(ticketTypeKey);
  const guildSettings = getGuildSettings(interaction.guildId, {
    customRoles: {
      ticketCategoryId: ""
    }
  });
  const customRoleCategoryId = guildSettings.customRoles?.ticketCategoryId || "";

  const targetCategoryId = ticketType?.key === "partnership"
    ? tickets.partnershipCategoryId
    : ticketType?.key === "custom-role" && customRoleCategoryId
      ? customRoleCategoryId
    : tickets.categoryId;

  if (!targetCategoryId) {
    return {
      ok: false,
      reason: ticketType?.key === "partnership"
        ? "Kategori partnership belum diatur. Gunakan `sksetpartnershipcategory` dulu."
        : "Kategori tiket belum diatur. Gunakan `sksetticketcategory` dulu."
    };
  }

  const existingTicket = await findExistingTicketChannel(interaction.guild, interaction.user.id);

  if (existingTicket) {
    return {
      ok: false,
      reason: `Kamu sudah punya tiket terbuka di ${existingTicket}.`
    };
  }

  if (!ticketType) {
    return {
      ok: false,
      reason: "Jenis tiket tidak valid."
    };
  }

  if (ticketType.key === "partnership" && tickets.partnershipEnabled === false) {
    return {
      ok: false,
      reason: "Ticket partnership sedang ditutup sementara. Silakan coba lagi nanti."
    };
  }

  const ticketChannel = await interaction.guild.channels.create({
    name: `ticket-${ticketType.key}-${interaction.user.username}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 32),
    type: ChannelType.GuildText,
    parent: targetCategoryId,
    topic: `ticket-owner:${interaction.user.id}|type:${ticketType.key}`,
    permissionOverwrites: [
      {
        id: interaction.guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory
        ]
      },
      ...(tickets.supportRoleId
        ? [{
            id: tickets.supportRoleId,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.ManageMessages
            ]
          }]
        : [])
    ]
  });

  const ticketFlair = getTicketPriorityFlair(interaction.guildId, interaction.user.id);

  await ticketChannel.send({
    content: tickets.supportRoleId ? `<@&${tickets.supportRoleId}>` : undefined,
    embeds: [buildTicketOpenedEmbed(interaction.user, tickets.supportRoleId, ticketType, ticketFlair)],
    components: [buildTicketCloseRow()]
  });

  return {
    ok: true,
    channel: ticketChannel
  };
}

async function closeTicketChannel(interaction, client) {
  const { tickets } = getEffectiveGuildSettings(interaction.guildId, client);
  const ownerTag = interaction.channel.topic
    ?.match(/^ticket-owner:(\d+)\|type:/)?.[1];

  if (!ownerTag) {
    return {
      ok: false,
      reason: "Channel ini bukan ticket yang valid."
    };
  }

  if (
    interaction.user.id !== ownerTag &&
    !interaction.member.permissions.has(PermissionFlagsBits.ManageChannels) &&
    (!tickets.supportRoleId || !interaction.member.roles.cache.has(tickets.supportRoleId))
  ) {
    return {
      ok: false,
      reason: "Kamu tidak punya izin untuk menutup ticket ini."
    };
  }

  const logChannel = tickets.logChannelId
    ? await interaction.guild.channels.fetch(tickets.logChannelId).catch(() => null)
    : null;

  if (logChannel && logChannel.type === ChannelType.GuildText) {
    await logChannel.send(`Ticket closed: ${interaction.channel.name} by ${interaction.user}.`);
  }

  await interaction.channel.delete("Ticket closed");

  return { ok: true };
}

module.exports = {
  CLOSE_TICKET_BUTTON_ID,
  TICKET_TYPE_PREFIX,
  buildPartnershipTicketPanel,
  buildTicketPanel,
  getTicketType,
  createTicketChannel,
  closeTicketChannel
};
