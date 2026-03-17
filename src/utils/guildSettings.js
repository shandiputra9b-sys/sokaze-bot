const { getGuildSettings } = require("../services/guildConfigService");

function getEffectiveGuildSettings(guildId, client) {
  return getGuildSettings(guildId, {
    welcome: client.config.welcome,
    tickets: client.config.tickets,
    confessions: client.config.confessions,
    counting: client.config.counting,
    nameRequests: client.config.nameRequests
  });
}

module.exports = {
  getEffectiveGuildSettings
};
