import React from 'react';

export default function TopBar({ authed, excludeOwned, onExcludeOwnedChange, onLogout }) {
  return (
    <header className="top-bar">
      <div className="top-bar__left">
        {authed ? (
          <label className="toggle">
            <input
              type="checkbox"
              checked={excludeOwned}
              onChange={(e) => onExcludeOwnedChange(e.target.checked)}
            />
            <span className="toggle__track" aria-hidden="true">
              <span className="toggle__thumb" />
            </span>
            <span className="toggle__label">Skip songs in my playlists</span>
          </label>
        ) : null}
      </div>
      <div className="top-bar__center">
        <h1 className="wordmark">Explore</h1>
        <p className="tagline">recommendations</p>
      </div>
      <div className="top-bar__right">
        {authed ? (
          <button className="btn-ghost" onClick={onLogout}>
            log out
          </button>
        ) : null}
      </div>
    </header>
  );
}
