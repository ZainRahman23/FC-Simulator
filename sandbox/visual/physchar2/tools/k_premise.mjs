// ═══ physchar2/tools/k_premise.mjs — G3 row K premise audit (close-decisions stage §5): is a T11 "excessive" request physically excessive?
// For each body: the quasi-static lateral target of a transfer request λ_R (the controller's own law: the COM / ξ reference over the λ-weighted
// point between the feet's usable-region centroids, plus the stance's comAhead) and its SIGNED distance to the right foot's usable region
// (polyDist: + inside, − outside), at the T11 start state (bilateral quiet stance, both feet flat). A request is physically excessive iff its
// target lies OUTSIDE the stance foot's region: then no CoP inside the support can hold it statically.
// Optional --adv=rescue: a deliberately bad "silent rescue" controller (the whole transfer-request profile is rescaled smoothly so that its peak
// maps onto the largest λ whose target stays ≥ 2 cm inside the right foot's region) running T11 over 1.4 — the corrected criterion must flag it.
// usage: node tools/k_premise.mjs [--stand=<json>] [--adv=rescue] [--knee=v2k] [out.json]   (k via V2_ANKLE_NEUTRAL_K)
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js"; import { G3Sim, g3Def } from "../gates/v2_g3.js";
import { polyDist } from "../ctrl/v2_stand.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const STAND = JSON.parse(arg("stand", "{}")), ADV = arg("adv", ""), KNEE = arg("knee", ""), OUT = process.argv.slice(2).find(a => a.endsWith(".json")), rows = [];
const cen = (P) => { let A = 0, x = 0, z = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length], c = p[0] * q[1] - q[0] * p[1]; A += c; x += (p[0] + q[0]) * c; z += (p[1] + q[1]) * c; } return [x / (3 * A), z / (3 * A)]; };
function targets(s) { const st = s.st, ctrl = s.ctrl, polys = [0, 1].map(n => ctrl.footPoly(st, n)), C = polys.map(cen), ank = ["ankle_L", "ankle_R"].map(n => ctrl.jointAt(st, s.spec.joints.findIndex(j => j.name === n)));
  const fwd = ctrl.feet.map(f => { const v = s.w.read(f).rot; const q = v; const fx = 2 * (q[0] * q[2] + q[3] * q[1]), fz = 1 - 2 * (q[0] * q[0] + q[1] * q[1]); return [fx, fz]; });
  const hd = (() => { const a = [fwd[0][0] + fwd[1][0], fwd[0][1] + fwd[1][1]], l = Math.hypot(a[0], a[1]); return [a[0] / l, a[1] / l]; })(), lat = [hd[1], -hd[0]], mid = [(ank[0][0] + ank[1][0]) / 2, (ank[0][2] + ank[1][2]) / 2];
  const out = {}; for (const lam of [1.0, 1.1, 1.2, 1.3, 1.4]) { const dLat = (C[0][0] * (1 - lam) + C[1][0] * lam - mid[0]) * lat[0] + (C[0][1] * (1 - lam) + C[1][1] * lam - mid[1]) * lat[1];
    const x = [mid[0] + hd[0] * ctrl.stance.comAhead + lat[0] * dLat, mid[1] + hd[1] * ctrl.stance.comAhead + lat[1] * dLat]; out[lam] = +(polyDist(polys[1], x) * 100).toFixed(2); }
  return out; }
if (!ADV) for (const h of VARIATION_SET) { const spec = generateSpec(h), s = new G3Sim(J, spec, g3Def("T11:over:1.2"), { stand: STAND, passiveOpts: KNEE ? { kneeModel: KNEE } : {} }); s.tick();
  const t = targets(s); rows.push({ human: h.id, marginCm: t }); console.log(`${h.id}: signed margin of the λ_R target inside the right foot's usable region (cm, + inside): ${Object.entries(t).map(([l, m]) => `λ ${l}: ${m}`).join(", ")}`); s.destroy(); }
if (ADV === "rescue") { const spec = generateSpec(VARIATION_SET.find(h => h.id === "V2-REF")), def = g3Def("T11:over:1.4"), s = new G3Sim(J, spec, def, { stand: STAND, passiveOpts: KNEE ? { kneeModel: KNEE } : {} });
  // a smooth silent rescue: the whole request profile is rescaled about 0.5 so that its peak (1.4) maps onto the largest λ whose target keeps a
  // ≥ 2 cm margin inside the right foot's region (no velocity discontinuity — the realistic way a controller would "make a request safe")
  const t = targets(s); const lamMax = [1.4, 1.3, 1.2, 1.1, 1.0].find(l => t[l] >= 2.0) ?? 1.0, sc = (lamMax - 0.5) / (1.4 - 0.5), orig = s.ctrl.o.transfer;
  s.ctrl.o.transfer = (tt, c) => { const r = orig(tt, c); if (r == null) return r; if (typeof r === "number") return 0.5 + (r - 0.5) * sc; return { ...r, lam: 0.5 + (r.lam - 0.5) * sc, dl: (r.dl || 0) * sc, ddl: (r.ddl || 0) * sc }; };
  while (s.tick()); const g = s.g3summary(); rows.push({ adv: "rescue", lamMax, outcome: g.outcome }); console.log(`ADVERSARIAL silent rescue (request rescaled so its peak maps to λ ${lamMax}, stand ${JSON.stringify(STAND)}): T11 over 1.4 → ${g.outcome}`); s.destroy(); }
if (OUT) fs.writeFileSync(OUT, JSON.stringify(rows, null, 1));
