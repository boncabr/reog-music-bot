const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const config = require('../../config/config');
const logger = require('../../utils/logger');

// ─────────────────────────────────────────────────────────────────────────────
// PRESET DEFINITIONS
// Gain range: -0.25 ~ 1.0 (Lavalink spec). Jaga di bawah 0.35 agar tidak clip.
// speed/pitch: angka float (1.0 = normal). rotationHz: Hz untuk 8D.
// vibrato: { frequency, depth }. lowPass: angka smoothing.
// ─────────────────────────────────────────────────────────────────────────────

const PRESETS = {
  // ── Standard EQ ────────────────────────────────────────────────────────────
  flat: {
    label: 'Flat', emoji: '🎵', style: ButtonStyle.Secondary, color: 0x95a5a6,
    description: 'Reset semua filter ke normal',
    eq: null, speed: null, pitch: null, rotationHz: null, vibrato: null, lowPass: null,
  },
  bass: {
    label: 'Bass Boost', emoji: '🔊', style: ButtonStyle.Danger, color: 0xe74c3c,
    description: 'Sub bass kuat — cocok untuk EDM, Hip-Hop',
    eq: [
      { band: 0, gain: 0.3  }, { band: 1, gain: 0.35 }, { band: 2, gain: 0.3  },
      { band: 3, gain: 0.2  }, { band: 4, gain: 0.0  }, { band: 5, gain: -0.1 },
      { band: 6, gain: -0.05}, { band: 7, gain: 0.0  }, { band: 8, gain: 0.0  },
      { band: 9, gain: 0.05 }, { band: 10, gain: 0.05}, { band: 11, gain: 0.0 },
      { band: 12, gain: 0.0 }, { band: 13, gain: 0.0 }, { band: 14, gain: 0.0 },
    ],
    speed: null, pitch: null, rotationHz: null, vibrato: null, lowPass: null,
  },
  pop: {
    label: 'Pop / Vokal', emoji: '🎤', style: ButtonStyle.Primary, color: 0xe91e8c,
    description: 'Vokal jernih & presence — cocok untuk Pop, K-Pop',
    eq: [
      { band: 0, gain: -0.05}, { band: 1, gain: 0.0  }, { band: 2, gain: 0.05 },
      { band: 3, gain: 0.1  }, { band: 4, gain: 0.15 }, { band: 5, gain: 0.2  },
      { band: 6, gain: 0.18 }, { band: 7, gain: 0.15 }, { band: 8, gain: 0.18 },
      { band: 9, gain: 0.2  }, { band: 10, gain: 0.22}, { band: 11, gain: 0.18},
      { band: 12, gain: 0.15}, { band: 13, gain: 0.1 }, { band: 14, gain: 0.05},
    ],
    speed: null, pitch: null, rotationHz: null, vibrato: null, lowPass: null,
  },
  rock: {
    label: 'Rock', emoji: '🎸', style: ButtonStyle.Primary, color: 0xe67e22,
    description: 'Mid crunch & bass solid — cocok untuk Rock, Metal',
    eq: [
      { band: 0, gain: 0.2  }, { band: 1, gain: 0.15 }, { band: 2, gain: 0.1  },
      { band: 3, gain: 0.05 }, { band: 4, gain: -0.05}, { band: 5, gain: -0.1 },
      { band: 6, gain: 0.0  }, { band: 7, gain: 0.15 }, { band: 8, gain: 0.2  },
      { band: 9, gain: 0.15 }, { band: 10, gain: 0.1 }, { band: 11, gain: 0.08},
      { band: 12, gain: 0.05}, { band: 13, gain: 0.0 }, { band: 14, gain: 0.0 },
    ],
    speed: null, pitch: null, rotationHz: null, vibrato: null, lowPass: null,
  },
  classical: {
    label: 'Classical', emoji: '🎹', style: ButtonStyle.Primary, color: 0x9b59b6,
    description: 'Treble airy & detail — cocok untuk Klasik, Instrumental',
    eq: [
      { band: 0, gain: 0.0  }, { band: 1, gain: 0.0  }, { band: 2, gain: 0.0  },
      { band: 3, gain: 0.0  }, { band: 4, gain: -0.05}, { band: 5, gain: -0.05},
      { band: 6, gain: 0.0  }, { band: 7, gain: 0.0  }, { band: 8, gain: 0.1  },
      { band: 9, gain: 0.12 }, { band: 10, gain: 0.15}, { band: 11, gain: 0.18},
      { band: 12, gain: 0.2 }, { band: 13, gain: 0.18}, { band: 14, gain: 0.15},
    ],
    speed: null, pitch: null, rotationHz: null, vibrato: null, lowPass: null,
  },
  lofi: {
    label: 'Lo-Fi', emoji: '🌊', style: ButtonStyle.Primary, color: 0x1abc9c,
    description: 'Warm & mellow — cocok untuk Lo-Fi, Study, Chill',
    eq: [
      { band: 0, gain: 0.15 }, { band: 1, gain: 0.2  }, { band: 2, gain: 0.15 },
      { band: 3, gain: 0.08 }, { band: 4, gain: 0.0  }, { band: 5, gain: -0.05},
      { band: 6, gain: -0.08}, { band: 7, gain: -0.1 }, { band: 8, gain: -0.1 },
      { band: 9, gain: -0.12}, { band: 10, gain: -0.18},{ band: 11, gain: -0.2},
      { band: 12, gain: -0.2}, { band: 13, gain: -0.18},{ band: 14, gain: -0.15},
    ],
    speed: null, pitch: null, rotationHz: null, vibrato: null, lowPass: 8,
  },
  jazz: {
    label: 'Jazz', emoji: '🎷', style: ButtonStyle.Primary, color: 0xf39c12,
    description: 'Warm mids — cocok untuk Jazz, Blues, Soul',
    eq: [
      { band: 0, gain: 0.08 }, { band: 1, gain: 0.1  }, { band: 2, gain: 0.08 },
      { band: 3, gain: 0.0  }, { band: 4, gain: 0.05 }, { band: 5, gain: 0.12 },
      { band: 6, gain: 0.15 }, { band: 7, gain: 0.12 }, { band: 8, gain: 0.08 },
      { band: 9, gain: 0.05 }, { band: 10, gain: 0.0 }, { band: 11, gain: -0.05},
      { band: 12, gain: -0.08},{ band: 13, gain: -0.08},{ band: 14, gain: -0.05},
    ],
    speed: null, pitch: null, rotationHz: null, vibrato: null, lowPass: null,
  },
  gaming: {
    label: 'Gaming', emoji: '🎮', style: ButtonStyle.Success, color: 0x2ecc71,
    description: 'High clarity & detail — cocok untuk soundtrack game',
    eq: [
      { band: 0, gain: 0.1  }, { band: 1, gain: 0.08 }, { band: 2, gain: 0.0  },
      { band: 3, gain: -0.05}, { band: 4, gain: -0.05}, { band: 5, gain: 0.0  },
      { band: 6, gain: 0.08 }, { band: 7, gain: 0.12 }, { band: 8, gain: 0.15 },
      { band: 9, gain: 0.18 }, { band: 10, gain: 0.2 }, { band: 11, gain: 0.18},
      { band: 12, gain: 0.15}, { band: 13, gain: 0.1 }, { band: 14, gain: 0.08},
    ],
    speed: null, pitch: null, rotationHz: null, vibrato: null, lowPass: null,
  },

  // ── Efek Spesial — Ciri Khas Reog Bot ──────────────────────────────────────
  malam_minggu: {
    label: 'Malam Minggu', emoji: '🌃', style: ButtonStyle.Secondary, color: 0x2c3e7a,
    description: '✨ Slow & hangat — feel malam Minggu bareng gebetan',
    eq: [
      { band: 0, gain: 0.15 }, { band: 1, gain: 0.2  }, { band: 2, gain: 0.15 },
      { band: 3, gain: 0.08 }, { band: 4, gain: 0.0  }, { band: 5, gain: 0.05 },
      { band: 6, gain: 0.1  }, { band: 7, gain: 0.08 }, { band: 8, gain: 0.05 },
      { band: 9, gain: 0.0  }, { band: 10, gain: -0.05},{ band: 11, gain: -0.08},
      { band: 12, gain: -0.08},{ band: 13, gain: -0.05},{ band: 14, gain: 0.0 },
    ],
    speed: 0.92, pitch: 0.97, rotationHz: null, vibrato: null, lowPass: null,
  },
  audio_8d: {
    label: '8D Audio', emoji: '🎡', style: ButtonStyle.Secondary, color: 0x8e44ad,
    description: '✨ Suara berputar di telinga — pakai headset!',
    eq: null,
    speed: null, pitch: null, rotationHz: 0.2, vibrato: null, lowPass: null,
  },
  nightcore: {
    label: 'Nightcore', emoji: '🚀', style: ButtonStyle.Secondary, color: 0x3498db,
    description: '✨ Speed up + pitch naik — anime/EDM vibe',
    eq: [
      { band: 0, gain: 0.0  }, { band: 1, gain: 0.0  }, { band: 2, gain: -0.05},
      { band: 3, gain: -0.05}, { band: 4, gain: 0.0  }, { band: 5, gain: 0.0  },
      { band: 6, gain: 0.05 }, { band: 7, gain: 0.08 }, { band: 8, gain: 0.1  },
      { band: 9, gain: 0.12 }, { band: 10, gain: 0.12},{ band: 11, gain: 0.1 },
      { band: 12, gain: 0.08},{ band: 13, gain: 0.05},{ band: 14, gain: 0.0  },
    ],
    speed: 1.25, pitch: 1.25, rotationHz: null, vibrato: null, lowPass: null,
  },
  ghost: {
    label: 'Ghost Mode', emoji: '👻', style: ButtonStyle.Secondary, color: 0x4a4a6a,
    description: '✨ Pitch turun + gemetar — nuansa horror/misteri',
    eq: [
      { band: 0, gain: 0.2  }, { band: 1, gain: 0.15 }, { band: 2, gain: 0.1  },
      { band: 3, gain: 0.0  }, { band: 4, gain: -0.05}, { band: 5, gain: -0.08},
      { band: 6, gain: -0.05}, { band: 7, gain: 0.0  }, { band: 8, gain: -0.05},
      { band: 9, gain: -0.08},{ band: 10, gain: -0.1 },{ band: 11, gain: -0.12},
      { band: 12, gain: -0.12},{ band: 13, gain: -0.1 },{ band: 14, gain: -0.05},
    ],
    speed: 0.88, pitch: 0.75, rotationHz: null, vibrato: { frequency: 4.0, depth: 0.6 }, lowPass: null,
  },
  koplo: {
    label: 'Koplo Turbo', emoji: '🎭', style: ButtonStyle.Secondary, color: 0xc0392b,
    description: '✨ Speed up + bass kenceng — feel Dangdut Koplo!',
    eq: [
      { band: 0, gain: 0.3  }, { band: 1, gain: 0.35 }, { band: 2, gain: 0.3  },
      { band: 3, gain: 0.15 }, { band: 4, gain: 0.05 }, { band: 5, gain: 0.0  },
      { band: 6, gain: 0.05 }, { band: 7, gain: 0.08 }, { band: 8, gain: 0.08 },
      { band: 9, gain: 0.05 }, { band: 10, gain: 0.0 },{ band: 11, gain: 0.0  },
      { band: 12, gain: 0.0 },{ band: 13, gain: 0.0  },{ band: 14, gain: 0.0  },
    ],
    speed: 1.18, pitch: 1.0, rotationHz: null, vibrato: null, lowPass: null,
  },
  vaporwave: {
    label: 'Vaporwave', emoji: '💜', style: ButtonStyle.Secondary, color: 0x9b59b6,
    description: '✨ Slow + pitch turun — aesthetic retro 80s',
    eq: [
      { band: 0, gain: 0.1  }, { band: 1, gain: 0.15 }, { band: 2, gain: 0.12 },
      { band: 3, gain: 0.08 }, { band: 4, gain: 0.05 }, { band: 5, gain: 0.08 },
      { band: 6, gain: 0.1  }, { band: 7, gain: 0.08 }, { band: 8, gain: 0.0  },
      { band: 9, gain: -0.05},{ band: 10, gain: -0.1 },{ band: 11, gain: -0.15},
      { band: 12, gain: -0.15},{ band: 13, gain: -0.1 },{ band: 14, gain: -0.08},
    ],
    speed: 0.8, pitch: 0.85, rotationHz: null, vibrato: null, lowPass: null,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// BUILD BUTTON ROWS (maks 5 tombol per baris)
// ─────────────────────────────────────────────────────────────────────────────

function buildEqRows() {
  const keys = Object.keys(PRESETS);
  const rows = [];
  for (let i = 0; i < keys.length; i += 5) {
    const chunk = keys.slice(i, i + 5);
    const row = new ActionRowBuilder().addComponents(
      chunk.map((key) => {
        const p = PRESETS[key];
        return new ButtonBuilder()
          .setCustomId(`eq:${key}`)
          .setLabel(p.label)
          .setEmoji(p.emoji)
          .setStyle(p.style);
      })
    );
    rows.push(row);
  }
  return rows;
}

function buildEqMenuEmbed() {
  const standardKeys = ['flat','bass','pop','rock','classical','lofi','jazz','gaming'];
  const specialKeys  = ['malam_minggu','audio_8d','nightcore','ghost','koplo','vaporwave'];

  const stdLines = standardKeys.map(k => `${PRESETS[k].emoji} **${PRESETS[k].label}** — ${PRESETS[k].description}`);
  const spcLines = specialKeys.map(k => `${PRESETS[k].emoji} **${PRESETS[k].label}** — ${PRESETS[k].description}`);

  return new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTitle('🎛️ Reog EQ & Sound Effects')
    .setDescription(
      '**🎚️ Pilih preset dengan tombol di bawah ini!**\n\n' +
      '**── Standard EQ ──**\n' + stdLines.join('\n') +
      '\n\n**── 🌟 Efek Spesial Ciri Khas Reog ──**\n' + spcLines.join('\n')
    )
    .setFooter({ text: 'Tekan tombol untuk menerapkan preset' })
    .setTimestamp();
}

// ─────────────────────────────────────────────────────────────────────────────
// APPLY PRESET — menggunakan API lavalink-client v2 yang benar
// ─────────────────────────────────────────────────────────────────────────────

async function applyPreset(player, presetKey) {
  const preset = PRESETS[presetKey];
  if (!preset) throw new Error(`Preset "${presetKey}" tidak ditemukan.`);

  const fm = player.filterManager;

  // 1. Reset semua filter ke default dulu
  await fm.resetFilters();

  // 2. Apply EQ bands (jika bukan flat)
  if (preset.eq) {
    await fm.setEQ(preset.eq);
  }

  // 3. Apply timescale — setSpeed & setPitch secara terpisah
  if (preset.speed != null) {
    await fm.setSpeed(preset.speed);
  }
  if (preset.pitch != null) {
    await fm.setPitch(preset.pitch);
  }

  // 4. Apply 8D rotation — toggleRotation(hz)
  if (preset.rotationHz != null) {
    await fm.toggleRotation(preset.rotationHz);
  }

  // 5. Apply vibrato — toggleVibrato(frequency, depth)
  if (preset.vibrato != null) {
    await fm.toggleVibrato(preset.vibrato.frequency, preset.vibrato.depth);
  }

  // 6. Apply low pass — toggleLowPass(smoothing)
  if (preset.lowPass != null) {
    await fm.toggleLowPass(preset.lowPass);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BUTTON HANDLER — dipanggil dari interactionCreate.js
// ─────────────────────────────────────────────────────────────────────────────

async function handleEqButton(client, interaction) {
  const presetKey = interaction.customId.replace('eq:', '');
  const preset = PRESETS[presetKey];
  if (!preset) return interaction.reply({ content: '❌ Preset tidak dikenal.', ephemeral: true });

  const guildId = interaction.guild?.id;
  const player = guildId ? client.lavalink.getPlayer(guildId) : null;

  if (!player || (!player.playing && !player.paused)) {
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Tidak ada lagu yang sedang diputar.')],
      ephemeral: true,
    });
  }

  const member = interaction.member;
  if (!member?.voice?.channelId || member.voice.channelId !== player.voiceChannelId) {
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription('❌ Kamu harus berada di voice channel yang sama dengan bot.')],
      ephemeral: true,
    });
  }

  await interaction.deferReply();

  try {
    await applyPreset(player, presetKey);

    const isSpecial = ['malam_minggu','audio_8d','nightcore','ghost','koplo','vaporwave'].includes(presetKey);

    const embed = new EmbedBuilder()
      .setColor(preset.color)
      .setTitle(`${preset.emoji} ${preset.label} — Aktif!`)
      .setDescription(
        `✅ Preset **${preset.label}** berhasil diterapkan!\n\n> ${preset.description}` +
        (presetKey === 'audio_8d' ? '\n\n💡 Pakai **headset/earphone** untuk efek terbaik!' : '') +
        (isSpecial ? '\n\n🌟 *Efek spesial ciri khas Reog Bot*' : '')
      )
      .setFooter({ text: `Diminta oleh ${interaction.user.username}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    logger.info(`EQ preset "${presetKey}" applied in guild ${guildId} by ${interaction.user.tag}`);
  } catch (err) {
    logger.error(`EQ apply error [${presetKey}]: ${err.message}`);
    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor(config.colors.error).setDescription(`❌ Gagal menerapkan preset: ${err.message}`)],
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMAND HANDLER
// ─────────────────────────────────────────────────────────────────────────────

async function handleEq(client, ctx) {
  const isInteraction = ctx.isChatInputCommand?.();
  const guildId = ctx.guild.id;

  const player = client.lavalink.getPlayer(guildId);
  if (!player || (!player.playing && !player.paused)) {
    const embed = new EmbedBuilder().setColor(config.colors.error)
      .setTitle('❌ Error').setDescription('Tidak ada lagu yang sedang diputar.');
    return isInteraction
      ? ctx.reply({ embeds: [embed], ephemeral: true })
      : ctx.reply({ embeds: [embed] });
  }

  const member = ctx.member;
  if (!member.voice?.channelId || member.voice.channelId !== player.voiceChannelId) {
    const embed = new EmbedBuilder().setColor(config.colors.error)
      .setTitle('❌ Error').setDescription('Kamu harus berada di voice channel yang sama dengan bot.');
    return isInteraction
      ? ctx.reply({ embeds: [embed], ephemeral: true })
      : ctx.reply({ embeds: [embed] });
  }

  const menuEmbed = buildEqMenuEmbed();
  const rows = buildEqRows();

  return isInteraction
    ? ctx.reply({ embeds: [menuEmbed], components: rows })
    : ctx.reply({ embeds: [menuEmbed], components: rows });
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  name: 'eq',
  description: 'Buka menu EQ & efek spesial dengan tombol interaktif',
  cooldown: config.cooldowns.default,
  handleEqButton,

  data: new SlashCommandBuilder()
    .setName('eq')
    .setDescription('Buka menu EQ & efek spesial dengan tombol interaktif'),

  async execute(client, ctx) {
    await handleEq(client, ctx);
  },
};
