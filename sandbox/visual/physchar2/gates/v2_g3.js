// ═══ physchar2/gates/v2_g3.js — V2-G3: DELIBERATE WEIGHT TRANSFER between the feet, no step (G3 brief) ═══════════════════════════════════════
// The accepted G2 plant + standing controller with the G3 options (ctrl/v2_stand.js): a requested right-foot load fraction λ_R(t) moves the balance
// target laterally; the support region comes from the feet that actually have contacting boot pieces; a foot that unloads is held where it was.
// Nothing here writes a body or assigns a foot load — the request is an objective, the physics decides (brief §1, §2). Measurement adds the
// load fractions, support state, unloaded-foot behaviour, CoP seam crossings, pelvis roll / trunk lean, drift and the transfer classification.
import { V, Q } from "../core/v2_math.js";
import { G2Sim, DIRS } from "./v2_g2.js";
import { polyDist, insidePoly } from "../ctrl/v2_stand.js";

const G = 9.81, D = 180 / Math.PI, SEAM_T0 = 0.5, now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());   // seam audit from t ≥ 0.5 s (the first ticks are the boots' initial contact settle — G2 used t ≥ 1 s for the same reason)
// smooth (minimum-jerk) piecewise profile of the requested right-foot load fraction: [{ to, dur }] segments (to = null → hold)
export function profile(segs, start = 0.5, t0 = 1.0) { const S = []; let t = t0, v = start; for (const g of segs) { const to = g.to == null ? v : g.to; S.push({ a: t, b: t + g.dur, v0: v, v1: to }); t += g.dur; v = to; }
  // fn.d(t) → [λ, λ̇, λ̈] analytically (the DCM feed-forward needs the request's rates; never differentiate measured geometry — G3-A4 v2)
  const d = (tt) => { if (tt <= t0) return [start, 0, 0]; for (const g of S) if (tt < g.b) { const T = g.b - g.a, u = (tt - g.a) / T, dv = g.v1 - g.v0;
      return [g.v0 + dv * u * u * u * (10 - 15 * u + 6 * u * u), dv * 30 * u * u * (1 - u) * (1 - u) / T, dv * 60 * u * (1 - u) * (1 - 2 * u) / (T * T)]; } return [v, 0, 0]; };
  const fn = (tt) => d(tt)[0]; fn.d = d; fn.end = t; fn.segs = S; return fn; }
// the request handed to the controller: { lam, dl, ddl } (a plain function without .d → rates 0)
export const asRequest = (fn) => (t) => { const [lam, dl, ddl] = fn.d ? fn.d(t) : [fn(t), 0, 0]; return { lam, dl, ddl }; };
// continue / abort SUPERVISOR (brief §17), a decision from physical state: once the request is at least "strong" (stance share ≥ 0.85, where the
// plan relies on the stance foot alone), if the balance law's required CoP p* = ξ + kξ(ξ − ξ_ref) − ξ̇_ref/ω0 lies outside the STANCE foot's
// region by more than `margin` for `dwell` s, the stance foot cannot deliver the correction → the request returns to bilateral (λ → 0.5 over
// `abortDur`, min-jerk) so the other foot reloads. Whether bilateral recovery is still possible (ξ inside the two-foot hull) is recorded; if it
// is not, nothing rescues it without a step. (First version tested "ξ outside the stance foot" at |λ − 0.5| > 0.05 — that fired at the start
// of every ramp, where ξ is legitimately between the feet; measured, replaced before any gate run.)
export function supervised(fn, opts = {}) { const margin = opts.margin ?? 0.01, dwell = opts.dwell ?? 0.02, abortDur = opts.abortDur ?? 0.6, minShare = opts.minShare ?? 0.85, abortFF = opts.abortFF ?? false, req = asRequest(fn);
  return (t, ctrl) => { const g = ctrl.g3 || (ctrl.g3 = { aborted: null, from: 0.5, out: 0, bilateralOk: null, prevT: null }), I = ctrl.info, dtt = g.prevT == null ? 0 : t - g.prevT; g.prevT = t; let r = req(t);   // I: the previous tick's controller state (causal)
    if (g.aborted == null && I && I.lam != null && Math.max(I.lam, 1 - I.lam) >= minShare) { const st = I.lam > 0.5 ? 1 : 0;
      g.out = polyDist(I.polys[st], I.pRaw) < -margin ? g.out + dtt : 0;
      if (g.out >= dwell - 1e-9) { g.aborted = t; g.from = r.lam; g.bilateralOk = polyDist(I.support, I.xi) >= 0; } }
    if (g.aborted != null) { const u = abortDur > 0 ? Math.min(1, (t - g.aborted) / abortDur) : 1, dv = 0.5 - g.from, ff = abortFF && u < 1;
      r = { lam: g.from + dv * u * u * u * (10 - 15 * u + 6 * u * u), dl: ff ? dv * 30 * u * u * (1 - u) * (1 - u) / abortDur : 0, ddl: ff ? dv * 60 * u * (1 - u) * (1 - 2 * u) / (abortDur * abortDur) : 0 }; }
    return r; }; }
