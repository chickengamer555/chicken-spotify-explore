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

  if (isPlaying === false && status === 'playing' && currentPlayingId !== track.id) {
    if (audioRef.current && !audioRef.current.paused) audioRef.current.pause();
    setStatus('ready');
  }

  const overlay = (() => {
    if (status === 'loading') return '…';
    if (status === 'none') return '✕';
    if (isPlaying) return '⏸';
    return '▶';
  })();

  const albumImg =
    track.album.images && track.album.images[0]
      ? (track.album.images[2] || track.album.images[0]).url
      : null;

  const rowClass = 'track-row' + (isPlaying ? ' track-row--playing' : '');

  return (
    <div className={rowClass}>
      <button
        type="button"
        className={'track-art status-' + status}
        onClick={handleClick}
        title={status === 'none' ? 'No preview available' : 'Play preview'}
      >
        {albumImg ? <img alt="" src={albumImg} /> : <span className="track-art__placeholder" />}
        <span className="track-art__overlay">{overlay}</span>
      </button>
      <div className="track-meta">
        <span className="track-meta__name">{track.name}</span>
        <span className="track-meta__artists">
          {track.artists.map((item, index) => (index ? ', ' : '') + item.name)}
        </span>
        <span className="track-meta__album">{track.album.name}</span>
      </div>
      <span className="track-duration">{formatDuration(track.duration_ms)}</span>
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
    <div className="tracks-view">
      <div className="tracks-actions">
        <button className="btn-secondary" onClick={onBack}>← Go back</button>
        <button className="btn-secondary btn-secondary--magenta" onClick={onCreatePlaylist}>
          Create a Playlist
        </button>
      </div>
      <div className="tracks-list">
        {data.tracks.map((track) => (
          <Fragment key={track.id}>
            <TrackRow
              track={track}
              currentPlayingId={currentPlayingId}
              setCurrentPlayingId={setCurrentPlayingId}
            />
          </Fragment>
        ))}
      </div>
      <div className="tracks-actions">
        <button className="btn-secondary" onClick={onBack}>← Go back</button>
        <button className="btn-secondary btn-secondary--magenta" onClick={onCreatePlaylist}>
          Create a Playlist
        </button>
      </div>
    </div>
  );
}
