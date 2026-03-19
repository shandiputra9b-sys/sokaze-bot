const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");
const {
  createSuggestion,
  deleteSuggestion,
  getSuggestion,
  updateSuggestion
} = require("../../services/suggestionStore");
const { getGuildSettings, updateGuildSettings } = require("../../services/guildConfigService");

const SUGGESTION_PANEL_BUTTON_ID = "suggestion:create";
const SUGGESTION_MODAL_ID = "suggestion:modal";
const SUGGESTION_VOTE_PREFIX = "suggestion:vote:";
const SUGGESTION_STATUS_PREFIX = "suggestion:status:";

const DEFAULT_SUGGESTION_SETTINGS = {
  channelId: "",
  staffRoleId: "",
  panelChannelId: ""
};

const SUGGESTION_STATUS_LABELS = {
  pending: "Pending",
  under_review: "Under Review",
  accepted: "Accepted",
  rejected: "Rejected",
  implemented: "Implemented"
};

const SUGGESTION_STATUS_COLORS = {
  pending: "#6b7280",
  under_review: "#f59e0b",
  accepted: "#22c55e",
  rejected: "#ef4444",
  implemented: "#3b82f6"
};

function getSuggestionSettings(guildId) {
  const settings = getGuildSettings(guildId, {
    suggestions: DEFAULT_SUGGESTION_SETTINGS
  }).suggestions;

  return {
    ...DEFAULT_SUGGESTION_SETTINGS,
    ...(settings || {})
  };
}

function updateSuggestionSettings(guildId, updater) {
  return updateGuildSettings(guildId, (current) => {
    const nextSettings = updater({
      ...DEFAULT_SUGGESTION_SETTINGS,
      ...(current.suggestions || {})
    });

    return {
      ...current,
      suggestions: {
        ...DEFAULT_SUGGESTION_SETTINGS,
        ...(nextSettings || {})
      }
    };
  });
}

function hasSuggestionAdminPermission(member) {
  return member.permissions.has(PermissionFlagsBits.ManageGuild)
    || member.permissions.has(PermissionFlagsBits.ManageMessages);
}

function hasSuggestionStaffPermission(member, guildId) {
  if (!member) {
    return false;
  }

  if (hasSuggestionAdminPermission(member)) {
    return true;
  }

  const settings = getSuggestionSettings(guildId);
  return Boolean(settings.staffRoleId && member.roles.cache.has(settings.staffRoleId));
}

function getGuildIconUrl(guild) {
  return guild.iconURL({
    extension: "png",
    forceStatic: true,
    size: 128
  }) || null;
}

function getVoteTotals(suggestion) {
  const votes = Object.values(suggestion.votes || {});
  const upvotes = votes.filter((vote) => vote === "up").length;
  const downvotes = votes.filter((vote) => vote === "down").length;

  return {
    upvotes,
    downvotes,
    score: upvotes - downvotes
  };
}

function buildVoteSummary(suggestion) {
  const totals = getVoteTotals(suggestion);
  return `⬆ ${totals.upvotes} • ⬇ ${totals.downvotes} • Score ${totals.score}`;
}

function buildSuggestionPanelButtonRow() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(SUGGESTION_PANEL_BUTTON_ID)
        .setLabel("Kirim Saran")
        .setStyle(ButtonStyle.Primary)
    )
  ];
}

function buildSuggestionPanelEmbed(guild) {
  const iconURL = getGuildIconUrl(guild) || undefined;
  const settings = getSuggestionSettings(guild.id);
  const destination = settings.channelId ? `<#${settings.channelId}>` : "channel ini";

  return new EmbedBuilder()
    .setColor("#111214")
    .setAuthor({
      name: "Sokaze Suggestions",
      iconURL
    })
    .setTitle("Suggestion Panel")
    .setDescription([
      "Punya ide atau masukan buat Sokaze?",
      "Klik tombol di bawah untuk kirim saran lewat modal.",
      `Semua suggestion akan masuk ke ${destination}.`,
      "User bisa vote, dan staff bisa review status suggestion."
    ].join("\n"))
    .setFooter({
      text: `${guild.name} • Sokaze Suggestion System`,
      iconURL
    })
    .setTimestamp();
}

