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
const { getEffectiveGuildSettings } = require("../../utils/guildSettings");
const {
  createNameRequest,
  findPendingByUser,
  getNameRequest,
  updateNameRequest
} = require("../../services/nameRequestStore");
const {
  formatRelativeCooldown,
  getDirectRenameAccess,
  markDirectRenameUsed
} = require("../levels/levelSystem");

const NAME_REQUEST_BUTTON_ID = "namerequest:new";
const NAME_REQUEST_MODAL_ID = "namerequest:modal:new";
const NAME_REQUEST_APPROVE_PREFIX = "namerequest:approve:";
const NAME_REQUEST_REJECT_PREFIX = "namerequest:reject:";
const NAME_REQUEST_INPUT_ID = "namerequest_name";
const NAME_REQUEST_NOTE_ID = "namerequest_note";
const NAME_REQUEST_MIN_LENGTH = 3;
const NAME_REQUEST_MAX_LENGTH = 100;
const DISCORD_NICKNAME_MAX_LENGTH = 32;

const NSFW_BLOCKLIST = [
  "anjing", "kontol", "memek", "ngentot", "jilboob", "sange", "horny", "fuck", "bitch", "porn", "nsfw"
];

function normalizeName(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function buildNameRequestPanel(client, guildId) {
  const { nameRequests } = getEffectiveGuildSettings(guildId, client);

  return {
    embeds: [
      new EmbedBuilder()
        .setColor(nameRequests.accentColor)
        .setTitle("Request Name")
        .setDescription(
          [
            "Gunakan tombol di bawah untuk mengajukan nama atau nickname yang ingin kamu pakai.",
            "Request akan masuk ke tim staff untuk ditinjau terlebih dahulu.",
            "Member level 2 ke atas bisa ganti nama langsung lewat bot sesuai cooldown level."
          ].join("\n")
        )
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(NAME_REQUEST_BUTTON_ID)
          .setLabel("Request Name")
          .setStyle(ButtonStyle.Primary)
      )
    ]
  };
}

function buildNameRequestModal() {
  return new ModalBuilder()
    .setCustomId(NAME_REQUEST_MODAL_ID)
    .setTitle("Request Name")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(NAME_REQUEST_INPUT_ID)
          .setLabel("Nama yang diinginkan")
          .setRequired(true)
          .setMinLength(NAME_REQUEST_MIN_LENGTH)
          .setMaxLength(NAME_REQUEST_MAX_LENGTH)
          .setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(NAME_REQUEST_NOTE_ID)
          .setLabel("Catatan (opsional)")
          .setRequired(false)
          .setMaxLength(200)
          .setStyle(TextInputStyle.Paragraph)
      )
    );
}

function isNsfwName(input) {
  const normalized = normalizeName(input);
  return NSFW_BLOCKLIST.some((word) => normalized.includes(normalizeName(word)));
}

async function resemblesProtectedName(guild, name, protectedRoleIds) {
  if (!protectedRoleIds.length) {
    return false;
  }

  const normalizedRequested = normalizeName(name);
  const protectedMembers = await guild.members.fetch().catch(() => null);

  if (!protectedMembers) {
    return false;
  }

  for (const member of protectedMembers.values()) {
    if (!member.roles.cache.some((role) => protectedRoleIds.includes(role.id))) {
      continue;
    }

    const displayName = normalizeName(member.displayName);

    if (displayName && displayName === normalizedRequested) {
      return true;
    }
  }

  return false;
}

function buildReviewButtons(requestId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${NAME_REQUEST_APPROVE_PREFIX}${requestId}`)
      .setLabel("Approve")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`${NAME_REQUEST_REJECT_PREFIX}${requestId}`)
      .setLabel("Reject")
      .setStyle(ButtonStyle.Danger)
  );
}

function buildReviewEmbed(request) {
  return new EmbedBuilder()
    .setColor("#1f1f1f")
    .setTitle(`Name Request #${request.id}`)
    .setDescription(
      [
        `User: <@${request.userId}>`,
        `User ID: \`${request.userId}\``,
        `Requested Name: **${request.requestedName}**`,
        request.note ? `Note: ${request.note}` : "Note: `-`",
        `Status: **${request.status}**`
      ].join("\n")
    )
    .setTimestamp(new Date(request.createdAt));
}