export function g3Scenario(def) { return { title: def.title, seconds: def.seconds, push: def.push || null, torque: def.torque || null, initStance: def.initStance || null, v: def.v || null, g3: def }; }
// the G3 controller options (brief §8: the minimum additions, each justified by a measured deficiency — DECISIONS G3-A*)
export const G3_STAND = { contactSupport: true, holdUnloaded: true, ikFeasible: true };

export class G3Sim extends G2Sim {
  constructor(J, spec, def, opts = {}) {
    const lamFn = def.lam ? (def.supervise ? supervised(def.lam, def.supervise) : asRequest(def.lam)) : null;
    super(J, spec, g3Scenario(def), { ...opts, stance: opts.stance || def.stance || undefined, stand: { ...G3_STAND, ...(def.stand || {}), ...(opts.stand || {}), transfer: lamFn ? (t, c) => lamFn(t, c) : null } });
    this.def = def; this.g3 = { rows: opts.trace ? [] : null, init: false, cpu: 0 };
  }
  _measure2() { super._measure2(); if (this.ctrl && this.ctrl.info && this.probeRows) { const t0 = now(); this._measure3(); this.g3.cpu += now() - t0; } }
  _measure3() {
    const I = this.ctrl.info, a = this.g3, t = this.n * this.dt, pr = this.probeRows, ft = this.ctrl.feet, B = this.spec.bodies, W = this.ctrl.M * G;
    const Fz = pr.map(r => Math.max(0, r.JyN)), sum = Fz[0] + Fz[1], load = sum > 1 ? Fz.map(x => x / sum) : [0.5, 0.5], touch = pr.map(r => r.pieces.filter(p => p.touch).length);
    if (!a.init) { a.init = true; a.foot0 = ft.map(f => ({ pos: this.st[f].pos.slice(), rot: this.st[f].rot.slice() })); a.pel0 = this.st[this.pelI = B.findIndex(b => b.name === "pelvis")].pos.slice();
      a.yaw0 = this._yaw(this.st[this.pelI].rot); a.thI = B.findIndex(b => b.name === "thorax"); a.trk = { err2: 0, n: 0, maxErr: 0 }; a.loadMax = [0, 0]; a.loadMinR = 1; a.cat = { L: 0, R: 0 }; a.catT = {}; a.footMax = [{ slip: 0, lift: 0, tilt: 0 }, { slip: 0, lift: 0, tilt: 0 }];
      a.seam = [{ n: 0, jumpMax: 0, prev: null, prevCop: null }, { n: 0, jumpMax: 0, prev: null, prevCop: null }]; a.contactLossT = [0, 0]; a.pelRollMax = 0; a.trunkLeanMax = 0; a.yawMax = 0; a.holdStat = {}; a.abortT = null; a.unlT = [0, 0]; a.copRight = [0, 0]; a.ikErrMax = 0; a.ikBadT = 0; a.tw = null; a.twMax = null; a.marks = []; a.twin = { n: 0, s2: 0, max: 0, Pprev: null }; }
    const lam = I.lam ?? 0.5; if (sum > 0.5 * W) { const e = load[1] - lam; a.trk.err2 += e * e; a.trk.n++; a.trk.maxErr = Math.max(a.trk.maxErr, Math.abs(e)); }
    a.loadMax = [Math.max(a.loadMax[0], load[0]), Math.max(a.loadMax[1], load[1])];
    // transfer classification per tick, for the side carrying more (stance) and the other: partial / strong / near-single / unloaded / contact loss
    const st = load[1] >= load[0] ? 1 : 0, ot = 1 - st, side = st ? "R" : "L", ls = load[st], fo = Fz[ot] / W;
    const cls = touch[ot] === 0 ? "contact loss" : fo <= 0.01 ? "unloaded" : ls >= 0.95 ? "near-single-support" : ls >= 0.85 ? "strong" : ls >= 0.60 ? "partial" : "bilateral";
    // class / contact-loss / unloaded times from t ≥ 0.5 s (G3 final run 1 → 2, recorded: on the FIRST step after release the per-piece touch
    // flags lag the contact by one step — both boots read 0 touching pieces while carrying 76 N each — a probe artifact, not a contact loss)
    if (t >= SEAM_T0) { a.catT[side + ":" + cls] = (a.catT[side + ":" + cls] || 0) + this.dt; if (touch[ot] === 0) a.contactLossT[ot] += this.dt; if (fo <= 0.01) a.unlT[ot] += this.dt; }
    // feet: slip (origin horizontal displacement), lift (origin height change), tilt; per-foot CoP seam crossings (piece cell containing the CoP)
    ft.forEach((f, n) => { const s = this.st[f], p0 = a.foot0[n].pos, slip = Math.hypot(s.pos[0] - p0[0], s.pos[2] - p0[2]), lift = s.pos[1] - p0[1], u = Q.rot(s.rot, [0, 1, 0]), tilt = Math.acos(Math.min(1, u[1])) * D, m = a.footMax[n];
      m.slip = Math.max(m.slip, slip); m.lift = Math.max(m.lift, lift); m.tilt = Math.max(m.tilt, tilt);
      if (t >= SEAM_T0 && pr[n].cop && Fz[n] > 0.05 * W) { const l = Q.rot(Q.conj(s.rot), V.sub(pr[n].cop, s.pos)), cell = this._cell(n, l[0], l[2]), q = a.seam[n];
        if (q.prevCop) { const j = Math.hypot(l[0] - q.prevCop[0], l[2] - q.prevCop[1]); if (q.prev !== null && cell !== q.prev) { q.n++; if (j > q.jumpMax) { q.jumpMax = j; q.jumpT = t; } } }
        q.prev = cell; q.prevCop = [l[0], l[2]]; } else { a.seam[n].prev = null; a.seam[n].prevCop = null; } });
    const pel = this.st[this.pelI], th = this.st[a.thI], ru = Q.rot(pel.rot, [0, 1, 0]), tu = Q.rot(th.rot, [0, 1, 0]), hd = I.heading, lat = [hd[1], -hd[0]];
    const pelRoll = Math.asin(Math.max(-1, Math.min(1, ru[0] * lat[0] + ru[2] * lat[1]))) * D, trunkLean = Math.asin(Math.max(-1, Math.min(1, tu[0] * lat[0] + tu[2] * lat[1]))) * D, yaw = (this._yaw(pel.rot) - a.yaw0) * D;
    a.pelRollMax = Math.max(a.pelRollMax, Math.abs(pelRoll)); a.trunkLeanMax = Math.max(a.trunkLeanMax, Math.abs(trunkLean)); a.yawMax = Math.max(a.yawMax, Math.abs(yaw));
    // hold statistics in each pre-declared hold window of the scenario: stance load min / mean, other-foot load max, contact, COM over the stance foot
    for (const w of this.def.holds || []) if (t >= w.a && t <= w.b) { const h = a.holdStat[w.id] || (a.holdStat[w.id] = { stance: w.stance, loadMin: 1, loadSum: 0, n: 0, otherMaxN: 0, otherTouchMin: 99, comInStance: true, copInStance: true, xiMarginMin: 1e9 });
      const sI = w.stance === "R" ? 1 : 0, oI = 1 - sI; h.loadMin = Math.min(h.loadMin, load[sI]); h.loadSum += load[sI]; h.n++; h.otherMaxN = Math.max(h.otherMaxN, Fz[oI]); h.otherTouchMin = Math.min(h.otherTouchMin, touch[oI]);
      const sp = I.polys[sI]; if (!insidePoly(sp, [I.c[0], I.c[2]])) h.comInStance = false; if (pr[sI].cop && !insidePoly(sp, [pr[sI].cop[0], pr[sI].cop[2]])) h.copInStance = false; h.xiMarginMin = Math.min(h.xiMarginMin, polyDist(sp, I.xi)); }
    // transverse-plane audit (G3 finding: the whole body's yaw path to the turf is the PASSIVE ankle ab/adduction): excursions from t = 1 s
    if (!a.twK) a.twK = [["ankle_L", "fabd"], ["ankle_R", "fabd"], ["knee_L", "rot"], ["knee_R", "rot"], ["hip_L", "rot"], ["hip_R", "rot"]].map(([n, key]) => ({ k: this.spec.joints.findIndex(j => j.name === n), key }));
    { const ev = this.up.ev, v = a.twK.map(x => this.P.anat(this.P.jd[x.k], ev.qs[x.k], x.key)); if (t >= 1 && !a.tw) { a.tw = v; a.twMax = v.map(() => 0); } if (a.tw) v.forEach((x, i) => { a.twMax[i] = Math.max(a.twMax[i], Math.abs(x - a.tw[i])); }); }
    if (I.ikRes) { const e = Math.max(...I.ikRes); a.ikErrMax = Math.max(a.ikErrMax, e); if (e > 1e-3) a.ikBadT += this.dt; }   // posture IK health (residual > 1 mm-equivalent)
    if (this.ctrl.g3 && this.ctrl.g3.aborted != null && a.abortT == null) a.abortT = this.ctrl.g3.aborted;
    // force-plate twin (spec 3.4): whole-body momentum change vs the per-foot contact impulses (each from that foot's own momentum balance and its
    // ankle constraint impulses) + gravity + the test impulse — independent computations; residual as a fraction of M·g·dt
    { let P = [0, 0, 0]; this.st.forEach((x, i) => { P = V.add(P, V.sc(x.v, B[i].mass)); }); const tw = a.twin;
      if (tw.Pprev && t >= SEAM_T0) { const dP = V.sub(P, tw.Pprev), Fd = this.lastDist ? this.lastDist.F : [0, 0, 0], ext = V.add(V.add(V.add(pr[0].Jc || [0, 0, 0], pr[1].Jc || [0, 0, 0]), [0, -G * this.ctrl.M * this.dt, 0]), V.sc(Fd, this.dt));
        const e = V.len(V.sub(dP, ext)) / (W * this.dt); tw.n++; tw.s2 += e * e; tw.max = Math.max(tw.max, e); }
      tw.Pprev = P; }
    for (const mk of this.def.marks || []) if (Math.abs(t - mk) < this.dt / 2) { const pd = this.st[this.pelI].pos; a.marks.push({ t, load: load[1], yaw, pelvisDriftMm: Math.hypot(pd[0] - a.pel0[0], pd[2] - a.pel0[2]) * 1000, slipMm: a.footMax.map(m => m.slip * 1000), trkRms: a.trk.n ? Math.sqrt(a.trk.err2 / a.trk.n) : null, twist: a.twMax ? a.twMax.slice() : null }); }
    const row = { t, lam, load, Fz, touch, cls, side, pelRoll, trunkLean, yaw, inSup: I.inSup, unl: I.unl, slip: a.footMax.map(m => m.slip), xi: I.xi, com: I.c, cop: this.lastRow.cop, pCmd: I.p };
    a.last = row; if (a.rows) a.rows.push(row);
  }
  _yaw(q) { const f = Q.rot(q, [0, 0, 1]); return Math.atan2(f[0], f[2]); }
  // the boot piece "cell" (AP row × ML side) containing a foot-local point — for seam crossings (pieces 0–9 = AP rows 0–4 × ML 2)
  _cell(n, x, z) { const P = this.probes[n], rows = [...new Set(P.pieces.map(p => Math.round(p.cz * 1000)))].sort((a2, b2) => a2 - b2);
    let best = 0, bd = 1e9; rows.forEach((r, i) => { const d = Math.abs(z * 1000 - r); if (d < bd) { bd = d; best = i; } }); return best * 2 + (x > 0 ? 1 : 0); }
  g3summary() {
    const g = this.g2summary(), a = this.g3, L = a.last || {}, end = this.n * this.dt, W = this.ctrl.M * G;
    const posture = (() => { const ev = this.up.ev; let e2 = 0, n = 0; for (const d of this.P.jd) { const q = ev.qs[d.k], r = this.ctrl.qref[d.k]; let x = Q.mul(Q.conj(r), q); if (x[3] < 0) x = x.map(v => -v); const ang = 2 * Math.asin(Math.min(1, Math.hypot(x[0], x[1], x[2]))) * D; if (!/ankle|hip|knee/.test(d.name)) { e2 += ang * ang; n++; } } return Math.sqrt(e2 / n); })();
    const pd = this.st[this.pelI].pos, drift = Math.hypot(pd[0] - a.pel0[0], pd[2] - a.pel0[2]);
    return { ...g, g3: { def: { id: this.def.id, title: this.def.title }, endLoad: L.load, endLam: L.lam, trackRms: a.trk.n ? Math.sqrt(a.trk.err2 / a.trk.n) : null, trackMax: a.trk.maxErr, loadMax: a.loadMax, catT: a.catT,
      holds: a.holdStat ? Object.fromEntries(Object.entries(a.holdStat).map(([k, h]) => [k, { stance: h.stance, loadMin: h.loadMin, loadMean: h.loadSum / h.n, otherMaxN: h.otherMaxN, otherMaxBW: h.otherMaxN / W, otherTouchMin: h.otherTouchMin, comInStance: h.comInStance, copInStance: h.copInStance, xiMarginMinCm: h.xiMarginMin * 100 }])) : {},
      feet: a.footMax.map(m => ({ slipMm: m.slip * 1000, liftMm: m.lift * 1000, tiltDeg: m.tilt })), contactLossS: a.contactLossT, unloadedS: a.unlT, seam: a.seam.map(q => ({ crossings: q.n, jumpMaxMm: q.jumpMax * 1000, jumpT: q.jumpT ?? null })),
      pelvisRollMaxDeg: a.pelRollMax, trunkLeanMaxDeg: a.trunkLeanMax, yawMaxDeg: a.yawMax, yawEndDeg: L.yaw, pelvisDriftMm: drift * 1000, postureErrEndDeg: posture, Lend: V.len(this.last.L), abortT: a.abortT, ikErrMax: a.ikErrMax, ikBadS: a.ikBadT, marks: a.marks, twin: { rms: a.twin.n ? Math.sqrt(a.twin.s2 / a.twin.n) : null, max: a.twin.max }, abortBilateralOk: this.ctrl.g3 ? this.ctrl.g3.bilateralOk : null,
      cpu3Ms: this.g3.cpu / this.n, ikMs: this.ctrl.cpuIK != null ? this.ctrl.cpuIK / this.n : null, twistMaxDeg: a.twMax ? { ankleFabd: [a.twMax[0], a.twMax[1]], kneeRot: [a.twMax[2], a.twMax[3]], hipRot: [a.twMax[4], a.twMax[5]] } : null } };
  }
}

