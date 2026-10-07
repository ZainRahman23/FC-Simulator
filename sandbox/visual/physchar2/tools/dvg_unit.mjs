// ═══ physchar2/tools/dvg_unit.mjs — DVG CONTROLLER-LEVEL MIRROR TEST (e2/DVG_PREREG.md CQ-3 (a)). A versioned copy of tools/d1g_unit.mjs (frozen with the D1G battery): the reach-stress
// timeline of tools/dvg_val.mjs on the LEFT leg at 240 Hz with DVG (PSTAR5CHABV); at every 3rd DVG evaluation of the left leg from liftoff the EXACT inputs (body states, the law's frame
// and target, the swing reference and the statics' common acceleration) are mirrored (x → −x; L ↔ R) into a mirror instance, which evaluates the DVG verdict for its RIGHT leg: V1 its
// bounded IK, V2 λmin(J_fᵀJ_f), V3 finiteness, V4 the torque feasibility at wq = max(its own max|ẋ_D1|, the mirror-invariant max|ω*| of the left leg's joint-rate feed-forward).
// IK-fold samples (the two solves differ in reach class and the unreached side ends with a coordinate on its soft bound) are flagged (TD-17).
// usage: V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node tools/dvg_unit.mjs --human=V2-REF --cond=deep --out=<file.json.gz>
import { IK } from "../ctrl/v2_stand.js"; import fs from "fs"; import { TD2B, td2bOn, approachGoal, searchSegment, plannedTD, searchStart, escalationSegment } from "../ctrl/v2_td2.js"; import path from "path"; import zlib from "zlib"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { e2Spec, CFG } from "../gates/v2_e2.js"; import { G3Sim, g3Def } from "../gates/v2_g3.js"; import { V, Q } from "../core/v2_math.js";
import { stepSegment, stepAt, stepRef, stepPrev, qlog } from "../ctrl/v2_swing.js"; import { FS, liftRef, stepFrame, swingFrame, candPose, landingValid, ikFeasible, certifyPath, Tmin } from "../ctrl/v2_footstep.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const COND = arg("cond", "deep"), RS = { deep: { dx: 0, dy: 0, dz: -0.12 }, far: { dx: 0.35, dy: 0, dz: 0 }, diag: { dx: 0.20, dy: 0.10, dz: -0.08 } }[COND]; if (!RS) throw new Error("cond"); const DZ = RS.dz, HOLDR = 1.5;
const TURF = "off", DZPLAN = DZ;   // noground: no turf for the swing foot from the measured liftoff (a deep hole); earlyOOE: the planner plans dz 0
const HUMAN = arg("human", "V2-REF"), SIDE = "L", HZ = 240, CFGN = "PSTAR5CHABV", TID = "R-F", MODE = "run", OUT = arg("out", "");
// trajectory set (prereg §2): goal offsets in the stance frame (forward f, outward o) ON THE TURF (dz 0), T from the measured liftoff, apex above max(start, goal) at T/2
const SV2 = { "R-F": { set: "R", dx: 0.10, dy: 0, T: 0.60, apex: 0.030 }, "R-L": { set: "R", dx: 0, dy: 0.08, T: 0.60, apex: 0.030 },
  "C-F7": { set: "C", dx: 0.07, dy: 0, T: 0.60, apex: 0.030 }, "C-F13": { set: "C", dx: 0.13, dy: 0, T: 0.60, apex: 0.030 }, "C-L5": { set: "C", dx: 0, dy: 0.05, T: 0.60, apex: 0.030 }, "C-L11": { set: "C", dx: 0, dy: 0.11, T: 0.60, apex: 0.030 },
  "H-T45": { set: "H", dx: 0.10, dy: 0, T: 0.45, apex: 0.030 }, "H-A40": { set: "H", dx: 0.10, dy: 0, T: 0.60, apex: 0.040 }, "H-D": { set: "H", dx: 0.10, dy: 0.08, T: 0.60, apex: 0.030 }, "H-F15": { set: "H", dx: 0.15, dy: 0, T: 0.60, apex: 0.030 } };
