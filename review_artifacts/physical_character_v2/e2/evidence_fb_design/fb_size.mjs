// ═══ physchar2/tools/ab_val.mjs — A + B FACTORIAL VALIDATION harness (e2/AB_VALIDATION_PREREG.md). A versioned copy of the frozen SV-2 harness (tools/swing_servo_val2.mjs, unchanged):
// the identical timeline, trajectories, reachability pre-check, hand-back and post-contact sequence, with the configuration selected by --cfg (PSTAR5CH baseline | PSTAR5CHA A |
// PSTAR5CHB B | PSTAR5CHAB A + B) and recording-only additions (diagRecord: IK solution; torqueLedger: per-axis command parts and the A / B weights). Extra row fields: x* and the
// margins of the six solved coordinates to their passive soft limits, the swing-leg ledger, the ankle's passive tissue torque, w_A and c; extra series: w_A, c of the swing leg.
// usage: V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node tools/ab_val.mjs --human=V2-REF --side=L --hz=240 --cfg=PSTAR5CHAB --traj=R-F --out=<file.json.gz>
import fs from "fs"; import { fbWrench } from "./fbw.mjs"; import path from "path"; import zlib from "zlib"; import { fileURLToPath } from "url";
import { loadJolt } from "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2/sandbox/visual/physchar2/core/v2_jolt.js"; import { e2Spec, CFG } from "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2/sandbox/visual/physchar2/gates/v2_e2.js"; import { G3Sim, g3Def } from "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2/sandbox/visual/physchar2/gates/v2_g3.js"; import { V, Q } from "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2/sandbox/visual/physchar2/core/v2_math.js";
import { stepSegment, stepAt, stepRef, stepPrev, qlog } from "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2/sandbox/visual/physchar2/ctrl/v2_swing.js"; import { FS, liftRef, stepFrame, swingFrame, candPose, landingValid, ikFeasible, certifyPath } from "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2/sandbox/visual/physchar2/ctrl/v2_footstep.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt("/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2/sandbox/visual/physchar2/vendor/jolt-physics.wasm-compat.js"), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const HUMAN = arg("human", "V2-REF"), SIDE = arg("side", "L"), HZ = +arg("hz", 240), CFGN = arg("cfg", "PSTAR5CH"), TID = arg("traj", "R-F"), MODE = arg("mode", "run"), OUT = arg("out", "");
// trajectory set (prereg §2): goal offsets in the stance frame (forward f, outward o) ON THE TURF (dz 0), T from the measured liftoff, apex above max(start, goal) at T/2
const SV2 = { "R-F": { set: "R", dx: 0.10, dy: 0, T: 0.60, apex: 0.030 }, "R-L": { set: "R", dx: 0, dy: 0.08, T: 0.60, apex: 0.030 },
  "C-F7": { set: "C", dx: 0.07, dy: 0, T: 0.60, apex: 0.030 }, "C-F13": { set: "C", dx: 0.13, dy: 0, T: 0.60, apex: 0.030 }, "C-L5": { set: "C", dx: 0, dy: 0.05, T: 0.60, apex: 0.030 }, "C-L11": { set: "C", dx: 0, dy: 0.11, T: 0.60, apex: 0.030 },
  "H-T45": { set: "H", dx: 0.10, dy: 0, T: 0.45, apex: 0.030 }, "H-A40": { set: "H", dx: 0.10, dy: 0, T: 0.60, apex: 0.040 }, "H-D": { set: "H", dx: 0.10, dy: 0.08, T: 0.60, apex: 0.030 }, "H-F15": { set: "H", dx: 0.15, dy: 0, T: 0.60, apex: 0.030 } };
