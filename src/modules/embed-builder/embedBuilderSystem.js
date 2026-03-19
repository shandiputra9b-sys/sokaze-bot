const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder
} = require("discord.js");

const MAX_FIELDS = 25;
const MAX_BUTTONS = 5;

function sanitizeString(value, maxLength = 2000) {
  return String(value || "").trim().slice(0, maxLength);
}

function isValidHttpUrl(value) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeField(field) {
  return {
    name: sanitizeString(field?.name, 256),
    value: sanitizeString(field?.value, 1024),
    inline: Boolean(field?.inline)
  };
}

function normalizeButton(button) {
  return {
    label: sanitizeString(button?.label, 80),
    url: sanitizeString(button?.url, 1000)
  };
}

function normalizeBuilderPayload(rawPayload = {}) {
  const fields = Array.isArray(rawPayload?.embed?.fields)
    ? rawPayload.embed.fields.map(normalizeField).filter((field) => field.name && field.value).slice(0, MAX_FIELDS)
    : [];
  const buttons = Array.isArray(rawPayload?.buttons)
    ? rawPayload.buttons.map(normalizeButton).filter((button) => button.label && isValidHttpUrl(button.url)).slice(0, MAX_BUTTONS)
    : [];

  return {
    channelId: sanitizeString(rawPayload.channelId, 32),
    messageContent: sanitizeString(rawPayload.messageContent, 2000),
    embed: {
      title: sanitizeString(rawPayload?.embed?.title, 256),
      description: sanitizeString(rawPayload?.embed?.description, 4000),
      color: sanitizeString(rawPayload?.embed?.color, 16) || "#111214",
      authorName: sanitizeString(rawPayload?.embed?.authorName, 256),
      authorIconUrl: sanitizeString(rawPayload?.embed?.authorIconUrl, 1000),
      authorUrl: sanitizeString(rawPayload?.embed?.authorUrl, 1000),
      thumbnailUrl: sanitizeString(rawPayload?.embed?.thumbnailUrl, 1000),
      imageUrl: sanitizeString(rawPayload?.embed?.imageUrl, 1000),
      footerText: sanitizeString(rawPayload?.embed?.footerText, 2048),
      footerIconUrl: sanitizeString(rawPayload?.embed?.footerIconUrl, 1000),
      timestamp: Boolean(rawPayload?.embed?.timestamp),
      fields
    },
    buttons
  };
}

function buildEmbedFromPayload(payload) {
  const embed = new EmbedBuilder();
  const color = payload.embed.color;

  if (/^#?[0-9a-f]{6}$/i.test(color)) {
    embed.setColor(color.startsWith("#") ? color : `#${color}`);
  }

  if (payload.embed.title) {
    embed.setTitle(payload.embed.title);
  }

  if (payload.embed.description) {
    embed.setDescription(payload.embed.description);
  }

  if (payload.embed.authorName) {
    const author = {
      name: payload.embed.authorName
    };

    if (isValidHttpUrl(payload.embed.authorIconUrl)) {
      author.iconURL = payload.embed.authorIconUrl;
    }

    if (isValidHttpUrl(payload.embed.authorUrl)) {
      author.url = payload.embed.authorUrl;
    }

    embed.setAuthor(author);
  }

  if (payload.embed.footerText) {
    const footer = {
      text: payload.embed.footerText
    };

    if (isValidHttpUrl(payload.embed.footerIconUrl)) {
      footer.iconURL = payload.embed.footerIconUrl;
    }

    embed.setFooter(footer);
  }

  if (isValidHttpUrl(payload.embed.thumbnailUrl)) {
    embed.setThumbnail(payload.embed.thumbnailUrl);
  }

  if (isValidHttpUrl(payload.embed.imageUrl)) {
    embed.setImage(payload.embed.imageUrl);
  }

  if (payload.embed.fields.length) {
    embed.addFields(payload.embed.fields);
  }

  if (payload.embed.timestamp) {
    embed.setTimestamp();
  }

  return embed;
}

function buildButtonRows(buttons) {
  if (!buttons.length) {
    return [];
  }

  return [
    new ActionRowBuilder().addComponents(
      ...buttons.map((button) => new ButtonBuilder()
        .setLabel(button.label)
        .setStyle(ButtonStyle.Link)
        .setURL(button.url))
    )
  ];
}

function buildDiscordPayload(rawPayload) {
  const payload = normalizeBuilderPayload(rawPayload);
  const embed = buildEmbedFromPayload(payload);
  const discordPayload = {};
  const hasEmbedContent = Boolean(
    payload.embed.title
    || payload.embed.description
    || payload.embed.authorName
    || payload.embed.footerText
    || payload.embed.thumbnailUrl
    || payload.embed.imageUrl
    || payload.embed.fields.length
    || payload.embed.timestamp
  );

  if (payload.messageContent) {
    discordPayload.content = payload.messageContent;
  }

  if (hasEmbedContent) {
    discordPayload.embeds = [embed];
  }

  if (payload.buttons.length) {
    discordPayload.components = buildButtonRows(payload.buttons);
  }

  if (!discordPayload.content && !discordPayload.embeds?.length) {
    throw new Error("Isi pesan kosong. Tambahkan content atau isi embed terlebih dulu.");
  }

  return {
    normalized: payload,
    discordPayload
  };
}

async function listAvailableTextChannels(client) {
  if (!client?.isReady?.()) {
    return [];
  }

  const fetchedGuilds = await client.guilds.fetch().catch(() => null);
  const guildIds = fetchedGuilds ? [...fetchedGuilds.keys()] : [...client.guilds.cache.keys()];
  const results = [];

  for (const guildId of guildIds) {
    const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);

    if (!guild) {
      continue;
    }

    const channels = await guild.channels.fetch().catch(() => null);

    if (!channels) {
      continue;
    }

    const textChannels = [...channels.values()]
      .filter((channel) => channel
        && !channel.isThread?.()
        && (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement)
        && channel.permissionsFor(guild.members.me)?.has(["ViewChannel", "SendMessages"]))
      .sort((left, right) => left.position - right.position);

    results.push({
      guildId: guild.id,
      guildName: guild.name,
      channels: textChannels.map((channel) => ({
        id: channel.id,
        name: channel.name,
        type: channel.type
      }))
    });
  }

  return results.filter((entry) => entry.channels.length);
}

async function sendBuilderMessage(client, rawPayload) {
  if (!client?.isReady?.()) {
    throw new Error("Bot belum siap. Coba lagi beberapa saat.");
  }

  const { normalized, discordPayload } = buildDiscordPayload(rawPayload);

  if (!normalized.channelId) {
    throw new Error("Channel tujuan belum dipilih.");
  }

  const channel = client.channels.cache.get(normalized.channelId)
    || await client.channels.fetch(normalized.channelId).catch(() => null);

  if (!channel?.isTextBased?.() || !channel.send) {
    throw new Error("Channel tujuan tidak valid atau bot tidak bisa mengirim ke sana.");
  }

  const sentMessage = await channel.send(discordPayload);

  return {
    ok: true,
    messageId: sentMessage.id,
    channelId: channel.id,
    guildId: channel.guild?.id || "",
    jumpUrl: sentMessage.url,
    normalized
  };
}

module.exports = {
  MAX_BUTTONS,
  MAX_FIELDS,
  buildDiscordPayload,
  listAvailableTextChannels,
  normalizeBuilderPayload,
  sendBuilderMessage
};
