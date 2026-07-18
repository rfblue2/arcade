# AGENTS.md

## Cursor Cloud specific instructions

This repo is **RFONG'S ARCADE**: a zero-dependency static website (vanilla HTML + CSS + JavaScript ES modules, Canvas 2D). There is **no build step, no package manager, no linter, and no automated test suite** — do not look for `package.json`, `requirements.txt`, ESLint, etc.

### Running locally
The games use native ES modules, so they must be served over HTTP — opening files via `file://` will not work. Serve the repo root with any static server (see `README.md`):

```
python3 -m http.server 8000
# open http://localhost:8000
```

Python 3 is the only runtime needed and is pre-installed. All asset paths are relative, so the site works both locally and at the GitHub Pages subpath.

### Layout / manual testing
- `index.html` is the arcade lobby; it links to `games/laser-tag/index.html`.
- Laser Tag: on the setup screen pick player count and Human/CPU per slot, click **START**, then steer the human ship with the **arrow keys** (Player 1). A round ends with a winner/scoreboard overlay.
- Since there are no tests, verify changes by loading the affected page in a browser and playing/interacting with it.

### Deployment
`/.github/workflows/pages.yml` deploys the repo root to GitHub Pages on push to `master` (the README text says `main`, but the workflow uses `master`).
