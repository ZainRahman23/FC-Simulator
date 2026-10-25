// occupy3b/tools/l3_common.mjs — the shared instruments of the Stage 3B tools: the case sets, the live per-tick trace, the comparisons, and
// the limb measurements on the bodies as drawn (penetration by contact class, the perturbation's angles, the knee / hip angles drawn against
// the authored leg, the limb layer's own records).
import { ENV } from "../../occupy1/tools/o_env.mjs";
import { setOf as setO3 } from "../../occupy3/tools/o3_identity.mjs";
import { runO3 } from "../../occupy3/o3_run.js";
import "../../occupy3/o3_world.js";
import "../l3_world.js";
import { L3CASES } from "../l3_cases.js";
import { volumesOf, detect } from "../../occupy1/o_volumes.js";
export { ENV, runO3 };
export const DT = 1 / 240, hyp = Math.hypot, cm = (v) => (v * 100).toFixed(1);
export const setOf = (S) => (S === "l3" ? L3CASES.slice() : setO3(S));
export const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
// the per-tick record, LIVE: both roots, the ball, the authority's state
export const live = () => { const L = new Map(); return { L, onTick: (W) => { const t = W.att.t; L.set(W.k, { a: W.att.stateAt(t).P.slice(), d: W.def.stateAt(t).P.slice(), b: W.ball.p.slice(), au: W.auth.state + (W.auth.id || "") }); } }; };
export function trace(R, L) { const W = R.W, T = new Map(); for (const [k, F] of W.frames) { const q = L.get(k); if (!q) continue; T.set(k, { a: q.a, d: q.d, b: q.b, au: q.au, J: [F.a.J, F.d.J] }); } return T; }
const jDiff = (A, B) => { let m = 0; for (const nm in A) for (const f of ["j", "t"]) for (let i = 0; i < 3; i++) m = Math.max(m, Math.abs(A[nm][f][i] - B[nm][f][i])); return m; };
export function compare(TA, TB, kStop = Infinity) { let maxRoot = 0, maxJ = 0, first = null, n = 0; for (const [k, a] of TA) { if (k >= kStop) break; const b = TB.get(k); if (!b) continue; n++;
    const dr = Math.max(hyp(a.a[0] - b.a[0], a.a[1] - b.a[1]), hyp(a.d[0] - b.d[0], a.d[1] - b.d[1]), hyp(a.b[0] - b.b[0], a.b[1] - b.b[1], a.b[2] - b.b[2]), a.au === b.au ? 0 : 1), dj = Math.max(jDiff(a.J[0], b.J[0]), jDiff(a.J[1], b.J[1])); maxRoot = Math.max(maxRoot, dr); maxJ = Math.max(maxJ, dj); if (first == null && (dr > 0 || dj > 0)) first = k; }
  return { maxRoot, maxJ, first, n }; }
// the first GENUINE contact of a run: Stage 3B's first contact application or Stage 3's first impact (whichever first) — Infinity when none
export function firstContact(W) { const a = W.l3 && W.l3.apps.length ? W.l3.apps[0].k : Infinity, e = W.imp && W.imp.episodes.length ? Math.min(...W.imp.episodes.map((x) => x.kA)) : Infinity; return Math.min(a, e, W.imp && W.imp.ep && W.imp.ep.active ? W.imp.ep.kA : Infinity); }
// ── THE LIMB MEASUREMENTS of one run (frames recorded) ──
const TR = /^(PELVIS|WAIST|CHEST)$/, LEGRE = /^(THIGH|SHIN|FOOT)_/;
export const CLASSES = ["torso", "thigh-thigh", "thigh-shin", "shin-shin", "foot-leg", "leg-trunk"];
export function classOf(A, B) { const a = A.replace(/_[RL]$/, ""), b = B.replace(/_[RL]$/, ""); if (TR.test(a) && TR.test(b)) return "torso"; if (/^UARM/.test(a) || /^UARM/.test(b)) return null;
  if (a === "FOOT" && b === "FOOT") return null; if (a === "FOOT" || b === "FOOT") return TR.test(a) || TR.test(b) ? "leg-trunk" : "foot-leg"; if (TR.test(a) || TR.test(b)) return "leg-trunk";
  if (a === "THIGH" && b === "THIGH") return "thigh-thigh"; if (a === "SHIN" && b === "SHIN") return "shin-shin"; return "thigh-shin"; }
const ang = (u, v) => Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (hyp(...u) * hyp(...v) || 1)))) * 180 / Math.PI;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
// the hip's flexion / abduction of a leg in its pelvis frame (from the drawn joints: lateral = hip R − hip L, up = the spine), the knee's flexion
export function legAngles(J, X) { const hR = J.thigh_R.j, hL = J.thigh_L.j, lat = sub(hR, hL), up = sub(J.spine.t, J.pelvis.j), fw = cross(lat, up), th = sub(J["thigh_" + X].t, J["thigh_" + X].j), sh = sub(J["shin_" + X].t, J["shin_" + X].j);
  const nf = hyp(...fw) || 1, nl = hyp(...lat) || 1, nu = hyp(...up) || 1, d = [dot(th, fw) / nf, dot(th, lat) / nl * (X === "R" ? 1 : -1), dot(th, up) / nu];
  return { flex: Math.atan2(d[0], -d[2]) * 180 / Math.PI, abd: Math.atan2(d[1], hyp(d[0], d[2])) * 180 / Math.PI, knee: 180 - ang(sub(J["thigh_" + X].j, J["thigh_" + X].t), sh) }; }
