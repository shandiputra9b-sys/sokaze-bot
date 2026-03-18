const { PermissionFlagsBits } = require("discord.js");
const { resolveTextChannel } = require("../../utils/channelResolver");
const { setAutomodLogChannel } = require("./automodSystem");

function buildReply(color, title, description) {
  return {
    embeds: [
      {
        color,
        title,
        description,
        timestamp: new Date().toISOString()
      }
    ]
  };
}

module.exports = {
  name: "setautomodlog",
  description: "Atur channel log khusus automod.",
  category: "admin",
  usage: "setautomodlog [#channel]",
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await message.reply(buildReply(0xef4444, "Automod Error", "Kamu butuh permission Manage Server untuk command ini."));
      return;
    }

    const channel = resolveTextChannel(message, args[0]);

    if (!channel) {
      await message.reply(
        buildReply(
          0xef4444,
          "Automod Error",
          "Channel log tidak valid. Mention channel teks atau jalankan di channel target."
        )
      );
      return;
    }

    setAutomodLogChannel(message.guild.id, channel.id);
    await message.reply(buildReply(0x10b981, "Automod Updated", `Automod log channel diset ke ${channel}.`));
  }
};
