const { handleVoiceStateTracking } = require("../modules/leaderboards/leaderboardSystem");
const { handleMusicBoardVoiceState } = require("../modules/music/musicBoardSystem");
const { handleVoiceStateGazecoin } = require("../modules/shop/shopSystem");
const { handleTempVoiceStateUpdate } = require("../modules/temp-voice/tempVoiceSystem");
const { handleVoiceLog } = require("../modules/voice/voiceLogSystem");

module.exports = {
  name: "voiceStateUpdate",
  async execute(oldState, newState, client) {
    await handleTempVoiceStateUpdate(oldState, newState, client);
    await handleVoiceStateGazecoin(oldState, newState, client);
    await handleVoiceStateTracking(oldState, newState);
    await handleMusicBoardVoiceState(oldState, newState);
    await handleVoiceLog(oldState, newState, client);
  }
};