if (!["L", "R"].includes(SIDE) || !["PSTAR5CHAB", "PSTAR5CHABV"].includes(CFGN) || !SV2[TID] || !["run", "reach"].includes(MODE)) throw new Error("args");
if (process.env.V2_KNEE_MODEL !== "v2k" || process.env.V2_ANKLE_NEUTRAL_K !== "0.13") throw new Error("E1a configuration env required");
const nL = SIDE === "L" ? 0 : 1, nS = 1 - nL, CONFIG = CFGN, FF = "on", TR = { ...SV2[TID], dx: RS.dx, dy: RS.dy }, HOLD = 0.5, CONTACT = ["TOUCHDOWN", "TOUCHING", "LOAD_ACCEPT", "SUPPORT", "UNLOADING"];
const mj = (u) => { u = Math.min(1, Math.max(0, u)); return u * u * u * (10 - 15 * u + 6 * u * u); };
const seg4 = (t, a, T, v0, v1) => { const u = Math.min(1, Math.max(0, (t - a) / T)), dv = v1 - v0; return [v0 + dv * mj(u), t > a && t < a + T ? dv * 30 * u * u * (1 - u) * (1 - u) / T : 0, t > a && t < a + T ? dv * 60 * u * (1 - u) * (1 - 2 * u) / (T * T) : 0]; };
const H = { tCmd: null, touchT0: null, tLo: null, sg: null, segT0: null, tC: null, early: false, hb: null, hbT0: null, cleared: null, tRet: null, tEnd: null, abortT: null, A: null, fr: null, goal: null, done: false, reach: null, failedTD: null };
const sig = (t) => { if (t <= 3) return [0.5, 0, 0]; if (t < 7) return seg4(t, 3, 4, 0.5, 1.0); if (H.tRet == null) return [1.0, 0, 0]; return seg4(t, H.tRet, 4, 1.0, 0.5); };
const lamFn = (t) => lamFn.d(t)[0]; lamFn.d = (t) => { const [v, d1, d2] = sig(t); return nS === 1 ? [v, d1, d2] : [1 - v, -d1, -d2]; };
const spec = e2Spec(HUMAN), pd = { t0: 1, dur: 2, dz: 0.025 }, def = { ...g3Def(nS === 1 ? "U:R" : "U:L"), key: "SV2", title: "swing servo validation v2", lam: lamFn, supervise: {}, holds: [], seconds: 60, push: null, torque: null };
const s = new G3Sim(J, spec, def, { stand: { ikRefTwist: true, lifecycle: true, pelvisDrop: pd, ...CFG[CONFIG], diagRecord: true, torqueLedger: true }, passiveOpts: { kneeModel: "v2k" }, ...(HZ !== 240 || TURF === "off" ? { cfg: { ...(HZ !== 240 ? { hz: HZ } : {}), ...(TURF === "off" ? { diagNoGround: true } : {}) } } : {}) });
const C = s.ctrl, dt = s.dt; if (!C.o.swingAccFF || C.o.e2 !== 2 || C.o.vffRate !== "sr" || !C.o.e2reanchorVel || !!C.o.vffPelvisAir !== CONFIG.slice(8).includes("A") || !!C.o.vffPassiveRef !== CONFIG.slice(8).includes("B") || !!C.o.d1FloatBase || !!C.o.lcTransition || td2bOn(C.o) || C.o.d1Guard !== 2) throw new Error("configuration");
const TDON = false;
// ── the mirror instance and the probe ──
const sB = new G3Sim(J, spec, { ...def, ...g3Def(nS === 1 ? "U:L" : "U:R"), key: "SV2M", lam: (t) => 1 - lamFn(t), supervise: {}, holds: [], seconds: 60, push: null, torque: null }, { stand: { ikRefTwist: true, lifecycle: true, pelvisDrop: pd, ...CFG[CONFIG], diagRecord: true, torqueLedger: true }, passiveOpts: { kneeModel: "v2k" } });
const CB = sB.ctrl, m3 = (p) => [-p[0], p[1], p[2]], mq = (q) => [q[0], -q[1], -q[2], q[3]], mw = (w) => [w[0], -w[1], -w[2]];
const bmap = spec.bodies.map(b => spec.bodies.findIndex(x => x.name === (b.name.endsWith("_L") ? b.name.slice(0, -2) + "_R" : b.name.endsWith("_R") ? b.name.slice(0, -2) + "_L" : b.name)));
const jmap = spec.joints.map(j => spec.joints.findIndex(x => x.name === (j.name.endsWith("_L") ? j.name.slice(0, -2) + "_R" : j.name.endsWith("_R") ? j.name.slice(0, -2) + "_L" : j.name)));
const mirrorSt = (st) => bmap.map(i => ({ ...st[i], pos: m3(st[i].pos), rot: mq(st[i].rot), com: m3(st[i].com), v: m3(st[i].v), w: mw(st[i].w) }));
const symErr = Math.max(...mirrorSt(sB.st).map((x, i) => Math.hypot(...x.pos.map((v, j) => v - sB.st[i].pos[j]))));   // the posed initial state's mirror symmetry (m)
const PROBE = [], lastIK = [null, null], lastIn = [null, null]; let nEval = 0;
{ const ikB = C.legIKBounded.bind(C), saw = C.swingAccWrench.bind(C), gst = C.dvgStep.bind(C);
  C.legIKBounded = function (st, ev, n, pP, qP, tgt, bo) { const r = ikB(st, ev, n, pP, qP, tgt, bo); lastIK[n] = { tgt: tgt ? { pos: tgt.pos.slice(), rot: tgt.rot.slice() } : null, bo }; return r; };
  C.swingAccWrench = function (st, ev, n, fr, x, ref, A, pel) { lastIn[n] = { ref: { vel: ref.vel.slice(), acc: ref.acc.slice(), w: ref.w.slice(), al: ref.al.slice(), vPel: (ref.vPel || [0, 0, 0]).slice() }, A: A.slice(), pel }; return saw(st, ev, n, fr, x, ref, A, pel); };
  C.dvgStep = function (n, L, dtt, st, ev) { gst(n, L, dtt, st, ev); const G = C.dvg[n], fr = L.fr, a = L.ffOn ? L.accFF : null;
    if (n === nL && H.tLo != null && lastIK[n] && lastIK[n].tgt && (!L.ffOn || (lastIn[n] && !lastIn[n].pel)) && (nEval++ % 3 === 0)) { const m = 1 - n, stM = mirrorSt(st), evM = sB.P.compute(stM, sB.dt).ev, frM = { pos: m3(fr.pos), rot: mq(fr.rot) }, tgtM = { pos: m3(lastIK[n].tgt.pos), rot: mq(lastIK[n].tgt.rot) };
      const rB = CB.legIKBounded(stM, evM, m, frM.pos, frM.rot, tgtM, lastIK[n].bo), I = lastIn[n], aB = L.ffOn ? CB.swingAccWrench(stM, evM, m, frM, rB.x, { vel: m3(I.ref.vel), acc: m3(I.ref.acc), w: mw(I.ref.w), al: mw(I.ref.al), vPel: m3(I.ref.vPel) }, m3(I.A), null) : null;
      const ratesA = C.legK[n].flatMap(k => G.fresh.w[k] || []), refsA = C.legK[n].flatMap(k => G.fresh.wr[k] || []), lamB = aB ? aB.lam : CB.jfLam(stM, evM, m, frM, rB.x), okRB = rB.err <= 1e-6, okCB = lamB >= IK.srEps * IK.srEps;
      const okFB = (!L.ffOn || (!!aB && Object.values(aB.T).every(v => v.every(Number.isFinite)) && aB.xd.every(Number.isFinite))) && ratesA.every(Number.isFinite) && refsA.every(Number.isFinite);
      const wqB = Math.max(aB ? Math.max(...aB.xd.map(v => Math.abs(v))) : 0, ratesA.length ? Math.max(...ratesA.map(v => Math.abs(v))) : 0), ratB = okRB && okCB && okFB ? CB.dvgFeasible(stM, evM, m, frM, rB, aB ? aB.T : null, wqB) : null, okTB = ratB != null && ratB <= 1;
      let dRel = 0, dAbs = 0, dTol = -Infinity; if (a && aB) for (const k of C.legK[n]) { const kB = jmap[k], tA = mw(a.T[k]), tB = aB.T[kB]; if (!tA || !tB) continue; for (let i = 0; i < 3; i++) { const d = Math.abs(tA[i] - tB[i]); dAbs = Math.max(dAbs, d); dRel = Math.max(dRel, d / Math.max(1e-6, Math.abs(tA[i]))); dTol = Math.max(dTol, d - (1e-6 * Math.abs(tA[i]) + 1e-6)); } }
      const reA = G.err <= 1e-6, reB = rB.err <= 1e-6, fold = reA !== reB && (reA ? rB.atBound.some(Boolean) : L.r.atBound.some(Boolean));
      PROBE.push({ t: +(C.n * dtt).toFixed(6), fold, A: { okR: G.okR, okC: G.okC, okF: G.okF, okT: G.okT, err: G.err, lam: G.lam, tRatio: G.tRatio, wq: G.wq }, B: { okR: okRB, okC: okCB, okF: okFB, okT: okTB, err: rB.err, lam: lamB, tRatio: ratB, wq: wqB }, dAbs, dRel, dTol }); } }; }
