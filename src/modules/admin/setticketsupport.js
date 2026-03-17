const { PermissionFlagsBits } = require("discord.js");
const { updateGuildSettings } = require("../../services/guildConfigService");

module.exports = {
  name: "setticketsupport",
  description: "Atur role support untuk ticket.",
  category: "admin",
  usage: "setticketsupport <@role>",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await message.reply("Kamu butuh permission Manage Server untuk command ini.");
      return;
    }

    const roleId = args[0]?.replace(/[<@&>]/g, "");
    const role = roleId ? message.guild.roles.cache.get(roleId) : null;

    if (!role) {
      await message.reply("Role support tidak valid. Mention role yang benar.");
      return;
    }

    updateGuildSettings(message.guild.id, (current) => ({
      ...current,
      tickets: {
        ...client.config.tickets,
        ...(current.tickets || {}),
        supportRoleId: role.id
      }
    }));

    await message.reply(`Ticket support role diset ke ${role}.`);
  }
};
