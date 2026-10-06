// ═══ physchar2/tools/vres_diag.mjs — DIAGNOSTIC harness of the descent-end / touchdown VERTICAL RESIDUAL (e2/VERTICAL_RESIDUAL_DIAGNOSIS.md; user decision
// 2026-10-06 "bounded diagnostic-only investigation"). Not a validation battery, not a criterion run; nothing here is adopted. One run = one body, leg, rate, configuration and
// ONE E2-shaped step on the unloaded swing foot, with the SV-2 timeline (tools/swing_servo_val2.mjs: E1b pre-lift timeline → B1 lift reference until measured AIRBORNE → the
// swing from the measured foot state, stepSegment, apex knot T/2, goal on the turf at the planner's candidate pose, continuous re-anchor → measured touchdown → E2's hand-back).
// MATCHED COUNTERFACTUALS (diagnostic switches; the default world / controller are untouched):
//   --base=float | fixed     fixed: the pelvis is made KINEMATIC and still from the step command on (a fixed-base swing leg; no support-leg / body motion)
//   --turf=on | off          off: from the measured liftoff the swing foot is in a no-turf collision layer (cfg.diagNoGround) — physical contact cannot truncate the descent;
//                            the run ends 0.3 s after the reference's end (no touchdown, no hand-back)
//   --ff=on | off            D1 (swingAccFF): PSTAR5CH | PSTAR5BH
//   --traj=V0 | R-F | R-L | H-T45 | …   V0 = vertical-only lift and replace (goal = the anchor), the SV-2 ids otherwise
//   --xstand=<json>          extra stand options (mechanism counterfactuals, all diagnostic); --xact=<json> actuator-layer options
// TELEMETRY per tick from the step command to the end: reference (pos / vel / acc / rot) and the time it was computed for; foot (ankle origin) pos / vel / rot / ω; lowest boot
//   point of the foot and of the reference pose; contact (touching pieces, probe load); pelvis pos / rot / v / ω; COM; stance foot; swing-leg coordinates x (measured) and x*
//   (IK solution, its frame), D1's resolved ẋ / ẍ; velocity feed-forward per joint split into pelvis-motion (wP) and target-motion (wT) parts; per swing-leg axis: world axis,
//   K, D, τ0, statics feed-forward (gravity + common acceleration + D1), velocity feed-forward, request, activation-limited bounds, applied torque and saturation (previous step),
//   passive tissue torque (previous step); per swing joint: gravity torque, D1 torque, joint position; the ankle-position Jacobian ∂p/∂x at the measured state.
// usage: V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node tools/vres_diag.mjs --human=V2-REF --side=L --hz=240 --ff=on --traj=R-F --base=float --turf=on --out=<file.json.gz>
import fs from "fs"; import path from "path"; import zlib from "zlib"; import { fileURLToPath } from "url";
import { loadJolt } from "../core/v2_jolt.js"; import { e2Spec, CFG } from "../gates/v2_e2.js"; import { G3Sim, g3Def } from "../gates/v2_g3.js"; import { V, Q } from "../core/v2_math.js";
import { stepSegment, stepAt, stepRef, stepPrev, qlog } from "../ctrl/v2_swing.js"; import { liftRef, stepFrame, candPose } from "../ctrl/v2_footstep.js";
const here = path.dirname(fileURLToPath(import.meta.url)), J = await loadJolt(path.join(here, "../vendor/jolt-physics.wasm-compat.js")), arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split("=").slice(1).join("=");
const HUMAN = arg("human", "V2-REF"), SIDE = arg("side", "L"), HZ = +arg("hz", 240), FF = arg("ff", "on"), TID = arg("traj", "R-F"), BASE = arg("base", "float"), TURF = arg("turf", "on"), OUT = arg("out", "");
const XSTAND = JSON.parse(arg("xstand", "{}") || "{}"), XACT = JSON.parse(arg("xact", "{}") || "{}");
const TRS = { V0: { dx: 0, dy: 0, T: 0.60, apex: 0.030 }, "R-F": { dx: 0.10, dy: 0, T: 0.60, apex: 0.030 }, "R-L": { dx: 0, dy: 0.08, T: 0.60, apex: 0.030 }, "C-F7": { dx: 0.07, dy: 0, T: 0.60, apex: 0.030 },
  "C-F13": { dx: 0.13, dy: 0, T: 0.60, apex: 0.030 }, "C-L5": { dx: 0, dy: 0.05, T: 0.60, apex: 0.030 }, "H-T45": { dx: 0.10, dy: 0, T: 0.45, apex: 0.030 }, "H-F15": { dx: 0.15, dy: 0, T: 0.60, apex: 0.030 },
  "H-D": { dx: 0.10, dy: 0.08, T: 0.60, apex: 0.030 }, "H-A40": { dx: 0.10, dy: 0, T: 0.60, apex: 0.040 } };
