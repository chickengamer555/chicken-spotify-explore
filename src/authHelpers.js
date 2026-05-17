import { authCreds } from './authCreds';
import axios from 'axios';

const PKCE_VERIFIER_KEY = 'spoti_pkce_verifier';
const REFRESH_KEY = 'spoti_refresh_token';

const base64UrlEncode = (bytes) => {
  let str = '';
  bytes.forEach((b) => (str += String.fromCharCode(b)));
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const randomString = (length = 64) => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values).map((v) => charset[v % charset.length]).join('');
};

const sha256 = async (text) => {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return new Uint8Array(hash);
};

const setCookie = (name, value, maxAge = 3600) => {
  document.cookie = `${name}=${value};max-age=${maxAge};samesite=lax;path=/`;
};

const clearCookie = (name) => {
  document.cookie = `${name}=;max-age=0;samesite=lax;path=/`;
};

const readCookie = (name) => {
  const row = document.cookie.split('; ').find((r) => r.startsWith(name + '='));
  return row ? row.split('=')[1] : null;
};

let refreshInFlight = null;

const refreshAccessToken = async () => {
  if (refreshInFlight) return refreshInFlight;
  const refreshToken = window.localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return null;

  refreshInFlight = (async () => {
    try {
      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: authCreds.client_id,
      });
      const res = await axios.post(authCreds.token_endpoint, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        // Bypass our own interceptor on the refresh call itself
        __skipAuthInterceptor: true,
      });
      const { access_token, refresh_token: newRefresh, expires_in } = res.data;
      setCookie('spotiToken', access_token, expires_in || 3600);
      if (newRefresh) {
        window.localStorage.setItem(REFRESH_KEY, newRefresh);
      }
      return access_token;
    } catch (e) {
      window.localStorage.removeItem(REFRESH_KEY);
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
};

// Install global axios interceptors once. Auto-refresh on 401 and retry.
let interceptorsInstalled = false;
const installInterceptors = (onTokenRefreshed, onAuthLost) => {
  if (interceptorsInstalled) return;
  interceptorsInstalled = true;

  axios.interceptors.request.use((config) => {
    // Only attach the token to Spotify API calls (don't leak to Last.fm/iTunes)
    if (config.url && config.url.startsWith('https://api.spotify.com/')) {
      const token = readCookie('spotiToken');
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = 'Bearer ' + token;
      }
    }
    return config;
  });

  axios.interceptors.response.use(
    (res) => res,
    async (error) => {
      const original = error.config || {};
      if (
        error.response &&
        error.response.status === 401 &&
        !original.__retried &&
        !original.__skipAuthInterceptor &&
        original.url &&
        original.url.startsWith('https://api.spotify.com/')
      ) {
        original.__retried = true;
        const newToken = await refreshAccessToken();
        if (newToken) {
          original.headers = original.headers || {};
          original.headers.Authorization = 'Bearer ' + newToken;
          if (onTokenRefreshed) onTokenRefreshed(newToken);
          return axios(original);
        } else {
          if (onAuthLost) onAuthLost();
        }
      }
      return Promise.reject(error);
    }
  );
};

const authHelpers = {
  installInterceptors,

  getAuth: async function () {
    const verifier = randomString(64);
    const challenge = base64UrlEncode(await sha256(verifier));
    window.localStorage.setItem(PKCE_VERIFIER_KEY, verifier);

    const params = new URLSearchParams({
      client_id: authCreds.client_id,
      response_type: 'code',
      redirect_uri: authCreds.redirect_uri,
      scope: authCreds.scope,
      code_challenge_method: 'S256',
      code_challenge: challenge,
    });
    window.location.href = `${authCreds.auth_endpoint}?${params.toString()}`;
  },

  getHashCode: async function () {
    const qs = new URLSearchParams(window.location.search);
    const code = qs.get('code');
    const err = qs.get('error');

    if (err) {
      window.history.replaceState({}, document.title, window.location.pathname);
      return err;
    }

    if (!code) return null;

    const verifier = window.localStorage.getItem(PKCE_VERIFIER_KEY);
    if (!verifier) {
      window.history.replaceState({}, document.title, window.location.pathname);
      return null;
    }

    try {
      const body = new URLSearchParams({
        client_id: authCreds.client_id,
        grant_type: 'authorization_code',
        code,
        redirect_uri: authCreds.redirect_uri,
        code_verifier: verifier,
      });
      const res = await axios.post(authCreds.token_endpoint, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        __skipAuthInterceptor: true,
      });
      const { access_token, refresh_token, expires_in } = res.data;
      setCookie('spotiToken', access_token, expires_in || 3600);
      if (refresh_token) {
        window.localStorage.setItem(REFRESH_KEY, refresh_token);
      }
      window.localStorage.removeItem(PKCE_VERIFIER_KEY);
      await this.setUserID(access_token);
      window.history.replaceState({}, document.title, window.location.pathname);
      return access_token;
    } catch (e) {
      window.localStorage.removeItem(PKCE_VERIFIER_KEY);
      window.history.replaceState({}, document.title, window.location.pathname);
      return 'access_denied';
    }
  },

  setUserID: async function (token) {
    try {
      const res = await axios.get('https://api.spotify.com/v1/me', {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (res && res.data) {
        setCookie('spotiUID', res.data.id);
        if (res.data.display_name) {
          setCookie('spotiUN', encodeURIComponent(res.data.display_name));
        }
      }
    } catch (e) {
      // ignore
    }
  },

  getUserID: function () {
    return readCookie('spotiUID');
  },

  getUsername: function () {
    const v = readCookie('spotiUN');
    return v ? decodeURIComponent(v) : null;
  },

  getCookie: function () {
    return readCookie('spotiToken');
  },

  checkCookie: function () {
    if (readCookie('spotiToken')) {
      clearCookie('selection');
      return true;
    }
    clearCookie('selection');
    localStorage.removeItem('spotiData');
    return false;
  },

  logout: function () {
    clearCookie('spotiToken');
    clearCookie('spotiUID');
    clearCookie('spotiUN');
    clearCookie('selection');
    localStorage.removeItem('spotiData');
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(PKCE_VERIFIER_KEY);
  },
};

export default authHelpers;
