/**
 * parser.js
 * Browser-side binary parser for LILA BLACK Nakama-format Parquet files.
 *
 * The files are standard Apache Parquet (magic PAR1), but produced by parquet-go
 * with a specific column layout. Because pyarrow / Arrow JS are unavailable in
 * this deployment, we use direct binary inspection:
 *
 *   1. Validate PAR1 magic bytes.
 *   2. Scan for the map_id string (first length-prefixed uppercase alphanumeric
 *      string in the first 8 KB of the file).
 *   3. Collect all event-name occurrences via length-prefix + string matching.
 *   4. Locate the x-coordinate float32 column using boundary detection
 *      (the column is preceded by a garbage/out-of-range float32 value, and its
 *      values satisfy: spread ≥ 3, first value non-zero, non-zero count ≥ n/4).
 *   5. The z-coordinate column is found by the same method, starting after x.
 *   6. Timestamps (uint32, microseconds from epoch) are found between z-end and
 *      the first event string, checking for a monotonically-increasing sequence
 *      in the range 1e9–3e9 µs (approximately Jan–Sep 1970).
 *   7. For files using delta/RLE encoding (5/20 in the sample set), coordinate
 *      columns are not recoverable — events are still listed without positions.
 *
 * Coordinate → pixel mapping (per README):
 *   u  = (x - origin_x) / scale
 *   v  = (z - origin_z) / scale
 *   px = u * 1024
 *   py = (1 - v) * 1024
 */

const MAP_CONFIGS = {
  AmbroseValley: { scale: 900,  ox: -370, oz: -473, img: 'assets/AmbroseValley_Minimap.png' },
  GrandRift:     { scale: 581,  ox: -290, oz: -290, img: 'assets/GrandRift_Minimap.png'     },
  Lockdown:      { scale: 1000, ox: -500, oz: -500, img: 'assets/Lockdown_Minimap.jpg'      },
};

const EVENT_NAMES = [
  'KilledByStorm','BotPosition','BotKilled','BotKill',
  'Position','Killed','Kill','Loot'
];

const COORD_THRESHOLD = 700; // All map extents fit within ±700 world units

// ─── private helpers ──────────────────────────────────────────────────────────

function _isPrevBad(v) {
  return isNaN(v) || !isFinite(v) || Math.abs(v) > COORD_THRESHOLD || Math.abs(v) < 0.0001;
}
function _isValBad(v) {
  return isNaN(v) || !isFinite(v) || Math.abs(v) > COORD_THRESHOLD;
  // NOTE: 0.0 is allowed — it represents a null/padded coordinate value.
}

/**
 * Find a float32 column starting from `searchFrom`.
 * Returns { offset, values } or null.
 */
function _findF32Col(dv, n, searchFrom, searchTo) {
  const limit = Math.min(dv.byteLength - n * 4, searchTo);
  for (let s = searchFrom; s < limit; s += 4) {
    const prev = dv.getFloat32(s - 4, true);
    if (!_isPrevBad(prev)) continue;

    const vals = [];
    let ok = true;
    for (let j = 0; j < n; j++) {
      const v = dv.getFloat32(s + j * 4, true);
      if (_isValBad(v)) { ok = false; break; }
      vals.push(v);
    }
    if (!ok) continue;

    const nonZero = vals.filter(v => Math.abs(v) > 0.5).length;
    const spread  = Math.max(...vals) - Math.min(...vals);
    if (nonZero >= Math.max(2, Math.floor(n / 4)) && spread >= 3 && Math.abs(vals[0]) > 0.5) {
      return { offset: s, values: vals };
    }
  }
  return null;
}

/**
 * Find the uint32 timestamp column (µs from epoch, monotonically increasing).
 * Returns array of values or null.
 */
