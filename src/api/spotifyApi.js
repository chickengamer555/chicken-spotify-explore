import axios from 'axios';

const BASE = 'https://api.spotify.com/v1';

const authHeader = (token) => ({ Authorization: 'Bearer ' + token });

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

export const searchTrackByArtist = async (token, artistName) => {
  try {
    const res = await axios.get(`${BASE}/search`, {
      headers: authHeader(token),
      params: { q: `artist:"${artistName}"`, type: 'track', limit: 1 },
    });
    return res.data.tracks.items[0] || null;
  } catch {
    return null;
  }
};

export const searchExactTrack = async (token, artist, track) => {
  try {
    const res = await axios.get(`${BASE}/search`, {
      headers: authHeader(token),
      params: { q: `track:"${track}" artist:"${artist}"`, type: 'track', limit: 1 },
    });
    return res.data.tracks.items[0] || null;
  } catch {
    return null;
  }
};

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

export const getPlaylistTrackIds = async (token, playlistId) => {
  const ids = new Set();
  let next = `${BASE}/playlists/${playlistId}/tracks?limit=100&fields=items(track(id)),next`;
  while (next) {
    const res = await axios.get(next, { headers: authHeader(token) });
    for (const item of res.data.items) {
      if (item && item.track && item.track.id) ids.add(item.track.id);
    }
    next = res.data.next;
  }
  return ids;
};

export const getAllMyPlaylistTrackIds = async (token, onProgress) => {
  const playlists = await getMyPlaylists(token);
  const ids = new Set();
  let done = 0;
  for (const p of playlists) {
    try {
      const trackIds = await getPlaylistTrackIds(token, p.id);
      trackIds.forEach((id) => ids.add(id));
    } catch {}
    done++;
    if (onProgress) onProgress(done, playlists.length);
  }
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
    await axios.post(
      `${BASE}/playlists/${playlistId}/tracks`,
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
