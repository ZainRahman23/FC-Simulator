// ═══ physchar2/map/v2_render_map.js — physics bodies → production semantic skeleton (spec §9) ═══════════════════════════════════════
// One-way: reads physical body transforms, writes render bone transforms. Never writes physics; never touches the ball.
//   DIRECT  bone world = body world × constant bind offset (exact)
//   AIM     position = the physical joint point (exact); rotation = parent-body × swing(rel) × twist(rel)^f × bind  (spine_02 f=0.5, neck f=0.27)
//   DEFORM  twist branch: the parent bone's world delta with a fraction of its own axial twist removed (deformation only)
//   PROC    toe (F0): the rigid foot + a contact rule that keeps the render toes on the turf when the heel is up (presentation only)
//   DERIVED root: ground point below the pelvis origin, yaw from the pelvis +Z (fallback +Y when lying); never authoritative
import { V, Q, datan2 } from "../core/v2_math.js";
import { BONES } from "../spec/v2_skeleton.js";

export const AIM_TWIST_FRACTION = { spine_02: 0.5, neck: 0.27 };
export const AIM_PARENT_BODY = { spine_02: "abdomen", neck: "thorax" };
export const DEFORM_FRACTION = 0.5;
export const TOE_MAX_DF = 60 * Math.PI / 180;

function twistAbout(q, a) {                         // twist of rotation q about unit axis a (a in the same frame as q)
  const p = V.dot([q[0], q[1], q[2]], a); let t = [a[0] * p, a[1] * p, a[2] * p, q[3]]; const l = Math.sqrt(t[0] * t[0] + t[1] * t[1] + t[2] * t[2] + t[3] * t[3]);
  if (l < 1e-15) return [0, 0, 0, 1]; t = t.map(x => x / l); if (t[3] < 0) t = t.map(x => -x); return t;
}
const twistAngle = (t, a) => 2 * datan2(V.dot([t[0], t[1], t[2]], a), t[3]);
const qpow = (t, a, f) => Q.axis(a, twistAngle(t, a) * f);

