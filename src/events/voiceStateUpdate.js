const { handleVoiceStateTracking } = require("../modules/leaderboards/leaderboardSystem");
const { handleMusicBoardVoiceState } = require("../modules/music/musicBoardSystem");
const { handleTempVoiceStateUpdate } = require("../modules/temp-voice/tempVoiceSystem");

module.exports = {
  name: "voiceStateUpdate",
  async execute(oldState, newState, client) {
    await handleTempVoiceStateUpdate(oldState, newState, client);
    await handleVoiceStateTracking(oldState, newState);
    await handleMusicBoardVoiceState(oldState, newState);
  }
};
