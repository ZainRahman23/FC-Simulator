// ═══ lsi1/lsr_gesture.js — OWNER INPUT ANALYSIS V1: one recorded attempt cut into an APPROACH and a GESTURE, the gesture described ═══════════════
// Pure (browser and node), from a recorded attempt (lsr_schema.js). OFFLINE ANALYSIS ONLY — nothing here runs in the lab's live loop, nothing
// triggers, selects or buffers anything, and no intent recognizer exists. The levels in SEG are the ANALYSIS'S CUTTING CONVENTIONS (where a
// description starts and ends: "the stick had been held", "it moved away", "it settled") — they are not gesture thresholds and must not be
// copied into a recognizer; every figure the analysis reports is measured from the raw stick between those cuts.
// Frames: the stick as the pipeline read it (60 Hz, raw x right / y up = the camera forward, −1 … 1) and its latched camera heading; the world
// heading of the stick H = latch + the stick angle (the pipeline's headingFrom: + = turning right). Every angle below is PLAYER-RELATIVE: the
// stick's heading against the approach heading H0 (+ = to the player's right of the line he was running), never against the pitch or a goal.
import { col, rowOf } from "./lsr_schema.js";
import { MODES, SUPPORT } from "./lsr_state.js";
export const GESTURE_VERSION = 1;
export const SEG = {
  approachS: 0.30, approachDeg: 4, approachR: 0.40,   // the approach: the stick held ≥ 0.30 s within ±4° at radius ≥ 0.40 (out of the walk zone)
  departDeg: 2, changeDeg: 15,                         // the change: the first excursion ≥ 15° from it; its ONSET the last sample still within 2°
  sideDeg: 10, horizonS: 1.0,                          // a side counts once the stick is ≥ 10° off the line; the other side is looked for 1.0 s on
  settleDeg: 3, settleS: 0.20,                         // settled: within ±3° for ≥ 0.20 s (or released)
  centreR: 0.50,                                       // a transit whose chord passes within 0.5 of the centre went THROUGH the centre
  omegaR: 0.50,                                        // angular velocity only between samples (and chords) ≥ 0.5 from the centre (the centre artefact)
  pre: 0.50, post: 0.70,                               // the window drawn and stored: onset − 0.5 s … onset + 0.7 s
};
const R2D = 180 / Math.PI, wrap = (a) => { a = (a + 180) % 360; if (a < 0) a += 360; return a - 180; };
const chordDist = (x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1, L = dx * dx + dy * dy; if (L < 1e-12) return Math.hypot(x1, y1); const u = Math.max(0, Math.min(1, -(x1 * dx + y1 * dy) / L)); return Math.hypot(x1 + u * dx, y1 + u * dy); };
const median = (A) => { const B = A.filter((v) => v != null && Number.isFinite(v)).sort((a, b) => a - b); return B.length ? (B.length % 2 ? B[B.length >> 1] : (B[B.length / 2 - 1] + B[B.length / 2]) / 2) : null; };
// the stick, frame by frame: simulation time, radius, world heading (null inside the deadzone or untouched)
export function stickTrack(att) { const F = att.frames.data, n = att.frames.n, dz = att.input.deadzone ?? 0.08, out = [];
  for (let i = 0; i < n; i++) { const x = F.rx[i], y = F.ry[i], r = Math.hypot(x, y), on = F.src[i] !== 0 && r > dz;
    out.push({ i, t: F.tSim[i], k: F.k[i], x, y, r: F.src[i] !== 0 ? r : 0, H: on ? wrap(F.latch[i] + Math.atan2(x, y) * R2D) : null, src: F.src[i], mode: F.mode[i] }); }
  return out; }
// the state row at (or just after) t, made readable: speeds, the gait zone, angles against H0, the foot plan's times relative to t
export function stateRow(att, t, H0) { const T = col(att.state, "t"); if (!T.length) return null; let j = 0; while (j < T.length - 1 && T[j] < t - 1e-9) j++;
  const s = rowOf(att.state, j), d = att.dict || {}, nm = (k, v) => (v == null ? null : d[k] ? d[k][v] : v), rel = (h) => (h == null || H0 == null ? null : wrap(h - H0));
  return { t: s.t, speed: s.s, mode: s.mode >= 0 ? MODES[s.mode] : null, travelRel: rel(s.travel), facingRel: rel(s.psi), reqRel: rel(s.reqH), turnReqVsTravel: s.turn,
    ballLat: s.bLat, ballFwd: s.bFwd, ballSide: s.bLat == null ? null : s.bLat >= 0 ? "R" : "L", support: SUPPORT[s.sup] ?? null, stepPhase: s.stepPhase,
    nextTD: s.nextTD != null ? s.nextTD - t : null, nextTDF: nm("F", s.nextTDF), nextTouch: s.nextC != null ? s.nextC - t : null, techFoot: nm("F", s.techF), lastTouchFoot: nm("F", s.lastCF),
    action: nm("act", s.act), phase: nm("phase", s.phase), committed: !!s.committed, commitFor: s.commitUntil != null ? s.commitUntil - t : null }; }
