# Chicken Spotify Explore

A song recommendation app that uses your Spotify top artists/tracks (or any artist/track you search for) to find similar music via Last.fm, then builds a Spotify playlist from the results.

## Features

- Login with Spotify (PKCE auth, no backend)
- Explore by your Recent or All-Time Top Artists / Top Tracks
- Search and pick up to 5 artists or tracks as seeds
- ~50 similar tracks per run, surfaced from Last.fm's similarity graph
- 30s previews via iTunes (loaded on demand when you click Play)
- Create a private Spotify playlist from the results in one click

## Local setup

```
npm install
npm start
```

The app runs at **http://127.0.0.1:3000** (not `localhost` — Spotify rejects `localhost` redirect URIs).

### Spotify app config

In your Spotify Developer dashboard, add both redirect URIs:

- `http://127.0.0.1:3000/`
- `https://chickengamer555.github.io/chicken-spotify-explore/`

The client ID is hardcoded in `src/authCreds.js`.

## Deploy

```
npm run deploy
```

Publishes `build/` to the `gh-pages` branch.

## Stack

React 17, react-scripts, axios, react-toastify, SCSS. Spotify Web API + Last.fm API + iTunes Search API.
