import axios from 'axios';
import { lastfmCreds } from '../authCreds';

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

export const getSimilarArtists = async (artistName, limit = 30) => {
  try {
    const data = await call({ method: 'artist.getsimilar', artist: artistName, limit });
    const arr = (data && data.similarartists && data.similarartists.artist) || [];
    return arr.map((a) => a.name).filter(Boolean);
  } catch {
    return [];
  }
};

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
      .map((t) => ({ artist: t.artist && t.artist.name, track: t.name }))
      .filter((x) => x.artist && x.track);
  } catch {
    return [];
  }
};
