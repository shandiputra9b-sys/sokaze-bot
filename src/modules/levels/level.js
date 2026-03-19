const { buildLevelStatusEmbed, clampLevel, getMemberLevelInfo, hasLevelAdminPermission, setMemberLevel } = require("./levelSystem");
const { resolveGuildMember } = require("../../utils/memberResolver");

module.exports = {
  name: "level",
  aliases: ["tier"],
  category: "levels",
  description: "Lihat atau atur level member.",
  usage: "level <status|set> [@member] [1-5]",
  async execute(message, args) {
    const action = (args[0] || "status").toLowerCase();

    if (action === "status") {
      const targetMember = args[1]
        ? await resolveGuildMember(message.guild, args[1])
        : message.member;

      if (!targetMember || targetMember.user.bot) {
        await message.reply("Member target tidak valid atau merupakan bot.");
        return;
      }

      await message.reply({
        embeds: [buildLevelStatusEmbed(message.guild, targetMember, getMemberLevelInfo(message.guild.id, targetMember.id))]
      });
      return;
    }

    if (action === "set") {
      if (!hasLevelAdminPermission(message.member)) {
        await message.reply("Kamu butuh permission Manage Server untuk mengatur level member.");
        return;
      }

      const targetMember = await resolveGuildMember(message.guild, args[1]);

      if (!targetMember || targetMember.user.bot) {
        await message.reply("Member target tidak valid atau merupakan bot.");
        return;
      }

      const nextLevel = clampLevel(args[2]);
      setMemberLevel(message.guild.id, targetMember.id, nextLevel, {
        source: "manual"
      });

      await message.reply({
        embeds: [buildLevelStatusEmbed(message.guild, targetMember, getMemberLevelInfo(message.guild.id, targetMember.id))]
      });
      return;
    }

    await message.reply("Gunakan `sk level status [@member]` atau `sk level set @member <1-5>`.");
  }
};
