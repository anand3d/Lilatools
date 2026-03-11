#!/usr/bin/env python3
"""
build_data.py — LILA BLACK Telemetry Pipeline
Parses .nakama-0 (Parquet) files and produces data/sessions.json.

Usage:
    python3 build_data.py                               # uses uploads dir, outputs data/sessions.json
    python3 build_data.py --input /path/to/files        # custom input dir
    python3 build_data.py --input dir --output out.json # custom output

No dependencies beyond Python stdlib.
"""
import struct, os, json, sys, argparse

EVENT_NAMES = ['KilledByStorm','BotPosition','BotKilled','BotKill',
               'Position','Killed','Kill','Loot']

MAP_CONFIGS = {
    'AmbroseValley': {'scale': 900,  'ox': -370, 'oz': -473, 'img': 'assets/AmbroseValley_Minimap.png'},
    'GrandRift':     {'scale': 581,  'ox': -290, 'oz': -290, 'img': 'assets/GrandRift_Minimap.png'},
    'Lockdown':      {'scale': 1000, 'ox': -500, 'oz': -500, 'img': 'assets/Lockdown_Minimap.jpg'},
}

THR = 700  # Max valid world coordinate magnitude


def bad_prev(v):
    """A 'boundary' float: out-of-range or near-zero — signals a column start."""
    return (v != v) or not (-THR < v < THR) or abs(v) < 0.0001


def bad_val(v):
    """An invalid float within a coordinate column."""
    return (v != v) or abs(v) > THR
    # NOTE: 0.0 is allowed — it represents a null/padded value.


