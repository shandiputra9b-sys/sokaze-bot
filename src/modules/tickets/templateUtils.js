const { PermissionFlagsBits } = require("discord.js");
const { getEffectiveGuildSettings } = require("../../utils/guildSettings");
const { hasBotPermissionAccess } = require("../../utils/botPermissions");

async function canManageTicketTemplates(message, client) {
  if (!message.guild || !message.member) {
    return false;
  }

  if (await hasBotPermissionAccess(message.member, "ticket", client)) {
    return true;
  }

  if (
    message.member.permissions.has(PermissionFlagsBits.ManageGuild) ||
    message.member.permissions.has(PermissionFlagsBits.ManageChannels)
  ) {
    return true;
  }

  const { tickets } = getEffectiveGuildSettings(message.guild.id, client);
  return Boolean(tickets.supportRoleId && message.member.roles.cache.has(tickets.supportRoleId));
}

function createTemplateCommand({ name, description, title, introLines, formLines, closingLines }) {
  return {
    name,
    description,
    category: "tickets",
    usage: name,
    async execute(message, args, client) {
      if (!await canManageTicketTemplates(message, client)) {
        await message.reply("Kamu tidak punya izin untuk mengirim template support.");
        return;
      }

      const sections = [
        `**${title}**`,
        "",
        ...introLines,
        "",
        "```text",
        ...formLines,
        "```",
        "",
        ...closingLines
      ];

      await message.channel.send({
        content: sections.join("\n")
      });
    }
  };
}

module.exports = {
  canManageTicketTemplates,
  createTemplateCommand
};