// ── the approaches and the changes after them ───────────────────────────────────────────────────────────────────────────────────────────
// Every change of the attempt: the LATEST hold before it (≥ approachS within ±approachDeg at radius ≥ approachR — the reference H0 is its last
// approachS), the first sample ≥ changeDeg from H0 while the stick stays out of the deadzone, its onset the last sample within departDeg of H0.
export function allChanges(trk) { const S = SEG, out = []; let held = null;
  for (let m = 0; m < trk.length; m++) { const q = trk[m]; if (q.H == null) { held = null; continue; }
    if (q.r >= S.approachR) { let j = m; while (j - 1 >= 0 && trk[j - 1].H != null && trk[j - 1].r >= S.approachR && Math.abs(wrap(trk[j - 1].H - q.H)) <= S.approachDeg) j--;
      if (q.t - trk[j].t >= S.approachS - 1e-9) { const win = trk.slice(j, m + 1).filter((x) => x.t >= q.t - S.approachS - 1e-9); held = { i: m, j, H0: wrap(q.H + median(win.map((x) => wrap(x.H - q.H)))) }; continue; } }
    if (!held || Math.abs(wrap(q.H - held.H0)) < S.changeDeg) continue;
    let o = m; while (o - 1 > held.j && Math.abs(wrap(trk[o - 1].H - held.H0)) > S.departDeg) o--; o = Math.max(held.j, o - 1);
    out.push({ H0: held.H0, holdFrom: trk[held.j].t, onsetI: o, changeI: m }); held = null; }
  return out; }
// ── the gesture after the onset: its sides, peak, transit, settle ───────────────────────────────────────────────────────────────────────────
// The attempt's PRINCIPAL gesture = the change with the largest angular travel (the run-up's corrections are smaller); the others are listed.
export function gestureOf(att) { const trk = stickTrack(att), ch = allChanges(trk), G = ch.map((ac) => describeChange(att, trk, ac));
  let best = null; for (const g of G) if (!best || g.angularTravel >= best.angularTravel - 1e-9) best = g;
  const out = best ? Object.assign(best, { others: G.filter((g) => g !== best).map((g) => ({ onset: g.onset, kind: g.kind, peak: g.peak1 ? g.peak1.rel : null, exit: g.exit ? g.exit.rel : null, travel: g.angularTravel })) })
    : { id: att.id, label: att.label, version: GESTURE_VERSION, kind: "none", note: "no held approach followed by a ≥ 15° change", others: [] };
  out.neutral = neutralGaps(trk); return out; }