if (!["L", "R"].includes(SIDE) || !["PSTAR5CH", "PSTAR5CHA", "PSTAR5CHB", "PSTAR5CHAB"].includes(CFGN) || !SV2[TID] || !["run", "reach"].includes(MODE)) throw new Error("args");
if (process.env.V2_KNEE_MODEL !== "v2k" || process.env.V2_ANKLE_NEUTRAL_K !== "0.13") throw new Error("E1a configuration env required");
const nL = SIDE === "L" ? 0 : 1, nS = 1 - nL, CONFIG = CFGN, FF = "on", TR = SV2[TID], HOLD = 0.5, CONTACT = ["TOUCHDOWN", "TOUCHING", "LOAD_ACCEPT", "SUPPORT", "UNLOADING"];
const mj = (u) => { u = Math.min(1, Math.max(0, u)); return u * u * u * (10 - 15 * u + 6 * u * u); };
const seg4 = (t, a, T, v0, v1) => { const u = Math.min(1, Math.max(0, (t - a) / T)), dv = v1 - v0; return [v0 + dv * mj(u), t > a && t < a + T ? dv * 30 * u * u * (1 - u) * (1 - u) / T : 0, t > a && t < a + T ? dv * 60 * u * (1 - u) * (1 - 2 * u) / (T * T) : 0]; };
const H = { tCmd: null, touchT0: null, tLo: null, sg: null, segT0: null, tC: null, early: false, hb: null, hbT0: null, cleared: null, tRet: null, tEnd: null, abortT: null, A: null, fr: null, goal: null, done: false, reach: null, failedTD: null };
const sig = (t) => { if (t <= 3) return [0.5, 0, 0]; if (t < 7) return seg4(t, 3, 4, 0.5, 1.0); if (H.tRet == null) return [1.0, 0, 0]; return seg4(t, H.tRet, 4, 1.0, 0.5); };
const lamFn = (t) => lamFn.d(t)[0]; lamFn.d = (t) => { const [v, d1, d2] = sig(t); return nS === 1 ? [v, d1, d2] : [1 - v, -d1, -d2]; };
const spec = e2Spec(HUMAN), pd = { t0: 1, dur: 2, dz: 0.025 }, def = { ...g3Def(nS === 1 ? "U:R" : "U:L"), key: "SV2", title: "swing servo validation v2", lam: lamFn, supervise: {}, holds: [], seconds: 60, push: null, torque: null };
const s = new G3Sim(J, spec, def, { stand: { ikRefTwist: true, lifecycle: true, pelvisDrop: pd, ...CFG[CONFIG], diagRecord: true, torqueLedger: true }, passiveOpts: { kneeModel: "v2k" }, ...(HZ !== 240 ? { cfg: { hz: HZ } } : {}) });
const C = s.ctrl, dt = s.dt; if (!C.o.swingAccFF || C.o.e2 !== 2 || C.o.vffRate !== "sr" || !C.o.e2reanchorVel || !!C.o.vffPelvisAir !== CONFIG.slice(8).includes("A") || !!C.o.vffPassiveRef !== CONFIG.slice(8).includes("B")) throw new Error("configuration");
const FBR = [], FBX = []; H.pelWPrev = null; const origSAW = C.swingAccWrench.bind(C);
C.swingAccWrench = function (st, ev, n, fr, x, ref, A) { const out = origSAW(st, ev, n, fr, x, ref, A); const ps = st[C.pelvis], al = H.pelWPrev ? V.sc(V.sub(ps.w, H.pelWPrev), 1 / dt) : [0, 0, 0];
  const base = fbWrench(C, st, ev, n, fr, x, ref, A, null), fb = fbWrench(C, st, ev, n, fr, x, ref, A, { c: ps.com, v: ps.v, w: ps.w, al }), fbw = fbWrench(C, st, ev, n, fr, x, ref, A, { c: ps.com, v: ps.v, w: ps.w, al }, { w: true, al: false });
  if (out && base && fb && fbw) { let cons = 0; for (const k in out.T) cons = Math.max(cons, V.len(V.sub(out.T[k], base.T[k])));
    FBR.push({ t: C.n * dt, u: H.segT0 != null ? C.n * dt - H.segT0 : null, tC: H.tC, w: ps.w.slice(), al, cons, dT: C.legK[n].map(k => V.sub(fb.T[k], base.T[k])), dTw: C.legK[n].map(k => V.sub(fbw.T[k], base.T[k])), T: C.legK[n].map(k => base.T[k]) }); }
  return out; };
