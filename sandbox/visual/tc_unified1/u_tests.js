// ═══ tc_unified1/u_tests.js — THE OWNER'S PLAYTEST LIST (21 Oct) as analog-stick traces (pt_input.js's request mapping — the page's own stick) ════
// at BC99 / D99 / A99, A99's movement unchanged: at JOG / RUN / SPRINT — ordinary flowing carry · small corrections · 45 / 60 / 90 / 120 / 150 / 180°
// sudden snaps · rapid left / right · gradual analog rotation. Each family: 4 phases through the stride (the change 0 / 0.12 / 0.24 / 0.36 s
// later) × both directions = 8 traces; the stick angle (deg from the latched forward, + = right) as a function of time after a 3 s straight run-up.
// NAMED: the named-move scenarios (states favourable to each researched technique, and the nearby states where a generic action may beat it) —
// tools/u_named.mjs
import { stickVector, stickMode, headingFrom } from "../tc_baseline_88573ef0/pt_input.js";
export const DEG = Math.PI / 180;
export const MODES = { WALK: { r: 0.30 }, JOG: { r: 0.56 }, RUN: { r: 0.95 }, SPRINT: { r: 0.95, sprint: true } };
export const steps = (L) => (t) => { let a = 0; for (const [t0, d] of L) if (t >= t0) a = d; return a; };
export const RUNUP = 3.0, PH = [0, 0.12, 0.24, 0.36];
export const TESTS = [];
const add = (fam, mode, mk) => { for (const s of [1, -1]) for (let i = 0; i < 4; i++) { const t0 = RUNUP + PH[i], x = mk(t0, s); TESTS.push(Object.assign({ fam, mode, name: `${fam} ${s > 0 ? "R" : "L"} #${i}` }, x)); } };
for (const mode of ["JOG", "RUN", "SPRINT"]) { const m = mode.toLowerCase();
  // ordinary flowing carry: a gentle ± 6° weave (period 3 s)
  add(`flowing carry · ${m}`, mode, (t0, s) => ({ f: (t) => (t < t0 ? 0 : s * 6 * Math.sin((2 * Math.PI * (t - t0)) / 3)), changes: [t0], held: [], dur: t0 + 4.0, continuous: true }));
  // small corrections (15 – 30°, every 0.6 s)
  add(`small corrections · ${m}`, mode, (t0, s) => { const A = [20, 0, -15, 15, 30, 10, -20, 0], L = A.map((a, j) => [t0 + j * 0.6, a * s]); return { f: steps(L), changes: L.map((x) => x[0]), held: L.map((x) => x[0]), dur: t0 + A.length * 0.6 + 1.4 }; });
  // sudden analog snaps
  for (const ang of [45, 60, 90, 120, 150, 180]) add(`snap ${ang}° · ${m}`, mode, (t0, s) => ({ f: steps([[t0, ang * s]]), changes: [t0], held: [t0], dur: t0 + 2.4, ang }));
  // rapid left / right (± 60° every 0.35 s, then straight)
  add(`rapid L/R · ${m}`, mode, (t0, s) => { const L = []; for (let j = 0; j < 8; j++) L.push([t0 + j * 0.35, (j % 2 ? -60 : 60) * s]); L.push([t0 + 2.8, 0]); return { f: steps(L), changes: L.map((x) => x[0]), held: [t0 + 2.8], dur: t0 + 4.6 }; });
  // gradual analog rotation (60°/s to 120°, then held)
  add(`gradual rotation · ${m}`, mode, (t0, s) => ({ f: (t) => (t < t0 ? 0 : s * Math.min(120, 60 * (t - t0))), changes: [t0], held: [], dur: t0 + 3.6, continuous: true })); }
export const FAMS = [...new Set(TESTS.map((x) => x.fam))];
// THE NAMED-MOVE SCENARIOS: a snap at a speed / angle where 88573ef0 itself chooses the technique ("favourable"), and a neighbouring one ("nearby")
export const SCEN = [
  ["RONALDO CHOP", "favourable", "RUN", 95], ["RONALDO CHOP", "favourable", "SPRINT", 90], ["RONALDO CHOP", "nearby", "RUN", 65],
  ["CRUYFF TURN", "favourable", "JOG", 100], ["CRUYFF TURN", "favourable", "JOG", 120], ["CRUYFF TURN", "nearby", "JOG", 135],
  ["INSIDE HOOK", "favourable", "RUN", 130], ["INSIDE HOOK", "favourable", "RUN", 150], ["INSIDE HOOK", "nearby", "JOG", 160],
  ["DRAG-BACK", "favourable", "SPRINT", 180], ["DRAG-BACK", "favourable", "RUN", 180], ["DRAG-BACK", "nearby", "JOG", 180],
  ["OUTSIDE CUT", "favourable", "SPRINT", 60], ["OUTSIDE CUT", "favourable", "JOG", 90], ["OUTSIDE CUT", "nearby", "SPRINT", 45] ];
