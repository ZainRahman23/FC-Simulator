// ═══ physchar2/tools/twist_policy_battery.mjs — final pre-E1a stage §1: the PREREGISTERED posture/twist-policy comparison
// (review_artifacts/physical_character_v2/final_pre_e1a/TWIST_POLICY_PREREG.md — the scenarios, metrics and thresholds are fixed there before any run).
// One run = one (policy, body, scenario) at the env ankle stiffness k (V2_ANKLE_NEUTRAL_K). Controller: G3_STAND + the policy's diagnostic options
// (+ the experimental lifecycle for the LIFT scenario only). Nothing here changes a default.
// Policies: current {} | ref {ikRefTwist} | b50 {ikTwistBlend 0.5} | b35 {ikTwistBlend 0.35} | d1 {blend 1, tau 1 s} | d2 {blend 1, tau 2 s}.
// Scenarios (G3 scenario catalogue + disturbances; t in s):
//   Q     T0 bilateral 20 s, untouched                          PY4  T0 + thorax yaw impulse 4 N·m·s at 2 s (20 s)
//   PR8   T0 + thorax roll impulse 8 N·m·s at 2 s (20 s)        SB   T0 + sustained pelvis yaw torque 2 N·m over 2–8 s, released (16 s)
//   TURN  T0 + commanded pelvis yaw 0 → 20° (min-jerk 2–4 s), held to 12 s
//   T1 / T5 / UR   the G3 scenarios (strong transfer, near-single support, full unloading)
//   LIFT  UR + lifecycle + external 30 N shank lift ramp 7.0–8.5 s (tools/boundary_probe.mjs profile)
//   HO1   UR + pelvis yaw impulse 1 N·m·s at 8 s (single-support hold)      HO2  T5 + thorax push L 15 N·s at 8 s      HO3  T0 + thorax push B 15 N·s at 2 s
// Metrics: outcome; twist angles (ankle ab/adduction, knee axial, hip rotation, L/R; pelvis yaw) relative to their value at the disturbance onset
// (or t = 1 s): peaks, values at the scenario's marks; per-1 s window half peak-to-peak amplitude of the left ankle ab/adduction and pelvis yaw;
// decay class (mean amplitude 15–20 s / 3–8 s: DECAYING < 0.5, SUSTAINED 0.5–1.5, GROWING > 1.5; QUIET if every window < 1°); hip-rotation
// actuator work (net / positive, both hips) over 12–20 s and over the run; settle time (ankle amplitude < 1° thereafter); foot slip; LIFT: the
// stance (R) ankle ab/adduction peak excursion while the left foot is off the turf, swing-foot yaw error at touchdown.
// usage: V2_ANKLE_NEUTRAL_K=<k> node tools/twist_policy_battery.mjs --policy=b50 --human=V2-REF --scen=PY4 [--hz=240] [out.json]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js"; import { G3Sim, g3Def } from "../gates/v2_g3.js";
import { ankleNeutralKPerDeg } from "../spec/v2_joints.js"; import { V, Q } from "../core/v2_math.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const POL = { current: {}, ref: { ikRefTwist: true }, b50: { ikTwistBlend: 0.5 }, b35: { ikTwistBlend: 0.35 }, d1: { ikTwistBlend: 1, ikTwistTau: 1 }, d2: { ikTwistBlend: 1, ikTwistTau: 2 } };
const PNAME = arg("policy", "current"), HUMAN = arg("human", "V2-REF"), SC = arg("scen", "Q"), HZ = +arg("hz", 240), OUT = process.argv.slice(2).find(a => a.endsWith(".json")), D = 180 / Math.PI;
const mj = (u) => { const x = Math.min(1, Math.max(0, u)); return x * x * x * (10 - 15 * x + 6 * x * x); };
function scenario(sc) {
  const T0 = (sec, more = {}) => ({ ...g3Def("T0"), seconds: sec, ...more });
  switch (sc) {
    case "Q": return { def: T0(20), onset: 1 };
    case "PY4": return { def: T0(20, { torque: { t0: 2, dur: 0.1, H: [0, 4, 0], body: "thorax" } }), onset: 2 };
    case "PR8": return { def: T0(20, { torque: { t0: 2, dur: 0.1, H: [0, 0, 8], body: "thorax" } }), onset: 2 };
    case "SB": return { def: T0(16, { torque: { t0: 2, dur: 6, H: [0, 12, 0], body: "pelvis" } }), onset: 2, marks: [8, 14] };
    case "TURN": return { def: T0(12), onset: 2, marks: [6, 12], stand: { yawCmd: (t) => 20 / D * mj((t - 2) / 2) } };
    case "T1": return { def: g3Def("T1"), onset: 1 };
    case "T5": return { def: g3Def("T5"), onset: 1 };
    case "UR": return { def: g3Def("U:R"), onset: 1 };
    case "LIFT": return { def: { ...g3Def("U:R"), supervise: {} }, onset: 6.5, lift: 30, stand: { lifecycle: true } };
    case "HO1": return { def: { ...g3Def("U:R"), supervise: {}, torque: { t0: 8, dur: 0.1, H: [0, 1, 0], body: "pelvis" } }, onset: 8 };
    case "HO2": return { def: { ...g3Def("T5"), supervise: {}, push: { t0: 8, dur: 0.1, J: [-15, 0, 0], body: "thorax" } }, onset: 8 };
    case "HO3": return { def: T0(20, { push: { t0: 2, dur: 0.1, J: [0, 0, -15], body: "thorax" } }), onset: 2 };
  }
  throw new Error("unknown scenario " + sc);
}
const S = scenario(SC), spec = generateSpec(VARIATION_SET.find(h => h.id === HUMAN));
const XSTAND = JSON.parse(process.env.V2_XSTAND || "{}");   // extra controller options for every run (unload-fix regression V3.7: ffLockedAxis / shareCap); unset = unchanged
const s = new G3Sim(J, spec, S.def, { stand: { ...POL[PNAME], ...(S.stand || {}), ...XSTAND }, cfg: HZ !== 240 ? { hz: HZ } : undefined });
if (S.lift) { const bi = spec.bodies.findIndex(b => b.name === "shank_L"), base = s._disturb.bind(s);
  s._disturb = function () { const out = base(), t = this.n * this.dt, f = t < 7.0 ? 0 : t < 7.2 ? (t - 7.0) / 0.2 : t < 7.5 ? 1 : t < 8.5 ? 1 - (t - 7.5) / 1.0 : 0;
    if (f > 0) { const Fv = [0, S.lift * f, 0], at = this.st[bi].com; this.w.addForceAt(bi, Fv, at); out.F = Fv; out.at = at; out.body = bi; } return out; }; }