function buildLogEmbed(request, action, moderatorId = null) {
  return new EmbedBuilder()
    .setColor("#2b2b2b")
    .setTitle(`Name Request ${action}`)
    .setDescription(
      [
        `Request ID: **${request.id}**`,
        `User: <@${request.userId}>`,
        `Requested Name: **${request.requestedName}**`,
        request.note ? `Note: ${request.note}` : "Note: `-`",
        moderatorId ? `Handled By: <@${moderatorId}>` : "Handled By: `-`",
        `Status: **${request.status}**`
      ].join("\n")
    )
    .setTimestamp();
}

async function sendNameRequestLog(guild, client, request, action, moderatorId = null) {
  const { nameRequests } = getEffectiveGuildSettings(guild.id, client);

  if (!nameRequests.logChannelId) {
    return;
  }

  const logChannel = await guild.channels.fetch(nameRequests.logChannelId).catch(() => null);

  if (!logChannel || logChannel.type !== ChannelType.GuildText) {
    return;
  }

  await logChannel.send({
    embeds: [buildLogEmbed(request, action, moderatorId)]
  });
}

async function submitNameRequest(interaction, client) {
  const { nameRequests } = getEffectiveGuildSettings(interaction.guildId, client);
  const renameAccess = getDirectRenameAccess(interaction.guildId, interaction.user.id);

  if (!renameAccess.renameEnabled && !nameRequests.reviewChannelId) {
    return {
      ok: false,
      reason: "Review channel untuk request name belum diatur."
    };
  }

  const pendingRequest = findPendingByUser(interaction.guildId, interaction.user.id);

  if (pendingRequest) {
    return {
      ok: false,
      reason: "Kamu masih punya request name yang sedang menunggu review."
    };
  }

  const requestedName = interaction.fields.getTextInputValue(NAME_REQUEST_INPUT_ID).trim().replace(/\s+/g, " ");
  const note = interaction.fields.getTextInputValue(NAME_REQUEST_NOTE_ID)?.trim() || "";

  if (requestedName.length < NAME_REQUEST_MIN_LENGTH || requestedName.length > NAME_REQUEST_MAX_LENGTH) {
    return {
      ok: false,
      reason: `Nama harus memiliki panjang antara ${NAME_REQUEST_MIN_LENGTH} sampai ${NAME_REQUEST_MAX_LENGTH} karakter.`
    };
  }

  if (requestedName.length > DISCORD_NICKNAME_MAX_LENGTH) {
    return {
      ok: false,
      reason: `Discord membatasi nickname server maksimal ${DISCORD_NICKNAME_MAX_LENGTH} karakter, jadi nama sepanjang itu tidak bisa dipasang penuh oleh bot.`
    };
  }

  if (isNsfwName(requestedName)) {
    return {
      ok: false,
      reason: "Nama yang kamu ajukan tidak bisa dipakai."
    };
  }

  if (await resemblesProtectedName(interaction.guild, requestedName, nameRequests.protectedRoleIds || [])) {
    return {
      ok: false,
      reason: "Nama yang kamu ajukan terlalu menyerupai admin atau staff."
    };
  }

  if (renameAccess.renameEnabled) {
    if (renameAccess.cooldownMs > 0) {
      return {
        ok: false,
        reason: `Fast rename untuk level kamu belum siap. Coba lagi dalam ${formatRelativeCooldown(renameAccess.cooldownMs)}.`
      };
    }

    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);

    if (!member) {
      return {
        ok: false,
        reason: "Member tidak ditemukan di server."
      };
    }

    const renamed = await member.setNickname(
      requestedName,
      `Direct rename via level benefit (${renameAccess.code})`
    ).then(() => true).catch(() => false);

    if (!renamed) {
      return {
        ok: false,
        reason: "Bot gagal mengganti nama kamu langsung. Pastikan role bot lebih tinggi dan permission Manage Nicknames aktif."
      };
    }

    const request = createNameRequest({
      guildId: interaction.guildId,
      userId: interaction.user.id,
      requestedName,
      note,
      status: "direct-approved",
      createdAt: new Date().toISOString(),
      reviewMessageId: "",
      handledBy: interaction.user.id,
      handledAt: new Date().toISOString()
    });

    markDirectRenameUsed(interaction.guildId, interaction.user.id);
    await sendNameRequestLog(interaction.guild, client, request, "Direct Approved", interaction.user.id);

    return {
      ok: true,
      id: request.id,
      direct: true
    };
  }

  const reviewChannel = await interaction.guild.channels.fetch(nameRequests.reviewChannelId).catch(() => null);

  if (!reviewChannel || reviewChannel.type !== ChannelType.GuildText) {
    return {
      ok: false,
      reason: "Review channel request name tidak valid."
    };
  }

  const request = createNameRequest({
    guildId: interaction.guildId,
    userId: interaction.user.id,
    requestedName,
    note,
    status: "pending",
    createdAt: new Date().toISOString(),
    reviewMessageId: "",
    handledBy: null
  });

  const reviewMessage = await reviewChannel.send({
    embeds: [buildReviewEmbed(request)],
    components: [buildReviewButtons(request.id)]
  });

  const updatedRequest = updateNameRequest(request.id, (current) => ({
    ...current,
    reviewMessageId: reviewMessage.id
  }));

  await sendNameRequestLog(interaction.guild, client, updatedRequest, "Submitted");

  return {
    ok: true,
    id: updatedRequest.id
  };
}

