import axios from 'axios';

const cache = new Map();
const inflight = new Map();

const key = (artist, track) => `${artist.toLowerCase()}|${track.toLowerCase()}`;

export const findPreview = async (artist, track) => {
  if (!artist || !track) return null;
  const k = key(artist, track);
  if (cache.has(k)) return cache.get(k);
  if (inflight.has(k)) return inflight.get(k);

  const p = (async () => {
    try {
      const res = await axios.get('https://itunes.apple.com/search', {
        params: {
          term: `${artist} ${track}`,
          entity: 'song',
          limit: 1,
        },
      });
      const item = res.data && res.data.results && res.data.results[0];
      const url = item && item.previewUrl ? item.previewUrl : null;
      cache.set(k, url);
      return url;
    } catch {
      cache.set(k, null);
      return null;
    } finally {
      inflight.delete(k);
    }
  })();

  inflight.set(k, p);
  return p;
};
