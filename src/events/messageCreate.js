const { parsePrefixedCommand } = require("../utils/commandContext");
const { handleCountingMessage } = require("../modules/counting/countingSystem");

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (message.author.bot || !message.guild) {
      return;
    }

    const context = parsePrefixedCommand(message.content, client.config.prefix);

    if (!context) {
      await handleCountingMessage(message, client);
      return;
    }

    const command = client.commandIndex.get(context.commandName);

    if (!command) {
      return;
    }

    try {
      await command.execute(message, context.args, client);
    } catch (error) {
      console.error(`Failed to execute command "${context.commandName}":`, error);
      await message.reply("Terjadi error saat menjalankan command.");
    }
  }
};
