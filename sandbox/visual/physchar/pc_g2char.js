// ═══ physchar/pc_g2char.js — G2 PLANT CHARACTERISATION (measurement only; opt-in; changes nothing in any approved path) ══════════════
// The physical step-to-step response of the V1.1 character: open-loop commanded footsteps (rhythm.walk.char — explicit foothold and
// single-support duration, no in-swing adjustment) with a FIXED, MINIMAL inner loop, so what is measured is the body's own response:
//   · single support: the stance CoP follows a fixed heel → toe roll (capture-point feedback gain −1 along and across = no feedback; the
//     balance law then places the CoP exactly on the planned roll, the finite ankle permitting);
//   · double support: the CoP ramps from the trailing forefoot to the leading heel (the analytic transfer, again without feedback);
//   · the validated landing work: controlled final descent, 1 cm swing retraction, delay-compensated swing IK;
//   · the validated support fixes: pre-swing release, realisable CoP band, first transfer by progress.
// Perturbations (rhythm-phase pushes / a pure yaw couple) go through the external-impulse ledger like any test push.
// States are expressed relative to the STANCE POINT (the stance sole centre) in the heading frame; sideways is MIRRORED: + = inward, from the
// stance foot toward the other foot — so a periodic left/right gait maps a state onto itself.
import { V, Q } from "./pc_math.js";
import { runG2a, jointAngles } from "./pc_gateg2.js";

import { CHAR_BASE } from "./pc_gateg2.js";
export { CHAR_BASE };
const G = 9.81;
const SEG = { swingLeg: ["thigh", "shin", "foot"], stanceLeg: ["thigh", "shin", "foot"], pelvis: ["pelvis"], trunk: ["abdomen", "chest", "head"], armL: ["upperArm_L", "foreArm_L"], armR: ["upperArm_R", "foreArm_R"] };

// whole-body COM, linear momentum, angular momentum about the COM (3-vector) and the vertical (yaw) angular momentum by segment group
export function bodyState(spec, S, swing) {
  const M = spec.totalMass; let c = [0, 0, 0], p = [0, 0, 0]; S.forEach((q, i) => { c = V.add(c, V.sc(q.com, spec.bodies[i].mass)); p = V.add(p, V.sc(q.v, spec.bodies[i].mass)); }); c = V.sc(c, 1 / M);
  const v = V.sc(p, 1 / M), Lb = S.map((q, i) => { const b = spec.bodies[i], wl = Q.rot(Q.conj(q.rot), q.w); return V.add(Q.rot(q.rot, [b.inertia[0] * wl[0], b.inertia[1] * wl[1], b.inertia[2] * wl[2]]), V.sc(V.cross(V.sub(q.com, c), V.sub(q.v, v)), b.mass)); });
  const L = Lb.reduce((a, x) => V.add(a, x), [0, 0, 0]), st = swing === "R" ? "L" : swing === "L" ? "R" : null, seg = {};
  for (const g in SEG) { const names = g === "swingLeg" ? SEG[g].map(n => n + "_" + (swing || "R")) : g === "stanceLeg" ? SEG[g].map(n => n + "_" + (st || "L")) : SEG[g]; seg[g] = 0;
    spec.bodies.forEach((b, i) => { if (names.includes(b.name)) seg[g] += Lb[i][1]; }); }
  return { com: c, v, p, L, seg };
}
const yawOf = (q) => { const z = Q.rot(q, [0, 0, 1]); return Math.atan2(z[0], z[2]); };

// one experiment: steps = { [index]: { df, dl, T } } (unlisted steps use the walking planner's own law), push = { step, u, J: [fwd, lat], Lz }
export function runChar(J, spec, poses, x) {
  const base = CHAR_BASE(x.speed ?? 0.6, x.walkOver), nSteps = x.n ?? 6, steps = []; const first = x.first || "R";
  for (let i = 0; i < nSteps; i++) { const sw = (i % 2 === 0) === (first === "R") ? "R" : "L"; steps.push(i === 0 ? { sw, fwdK: 0.7 } : i === 1 ? { sw, fwdK: 0.9 } : { sw }); }
  const char = {}; for (const k in (x.steps || {})) char[k] = x.steps[k];
  let LOCO = null; const test = "G2b_walk08", ro = { walk: { ...base.walk, char }, steps, at: x.at ?? 0.5 };
  const opts = { poses, keepStates: true, seconds: x.seconds ?? (1.6 + nSteps * 0.62), rhythmOver: ro, humanOver: { ...base.human, ...(x.humanOver || {}) }, onLoco: (l) => { LOCO = l; } };
  if (x.push) opts.locoOver = undefined;
  const r = x.push ? runG2a(J, spec, test, { ...opts, pushChar: x.push }) : runG2a(J, spec, test, opts);
  const out = analyseChar(spec, r, LOCO, x); if (x.series) out.series = yawSeries(spec, r, LOCO); return out;
}

