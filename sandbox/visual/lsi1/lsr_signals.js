// ═══ lsi1/lsr_signals.js — LEFT-STICK INPUT LAB V1: the DERIVED STICK SIGNALS and the DIAGNOSTIC STICK EVENTS ══════════════════════════════════
// Pure (browser and node). One sample = the stick as the input pipeline read it: time (s) and raw x (right) / y (up = the camera forward), each
// in −1 … 1 of the stick radius, BEFORE the deadzone. The deadzone is the canonical one (tc_baseline_88573ef0/pt_input.js STICK.deadzone, 0.08).
// NOTHING HERE TRIGGERS ANYTHING. These are diagnostics for the owner's recordings; no intent recognizer exists. The MARKERS below are DISPLAY
// levels for the diagnostic events (where a marker is drawn on the plots), not gesture thresholds — every raw sample is stored, so any analysis can
// recompute the events at other levels.
export const LSR_SIGNALS_VERSION = 1;
export const WINDOWS_MS = [50, 100, 150, 250, 500];
export const ZONES = { deadzone: 0.08, walkTo: 0.40, jogTo: 0.72 };   // (the canonical stick zones, pt_input.js STICK — read, never changed)
export const MARKERS = {
  nearNeutral: 0.30,                  // "returned near neutral": the raw radius falls below this
  crossDeg: 135,                      // "crossed centre": the direction before and after the near-neutral region (or one segment through it) differs by ≥ this
  reversalDeg: 135, reversalMs: 150, reversalRearm: 90,     // "rapid reversal": |direction change over 150 ms| ≥ 135° (again once it falls below 90°)
  largeTurnDeg: 60, largeTurnMs: 250, largeTurnRearm: 30,   // "large angular turn": |direction change over 250 ms| ≥ 60° (again below 30°)
  spikeRate: 5.0, spikeRearm: 1.0,    // "magnitude spike / release": the raw radius rising / falling ≥ 5 radius/s (again below 1 /s)
  dirChangeDeg: 15, dirChangeMs: 100, // "time since meaningful direction change": since |direction change over 100 ms| was last ≥ 15°
  corridorDeg: 10,                    // "time held within an angular corridor": the angle within ±10° of the current angle, looking back
  holdMs: 300, holdMinR: 0.40,        // "direction hold": in the corridor ≥ 300 ms at radius ≥ 0.40 (the canonical walk / jog boundary)
  above: [0.40, 0.72, 0.95],          // "time held above magnitude levels": the canonical zone boundaries 0.40 / 0.72, and 0.95 (full tilt)
  histS: 3.0,                         // the look-back kept (s); the corridor time is capped at it
};
export const EVENT_KINDS = ["dz_enter", "dz_exit", "near_neutral", "centre_cross", "reversal", "large_turn", "mag_spike", "mag_release", "dir_hold"];
export const EVENT_NAMES = { dz_enter: "entered deadzone", dz_exit: "left deadzone", near_neutral: "returned near neutral", centre_cross: "crossed centre", reversal: "rapid reversal",
  large_turn: "large angular turn", mag_spike: "magnitude spike", mag_release: "magnitude release", dir_hold: "direction hold" };
// the derived row's fields (the order of the recording's columns)
export const DERIVED_FIELDS = ["t", "x", "y", "r", "th", "thu", "m", "dth", "om", "al", "rd", "d50", "d100", "d150", "d250", "d500", "maxRecent", "tSinceDir", "tSinceNeutral", "tCorr", "tAbove40", "tAbove72", "tAbove95"];
const R2D = 180 / Math.PI;
export const wrapDeg = (a) => { a = (a + 180) % 360; if (a < 0) a += 360; return a - 180; };
// the stick's direction: 0 = up (the camera forward at the latch), + = right — the canonical stickAngleDeg convention
export const angleDeg = (x, y) => Math.atan2(x, y) * R2D;
// the shortest distance from the origin to the segment a → b (for a fast swipe through the centre between two samples)
function segDist(ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy; if (L < 1e-12) return Math.hypot(ax, ay); let u = -(ax * dx + ay * dy) / L; u = u < 0 ? 0 : u > 1 ? 1 : u; return Math.hypot(ax + u * dx, ay + u * dy); }

