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

function loadCommands(client) {
  const commandsRoot = path.join(__dirname, "..", "modules");
  const commandFiles = getJavaScriptFiles(commandsRoot);

  for (const filePath of commandFiles) {
    const command = require(filePath);

    if (!command.name || typeof command.execute !== "function") {
      continue;
    }

    const normalized = {
      category: command.category || "general",
      aliases: [],
      ...command
    };

    client.commands.set(normalized.name, normalized);
    client.commandIndex.set(normalized.name, normalized);

    for (const alias of normalized.aliases) {
      client.commandIndex.set(alias, normalized);
    }
  }
}

module.exports = {
  loadCommands
};
