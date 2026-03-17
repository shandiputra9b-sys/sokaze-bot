const { ChannelType, PermissionFlagsBits } = require("discord.js");
const { updateGuildSettings } = require("../../services/guildConfigService");

module.exports = {
  name: "setpartnershipcategory",
  description: "Atur kategori khusus untuk ticket partnership.",
  category: "admin",
  usage: "setpartnershipcategory <category_id>",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await message.reply("Kamu butuh permission Manage Server untuk command ini.");
      return;
    }

    const categoryId = args[0]?.replace(/[<#>]/g, "");
    const category = categoryId ? await message.guild.channels.fetch(categoryId).catch(() => null) : null;

    if (!category || category.type !== ChannelType.GuildCategory) {
      await message.reply("Kategori partnership tidak valid. Kirim ID category yang benar.");
      return;
    }

    updateGuildSettings(message.guild.id, (current) => ({
      ...current,
      tickets: {
        ...client.config.tickets,
        ...(current.tickets || {}),
        partnershipCategoryId: category.id
      }
    }));

    await message.reply(`Partnership ticket category diset ke **${category.name}**.`);
  }
};