const setT = (e) => { C.lc.setSwingTarget(nL, { pos: e.pos, rot: e.rot }); if (!C.swingRef) C.swingRef = [null, null]; C.swingRef[nL] = { vel: e.vel.slice(), acc: e.acc.slice(), w: (e.w || [0, 0, 0]).slice(), al: (e.al || [0, 0, 0]).slice() }; H.ref = e; };
// the planner's reachability certifier, posed exactly as the E2 planner poses a commanded step (predicted liftoff state, knot at T/2 of the post-liftoff swing, swing frame now)
function reachCheck(st, tr) { const X = { ctrl: C, st: C.e2st, ev: C.e2ev, n: nL, pel: swingFrame(C, st, nL) }, goal = candPose(H.A, H.fr, tr.dx, tr.dy, 0), L = liftRef(H.A, FS.liftDelayPlan);
  const sg = stepSegment({ p: L.p, v: L.v, a: L.a, th: [0, 0, 0], w: [0, 0, 0], al: [0, 0, 0] }, goal, tr.T, { z: H.A.pos[1] + tr.apex, tk: 0.5 * tr.T });
  const geo = landingValid(C, X.st, nL, goal, H.fr), node = ikFeasible(C, X.st, X.ev, nL, X.pel, goal), path = certifyPath(X, sg);
  return { ok: !!(geo.ok && node && path.ok), landing: geo.ok ? "ok" : geo.why, node, path: path.verdicts }; }
