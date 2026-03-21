const {
  ChannelType,
  SlashCommandBuilder
} = require("discord.js");
const { resolveTextChannel } = require("../../utils/channelResolver");
const {
  buildAutoThreadStatusEmbed,
  getAutoThreadSettings,
  updateAutoThreadSettings
} = require("../autothread/autoThreadSystem");

function addChannelToAutoThread(guildId, channelId) {
  return updateAutoThreadSettings(guildId, (current) => ({
    ...current,
    channelIds: [...current.channelIds, channelId]
  }));
}

function removeChannelFromAutoThread(guildId, channelId) {
  return updateAutoThreadSettings(guildId, (current) => ({
    ...current,
    channelIds: current.channelIds.filter((entry) => entry !== channelId)
  }));
}

const slashData = new SlashCommandBuilder()
  .setName("autothread")
  .setDescription("Atur auto thread untuk channel media/link")
  .setDMPermission(false)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("add")
      .setDescription("Aktifkan auto thread di channel teks tertentu")
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription("Channel target")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("remove")
      .setDescription("Nonaktifkan auto thread di channel tertentu")
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription("Channel target")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("list")
      .setDescription("Lihat daftar channel auto thread aktif")
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("clear")
      .setDescription("Kosongkan semua channel auto thread")
  );

module.exports = {
  name: "autothread",
  category: "admin",
  adminOnly: true,
  description: "Atur auto thread untuk post foto, video, atau link.",
  usage: "autothread <add|remove|list|clear> [#channel]",
  slashData,
  async execute(message, args) {
    const action = String(args[0] || "list").trim().toLowerCase();

    if (action === "list" || action === "status") {
      await message.reply({
        embeds: [buildAutoThreadStatusEmbed(message.guild)]
      });
      return;
    }

    if (action === "clear") {
      updateAutoThreadSettings(message.guild.id, (current) => ({
        ...current,
        channelIds: []
      }));

      await message.reply({
        embeds: [buildAutoThreadStatusEmbed(message.guild)]
      });
      return;
    }

    const channel = resolveTextChannel(message, args[1]);

    if (!channel) {
      await message.reply("Channel target tidak valid. Mention channel teks atau jalankan command di channel target.");
      return;
    }

    const settings = getAutoThreadSettings(message.guild.id);

    if (action === "add") {
      if (settings.channelIds.includes(channel.id)) {
        await message.reply(`${channel} sudah aktif di auto thread.`);
        return;
      }

      addChannelToAutoThread(message.guild.id, channel.id);
      await message.reply(`Auto thread berhasil diaktifkan di ${channel}.`);
      return;
    }

    if (action === "remove" || action === "delete") {
      if (!settings.channelIds.includes(channel.id)) {
        await message.reply(`${channel} belum masuk daftar auto thread.`);
        return;
      }

      removeChannelFromAutoThread(message.guild.id, channel.id);
      await message.reply(`Auto thread berhasil dinonaktifkan di ${channel}.`);
      return;
    }

    await message.reply("Gunakan `sk autothread add #channel`, `remove #channel`, `list`, atau `clear`.");
  },
  async executeSlash(interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: "Command ini hanya bisa dipakai di server.",
        ephemeral: true
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "list") {
      await interaction.reply({
        embeds: [buildAutoThreadStatusEmbed(interaction.guild)],
        ephemeral: true
      });
      return;
    }

    if (subcommand === "clear") {
      updateAutoThreadSettings(interaction.guildId, (current) => ({
        ...current,
        channelIds: []
      }));

      await interaction.reply({
        content: "Semua channel auto thread berhasil dikosongkan.",
        embeds: [buildAutoThreadStatusEmbed(interaction.guild)],
        ephemeral: true
      });
      return;
    }

    const channel = interaction.options.getChannel("channel", true);
    const settings = getAutoThreadSettings(interaction.guildId);

    if (subcommand === "add") {
      if (settings.channelIds.includes(channel.id)) {
        await interaction.reply({
          content: `${channel} sudah aktif di auto thread.`,
          ephemeral: true
        });
        return;
      }

      addChannelToAutoThread(interaction.guildId, channel.id);
      await interaction.reply({
        content: `Auto thread berhasil diaktifkan di ${channel}.`,
        ephemeral: true
      });
      return;
    }

    if (!settings.channelIds.includes(channel.id)) {
      await interaction.reply({
        content: `${channel} belum masuk daftar auto thread.`,
        ephemeral: true
      });
      return;
    }

    removeChannelFromAutoThread(interaction.guildId, channel.id);
    await interaction.reply({
      content: `Auto thread berhasil dinonaktifkan di ${channel}.`,
      ephemeral: true
    });
  }
};