export const ROM = { flex: [-30, 125], abd: [-30, 45], knee: [0, 150] };   // (hip extension 30°, flexion 125°; adduction 30°, abduction 45°; the knee 0 – 150°)
export function limbMeasure(R) { const W = R.W, o = { pen: Object.fromEntries(CLASSES.map((c) => [c, 0])), t5: Object.fromEntries(CLASSES.map((c) => [c, 0])), legs: 0, legs5: 0, kneeDiff: 0, romNew: 0, romAuth: 0, angDiff: { flex: 0, abd: 0 }, qMax: [0, 0, 0], dMax: 0 };
  for (const [k, F] of W.frames) { if (k * DT < R.clip[0]) continue; const seen = {};
    for (const x of detect(volumesOf(F.a.J), volumesOf(F.d.J), { within: 0 })) { const c = classOf(x.A, x.B); if (!c) continue; o.pen[c] = Math.max(o.pen[c], x.pen); if (x.pen > 0.05) seen[c] = 1; if (c !== "torso") { o.legs = Math.max(o.legs, x.pen); } }
    for (const c of Object.keys(seen)) o.t5[c]++; if (Object.keys(seen).some((c) => c !== "torso")) o.legs5++;
    // (the angles: the drawn leg against the authored one where the limb layer perturbed it — the knee never changes, the hip within its range)
    for (const side of ["a", "d"]) { const P = F[side], A = P.legAuth; for (const X of ["R", "L"]) { const g = legAngles(P.J, X); const out = g.flex < ROM.flex[0] || g.flex > ROM.flex[1] || g.abd < ROM.abd[0] || g.abd > ROM.abd[1] || g.knee < ROM.knee[0] || g.knee > ROM.knee[1];
        if (!A) { if (out) o.romAuth++; continue; } const JA = authJ(P.J, A), ga = legAngles(JA, X), outA = ga.flex < ROM.flex[0] || ga.flex > ROM.flex[1] || ga.abd < ROM.abd[0] || ga.abd > ROM.abd[1] || ga.knee < ROM.knee[0] || ga.knee > ROM.knee[1];
        o.kneeDiff = Math.max(o.kneeDiff, Math.abs(g.knee - ga.knee)); o.angDiff.flex = Math.max(o.angDiff.flex, Math.abs(g.flex - ga.flex)); o.angDiff.abd = Math.max(o.angDiff.abd, Math.abs(g.abd - ga.abd)); if (out && !outA) o.romNew++; if (outA) o.romAuth++; } } }
  if (W.l3) { for (const r of W.l3.log) for (const P of r.legs) for (const X of ["R", "L"]) { const q = P[X].q; for (let i = 0; i < 3; i++) o.qMax[i] = Math.max(o.qMax[i], Math.abs(q[i])); o.dMax = Math.max(o.dMax, P[X].d); } }
  return o; }
// (the authored joints of a pose whose legs the limb layer perturbed: its legs replaced by the authored ones)
function authJ(J, A) { const out = Object.assign({}, J); for (const X of ["R", "L"]) { const a = A[X]; out["thigh_" + X] = { j: a.H, t: a.K }; out["shin_" + X] = { j: a.K, t: a.A }; out["foot_" + X] = { j: a.A, t: a.B }; out["toe_" + X] = { j: a.B, t: a.T }; } return out; }
// the limb layer's own record of a run: strikes, applications by route, the impulse distribution, the yield, the positional projection, the events, the checks
export function l3Stats(W) { if (!W.l3) return null; const L = W.l3, apps = L.apps, lam = apps.map((a) => a.lam).sort((a, b) => a - b), route = {}; for (const a of apps) { const k = a.routeA + " / " + a.routeB; route[k] = (route[k] || 0) + 1; }
  const ev = {}; for (const e of L.events) { const k = e.kind.replace(/ \(.*$/, ""); ev[k] = (ev[k] || 0) + 1; }
  const yielded = L.log.reduce((s, r) => s + r.contacts.reduce((a, c) => a + (c.yielded || 0), 0), 0), posn = L.log.reduce((s, r) => s + r.posn.reduce((a, z) => a + z.dist, 0), 0), unres = L.log.reduce((s, r) => s + r.contacts.filter((c) => c.unresolved > 0).length, 0);
  const J = { ATT: L.acc.ATT.EXT3B, DEF: L.acc.DEF.EXT3B };
  return { strikes: L.contacts, apps: apps.length, lamSum: lam.reduce((a, b) => a + b, 0), lamMax: lam.length ? lam[lam.length - 1] : 0, lamMed: lam.length ? lam[lam.length >> 1] : 0, route, events: ev, yielded, posn, unresolvedTicks: unres, check: Object.assign({}, L.check), J, snaps: L.snaps.length, cpu: L.cpu };
}
