// ═══ physchar2/tools/g3_trace.mjs — V2-G3 trajectories for the report (COM path, support geometry, CoPs, joint torques), REPORT-ONLY ═══════════
// Runs T5 (near-single-support R) and U:R (unloading the left foot) with the gate configuration and samples every 0.25 s: requested λ, measured
// load, COM (lateral / anterior of the mid-ankle point, height), ξ, commanded and measured CoP, per-foot CoP in its own foot frame, active support
// area, class, pelvis roll / trunk lean, stance-side hip abduction / knee / ankle torques (actuator readback).
// usage: node tools/g3_trace.mjs → review_artifacts/physical_character_v2/g3/json/g3_trace.json
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js";
import { G3Sim, g3Def } from "../gates/v2_g3.js"; import { V, Q } from "../core/v2_math.js";
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, "../../../.."), OUT = path.join(ROOT, "review_artifacts/physical_character_v2/g3/json/g3_trace.json");
const Jolt = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), spec = generateSpec(VARIATION_SET.find(h => h.id === "V2-REF")), out = {};
const area = (P) => { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2; };
for (const key of ["T5", "U:R"]) { const s = new G3Sim(Jolt, spec, g3Def(key), {}), rows = [], every = Math.round(0.25 / s.dt), ax = (n, key2) => { const k = spec.joints.findIndex(j => j.name === n), i = ["x", "y", "z"].findIndex(a => spec.joints[k].def.axes[a] && spec.joints[k].def.axes[a].key === key2); const r = (s.actRes || []).find(x => x.k === k && x.i === i); return r ? r.tau : null; };
  let c0 = null;
  while (s.tick()) { if (s.n % every) continue; const I = s.ctrl.info, r = s.g3.last, row = s.lastRow, hd = I.heading, lat = [hd[1], -hd[0]], rel = (p) => [(p[0] - I.mid[0]) * lat[0] + (p[1] - I.mid[1]) * lat[1], (p[0] - I.mid[0]) * hd[0] + (p[1] - I.mid[1]) * hd[1]];
    if (!c0) c0 = I.c[1]; const footCop = s.probeRows.map((pr, n) => { if (!pr.cop || r.Fz[n] < 5) return null; const f = s.st[s.ctrl.feet[n]], l = Q.rot(Q.conj(f.rot), V.sub(pr.cop, f.pos)); return [l[0] * 100, l[2] * 100]; });
    rows.push({ t: +r.t.toFixed(3), lam: r.lam, loadR: r.load[1], cls: r.cls, com: [...rel([I.c[0], I.c[2]]).map(x => x * 100), (I.c[1] - c0) * 1000], xi: rel(I.xi).map(x => x * 100), copCmd: rel(I.p).map(x => x * 100), cop: row.cop ? rel(row.cop).map(x => x * 100) : null,
      footCopCm: footCop, supportAreaCm2: area(I.support) * 1e4, inSup: I.inSup, unl: I.unl, pelvisRoll: r.pelRoll, trunkLean: r.trunkLean, yaw: r.yaw,
      tau: { hipAbdL: ax("hip_L", "abd"), hipAbdR: ax("hip_R", "abd"), kneeR: ax("knee_R", "flex"), ankleInvR: ax("ankle_R", "inv"), ankleDfR: ax("ankle_R", "df"), ankleInvL: ax("ankle_L", "inv") } }); }
  out[key] = { title: s.def.title, M: s.ctrl.M, rows }; s.destroy(); }
fs.writeFileSync(OUT, JSON.stringify(out, null, 0)); console.log("→ " + path.relative(ROOT, OUT));
