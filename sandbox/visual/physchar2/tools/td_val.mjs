// ═══ physchar2/tools/td_val.mjs — TOUCHDOWN COORDINATOR validation harness (e2/TOUCHDOWN_COORDINATOR_PREREG.md). A versioned copy of tools/ab_val.mjs (the SV-2 timeline,
// trajectories, reachability pre-check, post-contact rest and λ return unchanged) with the configuration fixed to A + B (PSTAR5CHAB) and the terminal swing handled by
// ctrl/v2_touchdown.js: from the MEASURED liftoff the final-approach reference (tdPlan: tangential / orientation complete at the corridor entry, C2 low-speed corridor, bounded
// contact search), at the first MEASURED Jolt contact the accommodation to the contact anchor, then the release onto the lifecycle's contact-compatible hold (setHold) and the
// lifecycle's own load acceptance during the λ return. Replaces only E2's swing segment and hand-back. Records the touchdown quantities of the prereg (contact-point velocities,
// exact-window loads and impulses, transition continuity, penetration, rebound, slip, orientation, actuator work, contact persistence, requested vs realised load) to SUPPORT + 0.2 s.
// usage: V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node tools/td_val.mjs --human=V2-REF --side=L --hz=240 --traj=R-F --out=<file.json.gz>
import fs from "fs"; import path from "path"; import zlib from "zlib"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { e2Spec, CFG } from "../gates/v2_e2.js"; import { G3Sim, g3Def } from "../gates/v2_g3.js"; import { V, Q } from "../core/v2_math.js";
import { stepSegment, stepAt, stepRef, stepPrev, qlog } from "../ctrl/v2_swing.js"; import { tdPlan, tdAt, tdPrev, TouchdownCoordinator, TD_BETA } from "../ctrl/v2_touchdown.js"; import { FS, liftRef, stepFrame, swingFrame, candPose, landingValid, ikFeasible, certifyPath } from "../ctrl/v2_footstep.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const HUMAN = arg("human", "V2-REF"), SIDE = arg("side", "L"), HZ = +arg("hz", 240), CFGN = "PSTAR5CHAB", TID = arg("traj", "R-F"), MODE = arg("mode", "run"), OUT = arg("out", "");
// trajectory set (prereg §2): goal offsets in the stance frame (forward f, outward o) ON THE TURF (dz 0), T from the measured liftoff, apex above max(start, goal) at T/2
const SV2 = { "R-F": { set: "R", dx: 0.10, dy: 0, T: 0.60, apex: 0.030 }, "R-L": { set: "R", dx: 0, dy: 0.08, T: 0.60, apex: 0.030 },
  "C-F7": { set: "C", dx: 0.07, dy: 0, T: 0.60, apex: 0.030 }, "C-F13": { set: "C", dx: 0.13, dy: 0, T: 0.60, apex: 0.030 }, "C-L5": { set: "C", dx: 0, dy: 0.05, T: 0.60, apex: 0.030 }, "C-L11": { set: "C", dx: 0, dy: 0.11, T: 0.60, apex: 0.030 },
  "H-T45": { set: "H", dx: 0.10, dy: 0, T: 0.45, apex: 0.030 }, "H-A40": { set: "H", dx: 0.10, dy: 0, T: 0.60, apex: 0.040 }, "H-D": { set: "H", dx: 0.10, dy: 0.08, T: 0.60, apex: 0.030 }, "H-F15": { set: "H", dx: 0.15, dy: 0, T: 0.60, apex: 0.030 } };
