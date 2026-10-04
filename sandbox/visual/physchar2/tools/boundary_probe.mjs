// ═══ physchar2/tools/boundary_probe.mjs — final pre-E1a stage: validation harness for the EXPERIMENTAL G3 → G4 boundary components
// (ctrl/v2_support.js lifecycle, StandController option `lifecycle`). NOT E1a: the controller never commands a lift. The foot leaves the turf only
// under an EXTERNAL, ledgered upward force on the unloaded leg's shank (as tools/liftoff_probe.mjs, the runway's harness), ramped up and down;
// the lifecycle's swing servo holds the airborne foot at its default target (the hold pose = the same foothold) and puts it back when the force
// ramps off. Scenario: G3 U:R (λ_R → 1.0 over 1–5 s, hold to 11 s, back to 0.5 over 11–15 s, quiet to 18 s). Lift: 0 → F over 7.0–7.2 s,
// hold to 7.5 s, F → 0 over 7.5–8.5 s. Optional --abort=<J>: a lateral push on the thorax toward the airborne side during the lift (8.0 s), to
// exercise the single-support abort. Per tick 6.5–16.5 s: lifecycle state / weight per foot, sensed load, touching pieces, foot lift and its
// error vs the lifecycle target, the APPLIED actuator torque change per tick (from the actuator impulses) and the requested-torque change,
// energy-ledger closure increment per tick (ΔE − W_act − W_ext + D: + = unexplained creation), support count, heading, balance midpoint,
// pelvis-height target, stance slip, ξ margin. Summary: transitions, chatter (state changes within 60 ms), largest torque steps, closure, hover.
// usage: node tools/boundary_probe.mjs [--human=V2-REF] [--F=30] [--hz=240] [--abort=0] [--stand=<json>] [--lift=1] [out.json]   (k via V2_ANKLE_NEUTRAL_K)
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js"; import { G3Sim, g3Def } from "../gates/v2_g3.js";
import { ankleNeutralKPerDeg } from "../spec/v2_joints.js"; import { polyDist } from "../ctrl/v2_stand.js"; import { V, Q } from "../core/v2_math.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const F = +arg("F", 30), HUMAN = arg("human", "V2-REF"), HZ = +arg("hz", 240), ABORT = +arg("abort", 0), LIFT = +arg("lift", 1), STAND = { lifecycle: true, ...JSON.parse(arg("stand", "{}")) }, OUT = process.argv.slice(2).find(a => a.endsWith(".json")), D = 180 / Math.PI;
const spec = generateSpec(VARIATION_SET.find(h => h.id === HUMAN)), def = { ...g3Def("U:R"), supervise: {} };
if (ABORT) def.push = { t0: 8.0, dur: 0.1, J: [-ABORT, 0, 0], body: "thorax" };   // toward the character's LEFT (the airborne side)
const s = new G3Sim(J, spec, def, { stand: STAND, cfg: HZ !== 240 ? { hz: HZ } : undefined }), fL = spec.bodies.findIndex(b => b.name === "foot_L"), fR = spec.bodies.findIndex(b => b.name === "foot_R"), bi = spec.bodies.findIndex(b => b.name === "shank_L");
if (s.dt !== 1 / HZ) console.log(`note: dt ${s.dt}`);
const base = s._disturb.bind(s);
s._disturb = function () { const out = base(), t = this.n * this.dt, f = !LIFT ? 0 : t < 7.0 ? 0 : t < 7.2 ? (t - 7.0) / 0.2 : t < 7.5 ? 1 : t < 8.5 ? 1 - (t - 7.5) / 1.0 : 0;
  if (f > 0) { const Fv = [0, F * f, 0], at = this.st[bi].com; this.w.addForceAt(bi, Fv, at); out.F = V.add(out.F, Fv); if (out.body < 0) { out.body = bi; out.at = at; } else out.extra = { body: bi, F: Fv }; } return out; };
