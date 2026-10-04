// ═══ physchar2/tools/twist_energy.mjs — pre-G4 runway (twist mechanism): POWER FLOW of the leg-twist mode, per joint axis (DIAGNOSTIC)
// A G2 scenario at the env k (default: thorax roll impulse 8 N·m·s, 20 s), optionally with diagnostic controller options (--stand=<json>).
// Over the analysis window (default 12–20 s, the steady limit cycle) per joint axis: actuator work (the actuator layer's own per-row ledger)
// and passive work (passive torque · relative angular velocity about the constraint axis · dt, elastic + viscous), J; per foot the ground's
// vertical (yaw) moment about the ankle; the oscillation (left ankle ab/adduction) amplitude and frequency (zero crossings about its window
// mean); and the posture-IK coupling: the regression slope of the hip-rotation TARGET (IK) on the leg's passive twist (knee axial + ankle
// ab/adduction) — ≈ −1 means the target follows the twist (zero restoring stiffness in the twist direction), ≈ 0 means it does not.
// usage: V2_ANKLE_NEUTRAL_K=<k> node tools/twist_energy.mjs [--human=V2-REF] [--dist=roll:8] [--t0=12 --t1=20] [--stand=<json>] [--out=<json>]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { generateSpec } from "../spec/v2_spec.js"; import { VARIATION_SET } from "../spec/v2_human.js"; import { G2Sim, torqueScenario, pushScenario } from "../gates/v2_g2.js";
import { ankleNeutralKPerDeg, decompose } from "../spec/v2_joints.js"; import { V, Q } from "../core/v2_math.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const HZ = +arg("hz", 240), INSTANT = process.argv.includes("--instantAct"), HUMAN = arg("human", "V2-REF"), DIST = arg("dist", "roll:8"), T0 = +arg("t0", 12), T1 = +arg("t1", 20), STAND = JSON.parse(arg("stand", "{}")), OUT = arg("out", "");
const spec = generateSpec(VARIATION_SET.find(h => h.id === HUMAN)), JN = spec.joints.map(j => j.name), jx = (n) => JN.indexOf(n), D = 180 / Math.PI;
const [dk, dv] = DIST.split(":"), sc = dk === "pushR" || dk === "pushF" ? { ...pushScenario(dk.slice(4), +dv), seconds: T1 } : { ...torqueScenario(dk, +dv), seconds: T1 };
const s = new G2Sim(J, spec, sc, { ...(Object.keys(STAND).length ? { stand: STAND } : {}), cfg: { hz: HZ } }), Wact = {}, Wpas = {}, add = (o, k, v) => { o[k] = (o[k] || 0) + v; };
const aL = jx("ankle_L"), kneeL = jx("knee_L"), hipL = jx("hip_L"), fT = [], hipTgt = [], twist = [], Mz = [[], []];
// ctrl's IK target for the left hip (constraint-space quaternion) → twist coordinate
const tw = (q) => decompose(q).tw;
// --instantAct (diagnostic): activations jump to their excitation every tick (no first-order activation lag)
if (INSTANT) { const oc = s.act.compute.bind(s.act); s.act.compute = (st, ev, cmd, dt, init) => oc(st, ev, cmd, dt, true); }
const footI = ["foot_L", "foot_R"].map(n => spec.bodies.findIndex(b => b.name === n)), fy = [[], []], yawOf = (q) => { const f = Q.rot(q, [0, 0, 1]); return Math.atan2(f[0], f[2]) * D; };
// torque decomposition of the hip-rotation rows (both hips, axis x): feed-forward (inverse statics + posture wrench), stiffness K·e (toward the
// IK target), and the implicit damping −(D + dt·K)·ω_end (+ any clamp) = τ − τ0; work of each over the window (relative rotation rate · dt)
let lastCmd = null; { const oc = s.ctrl.compute.bind(s.ctrl); s.ctrl.compute = (...a) => { const c = oc(...a); lastCmd = c; return c; }; }
const hipR = jx("hip_R"), Wsplit = { ff: [0, 0], Ke: [0, 0], damp: [0, 0] }, jIdxOfCmd = (k) => s.P.jd.findIndex(d => d.k === k);
const pelI = spec.bodies.findIndex(b => b.name === "pelvis"), psiS = [], phiS = [], tS = [];
let prevUp = null, lastHipTgt = null; { const o = s.ctrl.legIK.bind(s.ctrl); s.ctrl.legIK = (...a) => { const r = o(...a); if (a[2] === 0) { const t = r.targets.find(([k]) => k === hipL); if (t) lastHipTgt = t[1]; } return r; }; }
while (s.tick()) { const t = s.n * s.dt, inW = t >= T0;
  if (inW && prevUp) { for (const r of s.actRes || []) add(Wact, JN[r.k] + "." + "xyz"[r.i], r.W);
    if (lastCmd && s.aplan) [hipL, hipR].forEach((hk, n) => { const p = s.aplan.joints.find(q => q.k === hk), c = lastCmd[jIdxOfCmd(hk)], r = (s.actRes || []).find(q => q.k === hk && q.i === 0); if (!p || !c || !c[0] || !r) return;
      const d = s.P.jd[jIdxOfCmd(hk)], w1 = V.sub(s.st[d.child].w, s.st[d.parent].w), om = V.dot(V.sc(V.add(p.wrel, w1), 0.5), p.axW[0]) * s.dt, ff = c[0].ff, Ke = c[0].tau0 - c[0].ff, dmp = r.tau - c[0].tau0;
      Wsplit.ff[n] += ff * om; Wsplit.Ke[n] += Ke * om; Wsplit.damp[n] += dmp * om; });
    for (const pj of prevUp.joints || []) { const d = s.P.jd[pj.k], wr = V.sub(s.st[d.child].w, s.st[d.parent].w); for (let i = 0; i < 3; i++) if (pj.tau[i] && pj.axW) add(Wpas, JN[pj.k] + "." + "xyz"[i], pj.tau[i] * V.dot(wr, pj.axW[i]) * s.dt); }
    const fa = s.P.anat(s.P.jd[aL], s.up.ev.qs[aL], "fabd"); fT.push([t, fa]); footI.forEach((i, n) => fy[n].push(yawOf(s.st[i].rot)));
    psiS.push(yawOf(s.st[pelI].rot)); phiS.push((decompose(s.up.ev.qs[kneeL]).tw + decompose(s.up.ev.qs[aL]).tw) * D); tS.push(t);
    if (lastHipTgt) { hipTgt.push(tw(lastHipTgt) * D); twist.push((decompose(s.up.ev.qs[kneeL]).tw + decompose(s.up.ev.qs[aL]).tw) * D); }
    if (s.probeRows) s.probeRows.forEach((r, n) => { if (r && r.McA && r.JyN > 5) Mz[n].push(r.McA[1] / r.dt); }); }
  prevUp = s.up; }
