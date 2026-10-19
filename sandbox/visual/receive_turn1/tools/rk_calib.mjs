// receive_kill12/tools/rk_calib.mjs — calibration printout: the matched TYPICAL grid and the multi-seed distribution per matrix row
//   node rk_calib.mjs [matrixIds comma] [nSeeds] [out.json]      RKOVR='{"exec":{"eSkill":0.4}}' overrides RK for this process (experiments)
import fs from "fs";
import { RK } from "../rk_model.js";
import { prepare, runBC, drawsFor, DT } from "../rk_sim.js";
import { MATRICES, BENCHMARKS, BC_STEPS, condOf, condLabel } from "../rk_conditions.js";
if (process.env.RKOVR) { const o = JSON.parse(process.env.RKOVR); for (const [k, v] of Object.entries(o)) RK[k] = typeof v === "object" ? Object.assign({}, RK[k], v) : v; }
const ids = (process.argv[2] || "GROUND").split(","), nS = +(process.argv[3] || 0), out = process.argv[4];
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const res = {};
for (const id of ids) {
  const M = id.startsWith("B:") ? { id, title: "benchmarks", surface: "AUTO", rows: BENCHMARKS.filter((b) => id === "B:ALL" || b.id === id.slice(2)).map((b) => b.cond) } : MATRICES.find((m) => m.id === id);
  console.log(`\n## ${M.id} — ${M.title}`); res[M.id] = [];
  for (const r of M.rows) {
    const cond = condOf(M, r), P = prepare(cond); if (P.plan.none) { console.log(condLabel(cond).padEnd(34), "NO FEASIBLE ACTION", JSON.stringify(P.plan.rej)); res[M.id].push({ cond, none: true }); continue; }
    const pl = P.plan, NT = drawsFor({ example: "TYPICAL" }), typ = BC_STEPS.map((bc) => runBC(P, bc, NT, { post: 2.2 }).m);
    const row = { cond, surface: pl.sf.key, D: pl.dif.D, typical: typ.map((m) => +m.dStar.toFixed(3)) };
    let line = `${condLabel(cond).padEnd(34)} ${pl.sf.key.padEnd(13)} D ${pl.dif.D.toFixed(2).padStart(5)} | typ d* ` + typ.map((m) => m.dStar.toFixed(2).padStart(5)).join("");
    if (nS > 0) {
      const dist = BC_STEPS.map(() => ({ d: [], r: [] }));
      for (let s = 1; s <= nS; s++) { const N = drawsFor({ seed: s }); BC_STEPS.forEach((bc, j) => { const m = runBC(P, bc, N, { post: 2.2, stopAtRest: false, every: 12 }).m; dist[j].d.push(m.dStar); dist[j].r.push(m.resid); }); }
      row.dist = dist.map((x) => ({ med: q(x.d, 0.5), p90: q(x.d, 0.9), heavy: x.d.filter((d) => d > 1.2).length / x.d.length, lost: x.d.filter((d) => d > 4.5).length / x.d.length, residMed: q(x.r, 0.5) }));
      line += `\n${"".padEnd(55)}  med d* ` + row.dist.map((x) => x.med.toFixed(2).padStart(5)).join("") + `\n${"".padEnd(55)}  p90 d* ` + row.dist.map((x) => x.p90.toFixed(2).padStart(5)).join("") + `\n${"".padEnd(55)}  heavy% ` + row.dist.map((x) => (100 * x.heavy).toFixed(0).padStart(5)).join("");
    }
    console.log(line); res[M.id].push(row);
  }
}
if (out) fs.writeFileSync(out, JSON.stringify({ RK, res }, null, 1));
