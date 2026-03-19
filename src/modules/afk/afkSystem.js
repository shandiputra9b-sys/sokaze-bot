const { deleteAfkEntry, getAfkEntry, setAfkEntry } = require("../../services/afkStore");

const DEFAULT_AFK_REASON = "AFK dulu bentar.";
const MAX_AFK_REASON_LENGTH = 160;
const TEMP_REPLY_MS = 20 * 1000;

function trimReason(value) {
  const normalized = String(value || "").trim().replace(/\s+/g, " ");

  if (!normalized) {
    return DEFAULT_AFK_REASON;
  }

  return normalized.slice(0, MAX_AFK_REASON_LENGTH);
}

function parseQuestionAfkCommand(content) {
  const trimmed = String(content || "").trim();

  if (!/^\?afk(?:\s|$)/i.test(trimmed)) {
    return null;
  }

  const rest = trimmed.slice(4).trim();
  return {
    commandName: "afk",
    args: rest ? rest.split(/\s+/) : []
  };
}

async function sendTemporaryReply(message, payload) {
  const sent = await message.reply(typeof payload === "string" ? { content: payload } : payload).catch(() => null);

  if (sent) {
    const timer = setTimeout(() => {
      sent.delete().catch(() => null);
    }, TEMP_REPLY_MS);

    if (typeof timer.unref === "function") {
      timer.unref();
    }
  }

  return sent;
}

function formatAfkReason(reason) {
  return trimReason(reason);
}

function getAfkStatus(guildId, userId) {
  return getAfkEntry(guildId, userId);
}

function setAfkStatus(guildId, userId, reason) {
  return setAfkEntry(guildId, userId, {
    reason: formatAfkReason(reason),
    sinceAt: new Date().toISOString()
  });
}

function clearAfkStatus(guildId, userId) {
  return deleteAfkEntry(guildId, userId);
}

function isAfkCommandContext(context) {
  return context?.commandName === "afk";
}

async function clearAfkFromMessage(message) {
  const current = getAfkStatus(message.guild.id, message.author.id);

  if (!current) {
    return false;
  }

  clearAfkStatus(message.guild.id, message.author.id);
  await sendTemporaryReply(
    message,
    `Selamat datang kembali, ${message.author}. Status AFK kamu sudah dilepas.`
  );
  return true;
}

async function notifyMentionedAfkUsers(message) {
  if (!message.mentions.users.size) {
    return false;
  }

  const lines = [];

  for (const user of message.mentions.users.values()) {
    if (user.bot || user.id === message.author.id) {
      continue;
    }

    const afk = getAfkStatus(message.guild.id, user.id);

    if (!afk) {
      continue;
    }

    const sinceUnix = afk.sinceAt
      ? Math.floor(new Date(afk.sinceAt).getTime() / 1000)
      : 0;

    lines.push(
      sinceUnix > 0
        ? `${user} sedang AFK: **${afk.reason}** • <t:${sinceUnix}:R>`
        : `${user} sedang AFK: **${afk.reason}**`
    );
  }

  if (!lines.length) {
    return false;
  }

  await sendTemporaryReply(message, lines.join("\n"));
  return true;
}

module.exports = {
  clearAfkFromMessage,
  clearAfkStatus,
  formatAfkReason,
  getAfkStatus,
  isAfkCommandContext,
  notifyMentionedAfkUsers,
  parseQuestionAfkCommand,
  sendTemporaryReply,
  setAfkStatus
};