// ══ the G3 SCENARIO CATALOGUE — tools/g3_run.js, the review page and the browser check build every run from these keys ══════════════════════
// The transfer starts at t = 1 s (after the release settle). Hold windows begin 0.5 s after a ramp ends. λ = requested RIGHT-foot load fraction.
const prof = (segs, tail = 3) => profile([...segs, { dur: tail }]), lamOf = (st, target) => (st === "R" ? target : 1 - target);
function hold1(st, target, ramp, hold, tail = 3, more = {}) { const lam = prof([{ to: lamOf(st, target), dur: ramp }, { dur: hold }, { to: 0.5, dur: ramp }], tail);
  return { lam, holds: [{ id: st, stance: st, a: 1 + ramp + 0.5, b: 1 + ramp + hold }], seconds: lam.end, ...more }; }
function cycle(target, ramp, hold, tail = 3) { const lam = prof([{ to: target, dur: ramp }, { dur: hold }, { to: 0.5, dur: ramp }, { dur: 1 }, { to: 1 - target, dur: ramp }, { dur: hold }, { to: 0.5, dur: ramp }], tail);
  const tL = 1 + 3 * ramp + hold + 1; return { lam, holds: [{ id: "R", stance: "R", a: 1 + ramp + 0.5, b: 1 + ramp + hold }, { id: "L", stance: "L", a: tL + 0.5, b: tL + hold }], seconds: lam.end }; }
