// technical_control13/tools/tc13_phase.mjs — THE PHASING DIAGNOSTICS (owner, transition pass): on the posed skeleton at 240 Hz, the receive → carry
// sequence. The limbs as capsules from the posed joints — thigh (hip → knee), shin (knee → ankle), boot (ankle → toe tip) — and per frame:
//   · the minimum left / right boot separation, shin / shin, boot / opposite shin (the calf), boot / opposite knee, thigh / thigh (negative: the
//     segments intersect); frames beyond the tolerance flagged
//   · planted-foot slip at the support point; support changes (the set of planted feet): instant swaps (one foot lifts as the other lands in the
//     same frame), stances / swings shorter than humanly possible, the time between weight transfers
//   · pelvis discontinuity (the pelvis's acceleration and angular acceleration spikes), foot trajectory discontinuity (an ankle's acceleration
//     spike — a pop), joint discontinuity (a knee / hip angle jump)
//   · IK correction magnitude (the leg short of its target; the body's pushes around the ball and the other leg)
// every quantity also inside the TRANSITION window: the receive's first contact → 0.25 s after the second carry contact.
//   node tc13_phase.mjs <out.json> <body tc11|tc13> <ids, comma; id@foot@style> [--rows]
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
import { anyCase } from "../../technical_control1/tc_course.js"; import { makeCarry } from "../../technical_control12/tools/tc12_carry.mjs"; import { FlowSim } from "../tc13_body.js";
import { cfgFor } from "../../receive_elite1/tools/re1_env.mjs"; import { footPlayer } from "../../technical_control1/tools/tc_env.mjs";
// the after-simulation: TECHNICAL-CONTROL-1.2's carry model + the recorded hand-off foot history (presentation data) — the same authoritative run
export function makeFlow(cs, o = {}) { if (o.foot && !o.player) o = Object.assign({}, o, { player: footPlayer(o.foot) }); const c = cfgFor(cs, o); c.elite = true; c.style = o.style || cs.style || "NEUTRAL"; c.bridge = o.bridge || cs.bridge || "off"; c.moveIntent = o.moveIntent || cs.moveIntent || null; c.dribble = cs.dribble || null; c.EliteBody = o.anim ? o.Body || null : null; return new FlowSim(c); }
import { legAngles, Q } from "../../technical_control11/tc11_leg.js";
const DT = 1 / 240, SIDES = ["R", "L"], hyp = Math.hypot;
export const RAD = { thigh: 0.075, shin: 0.052, boot: 0.048, knee: 0.06 }, TOL = 0.012;   // m: capsule radii (the mesh's limb thickness, conservative); a separation below −TOL is an intersection
export async function bodyClass(kind) { if (kind === "tc11") return (await import("../../technical_control11/tc11_body.js")).LegBody; return (await import("../tc13_body.js")).FlowBody; }
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
// the closest distance between segments [p1, q1] and [p2, q2]
export function segDist(p1, q1, p2, q2) { const d1 = sub(q1, p1), d2 = sub(q2, p2), r = sub(p1, p2), a = dot(d1, d1), e = dot(d2, d2), f = dot(d2, r); let s, t;
  if (a <= 1e-12 && e <= 1e-12) return hyp(...r); if (a <= 1e-12) { s = 0; t = Math.max(0, Math.min(1, f / e)); } else { const c = dot(d1, r); if (e <= 1e-12) { t = 0; s = Math.max(0, Math.min(1, -c / a)); } else { const b = dot(d1, d2), den = a * e - b * b; s = den !== 0 ? Math.max(0, Math.min(1, (b * f - c * e) / den)) : 0; t = (b * s + f) / e; if (t < 0) { t = 0; s = Math.max(0, Math.min(1, -c / a)); } else if (t > 1) { t = 1; s = Math.max(0, Math.min(1, (b - c) / a)); } } }
  const c1 = [p1[0] + d1[0] * s, p1[1] + d1[1] * s, p1[2] + d1[2] * s], c2 = [p2[0] + d2[0] * t, p2[1] + d2[1] * t, p2[2] + d2[2] * t]; return hyp(...sub(c1, c2)); }
