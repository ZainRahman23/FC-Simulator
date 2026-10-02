// ═══ physchar/pc_stepfeat.js — the Physical Stepper's STATE RECORD at a step start (shared: planner, oracle workers, analysis) ════════════
// One function, so the planner decides on exactly the state the identification / oracle data were recorded with. Input: an observation
// (the feedback view at the step start — what the controller sees when it decides), the step's swing side, the stance sole centre pSt
// (world x, z), the intended heading h0, and the previous touchdown time. Frame: forward along the heading, sideways mirrored toward the
// swing side (so left and right steps share one model).
import { V, Q } from "./pc_math.js";
const LEG = 0.9243;
export function stepFeatures(spec, o, q) { const bi = (n) => spec.bodies.findIndex(b => b.name === n), M = spec.totalMass, W = M * 9.81;
  const h0 = q.h0, hd = [Math.sin(h0), Math.cos(h0)], rt = [hd[1], -hd[0]], sd = q.sw === "R" ? 1 : -1, ps = q.pSt, st = q.sw === "R" ? "L" : "R";
  const rel = (p) => [(p[0] - ps[0]) * hd[0] + (p[1] - ps[1]) * hd[1], ((p[0] - ps[0]) * rt[0] + (p[1] - ps[1]) * rt[1]) * sd], relv = (v) => [v[0] * hd[0] + v[2] * hd[1], (v[0] * rt[0] + v[2] * rt[1]) * sd];
  const yawOf = (qq) => { const f = Q.rot(qq, [0, 0, 1]); return Math.atan2(f[0], f[2]); }, pitchOf = (qq) => { const f = Q.rot(qq, [0, 0, 1]); return Math.atan2(f[1], Math.hypot(f[0], f[2])); }, wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const S = o.states, fsw = S[bi("foot_" + q.sw)], fst = S[bi("foot_" + st)], tsw = S[bi("thigh_" + q.sw)], tst = S[bi("thigh_" + st)];
  let c = [0, 0, 0]; S.forEach((s, i) => { c = V.add(c, V.sc(s.com, spec.bodies[i].mass)); }); c = V.sc(c, 1 / M); let Lm = [0, 0, 0];
  S.forEach((s, i) => { const b = spec.bodies[i], wl = Q.rot(Q.conj(s.rot), s.w); Lm = V.add(Lm, V.add(Q.rot(s.rot, [b.inertia[0] * wl[0], b.inertia[1] * wl[1], b.inertia[2] * wl[2]]), V.sc(V.cross(V.sub(s.com, c), s.v), b.mass))); });
  const ext = (a, b) => Math.hypot(a.pos[0] - b.pos[0], a.pos[1] - b.pos[1], a.pos[2] - b.pos[2]) / LEG;
  return { t: o.t, comAbs: [o.com[0] * hd[0] + o.com[2] * hd[1], o.com[0] * rt[0] + o.com[2] * rt[1]], xi: rel(o.xi), com: rel([o.com[0], o.com[2]]), comY: o.com[1], v: [...relv(o.vcom), o.vcom[1]],
    L: [(Lm[0] * rt[0] + Lm[2] * rt[1]) * sd, Lm[1] * sd, Lm[0] * hd[0] + Lm[2] * hd[1]],
    swFoot: rel([fsw.pos[0], fsw.pos[2]]), swFootY: fsw.pos[1], swFootV: relv(fsw.v), swPitch: pitchOf(fsw.rot),
    stFoot: rel([fst.pos[0], fst.pos[2]]), stYaw: wrap(yawOf(fst.rot) - h0) * sd, stPitch: pitchOf(fst.rot),
    trailExt: ext(tsw, fsw), stExt: ext(tst, fst), pelvisYaw: wrap(yawOf(S[0].rot) - h0) * sd, pelvisYawRate: S[0].w[1] * sd, pelvisPitch: pitchOf(S[0].rot),
    loadSw: o.feet[q.sw].load / W, loadSt: o.feet[st].load / W, swState: o.feet[q.sw].state, stState: o.feet[st].state, dsDur: q.prevTd != null ? q.tSw0 - q.prevTd : null };
}