def find_float_col(data, n, search_from, search_to):
    """Find a contiguous float32 column of length n via boundary detection."""
    limit = min(len(data) - n * 4, search_to)
    for s in range(search_from, limit, 4):
        pv = struct.unpack('<f', data[s - 4:s])[0]
        if not bad_prev(pv):
            continue
        vals, ok = [], True
        for j in range(n):
            v = struct.unpack('<f', data[s + j * 4:s + j * 4 + 4])[0]
            if bad_val(v):
                ok = False
                break
            vals.append(v)
        if not ok:
            continue
        non_zero = sum(1 for v in vals if abs(v) > 0.5)
        spread = max(vals) - min(vals)
        if non_zero >= max(2, n // 4) and spread >= 3 and abs(vals[0]) > 0.5:
            return s, vals
    return None, None


def find_ts_col(data, n, search_from, search_to):
    """Find uint32 timestamp column (µs from epoch, monotonically increasing)."""
    limit = min(len(data), search_to)
    for s in range(search_from, limit - n * 4, 4):
        vals, ok = [], True
        for j in range(n):
            if s + j * 4 + 4 > len(data):
                ok = False
                break
            v = struct.unpack('<I', data[s + j * 4:s + j * 4 + 4])[0]
            if not (1_000_000_000 < v < 3_000_000_000):
                ok = False
                break
            vals.append(v)
        if not ok:
            continue
        inc = sum(1 for i in range(len(vals) - 1) if vals[i] <= vals[i + 1])
        if inc >= max(n // 2, 2):
            return vals
    return None


def parse_file(filepath):
    with open(filepath, 'rb') as f:
        data = f.read()

    # Validate Parquet magic
    if data[:4] != b'PAR1':
        return None

    fname = os.path.basename(filepath)
    base  = fname.replace('.nakama-0', '').replace('.parquet', '')
    parts = base.split('_')
    uid   = parts[0]
    mid   = '_'.join(parts[1:])
    is_bot = uid.isdigit()

    # Map ID: first length-prefixed uppercase-start alphanumeric string
    map_id = 'Unknown'
    for i in range(min(len(data) - 4, 8000)):
        try:
            l = struct.unpack('<i', data[i:i + 4])[0]
            if 5 <= l <= 25 and i + 4 + l <= len(data):
                s = data[i + 4:i + 4 + l].decode('utf-8')
                if s[0].isupper() and s.isalnum() and s not in EVENT_NAMES:
                    map_id = s
                    break
        except Exception:
            pass

    # Collect event occurrences
    raw_events = []
    for ev in EVENT_NAMES:
        eb  = ev.encode()
        lp  = struct.pack('<i', len(eb))
        pos = 0
        while True:
            idx = data.find(lp + eb, pos)
            if idx == -1:
                break
            raw_events.append((idx, ev))
            pos = idx + 1
    raw_events.sort()
    n = len(raw_events)
    if not n:
        return None

    ev_start = raw_events[0][0]

    # Find coordinate columns
    x_off, x_vals = find_float_col(data, n, 4,                  9000)
    z_off, z_vals = find_float_col(data, n, x_off + n * 4 if x_off else 0, 12000) if x_off else (None, None)
    ts_vals        = find_ts_col(data, n, z_off + n * 4 if z_off else 0, ev_start + 600) if z_off else None

    # Pixel mapping
    cfg   = MAP_CONFIGS.get(map_id, MAP_CONFIGS['AmbroseValley'])
    scale, ox, oz = cfg['scale'], cfg['ox'], cfg['oz']

    # Build events
    events = []
    for i, (_, ev) in enumerate(raw_events):
        xv = x_vals[i] if x_vals else None
        zv = z_vals[i] if z_vals else None
        ts = ts_vals[i] if ts_vals else None
        valid = xv is not None and zv is not None and (abs(xv) > 0.1 or abs(zv) > 0.1)
        if valid:
            px = round(((xv - ox) / scale) * 1024, 1)
            py = round((1 - (zv - oz) / scale) * 1024, 1)
        else:
            xv = zv = px = py = None
        e = {'ev': ev, 'x': round(xv, 2) if valid else None,
             'z': round(zv, 2) if valid else None, 'px': px, 'py': py, 'ts': ts}
        events.append(e)

    # Relative timestamps (µs elapsed from session start)
    if ts_vals:
        t0 = min(ts_vals)
        for e in events:
            if e['ts'] is not None:
                e['ts_rel'] = e['ts'] - t0

    ec = {}
    for e in events:
        ec[e['ev']] = ec.get(e['ev'], 0) + 1

    return {
        'uid':       uid,
        'uid_short': uid[:8],
        'mid':       mid,
        'map_id':    map_id,
        'is_bot':    is_bot,
        'events':    events,
        'ec':        ec,
        'n_events':  len(events),
        'hasCoords': bool(x_vals and z_vals),
        'hasTs':     bool(ts_vals),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--input',  default='/mnt/user-data/uploads',
                    help='Directory containing .nakama-0 files')
    ap.add_argument('--output', default='data/sessions.json',
                    help='Output JSON path')
    ap.add_argument('--verbose', '-v', action='store_true')
    args = ap.parse_args()

    files = sorted([
        f for f in os.listdir(args.input)
        if f.endswith('.nakama-0') or f.endswith('.parquet')
    ])

    if not files:
        print(f'No .nakama-0 files found in {args.input}')
        sys.exit(1)

    sessions = []
    ok = err = skip = 0
    for f in files:
        path = os.path.join(args.input, f)
        try:
            s = parse_file(path)
            if s:
                sessions.append(s)
                ok += 1
                if args.verbose:
                    coords = f"coords={'✓' if s['hasCoords'] else '✗'}"
                    ts     = f"ts={'✓' if s['hasTs'] else '✗'}"
                    print(f'  {coords} {ts}  {f[:50]}')
            else:
                skip += 1
        except Exception as e:
            print(f'  ERROR: {f}: {e}')
            err += 1

    os.makedirs(os.path.dirname(args.output) or '.', exist_ok=True)
    with open(args.output, 'w') as fh:
        json.dump(sessions, fh, separators=(',', ':'))

    size = os.path.getsize(args.output)
    print(f'\nParsed: {ok} sessions, {skip} skipped, {err} errors')
    print(f'Output: {args.output} ({size:,} bytes)')
    print(f'  With coordinates:  {sum(1 for s in sessions if s["hasCoords"])} / {len(sessions)}')
    print(f'  With timestamps:   {sum(1 for s in sessions if s["hasTs"])} / {len(sessions)}')
    print(f'  Maps:              {sorted(set(s["map_id"] for s in sessions))}')


if __name__ == '__main__':
    main()
