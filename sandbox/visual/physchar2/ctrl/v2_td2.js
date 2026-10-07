// ═══ physchar2/ctrl/v2_td2.js — TOUCHDOWN COORDINATOR TD2 (e2/TD2_PREREG.md; design e2/TD2_DESIGN_STUDY.md): band-top approach + bounded contact search ════════════════
// Used only with the commanding-layer option e2td: "search" (the E2 step sequencer / planner and the validation harness tools/td2_val.mjs); the StandController does not read
// it. A trajectory only SCHEDULES the swing target and its analytic reference; Jolt contact (the lifecycle) decides touchdown, support and load (physics-authoritative).
//   1. planned approach: the validated E2 swing segment to the foothold raised by the possible-contact band height h_B (turf normal = world up), ending at rest at T with the
//      tangential position and orientation complete;
//   2. tangential settling at the band top (τ_d), then the bounded search: only the normal coordinate advances — a rest-to-rest quintic of depth D_max over τ_s, tangential position and orientation held — then held;
//   3. measured contact (lifecycle TOUCHDOWN) ends it: E2's acceptance / hand-back to the landed anchor; the lifecycle's accommodation and load acceptance follow;
//   4. no contact by the planned touchdown (T + τ_d + τ_c) + the late-contact hold → failed touchdown (E2's existing re-plan; never a declared contact).
// Parameters derived in the design study §3 from Touchline's own quantities (no donor constants): h_B = ⌈u_dn + d_c⌉, D_max = ⌈h_B − (d_c − u_up) + Δ_T⌉ (0.05 mm steps),
// τ_s = the largest of the validated late-descent jerk / acceleration / speed, contact-report, E2-5 normal-speed and E2-5 impact bounds (5 ms step), τ_c = the nominal
// contact time within the search (reference lowest point at d_c).
import { stepSegment } from "./v2_swing.js";

// amended before any battery run (e2/TD2_PREREG.md §8 A2): derived by the same rules from the QUALIFIED uncertainty of the new trajectory region (Decision 4; turf-off nominal
// qualifications in evidence_td2_design/: the final one of the amended timeline — approach, settling dwell, search — gives a downward deviation ≤ 2.26 mm before the search start
// and ≤ 0.31 mm upward; the first one gives the horizontal foot speed above 50 mm/s until ≤ 83 ms after T): h_B = ⌈2.26 + 0.5⌉ = 2.80 mm, D_max = ⌈2.80 − (0.5 − 0.31) + 0.05⌉ = 2.70 mm,
// τ_s 0.205 s (E2-5 impact bound), τ_c 0.1459 s, plus the tangential-settling interval τ_d = 0.085 s at the band top before the low-speed entry (Decision 2: tangential-complete time and
// low-speed entry are independent). The preregistered first values (h_B 2.05, D_max 1.95, τ_s 0.150, τ_c 0.1005, no τ_d) are kept in the prereg.
export const TD2 = { hB: 0.00280, Dmax: 0.00270, tauS: 0.205, tauC: 0.1459, tauD: 0.085, lateHold: 0.3 };
// TD2B (e2/TD2B_PREREG.md; the next TD2 iteration): the certified possible-contact window enters the band explicitly (h_B = ⌈u_dn + d_c + Δ_T⌉ = 2.85 mm, D_max = ⌈h_B − (d_c − Δ_T − u_up)⌉
// = 2.75 mm, τ_s 0.210 s, τ_c 0.1499 s, τ_d 0.085 s) and the escalation continues the bounded search (escalationSegment). Every function takes the parameter set; the default stays TD2
// (frozen: tools/td2_val.mjs and its battery stay reproducible)
export const TD2B = { hB: 0.00285, Dmax: 0.00275, tauS: 0.210, tauC: 0.1499, tauD: 0.085, lateHold: 0.3 };
export const td2On = (o) => !!o && o.e2td === "search";
export const td2bOn = (o) => !!o && o.e2td === "search2";
// the approach goal: the commanded foothold raised by the band height along the turf normal
export function approachGoal(pose, P = TD2) { return { pos: [pose.pos[0], pose.pos[1] + P.hB, pose.pos[2]], rot: pose.rot.slice() }; }
// the search segment from the approach end (at rest): normal coordinate only (a stepSegment without knot: horizontal and rotation quintics are constant at the start pose)
export function searchSegment(from, P = TD2) { const ref = { p: from.pos.slice(), v: [0, 0, 0], a: [0, 0, 0], th: [0, 0, 0], w: [0, 0, 0], al: [0, 0, 0] };
  return stepSegment(ref, { pos: [from.pos[0], from.pos[1] - P.Dmax, from.pos[2]], rot: from.rot.slice() }, P.tauS, null); }
// the search-end pose (the deepest commanded pose; certified reachable by the planner)
export function searchEnd(pose, P = TD2) { return { pos: [pose.pos[0], pose.pos[1] + P.hB - P.Dmax, pose.pos[2]], rot: pose.rot.slice() }; }
// planned touchdown time after the swing start (balance / planning prediction, Decision 6): the approach T plus the nominal contact time within the search
export const plannedTD = (T, P = TD2) => T + P.tauD + P.tauC;
// the search start (low-speed entry) after the swing start: the approach end T plus the tangential-settling interval at the band top
export const searchStart = (T, P = TD2) => T + P.tauD;
// TD2B escalation (e2/TD2B_PREREG.md §2): after E2's failed touchdown the bounded search CONTINUES — from the current reference at rest (from) down to the planner's turf window's late edge
// floorY (the planner's foothold height + (h_B − D_max)), normal coordinate only, tangential position and orientation held, a rest-to-rest quintic with the normal search's peak speed
// (duration ⌈1.875·D_e / v_peak⌉, 5 ms). Returns null when there is no depth left (the commanded foothold already at the planner's turf): an explicit touchdown failure
export function escalationSegment(from, floorY, P = TD2B) { const De = from.pos[1] - floorY; if (!(De > 1e-9)) return null; const vPk = 1.875 * P.Dmax / P.tauS, tauE = Math.ceil(1.875 * De / vPk / 0.005 - 1e-9) * 0.005;
  const ref = { p: from.pos.slice(), v: [0, 0, 0], a: [0, 0, 0], th: [0, 0, 0], w: [0, 0, 0], al: [0, 0, 0] }; return stepSegment(ref, { pos: [from.pos[0], floorY, from.pos[2]], rot: from.rot.slice() }, tauE, null); }
