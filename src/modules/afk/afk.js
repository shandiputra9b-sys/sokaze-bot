const { formatAfkReason, sendTemporaryReply, setAfkStatus } = require("./afkSystem");

module.exports = {
  name: "afk",
  aliases: [],
  category: "general",
  description: "Pasang status AFK dengan alasan singkat.",
  usage: "afk [reason]",
  async execute(message, args) {
    const reason = formatAfkReason(args.join(" "));
    setAfkStatus(message.guild.id, message.author.id, reason);

    await sendTemporaryReply(
      message,
      `${message.author}, status AFK kamu sudah aktif.\nAlasan: **${reason}**`
    );
  }
};