if (!["L", "R"].includes(SIDE) || !["PSTAR5CH", "PSTAR5CHA", "PSTAR5CHB", "PSTAR5CHAB"].includes(CFGN) || !SV2[TID] || !["run", "reach"].includes(MODE)) throw new Error("args");
if (process.env.V2_KNEE_MODEL !== "v2k" || process.env.V2_ANKLE_NEUTRAL_K !== "0.13") throw new Error("E1a configuration env required");
// corridor inputs (e2/TOUCHDOWN_COORDINATOR_PREREG.md §2; from the validated A + B swing battery, evidence_ab2): lowest-sole-point tracking uncertainty in late descent (same-time,
// φ ≥ 0.75 → contact, all sets), validated reference-acceleration envelope (horizontal, vertical, angular), coarsest solver step; search hold window
const TDCFG = { uDn: 0.001530, uUp: 0.000305, dC: 0.0005, dtMax: 1 / 180, env: { aH: 2.8304, aV: 3.7427, al: 0.27, jH: 63.30, jV: 81.84 }, late: { h: 0.01106, aV: 2.6324, vV: 0.2169, jV: 49.46, jH: 29.49 } }, TDPOL = { searchHold: 0.10 };
const nL = SIDE === "L" ? 0 : 1, nS = 1 - nL, CONFIG = CFGN, FF = "on", TR = SV2[TID], HOLD = 0.5, CONTACT = ["TOUCHDOWN", "TOUCHING", "LOAD_ACCEPT", "SUPPORT", "UNLOADING"];
const mj = (u) => { u = Math.min(1, Math.max(0, u)); return u * u * u * (10 - 15 * u + 6 * u * u); };
const seg4 = (t, a, T, v0, v1) => { const u = Math.min(1, Math.max(0, (t - a) / T)), dv = v1 - v0; return [v0 + dv * mj(u), t > a && t < a + T ? dv * 30 * u * u * (1 - u) * (1 - u) / T : 0, t > a && t < a + T ? dv * 60 * u * (1 - u) * (1 - 2 * u) / (T * T) : 0]; };
const H = { tCmd: null, touchT0: null, tLo: null, sg: null, segT0: null, tC: null, early: false, hb: null, hbT0: null, cleared: null, tRet: null, tEnd: null, abortT: null, A: null, fr: null, goal: null, done: false, reach: null, failedTD: null };
const sig = (t) => { if (t <= 3) return [0.5, 0, 0]; if (t < 7) return seg4(t, 3, 4, 0.5, 1.0); if (H.tRet == null) return [1.0, 0, 0]; return seg4(t, H.tRet, 4, 1.0, 0.5); };
const lamFn = (t) => lamFn.d(t)[0]; lamFn.d = (t) => { const [v, d1, d2] = sig(t); return nS === 1 ? [v, d1, d2] : [1 - v, -d1, -d2]; };
const spec = e2Spec(HUMAN), pd = { t0: 1, dur: 2, dz: 0.025 }, def = { ...g3Def(nS === 1 ? "U:R" : "U:L"), key: "SV2", title: "swing servo validation v2", lam: lamFn, supervise: {}, holds: [], seconds: 60, push: null, torque: null };
const s = new G3Sim(J, spec, def, { stand: { ikRefTwist: true, lifecycle: true, pelvisDrop: pd, ...CFG[CONFIG], diagRecord: true, torqueLedger: true }, passiveOpts: { kneeModel: "v2k" }, ...(HZ !== 240 ? { cfg: { hz: HZ } } : {}) });
const C = s.ctrl, dt = s.dt; if (!C.o.swingAccFF || C.o.e2 !== 2 || C.o.vffRate !== "sr" || !C.o.e2reanchorVel || !!C.o.vffPelvisAir !== CONFIG.slice(8).includes("A") || !!C.o.vffPassiveRef !== CONFIG.slice(8).includes("B")) throw new Error("configuration");
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
        H.tLo = tc; H.segT0 = tc; H.plan = tdPlan(ref, H.goal, TR.T, { z: H.A.pos[1] + TR.apex, tk: 0.5 * TR.T }, solePts[nL], TDCFG);
        if (!H.plan.feasible) { H.tdInfeasible = H.plan.why; H.sg = stepSegment(ref, H.goal, TR.T, { z: H.A.pos[1] + TR.apex, tk: 0.5 * TR.T }); C.e2reanchor = nL; C.e2reanchorPrev = stepPrev(H.sg, dt); setT(stepAt(H.sg, 0)); }   // excluded from the validation
        else { H.co = new TouchdownCoordinator(TDPOL); H.co.start(H.plan, tc, H.goal); C.e2reanchor = nL; C.e2reanchorPrev = tdPrev(H.plan, dt); setT(tdAt(H.plan, 0)); H.sg = true; } }
      else if (tc - H.tCmd > 0.6) { H.done = true; H.noLift = true; H.tRet = tc + 0.2; H.tEnd = H.tRet + 4 + 3; } else setT({ pos: L.p, rot: H.A.rot, vel: L.v, acc: L.a }); }
    else if (H.co && !H.released) { const b = st[C.feet[nL]], lowP = solePts[nL].map(p => V.add(b.pos, Q.rot(b.rot, p))).reduce((m, p) => (p[1] < m[1] ? p : m));
      const o = H.co.update({ t: tc, touching: C.sense ? C.sense.touch[nL] : 0, state: f.state, footPos: b.pos, footRot: b.rot, contactPoint: lowP, terrainRot: H.goal.rot, tauAcc: lc.o.accept });
      if (o.phase === "CONTACT" && H.tC == null) { H.tC = tc; H.phiC = (tc - H.segT0) / TR.T; H.early = false; H.land = { pos: H.co.anchor.pos.slice(), rot: H.co.anchor.rot.slice() }; H.tdPhaseAtContact = tdAt(H.plan, tc - H.segT0).phase; }
      if (o.release) { lc.setHold(nL, o.anchor); lc.setSwingTarget(nL, null); H.released = true; H.cleared = tc; H.tRet = tc + HOLD; H.tEnd = H.tRet + 4 + 3; }
      else if (o.phase === "NO_CONTACT") { H.failedTD = tc; lc.setSwingTarget(nL, null); H.released = true; H.done = true; H.tRet = tc + HOLD; H.tEnd = H.tRet + 4 + 3; }
      else if (o.target) setT(o.target); }
    else if (H.sg && H.sg !== true && !H.hb) { const u = tc - H.segT0;
      if (H.tC == null && CONTACT.includes(f.state) && u > 0) { H.tC = tc; H.phiC = u / TR.T; H.early = H.phiC < FS.gate - 1e-9; const land = f.hold ? { pos: f.hold.pos.slice(), rot: f.hold.rot.slice() } : { pos: H.goal.pos.slice(), rot: H.goal.rot.slice() };
        H.land = land; H.hb = stepSegment(stepRef(H.sg, u, land.rot), land, Math.max(TR.T - u, lc.o.accept), null); H.hbT0 = tc; setT(stepAt(H.hb, 0)); }   // E2's accept(): hand-back to the landed anchor
      else if (H.tC == null && u > TR.T + FS.lateHold - 1e-9) { H.failedTD = tc; lc.setSwingTarget(nL, null); H.sg = null; H.done = true; H.tRet = tc + HOLD; H.tEnd = H.tRet + 4 + 3; }
      else if (H.tC == null) setT(stepAt(H.sg, u)); }
    else if (H.hb) { const u = tc - H.hbT0; if (u >= H.hb.T - 1e-9) { lc.setSwingTarget(nL, null); H.cleared = tc; H.hb = null; H.sg = null; H.done = true; H.tRet = tc + HOLD; H.tEnd = H.tRet + 4 + 3; } else setT(stepAt(H.hb, u)); } }
  if (H.co && H.released && H.co.phase !== "SUPPORT" && H.co.phase !== "NO_CONTACT") H.co.update({ t: tc, touching: C.sense ? C.sense.touch[nL] : 0, state: f.state });
  const cmd = oc(st, ev, dtt); s._cmd = cmd; return cmd; };
