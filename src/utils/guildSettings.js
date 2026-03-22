const { getGuildSettings } = require("../services/guildConfigService");

function getEffectiveGuildSettings(guildId, client) {
  const settings = getGuildSettings(guildId, {
    welcome: client.config.welcome,
    tickets: client.config.tickets,
    confessions: client.config.confessions,
    counting: client.config.counting,
    streak: client.config.streak,
    nameRequests: client.config.nameRequests
  });

  return {
    ...settings,
    tickets: {
      ...client.config.tickets,
      ...(settings.tickets || {}),
      pingRoleIdsByType: {
        ...(client.config.tickets?.pingRoleIdsByType || {}),
        ...(settings.tickets?.pingRoleIdsByType || {})
      }
    }
  };
}

module.exports = {
  getEffectiveGuildSettings
};
