import React, { Fragment, useRef, useState } from 'react';
import { findPreview } from '../api/itunesApi';

const formatDuration = (ms) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
};

const TrackRow = ({ track, currentPlayingId, setCurrentPlayingId }) => {
  const [status, setStatus] = useState(track.preview_url ? 'ready' : 'idle');
  const [url, setUrl] = useState(track.preview_url || null);
  const audioRef = useRef(null);

  const isPlaying = status === 'playing' && currentPlayingId === track.id;

  const playWithCleanup = () => {
    if (!audioRef.current) return;
    audioRef.current.volume = 0.3;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => setStatus('ready'));
    setCurrentPlayingId(track.id);
    setStatus('playing');
  };

  const handleClick = async () => {
    if (status === 'none' || status === 'loading') return;

    if (status === 'playing') {
      if (audioRef.current) audioRef.current.pause();
      setStatus('ready');
      if (currentPlayingId === track.id) setCurrentPlayingId(null);
      return;
    }

    if (status === 'ready' && url) {
      playWithCleanup();
      return;
    }

    if (status === 'idle') {
      setStatus('loading');
      const artist = track.artists && track.artists[0] ? track.artists[0].name : '';
      const found = await findPreview(artist, track.name);
      if (!found) {
        setStatus('none');
        return;
      }
      setUrl(found);
      setStatus('ready');
      setTimeout(playWithCleanup, 0);
    }
  };

  // If another track started playing, pause ours
  if (isPlaying === false && status === 'playing' && currentPlayingId !== track.id) {
    if (audioRef.current && !audioRef.current.paused) audioRef.current.pause();
    setStatus('ready');
  }

  const overlay = (() => {
    if (status === 'loading') return '⏳';
    if (status === 'none') return '✕';
    if (isPlaying) return '⏸';
    return '▶';
  })();

  const albumImg =
    track.album.images && track.album.images[0]
      ? (track.album.images[2] || track.album.images[0]).url
      : null;

  return (
    <div className="track-info">
      <li className="art preview-clickable" onClick={handleClick} title={status === 'none' ? 'No preview available' : ''}>
        {albumImg ? <img alt="album art" src={albumImg} /> : <div className="art-placeholder" />}
        <span className={'preview-overlay status-' + status}>{overlay}</span>
      </li>
      <li className="name">
        {track.name}
        <span>
          {track.artists.map((item, index) => (index ? ', ' : '') + item.name)}
        </span>
        <span className="album">{track.album.name}</span>
      </li>
      <li className="duration">
        <span>{formatDuration(track.duration_ms)}</span>
      </li>
      {url ? (
        <audio
          ref={audioRef}
          loop
          onEnded={() => setStatus('ready')}
        >
          <source src={url} type="audio/mp4" />
          <source src={url} type="audio/mpeg" />
        </audio>
      ) : null}
    </div>
  );
};

export default function Tracks({ data, onBack, onCreatePlaylist }) {
  const [currentPlayingId, setCurrentPlayingId] = useState(null);

  if (!data) return null;

  return (
    <div className="results">
      <div className="funcs">
        <button onClick={onBack}>Go back</button>
        <button onClick={onCreatePlaylist}>Create a Playlist</button>
      </div>
      <div className="tracks">
        <ul>
          {data.tracks.map((track) => (
            <Fragment key={track.id}>
              <TrackRow
                track={track}
                currentPlayingId={currentPlayingId}
                setCurrentPlayingId={setCurrentPlayingId}
              />
            </Fragment>
          ))}
        </ul>
      </div>
      <div className="funcs">
        <button onClick={onBack}>Go back</button>
        <button onClick={onCreatePlaylist}>Create a Playlist</button>
      </div>
    </div>
  );
}
