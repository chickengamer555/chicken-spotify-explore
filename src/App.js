import React, { useState, useEffect } from 'react';
import './content/css/App.scss';
import authHelpers from './authHelpers';
import * as spotifyApi from './api/spotifyApi';
import { RateLimitedError } from './api/spotifyApi';
import * as recommend from './recommend';
import TopBar from './components/topBar';
import Result from './components/result';
import Login from './components/login';
import Loading from './components/loading';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  const [token, setToken] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [excludeOwned, setExcludeOwned] = useState(false);
  const [resultCount, setResultCount] = useState(50);

  useEffect(() => {
    authHelpers.installInterceptors(
      (newToken) => setToken(newToken),
      () => {
        authHelpers.logout();
        setToken('');
        setData(null);
        toast.error('Session expired — please log in again');
      }
    );
    (async () => {
      let t = authHelpers.getCookie();
      const hashResult = await authHelpers.getHashCode();
      if (hashResult && hashResult !== 'access_denied') {
        t = hashResult;
      } else if (hashResult === 'access_denied') {
        toast.error('Login failed, please try again');
      }
      if (t) setToken(t);
    })();
  }, []);

  const handleLogout = () => {
    authHelpers.logout();
    setToken('');
    setData(null);
    setExcludeOwned(false);
  };

  const fetchExcludeSet = async () => {
    if (!excludeOwned) return new Set();
    setLoadingMsg('Loading your playlists…');
    try {
      return await spotifyApi.getAllMyPlaylistTrackIds(token, (done, total) => {
        setLoadingMsg(`Loading your playlists (${done}/${total})…`);
      });
    } catch (e) {
      const status = e.response && e.response.status;
      if (status === 403 || status === 401) {
        toast.error('Re-login required to read your playlists — toggle disabled');
      } else {
        toast.error('Could not load your playlists — continuing without exclusions');
      }
      setExcludeOwned(false);
      return new Set();
    }
  };

  const applyExclusion = (tracks, excludeIds) => {
    if (!excludeIds || excludeIds.size === 0) return tracks;
    return tracks.filter((t) => !excludeIds.has(t.id));
  };

  const runArtistsFlow = async (seeds) => {
    const excludeIds = await fetchExcludeSet();
    setLoadingMsg('Finding similar tracks…');
    const raw = await recommend.runFromArtists(
      token,
      seeds,
      (done, total) => setLoadingMsg(`Finding similar tracks (${done}/${total})…`),
      { targetCount: resultCount, overfetch: excludeOwned }
    );
    const tracks = applyExclusion(raw, excludeIds);
    return { tracks, rawCount: raw.length };
  };

  const runTracksFlow = async (seeds) => {
    const excludeIds = await fetchExcludeSet();
    setLoadingMsg('Finding similar tracks…');
    const raw = await recommend.runFromTracks(
      token,
      seeds,
      (done, total) => setLoadingMsg(`Finding similar tracks (${done}/${total})…`),
      { targetCount: resultCount, overfetch: excludeOwned }
    );
    const tracks = applyExclusion(raw, excludeIds);
    return { tracks, rawCount: raw.length };
  };

  const handleApiError = (where, e) => {
    console.error(where, e);
    if (e instanceof RateLimitedError) {
      toast.error(`Spotify is rate-limiting — wait ~${e.retryAfter}s and try again`);
    } else {
      toast.error('Something went wrong: ' + (e.message || 'unknown'));
    }
  };

  const handleEmptyResult = (rawCount) => {
    if (rawCount === 0) {
      toast.error('No recommendations found — try a different seed');
    } else {
      toast.error(`All ${rawCount} recommendations were already in your playlists`);
    }
  };

  const handleExploreArtists = async (range) => {
    if (!token) return;
    setLoading(true);
    setLoadingMsg('Loading your top artists…');
    try {
      const seeds = await spotifyApi.getTopArtists(token, range);
      if (!seeds.length) return toast.error('No top artists found for this time range');
      const { tracks, rawCount } = await runArtistsFlow(seeds);
      if (!tracks.length) return handleEmptyResult(rawCount);
      setData({ tracks, seeds: seeds.map((s) => ({ id: s.id, type: 'artist', name: s.name })) });
    } catch (e) {
      handleApiError('handleExploreArtists', e);
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  };

  const handleExploreTracks = async (range) => {
    if (!token) return;
    setLoading(true);
    setLoadingMsg('Loading your top tracks…');
    try {
      const seeds = await spotifyApi.getTopTracks(token, range);
      if (!seeds.length) return toast.error('No top tracks found for this time range');
      const { tracks, rawCount } = await runTracksFlow(seeds);
      if (!tracks.length) return handleEmptyResult(rawCount);
      setData({ tracks, seeds: seeds.map((s) => ({ id: s.id, type: 'track', name: s.name })) });
    } catch (e) {
      handleApiError('handleExploreTracks', e);
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  };

  const handleSelectedArtists = async (ids) => {
    if (!token || !ids.length) return;
    setLoading(true);
    setLoadingMsg('Loading selected artists…');
    try {
      const seeds = await spotifyApi.getArtistsByIds(token, ids);
      const { tracks, rawCount } = await runArtistsFlow(seeds);
      if (!tracks.length) return handleEmptyResult(rawCount);
      setData({ tracks, seeds: seeds.map((s) => ({ id: s.id, type: 'artist', name: s.name })) });
    } catch (e) {
      handleApiError('handleSelectedArtists', e);
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  };

  const handleSelectedTracks = async (ids) => {
    if (!token || !ids.length) return;
    setLoading(true);
    setLoadingMsg('Loading selected tracks…');
    try {
      const seeds = await spotifyApi.getTracksByIds(token, ids);
      const { tracks, rawCount } = await runTracksFlow(seeds);
      if (!tracks.length) return handleEmptyResult(rawCount);
      setData({ tracks, seeds: seeds.map((s) => ({ id: s.id, type: 'track', name: s.name })) });
    } catch (e) {
      handleApiError('handleSelectedTracks', e);
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  };

  const handleCreatePlaylist = async () => {
    if (!token || !data || !data.tracks.length) return;
    setLoading(true);
    setLoadingMsg('Creating playlist…');
    try {
      const name = `Explore · ${new Date().toLocaleDateString()}`;
      const playlist = await spotifyApi.createPlaylist(token, name, 'Made by Explore');
      setLoadingMsg('Adding tracks…');
      await spotifyApi.addTracksToPlaylist(token, playlist.id, data.tracks.map((t) => t.uri));
      toast.success('Playlist created!');
      window.open(playlist.external_urls.spotify || `https://open.spotify.com/playlist/${playlist.id}`, '_blank');
    } catch (e) {
      const msg = (e.response && e.response.data && e.response.data.error && e.response.data.error.message) || e.message;
      toast.error('Playlist creation failed: ' + msg);
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  };

  const handleBack = () => setData(null);

  return (
    <div className="page-container">
      <div className="night-sky" aria-hidden="true" />

      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        icon={false}
        pauseOnHover={false}
        pauseOnFocusLoss={false}
        theme="dark"
      />

      <TopBar
        authed={!!token}
        excludeOwned={excludeOwned}
        onExcludeOwnedChange={setExcludeOwned}
        onLogout={handleLogout}
      />

      <main className="page-main">
        {!token ? (
          <Login token={token} />
        ) : loading ? (
          <div className="loading-overlay">
            <Loading />
            <p className="loading-msg">{loadingMsg}</p>
          </div>
        ) : (
          <Result
            token={token}
            data={data}
            count={resultCount}
            onCountChange={setResultCount}
            onExploreArtists={handleExploreArtists}
            onExploreTracks={handleExploreTracks}
            onSelectedArtists={handleSelectedArtists}
            onSelectedTracks={handleSelectedTracks}
            onCreatePlaylist={handleCreatePlaylist}
            onBack={handleBack}
          />
        )}
      </main>
    </div>
  );
}

export default App;
