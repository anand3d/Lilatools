# Architecture — LILA BLACK Telemetry Tool

## Tech Stack

**Pure HTML/CSS/JavaScript (ES modules). No build step. No framework.**

The tool is a single static website deployable anywhere a file host exists — GitHub Pages, Netlify, S3. The reviewer can open `index.html` directly from disk or via URL with identical behaviour.

Why not React/Streamlit/Next?
- A framework introduces a build pipeline. That's another point of failure reviewers have to deal with.
- This tool has no server-side logic and no state that needs syncing across users. Static wins.
- ES modules (native browser feature since 2018) give us clean code separation without a bundler.
- Canvas rendering via the 2D API is more than sufficient for hundreds of events at 60fps.

---

## Data Flow

```
.nakama-0 files (Parquet)
        │
        ▼
  Python build script (build_data.py)
  ├── Validates PAR1 magic bytes
  ├── Scans for map_id string via length-prefix detection
  ├── Collects event offsets by matching length-prefixed event name strings
  ├── Locates x / z float32 columns via boundary detection
  │     (column preceded by out-of-range float; spread ≥ 3; non-zero count ≥ n/4)
  ├── Locates timestamp column (uint32, µs from epoch, monotonically increasing)
  └── Outputs data/sessions.json with world coords + pre-computed pixel positions
        │
        ▼
  Browser loads data/sessions.json on startup (~22 KB for 20 sessions)
        │
        ▼
  app.js — filter state, UI wiring, render loop
  canvas.js — MapRenderer, marker drawing, heatmap KDE
  timeline.js — playback engine (requestAnimationFrame, configurable speed)
        │
        ▼
  User sees: minimap + event markers + paths + heatmap + timeline scrubber
```

**Users can also drag and drop additional .nakama-0 files** onto the viewport. The same binary parser is implemented in JS (`parser.js`) and runs entirely in the browser — no upload, no server.

---

## Coordinate Mapping

The README specifies:
```
pixel_x = (x - origin_x) / scale * 1024
pixel_y = (1 - (z - origin_z) / scale) * 1024  ← Y-axis flipped
```

Map configs:

| Map | Scale | Origin X | Origin Z |
|-----|-------|----------|----------|
| AmbroseValley | 900 | -370 | -473 |
| GrandRift | 581 | -290 | -290 |
| Lockdown | 1000 | -500 | -500 |

All 14/20 parseable sessions produce pixel coordinates within `[0, 1024]`. The 6 that don't parse use delta/RLE encoding that requires a full Parquet schema decoder — they still appear in the player list with their events but without map positions.

---

## Parquet Binary Parsing

The files use `parquet-go` with plain (non-compressed) encoding for float32 columns. The parser doesn't implement the Parquet spec fully — it uses the structural regularity of `parquet-go`'s output:

1. All float32 values for a column are contiguous in memory.
2. The column is preceded by a value outside the valid coordinate range (the Parquet page header bytes, interpreted as float32, always land outside ±700).
3. A valid coordinate column has spread ≥ 3.0 and ≥ 25% non-zero values.

One edge case required special handling: some files contain a null sentinel value (`-1240.1` / float32 bytes `c4 9b 03 33`). The threshold of 700 (not 2000) excludes this value while keeping all real coordinates.

Timestamps are uint32, little-endian, microseconds from the Unix epoch. Values fall in the range ~1.4–2.5 billion µs (~1970-01-17 to 1970-01-29 UTC). Parquet stores them before the event-name string block, making them locatable via search.

---

## Trade-offs

| Decision | Why | Cost |
|----------|-----|------|
| Pre-parse to JSON at build time | Instant startup; no WASM dependency | Reviewer must re-run `build_data.py` if they add new files |
| JS binary parser for drag-dropped files | Works offline, no upload | Can't decode delta/RLE compressed columns (~30% of files in this sample) |
| Canvas 2D instead of WebGL | Simpler code, no shader maintenance | Heatmap rebuild on every pan/zoom (~5ms at 1080p, barely perceptible) |
| No date filter | This sample has no date metadata in the parquet schema | Would add it with more time once confirmed field exists |
| 20 sample sessions only | That's what was provided | With the full 1,243-file dataset, switch to a server-side API + chunked loading |

---

## With More Time

1. **Full Parquet decoder**: Implement delta/RLE decoding to recover coordinates from the 30% of files currently unparseable. Or integrate the Apache Arrow JS library for full spec compliance.

2. **Date filtering**: Parse the absolute timestamps (stored as µs from epoch) back into calendar dates and add a date-range picker. The data to do this already exists in the JSON.

3. **Scalability**: At 1,243 files the static JSON approach breaks. The right answer is a lightweight Python API (FastAPI) that streams events for the active map/match on demand, with the frontend fetching only what's visible.

4. **Session replay**: Animate individual players moving across the map frame-by-frame rather than just scrubbing a time window.

5. **Zone annotation**: Let level designers draw a polygon on the map and instantly see kill rate, loot density, and traffic volume inside it. That's the insight that drives map iteration.

6. **Bot vs. human overlay split**: Side-by-side heatmaps showing where bots concentrate vs where human players go. Divergence = a design signal.
