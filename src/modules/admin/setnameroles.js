const { PermissionFlagsBits } = require("discord.js");
const { updateGuildSettings } = require("../../services/guildConfigService");

module.exports = {
  name: "setnameroles",
  description: "Atur role yang dilindungi agar nama tidak menyerupai admin/staff.",
  category: "admin",
  usage: "setnameroles <@role> [@role2] [@role3]",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await message.reply("Kamu butuh permission Manage Server untuk command ini.");
      return;
    }

    const roleIds = args
      .map((value) => value.replace(/[<@&>]/g, ""))
      .filter((id) => message.guild.roles.cache.has(id));

    if (!roleIds.length) {
      await message.reply("Kirim minimal satu mention role yang valid.");
      return;
    }

    updateGuildSettings(message.guild.id, (current) => ({
      ...current,
      nameRequests: {
        ...client.config.nameRequests,
        ...(current.nameRequests || {}),
        protectedRoleIds: roleIds
      }
    }));

    await message.reply(`Protected role untuk request name berhasil diatur ke ${roleIds.map((id) => `<@&${id}>`).join(", ")}.`);
  }
};
