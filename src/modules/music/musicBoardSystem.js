const { EmbedBuilder } = require("discord.js");
const { getGuildSettings, updateGuildSettings } = require("../../services/guildConfigService");
const { MUSIC_BOTS } = require("./musicBotCatalog");

const DEFAULT_MUSIC_BOARD_SETTINGS = {
  channelId: "",
  messageId: "",
  temporaryResponseSeconds: 90
};

const musicBoardRefreshes = new Map();

function getMusicBoardSettings(guildId) {
  const settings = getGuildSettings(guildId, {
    musicBoard: DEFAULT_MUSIC_BOARD_SETTINGS
  }).musicBoard;

  return {
    ...DEFAULT_MUSIC_BOARD_SETTINGS,
    ...settings
  };
}

function setMusicBoardChannel(guildId, channelId) {
  return updateGuildSettings(guildId, (current) => ({
    ...current,
    musicBoard: {
      ...DEFAULT_MUSIC_BOARD_SETTINGS,
      ...(current.musicBoard || {}),
      channelId,
      messageId: ""
    }
  }));
}

function updateMusicBoardState(guildId, patch) {
  return updateGuildSettings(guildId, (current) => ({
    ...current,
    musicBoard: {
      ...DEFAULT_MUSIC_BOARD_SETTINGS,
      ...(current.musicBoard || {}),
      ...patch
    }
  }));
}

function getTrackedMusicBotIds() {
  return new Set(MUSIC_BOTS.map((bot) => bot.botId));
}

async function resolveBotMember(guild, botId) {
  return guild.members.cache.get(botId) || guild.members.fetch(botId).catch(() => null);
}

function getGuildIconUrl(guild) {
  return guild.iconURL({
    extension: "png",
    forceStatic: true,
    size: 256
  }) || null;
}

function buildMusicBoardEmbed(guild, lines) {
  return new EmbedBuilder()
    .setColor("#22c55e")
    .setAuthor({
      name: "Sokaze Music List",
      iconURL: getGuildIconUrl(guild) || undefined
    })
    .setDescription(lines.join("\n"))
    .setFooter({
      text: "Sokaze Assistant | Auto update saat music bot pindah voice",
      iconURL: getGuildIconUrl(guild) || undefined
    })
    .setTimestamp();
}

async function buildMusicBoardLines(guild) {
  const members = await Promise.all(MUSIC_BOTS.map((entry) => resolveBotMember(guild, entry.botId)));

  return MUSIC_BOTS.map((entry, index) => {
    const member = members[index];
    const voiceChannel = member?.voice?.channel || null;
    const status = voiceChannel ? "🔴" : "🟢";
    const commandLabel = entry.commandHint ? ` (${entry.commandHint})` : "";
    const mention = member ? member.toString() : `<@${entry.botId}>`;
    const location = voiceChannel ? voiceChannel.toString() : "Tidak sedang di voice";

    return `${status} ${entry.label}${commandLabel} - ${mention} - ${location}`;
  });
}

async function refreshMusicBoardForGuild(guild, options = {}) {
  if (musicBoardRefreshes.has(guild.id)) {
    return musicBoardRefreshes.get(guild.id);
  }

  const refreshPromise = (async () => {
    const settings = getMusicBoardSettings(guild.id);
    const channelId = settings.channelId;

    if (!channelId) {
      return false;
    }

    const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);

    if (!channel?.isTextBased?.() || !channel.messages) {
      return false;
    }

    let boardMessage = null;

    if (settings.messageId) {
      boardMessage = await channel.messages.fetch(settings.messageId).catch(() => null);
    }

    const lines = await buildMusicBoardLines(guild);
    const payload = {
      embeds: [buildMusicBoardEmbed(guild, lines)]
    };

    if (boardMessage) {
      await boardMessage.edit(payload).catch(() => null);
    } else {
      boardMessage = await channel.send(payload).catch(() => null);
    }

    if (!boardMessage) {
      return false;
    }

    updateMusicBoardState(guild.id, {
      messageId: boardMessage.id
    });

    return true;
  })().finally(() => {
    musicBoardRefreshes.delete(guild.id);
  });

  musicBoardRefreshes.set(guild.id, refreshPromise);
  return refreshPromise;
}

async function refreshAllMusicBoards(client) {
  const guilds = [...client.guilds.cache.values()];

  await Promise.allSettled(guilds.map(async (guild) => {
    try {
      await refreshMusicBoardForGuild(guild);
    } catch (error) {
      console.error(`Failed to refresh music board for guild ${guild.id}:`, error);
    }
  }));
}

async function handleMusicBoardVoiceState(oldState, newState) {
  const guild = newState.guild || oldState.guild;

  if (!guild) {
    return false;
  }

  const trackedIds = getTrackedMusicBotIds();
  const userId = newState.id || oldState.id;

  if (!trackedIds.has(userId)) {
    return false;
  }

  await refreshMusicBoardForGuild(guild).catch(() => null);
  return true;
}

module.exports = {
  getMusicBoardSettings,
  handleMusicBoardVoiceState,
  refreshAllMusicBoards,
  refreshMusicBoardForGuild,
  setMusicBoardChannel
};
