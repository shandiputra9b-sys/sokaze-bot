function extractUserId(value) {
  return String(value || "").replace(/[<@!>]/g, "").trim();
}

async function resolveGuildMember(guild, value) {
  const userId = extractUserId(value);

  if (!userId) {
    return null;
  }

  return guild.members.cache.get(userId) || guild.members.fetch(userId).catch(() => null);
}

module.exports = {
  extractUserId,
  resolveGuildMember
};
