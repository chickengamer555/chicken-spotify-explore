import * as spotify from './api/spotifyApi';
import * as lastfm from './api/lastfmApi';

const SIMILAR_PER_SEED = 50; // more candidates available when skip-songs is on
const CONCURRENCY = 12;

const poolCapFor = (targetCount, overfetch) =>
  Math.ceil(targetCount * (overfetch ? 4.0 : 1.15));

// Round-robin merge across N sorted lists. Keeps top-ranked items first while preserving seed diversity.
const roundRobinMerge = (lists) => {
  const out = [];
  const maxLen = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < maxLen; i++) {
    for (const list of lists) {
      if (i < list.length) out.push(list[i]);
    }
  }
  return out;
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

const dedupeByKey = (arr, keyFn) => {
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    const k = keyFn(item);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
};

const defaultOpts = { targetCount: 50, overfetch: false, excludeIds: null };

// seedArtists: array of Spotify artist objects (need .name)
export const runFromArtists = async (token, seedArtists, onProgress, opts = defaultOpts) => {
  const { targetCount, overfetch, excludeIds } = { ...defaultOpts, ...opts };
  const poolCap = poolCapFor(targetCount, overfetch);
  const seedNames = new Set(seedArtists.map((a) => a.name.toLowerCase()));

  const similar = await Promise.all(
    seedArtists.map((a) => lastfm.getSimilarArtists(a.name, SIMILAR_PER_SEED))
  );

  const merged = roundRobinMerge(similar);
  const filtered = merged.filter((x) => !seedNames.has(x.name.toLowerCase()));
  const candidates = dedupeByKey(filtered, (x) => x.name.toLowerCase()).slice(0, poolCap);

  const total = candidates.length;
  const tracks = [];
  const seenTrackIds = new Set();
  let done = 0;
  let stop = false;

  let i = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, total) }, async () => {
    while (i < total && !stop) {
      const idx = i++;
      const c = candidates[idx];
      const t = await spotify.searchTrackByArtist(token, c.name);
      done++;
      if (t && !seenTrackIds.has(t.id) && !(excludeIds && excludeIds.has(t.id))) {
        seenTrackIds.add(t.id);
        tracks.push(t);
        if (tracks.length >= targetCount) stop = true;
      }
      if (onProgress) onProgress(done, total);
    }
  });
  await Promise.all(workers);

  return tracks.slice(0, targetCount);
};

// seedTracks: array of Spotify track objects (need .name and .artists[0].name)
export const runFromTracks = async (token, seedTracks, onProgress, opts = defaultOpts) => {
  const { targetCount, overfetch, excludeIds } = { ...defaultOpts, ...opts };
  const poolCap = poolCapFor(targetCount, overfetch);
  const seedIds = new Set(seedTracks.map((t) => t.id));

  const similarLists = await Promise.all(
    seedTracks.map((t) => {
      const artist = t.artists && t.artists[0] ? t.artists[0].name : '';
      return lastfm.getSimilarTracks(artist, t.name, SIMILAR_PER_SEED);
    })
  );

  const merged = roundRobinMerge(similarLists);
  const candidates = dedupeByKey(
    merged,
    (x) => `${x.artist.toLowerCase()}|${x.track.toLowerCase()}`
  ).slice(0, poolCap);

  const total = candidates.length;
  const tracks = [];
  const seenTrackIds = new Set();
  let done = 0;
  let stop = false;

  let i = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, total) }, async () => {
    while (i < total && !stop) {
      const idx = i++;
      const c = candidates[idx];
      const t = await spotify.searchExactTrack(token, c.artist, c.track);
      done++;
      if (
        t &&
        !seedIds.has(t.id) &&
        !seenTrackIds.has(t.id) &&
        !(excludeIds && excludeIds.has(t.id))
      ) {
        seenTrackIds.add(t.id);
        tracks.push(t);
        if (tracks.length >= targetCount) stop = true;
      }
      if (onProgress) onProgress(done, total);
    }
  });
  await Promise.all(workers);

  return tracks.slice(0, targetCount);
};
