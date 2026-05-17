import axios from 'axios';
import { lastfmCreds } from '../authCreds';

let firstErrorLogged = false;
const logFirstError = (where, e) => {
  if (firstErrorLogged) return;
  firstErrorLogged = true;
  console.warn(`[lastfmApi.${where}] first error`, e && e.message, e && e.response && e.response.data);
};

const call = async (params) => {
  const res = await axios.get(lastfmCreds.endpoint, {
    params: {
      ...params,
      api_key: lastfmCreds.api_key,
      format: 'json',
      autocorrect: 1,
    },
  });
  return res.data;
};

const toMatch = (raw) => {
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
};

// Returns [{ name, match }] sorted by match desc.
export const getSimilarArtists = async (artistName, limit = 30) => {
  try {
    const data = await call({ method: 'artist.getsimilar', artist: artistName, limit });
    const arr = (data && data.similarartists && data.similarartists.artist) || [];
    return arr
      .filter((a) => a && a.name)
      .map((a) => ({ name: a.name, match: toMatch(a.match) }))
      .sort((a, b) => b.match - a.match);
  } catch (e) {
    logFirstError('getSimilarArtists', e);
    return [];
  }
};

// Returns [{ artist, track, match }] sorted by match desc.
export const getSimilarTracks = async (artistName, trackName, limit = 30) => {
  try {
    const data = await call({
      method: 'track.getsimilar',
      artist: artistName,
      track: trackName,
      limit,
    });
    const arr = (data && data.similartracks && data.similartracks.track) || [];
    return arr
      .filter((t) => t && t.name && t.artist && t.artist.name)
      .map((t) => ({ artist: t.artist.name, track: t.name, match: toMatch(t.match) }))
      .sort((a, b) => b.match - a.match);
  } catch (e) {
    logFirstError('getSimilarTracks', e);
    return [];
  }
};
