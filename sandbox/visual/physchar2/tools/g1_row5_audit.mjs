// ═══ physchar2/tools/g1_row5_audit.mjs — close-decisions stage §1: G1 row 5 (knee-flexion damping-only rig) under the original premise (v1) and
// the superseding criterion G1-5′ (v2: expected = −c·ω + the specification coupling), on the corrected knee, the OLD knee and a deliberately bad
// "naive" corrected knee (the envelope frozen at the current flexion inside the gradient: no flexion reaction). Same rig, same tolerances (rigChecks).
import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js";
import { DAMP_TESTS, passiveRig } from "../gates/v2_g1_tests.js"; import { rigChecks } from "../gates/v2_g1_checks.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), spec = generateSpec(VARIATION_SET.find(h => h.id === "V2-REF"));
const R = Math.PI / 180, test = DAMP_TESTS.find(t => t.joint === "knee_R" && t.key === "flex");
const naive = (P) => { const ol = P.kneeLim.bind(P), oc = P.compute.bind(P); let fr = null;
  P.kneeLim = (k, i, qs, which) => { if (fr && fr[k] != null) { const a = P.jd[k].axes[i], e = P.kneeEnv(fr[k])[which], x = [e[0] * R, e[1] * R]; return a.s > 0 ? x : [-x[1], -x[0]]; } return ol(k, i, qs, which); };
  P.compute = (st, dt) => { fr = {}; for (const k of Object.keys(P.kneeRot)) { const d = P.jd[k]; fr[k] = P.anat(d, P.qcs(d, st.map(s => s.rot)), "flex"); } const o = oc(st, dt); fr = null; return o; }; };
for (const [name, o] of [["v2k, original criterion (v1)", { kneeModel: "v2k", kneeCrit: "v1" }], ["v2k, superseding G1-5′ (v2)", { kneeModel: "v2k", kneeCrit: "v2" }], ["old knee, superseding G1-5′ (v2)", { kneeModel: null, kneeCrit: "v2" }],
  ["ADVERSARIAL naive v2k, superseding G1-5′ (v2)", { kneeModel: "v2k", kneeCrit: "v2", passiveHook: naive }]]) {
  const r = passiveRig(J, spec, test, o), c = rigChecks(r), f = c.filter(x => !x.pass);
  console.log(`${name}: ${f.length ? "FAIL" : "PASS"} — ${c.map(x => `${x.id} ${x.pass ? "✓" : "✗"} (${x.value})`).join("; ")}`); }
