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
  if (hist.size > 100) {
    const oldest = hist.values().next().value;
    hist.delete(oldest);
  }
  logger.debug(`Autoplay seed updated for guild ${guildId}: "${track.info.title}"`);
}

// ─── Genre Detection ──────────────────────────────────────────────────────────

/**
 * Deteksi genre dari daftar track berdasarkan judul dan nama artis.
 * Mengembalikan string genre atau null jika tidak terdeteksi.
 */
function detectGenre(tracks) {
  if (!tracks || tracks.length === 0) return null;

  const text = tracks
    .map((t) => `${t.info?.title || ''} ${t.info?.author || ''}`)
    .join(' ')
    .toLowerCase();

  const genres = [
    {
      name: 'K-Pop',
      keywords: [
        'kpop', 'k-pop', 'bts', 'blackpink', 'twice', 'exo', 'got7', 'nct',
        'stray kids', 'ive', 'aespa', 'red velvet', 'shinee', 'monsta x',
        'seventeen', 'enhypen', 'txt', 'bigbang', 'super junior', 'mamamoo',
        'gidle', '(g)i-dle', 'itzy', 'newjeans', 'le sserafim',
      ],
    },
    {
      name: 'Pop',
      keywords: [
        'pop', 'taylor swift', 'ariana grande', 'justin bieber', 'ed sheeran',
        'dua lipa', 'billie eilish', 'harry styles', 'olivia rodrigo', 'selena gomez',
        'charlie puth', 'the chainsmokers', 'maroon 5', 'shawn mendes',
      ],
    },
    {
      name: 'Hip-Hop / Rap',
      keywords: [
        'rap', 'hip hop', 'hiphop', 'hip-hop', 'drake', 'kendrick', 'j. cole',
        'travis scott', 'post malone', 'eminem', 'lil wayne', 'lil uzi',
        'kanye', 'nicki minaj', 'cardi b', 'juice wrld', 'xxxtentacion',
      ],
    },
    {
      name: 'Rock',
      keywords: [
        'rock', 'metal', 'linkin park', 'metallica', 'green day', 'nirvana',
        'foo fighters', 'red hot chili', 'system of a down', 'ac/dc',
        'queen', 'guns n roses', 'bon jovi', 'avenged sevenfold',
      ],
    },
    {
      name: 'R&B / Soul',
      keywords: [
        'r&b', 'rnb', 'soul', 'the weeknd', 'frank ocean', 'sza',
        'usher', 'beyoncé', 'beyonce', 'rihanna', 'alicia keys',
        'john legend', 'h.e.r.', 'daniel caesar',
      ],
    },
    {
      name: 'EDM / Electronic',
      keywords: [
        'edm', 'electronic', 'house', 'techno', 'dubstep', 'trance',
        'avicii', 'marshmello', 'alan walker', 'dj', 'tiesto', 'calvin harris',
        'david guetta', 'martin garrix', 'skrillex', 'deadmau5',
      ],
    },
    {
      name: 'Jazz',
      keywords: ['jazz', 'blues', 'swing', 'bossa nova', 'bebop', 'coltrane', 'miles davis'],
    },
    {
      name: 'Classical',
      keywords: ['classical', 'orchestra', 'symphony', 'beethoven', 'mozart', 'chopin', 'bach', 'handel'],
    },
    {
      name: 'Lo-Fi',
      keywords: ['lofi', 'lo-fi', 'lo fi', 'chill', 'study music', 'relaxing music', 'cafe music'],
    },
    {
      name: 'Indie / Alternative',
      keywords: ['indie', 'alternative', 'folk', 'arctic monkeys', 'tame impala', 'vampire weekend'],
    },
    {
      name: 'OPM',
      keywords: [
        'opm', 'filipino', 'tagalog', 'kundiman', 'pamungkas',
        'ben&ben', 'december avenue', 'eraserheads', 'parokya', 'rivermaya',
      ],
    },
    {
      name: 'Dangdut',
      keywords: [
        'dangdut', 'koplo', 'rhoma irama', 'via vallen', 'nella kharisma',
        'denny caknan', 'happy asmara',
      ],
    },
    {
      name: 'Indonesia Pop',
      keywords: [
        'noah', 'dewa 19', 'slank', 'sheila on 7', 'peterpan', 'ungu',
        'armada', 'raisa', 'isyana', 'rizky febian', 'andmesh', 'kunto aji',
        'hindia', 'fourtwnty', 'tulus', 'yura yunita', 'tiara andini',
        'mahalini', 'nadin amizah',
      ],
    },
  ];

  let bestMatch = null;
  let bestScore = 0;

  for (const genre of genres) {
    const score = genre.keywords.filter((k) => text.includes(k)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = genre.name;
    }
  }

  return bestScore > 0 ? bestMatch : null;
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

  let seed = getSeed(player.guildId);
  if (!seed) {
    const cache = getCachedTracks(player.guildId);
    if (cache.length === 0) return;
    const last = cache[cache.length - 1];
    seed = { title: last.info.title, author: last.info.author, uri: last.info.uri };
  }

  const history = autoplayHistoryMap.get(player.guildId) || new Set();

  try {
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

    const filtered = result.tracks.filter(
      (t) => t.info.uri !== seed.uri && !history.has(t.info.uri)
    );
    const track =
      filtered[0] ||
      result.tracks.find((t) => t.info.uri !== seed.uri) ||
      result.tracks[0];

    if (!track) return;

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
  detectGenre,
  cacheTrack,
  getCachedTracks,
  handleAutoplay,
};