// the limb capsules of a posed frame (2D-local + height joint positions)
export function limbs(J) { const o = {}; for (const X of SIDES) o[X] = { hip: J["thigh_" + X].j, knee: J["shin_" + X].j, ankle: J["foot_" + X].j, toe: J["toe_" + X].t, mtp: J["toe_" + X].j }; return o; }
export function clearances(Lb) { const R = Lb.R, L = Lb.L;
  return { foot: segDist(R.ankle, R.toe, L.ankle, L.toe) - 2 * RAD.boot, shin: segDist(R.knee, R.ankle, L.knee, L.ankle) - 2 * RAD.shin, thigh: segDist(R.hip, R.knee, L.hip, L.knee) - 2 * RAD.thigh,
    footCalf: Math.min(segDist(R.ankle, R.toe, L.knee, L.ankle), segDist(L.ankle, L.toe, R.knee, R.ankle)) - RAD.boot - RAD.shin,
    footKnee: Math.min(segDist(R.ankle, R.toe, L.knee, L.knee), segDist(L.ankle, L.toe, R.knee, R.knee)) - RAD.boot - RAD.knee }; }
// the posed joints of a frame in the WORLD (from the skinning matrices every body writes: world = skin × bind) — the same measure for the approach
// (TURN-1.2 / RECEIVE-CONTROL's body), the receive and the carry, so a hand-off between them is measured too
export function jointsOf(S) { const sk = S.cfg.skel, M4 = S.cfg.M4, sm = S.A.skinMats; if (!sm) return null; const bind = sk._bindM || (sk._bindM = sk.invBind.map((m) => M4.invertRigid(m))), B = sk.byName;
  const W = (n) => { const i = B[n].idx, m = M4.mul(sm.subarray(i * 16, i * 16 + 16), bind[i]); return m; }, pos = (m) => [m[12], m[13], m[14]], tip = (n) => { const b = B[n], m = W(n), d = b.dir || [0, 1, 0], L = b.len || 0; return M4.transformPoint(m, [d[0] * L, d[1] * L, d[2] * L]); };
  const J = { pelvis: { j: pos(W("pelvis")) } }; for (const X of SIDES) { J["thigh_" + X] = { j: pos(W("thigh_" + X)) }; J["shin_" + X] = { j: pos(W("shin_" + X)) }; J["foot_" + X] = { j: pos(W("foot_" + X)) }; J["toe_" + X] = { j: pos(W("toe_" + X)), t: tip("toe_" + X) }; }
  const Pm = W("pelvis"); J._Rp = [Pm[0], Pm[4], Pm[8], Pm[1], Pm[5], Pm[9], Pm[2], Pm[6], Pm[10]];
  J._foot = {}; for (const X of SIDES) J._foot[X] = W("foot_" + X); return J; }