// per rhythmic step: events (start, liftoff, touchdown), the state at liftoff (= single-support start) and at touchdown relative to the
// stance point, the achieved foothold, double-support duration; the fall time (COM < 0.75 m) — nothing after it counts
export function analyseChar(spec, r, LOCO, x) {
  const R_ = r.recs, wk = LOCO.planner.rhythm && LOCO.planner.rhythm.wk, h0 = wk ? wk.h0 : 0, hd = [Math.sin(h0), 0, Math.cos(h0)], rt = [hd[2], 0, -hd[0]];
  const fallRec = R_.find(q => q.com[1] < 0.75), tFall = fallRec ? fallRec.t : Infinity, at = (t) => { let b = R_[0]; for (const q of R_) { if (Math.abs(q.t - t) < Math.abs(b.t - t)) b = q; } return b; };
  const fi = { R: spec.bodies.findIndex(b => b.name === "foot_R"), L: spec.bodies.findIndex(b => b.name === "foot_L") }, box = spec.bodies[fi.R].shapes[0];
  const center = (S, s) => { const f = S[fi[s]]; return V.add(f.pos, Q.rot(f.rot, box.pos)); };
  const rel = (q, stance, swing) => { const S = q.states, B = bodyState(spec, S, swing), pS = center(S, stance), inw = V.sc(rt, stance === "L" ? 1 : -1), d = V.sub(B.com, pS), w = Math.sqrt(G / Math.max(0.5, B.com[1] - pS[1] + 0.05));
    const xi = V.add(d, V.sc(B.v, 1 / w)), y = yawOf(S[0].rot) - h0;
    return { t: q.t, com: [V.dot(d, hd), V.dot(d, inw), B.com[1]], v: [V.dot(B.v, hd), V.dot(B.v, inw), B.v[1]], xi: [V.dot(xi, hd), V.dot(xi, inw)], omega: w,
      p: [V.dot(B.p, hd), V.dot(B.p, inw)], L: [V.dot(B.L, hd), B.L[1], V.dot(B.L, inw)], seg: B.seg, yaw: Math.atan2(Math.sin(y), Math.cos(y)) * 57.3, yawRate: S[0].w[1] * 57.3,
      pelvis: [V.dot(V.sub(S[0].pos, pS), hd), V.dot(V.sub(S[0].pos, pS), inw), S[0].pos[1]], pelvisV: [V.dot(S[0].v, hd), V.dot(S[0].v, inw)] }; };
  const D = LOCO.planner.exec.done.filter(R => R.kind === "rhythmic"), out = [];
  for (let i = 0; i < D.length; i++) { const R = D[i], st = R.sw === "R" ? "L" : "R", lift = R.liftoff ? R.liftoff.t : null, td = R.td ? R.td.t : null, nx = D[i + 1];
    const e = { k: R.stepIndex, sw: R.sw, tStart: R.tSw0, lift, td, T: R.walkK ? R.walkK.Tss : null, char: (x && x.steps && x.steps[R.stepIndex]) || null, upright: (td ?? lift ?? R.tSw0) < tFall };
    if (lift != null && lift < tFall) e.atLift = rel(at(lift), st, R.sw);
    if (td != null && td < tFall) { const q = at(td); e.atTd = rel(q, st, R.sw); const pS = center(q.states, st), pL = center(q.states, R.sw), d = V.sub(pL, pS), inw = V.sc(rt, st === "L" ? 1 : -1);
      e.foothold = [V.dot(d, hd), -V.dot(d, inw)]; e.tdNew = rel(q, R.sw, st); e.ds = nx && nx.liftoff ? nx.liftoff.t - td : null; }
    // human-compatibility measures over this step (liftoff → touchdown): the swing foot's lowest sole point (mid-swing clearance: 25–80 % of the swing), the landing knee flexion at touchdown, the peak pelvis yaw from the heading, saturated motor-steps
    if (lift != null && td != null && td < tFall) { const W = R_.filter(q => q.t >= lift && q.t <= td), mid = W.filter(q => q.t >= lift + 0.25 * (td - lift) && q.t <= lift + 0.8 * (td - lift)), fb = fi[R.sw];
      const low = (q) => { const f = q.states[fb]; let m = 1e9; for (const sx of [-1, 1]) for (const sz of [-1, 1]) m = Math.min(m, V.add(f.pos, Q.rot(f.rot, [box.pos[0] + sx * box.he[0], box.pos[1] - box.he[1], box.pos[2] + sz * box.he[2]]))[1]); return m; };
      e.clearance = mid.length ? Math.min(...mid.map(low)) : null; const kj = spec.joints.findIndex(j => j.name === "knee_" + R.sw); e.kneeTd = jointAngles(spec, at(td).states, kj).a;
      e.pelvisYawPeak = Math.max(...W.map(q => { const y = yawOf(q.states[0].rot) - h0; return Math.abs(Math.atan2(Math.sin(y), Math.cos(y))) * 57.3; })); e.sat = W.reduce((a, q) => a + (q.satN || 0), 0); }
    out.push(e); }
  return { hash: r.hash, outcome: r.outcome, tFall: Number.isFinite(tFall) ? tFall : null, steps: out, ledger: r.ledger || null, push: r.push || null };
}

