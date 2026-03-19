const {
  CLOSE_TICKET_BUTTON_ID,
  createTicketChannel,
  closeTicketChannel,
  TICKET_TYPE_PREFIX
} = require("../modules/tickets/ticketSystem");
const {
  buildNewConfessionModal,
  buildReplyConfessionModal,
  CONFESSION_NEW_BUTTON_ID,
  CONFESSION_NEW_MODAL_ID,
  CONFESSION_REPLY_MODAL_PREFIX,
  CONFESSION_REPLY_PREFIX,
  publishConfessionReply,
  publishNewConfession
} = require("../modules/confessions/confessionSystem");
const {
  buildNameRequestModal,
  handleNameRequestDecision,
  NAME_REQUEST_APPROVE_PREFIX,
  NAME_REQUEST_BUTTON_ID,
  NAME_REQUEST_MODAL_ID,
  NAME_REQUEST_REJECT_PREFIX,
  submitNameRequest
} = require("../modules/name-requests/nameRequestSystem");
const {
  buildQuoteModal,
  publishQuoteFromInteraction,
  QUOTE_CREATE_BUTTON_ID,
  QUOTE_CREATE_MODAL_ID
} = require("../modules/general/quote");
const {
  handleModerationButton,
  handleModerationModalSubmit
} = require("../modules/moderation/moderationSystem");
const {
  handleRolePanelSelect
} = require("../modules/reaction-roles/reactionRoleSystem");
const {
  isCommandBlockedInGeneralChannel
} = require("../modules/leaderboards/leaderboardSystem");
const {
  handleTempVoiceButton,
  handleTempVoiceModalSubmit,
  handleTempVoiceSelectMenu
} = require("../modules/temp-voice/tempVoiceSystem");
const {
  handleIdCardButton,
  handleIdCardModalSubmit
} = require("../modules/idcard/idCardSystem");
const {
  handleStickyModalSubmit
} = require("../modules/sticky/stickySystem");
const {
  handleSuggestionButton,
  handleSuggestionModalSubmit
} = require("../modules/suggestions/suggestionSystem");
const {
  handleDonationModalSubmit
} = require("../modules/donations/donationSystem");

