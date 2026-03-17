const {
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder
} = require("discord.js");
const {
  ROLE_PANEL_OPTION_LIMIT,
  buildRolePanelDetailEmbed,
  buildRolePanelsEmbed,
  createReactionRolePanel,
  deleteReactionRolePanel,
  deleteRolePanelMessage,
  getGuildPanel,
  getGuildPanels,
  hasRolePanelPermission,
  isRoleManageable,
  isValidHttpUrl,
  parseRoleOptionEmoji,
  syncRolePanelMessage,
  updateReactionRolePanel
} = require("./reactionRoleSystem");

function buildSuccessEmbed(title, description) {
  return new EmbedBuilder()
    .setColor("#111827")
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

function buildErrorEmbed(description) {
  return new EmbedBuilder()
    .setColor("#ef4444")
    .setTitle("Role Panel Error")
    .setDescription(description)
    .setTimestamp();
}

async function replyError(interaction, description) {
  await interaction.reply({
    embeds: [buildErrorEmbed(description)],
    ephemeral: true
  });
}

function getPanelId(interaction) {
  return String(interaction.options.getInteger("panel_id"));
}

function getTextChannel(interaction) {
  const channel = interaction.options.getChannel("channel") || interaction.channel;

  if (!channel || channel.type !== ChannelType.GuildText) {
    return null;
  }

  return channel;
}

function ensurePanelPermission(interaction) {
  if (!hasRolePanelPermission(interaction.member)) {
    return "Kamu butuh permission Manage Roles atau Manage Server untuk command ini.";
  }

  return null;
}

async function handleCreate(interaction) {
  const channel = getTextChannel(interaction);

  if (!channel) {
    await replyError(interaction, "Channel target harus berupa text channel biasa.");
    return;
  }

  const imageUrl = interaction.options.getString("image_url")?.trim() || "";

  if (imageUrl && !isValidHttpUrl(imageUrl)) {
    await replyError(interaction, "Image URL tidak valid. Gunakan link `http` atau `https` langsung ke gambar/gif.");
    return;
  }

  const panel = createReactionRolePanel({
    guildId: interaction.guildId,
    channelId: channel.id,
    mode: interaction.options.getString("mode", true),
    title: interaction.options.getString("title", true).trim(),
    description: interaction.options.getString("description", true).trim(),
    placeholder: interaction.options.getString("placeholder", true).trim(),
    imageUrl,
    createdBy: interaction.user.id
  });

  await interaction.reply({
    embeds: [
      buildSuccessEmbed(
        "Role Panel Created",
        [
          `Panel #${panel.id} berhasil dibuat sebagai draft.`,
          `Channel: ${channel}`,
          `Mode: \`${panel.mode}\``,
          panel.imageUrl ? "Banner: `on`" : "Banner: `off`",
          "Langkah berikutnya: tambahkan opsi role lalu kirim panel."
        ].join("\n")
      )
    ],
    ephemeral: true
  });
}

async function handleEdit(interaction, client) {
  const panelId = getPanelId(interaction);
  const panel = getGuildPanel(interaction.guildId, panelId);

  if (!panel) {
    await replyError(interaction, "Panel tidak ditemukan di server ini.");
    return;
  }

  const updated = updateReactionRolePanel(interaction.guildId, panelId, (current) => ({
    ...current,
    title: interaction.options.getString("title", true).trim(),
    description: interaction.options.getString("description", true).trim(),
    placeholder: interaction.options.getString("placeholder", true).trim()
  }));

  if (updated.messageId) {
    const syncResult = await syncRolePanelMessage(client, updated);

    if (!syncResult.ok) {
      await replyError(interaction, syncResult.reason);
      return;
    }
  }

  await interaction.reply({
    embeds: [buildSuccessEmbed("Role Panel Updated", `Panel #${panelId} berhasil diperbarui.`)],
    ephemeral: true
  });
}

async function handleAddOption(interaction, client) {
  const panelId = getPanelId(interaction);
  const panel = getGuildPanel(interaction.guildId, panelId);

  if (!panel) {
    await replyError(interaction, "Panel tidak ditemukan di server ini.");
    return;
  }

  const role = interaction.options.getRole("role", true);

  if (!isRoleManageable(role, interaction.guild)) {
    await replyError(interaction, "Role itu tidak bisa dikelola bot. Pastikan posisinya di bawah role bot.");
    return;
  }

  if (panel.options.some((option) => option.roleId === role.id)) {
    await replyError(interaction, "Role itu sudah ada di panel ini.");
    return;
  }

  if (panel.options.length >= ROLE_PANEL_OPTION_LIMIT) {
    await replyError(interaction, `Satu panel maksimal punya ${ROLE_PANEL_OPTION_LIMIT} opsi role.`);
    return;
  }

  const emojiInput = interaction.options.getString("emoji")?.trim() || "";
  const emojiData = emojiInput ? parseRoleOptionEmoji(emojiInput) : null;

  if (emojiInput && !emojiData) {
    await replyError(interaction, "Emoji tidak valid. Gunakan emoji Unicode atau custom emoji server.");
    return;
  }

  const updated = updateReactionRolePanel(interaction.guildId, panelId, (current) => ({
    ...current,
    options: [
      ...current.options,
      {
        roleId: role.id,
        label: interaction.options.getString("label", true).trim(),
        description: interaction.options.getString("option_description")?.trim() || "",
        emoji: emojiInput,
        emojiData
      }
    ]
  }));

  if (updated.messageId) {
    const syncResult = await syncRolePanelMessage(client, updated);

    if (!syncResult.ok) {
      await replyError(interaction, syncResult.reason);
      return;
    }
  }

  await interaction.reply({
    embeds: [
      buildSuccessEmbed("Role Option Added", `Role ${role} berhasil ditambahkan ke panel #${panelId}.`)
    ],
    ephemeral: true
  });
}

async function handleRemoveOption(interaction, client) {
  const panelId = getPanelId(interaction);
  const panel = getGuildPanel(interaction.guildId, panelId);

  if (!panel) {
    await replyError(interaction, "Panel tidak ditemukan di server ini.");
    return;
  }

  const role = interaction.options.getRole("role", true);

  if (!panel.options.some((option) => option.roleId === role.id)) {
    await replyError(interaction, "Role itu tidak ada di panel ini.");
    return;
  }

  const updated = updateReactionRolePanel(interaction.guildId, panelId, (current) => ({
    ...current,
    options: current.options.filter((option) => option.roleId !== role.id)
  }));

  if (updated.messageId && !updated.options.length) {
    await deleteRolePanelMessage(client, updated);
    updateReactionRolePanel(interaction.guildId, panelId, (current) => ({
      ...current,
      messageId: ""
    }));
  }

  if (updated.messageId && updated.options.length) {
    const syncResult = await syncRolePanelMessage(client, updated);

    if (!syncResult.ok) {
      await replyError(interaction, syncResult.reason);
      return;
    }
  }

  await interaction.reply({
    embeds: [
      buildSuccessEmbed("Role Option Removed", `Role ${role} berhasil dihapus dari panel #${panelId}.`)
    ],
    ephemeral: true
  });
}

async function handleSetMode(interaction, client) {
  const panelId = getPanelId(interaction);
  const panel = getGuildPanel(interaction.guildId, panelId);

  if (!panel) {
    await replyError(interaction, "Panel tidak ditemukan di server ini.");
    return;
  }

  const updated = updateReactionRolePanel(interaction.guildId, panelId, (current) => ({
    ...current,
    mode: interaction.options.getString("mode", true)
  }));

  if (updated.messageId) {
    const syncResult = await syncRolePanelMessage(client, updated);

    if (!syncResult.ok) {
      await replyError(interaction, syncResult.reason);
      return;
    }
  }

  await interaction.reply({
    embeds: [
      buildSuccessEmbed("Role Panel Mode Updated", `Mode panel #${panelId} diubah ke \`${updated.mode}\`.`)
    ],
    ephemeral: true
  });
}

async function handleSend(interaction, client) {
  const panelId = getPanelId(interaction);
  const panel = getGuildPanel(interaction.guildId, panelId);

  if (!panel) {
    await replyError(interaction, "Panel tidak ditemukan di server ini.");
    return;
  }

  const result = await syncRolePanelMessage(client, panel);

  if (!result.ok) {
    await replyError(interaction, result.reason);
    return;
  }

  await interaction.reply({
    embeds: [
      buildSuccessEmbed("Role Panel Sent", `Panel #${panelId} berhasil dikirim ke <#${result.panel.channelId}>.`)
    ],
    ephemeral: true
  });
}

async function handleList(interaction) {
  const panelId = interaction.options.getInteger("panel_id");

  if (panelId) {
    const panel = getGuildPanel(interaction.guildId, String(panelId));

    if (!panel) {
      await replyError(interaction, "Panel tidak ditemukan di server ini.");
      return;
    }

    await interaction.reply({
      embeds: [buildRolePanelDetailEmbed(interaction.guild, panel)],
      ephemeral: true
    });
    return;
  }

  await interaction.reply({
    embeds: [buildRolePanelsEmbed(interaction.guild, getGuildPanels(interaction.guildId))],
    ephemeral: true
  });
}

async function handleDelete(interaction, client) {
  const panelId = getPanelId(interaction);
  const panel = getGuildPanel(interaction.guildId, panelId);

  if (!panel) {
    await replyError(interaction, "Panel tidak ditemukan di server ini.");
    return;
  }

  await deleteRolePanelMessage(client, panel);
  deleteReactionRolePanel(interaction.guildId, panelId);

  await interaction.reply({
    embeds: [buildSuccessEmbed("Role Panel Deleted", `Panel #${panelId} berhasil dihapus.`)],
    ephemeral: true
  });
}

async function handleSetImage(interaction, client) {
  const panelId = getPanelId(interaction);
  const panel = getGuildPanel(interaction.guildId, panelId);

  if (!panel) {
    await replyError(interaction, "Panel tidak ditemukan di server ini.");
    return;
  }

  const imageInput = interaction.options.getString("image_url", true).trim();
  const nextImageUrl = ["off", "clear"].includes(imageInput.toLowerCase()) ? "" : imageInput;

  if (nextImageUrl && !isValidHttpUrl(nextImageUrl)) {
    await replyError(interaction, "Image URL tidak valid. Gunakan link `http` atau `https` langsung ke gambar/gif.");
    return;
  }

  const updated = updateReactionRolePanel(interaction.guildId, panelId, (current) => ({
    ...current,
    imageUrl: nextImageUrl
  }));

  if (updated.messageId && updated.options.length) {
    const syncResult = await syncRolePanelMessage(client, updated);

    if (!syncResult.ok) {
      await replyError(interaction, syncResult.reason);
      return;
    }
  }

  await interaction.reply({
    embeds: [
      buildSuccessEmbed(
        "Role Panel Image Updated",
        nextImageUrl
          ? `Header image untuk panel #${panelId} berhasil diatur.\n${nextImageUrl}`
          : `Header image untuk panel #${panelId} berhasil dihapus.`
      )
    ],
    ephemeral: true
  });
}

async function handleSetEmoji(interaction, client) {
  const panelId = getPanelId(interaction);
  const panel = getGuildPanel(interaction.guildId, panelId);

  if (!panel) {
    await replyError(interaction, "Panel tidak ditemukan di server ini.");
    return;
  }

  const role = interaction.options.getRole("role", true);

  if (!panel.options.some((option) => option.roleId === role.id)) {
    await replyError(interaction, "Role itu tidak ada di panel ini.");
    return;
  }

  const emojiInput = interaction.options.getString("emoji", true).trim();
  const clearEmoji = ["off", "clear"].includes(emojiInput.toLowerCase());
  const emojiData = clearEmoji ? null : parseRoleOptionEmoji(emojiInput);

  if (!clearEmoji && !emojiData) {
    await replyError(interaction, "Emoji tidak valid. Gunakan emoji Unicode atau custom emoji server.");
    return;
  }

  const updated = updateReactionRolePanel(interaction.guildId, panelId, (current) => ({
    ...current,
    options: current.options.map((option) => {
      if (option.roleId !== role.id) {
        return option;
      }

      return {
        ...option,
        emoji: clearEmoji ? "" : emojiInput,
        emojiData
      };
    })
  }));

  if (updated.messageId && updated.options.length) {
    const syncResult = await syncRolePanelMessage(client, updated);

    if (!syncResult.ok) {
      await replyError(interaction, syncResult.reason);
      return;
    }
  }

  await interaction.reply({
    embeds: [
      buildSuccessEmbed(
        "Role Option Emoji Updated",
        clearEmoji
          ? `Emoji opsi role di panel #${panelId} berhasil dihapus.`
          : `Emoji opsi role di panel #${panelId} berhasil diatur ke ${emojiInput}.`
      )
    ],
    ephemeral: true
  });
}

const slashData = new SlashCommandBuilder()
  .setName("rolepanel")
  .setDescription("Kelola dropdown reaction role panel")
  .setDMPermission(false)
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("create")
      .setDescription("Buat draft role panel baru")
      .addStringOption((option) =>
        option
          .setName("mode")
          .setDescription("Mode role panel")
          .addChoices(
            { name: "single", value: "single" },
            { name: "multi", value: "multi" }
          )
          .setRequired(true)
      )
      .addStringOption((option) =>
        option.setName("title").setDescription("Judul panel").setMaxLength(256).setRequired(true)
      )
      .addStringOption((option) =>
        option.setName("description").setDescription("Deskripsi panel").setMaxLength(1500).setRequired(true)
      )
      .addStringOption((option) =>
        option.setName("placeholder").setDescription("Placeholder dropdown").setMaxLength(100).setRequired(true)
      )
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription("Channel target panel")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false)
      )
      .addStringOption((option) =>
        option.setName("image_url").setDescription("Header image/banner panel").setMaxLength(1000).setRequired(false)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("edit")
      .setDescription("Edit title, description, dan placeholder panel")
      .addIntegerOption((option) =>
        option.setName("panel_id").setDescription("ID panel").setRequired(true)
      )
      .addStringOption((option) =>
        option.setName("title").setDescription("Judul panel").setMaxLength(256).setRequired(true)
      )
      .addStringOption((option) =>
        option.setName("description").setDescription("Deskripsi panel").setMaxLength(1500).setRequired(true)
      )
      .addStringOption((option) =>
        option.setName("placeholder").setDescription("Placeholder dropdown").setMaxLength(100).setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("add-option")
      .setDescription("Tambah opsi role ke panel")
      .addIntegerOption((option) =>
        option.setName("panel_id").setDescription("ID panel").setRequired(true)
      )
      .addRoleOption((option) =>
        option.setName("role").setDescription("Role target").setRequired(true)
      )
      .addStringOption((option) =>
        option.setName("label").setDescription("Label opsi dropdown").setMaxLength(100).setRequired(true)
      )
      .addStringOption((option) =>
        option.setName("option_description").setDescription("Deskripsi opsi").setMaxLength(100).setRequired(false)
      )
      .addStringOption((option) =>
        option.setName("emoji").setDescription("Emoji Unicode atau custom emoji").setMaxLength(100).setRequired(false)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("remove-option")
      .setDescription("Hapus opsi role dari panel")
      .addIntegerOption((option) =>
        option.setName("panel_id").setDescription("ID panel").setRequired(true)
      )
      .addRoleOption((option) =>
        option.setName("role").setDescription("Role target").setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("set-mode")
      .setDescription("Ubah mode panel menjadi single atau multi")
      .addIntegerOption((option) =>
        option.setName("panel_id").setDescription("ID panel").setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("mode")
          .setDescription("Mode role panel")
          .addChoices(
            { name: "single", value: "single" },
            { name: "multi", value: "multi" }
          )
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("send")
      .setDescription("Kirim atau refresh message panel")
      .addIntegerOption((option) =>
        option.setName("panel_id").setDescription("ID panel").setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("list")
      .setDescription("Lihat daftar panel atau detail satu panel")
      .addIntegerOption((option) =>
        option.setName("panel_id").setDescription("ID panel").setRequired(false)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("delete")
      .setDescription("Hapus panel role")
      .addIntegerOption((option) =>
        option.setName("panel_id").setDescription("ID panel").setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("set-image")
      .setDescription("Atur atau hapus banner panel")
      .addIntegerOption((option) =>
        option.setName("panel_id").setDescription("ID panel").setRequired(true)
      )
      .addStringOption((option) =>
        option.setName("image_url").setDescription("URL gambar atau ketik off").setMaxLength(1000).setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("set-emoji")
      .setDescription("Atur atau hapus emoji untuk satu opsi role")
      .addIntegerOption((option) =>
        option.setName("panel_id").setDescription("ID panel").setRequired(true)
      )
      .addRoleOption((option) =>
        option.setName("role").setDescription("Role target").setRequired(true)
      )
      .addStringOption((option) =>
        option.setName("emoji").setDescription("Emoji baru atau ketik off").setMaxLength(100).setRequired(true)
      )
  );

module.exports = {
  slashData,
  async executeSlash(interaction, client) {
    if (!interaction.inGuild()) {
      await replyError(interaction, "Command ini hanya bisa dipakai di server.");
      return;
    }

    const permissionError = ensurePanelPermission(interaction);

    if (permissionError) {
      await replyError(interaction, permissionError);
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "create") {
      await handleCreate(interaction);
      return;
    }

    if (subcommand === "edit") {
      await handleEdit(interaction, client);
      return;
    }

    if (subcommand === "add-option") {
      await handleAddOption(interaction, client);
      return;
    }

    if (subcommand === "remove-option") {
      await handleRemoveOption(interaction, client);
      return;
    }

    if (subcommand === "set-mode") {
      await handleSetMode(interaction, client);
      return;
    }

    if (subcommand === "send") {
      await handleSend(interaction, client);
      return;
    }

    if (subcommand === "list") {
      await handleList(interaction);
      return;
    }

    if (subcommand === "delete") {
      await handleDelete(interaction, client);
      return;
    }

    if (subcommand === "set-image") {
      await handleSetImage(interaction, client);
      return;
    }

    if (subcommand === "set-emoji") {
      await handleSetEmoji(interaction, client);
    }
  }
};
