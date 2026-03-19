const { createBotClient } = require("./core/client");
const { loadCommands } = require("./loaders/commandLoader");
const { loadSlashCommands } = require("./loaders/slashCommandLoader");
const { loadEvents } = require("./loaders/eventLoader");
const { validateConfig } = require("./config");
const { startEmbedBuilderServer } = require("./web/embedBuilderServer");

validateConfig();

const client = createBotClient();

loadCommands(client);
loadSlashCommands(client);
loadEvents(client);
startEmbedBuilderServer(client);

client.login(client.config.token);
