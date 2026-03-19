const { SlashCommandBuilder } = require("discord.js");
const { getMemberLevelInfo } = require("./levelSystem");
const { createExpCard } = require("./expCard");
const { resolveGuildMember } = require("../../utils/memberResolver");

async function resolveTargetMember(guild, value, fallbackMember) {
  if (!value) {
    return fallbackMember;
  }

  return resolveGuildMember(guild, value);
}

module.exports = {
  name: "exp",
  aliases: ["xp"],
  category: "levels",
  description: "Lihat kartu progress EXP dan level member.",
  usage: "exp [@member]",
  async execute(message, args, client) {
    const targetMember = await resolveTargetMember(message.guild, args[0], message.member);

    if (!targetMember || targetMember.user.bot) {
      await message.reply("Member target tidak valid atau merupakan bot.");
      return;
    }

    const levelInfo = getMemberLevelInfo(message.guild.id, targetMember.id, client);
    const attachment = await createExpCard(targetMember, levelInfo);

    await message.reply({
      files: [attachment]
    });
  },
  slashData: new SlashCommandBuilder()
    .setName("exp")
    .setDescription("Lihat kartu progress EXP dan level member")
    .setDMPermission(false)
    .addUserOption((option) =>
      option
        .setName("member")
        .setDescription("Member target")
        .setRequired(false)
    ),
  async executeSlash(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: "Command ini hanya bisa dipakai di server.",
        ephemeral: true
      });
      return;
    }

    const targetUser = interaction.options.getUser("member") || interaction.user;
    const targetMember = interaction.options.getMember("member")
      || await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember || targetMember.user.bot) {
      await interaction.reply({
        content: "Member target tidak valid atau merupakan bot.",
        ephemeral: true
      });
      return;
    }

    await interaction.deferReply();

    const levelInfo = getMemberLevelInfo(interaction.guildId, targetMember.id, interaction.client);
    const attachment = await createExpCard(targetMember, levelInfo);

    await interaction.editReply({
      files: [attachment]
    });
  }
};
