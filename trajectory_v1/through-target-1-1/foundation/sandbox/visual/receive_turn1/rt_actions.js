// ═══ receive_turn1/rt_actions.js — RECEIVE-TURN-1 phase 2: the STATIONARY RECEIVE-AND-TURN ACTION LIBRARY (authored actions, by turn angle) ════════
// A stationary receiver facing the passer knows, before the ball arrives, the space he wants to attack: desiredTurnAngle θ = the signed exit
// direction relative to his initial facing (deg, + = right turn; 0 = straight back toward the passer, 180 = directly away from him). One AUTHORED
// action does the whole thing — preparation during the ball's travel, the first touch, the rotation and the exit — and the ball stays the only
// authority: the action defines the ideal first touch (where the ball should go so that player and ball meet again on the exit line), Ball
// Control executes it (rk_model's curve B + the bounded keyed draws of phase 1), the rigid-body ball does the rest.
//
// FAMILIES (the smallest set whose contact mechanics differ; see RECEIVE_TURN1_RESEARCH.md for the coaching basis and what is our own choice):
//   DIRECTIONAL   open slightly, inside of either foot takes the pace off and places the ball a stride ahead on the exit line (small turns)
//   HALF_TURN     open the body side-on BEFORE the ball arrives; the ball travels across the body to the back foot (the foot on the turn side),
//                 whose inside directs it onto the new line; the rest of the turn continues through the touch (the inside-foot soft turn)
//   OUTSIDE_TURN  the foot on the turn side cushions / redirects with its outside while the body turns with the ball (needs an impulse the
//                 outside can face: slow balls, or a ball arriving across the body)
//   THROUGH_TURN  body still near-square; the foot AWAY from the turn reaches across / behind the standing leg and sends the ball with its inside
//                 through the stance in an INTERMEDIATE direction; the body rotates around the ball on the standing foot and emerges on the exit
//                 line (the Cruyff / Gravenberch-like receive) — the first-touch vector ≠ the exit vector
// Every family is authored ONCE for a RIGHT turn (σ = +1) in body-local [ahead, lateral] (+ lateral = right) and mirrored deterministically for a
// left turn (lateral → −lateral, the near / far foot swap, the direction draw's sign follows the turn side): a two-footed receiver's left turn is
// the exact mirror image of his right turn, draw for draw.
// Frames: rk_sim's local [f, r, z] (r = the receiver's right at the start); heading ψ: direction (cos ψ, sin ψ) in (f, r), + = right.
import { dsin, dcos } from "../physchar2/core/v2_math.js";
export const DEG = Math.PI / 180;
export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const s5 = (t) => { t = clamp(t, 0, 1); return t * t * t * (t * (6 * t - 15) + 10); };
export const ds5 = (t) => (t <= 0 || t >= 1 ? 0 : 30 * t * t * (t - 1) * (t - 1));          // d s5 / dt
export const tab = (T, x) => { if (x <= T[0][0]) return T[0][1]; for (let i = 1; i < T.length; i++) if (x <= T[i][0]) { const a = T[i - 1], b = T[i]; return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); } return T[T.length - 1][1]; };
export const wrapA = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };
export const dir = (psi) => [dcos(psi), dsin(psi)], perp = (psi) => [-dsin(psi), dcos(psi)];
export const toL2 = (S, psi, a, l) => { const c = dcos(psi), s = dsin(psi); return [S[0] + a * c - l * s, S[1] + a * s + l * c]; };   // body [ahead, lateral] → local
export const toB2 = (S, psi, q) => { const dx = q[0] - S[0], dy = q[1] - S[1], c = dcos(psi), s = dsin(psi); return [dx * c + dy * s, -dx * s + dy * c]; };
export const hdg = (v) => Math.atan2(v[1], v[0]);
export const other = (F) => (F === "R" ? "L" : "R"), sgnF = (F) => (F === "R" ? 1 : -1);