if (!["L", "R"].includes(SIDE) || !["on", "off"].includes(FF) || !TRS[TID] || !["float", "fixed"].includes(BASE) || !["on", "off"].includes(TURF)) throw new Error("args");
if (process.env.V2_KNEE_MODEL !== "v2k" || process.env.V2_ANKLE_NEUTRAL_K !== "0.13") throw new Error("E1a configuration env required");
const nL = SIDE === "L" ? 0 : 1, nS = 1 - nL, CONFIG = FF === "on" ? "PSTAR5CH" : "PSTAR5BH", TR = TRS[TID], CONTACT = ["TOUCHDOWN", "TOUCHING", "LOAD_ACCEPT", "SUPPORT", "UNLOADING"], G = 9.81;
const mj = (u) => { u = Math.min(1, Math.max(0, u)); return u * u * u * (10 - 15 * u + 6 * u * u); };
const seg4 = (t, a, T, v0, v1) => { const u = Math.min(1, Math.max(0, (t - a) / T)), dv = v1 - v0; return [v0 + dv * mj(u), t > a && t < a + T ? dv * 30 * u * u * (1 - u) * (1 - u) / T : 0, t > a && t < a + T ? dv * 60 * u * (1 - u) * (1 - 2 * u) / (T * T) : 0]; };
const H = { tCmd: null, touchT0: null, tLo: null, sg: null, segT0: null, tC: null, hb: null, hbT0: null, tEnd: null, abortT: null, A: null, fr: null, goal: null, done: false, ref: null, refT: null };
const sig = (t) => { if (t <= 3) return [0.5, 0, 0]; if (t < 7) return seg4(t, 3, 4, 0.5, 1.0); return [1.0, 0, 0]; };
const lamFn = (t) => lamFn.d(t)[0]; lamFn.d = (t) => { const [v, d1, d2] = sig(t); return nS === 1 ? [v, d1, d2] : [1 - v, -d1, -d2]; };
const spec = e2Spec(HUMAN), pd = { t0: 1, dur: 2, dz: 0.025 }, def = { ...g3Def(nS === 1 ? "U:R" : "U:L"), key: "VRES", title: "vertical residual diagnostic", lam: lamFn, supervise: {}, holds: [], seconds: 30, push: null, torque: null };
const cfg = { ...(HZ !== 240 ? { hz: HZ } : {}), ...(TURF === "off" ? { diagNoGround: true } : {}) };
const s = new G3Sim(J, spec, def, { stand: { ikRefTwist: true, lifecycle: true, pelvisDrop: pd, ...CFG[CONFIG], diagRecord: true, ...XSTAND }, passiveOpts: { kneeModel: "v2k" }, act: XACT, ...(Object.keys(cfg).length ? { cfg } : {}) });
const C = s.ctrl, dt = s.dt; if (!!C.o.swingAccFF !== (FF === "on") || C.o.e2 !== 2 || C.o.vffRate !== "sr" || !C.o.e2reanchorVel) throw new Error("configuration");
const setT = (e, tRef) => { C.lc.setSwingTarget(nL, { pos: e.pos, rot: e.rot }); if (!C.swingRef) C.swingRef = [null, null]; C.swingRef[nL] = { vel: e.vel.slice(), acc: e.acc.slice(), w: (e.w || [0, 0, 0]).slice(), al: (e.al || [0, 0, 0]).slice() }; H.ref = e; H.refT = tRef; };
const oc = C.compute.bind(C);
C.compute = (st, ev, dtt) => { const tc = C.n * dtt, lc = C.lc, f = lc.feet[nL], g = C.g3; H.computeT = tc;
  if (g && g.aborted != null && H.abortT == null) { H.abortT = g.aborted; H.tEnd = tc + 0.5; }
  if (H.abortT == null && !H.done) {
    if (H.tCmd == null) { if (f.state === "TOUCHING") { if (H.touchT0 == null) H.touchT0 = tc; } else H.touchT0 = null;
      if (tc >= 7 - 1e-9 && H.touchT0 != null && tc - H.touchT0 >= 0.5 - 1e-9 && C.e2st) { H.tCmd = tc; const a = lc.target(nL); H.A = { pos: a.pos.slice(), rot: a.rot.slice() }; H.fr = stepFrame(C, st, nL); H.goal = candPose(H.A, H.fr, TR.dx, TR.dy, 0);
        if (BASE === "fixed") { s.w.setKinematic(C.pelvis); s.w.setVel(C.pelvis, [0, 0, 0], [0, 0, 0]); } } }   // DIAGNOSTIC: fixed base from the step command
    if (H.tCmd != null && H.tLo == null && !H.done) { const L = liftRef(H.A, tc - H.tCmd);
      if (f.state === "AIRBORNE") { const b = st[C.feet[nL]], ref = { p: b.pos.slice(), v: V.add(b.v, V.cross(b.w, V.sub(b.pos, b.com))), a: L.a.slice(), th: qlog(Q.mul(Q.conj(H.A.rot), b.rot)), w: Q.rot(Q.conj(H.A.rot), b.w), al: [0, 0, 0] };
        H.tLo = tc; H.segT0 = tc; H.sg = stepSegment(ref, H.goal, TR.T, { z: H.A.pos[1] + TR.apex, tk: 0.5 * TR.T }); C.e2reanchor = nL; C.e2reanchorPrev = stepPrev(H.sg, dt); setT(stepAt(H.sg, 0), tc);
        if (TURF === "off") s.w.setNoGround(C.feet[nL], true); }   // DIAGNOSTIC: no turf for the swing foot from the measured liftoff
      else if (tc - H.tCmd > 0.6) { H.done = true; H.noLift = true; H.tEnd = tc + 0.2; } else setT({ pos: L.p, rot: H.A.rot, vel: L.v, acc: L.a }, tc); }
    else if (H.sg && !H.hb) { const u = tc - H.segT0;
      if (TURF === "on" && H.tC == null && CONTACT.includes(f.state) && u > 0) { H.tC = tc; H.phiC = u / TR.T; const land = f.hold ? { pos: f.hold.pos.slice(), rot: f.hold.rot.slice() } : { pos: H.goal.pos.slice(), rot: H.goal.rot.slice() };
        H.hb = stepSegment(stepRef(H.sg, u, land.rot), land, Math.max(TR.T - u, lc.o.accept), null); H.hbT0 = tc; setT(stepAt(H.hb, 0), tc); H.tEnd = tc + 0.3; }
      else if (TURF === "off" && u >= TR.T + 0.3 - 1e-9) { H.done = true; H.tEnd = tc; }
      else if (TURF === "on" && H.tC == null && u > TR.T + 0.3) { H.failedTD = tc; H.done = true; H.tEnd = tc; }
      else setT(stepAt(H.sg, u), tc); }
    else if (H.hb) { const u = tc - H.hbT0; setT(stepAt(H.hb, Math.min(u, H.hb.T)), tc); } }
  const cmd = oc(st, ev, dtt); s._cmd = cmd; return cmd; };
