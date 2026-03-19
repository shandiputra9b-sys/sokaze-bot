const { EmbedBuilder } = require("discord.js");
const { listVoiceTotals } = require("../../services/leaderboardStore");

function formatDuration(ms) {
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}h ${hours}j`;
  }

  if (hours > 0) {
    return `${hours}j ${minutes}m`;
  }

  return `${minutes}m`;
}

async function resolveMember(guild, userId) {
  return guild.members.cache.get(userId) || guild.members.fetch(userId).catch(() => null);
}

module.exports = {
  name: "topvoice",
  description: "Lihat leaderboard voice server tanpa canvas.",
  aliases: ["voiceboard", "voiceleaderboard"],
  category: "general",
  usage: "topvoice",
  async execute(message) {
    const now = Date.now();
    const entries = listVoiceTotals(message.guild.id)
      .map((entry) => ({
        ...entry,
        effectiveTotalMs: (entry.totalMs || 0) + (entry.activeSession
          ? Math.max(0, now - new Date(entry.activeSession.startedAt).getTime())
          : 0)
      }))
      .sort((left, right) => right.effectiveTotalMs - left.effectiveTotalMs)
      .slice(0, 10);

    if (!entries.length) {
      await message.reply("Belum ada data voice tracker di server ini.");
      return;
    }

    const members = await Promise.all(entries.map((entry) => resolveMember(message.guild, entry.userId)));
    const lines = entries.map((entry, index) => {
      const member = members[index];
      const label = member
        ? (member.displayName || member.user.globalName || member.user.username)
        : `User ${entry.userId}`;

      return `**#${index + 1}** ${label}\n${formatDuration(entry.effectiveTotalMs)}`;
    });

    const embed = new EmbedBuilder()
      .setColor("#a855f7")
      .setTitle("Top Voice")
      .setDescription(lines.join("\n\n"))
      .setFooter({
        text: `${message.guild.name} • Voice Tracker`
      })
      .setTimestamp();

    await message.reply({
      embeds: [embed]
    });
  }
};
