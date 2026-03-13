# LILA BLACK — Level Designer Telemetry Tool

A browser-based visualization tool for exploring player behavior across LILA BLACK battle-royale maps. Built for level designers, not data scientists.

**Live demo:** https://anand3d.github.io/lilatools/

---

## What it does

- Plots player positions, kills, loot pickups, and deaths on the correct minimap
- Distinguishes human players (👤) and bots (🤖) visually with per-player color coding
- Heatmap overlays: traffic density, kill zones, death zones
- Timeline playback: scrub through a match or hit play and watch it unfold
- Filter by map, match, player type, or individual event type
- Kill hotzone list: click any hotzone to pan the map to that location
- Drag-and-drop additional `.nakama-0` files directly onto the map - parsed in-browser, no upload needed
- Export the current view as a PNG

---

## Running locally

No server, no build step. Open `index.html` in any modern browser.

```bash
# Option 1: open directly
open index.html

# Option 2: serve via Python (needed if browser blocks file:// for ES modules)
python3 -m http.server 8080
# then open http://localhost:8080
```

Chrome and Firefox both require a local server for ES modules when opening from `file://`. Safari allows it.

---

## Re-running the data pipeline

The tool ships with `data/sessions.json` pre-parsed from the provided `.nakama-0` files. If you have new files:

```bash
# Put .nakama-0 files in a directory
python3 build_data.py --input /path/to/nakama-files/ --output data/sessions.json

# Or drop them onto the viewport in the running tool
```

### Dependencies (build script only)
```
Python 3.8+, stdlib only — no numpy, no pyarrow required
```

---

## Deploying to GitHub Pages

```bash
git init
git add .
git commit -m "LILA BLACK telemetry tool"
git remote add origin git@github.com:anand3d/lilatools.git
git push -u origin main

# In repo Settings → Pages → Source: Deploy from branch → main → / (root)
```

The tool will be live at `https://anand3d.github.io/lilatools/` within ~60 seconds.

---

## Project structure

```
index.html            Entry point
css/app.css           All styles
js/
  app.js              Application state, UI, render loop
  canvas.js           Map rendering, markers, heatmap
  parser.js           Browser-side binary Parquet parser
  timeline.js         Playback engine
data/
  sessions.json       Pre-parsed telemetry (14 sessions with coordinates)
assets/
  AmbroseValley_Minimap.png
  GrandRift_Minimap.png
  Lockdown_Minimap.jpg
build_data.py         Offline data pipeline (Python, stdlib only)
ARCHITECTURE.md       System design doc
```

---

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play/pause timeline |
| `R` | Reset camera |
| `E` | Export PNG |
| Scroll | Zoom (toward cursor) |
| Drag | Pan |
