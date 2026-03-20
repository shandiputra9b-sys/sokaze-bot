const {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder
} = require("discord.js");
const {
  hasIdCardPanelPermission,
  sendIdCardPanel
} = require("./idCardSystem");

const slashData = new SlashCommandBuilder()
  .setName("idcardpanel")
  .setDescription("Kirim panel publik untuk membuat ID card")
  .setDMPermission(false)
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("send")
      .setDescription("Kirim panel ID card ke channel")
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription("Channel target panel")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false)
      )
      .addIntegerOption((option) =>
        option
          .setName("cooldown_seconds")
          .setDescription("Cooldown sticky panel dalam detik")
          .setMinValue(10)
          .setMaxValue(300)
          .setRequired(false)
      )
  );

module.exports = {
  adminOnly: true,
  slashData,
  async executeSlash(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: "Command ini hanya bisa dipakai di server.",
        ephemeral: true
      });
      return;
    }

    if (!hasIdCardPanelPermission(interaction.member)) {
      await interaction.reply({
        content: "Kamu butuh permission Manage Server atau Manage Messages untuk mengirim panel ID card.",
        ephemeral: true
      });
      return;
    }

    if (interaction.options.getSubcommand() === "send") {
      await sendIdCardPanel(interaction);
    }
  }
};
