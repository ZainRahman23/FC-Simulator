// ═══ physchar2/tools/td2b_val.mjs — TD2B VALIDATION harness (e2/TD2B_PREREG.md §4). A versioned copy of tools/td2_val.mjs (frozen with the TD2 battery, unchanged): the identical
// timeline, trajectories, reachability pre-check, lift reference, swing from the measured liftoff, contact sequence and recording, with --cfg ∈ PSTAR5CHAB (AB) | PSTAR5CHABTDB (TD2B,
// ctrl/v2_td2.js TD2B parameters) and --cond ∈ nominal | earlyC | lateC | earlyOOE | beyond | noground (commanded foothold dz relative to the actual turf: 0, −0.05 mm, +0.05 mm,
// −10 mm, +10 mm, +10 mm with the swing foot's turf removed from the measured liftoff). TD2B: approach to the foothold + h_B over T; settling interval; bounded search; E2's acceptance
// (measured contact accepted only at ≥ 60 % of the swing — E2 §2a; earlier contact waits for the gate) and hand-back; no contact by the planned touchdown + 0.3 s → failed touchdown →
// the bounded search CONTINUES to the planner's turf window's late edge (ctrl/v2_td2.js escalationSegment); no contact by its end + 0.3 s → explicit touchdown failure (target held,
// no λ transfer, run ends 2 s later). earlyOOE: the reachability pre-check sees the planner's foothold (dz 0). Extra recording: stance-foot state per row.
// usage: V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node tools/td2b_val.mjs --human=V2-REF --side=L --hz=240 --cfg=PSTAR5CHABTDB --traj=R-F --cond=nominal --out=<file.json.gz>
import fs from "fs"; import { TD2B, td2bOn, approachGoal, searchSegment, plannedTD, searchStart, escalationSegment } from "../ctrl/v2_td2.js"; import path from "path"; import zlib from "zlib"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { e2Spec, CFG } from "../gates/v2_e2.js"; import { G3Sim, g3Def } from "../gates/v2_g3.js"; import { V, Q } from "../core/v2_math.js";
import { stepSegment, stepAt, stepRef, stepPrev, qlog } from "../ctrl/v2_swing.js"; import { FS, liftRef, stepFrame, swingFrame, candPose, landingValid, ikFeasible, certifyPath, Tmin } from "../ctrl/v2_footstep.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const P2 = TD2B, COND = arg("cond", "nominal"), DZ = { nominal: 0, earlyC: -0.00005, lateC: 0.00005, earlyOOE: -0.010, beyond: 0.010, noground: 0.010 }[COND]; if (DZ == null) throw new Error("cond");
const TURF = COND === "noground" ? "off" : "on", DZPLAN = COND === "earlyOOE" ? 0 : DZ;   // noground: no turf for the swing foot from the measured liftoff (a deep hole); earlyOOE: the planner plans dz 0
const HUMAN = arg("human", "V2-REF"), SIDE = arg("side", "L"), HZ = +arg("hz", 240), CFGN = arg("cfg", "PSTAR5CH"), TID = arg("traj", "R-F"), MODE = arg("mode", "run"), OUT = arg("out", "");
// trajectory set (prereg §2): goal offsets in the stance frame (forward f, outward o) ON THE TURF (dz 0), T from the measured liftoff, apex above max(start, goal) at T/2
const SV2 = { "R-F": { set: "R", dx: 0.10, dy: 0, T: 0.60, apex: 0.030 }, "R-L": { set: "R", dx: 0, dy: 0.08, T: 0.60, apex: 0.030 },
  "C-F7": { set: "C", dx: 0.07, dy: 0, T: 0.60, apex: 0.030 }, "C-F13": { set: "C", dx: 0.13, dy: 0, T: 0.60, apex: 0.030 }, "C-L5": { set: "C", dx: 0, dy: 0.05, T: 0.60, apex: 0.030 }, "C-L11": { set: "C", dx: 0, dy: 0.11, T: 0.60, apex: 0.030 },
  "H-T45": { set: "H", dx: 0.10, dy: 0, T: 0.45, apex: 0.030 }, "H-A40": { set: "H", dx: 0.10, dy: 0, T: 0.60, apex: 0.040 }, "H-D": { set: "H", dx: 0.10, dy: 0.08, T: 0.60, apex: 0.030 }, "H-F15": { set: "H", dx: 0.15, dy: 0, T: 0.60, apex: 0.030 } };
