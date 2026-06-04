const { SlashCommandBuilder } = require('discord.js');
const { queueEmbed, errorEmbed } = require('../../utils/embeds');

async function handleQueue(client, ctx, args) {
  const isInteraction = ctx.isChatInputCommand?.();
  const guildId = ctx.guild.id;

  const player = client.lavalink.getPlayer(guildId);
  if (!player || !player.queue.current) {
    const embed = errorEmbed('The queue is empty. Use `?play` or `/play` to add songs!');
    return isInteraction ? ctx.reply({ embeds: [embed], ephemeral: true }) : ctx.reply({ embeds: [embed] });
  }

  const page = isInteraction ? (ctx.options.getInteger('page') || 1) : (parseInt(args?.[0]) || 1);
  const embed = queueEmbed(player, page);
  return isInteraction ? ctx.reply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] });
}

module.exports = {
  name: 'queue',
  description: 'Show the current music queue',
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Show the current music queue')
    .addIntegerOption((opt) =>
      opt.setName('page').setDescription('Page number').setMinValue(1)
    ),
  async execute(client, ctx, args) {
    await handleQueue(client, ctx, args);
  },
};