// ── run + telemetry: rows from the step command to 0.3 s after contact (full); whole-run per-tick series for continuity / energy ──
const B = spec.bodies, FT = C.feet, solePts = FT.map(fi => B[fi].shapes.filter(h => h.type === "hull").flatMap(h => h.points.map(p => V.add(p, h.pos))));
const lowAt = (n, pos, rot) => Math.min(...solePts[n].map(p => pos[1] + Q.rot(rot, p)[1])) * 1000, tilt = (q) => Math.acos(Math.min(1, Q.rot(q, [0, 1, 0])[1])) * 180 / Math.PI, yawOf = (q) => { const fw = Q.rot(q, [0, 0, 1]); return Math.atan2(fw[0], fw[2]) * 180 / Math.PI; };
const legAxes = new Set(); C.legK[nL].forEach(k => [0, 1, 2].forEach(i => legAxes.add(k * 3 + i)));
const SL = C.legK[nL].map(k => spec.joints[k].limits.soft), LO = [SL[0].lo[0], SL[0].lo[1], SL[0].lo[2], SL[1].lo[1], SL[2].lo[1], SL[2].lo[2]], HI = [SL[0].hi[0], SL[0].hi[1], SL[0].hi[2], SL[1].hi[1], SL[2].hi[1], SL[2].hi[2]];
const ankK = C.legK[nL][2];
const lt = [], rows = [], series = { t: [], dTau: [], dTau0: [], onset: [], closInc: [], wA: [], c: [] }, trans = [], hashes = {};
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
  if (H.tC != null && t > H.tC + 0.3 + 1e-9 && H.abortT == null && (lt.length === 0 || !H.supT || t <= H.supT + 0.2 + 1e-9)) { const b = st[FT[nL]], pr = s.probeRows || [null, null], lcf2 = C.lc.feet;
    if (!H.supT && lcf2[nL].state === "SUPPORT") H.supT = t; let W = 0; for (const q of s.actRes || []) if (legAxes.has(q.k * 3 + q.i)) W += q.W;
    lt.push({ t: +t.toFixed(6), st: lcf2[nL].state, s: +lcf2[nL].s.toFixed(5), touch: C.sense ? C.sense.touch[nL] : null, Fz: pr.map(r2 => (r2 ? +r2.JyN.toFixed(3) : 0)), req: +(nS === 1 ? 1 - lamFn(t) : lamFn(t)).toFixed(5), share: C.info.share ? +C.info.share[nL].toFixed(5) : null,
      p: b.pos.map(v => +v.toFixed(6)), tilt: +tilt(b.rot).toFixed(4), low: +lowAt(nL, b.pos, b.rot).toFixed(4), W: +W.toExponential(5), phase: H.co ? H.co.phase : null }); }
  if (H.tCmd != null && H.ref && (H.tC == null || t <= H.tC + 0.3 + 1e-9) && H.abortT == null && !H.reachRejected) { const b = st[FT[nL]], vO = V.add(b.v, V.cross(b.w, V.sub(b.pos, b.com))), e = H.ref, pr = s.probeRows ? s.probeRows[nL] : null;
    const lowPt = solePts[nL].map(p => V.add(b.pos, Q.rot(b.rot, p))).reduce((m, p) => (p[1] < m[1] ? p : m)), vC = V.add(b.v, V.cross(b.w, V.sub(lowPt, b.com))); let Wl = 0; for (const q of s.actRes || []) if (legAxes.has(q.k * 3 + q.i)) Wl += q.W;
    rows.push({ t: +t.toFixed(6), u: H.segT0 != null ? +(t - H.segT0).toFixed(6) : null, ph: H.tLo == null ? "lift" : H.tC == null ? "swing" : "contact", ref: { p: e.pos, v: e.vel, a: e.acc, rot: e.rot }, foot: { p: b.pos.slice(), v: vO, rot: b.rot.slice() },
      low: lowAt(nL, b.pos, b.rot), lowRef: lowAt(nL, e.pos, e.rot), tiltErr: tilt(Q.mul(Q.conj(e.rot), b.rot)), yawErr: (() => { let d = yawOf(b.rot) - yawOf(e.rot); while (d > 180) d -= 360; while (d < -180) d += 360; return d; })(),
      touch: se.touch[nL], Fz: pr ? pr.JyN : 0, st: lcf[nL].state, a: lcf[nL].a, ikErr: C.ikRes ? C.ikRes[nL] : null, legTau: [...legAxes].map(k => [k, tau[k] ?? 0, frac[k] ?? 0]), sat: [...sat].filter(k => legAxes.has(k)), dTau: dT, dTau0: dC, ff: C.info.accFF && C.info.accFF[nL] ? 1 : 0,
      xs: C.diagRec && C.diagRec[nL] ? C.diagRec[nL].x.map(v => +v.toFixed(7)) : null, margin: C.diagRec && C.diagRec[nL] ? C.diagRec[nL].x.map((v, i) => +(Math.min(v - LO[i], HI[i] - v) * 180 / Math.PI).toFixed(3)) : null,
      L: C.legK[nL].map(k => (c && c[k] ? c[k].map(r => (r && r.L ? { tau0: r.tau0, ...r.L } : null)) : null)), pasAnk: s.w.lambdaMotor(ankK).map(v => +(v / dt).toFixed(6)), wA: C.wAof ? C.wAof[nL] : 0, cw: C.cmdW ? C.cmdW[nL] : 0,
      vC, tiltW: tilt(b.rot), W: Wl, wF: b.w.slice(), pel: { p: st[C.pelvis].pos.slice(), w: st[C.pelvis].w.slice(), v: st[C.pelvis].v.slice() }, phase: H.co ? H.co.phase : null, refPhase: H.plan && H.plan.feasible && H.segT0 != null ? tdAt(H.plan, t - H.segT0).phase : null, FzS: s.probeRows && s.probeRows[nS] ? s.probeRows[nS].JyN : 0 }); }
  if (s.n % 240 === 0) hashes[String(Math.round(t))] = (s.h >>> 0).toString(16).padStart(8, "0");
  if (H.tEnd != null && t >= H.tEnd - 1e-9) break; if (t > 40) break; }