function buildSuggestionModal() {
  const modal = new ModalBuilder()
    .setCustomId(SUGGESTION_MODAL_ID)
    .setTitle("Kirim Suggestion");

  const titleInput = new TextInputBuilder()
    .setCustomId("title")
    .setLabel("Judul")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  const categoryInput = new TextInputBuilder()
    .setCustomId("category")
    .setLabel("Kategori")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(32);

  const contentInput = new TextInputBuilder()
    .setCustomId("content")
    .setLabel("Isi Saran")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000);

  const benefitInput = new TextInputBuilder()
    .setCustomId("benefit")
    .setLabel("Manfaat / alasan")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(500);

  modal.addComponents(
    new ActionRowBuilder().addComponents(titleInput),
    new ActionRowBuilder().addComponents(categoryInput),
    new ActionRowBuilder().addComponents(contentInput),
    new ActionRowBuilder().addComponents(benefitInput)
  );

  return modal;
}

function buildSuggestionActionRows(suggestion) {
  const totals = getVoteTotals(suggestion);

  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${SUGGESTION_VOTE_PREFIX}up:${suggestion.id}`)
        .setLabel(`Upvote ${totals.upvotes}`)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${SUGGESTION_VOTE_PREFIX}down:${suggestion.id}`)
        .setLabel(`Downvote ${totals.downvotes}`)
        .setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${SUGGESTION_STATUS_PREFIX}under_review:${suggestion.id}`)
        .setLabel("Under Review")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`${SUGGESTION_STATUS_PREFIX}accepted:${suggestion.id}`)
        .setLabel("Accepted")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`${SUGGESTION_STATUS_PREFIX}rejected:${suggestion.id}`)
        .setLabel("Rejected")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`${SUGGESTION_STATUS_PREFIX}implemented:${suggestion.id}`)
        .setLabel("Implemented")
        .setStyle(ButtonStyle.Primary)
    )
  ];
}

function buildSuggestionEmbed(guild, suggestion) {
  const iconURL = getGuildIconUrl(guild) || undefined;
  const status = suggestion.status || "pending";
  const embed = new EmbedBuilder()
    .setColor(SUGGESTION_STATUS_COLORS[status] || SUGGESTION_STATUS_COLORS.pending)
    .setAuthor({
      name: "Sokaze Suggestions",
      iconURL
    })
    .setTitle(`Suggestion #${suggestion.publicId}`)
    .setDescription(`**${suggestion.title}**`)
    .addFields(
      {
        name: "Kategori",
        value: suggestion.category,
        inline: true
      },
      {
        name: "Status",
        value: SUGGESTION_STATUS_LABELS[status] || SUGGESTION_STATUS_LABELS.pending,
        inline: true
      },
      {
        name: "Votes",
        value: buildVoteSummary(suggestion),
        inline: true
      },
      {
        name: "Dari",
        value: `<@${suggestion.authorId}>`,
        inline: true
      },
      {
        name: "Isi Saran",
        value: suggestion.content,
        inline: false
      },
      {
        name: "Manfaat",
        value: suggestion.benefit,
        inline: false
      }
    )
    .setFooter({
      text: "Sokaze Suggestion System",
      iconURL
    })
    .setTimestamp(new Date(suggestion.updatedAt || suggestion.createdAt || Date.now()));

  if (suggestion.reviewerId) {
    embed.addFields({
      name: "Reviewer",
      value: `<@${suggestion.reviewerId}>`,
      inline: true
    });
  }

  return embed;
}

function buildSuggestionStatusEmbed(guild) {
  const settings = getSuggestionSettings(guild.id);

  return new EmbedBuilder()
    .setColor("#111214")
    .setTitle("Suggestion Settings")
    .addFields(
      {
        name: "Channel Suggestion",
        value: settings.channelId ? `<#${settings.channelId}>` : "Belum diatur",
        inline: false
      },
      {
        name: "Role Staff Review",
        value: settings.staffRoleId ? `<@&${settings.staffRoleId}>` : "Belum diatur",
        inline: false
      },
      {
        name: "Panel Channel",
        value: settings.panelChannelId ? `<#${settings.panelChannelId}>` : "Belum ada panel yang dikirim",
        inline: false
      }
    )
    .setFooter({
      text: `${guild.name} • Sokaze Suggestion System`
    })
    .setTimestamp();
}

function parseVoteButton(customId) {
  if (!customId.startsWith(SUGGESTION_VOTE_PREFIX)) {
    return null;
  }

  const raw = customId.slice(SUGGESTION_VOTE_PREFIX.length).split(":");

  if (raw.length !== 2) {
    return null;
  }

  return {
    direction: raw[0],
    suggestionId: raw[1]
  };
}

function parseStatusButton(customId) {
  if (!customId.startsWith(SUGGESTION_STATUS_PREFIX)) {
    return null;
  }

  const raw = customId.slice(SUGGESTION_STATUS_PREFIX.length).split(":");

  if (raw.length !== 2) {
    return null;
  }

  return {
    status: raw[0],
    suggestionId: raw[1]
  };
}

