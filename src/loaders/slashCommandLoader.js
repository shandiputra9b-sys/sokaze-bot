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

    if (command.adminOnly || command.botOwnerOnly) {
      delete data.default_member_permissions;
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

async function fetchClientGuilds(client) {
  const fetchedGuilds = await client.guilds.fetch().catch(() => null);
  const guildIds = fetchedGuilds
    ? [...fetchedGuilds.keys()]
    : [...client.guilds.cache.keys()];

  const resolvedGuilds = await Promise.all(
    guildIds.map(async (guildId) => client.guilds.cache.get(guildId)
      || await client.guilds.fetch(guildId).catch(() => null))
  );

  return resolvedGuilds.filter(Boolean);
}

async function syncSlashCommands(client) {
  const commands = [...client.slashCommands.values()].map((command) => command.data);

  if (!commands.length) {
    return {
      syncedGuilds: 0,
      attemptedGuilds: 0,
      failedGuilds: [],
      commandCount: 0
    };
  }

  const guilds = await fetchClientGuilds(client);
  const results = await Promise.allSettled(
    guilds.map((guild) => syncGuildSlashCommands(guild, commands))
  );
  const syncedGuilds = results.filter((result) => result.status === "fulfilled").length;
  const failedGuilds = results.flatMap((result, index) => {
    if (result.status === "fulfilled") {
      return [];
    }

    const guild = guilds[index];

    return [
      {
        id: guild.id,
        name: guild.name,
        reason: result.reason?.message || String(result.reason)
      }
    ];
  });

  return {
    syncedGuilds,
    attemptedGuilds: guilds.length,
    failedGuilds,
    commandCount: commands.length
  };
}

module.exports = {
  loadSlashCommands,
  syncSlashCommands
};
