// BALANCE-2 §6 / §7 — trajectory decomposition of a BALANCE-1 push (read-only diagnostic). Runs the FROZEN BALANCE-1 system (canonical M1b +
// b1_ctrl with B1_B.json or B1_A.json, unchanged) for the undisturbed twin and the pushed run exactly as the frozen battery does (onset step 480,
// 50 ms pelvis-COM pulse, 4 s window, motor noise as frozen), and records per step: body / support (COM, COP, per-foot load and COP along the
// foot, loaded front edge, heel lift, ground reaction), posture (laboratory-convention angles, segment tilts), the M1b cascade on the sagittal
// support axes (excitation, activation, developed force, intrinsic and passive torque, physical torque), and the controller's internal terms,
// reconstructed OUTSIDE the frozen controller from its own state after each step (delayed COM observation, P / D / I parts of the COM force,
// group offsets and integrals) — the frozen code is not modified or copied. usage: node b2_decompose.mjs --dir fwd --J 12 [--ctrl B1_B] --out <json>
import fs from "fs";
const RA = new URL("../../", import.meta.url).href, PL = await import(RA + "pvp1/scripts/pvp1a_lib.mjs"), { V, Q } = PL, SPEC = PL.SPEC_R();
const { runOne } = await import(RA + "balance1/scripts/b1_run.mjs"), CT = await import(RA + "balance1/scripts/b1_ctrl.mjs"), BT = await import(RA + "ppr3/scripts/ppr3_battery.mjs"), MS = await import(RA + "ppr3/scripts/ppr3_measure.mjs");
const SA = await import(new URL("./b2_segment_angles.mjs", import.meta.url).href);
const H = 1 / 240, R2D = 180 / Math.PI, ONSET = 480, WINDOW = 960, PULSE = 12, M = SPEC.totals.mass;
const bi = (n) => SPEC.bodies.findIndex(b => b.name === n), jk = (n) => SPEC.joints.findIndex(j => j.name === n), FOOT = { L: bi("foot_L"), R: bi("foot_R") };
const AXES = [["ankL", "ankle_L", 1], ["ankR", "ankle_R", 1], ["kneeL", "knee_L", 1], ["kneeR", "knee_R", 1], ["hipL", "hip_L", 1], ["hipR", "hip_R", 1], ["lumbar", "lumbar", 1], ["thoracic", "thoracic", 1], ["neck", "neck", 1], ["hipLabd", "hip_L", 2], ["hipRabd", "hip_R", 2], ["ankLinv", "ankle_L", 2], ["ankRinv", "ankle_R", 2]].map(([n, j, i]) => [n, jk(j), i]);
export async function trace(ctrlName, dir, J, opts = {}) { const cp = JSON.parse(fs.readFileSync(new URL(`balance1/params/${ctrlName}.json`, RA))), steps = ONSET + WINDOW, j = dir === "fwd" || dir === "back" ? 0 : 1;
  const one = async (perturb) => { let C = null; const rows = [];
    const o = await runOne({ law: "M1B", params: opts.body || {}, ctrl: (p) => (C = new CT.BalanceController(cp)), steps, perturb, instrument: true, onStep: (sim) => {
      const n = sim.n - 1, e = C.entry, p = C.p, D = p.delays, G = [C.mode.ap, C.mode.ml], at = (d) => (n - d >= 0 ? C.ring.get(n - d) : e);
      // j: the COM channel's component (0 = AP world x, 1 = ML world z); un-predicted terms (variant B predicts ML only, so ML rows are the
      // DELAYED observation's P / D / I, not B's propagated state — reported as such)
      const so = at(D.com), x = so.com[j] - e.com[j], v = so.comV[j], soH = at(D[p.com.hipChannel] || D.com), xH = soH.com[j] - e.com[j], vH = soH.comV[j], kP = Array.isArray(p.com.kP) ? p.com.kP[j] : p.com.kP, kD = Array.isArray(p.com.kD) ? p.com.kD[j] : p.com.kD, kI = Array.isArray(p.com.kI) ? p.com.kI[j] : p.com.kI;
      const g = {}; for (const [nm, gr] of Object.entries(C.grp)) { const q = p[nm]; if (!q) continue; const s = at(D[q.channel])[nm].d, s0 = e[nm].d; g[nm] = { off: s[j] - s0[j], I: gr.I ? gr.I[j] : 0 }; }
      rows.push({ n, com: { x, v, P: G[j] * kP * x, D: G[j] * kD * v, I: G[j] * kI * C.ci[j], F: G[j] * (kP * x + kD * v + kI * C.ci[j]) }, hip: { x: xH, v: vH, F: G[j] * (kP * xH + kD * vH + kI * (C.ciH ? C.ciH[j] : 0)) }, groups: g, cmd: Array.from(C.log.cmd[C.log.cmd.length - 1]) }); } });
    return { o, rows }; };
  const base = await one([]), push = await one(J > 0 ? BT.pushJob(dir, J, ONSET, opts.pulse || PULSE) : []), A = base.o.recs, P = push.o.recs, ax = dir === "fwd" || dir === "back" ? 0 : 2;
  const edgesBattery = BT.bos(A, ONSET - 6, ONSET), rec = BT.recovery(base.o, push.o, ONSET, WINDOW, edgesBattery, { dropFallMm: 150, recTolMm: 10 });
  const foot = (r, s) => { const b = FOOT[s], S = r.S[b], fwd = Q.rot(S.rot, [0, 0, 1]), along = (p) => (p[0] - S.pos[0]) * fwd[0] + (p[2] - S.pos[2]) * fwd[2]; let F = 0, a = 0, fr = -1, heelF = 0;
    for (const m of r.contacts || []) if (m.kind === "turf-runner" && m.b[1] === SPEC.bodies[b].name) for (const p of m.points) if (p.lam > 0) { const al = along(p.p); F += p.lam; a += p.lam * al; fr = Math.max(fr, al); if (al < 0) heelF += p.lam; }
    const hull = SPEC.bodies[b].shapes.flatMap(sh => sh.points.map(pp => V.add(S.pos, Q.rot(S.rot, V.add(sh.pos, Q.rot(sh.rot, pp)))))), heelY = Math.min(...hull.filter(pp => along(pp) < -0.03).map(pp => pp[1]));
    const toeY = Math.min(...hull.filter(pp => along(pp) > 0.10).map(pp => pp[1])), lat = [Q.rot(S.rot, [1, 0, 0])].map(u => Math.asin(Math.max(-1, Math.min(1, u[1]))) * R2D)[0];
    return { loadN: F * 240, copAlong: F > 0 ? a / F : null, frontLoaded: fr, heelShare: F > 0 ? heelF / F : 0, heelLiftMm: heelY * 1000, forefootLiftMm: toeY * 1000, pitchDeg: Math.asin(Math.max(-1, Math.min(1, fwd[1]))) * R2D, rollDeg: lat }; };
  const lawOf = (r, k, i) => (r.law || []).find(x => x[0] === k && x[1] === i), actOf = (r, k, i) => { const a = (r.act || []).find(x => x[0] === k && x[1] === i); return (a ? a[2] : 0) + r.passive[k][i]; };
  const series = []; const ajc0 = (A[ONSET - 1].S[FOOT.L].pos[0] + A[ONSET - 1].S[FOOT.R].pos[0]) / 2;
  for (let q = ONSET - 24; q < Math.min(P.length, A.length); q++) { const r = P[q], a = A[q], f = MS.frame(r, P[q - 1]), fa = MS.frame(a, A[q - 1]), sa = SA.segmentAngles(r.S), sb = SA.segmentAngles(a.S), cr = push.rows[q], cb = base.rows[q];
    const ft = { L: foot(r, "L"), R: foot(r, "R") };
    series.push({ t: +((q - ONSET) * H).toFixed(5), n: q, com: { dx: (r.chars.runner.com[ax] - a.chars.runner.com[ax]), xAbs: r.chars.runner.com[0] - ajc0, zAbs: r.chars.runner.com[2], v: f.comV[ax] - fa.comV[ax], vAbs: f.comV[ax], y: r.chars.runner.com[1] }, cop: { xAbs: f.cop ? f.cop[0] - ajc0 : null, zAbs: f.cop ? f.cop[1] : null, dx: f.cop && fa.cop ? f.cop[ax === 0 ? 0 : 1] - fa.cop[ax === 0 ? 0 : 1] : null },
      feet: ft, grf: { x: r.chars.runner.Jturf[0] * 240, y: r.chars.runner.Jturf[1] * 240, z: r.chars.runner.Jturf[2] * 240 },
      ang: { ankle: sa.L.ankleDorsiDeg - sb.L.ankleDorsiDeg, knee: sa.L.kneeFlexDeg - sb.L.kneeFlexDeg, hip: sa.L.hipFlexDeg - sb.L.hipFlexDeg, ankleR: sa.R.ankleDorsiDeg - sb.R.ankleDorsiDeg, hipR: sa.R.hipFlexDeg - sb.R.hipFlexDeg }, tilt: { pelvis: sa.tiltDeg.pelvis - sb.tiltDeg.pelvis, thorax: sa.tiltDeg.thorax - sb.tiltDeg.thorax, head: sa.tiltDeg.head - sb.tiltDeg.head, abdomen: sa.tiltDeg.abdomen - sb.tiltDeg.abdomen },
      axes: Object.fromEntries(AXES.map(([nm, k, i]) => { const L = lawOf(r, k, i), Lb = lawOf(a, k, i); return [nm, { tauPhys: actOf(r, k, i), dTauPhys: actOf(r, k, i) - actOf(a, k, i), intent: L[2], uP: L[3], uM: L[4], aP: L[5], aM: L[6], fP: L[7], fM: L[8], dfP: L[7] - Lb[7], dfM: L[8] - Lb[8], tauE: L[11], tauB: L[12], dTauCtrl: L[14] - Lb[14] }]; })),
      ctrl: cr ? { comObs: cr.com.x - cb.com.x, comObsV: cr.com.v - cb.com.v, F: cr.com.F - cb.com.F, Fp: cr.com.P - cb.com.P, Fd: cr.com.D - cb.com.D, Fi: cr.com.I - cb.com.I, FH: cr.hip.F - cb.hip.F, hipObs: cr.hip.x - cb.hip.x,
        groups: Object.fromEntries(Object.entries(cr.groups).map(([k, v]) => [k, { off: v.off - cb.groups[k].off, I: v.I - cb.groups[k].I }])) } : null }); }
  const lp = []; for (let q = ONSET - 6; q < ONSET; q++) for (const m of A[q].contacts || []) if (m.kind === "turf-runner") for (const p of m.points) if (p.lam > 0) lp.push(p.p);
  const edgesLoaded = { fwd: Math.max(...lp.map(p => p[0])), back: Math.min(...lp.map(p => p[0])), left: Math.max(...lp.map(p => p[2])), right: Math.min(...lp.map(p => p[2])) }, c0 = A[ONSET - 1].chars.runner.com, w0 = Math.sqrt(9.81 / c0[1]);
  const marg = { fwd: edgesLoaded.fwd - c0[0], back: c0[0] - edgesLoaded.back, left: edgesLoaded.left - c0[2], right: c0[2] - edgesLoaded.right }, JlimLoaded = Object.fromEntries(Object.entries(marg).map(([k, v]) => [k, M * w0 * v]));
  return { ctrl: ctrlName, dir, J, recovery: rec, edgesBattery, edgesLoaded, comEntry: c0, ajc0, marginLoadedM: marg, JlimLoaded, chronology: MS.chronology(base.o, push.o, ONSET), comV: [base.o, push.o].map(o => 0), hashes: [base.o.finalHash, push.o.finalHash], loadedFrontEdgeAbs: Math.max(...["L", "R"].map(s => foot(A[ONSET - 1], s).frontLoaded)), series }; }
if (process.argv[1] && process.argv[1].endsWith("b2_decompose.mjs")) { const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
  const T = await trace(arg("ctrl", "B1_B"), arg("dir", "fwd"), +arg("J", "12")); fs.writeFileSync(arg("out"), JSON.stringify(T)); console.log(T.ctrl, T.dir, T.J, JSON.stringify(T.recovery), T.hashes); }