const sm = s.g2summary(); s.destroy();
const mean = fT.reduce((a, x) => a + x[1], 0) / fT.length; let zc = 0; for (let i = 1; i < fT.length; i++) if ((fT[i][1] - mean) * (fT[i - 1][1] - mean) < 0) zc++;
const amp = (Math.max(...fT.map(x => x[1])) - Math.min(...fT.map(x => x[1]))) / 2, freq = zc / 2 / (T1 - T0);
const slope = (() => { const n = hipTgt.length; if (n < 10) return null; const mx = twist.reduce((a, b) => a + b, 0) / n, my = hipTgt.reduce((a, b) => a + b, 0) / n; let sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sxy += (twist[i] - mx) * (hipTgt[i] - my); sxx += (twist[i] - mx) ** 2; } return sxx > 1e-9 ? sxy / sxx : null; })();
const top = (o) => Object.entries(o).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 8).map(([k, v]) => `${k} ${v.toFixed(3)}`).join(", ");
const sum = (o, f = () => true) => Object.entries(o).filter(([k]) => f(k)).reduce((a, [, v]) => a + v, 0);
const legRot = (k) => /^(hip|knee|ankle)_[LR]\.x$/.test(k);
const g = s.ctrl ? null : null, gh = s.ctrl.gain ? s.ctrl.gain[hipL] : null, footYawAmp = fy.map(a => (Math.max(...a) - Math.min(...a)) / 2);
// phase of the leg twist φ (knee axial + ankle ab/adduction, left) relative to the pelvis yaw ψ at the oscillation frequency (quadrature projection)
const phase = (() => { if (!freq) return null; const w = 2 * Math.PI * freq, pr = (x) => { const m = x.reduce((a, b) => a + b, 0) / x.length; let c = 0, sn = 0; x.forEach((v, i) => { c += (v - m) * Math.cos(w * tS[i]); sn += (v - m) * Math.sin(w * tS[i]); }); return Math.atan2(sn, c); };
  let d = (pr(phiS) - pr(psiS)) * D; while (d > 180) d -= 360; while (d < -180) d += 360; return d; })();
