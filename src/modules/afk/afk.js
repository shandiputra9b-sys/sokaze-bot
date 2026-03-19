const { formatAfkReason, sendTemporaryReply, setAfkStatus } = require("./afkSystem");

module.exports = {
  name: "afk",
  aliases: [],
  category: "general",
  description: "Pasang status AFK dengan alasan singkat.",
  usage: "afk [reason]",
  async execute(message, args) {
    const reason = formatAfkReason(args.join(" "));
    await setAfkStatus(message.member, reason);

    await sendTemporaryReply(
      message,
      `${message.author}, status AFK kamu sudah aktif.\nAlasan: **${reason}**`
    );
  }
};
