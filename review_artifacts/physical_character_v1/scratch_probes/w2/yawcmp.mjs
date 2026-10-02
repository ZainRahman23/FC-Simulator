import { walk, f3 } from "./lib.mjs"; import { yawMetrics } from "./yawm.mjs";
const COND = { df: 0.237, dl: 0.368, T: 0.45 }, inner = { dsLead: true, dsFlat: false };
const V = JSON.parse(process.argv[2]);
for (const [nm, v] of Object.entries(V)) { const acc = []; for (const df of [0.30, 0.34, 0.38]) for (const T of [0.41, 0.45]) {
    const r = walk({ n: 4, seconds: 3.9, keep: true, walk: { ...inner, char: { 0: COND, 1: { df, dl: 0.26, T } } }, ...v }); const d = r.LOCO.planner.exec.done.filter(x => x.kind === "rhythmic"), tF = (r.recs.find(q => q.com[1] < 0.75) || { t: 9 }).t;
    const t0 = d[0] && d[0].liftoff ? d[0].liftoff.t : 1.6, t1 = Math.min(tF - 0.3, d[2] && d[2].liftoff ? d[2].liftoff.t : 3.3); const m = yawMetrics(r, t0, t1); if (m) acc.push(m); }
  const mean = (k) => acc.reduce((s, m) => s + m[k], 0) / acc.length;
  const up = acc.length; console.log(`${nm.padEnd(10)} n ${up} · transverse WBAM range ${f3(mean("rangeN"), 4)} m/s (human 0.014) · |Ly| max ${f3(mean("LyMax"), 2)} · pelvis yaw range ${f3(mean("pelvisRange"), 1)}° · DS share of ΔLy ${f3(mean("dsShare"), 2)}`); }
