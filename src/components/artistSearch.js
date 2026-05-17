import React, { Fragment, useRef, useState } from 'react';
import { toast } from 'react-toastify';

export default function ArtistSearch({ artists, onRecommend }) {
  const [, force] = useState(0);
  const selection = useRef([]);
  const listRef = useRef(null);

  const handleSelect = (e, id) => {
    const idx = selection.current.indexOf(id);
    if (idx < 0 && selection.current.length < 5) {
      selection.current.push(id);
      e.classList.toggle('selected');
    } else if (idx >= 0) {
      selection.current.splice(idx, 1);
      e.classList.toggle('selected');
    } else if (selection.current.length >= 5) {
      toast.error('reached maximum selection capacity!');
      return;
    }
    if (selection.current.length === 5) {
      toast.error('reached maximum selection capacity!');
    }
    force((n) => n + 1);
  };

  const recommend = () => {
    if (selection.current.length === 0) return;
    onRecommend(selection.current.slice());
  };

  return (
    <Fragment key="artistSearch">
      {selection.current.length > 0 ? (
        <div className="funcs">
          <button onClick={recommend}>Recommend Tracks</button>
        </div>
      ) : null}
      <ul ref={listRef} className={artists.length === 1 ? 'single' : ''}>
        {artists.map((artist) => (
          <Fragment key={artist.id}>
            <li>
              <div className="artist-results">
                <div
                  className={artists.length === 1 ? 'single-item' : 'item'}
                  onClick={(e) => handleSelect(e.currentTarget, artist.id)}
                >
                  {artist.images && artist.images[0] ? (
                    <div className="art">
                      <img
                        alt="artist art"
                        src={(artist.images[2] || artist.images[0]).url}
                      />
                    </div>
                  ) : null}
                  <p className="name">{artist.name}</p>
                </div>
              </div>
            </li>
          </Fragment>
        ))}
      </ul>
    </Fragment>
  );
}
