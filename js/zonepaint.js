/**
 * zonepaint.js
 * Zone Painter — draw a polygon on the map, get instant stats inside it.
 */

/** Point-in-polygon test (ray casting). px/py are map pixels [0–1024]. */
export function pointInPolygon(px, py, polygon) {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

export class ZonePainter {
  constructor() {
    this.active   = false;   // painting mode on/off
    this.closed   = false;   // polygon completed
    this.points   = [];      // map pixel coords [{ x, y }]
    this.hoverPt  = null;    // current mouse map pixel (for live preview)
    this.onClose  = null;    // callback(stats) when polygon is closed
  }

  /** Toggle painter on/off. Returns new active state. */
  toggle() {
    this.active = !this.active;
    if (!this.active) this.reset();
    return this.active;
  }

  reset() {
    this.points  = [];
    this.closed  = false;
    this.hoverPt = null;
  }

  /** Handle a click at map pixel (mpx, mpy). Returns true if polygon just closed. */
  click(mpx, mpy) {
    if (this.closed) return false;

    // Close if clicking near first point (within 18px) and ≥3 points placed
    if (this.points.length >= 3) {
      const dx = mpx - this.points[0].x;
      const dy = mpy - this.points[0].y;
      if (Math.hypot(dx, dy) < 18) {
        this.closed = true;
        return true;
      }
    }

    this.points.push({ x: mpx, y: mpy });
    return false;
  }

  /** Double-click closes the polygon. */
  dblclick() {
    if (!this.closed && this.points.length >= 3) {
      this.closed = true;
      return true;
    }
    return false;
  }

  /** Compute stats for all events that fall inside the closed polygon. */
  computeStats(sessions, activeEvTypes) {
    if (!this.closed || this.points.length < 3) return null;
    const poly = this.points;
    const matched = [];

    sessions.forEach(s => {
      s.events.forEach(e => {
        if (!e.px || !e.py) return;
        if (!activeEvTypes.has(e.ev)) return;
        if (pointInPolygon(e.px, e.py, poly)) {
          matched.push({ event: e, session: s });
        }
      });
    });

    const kills   = matched.filter(m => m.event.ev === 'Kill'   || m.event.ev === 'BotKill').length;
    const deaths  = matched.filter(m => ['Killed','BotKilled','KilledByStorm'].includes(m.event.ev)).length;
    const loot    = matched.filter(m => m.event.ev === 'Loot').length;
    const pos     = matched.filter(m => m.event.ev === 'Position' || m.event.ev === 'BotPosition').length;
    const players = new Set(matched.map(m => m.session.uid));

    // Most active player in zone
    const pCounts = {};
    matched.forEach(m => { pCounts[m.session.uid] = (pCounts[m.session.uid]||0)+1; });
    const topUid = Object.entries(pCounts).sort((a,b)=>b[1]-a[1])[0];

    return {
      total: matched.length,
      kills, deaths, loot, pos,
      players: players.size,
      topPlayer: topUid ? { uid: topUid[0].slice(0,10), count: topUid[1] } : null,
    };
  }

  /** Draw the polygon + preview edge on the canvas. */
  draw(ctx, renderer) {
    if (!this.points.length) return;

    const pts = this.points.map(p => renderer.toScreen(p.x, p.y));

    // Fill (only when closed)
    if (this.closed) {
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#f0c020';
      ctx.beginPath();
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.sx, p.sy) : ctx.lineTo(p.sx, p.sy));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Outline
    ctx.save();
    ctx.strokeStyle = '#f0c020';
    ctx.lineWidth   = 2;
    ctx.setLineDash(this.closed ? [] : [6, 4]);
    ctx.shadowBlur  = 8;
    ctx.shadowColor = '#f0c020';
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.sx, p.sy) : ctx.lineTo(p.sx, p.sy));
    if (this.closed) ctx.closePath();
    ctx.stroke();

    // Preview edge to mouse
    if (!this.closed && this.hoverPt && pts.length) {
      const last = pts[pts.length - 1];
      const h    = renderer.toScreen(this.hoverPt.x, this.hoverPt.y);
      ctx.globalAlpha = 0.45;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(last.sx, last.sy);
      ctx.lineTo(h.sx, h.sy);
      ctx.stroke();
    }
    ctx.restore();

    // Vertex dots
    pts.forEach((p, i) => {
      ctx.save();
      ctx.fillStyle   = i === 0 ? '#fff' : '#f0c020';
      ctx.strokeStyle = '#000';
      ctx.lineWidth   = 1;
      ctx.shadowBlur  = 6;
      ctx.shadowColor = '#f0c020';
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, i === 0 ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });
  }
}
