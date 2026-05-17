import * as spotify from './api/spotifyApi';
import * as lastfm from './api/lastfmApi';

const TARGET = 50;
const POOL_CAP = 80;
const SIMILAR_PER_SEED = 30;
const CONCURRENCY = 4;

const pLimit = (max) => {
  let active = 0;
  const queue = [];
  const next = () => {
    if (active >= max || queue.length === 0) return;
    const { fn, resolve, reject } = queue.shift();
    active++;
    Promise.resolve()
      .then(fn)
      .then(
        (v) => { active--; resolve(v); next(); },
        (e) => { active--; reject(e); next(); }
      );
  };
  return (fn) => new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject });
    next();
  });
};

const dedupeTracks = (tracks) => {
  const seen = new Set();
  const out = [];
  for (const t of tracks) {
    if (!t || !t.id || seen.has(t.id)) continue;
    seen.add(t.id);
    out.push(t);
  }
  return out;
};

const dedupeStrings = (arr) => {
  const seen = new Set();
  const out = [];
  for (const s of arr) {
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
};

// seedArtists: array of Spotify artist objects (need .name)
export const runFromArtists = async (token, seedArtists, onProgress) => {
  const seedNames = new Set(seedArtists.map((a) => a.name.toLowerCase()));

  const similar = await Promise.all(
    seedArtists.map((a) => lastfm.getSimilarArtists(a.name, SIMILAR_PER_SEED))
  );

  const pool = dedupeStrings(similar.flat()).filter((n) => !seedNames.has(n.toLowerCase()));
  const candidates = pool.slice(0, POOL_CAP);
  const total = candidates.length;

  let done = 0;
  const limit = pLimit(CONCURRENCY);
  const tracks = await Promise.all(
    candidates.map((name) =>
      limit(async () => {
        const t = await spotify.searchTrackByArtist(token, name);
        done++;
        if (onProgress) onProgress(done, total);
        return t;
      })
    )
  );

  return dedupeTracks(tracks).slice(0, TARGET);
};

// seedTracks: array of Spotify track objects (need .name and .artists[0].name)
export const runFromTracks = async (token, seedTracks, onProgress) => {
  const seedIds = new Set(seedTracks.map((t) => t.id));

  const similarLists = await Promise.all(
    seedTracks.map((t) => {
      const artist = t.artists && t.artists[0] ? t.artists[0].name : '';
      return lastfm.getSimilarTracks(artist, t.name, SIMILAR_PER_SEED);
    })
  );

  const flat = similarLists.flat();
  const seenKeys = new Set();
  const candidates = [];
  for (const item of flat) {
    const k = `${item.artist.toLowerCase()}|${item.track.toLowerCase()}`;
    if (seenKeys.has(k)) continue;
    seenKeys.add(k);
    candidates.push(item);
    if (candidates.length >= POOL_CAP) break;
  }
  const total = candidates.length;

  let done = 0;
  const limit = pLimit(CONCURRENCY);
  const tracks = await Promise.all(
    candidates.map((c) =>
      limit(async () => {
        const t = await spotify.searchExactTrack(token, c.artist, c.track);
        done++;
        if (onProgress) onProgress(done, total);
        return t;
      })
    )
  );

  return dedupeTracks(tracks.filter((t) => t && !seedIds.has(t.id))).slice(0, TARGET);
};
