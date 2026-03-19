const {
  PermissionFlagsBits,
  SlashCommandBuilder
} = require("discord.js");
const {
  LEVEL_MAX,
  LEVEL_MIN,
  buildLevelStatusEmbed,
  clampLevel,
  getMemberLevelInfo,
  hasLevelAdminPermission,
  setMemberLevel
} = require("./levelSystem");

const slashData = new SlashCommandBuilder()
  .setName("level")
  .setDescription("Lihat atau atur level member Sokaze")
  .setDMPermission(false)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("status")
      .setDescription("Lihat status level member")
      .addUserOption((option) =>
        option
          .setName("member")
          .setDescription("Member target")
          .setRequired(false)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("set")
      .setDescription("Atur level member")
      .addUserOption((option) =>
        option
          .setName("member")
          .setDescription("Member target")
          .setRequired(true)
      )
      .addIntegerOption((option) =>
        option
          .setName("value")
          .setDescription(`Level ${LEVEL_MIN}-${LEVEL_MAX}`)
          .setMinValue(LEVEL_MIN)
          .setMaxValue(LEVEL_MAX)
          .setRequired(true)
      )
  );

module.exports = {
  slashData,
  async executeSlash(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: "Command ini hanya bisa dipakai di server.",
        ephemeral: true
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser("member") || interaction.user;
    const targetMember = interaction.options.getMember("member")
      || await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (subcommand === "status") {
      const levelInfo = getMemberLevelInfo(interaction.guildId, targetUser.id);

      await interaction.reply({
        embeds: [buildLevelStatusEmbed(interaction.guild, targetMember || targetUser, levelInfo)],
        ephemeral: true
      });
      return;
    }

    if (!hasLevelAdminPermission(interaction.member)) {
      await interaction.reply({
        content: "Kamu butuh permission Manage Server untuk mengatur level member.",
        ephemeral: true
      });
      return;
    }

    if (!targetMember || targetMember.user.bot) {
      await interaction.reply({
        content: "Member target tidak valid atau merupakan bot.",
        ephemeral: true
      });
      return;
    }

    const nextLevel = clampLevel(interaction.options.getInteger("value", true));
    setMemberLevel(interaction.guildId, targetMember.id, nextLevel, {
      source: "manual"
    });

    const levelInfo = getMemberLevelInfo(interaction.guildId, targetMember.id);

    await interaction.reply({
      embeds: [buildLevelStatusEmbed(interaction.guild, targetMember, levelInfo)],
      ephemeral: true
    });
  }
};
