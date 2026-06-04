const { checkCooldown } = require('../utils/cooldown');
const { errorEmbed } = require('../utils/embeds');
const { handleCommandError } = require('../utils/errorHandler');
const config = require('../config/config');
const logger = require('../utils/logger');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    const cooldownMs = command.cooldown ?? config.cooldowns.default;
    const { onCooldown, remaining } = checkCooldown(
      interaction.user.id,
      interaction.commandName,
      cooldownMs
    );

    if (onCooldown) {
      return interaction.reply({
        embeds: [errorEmbed(`Please wait **${remaining}s** before using this command again.`)],
        ephemeral: true,
      });
    }

    try {
      await command.execute(client, interaction);
    } catch (err) {
      await handleCommandError(interaction, err);
      logger.error(`Slash command error [${interaction.commandName}]: ${err.stack}`);
    }
  },
};
