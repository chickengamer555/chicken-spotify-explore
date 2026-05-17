import axios from 'axios';

const BASE = 'https://api.spotify.com/v1';

const authHeader = (token) => ({ Authorization: 'Bearer ' + token });

// Probe the deprecated /recommendations endpoint. If it works for this app, we can skip the whole Last.fm pipeline.
// Returns { ok: true, tracks } on success or { ok: false, status, error } on failure.
export const tryRecommendations = async (token, { seedArtists = [], seedTracks = [], limit = 50 } = {}) => {
  try {
    const params = { limit };
    if (seedArtists.length) params.seed_artists = seedArtists.join(',');
    if (seedTracks.length) params.seed_tracks = seedTracks.join(',');
    const res = await axios.get(`${BASE}/recommendations`, {
      headers: authHeader(token),
      params,
    });
    return { ok: true, tracks: res.data.tracks || [] };
  } catch (e) {
    const status = e && e.response && e.response.status;
    const errBody = e && e.response && e.response.data;
    console.warn('[tryRecommendations] status=' + status, errBody);
    return { ok: false, status, error: errBody };
  }
};

export const getMe = async (token) => {
  const res = await axios.get(`${BASE}/me`, { headers: authHeader(token) });
  return res.data;
};

export const getTopArtists = async (token, range, limit = 5) => {
  const res = await axios.get(`${BASE}/me/top/artists`, {
    headers: authHeader(token),
    params: { limit, time_range: range },
  });
  return res.data.items;
};

export const getTopTracks = async (token, range, limit = 5) => {
  const res = await axios.get(`${BASE}/me/top/tracks`, {
    headers: authHeader(token),
    params: { limit, time_range: range },
  });
  return res.data.items;
};

export const searchArtist = async (token, q, limit = 18) => {
  const res = await axios.get(`${BASE}/search`, {
    headers: authHeader(token),
    params: { q, type: 'artist', limit },
  });
  return res.data.artists.items;
};

export const searchTrack = async (token, q, limit = 24) => {
  const res = await axios.get(`${BASE}/search`, {
    headers: authHeader(token),
    params: { q, type: 'track', limit },
  });
  return res.data.tracks.items;
};

export class RateLimitedError extends Error {
  constructor(retryAfter) {
    super(`Rate limited (retry-after: ${retryAfter}s)`);
    this.name = 'RateLimitedError';
    this.retryAfter = retryAfter;
  }
}

let firstSearchErrorLogged = false;
const logFirstSearchError = (where, e) => {
  if (firstSearchErrorLogged) return;
  firstSearchErrorLogged = true;
  const status = e && e.response && e.response.status;
  console.warn(`[spotifyApi.${where}] first error — status=${status}`, e && e.response && e.response.data);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MAX_RETRIES = 2;
const MAX_RETRY_WAIT_S = 5;

const searchWithRetry = async (token, params, where) => {
  let lastRetryAfter = 0;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await axios.get(`${BASE}/search`, {
        headers: authHeader(token),
        params,
      });
      return res.data.tracks.items[0] || null;
    } catch (e) {
      const status = e && e.response && e.response.status;
      if (status === 429 && attempt < MAX_RETRIES) {
        const retryAfter = parseInt((e.response.headers && e.response.headers['retry-after']) || '2', 10);
        lastRetryAfter = retryAfter;
        await sleep(Math.min(retryAfter, MAX_RETRY_WAIT_S) * 1000);
        continue;
      }
      if (status === 429) {
        // Exhausted retries — throw typed error so the pipeline aborts
        throw new RateLimitedError(lastRetryAfter || 30);
      }
      logFirstSearchError(where, e);
      return null;
    }
  }
  return null;
};

export const searchTrackByArtist = (token, artistName) =>
  searchWithRetry(
    token,
    { q: `artist:"${artistName}"`, type: 'track', limit: 1 },
    'searchTrackByArtist'
  );

export const searchExactTrack = (token, artist, track) =>
  searchWithRetry(
    token,
    { q: `track:"${track}" artist:"${artist}"`, type: 'track', limit: 1 },
    'searchExactTrack'
  );

export const getTracksByIds = async (token, ids) => {
  if (!ids || ids.length === 0) return [];
  const res = await axios.get(`${BASE}/tracks`, {
    headers: authHeader(token),
    params: { ids: ids.join(',') },
  });
  return res.data.tracks;
};

export const getArtistsByIds = async (token, ids) => {
  if (!ids || ids.length === 0) return [];
  const res = await axios.get(`${BASE}/artists`, {
    headers: authHeader(token),
    params: { ids: ids.join(',') },
  });
  return res.data.artists;
};

export const getMyPlaylists = async (token) => {
  const all = [];
  let next = `${BASE}/me/playlists?limit=50`;
  while (next) {
    const res = await axios.get(next, { headers: authHeader(token) });
    all.push(...res.data.items);
    next = res.data.next;
  }
  return all;
};

