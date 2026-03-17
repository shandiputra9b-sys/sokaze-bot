const { createBotClient } = require("./core/client");
const { loadCommands } = require("./loaders/commandLoader");
const { loadEvents } = require("./loaders/eventLoader");
const { validateConfig } = require("./config");

validateConfig();

const client = createBotClient();

loadCommands(client);
loadEvents(client);

client.login(client.config.token);
