const { formatAfkReason, sendTemporaryReply, setAfkStatus } = require("./afkSystem");

module.exports = {
  name: "afk",
  aliases: [],
  category: "general",
  description: "Pasang status AFK dengan alasan singkat.",
  usage: "afk [reason]",
  async execute(message, args) {
    const reason = formatAfkReason(args.join(" "));
    const afk = await setAfkStatus(message.member, reason);
    const nicknameNotice = afk.nicknameResult?.reason === "discord-limit"
      ? "\nCatatan: nickname tidak diubah karena Discord membatasi nickname server maksimal 32 karakter."
      : "";

    await sendTemporaryReply(
      message,
      `${message.author}, status AFK kamu sudah aktif.\nAlasan: **${reason}**${nicknameNotice}`
    );
  }
};