if (!["L", "R"].includes(SIDE) || !["PSTAR5CHAB", "PSTAR5CHABTDB"].includes(CFGN) || !SV2[TID] || !["run", "reach"].includes(MODE)) throw new Error("args");
if (process.env.V2_KNEE_MODEL !== "v2k" || process.env.V2_ANKLE_NEUTRAL_K !== "0.13") throw new Error("E1a configuration env required");
const nL = SIDE === "L" ? 0 : 1, nS = 1 - nL, CONFIG = CFGN, FF = "on", TR = SV2[TID], HOLD = 0.5, CONTACT = ["TOUCHDOWN", "TOUCHING", "LOAD_ACCEPT", "SUPPORT", "UNLOADING"];
const mj = (u) => { u = Math.min(1, Math.max(0, u)); return u * u * u * (10 - 15 * u + 6 * u * u); };
const seg4 = (t, a, T, v0, v1) => { const u = Math.min(1, Math.max(0, (t - a) / T)), dv = v1 - v0; return [v0 + dv * mj(u), t > a && t < a + T ? dv * 30 * u * u * (1 - u) * (1 - u) / T : 0, t > a && t < a + T ? dv * 60 * u * (1 - u) * (1 - 2 * u) / (T * T) : 0]; };
const H = { tCmd: null, touchT0: null, tLo: null, sg: null, segT0: null, tC: null, early: false, hb: null, hbT0: null, cleared: null, tRet: null, tEnd: null, abortT: null, A: null, fr: null, goal: null, done: false, reach: null, failedTD: null };
const sig = (t) => { if (t <= 3) return [0.5, 0, 0]; if (t < 7) return seg4(t, 3, 4, 0.5, 1.0); if (H.tRet == null) return [1.0, 0, 0]; return seg4(t, H.tRet, 4, 1.0, 0.5); };
const lamFn = (t) => lamFn.d(t)[0]; lamFn.d = (t) => { const [v, d1, d2] = sig(t); return nS === 1 ? [v, d1, d2] : [1 - v, -d1, -d2]; };
const spec = e2Spec(HUMAN), pd = { t0: 1, dur: 2, dz: 0.025 }, def = { ...g3Def(nS === 1 ? "U:R" : "U:L"), key: "SV2", title: "swing servo validation v2", lam: lamFn, supervise: {}, holds: [], seconds: 60, push: null, torque: null };
const s = new G3Sim(J, spec, def, { stand: { ikRefTwist: true, lifecycle: true, pelvisDrop: pd, ...CFG[CONFIG], diagRecord: true, torqueLedger: true }, passiveOpts: { kneeModel: "v2k" }, ...(HZ !== 240 || TURF === "off" ? { cfg: { ...(HZ !== 240 ? { hz: HZ } : {}), ...(TURF === "off" ? { diagNoGround: true } : {}) } } : {}) });
const C = s.ctrl, dt = s.dt; if (!C.o.swingAccFF || C.o.e2 !== 2 || C.o.vffRate !== "sr" || !C.o.e2reanchorVel || !!C.o.vffPelvisAir !== CONFIG.slice(8).includes("A") || !!C.o.vffPassiveRef !== CONFIG.slice(8).includes("B") || !!C.o.d1FloatBase || !!C.o.lcTransition || td2bOn(C.o) !== (CONFIG === "PSTAR5CHABTDB") || (CONFIG === "PSTAR5CHAB" && COND !== "nominal")) throw new Error("configuration");
const TDON = td2bOn(C.o);
const setT = (e) => { C.lc.setSwingTarget(nL, { pos: e.pos, rot: e.rot }); if (!C.swingRef) C.swingRef = [null, null]; C.swingRef[nL] = { vel: e.vel.slice(), acc: e.acc.slice(), w: (e.w || [0, 0, 0]).slice(), al: (e.al || [0, 0, 0]).slice() }; H.ref = e; };
// the planner's reachability certifier, posed exactly as the E2 planner poses a commanded step (predicted liftoff state, knot at T/2 of the post-liftoff swing, swing frame now)
function reachCheck(st, tr) { const X = { ctrl: C, st: C.e2st, ev: C.e2ev, n: nL, pel: swingFrame(C, st, nL) }, goal = candPose(H.A, H.fr, tr.dx, tr.dy, DZPLAN), L = liftRef(H.A, FS.liftDelayPlan);
  const sg = stepSegment({ p: L.p, v: L.v, a: L.a, th: [0, 0, 0], w: [0, 0, 0], al: [0, 0, 0] }, goal, tr.T, { z: H.A.pos[1] + tr.apex, tk: 0.5 * tr.T });
  const geo = landingValid(C, X.st, nL, goal, H.fr), node = ikFeasible(C, X.st, X.ev, nL, X.pel, goal), path = certifyPath(X, sg);
  return { ok: !!(geo.ok && node && path.ok), landing: geo.ok ? "ok" : geo.why, node, path: path.verdicts }; }
