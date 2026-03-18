const { EmbedBuilder } = require("discord.js");

function normalizeReasonFromArgs(args, startIndex = 1, fallback = "Tidak ada alasan yang diberikan.") {
  const reason = args.slice(startIndex).join(" ").trim().replace(/\s+/g, " ");
  return reason || fallback;
}

async function replyWithError(message, text) {
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor("#ef4444")
        .setTitle("Moderation Error")
        .setDescription(text)
        .setTimestamp()
    ]
  });
}

async function replyWithSuccess(message, text) {
  await message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor("#10b981")
        .setTitle("Moderation Updated")
        .setDescription(text)
        .setTimestamp()
    ]
  });
}

async function replyWithActionText(message, text) {
  await message.reply(text);
}

module.exports = {
  normalizeReasonFromArgs,
  replyWithError,
  replyWithActionText,
  replyWithSuccess
};
