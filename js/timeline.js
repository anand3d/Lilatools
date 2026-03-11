/**
 * timeline.js
 * Playback engine for timeline scrubbing.
 *
 * For sessions that have timestamps (ts_rel in microseconds from session start),
 * events are revealed progressively as the playhead advances.
 *
 * timeMs = playhead position in milliseconds from the start of the selected match.
 * totalMs = total duration of the match in milliseconds.
 */

export class Timeline {
  constructor(onTick) {
    this.onTick   = onTick;   // callback(timeMs)
    this.timeMs   = 0;
    this.totalMs  = 0;
    this.playing  = false;
    this.speed    = 1.0;      // 1× real-time by default; can be 0.5×, 2×, 5×, 10×
    this._lastRAF = null;
    this._prevT   = null;
  }

  /**
   * Initialize with a set of sessions. Finds the max ts_rel across all events.
   */
  load(sessions) {
    let maxTs = 0;
    sessions.forEach(s => {
      if (!s.hasTs) return;
      s.events.forEach(e => {
        if (e.ts_rel != null && e.ts_rel > maxTs) maxTs = e.ts_rel;
      });
    });
    this.totalMs = maxTs / 1000; // µs → ms
    this.timeMs  = 0;
    this.stop();
  }

  /** Set playhead to a specific ms value. */
  seek(ms) {
    this.timeMs = Math.max(0, Math.min(this.totalMs, ms));
    this.onTick(this.timeMs);
  }

  play() {
    if (this.playing) return;
    // If at end, restart
    if (this.timeMs >= this.totalMs) this.timeMs = 0;
    this.playing = true;
    this._prevT  = null;
    this._tick();
  }

  stop() {
    this.playing = false;
    if (this._lastRAF) { cancelAnimationFrame(this._lastRAF); this._lastRAF = null; }
  }

  toggle() {
    this.playing ? this.stop() : this.play();
  }

  _tick() {
    if (!this.playing) return;
    this._lastRAF = requestAnimationFrame(now => {
      if (this._prevT !== null) {
        const delta = (now - this._prevT) * this.speed; // ms of wall time × speed
        this.timeMs  = Math.min(this.totalMs, this.timeMs + delta);
        this.onTick(this.timeMs);
        if (this.timeMs >= this.totalMs) {
          this.playing = false;
          this.onTick(this.totalMs);
          return;
        }
      }
      this._prevT = now;
      this._tick();
    });
  }
}

/**
 * Format milliseconds as MM:SS
 */
export function formatMs(ms) {
  if (!ms) return '0:00';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