function _findTsCol(dv, n, searchFrom, searchTo) {
  const limit = Math.min(dv.byteLength, searchTo);
  for (let s = searchFrom; s < limit - n * 4; s += 4) {
    const vals = [];
    let ok = true;
    for (let j = 0; j < n; j++) {
      if (s + j * 4 + 4 > dv.byteLength) { ok = false; break; }
      const v = dv.getUint32(s + j * 4, true);
      if (v < 1_000_000_000 || v > 3_000_000_000) { ok = false; break; }
      vals.push(v);
    }
    if (!ok) continue;
    const increasing = vals.filter((v, i) => i === 0 || v >= vals[i - 1]).length;
    if (increasing >= Math.max(Math.floor(n / 2), 2)) return vals;
  }
  return null;
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Parse a single .nakama-0 Parquet file ArrayBuffer.
 * @param {ArrayBuffer} buffer
 * @param {string}      filename  e.g. "uid_matchid.nakama-0"
 * @returns {Session|null}
 */
export function parseParquet(buffer, filename) {
  const u8  = new Uint8Array(buffer);
  const dv  = new DataView(buffer);

  // Validate magic
  const magic = String.fromCharCode(u8[0], u8[1], u8[2], u8[3]);
  if (magic !== 'PAR1') throw new Error(`Not a Parquet file: ${filename}`);

  // Extract uid / match_id from filename
  const base   = filename.replace('.nakama-0', '');
  const parts  = base.split('_');
  const uid    = parts[0];
  const mid    = parts.slice(1).join('_');
  const is_bot = /^\d+$/.test(uid);

  // Scan for map_id (first length-prefixed uppercase-start alphanumeric string)
  let map_id = 'Unknown';
  for (let i = 0; i < Math.min(u8.length - 4, 8000); i++) {
    const l = dv.getInt32(i, true);
    if (l < 5 || l > 25 || i + 4 + l > u8.length) continue;
    try {
      const s = new TextDecoder().decode(u8.slice(i + 4, i + 4 + l));
      if (/^[A-Z][A-Za-z0-9]+$/.test(s) && !EVENT_NAMES.includes(s)) {
        map_id = s; break;
      }
    } catch { /* skip */ }
  }

  // Collect all event occurrences
  const enc = new TextEncoder();
  const rawEvents = [];
  for (const evName of EVENT_NAMES) {
    const eb  = enc.encode(evName);
    const len = evName.length;
    // Build length prefix bytes
    const lpArr = new Uint8Array(4);
    new DataView(lpArr.buffer).setInt32(0, len, true);

    let pos = 0;
    outer: while (pos < u8.length - len - 4) {
      for (let i = pos; i < Math.min(u8.length - len - 4, pos + 80000); i++) {
        if (u8[i] !== lpArr[0] || u8[i+1] !== lpArr[1] ||
            u8[i+2] !== lpArr[2] || u8[i+3] !== lpArr[3]) continue;
        let match = true;
        for (let j = 0; j < len; j++) {
          if (u8[i + 4 + j] !== eb[j]) { match = false; break; }
        }
        if (match) { rawEvents.push({ offset: i, ev: evName }); pos = i + 1; continue outer; }
      }
      break;
    }
  }
  rawEvents.sort((a, b) => a.offset - b.offset);
  const n = rawEvents.length;
  if (n === 0) return null;

  const eventsStart = rawEvents[0].offset;

  // Find coordinate columns
  const xCol = _findF32Col(dv, n, 4, 9000);
  const zCol = xCol ? _findF32Col(dv, n, xCol.offset + n * 4, 12000) : null;
  const tsVals = zCol ? _findTsCol(dv, n, zCol.offset + n * 4, eventsStart + 600) : null;

  // Get map config for pixel conversion
  const cfg = MAP_CONFIGS[map_id] || MAP_CONFIGS.AmbroseValley;
  const { scale, ox, oz } = cfg;

  // Build event list
  const events = rawEvents.map((e, i) => {
    const xv    = xCol ? xCol.values[i] : null;
    const zv    = zCol ? zCol.values[i] : null;
    const ts    = tsVals ? tsVals[i] : null;
    const valid = xv !== null && zv !== null && (Math.abs(xv) > 0.1 || Math.abs(zv) > 0.1);

    let px = null, py = null;
    if (valid) {
      px = ((xv - ox) / scale) * 1024;
      py = (1 - (zv - oz) / scale) * 1024;
    }

    return {
      ev:  e.ev,
      x:   valid ? Math.round(xv * 100) / 100 : null,
      z:   valid ? Math.round(zv * 100) / 100 : null,
      px:  px !== null ? Math.round(px * 10) / 10 : null,
      py:  py !== null ? Math.round(py * 10) / 10 : null,
      ts,
    };
  });

  // Relative timestamps (µs elapsed from session start)
  if (tsVals) {
    const t0 = Math.min(...tsVals);
    events.forEach(e => {
      if (e.ts !== null) e.ts_rel = e.ts - t0;
    });
  }

  // Event type counts
  const ec = {};
  events.forEach(e => { ec[e.ev] = (ec[e.ev] || 0) + 1; });

  return {
    uid,
    uid_short: uid.slice(0, 8),
    mid,
    map_id,
    is_bot,
    events,
    ec,
    n_events:   events.length,
    hasCoords:  !!(xCol && zCol),
    hasTs:      !!tsVals,
  };
}