// bind data from the spec (canonical: every body has identity rotation)
export function bindData(spec) {
  const B = Object.fromEntries(spec.bodies.map(b => [b.name, b])), sk = spec.skeleton, out = {};
  for (const bone of BONES) {
    const p = sk.positions[bone.name], q = sk.frames[bone.name].q, body = B[bone.body];
    out[bone.name] = { cls: bone.cls, body: body.index, offsetPos: V.sub(p, body.origin), offsetRot: q, canonPos: p, canonRot: q,
      parent: bone.parent, axis: sk.frames[bone.name].y };
  }
  return out;
}
// evaluate every render bone for body states S [{pos, rot}] (body origin = proximal joint); opts.ground = turf height for the toe rule
export function evaluateSkeleton(spec, bind, S, opts = {}) {
  const idx = Object.fromEntries(spec.bodies.map(b => [b.name, b.index])), W = {}, ground = opts.ground ?? 0;
  const direct = (n) => { const d = bind[n], s = S[d.body]; return { pos: V.add(s.pos, Q.rot(s.rot, d.offsetPos)), rot: Q.norm(Q.mul(s.rot, d.offsetRot)) }; };
  for (const bone of BONES) {
    const n = bone.name, d = bind[n];
    if (d.cls === "DIRECT") W[n] = direct(n);
    else if (d.cls === "AIM") {
      const sc = S[d.body], sp = S[idx[AIM_PARENT_BODY[n]]], pos = V.add(sc.pos, Q.rot(sc.rot, d.offsetPos));
      const rel = Q.norm(Q.mul(Q.conj(sp.rot), sc.rot)), tw = twistAbout(rel, d.axis), sw = Q.norm(Q.mul(rel, Q.conj(tw)));
      W[n] = { pos, rot: Q.norm(Q.mul(Q.mul(Q.mul(sp.rot, sw), qpow(tw, d.axis, AIM_TWIST_FRACTION[n])), d.canonRot)) };
    } else if (d.cls === "DERIVED") {                         // root
      const sp = S[d.body], fz = Q.rot(sp.rot, [0, 0, 1]), fy = Q.rot(sp.rot, [0, 1, 0]);
      const f = Math.abs(fz[1]) < Math.cos(30 * Math.PI / 180) ? fz : fy;   // pelvis +Z within 30° of vertical → use +Y
      W[n] = { pos: [sp.pos[0], 0, sp.pos[2]], rot: Q.axis([0, 1, 0], datan2(f[0], f[2])) };
    }
  }
  for (const bone of BONES) {                                  // second pass: bones that depend on their parent bone
    const n = bone.name, d = bind[n];
    if (d.cls === "DEFORM") {
      const pb = bind[d.parent], gp = bind[pb.parent], Pw = W[d.parent], Gw = W[pb.parent];
      const dP = Q.norm(Q.mul(Pw.rot, Q.conj(pb.canonRot))), dG = Q.norm(Q.mul(Gw.rot, Q.conj(gp.canonRot)));
      const rel = Q.norm(Q.mul(Q.conj(dG), dP)), tw = twistAbout(rel, pb.axis);
      const remove = Q.axis(pb.axis, -twistAngle(tw, pb.axis) * (1 - DEFORM_FRACTION));
      W[n] = { pos: V.add(Pw.pos, Q.rot(dP, V.sub(d.canonPos, pb.canonPos))), rot: Q.norm(Q.mul(Q.mul(dP, remove), d.canonRot)) };
    } else if (d.cls === "PROC") {                             // toe: rigid on the foot, pitched up to keep the toe tip on the turf
      const footW = W[d.parent], pb = bind[d.parent], dF = Q.norm(Q.mul(footW.rot, Q.conj(pb.canonRot)));
      const pos = V.add(footW.pos, Q.rot(dF, V.sub(d.canonPos, pb.canonPos)));
      const tipCanon = spec.toeTip[n.endsWith("_L") ? "L" : "R"], arm = V.sub(tipCanon, d.canonPos);   // toe tip relative to the MTP (canonical)
      const mtpAxisW = Q.rot(dF, [1, 0, 0]);                                                         // MTP flexion axis ≈ lateral (+X)
      let phi = 0; const tipW = V.add(pos, Q.rot(dF, arm));
      if (tipW[1] < ground && pos[1] > ground) {               // tip below the turf, MTP above it: dorsiflex the toes until the tip touches
        let lo = 0, hi = TOE_MAX_DF; for (let it = 0; it < 40; it++) { const mid = (lo + hi) / 2, q = Q.axis(mtpAxisW, -mid), y = V.add(pos, Q.rot(Q.mul(q, dF), arm))[1]; if (y < ground) lo = mid; else hi = mid; }
        phi = hi;
      }
      W[n] = { pos, rot: Q.norm(Q.mul(Q.mul(Q.axis(mtpAxisW, -phi), dF), d.canonRot)), toeDF: phi };
    }
  }
  return W;
}
// rigid-chain consistency: every bone's world position = its parent's world transform applied to the canonical offset (root→hips excepted:
// the hips translation is free by design). Returns the worst residual (m) and the offending link.
export function chainResidual(bind, W) {
  let worst = 0, at = null;
  for (const bone of BONES) { if (!bone.parent || bone.parent === "root") continue;
    const pb = bind[bone.parent], P = W[bone.parent], dP = Q.norm(Q.mul(P.rot, Q.conj(pb.canonRot)));
    const pred = V.add(P.pos, Q.rot(dP, V.sub(bind[bone.name].canonPos, pb.canonPos))), r = V.dist(pred, W[bone.name].pos);
    if (r > worst) { worst = r; at = bone.parent + "→" + bone.name; } }
  return { worst, at };
}