const oc = C.compute.bind(C);
C.compute = (st, ev, dtt) => { const tc = C.n * dtt, lc = C.lc, f = lc.feet[nL], g = C.g3;
  if (g && g.aborted != null && H.abortT == null) { H.abortT = g.aborted; H.tEnd = tc + 6; }
  if (H.abortT == null && !H.done) {
    if (H.tCmd == null) { if (f.state === "TOUCHING") { if (H.touchT0 == null) H.touchT0 = tc; } else H.touchT0 = null;
      if (tc >= 7 - 1e-9 && H.touchT0 != null && tc - H.touchT0 >= 0.5 - 1e-9 && C.e2st) { H.tCmd = tc; const a = lc.target(nL); H.A = { pos: a.pos.slice(), rot: a.rot.slice() }; H.fr = stepFrame(C, st, nL); H.goal = candPose(H.A, H.fr, TR.dx, TR.dy, 0);
        if (MODE === "reach") { H.reachAll = Object.fromEntries(Object.entries(SV2).map(([id, tr]) => [id, reachCheck(st, tr)])); H.done = true; H.tEnd = tc; }
        else { H.reach = reachCheck(st, TR); if (!H.reach.ok) { H.done = true; H.reachRejected = true; H.tRet = tc + 0.2; H.tEnd = H.tRet + 4 + 3; } } } }
    if (H.tCmd != null && H.tLo == null && !H.done) { const L = liftRef(H.A, tc - H.tCmd);
      if (f.state === "AIRBORNE") { const b = st[C.feet[nL]], ref = { p: b.pos.slice(), v: V.add(b.v, V.cross(b.w, V.sub(b.pos, b.com))), a: L.a.slice(), th: qlog(Q.mul(Q.conj(H.A.rot), b.rot)), w: Q.rot(Q.conj(H.A.rot), b.w), al: [0, 0, 0] };
        H.tLo = tc; H.segT0 = tc; H.sg = stepSegment(ref, H.goal, TR.T, { z: H.A.pos[1] + TR.apex, tk: 0.5 * TR.T }); C.e2reanchor = nL; C.e2reanchorPrev = stepPrev(H.sg, dt); setT(stepAt(H.sg, 0)); }
      else if (tc - H.tCmd > 0.6) { H.done = true; H.noLift = true; H.tRet = tc + 0.2; H.tEnd = H.tRet + 4 + 3; } else setT({ pos: L.p, rot: H.A.rot, vel: L.v, acc: L.a }); }
    else if (H.sg && !H.hb) { const u = tc - H.segT0;
      if (H.tC == null && CONTACT.includes(f.state) && u > 0) { H.tC = tc; H.phiC = u / TR.T; H.early = H.phiC < FS.gate - 1e-9; const land = f.hold ? { pos: f.hold.pos.slice(), rot: f.hold.rot.slice() } : { pos: H.goal.pos.slice(), rot: H.goal.rot.slice() };
        H.land = land; H.hb = stepSegment(stepRef(H.sg, u, land.rot), land, Math.max(TR.T - u, lc.o.accept), null); H.hbT0 = tc; setT(stepAt(H.hb, 0)); }   // E2's accept(): hand-back to the landed anchor
      else if (H.tC == null && u > TR.T + FS.lateHold - 1e-9) { H.failedTD = tc; lc.setSwingTarget(nL, null); H.sg = null; H.done = true; H.tRet = tc + HOLD; H.tEnd = H.tRet + 4 + 3; }
      else if (H.tC == null) setT(stepAt(H.sg, u)); }
    else if (H.hb) { const u = tc - H.hbT0; if (u >= H.hb.T - 1e-9) { lc.setSwingTarget(nL, null); H.cleared = tc; H.hb = null; H.sg = null; H.done = true; H.tRet = tc + HOLD; H.tEnd = H.tRet + 4 + 3; } else setT(stepAt(H.hb, u)); } }
  const cmd = oc(st, ev, dtt); s._cmd = cmd; H.pelWPrev = st[C.pelvis].w.slice();
  const lgq = (qa, qb) => { const sg = qa[0] * qb[0] + qa[1] * qb[1] + qa[2] * qb[2] + qa[3] * qb[3] < 0 ? -1 : 1, d = Q.mul(Q.conj(qa), qb.map(x => x * sg)); return [2 * d[0] / dtt, 2 * d[1] / dtt, 2 * d[2] / dtt]; };
  if (H.tLo != null && (H.tC == null || tc <= H.tC + 0.3)) { const b = st[C.feet[nL]]; FBX.push({ t: tc, fw: b.w.slice(), pw: st[C.pelvis].w.slice(), rw: H.ref && H.ref.w ? H.ref.w.slice() : null, rrot: H.ref ? H.ref.rot.slice() : null, frot: b.rot.slice(),
    J: C.legK[nL].map(k => ({ ws: C.ikW && C.ikW[k] ? C.ikW[k].slice() : null, wP: C.diagRec && C.diagRec[nL] && C.diagRec[nL].wP[k] ? C.diagRec[nL].wP[k].slice() : null, wT: C.diagRec && C.diagRec[nL] && C.diagRec[nL].wT[k] ? C.diagRec[nL].wT[k].slice() : null, wa: H.qPrev && H.qPrev[k] ? lgq(H.qPrev[k], ev.qs[k]) : null })) }); }
  H.qPrev = {}; for (const k of C.legK[nL]) H.qPrev[k] = ev.qs[k].slice(); return cmd; };