const oc = C.compute.bind(C);
C.compute = (st, ev, dtt) => { const tc = C.n * dtt, lc = C.lc, f = lc.feet[nL], g = C.g3;
  if (g && g.aborted != null && H.abortT == null) { H.abortT = g.aborted; H.tEnd = tc + 6; }
  if (H.abortT == null && !H.done) {
    if (H.tCmd == null) { if (f.state === "TOUCHING") { if (H.touchT0 == null) H.touchT0 = tc; } else H.touchT0 = null;
      if (tc >= 7 - 1e-9 && H.touchT0 != null && tc - H.touchT0 >= 0.5 - 1e-9 && C.e2st) { H.tCmd = tc; const a = lc.target(nL); H.A = { pos: a.pos.slice(), rot: a.rot.slice() }; H.fr = stepFrame(C, st, nL); H.goal = candPose(H.A, H.fr, TR.dx, TR.dy, DZ);
        if (MODE === "reach") { H.reachAll = Object.fromEntries(Object.entries(SV2).map(([id, tr]) => [id, reachCheck(st, tr)])); H.done = true; H.tEnd = tc; }
        else { H.reach = reachCheck(st, TR); if (!H.reach.ok) { H.done = true; H.reachRejected = true; H.tRet = tc + 0.2; H.tEnd = H.tRet + 4 + 3; } } } }
    if (H.tCmd != null && H.tLo == null && !H.done) { const L = liftRef(H.A, tc - H.tCmd);
      if (f.state === "AIRBORNE") { const b = st[C.feet[nL]], ref = { p: b.pos.slice(), v: V.add(b.v, V.cross(b.w, V.sub(b.pos, b.com))), a: L.a.slice(), th: qlog(Q.mul(Q.conj(H.A.rot), b.rot)), w: Q.rot(Q.conj(H.A.rot), b.w), al: [0, 0, 0] };
        if (TURF === "off") s.w.setNoGround(C.feet[nL], true); H.tLo = tc; H.segT0 = tc; const gA = TDON ? approachGoal(H.goal, P2) : H.goal; H.sg = stepSegment(ref, gA, TR.T, { z: H.A.pos[1] + TR.apex, tk: 0.5 * TR.T }); if (TDON) H.gA = gA; C.e2reanchor = nL; C.e2reanchorPrev = stepPrev(H.sg, dt); setT(stepAt(H.sg, 0)); }
      else if (tc - H.tCmd > 0.6) { H.done = true; H.noLift = true; H.tRet = tc + 0.2; H.tEnd = H.tRet + 4 + 3; } else setT({ pos: L.p, rot: H.A.rot, vel: L.v, acc: L.a }); }
    else if (H.sg && !H.hb) { const u = tc - H.segT0;
      if (TDON && !H.srch && u >= searchStart(TR.T, P2) - 1e-9) { H.srch = searchSegment(H.gA, P2); H.srchT0 = H.segT0 + searchStart(TR.T, P2); }   // after the settling interval at the band top, the bounded search (from rest)
      const cur = H.re ? [H.re, tc - H.reT0] : H.srch ? [H.srch, tc - H.srchT0] : [H.sg, u];   // the currently commanded segment and its time
      const contact = CONTACT.includes(f.state) && u > 0; if (contact && H.tC == null && H.earlySeen == null && TDON && u / TR.T < FS.gate - 1e-9) H.earlySeen = tc;   // E2 §2a: early contact (< 60 %) waits for the gate
      if (H.tC == null && contact && (!TDON || u / TR.T >= FS.gate - 1e-9)) { H.tC = tc; H.phiC = u / TR.T; H.early = H.phiC < FS.gate - 1e-9; const land = f.hold ? { pos: f.hold.pos.slice(), rot: f.hold.rot.slice() } : { pos: H.goal.pos.slice(), rot: H.goal.rot.slice() };
        // E2's accept(): hand-back to the landed anchor from the CURRENT commanded segment's reference state over max(its remaining time, accept)
        H.tdPhase = H.re ? "escalated search" : H.srch ? "search" : "approach"; H.land = land; H.hb = stepSegment(stepRef(cur[0], cur[1], land.rot), land, Math.max(cur[0].T - cur[1], lc.o.accept), null); H.hbT0 = tc; setT(stepAt(H.hb, 0)); }
      // TD2B escalation (e2/TD2B_PREREG.md §2): no contact by the planned touchdown + E2's late hold → failed touchdown → the bounded search CONTINUES (search invariants) down to the planner's
      // turf window's late edge (anchor height + h_B − D_max); no depth left → explicit failure
      else if (H.tC == null && TDON && !H.re && !H.tdFail && u > plannedTD(TR.T, P2) + FS.lateHold - 1e-9) { H.failedTD = tc; const e0 = stepAt(cur[0], cur[1]), floorY = H.A.pos[1] + P2.hB - P2.Dmax;
        H.re = escalationSegment({ pos: e0.pos, rot: H.goal.rot }, floorY, P2); if (H.re) { H.reT0 = tc; H.reFloor = floorY; setT(stepAt(H.re, 0)); } else { H.tdFail = tc; H.done = true; H.tEnd = tc + 2.0; setT(e0); } }
      // explicit touchdown failure (out of envelope): no contact by the escalated search's end + 0.3 s — the target is held, no further descent, nothing declared, no λ transfer
      else if (H.tC == null && TDON && H.re && !H.tdFail && tc - H.reT0 > H.re.T + FS.lateHold - 1e-9) { H.tdFail = tc; H.done = true; H.tEnd = tc + 2.0; setT(stepAt(H.re, H.re.T)); }
      else if (H.tC == null && !TDON && u > TR.T + FS.lateHold - 1e-9) { H.failedTD = tc; lc.setSwingTarget(nL, null); H.sg = null; H.done = true; H.tRet = tc + HOLD; H.tEnd = H.tRet + 4 + 3; }
      else if (H.tC == null) setT(stepAt(cur[0], cur[1])); }
    else if (H.hb) { const u = tc - H.hbT0; if (u >= H.hb.T - 1e-9) { lc.setSwingTarget(nL, null); H.cleared = tc; H.hb = null; H.sg = null; H.done = true; H.tRet = tc + HOLD; H.tEnd = H.tRet + 4 + 3; } else setT(stepAt(H.hb, u)); } }
  const cmd = oc(st, ev, dtt); s._cmd = cmd; return cmd; };
