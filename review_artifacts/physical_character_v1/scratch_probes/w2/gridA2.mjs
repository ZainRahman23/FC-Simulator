import fs from "fs"; import { walk, f3, fallT } from "./lib.mjs";
const J = (p) => JSON.parse(fs.readFileSync("/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/review_artifacts/physical_character_v1/g2_walker/json/" + p, "utf8"));
const pre = process.argv[2] || "m5a_tau", models = {}; for (const t of [0, 0.1, 0.15, 0.2, 0.25]) models[t] = J(`${pre}${t}.json`);
const G = JSON.parse(process.argv[3] || "{}"), res = [], t0 = Date.now(), n = G.n ?? 20;
for (const df of G.df || [0.24, 0.28, 0.32]) for (const T of G.T || [0.38, 0.42]) for (const ext of G.ext || [0.93, 0.96]) for (const rho of G.rho || [0.5]) for (const dl of G.dl || [0.24]) {
  const ctrl = { kind: "A", models, nom: [df, dl, T], rho, sig: [0.05, 0.05, 0.03], lo: [0.10, 0.17, 0.36], hi: [G.dfMax ?? 0.48, 0.40, 0.48], inSwing: G.inSwing ?? 0.25, adapt: G.adapt };
  const r = walk({ n, seconds: 1.6 + n * 0.58, walk: { dsLead: true, dsFlat: false, dsExtEnd: ext, char: { 0: { df: 0.24, dl: 0.351, T: 0.448 } }, ctrl }, human: { lateBlend: true, clrActual: true, clrActualUntil: [0.5, 0.2] } }); const tF = fallT(r);
  const done = r.LOCO.planner.exec.done.filter(d => d.kind === "rhythmic" && d.td && d.td.t < tF), dist = done.length ? (() => { const a = done[0].td.center, b = done[done.length - 1].td.center; return Math.hypot(b[0] - a[0], b[1] - a[1]); })() : 0;
  res.push({ df, T, ext, rho, dl, up: done.length, tF: Number.isFinite(tF) ? +tF.toFixed(2) : null, v: done.length > 2 ? +(dist / (done[done.length - 1].td.t - done[0].td.t)).toFixed(2) : null }); }
res.sort((a, b) => b.up - a.up); for (const r of res.slice(0, 10)) console.log(JSON.stringify(r));
console.log("dist", JSON.stringify(res.reduce((a, r) => (a[r.up] = (a[r.up] || 0) + 1, a), {})), ((Date.now() - t0) / 1000).toFixed(0), "s");
