// PPR-1 measurements (preregistered definitions; read-only on records). One run → per-step series of the runner and summary statistics:
//   joints (constraint-axis angle θ, ω, α by central differences; actuator torque, request, activations, saturation; passive tissue torque),
//   support (per-foot turf normal force, loaded = F > 1 % BW, planted-foot slip while loaded), COM position / velocity, pelvis / thorax orientation
//   relative to entry (forward pitch, lateral roll, yaw), whole-body linear / angular momentum, per-segment momentum, controller work, passive
//   elastic energy, ledger residuals, cross-contact impulse, tackler COM velocity; for law B its own terms (rec.law).
// PVP scenes: bins 0–25 / 25–50 / 50–80 / 80–120 ms after first contact (t = 0 at the start of the first impulse step); onset order of the joint
// responses (|Δω| > 0.5 rad/s) — how the disturbance propagates. SOLO scenes: standing / push / impact verdicts.
// usage: node ppr1_metrics.mjs --run <ppr1 run .json.gz> [--out <json>]   (or import { metrics })
import fs from "fs"; import zlib from "zlib";
const PL = await import(new URL("../../pvp1/scripts/pvp1a_lib.mjs", import.meta.url).href), { V, Q } = PL;
const G = 9.81, H = 1 / 240, R2D = 180 / Math.PI;
export const KEY_AXES = ["ankle_R.df", "ankle_R.inv", "knee_R.flex", "hip_R.flex", "hip_R.abd", "hip_R.rot", "ankle_L.df", "ankle_L.inv", "knee_L.flex", "hip_L.flex", "hip_L.abd", "lumbar.flex", "lumbar.lat", "lumbar.rot", "thoracic.flex", "neck.flex", "shoulder_R.flex", "shoulder_R.abd", "shoulder_L.flex", "shoulder_L.abd", "elbow_R.flex", "elbow_L.flex"];
export const VERDICT = Object.freeze({ loadedFrac: 0.01, fallPelvisDropM: 0.25, fallTrunkDeg: 60, settleVms: 0.05, settleTrunkDeg: 10, onsetOmega: 0.5 });
const spec = PL.SPEC_R(), B = spec.bodies, M = B.reduce((s, b) => s + b.mass, 0), MT = PL.SPEC_T().bodies.reduce((s, b) => s + b.mass, 0), bi = (n) => B.findIndex(b => b.name === n);
const axisIndex = (() => { const m = {}; spec.joints.forEach((j, k) => ["x", "y", "z"].forEach((q, i) => { const a = j.def.axes[q]; if (a && !a.locked) m[j.name + "." + a.key] = [k, i]; })); return m; })();
const relAngles = (q, q0, fwd, left) => { const d = Q.mul(q, Q.conj(q0)), ang = 2 * Math.acos(Math.min(1, Math.abs(d[3]))), ax = V.len(d.slice(0, 3)) > 1e-12 ? V.norm(d.slice(0, 3)) : [0, 0, 0], rv = V.sc(ax, d[3] < 0 ? -ang : ang);
  return { pitch: V.dot(rv, left) * R2D, roll: V.dot(rv, fwd) * R2D, yaw: rv[1] * R2D, angle: ang * R2D }; };   // rotation vector relative to entry, components about the entry left / forward / vertical axes