function describeChange(att, trk, ac) { const S = SEG, out = { id: att.id, label: att.label, version: GESTURE_VERSION, kind: "none" };
  const { H0, onsetI } = ac, rel = (q) => (q.H == null ? null : wrap(q.H - H0)), t0 = trk[onsetI].t;
  out.H0 = H0; out.approachHeldFrom = ac.holdFrom; out.onset = t0; out.rOnset = trk[onsetI].r;
  // the first side
  let i1 = -1; for (let m = onsetI; m < trk.length && trk[m].t <= t0 + S.horizonS; m++) { const v = rel(trk[m]); if (v != null && Math.abs(v) >= S.sideDeg) { i1 = m; break; } }
  if (i1 < 0) { out.note = "no side reached"; out.angularTravel = 0; return out; }
  const s1 = Math.sign(rel(trk[i1])); out.side1 = s1 > 0 ? "R" : "L"; out.tSide1 = trk[i1].t - t0;
  // the other side (≥ sideDeg the other way) within the horizon — before it: the first side's peak
  let i2 = -1; for (let m = i1; m < trk.length && trk[m].t <= trk[i1].t + S.horizonS; m++) { const q = trk[m]; if (q.H == null) { if (q.src === 0) break; continue; } if (-s1 * rel(q) >= S.sideDeg) { i2 = m; break; } }
  const settleFrom = (a) => { for (let m = a; m < trk.length; m++) { const q = trk[m]; if (q.H == null) return { i: m, released: true }; let e = m; while (e + 1 < trk.length && trk[e + 1].H != null && Math.abs(wrap(trk[e + 1].H - q.H)) <= S.settleDeg) e++; if (trk[e].t - q.t >= S.settleS - 1e-9 || (e + 1 < trk.length && trk[e + 1].H == null && trk[e].t - q.t >= 0.05)) return { i: m, released: false }; } return { i: trk.length - 1, released: false }; };
  const pk = (a, b, sg) => { let bi = a, bv = -Infinity; for (let m = a; m <= b; m++) { const v = rel(trk[m]); if (v != null && sg * v > bv) { bv = sg * v; bi = m; } } return { i: bi, a: bv }; };
  let p1, iSet;
  if (i2 >= 0) { out.kind = "contradiction"; p1 = pk(onsetI, i2, s1);
    // the transit: the last sample on side 1 (≥ sideDeg) → the first on side 2; its chords' closest pass to the centre; its route
    let ia = i2; while (ia > p1.i && !(trk[ia].H != null && s1 * rel(trk[ia]) >= S.sideDeg)) ia--;
    let dmin = Infinity, rmin = Infinity, front = false, back = false; for (let m = ia; m < i2; m++) { const A = trk[m], B = trk[m + 1]; dmin = Math.min(dmin, chordDist(A.x, A.y, B.x, B.y)); rmin = Math.min(rmin, A.r, B.r);
      if (A.H != null && B.H != null) { const ra = rel(A), rb = rel(B); if (Math.sign(ra) !== Math.sign(rb)) { if (Math.abs(ra) + Math.abs(rb) <= 180) front = true; else back = true; } } }
    out.transit = { from: trk[ia].t - t0, to: trk[i2].t - t0, dur: trk[i2].t - trk[ia].t, chordMin: dmin, rMin: rmin, via: dmin < S.centreR ? "CENTRE" : back && !front ? "BACK" : "FRONT" };
    out.side2 = s1 > 0 ? "L" : "R"; out.tSide2 = trk[i2].t - t0;
    const st = settleFrom(i2); iSet = st.i; out.releasedBeforeSettle = st.released; }
  else { out.kind = "monotonic"; const st = settleFrom(i1); iSet = st.i; p1 = pk(onsetI, Math.min(trk.length - 1, iSet + 12), s1); out.releasedBeforeSettle = st.released; }
  out.peak1 = { t: trk[p1.i].t - t0, rel: s1 * p1.a, abs: p1.a, r: trk[p1.i].r };
  // the dwell at the first side's peak: the contiguous time within 10° of it
  { let a = p1.i, b = p1.i; while (a - 1 >= onsetI && trk[a - 1].H != null && s1 * rel(trk[a - 1]) >= p1.a - 10) a--; while (b + 1 < trk.length && trk[b + 1].H != null && s1 * rel(trk[b + 1]) >= p1.a - 10) b++; out.dwell1 = trk[b].t - trk[a].t + 1 / 60; }
  // the settle and the final (exit) direction: the median over the settled hold (≤ 0.5 s) — its hold: until released or the next change
  const tS = trk[iSet].t; out.settle = tS - t0; out.duration = tS - t0;
  { const hold = []; let m = iSet; for (; m < trk.length && trk[m].H != null && trk[m].t <= tS + 0.5; m++) hold.push(rel(trk[m]));
    out.exit = hold.length ? { rel: median(hold), r: trk[iSet].r } : null;
    let e = iSet; while (e + 1 < trk.length && trk[e + 1].H != null && (out.exit == null || Math.abs(wrap(rel(trk[e + 1]) - out.exit.rel)) < S.changeDeg)) e++; out.exitHold = trk[e].t - tS + 1 / 60; out.exitReleased = e + 1 < trk.length && trk[e + 1].H == null; }
  // over the gesture (onset → settle): the angular travel, the peak angular velocity / acceleration (outside the centre), the radius
  { let travel = 0, wMax = 0, wAt = null, rMin = Infinity, prevW = null, aMax = 0; const W = [];
    for (let m = onsetI; m < Math.min(trk.length - 1, iSet + 1); m++) { const A = trk[m], B = trk[m + 1], dt = B.t - A.t; rMin = Math.min(rMin, A.r); if (A.H == null || B.H == null || dt <= 0) continue;
      const d = wrap(B.H - A.H); travel += Math.abs(d); if (A.r >= S.omegaR && B.r >= S.omegaR && chordDist(A.x, A.y, B.x, B.y) >= S.omegaR) { const w = d / dt; W.push({ t: A.t - t0, w }); if (Math.abs(w) > wMax) { wMax = Math.abs(w); wAt = A.t - t0; } if (prevW) aMax = Math.max(aMax, Math.abs((w - prevW.w) / (A.t - t0 - prevW.t))); prevW = { t: A.t - t0, w }; } else prevW = null; }
    out.angularTravel = travel; out.omegaPeak = wMax; out.omegaPeakAt = wAt; out.alphaPeak = aMax; out.rMin = rMin; out.omegaSeries = W; }
  // the window: the player-relative path (x right, y along the approach) and the series, onset − pre … onset + post
  out.window = trk.filter((q) => q.t >= t0 - S.pre - 1e-9 && q.t <= t0 + S.post + 1e-9).map((q) => { const v = rel(q); return { t: q.t - t0, r: q.r, rel: v, px: v == null ? 0 : q.r * Math.sin(v / R2D), py: v == null ? 0 : q.r * Math.cos(v / R2D), on: q.H != null }; });
  // the footballer at the onset, the first side's peak, the transit, the settle
  out.state = { onset: stateRow(att, t0, H0), peak1: stateRow(att, t0 + out.peak1.t, H0), side2: out.tSide2 != null ? stateRow(att, t0 + out.tSide2, H0) : null, settle: stateRow(att, tS, H0) };
  // what the ordinary vocabulary did from the onset (the plan's actions, in order, 1.5 s)
  { const T = col(att.state, "t"), A = col(att.state, "act"), acts = []; let last = null; for (let j = 0; j < T.length; j++) { if (T[j] < t0 - 1e-9 || T[j] > t0 + 1.5) continue; const a = att.dict.act[A[j]]; if (a !== last) { acts.push({ t: T[j] - t0, a }); last = a; } } out.actions = acts; }
  return out; }