// the step-to-step pair for step k: the state at its liftoff (pre, relative to its stance foot) and at the NEXT step's liftoff (post, relative
// to the foot that step k placed) — both single-support starts, after the load transfer
export function stepPair(res, k) { const a = res.steps.find(s => s.k === k), b = res.steps.find(s => s.k === k + 1);
  if (!a || !a.atLift || !b || !b.atLift) return null; return { pre: a.atLift, post: b.atLift, td: a.atTd, tdNew: a.tdNew, foothold: a.foothold, ds: a.ds, swingT: a.td != null && a.lift != null ? a.td - a.lift : null, T: a.T, upright: b.upright }; }

// the single-support YAW study: vertical angular momentum about the whole-body COM by segment (swing leg, stance leg, pelvis, trunk, each arm),
// the whole-body total and its rate (= the external vertical moment: the stance foot's free moment plus the GRF's moment), the pelvis and
// chest yaw, and the swing foot's sideways distance from the COM — every 1/60 s until the fall
export function yawSeries(spec, r, LOCO) {
  const h0 = LOCO.planner.rhythm && LOCO.planner.rhythm.wk ? LOCO.planner.rhythm.wk.h0 : 0, hd = [Math.sin(h0), 0, Math.cos(h0)], rt = [hd[2], 0, -hd[0]], ci = spec.bodies.findIndex(b => b.name === "chest");
  const fallRec = r.recs.find(q => q.com[1] < 0.75), tF = fallRec ? fallRec.t : Infinity, out = []; let prev = null;
  for (const q of r.recs) { if (q.n % 4 || q.t > tF) continue; const sw = q.exec ? q.exec.sw : null, B = bodyState(spec, q.states, sw || "R"), y = (a) => { const v = yawOf(a) - h0; return Math.atan2(Math.sin(v), Math.cos(v)) * 57.3; };
    const swf = sw ? q.states[spec.bodies.findIndex(b => b.name === "foot_" + sw)] : null, lat = swf ? V.dot(V.sub(swf.pos, B.com), rt) : null, fwdV = swf ? V.dot(swf.v, hd) : null;
    const row = { t: q.t, phase: q.rhythm ? q.rhythm.stage : "-", sw, Ly: B.L[1], seg: B.seg, pelvisYaw: y(q.states[0].rot), chestYaw: y(q.states[ci].rot), swingLat: lat, swingFwdV: fwdV };
    if (prev) row.Mext = (row.Ly - prev.Ly) / (row.t - prev.t); prev = row; out.push(row); }
  return out; }