// ── CONTACT SURFACES (RECEIVE-CONTROL-1.1's boot-surface table, rx_actions.js SURF, copied unchanged): the outward normal of a surface can face the
// IMPULSE Δv = v_out − v_in at an angle α from the body's facing (deg, + right) inside these ranges for the RIGHT foot (the left mirrors α → −α);
// a gentle touch (|Δv| < gentle) can be made with any; otherwise friction and the foot's own motion deflect the ball within tol(|Δv|) of the
// normal (wide for a soft touch, narrow for a hard one) — the deviation used adds difficulty (glance) ─────────────────────────────────────────────
export const SURF = {
  INSIDE: { R: [-165, 15], pref: 0 }, OUTSIDE: { R: [20, 165], pref: 0.20 }, LACES: { R: [-30, 30], pref: 0.15 }, SOLE: { R: [150, 210], pref: 0.30 },
  gentle: 0.8, tol: [[1, 50], [3, 42], [6, 30], [10, 20], [16, 14]],
};
// can surface s of foot F face an impulse at α (deg, body frame)? → { ok, glance (deg outside the nominal range, ≤ tol) }
export function surfaceFits(s, F, alphaDeg, dvMag) {
  if (dvMag < SURF.gentle) return { ok: true, glance: 0 };
  const a = sgnF(F) * alphaDeg, [lo, hi] = SURF[s].R, tol = tab(SURF.tol, dvMag), x = ((a - lo) % 360 + 360) % 360, w = hi - lo;
  if (x <= w) return { ok: true, glance: 0 };
  const off = Math.min(x - w, 360 - x); return off <= tol ? { ok: true, glance: off } : { ok: false, glance: off };
}

// ── THE MOVEMENT MODEL (Agility / Dribbling held at a fixed neutral-high baseline — NOT rated here; the hooks are ext.agility / ext.dribbling) ────
//   omegaPrep   °/s the body opens during the ball's travel (with the preparation step); prepMin: the shortest preparation (s)
//   turnBase, omegaTurn: the post-contact rotation (pivot on the standing foot) takes turnBase + |Δψ| / omegaTurn s, smootherstep-shaped
//   goShare     the run along the exit line starts when this share of the rotation is done; accel, vMax: the exit acceleration (m/s², m/s)
//   reach       the ball is this far in front of the root when he plays it again (the reconnection touch); react: the receiver sees what his
//               touch actually did this long after the contact; vAdj: m/s of correction he can add to his planned run after that
export const MOVE = { omegaPrep: 300, prepMin: 0.30, turnBase: 0.10, omegaTurn: 520, goShare: 0.55, accel: 5.0, vMax: 6.0, reach: 0.40, react: 0.15, vAdj: 3.2,
  ext: { agility: null, dribbling: null } };
export const turnTime = (dPsiDeg) => MOVE.turnBase + Math.abs(dPsiDeg) / (MOVE.omegaTurn * (MOVE.ext.agility || 1));
export const runDist = (t) => { const a = MOVE.accel, v = MOVE.vMax, tv = v / a; return t <= 0 ? 0 : t <= tv ? 0.5 * a * t * t : 0.5 * a * tv * tv + v * (t - tv); };
export const runTime = (d) => { const a = MOVE.accel, v = MOVE.vMax, tv = v / a, dv = 0.5 * a * tv * tv; return d <= 0 ? 0 : d <= dv ? Math.sqrt(2 * d / a) : tv + (d - dv) / v; };
export const runSpeed = (t) => (t <= 0 ? 0 : Math.min(MOVE.vMax, MOVE.accel * t));