hashes.end = (s.h >>> 0).toString(16).padStart(8, "0");
const g = s.g3summary(), actAxes = []; s.act.led.forEach((row, k) => row.forEach((x, i) => { if (x && x.n) actAxes.push({ axis: spec.joints[k].name + "." + "xyz"[i], k, i, overCap: x.overCap, satTicks: x.satTicks, peakNm: x.peakNm, peakFrac: x.peakFrac }); }));
const last = C.lc.feet.map(f => f.state);
const out = { generated: "tools/td_val.mjs", prereg: "e2/TOUCHDOWN_COORDINATOR_PREREG.md", td: { cfg: TDCFG, beta: TD_BETA, plan: H.plan ? { feasible: H.plan.feasible, why: H.plan.why, te: H.plan.te, tauC: H.plan.tauC, vMax: H.plan.vMax, hE: H.plan.hE, peak: H.plan.peak, search: H.plan.search } : null, infeasible: H.tdInfeasible || null, log: H.co ? H.co.log : null, anchor: H.co && H.co.anchor ? H.co.anchor : null, tdPhaseAtContact: H.tdPhaseAtContact || null, supT: H.supT || null }, lt, human: HUMAN, side: SIDE, swing: nL, hz: HZ, ff: FF, config: CONFIG, traj: TID, tr: TR, mode: MODE, W: C.M * 9.81,
  events: { tCmd: H.tCmd, tLo: H.tLo, tC: H.tC, phiC: H.phiC ?? null, early: H.early, failedTD: H.failedTD, cleared: H.cleared, tRet: H.tRet, abortT: H.abortT, noLift: !!H.noLift, reachRejected: !!H.reachRejected, finalStates: last },
  reach: H.reach, reachAll: H.reachAll || null, goal: H.goal, land: H.land || null, anchor: H.A, trans,
  integrity: { closMax, closPos, stanceSlipMm: stanceMax, ledger: g.ledger, authorityWrites: g.ledger.authorityWrites, overCap: actAxes.reduce((s2, a) => s2 + a.overCap, 0) }, actAxes: actAxes.filter(a => legAxes.has(a.k * 3 + a.i)),
  wn: 2 * Math.PI * C.lc.o.swingHz, outcome: g.outcome, hashes, series, rows };