async function handleNameRequestDecision(interaction, client, action, requestId) {
  const { nameRequests } = getEffectiveGuildSettings(interaction.guildId, client);
  const request = getNameRequest(requestId);

  if (!request || request.guildId !== interaction.guildId) {
    return {
      ok: false,
      reason: "Request name tidak ditemukan."
    };
  }

  if (
    !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) &&
    !interaction.member.permissions.has(PermissionFlagsBits.ManageNicknames) &&
    !(nameRequests.protectedRoleIds || []).some((roleId) => interaction.member.roles.cache.has(roleId))
  ) {
    return {
      ok: false,
      reason: "Kamu tidak punya izin untuk menangani request name."
    };
  }

  if (request.status !== "pending") {
    return {
      ok: false,
      reason: "Request ini sudah ditangani sebelumnya."
    };
  }

  if (action === "approve") {
    const member = await interaction.guild.members.fetch(request.userId).catch(() => null);

    if (!member) {
      return {
        ok: false,
        reason: "Member untuk request ini tidak ditemukan."
      };
    }

    await member.setNickname(request.requestedName, `Approved name request #${request.id}`).catch(() => null);
  }

  const updated = updateNameRequest(request.id, (current) => ({
    ...current,
    status: action === "approve" ? "approved" : "rejected",
    handledBy: interaction.user.id,
    handledAt: new Date().toISOString()
  }));

  await interaction.message.edit({
    embeds: [buildReviewEmbed(updated)],
    components: []
  });

  await sendNameRequestLog(
    interaction.guild,
    client,
    updated,
    action === "approve" ? "Approved" : "Rejected",
    interaction.user.id
  );

  return {
    ok: true,
    request: updated
  };
}

module.exports = {
  NAME_REQUEST_APPROVE_PREFIX,
  NAME_REQUEST_BUTTON_ID,
  NAME_REQUEST_MODAL_ID,
  NAME_REQUEST_REJECT_PREFIX,
  buildNameRequestModal,
  buildNameRequestPanel,
  handleNameRequestDecision,
  submitNameRequest
};
