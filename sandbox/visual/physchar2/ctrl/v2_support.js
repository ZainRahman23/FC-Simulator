// ═══ physchar2/ctrl/v2_support.js — the G3 → G4 SUPPORT / CONTACT LIFECYCLE of each foot (final pre-E1a stage; OPT-IN, default off) ════════
// Source: sources/2026-10-04_user_instruction_final_pre_e1a_resolution.md §5 ("Define an explicit support/contact lifecycle rather than
// scattered booleans … Contact alone must not automatically imply support"). Evidence: pre_g4_runway/G3_G4_INTERFACE_AUDIT.md (H1–H12).
//
// What it replaces (when StandController's `lifecycle` option is set): G3's per-foot `unl` boolean (sensed load < 1 % BW → held, one tick)
// and `contactSupport` (any touching boot piece → in the support polygon). Those one-tick booleans switched the ankle mode, the IK target and
// the load assignment in a single tick (H3: flag chatter, one-tick torque steps of 6.6–158 N·m) and let contact alone imply support (H5).
//
// STATES (per foot):
//   SUPPORT      loaded; part of the support (weight s = 1)
//   UNLOADING    sustained unload detected while in contact; s ramps 1 → 0 (smoothstep over `release`); the hold pose is captured HERE, once,
//                on the turf — it is never re-armed later (H2)
//   TOUCHING     in contact but not supporting (s = 0): the leg holds the foot at the hold pose
//   LIFTOFF      touching pieces fell to 0, not yet confirmed (debounce); behaves as TOUCHING
//   AIRBORNE     confirmed contact loss: the swing-foot servo tracks the swing target (default: the hold pose = the same foothold)
//   TOUCHDOWN    contact after AIRBORNE, not yet loaded (contact ≠ support); swing control continues
//   LOAD_ACCEPT  entered from a CONTACT state (TOUCHING / TOUCHDOWN / UNLOADING) when, for `acceptDebounce`, the plan WANTS load on this foot
//                (requested share ≥ wantShare) — or the foot carries sustained load ≥ loadOn and the plan allows it (requested share ≥ 2 %). s ramps
//                0 → 1 (smoothstep over `accept`); targets, gains, polygon and load-share cap blend continuously. A touchdown impact alone is not
//                support (measured: 52–60 N, ~50 ms at an unrequested touchdown), and contact alone is not support; but intent + contact starts
//                acceptance (measured: with load-only acceptance the controller never assigned load to the touching foot — a deadlock — until the
//                body fell onto it with ξ 10 cm outside the stance foot)
// A second continuous weight a ∈ [0, 1] (the airborne weight) rises only in confirmed AIRBORNE (smoothstep over `release`) and falls in every
// contact state (over `accept`). It blends, for a non-supporting leg: the servo's pelvis frame (posture target frame in contact → actual frame
// airborne) and the hip / knee gains (G3's validated hold gains in contact → the swing servo airborne). The target is the CONTACT ANCHOR unless a
// swing target is commanded (setSwingTarget).
// The contact anchor is the pose captured on the turf when support was released (UNLOADING) and re-captured at TOUCHDOWN: in contact the leg
// holds the foot where it is on the turf — it never drags it or presses it toward an airborne target (measured: a touchdown 7 mm off the swing
// target with the swing servo still engaged put 80–180 N on the "unsupported" foot and felled the stance balance).
// Transitions need their condition for `debounce` seconds (time-based, so the behaviour does not change with the physics rate), with load
// hysteresis loadOff / loadOn (fractions of body weight). A load reading taken while a NON-TURF contact touches the foot is ignored (self-contact
// guard, H4: the sensed load is the residual foot wrench, which includes any other contact force). Touching-piece counts are turf-only.
// Everything the controller derives from the lifecycle is a CONTINUOUS function of s (no boolean switch in the torque path).
export const LIFECYCLE = {
  loadOff: 0.01, loadOn: 0.03,  // unloaded / loaded thresholds, fraction of body weight (G3's holdUnloaded values) [ENG]
  debounce: 0.0125,             // a transition condition must hold this long (s); 3 ticks at 240 Hz [ENG]
  touchdownDebounce: 0.004,     // contact onset after AIRBORNE (s); 1 tick at 240 Hz (≤ dt), 2 at 480 Hz — touchdown must be seen quickly [ENG]
  acceptDebounce: 0.05,         // sustained condition before load acceptance (s): longer than a touchdown impact [ENG]
  bounceDebounce: 0.05,         // TOUCHDOWN → AIRBORNE needs this long without contact (s): a foot resting at the contact threshold (touch flickering 8 ↔ 0
                                // at ~0.5 mm) must not re-arm the airborne servo (measured: repeated TOUCHDOWN ↔ AIRBORNE with 12–18 N·m steps) [ENG]
  wantShare: 0.05,              // requested load share at which a touching foot is brought into support [ENG]
  release: 0.10, accept: 0.10,  // support-weight ramp durations (s) for unloading / load acceptance [ENG]
  swingHz: 4, swingZeta: 0.8,   // swing-leg servo bandwidth and damping ratio (joint-space PD sized from each joint's distal-subtree inertia) [ENG]
  nullWanted: false,            // DIAGNOSTIC (preswing/; default OFF): with NO transfer plan (request null — quiet standing, G2), the default plan is BILATERAL, so a foot
                                // in contact is WANTED (intent-gated acceptance after a touchdown; no low-load release while touching). Measured with touchRest: with
                                // load-only acceptance a landed foot stayed TOUCHDOWN at 0.9 N for the rest of a 25 N·s push run (the deadlock the header describes)
                                // REFUTED (preswing/ lab): no low-load release while touching kept an unloadable foot in support — V2-REF 25 N·s lateral push FELL
  nullAccept: false,            // DIAGNOSTIC (preswing/; default OFF): with NO transfer plan (request null) the default plan is bilateral for ACCEPTANCE only — a foot in
                                // contact (TOUCHING / TOUCHDOWN) is accepted after acceptDebounce; release on low load is unchanged (support still needs load)
};
import { Q, datan2 } from "../core/v2_math.js";
export const LC_STATES = ["SUPPORT", "UNLOADING", "TOUCHING", "LIFTOFF", "AIRBORNE", "TOUCHDOWN", "LOAD_ACCEPT"];
const smooth = (u) => { const x = Math.min(1, Math.max(0, u)); return x * x * (3 - 2 * x); };