async function resolveSuggestionChannel(guild, preferredChannelId) {
  const settings = getSuggestionSettings(guild.id);
  const channelId = settings.channelId
    || settings.panelChannelId
    || preferredChannelId;

  if (!channelId) {
    return null;
  }

  const channel = guild.channels.cache.get(channelId)
    || await guild.channels.fetch(channelId).catch(() => null);

  if (!channel || channel.type !== ChannelType.GuildText) {
    return null;
  }

  return channel;
}

async function syncSuggestionMessage(client, guild, suggestion, fallbackMessage = null) {
  if (!suggestion?.channelId || !suggestion?.messageId) {
    return {
      ok: false,
      reason: "Message suggestion belum tersedia."
    };
  }

  const channel = guild.channels.cache.get(suggestion.channelId)
    || await guild.channels.fetch(suggestion.channelId).catch(() => null);

  if (!channel || !channel.isTextBased()) {
    return {
      ok: false,
      reason: "Channel suggestion tidak ditemukan."
    };
  }

  const message = fallbackMessage && fallbackMessage.id === suggestion.messageId
    ? fallbackMessage
    : await channel.messages.fetch(suggestion.messageId).catch(() => null);

  if (!message) {
    return {
      ok: false,
      reason: "Message suggestion tidak ditemukan."
    };
  }

  await message.edit({
    embeds: [buildSuggestionEmbed(guild, suggestion)],
    components: buildSuggestionActionRows(suggestion)
  }).catch((error) => {
    throw new Error(error.message || "Gagal memperbarui message suggestion.");
  });

  return {
    ok: true
  };
}

async function sendSuggestionPanel(interaction) {
  const channel = interaction.options.getChannel("channel") || interaction.channel;

  if (!channel || channel.type !== ChannelType.GuildText) {
    await interaction.reply({
      content: "Panel suggestion hanya bisa dikirim ke text channel biasa.",
      ephemeral: true
    });
    return;
  }

  updateSuggestionSettings(interaction.guildId, (current) => ({
    ...current,
    panelChannelId: channel.id,
    channelId: current.channelId || channel.id
  }));

  await channel.send({
    embeds: [buildSuggestionPanelEmbed(interaction.guild)],
    components: buildSuggestionPanelButtonRow()
  });

  await interaction.reply({
    content: `Panel suggestion berhasil dikirim ke ${channel}.`,
    ephemeral: true
  });
}

async function setSuggestionChannel(interaction) {
  const channel = interaction.options.getChannel("channel", true);

  if (channel.type !== ChannelType.GuildText) {
    await interaction.reply({
      content: "Channel suggestion harus berupa text channel biasa.",
      ephemeral: true
    });
    return;
  }

  updateSuggestionSettings(interaction.guildId, (current) => ({
    ...current,
    channelId: channel.id
  }));

  await interaction.reply({
    content: `Channel suggestion berhasil diatur ke ${channel}.`,
    ephemeral: true
  });
}

async function setSuggestionStaffRole(interaction) {
  const role = interaction.options.getRole("role", true);

  updateSuggestionSettings(interaction.guildId, (current) => ({
    ...current,
    staffRoleId: role.id
  }));

  await interaction.reply({
    content: `Role staff review berhasil diatur ke ${role}.`,
    ephemeral: true
  });
}

async function showSuggestionSettings(interaction) {
  await interaction.reply({
    embeds: [buildSuggestionStatusEmbed(interaction.guild)],
    ephemeral: true
  });
}

async function handleVoteButton(interaction, client, meta) {
  const suggestion = getSuggestion(meta.suggestionId);

  if (!suggestion || suggestion.guildId !== interaction.guildId) {
    await interaction.reply({
      content: "Suggestion tidak ditemukan.",
      ephemeral: true
    }).catch(() => null);
    return true;
  }

  if (suggestion.authorId === interaction.user.id) {
    await interaction.reply({
      content: "Kamu tidak bisa vote suggestion milik sendiri.",
      ephemeral: true
    }).catch(() => null);
    return true;
  }

  const updated = updateSuggestion(suggestion.id, (current) => {
    const votes = {
      ...(current.votes || {})
    };
    const currentVote = votes[interaction.user.id] || "";

    if (currentVote === meta.direction) {
      delete votes[interaction.user.id];
    } else {
      votes[interaction.user.id] = meta.direction;
    }

    return {
      ...current,
      votes,
      updatedAt: new Date().toISOString()
    };
  });

  await syncSuggestionMessage(client, interaction.guild, updated, interaction.message).catch((error) => {
    console.error("Failed to sync suggestion vote message:", error);
  });

  const nextVote = updated.votes?.[interaction.user.id] || "";
  const response = nextVote
    ? `Vote kamu untuk suggestion #${updated.publicId} berhasil diperbarui.`
    : `Vote kamu untuk suggestion #${updated.publicId} berhasil dihapus.`;

  await interaction.reply({
    content: response,
    ephemeral: true
  }).catch(() => null);

  return true;
}