export const scenSpecs = (mode, ang) => { const L = []; for (const s of [1, -1]) for (let i = 0; i < 4; i++) { const t0 = RUNUP + PH[i]; L.push({ mode, fam: `${mode.toLowerCase()} ${ang}°`, name: `${mode.toLowerCase()} snap ${ang * s}° #${i}`, f: steps([[t0, ang * s]]), changes: [t0], held: [t0], dur: t0 + 2.4 }); } return L; };
export const NAMED = SCEN.flatMap(([tech, kind, mode, ang]) => scenSpecs(mode, ang).slice(0, 1).concat(scenSpecs(mode, ang).slice(4, 5)).map((x) => Object.assign({}, x, { name: `named · ${tech.toLowerCase()} ${kind} · ${x.name}` })));
// (TC-UNIFIED-1: exactly the page's request — the stick at rest (the first 0.2 s, a null angle = released) asks for the page's base mode, RUN,
// or SPRINT while the test holds the sprint button; before, the node traces asked JOG / RUN by the held stick's zone there)
export function reqOf(f, t, M) { const a = t < 0.2 ? null : f(t); if (a === null) return { h: null, mode: M.sprint ? "SPRINT" : "RUN", keys: 64 }; const v = stickVector(Math.sin(a * DEG) * M.r, Math.cos(a * DEG) * M.r); return { h: t < 0.2 ? null : headingFrom(0, v.x, v.y), mode: M.sprint ? "SPRINT" : stickMode(v.r), keys: 64 }; }
// ═══ TC-UNIFIED-1: THE OWNER'S MORNING PLAYTEST CASES (overnight brief §28) — one trace each, launched from the page (the same stick mapping) ═══
// after the 3 s straight run-up (RUNUP); a null angle = the stick released (stop). The favourable examples: the states where the FULL stack
// itself chooses each named move / generic family (tools/u_grid.mjs surveys JOG / RUN / SPRINT × 30 … 180°; the trace = the stride phase and
// side where it wins — see the morning report §E)
const fx = (L) => (t) => { let a = 0; for (const [t0, d] of L) if (t >= t0) a = d; return a; }, T0 = RUNUP;
const ramp = (rate, cap = Infinity) => (t) => (t < T0 ? 0 : Math.sign(rate) * Math.min(cap, Math.abs(rate) * (t - T0)));
const alt = (amp, every, n) => { const L = []; for (let j = 0; j < n; j++) L.push([T0 + j * every, (j % 2 ? -amp : amp)]); L.push([T0 + n * every, 0]); return L; };
const M = (name, mode, f, dur, x = {}) => Object.assign({ name, mode, f, changes: [T0], held: [T0], dur, fam: "morning" }, x);
const fav = (label, mode, ang, i) => { const sp = scenSpecs(mode, ang)[i]; return Object.assign({}, sp, { name: `favourable · ${label} (${mode.toLowerCase()} ${sp.name.split("snap ")[1]})`, fam: "favourable" }); };
export const MORNING = [
  M("straight run", "RUN", () => 0, T0 + 5), M("straight sprint", "SPRINT", () => 0, T0 + 5),
  M("gentle analog curve · run (20°/s)", "RUN", ramp(20), T0 + 6, { continuous: true }), M("gentle analog curve · sprint (20°/s)", "SPRINT", ramp(20), T0 + 6, { continuous: true }),
  M("tight analog curve · run (60°/s)", "RUN", ramp(60), T0 + 6, { continuous: true }), M("tight analog curve · sprint (60°/s)", "SPRINT", ramp(60), T0 + 6, { continuous: true }),
  M("fast circle · run (270°/s)", "RUN", ramp(270), T0 + 4, { continuous: true }), M("fast circle · sprint (270°/s)", "SPRINT", ramp(270), T0 + 4, { continuous: true }),
  M("repeated ±30° · sprint (every 0.45 s)", "SPRINT", fx(alt(30, 0.45, 8)), T0 + 4.6), M("rapid ±60° · run (every 0.35 s)", "RUN", fx(alt(60, 0.35, 8)), T0 + 4.2),
  M("run 45°", "RUN", fx([[T0, 45]]), T0 + 2.4), M("run 90°", "RUN", fx([[T0, 90]]), T0 + 2.4),
  ...[45, 60, 90, 120, 150, 180].map((a) => M(`sprint ${a}°`, "SPRINT", fx([[T0, a]]), T0 + 2.6)),
  M("rapid sprint left / right (±60° every 0.35 s)", "SPRINT", fx(alt(60, 0.35, 8)), T0 + 4.2),
  M("gradual 0 → 90° · sprint (90°/s)", "SPRINT", ramp(90, 90), T0 + 3, { continuous: true }),
  M("0 → 90 → 0 → −90 · sprint (0.6 s each)", "SPRINT", fx([[T0, 90], [T0 + 0.6, 0], [T0 + 1.2, -90], [T0 + 1.8, 0]]), T0 + 3.4),
  M("stop / restart · run", "RUN", fx([[T0, null], [T0 + 1.6, 0]]), T0 + 4.2),
  fav("Ronaldo Chop", "RUN", 105, 6), fav("Cruyff Turn", "JOG", 105, 2), fav("Inside Hook", "RUN", 135, 6), fav("Drag-back", "SPRINT", 180, 3), fav("Outside Cut", "JOG", 60, 2),
  fav("compact inside redirect", "RUN", 75, 6), fav("compact outside redirect", "RUN", 75, 2), fav("braking pivot", "JOG", 105, 4), fav("braking touch", "RUN", 165, 2), fav("urgent reach", "SPRINT", 60, 7), fav("gather", "JOG", 60, 6) ];
