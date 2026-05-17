import React from 'react';
import authHelpers from '../authHelpers';

export default function Login({ token }) {
  if (token && token !== 'access_denied') return null;
  return (
    <div className="auth-container">
      <button onClick={() => authHelpers.getAuth()} className="auth-link">
        Login with Spotify
      </button>
      {token === 'access_denied' ? <h6>something went wrong, do try again</h6> : null}
    </div>
  );
}