// ── run + telemetry: rows from the step command to 0.3 s after contact (full); whole-run per-tick series for continuity / energy ──
const B = spec.bodies, FT = C.feet, solePts = FT.map(fi => B[fi].shapes.filter(h => h.type === "hull").flatMap(h => h.points.map(p => V.add(p, h.pos))));
const lowAt = (n, pos, rot) => Math.min(...solePts[n].map(p => pos[1] + Q.rot(rot, p)[1])) * 1000, tilt = (q) => Math.acos(Math.min(1, Q.rot(q, [0, 1, 0])[1])) * 180 / Math.PI, yawOf = (q) => { const fw = Q.rot(q, [0, 0, 1]); return Math.atan2(fw[0], fw[2]) * 180 / Math.PI; };
const legAxes = new Set(); C.legK[nL].forEach(k => [0, 1, 2].forEach(i => legAxes.add(k * 3 + i)));
const SL = C.legK[nL].map(k => spec.joints[k].limits.soft), LO = [SL[0].lo[0], SL[0].lo[1], SL[0].lo[2], SL[1].lo[1], SL[2].lo[1], SL[2].lo[2]], HI = [SL[0].hi[0], SL[0].hi[1], SL[0].hi[2], SL[1].hi[1], SL[2].hi[1], SL[2].hi[2]];
const ankK = C.legK[nL][2];
const rows = [], series = { t: [], dTau: [], dTau0: [], onset: [], closInc: [], wA: [], c: [] }, trans = [], hashes = {};
let prevTau = null, prevCmd = null, prevE = null, prevW = null, closMax = -Infinity, closPos = 0, prevTouch = null, prevSt = null, stance0 = null, stanceMax = 0;
while (true) { if (!s.tick()) break; const t = s.n * dt, st = s.st, se = C.sense, c = s._cmd, lcf = C.lc.feet;
  const tau = {}, sat = new Set(), frac = {}; for (const r of s.actRes || []) { tau[r.k * 3 + r.i] = r.tau; if (r.sat) sat.add(r.k * 3 + r.i); frac[r.k * 3 + r.i] = r.frac; }
  let dT = 0; if (prevTau) for (const key in tau) dT = Math.max(dT, Math.abs(tau[key] - (prevTau[key] ?? tau[key]))); prevTau = tau;
  let dC = 0; if (prevCmd && c) c.forEach((ax, k) => ax && ax.forEach((r, i) => { const p = prevCmd[k] && prevCmd[k][i]; if (r && p) dC = Math.max(dC, Math.abs(r.tau0 - p.tau0)); })); prevCmd = c;
  const L = s.ledger, E = s.last.E, W = L.Wact + L.Wext - L.damping, dCl = prevE == null ? 0 : (E - prevE) - (W - prevW); prevE = E; prevW = W; closMax = Math.max(closMax, dCl); closPos += Math.max(0, dCl);
  const onset = se.touch.map((x, n) => !!(prevTouch && prevTouch[n] === 0 && x > 0)); prevTouch = se.touch.slice();
  const sts = lcf.map(x => x.state); if (prevSt) for (const n of [0, 1]) if (sts[n] !== prevSt[n]) trans.push({ t: +t.toFixed(6), n, from: prevSt[n], to: sts[n] }); prevSt = sts;
  series.t.push(+t.toFixed(6)); series.dTau.push(+dT.toFixed(5)); series.dTau0.push(+dC.toFixed(5)); series.onset.push(onset[0] || onset[1] ? 1 : 0); series.closInc.push(+dCl.toExponential(4));
  series.wA.push(C.wAof ? +C.wAof[nL].toFixed(6) : 0); series.c.push(C.cmdW ? +C.cmdW[nL].toFixed(6) : 0);
  if (!stance0 && H.tCmd != null) stance0 = st[FT[nS]].pos.slice(); if (stance0) stanceMax = Math.max(stanceMax, Math.hypot(st[FT[nS]].pos[0] - stance0[0], st[FT[nS]].pos[2] - stance0[2]) * 1000);
  if (H.tCmd != null && H.ref && (H.tC == null || t <= H.tC + 0.3 + 1e-9) && H.abortT == null && !H.reachRejected) { const b = st[FT[nL]], vO = V.add(b.v, V.cross(b.w, V.sub(b.pos, b.com))), e = H.ref, pr = s.probeRows ? s.probeRows[nL] : null;
    rows.push({ t: +t.toFixed(6), u: H.segT0 != null ? +(t - H.segT0).toFixed(6) : null, ph: H.tLo == null ? "lift" : H.tC == null ? "swing" : "contact", ref: { p: e.pos, v: e.vel, a: e.acc, rot: e.rot }, foot: { p: b.pos.slice(), v: vO, rot: b.rot.slice() },
      low: lowAt(nL, b.pos, b.rot), lowRef: lowAt(nL, e.pos, e.rot), tiltErr: tilt(Q.mul(Q.conj(e.rot), b.rot)), yawErr: (() => { let d = yawOf(b.rot) - yawOf(e.rot); while (d > 180) d -= 360; while (d < -180) d += 360; return d; })(),
      touch: se.touch[nL], Fz: pr ? pr.JyN : 0, st: lcf[nL].state, a: lcf[nL].a, ikErr: C.ikRes ? C.ikRes[nL] : null, legTau: [...legAxes].map(k => [k, tau[k] ?? 0, frac[k] ?? 0]), sat: [...sat].filter(k => legAxes.has(k)), dTau: dT, dTau0: dC, ff: C.info.accFF && C.info.accFF[nL] ? 1 : 0,
      xs: C.diagRec && C.diagRec[nL] ? C.diagRec[nL].x.map(v => +v.toFixed(7)) : null, margin: C.diagRec && C.diagRec[nL] ? C.diagRec[nL].x.map((v, i) => +(Math.min(v - LO[i], HI[i] - v) * 180 / Math.PI).toFixed(3)) : null,
      L: C.legK[nL].map(k => (c && c[k] ? c[k].map(r => (r && r.L ? { tau0: r.tau0, ...r.L } : null)) : null)), pasAnk: s.w.lambdaMotor(ankK).map(v => +(v / dt).toFixed(6)), wA: C.wAof ? C.wAof[nL] : 0, cw: C.cmdW ? C.cmdW[nL] : 0 }); }
  if (s.n % 240 === 0) hashes[String(Math.round(t))] = (s.h >>> 0).toString(16).padStart(8, "0");
  if (H.tEnd != null && t >= H.tEnd - 1e-9) break; if (t > 40) break; }