export class SupportLifecycle {
  constructor(W, opts = {}) { this.W = W; this.o = { ...LIFECYCLE, ...opts }; this.feet = [0, 1].map(() => ({ state: "SUPPORT", phi: 1, s: 1, psi: 0, a: 0, rho: 1, timer: 0, cond: null, hold: null, prevHold: null, swing: null, since: 0, log: [] })); this.t = 0; }
  // one update per controller tick. sense: { Fz: [N, N], touch: [n, n], other: [bool, bool] }; footPose(n) → { pos, rot } (current pose)
  // ext (T-A abort, option abortCapture; default null → unchanged): { intent: [bool, bool] — the abort PLAN wants foot n loaded once in contact (acceptance still
  //   needs measured contact sustained for acceptDebounce; nothing is credited before), acceptDur: [s|null, s|null] — that foot's load-acceptance ramp duration }
  update(sense, footPose, dt, req = [null, null], ext = null) {   // req[n]: the requested load share of foot n (null = no transfer request: allowed, no intent)
    const o = this.o, W = this.W; this.t += dt;
    for (const n of [0, 1]) { const f = this.feet[n], Fz = sense.Fz[n], contact = sense.touch[n] > 0, other = !!(sense.other && sense.other[n]);
      const loaded = !other && Fz >= o.loadOn * W, rq = req[n], wanted = (rq != null && rq >= o.wantShare) || (o.nullWanted && rq == null) || !!(ext && ext.intent && ext.intent[n]), unloaded = !other && Fz < o.loadOff * W, release = unloaded && !wanted;   // low load releases support only when the plan does not want load there
      const accept = contact && ((loaded && (rq == null || rq >= 0.02)) || wanted || (o.nullAccept && rq == null && (f.state === "TOUCHING" || f.state === "TOUCHDOWN")));
      // candidate transition from the current state (null = stay)
      let want = null, need = o.debounce;
      switch (f.state) {
        case "SUPPORT": if (!contact && unloaded) want = "LIFTOFF"; else if (contact && release) want = "UNLOADING"; break;
        case "UNLOADING": if (accept) { want = "LOAD_ACCEPT"; need = o.acceptDebounce; } else if (f.phi <= 0) want = contact ? "TOUCHING" : "LIFTOFF"; break;
        case "TOUCHING": if (!contact) { want = "LIFTOFF"; need = 0; } else if (accept) { want = "LOAD_ACCEPT"; need = o.acceptDebounce; } break;
        case "LIFTOFF": if (contact) { want = "TOUCHING"; need = 0; } else want = "AIRBORNE"; break;
        case "AIRBORNE": if (contact) { want = "TOUCHDOWN"; need = o.touchdownDebounce; } break;
        case "TOUCHDOWN": if (!contact) { want = "AIRBORNE"; need = o.bounceDebounce; } else if (accept) { want = "LOAD_ACCEPT"; need = o.acceptDebounce; } break;
        case "LOAD_ACCEPT": if (!contact && unloaded) want = "LIFTOFF"; else if (release) want = "UNLOADING"; else if (f.phi >= 1) want = "SUPPORT"; break; }
      // LIFTOFF → AIRBORNE is itself the debounce of contact loss; UNLOADING / LOAD_ACCEPT ends are ramp completions (no extra debounce)
      if (want === "SUPPORT" || (f.state === "UNLOADING" && f.phi <= 0)) need = 0;
      if (want !== f.cond) { f.cond = want; f.timer = 0; }
      if (want) { f.timer += dt; if (f.timer >= need - 1e-12) this._enter(n, want, footPose); }
      // support-weight phase: rises in LOAD_ACCEPT / SUPPORT, falls otherwise (UNLOADING ramps; non-support states sit at 0)
      const up = f.state === "SUPPORT" || f.state === "LOAD_ACCEPT";
      f.phi = up ? Math.min(1, f.phi + dt / (ext && ext.acceptDur && ext.acceptDur[n] ? ext.acceptDur[n] : o.accept)) : Math.max(0, f.phi - dt / o.release);
      if (f.state === "SUPPORT") f.phi = 1;
      f.s = f.state === "SUPPORT" ? 1 : smooth(f.phi);
      f.psi = f.state === "AIRBORNE" ? Math.min(1, f.psi + dt / o.release) : Math.max(0, f.psi - dt / o.accept); f.a = smooth(f.psi);
      // rest weight ρ (read only by the default-off touchRestRamp option, C2): → 1 over `release` while the foot has no commanded swing target and is not
      // AIRBORNE, → 0 otherwise; a continuous weight for a resting (seated) foot, so seating never switches in one tick
      f.rho = f.state !== "AIRBORNE" && !f.swing ? Math.min(1, (f.rho ?? 1) + dt / o.release) : Math.max(0, (f.rho ?? 1) - dt / o.release); }
    return this.feet;
  }
  _enter(n, st, footPose) { const f = this.feet[n], prev = f.state;
    if (st === "UNLOADING" || (st === "LIFTOFF" && prev === "SUPPORT")) f.hold = footPose(n);          // the contact anchor: captured on the turf at release (H2: never re-armed in the air)
    if (st === "TOUCHDOWN") { f.prevHold = f.hold; f.hold = landed(footPose(n), f.hold); }               // … and re-captured where the foot actually landed (blended in by 1 − a)
    if ((st === "TOUCHING" || st === "LIFTOFF") && !f.hold) f.hold = footPose(n);
    f.log.push({ t: this.t, from: prev, to: st }); if (f.log.length > 64) f.log.shift();
    f.state = st; f.cond = null; f.timer = 0; f.since = this.t;
    if (st === "UNLOADING" || (st === "LIFTOFF" && prev === "SUPPORT")) f.prevHold = null;
    if (st === "SUPPORT") { f.hold = null; f.swing = null; f.prevHold = null; } }
  // the pose the leg servo / IK aims the foot at while s < 1: a COMMANDED swing target if one is set (any non-support state — a planned lift
  // starts from TOUCHING; the commanding script must start its profile at target(n) and hand back with setSwingTarget(n, null) once the foot is
  // down, so the target is continuous), else the contact anchor (after a touchdown the new anchor fades in as a → 0: no target step)
  target(n) { const f = this.feet[n]; if (f.swing) return f.swing; return f.prevHold ? blendPose(f.prevHold, f.hold, 1 - f.a) : f.hold; }
  // DIAGNOSTIC (preswing/, StandController lcTouch.reseed): re-seed the contact anchor's horizontal position and yaw to the foot's current pose (the anchor
  // height and tilt are kept): a resting foot's horizontal place and pivot are then left to friction / contact, and target(n) stays the pose it rests at
  reseed(n, pose) { const f = this.feet[n]; if (!f.hold) return; const fH = Q.rot(f.hold.rot, [0, 0, 1]), fC = Q.rot(pose.rot, [0, 0, 1]); let d = datan2(fC[0], fC[2]) - datan2(fH[0], fH[2]);
    if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; f.hold = { pos: [pose.pos[0], f.hold.pos[1], pose.pos[2]], rot: Q.norm(Q.mul(Q.axis([0, 1, 0], d), f.hold.rot)) }; f.prevHold = null; }
  setSwingTarget(n, pose) { this.feet[n].swing = pose ? { pos: pose.pos.slice(), rot: pose.rot.slice() } : null; }
  airborne(n) { const s = this.feet[n].state; return s === "AIRBORNE" || s === "LIFTOFF"; }
  getState() { return { t: this.t, feet: this.feet.map(f => ({ ...f, log: f.log.slice() })) }; }
  setState(x) { this.t = x.t; this.feet = x.feet.map(f => ({ ...f, log: f.log.slice() })); }
}
// the anchor after a touchdown: the landing's horizontal position and yaw, with the turf-flat height and tilt of the previous anchor (the first
// contact is usually a tilted, partly touching foot — measured: anchoring that pose held the foot on 2 of 8 pieces)
function landed(cur, prev) { if (!prev) return cur; const yaw = (q) => { const f = Q.rot(q, [0, 0, 1]); return datan2(f[0], f[2]); }, d = yaw(cur.rot) - yaw(prev.rot);
  return { pos: [cur.pos[0], prev.pos[1], cur.pos[2]], rot: Q.norm(Q.mul(Q.axis([0, 1, 0], d), prev.rot)) }; }
// pose helpers (deterministic arithmetic only): linear position blend, normalised-lerp orientation blend (shortest arc)
export function blendPose(a, b, w) { if (w <= 0) return a; if (w >= 1) return b; const pos = [0, 1, 2].map(i => a.pos[i] + (b.pos[i] - a.pos[i]) * w);
  const d = a.rot[0] * b.rot[0] + a.rot[1] * b.rot[1] + a.rot[2] * b.rot[2] + a.rot[3] * b.rot[3], sg = d < 0 ? -1 : 1, q = [0, 1, 2, 3].map(i => a.rot[i] * (1 - w) + b.rot[i] * sg * w), l = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);
  return { pos, rot: q.map(x => x / l) }; }
