const fs = require("node:fs");
const path = require("node:path");

function getJavaScriptFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return getJavaScriptFiles(entryPath);
    }

    return entry.name.endsWith(".js") ? [entryPath] : [];
  });
}

function normalizeSlashData(slashData) {
  if (!slashData) {
    return null;
  }

  return typeof slashData.toJSON === "function" ? slashData.toJSON() : slashData;
}

function loadSlashCommands(client) {
  const commandsRoot = path.join(__dirname, "..", "modules");
  const commandFiles = getJavaScriptFiles(commandsRoot);

  for (const filePath of commandFiles) {
    const command = require(filePath);

    if (!command.slashData || typeof command.executeSlash !== "function") {
      continue;
    }

    const data = normalizeSlashData(command.slashData);

    if (!data?.name) {
      continue;
    }

    client.slashCommands.set(data.name, {
      ...command,
      data
    });
  }
}

async function syncGuildSlashCommands(guild, commands) {
  await guild.commands.set(commands);
}

async function syncSlashCommands(client) {
  const commands = [...client.slashCommands.values()].map((command) => command.data);

  if (!commands.length) {
    return {
      syncedGuilds: 0,
      commandCount: 0
    };
  }

  const guilds = [...client.guilds.cache.values()];
  const results = await Promise.allSettled(
    guilds.map((guild) => syncGuildSlashCommands(guild, commands))
  );
  const syncedGuilds = results.filter((result) => result.status === "fulfilled").length;

  return {
    syncedGuilds,
    commandCount: commands.length
  };
}

module.exports = {
  loadSlashCommands,
  syncSlashCommands
};
