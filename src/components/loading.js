import React from 'react';

export default function Loading({ variant = 'ring' }) {
  if (variant === 'bars') {
    return (
      <span className="loading-bars" aria-label="loading">
        <span /><span /><span />
      </span>
    );
  }
  return (
    <div className="loading-ring" role="status" aria-label="loading">
      <svg viewBox="0 0 64 64" width="64" height="64">
        <circle
          cx="32"
          cy="32"
          r="28"
          fill="none"
          stroke="#9ec5e8"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
