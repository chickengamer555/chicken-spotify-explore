const computeRedirect = () => {
  const { origin, pathname } = window.location;
  let base = pathname.replace(/index\.html$/, '');
  if (!base.endsWith('/')) base += '/';
  return origin + base;
};

export const authCreds = {
  client_id: '97feca4ae7384a6b8416522aeee99c12',
  get redirect_uri() {
    return computeRedirect();
  },
  auth_endpoint: 'https://accounts.spotify.com/authorize',
  token_endpoint: 'https://accounts.spotify.com/api/token',
  scope: 'user-read-private user-top-read playlist-modify-private playlist-modify-public playlist-read-private playlist-read-collaborative user-library-read',
};

export const lastfmCreds = {
  api_key: 'e98d6aaa863bf9edeee55cf808666213',
  endpoint: 'https://ws.audioscrobbler.com/2.0/',
};
