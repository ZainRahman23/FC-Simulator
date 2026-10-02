// robustness evaluation: 6 deterministic starts (first foot R/L × start time 0.5/0.55/0.6 s), n steps; mean/min upright steps (fall-aware)
import fs from "fs"; import { walk, fallT } from "./lib.mjs";
const J = (p) => JSON.parse(fs.readFileSync("/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/review_artifacts/physical_character_v1/g2_walker/json/" + p, "utf8"));
export function evalCfg(a) { const models = {}; for (const t of [0, 0.1, 0.15, 0.2, 0.25]) models[t] = J(`${a.models || "m5a_tau"}${t}.json`); const n = a.n ?? 30, out = [];
  for (const first of ["R", "L"]) for (const at of [0.5, 0.55, 0.6]) {
    const ctrl = a.kind === "B" ? { kind: "B", gains: a.gains, T: a.T ?? 0.40, lo: [0.05, 0.17], hi: [a.dfMax ?? 0.32, 0.40], inSwing: 0.4, commitMargin: a.commit ?? 0.16 }
      : { kind: "A", models, nom: a.nom || [0.22, 0.24, 0.40], rho: a.rho ?? 0.4, sig: a.sig || [0.05, 0.05, 0.03], lo: a.lo || [0.10, a.wMin ?? 0.17, a.Tmin ?? 0.36], hi: [a.dfMax ?? 0.30, 0.40, 0.48], inSwing: a.inSwing ?? 0.25, commitMargin: a.commit ?? 0.16, adapt: a.adapt, xStar: a.xStar, startNominal: a.startNominal, auth: a.auth, ankle: a.ankle };
    const r = walk({ n, first, rhythm: { at }, seconds: 1.6 + n * 0.58, walk: { dsLead: true, dsFlat: false, dsExtEnd: 0.96, ...(a.inner || {}), char: { 0: a.first0 || { df: 0.24, dl: 0.351, T: 0.448 } }, ctrl }, human: { lateBlend: true, clrActual: true, clrActualUntil: [0.5, 0.2], ...(a.human || {}) } });
    const tF = fallT(r); out.push(r.LOCO.planner.exec.done.filter(d => d.kind === "rhythmic" && d.td && d.td.t < tF).length); }
  return { mean: out.reduce((s, v) => s + v, 0) / out.length, min: Math.min(...out), max: Math.max(...out), all: out }; }
if (process.argv[1].endsWith("evalA.mjs")) { const V = JSON.parse(process.argv[2]); for (const [nm, a] of Object.entries(V)) { const t0 = Date.now(), e = evalCfg(a); console.log(`${nm.padEnd(28)} mean ${e.mean.toFixed(1)} min ${e.min} max ${e.max} [${e.all.join(" ")}] ${((Date.now() - t0) / 1000).toFixed(0)} s`); } }
