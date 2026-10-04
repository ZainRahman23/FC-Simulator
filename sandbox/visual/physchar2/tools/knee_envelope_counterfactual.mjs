// ═══ physchar2/tools/knee_envelope_counterfactual.mjs — final pre-E1a stage §3: DIAGNOSTIC COUNTERFACTUAL (no model change adopted).
// Question: is the G1 failure at ankle stiffness k > 0 (V1-matched "perturb" passive fall: a prone rest with the knee at ~146° flexion and +32°
// INTERNAL axial rotation, knee and ankle axial end ranges loaded in series, 23–25 N·m; row 1.3d settled excursion > 1.5°) an artefact of the knee
// axial envelope? The literature (final_pre_e1a/literature/lit2_knee_axial.md) says the knee-only axial range is ~half ours, narrower at
// extension, and its zero shifts INTERNALLY with flexion (~10° by 60°, ~20° by 120°, ~30° at 150°). Diagnostic envelope (anatomical, + = internal):
//   zero c(f) = f/6;  width scale w(f) = 0.55 + 0.45·clamp(f/40°, 0, 1);  soft = [c − 9w, c + 4w];  hard = [c − 25w, c + 15w]
// (soft ≈ the ±2.5 N·m bone-level points, hard ≈ the 9–10 N·m points; NOT fitted — a plausibility test). The Jolt emergency limits are unchanged.
// Runs the G1 scenario (passive) for the 15-member lift ensemble of the runway (0, ±1e-6 … ±1e-4 m) at 240 Hz with k ∈ {0, 0.13} × knee ∈
// {current, envelope}; reports per member the settled (last 0.5 s) excursion beyond the ANATOMICAL hard limit in force (the diagnostic envelope
// for the knee axial when on, the spec elsewhere) — the 1.3d quantity, tolerance 1.5° — and the knee axial / ankle ab/adduction state at rest.
// usage: V2_ANKLE_NEUTRAL_K=<k> node tools/knee_envelope_counterfactual.mjs --knee=current|envelope|shift [--human=V1-matched] [--key=perturb] [out.json]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js";
import * as G1 from "../gates/v2_g1.js"; import { ankleNeutralKPerDeg, KNEE_ENVELOPE_LIT1, KNEE_ENVELOPE_SHIFT } from "../spec/v2_joints.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const KNEE = arg("knee", "current"), HUMAN = arg("human", "V1-matched"), KEY = arg("key", "perturb"), OUT = process.argv.slice(2).find(a => a.endsWith(".json")), D = 180 / Math.PI;
const env = KNEE_ENVELOPE_LIT1;   // spec/v2_joints.js (the same function the env switch V2_KNEE_ENVELOPE=lit1 selects)
const E = [0, 1e-6, -1e-6, 2e-6, -2e-6, 5e-6, -5e-6, 1e-5, -1e-5, 2e-5, -2e-5, 5e-5, -5e-5, 1e-4, -1e-4], spec = generateSpec(VARIATION_SET.find(h => h.id === HUMAN)), rows = [];
for (const e of E) { const key = G1.ensembleKey(KEY, e); G1.ensureScenario(key); const s = new G1.G1Sim(J, spec, key, { passiveOpts: { kneeEnvelope: KNEE === "envelope" ? env : KNEE === "shift" ? KNEE_ENVELOPE_SHIFT : null } });
  const N = s.N, rest = N - Math.round(0.5 * s.cfg.hz); let exc = 0, who = null; const kn = spec.joints.findIndex(j => j.name === "knee_L"), kr = spec.joints.findIndex(j => j.name === "knee_R"), al = spec.joints.findIndex(j => j.name === "ankle_L"), ar = spec.joints.findIndex(j => j.name === "ankle_R");
  while (s.tick()) { if (s.n < rest) continue; const ev = s.up.ev;
    for (const d of s.P.jd) d.axes.forEach((a, i) => { if (!a) return; const T = ev.per[d.k].T[i], th = ev.per[d.k].th[i], h = T && T.hard ? T.hard : a.hard, m = Math.min(th - h[0], h[1] - th); if (-m > exc) { exc = -m; who = d.name + "." + a.key; } }); }
  const ev = s.up.ev, st = (k, key) => { const d = s.P.jd[k], i = d.axes.findIndex(a => a && a.key === key), T = ev.per[k].T[i]; return { deg: s.P.anat(d, ev.qs[k], key), tau: T ? T.tau : 0 }; };
  const r = { eps: e, excDeg: exc * D, who, fail13d: exc * D > 1.5, kneeL: { flex: st(kn, "flex").deg, rot: st(kn, "rot") }, kneeR: { flex: st(kr, "flex").deg, rot: st(kr, "rot") }, ankleL: st(al, "fabd"), ankleR: st(ar, "fabd") };
  rows.push(r); s.destroy();
  console.log(`k ${ankleNeutralKPerDeg()} knee ${KNEE} ${HUMAN} ${key}: settled excursion ${r.excDeg.toFixed(2)}° (${who})${r.fail13d ? " FAIL 1.3d" : ""} | knee L flex ${r.kneeL.flex.toFixed(1)}° rot ${r.kneeL.rot.deg.toFixed(1)}° (${r.kneeL.rot.tau.toFixed(1)} N·m), ankle L fabd ${r.ankleL.deg.toFixed(1)}° (${r.ankleL.tau.toFixed(1)} N·m)`); }
const nf = rows.filter(r => r.fail13d).length; console.log(`k ${ankleNeutralKPerDeg()} knee ${KNEE}: ${nf} / ${rows.length} members fail 1.3d (settled excursion > 1.5°)`);
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ k: ankleNeutralKPerDeg(), knee: KNEE, human: HUMAN, key: KEY, envelope: "c=f/6, w=0.55+0.45·clamp(f/40), soft [c−9w, c+4w], hard [c−25w, c+15w]", rows, nFail: nf }));
