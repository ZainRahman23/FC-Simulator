// ═══ tc_layered2/tl_torture_seq.js (PLAYTEST-1.2's test input, copied) — PLAYTEST-1.2's RAPID-INPUT TORTURE SEQUENCES (owner §11): the analog stick's angle (deg from the forward it
// latched, + = right) as a function of time — the first 1.6 s straight ahead (speed built) — and the stick's radius / sprint per speed group.
// Shared by the headless suite (tools/pt_torture.mjs) and the page's torture preset (it plays them through the same stick request).
const steps = (L) => (t) => { let a = 0; for (const [t0, d] of L) if (t >= t0) a = d; return a; };
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let x = s; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
export const T0 = 1.6, SEQ = {};
for (const [nm, hold] of [["fast", 0.15], ["med", 0.3], ["slow", 0.6]]) {
  SEQ[`0→90→0→-90 ${nm}`] = { f: steps([[T0, 90], [T0 + hold, 0], [T0 + 2 * hold, -90], [T0 + 3 * hold + 1.2, 0]]), dur: T0 + 3 * hold + 3.0 };
  SEQ[`0→150→30→180 ${nm}`] = { f: steps([[T0, 150], [T0 + hold, 30], [T0 + 2 * hold, 180]]), dur: T0 + 2 * hold + 3.4 };
  SEQ[`0→90→180→-90→0 ${nm}`] = { f: steps([[T0, 90], [T0 + hold, 180], [T0 + 2 * hold, -90], [T0 + 3 * hold, 0]]), dur: T0 + 3 * hold + 3.2 }; }
for (const hz of [0.5, 1, 2]) for (const dirn of [1, -1]) SEQ[`circles ${hz} Hz ${dirn > 0 ? "cw" : "ccw"}`] = { f: (t) => (t < T0 ? 0 : dirn * 360 * hz * (t - T0)), dur: T0 + 4.0 };
for (const [amp, per] of [[45, 0.12], [90, 0.12], [45, 0.25], [90, 0.25], [90, 0.4], [135, 0.3]]) SEQ[`flicks ±${amp} / ${per} s`] = { f: (t) => (t < T0 ? 0 : (Math.floor((t - T0) / per) % 2 ? -amp : amp)), dur: T0 + 3.6 };
for (const g of [0.25, 0.5]) { SEQ[`forward → 90 → -90 (${g} s)`] = { f: steps([[T0, 90], [T0 + g, -90]]), dur: T0 + g + 3.0 }; SEQ[`forward → 180 → forward (${g} s)`] = { f: steps([[T0, 180], [T0 + g, 0]]), dur: T0 + g + 3.0 }; }
for (let s = 1; s <= 10; s++) { const r = rng(1000 + s), L = []; let t = T0; while (t < T0 + 5) { L.push([t, -180 + 360 * r()]); t += 0.08 + 0.32 * r(); } SEQ[`random #${s}`] = { f: steps(L), dur: T0 + 6.5 }; }
export const MODES = { WALK: { r: 0.30 }, JOG: { r: 0.56 }, RUN: { r: 0.95 }, SPRINT: { r: 0.95, sprint: true } };
