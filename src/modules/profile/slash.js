const { SlashCommandBuilder } = require("discord.js");
const {
  PROFILE_THEMES,
  PROFILE_TITLES,
  SHOP_PROFILE_THEMES,
  SHOP_PROFILE_TITLES,
  buildProfileCatalogEmbed,
  buildProfileSnapshot,
  ensureProfileAccess,
  updateProfileTheme,
  updateProfileTitle
} = require("./profileSystem");
const { createProfileCard } = require("./profileCard");

const slashData = new SlashCommandBuilder()
  .setName("profile")
  .setDescription("Lihat dan atur profile card Sokaze")
  .setDMPermission(false)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("view")
      .setDescription("Lihat profile card milikmu atau member lain")
      .addUserOption((option) =>
        option
          .setName("member")
          .setDescription("Member target")
          .setRequired(false)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("catalog")
      .setDescription("Lihat theme dan title profile yang terbuka")
  )
  .addSubcommand((subcommand) => {
    let builder = subcommand
      .setName("set-theme")
      .setDescription("Pilih theme profile card milikmu")
      .addStringOption((option) => {
        let current = option
          .setName("theme")
          .setDescription("Theme profile")
          .setRequired(true);

        for (const theme of [...PROFILE_THEMES, ...SHOP_PROFILE_THEMES]) {
          current = current.addChoices({
            name: `${theme.label} (L${theme.minLevel})`,
            value: theme.key
          });
        }

        return current;
      });

    return builder;
  })
  .addSubcommand((subcommand) => {
    let builder = subcommand
      .setName("set-title")
      .setDescription("Pilih title profile milikmu")
      .addStringOption((option) => {
        let current = option
          .setName("title")
          .setDescription("Title profile")
          .setRequired(true);

        for (const title of [...PROFILE_TITLES, ...SHOP_PROFILE_TITLES]) {
          current = current.addChoices({
            name: `${title.label} (L${title.minLevel})`,
            value: title.key
          });
        }

        return current;
      });

    return builder;
  });

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
    const access = ensureProfileAccess(interaction.guildId, interaction.user.id, interaction.member);

    if (!access.ok) {
      await interaction.reply({
        content: access.reason,
        ephemeral: true
      });
      return;
    }

    if (subcommand === "catalog") {
      const snapshot = await buildProfileSnapshot(interaction.guild, interaction.member);

      await interaction.reply({
        embeds: [buildProfileCatalogEmbed(snapshot.levelInfo)],
        ephemeral: true
      });
      return;
    }

    if (subcommand === "set-theme") {
      const snapshot = await buildProfileSnapshot(interaction.guild, interaction.member);
      const result = updateProfileTheme(
        interaction.guildId,
        interaction.user.id,
        snapshot.levelInfo.level,
        interaction.options.getString("theme", true)
      );

      await interaction.reply({
        content: result.ok
          ? `Theme profile kamu diganti ke **${result.theme.label}**.`
          : result.reason,
        ephemeral: true
      });
      return;
    }

    if (subcommand === "set-title") {
      const snapshot = await buildProfileSnapshot(interaction.guild, interaction.member);
      const result = updateProfileTitle(
        interaction.guildId,
        interaction.user.id,
        snapshot.levelInfo.level,
        interaction.options.getString("title", true)
      );

      await interaction.reply({
        content: result.ok
          ? `Title profile kamu diganti ke **${result.title.label}**.`
          : result.reason,
        ephemeral: true
      });
      return;
    }

    await interaction.deferReply();

    const targetUser = interaction.options.getUser("member") || interaction.user;
    const targetMember = interaction.options.getMember("member")
      || await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember || targetMember.user.bot) {
      await interaction.editReply({
        content: "Member target tidak valid atau merupakan bot."
      });
      return;
    }

    const snapshot = await buildProfileSnapshot(interaction.guild, targetMember);

    if (!access.adminBypass && snapshot.levelInfo.level < 3) {
      await interaction.editReply({
        content: "Member itu belum membuka benefit profile card karena masih di bawah Level 3."
      });
      return;
    }

    const card = await createProfileCard(snapshot);

    await interaction.editReply({
      content: null,
      files: [card]
    });
  }
};
