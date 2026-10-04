// ═══ physchar2/tools/deep_irrelevance.mjs — close-decisions stage §2: does the provisional deep-flexion family (> 120°) touch E1a's envelope?
// Runs the E1a pelvis-drop protocol (as tools/knee_v2k_ctrl.mjs: 0 → −2.5 cm → 0, reference policy + lifecycle, v2k, k from env) for each family
// member and prints the final state hash and the max knee flexion. Identical hashes = the family member cannot influence that run (bit-identical).
import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js"; import { G2Sim } from "../gates/v2_g2.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), HUMAN = (process.argv.find(a => a.startsWith("--human=")) || "--human=V2-REF").slice(8);
const mj = (u) => { u = Math.min(1, Math.max(0, u)); return u * u * u * (10 - 15 * u + 6 * u * u); }, spec = generateSpec(VARIATION_SET.find(h => h.id === HUMAN));
const FAMILY = [{}, { deep: { delta150: -8 } }, { deep: { delta150: -4 } }, { deep: { delta150: 5 } }, { deep: { delta150: 10 } }, { deep: { width150: 0.6 } }, { deep: { width150: 0.3 } }, { deep: { delta150: 10, width150: 0.3 } }];
for (const over of FAMILY) { const pd = { t0: 1, dur: 2, dz: 0.025 }, s = new G2Sim(J, spec, "S0short", { stand: { ikRefTwist: true, lifecycle: true, pelvisDrop: pd }, passiveOpts: { kneeModel: "v2k", kneeV2K: over } });
  { const oc = s.ctrl.compute.bind(s.ctrl); s.ctrl.compute = (...a) => { const t = s.ctrl.n * s.dt; pd.dz = t < 5 ? 0.025 : 0.025 * (1 - mj((t - 5) / 2)); return oc(...a); }; }
  const kn = ["knee_L", "knee_R"].map(n => spec.joints.findIndex(j => j.name === n)); let fm = 0; while (s.tick()) for (const k of kn) fm = Math.max(fm, s.P.anat(s.P.jd[k], s.up.ev.qs[k], "flex"));
  console.log(`${HUMAN} ${JSON.stringify(over)}: hash ${s.h.toString(16).padStart(8, "0")}, outcome ${s.g2summary().outcome}, max knee flexion ${fm.toFixed(2)}°`); s.destroy(); }