const setT = (e) => { C.lc.setSwingTarget(nL, { pos: e.pos, rot: e.rot }); if (!C.swingRef) C.swingRef = [null, null]; C.swingRef[nL] = { vel: e.vel.slice(), acc: e.acc.slice(), w: (e.w || [0, 0, 0]).slice(), al: (e.al || [0, 0, 0]).slice() }; H.ref = e; };
// the planner's reachability certifier, posed exactly as the E2 planner poses a commanded step (predicted liftoff state, knot at T/2 of the post-liftoff swing, swing frame now)
function reachCheck(st, tr) { const X = { ctrl: C, st: C.e2st, ev: C.e2ev, n: nL, pel: swingFrame(C, st, nL) }, goal = candPose(H.A, H.fr, tr.dx, tr.dy, DZPLAN), L = liftRef(H.A, FS.liftDelayPlan);
  const sg = stepSegment({ p: L.p, v: L.v, a: L.a, th: [0, 0, 0], w: [0, 0, 0], al: [0, 0, 0] }, goal, tr.T, { z: H.A.pos[1] + tr.apex, tk: 0.5 * tr.T });
  const geo = landingValid(C, X.st, nL, goal, H.fr), node = ikFeasible(C, X.st, X.ev, nL, X.pel, goal), path = certifyPath(X, sg);
  return { ok: !!(geo.ok && node && path.ok), landing: geo.ok ? "ok" : geo.why, node, path: path.verdicts }; }