// ── run + telemetry: rows from the step command to 0.3 s after contact (full); whole-run per-tick series for continuity / energy ──
const B = spec.bodies, FT = C.feet, solePts = FT.map(fi => B[fi].shapes.filter(h => h.type === "hull").flatMap(h => h.points.map(p => V.add(p, h.pos))));
const PCB = 0.002815;   // potential-contact points: within the certified window's width of the lowest point (u_dn 2.265 + d_c 0.5 + Δ_T 0.05 mm; e2/TD2B_PREREG.md §1)
const solePV = (n, b) => solePts[n].map(p => { const r = Q.rot(b.rot, p), w = V.add(b.pos, r), v = V.add(b.v, V.cross(b.w, V.sub(w, b.com))); return { y: w[1], vy: v[1], vt: Math.hypot(v[0], v[2]), p: w }; });
const pcVel = (n, b) => { const P = solePV(n, b), lo = Math.min(...P.map(q => q.y)), S = P.filter(q => q.y <= lo + PCB); return { vN: Math.max(...S.map(q => -q.vy)), vT: Math.max(...S.map(q => q.vt)), np: S.length }; };
const lowAt = (n, pos, rot) => Math.min(...solePts[n].map(p => pos[1] + Q.rot(rot, p)[1])) * 1000, tilt = (q) => Math.acos(Math.min(1, Q.rot(q, [0, 1, 0])[1])) * 180 / Math.PI, yawOf = (q) => { const fw = Q.rot(q, [0, 0, 1]); return Math.atan2(fw[0], fw[2]) * 180 / Math.PI; };
const legAxes = new Set(); C.legK[nL].forEach(k => [0, 1, 2].forEach(i => legAxes.add(k * 3 + i)));
const SL = C.legK[nL].map(k => spec.joints[k].limits.soft), LO = [SL[0].lo[0], SL[0].lo[1], SL[0].lo[2], SL[1].lo[1], SL[2].lo[1], SL[2].lo[2]], HI = [SL[0].hi[0], SL[0].hi[1], SL[0].hi[2], SL[1].hi[1], SL[2].hi[1], SL[2].hi[2]];
const ankK = C.legK[nL][2];
const rows = [], series = { t: [], dTau: [], dTau0: [], onset: [], closInc: [], wA: [], c: [] }, trans = [], hashes = {}, post = []; let t1 = null, contact1 = null, tSup = null;
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
      L: C.legK[nL].map(k => (c && c[k] ? c[k].map(r => (r && r.L ? { tau0: r.tau0, K: r.K, D: r.D, ...r.L } : null)) : null)), wPT: C.diagRec && C.diagRec[nL] ? C.legK[nL].map(k => [C.diagRec[nL].wP[k] || null, C.diagRec[nL].wT[k] || null]) : null, pasAnk: s.w.lambdaMotor(ankK).map(v => +(v / dt).toFixed(6)), wA: C.wAof ? C.wAof[nL] : 0, cw: C.cmdW ? C.cmdW[nL] : 0,
      wF: b.w.slice(), pelW: st[C.pelvis].w.slice(), pc: pcVel(nL, b),
      srch: H.srch && H.tC == null ? 1 : 0, re: H.re && H.tC == null ? 1 : 0, stS: lcf[nS].state }); }
  if (H.tLo != null && t1 == null && se.touch[nL] > 0 && t > H.tLo) { t1 = +t.toFixed(6); const b = st[FT[nL]]; contact1 = { t: t1, pts: solePV(nL, b).map(q => ({ y: q.y, vy: q.vy, vt: q.vt })), w: b.w.slice(), v: b.v.slice() }; }
  if (t1 != null && tSup == null && lcf[nL].state === "SUPPORT") tSup = +t.toFixed(6);
  if (t1 != null && (tSup == null || t <= tSup + 0.1 + 1e-9)) { const b = st[FT[nL]]; post.push({ t: +t.toFixed(6), p: [b.pos[0], b.pos[2]], yaw: +yawOf(b.rot).toFixed(4), low: lowAt(nL, b.pos, b.rot), st: lcf[nL].state, Fz: s.probeRows && s.probeRows[nL] ? s.probeRows[nL].JyN : 0, touch: se.touch[nL] }); }
  if (s.n % 240 === 0) hashes[String(Math.round(t))] = (s.h >>> 0).toString(16).padStart(8, "0");
  if (H.tEnd != null && t >= H.tEnd - 1e-9) break; if (t > 40) break; }
