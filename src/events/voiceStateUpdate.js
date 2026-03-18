const { handleVoiceStateTracking } = require("../modules/leaderboards/leaderboardSystem");

module.exports = {
  name: "voiceStateUpdate",
  async execute(oldState, newState) {
    await handleVoiceStateTracking(oldState, newState);
  }
};
