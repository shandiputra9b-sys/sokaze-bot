const {
  ActionRowBuilder,
  ChannelType,
  EmbedBuilder,
  parseEmoji,
  PermissionFlagsBits,
  StringSelectMenuBuilder
} = require("discord.js");
const {
  createPanel,
  deletePanel,
  getPanel,
  listPanels,
  updatePanel
} = require("../../services/reactionRoleStore");

const ROLE_PANEL_SELECT_PREFIX = "rolepanel:select:";
const ROLE_PANEL_OPTION_LIMIT = 25;
const GAME_ROLE_PANEL_PRESET_KEY = "game-self-role";
const GAME_ROLE_PANEL_OPTIONS = [
  { emoji: "<:Bloodstrike:1484573138410012732>", label: "Blood Strike", roleId: "1484571536622092319", description: "Ambil role ini kalau kamu main Blood Strike." },
  { emoji: "<:Roblox:1484573236829229197>", label: "Roblox", roleId: "1483828827640561735", description: "Ambil role ini kalau kamu main Roblox." },
  { emoji: "<:GTA5:1484572255295115355>", label: "GTA V", roleId: "1483830806450409674", description: "Ambil role ini kalau kamu main GTA V." },
  { emoji: "<:WIldRift:1484572328317816894>", label: "League Of Legend", roleId: "1483829133220905001", description: "Ambil role ini kalau kamu main League Of Legend." },
  { emoji: "<:AmongUs:1484573104402464769>", label: "Among Us", roleId: "1483829507843559554", description: "Ambil role ini kalau kamu main Among Us." },
  { emoji: "<:FreeFire:1484572125615624295>", label: "Free Fire", roleId: "1483828185064804464", description: "Ambil role ini kalau kamu main Free Fire." },
  { emoji: "<:mobilelegend:1484571623808962771>", label: "Mobile Legend", roleId: "1483828579111403530", description: "Ambil role ini kalau kamu main Mobile Legend." },
  { emoji: "<:PUBG:1484575124156973156>", label: "PUBG", roleId: "1483831229483843726", description: "Ambil role ini kalau kamu main PUBG." },
  { emoji: "<:DotA2:1484575182294094003>", label: "Dota 2", roleId: "1483829808269103224", description: "Ambil role ini kalau kamu main Dota 2." },
  { emoji: "<:eFootball:1484575057240920284>", label: "Efootball", roleId: "1483830228114739334", description: "Ambil role ini kalau kamu main Efootball." },
  { emoji: "<:minecraft:1484571584441094194>", label: "Minecraft", roleId: "1483828964068823100", description: "Ambil role ini kalau kamu main Minecraft." },
  { emoji: "<:genshin:1484575982701514903>", label: "Genshin Impact", roleId: "1483829009195470878", description: "Ambil role ini kalau kamu main Genshin Impact." },
  { emoji: "<:Growtopia:1484576028004188350>", label: "Growtopia", roleId: "1483830864151314513", description: "Ambil role ini kalau kamu main Growtopia." },
  { emoji: "<:valorant:1484571699205771314>", label: "Valorant", roleId: "1483828670266212422", description: "Ambil role ini kalau kamu main Valorant." },
  { emoji: "<:HonorofKings:1484576518981292233>", label: "Honor Of Kings", roleId: "1483831109752979536", description: "Ambil role ini kalau kamu main Honor Of Kings." },
  { emoji: "<:CODM:1484576573259649165>", label: "Call Of Duty Mobile", roleId: "1484571400009154642", description: "Ambil role ini kalau kamu main Call Of Duty Mobile." },
  { emoji: "<:WhereWindsMeet:1484576747100831744>", label: "Wheres The Wind Meet", roleId: "1483830903099883571", description: "Ambil role ini kalau kamu main Wheres The Wind Meet." }
];

function hasRolePanelPermission(member) {
  return member.permissions.has(PermissionFlagsBits.ManageGuild)
    || member.permissions.has(PermissionFlagsBits.ManageRoles)
    || member.permissions.has(PermissionFlagsBits.Administrator);
}

function extractRoleId(value) {
  return value ? value.replace(/[<@&>]/g, "") : "";
}

function normalizeText(value) {
  return value?.trim().replace(/\s+/g, " ") || "";
}

function isValidHttpUrl(value) {
  if (!value) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (error) {
    return false;
  }
}

function parseRoleOptionEmoji(value) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return null;
  }

  const parsed = parseEmoji(normalized);

  if (!parsed?.name) {
    return null;
  }

  if (parsed.id) {
    return {
      id: parsed.id,
      name: parsed.name,
      animated: parsed.animated || false
    };
  }

  return {
    name: parsed.name
  };
}

