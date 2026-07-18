# Arcade

A collection of childhood arcade game remakes, playable in the browser and hosted on GitHub Pages.

## Games

| Game | Status | Play |
|------|--------|------|
| Laser Tag | Playable | `games/laser-tag/` |

More games coming soon.

## Tech Stack

**Vanilla HTML + CSS + JavaScript (ES modules) with the Canvas 2D API. No build step, no dependencies.**

Why this stack:

- **GitHub Pages serves static files.** With no build step, the repo *is* the site — push to `main` and it's live. No CI pipeline, no bundler config, nothing to break.
- **Canvas 2D is ideal for retro arcade games.** These games are pixels, lines, and simple shapes redrawn 60 times a second. Canvas does exactly this with no library needed.
- **ES modules give structure without tooling.** Each game lives in its own folder with its own modules; the browser loads them natively.
- **Zero dependencies means zero maintenance.** Nothing to update, audit, or re-install years from now.

If a future game outgrows this (e.g. needs physics or WebGL), we can add a library to just that game's folder without touching the rest of the arcade.

## Project Structure

```
arcade/
├── index.html           # Arcade lobby: lists and links to all games
├── styles/              # Shared retro styling
├── games/
│   └── laser-tag/       # Each game is self-contained
│       ├── index.html
│       ├── game.js      # and other modules
│       └── ...
└── docs/
    └── laser-tag-design.md
```

## Running Locally

Because the games use ES modules, you need any static file server (opening `index.html` via `file://` won't work):

```bash
cd arcade
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploying to GitHub Pages

1. Push this repo to GitHub (e.g. `rfong/arcade`).
2. On GitHub: **Settings → Pages → Build and deployment**.
3. Set **Source** to "Deploy from a branch", branch `main`, folder `/ (root)`.
4. The site goes live at `https://<username>.github.io/arcade/` within a minute or two.

Every subsequent push to `main` redeploys automatically. All asset paths in this repo are relative, so it works both at the repo subpath and locally.

## Adding a New Game

1. Create `games/<game-name>/` with its own `index.html`.
2. Add a design doc in `docs/`.
3. Add a card for it in the root `index.html` lobby.