// ledger the extra lift force when a push is active in the same tick (both act on different bodies): add its work explicitly
const rows = []; let prevTau = null, prevCmd = null, prevE = null, prevW = null, y0 = null, fR0 = null;
{ const oc = s.ctrl.compute.bind(s.ctrl); s.ctrl.compute = (...a) => { const c = oc(...a); s._cmd = c; return c; }; }
const ledger = () => { const L = s.ledger; return { E: s.last.E, W: L.Wact + L.Wext - L.damping }; };
while (s.tick()) { const t = s.n * s.dt, I = s.ctrl.info, lc = I.lc;
  if (t >= 6.4 && y0 == null) { y0 = s.st[fL].pos[1]; fR0 = s.st[fR].pos.slice(); }
  const tau = {}; for (const r of s.actRes || []) tau[r.k * 3 + r.i] = r.tau; const c = s._cmd;
  let dT = 0, dWho = null; if (prevTau) for (const key in tau) { const d = Math.abs(tau[key] - (prevTau[key] ?? tau[key])); if (d > dT) { dT = d; dWho = s.P.jd[Math.floor(key / 3)].name + "." + "xyz"[key % 3]; } }
  let dC = 0, c0Who = null; if (prevCmd && c) c.forEach((ax, k) => ax.forEach((r, i) => { const p = prevCmd[k] && prevCmd[k][i]; if (r && p && Math.abs(r.tau0 - p.tau0) > dC) { dC = Math.abs(r.tau0 - p.tau0); c0Who = s.P.jd[k].name + "." + "xyz"[i]; } }));
  const Lg = ledger(), dClos = prevE == null ? 0 : (Lg.E - prevE) - (Lg.W - prevW); prevE = Lg.E; prevW = Lg.W; prevTau = tau; prevCmd = c;
  if (t < 6.5 || t > 16.5) continue;
  const tg = s.ctrl.lc ? s.ctrl.lc.target(0) : null, fp = s.st[fL], errMm = tg ? V.len(V.sub(fp.pos, tg.pos)) * 1000 : null, yawErr = tg ? (() => { const a = Q.rot(fp.rot, [0, 0, 1]), b = Q.rot(tg.rot, [0, 0, 1]); return Math.atan2(a[0] * b[2] - a[2] * b[0], a[0] * b[0] + a[2] * b[2]) * D; })() : null;
  const sense = s.ctrl.sense, sp = I.polys[1];
  rows.push({ t: +t.toFixed(4), st: lc ? lc.map(x => x.state) : null, s: lc ? lc.map(x => +x.s.toFixed(4)) : null, FzL: sense.Fz[0], touchL: sense.touch[0], otherL: sense.other ? sense.other[0] : null, liftMm: (fp.pos[1] - y0) * 1000,
    errMm, yawErrDeg: yawErr, dxMm: tg ? (fp.pos[0] - tg.pos[0]) * 1000 : null, dyMm: tg ? (fp.pos[1] - tg.pos[1]) * 1000 : null, dzMm: tg ? (fp.pos[2] - tg.pos[2]) * 1000 : null, dTau0Who: c0Who, dTauApplied: dT, dTauWho: dWho, dTau0: dC, dClosureJ: dClos, nSup: I.inSup.filter(Boolean).length, headingDeg: Math.atan2(I.heading[0], I.heading[1]) * D,
    midX: I.mid[0], midZ: I.mid[1], pelHT: I.pelH, slipR: Math.hypot(s.st[fR].pos[0] - fR0[0], s.st[fR].pos[2] - fR0[2]) * 1000, xiMarginR: polyDist(sp, I.xi) * 100, shareL: I.share[0], abort: s.ctrl.g3 ? s.ctrl.g3.aborted : null }); }