// ── telemetry ──
const B = spec.bodies, FT = C.feet, solePts = FT.map(fi => B[fi].shapes.filter(h => h.type === "hull").flatMap(h => h.points.map(p => V.add(p, h.pos))));
const lowAt = (n, pos, rot) => Math.min(...solePts[n].map(p => pos[1] + Q.rot(rot, p)[1])), ks = C.legK[nL], r7 = (x) => (typeof x === "number" ? +x.toPrecision(8) : Array.isArray(x) ? x.map(r7) : x);
const gravT = (st, k) => { const pj = C.jointAt(st, k); let T = [0, 0, 0]; for (const i of C.sub[k]) T = V.sub(T, V.cross(V.sub(st[i].com, pj), [0, -G * B[i].mass, 0])); return T; };   // statics' gravity part
const rows = [], trans = []; let prevSt = null;
while (true) { if (!s.tick()) break; const t = s.n * dt, st = s.st, lcf = C.lc.feet;
  const sts = lcf.map(x => x.state); if (prevSt) for (const n of [0, 1]) if (sts[n] !== prevSt[n]) trans.push({ t: +t.toFixed(6), n, from: prevSt[n], to: sts[n] }); prevSt = sts;
  if (H.tCmd != null && H.ref && t >= H.tCmd - 1e-9) { const b = st[FT[nL]], ps = st[C.pelvis], vO = V.add(b.v, V.cross(b.w, V.sub(b.pos, b.com))), e = H.ref, ev = s.up.ev, pr = s.probeRows ? s.probeRows[nL] : null;
    const ch = C.legChain(st, ev, nL, ps.pos, ps.rot, null), x = ch.x0, Jm = ch.jac(x), dr = C.diagRec && C.diagRec[nL], plan = s.aplan, accFF = C.info.accFF && C.info.accFF[nL] ? C.info.accFF[nL] : null;
    const prevTau = {}; for (const q of s.actRes || []) prevTau[q.k * 3 + q.i] = q;
    const joints = ks.map(k => { const p = plan.joints.find(q => q.k === k), c = s._cmd[k], lm = s.w.lambdaMotor(k);
      return { k, pj: C.jointAt(st, k), grav: gravT(st, k), d1: accFF && accFF.T[k] ? accFF.T[k] : null, wP: dr && dr.wP[k] ? dr.wP[k] : null, wT: dr && dr.wT[k] ? dr.wT[k] : null, ikW: C.ikW && C.ikW[k] ? C.ikW[k] : null,
        wrel: p.wrel, passive: lm.map(v => v / dt),
        ax: p.rows.map((rw, i) => { if (!rw || rw.off) return null; const cc = c && c[i], pt = prevTau[k * 3 + i];
          return { axW: p.axW[i], K: rw.K, D: rw.D, tau0: rw.tau0, ff: cc ? cc.ff : null, vff: cc ? cc.vff ?? 0 : null, req: rw.req, hi: rw.hi, lo: rw.lo, w: rw.w, tauPrev: pt ? pt.tau : null, satPrev: pt ? pt.sat : null, aPrev: pt ? pt.a : null }; }) }; });
    rows.push(r7({ t, tRef: H.refT, tComp: H.computeT, u: H.segT0 != null ? t - H.segT0 : null, ph: H.tLo == null ? "lift" : H.tC == null ? "swing" : "contact", st: lcf[nL].state, a: lcf[nL].a,
      ref: { p: e.pos, v: e.vel, a: e.acc, rot: e.rot }, foot: { p: b.pos, v: vO, rot: b.rot, w: b.w }, low: lowAt(nL, b.pos, b.rot), lowRef: lowAt(nL, e.pos, e.rot), touch: C.sense ? C.sense.touch[nL] : null, Fz: pr ? pr.JyN : 0,
      pel: { p: ps.pos, rot: ps.rot, v: ps.v, w: ps.w }, com: C.info.c, A: C.info.A, stance: st[FT[nS]].pos, x, xs: dr ? dr.x : null, ikErr: dr ? dr.err : null, frame: dr ? dr.fr : null, xd: dr ? dr.xd : null, xdd: dr ? dr.xdd : null,
      Jp: [0, 1, 2].map(r => Jm.map(col => col[r])), joints })); }
  if (H.tEnd != null && t >= H.tEnd - 1e-9) break; if (t > 25) break; }
