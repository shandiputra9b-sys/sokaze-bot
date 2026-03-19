const { parsePrefixedCommand } = require("../utils/commandContext");
const { handleAutomodMessage } = require("../modules/automod/automodSystem");
const { handleCountingMessage } = require("../modules/counting/countingSystem");
const {
  handleBlockedGeneralChannelCommand,
  trackChatMessage
} = require("../modules/leaderboards/leaderboardSystem");
const { handleStreakMessage } = require("../modules/streak/streakSystem");
const { handleStickyMessage } = require("../modules/sticky/stickySystem");
const { handleIdCardPanelMessage } = require("../modules/idcard/idCardSystem");
const { handleCustomRoleTicketMessage } = require("../modules/custom-roles/customRoleSystem");
const {
  clearAfkFromMessage,
  isAfkCommandContext,
  notifyMentionedAfkUsers,
  parseQuestionAfkCommand
} = require("../modules/afk/afkSystem");
const { awardTrackedChatCoins } = require("../modules/shop/shopSystem");
const { touchPrivateRoomActivity } = require("../modules/private-rooms/privateRoomSystem");
const { awardTrackedChatXp } = require("../modules/levels/levelSystem");

module.exports = {
  name: "messageCreate",
  async execute(message, client) {
    if (!message.guild) {
      return;
    }

    if (message.author.bot) {
      await handleStickyMessage(message, client);
      await handleIdCardPanelMessage(message, client);
      return;
    }

    const questionAfkContext = parseQuestionAfkCommand(message.content);

    if (questionAfkContext) {
      const afkCommand = client.commandIndex.get("afk");

      if (afkCommand) {
        try {
          await afkCommand.execute(message, questionAfkContext.args, client);
        } catch (error) {
          console.error('Failed to execute AFK shortcut command "?afk":', error);
          await message.reply("Terjadi error saat mengaktifkan status AFK.");
        }
      }

      await handleStickyMessage(message, client);
      await handleIdCardPanelMessage(message, client);
      return;
    }

    const customRoleMessageHandled = await handleCustomRoleTicketMessage(message, client);

    if (customRoleMessageHandled) {
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

    if (!isAfkCommandContext(context)) {
      await clearAfkFromMessage(message);
    }

    if (!context) {
      await notifyMentionedAfkUsers(message);
      await touchPrivateRoomActivity(message, client);
      const trackedChat = await trackChatMessage(message, client);
      if (trackedChat) {
        await awardTrackedChatCoins(message, client);
        await awardTrackedChatXp(message, client);
      }
      await handleCountingMessage(message, client);
      await handleStickyMessage(message, client);
      await handleIdCardPanelMessage(message, client);
      return;
    }

    const command = client.commandIndex.get(context.commandName);

    if (!command) {
      await handleStickyMessage(message, client);
      await handleIdCardPanelMessage(message, client);
      return;
    }

    try {
      await command.execute(message, context.args, client);
    } catch (error) {
      console.error(`Failed to execute command "${context.commandName}":`, error);
      await message.reply("Terjadi error saat menjalankan command.");
    }

    await handleStickyMessage(message, client);
    await handleIdCardPanelMessage(message, client);
  }
};
