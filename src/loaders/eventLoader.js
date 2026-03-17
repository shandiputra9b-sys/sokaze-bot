const fs = require("node:fs");
const path = require("node:path");

function loadEvents(client) {
  const eventsRoot = path.join(__dirname, "..", "events");
  const eventFiles = fs.readdirSync(eventsRoot).filter((file) => file.endsWith(".js"));

  for (const file of eventFiles) {
    const filePath = path.join(eventsRoot, file);
    const event = require(filePath);

    if (!event.name || typeof event.execute !== "function") {
      continue;
    }

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
      continue;
    }

    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

module.exports = {
  loadEvents
};