export const getPlaylistTrackIds = async (token, playlistId, playlistName) => {
  const ids = new Set();
  // Feb 2026 Spotify migration: /tracks endpoint removed, replaced with /items.
  // Response shape: items[].track → items[].item.
  let next = `${BASE}/playlists/${playlistId}/items?limit=100&fields=items(item(id)),next`;
  while (next) {
    try {
      const res = await axios.get(next, { headers: authHeader(token) });
      for (const entry of res.data.items) {
        const t = entry && (entry.item || entry.track); // tolerate both shapes
        if (t && t.id) ids.add(t.id);
      }
      next = res.data.next;
    } catch (e) {
      const status = e && e.response && e.response.status;
      console.warn(`[skip-songs] playlist "${playlistName || playlistId}" failed (status=${status})`);
      return ids;
    }
  }
  return ids;
};

export const getMySavedTrackIds = async (token) => {
  const ids = new Set();
  let next = `${BASE}/me/tracks?limit=50&fields=items(track(id)),next`;
  while (next) {
    try {
      const res = await axios.get(next, { headers: authHeader(token) });
      for (const item of res.data.items) {
        if (item && item.track && item.track.id) ids.add(item.track.id);
      }
      next = res.data.next;
    } catch (e) {
      const status = e && e.response && e.response.status;
      console.warn(`[skip-songs] Liked Songs failed (status=${status})`);
      return ids;
    }
  }
  return ids;
};

export const getMySavedAlbumTrackIds = async (token) => {
  const ids = new Set();
  let next = `${BASE}/me/albums?limit=50`;
  while (next) {
    try {
      const res = await axios.get(next, { headers: authHeader(token) });
      for (const item of res.data.items) {
        if (item && item.album && item.album.tracks && item.album.tracks.items) {
          for (const tr of item.album.tracks.items) {
            if (tr && tr.id) ids.add(tr.id);
          }
        }
      }
      next = res.data.next;
    } catch (e) {
      const status = e && e.response && e.response.status;
      console.warn(`[skip-songs] Saved Albums failed (status=${status})`);
      return ids;
    }
  }
  return ids;
};

export const getAllMyPlaylistTrackIds = async (token, onProgress) => {
  // Fetch current user id so we only read playlists we own — Spotify 403s on anything else for new dev-mode apps
  let myId = null;
  try {
    const meRes = await axios.get(`${BASE}/me`, { headers: authHeader(token) });
    myId = meRes.data && meRes.data.id;
  } catch (e) {
    console.warn('[skip-songs] /me failed — owner filter will skip all playlists', e && e.response && e.response.status);
  }

  const allPlaylists = await getMyPlaylists(token);
  // Strict filter: ONLY playlists you personally own. Excludes:
  //   - playlists you follow (owner.id = some other user)
  //   - Spotify-owned algorithmic/editorial playlists (owner.id = 'spotify')
  //   - everything else (returns 403 for new dev-mode apps per Nov 2024 changes)
  const playlists = myId
    ? allPlaylists.filter((p) => p && p.owner && p.owner.id === myId)
    : [];
  const skipped = allPlaylists.length - playlists.length;
  if (skipped > 0) {
    console.log(`[skip-songs] skipping ${skipped} playlist(s) not owned by you (Spotify-owned or followed)`);
  }

  const ids = new Set();
  const totalSteps = playlists.length + 2;
  if (onProgress) onProgress(0, totalSteps);

  let likedCount = 0;
  try {
    const liked = await getMySavedTrackIds(token);
    liked.forEach((id) => ids.add(id));
    likedCount = liked.size;
  } catch (e) {
    console.warn('[skip-songs] Liked Songs threw unexpectedly', e);
  }
  if (onProgress) onProgress(1, totalSteps);

  let albumsCount = 0;
  try {
    const albums = await getMySavedAlbumTrackIds(token);
    albums.forEach((id) => ids.add(id));
    albumsCount = albums.size;
  } catch (e) {
    console.warn('[skip-songs] Saved Albums threw unexpectedly', e);
  }
  if (onProgress) onProgress(2, totalSteps);

  let playlistTracks = 0;
  let done = 2;
  for (const p of playlists) {
    const before = ids.size;
    const trackIds = await getPlaylistTrackIds(token, p.id, p.name);
    trackIds.forEach((id) => ids.add(id));
    playlistTracks += ids.size - before;
    done++;
    if (onProgress) onProgress(done, totalSteps);
  }

  console.log('[skip-songs] breakdown:', {
    likedSongs: likedCount,
    savedAlbums: albumsCount,
    ownedPlaylists: playlists.length,
    fromOwnedPlaylists: playlistTracks,
    totalUnique: ids.size,
  });
  return ids;
};

export const createPlaylist = async (token, name, description = '') => {
  const res = await axios.post(
    `${BASE}/me/playlists`,
    { name, public: false, description },
    {
      headers: {
        ...authHeader(token),
        'Content-Type': 'application/json',
      },
    }
  );
  return res.data;
};

export const addTracksToPlaylist = async (token, playlistId, uris) => {
  for (let i = 0; i < uris.length; i += 100) {
    const slice = uris.slice(i, i + 100);
    // Feb 2026 migration: /tracks → /items
    await axios.post(
      `${BASE}/playlists/${playlistId}/items`,
      { uris: slice, position: i },
      {
        headers: {
          ...authHeader(token),
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
