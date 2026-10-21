// ═══ tc_layered2/tl_tests.js — THE OWNER'S PLAYTEST LIST (21 Oct) as analog-stick traces (pt_input.js's request mapping — the page's own stick) ════
// at BC99 / D99 / A99, A99's movement unchanged: at JOG / RUN / SPRINT — ordinary flowing carry · small corrections · 45 / 60 / 90 / 120 / 150 / 180°
// sudden snaps · rapid left / right · gradual analog rotation. Each family: 4 phases through the stride (the change 0 / 0.12 / 0.24 / 0.36 s
// later) × both directions = 8 traces; the stick angle (deg from the latched forward, + = right) as a function of time after a 3 s straight run-up.
// NAMED: the named-move scenarios (states favourable to each researched technique, and the nearby states where a generic action may beat it) —
// tools/tl_named.mjs
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
export function reqOf(f, t, M) { const a = f(t), v = stickVector(Math.sin(a * DEG) * M.r, Math.cos(a * DEG) * M.r); return { h: t < 0.2 ? null : headingFrom(0, v.x, v.y), mode: M.sprint ? "SPRINT" : stickMode(v.r), keys: 64 }; }
