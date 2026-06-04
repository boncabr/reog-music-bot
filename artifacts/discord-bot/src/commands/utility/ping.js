const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');
const config = require('../../config/config');

async function handlePing(client, ctx) {
  const isInteraction = ctx.isChatInputCommand?.();
  const wsPing = client.ws.ping;
  const start = Date.now();

  const send = async (embed) => {
    if (isInteraction) {
      if (ctx.deferred || ctx.replied) return ctx.editReply({ embeds: [embed] });
      return ctx.reply({ embeds: [embed] });
    }
    return ctx.reply({ embeds: [embed] });
  };

  if (isInteraction) await ctx.deferReply();

  const elapsed = Date.now() - start;
  const lavalinkNode = client.lavalink?.nodeManager?.nodes?.first?.();
  const lavalinkPing = lavalinkNode ? `${lavalinkNode.stats?.ping ?? '?'}ms` : 'N/A';

  const embed = createEmbed({
    color: config.colors.primary,
    title: '🏓 Pong!',
    fields: [
      { name: '📡 WebSocket Latency', value: `${wsPing}ms`, inline: true },
      { name: '⏱ Response Time', value: `${elapsed}ms`, inline: true },
      { name: '🎵 Lavalink Ping', value: lavalinkPing, inline: true },
    ],
  });

  await send(embed);
}

module.exports = {
  name: 'ping',
  description: 'Check bot and Lavalink latency',
  data: new SlashCommandBuilder().setName('ping').setDescription('Check bot latency'),
  async execute(client, ctx) {
    await handlePing(client, ctx);
  },
};
