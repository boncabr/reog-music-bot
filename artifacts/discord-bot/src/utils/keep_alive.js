const express = require('express');
const config = require('../config/config');
const logger = require('./logger');

function keepAlive() {
  const app = express();
  const basePort = config.keepAlive.port;

  const statusHandler = (req, res) => {
    res.json({
      status: 'online',
      bot: 'Discord Music Bot',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  };

  const pingHandler = (req, res) => {
    res.json({ pong: true, latency: Date.now() });
  };

  const healthHandler = (req, res) => {
    res.json({ healthy: true });
  };

  app.get('/', statusHandler);
  app.get('/ping', pingHandler);
  app.get('/health', healthHandler);

  app.get('/bot', statusHandler);
  app.get('/bot/', statusHandler);
  app.get('/bot/ping', pingHandler);
  app.get('/bot/health', healthHandler);

  function tryListen(port, attempts) {
    const server = app.listen(port, '0.0.0.0', () => {
      logger.info(`Keep-alive server running on port ${port}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.warn(`Port ${port} already in use — trying port ${port + 1}...`);
        if (attempts < 5) {
          tryListen(port + 1, attempts + 1);
        } else {
          logger.error(`Keep-alive: could not find a free port after ${attempts} attempts`);
        }
      } else {
        logger.error(`Keep-alive server error: ${err.message}`);
      }
    });

    return server;
  }

  return tryListen(basePort, 0);
}

module.exports = { keepAlive };
