// scratch-tree diagnostic (not in the repo): rest state of a G1 scenario, old vs v2k knee
import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js"; import * as G1 from "../gates/v2_g1.js"; import { ankleNeutralKPerDeg } from "../spec/v2_joints.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const HUMAN = arg("human", "V1-matched"), KEY = arg("key", "upright"), spec = generateSpec(VARIATION_SET.find(h => h.id === HUMAN));
for (const model of ["old", "v2k"]) { G1.ensureScenario(KEY); const s = new G1.G1Sim(J, spec, KEY, { passiveOpts: { kneeModel: model === "v2k" ? "v2k" : null } }); while (s.tick());
  const ev = s.up.ev, out = []; for (const n of ["hip_L", "hip_R", "knee_L", "knee_R", "ankle_L", "ankle_R"]) { const k = spec.joints.findIndex(j => j.name === n), d = s.P.jd[k];
    const vals = d.axes.map((a, i) => a ? `${a.key} ${s.P.anat(d, ev.qs[k], a.key).toFixed(1)}°${ev.per[k].T[i] && ev.per[k].T[i].tau ? ` (τ ${ev.per[k].T[i].tau.toFixed(1)})` : ""}` : null).filter(Boolean); out.push(`${n}: ${vals.join(", ")}`); }
  const r = s.summary(); console.log(`${model} k ${ankleNeutralKPerDeg()} ${HUMAN} ${KEY}: settled excursion ${r.joints.hardExcRestDeg.toFixed(2)}° (${r.joints.hardExcRestWho || "-"})\n   ` + out.join("\n   ")); s.destroy(); }
