const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { setAutoplay, getAutoplay } = require('../../music/MusicManager');

async function handleAutoplay(client, ctx) {
  const isInteraction = ctx.isChatInputCommand?.();
  const guildId = ctx.guild.id;

  const player = client.lavalink.getPlayer(guildId);
  if (!player) {
    const embed = errorEmbed('No active music player. Start playing something first.');
    return isInteraction ? ctx.reply({ embeds: [embed], ephemeral: true }) : ctx.reply({ embeds: [embed] });
  }

  const current = getAutoplay(guildId);
  const newState = !current;
  setAutoplay(guildId, newState);

  const embed = successEmbed(
    `Autoplay is now **${newState ? 'enabled' : 'disabled'}**.\n${
      newState
        ? 'The bot will automatically add related songs when the queue ends.'
        : 'The bot will stop when the queue ends.'
    }`,
    `🔄 Autoplay ${newState ? 'On' : 'Off'}`
  );
  return isInteraction ? ctx.reply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] });
}

module.exports = {
  name: 'autoplay',
  description: 'Toggle autoplay — automatically adds related songs when queue ends',
  data: new SlashCommandBuilder()
    .setName('autoplay')
    .setDescription('Toggle autoplay mode'),
  async execute(client, ctx) {
    await handleAutoplay(client, ctx);
  },
};
