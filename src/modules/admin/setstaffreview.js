const { PermissionFlagsBits } = require("discord.js");
const { updateGuildSettings } = require("../../services/guildConfigService");
const { resolveTextChannel } = require("../../utils/channelResolver");

module.exports = {
  name: "setstaffreview",
  description: "Atur channel review recruitment staff.",
  category: "admin",
  usage: "setstaffreview [#channel]",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await message.reply("Kamu butuh permission Manage Server untuk command ini.");
      return;
    }

    const channel = resolveTextChannel(message, args[0]);

    if (!channel) {
      await message.reply("Channel review recruitment staff tidak valid.");
      return;
    }

    updateGuildSettings(message.guild.id, (current) => ({
      ...current,
      staffRecruitment: {
        ...client.config.staffRecruitment,
        ...(current.staffRecruitment || {}),
        reviewChannelId: channel.id
      }
    }));

    await message.reply(`Channel review recruitment staff diset ke ${channel}.`);
  }
};
