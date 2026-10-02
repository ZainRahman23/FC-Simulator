import { walk, spec, C, f3 } from "./lib.mjs";
const COND = { df: 0.237, dl: 0.368, T: 0.45 };
const r = walk({ n: 4, seconds: 3.3, keep: true, walk: { dsLead: true, dsFlat: false, char: { 0: COND, 1: { df: 0.34, dl: 0.26, T: 0.45 } } } });
let n = 0; for (const q of r.recs.filter(q => q.t > 2.78 && q.t < 3.19)) { for (const s of ["L", "R"]) { const f = q.feet[s]; if (!f.touching || !f.centroid || f.load < 5) continue; const v = [f.centroid[0], f.centroid[2], f.shear[0], f.shear[2]]; if (v.some(x => !Number.isFinite(x)) && n++ < 3) console.log(q.t.toFixed(3), s, JSON.stringify(f.centroid), JSON.stringify(f.shear), f.load); } }
const B = C.bodyState(spec, r.recs.find(q => q.t > 2.9).states, "R"); console.log("L", B.L, "com", B.com);
