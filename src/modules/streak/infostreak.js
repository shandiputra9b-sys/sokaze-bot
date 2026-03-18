const { sendStreakInfo } = require("./streakSystem");

function extractMentionId(value) {
  const match = value?.match(/^<@!?(\d+)>$/);
  return match ? match[1] : null;
}

function parseInfoArguments(args, fallbackUserId) {
  let targetId = fallbackUserId;
  let page = 1;

  for (const arg of args) {
    const mentionId = extractMentionId(arg);

    if (mentionId) {
      targetId = mentionId;
      continue;
    }

    const candidatePage = Number.parseInt(arg, 10);

    if (Number.isInteger(candidatePage) && candidatePage > 0) {
      page = candidatePage;
    }
  }

  return {
    targetId,
    page
  };
}

module.exports = {
  name: "infostreak",
  description: "Lihat daftar partner streak milikmu atau user lain.",
  aliases: ["streakinfo"],
  category: "streak",
  usage: "infostreak [@user] [halaman]",
  async execute(message, args, client) {
    return sendStreakInfo(message, client, parseInfoArguments(args, message.author.id));
  }
};
