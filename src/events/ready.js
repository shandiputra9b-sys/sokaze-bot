const { syncSlashCommands } = require("../loaders/slashCommandLoader");

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    console.log(`${client.user.tag} is online with prefix "${client.config.prefix}"`);

    try {
      const result = await syncSlashCommands(client);

      if (result.commandCount > 0) {
        console.log(`Synced ${result.commandCount} slash command(s) to ${result.syncedGuilds} guild(s).`);
      }
    } catch (error) {
      console.error("Failed to sync slash commands:", error);
    }
  }
};
