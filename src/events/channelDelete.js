const { handleDeletedPrivateRoom } = require("../modules/private-rooms/privateRoomSystem");

module.exports = {
  name: "channelDelete",
  async execute(channel) {
    handleDeletedPrivateRoom(channel);
  }
};
