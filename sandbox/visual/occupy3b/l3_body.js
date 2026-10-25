// ═══ occupy3b/l3_body.js — STAGE 3B.1: THE LIMB DRAWN ═══════════════════════════════════════════════════════════════════════════════════════
// LimbBody is Stage 3's ImpactBody (the canonical PlayBody + the impact perturbation, unchanged) drawing one more thing: a swinging leg's LIMB
// PERTURBATION q (occupy3b/l3_limb.js) read from the world at the tick it is drawn. After the canonical forward kinematics, the thigh and shin
// are rotated about the hip joint by G(q) and the foot and toe moved with the ankle, their orientation kept — every other bone, the skin's
// other weights, the pose code: untouched. With no perturbation the pose is the canonical one, bit for bit (super.pose, no wrapper).
// The pose also returns the AUTHORED leg (legAuth, pitch coordinates): hip, knee, ankle, ball of the foot, toe tip as the canonical body drew them
// — the limb layer measures the authored motion on it, the Lab draws it as the approved reference beside the physical leg.
import { ImpactBody } from "../occupy3/o3_body.js";
import { rot, mm, mv, sub, add, unit } from "./l3_limb.js";
const SIDES = ["R", "L"], toP = (v) => [v[0], -v[2], v[1]];   // (forward kinematics' world (y up) → pitch (z up))
export class LimbBody extends ImpactBody {
  constructor(env, sim, src = null, lsrc = null) { super(env, sim, src); this.lsrc = lsrc; }   // lsrc(sim, t) → { on, R: q, L: q } or null
  pose(t) { const Lq = this.lsrc ? this.lsrc(this.sim, t) : null; if (!Lq || !Lq.on) return super.pose(t);
    const E = this.E, f0 = E.r1FK, self = this; let auth = null;
    E.r1FK = function (G, pose, rootM, cache) { const fk = f0.apply(this, arguments); auth = self.perturbLegs(fk, rootM, Lq, G.body.skel); return fk; };
    try { const p = super.pose(t); p.legAuth = auth; p.limbQ = Lq; return p; } finally { E.r1FK = f0; } }
  // the leg's bones in the root frame (fk.R / fk.P, the model space: x the body's right, y up, z forward): thigh / shin rotated about the hip by
  // G = R(z, q0) R(x, q1) R(u, q2) (u the authored hip→ankle line) — the same rotation the limb layer applies in pitch coordinates (the model →
  // pitch map is a proper rotation taking z to the facing, x to the body's right); foot and toe translated with the ankle
  perturbLegs(fk, rootM, Lq, sk) { const ix = this._ix || (this._ix = Object.fromEntries(sk.bones.map((b) => [b.name, b.idx]))), auth = {}, M4 = this.M4;
    for (const X of SIDES) { const iT = ix["thigh_" + X], iS = ix["shin_" + X], iF = ix["foot_" + X], iO = ix["toe_" + X];
      auth[X] = { H: toP(fk.joint[iT]), K: toP(fk.joint[iS]), A: toP(fk.joint[iF]), B: toP(fk.joint[iO]), T: toP(fk.tip[iO]) };
      const q = Lq[X]; if (!q || (!q[0] && !q[1] && !q[2])) continue;
      const h = fk.P[iT], a = fk.P[iF], u = unit(sub(a, h), [0, -1, 0]), G = mm(mm(rot([0, 0, 1], q[0]), rot([1, 0, 0], q[1])), rot(u, q[2])), a2 = add(h, mv(G, sub(a, h))), d = sub(a2, a);
      for (const i of [iT, iS]) { fk.R[i] = mm(G, fk.R[i]); fk.P[i] = add(h, mv(G, sub(fk.P[i], h))); }
      for (const i of [iF, iO]) fk.P[i] = add(fk.P[i], d);
      for (const i of [iT, iS, iF, iO]) { const R = fk.R[i], P = fk.P[i], m = new Float32Array(16), b = sk.bones[i];
        m[0] = R[0]; m[1] = R[3]; m[2] = R[6]; m[4] = R[1]; m[5] = R[4]; m[6] = R[7]; m[8] = R[2]; m[9] = R[5]; m[10] = R[8]; m[12] = P[0]; m[13] = P[1]; m[14] = P[2]; m[15] = 1;
        const w = rootM ? M4.mul(rootM, m) : m; fk.world[i] = w; fk.joint[i] = [w[12], w[13], w[14]]; const v = [b.dir[0] * b.len, b.dir[1] * b.len, b.dir[2] * b.len];
        fk.tip[i] = [w[0] * v[0] + w[4] * v[1] + w[8] * v[2] + w[12], w[1] * v[0] + w[5] * v[1] + w[9] * v[2] + w[13], w[2] * v[0] + w[6] * v[1] + w[10] * v[2] + w[14]]; } }
    return auth; }
}