hashes.end = (s.h >>> 0).toString(16).padStart(8, "0");
const g = s.g3summary(), actAxes = []; s.act.led.forEach((row, k) => row.forEach((x, i) => { if (x && x.n) actAxes.push({ axis: spec.joints[k].name + "." + "xyz"[i], k, i, overCap: x.overCap, satTicks: x.satTicks, peakNm: x.peakNm, peakFrac: x.peakFrac }); }));
const last = C.lc.feet.map(f => f.state);
const out = { generated: "tools/ab_val.mjs", prereg: "e2/AB_VALIDATION_PREREG.md", human: HUMAN, side: SIDE, swing: nL, hz: HZ, ff: FF, config: CONFIG, traj: TID, tr: TR, mode: MODE, W: C.M * 9.81,
  events: { tCmd: H.tCmd, tLo: H.tLo, tC: H.tC, phiC: H.phiC ?? null, early: H.early, failedTD: H.failedTD, cleared: H.cleared, tRet: H.tRet, abortT: H.abortT, noLift: !!H.noLift, reachRejected: !!H.reachRejected, finalStates: last },
  reach: H.reach, reachAll: H.reachAll || null, goal: H.goal, land: H.land || null, anchor: H.A, trans,
  integrity: { closMax, closPos, stanceSlipMm: stanceMax, ledger: g.ledger, authorityWrites: g.ledger.authorityWrites, overCap: actAxes.reduce((s2, a) => s2 + a.overCap, 0) }, actAxes: actAxes.filter(a => legAxes.has(a.k * 3 + a.i)),
  wn: 2 * Math.PI * C.lc.o.swingHz, outcome: g.outcome, hashes, series, rows };
out.fbr = FBR; out.fbx = FBX; s.destroy(); if (OUT) fs.writeFileSync(OUT, zlib.gzipSync(JSON.stringify(out)));
if (MODE === "reach") console.log(`ABV reach ${HUMAN} ${SIDE} ${HZ} Hz: ` + Object.entries(H.reachAll || {}).map(([id, r]) => `${id} ${r.ok ? "OK" : "REJECT(" + (r.landing !== "ok" ? r.landing : !r.node ? "goal" : "path") + ")"}`).join(" "));
else console.log(`ABV ${HUMAN} ${SIDE} ${HZ} Hz ${CONFIG} ${TID}: reach ${H.reach ? (H.reach.ok ? "OK" : "REJECTED") : "—"}; liftoff ${H.tLo != null ? (H.tLo - H.tCmd).toFixed(3) + " s" : "NONE"}; contact φ ${H.phiC != null ? H.phiC.toFixed(3) : "—"}${H.early ? " EARLY" : ""}${H.failedTD ? " FAILED-TD" : ""}; abort ${H.abortT ?? "none"}; outcome ${g.outcome}; final ${last.join("/")}; hash ${hashes.end}`);
