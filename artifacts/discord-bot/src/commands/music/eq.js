const { SlashCommandBuilder } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');
const config = require('../../config/config');

// 🎚️ Smiley Curve EQ — bass & treble boost, mid flat
const SMILEY_EQ = [
  { band: 0,  gain: 0.0  }, // 25 Hz
  { band: 1,  gain: 0.2  }, // 40 Hz
  { band: 2,  gain: 0.3  }, // 63 Hz
  { band: 3,  gain: 0.2  }, // 100 Hz
  { band: 4,  gain: 0.0  }, // 160 Hz
  { band: 5,  gain: -0.1 }, // 250 Hz
  { band: 6,  gain: 0.0  }, // 400 Hz
  { band: 7,  gain: 0.1  }, // 630 Hz
  { band: 8,  gain: 0.0  }, // 1 kHz
  { band: 9,  gain: 0.1  }, // 1.6 kHz
  { band: 10, gain: 0.2  }, // 2.5 kHz
  { band: 11, gain: 0.2  }, // 4 kHz
  { band: 12, gain: 0.1  }, // 6.3 kHz
  { band: 13, gain: 0.3  }, // 10 kHz
  { band: 14, gain: 0.2  }, // 16 kHz
];

async function sendChannelNotif(client, player, text) {
  try {
    const channelId = player.textChannelId;
    if (!channelId) return;
    const ch = await client.channels.fetch(channelId).catch(() => null);
    if (ch?.isTextBased()) await ch.send(text);
  } catch (_) {}
}

async function handleEq(client, ctx, modeArg) {
  const isInteraction = ctx.isChatInputCommand?.();
  const guildId = ctx.guild.id;

  const player = client.lavalink.getPlayer(guildId);
  if (!player || (!player.playing && !player.paused)) {
    const embed = errorEmbed('Tidak ada lagu yang sedang diputar.');
    return isInteraction
      ? ctx.reply({ embeds: [embed], ephemeral: true })
      : ctx.reply({ embeds: [embed] });
  }

  const member = ctx.member;
  if (!member.voice?.channelId || member.voice.channelId !== player.voiceChannelId) {
    const embed = errorEmbed('Kamu harus berada di voice channel yang sama dengan bot.');
    return isInteraction
      ? ctx.reply({ embeds: [embed], ephemeral: true })
      : ctx.reply({ embeds: [embed] });
  }

  const mode = (modeArg || '').toLowerCase();
  const user = ctx.member?.user ?? ctx.user;

  if (mode === 'on') {
    await player.filterManager.setEQ(SMILEY_EQ);

    const embed = createEmbed({
      color: config.colors.success,
      title: '🎚️ EQ All Genre — ON',
      description:
        '✅ Setting EQ **Smiley Curve** berhasil diterapkan!\n\n' +
        '🔵 **Bass diboost** — 40–100 Hz\n' +
        '🟡 **Mid flat/sedikit cut** — 250–400 Hz\n' +
        '🟢 **Treble diboost** — 2.5–16 kHz',
    });
    await (isInteraction ? ctx.reply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] }));

    // Notifikasi singkat ke channel
    await sendChannelNotif(client, player, `🎚️ **EQ Smiley Curve diaktifkan** oleh ${user}`);
    return;
  }

  if (mode === 'off') {
    await player.filterManager.clearEQ();

    const embed = createEmbed({
      color: config.colors.error,
      title: '🎚️ EQ — OFF',
      description: '✅ EQ berhasil direset ke **flat** (normal).',
    });
    await (isInteraction ? ctx.reply({ embeds: [embed] }) : ctx.reply({ embeds: [embed] }));

    // Notifikasi singkat ke channel
    await sendChannelNotif(client, player, `🎚️ **EQ direset ke flat** oleh ${user}`);
    return;
  }

  const embed = errorEmbed('Gunakan `!eq on` atau `!eq off`');
  return isInteraction
    ? ctx.reply({ embeds: [embed], ephemeral: true })
    : ctx.reply({ embeds: [embed] });
}

module.exports = {
  name: 'eq',
  description: 'Aktifkan/matikan EQ Smiley Curve (bass & treble boost)',
  cooldown: config.cooldowns.default,
  data: new SlashCommandBuilder()
    .setName('eq')
    .setDescription('Aktifkan/matikan EQ Smiley Curve (bass & treble boost)')
    .addStringOption((opt) =>
      opt
        .setName('mode')
        .setDescription('on = aktifkan EQ, off = reset flat')
        .setRequired(true)
        .addChoices(
          { name: '🟢 ON — Smiley Curve', value: 'on' },
          { name: '🔴 OFF — Flat (normal)', value: 'off' }
        )
    ),

  async execute(client, ctx, args) {
    const modeArg = ctx.isChatInputCommand?.()
      ? ctx.options.getString('mode')
      : args?.[0];
    await handleEq(client, ctx, modeArg);
  },
};