// ═══ occupy3/o3_body.js — STAGE 3: THE BODY'S RESPONSE, LAYERED ON THE AUTHORED POSE (authored action + physically generated perturbation) ═════
// ImpactBody is the canonical PlayBody (vocab2/u_body.js, unchanged) drawing the same plan, with one addition: a PERTURBATION read from the
// world's impact / balance model at the tick it is drawn — never a canned animation, never a second skeleton:
//   pelvis  a horizontal displacement of the drawn pelvis from the simulation's root (m, world): the legs are re-solved by the canonical leg IK
//           from the displaced hips to the SAME feet — a planted foot never moves; a leg that cannot reach lowers the body (the canonical support
//           rule, ≤ 7.5 cm) — the force expressed through ankle, knee and hip
//   yaw     the pelvis's own rotation (rad), added to the facing the body is drawn with (the canonical ack.pelvis channel)
//   lean / side / trunk / bend / proll / crouch / arms / armSide / headYaw / headDrop — added to the plan's own posture channels at that tick
//           (the trunk's pitch and roll over the pelvis, the chest's rotation, the side bend, the pelvis roll, the knees' flexion, the arms'
//           abduction and asymmetry, the head's yaw and pitch): the canonical pose code distributes each exactly as it does the authored ones
// With no perturbation (pert null or off) the pose is the canonical one, bit for bit (super.poseAtAck).
import { PlayBody } from "../vocab2/u_body.js";
const Z = { at: () => 0 };
export const PERT_KEYS = ["lean", "side", "trunk", "bend", "proll", "crouch", "arms", "armSide", "headYaw", "headDrop"];
export class ImpactBody extends PlayBody {
  constructor(env, sim, src = null) { super(env, sim); this.src = src; }   // src(sim, t) → the perturbation to draw at t (or null)
  poseAtAck(t, ak, support = false) {
    const q = this.src ? this.src(this.sim, t) : null;
    if (!q || !q.on) return super.poseAtAck(t, ak, support);
    // (the feet first, unperturbed: the support timeline is cached per tick, so the swing paths it builds read the simulation's centre of mass, never
    // the displaced pelvis — then the pose with the displaced pelvis and the channels added at t)
    this.feetAt(t);
    const ch = this.ch, add = (C, v) => (v ? { at: (x) => (C || Z).at(x) + (Math.abs(x - t) < 1e-9 ? v : 0) } : C || Z), com0 = this.com;
    const chP = Object.assign({}, ch); for (const k of PERT_KEYS) if (q[k]) chP[k] = add(ch[k], q[k]);
    this.ch = chP; if (q.pelvis && (q.pelvis[0] || q.pelvis[1])) this.com = (x) => { const c = com0.call(this, x); return Math.abs(x - t) < 1e-9 ? [c[0] + q.pelvis[0], c[1] + q.pelvis[1]] : c; };
    try { return super.poseAtAck(t, q.yaw ? Object.assign({}, ak, { pelvis: (ak.pelvis || 0) + q.yaw }) : ak, support); }
    finally { this.ch = ch; delete this.com; } }
}
