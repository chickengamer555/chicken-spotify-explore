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
      <svg viewBox="0 0 96 96" width="96" height="96">
        <defs>
          <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4cf0ff" />
            <stop offset="100%" stopColor="#ff3df0" />
          </linearGradient>
        </defs>
        <circle
          cx="48"
          cy="48"
          r="40"
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
