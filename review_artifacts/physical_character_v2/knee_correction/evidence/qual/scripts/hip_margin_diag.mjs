// REPORT-ONLY diagnostic (not a qualification item; run after the battery from the frozen scratch tree): how close do the hips come to their
// anatomical hard limits (per DOF: twist / swing y / swing z, the passive layer's own coordinates) in E1a-like single support in the adopted
// configuration, versus the G1 V1-matched upright splayed rest (the open finding)? Prints the smallest margin per hip DOF (° ; negative = beyond).
// usage (tree dir): V2_ANKLE_NEUTRAL_K=0.13 node hip_margin_diag.mjs <tree physchar2 dir>
import path from "path"; import { pathToFileURL } from "url";
const TREE = process.argv[2], imp = (p) => import(pathToFileURL(path.join(TREE, p)).href);
const { loadJolt } = await imp("core/v2_jolt.js"), { generateSpec } = await imp("spec/v2_spec.js"), { VARIATION_SET } = await imp("spec/v2_human.js"), { decompose } = await imp("spec/v2_joints.js");
const { G3Sim, g3Def } = await imp("gates/v2_g3.js"), { G1Sim } = await imp("gates/v2_g1.js"), J = await loadJolt(path.join(TREE, "vendor/jolt-physics.wasm-compat.js")), D = 180 / Math.PI;
const track = (s, spec, qsOf) => { const H = ["hip_L", "hip_R"].map(n => spec.joints.findIndex(j => j.name === n)), m = H.map(() => [Infinity, Infinity, Infinity]), last = H.map(() => [0, 0, 0]);
  return { step() { const qs = qsOf(); H.forEach((k, n) => { const v = decompose(qs[k]), th = [v.tw, v.sy, v.sz]; s.P.jd[k].axes.forEach((a, i) => { if (!a) return; const h = s.P.hardOf(k, i, qs), mg = Math.min(th[i] - h[0], h[1] - th[i]) * D; m[n][i] = Math.min(m[n][i], mg); last[n][i] = mg; }); }); },
    get: () => ({ min: m.map(r => r.map(x => +x.toFixed(2))), end: last.map(r => r.map(x => +x.toFixed(2))) }) }; };
const fmt = (r) => `L ${r[0].join(" / ")}  R ${r[1].join(" / ")}`;
for (const h of ["V2-REF", "V2-165-62", "V2-198-92"]) { const spec = generateSpec(VARIATION_SET.find(x => x.id === h));
  const s = new G3Sim(J, spec, g3Def("U:R"), { stand: { ikRefTwist: true, lifecycle: true, pelvisDrop: { t0: 1, dur: 2, dz: 0.025 } }, passiveOpts: { kneeModel: "v2k" } });
  const T = track(s, spec, () => s.up.ev.qs); while (s.tick()) T.step(); const r = T.get(); console.log(`E1a-like single support (U:R + pelvis drop 2.5 cm, adopted configuration) ${h}: ${s.g3summary().outcome}; hip smallest margin to hard (°, tw / sy / sz): ${fmt(r.min)}`); s.destroy(); }
{ const spec = generateSpec(VARIATION_SET.find(x => x.id === "V1-matched")), s = new G1Sim(J, spec, "upright", { passiveOpts: { kneeModel: "v2k" } });
  const T = track(s, spec, () => s.up.ev.qs); while (s.tick()) T.step(); const r = T.get(); console.log(`G1 V1-matched upright passive collapse (v2k, k env): hip margin at rest (°, tw / sy / sz): ${fmt(r.end)}; smallest during the run: ${fmt(r.min)}`); s.destroy(); }
