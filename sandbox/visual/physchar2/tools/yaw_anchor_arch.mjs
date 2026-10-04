// ═══ physchar2/tools/yaw_anchor_arch.mjs — final pre-E1a stage §2: DIAGNOSTIC comparison of single-support yaw-anchor architectures (none is
// a production law; nothing here changes a default). The stance ankle's foot ab/adduction (fabd) is the only path for net vertical-axis torque
// from the turf to the body in single support (runway finding). Architectures:
//   none  the passive law at the env k (V2_ANKLE_NEUTRAL_K; k = 0: the accepted plant; 0.13: the unloaded in-vivo evidence centre)
//   A     load-dependent PASSIVE neutral stiffness: k(F) = k_u + (k_L − k_u)·min(1, F_foot / BW), k_u = env k, k_L = --kL (N·m/° at full body
//         weight; NOT evidence-backed — the literature has no loaded small-angle value; 0.4 = the loaded whole-limb ACTIVE lower bound of Lee
//         2014, 1.0 = the runway's scoping value). F = the foot's sensed load of the previous step. The energy a stiffness change injects at a
//         deflected angle (½·Δk·x²) is accumulated and reported (the law is not conservative)
//   B     finite-strength ACTIVE ankle yaw stabilisation (the human subtalar path that our orthogonal ankle omits): an internal torque pair foot / shank
//         about the shank axis, τ = clamp(−K_a·θ − D_a·ω_rel, ±C), applied only to a LOADED foot (> 20 % BW: an explicit pair on an airborne foot's
//         tiny yaw inertia is numerically unstable — a real implementation would be an implicit actuator row); its work is ledgered
// Scenarios: HO1 / HO05 (U:R single-support hold + pelvis yaw impulse 1 / 0.5 N·m·s at 8 s), T5Y (T5 97 % + 1 N·m·s at 8 s), LIFT (U:R +
// lifecycle + external 30 N shank lift 7.0–8.5 s). Reports: stance-ankle fabd peak excursion (from 7.9 s), pelvis-yaw peak, values 3 s later,
// outcome, energy closure (total and Σ positive increments), A's injected energy, B's active work and saturation.
// usage: V2_ANKLE_NEUTRAL_K=<k> node tools/yaw_anchor_arch.mjs --arch=none|A|B [--kL=1.0] [--cap=10 --Ka=2] --policy=ref --human=V2-REF --scen=HO1 [out.json]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js"; import { G3Sim, g3Def } from "../gates/v2_g3.js";
import { ankleNeutralKPerDeg, decompose } from "../spec/v2_joints.js"; import { V, Q } from "../core/v2_math.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const POL = { current: {}, ref: { ikRefTwist: true }, b50: { ikTwistBlend: 0.5 }, b35: { ikTwistBlend: 0.35 } };
const ARCH = arg("arch", "none"), KL = +arg("kL", 1.0), CAP = +arg("cap", 10), KA = +arg("Ka", 2), PN = arg("policy", "ref"), HUMAN = arg("human", "V2-REF"), SC = arg("scen", "HO1"), OUT = process.argv.slice(2).find(a => a.endsWith(".json")), D = 180 / Math.PI;
const defs = { HO1: { ...g3Def("U:R"), supervise: {}, torque: { t0: 8, dur: 0.1, H: [0, 1, 0], body: "pelvis" } }, HO05: { ...g3Def("U:R"), supervise: {}, torque: { t0: 8, dur: 0.1, H: [0, 0.5, 0], body: "pelvis" } },
  T5Y: { ...g3Def("T5"), supervise: {}, torque: { t0: 8, dur: 0.1, H: [0, 1, 0], body: "pelvis" } }, LIFT: { ...g3Def("U:R"), supervise: {} } };
const spec = generateSpec(VARIATION_SET.find(h => h.id === HUMAN)), s = new G3Sim(J, spec, defs[SC], { stand: { ...POL[PN], ...(SC === "LIFT" ? { lifecycle: true } : {}) } });
const W = s.ctrl.M * 9.81, ank = ["ankle_L", "ankle_R"].map(n => spec.joints.findIndex(j => j.name === n)), feet = ["foot_L", "foot_R"].map(n => spec.bodies.findIndex(b => b.name === n)), shanks = ["shank_L", "shank_R"].map(n => spec.bodies.findIndex(b => b.name === n));
const ax = ank.map(k => s.P.jd[k].axes.findIndex(a => a && a.key === "fabd")), kU = ankleNeutralKPerDeg() * 180 / Math.PI, kLr = KL * 180 / Math.PI;
let inj = 0, Wb = 0, satT = 0, lastF = [W / 2, W / 2];
if (ARCH === "A") for (let n = 0; n < 2; n++) { const a = s.P.jd[ank[n]].axes[ax[n]]; if (!a.zN) { a.c0 = (a.soft[0] + a.soft[1]) / 2; a.zN = (a.soft[1] - a.soft[0]) / 2; } }
const pre = s._pre.bind(s);
s._pre = function () { if (ARCH === "A") for (let n = 0; n < 2; n++) { const a = this.P.jd[ank[n]].axes[ax[n]], F = this.probeRows ? Math.max(0, this.probeRows[n].JyN) : lastF[n], kNew = kU + (kLr - kU) * Math.min(1, F / W);
      const th = (() => { const v = this.P.jd[ank[n]]; const q = this.up ? this.up.ev.qs[v.k] : null; return null; })(); a.kN = kNew; lastF[n] = F; }
  return pre(); };
