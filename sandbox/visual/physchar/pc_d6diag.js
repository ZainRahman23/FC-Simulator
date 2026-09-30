// ═══ physchar/pc_d6diag.js — D6 DIAGNOSTIC MEASUREMENT (read-only): the causal chain of a slide into a standing player ═════════════════
// contact geometry → contact impulse → struck foot / shin motion → knee / hip response → pelvis / trunk → ground reaction, CoP, support
// region → capture point → classification → C1 / C3 response → outcome. It only READS the world through runD's onStep hook (joint angles,
// motor impulses, contacts, the sensed observation, the controller's state); it never acts. The Node matrix probe and the review harness
// use this same code, so the numbers in the report and on screen are one measurement.
//
// Contact impulse: JoltPhysics.js exposes no contact impulses, and at impact BOTH the slider's boot and B's struck boot also touch the turf,
// so a per-body Newton balance cannot separate "the slider pushed" from "the turf held". Exact accounting needs the instrumented twin run
// (opts.plate: B stands on a coincident force plate, pc_jolt cfg.plateFrom): A→B = ΔP_B − M·g·dt − (turf → B), per step. Without the
// plate only whole-body momenta are reported (plus the per-body estimate when a contacting body touches nothing else).
import { V, Q } from "./pc_math.js";

const G = 9.81, deg = (r) => r * 180 / Math.PI;
const swingTw = (q) => { let x = q[3] < 0 ? q.map(v => -v) : q; const tl = Math.hypot(x[0], x[3]), qt = tl > 1e-12 ? [x[0] / tl, 0, 0, x[3] / tl] : [0, 0, 0, 1], qs = Q.mul(x, Q.conj(qt));
  return [2 * Math.atan2(qt[0], qt[3]), 2 * Math.atan2(qs[1], qs[3]), 2 * Math.atan2(qs[2], qs[3])]; };   // [twist, swingY, swingZ] rad
const r = (x, d = 3) => x == null || !Number.isFinite(x) ? null : +x.toFixed(d);
export const LEG_JOINTS = ["hip_L", "knee_L", "ankle_L", "hip_R", "knee_R", "ankle_R"];