// the posed support point of a planted foot: the sole's edge it rolls on (when the body says it rolls), else the ball of the foot (the MTP joint)
function supPosed(J, X, edge) { if (!edge) return J["toe_" + X].j.slice(); const m = J._foot[X], sx = X === "R" ? 1 : -1, p = [-edge * 0.072, -0.057, 0.1805]; return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]]; }
export function runPhase(id, Body, o = {}) {
  const cs = anyCase(id, o.seed || 1), S = (o.flow ? makeFlow : makeCarry)(cs, { seed: o.seed || 1, foot: o.foot || "R", style: o.style, anim: true, Body }), _c = (S._tc11cache = S._tc11cache || new Map()), n = Math.round(cs.scenario.dur * 240), fr = [];
  let run_lastB = null; for (let i = 0; i < n && !S.fault; i++) { S.step(); const c2 = S.rc2, act = c2 && c2.kind === "ELITE" && c2.phase === "action" ? c2.pose : null, J = jointsOf(S); if (!J) { fr.push(null); continue; }
    const rb = S.body2 !== run_lastB; run_lastB = S.body2;
    const t = c2 && c2.kc != null ? (S.k - c2.kc) * DT : S.k * DT, f = { rb, seg: act && S.body2 && S.body2.segAt ? { R: S.body2.segAt("R", act.t), L: S.body2.segAt("L", act.t) } : null, k: S.k, t, phase: act ? "action" : "approach", J, Lb: limbs(J), planted: {}, sup: {}, ballPt: {}, legs: act ? act.legs || null : null, pel: J.pelvis.j.slice(), ang: null };
    for (const X of SIDES) { if (act) { f.planted[X] = !!act.feet[X].planted; f.ballPt[X] = act.feet[X].ballPt ? act.feet[X].ballPt.slice() : null; } else { const L = S.A.legs && S.A.legs[X]; f.planted[X] = !!(L && L.stance); f.ballPt[X] = L && L.plant ? L.plant.pos.slice() : null; }
      f.sup[X] = supPosed(J, X, act && act.legs && act.legs[X] ? act.legs[X].edge || 0 : 0); }
    if (act) f.ang = { R: legAngles(act.pose.rot, "R"), L: legAngles(act.pose.rot, "L") };
    fr.push(f); }
  const ep = S.rc2 && S.rc2.ep, cons = ep ? ep.contacts.map((c) => ({ k: c.k, t: c.t, F: c.F, surface: c.surface, i: c.i })) : [], fid = ep && ep.tech ? ep.tech.fid : null;
  return { id, fr, cons, fid, S, flags: (S.rc2 && S.rc2._tc11flags) || [], tflags: (S.rc2 && S.rc2._tc13flags) || [] };
}
const pct = (a, q) => { if (!a.length) return null; const b = a.slice().sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.floor(q * (b.length - 1)))]; };
export function analysePhase(run) {
  const fr = run.fr, idx = new Map(); fr.forEach((f, i) => f && idx.set(f.k, i)); const c0 = run.cons[0], cN = run.cons.filter((c) => c.i >= 1)[1] || run.cons[run.cons.length - 1];
  const inWin = (f) => c0 && f.k >= c0.k - 24 && f.k <= (cN ? cN.k + 60 : c0.k + 240);
  const all = { foot: [], shin: [], thigh: [], footCalf: [], footKnee: [] }, win = { foot: [], shin: [], thigh: [], footCalf: [], footKnee: [] }, bad = [], badWin = [];
  let slip = 0, slipWin = 0; const slipEv = [], ref = { R: null, L: null }, pA = [], pAW = [], fA = [], fAW = [], jJ = [], jJW = [], pops = []; let swaps = 0, swapsWin = 0, shortSt = 0, shortSw = 0; const transfers = [];
  const state = { R: null, L: null };   // the current planted / swing run per foot: { planted, k0 }
  for (let i = 0; i < fr.length; i++) { const f = fr[i]; if (!f) continue; const W = inWin(f), cl = clearances(f.Lb);
    for (const k in cl) { all[k].push(cl[k]); if (W) win[k].push(cl[k]); } const worst = Math.min(cl.foot, cl.shin, cl.footCalf, cl.footKnee, cl.thigh);
    if (worst < -TOL) { const e = { t: +f.t.toFixed(3), what: Object.entries(cl).filter(([, v]) => v < -TOL).map(([k, v]) => `${k} ${(v * 100).toFixed(1)}cm`).join(", ") }; bad.push(e); if (W) badWin.push(e); }
    for (const X of SIDES) { const P = f.planted[X] && f.phase === "action"; if (!P) ref[X] = null; else { const key = f.phase + (f.ballPt[X] || [0, 0]).map((x) => x.toFixed(4)).join() + "|" + (f.legs && f.legs[X] ? f.legs[X].edge || 0 : 0), pt = f.sup[X];
        if (!ref[X] || ref[X].id !== key) ref[X] = { id: key, p: pt.slice() }; else { const d = hyp(pt[0] - ref[X].p[0], pt[1] - ref[X].p[1]); if (d > slip && d > 0.01) slipEv.push({ t: +f.t.toFixed(3), X, mm: +(d * 1000).toFixed(0), phase: f.phase }); slip = Math.max(slip, d); if (W) slipWin = Math.max(slipWin, d); } }
      const st = state[X]; if (!st || st.planted !== P) { if (st) { const dur = (f.k - st.k0) * DT; if (st.planted && dur < 0.04) shortSt++; if (!st.planted && dur < 0.06) shortSw++; } state[X] = { planted: P, k0: f.k }; } }
    const pv = i > 0 ? fr[i - 1] : null; if (pv) { for (const X of SIDES) { const a = pv.planted[X], b = f.planted[X], Y = X === "R" ? "L" : "R"; if (a && !b && !pv.planted[Y] && f.planted[Y]) { swaps++; if (W) swapsWin++; } if (!a && b) transfers.push(f.t); } }
    // accelerations (second differences) of the pelvis and the ankles; the knee angle's jump
    const a = fr[i - 1], c = fr[i + 1]; if (a && c) { const acc = (P0, P1, P2) => hyp(...[0, 1, 2].map((q) => (P2[q] - 2 * P1[q] + P0[q]) / (DT * DT)));
      const ap = acc(a.pel, f.pel, c.pel); pA.push(ap); if (W) pAW.push(ap); if (ap > 400) pops.push({ t: +f.t.toFixed(3), what: `pelvis ${ap.toFixed(0)} m/s²` });
      for (const X of SIDES) { const af = acc(a.Lb[X].ankle, f.Lb[X].ankle, c.Lb[X].ankle); fA.push(af); if (W) fAW.push(af); if (af > 2500) pops.push({ t: +f.t.toFixed(3), what: `${X} ankle ${af.toFixed(0)} m/s²` });
        if (a.ang && f.ang && c.ang) { const jk = Math.abs(c.ang[X].knee - 2 * f.ang[X].knee + a.ang[X].knee) / (DT * DT); jJ.push(jk); if (W) jJW.push(jk); } } } }
  const tw = transfers.slice(1).map((t, i) => t - transfers[i]).filter((x) => x > 0);
  let hand = null; for (let i = 2; i < fr.length - 2; i++) { const f = fr[i], a = fr[i - 1]; if (f && a && a.phase === "approach" && f.phase === "action") { const w = [fr[i - 2], a, f, fr[i + 1], fr[i + 2]].filter(Boolean), acc = (k1, X) => { let m = 0; for (let j = 1; j < w.length - 1; j++) { const P0 = X ? w[j - 1].Lb[X][k1] : w[j - 1][k1], P1 = X ? w[j].Lb[X][k1] : w[j][k1], P2 = X ? w[j + 1].Lb[X][k1] : w[j + 1][k1]; m = Math.max(m, hyp(...[0, 1, 2].map((q) => (P2[q] - 2 * P1[q] + P0[q]) / (DT * DT)))); } return Math.round(m); };
    hand = { t: +f.t.toFixed(3), pelvisAcc: acc("pel"), kneeAcc: Math.max(acc("knee", "R"), acc("knee", "L")), ankleAcc: Math.max(acc("ankle", "R"), acc("ankle", "L")), kneeJump: Math.max(...SIDES.map((X) => hyp(...sub(f.Lb[X].knee, a.Lb[X].knee)))) }; break; } }
  const mn = (a) => (a.length ? +(Math.min(...a) * 100).toFixed(1) : null), P = (a, q, s = 1) => (a.length ? +(pct(a, q) * s).toFixed(1) : null);
  return { tech: run.fid, contacts: run.cons.length, sep: { all: Object.fromEntries(Object.entries(all).map(([k, v]) => [k, mn(v)])), win: Object.fromEntries(Object.entries(win).map(([k, v]) => [k, mn(v)])) },
    intersectFrames: bad.length, intersectFramesWin: badWin.length, intersect: badWin.slice(0, 6).concat(bad.filter((b) => !badWin.includes(b)).slice(0, 3)),
    slipMm: +(slip * 1000).toFixed(1), slipWinMm: +(slipWin * 1000).toFixed(1), instantSwaps: swaps, instantSwapsWin: swapsWin, shortStances: shortSt, shortSwings: shortSw, weightTransferMinS: tw.length ? +Math.min(...tw).toFixed(3) : null,
    pelvisAcc: { p99: P(pA, 0.99), max: P(pA, 1), winMax: P(pAW, 1) }, ankleAcc: { p99: P(fA, 0.99), max: P(fA, 1), winMax: P(fAW, 1) }, kneeJerk: { p99: P(jJ, 0.99, 1e-3), winMax: P(jJW, 1, 1e-3) }, pops: pops.length, popList: pops.filter((p) => /ankle/.test(p.what)).slice(0, 10).concat(pops.filter((p) => !/ankle/.test(p.what)).slice(0, 4)), slipEv: slipEv.slice(-4),
    ik: (() => { const s = []; for (const f of fr) if (f && f.legs) for (const X of SIDES) if (f.legs[X]) s.push((f.legs[X].short || 0) + (f.legs[X].pushed || 0) + (f.legs[X].cleared || 0)); return { p99Cm: P(s, 0.99, 100), maxCm: P(s, 1, 100) }; })(),
    lateFlags: run.flags.length, transitionFlags: run.tflags.length, handoff: hand };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const out = process.argv[2], kind = process.argv[3] || "tc11", ids = (process.argv[4] || "L_90_RUN_NORMAL_B99_D99_A99").split(","), Body = await bodyClass(kind), res = [];
  for (const spec of ids) { const [id, foot, style] = spec.split("@"), t0 = Date.now(), run = runPhase(id, Body, { foot: foot || "R", style: style || undefined, flow: kind === "tc13" }), A = analysePhase(run); const r = Object.assign({ id, foot: foot || "R", style: style || null, body: kind, ms: Date.now() - t0 }, A); res.push(r);
    console.log(JSON.stringify({ id, foot: r.foot, tech: r.tech, x: r.intersectFrames, xWin: r.intersectFramesWin, sepWin: r.sep.win, slip: r.slipMm, swaps: r.instantSwaps, shortSt: r.shortStances, shortSw: r.shortSwings, wt: r.weightTransferMinS, pelvis: r.pelvisAcc, ankle: r.ankleAcc, pops: r.pops, ik: r.ik, hand: r.handoff })); if (process.argv.includes("--rows")) { console.log("   ", JSON.stringify(r.intersect)); console.log("   ", JSON.stringify(r.popList)); console.log("   slip", JSON.stringify(r.slipEv)); } }
  fs.writeFileSync(out, JSON.stringify(res, null, 1));
}
