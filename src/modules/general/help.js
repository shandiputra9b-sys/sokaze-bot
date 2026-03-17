const { EmbedBuilder } = require("discord.js");

const CATEGORY_META = {
  general: {
    label: "General",
    emoji: "✨",
    description: "Command umum untuk penggunaan harian bot."
  },
  moderation: {
    label: "Moderation",
    emoji: "🛡️",
    description: "Command untuk warn, timeout, kick, ban, dan panel moderasi."
  },
  admin: {
    label: "Admin",
    emoji: "⚙️",
    description: "Command setup dan konfigurasi server."
  },
  tickets: {
    label: "Tickets",
    emoji: "🎫",
    description: "Command panel dan template layanan ticket."
  }
};

function getCategoryMeta(category) {
  return CATEGORY_META[category] || {
    label: category.charAt(0).toUpperCase() + category.slice(1),
    emoji: "📁",
    description: "Kategori command."
  };
}

function getGroupedCommands(client) {
  const grouped = new Map();

  for (const command of client.commands.values()) {
    if (!grouped.has(command.category)) {
      grouped.set(command.category, []);
    }

    grouped.get(command.category).push(command);
  }

  return grouped;
}

function findCategoryInput(input, grouped) {
  if (!input) {
    return null;
  }

  const normalized = input.toLowerCase().trim();

  for (const category of grouped.keys()) {
    if (category === normalized) {
      return category;
    }

    const meta = getCategoryMeta(category);

    if (meta.label.toLowerCase() === normalized) {
      return category;
    }
  }

  return null;
}

function formatCommandLine(command, prefix) {
  const aliases = command.aliases?.length ? ` | alias: ${command.aliases.join(", ")}` : "";
  const usage = command.usage ? `\`${prefix}${command.usage}\`` : `\`${prefix}${command.name}\``;

  return [
    `${usage}`,
    `${command.description || "Tanpa deskripsi"}${aliases}`
  ].join("\n");
}

function buildHelpIndexEmbed(client, grouped) {
  const embed = new EmbedBuilder()
    .setColor("#111111")
    .setTitle("Help Center")
    .setDescription(
      [
        "Daftar command sekarang dibagi per kategori supaya lebih rapi.",
        `Gunakan \`${client.config.prefix}help <kategori>\` untuk lihat detail command dalam satu kategori.`
      ].join("\n")
    )
    .setTimestamp();

  const fields = [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([category, commands]) => {
      const meta = getCategoryMeta(category);

      return {
        name: `${meta.emoji} ${meta.label}`,
        value: [
          meta.description,
          `Jumlah command: **${commands.length}**`,
          `Lihat detail: \`${client.config.prefix}help ${category}\``
        ].join("\n"),
        inline: false
      };
    });

  embed.addFields(fields);
  return embed;
}

function buildCategoryEmbed(client, category, commands) {
  const meta = getCategoryMeta(category);
  const embed = new EmbedBuilder()
    .setColor(category === "moderation" ? "#111827" : "#111111")
    .setTitle(`${meta.emoji} ${meta.label} Commands`)
    .setDescription(meta.description)
    .setFooter({
      text: `Gunakan ${client.config.prefix}help untuk kembali ke daftar kategori.`
    })
    .setTimestamp();

  const lines = commands
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((command) => formatCommandLine(command, client.config.prefix));

  const chunks = [];
  let currentChunk = "";

  for (const line of lines) {
    const nextChunk = currentChunk ? `${currentChunk}\n\n${line}` : line;

    if (nextChunk.length > 1024) {
      chunks.push(currentChunk);
      currentChunk = line;
      continue;
    }

    currentChunk = nextChunk;
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  chunks.forEach((chunk, index) => {
    embed.addFields({
      name: index === 0 ? "Commands" : `Commands ${index + 1}`,
      value: chunk,
      inline: false
    });
  });

  return embed;
}

module.exports = {
  name: "help",
  description: "Menampilkan daftar command per kategori.",
  aliases: ["commands"],
  category: "general",
  usage: "help [kategori]",
  async execute(message, args, client) {
    const grouped = getGroupedCommands(client);
    const requestedCategory = findCategoryInput(args[0], grouped);

    if (!args[0]) {
      await message.reply({
        embeds: [buildHelpIndexEmbed(client, grouped)]
      });
      return;
    }

    if (!requestedCategory) {
      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("#ef4444")
            .setTitle("Kategori Tidak Ditemukan")
            .setDescription(
              [
                `Kategori \`${args[0]}\` tidak tersedia.`,
                `Gunakan \`${client.config.prefix}help\` untuk lihat daftar kategori.`
              ].join("\n")
            )
            .setTimestamp()
        ]
      });
      return;
    }

    await message.reply({
      embeds: [buildCategoryEmbed(client, requestedCategory, grouped.get(requestedCategory))]
    });
  }
};
