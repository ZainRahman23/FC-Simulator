// ═══ physchar2/tools/liftoff_probe.mjs — pre-G4 runway (G3 → G4 interface audit): what the VALIDATED stance controller does when the unloaded
// foot actually leaves the turf. NOT a swing controller: the lift is an EXTERNAL diagnostic force (a ledgered push) on the unloaded foot.
// Scenario: G3 U:R (λ_R → 1.0 over 1–5 s; the left foot unloaded and held from ~5 s); from t = 7.0 s a constant upward force F on foot_L for
// 1.0 s, then released (the foot falls back / is re-acquired). Per tick, around the boundary: left-foot height and sensed load / touching pieces,
// the controller's unloaded flag, support membership, load share, the heading (pelvis yaw target), the midpoint of the ankles (balance
// reference), the pelvis height target, the left leg's IK residual, the largest per-tick change of any commanded joint torque (discontinuity),
// stance-foot slip; summary of every discontinuity. --F=<N> (default 60), --body=<foot_L | shank_L> (where the lift force acts; the foot's sensed
// load is the residual foot wrench, so a force ON THE FOOT reads as load — use shank_L to keep the sensor pure), --human, --stand=<json>, k via env.
// usage: V2_ANKLE_NEUTRAL_K=<k> node tools/liftoff_probe.mjs [--F=60] [--human=V2-REF] [--out=<json>]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js"; import { G3Sim, g3Def } from "../gates/v2_g3.js";
import { ankleNeutralKPerDeg } from "../spec/v2_joints.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const BODY = arg("body", "foot_L"), PROFILE = arg("profile", "step"), F = +arg("F", 60), HUMAN = arg("human", "V2-REF"), OUT = arg("out", ""), STAND = JSON.parse(arg("stand", "{}")), D = 180 / Math.PI;
const spec = generateSpec(VARIATION_SET.find(h => h.id === HUMAN)), def = { ...g3Def("U:R"), push: { t0: 7.0, dur: 1.0, J: [0, F * 1.0, 0], body: BODY } };   // --body=shank_L keeps the foot's sensed wrench (a residual incl. any external force on the FOOT) pure contact
const s = new G3Sim(J, spec, def, Object.keys(STAND).length ? { stand: STAND } : {}), fL = spec.bodies.findIndex(b => b.name === "foot_L"), fR = spec.bodies.findIndex(b => b.name === "foot_R");
// --profile=ramp: the lift force ramps 0 → F over 7.0–7.2 s, holds to 7.5 s, then ramps down to 0 over 7.5–8.5 s (a SLOW lowering → low-speed
// touchdown, the E1 regime); default "step" = constant F over 7–8 s (abrupt release). Applied through the sim's disturbance hook (ledgered).
if (PROFILE === "ramp") { const bi = spec.bodies.findIndex(b => b.name === BODY); s._disturb = function () { const t = this.n * this.dt, out = { F: [0, 0, 0], T: [0, 0, 0], at: null, body: -1 };
    const f = t < 7.0 ? 0 : t < 7.2 ? (t - 7.0) / 0.2 : t < 7.5 ? 1 : t < 8.5 ? 1 - (t - 7.5) / 1.0 : 0; if (f > 0) { const Fv = [0, F * f, 0], at = this.st[bi].com; this.w.addForceAt(bi, Fv, at); out.F = Fv; out.at = at; out.body = bi; } return out; }; }
