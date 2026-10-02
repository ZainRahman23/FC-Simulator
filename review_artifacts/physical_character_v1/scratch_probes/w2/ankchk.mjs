import fs from "fs"; import { walk, fallT, f3 } from "./lib.mjs";
const J = (p) => JSON.parse(fs.readFileSync("/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/review_artifacts/physical_character_v1/g2_walker/json/" + p, "utf8"));
const models = {}; for (const t of [0, 0.1, 0.15, 0.2, 0.25]) models[t] = J(`m8a_tau${t}.json`);
const ctrl = { kind: "A", models, nom: [0.22, 0.28, 0.40], rho: 0.4, sig: [0.05, 0.05, 0.03], lo: [0.10, 0.17, 0.36], hi: [0.30, 0.40, 0.48], inSwing: 0.3, commitMargin: 0.12, adapt: { gain: 0.3, max: 0.06 }, ankle: { k: 2, max: 0.08, min: -0.04 } };
const r = walk({ n: 30, keep: true, first: "R", rhythm: { at: 0.55 }, seconds: 12, walk: { dsLead: true, dsFlat: false, dsExtEnd: 0.96, reachExt: 0.96, char: { 0: { df: 0.224, dl: 0.343, T: 0.469 } }, ctrl }, human: { lateBlend: true, clrActual: true, clrActualUntil: [0.5, 0.2], swingLiftH: 0.20 } });
const tF = fallT(r), P = r.LOCO.planner, h0 = P.rhythm.wk.h0, hd = [Math.sin(h0), Math.cos(h0)];
for (const e of P.rhythm.walkerLog) { const d = P.exec.done.find(q => q.stepIndex === e.i); if (!d || !d.liftoff || !d.td) continue; const st = d.sw === "R" ? "L" : "R";
  // measured CoP forward offset from the stance foot centre over the single support (from the ctl debug pStar and the actual foot)
  const W = r.recs.filter(q => q.t > d.liftoff.t + 0.05 && q.t < d.td.t && q.ctl && q.ctl.pStar), cop = W.map(q => (q.ctl.pStar[0] - d.pSt[0]) * hd[0] + (q.ctl.pStar[1] - d.pSt[1]) * hd[1]);
  console.log(`k${e.i} ank shift (last) ${f3(e.ank, 3)} · demanded CoP fwd of stance centre: mean ${f3(cop.reduce((a, b) => a + b, 0) / Math.max(1, cop.length), 3)} min ${f3(Math.min(...cop), 3)} max ${f3(Math.max(...cop), 3)} · x ${e.x.map(v => f3(v)).join(",")} ${d.td.t > tF ? "AFTER FALL" : ""}`); }
