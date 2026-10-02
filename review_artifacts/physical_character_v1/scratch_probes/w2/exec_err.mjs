// foothold execution error (achieved − executor's final target, forward / width) per step for variants of the swing options, Controller A
import fs from "fs"; import { walk, f3, fallT } from "./lib.mjs";
const J = (p) => JSON.parse(fs.readFileSync("/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/review_artifacts/physical_character_v1/g2_walker/json/" + p, "utf8"));
const models = {}; for (const t of [0, 0.1, 0.15, 0.2, 0.25]) models[t] = J(`model1_tau${t}.json`);
const V = JSON.parse(process.argv[2]);
for (const [nm, v] of Object.entries(V)) { const ctrl = { kind: "A", models, nom: [0.32, 0.22, 0.38], rho: 0.4, sig: [0.05, 0.05, 0.03], lo: [0.10, 0.17, 0.36], hi: [0.48, 0.40, 0.48], inSwing: v.inSwing ?? 0.25 };
  const n = 12, r = walk({ n, seconds: 1.6 + n * 0.58, walk: { dsLead: true, dsFlat: false, dsExtEnd: 0.96, ...(v.walk || {}), char: { 0: { df: 0.237, dl: 0.30, T: 0.45 } }, ctrl }, human: v.human || {} });
  const P = r.LOCO.planner, h0 = P.rhythm.wk.h0, hd = [Math.sin(h0), Math.cos(h0)], rt = [hd[1], -hd[0]], tF = fallT(r), E = [];
  for (const d of P.exec.done.filter(d => d.kind === "rhythmic" && d.td && d.td.t < tF && d.stepIndex >= 1)) { const sd = d.sw === "R" ? 1 : -1, a = d.td.center, b = d.proj.target; E.push([(a[0] - b[0]) * hd[0] + (a[1] - b[1]) * hd[1], ((a[0] - b[0]) * rt[0] + (a[1] - b[1]) * rt[1]) * sd]); }
  const m = (i) => E.length ? E.reduce((s, e) => s + e[i], 0) / E.length : NaN, sdv = (i) => E.length ? Math.sqrt(E.reduce((s, e) => s + (e[i] - m(i)) ** 2, 0) / E.length) : NaN;
  console.log(`${nm.padEnd(22)} steps ${E.length} · fwd err ${f3(m(0) * 100, 1)} ± ${f3(sdv(0) * 100, 1)} cm · width err ${f3(m(1) * 100, 1)} ± ${f3(sdv(1) * 100, 1)} cm · per step ${E.map(e => f3(e[0] * 100, 0)).join(" ")}`); }