const K = [["ankle_L", "fabd"], ["ankle_R", "fabd"], ["knee_L", "rot"], ["knee_R", "rot"], ["hip_L", "rot"], ["hip_R", "rot"]].map(([n, key]) => ({ k: spec.joints.findIndex(j => j.name === n), key, n }));
const hipRot = ["hip_L", "hip_R"].map(n => { const k = spec.joints.findIndex(j => j.name === n); return { k, i: ["x", "y", "z"].findIndex(a => spec.joints[k].def.axes[a] && spec.joints[k].def.axes[a].key === "rot") }; });
const pel = spec.bodies.findIndex(b => b.name === "pelvis"), yawOf = (q) => { const f = Q.rot(q, [0, 0, 1]); return Math.atan2(f[0], f[2]) * D; }, fL = spec.bodies.findIndex(b => b.name === "foot_L");
let base = null, yaw0 = null; const ser = []; let Wnet = 0, Wpos = 0, Wnet12 = 0, Wpos12 = 0, offPeakR = 0, tdYaw = null, prevLc = null, anchorYaw = null;
while (s.tick()) { const t = s.n * s.dt, ev = s.up.ev, tw = K.map(x => s.P.anat(s.P.jd[x.k], ev.qs[x.k], x.key)), py = yawOf(s.st[pel].rot);
  if (yaw0 == null) yaw0 = py; if (base == null && t >= S.onset - 1e-9) base = tw.slice();
  for (const r of s.actRes || []) if (hipRot.some(h => h.k === r.k && h.i === r.i)) { Wnet += r.W; Wpos += Math.max(0, r.W); if (t >= 12 && t <= 20) { Wnet12 += r.W; Wpos12 += Math.max(0, r.W); } }
  if (base) ser.push({ t, tw: tw.map((v, i) => v - base[i]), yaw: py - yaw0 });
  const lc = s.ctrl.info && s.ctrl.info.lc; if (lc && base) { const off = lc[0].state === "AIRBORNE" || lc[0].state === "LIFTOFF" || lc[0].state === "TOUCHDOWN"; if (off) offPeakR = Math.max(offPeakR, Math.abs(tw[1] - base[1]));
    if (prevLc === "AIRBORNE" && lc[0].state === "TOUCHDOWN" && tdYaw == null) { const a = s.ctrl.lc.feet[0].prevHold || s.ctrl.lc.feet[0].hold; if (a) tdYaw = Math.abs(yawOf(s.st[fL].rot) - yawOf(a.rot)); } prevLc = lc[0].state; } }
