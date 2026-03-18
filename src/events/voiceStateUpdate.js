const { handleVoiceStateTracking } = require("../modules/leaderboards/leaderboardSystem");
const { handleMusicBoardVoiceState } = require("../modules/music/musicBoardSystem");

module.exports = {
  name: "voiceStateUpdate",
  async execute(oldState, newState) {
    await handleVoiceStateTracking(oldState, newState);
    await handleMusicBoardVoiceState(oldState, newState);
  }
};
