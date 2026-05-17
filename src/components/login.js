import React from 'react';
import authHelpers from '../authHelpers';

export default function Login({ token }) {
  if (token && token !== 'access_denied') return null;
  return (
    <div className="auth-container">
      <button onClick={() => authHelpers.getAuth()} className="btn-primary auth-link">
        Log in with Spotify
      </button>
      {token === 'access_denied' ? <p className="auth-error">something went wrong, try again</p> : null}
    </div>
  );
}