export class D6Diag {
  constructor(spec, opts) {
    this.spec = spec; this.nb = spec.bodies.length; this.nj = spec.joints.length; this.plate = !!(opts && opts.plate); this.M = spec.totalMass;
    const bi = (n) => spec.bodies.findIndex(b => b.name === n); this.bi = bi; this.fL = bi("foot_L"); this.fR = bi("foot_R");
    this.parentJ = spec.bodies.map((b, i) => spec.joints.findIndex(j => j.childIndex === i)); this.childJ = spec.bodies.map((b, i) => spec.joints.map((j, k) => j.parentIndex === i ? k : -1).filter(k => k >= 0));
    this.legJ = LEG_JOINTS.map(n => spec.joints.findIndex(j => j.name === n)); this.rec = []; this.prevAll = null; this.prevPlate = null; this.prevAng = null;
  }
  // one physics step (runD onStep): x = { n, t, dt, w, A, B, U, nb, nj }
  onStep(x) {
    const { t, dt, w, A, B, U } = x, spec = this.spec, nb = this.nb, nj = this.nj, all = [...A.states, ...B.states], prev = this.prevAll || all; this.prevAll = all;
    const mom = (S, P) => S.reduce((s, q, i) => V.add(s, V.sc(q.v, spec.bodies[i].mass)), [0, 0, 0]), PA = mom(A.states), PB = mom(B.states), PAp = mom(prev.slice(0, nb)), PBp = mom(prev.slice(nb));
    const cts = w.contacts, inter = cts.filter(c => c.a >= 0 && c.b >= 0 && (c.a < nb) !== (c.b < nb)), touching = inter.filter(c => c.depth > -0.0005);
    const turfOf = (i) => cts.some(c => (c.a === i && c.b === -1) || (c.b === i && c.a === -1));
    // exact A→B impulse from the force plate (twin run); else the per-body Newton estimate when the B bodies in contact touch nothing else
    let JAB = null, JturfB = null, how = null;
    if (this.plate && w.plateMomentum) { const pm = w.plateMomentum(), dP = this.prevPlate ? V.sub(pm, this.prevPlate) : [0, 0, 0]; this.prevPlate = pm; JturfB = V.sc(dP, -1);
      JAB = V.sub(V.sub(V.sub(PB, PBp), [0, -G * this.M * dt, 0]), JturfB); how = "plate"; }
    else if (inter.length) { const bInv = [...new Set(inter.map(c => c.a < nb ? c.b : c.a))];
      if (bInv.every(i => !turfOf(i))) { const lam = (k) => w.jointLambdaPosition(nj + k); JAB = bInv.reduce((s, i) => { const li = i - nb, m = spec.bodies[li].mass; let J = V.sub(V.sc(V.sub(all[i].v, prev[i].v), m), [0, -G * m * dt, 0]);
          if (this.parentJ[li] >= 0) J = V.sub(J, lam(this.parentJ[li])); for (const k of this.childJ[li]) J = V.add(J, lam(k)); return V.add(s, J); }, [0, 0, 0]); how = "newton"; } }
    // contact geometry: every touching A↔B manifold point, in world and in the B body's own frame
    const pairs = touching.map(c => { const ia = c.a < nb ? c.a : c.b, ib = c.a < nb ? c.b : c.a, sb = all[ib], p = c.pts[0], nA2B = c.a < nb ? c.normal : V.sc(c.normal, -1);
      return { a: spec.bodies[ia].name, b: spec.bodies[ib - nb].name, p, y: p[1], loc: Q.rot(Q.conj(sb.rot), V.sub(p, sb.pos)), n: nA2B, depth: c.depth }; });
    // B's legs: joint angles (swing–twist, deg), rates, targets, motor torque, saturation, spring / damping split (estimate)
    const ang = {}, joints = {}; for (const k of this.legJ) { const j = spec.joints[k], kk = nj + k, m = U.B.motor[k], cap = B.caps[k], lm = w.motorLambda(kk);
      if (j.type === "hinge") { const a = w.hingeAngle(kk), a0 = this.prevAng ? this.prevAng[k] : a, om = (a - a0) / dt, tq = lm / dt, lim = tq >= 0 ? cap.hi : -cap.lo, tgt = U.B.final[k], vt = U.B.vel ? U.B.vel[k] : 0;
        ang[k] = a; joints[j.name] = { a: r(deg(a), 2), tgt: r(deg(tgt), 2), w: r(deg(om), 1), tq: r(tq, 1), sat: r(lim > 0 ? Math.abs(tq) / lim : 0, 2), spr: r(m.kp * (tgt - a), 1), dmp: r(m.kd * (vt - om), 1), limTq: r(w.cons[kk].c.GetTotalLambdaRotationLimits() / dt, 1) }; continue; }
      const q = w.sixdofRot(kk), a = swingTw(q), a0 = this.prevAng ? this.prevAng[k] : a, om = a.map((v, i) => (v - a0[i]) / dt), tq = lm.map(v => v / dt), tg = swingTw(U.B.final[k]), vt = U.B.vel ? U.B.vel[k] : [0, 0, 0];
      const sat = tq.map((v, i) => { const lim = v >= 0 ? cap.hi[i] : -cap.lo[i]; return lim > 0 ? Math.abs(v) / lim : 0; }); ang[k] = a;
      joints[j.name] = { a: a.map(v => r(deg(v), 2)), tgt: tg.map(v => r(deg(v), 2)), w: om.map(v => r(deg(v), 1)), tq: tq.map(v => r(v, 1)), sat: r(Math.max(...sat), 2), satAx: sat.map(v => r(v, 2)),
        spr: tg.map((v, i) => r(m.kp * (v - a[i]), 1)), dmp: om.map((v, i) => r(m.kd * (vt[i] - v), 1)) }; }
    this.prevAng = ang;
    const o = B.obs, c = B.ctrl.cls, st = B.stepper, feet = {}; for (const s of ["L", "R"]) { const f = o.feet[s], fs = B.states[s === "L" ? this.fL : this.fR];
      feet[s] = { st: f.state, touch: f.touching, loaded: f.loaded, load: r(f.load, 0), slip: f.slipping, slipV: r(f.slipSpeed, 3), pos: [r(fs.pos[0], 4), r(fs.pos[1], 4), r(fs.pos[2], 4)], v: r(Math.hypot(fs.v[0], fs.v[2]), 3), sole: f.sole ? f.sole.map(p => [r(p[0], 3), r(p[2], 3)]) : null }; }
    const d = U.B.debug || {};
    this.rec.push({ t: r(t, 4), touch: touching.length > 0, spec: inter.length > 0, pairs, JAB: JAB && JAB.map(v => r(v, 3)), JturfB: JturfB && JturfB.map(v => r(v, 3)), how,
      PA: PA.map(v => r(v, 2)), PB: PB.map(v => r(v, 2)), A: { com: A.obs.com.map(v => r(v, 3)), vcom: A.obs.vcom.map(v => r(v, 3)) },
      B: { cls: c.state, reason: c.reason || "", com: o.com.map(v => r(v, 4)), vcom: o.vcom.map(v => r(v, 3)), xi: o.xi.map(v => r(v, 4)), xiM: r(o.xiMargin, 4), region: o.region ? o.region.map(p => [r(p[0], 3), r(p[1], 3)]) : null,
        cop: o.cop ? o.cop.map(v => r(v, 3)) : null, pStar: d.pStar ? d.pStar.map(v => r(v, 3)) : null, trunk: r(o.trunkTiltDeg, 1), L: o.L.map(v => r(v, 2)), feet, joints, stance: d.stance || [], replant: d.replant || [],
        stage: st ? st.stage : null, refused: st ? st.refused || null : null, frozen: !!(B.ctrl.opts.freezeAt != null && t >= B.ctrl.opts.freezeAt) } });
  }
  // ── the causal-chain summary of one run (r = runD's result) ──
  summary(res) {
    const R = this.rec, dt = R.length > 1 ? R[1].t - R[0].t : 1 / 240, iM = R.findIndex(q => q.spec), iT = R.findIndex(q => q.touch), T0 = iT >= 0 ? R[iT].t : null, h = (v) => Math.hypot(v[0], v[2]);
    const at = (dtS) => iT < 0 ? -1 : Math.min(R.length - 1, Math.max(0, iT + Math.round(dtS / dt))), pre = R[Math.max(0, (iT >= 0 ? iT : iM >= 0 ? iM : 0) - 3)];
    const out = { test: res.test, title: res.title, hash: res.hash, contact: { firstManifoldT: iM >= 0 ? R[iM].t : null, firstTouchT: T0 } };
    if (iT >= 0) { const p = R[iT].pairs[0], b = p.b, loc = p.loc, side = /_L$/.test(b) ? "L" : "R";
      const where = /^foot_/.test(b) ? `boot ${(side === "L" ? -loc[0] : loc[0]) > 0 ? "outer (lateral)" : "inner (medial)"} side, ${loc[2] > 0.15 ? "toe" : loc[2] < 0.02 ? "heel" : "mid-foot"}` : /^shin_/.test(b) ? `shin, ${r(p.y, 2)} m above the turf` : /^thigh_/.test(b) ? `thigh, ${r(p.y, 2)} m above the turf` : b;
      out.contact = { ...out.contact, pair: `${p.a} → ${p.b}`, heightM: r(p.y, 3), where, locB: loc.map(v => r(v, 3)), normalA2B: p.n.map(v => r(v, 2)), aSpeed: r(h(R[iT].A.vcom), 2), aSpeed3: r(Math.hypot(...R[iT].A.vcom), 2),
        bodiesHit: [...new Set(R.filter(q => q.touch).flatMap(q => q.pairs.map(c => c.b)))], touchSteps: R.filter(q => q.touch).length, maxDepthMm: res.contact.maxDepthMm }; }
    // momentum ledger (N·s, horizontal along the slide x unless stated)
    if (iT >= 0) { const w = (a, b) => { let J = [0, 0, 0], Jt = [0, 0, 0], ok = true; for (let k = at(a); k < at(b); k++) { if (!R[k].JAB) { ok = false; continue; } J = V.add(J, R[k].JAB); if (R[k].JturfB) Jt = V.add(Jt, R[k].JturfB); } return { AtoB: J.map(v => r(v, 1)), turfToB: Jt.map(v => r(v, 1)), exact: ok && R[at(a)].how === "plate" }; };
      let pk = 0, pkT = null; for (let k = iT; k < at(0.15); k++) if (R[k].JAB) { const F = h(R[k].JAB) / dt; if (F > pk) { pk = F; pkT = R[k].t; } }
      let dur = null; if (pk > 0) { for (let k = iT; k < at(0.15); k++) if (R[k].JAB && h(R[k].JAB) / dt < 0.25 * pk && R[k].t > pkT) { dur = r(R[k].t - T0, 3); break; } }
      const A0 = R[at(-0.01)].PA, PBmax = Math.max(...R.slice(iT).map(q => h(q.PB)));
      out.momentum = { plate: R[iT].how === "plate", windows: { "−10–35 ms": w(-0.01, 0.035), "35–100 ms": w(0.035, 0.1), "100–250 ms": w(0.1, 0.25), "250–500 ms": w(0.25, 0.5), "0.5 s–end": w(0.5, 99) },
        peakForceN: r(pk, 0), peakAtMs: pkT != null ? r((pkT - T0) * 1000, 0) : null, highForceMs: dur != null ? r(dur * 1000, 0) : null,
        A: { atTouch: r(h(A0), 1), after100: r(h(R[at(0.1)].PA), 1), after250: r(h(R[at(0.25)].PA), 1), after500: r(h(R[at(0.5)].PA), 1), end: r(h(R[R.length - 1].PA), 1) }, BpeakMomentum: r(PBmax, 1), BpeakComSpeed: r(PBmax / this.M, 3) }; }
    // struck foot, far foot
    const i0 = iT >= 0 ? iT : 0, fl0 = pre.B.feet.L.pos, fr0 = pre.B.feet.R.pos, dist = (p, q) => Math.hypot(p[0] - q[0], p[2] - q[2]);
    const fL = R.slice(i0).map(q => q.B.feet.L), fR = R.slice(i0).map(q => q.B.feet.R);
    out.feet = { struckSlideCm: r(Math.max(...fL.map(f => dist(f.pos, fl0))) * 100, 1), struckEndCm: r(dist(fL[fL.length - 1].pos, fl0) * 100, 1), struckPeakSpeed: r(Math.max(...fL.map(f => f.v)), 2),
      struckSlipMs: r(fL.filter(f => f.slip).length * dt * 1000, 0), struckPeakLoadN: r(Math.max(...fL.map(f => f.load)), 0), preLoad: { L: pre.B.feet.L.load, R: pre.B.feet.R.load },
      farAirMs: r(fR.slice(0, Math.round(1 / dt)).filter(f => !f.touch).length * dt * 1000, 0), farLiftT: (() => { const k = fR.findIndex(f => !f.touch); return k >= 0 ? r(R[i0 + k].t, 3) : null; })(),
      farMovedCm: r(Math.max(...fR.map(f => dist(f.pos, fr0))) * 100, 1), struckAirMs: r(fL.slice(0, Math.round(1 / dt)).filter(f => !f.touch).length * dt * 1000, 0) };
    // joints of the struck (left) leg in the first 150 ms of contact: peak excursion from the pre-contact angle, peak rate, torque, saturation
    const win = R.slice(i0, iT >= 0 ? at(0.15) : i0 + 36), J0 = pre.B.joints, jm = {};
    for (const n of ["ankle_L", "knee_L", "hip_L", "hip_R"]) { const series = win.map(q => q.B.joints[n]), is1 = !Array.isArray(J0[n].a), ax = is1 ? [0] : [1, 2];
      const exc = ax.map(i => Math.max(...series.map(s => Math.abs((is1 ? s.a : s.a[i]) - (is1 ? J0[n].a : J0[n].a[i]))))), rate = ax.map(i => Math.max(...series.map(s => Math.abs(is1 ? s.w : s.w[i]))));
      const tq = ax.map(i => Math.max(...series.map(s => Math.abs(is1 ? s.tq : s.tq[i])))), spr = ax.map(i => Math.max(...series.map(s => Math.abs(is1 ? s.spr : s.spr[i])))), dmp = ax.map(i => Math.max(...series.map(s => Math.abs(is1 ? s.dmp : s.dmp[i]))));
      jm[n] = { axes: is1 ? ["flex"] : ["swingY", "swingZ"], excursionDeg: exc.map(v => r(v, 1)), peakRateDegS: rate.map(v => r(v, 0)), peakTorqueNm: tq.map(v => r(v, 0)), satSteps: series.filter(s => s.sat >= 0.98).length,
        peakSpringNm: spr.map(v => r(v, 0)), peakDampingNm: dmp.map(v => r(v, 0)) }; }
    out.joints = jm;
    // COM, trunk, angular momentum, capture point
    const after = R.slice(i0), c0 = pre.B.com; out.body = { comPeakSpeed: r(Math.max(...after.map(q => h(q.B.vcom))), 3), comPeakT: (() => { let m = 0, tt = null; for (const q of after) { const s = h(q.B.vcom); if (s > m) { m = s; tt = q.t; } } return r(tt, 3); })(),
      comMovedCm: r(Math.max(...after.map(q => dist(q.B.com, c0))) * 100, 1), comDropCm: r((c0[1] - Math.min(...after.map(q => q.B.com[1]))) * 100, 1), trunkMaxDeg: r(Math.max(...after.map(q => q.B.trunk)), 1),
      Lpeak: r(Math.max(...after.map(q => Math.hypot(q.B.L[0], q.B.L[2]))), 1), xiMinCm: r(Math.min(...after.filter(q => q.B.xiM > -999).map(q => q.B.xiM)) * 100, 1), xiOutsideMs: r(after.slice(0, Math.round(1.5 / dt)).filter(q => q.B.xiM < 0).length * dt * 1000, 0),
      noSupportMs: r(after.filter(q => q.B.xiM <= -999).length * dt * 1000, 0) };   // (polyDist −1e3 = no support polygon: fewer than 3 support points)
    // classification + stepping timeline (first entry of each state after the first manifold)
    const cl = []; let last = null; for (const q of R.slice(Math.max(0, iM))) { if (q.B.cls !== last) { cl.push([q.t, q.B.cls, q.B.reason]); last = q.B.cls; } }
    out.released = cl.some(c => c[1] === "FALLING"); out.reengaged = cl.some((c, i) => c[1] !== "FALLING" && c[1] !== "GROUNDED" && i > 0 && cl.slice(0, i).some(d => d[1] === "FALLING"));
    out.classes = cl.slice(0, 14).map(([tt, s, why]) => ({ t: r(tt, 3), state: s, why: why ? why.slice(0, 90) : "" })); out.stepper = res.Bres.events || []; out.refused = res.Bres.refused || null; out.step = res.Bres.step || null;
    // outcome (POST-HOC description from the measurements — reporting only, never an input to the simulation)
    const fell = res.Bres.fell || out.body.trunkMaxDeg > 55 || out.body.comDropCm > 25, stepped = !!(out.step && out.step.liftoff && out.step.touchdown);
    out.outcome = iT < 0 ? "no contact" : fell ? "fall / support lost" : stepped ? "corrective step" : out.body.xiMinCm < 0 || out.body.comPeakSpeed > 0.3 ? "whole-body disturbance, recovered in place" : out.feet.struckSlideCm >= 1 || out.body.comPeakSpeed >= 0.05 ? "local disturbance" : "minor contact, absorbed";
    out.slider = res.A.slide; out.frozen = R.some(q => q.B.frozen);
    return out; }
}
