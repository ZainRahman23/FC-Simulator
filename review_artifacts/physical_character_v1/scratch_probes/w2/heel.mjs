// closed-loop walk: the trailing foot's heel height and the trailing-leg extension at each step start (DS end), for pre-swing variants
import fs from "fs"; import { walk, fallT, f3, bi, spec, M } from "./lib.mjs";
const { Q, V } = M; const J = (p) => JSON.parse(fs.readFileSync("/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/review_artifacts/physical_character_v1/g2_walker/json/" + p, "utf8"));
const models = {}; for (const t of [0, 0.1, 0.15, 0.2, 0.25]) models[t] = J(`m5a_tau${t}.json`); const box = spec.bodies[bi("foot_R")].shapes[0];
const V0 = JSON.parse(process.argv[2]);
for (const [nm, v] of Object.entries(V0)) { const ctrl = { kind: "A", models, nom: [0.22, 0.28, 0.40], rho: 0.4, sig: [0.05, 0.05, 0.03], lo: [0.10, 0.17, 0.36], hi: [0.30, 0.40, 0.48], inSwing: 0.3, commitMargin: 0.12, adapt: { gain: 0.3, max: 0.06 } };
  const r = walk({ n: 14, keep: true, first: "R", rhythm: { at: 0.55 }, seconds: 9.5, walk: { dsLead: true, dsFlat: false, dsExtEnd: 0.96, ...(v.walk || {}), char: { 0: { df: 0.24, dl: 0.351, T: 0.448 } }, ctrl }, human: { lateBlend: true, clrActual: true, clrActualUntil: [0.5, 0.2], ...(v.human || {}) } });
  const tF = fallT(r), D = r.LOCO.planner.exec.done.filter(d => d.kind === "rhythmic" && d.stepIndex >= 1 && d.tSw0 < tF), hh = [], ex = [];
  for (const d of D) { const q = r.recs.reduce((b, x) => Math.abs(x.t - (d.tSw0 + 0.05)) < Math.abs(b.t - (d.tSw0 + 0.05)) ? x : b, r.recs[0]), S = q.states, fb = bi("foot_" + d.sw), heel = Math.min(...[-1, 1].map(sx => V.add(S[fb].pos, Q.rot(S[fb].rot, [box.pos[0] + sx * box.he[0], box.pos[1] - box.he[1], box.pos[2] - box.he[2]]))[1]));
    const hip = S[bi("thigh_" + d.sw)].pos, an = S[fb].pos; hh.push(heel); ex.push(Math.hypot(hip[0] - an[0], hip[1] - an[1], hip[2] - an[2]) / 0.924); }
  console.log(`${nm.padEnd(26)} upright ${r.LOCO.planner.exec.done.filter(d => d.kind === "rhythmic" && d.td && d.td.t < tF).length}/14 · trailing heel at the real step start (cm): ${hh.map(h => (h * 100).toFixed(1)).join(" ")} · ext ${ex.map(e => e.toFixed(2)).join(" ")}`); }
