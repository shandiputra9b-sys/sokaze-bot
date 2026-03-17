const { sendPublicWelcomeMessage, sendWelcomeMessage } = require("../modules/community/welcome");

module.exports = {
  name: "guildMemberAdd",
  async execute(member, client) {
    await sendWelcomeMessage(member, client);
    await sendPublicWelcomeMessage(member, client);
  }
};