// A: energy injected by stiffness changes at the current deflection (½·Δk·x², |x| ≤ zN) — evaluated per tick from the passive layer's own angle
let kPrev = [null, null];
const base = s._disturb.bind(s), bi = shanks[0];
s._disturb = function () { const out = base(), t = this.n * this.dt;
  if (SC === "LIFT") { const f = t < 7.0 ? 0 : t < 7.2 ? (t - 7.0) / 0.2 : t < 7.5 ? 1 : t < 8.5 ? 1 - (t - 7.5) / 1.0 : 0; if (f > 0) { const Fv = [0, 30 * f, 0]; this.w.addForceAt(bi, Fv, this.st[bi].com); out.F = V.add(out.F, Fv); if (out.body < 0) { out.body = bi; out.at = this.st[bi].com; } } }
  if (ARCH === "B") for (let n = 0; n < 2; n++) { const F = this.probeRows ? Math.max(0, this.probeRows[n].JyN) : 0; if (F < 0.2 * W) continue;
    const d = this.P.jd[ank[n]], th = decompose(this.up.ev.qs[ank[n]]).tw, axW = Q.rot(Q.mul(this.st[d.child].rot, d.F2), [1, 0, 0]), wrel = V.dot(V.sub(this.st[d.child].w, this.st[d.parent].w), axW);   // the joint frame's twist (fabd) axis and angle, as the controller / actuator layer use them
    const Ka = KA * D, Da = 2 * 0.7 * Math.sqrt(Ka * 1.5); let tau = -Ka * th - Da * wrel; if (Math.abs(tau) > CAP) { tau = Math.sign(tau) * CAP; satT += this.dt; }
    this.w.addTorqueExt(d.child, V.sc(axW, tau)); this.w.addTorqueExt(d.parent, V.sc(axW, -tau)); Wb += tau * wrel * this.dt; }
  return out; };
let base0 = null, pk = 0, ypk = 0, y0 = null, at3 = null, prevU = null; const pel = spec.bodies.findIndex(b => b.name === "pelvis"), yawOf = (q) => { const f = Q.rot(q, [0, 0, 1]); return Math.atan2(f[0], f[2]) * D; };
const tD = SC === "LIFT" ? 7.0 : 8.0;
while (s.tick()) { const t = s.n * s.dt, th = s.P.anat(s.P.jd[ank[1]], s.up.ev.qs[ank[1]], "fabd"), py = yawOf(s.st[pel].rot);
  if (ARCH === "A") for (let n = 0; n < 2; n++) { const a = s.P.jd[ank[n]].axes[ax[n]], x = s.P.anat(s.P.jd[ank[n]], s.up.ev.qs[ank[n]], "fabd") / D; if (kPrev[n] != null && Math.abs(x) <= a.zN) inj += 0.5 * (a.kN - kPrev[n]) * x * x; kPrev[n] = a.kN; }
  if (t >= tD - 0.1 && base0 == null) { base0 = th; y0 = py; }
  if (base0 != null) { pk = Math.max(pk, Math.abs(th - base0)); ypk = Math.max(ypk, Math.abs(py - y0)); if (at3 == null && t >= tD + 3) at3 = { ankle: th - base0, yaw: py - y0 }; } }
const g = s.g3summary(); s.destroy();
const res = { arch: ARCH, kU: ankleNeutralKPerDeg(), kL: ARCH === "A" ? KL : null, cap: ARCH === "B" ? CAP : null, Ka: ARCH === "B" ? KA : null, policy: PN, human: HUMAN, scen: SC, outcome: g.outcome, stanceAnklePeakDeg: pk, pelvisYawPeakDeg: ypk, at3s: at3,
  closureJ: g.ledger ? g.ledger.closure : null, injectedJ: ARCH === "A" ? inj : null, activeWorkJ: ARCH === "B" ? Wb : null, satS: ARCH === "B" ? satT : null, slipMm: g.g3 ? g.g3.feet.map(f => f.slipMm) : null };
console.log(`${ARCH}${ARCH === "A" ? " kL " + KL : ARCH === "B" ? ` cap ${CAP} Ka ${KA}` : ""} k_u ${res.kU} ${PN} ${HUMAN} ${SC}: ${res.outcome}; stance ankle peak ${pk.toFixed(2)}°, pelvis yaw peak ${ypk.toFixed(2)}°, +3 s ankle ${at3 ? at3.ankle.toFixed(2) : "-"}° yaw ${at3 ? at3.yaw.toFixed(2) : "-"}°; closure ${res.closureJ?.toFixed(3)} J` + (ARCH === "A" ? `, injected ${inj.toFixed(4)} J` : "") + (ARCH === "B" ? `, active work ${Wb.toFixed(3)} J, saturated ${satT.toFixed(3)} s` : ""));
if (OUT) fs.writeFileSync(OUT, JSON.stringify(res));
