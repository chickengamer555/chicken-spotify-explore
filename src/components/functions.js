import React, { Fragment, useRef, useState } from 'react';
import * as spotifyApi from '../api/spotifyApi';
import ArtistSearch from './artistSearch';
import TrackSearch from './trackSearch';
import Loading from './loading';

const ExploreCard = ({ eyebrow, headline, onClick }) => (
  <button className="explore-card" onClick={onClick}>
    <span className="explore-card__eyebrow">{eyebrow}</span>
    <span className="explore-card__headline">{headline}</span>
    <span className="explore-card__chevron" aria-hidden="true">→</span>
  </button>
);

const COUNT_OPTIONS = [25, 50, 75, 100];

const CountSelector = ({ value, onChange }) => {
  const pillRefs = useRef([]);

  const handleKeyDown = (e, idx) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const step = e.key === 'ArrowRight' ? 1 : -1;
    const next = (idx + step + COUNT_OPTIONS.length) % COUNT_OPTIONS.length;
    onChange(COUNT_OPTIONS[next]);
    if (pillRefs.current[next]) pillRefs.current[next].focus();
  };

  return (
    <div className="count-selector" role="radiogroup" aria-label="Number of recommendations">
      {COUNT_OPTIONS.map((n, i) => (
        <button
          key={n}
          ref={(el) => (pillRefs.current[i] = el)}
          className="count-selector__pill"
          role="radio"
          aria-checked={value === n}
          tabIndex={value === n ? 0 : -1}
          onClick={() => onChange(n)}
          onKeyDown={(e) => handleKeyDown(e, i)}
        >
          {n}
        </button>
      ))}
    </div>
  );
};

export default function Functions({
  token,
  count,
  onCountChange,
  onExploreArtists,
  onExploreTracks,
  onSelectedArtists,
  onSelectedTracks,
}) {
  const [artists, setArtists] = useState(null);
  const [tracks, setTracks] = useState(null);
  const [searching, setSearching] = useState(false);

  const artistInput = useRef(null);
  const trackInput = useRef(null);
  const timer = useRef(null);

  const handleArtistInput = (el) => {
    const value = el.value;
    if (value && value.length > 0) {
      setSearching(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        if (trackInput.current) trackInput.current.value = '';
        setTracks(null);
        try {
          const items = await spotifyApi.searchArtist(token, value);
          setArtists(items);
        } catch {}
        setSearching(false);
      }, 600);
    } else {
      clearTimeout(timer.current);
      setArtists(null);
      setTracks(null);
      setSearching(false);
    }
  };

  const handleTrackInput = (el) => {
    const value = el.value;
    if (value && value.length > 0) {
      setSearching(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        if (artistInput.current) artistInput.current.value = '';
        setArtists(null);
        try {
          const items = await spotifyApi.searchTrack(token, value);
          setTracks(items);
        } catch {}
        setSearching(false);
      }, 600);
    } else {
      clearTimeout(timer.current);
      setArtists(null);
      setTracks(null);
      setSearching(false);
    }
  };

  const inputsEmpty = !artists && !tracks;

  return (
    <div className="functions">
      <div className="search-row">
        <input
          className="search-input"
          onChange={(e) => handleArtistInput(e.target)}
          placeholder="pick at most 5 artists"
          ref={artistInput}
        />
        <span className="or-divider">
          {searching ? <Loading variant="bars" /> : <span className="or-divider__text">or</span>}
        </span>
        <input
          className="search-input"
          onChange={(e) => handleTrackInput(e.target)}
          placeholder="pick at most 5 tracks"
          ref={trackInput}
        />
      </div>

      <Fragment>
        {artists ? (
          <div className="search-container">
            <ArtistSearch artists={artists} onRecommend={onSelectedArtists} />
          </div>
        ) : null}
        {tracks ? (
          <div className="search-container">
            <TrackSearch tracks={tracks} onRecommend={onSelectedTracks} />
          </div>
        ) : null}
      </Fragment>

      {inputsEmpty ? (
        <Fragment>
          <CountSelector value={count} onChange={onCountChange} />
          <div className="explore-grid">
            <ExploreCard eyebrow="RECENT" headline="Top Artists" onClick={() => onExploreArtists('medium_term')} />
            <ExploreCard eyebrow="RECENT" headline="Top Tracks" onClick={() => onExploreTracks('medium_term')} />
            <ExploreCard eyebrow="ALL-TIME" headline="Top Artists" onClick={() => onExploreArtists('long_term')} />
            <ExploreCard eyebrow="ALL-TIME" headline="Top Tracks" onClick={() => onExploreTracks('long_term')} />
          </div>
        </Fragment>
      ) : null}
    </div>
  );
}
