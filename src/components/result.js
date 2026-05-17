import React from 'react';
import Tracks from './tracks';
import Functions from './functions';

export default function Result({
  token,
  data,
  excludeOwned,
  onExcludeOwnedChange,
  onExploreArtists,
  onExploreTracks,
  onSelectedArtists,
  onSelectedTracks,
  onCreatePlaylist,
  onBack,
}) {
  if (data) {
    return <Tracks data={data} onBack={onBack} onCreatePlaylist={onCreatePlaylist} />;
  }
  if (token && token !== 'access_denied') {
    return (
      <Functions
        token={token}
        excludeOwned={excludeOwned}
        onExcludeOwnedChange={onExcludeOwnedChange}
        onExploreArtists={onExploreArtists}
        onExploreTracks={onExploreTracks}
        onSelectedArtists={onSelectedArtists}
        onSelectedTracks={onSelectedTracks}
      />
    );
  }
  return null;
}
