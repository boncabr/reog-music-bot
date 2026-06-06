const logger = require('../utils/logger');
const config = require('../config/config');

const autoplayMap = new Map();
const musicCacheMap = new Map();
const radioModeMap = new Map();
const seedMap = new Map();            // { title, author, uri } — seed lagu terakhir user/autoplay
const autoplayHistoryMap = new Map(); // Set<uri> — URI yang sudah diputar dalam satu sesi autoplay

// ─── Radio Mode ───────────────────────────────────────────────────────────────

function setRadioMode(guildId, enabled) { radioModeMap.set(guildId, enabled); }
function isRadioMode(guildId) { return radioModeMap.get(guildId) === true; }

// ─── Player Management ───────────────────────────────────────────────────────

async function getOrCreatePlayer(client, guildId, voiceChannelId, textChannelId) {
  const nodes = client.lavalink.nodeManager?.nodes;
  const connectedNodes = nodes ? [...nodes.values()].filter((n) => n.connected) : [];
  if (connectedNodes.length === 0) {
    throw new Error(
      'Server musik sedang tidak tersedia (semua node Lavalink offline). ' +
      'Coba lagi dalam beberapa detik.'
    );
  }

  let player = client.lavalink.getPlayer(guildId);

  if (!player) {
    player = await client.lavalink.createPlayer({
      guildId,
      voiceChannelId,
      textChannelId,
      selfDeaf: true,
      selfMute: false,
      volume: config.music.defaultVolume,
      instaUpdateFiltersFix: false,
    });
  } else {
    if (voiceChannelId && player.voiceChannelId !== voiceChannelId) {
      player.voiceChannelId = voiceChannelId;
    }
    if (textChannelId) {
      player.textChannelId = textChannelId;
    }
  }

  if (!player.connected) {
    await player.connect();
  }

  return player;
}

// ─── Search & Play ───────────────────────────────────────────────────────────

async function search(player, query, requester) {
  const isUrl = /^https?:\/\//i.test(query);
  const isSpotify = /open\.spotify\.com/i.test(query);
  const isSoundCloud = /soundcloud\.com/i.test(query);
  const isYoutube = /youtube\.com|youtu\.be/i.test(query);

  let source = config.music.searchPlatform;
  if (isSpotify) source = 'spsearch';
  else if (isSoundCloud) source = 'scsearch';
  else if (isYoutube || isUrl) source = undefined;

  let result;
  try {
    result = await player.search({ query, source }, requester);
  } catch (err) {
    logger.warn(`Primary search failed (${source}): ${err.message}. Trying fallback...`);
    try {
      result = await player.search({ query, source: 'ytsearch' }, requester);
    } catch (fallbackErr) {
      logger.error(`Fallback search also failed: ${fallbackErr.message}`);
      throw new Error('Tidak ada hasil yang ditemukan. Coba query yang berbeda.');
    }
  }

  return result;
}

async function play(player, tracks) {
  if (!tracks || tracks.length === 0) return;
  await player.queue.add(tracks);
  if (!player.playing && !player.paused) {
    await player.play({ volume: player.volume || config.music.defaultVolume });
  }
}

// ─── Voice Status ─────────────────────────────────────────────────────────────

async function setVoiceStatus(client, guildId, channelId, status) {
  try {
    await client.rest.put(`/channels/${channelId}/voice-status`, {
      body: { status: status || '' },
    });
  } catch (err) {
    logger.debug(`Could not set voice status: ${err.message}`);
  }
}

// ─── Autoplay ─────────────────────────────────────────────────────────────────

function setAutoplay(guildId, enabled) { autoplayMap.set(guildId, enabled); }
function getAutoplay(guildId) { return autoplayMap.get(guildId) || false; }

// ─── Seed Management ──────────────────────────────────────────────────────────

/**
 * Set seed saat user request lagu baru via ?play.
 * Juga reset riwayat autoplay agar rantai dimulai fresh.
 */
function setSeed(guildId, track) {
  if (!track?.info) return;
  seedMap.set(guildId, {
    title: track.info.title,
    author: track.info.author,
    uri: track.info.uri,
  });
  autoplayHistoryMap.set(guildId, new Set([track.info.uri]));
  logger.debug(`Seed set for guild ${guildId}: "${track.info.title}" by ${track.info.author}`);
}