s.destroy(); if (OUT) fs.writeFileSync(OUT, zlib.gzipSync(JSON.stringify(out)));
if (MODE === "reach") console.log(`TDV reach ${HUMAN} ${SIDE} ${HZ} Hz: ` + Object.entries(H.reachAll || {}).map(([id, r]) => `${id} ${r.ok ? "OK" : "REJECT(" + (r.landing !== "ok" ? r.landing : !r.node ? "goal" : "path") + ")"}`).join(" "));
else console.log(`TDV ${HUMAN} ${SIDE} ${HZ} Hz ${TID} corridor ${H.plan && H.plan.feasible ? (1000 * H.plan.tauC).toFixed(0) + " ms / " + (1000 * H.plan.vMax).toFixed(1) + " mm/s" : "INFEASIBLE"} contact in ${H.tdPhaseAtContact || "—"}: reach ${H.reach ? (H.reach.ok ? "OK" : "REJECTED") : "—"}; liftoff ${H.tLo != null ? (H.tLo - H.tCmd).toFixed(3) + " s" : "NONE"}; contact φ ${H.phiC != null ? H.phiC.toFixed(3) : "—"}${H.early ? " EARLY" : ""}${H.failedTD ? " FAILED-TD" : ""}; abort ${H.abortT ?? "none"}; outcome ${g.outcome}; final ${last.join("/")}; hash ${hashes.end}`);
