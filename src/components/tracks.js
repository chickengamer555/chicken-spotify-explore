import React, { Fragment, useRef, useState } from 'react';
import { findPreview } from '../api/itunesApi';

const formatDuration = (ms) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
};

const PreviewButton = ({ track }) => {
  const [status, setStatus] = useState(
    track.preview_url ? 'ready' : 'idle'
  );
  const [url, setUrl] = useState(track.preview_url || null);
  const audioRef = useRef(null);

  const onClick = async () => {
    if (status === 'none') return;

    if (status === 'idle') {
      setStatus('loading');
      const artist = track.artists && track.artists[0] ? track.artists[0].name : '';
      const found = await findPreview(artist, track.name);
      if (!found) {
        setStatus('none');
        return;
      }
      setUrl(found);
      setStatus('playing');
      // Wait a tick for the <audio> to mount with the new src
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.volume = 0.3;
          audioRef.current.play().catch(() => setStatus('ready'));
        }
      }, 0);
      return;
    }

    if (status === 'ready') {
      if (audioRef.current) {
        audioRef.current.volume = 0.3;
        audioRef.current.play().catch(() => {});
        setStatus('playing');
      }
      return;
    }

    if (status === 'playing') {
      if (audioRef.current) audioRef.current.pause();
      setStatus('ready');
      return;
    }

    if (status === 'loading') {
      return;
    }
  };

  let label = 'Play Preview';
  if (status === 'loading') label = 'Loading…';
  else if (status === 'playing') label = 'Pause';
  else if (status === 'none') label = 'No Preview';

  return (
    <Fragment>
      <button onClick={onClick} disabled={status === 'loading' || status === 'none'}>
        {label}
      </button>
      {url ? (
        <audio ref={audioRef} loop onEnded={() => setStatus('ready')}>
          <source src={url} type="audio/mp4" />
          <source src={url} type="audio/mpeg" />
        </audio>
      ) : null}
    </Fragment>
  );
};

export default function Tracks({ data, onBack, onCreatePlaylist }) {
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
              <div className="track-info">
                {track.album.images && track.album.images[0] ? (
                  <li className="art">
                    <img
                      alt="album art"
                      src={(track.album.images[2] || track.album.images[0]).url}
                    />
                  </li>
                ) : null}
                <li className="name">
                  {track.name}
                  <span>
                    {track.artists.map(
                      (item, index) => (index ? ', ' : '') + item.name
                    )}
                  </span>
                  <span className="album">{track.album.name}</span>
                </li>
                <li className="preview">
                  <PreviewButton track={track} />
                </li>
                <li className="duration">
                  <span>{formatDuration(track.duration_ms)}</span>
                </li>
              </div>
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
