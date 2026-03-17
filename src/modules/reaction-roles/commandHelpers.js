const { EmbedBuilder } = require("discord.js");
const { resolveTextChannel } = require("../../utils/channelResolver");

function splitOptionalChannel(message, args) {
  const channel = resolveTextChannel(message, args[0]);

  if (channel) {
    return {
      channel,
      remainingArgs: args.slice(1)
    };
  }

  return {
    channel: resolveTextChannel(message),
    remainingArgs: args
  };
}

async function replyRolePanelError(message, text) {
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor("#ef4444")
        .setTitle("Role Panel Error")
        .setDescription(text)
        .setTimestamp()
    ]
  });
}

async function replyRolePanelSuccess(message, text) {
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor("#111827")
        .setTitle("Role Panel Updated")
        .setDescription(text)
        .setTimestamp()
    ]
  });
}

module.exports = {
  replyRolePanelError,
  replyRolePanelSuccess,
  splitOptionalChannel
};