hashes.end = (s.h >>> 0).toString(16).padStart(8, "0");
const g = s.g3summary(), actAxes = []; s.act.led.forEach((row, k) => row.forEach((x, i) => { if (x && x.n) actAxes.push({ axis: spec.joints[k].name + "." + "xyz"[i], k, i, overCap: x.overCap, satTicks: x.satTicks, peakNm: x.peakNm, peakFrac: x.peakFrac }); }));
const last = C.lc.feet.map(f => f.state);
const out = { generated: "tools/td2b_val.mjs", prereg: "e2/TD2B_PREREG.md", td2: { turf: TURF, cond: COND, dz: DZ, dzPlan: DZPLAN, on: TDON, params: TDON ? P2 : null, srchT0: H.srchT0 ?? null, plannedTD: TDON && H.tLo != null ? H.tLo + plannedTD(TR.T, P2) : null, tdPhase: H.tdPhase ?? null, failedTD: H.failedTD ?? null, reT0: H.reT0 ?? null, reT: H.re ? H.re.T : null, reFloor: H.reFloor ?? null, tdFail: H.tdFail ?? null, earlySeen: H.earlySeen ?? null, acceptPhi: H.phiC ?? null }, t1, tSup, contact1, post, lowRest: H.A ? lowAt(nL, H.A.pos, H.A.rot) : null, human: HUMAN, side: SIDE, swing: nL, hz: HZ, ff: FF, config: CONFIG, traj: TID, tr: TR, mode: MODE, W: C.M * 9.81,
  events: { tCmd: H.tCmd, tLo: H.tLo, tC: H.tC, phiC: H.phiC ?? null, early: H.early, failedTD: H.failedTD, cleared: H.cleared, tRet: H.tRet, abortT: H.abortT, noLift: !!H.noLift, reachRejected: !!H.reachRejected, finalStates: last },
  reach: H.reach, reachAll: H.reachAll || null, goal: H.goal, land: H.land || null, anchor: H.A, trans,
  integrity: { closMax, closPos, stanceSlipMm: stanceMax, ledger: g.ledger, authorityWrites: g.ledger.authorityWrites, overCap: actAxes.reduce((s2, a) => s2 + a.overCap, 0) }, actAxes: actAxes.filter(a => legAxes.has(a.k * 3 + a.i)),
  wn: 2 * Math.PI * C.lc.o.swingHz, outcome: g.outcome, hashes, series, rows };
s.destroy(); if (OUT) fs.writeFileSync(OUT, zlib.gzipSync(JSON.stringify(out)));
if (MODE === "reach") console.log(`FBV reach ${HUMAN} ${SIDE} ${HZ} Hz: ` + Object.entries(H.reachAll || {}).map(([id, r]) => `${id} ${r.ok ? "OK" : "REJECT(" + (r.landing !== "ok" ? r.landing : !r.node ? "goal" : "path") + ")"}`).join(" "));
else console.log(`TD2BV ${COND} ${HUMAN} ${SIDE} ${HZ} Hz ${CONFIG} ${TID}: reach ${H.reach ? (H.reach.ok ? "OK" : "REJECTED") : "—"}; liftoff ${H.tLo != null ? (H.tLo - H.tCmd).toFixed(3) + " s" : "NONE"}; contact φ ${H.phiC != null ? H.phiC.toFixed(3) : "—"}${H.early ? " EARLY" : ""}${H.failedTD ? " FAILED-TD" : ""}; abort ${H.abortT ?? "none"}; outcome ${g.outcome}; final ${last.join("/")}; hash ${hashes.end}`);
