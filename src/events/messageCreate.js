const { parsePrefixedCommand } = require("../utils/commandContext");
const { handleAutomodMessage } = require("../modules/automod/automodSystem");
const { handleCountingMessage } = require("../modules/counting/countingSystem");
const {
  handleBlockedGeneralChannelCommand,
  trackChatMessage
} = require("../modules/leaderboards/leaderboardSystem");
const { handleStreakMessage } = require("../modules/streak/streakSystem");

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (message.author.bot || !message.guild) {
      return;
    }

    const automodHandled = await handleAutomodMessage(message);

    if (automodHandled) {
      return;
    }

    const context = parsePrefixedCommand(message.content, client.config.prefix);

    const blockedCommand = await handleBlockedGeneralChannelCommand(message, client, context);

    if (blockedCommand) {
      return;
    }

    const streakHandled = await handleStreakMessage(message, client, {
      hasPrefixedCommand: Boolean(context)
    });

    if (streakHandled) {
      return;
    }

    if (!context) {
      await trackChatMessage(message, client);
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