async function handleStatusButton(interaction, client, meta) {
  if (!hasSuggestionStaffPermission(interaction.member, interaction.guildId)) {
    await interaction.reply({
      content: "Kamu tidak punya izin untuk review suggestion.",
      ephemeral: true
    }).catch(() => null);
    return true;
  }

  const suggestion = getSuggestion(meta.suggestionId);

  if (!suggestion || suggestion.guildId !== interaction.guildId) {
    await interaction.reply({
      content: "Suggestion tidak ditemukan.",
      ephemeral: true
    }).catch(() => null);
    return true;
  }

  const updated = updateSuggestion(suggestion.id, (current) => ({
    ...current,
    status: meta.status,
    reviewerId: interaction.user.id,
    updatedAt: new Date().toISOString()
  }));

  await syncSuggestionMessage(client, interaction.guild, updated, interaction.message).catch((error) => {
    console.error("Failed to sync suggestion status message:", error);
  });

  await interaction.reply({
    content: `Status suggestion #${updated.publicId} diubah ke ${SUGGESTION_STATUS_LABELS[updated.status]}.`,
    ephemeral: true
  }).catch(() => null);

  return true;
}

async function handleSuggestionButton(interaction, client) {
  if (interaction.customId === SUGGESTION_PANEL_BUTTON_ID) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: "Suggestion hanya bisa dipakai di server.",
        ephemeral: true
      }).catch(() => null);
      return true;
    }

    await interaction.showModal(buildSuggestionModal());
    return true;
  }

  const voteMeta = parseVoteButton(interaction.customId);

  if (voteMeta) {
    return handleVoteButton(interaction, client, voteMeta);
  }

  const statusMeta = parseStatusButton(interaction.customId);

  if (statusMeta) {
    return handleStatusButton(interaction, client, statusMeta);
  }

  return false;
}

async function handleSuggestionModalSubmit(interaction, client) {
  if (interaction.customId !== SUGGESTION_MODAL_ID) {
    return false;
  }

  if (!interaction.inGuild()) {
    await interaction.reply({
      content: "Suggestion hanya bisa dikirim di server.",
      ephemeral: true
    }).catch(() => null);
    return true;
  }

  await interaction.deferReply({ ephemeral: true }).catch(() => null);

  const targetChannel = await resolveSuggestionChannel(interaction.guild, interaction.channelId);

  if (!targetChannel) {
    await interaction.editReply({
      content: "Channel suggestion belum diatur atau tidak valid.",
    }).catch(() => null);
    return true;
  }

  const payload = {
    guildId: interaction.guildId,
    authorId: interaction.user.id,
    title: interaction.fields.getTextInputValue("title").trim(),
    category: interaction.fields.getTextInputValue("category").trim(),
    content: interaction.fields.getTextInputValue("content").trim(),
    benefit: interaction.fields.getTextInputValue("benefit").trim(),
    status: "pending",
    reviewerId: "",
    channelId: targetChannel.id,
    messageId: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const suggestion = createSuggestion(payload);
  const embed = buildSuggestionEmbed(interaction.guild, suggestion);
  const components = buildSuggestionActionRows(suggestion);

  const sent = await targetChannel.send({
    embeds: [embed],
    components
  }).catch((error) => {
    console.error("Failed to send suggestion message:", error);
    return null;
  });

  if (!sent) {
    deleteSuggestion(suggestion.id);
    await interaction.editReply({
      content: "Gagal mengirim suggestion ke channel target."
    }).catch(() => null);
    return true;
  }

  updateSuggestion(suggestion.id, (current) => ({
    ...current,
    messageId: sent.id
  }));

  await interaction.editReply({
    content: `Suggestion kamu berhasil dikirim sebagai #${suggestion.publicId}.`
  }).catch(() => null);

  return true;
}

module.exports = {
  SUGGESTION_PANEL_BUTTON_ID,
  SUGGESTION_MODAL_ID,
  buildSuggestionPanelButtonRow,
  buildSuggestionPanelEmbed,
  getSuggestionSettings,
  handleSuggestionButton,
  handleSuggestionModalSubmit,
  hasSuggestionAdminPermission,
  hasSuggestionStaffPermission,
  sendSuggestionPanel,
  setSuggestionChannel,
  setSuggestionStaffRole,
  showSuggestionSettings
};
