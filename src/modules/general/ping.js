module.exports = {
  name: "ping",
  description: "Cek apakah bot merespons.",
  category: "general",
  async execute(message) {
    const sentMessage = await message.reply("Pinging...");
    const latency = sentMessage.createdTimestamp - message.createdTimestamp;

    await sentMessage.edit(`Pong! Latency: ${latency}ms`);
  }
};
