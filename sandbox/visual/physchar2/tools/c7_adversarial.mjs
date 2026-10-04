// ═══ physchar2/tools/c7_adversarial.mjs — close-decisions stage §4: a deliberately bad PLANT for the C7′ discrimination test — the twist battery's
// HO1 (G3 U:R single-support hold + 1 N·m·s pelvis yaw impulse at 8 s), reference policy, with the contact friction lowered to μ for every contact (an "ice"
// turf, set through the per-material friction policy the contact listener uses), so the supporting foot itself can slip. Prints the outcome and per-foot slip; C7′ (supporting-foot relocation) must flag a stance-foot relocation.
import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js"; import { G3Sim, g3Def } from "../gates/v2_g3.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const MU = +arg("mu", 0.1), HUMAN = arg("human", "V2-REF"), H = +arg("H", 1), SC = arg("scen", "HO1"), spec = generateSpec(VARIATION_SET.find(h => h.id === HUMAN));
// HO1: U:R + pelvis yaw impulse H at 8 s; HO2: T5 + thorax push L 15 N·s at 8 s (the battery definitions)
const def = SC === "HO2" ? { ...g3Def("T5"), supervise: {}, push: { t0: 8, dur: 0.1, J: [-15, 0, 0], body: "thorax" } } : { ...g3Def("U:R"), supervise: {}, torque: { t0: 8, dur: 0.1, H: [0, H, 0], body: "pelvis" } }, s = new G3Sim(J, spec, def, { stand: { ikRefTwist: true } });
if (MU !== 0.5) s.w.frictionOf = () => MU;   // the contact listener takes every combined friction from frictionOf (per-material policy) → "ice" turf for both boots
while (s.tick()); const g = s.g3summary(); console.log(`ADVERSARIAL ${SC} ${HUMAN} contact μ ${MU}, impulse ${H} N·m·s: outcome ${g.outcome}; slip L ${g.feet.slipMaxMm[0].toFixed(1)} mm (unloaded), R ${g.feet.slipMaxMm[1].toFixed(1)} mm (supporting)`); s.destroy();
