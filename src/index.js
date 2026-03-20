const { createBotClient } = require("./core/client");
const { loadCommands } = require("./loaders/commandLoader");
const { loadSlashCommands } = require("./loaders/slashCommandLoader");
const { loadEvents } = require("./loaders/eventLoader");
const { validateConfig } = require("./config");
const { startEmbedBuilderServer } = require("./web/embedBuilderServer");
const { acquireSingleInstanceLock } = require("./utils/singleInstanceLock");

validateConfig();
acquireSingleInstanceLock();

const client = createBotClient();

loadCommands(client);
loadSlashCommands(client);
loadEvents(client);
startEmbedBuilderServer(client);

client.login(client.config.token);
