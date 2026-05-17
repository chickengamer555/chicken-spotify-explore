import React, { Fragment, useRef, useState } from 'react';
import { toast } from 'react-toastify';

export default function TrackSearch({ tracks, onRecommend }) {
  const [, force] = useState(0);
  const selection = useRef([]);

  const handleSelect = (e, id) => {
    const idx = selection.current.indexOf(id);
    if (idx < 0 && selection.current.length < 5) {
      selection.current.push(id);
      e.classList.toggle('selected');
    } else if (idx >= 0) {
      selection.current.splice(idx, 1);
      e.classList.toggle('selected');
    } else if (selection.current.length >= 5) {
      toast.error('reached maximum selection capacity');
      return;
    }
    if (selection.current.length === 5) {
      toast.error('reached maximum selection capacity');
    }
    force((n) => n + 1);
  };

  const recommend = () => {
    if (selection.current.length === 0) return;
    onRecommend(selection.current.slice());
  };

  return (
    <Fragment key="trackSearch">
      {selection.current.length > 0 ? (
        <div className="tracks-actions">
          <button className="btn-secondary" onClick={recommend}>Recommend tracks</button>
        </div>
      ) : null}
      <ul className={'search-grid' + (tracks.length === 1 ? ' search-grid--single' : '')}>
        {tracks.map((track) => (
          <Fragment key={track.id}>
            <li>
              <div
                className="search-result-item"
                onClick={(e) => handleSelect(e.currentTarget, track.id)}
              >
                {track.album.images && track.album.images[0] ? (
                  <div className="search-result-item__art">
                    <img
                      alt=""
                      src={(track.album.images[2] || track.album.images[0]).url}
                    />
                  </div>
                ) : <div className="search-result-item__art search-result-item__art--placeholder" />}
                <p className="search-result-item__name">
                  {track.name}
                  <span className="search-result-item__sub">
                    {track.artists.map(
                      (item, index) => (index ? ', ' : '') + item.name
                    )}
                  </span>
                  <span className="search-result-item__album">{track.album.name}</span>
                </p>
              </div>
            </li>
          </Fragment>
        ))}
      </ul>
    </Fragment>
  );
}