const g = s.g3summary(), lcLog = s.ctrl.lc ? s.ctrl.lc.feet.map(f => f.log.map(e => `${e.t.toFixed(4)} ${e.from}→${e.to}`)) : null; s.destroy();
const trans = (n) => { const o = []; for (let i = 1; i < rows.length; i++) if (rows[i].st && rows[i].st[n] !== rows[i - 1].st[n]) o.push({ t: rows[i].t, from: rows[i - 1].st[n], to: rows[i].st[n] }); return o; };
const chatter = (tr) => { let c = 0; for (let i = 2; i < tr.length; i++) if (tr[i].to === tr[i - 2].to && tr[i].t - tr[i - 2].t < 0.06) c++; return c; };   // a state RE-ENTERED within 60 ms (oscillation)
const air = rows.filter(r => r.st && r.st[0] === "AIRBORNE"), airErr = air.map(r => r.errMm), big = rows.filter(r => r.dTauApplied > 5).map(r => `${r.t} ${r.dTauWho} Δ${r.dTauApplied.toFixed(1)}`);
const rng = (f) => { const v = rows.map(f).filter(x => x != null && isFinite(x)); return v.length ? [Math.min(...v), Math.max(...v)] : null; };
const trL = trans(0), trR = trans(1), td = rows.find((r, i) => i > 0 && rows[i - 1].st && rows[i - 1].st[0] === "AIRBORNE" && r.st[0] === "TOUCHDOWN");
const res = { k: ankleNeutralKPerDeg(), human: HUMAN, F, hz: HZ, abort: ABORT, stand: STAND, outcome: g.outcome, abortT: g.g3 ? g.g3.abortT : null, transitionsL: trL, transitionsR: trR, chatterL: chatter(trL), lcLog,
  liftMaxMm: Math.max(...rows.map(r => r.liftMm)), airborneS: air.length * s.dt, hoverErrMm: airErr.length ? { max: Math.max(...airErr), mean: airErr.reduce((a, b) => a + b, 0) / airErr.length } : null,
  touchdown: td ? { t: td.t, errMm: td.errMm, yawErrDeg: td.yawErrDeg } : null, maxAppliedTorqueStep: Math.max(...rows.map(r => r.dTauApplied)), appliedStepsOver5: big.length, firstSteps: big.slice(0, 12), maxTau0Step: Math.max(...rows.map(r => r.dTau0)),
  closure: { maxPerTickJ: Math.max(...rows.map(r => r.dClosureJ)), sumPositiveJ: rows.reduce((a, r) => a + Math.max(0, r.dClosureJ), 0), total: g.ledger ? g.ledger.closure : null },
  ranges: { headingDeg: rng(r => r.headingDeg), midX: rng(r => r.midX), midZ: rng(r => r.midZ), pelHT: rng(r => r.pelHT), slipRmm: rng(r => r.slipR), xiMarginRcm: rng(r => r.xiMarginR), nSup: rng(r => r.nSup), shareL: rng(r => r.shareL) }, rows };
console.log(`${HUMAN} k ${res.k} F ${F} ${HZ} Hz abort ${ABORT}: ${res.outcome}${res.abortT ? " (abort " + res.abortT.toFixed(3) + ")" : ""}; lift max ${res.liftMaxMm.toFixed(1)} mm, airborne ${res.airborneS.toFixed(3)} s, hover err ${res.hoverErrMm ? res.hoverErrMm.max.toFixed(1) + " max / " + res.hoverErrMm.mean.toFixed(1) + " mean mm" : "—"}`);
console.log(`   L transitions: ${trL.map(x => `${x.t} ${x.to}`).join(", ")}  | chatter ${res.chatterL}`);
console.log(`   touchdown: ${res.touchdown ? `t ${res.touchdown.t}, ${res.touchdown.errMm.toFixed(1)} mm / ${res.touchdown.yawErrDeg.toFixed(2)}° from target` : "—"}; applied-torque steps > 5 N·m: ${res.appliedStepsOver5} (max ${res.maxAppliedTorqueStep.toFixed(1)}): ${res.firstSteps.slice(0, 5).join("; ")}; τ0 step max ${res.maxTau0Step.toFixed(1)}`);
const r2 = (a, n = 3) => (a ? a.map(v => v.toFixed(n)).join(" … ") : "—");
console.log(`   closure: max/tick ${res.closure.maxPerTickJ.toFixed(4)} J, Σ+ ${res.closure.sumPositiveJ.toFixed(3)} J, total ${res.closure.total != null ? res.closure.total.toFixed(3) : "—"} J; heading ${r2(res.ranges.headingDeg, 2)}°, mid x ${r2(res.ranges.midX, 4)} z ${r2(res.ranges.midZ, 4)}, pelHT ${r2(res.ranges.pelHT, 4)}, slip R ${r2(res.ranges.slipRmm, 2)} mm, ξ margin R ${r2(res.ranges.xiMarginRcm, 2)} cm, nSup ${r2(res.ranges.nSup, 0)}`);
if (OUT) fs.writeFileSync(OUT, JSON.stringify(res));