// ── THE FAMILIES (right turn, σ = +1). θ: [lo, hi] the comfortable range (outside it the cost grows by wRange per 10°, it is never a hard cut);
//   prep: the body's facing at the contact ψc = clamp(k·θ, 0, max) (deg) — how far he opened before the ball arrived
//   feet: "near" (the foot on the turn side), "far" (the other), "either"; surfaces: in preference order
//   variants: the contact geometry, body-local at the contact facing ψc, for the contact foot on the turn side's convention (lateral × σ)
//             (THROUGH_TURN: "across" = the far foot meets the ball in front of the standing foot and sends it across the stance — a sideways exit;
//             "behind" = the ball has rolled between the feet and the far foot, behind the standing leg, sends it on behind the standing heel —
//             the near-reversals; a straight touch from in front of the standing foot to behind it would hit the foot, so the planner rejects it):
//             c = the ball centre at the CONTACT marker, stand = the standing foot's plant (the pivot of the rotation)
//   run: the planned run along the exit line before the next touch (m); m: the family's intrinsic difficulty factor (× the touch's D)
//   rotIn: the share of the post-contact rotation that happens INSIDE the touch's ±0.15 s window (turning while touching is harder)
export const FAMILIES = {
  DIRECTIONAL: { id: "DIRECTIONAL", label: "open-body directional receive", theta: [0, 45], prep: { k: 0.35, max: 20 }, feet: "either", surfaces: ["INSIDE", "LACES"],
    variants: { front: { c: [0.38, 0.10], stand: [-0.02, -0.13] } }, run: 0.55, m: 1.0, rotIn: 0.25, pref: 0,
    doc: "Opens slightly toward the space, takes the pace off with the inside of the foot and places the ball a stride ahead on the exit line; minimal rotation — an ordinary directional receive." },
  HALF_TURN: { id: "HALF_TURN", label: "half-turn · back-foot / across-body receive", theta: [30, 120], prep: { k: 0.55, max: 70 }, feet: "near", surfaces: ["INSIDE"],
    variants: { back: { c: [0.16, 0.20], stand: [0.10, -0.12] } }, run: 0.75, m: 1.0, rotIn: 0.35, pref: 0,
    doc: "Opens side-on before the ball arrives (front foot planted toward the passer), lets the ball travel across the body and receives with the back foot's inside onto the new line; at larger angles the rotation continues through the touch (the inside-foot soft turn)." },
  OUTSIDE_TURN: { id: "OUTSIDE_TURN", label: "outside-of-foot turn", theta: [70, 150], prep: { k: 0.30, max: 45 }, feet: "near", surfaces: ["OUTSIDE"],
    variants: { side: { c: [0.28, 0.21], stand: [0.0, -0.13] } }, run: 0.65, m: 1.15, rotIn: 0.45, pref: 0.05,
    doc: "The foot on the turn side cushions / redirects with its outside while the body turns with the ball, pivoting on the other foot (needs an impulse the outside can face — a slow ball, or one arriving across the body)." },
  THROUGH_TURN: { id: "THROUGH_TURN", label: "through-stance turn (far foot, across / behind the standing leg)", theta: [110, 180], prep: { k: 0.12, max: 25 }, feet: "far", surfaces: ["INSIDE"],
    variants: { across: { c: [0.24, 0.10], stand: [0.02, 0.18] }, behind: { c: [-0.08, 0.04], stand: [0.10, 0.25] } }, run: 0.65, m: 1.10, rotIn: 0.40, pref: 0,
    doc: "Body still near-square: the foot away from the turn reaches across in front of / behind the standing leg and sends the ball with its inside THROUGH the stance toward the point where he will meet it again on the exit line; he rotates around the ball on the standing foot and emerges on the new line (Cruyff / Gravenberch-like). The first-touch vector is not the exit vector." },
};
export const FAMILY_ORDER = ["DIRECTIONAL", "HALF_TURN", "OUTSIDE_TURN", "THROUGH_TURN"];
// the action's difficulty factor on top of the incoming ball's kill difficulty (rk_model.difficulty of the same ball for the inside of the foot):
//   × m · (1 + rot · (rotation inside the touch window / 180°) + glance · deg + surface + out · (touch speed / vRef))
export const TDIFF = { rot: 0.55, glance: 0.008, out: 0.10, surface: { INSIDE: 0, LACES: 0.10, OUTSIDE: 0.20, SOLE: 0.15 } };
// the selection's cost weights (Ball Control never enters): J = D + wRange · (degrees outside the family's range / 10) + wShift · shift + wTime ·
// (reconnection time) + surface / family preference + the other foot (the receiver's preferred foot: a selection preference only — no weak-foot
// execution term in this clean-condition study) + wPath (the planned ball path passing closer than clear to the standing foot)
export const SELECT = { wRange: 0.12, wShift: 0.6, wTime: 0.5, wOpen: 0.10, otherFoot: 0.04, prefFoot: "R", every: 2, shiftMax: 0.75, clear: 0.20, wPath: 2.0, read: 0.5, openBase: 0.15 };
// PREPARATION TIME: the body can open only as far as the time he has before the contact allows: |ψc| ≤ omegaPrep · (prep − openBase). In the
// clean study he reads the pass `read` s before it is struck (≈ 1.5 s before the contact: no limit); cond.prep (s) sets a late read.
