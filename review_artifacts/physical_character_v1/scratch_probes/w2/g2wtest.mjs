import { J, spec, poses, G2, fallT } from "./lib.mjs";
for (const k of process.argv.slice(2)) { let L = null; const r = G2.runG2a(J, spec, k, { poses, onLoco: (l) => { L = l; } }); const tF = fallT(r); console.log(k, r.outcome, "hash", r.hash, "upright steps", L.planner.exec.done.filter(d => d.kind === "rhythmic" && d.td && d.td.t < tF).length, "fall", tF.toFixed ? tF.toFixed(2) : tF); }
