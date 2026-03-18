const CATEGORY_META = {
  general: {
    label: "General",
    marker: "[*]",
    description: "Command umum untuk penggunaan harian bot."
  },
  moderation: {
    label: "Moderation",
    marker: "[MOD]",
    description: "Command untuk warn, timeout, kick, ban, dan panel moderasi."
  },
  streak: {
    label: "Streak",
    marker: "[STR]",
    description: "Command untuk melihat info streak dan fitur pasangan streak."
  },
  automod: {
    label: "Automod",
    marker: "[AUTO]",
    description: "Command untuk menyiapkan dan menyalakan rule automod."
  },
  admin: {
    label: "Admin",
    marker: "[ADM]",
    description: "Command setup dan konfigurasi server."
  },
  tickets: {
    label: "Tickets",
    marker: "[TIX]",
    description: "Command panel dan template layanan ticket."
  }
};

const MAX_MESSAGE_LENGTH = 1900;

function getCategoryMeta(category) {
  return CATEGORY_META[category] || {
    label: category.charAt(0).toUpperCase() + category.slice(1),
    marker: "[CAT]",
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

function formatCommandBlock(command, prefix) {
  const usage = command.usage ? `${prefix}${command.usage}` : `${prefix}${command.name}`;
  const lines = [
    `- \`${usage}\``,
    `  ${command.description || "Tanpa deskripsi"}`
  ];

  if (command.aliases?.length) {
    lines.push(`  Alias: ${command.aliases.join(", ")}`);
  }

  return lines.join("\n");
}

function buildIndexText(client, grouped) {
  const lines = [
    "Daftar kategori command:",
    ""
  ];

  for (const [category, commands] of [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const meta = getCategoryMeta(category);
    lines.push(`${meta.marker} ${meta.label} (\`${category}\`)`);
    lines.push(`- ${meta.description}`);
    lines.push(`- Jumlah command: ${commands.length}`);
    lines.push(`- Lihat detail: \`${client.config.prefix}help ${category}\``);
    lines.push("");
  }

  lines.push(`Gunakan \`${client.config.prefix}help <kategori>\` untuk membuka daftar command dalam kategori tertentu.`);

  return lines.join("\n").trim();
}

function buildCategoryChunks(client, category, commands) {
  const meta = getCategoryMeta(category);
  const blocks = commands
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((command) => formatCommandBlock(command, client.config.prefix));

  const chunks = [];
  let part = 1;
  let current = [
    `${meta.marker} ${meta.label} Commands`,
    meta.description,
    "",
    `Gunakan \`${client.config.prefix}help\` untuk lihat kategori lain.`
  ].join("\n");

  for (const block of blocks) {
    const candidate = `${current}\n\n${block}`;

    if (candidate.length <= MAX_MESSAGE_LENGTH) {
      current = candidate;
      continue;
    }

    chunks.push(current);
    part += 1;
    current = [
      `${meta.marker} ${meta.label} Commands (Lanjutan ${part})`,
      meta.description,
      "",
      block
    ].join("\n");
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

async function sendTextChunks(message, chunks) {
  if (!chunks.length) {
    return;
  }

  await message.reply(chunks[0]);

  for (const chunk of chunks.slice(1)) {
    await message.channel.send(chunk);
  }
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
      await message.reply(buildIndexText(client, grouped));
      return;
    }

    if (!requestedCategory) {
      await message.reply(
        [
          `Kategori \`${args[0]}\` tidak tersedia.`,
          `Gunakan \`${client.config.prefix}help\` untuk lihat daftar kategori.`
        ].join("\n")
      );
      return;
    }

    await sendTextChunks(message, buildCategoryChunks(client, requestedCategory, grouped.get(requestedCategory)));
  }
};