// THE STREAMING ANALYZER: push the samples in time order; each push returns the derived row and the events it raised
export class StickAnalyzer {
  constructor(o = {}) { this.dz = o.deadzone != null ? o.deadzone : ZONES.deadzone; this.M = Object.assign({}, MARKERS, o.markers || {}); this.reset(); }
  reset() { this.hist = []; this.prev = null; this.lastValid = null; this.lastDirT = null; this.lastNeutralT = null; this.aboveStart = [null, null, null]; this.armed = { rev: true, turn: true, spike: true, rel: true, hold: true }; this.nnEntryTh = null; this.inNear = false; }
  // the unwrapped angle at time tau: interpolated between two valid samples that bracket it, else the latest valid sample at or before it
  thuAt(tau) { const H = this.hist; for (let i = H.length - 1; i >= 0; i--) { const a = H[i]; if (a.t > tau + 1e-9) continue; if (!a.valid) { for (let j = i - 1; j >= 0; j--) if (H[j].valid) return H[j].t >= tau - this.M.histS ? H[j].thu : null; return null; }
      const b = H[i + 1]; if (b && b.valid && b.t > a.t && b.t > tau) return a.thu + (b.thu - a.thu) * (tau - a.t) / (b.t - a.t); return a.thu; } return null; }
  push(t, x, y) {
    const M = this.M, dz = this.dz, r = Math.hypot(x, y), rc = Math.min(1, r), valid = rc >= dz && r > 1e-9, p = this.prev, ev = [];
    const th = valid ? angleDeg(x, y) : null, lv = this.lastValid, thu = valid ? (lv ? lv.thu + wrapDeg(th - lv.th) : th) : null;
    const dt = p ? t - p.t : 0, dth = valid && lv ? wrapDeg(th - lv.th) : null;
    const om = valid && p && p.valid && dt > 1e-6 ? dth / dt : null, al = om != null && p && p.om != null && dt > 1e-6 ? (om - p.om) / dt : null, rd = p && dt > 1e-6 ? (rc - p.r) / dt : null;
    const row = { t, x, y, r: rc, th, thu, m: valid ? (rc - dz) / (1 - dz) : 0, dth, om, al, rd };
    const cur = { t, valid, thu, th, r: rc, om }; this.hist.push(cur);
    for (const W of WINDOWS_MS) { const ref = valid ? this.thuAt(t - W / 1000) : null; row["d" + W] = valid && ref != null ? thu - ref : null; }
    // the largest change between now and any valid sample in the last 500 ms
    let mr = null; if (valid) { mr = 0; for (let i = this.hist.length - 1; i >= 0; i--) { const a = this.hist[i]; if (a.t < t - 0.5 - 1e-9) break; if (a.valid) mr = Math.max(mr, Math.abs(thu - a.thu)); } } row.maxRecent = mr;
    if (row.d100 != null && Math.abs(row.d100) >= M.dirChangeDeg) this.lastDirT = t; row.tSinceDir = this.lastDirT != null ? t - this.lastDirT : null;
    if (!valid) this.lastNeutralT = t; row.tSinceNeutral = this.lastNeutralT != null ? t - this.lastNeutralT : null;
    let tc = null; if (valid) { let e = t; for (let i = this.hist.length - 2; i >= 0; i--) { const a = this.hist[i]; if (!a.valid || Math.abs(a.thu - thu) > M.corridorDeg) break; e = a.t; } tc = t - e; } row.tCorr = tc;
    M.above.forEach((L, i) => { if (rc >= L) { if (this.aboveStart[i] == null) this.aboveStart[i] = t; } else this.aboveStart[i] = null; row["tAbove" + Math.round(L * 100)] = this.aboveStart[i] != null ? t - this.aboveStart[i] : 0; });
    // ── the diagnostic events ──
    if (p) { if (p.valid && !valid) ev.push({ t, kind: "dz_enter", r: rc }); if (!p.valid && valid) ev.push({ t, kind: "dz_exit", th, r: rc }); }
    const NN = M.nearNeutral;
    if (p && p.r >= NN && rc < NN) { ev.push({ t, kind: "near_neutral", r: rc }); this.inNear = true; this.nnEntryTh = p.valid ? p.th : lv ? lv.th : null; }
    else if (!p && rc < NN) { this.inNear = true; this.nnEntryTh = null; }
    if (this.inNear && rc >= NN) { this.inNear = false; if (valid && this.nnEntryTh != null) { const d = wrapDeg(th - this.nnEntryTh); if (Math.abs(d) >= M.crossDeg) ev.push({ t, kind: "centre_cross", from: this.nnEntryTh, to: th, d, via: "near-neutral" }); } this.nnEntryTh = null; }
    else if (p && !this.inNear && p.r >= NN && rc >= NN && p.valid && valid && segDist(p.x, p.y, x, y) < NN) { const d = wrapDeg(th - p.th); if (Math.abs(d) >= M.crossDeg) ev.push({ t, kind: "centre_cross", from: p.th, to: th, d, via: "segment" }); }
    const A = this.armed, d150 = row.d150, d250 = row.d250;
    if (d150 != null && Math.abs(d150) >= M.reversalDeg) { if (A.rev) { ev.push({ t, kind: "reversal", d: d150 }); A.rev = false; } } else if (d150 == null || Math.abs(d150) < M.reversalRearm) A.rev = true;
    if (d250 != null && Math.abs(d250) >= M.largeTurnDeg) { if (A.turn) { ev.push({ t, kind: "large_turn", d: d250 }); A.turn = false; } } else if (d250 == null || Math.abs(d250) < M.largeTurnRearm) A.turn = true;
    if (rd != null && rd >= M.spikeRate) { if (A.spike) { ev.push({ t, kind: "mag_spike", rd }); A.spike = false; } } else if (rd == null || rd < M.spikeRearm) A.spike = true;
    if (rd != null && rd <= -M.spikeRate) { if (A.rel) { ev.push({ t, kind: "mag_release", rd }); A.rel = false; } } else if (rd == null || rd > -M.spikeRearm) A.rel = true;
    if (valid && rc >= M.holdMinR && tc != null && tc >= M.holdMs / 1000 - 1e-9) { if (A.hold) { ev.push({ t, kind: "dir_hold", th, tCorr: tc }); A.hold = false; } } else A.hold = true;
    while (this.hist.length > 2 && this.hist[0].t < t - M.histS) this.hist.shift();
    this.prev = Object.assign(cur, { x, y }); if (valid) this.lastValid = cur;
    return { row, ev };
  }
}
// the batch form (the same code): samples [{ t, x, y }] → { rows, events }
export function analyzeSamples(samples, o = {}) { const A = new StickAnalyzer(o), rows = [], events = []; for (const s of samples) { const { row, ev } = A.push(s.t, s.x, s.y); rows.push(row); for (const e of ev) { e.i = rows.length - 1; events.push(e); } } return { rows, events }; }
// the stick's mode zone (canonical stickMode): the raw radius → WALK / JOG / RUN
export const zoneOf = (r, Z = ZONES) => (r < Z.deadzone ? "—" : r < Z.walkTo ? "WALK" : r < Z.jogTo ? "JOG" : "RUN");
