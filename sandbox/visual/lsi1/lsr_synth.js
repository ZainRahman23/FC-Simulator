// ═══ lsi1/lsr_synth.js — LEFT-STICK INPUT LAB V1: SYNTHETIC RECORDER-TEST TRACES ══════════════════════════════════════════════════════════════════
// The owner's initial test set (straight hold · smooth 45° · smooth 90° · rapid 90° · 180° reversal · right → left reversal · neutral → direction
// · direction → neutral). RECORDER TESTS ONLY: they exercise the recording, the derived signals and the diagnostic events against known inputs.
// They are not football gestures and say nothing about what any intent looks like. A trace: (t s) → raw stick { x, y } (x right, y up), or null =
// released. Angles: 0 = up (the camera forward), + = right.
const D2R = Math.PI / 180, ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : (1 - Math.cos(Math.PI * u)) / 2), at = (deg, r = 1) => ({ x: Math.sin(deg * D2R) * r, y: Math.cos(deg * D2R) * r });
const lerp = (a, b, u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
// a turn along the rim from a0 to a1 (deg), starting at t0 over dur s with a cosine ease
const rimTurn = (a0, a1, t0, dur) => (t) => at(a0 + (a1 - a0) * ease((t - t0) / dur));
// a straight swipe through the centre from direction a0 to direction a1 (linear in space), starting at t0 over dur s
const swipe = (a0, a1, t0, dur) => (t) => lerp(at(a0), at(a1), Math.min(1, Math.max(0, (t - t0) / dur)));
export const SYNTH = [
  { id: "straight_hold", name: "STRAIGHT HOLD", dur: 3.0, note: "full tilt straight up (0°) from the first frame, held 3 s", f: (t) => at(0) },
  { id: "smooth_45", name: "SMOOTH 45° TURN", dur: 3.6, note: "0° held 1.5 s, then an eased rim turn to +45° over 0.6 s, held", f: rimTurn(0, 45, 1.5, 0.6), expect: { travel: 45, peakOm: 45 * Math.PI / (2 * 0.6) } },
  { id: "smooth_90", name: "SMOOTH 90° TURN", dur: 3.8, note: "0° held 1.5 s, then an eased rim turn to +90° over 0.8 s, held", f: rimTurn(0, 90, 1.5, 0.8), expect: { travel: 90, peakOm: 90 * Math.PI / (2 * 0.8) } },
  { id: "rapid_90", name: "RAPID 90° CHANGE", dur: 3.1, note: "0° held 1.5 s, then an eased rim turn to +90° in 0.05 s, held", f: rimTurn(0, 90, 1.5, 0.05), expect: { travel: 90 } },
  { id: "reversal_180", name: "180° REVERSAL", dur: 3.2, note: "0° (up) held 1.5 s, then a straight swipe through the centre to 180° (down) in 0.12 s, held", f: swipe(0, 180, 1.5, 0.12) },
  { id: "right_left", name: "RIGHT → LEFT REVERSAL", dur: 3.2, note: "+90° (right) held 1.5 s, then a straight swipe through the centre to −90° (left) in 0.12 s, held", f: swipe(90, -90, 1.5, 0.12) },
  { id: "neutral_dir", name: "NEUTRAL → DIRECTION", dur: 3.0, note: "released 1.0 s, then pushed from the centre to +30° at full tilt in 0.08 s, held", f: (t) => (t < 1.0 ? null : lerp({ x: 0, y: 0 }, at(30), Math.min(1, (t - 1.0) / 0.08))) },
  { id: "dir_neutral", name: "DIRECTION → NEUTRAL", dur: 3.5, note: "0° full tilt held 2.0 s, then let go: back to the centre in 0.06 s, released", f: (t) => (t < 2.0 ? at(0) : t < 2.06 ? lerp(at(0), { x: 0, y: 0 }, (t - 2.0) / 0.06) : null) },
];
export const SYNTH_BY_ID = Object.fromEntries(SYNTH.map((s) => [s.id, s]));
// sample a trace at a fixed rate (Hz) with an optional deterministic jitter (s) — node tests
export function sampleTrace(T, hz = 60, jitter = 0, seed = 1) { const out = []; let s = seed >>> 0 || 1; const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 - 0.5; };
  for (let i = 0; ; i++) { const t = i / hz + (i ? jitter * rnd() : 0); if (t > T.dur) break; const p = T.f(t); out.push({ t, x: p ? p.x : 0, y: p ? p.y : 0, released: !p }); } return out; }
