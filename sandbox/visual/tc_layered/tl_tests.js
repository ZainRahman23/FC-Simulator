// tc_layered/tl_tests.js — THE OWNER'S REQUIRED TESTS (§22) as analog-stick traces (pt_input.js's request mapping — the page's own stick),
// at BC99 / D99 / A99 with A99's movement unchanged. Each test: 4 phases through the stride (the change 0 / 0.12 / 0.24 / 0.36 s later) × both
// directions = 8 traces; the stick angle (deg from the latched forward, + = right) as a function of time, 3 s straight run-up first.
//   gentle continuous curve · repeated 15–30° corrections · jog 45 / 90 · run 45 / 90 · sprint 45 / 90 / 120 / 180 · rapid left/right (run,
//   sprint) · 0 → 90 → 0 → −90 (run, sprint) · continuous joystick circle (run, sprint)
import { stickVector, stickMode, headingFrom } from "../tc_baseline_88573ef0/pt_input.js";
export const DEG = Math.PI / 180;
export const MODES = { WALK: { r: 0.30 }, JOG: { r: 0.56 }, RUN: { r: 0.95 }, SPRINT: { r: 0.95, sprint: true } };
const steps = (L) => (t) => { let a = 0; for (const [t0, d] of L) if (t >= t0) a = d; return a; };
const RUNUP = 3.0, PH = [0, 0.12, 0.24, 0.36];
export const TESTS = [];
const add = (fam, mode, mk) => { for (const s of [1, -1]) for (let i = 0; i < 4; i++) { const t0 = RUNUP + PH[i], x = mk(t0, s); TESTS.push(Object.assign({ fam, mode, name: `${fam} ${s > 0 ? "R" : "L"} #${i}` }, x)); } };
// a gentle continuous curve: the stick turning 35°/s for 3 s, then held
add("gentle curve · RUN", "RUN", (t0, s) => ({ f: (t) => (t < t0 ? 0 : s * 35 * Math.min(3.0, t - t0)), changes: [t0], held: [], dur: t0 + 4.2, continuous: true }));
// repeated 15–30° corrections (every 0.6 s)
add("15–30° corrections · RUN", "RUN", (t0, s) => { const A = [20, 0, -15, 15, 30, 10, -20, 0], L = A.map((a, j) => [t0 + j * 0.6, a * s]); return { f: steps(L), changes: L.map((x) => x[0]), held: L.map((x) => x[0]), dur: t0 + A.length * 0.6 + 1.4 }; });
for (const [mode, angs] of [["JOG", [45, 90]], ["RUN", [45, 90]], ["SPRINT", [45, 90, 120, 180]]]) for (const ang of angs)
  add(`${mode.toLowerCase()} ${ang}°`, mode, (t0, s) => ({ f: steps([[t0, ang * s]]), changes: [t0], held: [t0], dur: t0 + 2.4 }));
for (const mode of ["RUN", "SPRINT"]) {
  add(`rapid left/right · ${mode}`, mode, (t0, s) => { const L = []; for (let j = 0; j < 8; j++) L.push([t0 + j * 0.35, (j % 2 ? -60 : 60) * s]); L.push([t0 + 2.8, 0]); return { f: steps(L), changes: L.map((x) => x[0]), held: [t0 + 2.8], dur: t0 + 4.6 }; });
  add(`0→90→0→−90 · ${mode}`, mode, (t0, s) => { const L = [[t0, 90 * s], [t0 + 0.6, 0], [t0 + 1.2, -90 * s], [t0 + 1.8, 0]]; return { f: steps(L), changes: L.map((x) => x[0]), held: L.map((x) => x[0]), dur: t0 + 3.6 }; });
  add(`circle 0.5 Hz · ${mode}`, mode, (t0, s) => ({ f: (t) => (t < t0 ? 0 : s * 180 * (t - t0)), changes: [t0], held: [], dur: t0 + 4.0, continuous: true })); }
export const FAMS = [...new Set(TESTS.map((x) => x.fam))];
export function reqOf(f, t, M) { const a = f(t), v = stickVector(Math.sin(a * DEG) * M.r, Math.cos(a * DEG) * M.r); return { h: t < 0.2 ? null : headingFrom(0, v.x, v.y), mode: M.sprint ? "SPRINT" : stickMode(v.r), keys: 64 }; }