const oc = C.compute.bind(C);
// REACH STRESS (e2/D1G_TD2C_PREREG.md §I.4 set R): the AB swing from the measured liftoff to a foothold BEYOND leg reach (the pre-check is evaluated and recorded, not enforced), the swing
// foot's turf removed at liftoff (no contact, no terrain); after T the final target is held (zero reference velocity / acceleration) for HOLDR; the run then ends. No λ return
C.compute = (st, ev, dtt) => { const tc = C.n * dtt, lc = C.lc, f = lc.feet[nL], g = C.g3;
  if (g && g.aborted != null && H.abortT == null) { H.abortT = g.aborted; H.tEnd = tc + 3; }
  if (H.abortT == null && !H.done) {
    if (H.tCmd == null) { if (f.state === "TOUCHING") { if (H.touchT0 == null) H.touchT0 = tc; } else H.touchT0 = null;
      if (tc >= 7 - 1e-9 && H.touchT0 != null && tc - H.touchT0 >= 0.5 - 1e-9 && C.e2st) { H.tCmd = tc; const a = lc.target(nL); H.A = { pos: a.pos.slice(), rot: a.rot.slice() }; H.fr = stepFrame(C, st, nL); H.goal = candPose(H.A, H.fr, TR.dx, TR.dy, DZ); H.reach = reachCheck(st, TR); } }
    if (H.tCmd != null && H.tLo == null) { const L = liftRef(H.A, tc - H.tCmd);
      if (f.state === "AIRBORNE") { const b = st[C.feet[nL]], ref = { p: b.pos.slice(), v: V.add(b.v, V.cross(b.w, V.sub(b.pos, b.com))), a: L.a.slice(), th: qlog(Q.mul(Q.conj(H.A.rot), b.rot)), w: Q.rot(Q.conj(H.A.rot), b.w), al: [0, 0, 0] };
        s.w.setNoGround(C.feet[nL], true); H.tLo = tc; H.segT0 = tc; H.sg = stepSegment(ref, H.goal, TR.T, { z: H.A.pos[1] + TR.apex, tk: 0.5 * TR.T }); C.e2reanchor = nL; C.e2reanchorPrev = stepPrev(H.sg, dt); setT(stepAt(H.sg, 0)); }
      else if (tc - H.tCmd > 0.6) { H.done = true; H.noLift = true; H.tEnd = tc + 1; } else setT({ pos: L.p, rot: H.A.rot, vel: L.v, acc: L.a }); }
    else if (H.sg) { const u = tc - H.segT0; if (CONTACT.includes(f.state) && u > 0 && H.tC == null) H.tC = tc;   // (no turf: a contact would be a test defect, recorded)
      if (u >= TR.T + HOLDR - 1e-9) { H.done = true; H.tEnd = tc; setT(stepAt(H.sg, TR.T)); } else setT(stepAt(H.sg, Math.min(u, TR.T))); } }
  else if (H.sg && H.abortT == null) setT(stepAt(H.sg, TR.T));
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
const rows = [], series = { t: [], dTau: [], dTau0: [], onset: [], closInc: [], wA: [], c: [], onS: [], gm: [], gw: [], gv: [], cmdMax: [] }, trans = [], hashes = {}, post = [], gtr = [], GM = { PASS: 0, FADE: 1, OFF: 2, RAMP: 3 }; let nonFinCmd = 0, nonFinSt = 0, prevGm = -1, prevGE = null, d1gEvals = 0, d1gInvalid = 0, d1gFirstInvalid = null; let t1 = null, contact1 = null, tSup = null;
let prevTau = null, prevCmd = null, prevE = null, prevW = null, closMax = -Infinity, closPos = 0, prevTouch = null, prevSt = null, stance0 = null, stanceMax = 0;
while (true) { if (!s.tick()) break; const t = s.n * dt, st = s.st, se = C.sense, c = s._cmd, lcf = C.lc.feet;
  const tau = {}, sat = new Set(), frac = {}; for (const r of s.actRes || []) { tau[r.k * 3 + r.i] = r.tau; if (r.sat) sat.add(r.k * 3 + r.i); frac[r.k * 3 + r.i] = r.frac; }
  let dT = 0; if (prevTau) for (const key in tau) dT = Math.max(dT, Math.abs(tau[key] - (prevTau[key] ?? tau[key]))); prevTau = tau;
  let dC = 0; if (prevCmd && c) c.forEach((ax, k) => ax && ax.forEach((r, i) => { const p = prevCmd[k] && prevCmd[k][i]; if (r && p) dC = Math.max(dC, Math.abs(r.tau0 - p.tau0)); })); prevCmd = c;
  const L = s.ledger, E = s.last.E, W = L.Wact + L.Wext - L.damping, dCl = prevE == null ? 0 : (E - prevE) - (W - prevW); prevE = E; prevW = W; closMax = Math.max(closMax, dCl); closPos += Math.max(0, dCl);
  const onset = se.touch.map((x, n) => !!(prevTouch && prevTouch[n] === 0 && x > 0)); prevTouch = se.touch.slice();
  const sts = lcf.map(x => x.state); if (prevSt) for (const n of [0, 1]) if (sts[n] !== prevSt[n]) trans.push({ t: +t.toFixed(6), n, from: prevSt[n], to: sts[n], touch: se.touch[n] }); prevSt = sts;
  series.t.push(+t.toFixed(6)); series.dTau.push(+dT.toFixed(5)); series.dTau0.push(+dC.toFixed(5)); series.onset.push(onset[0] || onset[1] ? 1 : 0); series.closInc.push(+dCl.toExponential(4));
  series.wA.push(C.wAof ? +C.wAof[nL].toFixed(6) : 0); series.c.push(C.cmdW ? +C.cmdW[nL].toFixed(6) : 0); series.onS.push(onset[nL] ? 1 : 0);
  { let cm = 0, fin = true; if (c) c.forEach(ax => ax && ax.forEach(r => { if (r) { if (!Number.isFinite(r.tau0)) fin = false; else cm = Math.max(cm, Math.abs(r.tau0)); } })); for (const k in tau) if (!Number.isFinite(tau[k])) fin = false; if (!fin) nonFinCmd++; series.cmdMax.push(+cm.toFixed(4));
    if (!st.every(b => [...b.pos, ...b.rot, ...b.v, ...b.w].every(Number.isFinite))) nonFinSt++;
    const G = C.dvg && C.dvg[nL] && C.dvg[nL].tick === C.n - 1 ? C.dvg[nL] : null, gm = G ? GM[G.mode] : -1; if (G) { d1gEvals++; if (!G.valid) { d1gInvalid++; if (d1gFirstInvalid == null) d1gFirstInvalid = +t.toFixed(6); } }
    series.gm.push(gm); series.gw.push(G ? G.w : null); series.gv.push(G ? (G.okR ? 1 : 0) + (G.okC ? 2 : 0) + (G.okF ? 4 : 0) + (G.okT ? 8 : 0) : null); 
    const E = G ? { t: +t.toFixed(6), mode: G.mode, w: G.w, valid: G.valid, tick: G.tick } : null;
    if (G && (gm !== 0 || prevGm > 0 || !G.valid)) { if (prevGE && (!gtr.length || gtr[gtr.length - 1].t !== prevGE.t)) gtr.push(prevGE); gtr.push(E); }   // with the preceding tick (the held wrench's source)
    prevGE = E; prevGm = gm; }
  if (!stance0 && H.tCmd != null) stance0 = st[FT[nS]].pos.slice(); if (stance0) stanceMax = Math.max(stanceMax, Math.hypot(st[FT[nS]].pos[0] - stance0[0], st[FT[nS]].pos[2] - stance0[2]) * 1000);
  if (H.tCmd != null && H.ref && H.abortT == null) { const b = st[FT[nL]], vO = V.add(b.v, V.cross(b.w, V.sub(b.pos, b.com))), e = H.ref, pr = s.probeRows ? s.probeRows[nL] : null;
    rows.push({ t: +t.toFixed(6), u: H.segT0 != null ? +(t - H.segT0).toFixed(6) : null, ph: H.tLo == null ? "lift" : H.tC == null ? "swing" : "contact", ref: { p: e.pos, v: e.vel, a: e.acc, rot: e.rot }, foot: { p: b.pos.slice(), v: vO, rot: b.rot.slice() },
      low: lowAt(nL, b.pos, b.rot), lowRef: lowAt(nL, e.pos, e.rot), tiltErr: tilt(Q.mul(Q.conj(e.rot), b.rot)), yawErr: (() => { let d = yawOf(b.rot) - yawOf(e.rot); while (d > 180) d -= 360; while (d < -180) d += 360; return d; })(),
      touch: se.touch[nL], Fz: pr ? pr.JyN : 0, st: lcf[nL].state, a: lcf[nL].a, ikErr: C.ikRes ? C.ikRes[nL] : null, legTau: [...legAxes].map(k => [k, tau[k] ?? 0, frac[k] ?? 0]), sat: [...sat].filter(k => legAxes.has(k)), dTau: dT, dTau0: dC, ff: C.info.accFF && C.info.accFF[nL] ? 1 : 0,
      xs: C.diagRec && C.diagRec[nL] ? C.diagRec[nL].x.map(v => +v.toFixed(7)) : null, margin: C.diagRec && C.diagRec[nL] ? C.diagRec[nL].x.map((v, i) => +(Math.min(v - LO[i], HI[i] - v) * 180 / Math.PI).toFixed(3)) : null,
      L: C.legK[nL].map(k => (c && c[k] ? c[k].map(r => (r && r.L ? { tau0: r.tau0, K: r.K, D: r.D, ...r.L } : null)) : null)), wPT: C.diagRec && C.diagRec[nL] ? C.legK[nL].map(k => [C.diagRec[nL].wP[k] || null, C.diagRec[nL].wT[k] || null]) : null, pasAnk: s.w.lambdaMotor(ankK).map(v => +(v / dt).toFixed(6)), wA: C.wAof ? C.wAof[nL] : 0, cw: C.cmdW ? C.cmdW[nL] : 0,
      wF: b.w.slice(), pelW: st[C.pelvis].w.slice(), pc: pcVel(nL, b),
      stS: lcf[nS].state }); }
  if (H.tLo != null && t1 == null && se.touch[nL] > 0 && t > H.tLo) { t1 = +t.toFixed(6); const b = st[FT[nL]]; contact1 = { t: t1, pts: solePV(nL, b).map(q => ({ y: q.y, vy: q.vy, vt: q.vt })), w: b.w.slice(), v: b.v.slice() }; }
  if (t1 != null && tSup == null && lcf[nL].state === "SUPPORT") tSup = +t.toFixed(6);
  if (t1 != null && (tSup == null || t <= tSup + 0.1 + 1e-9)) { const b = st[FT[nL]]; post.push({ t: +t.toFixed(6), p: [b.pos[0], b.pos[2]], yaw: +yawOf(b.rot).toFixed(4), low: lowAt(nL, b.pos, b.rot), st: lcf[nL].state, Fz: s.probeRows && s.probeRows[nL] ? s.probeRows[nL].JyN : 0, touch: se.touch[nL] }); }
  if (s.n % 240 === 0) hashes[String(Math.round(t))] = (s.h >>> 0).toString(16).padStart(8, "0");
  if (H.tEnd != null && t >= H.tEnd - 1e-9) break; if (t > 40) break; }
hashes.end = (s.h >>> 0).toString(16).padStart(8, "0");
const g = s.g3summary(), actAxes = []; s.act.led.forEach((row, k) => row.forEach((x, i) => { if (x && x.n) actAxes.push({ axis: spec.joints[k].name + "." + "xyz"[i], k, i, overCap: x.overCap, satTicks: x.satTicks, peakNm: x.peakNm, peakFrac: x.peakFrac }); }));
const last = C.lc.feet.map(f => f.state);
const out = { generated: "tools/dvg_unit.mjs", prereg: "e2/DVG_PREREG.md", mirror: { symErrM: symErr, samples: PROBE.length, probe: PROBE }, stress: { cond: COND, goal: RS, hold: HOLDR, tC: H.tC ?? null }, td2c: { cls: null, obstacle: false, d1g: { evals: d1gEvals, invalid: d1gInvalid, firstInvalid: d1gFirstInvalid }, nonFinCmd, nonFinSt, ledgerExt: { Jext: g.ledger.Jext, Hext: g.ledger.Hext, Wext: g.ledger.Wext }, fell: !!g.fell, fallT: g.fallT ?? null, gtr }, td2: { turf: TURF, cond: COND, dz: DZ, dzPlan: DZPLAN, on: TDON, params: TDON ? P2 : null, srchT0: H.srchT0 ?? null, plannedTD: TDON && H.tLo != null ? H.tLo + plannedTD(TR.T, P2) : null, tdPhase: H.tdPhase ?? null, failedTD: H.failedTD ?? null, reT0: H.reT0 ?? null, reT: H.re ? H.re.T : null, reFloor: H.reFloor ?? null, tdFail: H.tdFail ?? null, earlySeen: H.earlySeen ?? null, acceptPhi: H.phiC ?? null }, t1, tSup, contact1, post, lowRest: H.A ? lowAt(nL, H.A.pos, H.A.rot) : null, human: HUMAN, side: SIDE, swing: nL, hz: HZ, ff: FF, config: CONFIG, traj: TID, tr: TR, mode: MODE, W: C.M * 9.81,
  events: { tCmd: H.tCmd, tLo: H.tLo, tC: H.tC, phiC: H.phiC ?? null, early: H.early, failedTD: H.failedTD, cleared: H.cleared, tRet: H.tRet, abortT: H.abortT, noLift: !!H.noLift, reachRejected: !!H.reachRejected, finalStates: last },
  reach: H.reach, reachAll: H.reachAll || null, goal: H.goal, land: H.land || null, anchor: H.A, trans,
  integrity: { closMax, closPos, stanceSlipMm: stanceMax, ledger: g.ledger, authorityWrites: g.ledger.authorityWrites, overCap: actAxes.reduce((s2, a) => s2 + a.overCap, 0) }, actAxes: actAxes.filter(a => legAxes.has(a.k * 3 + a.i)),
  wn: 2 * Math.PI * C.lc.o.swingHz, outcome: g.outcome, hashes, series, rows };
s.destroy(); sB.destroy(); if (OUT) fs.writeFileSync(OUT, zlib.gzipSync(JSON.stringify(out)));
if (MODE === "reach") console.log(`FBV reach ${HUMAN} ${SIDE} ${HZ} Hz: ` + Object.entries(H.reachAll || {}).map(([id, r]) => `${id} ${r.ok ? "OK" : "REJECT(" + (r.landing !== "ok" ? r.landing : !r.node ? "goal" : "path") + ")"}`).join(" "));
else console.log(`DVGU mirror samples ${PROBE.length}, IK-fold ${PROBE.filter(p => p.fold).length}, flag mismatches ${PROBE.filter(p => ["okR", "okC", "okF", "okT"].some(k => p.A[k] !== p.B[k])).length}, max |ΔD| ${Math.max(0, ...PROBE.map(p => p.dAbs)).toExponential(2)} N·m, max rel ${Math.max(0, ...PROBE.map(p => p.dRel)).toExponential(2)}; initial mirror error ${(symErr * 1000).toExponential(2)} mm | ${COND} ${HUMAN} ${SIDE} ${HZ} Hz ${CONFIG} ${TID}: reach ${H.reach ? (H.reach.ok ? "OK" : "REJECTED") : "—"}; liftoff ${H.tLo != null ? (H.tLo - H.tCmd).toFixed(3) + " s" : "NONE"}; contact φ ${H.phiC != null ? H.phiC.toFixed(3) : "—"}${H.early ? " EARLY" : ""}${H.failedTD ? " FAILED-TD" : ""}; abort ${H.abortT ?? "none"}; outcome ${g.outcome}; final ${last.join("/")}; class ${H.cls ? H.cls.cls : "—"}; DVG invalid ${d1gInvalid}/${d1gEvals}; hash ${hashes.end}`);