const g = s.g3summary(); s.destroy();
const at = (tt) => { const r = ser.reduce((a, b) => (Math.abs(b.t - tt) < Math.abs(a.t - tt) ? b : a)); return { tw: r.tw, yaw: r.yaw }; };
const win = (fn) => { const o = []; for (let w = Math.ceil(S.onset); w < (ser.length ? ser[ser.length - 1].t : 0); w++) { const v = ser.filter(r => r.t >= w && r.t < w + 1).map(fn); if (v.length) o.push({ w, A: (Math.max(...v) - Math.min(...v)) / 2 }); } return o; };
const wA = win(r => r.tw[0]), wY = win(r => r.yaw), mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const early = mean(wA.filter(x => x.w >= 3 && x.w < 8).map(x => x.A)), late = mean(wA.filter(x => x.w >= 15 && x.w < 20).map(x => x.A)), quiet = wA.every(x => x.A < 1);
const cls = quiet ? "QUIET" : late / Math.max(early, 1e-9) < 0.5 ? "DECAYING" : late / Math.max(early, 1e-9) <= 1.5 ? "SUSTAINED" : "GROWING";
const settle = (() => { let tS = null; for (let i = wA.length - 1; i >= 0; i--) { if (wA[i].A >= 1) break; tS = wA[i].w; } return tS == null ? null : tS - S.onset; })();
const peak = K.map((_, i) => Math.max(...ser.map(r => Math.abs(r.tw[i])))), endV = ser.length ? ser[ser.length - 1] : null;
const res = { policy: PNAME, human: HUMAN, scen: SC, k: ankleNeutralKPerDeg(), hz: HZ, outcome: g.outcome, abortT: g.g3 ? g.g3.abortT : null, peakDeg: Object.fromEntries(K.map((x, i) => [x.n + "." + x.key, peak[i]])), pelvisYawPeakDeg: Math.max(...ser.map(r => Math.abs(r.yaw))),
  endDeg: endV ? { tw: endV.tw, yaw: endV.yaw } : null, marks: (S.marks || []).map(m => ({ t: m, ...at(m) })), ankleWindows: wA, yawWindows: wY, decay: { early, late, ratio: late / Math.max(early, 1e-9), cls }, settleS: settle,
  hipRotWork: { netJ: Wnet, posJ: Wpos, net12_20J: Wnet12, pos12_20J: Wpos12 }, slipMm: g.g3 ? g.g3.feet.map(f => f.slipMm) : null, lift: S.lift ? { stanceAnkleOffPeakDeg: offPeakR, touchdownYawErrDeg: tdYaw } : null };
console.log(`${PNAME} ${HUMAN} ${SC} k ${res.k}: ${res.outcome}; ankle-L amp class ${cls} (${early.toFixed(2)} → ${late.toFixed(2)}°), settle ${settle}; peaks ankle ${peak[0].toFixed(1)}/${peak[1].toFixed(1)} knee ${peak[2].toFixed(1)}/${peak[3].toFixed(1)} hip ${peak[4].toFixed(1)}/${peak[5].toFixed(1)}°, pelvis yaw ${res.pelvisYawPeakDeg.toFixed(1)}°; hip-rot W net ${Wnet12.toFixed(2)} J (12–20 s); slip ${res.slipMm ? res.slipMm.map(x => x.toFixed(2)).join("/") : "-"} mm` + (res.marks.length ? `; marks ${res.marks.map(m => `${m.t}s: yaw ${m.yaw.toFixed(2)} ankleL ${m.tw[0].toFixed(2)}`).join(", ")}` : "") + (res.lift ? `; stance ankle off-turf peak ${offPeakR.toFixed(2)}°, td yaw ${tdYaw == null ? "-" : tdYaw.toFixed(2)}°` : ""));
if (OUT) fs.writeFileSync(OUT, JSON.stringify(res));
