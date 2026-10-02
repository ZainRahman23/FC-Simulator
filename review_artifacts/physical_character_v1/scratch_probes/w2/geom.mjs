import fs from "fs"; import { walk, f3, bi, spec } from "./lib.mjs";
const J = (p) => JSON.parse(fs.readFileSync("/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/review_artifacts/physical_character_v1/g2_walker/json/" + p, "utf8"));
const models = {}; for (const t of [0, 0.1, 0.15, 0.2, 0.25]) models[t] = J(`m5a_tau${t}.json`);
const ctrl = { kind: "A", models, nom: [0.22, 0.24, 0.40], rho: 0.4, sig: [0.05, 0.05, 0.03], lo: [0.10, 0.17, 0.36], hi: [0.30, 0.40, 0.48], inSwing: 0.3, commitMargin: 0.12, adapt: { gain: 0.3, max: 0.06 } };
const r = walk({ n: 12, keep: true, first: "L", rhythm: { at: 0.55 }, seconds: 8, walk: { dsLead: true, dsFlat: false, dsExtEnd: 0.96, char: { 0: { df: 0.24, dl: 0.351, T: 0.448 } }, ctrl }, human: { lateBlend: true, clrActual: true, clrActualUntil: [0.5, 0.2] } });
const P = r.LOCO.planner, h0 = P.rhythm.wk.h0, hd = [Math.sin(h0), 0, Math.cos(h0)];
const jn = (n) => spec.joints.find(j => j.name === n), thL = spec.bodies[bi("thigh_L")], shL = spec.bodies[bi("shin_L")];
console.log("thigh origin", thL.origin, "shin origin", shL.origin, "foot origin", spec.bodies[bi("foot_L")].origin, "hip joint at", jn("hip_L").at, "ankle joint at", jn("ankle_L").at);
for (const d of P.exec.done.filter(d => d.kind === "rhythmic" && d.stepIndex >= 1 && d.stepIndex <= 8)) { const q = r.recs.reduce((b, x) => Math.abs(x.t - d.tSw0) < Math.abs(b.t - d.tSw0) ? x : b, r.recs[0]); const S = q.states, s = d.sw, st = s === "R" ? "L" : "R";
  const hip = S[bi("thigh_" + s)].pos, ank = S[bi("foot_" + s)].pos, d3 = [hip[0] - ank[0], hip[1] - ank[1], hip[2] - ank[2]], fw = d3[0] * hd[0] + d3[2] * hd[2];
  const stA = S[bi("foot_" + st)].pos, comF = (q.com[0] - stA[0]) * hd[0] + (q.com[2] - stA[2]) * hd[2], trF = (ank[0] - stA[0]) * hd[0] + (ank[2] - stA[2]) * hd[2];
  console.log(`k${d.stepIndex} start: trailing hip→ankle fwd ${f3(fw)} vert ${f3(d3[1])} lat ${f3(Math.hypot(d3[0], d3[2]) ** 2 - fw * fw > 0 ? Math.sqrt(Math.hypot(d3[0], d3[2]) ** 2 - fw * fw) : 0)} |d| ${f3(Math.hypot(...d3))} | pelvis y ${f3(S[0].pos[1])} hip y ${f3(hip[1])} ankle y ${f3(ank[1])} | COM ahead of stance ankle ${f3(comF)} trailing ankle ${f3(trF)} | vF ${f3(q.vcom[0] * hd[0] + q.vcom[2] * hd[2], 2)}`); }
