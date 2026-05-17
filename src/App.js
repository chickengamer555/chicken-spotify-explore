import React, { useState, useEffect } from 'react';
import './content/css/App.scss';
import authHelpers from './authHelpers';
import * as spotifyApi from './api/spotifyApi';
import * as recommend from './recommend';
import Header from './components/header';
import Footer from './components/footer';
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

  useEffect(() => {
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
  };

  const handleExploreArtists = async (range) => {
    if (!token) return;
    setLoading(true);
    setLoadingMsg('Loading your top artists…');
    try {
      const seeds = await spotifyApi.getTopArtists(token, range);
      if (!seeds.length) {
        toast.error('No top artists found for this time range');
        return;
      }
      setLoadingMsg('Finding similar tracks (0/?)…');
      const tracks = await recommend.runFromArtists(token, seeds, (done, total) => {
        setLoadingMsg(`Finding similar tracks (${done}/${total})…`);
      });
      if (!tracks.length) {
        toast.error('No recommendations found');
        return;
      }
      setData({ tracks, seeds: seeds.map((s) => ({ id: s.id, type: 'artist', name: s.name })) });
    } catch (e) {
      toast.error('Something went wrong: ' + (e.message || 'unknown'));
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
      if (!seeds.length) {
        toast.error('No top tracks found for this time range');
        return;
      }
      setLoadingMsg('Finding similar tracks (0/?)…');
      const tracks = await recommend.runFromTracks(token, seeds, (done, total) => {
        setLoadingMsg(`Finding similar tracks (${done}/${total})…`);
      });
      if (!tracks.length) {
        toast.error('No recommendations found');
        return;
      }
      setData({ tracks, seeds: seeds.map((s) => ({ id: s.id, type: 'track', name: s.name })) });
    } catch (e) {
      toast.error('Something went wrong: ' + (e.message || 'unknown'));
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
      setLoadingMsg('Finding similar tracks (0/?)…');
      const tracks = await recommend.runFromArtists(token, seeds, (done, total) => {
        setLoadingMsg(`Finding similar tracks (${done}/${total})…`);
      });
      if (!tracks.length) {
        toast.error('No recommendations found');
        return;
      }
      setData({ tracks, seeds: seeds.map((s) => ({ id: s.id, type: 'artist', name: s.name })) });
    } catch (e) {
      toast.error('Something went wrong: ' + (e.message || 'unknown'));
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
      setLoadingMsg('Finding similar tracks (0/?)…');
      const tracks = await recommend.runFromTracks(token, seeds, (done, total) => {
        setLoadingMsg(`Finding similar tracks (${done}/${total})…`);
      });
      if (!tracks.length) {
        toast.error('No recommendations found');
        return;
      }
      setData({ tracks, seeds: seeds.map((s) => ({ id: s.id, type: 'track', name: s.name })) });
    } catch (e) {
      toast.error('Something went wrong: ' + (e.message || 'unknown'));
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
      const name = `Explore Spotify · ${new Date().toLocaleDateString()}`;
      const playlist = await spotifyApi.createPlaylist(token, name, 'Made by Explore Spotify');
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
      <div className="top">
        <Header title="Explore" />
        <Login token={token} />
      </div>
      <div className="main">
        <div className="results-container">
          {loading ? (
            <div className="results">
              <div className="state">
                <Loading />
                <p style={{ marginTop: '1rem', textAlign: 'center' }}>{loadingMsg}</p>
              </div>
            </div>
          ) : token ? (
            <Result
              token={token}
              data={data}
              onExploreArtists={handleExploreArtists}
              onExploreTracks={handleExploreTracks}
              onSelectedArtists={handleSelectedArtists}
              onSelectedTracks={handleSelectedTracks}
              onCreatePlaylist={handleCreatePlaylist}
              onBack={handleBack}
            />
          ) : null}
        </div>
      </div>
      <div className="bottom">
        <Footer logged={!!token} onLogout={handleLogout} />
      </div>
    </div>
  );
}

export default App;