module.exports = {
  name: "interactionCreate",
  async execute(interaction, client) {
    if (interaction.isChatInputCommand()) {
      if (interaction.guildId && isCommandBlockedInGeneralChannel(interaction.guildId, interaction.channelId, client)) {
        await interaction.reply({
          content: "Command bot tidak bisa dipakai di channel general ini. Gunakan channel bot ya.",
          ephemeral: true
        }).catch(() => null);
        return;
      }

      const command = client.slashCommands.get(interaction.commandName);

      if (!command) {
        return;
      }

      try {
        await command.executeSlash(interaction, client);
      } catch (error) {
        console.error(`Failed to execute slash command "${interaction.commandName}":`, error);

        const payload = {
          content: "Terjadi error saat menjalankan slash command.",
          ephemeral: true
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(payload).catch(() => null);
          return;
        }

        await interaction.reply(payload).catch(() => null);
      }

      return;
    }

    if (interaction.isStringSelectMenu()) {
      if (await handleTempVoiceSelectMenu(interaction, client)) {
        return;
      }

      if (await handleRolePanelSelect(interaction, client)) {
        return;
      }

      return;
    }

    if (interaction.isButton()) {
      if (await handleSuggestionButton(interaction, client)) {
        return;
      }

      if (await handleIdCardButton(interaction, client)) {
        return;
      }

      if (await handleTempVoiceButton(interaction, client)) {
        return;
      }

      if (await handleModerationButton(interaction, client)) {
        return;
      }

      if (interaction.customId === NAME_REQUEST_BUTTON_ID) {
        await interaction.showModal(buildNameRequestModal());
        return;
      }

      if (interaction.customId.startsWith(NAME_REQUEST_APPROVE_PREFIX)) {
        await interaction.deferReply({ ephemeral: true });
        const requestId = interaction.customId.slice(NAME_REQUEST_APPROVE_PREFIX.length);
        const result = await handleNameRequestDecision(interaction, client, "approve", requestId);

        if (!result.ok) {
          await interaction.editReply(result.reason);
          return;
        }

        await interaction.editReply(`Request name #${result.request.id} berhasil di-approve.`);
        return;
      }

      if (interaction.customId.startsWith(NAME_REQUEST_REJECT_PREFIX)) {
        await interaction.deferReply({ ephemeral: true });
        const requestId = interaction.customId.slice(NAME_REQUEST_REJECT_PREFIX.length);
        const result = await handleNameRequestDecision(interaction, client, "reject", requestId);

        if (!result.ok) {
          await interaction.editReply(result.reason);
          return;
        }

        await interaction.editReply(`Request name #${result.request.id} berhasil di-reject.`);
        return;
      }

      if (interaction.customId === CONFESSION_NEW_BUTTON_ID) {
        await interaction.showModal(buildNewConfessionModal());
        return;
      }

      if (interaction.customId === QUOTE_CREATE_BUTTON_ID) {
        await interaction.showModal(buildQuoteModal());
        return;
      }

      if (interaction.customId.startsWith(CONFESSION_REPLY_PREFIX)) {
        const confessionId = interaction.customId.slice(CONFESSION_REPLY_PREFIX.length);
        await interaction.showModal(buildReplyConfessionModal(confessionId));
        return;
      }

      if (interaction.customId.startsWith(TICKET_TYPE_PREFIX)) {
        const result = await createTicketChannel(interaction, client, interaction.customId);

        if (!result.ok) {
          await interaction.reply({
            content: result.reason,
            ephemeral: true
          });
          return;
        }

        await interaction.reply({
          content: `Ticket berhasil dibuka di ${result.channel}.`,
          ephemeral: true
        });
        return;
      }

      if (interaction.customId === CLOSE_TICKET_BUTTON_ID) {
        await interaction.deferReply({ ephemeral: true });
        const result = await closeTicketChannel(interaction, client);

        if (!result.ok) {
          await interaction.editReply(result.reason);
          return;
        }
      }

      return;
    }

    if (!interaction.isModalSubmit()) {
      return;
    }

    if (await handleModerationModalSubmit(interaction, client)) {
      return;
    }

    if (await handleStickyModalSubmit(interaction, client)) {
      return;
    }

    if (await handleSuggestionModalSubmit(interaction, client)) {
      return;
    }

    if (await handleDonationModalSubmit(interaction, client)) {
      return;
    }

    if (await handleIdCardModalSubmit(interaction, client)) {
      return;
    }

    if (await handleTempVoiceModalSubmit(interaction, client)) {
      return;
    }

    if (interaction.customId === NAME_REQUEST_MODAL_ID) {
      const result = await submitNameRequest(interaction, client);

      if (!result.ok) {
        await interaction.reply({
          content: result.reason,
          ephemeral: true
        });
        return;
      }

      await interaction.reply({
        content: `Request name berhasil dikirim sebagai #${result.id}.`,
        ephemeral: true
      });
      return;
    }

    if (interaction.customId === CONFESSION_NEW_MODAL_ID) {
      const result = await publishNewConfession(interaction, client);

      if (!result.ok) {
        await interaction.reply({
          content: result.reason,
          ephemeral: true
        });
        return;
      }

      await interaction.reply({
        content: `Confession berhasil dikirim sebagai #${result.id}.`,
        ephemeral: true
      });
      return;
    }

    if (interaction.customId === QUOTE_CREATE_MODAL_ID) {
      const result = await publishQuoteFromInteraction(interaction);

      if (!result.ok) {
        await interaction.reply({
          content: result.reason,
          ephemeral: true
        });
        return;
      }

      await interaction.reply({
        content: "Quote berhasil dikirim.",
        ephemeral: true
      });
      return;
    }

    if (interaction.customId.startsWith(CONFESSION_REPLY_MODAL_PREFIX)) {
      const confessionId = interaction.customId.slice(CONFESSION_REPLY_MODAL_PREFIX.length);
      const result = await publishConfessionReply(interaction, client, confessionId);

      if (!result.ok) {
        await interaction.reply({
          content: result.reason,
          ephemeral: true
        });
        return;
      }

      await interaction.reply({
        content: `Balasan anonim berhasil dikirim ke thread confession #${result.parentId}.`,
        ephemeral: true
      });
    }
  }
};
