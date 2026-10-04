// ═══ physchar2/tools/splay_probe.mjs — close-decisions stage §2: the V1-matched upright passive collapse, old vs corrected knee (DIAGNOSTIC)
// Mode "trace": time series (every 0.05 s) of both knees (flexion, axial, θ0, deviation, axial torque), both hips (flexion, abduction, rotation and their
// passive torques), pelvis orientation, foot positions; the first time the old and v2k runs diverge; time with a knee beyond 120° / 140°; rest state.
// Mode "map": the 15-member lift ensemble of the G1 scenario for one deep-flexion parameter pair (characterisation of the dependency, NOT selection):
// per member the settled excursion / joint, max knee flexion, rest hip abduction / rotation, rest knee flexion.
// usage: V2_ANKLE_NEUTRAL_K=<k> node tools/splay_probe.mjs --mode=trace|map [--human=V1-matched] [--key=upright] [--delta=0 --width=1] [--out=<json>]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js"; import * as G1 from "../gates/v2_g1.js";
import { kneeEnvelopeV2K, kneeV2KParams } from "../spec/v2_knee.js"; import { Q } from "../core/v2_math.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const MODE = arg("mode", "trace"), HUMAN = arg("human", "V1-matched"), KEY = arg("key", "upright"), DELTA = +arg("delta", 0), WIDTH = +arg("width", 1), OUT = arg("out", ""), D = 180 / Math.PI;
const spec = generateSpec(VARIATION_SET.find(h => h.id === HUMAN)), ji = (n) => spec.joints.findIndex(j => j.name === n), bi = (n) => spec.bodies.findIndex(b => b.name === n);
const JN = ["knee_L", "knee_R", "hip_L", "hip_R"].map(ji), over = { deep: { delta150: DELTA, width150: WIDTH } }, P0 = kneeV2KParams(over);
function run(model, key) { G1.ensureScenario(key); const s = new G1.G1Sim(J, spec, key, { passiveOpts: model === "v2k" ? { kneeModel: "v2k", kneeV2K: over } : { kneeModel: null } }); const tr = []; let flexMax = 0, t120 = 0, t140 = 0;
  while (s.tick()) { const ev = s.up.ev, t = s.n * s.dt; const kn = [0, 1].map(n => { const d = s.P.jd[JN[n]], fl = s.P.anat(d, ev.qs[JN[n]], "flex"), rot = s.P.anat(d, ev.qs[JN[n]], "rot"), i = d.axes.findIndex(a => a && a.key === "rot"), T = ev.per[JN[n]].T[i]; return { fl, rot, th0: kneeEnvelopeV2K(fl, P0).theta0, tau: T ? T.tau * d.axes[i].s : 0 }; });
    const fm = Math.max(kn[0].fl, kn[1].fl); flexMax = Math.max(flexMax, fm); if (fm > 120) t120 += s.dt; if (fm > 140) t140 += s.dt;
    if (s.n % 12 === 0) { const hp = [2, 3].map(n => { const d = s.P.jd[JN[n]]; return Object.fromEntries(["flex", "abd", "rot"].map(k => [k, +s.P.anat(d, ev.qs[JN[n]], k).toFixed(1)])); }), pr = s.st[bi("pelvis")].rot, up = Q.rot(pr, [0, 1, 0]), fw = Q.rot(pr, [0, 0, 1]);
      tr.push({ t: +t.toFixed(3), knee: kn.map(k => ({ fl: +k.fl.toFixed(1), rot: +k.rot.toFixed(1), dev: +(k.rot - k.th0).toFixed(1), tau: +k.tau.toFixed(2) })), hip: hp, pelvisUpY: +up[1].toFixed(3), pelvisYaw: +(Math.atan2(fw[0], fw[2]) * D).toFixed(1) }); } }
  const r = s.summary(); s.destroy(); return { model, key, flexMax: +flexMax.toFixed(1), tKneeOver120: +t120.toFixed(2), tKneeOver140: +t140.toFixed(2), exc: +r.joints.hardExcRestDeg.toFixed(2), who: r.joints.hardExcRestWho || null, rest: tr[tr.length - 1], trace: tr }; }
if (MODE === "trace") { const a = run("old", KEY), b = run("v2k", KEY); let div = null;
  for (let i = 0; i < Math.min(a.trace.length, b.trace.length); i++) { const x = a.trace[i], y = b.trace[i], dk = Math.max(...[0, 1].map(n => Math.abs(x.hip[n].rot - y.hip[n].rot)), ...[0, 1].map(n => Math.abs(x.hip[n].abd - y.hip[n].abd))); if (dk > 5) { div = { t: x.t, old: { hip: x.hip, knee: x.knee }, v2k: { hip: y.hip, knee: y.knee } }; break; } }
  for (const r of [a, b]) console.log(`${r.model} ${HUMAN} ${KEY}: knee flex max ${r.flexMax}°, time > 120° ${r.tKneeOver120} s, > 140° ${r.tKneeOver140} s; settled excursion ${r.exc}° (${r.who}); rest hips ${JSON.stringify(r.rest.hip)}, knees ${JSON.stringify(r.rest.knee)}`);
  console.log(`first hip divergence (> 5°): ${JSON.stringify(div)}`);
  const at = (r, t) => r.trace.find(p => p.t >= t); for (const t of [0.3, 0.5, 0.7, 0.9, 1.2, 1.6, 2.0, 3.0]) { const x = at(a, t), y = at(b, t); if (x && y) console.log(`  t ${t}: old knees ${x.knee.map(k => `${k.fl}/${k.rot}`).join(" ")} hips ${x.hip.map(h => `${h.flex}/${h.abd}/${h.rot}`).join(" ")} | v2k knees ${y.knee.map(k => `${k.fl}/${k.rot}(dev ${k.dev}, τ ${k.tau})`).join(" ")} hips ${y.hip.map(h => `${h.flex}/${h.abd}/${h.rot}`).join(" ")}`); }
  if (OUT) fs.writeFileSync(OUT, JSON.stringify({ human: HUMAN, key: KEY, deep: over.deep, old: a, v2k: b, divergence: div })); }
if (MODE === "map") { const E = [0, 1e-6, -1e-6, 2e-6, -2e-6, 5e-6, -5e-6, 1e-5, -1e-5, 2e-5, -2e-5, 5e-5, -5e-5, 1e-4, -1e-4], rows = [];
  for (const e of E) { const r = run("v2k", G1.ensembleKey(KEY, e)); rows.push({ eps: e, exc: r.exc, who: r.who, flexMax: r.flexMax, t120: r.tKneeOver120, restHip: r.rest.hip, restKnee: r.rest.knee.map(k => k.fl) }); }
  const nf = rows.filter(r => r.exc > 1.5).length, splay = rows.filter(r => r.restHip.every(h => h.flex > 80 && h.abd > 60)).length;
  console.log(`map ${HUMAN} ${KEY} δ150 ${DELTA} w150 ${WIDTH}: 1.3d fail ${nf}/15 (${[...new Set(rows.filter(r => r.exc > 1.5).map(r => r.who))].join(",")}); splayed rest ${splay}/15; knee flex max ${Math.min(...rows.map(r => r.flexMax))}–${Math.max(...rows.map(r => r.flexMax))}°`);
  if (OUT) fs.writeFileSync(OUT, JSON.stringify({ human: HUMAN, key: KEY, deep: over.deep, rows, nf, splay })); }
