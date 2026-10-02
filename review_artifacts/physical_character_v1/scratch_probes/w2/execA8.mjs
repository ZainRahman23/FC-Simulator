// execution precision + survival for swing-path variants under Controller A (v8 maps, bias adaptation)
import fs from "fs"; import { walk, fallT, f3 } from "./lib.mjs";
const J = (p) => JSON.parse(fs.readFileSync("/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/review_artifacts/physical_character_v1/g2_walker/json/" + p, "utf8"));
const models = {}; for (const t of [0, 0.1, 0.15, 0.2, 0.25]) models[t] = J(`m8a_tau${t}.json`);
for (const [nm, hum] of Object.entries(JSON.parse(process.argv[2]))) { const E = [], ups = [];
  for (const first of ["R", "L"]) for (const at of [0.5, 0.55, 0.6]) { const ctrl = { kind: "A", models, nom: [0.22, 0.28, 0.40], rho: 0.4, sig: [0.05, 0.05, 0.03], lo: [0.10, 0.17, 0.36], hi: [0.30, 0.40, 0.48], inSwing: 0.3, commitMargin: 0.12, adapt: { gain: 0.3, max: 0.06 } };
    const r = walk({ n: 30, first, rhythm: { at }, seconds: 19, walk: { dsLead: true, dsFlat: false, dsExtEnd: 0.96, reachExt: 0.96, char: { 0: { df: 0.224, dl: 0.343, T: 0.469 } }, ctrl }, human: { lateBlend: true, clrActual: true, clrActualUntil: [0.5, 0.2], swingLiftH: 0.20, ...hum } });
    const tF = fallT(r), P = r.LOCO.planner, h0 = P.rhythm.wk.h0, hd = [Math.sin(h0), Math.cos(h0)], rt = [hd[1], -hd[0]], D = P.exec.done.filter(d => d.kind === "rhythmic" && d.stepIndex >= 1 && d.td && d.td.t < tF && d.liftoff && d.td.t - d.liftoff.t > 0.22);
    ups.push(P.exec.done.filter(d => d.kind === "rhythmic" && d.td && d.td.t < tF).length);
    for (const d of D) { const sd = d.sw === "R" ? 1 : -1, a = d.td.center, b = d.proj.target; E.push([(a[0] - b[0]) * hd[0] + (a[1] - b[1]) * hd[1], ((a[0] - b[0]) * rt[0] + (a[1] - b[1]) * rt[1]) * sd]); } }
  const m = (i) => E.reduce((s, e) => s + e[i], 0) / E.length, sd = (i) => Math.sqrt(E.reduce((s, e) => s + (e[i] - m(i)) ** 2, 0) / E.length);
  console.log(`${nm.padEnd(18)} upright mean ${(ups.reduce((a, b) => a + b, 0) / 6).toFixed(1)} [${ups.join(" ")}] · forward exec ${f3(m(0) * 100, 1)} ± ${f3(sd(0) * 100, 1)} cm · width ${f3(m(1) * 100, 1)} ± ${f3(sd(1) * 100, 1)} cm (n ${E.length})`); }
