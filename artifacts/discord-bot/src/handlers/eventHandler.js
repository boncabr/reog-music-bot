const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

async function loadEvents(client) {
  const eventsPath = path.join(__dirname, '..', 'events');
  const files = fs
    .readdirSync(eventsPath)
    .filter((f) => f.endsWith('.js') && fs.statSync(path.join(eventsPath, f)).isFile());

  for (const file of files) {
    try {
      const event = require(path.join(eventsPath, file));
      if (!event.name) {
        logger.warn(`Event file ${file} is missing a name property`);
        continue;
      }
      if (event.once) {
        client.once(event.name, (...args) => event.execute(client, ...args));
      } else {
        client.on(event.name, (...args) => event.execute(client, ...args));
      }
      logger.debug(`Loaded event: ${event.name}`);
    } catch (err) {
      logger.error(`Failed to load event ${file}: ${err.message}`);
    }
  }

  logger.info(`Loaded ${files.length} client event(s)`);
}

module.exports = { loadEvents };
