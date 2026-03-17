const { PermissionFlagsBits } = require("discord.js");
const { updateGuildSettings } = require("../../services/guildConfigService");
const { buildPartnershipTicketPanel } = require("../tickets/ticketSystem");

async function updatePartnershipPanelMessage(guild, client, channelId) {
  if (!channelId) {
    return false;
  }

  const channel = await guild.channels.fetch(channelId).catch(() => null);

  if (!channel || !channel.isTextBased()) {
    return false;
  }

  const messages = await channel.messages.fetch({ limit: 20 }).catch(() => null);

  if (!messages) {
    return false;
  }

  const panelMessage = messages.find((message) =>
    message.author.id === client.user.id &&
    message.components.some((row) =>
      row.components.some((component) => component.customId === "ticket:type:partnership")
    )
  );

  if (!panelMessage) {
    return false;
  }

  await panelMessage.edit(buildPartnershipTicketPanel(client, guild.id));
  return true;
}

module.exports = {
  name: "togglepartnership",
  description: "Aktifkan atau nonaktifkan tombol ticket partnership.",
  category: "admin",
  usage: "togglepartnership <on|off>",
  async execute(message, args, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await message.reply("Kamu butuh permission Manage Server untuk command ini.");
      return;
    }

    const value = args[0]?.toLowerCase();

    if (!["on", "off"].includes(value)) {
      await message.reply("Gunakan `sktogglepartnership on` atau `sktogglepartnership off`.");
      return;
    }

    const partnershipEnabled = value === "on";

    const settings = updateGuildSettings(message.guild.id, (current) => ({
      ...current,
      tickets: {
        ...client.config.tickets,
        ...(current.tickets || {}),
        partnershipEnabled
      }
    }));

    const updated = await updatePartnershipPanelMessage(
      message.guild,
      client,
      settings.tickets.partnershipPanelChannelId
    );

    await message.reply(
      partnershipEnabled
        ? `Ticket partnership sekarang aktif.${updated ? " Panel juga sudah diperbarui." : ""}`
        : `Ticket partnership sekarang dinonaktifkan.${updated ? " Panel juga sudah diperbarui." : ""}`
    );
  }
};