// the neutral gaps of an attempt: the stick released (or inside the deadzone) between two held directions
export function neutralGaps(trk) { const g = []; let a = -1;
  for (let m = 0; m < trk.length; m++) { const on = trk[m].H != null; if (!on && a < 0 && m > 0 && trk[m - 1].H != null) a = m; if (on && a >= 0) { const b = m, Hb = trk[a - 1].H, Ha = trk[b].H; g.push({ from: trk[a].t, to: trk[b].t, dur: trk[b].t - trk[a].t, before: Hb, after: Ha, change: wrap(Ha - Hb), rBefore: trk[a - 1].r, rAfter: trk[b].r }); a = -1; } }
  return g; }
// ── recording quality: the raw pointer pinned at a SCREEN EDGE (the cursor stops; the stick's angle then follows only the other axis) ─────────
// The raw stream is unclamped (the pointer's offset from the stick's centre in radii). A SCREEN EDGE = the same extreme raw coordinate beyond the
// radius recurring in ≥ 3 attempts of a dataset (one attempt alone cannot tell an edge from a hand moving along one pixel row).
const EXT = [["x", -1, "LEFT"], ["x", 1, "RIGHT"], ["y", 1, "TOP"], ["y", -1, "BOTTOM"]];
export function datasetEdges(atts) { const found = [];
  for (const [ax, sg, nm] of EXT) { const vals = []; for (const a of atts) { const X = a.raw.data[ax]; let e = null; for (const v of X) if (e == null || sg * v > sg * e) e = v; if (e != null && Math.abs(e) > 1.05) vals.push(e); }
    for (const v of vals) if (vals.filter((w) => Math.abs(w - v) < 1e-3).length >= 3 && !found.some((f) => f.edge === nm)) found.push({ edge: nm, axis: ax, at: v, attempts: vals.filter((w) => Math.abs(w - v) < 1e-3).length }); }
  return found; }
// the samples of one attempt at those edges (their simulation times); within(t0, t1): how many inside a window
export function edgeClip(att, edges) { const R = att.raw.data, n = att.raw.n, out = [];
  for (const E of edges || []) { const T = []; for (let i = 0; i < n; i++) if (Math.abs(R[E.axis][i] - E.at) < 1e-3 && R.appliedK && R.appliedK[i] != null) T.push(R.appliedK[i] / 240); if (T.length) out.push({ edge: E.edge, at: E.at, samples: T.length, times: T }); }
  return { edges: out, within: (t0, t1) => out.map((e) => ({ edge: e.edge, at: e.at, n: e.times.filter((t) => t >= t0 - 1e-9 && t <= t1 + 1e-9).length })).filter((e) => e.n > 0) }; }
// ── a monotonic change continued: the whole arc on that side (pauses < 0.6 s allowed) until it turns back ≥ 5° or the stick is released ──────
export function arcOf(att, g) { if (!g || g.kind !== "monotonic") return null; const trk = stickTrack(att), sg = g.side1 === "R" ? 1 : -1, t0 = g.onset; let best = 0, tBest = t0, tLast = t0;
  for (const q of trk) { if (q.t < t0 - 1e-9) continue; if (q.H == null) break; const v = sg * wrap(q.H - g.H0); if (v > best + 1) { best = v; tBest = q.t; tLast = q.t; } else if (v < best - 5 || q.t - tLast > 0.6) break; }
  return { extent: sg * best, duration: tBest - t0, meanRate: tBest > t0 ? best / (tBest - t0) : null }; }
