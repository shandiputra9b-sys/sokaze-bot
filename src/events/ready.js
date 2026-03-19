const { syncSlashCommands } = require("../loaders/slashCommandLoader");
const {
  bootstrapVoiceSessions,
  startLeaderboardScheduler
} = require("../modules/leaderboards/leaderboardSystem");
const { refreshAllMusicBoards } = require("../modules/music/musicBoardSystem");
const { startStreakTopBoardScheduler } = require("../modules/streak/streakSystem");
const { bootstrapTempVoiceRooms } = require("../modules/temp-voice/tempVoiceSystem");
const { startCustomRoleScheduler } = require("../modules/custom-roles/customRoleSystem");
const { startShopEconomyScheduler } = require("../modules/shop/shopSystem");
const { startPrivateRoomScheduler } = require("../modules/private-rooms/privateRoomSystem");

module.exports = {
  name: "clientReady",
  once: true,
  async execute(client) {
    console.log(`${client.user.tag} is online with prefix "${client.config.prefix}"`);

    try {
      const result = await syncSlashCommands(client);

      if (result.commandCount > 0) {
        console.log(
          `Synced ${result.commandCount} slash command(s) to ${result.syncedGuilds}/${result.attemptedGuilds} guild(s).`
        );

        if (!result.attemptedGuilds) {
          console.warn("No guilds were available for slash command sync.");
        }

        if (result.failedGuilds.length) {
          for (const failure of result.failedGuilds) {
            console.warn(
              `Failed to sync slash commands for guild ${failure.name} (${failure.id}): ${failure.reason}`
            );
          }
        }
      }
    } catch (error) {
      console.error("Failed to sync slash commands:", error);
    }

    await bootstrapVoiceSessions(client).catch((error) => {
      console.error("Failed to bootstrap voice sessions:", error);
    });

    await bootstrapTempVoiceRooms(client).catch((error) => {
      console.error("Failed to bootstrap temp voice rooms:", error);
    });

    startStreakTopBoardScheduler(client);
    startLeaderboardScheduler(client);
    startCustomRoleScheduler(client);
    startShopEconomyScheduler(client);
    startPrivateRoomScheduler(client);
    await refreshAllMusicBoards(client).catch((error) => {
      console.error("Failed to refresh music boards:", error);
    });
  }
};
