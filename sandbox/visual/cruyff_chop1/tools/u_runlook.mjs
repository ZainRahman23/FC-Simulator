// tc_unified1/tools/u_runlook.mjs — THE STRAIGHT RUN'S LOOK (owner: "the original straight RUN appearance is preferred"): steady straight run /
// sprint (3 – 7 s) posed by 88573ef0's body (A), the unified body (FULL) and Astra's DirectionBody (A99-C + support V1.1, BALL ON) — the pelvis
// height, the knee's deepest bend in stance and in swing, the trunk's forward lean, the step period / length, the swing foot's peak height, the
// feet's lateral spread; and FULL's joints against A's frame by frame (the same input; the posture, not the path)
//   node u_runlook.mjs [--json f]
import fs from "node:fs";
import { ENV, makeSim, DT } from "./u_env.mjs";
import { PlayBody } from "../u_body.js";
import { DirectionBody } from "../../agility99/direction_body.js";
import { presetLayers } from "../u_sim.js";
import { MODES, reqOf } from "../u_tests.js";
const env = { ...ENV, colliders: JSON.parse(fs.readFileSync(new URL("../../dribble1/d1_colliders.json", import.meta.url))) }, sub = (a, b) => a.map((x, i) => x - b[i]), nrm = (a) => Math.hypot(...a), ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, a.reduce((s, x, i) => s + x * b[i], 0) / (nrm(a) * nrm(b))))) * 180 / Math.PI;
const AR = process.argv, out = {};
function look(kind, mode) { const sim = kind === "ASTRA" ? makeSim("ASTRA") : makeSim("TL", { layers: presetLayers(kind) }), body = kind === "ASTRA" ? new DirectionBody(env, sim) : new PlayBody(env, sim), M = MODES[mode];
  for (let k = 0; k < Math.round(7.2 / DT); k++) sim.step(reqOf(() => 0, k * DT, M));
  const o = { pelvis: [], kneeSt: 0, kneeSw: 0, lean: [], peak: { R: 0, L: 0 }, lat: [], td: { R: [], L: [] }, frames: [] }; let prev = null;
  for (let k = Math.round(3 / DT); k <= Math.round(7 / DT); k++) { const t = k * DT, p = body.pose(t), J = p.J, s = sim.stateAt(t); o.pelvis.push(J.pelvis.j[2]);
    const tr = sub(J.neck ? J.neck.j : J.head.j, J.pelvis.j); o.lean.push(Math.atan2(Math.hypot(tr[0], tr[1]), tr[2]) * 180 / Math.PI); o.frames.push(J);
    for (const F of ["R", "L"]) { const h = J["thigh_" + F].j, kn = J["shin_" + F].j, an = J["foot_" + F].j, flex = 180 - ang(sub(h, kn), sub(an, kn)), pl = p.feet[F].planted;
      if (pl) o.kneeSt = Math.max(o.kneeSt, flex); else o.kneeSw = Math.max(o.kneeSw, flex); if (!pl) o.peak[F] = Math.max(o.peak[F], an[2]);
      const d = [an[0] - s.P[0], an[1] - s.P[1]]; o.lat.push(Math.abs(-d[0] * Math.sin(s.psi) + d[1] * Math.cos(s.psi)));
      if (prev && pl && !prev[F]) o.td[F].push({ t, x: an.slice(0, 2) }); }
    prev = { R: p.feet.R.planted, L: p.feet.L.planted }; }
  const per = [], len = []; for (const F of ["R", "L"]) { const L = o.td[F]; for (let i = 1; i < L.length; i++) { per.push(L[i].t - L[i - 1].t); len.push(Math.hypot(L[i].x[0] - L[i - 1].x[0], L[i].x[1] - L[i - 1].x[1])); } }
  const mean = (A) => A.reduce((a, b) => a + b, 0) / Math.max(1, A.length);
  return { tdR: o.td.R.map((x) => x.t), kind, mode, pelvisMean: mean(o.pelvis), pelvisMin: Math.min(...o.pelvis), pelvisMax: Math.max(...o.pelvis), kneeStance: o.kneeSt, kneeSwing: o.kneeSw, lean: mean(o.lean), stride: mean(per), strideLen: mean(len), swingPeak: (o.peak.R + o.peak.L) / 2, lateral: mean(o.lat), frames: o.frames }; }
const KINDS = (AR.includes("--kinds") ? AR[AR.indexOf("--kinds") + 1] : "A,FULL,ASTRA").split(",");
for (const mode of ["RUN", "SPRINT"]) { const R = KINDS.map((k) => look(k, mode)); console.log(`■ straight ${mode.toLowerCase()} (steady, 3 – 7 s)`);
  for (const r of R) console.log(`  ${(r.kind === "ASTRA" ? "Astra's body" : r.kind).padEnd(13)} pelvis ${r.pelvisMean.toFixed(3)} (${r.pelvisMin.toFixed(3)}–${r.pelvisMax.toFixed(3)}) m · knee stance ${r.kneeStance.toFixed(0)}° swing ${r.kneeSwing.toFixed(0)}° · trunk lean ${r.lean.toFixed(1)}° · stride ${r.stride.toFixed(3)} s ${r.strideLen.toFixed(2)} m · swing peak ${r.swingPeak.toFixed(3)} m · feet lateral ${(r.lateral * 100).toFixed(1)} cm`);
  // (FULL against A frame by frame: every joint relative to the pelvis — the posture alone)
  // (aligned by the gait's phase: each from its own first right touchdown after 3.2 s — the two runs may step at different instants)
  for (const RF of R.slice(1)) { if (RF.kind === "ASTRA") continue;
  const off = (r) => Math.round((r.tdR.find((x) => x > 3.2) - 3) / DT), oA = off(R[0]), oF = off(RF), NN = Math.min(R[0].frames.length - oA, RF.frames.length - oF, Math.round(2.5 / DT));
  const A = R[0].frames.slice(oA, oA + NN), F = RF.frames.slice(oF, oF + NN); let mx = 0, sum = 0, n = 0; for (let i = 0; i < Math.min(A.length, F.length); i++) for (const j of Object.keys(A[i])) { const a = sub(A[i][j].j, A[i].pelvis.j), f = sub(F[i][j].j, F[i].pelvis.j), d = nrm(sub(a, f)); mx = Math.max(mx, d); sum += d; n++; }
  const per = {}; for (let i = 0; i < Math.min(A.length, F.length); i++) for (const j of Object.keys(A[i])) { const d = nrm(sub(sub(A[i][j].j, A[i].pelvis.j), sub(F[i][j].j, F[i].pelvis.j))); const q = per[j] || (per[j] = { s: 0, n: 0, mx: 0, at: 0 }); q.s += d; q.n++; if (d > q.mx) { q.mx = d; q.at = 3 + i * DT; } }
  console.log(`  ${RF.kind} vs A, every joint relative to the pelvis: mean ${(100 * sum / n).toFixed(2)} cm, max ${(100 * mx).toFixed(2)} cm · worst joints ${Object.entries(per).sort((a, b) => b[1].mx - a[1].mx).slice(0, 4).map(([k, q]) => `${k} ${(100 * q.mx).toFixed(0)} cm @${q.at.toFixed(2)} (mean ${(100 * q.s / q.n).toFixed(1)})`).join(", ")}`); }
  out[mode] = R.map(({ frames, tdR, ...r }) => r); }
const i = AR.indexOf("--json"); if (i > 0) fs.writeFileSync(AR[i + 1], JSON.stringify(out, null, 1));