const res = { twistMinusPelvisYawPhaseDeg: phase, workSplitHipRotJ: Wsplit, hz: HZ, instantAct: INSTANT, hipGain: gh ? { K: gh.K, D: gh.D } : null, footYawAmpDeg: footYawAmp, k: ankleNeutralKPerDeg(), human: HUMAN, dist: DIST, stand: STAND, window: [T0, T1], outcome: sm.outcome, ampFabdDeg: amp, freqHz: freq, hipTargetVsTwistSlope: slope,
  actuatorWorkJ: Wact, passiveWorkJ: Wpas, actTotal: sum(Wact), pasTotal: sum(Wpas), actLegAxial: sum(Wact, legRot), pasLegAxial: sum(Wpas, legRot), groundYawMomentRmsNm: Mz.map(a => a.length ? Math.sqrt(a.reduce((p, q) => p + q * q, 0) / a.length) : null) };
console.log(`k ${res.k} ${HUMAN} ${DIST} ${JSON.stringify(STAND)} ${HZ} Hz${INSTANT ? " instantAct" : ""} [${T0}–${T1} s]: hip K ${gh ? gh.K.toFixed(1) : "?"} D ${gh ? gh.D.toFixed(2) : "?"} (K·dt ${gh ? (gh.K / HZ).toFixed(2) : "?"}); foot yaw amp ${footYawAmp.map(v => v.toFixed(2)).join("/")}°; ${sm.outcome}; ankle fabd amp ${amp.toFixed(2)}°, freq ${freq.toFixed(3)} Hz; hip-rot IK target vs twist slope ${slope == null ? "—" : slope.toFixed(3)}`);
console.log(`   actuator work total ${res.actTotal.toFixed(3)} J (leg axial rows ${res.actLegAxial.toFixed(3)}): ${top(Wact)}`);
console.log(`   passive work total ${res.pasTotal.toFixed(3)} J (leg axial rows ${res.pasLegAxial.toFixed(3)}): ${top(Wpas)}`);
console.log(`   phase of the leg twist relative to the pelvis yaw: ${phase == null ? "—" : phase.toFixed(1)}° (sign convention: + = twist leads); pelvis yaw amp ${((Math.max(...psiS) - Math.min(...psiS)) / 2).toFixed(2)}°`);
console.log(`   hip-rotation work split L/R (J): feed-forward ${Wsplit.ff.map(v => v.toFixed(3)).join("/")}, stiffness K·e ${Wsplit.Ke.map(v => v.toFixed(3)).join("/")}, damping/clamp ${Wsplit.damp.map(v => v.toFixed(3)).join("/")}`);
console.log(`   ground yaw moment RMS L/R ${res.groundYawMomentRmsNm.map(v => v == null ? "—" : v.toFixed(3)).join(" / ")} N·m`);
if (OUT) fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
