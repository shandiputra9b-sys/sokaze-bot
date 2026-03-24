const { PermissionFlagsBits } = require("discord.js");
const { updateGuildSettings } = require("../../services/guildConfigService");
const { resolveTextChannel } = require("../../utils/channelResolver");
const { buildStaffRecruitmentPanel } = require("../staff-recruitment/staffRecruitmentSystem");

module.exports = {
  name: "sendstaffpanel",
  description: "Kirim panel recruitment staff ke channel target.",
  category: "admin",
  usage: "sendstaffpanel [#channel]",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await message.reply("Kamu butuh permission Manage Server untuk command ini.");
      return;
    }

    const channel = resolveTextChannel(message, args[0]);

    if (!channel) {
      await message.reply("Channel panel recruitment staff tidak valid.");
      return;
    }

    await channel.send(buildStaffRecruitmentPanel(client, message.guild.id));

    updateGuildSettings(message.guild.id, (current) => ({
      ...current,
      staffRecruitment: {
        ...client.config.staffRecruitment,
        ...(current.staffRecruitment || {}),
        panelChannelId: channel.id
      }
    }));

    await message.reply(`Panel recruitment staff dikirim ke ${channel}.`);
  }
};