const out = { generated: "tools/vres_diag.mjs", doc: "e2/VERTICAL_RESIDUAL_DIAGNOSIS.md", human: HUMAN, side: SIDE, swing: nL, hz: HZ, ff: FF, config: CONFIG, traj: TID, tr: TR, base: BASE, turf: TURF, xstand: XSTAND, xact: XACT,
  W: C.M * G, M: C.M, wn: 2 * Math.PI * C.lc.o.swingHz, zeta: C.lc.o.swingZeta, gains: ks.map(k => ({ k, name: spec.joints[k].name, ...C.gainSwing[k], damping: spec.joints[k].damping })), legMass: ks.reduce((m, k) => m + B[spec.joints[k].childIndex].mass, 0),
  events: { tCmd: H.tCmd, tLo: H.tLo, tC: H.tC, phiC: H.phiC ?? null, failedTD: H.failedTD ?? null, abortT: H.abortT, noLift: !!H.noLift }, goal: H.goal, anchor: H.A, trans, authorityWrites: s.ledger.authorityWrites, hash: (s.h >>> 0).toString(16).padStart(8, "0"), rows };
s.destroy(); if (OUT) fs.writeFileSync(OUT, zlib.gzipSync(JSON.stringify(out)));
console.log(`VRES ${HUMAN} ${SIDE} ${HZ} Hz ff=${FF} ${TID} base=${BASE} turf=${TURF}${Object.keys(XSTAND).length ? " xstand=" + JSON.stringify(XSTAND) : ""}${Object.keys(XACT).length ? " xact=" + JSON.stringify(XACT) : ""}: liftoff ${H.tLo != null ? (H.tLo - H.tCmd).toFixed(3) : "NONE"}; contact φ ${H.phiC != null ? H.phiC.toFixed(3) : "—"}; abort ${H.abortT ?? "none"}; rows ${rows.length}; hash ${out.hash}`);
