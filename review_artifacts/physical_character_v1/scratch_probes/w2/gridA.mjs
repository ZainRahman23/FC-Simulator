import fs from "fs"; import { walk, f3, fallT } from "./lib.mjs";
const J = (p) => JSON.parse(fs.readFileSync("/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1/review_artifacts/physical_character_v1/g2_walker/json/" + p, "utf8"));
const pre = process.argv[2] || "model1_tau", inner = JSON.parse(process.argv[3] || '{"dsLead":true,"dsFlat":false}'), human = JSON.parse(process.argv[4] || '{"lateBlend":true}');
const models = {}; for (const t of [0, 0.1, 0.15, 0.2, 0.25]) models[t] = J(`${pre}${t}.json`);
const res = [], t0 = Date.now(), n = 16;
for (const fdl of [0.30, 0.34, 0.368]) for (const ndl of [0.22, 0.26, 0.30]) for (const rho of [0.4, 0.6]) for (const nT of [0.38, 0.42]) {
  const ctrl = { kind: "A", models, nom: [0.32, ndl, nT], rho, sig: [0.05, 0.05, 0.03], lo: [0.10, 0.17, 0.36], hi: [0.48, 0.40, 0.48], inSwing: 0.25 };
  const r = walk({ n, seconds: 1.6 + n * 0.58, walk: { ...inner, char: { 0: { df: 0.237, dl: fdl, T: 0.45 } }, ctrl }, human }); const tF = fallT(r);
  res.push({ fdl, ndl, rho, nT, up: r.LOCO.planner.exec.done.filter(d => d.kind === "rhythmic" && d.td && d.td.t < tF).length, tF }); }
res.sort((a, b) => b.up - a.up); for (const r of res.slice(0, 8)) console.log(JSON.stringify(r));
console.log("dist", JSON.stringify(res.reduce((a, r) => (a[r.up] = (a[r.up] || 0) + 1, a), {})), ((Date.now() - t0) / 1000).toFixed(0), "s");