function splitPipeSegments(value) {
  return value
    .split("|")
    .map((segment) => normalizeText(segment))
    .filter(Boolean);
}

function isRoleManageable(role, guild) {
  const botMember = guild.members.me;

  if (!role || !botMember) {
    return false;
  }

  return !role.managed && role.editable && botMember.roles.highest.comparePositionTo(role) > 0;
}

function createReactionRolePanel({
  guildId,
  channelId,
  mode,
  behavior = "sync",
  title,
  description,
  placeholder,
  imageUrl = "",
  presetKey = "",
  presetTag = "",
  createdBy
}) {
  return createPanel({
    guildId,
    channelId,
    mode,
    behavior,
    title,
    description,
    placeholder,
    imageUrl,
    presetKey,
    presetTag,
    createdBy,
    messageId: "",
    options: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

function getGuildPanels(guildId) {
  return listPanels((panel) => panel.guildId === guildId);
}

function getGuildPanel(guildId, panelId) {
  const panel = getPanel(panelId);

  if (!panel || panel.guildId !== guildId) {
    return null;
  }

  return panel;
}

function updateReactionRolePanel(guildId, panelId, updater) {
  const current = getGuildPanel(guildId, panelId);

  if (!current) {
    return null;
  }

  return updatePanel(panelId, (panel) => ({
    ...updater(panel),
    updatedAt: new Date().toISOString()
  }));
}

function deleteReactionRolePanel(guildId, panelId) {
  const panel = getGuildPanel(guildId, panelId);

  if (!panel) {
    return null;
  }

  return deletePanel(panelId);
}

function buildRoleSummary(panel, guild) {
  if (!panel.options.length) {
    return "Belum ada role yang ditambahkan ke panel ini.";
  }

  const summary = panel.options.map((option) => {
    const role = guild.roles.cache.get(option.roleId);
    const roleLabel = role ? `<@&${role.id}>` : `\`${option.roleId}\``;
    const description = option.description ? ` - ${option.description}` : "";
    const emoji = option.emoji ? `${option.emoji} ` : "";

    return `- ${emoji}${option.label}: ${roleLabel}${description}`;
  }).join("\n");

  if (summary.length <= 3000) {
    return summary;
  }

  return `${summary.slice(0, 2997).trimEnd()}...`;
}

function buildRolePanelMessage(panel, guild) {
  const embed = new EmbedBuilder()
    .setColor("#111827")
    .setTitle(panel.title)
    .setDescription(
      [
        panel.description,
        "",
        buildRoleSummary(panel, guild)
      ].join("\n").trim()
    )
    .setFooter({
      text: panel.behavior === "toggle"
        ? "Mode toggle | Pilih role untuk ambil, pilih lagi untuk melepas."
        : panel.mode === "single"
          ? "Mode: single select"
          : "Mode: multi select | Pilih semua role yang ingin kamu simpan."
    })
    .setTimestamp();

  if (panel.imageUrl) {
    embed.setImage(panel.imageUrl);
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`${ROLE_PANEL_SELECT_PREFIX}${panel.id}`)
    .setPlaceholder(panel.placeholder)
    .setMinValues(0)
    .setMaxValues(panel.mode === "single" ? 1 : Math.min(panel.options.length, ROLE_PANEL_OPTION_LIMIT))
    .addOptions(
      panel.options.map((option) => ({
        label: option.label,
        description: option.description || undefined,
        value: option.roleId,
        emoji: option.emojiData || parseRoleOptionEmoji(option.emoji) || undefined
      }))
    );

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(menu)
    ]
  };
}

async function syncRolePanelMessage(client, panel) {
  const guild = client.guilds.cache.get(panel.guildId) || await client.guilds.fetch(panel.guildId).catch(() => null);

  if (!guild) {
    return {
      ok: false,
      reason: "Guild untuk panel ini tidak ditemukan."
    };
  }

  if (!panel.options.length) {
    return {
      ok: false,
      reason: "Panel belum punya opsi role. Tambahkan role dulu sebelum deploy."
    };
  }

  const channel = guild.channels.cache.get(panel.channelId) || await guild.channels.fetch(panel.channelId).catch(() => null);

  if (!channel || channel.type !== ChannelType.GuildText) {
    return {
      ok: false,
      reason: "Channel panel tidak valid."
    };
  }

  const payload = buildRolePanelMessage(panel, guild);

  if (panel.messageId) {
    const existingMessage = await channel.messages.fetch(panel.messageId).catch(() => null);

    if (existingMessage) {
      await existingMessage.edit(payload);
      return {
        ok: true,
        panel
      };
    }
  }

  const sentMessage = await channel.send(payload);
  const updated = updatePanel(panel.id, (current) => ({
    ...current,
    messageId: sentMessage.id,
    updatedAt: new Date().toISOString()
  }));

  return {
    ok: true,
    panel: updated
  };
}

async function deleteRolePanelMessage(client, panel) {
  if (!panel.messageId) {
    return;
  }

  const guild = client.guilds.cache.get(panel.guildId) || await client.guilds.fetch(panel.guildId).catch(() => null);
  const channel = guild
    ? guild.channels.cache.get(panel.channelId) || await guild.channels.fetch(panel.channelId).catch(() => null)
    : null;

  if (!channel || channel.type !== ChannelType.GuildText) {
    return;
  }

  await channel.messages.delete(panel.messageId).catch(() => null);
}

function buildRolePanelsEmbed(guild, panels) {
  const description = panels.length
    ? panels.map((panel) => {
      const state = panel.messageId ? "deployed" : "draft";
      return [
        `**#${panel.id}** ${panel.title}`,
        `Mode: \`${panel.mode}\` | Behavior: \`${panel.behavior || "sync"}\` | Opsi: **${panel.options.length}** | Status: \`${state}\` | Banner: ${panel.imageUrl ? "`on`" : "`off`"}`,
        `Channel: <#${panel.channelId}>`
      ].join("\n");
    }).join("\n\n")
    : "Belum ada role panel di server ini.";

  return new EmbedBuilder()
    .setColor("#111827")
    .setTitle("Dropdown Role Panels")
    .setDescription(description)
    .setFooter({
      text: `${guild.name} role panel registry`
    })
    .setTimestamp();
}

function buildRolePanelDetailEmbed(guild, panel) {
  const embed = new EmbedBuilder()
    .setColor("#111827")
    .setTitle(`Role Panel #${panel.id}`)
    .setDescription(panel.description)
    .addFields(
      {
        name: "Title",
        value: panel.title,
        inline: false
      },
      {
        name: "Mode",
        value: `${panel.mode} / ${panel.behavior || "sync"}`,
        inline: true
      },
      {
        name: "Channel",
        value: `<#${panel.channelId}>`,
        inline: true
      },
      {
        name: "Placeholder",
        value: panel.placeholder,
        inline: false
      },
      {
        name: "Header Image",
        value: panel.imageUrl || "`none`",
        inline: false
      },
      {
        name: "Options",
        value: buildRoleSummary(panel, guild),
        inline: false
      }
    )
    .setTimestamp();

  if (panel.imageUrl) {
    embed.setImage(panel.imageUrl);
  }

  return embed;
}

function buildRoleAssignmentSummary(addedRoles, removedRoles) {
  const lines = [];

  if (addedRoles.length) {
    lines.push(`Ditambahkan: ${addedRoles.map((role) => `<@&${role.id}>`).join(", ")}`);
  }

  if (removedRoles.length) {
    lines.push(`Dilepas: ${removedRoles.map((role) => `<@&${role.id}>`).join(", ")}`);
  }

  if (!lines.length) {
    lines.push("Tidak ada perubahan role.");
  }

  return lines.join("\n");
}

async function handleRolePanelSelect(interaction) {
  if (!interaction.customId.startsWith(ROLE_PANEL_SELECT_PREFIX)) {
    return false;
  }

  const panelId = interaction.customId.slice(ROLE_PANEL_SELECT_PREFIX.length);
  const panel = getGuildPanel(interaction.guildId, panelId);

  if (!panel) {
    await interaction.reply({
      content: "Panel role ini tidak ditemukan lagi.",
      ephemeral: true
    });
    return true;
  }

  const configuredRoleIds = panel.options.map((option) => option.roleId);
  const selectedRoleIds = interaction.values.filter((value) => configuredRoleIds.includes(value));
  const missingRoleIds = configuredRoleIds.filter((roleId) => !interaction.guild.roles.cache.has(roleId));
  const involvedRoles = configuredRoleIds
    .map((roleId) => interaction.guild.roles.cache.get(roleId))
    .filter(Boolean);

  if (missingRoleIds.length) {
    await interaction.reply({
      content: [
        "Beberapa role di panel ini sudah tidak ada lagi.",
        `Role ID bermasalah: ${missingRoleIds.map((roleId) => `\`${roleId}\``).join(", ")}`
      ].join("\n"),
      ephemeral: true
    });
    return true;
  }

  const unmanageableRoles = involvedRoles.filter((role) => !isRoleManageable(role, interaction.guild));

  if (unmanageableRoles.length) {
    await interaction.reply({
      content: [
        "Beberapa role di panel ini tidak bisa dikelola bot saat ini:",
        unmanageableRoles.map((role) => role.name).join(", ")
      ].join("\n"),
      ephemeral: true
    });
    return true;
  }

  const toggleMode = panel.behavior === "toggle";
  const rolesToRemove = toggleMode
    ? involvedRoles.filter((role) => selectedRoleIds.includes(role.id) && interaction.member.roles.cache.has(role.id))
    : involvedRoles.filter((role) =>
      interaction.member.roles.cache.has(role.id) && !selectedRoleIds.includes(role.id)
    );
  const rolesToAdd = toggleMode
    ? involvedRoles.filter((role) => selectedRoleIds.includes(role.id) && !interaction.member.roles.cache.has(role.id))
    : involvedRoles.filter((role) =>
      selectedRoleIds.includes(role.id) && !interaction.member.roles.cache.has(role.id)
    );
  const removedRoles = [];
  const addedRoles = [];

  for (const role of rolesToRemove) {
    const removed = await interaction.member.roles.remove(role).catch(() => null);

    if (removed) {
      removedRoles.push(role);
    }
  }

  for (const role of rolesToAdd) {
    const added = await interaction.member.roles.add(role).catch(() => null);

    if (added) {
      addedRoles.push(role);
    }
  }

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor("#111827")
        .setTitle("Role Panel Updated")
        .setDescription(buildRoleAssignmentSummary(addedRoles, removedRoles))
        .setFooter({
          text: panel.behavior === "toggle"
            ? "Mode toggle: pilih role untuk ambil, pilih lagi role yang sama untuk melepas."
            : panel.mode === "multi"
            ? "Mode multi-select: pilih semua role yang ingin kamu simpan di panel ini."
            : "Mode single-select: hanya satu role dari panel ini yang bisa aktif."
        })
        .setTimestamp()
    ],
    ephemeral: true
  });

  return true;
}

async function upsertGameRolePanel(guild, channelId) {
  const existing = getGuildPanels(guild.id).find((panel) => panel.presetKey === GAME_ROLE_PANEL_PRESET_KEY) || null;
  const missingRoles = [];
  const unmanageableRoles = [];
  const options = [];

  for (const entry of GAME_ROLE_PANEL_OPTIONS) {
    const role = guild.roles.cache.get(entry.roleId) || await guild.roles.fetch(entry.roleId).catch(() => null);

    if (!role) {
      missingRoles.push(entry.label);
      continue;
    }

    if (!isRoleManageable(role, guild)) {
      unmanageableRoles.push(role.name);
      continue;
    }

    options.push({
      roleId: role.id,
      label: entry.label,
      description: entry.description,
      emoji: entry.emoji,
      emojiData: parseRoleOptionEmoji(entry.emoji)
    });
  }

  if (missingRoles.length) {
    return {
      ok: false,
      reason: `Role game ini tidak ditemukan: ${missingRoles.join(", ")}`
    };
  }

  if (unmanageableRoles.length) {
    return {
      ok: false,
      reason: `Role game ini belum bisa dikelola bot: ${unmanageableRoles.join(", ")}`
    };
  }

  const payload = {
    guildId: guild.id,
    channelId,
    mode: "multi",
    behavior: "toggle",
    title: "Game Self Role",
    description: [
      "Pilih role game yang kamu mainkan dari dropdown di bawah.",
      "Kalau mau lepas role, cukup pilih role yang sama lagi."
    ].join("\n"),
    placeholder: "Pilih game kamu di sini",
    presetKey: GAME_ROLE_PANEL_PRESET_KEY,
    presetTag: "game-self-role",
    options
  };

  if (!existing) {
    const created = createReactionRolePanel({
      ...payload,
      createdBy: guild.client.user?.id || "system"
    });

    return {
      ok: true,
      panel: updatePanel(created.id, (current) => ({
        ...current,
        options
      }))
    };
  }

  const updated = updateReactionRolePanel(guild.id, existing.id, (current) => ({
    ...current,
    ...payload,
    messageId: current.messageId || ""
  }));

  return {
    ok: true,
    panel: updated
  };
}

module.exports = {
  GAME_ROLE_PANEL_PRESET_KEY,
  ROLE_PANEL_OPTION_LIMIT,
  buildRolePanelDetailEmbed,
  buildRolePanelsEmbed,
  createReactionRolePanel,
  deleteReactionRolePanel,
  deleteRolePanelMessage,
  extractRoleId,
  getGuildPanel,
  getGuildPanels,
  handleRolePanelSelect,
  hasRolePanelPermission,
  isRoleManageable,
  isValidHttpUrl,
  normalizeText,
  parseRoleOptionEmoji,
  splitPipeSegments,
  syncRolePanelMessage,
  upsertGameRolePanel,
  updateReactionRolePanel
};
