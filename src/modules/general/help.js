module.exports = {
  name: "help",
  description: "Menampilkan daftar command yang tersedia.",
  aliases: ["commands"],
  category: "general",
  async execute(message, args, client) {
    const categorized = new Map();

    for (const command of client.commands.values()) {
      if (command.category === "tickets") {
        continue;
      }

      if (!categorized.has(command.category)) {
        categorized.set(command.category, []);
      }

      categorized.get(command.category).push(command);
    }

    const sections = [...categorized.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([category, commands]) => {
        const lines = commands
          .sort((left, right) => left.name.localeCompare(right.name))
          .map((command) => {
            const usage = command.usage ? ` | \`${client.config.prefix}${command.usage}\`` : "";
            return `\`${client.config.prefix}${command.name}\` - ${command.description || "Tanpa deskripsi"}${usage}`;
          })
          .join("\n");

        return `**${category.toUpperCase()}**\n${lines}`;
      })
      .join("\n\n");

    await message.reply({
      content: `Daftar command:\n\n${sections}`
    });
  }
};