const rows = []; let prevCmd = null, yL0 = null, fR0 = null;
{ const oc = s.ctrl.compute.bind(s.ctrl); s.ctrl.compute = (...a) => { const c = oc(...a); s._cmd = c; return c; }; }
while (s.tick()) { const t = s.n * s.dt; if (t < 6.5 || t > 9.5) { prevCmd = s._cmd; if (t >= 6.4 && yL0 == null) { yL0 = s.st[fL].pos[1]; fR0 = s.st[fR].pos.slice(); } continue; }
  const I = s.ctrl.info, c = s._cmd; let dmax = 0, dWho = null; if (prevCmd && c) c.forEach((ax, k) => ax.forEach((r, i) => { const p = prevCmd[k] && prevCmd[k][i]; if (r && p) { const d = Math.abs(r.tau0 - p.tau0); if (d > dmax) { dmax = d; dWho = s.P.jd[k].name + "." + "xyz"[i]; } } }));
  prevCmd = c; const sense = s.ctrl.sense;
  rows.push({ t: +t.toFixed(4), liftMm: (s.st[fL].pos[1] - yL0) * 1000, FzL: sense.Fz[0], touchL: sense.touch[0], unlL: I.unl[0], inSupL: I.inSup[0], shareL: I.share[0], headingDeg: Math.atan2(I.heading[0], I.heading[1]) * D,
    midX: I.mid[0], midZ: I.mid[1], pelHT: I.pelH, xiRef: I.xiRef.slice(), ikErrL: I.ikRes ? I.ikRes[0] : null, dCmdMax: dmax, dCmdWho: dWho, slipR: Math.hypot(s.st[fR].pos[0] - fR0[0], s.st[fR].pos[2] - fR0[2]) * 1000, abort: s.ctrl.g3 ? s.ctrl.g3.aborted : null }); }
const g = s.g3summary(); s.destroy();
const ch = (f) => { const o = []; for (let i = 1; i < rows.length; i++) if (f(rows[i]) !== f(rows[i - 1])) o.push(`${rows[i].t}: ${f(rows[i - 1])} → ${f(rows[i])}`); return o; };
const rng = (f) => { const v = rows.map(f).filter(x => x != null && isFinite(x)); return v.length ? [Math.min(...v), Math.max(...v)] : null; };
const big = rows.filter(r => r.dCmdMax > 5).map(r => `${r.t} ${r.dCmdWho} Δ${r.dCmdMax.toFixed(1)} N·m (lift ${r.liftMm.toFixed(1)} mm, touch ${r.touchL})`);
const res = { k: ankleNeutralKPerDeg(), human: HUMAN, F, body: BODY, profile: PROFILE, outcome: g.outcome, abortT: g.g3 ? g.g3.abortT : null, liftMaxMm: Math.max(...rows.map(r => r.liftMm)), transitions: { touchL: ch(r => r.touchL > 0), unlL: ch(r => r.unlL), inSupL: ch(r => r.inSupL) },
  ranges: { headingDeg: rng(r => r.headingDeg), midX: rng(r => r.midX), midZ: rng(r => r.midZ), pelHT: rng(r => r.pelHT), shareL: rng(r => r.shareL), ikErrL: rng(r => r.ikErrL), slipRmm: rng(r => r.slipR), FzL: rng(r => r.FzL) },
  torqueJumpsOver5Nm: big.slice(0, 20), nTorqueJumps: big.length, maxTorqueJump: Math.max(...rows.map(r => r.dCmdMax)), rows };
console.log(`k ${res.k} ${HUMAN} F ${F} N (${PROFILE}) on ${BODY}: ${res.outcome}${res.abortT ? " (abort " + res.abortT.toFixed(3) + ")" : ""}; lift max ${res.liftMaxMm.toFixed(1)} mm; touching L ${JSON.stringify(res.transitions.touchL.slice(0, 6))}; unloaded flag ${JSON.stringify(res.transitions.unlL)}; support L ${JSON.stringify(res.transitions.inSupL.slice(0, 6))}`);
const r2 = (a, n = 3) => (a ? a.map(v => v.toFixed(n)).join(" … ") : "—");
console.log(`   ranges 6.5–9.5 s: heading ${r2(res.ranges.headingDeg, 2)}°, ankle midpoint x ${r2(res.ranges.midX, 4)} z ${r2(res.ranges.midZ, 4)} m, pelvis height target ${r2(res.ranges.pelHT, 4)} m, share L ${r2(res.ranges.shareL)}, IK err L ${r2(res.ranges.ikErrL, 6)}, stance slip ${r2(res.ranges.slipRmm, 2)} mm, sensed Fz L ${r2(res.ranges.FzL, 1)} N`);
console.log(`   per-tick commanded-torque jumps > 5 N·m: ${res.nTorqueJumps} (max ${res.maxTorqueJump.toFixed(1)}): ${res.torqueJumpsOver5Nm.slice(0, 6).join("; ")}`);
if (OUT) fs.writeFileSync(OUT, JSON.stringify(res));
