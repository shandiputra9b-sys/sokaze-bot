const { ChannelType, EmbedBuilder } = require("discord.js");
const { getEffectiveGuildSettings } = require("../../utils/guildSettings");
const { createWelcomeCard } = require("./welcomeCard");

function buildChannelLine(channelId, fallbackLabel) {
  return channelId ? `<#${channelId}>` : fallbackLabel;
}

function buildPublicWelcomeText(member, client) {
  const { welcome } = getEffectiveGuildSettings(member.guild.id, client);
  const introChannel = buildChannelLine(welcome.introChannelId, "`channel intro belum diatur`");
  const rulesChannel = buildChannelLine(welcome.rulesChannelId, "`rules belum diatur`");
  const rolesChannel = "<#1482480655039201485>";
  const guideChannel = "<#1482496677255450687>";

  const variants = [
    [
      `Selamat datang di Sokaze, ${member}.`,
      "Biar langkahmu rapi, mulai dari sini:",
      `- Rules: ${rulesChannel}`,
      `- Roles: ${rolesChannel}`,
      `- Intro: ${introChannel}`,
      "",
      "**Hope you feel at home here.**"
    ].join("\n"),
    [
      `${member}, gerbang Sokaze sudah terbuka buatmu.`,
      "Jangan skip yang ini:",
      `- Guide: ${guideChannel}`,
      `- Rules: ${rulesChannel}`,
      `- Roles: ${rolesChannel}`,
      "",
      "**Hope you feel at home here.**"
    ].join("\n"),
    [
      `Halo ${member}, selamat datang di Sokaze.`,
      "Siapkan dirimu dulu sebelum masuk lebih jauh:",
      `- Ambil role: ${rolesChannel}`,
      `- Baca rules: ${rulesChannel}`,
      `- Lihat guide: ${guideChannel}`,
      "",
      "**Hope you feel at home here.**"
    ].join("\n"),
    [
      `${member} baru saja tiba di sisi gelap Sokaze.`,
      "Buka jalurmu lewat channel ini:",
      `- Rules: ${rulesChannel}`,
      `- Guide: ${guideChannel}`,
      `- Roles: ${rolesChannel}`,
      "",
      "**Hope you feel at home here.**"
    ].join("\n"),
    [
      `Sokaze menyambut ${member}.`,
      "Kalau mau langsung nyatu, cek ini dulu:",
      `- Roles: ${rolesChannel}`,
      `- Rules: ${rulesChannel}`,
      `- Kenalan: ${introChannel}`,
      "",
      "**Hope you feel at home here.**"
    ].join("\n"),
    [
      `Halo ${member}. Selamat datang di Sokaze.`,
      "Awal yang bagus dimulai dari:",
      `- Guide: ${guideChannel}`,
      `- Roles: ${rolesChannel}`,
      `- Rules: ${rulesChannel}`,
      "",
      "**Hope you feel at home here.**"
    ].join("\n")
  ];

  return variants[Math.floor(Math.random() * variants.length)];
}

function buildWelcomeEmbed(member, client) {
  const { welcome } = getEffectiveGuildSettings(member.guild.id, client);
  const rulesChannel = buildChannelLine(welcome.rulesChannelId, "`rules belum diatur`");
  const rolesChannel = "<#1482480655039201485>";
  const guideChannel = "<#1482496677255450687>";
  const introChannel = buildChannelLine(welcome.introChannelId, "`intro belum diatur`");

  return new EmbedBuilder()
    .setColor(welcome.accentColor)
    .setAuthor({
      name: "Sokaze Gateway"
    })
    .setTitle("A New Soul Enters Sokaze")
    .setDescription(
      [
        `Welcome, ${member}.`,
        "Step into the dark and make your presence known.",
        "",
        `Read ${rulesChannel} before you move further.`,
        `Claim your place in ${rolesChannel} before you settle in.`,
        `Study ${guideChannel} to move through Sokaze without missing a step.`,
        `Introduce yourself in ${introChannel} when you're ready.`
      ].join("\n")
    )
    .setImage("attachment://welcome-card.png")
    .setFooter({
      text: `Member #${member.guild.memberCount}`
    })
    .setTimestamp();
}

async function sendWelcomeMessage(member, client, channelOverride = null) {
  const { welcome } = getEffectiveGuildSettings(member.guild.id, client);
  const targetChannel = channelOverride || await member.guild.channels.fetch(welcome.channelId).catch(() => null);

  if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
    return false;
  }

  const welcomeCard = await createWelcomeCard(member, welcome.accentColor);

  await targetChannel.send({
    embeds: [buildWelcomeEmbed(member, client)],
    files: [welcomeCard]
  });

  return true;
}

async function sendPublicWelcomeMessage(member, client) {
  const { welcome } = getEffectiveGuildSettings(member.guild.id, client);

  if (!welcome.publicChannelId) {
    return false;
  }

  const targetChannel = await member.guild.channels.fetch(welcome.publicChannelId).catch(() => null);

  if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
    return false;
  }

  await targetChannel.send({
    content: buildPublicWelcomeText(member, client)
  });

  return true;
}

module.exports = {
  buildWelcomeEmbed,
  buildPublicWelcomeText,
  sendWelcomeMessage,
  sendPublicWelcomeMessage
};