function getSeed(guildId) {
  return seedMap.get(guildId) || null;
}

/**
 * Update seed setelah lagu autoplay mulai diputar,
 * agar lagu berikutnya berkaitan dengan yang baru ini.
 */
function updateAutoplaySeed(guildId, track) {
  if (!track?.info) return;
  seedMap.set(guildId, {
    title: track.info.title,
    author: track.info.author,
    uri: track.info.uri,
  });
  if (!autoplayHistoryMap.has(guildId)) autoplayHistoryMap.set(guildId, new Set());
  const hist = autoplayHistoryMap.get(guildId);
  hist.add(track.info.uri);
  // Batasi history agar tidak tumbuh tak terbatas
  if (hist.size > 100) {
    const oldest = hist.values().next().value;
    hist.delete(oldest);
  }
  logger.debug(`Autoplay seed updated for guild ${guildId}: "${track.info.title}"`);
}

// ─── Track Cache ─────────────────────────────────────────────────────────────

function cacheTrack(guildId, track) {
  if (!musicCacheMap.has(guildId)) musicCacheMap.set(guildId, []);
  const cache = musicCacheMap.get(guildId);
  cache.push(track);
  if (cache.length > 50) cache.shift();
}

function getCachedTracks(guildId) { return musicCacheMap.get(guildId) || []; }

// ─── Autoplay Handler ─────────────────────────────────────────────────────────

async function handleAutoplay(client, player) {
  if (!getAutoplay(player.guildId)) return;

  // Ambil seed — prioritas: seedMap (di-set oleh ?play atau autoplay sebelumnya)
  // Fallback ke track terakhir di cache jika belum ada seed
  let seed = getSeed(player.guildId);
  if (!seed) {
    const cache = getCachedTracks(player.guildId);
    if (cache.length === 0) return;
    const last = cache[cache.length - 1];
    seed = { title: last.info.title, author: last.info.author, uri: last.info.uri };
  }

  const history = autoplayHistoryMap.get(player.guildId) || new Set();

  try {
    // Cari lagu terkait berdasarkan seed — deterministik, bukan random
    const query = `${seed.title} ${seed.author}`;
    let result = null;

    for (const source of ['ytmsearch', 'ytsearch']) {
      try {
        result = await player.search(
          { query, source },
          { id: client.user.id, username: 'Autoplay', isAutoplay: true }
        );
        if (result?.tracks?.length > 0) break;
      } catch (err) {
        logger.warn(`Autoplay search [${source}] failed: ${err.message}`);
      }
    }

    if (!result?.tracks?.length) {
      logger.warn(`Autoplay: tidak ada hasil untuk seed "${seed.title}" di guild ${player.guildId}`);
      return;
    }

    // Pilih lagu: yang belum ada di riwayat & bukan seed itu sendiri — TANPA random
    const filtered = result.tracks.filter(
      (t) => t.info.uri !== seed.uri && !history.has(t.info.uri)
    );
    // Fallback: ambil yang bukan seed saja, lalu yang pertama apapun
    const track =
      filtered[0] ||
      result.tracks.find((t) => t.info.uri !== seed.uri) ||
      result.tracks[0];

    if (!track) return;

    // Tandai sebagai lagu autoplay agar lavalinkHandler bisa update seed saat trackStart
    track.requester = { id: client.user.id, username: 'Autoplay', isAutoplay: true };

    await player.queue.add(track);
    await player.play();
    logger.debug(
      `Autoplay: mengantre "${track.info.title}" berdasarkan seed "${seed.title}" di guild ${player.guildId}`
    );
  } catch (err) {
    logger.error(`Autoplay error: ${err.message}`);
  }
}

module.exports = {
  setRadioMode,
  isRadioMode,
  getOrCreatePlayer,
  search,
  play,
  setVoiceStatus,
  setAutoplay,
  getAutoplay,
  setSeed,
  getSeed,
  updateAutoplaySeed,
  cacheTrack,
  getCachedTracks,
  handleAutoplay,
};
