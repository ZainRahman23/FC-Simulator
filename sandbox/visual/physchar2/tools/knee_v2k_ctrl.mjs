// ═══ physchar2/tools/knee_v2k_ctrl.mjs — corrected knee (v2k) qualification KV6c (+ KV5 reporting): the E1a PLANNED PELVIS DROP on the full
// character (review_artifacts/physical_character_v2/knee_correction/KNEE_CORRECTION_PREREG.md). G2 quiet stance (S0short, 10 s) with the validated
// stand controller; posture pelvis-height target 0 → −2.5 cm (min-jerk 1–3 s), hold to 5 s, back to 0 (min-jerk 5–7 s; the harness sets the planned
// drop's amplitude — the controller's own pelvisDrop mechanism, no controller change), quiet to 10 s. Bilateral (no lift). Per knee: flexion range,
// axial deviation from θ0(flexion), calibrated-bound margin; knee-axial actuator work and passive work (motor impulse + explicit remainder ·
// relative ω about the twist axis) separately; stance-foot slip; outcome.
// usage: V2_ANKLE_NEUTRAL_K=<k> node tools/knee_v2k_ctrl.mjs [--human=V2-REF] [--policy=current|reference] [--model=v2k|old] [--out=<json>]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js"; import { G2Sim } from "../gates/v2_g2.js";
import { ankleNeutralKPerDeg } from "../spec/v2_joints.js"; import { V, Q } from "../core/v2_math.js"; import { kneeEnvelopeV2K, kneeTheta0 } from "../spec/v2_knee.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const HUMAN = arg("human", "V2-REF"), POLICY = arg("policy", "reference"), MODEL = arg("model", "v2k"), OUT = arg("out", ""), D = 180 / Math.PI, AX = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const mj = (u) => { u = Math.min(1, Math.max(0, u)); return u * u * u * (10 - 15 * u + 6 * u * u); };
const spec = generateSpec(VARIATION_SET.find(h => h.id === HUMAN)), pd = { t0: 1, dur: 2, dz: 0.025 };
const s = new G2Sim(J, spec, "S0short", { stand: { ...(POLICY === "reference" ? { ikRefTwist: true } : {}), pelvisDrop: pd }, passiveOpts: { kneeModel: MODEL === "v2k" ? "v2k" : null } });
if ((MODEL === "v2k") !== s.P.kneeIsV2K) throw new Error("model selection");
{ const oc = s.ctrl.compute.bind(s.ctrl); s.ctrl.compute = (...a) => { const t = s.ctrl.n * s.dt; pd.dz = t < 5 ? 0.025 : 0.025 * (1 - mj((t - 5) / 2)); return oc(...a); }; }   // the return (5–7 s)
const KN = ["L", "R"].map(sd => spec.joints.findIndex(j => j.name === "knee_" + sd)), FT = ["L", "R"].map(sd => spec.bodies.findIndex(b => b.name === "foot_" + sd));
const ft0 = FT.map(i => s.st[i].pos.slice()), acc = KN.map(() => ({ flexMin: Infinity, flexMax: -Infinity, devMax: 0, devMaxAfter1s: 0, devAt: null, boundMargin: Infinity, Wpas: 0, Wact: 0 })); let slip = 0, rows = [];
while (true) { const up0 = s.up, st0 = s.st; if (!s.tick()) break; const t = s.n * s.dt, ev = s.up.ev;
  KN.forEach((k, n) => { const d = s.P.jd[k], q = ev.qs[k], fl = s.P.anat(d, q, "flex"), rot = s.P.anat(d, q, "rot"), a = acc[n]; a.flexMin = Math.min(a.flexMin, fl); a.flexMax = Math.max(a.flexMax, fl);
    if (MODEL === "v2k") { const e = kneeEnvelopeV2K(fl), dev = Math.abs(rot - e.theta0); if (dev > a.devMax) { a.devMax = dev; a.devAt = { t, fl, rot, th0: e.theta0 }; } if (t >= 1) a.devMaxAfter1s = Math.max(a.devMaxAfter1s, dev); a.boundMargin = Math.min(a.boundMargin, rot - e.hard[0], e.hard[1] - rot); }
    // knee axial (twist row 0): passive = motor impulse / dt + explicit remainder; actuator = the actuation layer's own ledger
    const j = spec.joints[k], ax = Q.rot(Q.mul(st0[j.childIndex].rot, j.F2), AX[0]), wm = (b) => V.sc(V.add(st0[b].w, s.st[b].w), 0.5), wr = V.dot(V.sub(wm(j.childIndex), wm(j.parentIndex)), ax);
    a.Wpas += (s.w.lambdaMotor(k)[0] / s.dt + up0.joints[k].Texp[0]) * wr * s.dt; });
  slip = Math.max(slip, ...FT.map((i, n) => Math.hypot(s.st[i].pos[0] - ft0[n][0], s.st[i].pos[2] - ft0[n][2]) * 1000));
  if (s.n % 24 === 0) rows.push({ t, knees: KN.map(k => ({ flex: s.P.anat(s.P.jd[k], ev.qs[k], "flex"), rot: s.P.anat(s.P.jd[k], ev.qs[k], "rot") })) }); }
KN.forEach((k, n) => { const L = s.act.led[k] && s.act.led[k][0]; acc[n].Wact = L ? L.W : 0; });
const g = s.g2summary(), fell = !!g.fell || g.outcome === "fell", out = { human: HUMAN, policy: POLICY, model: MODEL, k: ankleNeutralKPerDeg(), outcome: g.outcome, fell, slipMm: slip, knees: acc.map((a, n) => ({ side: ["L", "R"][n], ...a })), rows };
const okRef = MODEL !== "v2k" || POLICY !== "reference" || acc.every(a => a.devMax <= 2.0), okRefAfter = MODEL !== "v2k" || POLICY !== "reference" || acc.every(a => a.devMaxAfter1s <= 2.0), okCur = MODEL !== "v2k" || POLICY !== "current" || acc.every(a => a.boundMargin >= 0);
out.pass = !fell && slip <= 0.5 && okRef && okCur; out.passFrom1s = !fell && slip <= 0.5 && okRefAfter && okCur;
console.log(`KV6c ${HUMAN} ${POLICY} ${MODEL} k ${ankleNeutralKPerDeg()}: outcome ${g.outcome}, slip ${slip.toFixed(3)} mm; ` + acc.map((a, n) => `knee ${["L", "R"][n]} flex ${a.flexMin.toFixed(1)}–${a.flexMax.toFixed(1)}°, |θ−θ0| max ${a.devMax.toFixed(2)}° (from 1 s ${a.devMaxAfter1s.toFixed(2)}°), bound margin ${a.boundMargin.toFixed(1)}°, W_act ${a.Wact.toFixed(3)} J, W_pas ${a.Wpas.toFixed(3)} J`).join("; ") + ` → ${out.pass ? "PASS" : "FAIL"}${out.pass !== out.passFrom1s ? ` (from 1 s: ${out.passFrom1s ? "PASS" : "FAIL"})` : ""}`);
if (OUT) fs.writeFileSync(OUT, JSON.stringify(out)); s.destroy();
