const { getEffectiveGuildSettings } = require("../../utils/guildSettings");
const {
  getCountingState,
  resetCountingState,
  updateCountingState
} = require("../../services/countingStore");

function parseCountingNumber(content) {
  if (!/^\d+$/.test(content.trim())) {
    return null;
  }

  return Number.parseInt(content.trim(), 10);
}

async function handleCountingMessage(message, client) {
  const { counting } = getEffectiveGuildSettings(message.guild.id, client);

  if (!counting.channelId || message.channel.id !== counting.channelId) {
    return false;
  }

  const postedNumber = parseCountingNumber(message.content);
  const state = getCountingState(message.guild.id, {
    startNumber: counting.startNumber
  });
  const expectedNumber = state.currentNumber + 1;

  if (postedNumber === null) {
    return false;
  }

  if (message.author.id === state.lastUserId || postedNumber !== expectedNumber) {
    await message.react("❌").catch(() => null);

    const resetState = resetCountingState(message.guild.id, counting.startNumber);
    const restartAt = resetState.currentNumber + 1;

    await message.channel.send(
      `Counting gagal. Urutan di-reset, mulai lagi dari **${restartAt}**.`
    ).then((sentMessage) => {
      setTimeout(() => sentMessage.delete().catch(() => null), 5000);
    }).catch(() => null);

    return true;
  }

  updateCountingState(message.guild.id, () => ({
    currentNumber: postedNumber,
    lastUserId: message.author.id
  }));

  await message.react("✅").catch(() => null);

  return true;
}

module.exports = {
  handleCountingMessage
};
