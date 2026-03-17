const { ChannelType } = require("discord.js");

function resolveTextChannel(message, value) {
  if (!value) {
    return message.channel.type === ChannelType.GuildText ? message.channel : null;
  }

  const normalized = value.replace(/[<#>]/g, "");
  const channel = message.guild.channels.cache.get(normalized);

  if (!channel || channel.type !== ChannelType.GuildText) {
    return null;
  }

  return channel;
}

module.exports = {
  resolveTextChannel
};