export function metrics(run) { const R = run.recs, n0 = R[0].n, nR = B.length, scene = run.job.scene;
  const S0 = R[0].S; const ent = run.entry; const P0 = S0.slice(0, nR);
  // entry frame (forward = pelvis forward, left = from the right foot to the left foot)
  const pel0 = P0[bi("pelvis")], f0 = Q.rot(pel0.rot, [0, 0, 1]), fwd = V.norm([f0[0], 0, f0[2]]), lr = V.sub(P0[bi("foot_L")].pos, P0[bi("foot_R")].pos), left = V.norm(V.sub(V.norm([lr[0], 0, lr[2]]), V.sc(fwd, V.dot(V.norm([lr[0], 0, lr[2]]), fwd))));
  const fcRec = R.find(r => r.contacts.some(c => c.kind === "cross" && Math.hypot(...c.J2) >= 1e-3)), nFirst = fcRec ? fcRec.n : null, tms = (n) => (nFirst == null ? n * H * 1000 : (n - (nFirst - 1)) * H * 1000);
  const ser = R.map(r => { const rc = r.chars.runner, S = r.S.slice(0, nR), Fl = rc.feet.L / H, Fr = rc.feet.R / H, v = V.sc(rc.P, 1 / M);
    return { n: r.n, t: tms(r.n), com: rc.com, v, P: rc.P, L: rc.L_O, Wact: rc.Wact, U: rc.U, E: rc.E, D: rc.D, eRes: rc.energyRes, linRes: V.len(rc.linRes), angRes: V.len(rc.angRes), F: [Fl, Fr], Jcross: rc.Jcross, Wcross: rc.Wcross, nonFoot: rc.nonFootTurf.length,
      pelvis: relAngles(S[bi("pelvis")].rot, P0[bi("pelvis")].rot, fwd, left), thorax: relAngles(S[bi("thorax")].rot, P0[bi("thorax")].rot, fwd, left), head: relAngles(S[bi("head")].rot, P0[bi("head")].rot, fwd, left),
      pelvisY: S[bi("pelvis")].pos[1], feet: [S[bi("foot_L")].pos, S[bi("foot_R")].pos], th: rc.th, act: r.act, passive: r.passive, law: r.law || null, sat: rc.sat,
      tacklerV: r.chars.tackler ? V.sc(r.chars.tackler.P, 1 / MT) : null }; });
  // joint series for the key axes
  const J = {}; for (const name of KEY_AXES) { const ki = axisIndex[name]; if (!ki) continue; const [k, i] = ki, th0 = ser[0].th[k][i];
    const th = ser.map(s => s.th[k][i] - th0), om = th.map((_, q) => (q === 0 || q === th.length - 1 ? 0 : (th[q + 1] - th[q - 1]) / (2 * H))), al = om.map((_, q) => (q === 0 || q === om.length - 1 ? 0 : (om[q + 1] - om[q - 1]) / (2 * H)));
    const act = ser.map(s => { const a = (s.act || []).find(x => x[0] === k && x[1] === i); return a ? { tau: a[2], req: a[6], ap: a[7], am: a[8], sat: a[5] } : null; });
    J[name] = { k, i, th, om, al, act, pas: ser.map(s => (s.passive ? s.passive[k][i] : null)) }; }
  const out = { label: run.job.label || scene, law: run.job.law, scene, steps: R.length, finalHash: run.finalHash, stop: run.stop || null, firstImpulseStep: nFirst, M };
  // ── ledgers / energy ──
  out.ledger = { maxLinRes: Math.max(...ser.map(s => s.linRes)), maxAngRes: Math.max(...ser.map(s => s.angRes)), sumEnergyRes: ser.reduce((a, s) => a + s.eRes, 0), maxAbsEnergyRes: Math.max(...ser.map(s => Math.abs(s.eRes))) };
  out.energy = { E0: ser[0].E, Eend: ser[ser.length - 1].E, Wact: ser.reduce((a, s) => a + s.Wact, 0), Dpass: ser.reduce((a, s) => a + s.D, 0), Wcross: ser.reduce((a, s) => a + (s.Wcross || 0), 0) };
  // ── support / skating ──
  const loaded = (s, f) => s.F[f] > VERDICT.loadedFrac * M * G; out.support = { minLoadN: [Math.min(...ser.map(s => s.F[0])), Math.min(...ser.map(s => s.F[1]))], unloadedSteps: [ser.filter(s => !loaded(s, 0)).length, ser.filter(s => !loaded(s, 1)).length], nonFootTurfSteps: ser.filter(s => s.nonFoot > 0).length };
  out.support.slipMm = [0, 1].map(f => { let ref = null, mx = 0; for (const s of ser) { if (!loaded(s, f)) { ref = null; continue; } const p = s.feet[f]; if (!ref) ref = p; mx = Math.max(mx, Math.hypot(p[0] - ref[0], p[2] - ref[2])); } return +(mx * 1000).toFixed(2); });
  // ── whole-body kinematics ──
  const comD = ser.map(s => V.sub(s.com, ser[0].com)), horiz = (d) => Math.hypot(d[0], d[2]);
  out.body = { maxComHorizMm: Math.max(...comD.map(d => horiz(d))) * 1000, comEndMm: comD[comD.length - 1].map(x => +(x * 1000).toFixed(1)), maxPelvisDropMm: Math.max(...ser.map(s => ser[0].pelvisY - s.pelvisY)) * 1000,
    maxTrunkTiltDeg: Math.max(...ser.map(s => Math.hypot(s.thorax.pitch, s.thorax.roll))), maxPelvisTiltDeg: Math.max(...ser.map(s => Math.hypot(s.pelvis.pitch, s.pelvis.roll))), maxHeadTiltDeg: Math.max(...ser.map(s => Math.hypot(s.head.pitch, s.head.roll))), maxSatAxes: Math.max(...ser.map(s => s.sat || 0)) };
  const last = ser.slice(-Math.min(ser.length, 240)), vEnd = last[last.length - 1].v;
  out.verdict = ser.some(s => s.nonFoot > 0) || out.body.maxPelvisDropMm > VERDICT.fallPelvisDropM * 1000 || out.body.maxTrunkTiltDeg > VERDICT.fallTrunkDeg ? "LOST_BALANCE"
    : Math.hypot(vEnd[0], vEnd[2]) < VERDICT.settleVms && Math.hypot(ser[ser.length - 1].thorax.pitch, ser[ser.length - 1].thorax.roll) < VERDICT.settleTrunkDeg && loaded(ser[ser.length - 1], 0) && loaded(ser[ser.length - 1], 1) ? "STANDING" : "UNRESOLVED";
  // oscillation over the last second (quiet standing): RMS COM horizontal speed, zero crossings of the COM fore-aft velocity, energy trend
  if (scene === "SOLO") { const tail = ser.slice(-240), vs = tail.map(s => V.dot(s.v, fwd)); out.oscillation = { rmsComSpeedMms: Math.sqrt(tail.reduce((a, s) => a + s.v[0] ** 2 + s.v[2] ** 2, 0) / tail.length) * 1000, zeroCrossings: vs.slice(1).filter((x, q) => Math.sign(x) !== Math.sign(vs[q]) && Math.abs(x - vs[q]) > 1e-6).length,
      mechEnergyTrendJ: (tail[tail.length - 1].E - tail[0].E), maxJointDriftDeg: Math.max(...Object.values(J).map(j => Math.abs(j.th[j.th.length - 1]) * R2D)) }; }
  // ── per-joint summaries (whole run) ──
  out.joints = Object.fromEntries(Object.entries(J).map(([nm, j]) => [nm, { maxAbsDthDeg: Math.max(...j.th.map(Math.abs)) * R2D, maxAbsOmega: Math.max(...j.om.map(Math.abs)), maxAbsAlpha: Math.max(...j.al.map(Math.abs)), endDthDeg: j.th[j.th.length - 1] * R2D }]));
  // ── PVP window analysis ──
  if (nFirst != null || scene === "C0") { const nf = nFirst ?? 3, BINS = [[0, 25], [25, 50], [50, 80], [80, 120]], tq = (n) => (n - (nf - 1)) * H * 1000, inB = (q, b) => tq(ser[q].n) > b[0] && tq(ser[q].n) <= b[1], q0 = ser.findIndex(s => s.n === nf - 1);
    const W = ser.map((s, q) => q).filter(q => tq(ser[q].n) > 0 && tq(ser[q].n) <= 120);
    out.window = { t0: `start of step ${nf}`, bins: BINS.map(b => { const Q_ = W.filter(q => inB(q, b)); if (!Q_.length) return null; const pick = (f) => Math.max(...Q_.map(f));
        return { bin: b, comDispMm: pick(q => horiz(V.sub(ser[q].com, ser[q0].com))) * 1000, comDvMms: pick(q => V.len(V.sub(ser[q].v, ser[q0].v))) * 1000, pelvisDeg: pick(q => Math.hypot(ser[q].pelvis.pitch - ser[q0].pelvis.pitch, ser[q].pelvis.roll - ser[q0].pelvis.roll)),
          trunkDeg: pick(q => Math.hypot(ser[q].thorax.pitch - ser[q0].thorax.pitch, ser[q].thorax.roll - ser[q0].thorax.roll)), headDeg: pick(q => Math.hypot(ser[q].head.pitch - ser[q0].head.pitch, ser[q].head.roll - ser[q0].head.roll)),
          footLoadN: [Math.min(...Q_.map(q => ser[q].F[0])), Math.min(...Q_.map(q => ser[q].F[1]))], footLoadMaxN: [pick(q => ser[q].F[0]), pick(q => ser[q].F[1])], crossImpulseNs: Q_.reduce((a, q) => V.add(a, ser[q].Jcross), [0, 0, 0]).map(x => +x.toFixed(3)),
          Wact: Q_.reduce((a, q) => a + ser[q].Wact, 0), Wcross: Q_.reduce((a, q) => a + (ser[q].Wcross || 0), 0), dU: ser[Q_[Q_.length - 1]].U - ser[q0].U, sat: Math.max(...Q_.map(q => ser[q].sat || 0)),
          joints: Object.fromEntries(Object.entries(J).map(([nm, j]) => [nm, { dthDeg: Math.max(...Q_.map(q => Math.abs(j.th[q] - j.th[q0]))) * R2D, omega: Math.max(...Q_.map(q => Math.abs(j.om[q]))), alpha: Math.max(...Q_.map(q => Math.abs(j.al[q]))),
            dTau: j.act[q0] ? Math.max(...Q_.map(q => (j.act[q] ? Math.abs(j.act[q].tau - j.act[q0].tau) : 0))) : null, maxAct: Math.max(...Q_.map(q => (j.act[q] ? Math.max(j.act[q].ap, j.act[q].am) : 0))), dAct: j.act[q0] ? Math.max(...Q_.map(q => (j.act[q] ? Math.max(j.act[q].ap - j.act[q0].ap, j.act[q].am - j.act[q0].am) : 0))) : null }])) }; }) };
    out.window.onsetMs = Object.fromEntries(Object.entries(J).map(([nm, j]) => { const q = W.find(q => Math.abs(j.om[q] - j.om[q0]) > VERDICT.onsetOmega); return [nm, q == null ? null : +tq(ser[q].n).toFixed(1)]; }));
    out.window.tacklerDvMms = ser[q0].tacklerV && ser[W[W.length - 1]].tacklerV ? V.len(V.sub(ser[W[W.length - 1]].tacklerV, ser[q0].tacklerV)) * 1000 : null;
    if (ser[q0].law) out.window.law = { pre: ser[q0].law, end: ser[W[W.length - 1]].law }; }
  out.series = { t: ser.map(s => +s.t.toFixed(3)), com: ser.map(s => s.com.map(x => +x.toFixed(5))), F: ser.map(s => s.F.map(x => +x.toFixed(2))), pelvis: ser.map(s => [s.pelvis.pitch, s.pelvis.roll, s.pelvis.yaw].map(x => +x.toFixed(3))), thorax: ser.map(s => [s.thorax.pitch, s.thorax.roll, s.thorax.yaw].map(x => +x.toFixed(3))),
    joints: Object.fromEntries(Object.entries(J).map(([nm, j]) => [nm, { th: j.th.map(x => +(x * R2D).toFixed(4)), om: j.om.map(x => +x.toFixed(4)), tau: j.act.map(a => (a ? +a.tau.toFixed(3) : null)), req: j.act.map(a => (a ? +a.req.toFixed(3) : null)), a: j.act.map(a => (a ? +Math.max(a.ap, a.am).toFixed(4) : null)), pas: j.pas.map(x => (x == null ? null : +x.toFixed(3))) }])),
    Wact: ser.map(s => +s.Wact.toFixed(5)), U: ser.map(s => +s.U.toFixed(5)), L: ser.map(s => s.L.map(x => +x.toFixed(4))), P: ser.map(s => s.P.map(x => +x.toFixed(4))) };
  return out; }
if (process.argv[1] && process.argv[1].endsWith("ppr1_metrics.mjs")) { const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
  const run = JSON.parse(zlib.gunzipSync(fs.readFileSync(arg("run")))), m = metrics(run); if (arg("out")) fs.writeFileSync(arg("out"), JSON.stringify(m));
  const { series, joints, window: w, ...rest } = m; console.log(JSON.stringify(rest, null, 0).slice(0, 1500)); if (w) for (const b of w.bins) if (b) console.log(JSON.stringify({ bin: b.bin, com: b.comDispMm.toFixed(1), trunk: b.trunkDeg.toFixed(2), pelvis: b.pelvisDeg.toFixed(2), ankleR: b.joints["ankle_R.df"].dthDeg.toFixed(2), kneeR: b.joints["knee_R.flex"].dthDeg.toFixed(2), hipR: b.joints["hip_R.flex"].dthDeg.toFixed(2) })); }
