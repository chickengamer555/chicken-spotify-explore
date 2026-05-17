const computeRedirect = () => {
  const { origin, pathname } = window.location;
  let base = pathname.replace(/index\.html$/, '');
  if (!base.endsWith('/')) base += '/';
  return origin + base;
};

export const authCreds = {
  client_id: 'ab928d947ebb4ec9b02d8834a0e15a99',
  get redirect_uri() {
    return computeRedirect();
  },
  auth_endpoint: 'https://accounts.spotify.com/authorize',
  token_endpoint: 'https://accounts.spotify.com/api/token',
  scope: 'user-read-private user-top-read playlist-modify-private playlist-modify-public',
};

export const lastfmCreds = {
  api_key: 'e98d6aaa863bf9edeee55cf808666213',
  endpoint: 'https://ws.audioscrobbler.com/2.0/',
};