const pushOf = (dir, J, t0) => ({ t0, dur: 0.1, J: [DIRS[dir][0] * J, 0, DIRS[dir][1] * J], body: "thorax" });
const MIRROR = { F: "F", B: "B", L: "R", R: "L", FL: "FR", FR: "FL", BL: "BR", BR: "BL" };
export function g3Def(key) {
  const p = key.split(":"), sup = !p.includes("nosup");
  switch (p[0]) {
    case "T0": { const lam = prof([], 19); return { key, title: "T0 bilateral baseline: λ_R = 0.5 held 20 s (G3 controller)", lam, holds: [{ id: "B", stance: "R", a: 2, b: 20 }], seconds: 20 }; }
    case "T1": return { key, title: "T1 slow strong transfer 50 → R 85 % → 50 (4 s ramps, 4 s hold)", ...hold1("R", 0.85, 4, 4) };
    case "T2": return { key, title: "T2 slow strong transfer 50 → L 85 % → 50 (4 s ramps, 4 s hold)", ...hold1("L", 0.85, 4, 4) };
    case "T3": return { key, title: "T3 cycle R 85 % → 50 → L 85 % → 50 (4 s ramps, 3 s holds)", ...cycle(0.85, 4, 3) };
    case "T4": { const n = 5, C = 11, segs = []; for (let c = 0; c < n; c++) segs.push({ to: 0.9, dur: 2 }, { dur: 1 }, { to: 0.5, dur: 2 }, { to: 0.1, dur: 2 }, { dur: 1 }, { to: 0.5, dur: 2 }, { dur: 1 });
      const lam = prof(segs, 4), holds = []; for (let c = 0; c < n; c++) holds.push({ id: "R" + (c + 1), stance: "R", a: 1 + C * c + 2.3, b: 1 + C * c + 3 }, { id: "L" + (c + 1), stance: "L", a: 1 + C * c + 7.3, b: 1 + C * c + 8 });
      return { key, title: "T4 five repeated cycles R 90 % ↔ L 90 % (2 s ramps, 1 s holds) — drift", lam, holds, seconds: lam.end, marks: [0.99, ...Array.from({ length: n }, (_, c) => 1 + C * (c + 1) - 0.01)] }; }
    case "T5": return { key, title: "T5 near-single-support R: λ_R → 0.97 (4 s), hold 10 s, back", ...hold1("R", 0.97, 4, 10) };
    case "T6": return { key, title: "T6 near-single-support L: λ_R → 0.03 (4 s), hold 10 s, back", ...hold1("L", 0.97, 4, 10) };
    case "U": { const st = p[1]; const d = hold1(st, 1.0, 4, 6); d.holds = [{ id: st, stance: st, a: 1 + 4 + 2, b: 1 + 4 + 6 }];
      return { key, title: `U unloading the ${st === "R" ? "LEFT" : "RIGHT"} foot: λ_R → ${st === "R" ? "1.0" : "0.0"} (4 s), hold 6 s, back — single-support hold`, ...d }; }
    case "T7": { const st = p[1], T = +p[2]; return { key, title: `T7 speed: λ_R → ${st === "R" ? "0.95" : "0.05"} in ${T} s, hold 3 s, back in ${T} s (supervised)`, ...hold1(st, 0.95, T, 3, 3), supervise: sup ? {} : null }; }
    case "T8": { const when = p[1], st = p[2], dir = p[3], J = +p[4], t0 = when === "hold" ? 4.0 : 2.0;   // hold: 1 s into the λ 0.95 hold; ramp: mid-ramp (λ ≈ 0.725)
      return { key, title: `T8 push ${dir} ${J} N·s (thorax, 100 ms) ${when === "hold" ? "during the near-single-support hold" : "mid-transfer"} on ${st}${sup ? " (supervised)" : " (no supervisor)"}`, ...hold1(st, 0.95, 2, 4, 3), push: pushOf(dir, J, t0), supervise: sup ? {} : null }; }
    case "T9": return { key, human: p[1], title: `T9 ${p[1]}: near-single-support cycle R 97 % → 50 → L 97 % → 50 (4 s ramps, 4 s holds)`, ...cycle(0.97, 4, 4) };
    case "T11": { if (p[1] === "over") { const x = +p[2], lam = prof([{ to: x, dur: 4 }, { dur: 4 }, { to: 0.5, dur: 4 }]); return { key, title: `T11 excessive request λ_R → ${x} (target beyond the right foot's region centroid)${p[3] === "sup" ? " (supervised)" : ""}`, lam, holds: [], seconds: lam.end, supervise: p[3] === "sup" ? {} : null }; }
      if (p[1] === "fast") { const T = +p[2]; return { key, title: `T11 excessive rate: λ_R → 0.97 in ${T} s`, ...hold1("R", 0.97, T, 3) }; } break; }
    case "Y": { const lt = +p[1], tq = +p[2], lam = prof([{ to: lt, dur: 3 }, { dur: 10 }], 0); return { key, title: `diagnostic: constant ${tq} N·m yaw torque on the pelvis at λ_R ${lt} (transverse stiffness)`, lam, holds: [], seconds: lam.end, torque: { t0: 6, dur: 7, H: [0, tq * 7, 0], body: "pelvis" }, marks: [5.99, 12.99] }; }
    case "FA": { const d = hold1("R", 0.97, 4, 14), a0 = 6, A = 0.04; return { key, title: "diagnostic (spec 3.2): heel ↔ forefoot transfer on the stance foot during near-single-support R (target ±4 cm AP)", ...d,
      stand: { refOffset: (t) => { const u = t - a0, s = (x) => x * x * x * (10 - 15 * x + 6 * x * x); if (u < 0 || u >= 12) return [0, 0]; const k = Math.floor(u / 3), f = s((u - 3 * k) / 3); return [0, [A * f, A * (1 - f), -A * f, -A * (1 - f)][k]]; } } }; }
    case "PS": { const sd = +p[1]; let r = (sd * 2654435761) >>> 0; const rnd = () => { r = (r + 0x6D2B79F5) >>> 0; let t = r; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      const v = [(rnd() - 0.5) * 0.08, 0, (rnd() - 0.5) * 0.08], kf = 4 + rnd() * 8, cf = 0.02 + rnd() * 0.04;
      return { key, title: `spec 3.5 perturbed start ${sd}: initial COM velocity (${(v[0] * 100).toFixed(1)}, ${(v[2] * 100).toFixed(1)}) cm/s, knees ${kf.toFixed(1)}°, COM ${(cf * 100).toFixed(1)} cm ahead → T5 transfer`, ...hold1("R", 0.97, 4, 6), v, initStance: { kneeFlexDeg: kf, comAheadOfAnklesM: cf } }; }
  }
  throw new Error("unknown G3 scenario " + key);
}
export const mirrorDir = (d) => MIRROR[d];
export { DIRS };
