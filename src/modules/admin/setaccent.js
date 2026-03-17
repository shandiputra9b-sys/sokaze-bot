const { PermissionFlagsBits } = require("discord.js");
const { updateGuildSettings } = require("../../services/guildConfigService");

module.exports = {
  name: "setaccent",
  description: "Atur warna accent embed welcome.",
  category: "admin",
  usage: "setaccent <hex>",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await message.reply("Kamu butuh permission Manage Server untuk command ini.");
      return;
    }

    const input = args[0];

    if (!input || !/^#?[0-9a-fA-F]{6}$/.test(input)) {
      await message.reply("Format warna tidak valid. Contoh: `sksetaccent #111111`");
      return;
    }

    const accentColor = input.startsWith("#") ? input : `#${input}`;

    updateGuildSettings(message.guild.id, (current) => ({
      ...current,
      welcome: {
        ...client.config.welcome,
        ...(current.welcome || {}),
        accentColor
      }
    }));

    await message.reply(`Accent welcome diset ke \`${accentColor}\`.`);
  }
};
