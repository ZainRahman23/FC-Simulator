// ═══ tc_unified1/u_tc.js — TC-LAYERED-2: B4 + B5 DEVELOPED on BASELINE-88573ef0 (owner, 21 Oct: "PRESERVE BASELINE A, DEVELOP B4 + B5")
// TC-LAYERED-1's layered copy of 88573ef0's simulation (tc_layered/, kept unchanged as the record), continued. ALL OFF = exact 88573ef0 (checked:
// tools/u_equiv.mjs). The movement capability (Agility: acceleration, braking, lateral / yaw limits, speeds, the carry tracker) is NEVER changed —
// a limit it imposes is reported as an AGILITY/MOVEMENT DEPENDENCY (Astra's AGILITY-99-V1 is the separate movement workstream).
//   THE CANDIDATE STACK (owner): A · A + B4 · A + B5 · A + B4 + B5 · (+ B2, optional)
//   B4 generic   the generic effort-turn vocabulary between the carry and the named moves, and every candidate scored on its PREDICTED FOOTBALL
//                OUTCOME (outcome(): the contact, the ball and the body after it, the next useful touch, the speed kept, protection) — no angle fit
//   B5 exits     ordinary control returns once the meaningful action is complete (the striking foot's follow-through), no exit lock
//      windups   a technique entered at its earliest valid phase when the body / ball already satisfy the preparation it opens with
//   B2 early / prefFoot / approach — optional, not developed further
//   REJECTED, kept OFF (TC-LAYERED-1, owner 21 Oct): B1 ack (u_body.js) · B3 narrow · B6 target
//   ATTRIBUTE-READY: what Dribbling will scale later is read from CAPS (techCaps(dri)) — the D99 ceiling only for now
// ── (88573ef0's header, unchanged) ── tc_playtest1/pt_sim.js — TECHNICAL-CONTROL PLAYTEST-1: THE AUTHORITATIVE PLAYABLE SIMULATION ═══════════════════════════════════════════════════
// One player and the frozen ball kernel, 240 Hz, driven only by a movement REQUEST (a direction or none, and a speed mode) — no skill input. The
// footballer decides how to achieve it:
//   · A PLAN is the near future (1.5 s): the centre of mass's path (speed / travel heading, integrated tick by tick), the pelvis heading, the
//     posture channels, every footfall (foot, touchdown, lift-off, where, the foot's heading) and every planned ball contact (foot, surface, tick,
//     what the touch must do). The simulation only EXECUTES the current plan: the body moves along it, a contact at its tick is one kernel launch
//     computed from where the ball really is.
//   · THE RESOLVER re-plans from the present when the request changes, after every contact (closed loop: the ball where it really went), at every
//     footfall and at least every 0.3 s. Candidates: the CARRY (TECHNICAL-CONTROL-1.2's carry: the lane, the lane foot's touches every one or more
//     strides by speed, forward pushes with the laces / outer instep, corrections with the inside or outside, the body bending at Agility's limits)
//     and every feasible instance of the five TECHNICAL-CONTROL-1.5 techniques (pt_tech.js) — either foot, either side, any angle inside a technique's
//     hard range, the decisive contact anchored on the stride (the technique's first stance must be the right foot at the right time, so WHEN the
//     request comes decides which techniques are possible). Each is scored (time to the decisive contact, time to the new line, contacts, protection,
//     the angle's fit, the speed's fit, the preferred foot, the ball's separation) and the best is executed — no angle buckets.
//   · COMMITMENT (Dribbling): a footfall or a contact closer than `react` cannot change; a technique is committed `commit` before its decisive contact
//     and stays until its plant is released — while committed, a new request only re-targets its exit (within its range).
// Everything here is deterministic (fixed tick, no clock, no randomness at Ball Control 99; below 99 the provisional execution error is keyed on the
// seed and the contact). Nothing here reads the posed body (pt_body.js is presentation).
// FRAMES: pitch (x, y) metres; heading h with dir(h) = (cos h, sin h); the player's right = (−sin h, cos h); + heading change = a right turn.
import { DT, R, Ball, predict, speedFor, rollFrom } from "../tc_baseline_88573ef0/pt_ball.js";
import { params, gaitTable, lead, WIDTH, DEG, MODES } from "../tc_baseline_88573ef0/pt_params.js";
import { LABEL as LABEL0 } from "../tc_baseline_88573ef0/pt_tech.js";
// (DRIBBLING VOCAB-1: the technical library — the locked baseline's five references (unchanged) + the new parametric techniques, v_tech.js;
// the AUTOMATIC candidates are only those the library marks AUTO / AUTO+MANUAL (v_meta.js); every other technique is reached by a MANUAL
// technical intent (requestSkill) — never by chance)
import { TEMPLATES, LABEL_V } from "./v_tech.js";
import { PROFILES } from "../agility99/movement.js";   // (ADV-4: read only — the rated stop of `bodyBrake` techniques)
import { AUTO_TECH } from "./v_meta.js";
// (CRUYFF-CHOP-1: the highest entry speed a technique is made from without braking first — its range, and for a near-stop technique (vCmax)
// the speed its own braking window can bring down to its contact speed)
// (ADV-4: THE BALL-CARRYING D38 CURVE — this build's own player accelerating from rest with the ball (S99 · D38 · CARRY-B), every 0.05 s;
// a credible technique's re-acceleration after its lowest speed never runs ahead of it: "D38 governs the actual physical acceleration")
const D38_ON = [0, 0.467, 0.932, 1.394, 1.852, 2.303, 2.745, 3.178, 3.598, 4.005, 4.399, 4.78, 5.148, 5.5, 5.835, 6.153, 6.453, 6.735, 6.999, 7.244, 7.472, 7.682, 7.875, 8.052, 8.213, 8.36, 8.493, 8.613, 8.722, 8.82, 8.908, 8.988, 9.059, 9.123, 9.18, 9.232, 9.278, 9.319, 9.355, 9.389, 9.421, 9.453, 9.485, 9.517, 9.55, 9.582, 9.614, 9.646, 9.658];
const d38At = (t) => { const i = Math.max(0, t / 0.05); if (i >= D38_ON.length - 1) return D38_ON[D38_ON.length - 1]; const j = Math.floor(i); return D38_ON[j] + (D38_ON[j + 1] - D38_ON[j]) * (i - j); };
const d38T = (v) => { if (v <= 0) return 0; for (let j = 1; j < D38_ON.length; j++) if (D38_ON[j] >= v) return 0.05 * (j - 1 + (v - D38_ON[j - 1]) / (D38_ON[j] - D38_ON[j - 1])); return 0.05 * (D38_ON.length - 1); };
export const d38From = (v0, dx) => d38At(d38T(v0) + Math.max(0, dx));
export const PREP_TECH = new Set(["CRUYFF", "HOOK", "OUTHOOK", "CHOP", "VTURN", "VTURN_B", "VPULL", "LDRAG", "PULLPUSH", "MATTHEWS", "MATTHEWS_C", "DEADEN", "HESITATE"]);   // (ADV-4: + the V-turn, Matthews, stop-and-go families)   // (the techniques whose requests prepare by braking)
// (ADV-4: a technique that is a STOP (`bodyBrake`: the deaden) brakes before its contact as the body's own stop does — the rated A99-C stop
// (Astra's profile: from v to rest in max(0.12, stopTime × (0.4 + 0.6 v / 8)) s, 25 m/s² from a sprint, 20 from a run) — not at the planner's
// 0.9 × aBrake (8.6 m/s²): the basic stop (the stick released) is the A99-C stop; the deaden braking three times more gently lost to it by
// construction. Tools: ABL=bodybrake restores the planner's rate)
const stopRate = (P, v) => { const pr = P.agiProfile || PROFILES["A99-C"]; return v / Math.max(0.12, pr.stopTime * (0.4 + 0.6 * v / 8)); };
export const brakeOf = (T, P, v) => (T.bodyBrake && !String(globalThis.process?.env?.ABL || "").includes("bodybrake") ? Math.max(P.aBrake * 0.9, stopRate(P, Math.max(0.5, v))) : P.aBrake * 0.9);
export const entryMax = (T, P) => (T.vCmax != null && !String(globalThis.process?.env?.ABL || "").includes("vcmax") ? Math.min(T.vRange[1], T.vCmax + (T.bodyBrake ? brakeOf(T, P, T.vRange[1]) : P.aBrake * 0.9) * -T.start) : T.vRange[1]);
const CC_ABL = Object.fromEntries(String(globalThis.process?.env?.ABL || "").split(",").filter(Boolean).map((k) => [k, true]));   // (tools only: CRUYFF-CHOP-1 ablations)
const SET_ABL = String(globalThis.process?.env?.ABL || "").includes("set");   // (tools only: ABL=set)
const TECH_IDS = AUTO_TECH, LABEL = Object.assign({}, LABEL0, LABEL_V);
import { pchip, pchipAt } from "../technical_control11/tc11_leg.js";
export { DT, R, DEG, MODES, TEMPLATES, LABEL };
// ── THE LAYERS: the flags, their owner items, and the cumulative presets (A = 88573ef0 … ALL = the whole stack) ────────────────────────────────
export const LAYERS = [
  { id: "c", label: "A99-C movement (Astra, exact)", b: "C", items: "overnight §3" },
  { id: "support", label: "Persistent support — one shared foot plan", b: "S", items: "overnight §4–8" },
  { id: "ack", label: "Immediate acknowledgement", b: "B1", items: "§1–2" },
  { id: "early", label: "Revisable / earlier touch opportunities", b: "B2", items: "§3–4, §15" },
  { id: "prefFoot", label: "Preferred foot = preference, not a wait", b: "B2", items: "§5" },
  { id: "approach", label: "Carry approach changes before the ball does", b: "B2", items: "§16" },
  { id: "narrow", label: "Narrow contact commitment", b: "B3", items: "§6–8" },
  { id: "generic", label: "Generic effort turns (named moves contextual)", b: "B4", items: "§9–11" },
  { id: "exits", label: "Short technical exits", b: "B5", items: "§13" },
  { id: "windups", label: "Short wind-ups", b: "B5", items: "§12" },
  { id: "target", label: "Next-action-aware BC99 targets", b: "B6", items: "§14" },
];
export const LAYERS_OFF = Object.fromEntries(LAYERS.map((x) => [x.id, false]));
// (the candidate stack: presets name the LAYERS they switch on; B1 / B3 / B6 are rejected — toggles only, never in a preset)
// (TC-UNIFIED-1, owner's overnight toggles: A · A + C · A + C + SUPPORT · A + C + SUPPORT + B4 · FULL; TC-LAYERED-2's presets kept for comparison)
export const PRESETS = { A: [], AC: ["c"], ACS: ["c", "support"], ACS4: ["c", "support", "generic"], FULL: ["c", "support", "generic", "exits", "windups"],
  B4: ["generic"], B5: ["exits", "windups"], B45: ["generic", "exits", "windups"], B452: ["generic", "exits", "windups", "early", "prefFoot", "approach"] };
export const PRESET_LABEL = { A: "A (88573ef0)", AC: "A + C", ACS: "A + C + SUPPORT", ACS4: "A + C + SUPPORT + B4", FULL: "FULL", B4: "A + B4", B5: "A + B5", B45: "A + B4 + B5", B452: "A + B4 + B5 + B2" };
export const REJECTED = ["ack", "narrow", "target"];
export const presetLayers = (name) => Object.fromEntries(LAYERS.map((x) => [x.id, (PRESETS[name] || []).includes(x.id)]));
const hyp = Math.hypot, abs = Math.abs, max = Math.max, min = Math.min, PI = Math.PI;
export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const wrap = (a) => { a = (a + PI) % (2 * PI); if (a < 0) a += 2 * PI; return a - PI; };
export const dir = (h) => [Math.cos(h), Math.sin(h)], rgt = (h) => [-Math.sin(h), Math.cos(h)], hdg = (v) => Math.atan2(v[1], v[0]);
const sgn = (F) => (F === "R" ? 1 : -1), other = (F) => (F === "R" ? "L" : "R");
const lerp = (a, b, t) => a + (b - a) * t;
export const toLocal = (q, P, h) => { const dx = q[0] - P[0], dy = q[1] - P[1], c = Math.cos(h), s = Math.sin(h); return [dx * c + dy * s, -dx * s + dy * c]; };
export const fromLocal = (P, h, a, l) => { const c = Math.cos(h), s = Math.sin(h); return [P[0] + a * c - l * s, P[1] + a * s + l * c]; };
export class Curve { constructor(keys) { this.K = keys.slice().sort((a, b) => a[0] - b[0]); for (let i = this.K.length - 1; i > 0; i--) if (this.K[i][0] - this.K[i - 1][0] < 1e-6) this.K.splice(i - 1, 1); this.P = this.K.length > 1 ? pchip(this.K.map(([t, v]) => ({ t, v: [v] })), 1) : null; }
  at(t) { return this.P ? pchipAt(this.P, t, 1)[0] : this.K[0][1]; } }
// the carry's constants (TECHNICAL-CONTROL-1.2's carry, re-stated)
export const CARRY = {
  touchBefore: 0.075,                            // a touch at the end of the touching foot's swing, this long before it lands (TECHNICAL-CONTROL-1)
  ahead: (v) => min(0.50, 0.30 + 0.03 * v),      // the next touch point: ahead of the centre of mass …
  lane: (mode) => (mode === "WALK" ? 0.10 : mode === "SPRINT" ? 0.12 : 0.13), // … and to the touching foot's side
  rhythm: (mode, v) => ((mode === "SPRINT" && v > 5.6) || v > 6.2 ? 2 : 1), // swings of the touching foot between two touches (sprint at speed: touch → strides → touch; accelerating: every swing)
  reach: { a: [0.06, 0.78], l: [-0.14, 0.44], slow: { a: [-0.16, 0.62], l: 0.46 } },   // where a swinging foot can play the ball (centre-of-mass frame)
  redirect: 48,                                  // ° a running touch can redirect the ball at most (any amount below 1.6 m/s)
  vCap: 13.5,
};
// the solution's identifier (the owner's names): CARRY · COMPACT_INSIDE_REDIRECT · … · RONALDO_CHOP · CRUYFF · HOOK · DRAG_BACK · OUTSIDE_CUT
export const SOLUTION = { CARRY: "CARRY", CIR: "COMPACT_INSIDE_REDIRECT", COR: "COMPACT_OUTSIDE_REDIRECT", ABG: "GATHER", URG: "URGENT_REACH", BRT: "BRAKING_TOUCH", BPV: "BRAKING_PIVOT",
  CHOP: "RONALDO_CHOP", CRUYFF: "CRUYFF", HOOK: "HOOK", DRAGBACK: "DRAG_BACK", OUTCUT: "OUTSIDE_CUT", LAT: "LATERAL_TRANSFER", KNK: "KNOCK_ON", SOL: "SOLE_ROLL", FNO: "FEINT_OUTSIDE_CUT", FNI: "FEINT_INSIDE_CUT" };
export const actionId = (a) => (a.kind === "GENERIC" ? SOLUTION[a.fam] : a.tech ? SOLUTION[a.tech] || a.tech : a.label === "CARRY" ? (a.chase ? "CARRY (pursuit)" : "CARRY") : a.label);
// ── ATTRIBUTE-READY (owner: "structure B4 / B5 so that later Dribbling can influence …" — the D99 ceiling only; no 1–99 curve is built) ────────────
//   vocabulary      the generic families available            urgentEffort   the cost of a lunge (an urgent reach) — difficult contacts
//   entrySlack      how much braking the approach may absorb when a technique is entered at its plant (m/s above the plant's speed) — preparation
//   exitShare       the share of the striking foot's authored follow-through before ordinary control returns — technical exit speed
//   lateAdapt       a generic touch is committed only within this window before it (s) — how late it can adapt
//   entryMin        a technique entered no later than this before its decisive contact (s; baseline: commit + 0.04 = 0.12 at D99)
//   quickStep       the step into a technique may land this share of a stride sooner than its natural landing (baseline: 0.20)
export function techCaps(dri) { return { vocabulary: ["CIR", "COR", "GATHER", "URG", "BRT", "BPV"], urgentEffort: 0.25, entrySlack: 0.8, entryMin: 0.07, quickStep: 0.35, exitShare: 1.0, lateAdapt: null, dri }; }
export const CAPS = techCaps(99);
// (DRIBBLING VOCAB-1: the body feint's parameters — the fake's duration (s), the side lean / trunk twist (°) toward the fake side, the crouch (m), the arms)
export const FEINT_KINDS = { BODY_FEINT: { dur: 0.26, side: 11, trunk: 20, crouch: 0.06, arms: 0.55 }, SHOULDER_DROP: { dur: 0.24, side: 18, trunk: 14, crouch: 0.08, arms: 0.6 }, HIP_FAKE: { dur: 0.18, side: 7, trunk: 12, crouch: 0.045, arms: 0.4 } };
// ── B4: THE GENERIC EFFORT-TURN VOCABULARY (owner §9–10: "functional football actions, not theatrical skills") ─────────────────────────────────
// Each is ONE contact played by a swinging foot at the end of its swing (the carry's own swing → contact pose → landing: the foot drawn at the
// ball is the foot that plays it), with the other foot's PLANT anchored just before it, relative to the ball (an aggressive plant: the support
// that makes the redirect possible), the root on the carry's own tracker (Agility untouched) — on its line (or angled toward the request) until
// the touch, then turning / braking at its limits. The ball goes where the body will play it next (the carry's aim), the redirect capped by
// the family. box: where the ball must be (centre-of-mass frame at the touch, lateral on the touching foot's side); side: the turn toward the
// touching foot's own side (+1), the other (−1), either (0); need: the redirect the request needs (the ball's, or the body's turn for the
// braking ones); plant: [behind, toward the turn] from the ball
export const GENERIC = {
  CIR: { label: "COMPACT INSIDE REDIRECT", surface: "INSIDE", box: { a: [0.02, 0.72], l: [-0.22, 0.34] }, nom: [0.38, -0.06], side: -1, need: [28, 105], redirect: 105, plant: [-0.14, 0.16], protect: 0.35 },
  COR: { label: "COMPACT OUTSIDE REDIRECT", surface: "OUTSIDE", box: { a: [0.04, 0.74], l: [-0.04, 0.36] }, nom: [0.40, 0.16], side: 1, need: [20, 95], redirect: 95, plant: [-0.08, -0.22], protect: 0.25 },
  ABG: { label: "GATHER", surface: "INSIDE", box: { a: [-0.02, 0.62], l: [-0.36, -0.04] }, nom: [0.30, -0.20], side: -1, need: [20, 115], redirect: 115, plant: [-0.18, -0.06], vMax: 4.8, protect: 0.40 },
  URG: { label: "URGENT REACH", surface: null, box: { a: [0.55, 0.98], l: [-0.16, 0.55] }, nom: [0.78, 0.18], side: 0, need: [12, 75], redirect: 75, plant: null, protect: 0.10, crouch: 0.07 },
  BRT: { label: "BRAKING TOUCH", surface: "BRAKE", box: { a: [0.10, 0.78], l: [-0.10, 0.32] }, nom: [0.42, 0.10], side: 0, need: [135, 181], body: true, brake: true, plant: [-0.10, -0.18], protect: 0.30 },
  BPV: { label: "BRAKING PIVOT", surface: "INSIDE", box: { a: [-0.10, 0.62], l: [-0.20, 0.38] }, nom: [0.26, 0.06], side: -1, need: [90, 181], body: true, redirect: 180, vMax: 3.6, plant: [0.00, -0.20], protect: 0.50 },
  // ── S99 MISSION — THE EXPANDED VOCABULARY (the owner's 4-hour mission, Phase 3; EXPANDED only — CORE is the six above): the same machinery —
  // one swinging-foot contact at the end of its swing, its feasibility from the state (the ball's place, the speed, the redirect needed), the
  // choice by B4's outcome cost like every other candidate (no angle buckets), mirrored by the foot's side —
  //   LAT  LATERAL TRANSFER (La Croqueta): the inside of one foot plays the ball ACROSS the body to the OTHER foot's next swing end (aimFoot),
  //        which then carries it on — a lateral shift in two quick touches without braking the run (protection: the ball moved away from the
  //        side it was on)
  //   KNK  KNOCK-ON (push-and-go): in open space with SPRINT asked, the turning touch knocks the ball well ahead on the new line, to the lane
  //        foot's swing end nearest 1.05 s later (knock: inside CONTROLLED_BALL's 1.2 s continuation at any cadence), and the body explodes after it at Acceleration 99 — no opponent's challenge active, a steady stick
  //   SOL  SOLE ROLL: nearly stopped (≤ 2.6 m/s) the sole rolls the ball OUT to its own side / back (the impulse ≥ 60° off the travel; never
  //        across the body — the rolling leg crossed the standing one) while the body pivots
  //        over it — the contact pose the sole's (forceSurface)
  LAT: { label: "LATERAL TRANSFER", surface: "INSIDE", box: { a: [0.00, 0.58], l: [-0.12, 0.30] }, nom: [0.30, 0.08], side: -1, need: [14, 55], redirect: 75, plant: null, vMax: 6.2, aimFoot: "other", protect: 0.45, expanded: true },
  KNK: { label: "KNOCK-ON", surface: null, box: { a: [0.10, 0.80], l: [-0.10, 0.40] }, nom: [0.45, 0.10], side: 0, need: [16, 60], redirect: 60, plant: null, vMin: 3.0, knock: 1.05, sprintOnly: true, protect: 0.0, expanded: true },
  SOL: { label: "SOLE ROLL", surface: null, forceSurface: "SOLE", box: { a: [-0.06, 0.42], l: [-0.20, 0.30] }, nom: [0.22, 0.05], side: 1, need: [60, 150], body: true, redirect: 150, vMax: 2.6, plant: [-0.12, -0.16], minImpulseDeg: 60, protect: 0.55, expanded: true, reviewOnly: true },   // (REVIEW ONLY for now: in 90 – 120° pivots its rolling leg still crosses the standing one — tools/s99_families.mjs)
};
// (BODY FEINT — REVIEW ONLY: the outside / inside cut with a feint before its plant — the weight shifted and the trunk turned toward the OTHER
// side over the 0.30 s before the plant (the body's side-lean, trunk and crouch channels), then snapped onto the real side at the touch. The root
// path, the plant, the touch and the ball are the cut's own: nothing is faked in the simulation. Its value is a defender's reaction — with no
// defender model B4 has no reason to choose it, so it is generated only when forced (the review select / presets))
GENERIC.FNO = Object.assign({}, GENERIC.COR, { label: "FEINT + OUTSIDE CUT", feint: true, reviewOnly: true, expanded: true });
GENERIC.FNI = Object.assign({}, GENERIC.CIR, { label: "FEINT + INSIDE CUT", feint: true, reviewOnly: true, expanded: true });
export const EXPANDED = ["LAT", "KNK"];
// ── ADV-4 · THE CROQUETA'S BODY (owner, 22 Oct: "ball transfers across body + hips/pelvis shift across the lane + support reorganizes underneath
// → player emerges through the new lane" — not "ball across → body follows afterward"). Before: the body held its old line until the touch,
// then A99-C turned it after the ball had gone (0.49 s straight, then 0 → 40° in 0.1 s, the pelvis overshooting to 49°). Now, in the touching
// foot's swing, the root itself starts across — A99-C's own carry toward a heading `f` of the way to the request from `lead` s before the touch,
// to the request after it (the authoritative root: no offset, nothing A99-C cannot do) — while the pelvis TRANSLATES before it rotates (its yaw
// `psiF` of the travel's turn until the receive, then turning into the lane by `psiEnd`), a low wide base (`crouch`), and the side lean of the
// demand-driven channels from the real lateral acceleration. CURRENT (sim option croq: "CURRENT", tools ABL=croq): the old behaviour, kept for
// the Lab's three-lane comparison
export const CROQ = { lead: 0.08, f: 0.4, psiF: 0.35, psiEnd: 0.26, crouch: 0.06, reach: 0.06, eB: 25 };   // (chosen automatically; SOL, FNO, FNI: review only)
// ── B3 / B5: a technique's commitment window and its release, from its own decisive swing ───────────────────────────────────────────────────────
//   finalApproach: the striking foot's last authored segment into the ball (from its last waypoint before the contact; ≥ react, ≤ 0.08 s)
//   exitRelease:   the end of that foot's authored follow-through (its last waypoint after the contact; ≥ 0.06 s) — ordinary control returns there
const swingTimes = (T) => { const dc = T.contacts.find((c) => c.decisive); return (dc.swing && dc.swing.via ? dc.swing.via : []).map((w) => (w.dt != null ? w.dt : w.tau)); };
export const finalApproach = (T, P) => { const pre = swingTimes(T).filter((x) => x < 0); return max(P.react, min(0.08, pre.length ? -max(...pre) : 0.08)); };
// (ADV-4: a technique whose redirect is a SECOND touch of the same manipulation (the V-turn's push after its pull, the deaden's push) releases
// after that touch (`releaseAt`): control returned at its pull, the carry replanned between the two touches)
export const exitRelease = (T) => { const post = swingTimes(T).filter((x) => x > 0); return max(0.06, post.length ? max(...post) : 0.06, CC_ABL.release ? 0 : T.releaseAt || 0); };   // (tools: ABL=release)
// B5 windups: the reversals that open with a braking step on the entry line (Cruyff, hook, drag-back) re-expressed to start at their plant — the
// keys before it dropped (their heading is the entry's there: no discontinuity), the first stance the plant (the chop's hop carries its pre-turn:
// not trimmed; the outside cut opens at its plant already)
const trimT = (T) => { const s1 = T.stances[1], x0 = s1.t0, cut = (K) => { const out = K.filter(([x]) => x >= x0 - 1e-9).map((k) => k.slice()); if (!out.length || out[0][0] > x0 + 1e-9) out.unshift([x0, new Curve(K).at(x0)]); return out; };
  const o = Object.assign({}, T, { start: x0, firstFoot: s1.F, stances: T.stances.slice(1), com: Object.assign({}, T.com, { v: cut(T.com.v), h: cut(T.com.h) }), trimmed: true });
  for (const k of ["face", "trunk", "lean", "side", "crouch", "arms", "gait", "look"]) o[k] = cut(T[k]);
  // (BODY FEINT V2 — VIDEO-GUIDED: the feint's facing and heading are already turned toward the fake at its false step — opened there, they start
  // from the entry line (the approach's own) and turn within the template's next key: cut at the false step they snapped the pelvis ≈ 4° in a tick)
  if (T.bodyFeint && !CC_ABL.bftrim) { o.face[0] = [o.face[0][0], 0]; o.com.h[0] = [o.com.h[0][0], 0]; }
  return o; };
export const TRIMMED = { CRUYFF: trimT(TEMPLATES.CRUYFF), HOOK: trimT(TEMPLATES.HOOK), DRAGBACK: trimT(TEMPLATES.DRAGBACK),
  CHOP: Object.assign(trimT(TEMPLATES.CHOP), { vRange: [3.0, 6.0], vFloor: 3.0 }), VTURN: trimT(TEMPLATES.VTURN), VTURN_B: trimT(TEMPLATES.VTURN_B),
  BFEINT_L: trimT(TEMPLATES.BFEINT_L), BFEINT_J: trimT(TEMPLATES.BFEINT_J), BFEINT_R: trimT(TEMPLATES.BFEINT_R), BFEINT_JS: trimT(TEMPLATES.BFEINT_JS), BFEINT_JX: trimT(TEMPLATES.BFEINT_JX) };   // (BODY FEINT V2: the feint opened at its false step — the shortest valid entry: the request waited ≈ 0.5 s for a stride that fitted the full entry)   // (ADV-4: the V-turn opened at its standing foot — the alternate-support entry: the right sole's V-turn found a stride only once per cycle)   // (the chop without its hop only up to 6 m/s: the hop IS its braking at speed — entered at a sprint without it, it touched at ≈ 8 m/s, 109 – 126 m/s²)
// (CRUYFF-CHOP-1: ONE TECHNIQUE, STATE-DEPENDENT ENTRIES — a Cruyff / chop request or B4's own choice builds both of its entries: the full one
// (the Cruyff's braking stride, the chop's hop) and the one opened at the plant (already slow and correctly planted), and takes the shortest
// physically valid one — the abbreviated Cruyff is no longer a technique of its own)
export const ENTRY_FAMILY = new Set(["CRUYFF", "CHOP", "VTURN", "VTURN_B", "BFEINT_L", "BFEINT_J", "BFEINT_R", "BFEINT_JS", "BFEINT_JX"]);
const SURF_FWD = 18;                             // ° within which a touch is a forward push (the laces at speed, the outer instep otherwise)
// ═══ THE SIMULATION ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
export class PlaySim {
  // env: { E (RUN-1.3), body (r1Body) } · o: { attrs {bc, dri, agi}, foot "R" | "L" | "B", style, seed, start: { P, h } }
  // (env.baked: pt_baked.json — RUN-1's gait table baked once; without it the table is solved here, ≈ 2 s)
  constructor(env, o = {}) { this.E = env.E; this.body = env.body; this.gait = gaitTable(this.E, this.body, env.baked); this.reset(o); }
  reset(o = {}) {
    this.o = Object.assign({ attrs: { bc: 99, dri: 99, agi: 99 }, foot: "R", style: "NEUTRAL", seed: 1, start: { P: [52.5, 34], h: 0 } }, this.o || {}, o);
    this.o.layers = Object.assign({}, LAYERS_OFF, this.o.layers || {}); this.L = this.o.layers;
    this.P = params(this.o.attrs); this.k = 0; this.t = 0; this.ver = 0; this.sid = 0; this.cid = 0; this.aid = 0;
    const S = this.o.start, h = S.h, lane = this.o.foot === "L" ? -0.10 : this.o.foot === "R" ? 0.10 : 0, bp = fromLocal(S.P, h, 0.36, lane);
    this.ball = new Ball(bp, [0, 0]); this.contacts = []; this.log = { input: [], actions: [], replans: 0, plans: 0, events: [], lock: [], acts: {}, skill: [], feints: [] }; this.skill = null; this.feint = null; this.hash = 2166136261 >>> 0; this.cpu = { replan: [], step: [] };
    // standing: both feet planted (an "infinite" stance), facing h
    const rear = this.o.foot === "L" ? "L" : "R", st = (F) => ({ id: ++this.sid, F, t0: -1, t1: Infinity, pos: fromLocal(S.P, h, F === rear ? -0.02 : 0.04, sgn(F) * WIDTH.stand), yaw: h + sgn(F) * 6 * DEG, kind: "standing", src: "stand" });
    this.plan = this.mkPlan({ t0: 0, st: { P: S.P.slice(), s: 0, h, psi: h, w: 0 }, stances: { R: [st("R")], L: [st("L")] }, contacts: [], action: { kind: "CARRY", label: "STANDING", id: ++this.aid }, req: null, ch0: null, prog: { kind: "carry" } });
    this.plans = [this.plan]; this.req = null; this.lastReq = null; this.flags = { replan: "start" };
    this.track = { N: 240 * 12, buf: new Float64Array(240 * 12 * 9) }; this.record();
    return this;
  }
  // (live changes are part of the record: the tick they apply at — a re-simulation from the record applies them at the same tick)
  setAttrs(attrs) { this.o.attrs = Object.assign({}, this.o.attrs, attrs); this.P = params(this.o.attrs); this.flags.replan = "attributes"; this.log.events.push({ k: this.k, kind: "attrs", v: Object.assign({}, this.o.attrs) }); }
  setFoot(foot) { this.o.foot = foot; this.flags.replan = "foot"; this.log.events.push({ k: this.k, kind: "foot", v: foot }); }
  // ── the present (from the current plan) ───────────────────────────────────────────────────────────────────────────────────────────────────────
  stateAt(t, plan = this.planAt(t)) { const i = clamp((t - plan.t0) / DT, 0, plan.n), j = min(plan.n - 1, Math.floor(i)), u = i - j, P = plan.P, V = plan.V;
    const p = [P[2 * j] + (P[2 * j + 2] - P[2 * j]) * u, P[2 * j + 1] + (P[2 * j + 3] - P[2 * j + 1]) * u], v = [V[2 * j] + (V[2 * j + 2] - V[2 * j]) * u, V[2 * j + 1] + (V[2 * j + 3] - V[2 * j + 1]) * u];
    const psi = plan.psi[j] + wrap(plan.psi[j + 1] - plan.psi[j]) * u; if (i >= plan.n) { const d = t - plan.t0 - plan.n * DT; p[0] += v[0] * d; p[1] += v[1] * d; } return { P: p, V: v, psi, s: hyp(v[0], v[1]), h: hyp(v[0], v[1]) > 0.05 ? hdg(v) : plan.psi[j] }; }
  planAt(t) { const L = this.plans; for (let i = L.length - 1; i >= 0; i--) if (L[i].t0 <= t + 1e-9) return L[i]; return L[0]; }
  // ── one tick: the request, execute the contacts due, step the ball, re-plan when needed ──────────────────────────────────────────────────────
  // req: { h: heading (rad) | null, mode: "WALK" | "JOG" | "RUN" | "SPRINT", keys: bitmask (for the record only) }
  step(req) {
    // (the heading is quantised to 1e-6 rad BEFORE use: the record holds exactly what the simulation used — a re-simulation is bit-identical)
    const t = this.t; this.req = req && req.h != null ? { h: Math.round(req.h * 1e6) / 1e6, mode: req.mode || "RUN", keys: req.keys | 0 } : { h: null, mode: (req && req.mode) || "RUN", keys: req ? req.keys | 0 : 0 };
    this.log.input.push(this.req.h == null ? -99 : this.req.h, MODES.indexOf(this.req.mode), this.req.keys);
    // the request changed? (direction > 4°, the mode, start / stop)
    const L = this.lastReq, q = this.req; if (!L || (L.h == null) !== (q.h == null) || L.mode !== q.mode || (q.h != null && abs(wrap(q.h - L.h)) > (this.reqThresh || 4) * DEG)) { this.flags.replan = this.flags.replan || "request"; this.lastReq = q; }
    // the contacts due now: one kernel launch each, from the ball's actual state
    for (const c of this.plan.contacts) if (!c.done && c.k === this.k) this.execute(c);
    // footfalls now (the gait progresses: a re-plan keeps the plan fresh)
    for (const X of ["R", "L"]) for (const s of this.plan.stances[X]) if (abs(s.t0 - t) < DT / 2 && s.t0 > 0) this.flags.replan = this.flags.replan || "footfall";
    if (t - this.plan.t0 > 0.30) this.flags.replan = this.flags.replan || "refresh";
    if (this.skill && !this.skill.done && this.skill.state !== "ENTERED" && t >= this.skill.until - 1e-9) this.flags.replan = this.flags.replan || "skill window";
    // (DRIBBLING VOCABULARY INTEGRATION: a pending request of an integrated move — holdLine — looks for its entry every 0.05 s, not only at the
    // footfalls: V4's feasible stride phase came 0.3 s after a request, between two footfalls, and the window closed unplayed; only while one is
    // pending — no cost otherwise)
    if (this.skill && !this.skill.done && this.skill.holdLine && this.skill.state !== "ENTERED" && t - this.plan.t0 >= 0.05 - 1e-9) this.flags.replan = this.flags.replan || "pending entry";
    if (this.flags.replan) { const c0 = performance.now(); this.replan(this.flags.replan); this.cpu.replan.push(performance.now() - c0); this.flags.replan = null; }
    this.ball.step(); this.k++; this.t = this.k * DT; this.record();
    // the authoritative record's fingerprint (the centre of mass, the ball, every 4th tick)
    if (this.k % 4 === 0) { const s = this.stateAt(this.t, this.plan), b = this.ball.p; this.mix(s.P[0]); this.mix(s.P[1]); this.mix(b[0]); this.mix(b[1]); }
  }
  // the ball's track (the tick's kernel state after its step) and its read-back at any recent time
  record() { const b = this.ball.p, v = this.ball.v, q = this.ball.q, o = (this.k % this.track.N) * 9, B = this.track.buf; B[o] = b[0]; B[o + 1] = b[1]; B[o + 2] = b[2]; B[o + 3] = v[0]; B[o + 4] = v[1]; B[o + 5] = q[0]; B[o + 6] = q[1]; B[o + 7] = q[2]; B[o + 8] = q[3]; }
  ballTrack(t) { const k = clamp(Math.round(t / DT), max(0, this.k - this.track.N + 1), this.k), o = (k % this.track.N) * 9, B = this.track.buf; return { p: [B[o], B[o + 1], B[o + 2]], v: [B[o + 3], B[o + 4]], q: [B[o + 5], B[o + 6], B[o + 7], B[o + 8]], k }; }
  mix(x) { const s = x.toFixed(6); let h = this.hash; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } this.hash = h; }
  // ── a contact: the launch from where the ball really is (the plan's intent: a target point at a time, or a velocity) ─────────────────────────
  execute(c) {
    c.done = true; const b = this.ball.p, bv = this.ball.v, me = this.stateAt(this.t, this.plan), rel = toLocal(b, me.P, me.s > 0.5 ? me.h : me.psi);
    // (the ball must be where the foot can play it — never a contact at a distance: a miss re-plans)
    if (hyp(rel[0], rel[1]) > 1.05 || b[2] > 0.5) { c.missed = true; this.flags.replan = "missed contact"; this.contacts.push(Object.assign(this.contactRec(c, bv, bv, null), { missed: true })); return; }
    let v; if (c.aim.kind === "target") { const d = [c.aim.P[0] - b[0], c.aim.P[1] - b[1]], D = hyp(d[0], d[1]), T = max(0.05, c.aim.T - this.t); let sp = D > 1e-3 ? speedFor(D, T) : 0; if (sp == null) sp = CARRY.vCap; sp = min(sp, CARRY.vCap); v = D > 1e-3 ? [d[0] / D * sp, d[1] / D * sp] : [0, 0]; }
    else v = [c.aim.speed * Math.cos(c.aim.h), c.aim.speed * Math.sin(c.aim.h)];
    const intended = v.slice();
    if (this.P.errDir > 0 && hyp(v[0], v[1]) > 0.2) { const r1 = this.rand(c.id, 1), r2 = this.rand(c.id, 2), e = r1 * this.P.errDir * DEG, f = 1 + r2 * this.P.errSpeed, ca = Math.cos(e), sa = Math.sin(e); v = [(v[0] * ca - v[1] * sa) * f, (v[0] * sa + v[1] * ca) * f]; }
    this.ball.launch(v, { foot: c.F, surface: c.surface, role: c.role }); this.contacts.push(this.contactRec(c, bv, v, intended));
    { const S = this.skill; if (S && !S.done && S.state === "ENTERED" && this.plan.action.id === S.aid && (c.decisive || c.src === "generic")) { S.done = true; S.result = "PLAYED"; S.tPlayed = this.t; S.tEnd = this.t; this.log.skill.push(Object.assign({}, S)); } } this.mix(v[0]); this.mix(v[1]); this.flags.replan = "contact";
  }
  contactRec(c, vIn, vOut, intended) { const a = this.plan.action; return { sc: c.sc || undefined, fam: c.fam, aimT: c.sc && c.aim ? c.aim.T : undefined, n: this.contacts.length + 1, k: this.k, t: this.t, F: c.F, surface: c.surface, role: c.role, tech: c.tech || a.kind, action: a.label, actionId: a.id,
    vIn: [vIn[0], vIn[1]], vOut: [vOut[0], vOut[1]], intendedH: intended && hyp(intended[0], intended[1]) > 0.05 ? hdg(intended) : null, actualH: hyp(vOut[0], vOut[1]) > 0.05 ? hdg(vOut) : null, ball: this.ball.p.slice(), reqH: this.req.h, cid: c.id, swing: c.swing || null, frame: c.frame || null, src: c.src, decisive: !!c.decisive }; }
  // a keyed, deterministic standard-normal-ish draw (the provisional Ball Control error below 99)
  rand(id, j) { let h = (2166136261 ^ this.o.seed) >>> 0; for (const x of [id, j, 977]) { h ^= x; h = Math.imul(h, 16777619) >>> 0; h ^= h >>> 13; } let s = 0; for (let i = 0; i < 4; i++) { h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; s += (h / 4294967296); } return (s - 2) * 1.732; }
  // ═══ THE RESOLVER ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  replan(reason) {
    const t = this.t, cur = this.plan, st = this.stateAt(t, cur), P = this.P;
    // (DRIBBLING VOCAB-1: a pending MANUAL intent prepares — the body keeps running at the ball on its ENTRY line (the heading when it was asked)
    // until its technique is played (or its window closes): the request is the technique's exit, not a turn to make first)
    const SK = this.skill && !this.skill.done && (this.skill.until > t || this.skill.state === "ENTERED") ? this.skill : null, FH = !SK && this.fhold && this.fhold.until > t ? this.fhold : null, qReal = this.req,
      q = SK && qReal.h != null && SK.h0 != null ? Object.assign({}, qReal, { h: SK.h0 }, SK.prep && SK.state !== "ENTERED" ? { mode: SK.prep.mode } : {}) : FH && qReal.h != null ? Object.assign({}, qReal, { h: FH.h }) : qReal;   // (the analog feint's ≤ 0.15 s ball hold — u_sim.js feintTick)
    // what cannot change any more: the footfalls already made (and the swinging foot's coming one within `react`), the contacts within `react`
    const keep = this.committed(cur, t), act = cur.action;
    const setDone = act.tech && cur.contacts.some((c) => c.role === "set touch" && c.done && c.tech === act.tech) && t < act.tC;
    // (B3 narrow: no commitment from a set touch — the latest intent wins until the contacting foot's final approach)
    const committedTech = act.tech && ((t >= act.tCommit - 1e-9 && t < act.tRelease) || (!this.L.narrow && setDone && q.h != null && abs(wrap(q.h - act.exitH)) < 35 * DEG));
    // a technique's EXIT (after its plant is released, until its exit touch is made): it runs on — re-targeted — unless the request turns away
    // from its exit by more than 25° (then everything is a candidate again, the continuation among them)
    const exitTouch = act.tech ? cur.contacts.find((c) => c.tech === act.tech && !c.done && !c.decisive && c.role !== "set touch") : null;
    const inExit = act.tech && t >= act.tRelease && exitTouch && t < exitTouch.t + 0.02;
    const cands = [];
    // (the action lock, for the report card: a re-plan whose only candidate is the running technique — logged at each change, never read)
    // (B5 exits: no exit lock — after its release the technique runs on only as one candidate among all, the latest intent deciding)
    const exitLock = !this.L.exits && inExit && q.h != null && abs(wrap(q.h - act.exitH)) < 25 * DEG;
    { const locked = !!(committedTech || exitLock), Lk = this.log.lock; if (!Lk.length || Lk[Lk.length - 1].locked !== locked) Lk.push({ t, locked, why: committedTech ? "committed" : locked ? "exit" : "" }); }
    // (B4: a generic touch is committed only in its final approach — within react — and the plan runs on until it is made)
    if (act.kind === "GENERIC" && cur.contacts.some((c) => c.src === "generic" && !c.done && c.t > t - 1e-9 && c.t - t < P.react)) return;
    if (committedTech || exitLock) { const re = this.instantiate(act.tech, act.m, q, st, keep, { pinned: act }); if (!re) return; cands.push(re); }   // (committed: only its exit re-targets; else it runs on as planned)
    else {
      if (inExit) { const re = this.instantiate(act.tech, act.m, q, st, keep, { pinned: act }); if (re) cands.push(re); }
      const carry = this.carryPlan(st, keep, q, reason); cands.push(carry);
      if (this.L.early || this.L.approach) for (const p of this.carryVariants(st, keep, q, carry)) cands.push(p);
      if (this.L.generic) for (const p of this.genericPlans(st, keep, q, carry)) cands.push(p);
      const skGen = []; if (SK && SK.gen) { const f0 = this.o.forceFam, r0 = Object.assign({}, this._rej || {}); this.o.forceFam = this.skill.gen;
        try { for (const p of this.genericPlans(st, keep, qReal, carry)) if (p.action.fam === this.skill.gen) { p.skill = this.skill.intent; skGen.push(p); } } finally { this.o.forceFam = f0; } this.noteRej(r0); }
      const turn = this.turnOf(st, q);
      const skTech = SK ? this.skillCands(st, keep, qReal, act) : []; for (const p of skTech) cands.push(p);
      // (LA CROQUETA — VIDEO-GUIDED: a request whose generic family is only its FALLBACK — the generic instances compete only when none of its
      // own templates has a feasible instance now (else the earlier generic transfer always won on cost))
      if (!(SK && SK.genFallback && skTech.length)) for (const p of skGen) cands.push(p);
      // (ADV-4: noFam — the families withheld from B4: the review's "basic solution" lane, a future Dribbling gate)
      if (q.h != null && abs(turn) > 16 * DEG && (!inExit || this.L.exits)) for (const id of TECH_IDS) for (const m of [1, -1]) { if (this.o.noFam && this.o.noFam.has(id)) continue; const pin = act.tech === id && act.m === m && !act.trim && t < act.tC ? act : null, p = this.instantiate(id, m, q, st, keep, { pinned: pin }); if (p) { cands.push(p); if (p.alt) cands.push(p.alt); }
        // (B3 narrow: a technique not yet committed may also be re-timed — its instance anchored afresh is a candidate beside the pinned one)
        if (this.L.narrow && pin) { const p2 = this.instantiate(id, m, q, st, keep, {}); if (p2) { cands.push(p2); if (p2.alt) cands.push(p2.alt); } }
        // (B5 windups: the technique opened at its plant when the body is already slow enough for the braking step it would start with)
        if (this.L.windups && TRIMMED[id] && (st.s <= TRIMMED[id].com.v[0][1] + CAPS.entrySlack || (ENTRY_FAMILY.has(id) && !CC_ABL.entry))) { const pinT = act.tech === id && act.m === m && act.trim && t < act.tC ? act : null, p3 = this.instantiate(id, m, q, st, keep, { trim: true, pinned: pinT }); if (p3) { cands.push(p3); if (p3.alt) cands.push(p3.alt); } } }
    }
    for (const c of cands) { const qc = c.skill ? qReal : q; c.cost = this.L.generic && qc.h != null ? this.costB4(c, st, qc, cur) : this.cost(c, st, qc, cur); }
    // (CRUYFF-CHOP-1: within one technique, side and request, the SHORTEST valid entry — a later decisive contact pays 1.5 per second of delay;
    // the possession veto and everything else in the cost stand)
    if (!CC_ABL.entry) { const key = (c) => c.action.tech + c.action.m + (c.skill ? "·s" : ""), tmin = {};
      for (const c of cands) if (c.action.tech && ENTRY_FAMILY.has(c.action.tech) && c.action.tC != null) tmin[key(c)] = Math.min(tmin[key(c)] ?? Infinity, c.action.tC);
      for (const c of cands) if (c.action.tech && ENTRY_FAMILY.has(c.action.tech) && c.action.tC != null && c.cost) c.cost.J += 1.5 * (c.action.tC - tmin[key(c)]); }
    // (DRIBBLING VOCAB-1: a manual technique's instance that exists but loses on cost — the possession model's veto above all — is reported as such)
    if (SK) for (const c of cands) if (c.skill && c.cost && c.cost.note && /no controlled continuation/.test(c.cost.note)) { const why = "no controlled continuation: " + (c.cost.note.match(/no controlled continuation \(([^)]*)\)/) || [, "?"])[1]; SK.rej[why] = (SK.rej[why] || 0) + 1; }
    cands.sort((a, b) => a.cost.J - b.cost.J); const best = cands[0];
    best.why = cands.slice(0, 5).map((c) => ({ label: c.action.label + (c.action.m ? (c.action.m > 0 ? " (R)" : " (L)") : c.action.kind === "GENERIC" ? ` (${c.action.F})` : ""), id: actionId(c.action), J: +c.cost.J.toFixed(2), note: c.cost.note }));
    // (the HUD's view of the decision: the winner's predicted outcome, the nearest different solution — B4 only; never read by the simulation)
    if (best.cost.outcome) { const alt = cands.find((c) => actionId(c.action) !== actionId(best.action)); best.decisionView = { outcome: best.cost.outcome, alt: alt ? { id: actionId(alt.action), J: +alt.cost.J.toFixed(2), dJ: +(alt.cost.J - best.cost.J).toFixed(2), note: alt.cost.note, outcome: alt.cost.outcome } : null }; }
    best.reason = reason; this.adopt(best);
    // (DRIBBLING VOCAB-1: the manual intent's outcome — fulfilled once its technique is the plan; else, once its window closes, REJECTED with the
    // resolver's own reasons (the infeasibility counts of its instances) and the alternative that was played instead)
    if (this.skill && !this.skill.done) { const S = this.skill, mine = (best.skill || (best.action.tech && S.ids.includes(best.action.tech)) || (best.action.kind === "GENERIC" && best.action.fam === S.gen)) && !(best.action.id === S.aid0 && TEMPLATES[best.action.tech] && TEMPLATES[best.action.tech].bodyFeint && !CC_ABL.bfseq);   // (BODY FEINT V2: a feint requested during a feint is the NEXT one — the running instance does not fulfil it)
      if (mine) { if (S.state !== "ENTERED") { S.state = "ENTERED"; S.tEntered = t; S.aid = best.action.id; S.tech = best.action.tech || best.action.fam; S.tC = best.action.tC; S.played = actionId(best.action); } else { S.aid = best.action.id; S.tC = best.action.tC; } }
      else if (S.state === "ENTERED") { S.done = true; S.result = "CANCELLED"; S.alt = actionId(best.action); S.tEnd = t; this.log.skill.push(Object.assign({}, S)); }
      else if (t >= S.until - 1e-9 || reason === "skill window") { S.done = true; S.result = "REJECTED"; S.alt = actionId(best.action); S.tEnd = t; this.log.skill.push(Object.assign({}, S)); } }
    if (!this.decision || q.h == null || this.decision.reqH == null || abs(wrap(q.h - this.decision.reqH)) >= 12 * DEG || best.action.kind !== this.decision.kind) this.decision = { reqH: q.h, kind: best.action.kind, t };
  }
  adopt(plan) { plan.v = ++this.ver; this.plan = plan; this.plans.push(plan); this.log.plans++;
    { const a = plan.action, Tb = a.tech && TEMPLATES[a.tech]; if (Tb && Tb.bodyFeint && a.tC != null) this.bfEnd = a.tC + Tb.stances[Tb.stances.length - 1].t1; }
    // (BODY FEINT V2 — VIDEO-GUIDED: the moment control leaves a body feint — every plan built in the next 0.18 s blends its posture from there:
    // CONTROLLED's possession model may replace the first plan within the same tick, and that one saw only the carry before it)
    { const pa = this.plan && this.plan.action, Ta = pa && pa.tech && TEMPLATES[pa.tech], a = plan.action; if (Ta && (Ta.bodyFeint || Ta.croqVG) && !(a.tech === pa.tech && a.id === pa.id)) this.bfLeave = { t: this.t, until: this.t + 0.18 }; }   // (BODY FEINT V2: the end of its authored exit — the next feint waits for it)
    // (the action log for the B5 timings — each non-carry action's latest version by id, its first selection time; logs only, never read)
    { const a = plan.action; if (a.kind !== "CARRY") { const L = this.log.acts, e = L[a.id]; L[a.id] = Object.assign({}, a, { tSel: e ? e.tSel : this.t, reqH: this.req ? this.req.h : null }); } }
    if (plan.action.id !== (this.plans[this.plans.length - 2] || {}).action?.id) this.log.actions.push({ t: this.t, kind: plan.action.kind, label: plan.action.label, m: plan.action.m || 0, why: plan.why });
    // (the history the replay / the presentation needs: 12 s)
    while (this.plans.length > 2 && this.plans[1].t0 < this.t - 12) this.plans.shift(); while (this.contacts.length > 400) this.contacts.shift(); }
  // the signed turn the request asks for, from the body's current travel (its facing when slow)
  turnOf(st, q) { if (q.h == null) return 0; const h = st.s > 1.0 ? st.h : st.psi; return wrap(q.h - h); }
  committed(cur, t) {
    const R = this.P.react, out = { stances: { R: [], L: [] }, contacts: [], lastT: { R: -9, L: -9 } };
    for (const X of ["R", "L"]) { const L = cur.stances[X], nPast = L.filter((s) => s.t0 <= t + 1e-9).length; let i = 0;
      for (const s of L) { const past = s.t0 <= t + 1e-9; if (past) i++; if ((past && (s.t1 > t - 1.0 || i > nPast - 2)) || (s.t0 - t < R && s.t0 > t)) out.stances[X].push(s); } }
    for (const c of cur.contacts) if (!c.done && c.t > t - 1e-9 && c.t - t < R) out.contacts.push(c);
    // a touch committed or just made: its foot's landing after it (the swing the touch belongs to) is committed too
    for (const c of cur.contacts) if ((c.done && c.t > t - 0.2) || out.contacts.includes(c)) { const X = c.F, L = out.stances[X];
      const s = cur.stances[X].find((x) => x.t0 > c.t - 1e-6 && x.t0 <= c.t + 0.25); if (s && !L.includes(s)) { L.push(s); L.sort((a, b) => a.t0 - b.t0); } }
    return out;
  }
  // ── THE COST of a candidate plan: time to the decisive contact, time on the new line, contacts, protection, the angle's and the speed's fit, the
  // preferred foot, the ball's separation; a small hysteresis for the plan already running (no flip-flop) ──────────────────────────────────────
  cost(c, st, q, cur) {
    const t = this.t, a = c.action, notes = [];
    if (c.cost0) return c.cost0;
    let J = 0; const tLine = c.tLine != null ? c.tLine - t : 3.0; J += 2.0 * min(3.0, tLine); notes.push(c.tLine != null ? `line +${tLine.toFixed(2)}s` : "never on the line");
    if (a.tech) { J += 0.8 * (a.tC - t); notes.push(`contact +${(a.tC - t).toFixed(2)}s`); }
    J += 0.22 * (c.nContacts || 0);
    if (c.sepPen) { J += c.sepPen; notes.push(`ball ${c.sepMax.toFixed(1)}m away`); }
    // (B4 generic: an action with a decisive contact like a technique's — its time, its protection, the preferred foot, its continuation)
    if (a.kind === "GENERIC") { J += 0.8 * (a.tC - t); notes.push(`contact +${(a.tC - t).toFixed(2)}s`); J -= 0.35 * a.protect * clamp((abs(a.turnDeg) - 30) / 60, 0, 1);
      const pref = this.o.foot; if (pref !== "B" && a.F !== pref) { J += 0.18; notes.push("weak foot"); } if (cur.action.kind === "GENERIC" && cur.action.fam === a.fam && cur.action.F === a.F) J -= 0.40; }
    // (B4: a named move now competes with the generic actions on the same terms — and on its real exit (techExit); its comfortable range stays a
    // QUALITY limit (the authored motion scaled far beyond it degrades: a 90° outside cut at a sprint lost the ball 5 / 8 without it))
    if (a.tech) { const T = TEMPLATES[a.tech], d = abs(a.turnDeg), ex = d < T.comfort[0] ? T.comfort[0] - d : d > T.comfort[1] ? d - T.comfort[1] : 0; if (ex > 0) { J += 0.5 * (ex / 20) * (ex / 20); notes.push(`${d.toFixed(0)}° outside ${T.comfort[0]}–${T.comfort[1]}`); }
      J -= 0.35 * T.protect * clamp((d - 30) / 60, 0, 1);
      const pref = this.o.foot; if (pref !== "B" && a.F !== pref) { J += 0.18; notes.push("weak foot"); }
      if (a.speedFit) { J += a.speedFit; notes.push("speed"); }
      if (a.setTouch) notes.push("set touch"); if (a.setPen > 0.02) { J += a.setPen; notes.push("set off-line"); }
      if (cur.action.tech === a.tech && cur.action.m === a.m) J -= 0.40; }
    else if (cur.action.kind === "CARRY") J -= 0.05;
    const D = this.decision; if (D && q.h != null && D.reqH != null && abs(wrap(q.h - D.reqH)) < 12 * DEG && (a.kind !== cur.action.kind || (a.m || 0) !== (cur.action.m || 0))) { J += 0.5; notes.push("(switch)"); }
    return { J, note: notes.join(" · "), tLine };
  }
  // ── B4: THE PREDICTED FOOTBALL OUTCOME of a candidate (owner: "score the exit, not the label") — the ball carried through the candidate's own
  // planned contacts (each launched from where the ball will be, as the kernel will), then against the candidate's own body path:
  //   tRel    the first contact that sends the ball within 30° of the request (the legitimate, useful contact)
  //   tNext   after its last contact, the first moment the ball is inside the carry's reach of the body again (the next useful touch)
  //   eB      the ball's direction after the action against the request; ballSpeed; bodyDir / bodySpeed 0.25 s after it; retained: the body's
  //           speed along the request then, as a share of the requested speed; sep: the largest separation over the second after
  outcome(c, q) {
    const t = this.t, cs = c.contacts.filter((x) => !x.done && x.t > t - 1e-9).sort((a, b) => a.t - b.t), vReq = max(1, this.P.speed[q.mode] || 1);
    let bp = this.ball.p, bv = this.ball.v, tb = t, tRel = null, tLast = t;
    for (const x of cs) { const f = predict(bp, bv, x.t - tb); let v;
      if (x.aim.kind === "target") { const d = [x.aim.P[0] - f.p[0], x.aim.P[1] - f.p[1]], D = hyp(d[0], d[1]), sp = min(CARRY.vCap, speedFor(D, max(0.05, x.aim.T - x.t)) || CARRY.vCap); v = D > 1e-3 ? [d[0] / D * sp, d[1] / D * sp] : [0, 0]; }
      else v = [x.aim.speed * Math.cos(x.aim.h), x.aim.speed * Math.sin(x.aim.h)];
      bp = f.p; bv = v; tb = x.t; tLast = x.t; if (tRel == null && hyp(v[0], v[1]) > 0.3 && abs(wrap(hdg(v) - q.h)) < 30 * DEG) tRel = x.t; }
    let tNext = null, sep = 0;
    for (let T = tLast + 0.12; T <= t + 1.45 + 1e-9; T += 0.02) { const B = predict(bp, bv, T - tLast).p, s = this.stateAt(T, c), rel = toLocal(B, s.P, s.s > 0.6 ? s.h : s.psi); if (T <= tLast + 1.0) sep = max(sep, hyp(rel[0], rel[1])); if (tNext == null && rel[0] >= -0.02 && rel[0] <= 0.80 && abs(rel[1]) <= 0.45) tNext = T; }
    if (tNext == null) { const B = predict(bp, bv, t + 1.45 - tLast).p, s = this.stateAt(t + 1.45, c); tNext = t + 1.5 + 0.4 * max(0, hyp(B[0] - s.P[0], B[1] - s.P[1]) - 0.8); }
    const tE = min(t + 1.45, max(tLast, tRel != null ? tRel : tLast) + 0.25), sE = this.stateAt(tE, c), u = dir(q.h), bs = hyp(bv[0], bv[1]);
    const bE = predict(bp, bv, max(0, tE - tLast)).p;   // (DRIBBLING VOCAB-1: where the ball and the body are then — for the threat's exposure)
    return { bE, pE: sE.P, tRel, tLast, tNext, eB: bs > 0.5 ? abs(wrap(hdg(bv) - q.h)) : 0, ballSpeed: bs, ballDir: bs > 0.05 ? hdg(bv) : null, bodyDir: sE.s > 0.3 ? sE.h : sE.psi, bodySpeed: sE.s, retained: clamp((sE.V[0] * u[0] + sE.V[1] * u[1]) / vReq, 0, 1), sep };
  }
  // ── B4: THE COST on that outcome — the same terms for every candidate (carry, generic, named): the body's new line, the useful contact, the
  // ball's accessibility after the action (beyond a stride: the body cannot follow it), the ball's line against the request, the speed kept,
  // the separation, the contacts, protection, the effort of a lunge, the preferred foot, continuation / switch hysteresis. No angle fit
  costB4(c, st, q, cur) {
    const t = this.t, a = c.action, notes = [], o = (c.outcome = this.outcome(c, q)); let J = 0;
    const tLine = c.tLine != null ? c.tLine - t : 3.0; J += 2.0 * min(3.0, tLine); notes.push(c.tLine != null ? `line +${tLine.toFixed(2)}s` : "never on the line");
    const tR = o.tRel != null ? o.tRel - t : 1.6; J += 0.8 * min(2.0, tR); notes.push(o.tRel != null ? `contact +${tR.toFixed(2)}s` : "no contact onto the line");
    const gap = o.tNext - o.tLast; if (gap > 0.30 && !(a.kind === "GENERIC" && GENERIC[a.fam] && GENERIC[a.fam].knock)) { J += 0.8 * min(2.0, gap - 0.30); notes.push(`next touch +${gap.toFixed(2)}s`); }
    // (ADV-4: the croqueta's transfer goes ACROSS — its receive puts the ball on the line; its own line is judged from 25°, not 15°)
    const eB0 = a.kind === "GENERIC" && a.fam === "LAT" && this.o.croq !== "CURRENT" && !CC_ABL.croq ? CROQ.eB : 15;
    if (o.eB > eB0 * DEG) { J += 0.5 * min(4, (o.eB / (30 * DEG)) ** 2); notes.push(`ball ${(o.eB / DEG).toFixed(0)}° off`); }
    J += 0.8 * (1 - o.retained); if (o.retained < 0.6) notes.push(`keeps ${(o.retained * 100).toFixed(0)} %`);
    const lim = q.mode === "SPRINT" ? 3.0 : q.mode === "RUN" ? 2.0 : q.mode === "JOG" ? 1.5 : 1.0; if (o.sep > lim) { J += 0.6 * (o.sep - lim); notes.push(`ball ${o.sep.toFixed(1)}m away`); }
    J += 0.22 * (c.nContacts || 0);
    const d = abs(a.turnDeg || 0), prot = a.tech ? TEMPLATES[a.tech].protect : a.kind === "GENERIC" ? a.protect : 0; J -= 0.35 * prot * clamp((d - 30) / 60, 0, 1);
    // (DRIBBLING VOCAB-1 — THE THREAT (the review harness's, setThreat: a point on the pitch; no defender model, no force field): within 3.5 m, a
    // solution that leaves the ball NEARER the threat than the body is (the ball exposed) pays; one whose body ends between them gains by its
    // protection — the body has to place itself there)
    if (this.threat && this.threat.P) { const T = this.threat.P, dB = hyp(o.bE[0] - T[0], o.bE[1] - T[1]), dP = hyp(o.pE[0] - T[0], o.pE[1] - T[1]), near = clamp((3.5 - hyp(st.P[0] - T[0], st.P[1] - T[1])) / 2.0, 0, 1);
      if (near > 0) { const ex = clamp((dP - dB + 0.15) / 0.5, 0, 1); J += 1.2 * near * ex; J -= 0.5 * near * prot * (1 - ex); if (ex > 0.3) notes.push("ball exposed to the threat"); } }
    const pref = this.o.foot; if ((a.tech || a.kind === "GENERIC") && pref !== "B" && a.F !== pref) { J += 0.18; notes.push("weak foot"); }
    // (S99 MISSION: review-only explicit access — the forced family preferred wherever it is feasible, ONE move at a time: not again until a
    // contact of another kind has been made since its last one)
    if (c.skill) { J -= 6.0; notes.push(`MANUAL: ${c.skill}`); }
    if (this.prefer && this.t < this.prefer.until && a.kind === "GENERIC" && a.fam === this.prefer.fam) { J -= 0.6; notes.push("after the feint"); }
    if (this.o.forceFam && a.kind === "GENERIC" && a.fam === this.o.forceFam) { const lastF = this.contacts.filter((x) => !x.missed).slice(-1)[0]; if (!lastF || lastF.fam !== this.o.forceFam) { J -= 3.0; notes.push("REVIEW: forced family"); } }
    if (a.kind === "GENERIC") { if (a.fam === "URG") { J += CAPS.urgentEffort; notes.push("lunge"); } if (cur.action.kind === "GENERIC" && cur.action.fam === a.fam && cur.action.F === a.F) J -= 0.40; }
    // (a named move scaled beyond the body its reference demonstrates: its post-contact turn × its speed against the authored one — the body
    // would need ≈ that multiple of the reference's lateral acceleration: beyond 1.35 × it cannot follow its own technique)
    if (a.tech) { const env = abs(a.k) * (a.sig || 1); if (env > 1.35) { J += 2.0 * (env - 1.35) ** 2; notes.push(`body ${env.toFixed(2)}× its reference`); }
      if (a.speedFit) { J += a.speedFit; notes.push("speed"); } if (a.setTouch) notes.push("set touch"); if (a.setPen > 0.02) { J += a.setPen; notes.push("set off-line"); } if (cur.action.tech === a.tech && cur.action.m === a.m) J -= 0.40; }
    else if (a.kind === "CARRY" && cur.action.kind === "CARRY") J -= 0.05;
    const D = this.decision; if (D && D.reqH != null && abs(wrap(q.h - D.reqH)) < 12 * DEG && (a.kind !== cur.action.kind || (a.m || 0) !== (cur.action.m || 0) || (a.fam || "") !== (cur.action.fam || ""))) { J += 0.5; notes.push("(switch)"); }
    return { J, note: notes.join(" · "), tLine, outcome: o };
  }
  // ═══ BUILDING A PLAN ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  // integrate the centre of mass over the horizon from the present: `prog` decides per tick (the carry tracker toward the request, an approach
  // speed profile, a technique's keys); the pelvis heading follows the travel (a second-order follower inside Agility's yaw rate) or the keys
  mkPlan(o) {
    const H = 1.5, n = Math.round(H / DT), Pt = new Float64Array(2 * (n + 1)), Vt = new Float64Array(2 * (n + 1)), psiT = new Float64Array(n + 1), st = o.st, P = this.P;
    let p = st.P.slice(), s = st.s, h = st.h, psi = st.psi, w = st.w || 0; const prog = o.prog, q = o.req;
    for (let i = 0; i <= n; i++) { const t = o.t0 + i * DT; Pt[2 * i] = p[0]; Pt[2 * i + 1] = p[1]; Vt[2 * i] = s * Math.cos(h); Vt[2 * i + 1] = s * Math.sin(h); psiT[i] = psi; if (i === n) break;
      const d = this.progAt(prog, t + DT, s, h, q, p);
      if (d.keyed) { s = d.s; h = d.h; } else { // the carry tracker (Agility): bend toward the request at the lateral limit, accelerate / brake
        const ts = d.speed, th = d.h; if (th != null) { const dh = wrap(th - h); if (s < 0.6) h += clamp(dh, -P.yawRate * DT, P.yawRate * DT); else { const om = min(P.aLat / max(s, 1.2), P.yawRate * 0.8); h += clamp(dh, -om * DT, om * DT); } }
        const want = th != null ? ts * (abs(wrap(th - h)) > 50 * DEG ? max(0.35, Math.cos(wrap(th - h))) : 1) : 0, acc = P.aAcc * clamp(1 - s / 11, 0.35, 1);
        s = s < want ? min(want, s + acc * DT) : max(want, s - P.aBrake * (d.stop ? 0.7 : 1) * DT); }
      const v = [s * Math.cos(h), s * Math.sin(h)]; p = [p[0] + v[0] * DT, p[1] + v[1] * DT];
      // the pelvis heading: keyed in a technique, else following the travel (or the request when slow)
      if (d.psi != null) { w = wrap(d.psi - psi) / DT; psi = d.psi; }
      else { const tgt = s > 1.0 ? h : th0(q, psi), err = wrap(tgt - psi), al = clamp(3600 * err * 0.1 - 38 * w, -9000 * DEG, 9000 * DEG); w = clamp(w + al * DT, -P.yawRate, P.yawRate); psi += w * DT; } }
    function th0(q, psi) { return q && q.h != null ? q.h : psi; }
    const plan = { t0: o.t0, k0: Math.round(o.t0 / DT), n, P: Pt, V: Vt, psi: psiT, stances: o.stances, contacts: o.contacts, action: o.action, req: o.req, prog };
    plan.ch = this.channels(o, plan); return plan;
  }
  progAt(prog, t, s, h, q, p) {
    // paced: no faster than keeps the body ≈ 0.42 m behind the free ball (along the request) until the touch that plays it
    if (prog.kind === "carry" && prog.pace && t < prog.pace.until && q && q.h != null) { const f = predict(prog.pace.b0, prog.pace.bv, t - prog.pace.t0), u = dir(q.h), gap = (f.p[0] - p[0]) * u[0] + (f.p[1] - p[1]) * u[1], va = f.v[0] * u[0] + f.v[1] * u[1];
      return { speed: clamp(va + 2.5 * (gap - 0.42), 0.6, this.P.speed[q.mode]), h: q.h }; }
    if (prog.kind === "carry" && prog.croq && t >= prog.croq.t0 && t < prog.croq.tP && q && q.h != null) { const C = prog.croq, f = t < C.t1 ? C.psiF : C.psiF + (1 - C.psiF) * clamp((t - C.t1) / max(0.02, C.tP - C.t1), 0, 1);
      return { speed: this.P.speed[q.mode], h: t < C.t1 ? C.hS : q.h, psi: C.h0 + f * wrap(h - C.h0) }; }   // (the pelvis a share `f` of the travel's turn: translating before it rotates)
    if (prog.kind === "carry") { if (prog.hold && t < prog.hold.until && q && q.h != null) return { speed: prog.hold.speed != null ? prog.hold.speed : this.P.speed[q.mode], h: prog.hold.h }; return { speed: q && q.h != null ? this.P.speed[q.mode] : 0, h: q ? q.h : null, stop: !q || q.h == null }; }
    if (prog.kind === "chase") return t < prog.until ? { speed: prog.speed, h: prog.h } : { speed: q && q.h != null ? this.P.speed[q.mode] : 0, h: q ? q.h : null, stop: !q || q.h == null };
    // a technique: the approach (a speed ramp along the entry heading), its keys, then the carry
    if (t < prog.tA) { const v = t < prog.tb ? prog.v0 : lerp(prog.v0, prog.vA, clamp((t - prog.tb) / max(1e-6, prog.tA - prog.tb), 0, 1)); const u = clamp((t - prog.t0) / max(1e-6, prog.tA - prog.t0), 0, 1), hh = prog.h0 + prog.drift * (prog.bump ? Math.sin(Math.PI * u) : u); return (prog.bf || prog.psiKeyed) ? { keyed: true, s: v, h: hh, psi: hh + (prog.psiOff || 0) * (1 - ((w) => w * w * (3 - 2 * w))(clamp(u * 2.5, 0, 1))) } : { keyed: true, s: v, h: hh }; }
    if (t <= prog.tEnd) return { keyed: true, s: prog.sC.at(t), h: prog.hC.at(t), psi: prog.fC.at(t) };
    return { speed: q && q.h != null ? this.P.speed[q.mode] : 0, h: q ? q.h : null };
  }
  // the posture channels (presentation keys, recorded with the plan): continuous from the previous plan's values now
  channels(o, plan) {
    const t0 = o.t0, prev = this.plan, cv = (k, d) => (prev && prev.ch && prev.ch[k] ? prev.ch[k].at(t0) : d), out = {};
    // (BODY FEINT V2: four more channels — armSide (the arms' asymmetry, + = the right arm the wider), armHold (a held arm posture, deg: + = the
    // right arm forward, the left back), shDrop (a shoulder dropped, deg: + = the right one), headYaw (the head's cue, deg: + = to the right) —
    // zero for every other action: their poses unchanged)
    // (BODY FEINT V2 — VIDEO-GUIDED: control leaving a body feint for any other action — a cancel inside the lie, the next action chained in —
    // takes its posture over at least 0.18 s: the lie's deep lean / flexion (−24° / 38°) snapped to the carry's own keys within 0.02 s, a shoulder-
    // roll spike ≈ 1100 °/s. Never for any other transition. tools: ABL=bfblend)
    const pa = prev && prev.action, leaveBF = !CC_ABL.bfblend && pa && pa.tech && TEMPLATES[pa.tech] && (TEMPLATES[pa.tech].bodyFeint || TEMPLATES[pa.tech].croqVG) && !(o.action && o.action.tech === pa.tech && o.action.id === pa.id), tMin = leaveBF ? 0.18 : !CC_ABL.bfblend && this.bfLeave && t0 < this.bfLeave.until - 1e-9 ? this.bfLeave.until - t0 : 0.02;
    const keys = o.chKeys || {}; for (const [k, d] of Object.entries({ lean: 8, side: 0, trunk: 0, crouch: 0.022, arms: 0.15, gait: 1, look: 0.8, armSide: 0, armHold: 0, shDrop: 0, headYaw: 0, armW: 0, abdR: 0, abdL: 0, flxR: 0, flxL: 0, elbR: 0, elbL: 0, headDrop: 0, bend: 0, proll: 0 })) { const K = keys[k] ? keys[k].filter((x) => x[0] > t0 + tMin) : [[t0 + 0.25, d]]; out[k] = new Curve([[t0, cv(k, d)]].concat(K.length ? K : [[t0 + 0.25, d]])); }
    return out;
  }
  // ── THE GAIT: footfalls after the committed ones, alternating, at the running cadence (RUN-1) / walking; anchored stances (a technique's) placed
  // exactly, the steps before them spread to land the anchor's foot on time; positions by the stride rule (lead ahead of the centre of mass, the
  // foot's side) ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  gaitFrom(plan, keep, anchors, tTo) {
    const S = { R: keep.stances.R.map((x) => Object.assign({}, x)), L: keep.stances.L.map((x) => Object.assign({}, x)) }, lastOf = (X) => S[X][S[X].length - 1], t = this.t;
    // a footfall: the lead ahead of the centre of mass on the foot's side — kept on its own side of the other foot (no crossing outside an
    // authored crossover) and off the free ball's path while it stands (the ball is authoritative: the presentation never has it roll through a
    // planted boot). Positions only: no decision reads them
    const bp0 = this.ball.p, bv0 = this.ball.v;
    const place = (X, tt, t1) => { const s0 = this.stateAt(tt, plan), v = s0.s, th = v > 0.6 ? s0.h : s0.psi, w = v > 2.4 ? WIDTH.run : WIDTH.walk, ld = v < 0.3 ? 0 : lead(v);
      let p = fromLocal(fromLocal(s0.P, th, ld, 0), s0.psi, 0, sgn(X) * w); const r = rgt(s0.psi), sx = sgn(X);
      const o = lastOf(other(X)); if (o && o.pos) { const l = ((p[0] - o.pos[0]) * r[0] + (p[1] - o.pos[1]) * r[1]) * sx; if (l < 0.13) { p = [p[0] + r[0] * sx * (0.13 - l), p[1] + r[1] * sx * (0.13 - l)]; } }
      return offBall(p, s0.psi, X, tt, min(t1 != null ? t1 : tt + 0.25, tt + 0.6)); };
    // a stance off the free ball's path while it stands (a stance that never lifts: off where the ball comes to rest)
    const offBall = (p, psi, X, tt, tEnd) => { const r = rgt(psi); let need = 0, side = sgn(X);
      for (let x = max(t, tt - 0.04); x <= tEnd + 1e-9; x += x > tt + 0.6 ? 0.2 : 0.02) { const b = predict(bp0, bv0, x - t).p, d = [b[0] - p[0], b[1] - p[1]], a = d[0] * Math.cos(psi) + d[1] * Math.sin(psi), l = d[0] * r[0] + d[1] * r[1];
        if (a > -0.24 && a < 0.30 && abs(l) < 0.20) { const nd = 0.20 - abs(l); if (nd > need) { need = nd; side = l >= 0 ? -1 : 1; } } }
      return need > 0 ? [p[0] + r[0] * side * min(0.20, need), p[1] + r[1] * side * min(0.20, need)] : p; };
    const yawOf = (X, tt) => { const s0 = this.stateAt(tt, plan); return (s0.s > 0.6 ? s0.h : s0.psi) + sgn(X) * 5 * DEG; };
    const cad = (tt) => { const v = this.stateAt(tt, plan).s, G = this.gait(max(v, 0.01)), v2 = this.stateAt(tt + 0.3, plan).s;
      return v2 > v + 0.6 && v2 > 1.8 ? { Ts: min(G.Ts, 0.245 + 0.008 * v), D: max(G.D, 0.36) } : G; }; // accelerating: quick short steps
    const stanceD = (tt) => { const G = cad(tt); return G.D * 2 * G.Ts; };
    const step = (X, td) => { const st = { id: ++this.sid, F: X, t0: td, t1: td + stanceD(td), pos: place(X, td, td + stanceD(td)), yaw: yawOf(X, td), kind: this.stateAt(td, plan).s < 2.4 ? "walk" : "stride", src: "gait" }; S[X].push(st); return st; };
    // a planted foot that must step lifts in time (a standing foot: now)
    const lift = (X, tdNext) => { const l = lastOf(X); if (l.t1 === Infinity || l.t1 > tdNext - 0.14) l.t1 = max(l.t0 + 0.06, min(tdNext - 0.14, l.t1 === Infinity ? t + 0.02 : l.t1), t + 0.02); };
    // the last touchdown (a tie — both feet down together — goes to a technique's own stance, else to the right foot: never the mirror's opposite)
    const lastTD = () => { const r = lastOf("R"), l = lastOf("L"); if (abs(r.t0 - l.t0) < 1e-9) return r.src === "tech" ? r : l.src === "tech" ? l : r; return r.t0 > l.t0 ? r : l; };
    const moving = plan.req && plan.req.h != null;
    // standing and asked to move: the rear foot (relative to the request) steps first, quickly
    if (lastOf("R").t1 === Infinity && lastOf("L").t1 === Infinity) {
      if (!moving && !anchors.length) return S;
      const hq = plan.req.h, rr = toLocal(lastOf("R").pos, this.stateAt(t, plan).P, hq)[0], ll = toLocal(lastOf("L").pos, this.stateAt(t, plan).P, hq)[0];
      let X = rr < ll - 0.02 ? "R" : ll < rr - 0.02 ? "L" : (this.o.foot === "L" ? "R" : "L"); if (anchors.length) { const A0 = anchors[0]; X = A0.t0 - t < 0.3 ? A0.F : other(A0.F); }
      const td = t + 0.03 + 0.17; lastOf(X).t1 = t + 0.03; if (!(anchors.length && anchors[0].F === X && anchors[0].t0 < td + 0.1)) step(X, td); lastOf(other(X)).t1 = Infinity; }
    // the anchors (a technique's own stances): the steps before each spread evenly to land it on its foot at its time
    for (const A of anchors.slice().sort((x, y) => x.t0 - y.t0)) { if (A.t0 <= t + this.P.react) continue;
      const L0 = lastTD(), N = other(L0.F), gap = A.t0 - L0.t0, Ts = this.gait(max(this.stateAt(L0.t0, plan).s, 0.5)).Ts;
      let best = null; for (let j = (A.F === N ? 0 : 1); j <= 7; j += 2) { const per = gap / (j + 1); if (per < 0.13) break; const e = abs(per - Ts); if (!best || e < best.e) best = { j, per, e }; }
      if (!best) best = { j: A.F === N ? 0 : 1, per: gap / ((A.F === N ? 0 : 1) + 1) };
      for (let i = 1; i <= best.j; i++) { const X = i % 2 === 1 ? N : other(N), td = L0.t0 + i * best.per; lift(X, td); step(X, td); }
      if (A.t1 == null) A.t1 = A.t0 + stanceD(A.t0);   // (an anchor without its own stance length — B2's shortened step — gets the gait's)
      if (!A.pos) { A.pos = place(A.F, A.t0); A.yaw = yawOf(A.F, A.t0); }
      lift(A.F, A.t0); const prev = lastOf(other(A.F)); if (prev.t1 === Infinity) prev.t1 = A.t0 + 0.08; S[A.F].push(A); }
    // free running / walking after: the cadence at the speed then; stopping: the last step beside the other foot, both planted
    for (let guard = 0; guard < 30; guard++) {
      const L0 = lastTD(), X = other(L0.F), s0 = this.stateAt(max(t, L0.t0), plan), v = s0.s, G = cad(max(t, L0.t0));
      const tEnd = this.stateAt(min(tTo, max(t, L0.t0) + 0.4), plan).s;
      if (!moving && v < 0.45 && tEnd < 0.3) { // settle
        const lx = lastOf(X); if (lx.t1 === Infinity && L0.t1 === Infinity) break;
        const td = max(L0.t0 + 0.14, lx.t1 === Infinity ? t + 0.16 : lx.t1 + 0.16, t + 0.05); if (td > tTo) break; lift(X, td); const s1 = this.stateAt(td, plan);
        S[X].push({ id: ++this.sid, F: X, t0: td, t1: Infinity, pos: offBall(fromLocal(s1.P, s1.psi, X === (this.o.foot === "L" ? "L" : "R") ? -0.02 : 0.04, sgn(X) * WIDTH.stand), s1.psi, X, td, td + 3.0), yaw: s1.psi + sgn(X) * 6 * DEG, kind: "settle", src: "gait" }); L0.t1 = Infinity; break; }
      let td = L0.t0 + G.Ts; const lx = lastOf(X); if (lx.t1 !== Infinity) td = max(td, lx.t1 + 0.16); td = max(td, t + 0.02); if (td > tTo) break;
      lift(X, td); step(X, td); if (L0.t1 === Infinity) L0.t1 = td + 0.6 * stanceD(td); }
    // a stance ends before its foot's next one begins (the swing ≥ 0.14 s), never before it began
    for (const X of ["R", "L"]) { const L = S[X]; for (let i = 0; i + 1 < L.length; i++) if (L[i].t1 > L[i + 1].t0 - 0.14 && L[i].t1 > t) L[i].t1 = max(L[i].t0 + 0.05, L[i + 1].t0 - 0.14, t + 0.005); }
    return S;
  }
  // ── THE CARRY CANDIDATE ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  carryPlan(st, keep, q, reason) {
    const t = this.t, b0 = this.ball.p, bv = this.ball.v;
    let plan = this.mkPlan({ t0: t, st, stances: null, contacts: [], action: { kind: "CARRY", label: q.h == null ? (st.s > 0.4 ? "STOP" : "STANDING") : "CARRY", id: this.plan.action.kind === "CARRY" ? this.plan.action.id : ++this.aid }, req: q, prog: { kind: "carry" }, chKeys: this.carryChannels(st, q, t) });
    plan.stances = this.gaitFrom(plan, keep, [], t + 1.5);
    let touches = this.carryTouches(plan, keep, q);
    // the body would overrun the ball (it runs faster than the ball rolls): pace it behind the ball until the touch that plays it
    if (!touches.ok && q.h != null) { const pace = { b0: b0.slice(), bv: bv.slice(), t0: t, until: t + 1.5 }, mk = (pc) => { const p2 = this.mkPlan({ t0: t, st, stances: null, contacts: [], action: plan.action, req: q, prog: { kind: "carry", pace: pc }, chKeys: this.carryChannels(st, q, t) }); p2.stances = this.gaitFrom(p2, keep, [], t + 1.5); return p2; };
      let p2 = mk(pace), tc2 = this.carryTouches(p2, keep, q);
      if (tc2.ok && tc2.list.length) { const p3 = mk(Object.assign({}, pace, { until: tc2.list[0].t + 0.02 })), tc3 = this.carryTouches(p3, keep, q); if (tc3.ok && tc3.list.length) { p2 = p3; tc2 = tc3; } }
      if (tc2.ok && tc2.list.length) { plan = p2; touches = tc2; } }
    // a turn asked while the ball is ahead: hold the line until the touch that can be made, turn with it (the touch redirects the ball)
    if (!touches.ok && q.h != null) { const hold0 = { h: st.s > 0.6 ? st.h : st.psi, until: t + 1.5 }; let p2 = this.mkPlan({ t0: t, st, stances: null, contacts: [], action: plan.action, req: q, prog: { kind: "carry", hold: hold0 }, chKeys: this.carryChannels(st, q, t) });
      p2.stances = this.gaitFrom(p2, keep, [], t + 1.5); let tc2 = this.carryTouches(p2, keep, q);
      if (tc2.ok && tc2.list.length) { const until = tc2.list[0].t + 0.02; p2 = this.mkPlan({ t0: t, st, stances: null, contacts: [], action: plan.action, req: q, prog: { kind: "carry", hold: { h: hold0.h, until } }, chKeys: this.carryChannels(st, q, t) }); p2.stances = this.gaitFrom(p2, keep, [], t + 1.5); tc2 = this.carryTouches(p2, keep, q); if (tc2.ok) { plan = p2; touches = tc2; } } }
    // the ball beyond the feet's reach on this path: chase it (re-plan the run toward where it will be — never released into space)
    if (!touches.ok && hyp(bv[0], bv[1]) + 0.1 > 0) { const ch = this.chasePlan(st, keep, q); if (ch) { plan = ch.plan; touches = ch.touches; } }
    plan.contacts = keep.contacts.concat(touches.list.filter((c) => !keep.contacts.some((k) => abs(k.t - c.t) < 0.03 && k.F === c.F)));
    plan.nContacts = touches.list.length; plan.tLine = this.lineTime(plan, q); if (plan.tLine != null && touches.tAligned != null) plan.tLine = max(plan.tLine, touches.tAligned); plan.sepMax = touches.sepMax; plan.sepPen = touches.sepPen; plan.action.carry = touches.info;
    return plan;
  }
  carryChannels(st, q, t) { const run = clamp(st.s / 6, 0, 1), o = { lean: [[t + 0.3, 6 + 6 * run]], side: [[t + 0.25, 0]], trunk: [[t + 0.3, 0]], crouch: [[t + 0.3, 0.022]], arms: [[t + 0.3, 0.15]], gait: [[t + 0.25, 1]], look: [[t + 0.3, 0.85]] };
    const fk = this.feintKeys ? this.feintKeys(t) : null; if (fk) Object.assign(o, fk); return o; }
  // ── B2: THE CARRY'S VARIANTS (the base carry plan stays a candidate; the cost chooses) ────────────────────────────────────────────────────────
  //   early    the next ordinary touch brought forward by a SHORTENED STEP of either foot (the same centre-of-mass path; the step 0.04 – 0.12 s
  //            sooner, the support ≥ 0.06 s, the swing ≥ 0.16 s) — it REPLACES the touch it brings forward (one touch per plan, as always)
  //   approach when the carry would hold its old line until the touch it can make: an ANGLED approach (60 % / 35 % of the turn toward the
  //            request, at speed or braking) that still reaches the ball on its own path
  // only when a touch must turn the ball (the request > 12° off the ball's line); the movement capability (Agility) is untouched
  carryVariants(st, keep, q, base) {
    const out = [], t = this.t; if (q.h == null) return out;
    const bv = this.ball.v, bs = hyp(bv[0], bv[1]), ref = bs > 1.0 ? hdg(bv) : (st.s > 1.0 ? st.h : st.psi); if (abs(wrap(q.h - ref)) < 12 * DEG) return out;
    const firstOf = (p) => p.contacts.find((c) => !c.done && c.t > t + 1e-9 && c.src === "carry"), t0 = (firstOf(base) || { t: 9 }).t, R = this.P.react, G = this.gait(max(st.s, 0.5));
    // a candidate plan from a prog and anchors: the stances, the touches (a hold ends at the touch it waits for: re-made once), the carry's bookkeeping
    const build = (prog, anchors, tag) => { const mk = (pg) => { const p = this.mkPlan({ t0: t, st, stances: null, contacts: [], action: Object.assign({}, base.action), req: q, prog: pg, chKeys: this.carryChannels(st, q, t) });
        p.stances = this.gaitFrom(p, keep, anchors.map((a) => Object.assign({}, a)), t + 1.5); return p; };
      let p = mk(prog), tc = this.carryTouches(p, keep, q); if (!tc.ok || !tc.list.length) return null;
      if (prog.hold) { const pg = Object.assign({}, prog, { hold: Object.assign({}, prog.hold, { until: tc.list[0].t + 0.02 }) }), p2 = mk(pg), tc2 = this.carryTouches(p2, keep, q); if (!tc2.ok || !tc2.list.length) return null; p = p2; tc = tc2; }
      p.contacts = keep.contacts.concat(tc.list.filter((c) => !keep.contacts.some((k) => abs(k.t - c.t) < 0.03 && k.F === c.F)));
      p.nContacts = tc.list.length; p.tLine = this.lineTime(p, q); if (p.tLine != null && tc.tAligned != null) p.tLine = max(p.tLine, tc.tAligned); p.sepMax = tc.sepMax; p.sepPen = tc.sepPen; p.action.carry = tc.info + " · " + tag; p.variant = tag; return p; };
    // early: a shortened step of either foot (its next free touchdown, sooner) — kept only when it brings the touch forward (≥ 0.03 s)
    const lastAny = this.contacts.filter((c) => !c.missed).reduce((m, c) => max(m, c.t), -9);
    if (this.L.early) for (const X of ["R", "L"]) { const L = base.stances[X], nx = L.find((x) => x.t0 > t + R + 0.02 && x.src === "gait"); if (!nx) continue;
      const cur = L.filter((x) => x.t0 <= t + 1e-9).pop(), planted = cur && cur.t1 > t, lifted = cur && !planted ? cur.t1 : null; let best = null;
      for (const d of [0.04, 0.08, 0.12]) { const td = Math.round((nx.t0 - d) / DT) * DT; if (td < t + R + 0.03) break;
        if (planted && td - max(cur.t0 + 0.06, t + 0.02) < 0.16) break; if (lifted != null && td - lifted < 0.16) break;
        const p = build(base.prog, [{ id: ++this.sid, F: X, t0: td, t1: null, pos: null, yaw: null, kind: "shortened step", src: "gait" }], `shortened ${X} step −${(d * 1000).toFixed(0)} ms`);
        // (useful, not busy: the touch it brings forward must send the ball onto the request's line (± 25°), and come ≥ 0.30 s after the last touch)
        const c = p && firstOf(p), vo = c && c.vOutPred; let ok = c && vo && hyp(vo[0], vo[1]) > 0.5 && abs(wrap(hdg(vo) - q.h)) < 25 * DEG && c.t - lastAny >= 0.30;
        // (no magic foot: the swing that plays it — from its lift-off through the ball to its landing — at most 30 % faster on average than this
        // foot's natural swing in the base plan, + 1 m/s)
        if (ok && c.F === X && cur && nx) { const Lv = p.stances[X], land = Lv.find((x) => x.t0 > c.t - 1e-6), lift = Lv.filter((x) => x.t0 < c.t - 1e-6).pop(), B = predict(this.ball.p, this.ball.v, c.t - t).p;
          if (land && lift && land.pos && lift.pos) { const T = land.t0 - max(lift.t1, t - 0.4), path = hyp(B[0] - lift.pos[0], B[1] - lift.pos[1]) + hyp(land.pos[0] - B[0], land.pos[1] - B[1]), nat = hyp(nx.pos[0] - cur.pos[0], nx.pos[1] - cur.pos[1]) / max(0.05, nx.t0 - cur.t1);
            if (T <= 0.05 || path / T > 1.3 * nat + 1.0) ok = false; } }
        if (ok && c.t < t0 - 0.03 && (!best || c.t < best.c.t - 1e-9)) best = { p, c }; }
      if (best) out.push(best.p); }
    // approach: angled instead of the old line held (only where the base plan holds)
    if (this.L.approach && base.prog && base.prog.hold) { const h0 = st.s > 0.6 ? st.h : st.psi, turn = wrap(q.h - h0);
      for (const [f, brake] of [[0.6, false], [0.35, false], [0.6, true]]) { const prog = { kind: "carry", hold: { h: h0 + f * turn, until: t + 1.5, speed: brake ? max(2.0, 0.75 * st.s) : undefined } };
        const p = build(prog, [], `angled approach ${(f * 100).toFixed(0)} %${brake ? " braking" : ""}`); if (p) out.push(p); } }
    return out;
  }
  // ── B4: THE GENERIC CANDIDATES — every family the request's redirect calls for × the foot its side allows × that foot's next two swing ends ×
  // the approach (on the line, 35 % toward the request; 60 % with B2's approach) ──────────────────────────────────────────────────────────────
  genericPlans(st, keep, q, base) {
    const out = [], t = this.t; if (q.h == null || keep.contacts.length) return out;
    const bv = this.ball.v, bs = hyp(bv[0], bv[1]), h0 = st.s > 0.6 ? st.h : st.psi, turnB = wrap(q.h - h0), turnBall = bs > 1.0 ? wrap(q.h - hdg(bv)) : turnB;
    if (abs(turnB) < 16 * DEG && abs(turnBall) < 16 * DEG) return out;
    const R = this.P.react, lastBy = { R: -9, L: -9 }; for (const c of this.contacts) if (!c.missed) lastBy[c.F] = max(lastBy[c.F], c.t);
    // (the running generic action, rebuilt at its own touch time and approach first: its continuation is always a candidate)
    const ca = this.plan.action, pc = ca.kind === "GENERIC" ? this.plan.contacts.find((c) => c.src === "generic" && !c.done && c.t > t + R) : null;
    if (pc) { const G = GENERIC[ca.fam], tw = G.body ? turnB : turnBall, sgnT = Math.sign(tw) || 1, need = abs(tw) / DEG;
      if (need >= G.need[0] - 8 && need <= G.need[1] + 8 && (!G.side || sgnT === G.side * sgn(ca.F))) { const p = this.genericBuild(ca.fam, G, ca.F, pc.t, { t0: pc.t + CARRY.touchBefore }, ca.approach, st, keep, q, turnB, sgnT, this.plan.prog.hold.h, base); if (p) out.push(p); } }
    // (urgency: the ball is escaping the ordinary carry — no touch it can make, or only by holding its line / chasing, or none for 0.65 s (a
    // sprint's touch → strides → touch is ordinary) — only then is a lunge an option)
    const bt = base.contacts.find((c) => !c.done && c.t > t + 1e-9), urgent = !bt || bt.t - t > 0.65 || !!base.action.chase;
    for (const [key, G] of Object.entries(GENERIC)) { const tw = G.body ? turnB : turnBall, need = abs(tw) / DEG, sgnT = Math.sign(tw) || 1; if (this.o.noFam && this.o.noFam.has(key)) continue; if (!(G.expanded ? this.o.vocab === "EXPANDED" : CAPS.vocabulary.includes(key === "ABG" ? "GATHER" : key)) || (G.reviewOnly && this.o.forceFam !== key)) continue; if (key === "URG" && !urgent) continue;
      if (need < G.need[0] || need > G.need[1] || (G.vMax && st.s > G.vMax + 0.6) || (G.vMin && st.s < G.vMin)) continue;
      if (G.sprintOnly && (q.mode !== "SPRINT" || (this.volatility && this.volatility() > 0.25) || (this.opp && this.opp.some((e) => !e.hit && t > e.t0 - 1.0 && t < e.t1 + 0.3)))) continue;
      for (const X of ["R", "L"]) { if (G.side && sgnT !== G.side * sgn(X)) continue;
        // (the touching foot's landing: its natural ones on the stride, each a little sooner or later — as a technique's anchor — the touch at
        // the end of that swing; the first two that place the ball in the family's reach are kept)
        const FF = this.o.forceFam === key; let n = 0; for (const td of this.anchorTimes(X, keep, st)) { if (n >= (FF ? 4 : 2)) break; const tT = Math.round((td - CARRY.touchBefore) / DT) * DT; if (tT < lastBy[X] + 0.2 || tT <= t + R + 0.01 || tT > t + (FF ? 1.6 : 1.1)) continue;   // (review-only: a forced family is searched over the next four swing ends)
          let any = false; for (const ap of ["line", "intercept"]) { const p = this.genericBuild(key, G, X, tT, { t0: Math.round(td / DT) * DT }, ap, st, keep, q, turnB, sgnT, null, base); if (p) { out.push(p); any = true; } } if (any) n++; } } }
    return out;
  }
  // the approach until the touch: its old line, or INTERCEPTING — the heading that brings the ball to the family's nominal contact point by then
  // (toward the ball's own path: the carry tracker turns to it at Agility's limits)
  approachH(G, X, tT, st, sgnT) { const h0 = st.s > 0.6 ? st.h : st.psi, B = predict(this.ball.p, this.ball.v, tT - this.t).p; let h = h0;
    for (let i = 0; i < 2; i++) { const c = fromLocal(B, h, -G.nom[0], -sgn(X) * G.nom[1]), d = [c[0] - st.P[0], c[1] - st.P[1]]; if (hyp(d[0], d[1]) < 0.2) return h0; h = hdg(d); }
    return h0 + clamp(wrap(h - h0), -50 * DEG, 50 * DEG); }
  genericBuild(key, G, X, tT, e, ap, st, keep, q, turnB, sgnT, hPin = null, base = null) {
    // (… and the OTHER foot's touch within 0.45 s of the transfer is its RECEIVE — the same manoeuvre: no second shift, no held line, the body
    // carrying on into the lane; before, B4 took it as a second lateral transfer, which re-ran the shift and held the root's turn 0.15 s)
    const t = this.t, O = other(X), h0 = st.s > 0.6 ? st.h : st.psi, lastLAT = key === "LAT" ? this.contacts.filter((c) => c.fam === "LAT" && !c.missed && c.t < t + 1e-9).pop() : null, RCV = !!(lastLAT && lastLAT.F === O && t - lastLAT.t < 0.45 && this.o.croq !== "CURRENT" && !CC_ABL.croq);
    const CQ = key === "LAT" && !RCV && this.o.croq !== "CURRENT" && !CC_ABL.croq && q.h != null, hold = { h: hPin != null ? hPin : ap === "intercept" ? this.approachH(G, X, tT, st, sgnT) : h0, until: CQ ? max(t, tT - CROQ.lead) : RCV ? t : tT + 0.02 }, f = ap;
    // (ADV-4 croqueta: the root across from `lead` s before the touch, the pelvis translating before it rotates — CROQ above)
    const croq = CQ ? { t0: hold.until, t1: tT + 0.02, h0: hold.h, hS: hold.h + CROQ.f * wrap(q.h - hold.h), tP: tT + CROQ.psiEnd, psiF: CROQ.psiF } : null;
    if (hPin == null && ap === "intercept" && abs(wrap(hold.h - h0)) < 2 * DEG) return null;
    const chKeys = this.carryChannels(st, q, t); chKeys.crouch = [[tT - 0.10, G.crouch || 0.045], [tT + 0.12, 0.035], [tT + 0.35, 0.022]]; chKeys.trunk = [[tT - 0.05, sgnT * 8], [tT + 0.3, 0]];
    if (G.feint) { const fT = min(0.30, tT - t - 0.02); if (fT < 0.20) return this.rej("feint time"); const fk = -sgnT, f0 = tT - fT, f1 = tT - 0.4 * fT;   // (the feint: 0.20 – 0.30 s before the touch, as the state allows)
      chKeys.side = [[t + 0.01, 0], [f0, fk * 9], [f1, fk * 9], [tT + 0.03, -fk * 6], [tT + 0.35, 0]];
      chKeys.trunk = [[f0, fk * 16], [f1 + 0.05, fk * 12], [tT + 0.04, -fk * 10], [tT + 0.32, 0]]; chKeys.crouch = [[f0, 0.065], [tT - 0.05, 0.05], [tT + 0.12, 0.035], [tT + 0.35, 0.022]]; }
    if (croq) { chKeys.crouch = [[tT - 0.16, CROQ.crouch], [tT + 0.14, CROQ.crouch - 0.01], [tT + 0.40, 0.022]]; chKeys.arms = [[tT - 0.14, 0.45], [tT + 0.12, 0.5], [tT + 0.40, 0.18]]; }
    const plan = this.mkPlan({ t0: t, st, stances: null, contacts: [], action: { kind: "GENERIC", fam: key, label: G.label, F: X, id: 0 }, req: q, prog: { kind: "carry", hold, croq }, chKeys });
    const B = predict(this.ball.p, this.ball.v, tT - t), s = this.stateAt(tT, plan), th = s.psi, rel = toLocal(B.p, s.P, th), lat = rel[1] * sgn(X);
    // (ADV-4: the croqueta's body already moving across at its touch leaves the ball up to 6 cm further to the touching foot's side — its reach
    // widened by that much; the swing-speed check below still forbids a magic foot)
    if (rel[0] < G.box.a[0] || rel[0] > G.box.a[1] || lat < G.box.l[0] || lat > G.box.l[1] + (CQ ? CROQ.reach : 0) || (G.vMax && s.s > G.vMax)) return this.rej("box");
    // the plant (the other foot, just before the touch, beside / behind the ball) and the touching foot's landing at its swing end
    const anchors = []; let plant = null;
    // (B5 windups: no extra plant when the other foot is already down through the touch in the ordinary gait — the support exists)
    const supported = this.L.windups && base && base.stances[O].some((x) => x.t0 <= tT - 0.04 && x.t1 >= tT + 0.02);
    if (G.plant && !supported) { const tp = Math.round((tT - 0.05) / DT) * DT; if (tp > t + this.P.react + 0.01) { plant = { id: ++this.sid, F: O, t0: tp, t1: null, pos: fromLocal(B.p, th, G.plant[0], sgnT * G.plant[1]), yaw: th + sgnT * 20 * DEG, kind: `plant · ${G.label.toLowerCase()}`, src: "generic" }; anchors.push(plant); } }
    anchors.push({ id: ++this.sid, F: X, t0: e.t0, t1: null, pos: null, yaw: null, kind: `after the ${G.label.toLowerCase()}`, src: "gait" });
    plan.stances = this.gaitFrom(plan, keep, anchors, t + 1.5); if (anchors.some((a) => a.refused)) return this.rej("committed landing");
    // honoured and plausible: the touching foot in the air at the touch; the plant down, its foot's swing to it ≥ 0.12 s, the support before ≥ 0.055 s
    if (plan.stances[X].some((x) => x.t0 <= tT + 1e-6 && x.t1 >= tT - 1e-6)) return this.rej("foot down");
    if (plant) { const SO = plan.stances[O], i = SO.findIndex((x) => x.id === plant.id || (plant.took != null && x.id === plant.took)); if (i < 0) return this.rej("plant"); const pv = SO[i - 1]; if (pv && pv.t1 > t && (plant.t0 - pv.t1 < 0.12 - 1e-6 || pv.t1 - pv.t0 < 0.055)) return this.rej("plant timing"); }
    // (no magic foot: the swing that plays it — from its lift-off through the ball to its landing — at most 30 % faster on average than the same
    // foot's natural swing in the ordinary carry, + 1 m/s)
    if (base) { const SX = plan.stances[X], land = SX.find((x) => x.t0 > tT - 1e-6), lift = SX.filter((x) => x.t0 < tT - 1e-6).pop(), BL = base.stances[X], bLand = BL.find((x) => x.t0 > tT - 0.2), bLift = bLand ? BL.filter((x) => x.t0 < bLand.t0 - 1e-6).pop() : null;
      if (land && lift && land.pos && lift.pos && bLand && bLift && bLand.pos && bLift.pos) { const T = land.t0 - max(lift.t1, t - 0.4), path = hyp(B.p[0] - lift.pos[0], B.p[1] - lift.pos[1]) + hyp(land.pos[0] - B.p[0], land.pos[1] - B.p[1]), nat = hyp(bLand.pos[0] - bLift.pos[0], bLand.pos[1] - bLift.pos[1]) / max(0.05, bLand.t0 - bLift.t1);
        if (T <= 0.05 || path / T > (key === "URG" ? 1.0 * nat + 0.5 : 1.3 * nat + 1.0)) return this.rej("swing speed"); } }   // (a lunge's reach is its extra length, not extra speed)
    // the touch: to where the body plays it next (the preferred foot's next swing end ahead in its lane on the request's line; a braking touch:
    // where the braked body will be) — the redirect capped by the family; it must change the ball (else it is the carry's)
    const laneFoot = G.aimFoot === "other" ? O : this.o.foot === "B" ? X : this.o.foot, lane = sgn(laneFoot) * CARRY.lane(q.mode), nxs = plan.stances[laneFoot].filter((x) => x.t0 - CARRY.touchBefore > tT + (G.aimFoot === "other" ? 0.10 : 0.15)), nx = nxs[0];
    let nxT = nx ? nx.t0 - CARRY.touchBefore : tT + 2 * this.gait(max(s.s, 1)).Ts;
    if (G.knock) { let best = null; for (const x of nxs) { const T2 = x.t0 - CARRY.touchBefore; if (T2 <= tT + G.knock + 0.10 && (best == null || abs(T2 - tT - G.knock) < abs(best - tT - G.knock))) best = T2; } if (best == null || best - tT < 0.6) return this.rej("knock"); nxT = best; }   // (the knock: the lane foot's swing end nearest 1.05 s later)
    const sN = this.stateAt(nxT, plan);
    let aim = G.brake ? { kind: "target", P: fromLocal(this.stateAt(tT + 0.5, plan).P, q.h, 0.35, lane), T: tT + 0.55 } : { kind: "target", P: fromLocal(sN.P, q.h, CARRY.ahead(sN.s), lane), T: nxT };
    const d = [aim.P[0] - B.p[0], aim.P[1] - B.p[1]], D = hyp(d[0], d[1]), sp = min(CARRY.vCap, speedFor(D, max(0.1, aim.T - tT)) || CARRY.vCap); let vOut = [d[0] / max(D, 1e-6) * sp, d[1] / max(D, 1e-6) * sp];
    const inS = hyp(B.v[0], B.v[1]); if (G.redirect && inS > 1.0) { const dA = wrap(hdg(vOut) - hdg(B.v)); if (abs(dA) > G.redirect * DEG) { const hh = hdg(B.v) + Math.sign(dA) * G.redirect * DEG; vOut = [Math.cos(hh) * sp, Math.sin(hh) * sp]; aim = { kind: "vel", speed: sp, h: hh }; } }
    if (hyp(vOut[0] - B.v[0], vOut[1] - B.v[1]) < 0.8) return this.rej("no change");
    // the surface is the impulse's (the body's contact pose is built from it): it must be the family's
    if (G.minImpulseDeg) { const dv = [vOut[0] - B.v[0], vOut[1] - B.v[1]]; if (abs(wrap(hdg(dv) - (s.s > 0.6 ? s.h : s.psi))) < G.minImpulseDeg * DEG) return this.rej("impulse"); }
    const surface = G.forceSurface || this.surfaceFor(X, B.v, vOut, s, "carry"); if (G.forceSurface) { /* (the sole's: the pose is built from it) */ } else if (G.surface === "BRAKE" ? !(surface === "SOLE" || surface === "INSIDE") : G.surface ? surface !== G.surface : surface === "SOLE") return this.rej("surface");
    // the touching foot's landing off the ball's new path (positions only, as the carry's)
    { const L = plan.stances[X].find((x) => x.t0 > tT - 1e-6); if (L && L.src === "gait") { const psi = this.stateAt(L.t0, plan).psi, r = rgt(psi); let need = 0, side = sgn(X);
        for (let x = max(tT, L.t0 - 0.04); x <= min(L.t1, L.t0 + 0.3); x += 0.02) { const b = predict(B.p, vOut, x - tT).p, dd = [b[0] - L.pos[0], b[1] - L.pos[1]], a = dd[0] * Math.cos(psi) + dd[1] * Math.sin(psi), l = dd[0] * r[0] + dd[1] * r[1]; if (a > -0.22 && a < 0.30 && abs(l) < 0.20) { const nd = 0.20 - abs(l); if (nd > need) { need = nd; side = l >= 0 ? -1 : 1; } } }
        if (need > 0) { const k = min(0.20, need); L.pos = [L.pos[0] + r[0] * side * k, L.pos[1] + r[1] * side * k]; } } }
    const c = { id: ++this.cid, t: tT, k: Math.round(tT / DT), F: X, surface, role: RCV ? "croqueta · the other foot receives and carries on" : key === "LAT" && this.o.croq !== "CURRENT" ? "croqueta · the inside plays it across" : G.label.toLowerCase(), aim, src: "generic", tech: "GENERIC", fam: key, bPred: B.p, vInPred: B.v, vOutPred: vOut, sc: G.knock && aim.kind === "target" ? true : undefined };
    const ca = this.plan.action, same = ca.kind === "GENERIC" && ca.fam === key && ca.F === X && !this.contacts.some((r) => r.actionId === ca.id);
    plan.contacts = keep.contacts.concat([c]); plan.nContacts = 1;
    plan.action = { kind: "GENERIC", fam: key, label: G.label, F: X, m: 0, id: same ? ca.id : ++this.aid, tC: tT, turnDeg: (G.body ? turnB : wrap(q.h - (inS > 1 ? hdg(B.v) : h0))) / DEG, protect: G.protect, approach: f, tPrep: plant ? plant.t0 : null };
    plan.tLine = this.lineTime(plan, q); const aligned = sp < 0.5 || abs(wrap(hdg(vOut) - q.h)) < 25 * DEG; if (plan.tLine != null) plan.tLine = max(plan.tLine, aligned ? tT : tT + 2 * this.gait(max(s.s, 1)).Ts);
    { const lim = q.mode === "SPRINT" ? 3.0 : q.mode === "RUN" ? 2.0 : q.mode === "JOG" ? 1.5 : 1.0; let sa = 0; for (let x = 0; x <= 1.2; x += 0.1) { const s2 = this.stateAt(tT + x, plan), b2 = predict(B.p, vOut, x).p; sa = max(sa, hyp(b2[0] - s2.P[0], b2[1] - s2.P[1])); }
      plan.sepMax = sa; plan.sepPen = (sa > lim ? 0.6 * (sa - lim) : 0) + (!aligned && sp > 0.5 && abs(wrap(hdg(vOut) - q.h)) > 30 * DEG ? 0.4 : 0); }
    return plan;
  }
  rej(why) { (this._rej = this._rej || {})[why] = (this._rej[why] || 0) + 1; return null; }
  // ── DRIBBLING VOCAB-1: THE MANUAL TECHNICAL INTENT ─────────────────────────────────────────────────────────────────────────────────────────
  // requestSkill({ intent, ids (the library's techniques for it), gen (a generic family), foot "R" | "L" | null, window }) — a TECHNICAL INTENT,
  // never an animation: for its window (0.7 s) the resolver also builds that technique's instances from the live state (the foot on the stride,
  // the ball, the entry speed, the requested exit — the stick) and prefers a feasible one strongly (J − 6); none feasible → REJECTED with the
  // resolver's reasons, the best ordinary solution played instead. Recorded as an event (a replay re-issues it at the same tick)
  requestSkill(o) { const st0 = this.stateAt(this.t, this.plan), S = { intent: o.intent, ids: (o.sprint && o.idsSprint) || o.ids || [],   // (ADV-4: STOP-AND-GO with the sprint key held: the hesitation)
      gen: o.gen || null, genFallback: !!o.genFallback, foot: o.foot || null, trim: !!o.trim, t: this.t, until: this.t + (o.window || 0.55), rej: {}, done: false, k: this.k, feintSide: o.feintSide || 0, h0: st0.s > 1.0 ? st0.h : st0.psi, aid0: this.plan.action.id };
    // (DRIBBLING VOCABULARY INTEGRATION: a request for a template that holds its line — holdLine, the integrated Body Feint and Croqueta — keeps
    // its carry touches on the entry line while it is pending, as a braking preparation does (c_sim.js reaim): re-aimed toward the stick, the
    // carry touch rolled the ball across to the other foot and every later stride of the window was infeasible)
    S.holdLine = S.ids.some((id) => TEMPLATES[id] && TEMPLATES[id].holdLine);
    if (this.bfEnd != null && this.bfEnd > this.t && S.ids.some((id) => TEMPLATES[id] && TEMPLATES[id].bodyFeint) && !CC_ABL.bfseq) S.until = Math.max(S.until, this.bfEnd + (o.window || 0.55));   // (BODY FEINT V2: a feint requested during a feint's exit waits for it — its window runs from there)
    // (braked only as far as the technique needs: the fastest mode within its entry speed)
    // (CRUYFF-CHOP-1: THE NECESSARY PREPARATION — a hook / Cruyff / chop requested faster than it can be entered: the request stays pending
    // while the body brakes along its entry line, the ball carried under CONTROLLED_BALL, the technique entered on the first stride it is
    // feasible — "if moving faster: necessary preparation → plant → Cruyff", "brake → hook → exit". Its window grows by the braking time)
    { const ids = S.ids.filter((id) => PREP_TECH.has(id) && TEMPLATES[id]); if (ids.length && !CC_ABL.prep) { const vE = Math.max(...ids.map((id) => entryMax(TEMPLATES[id], this.P)));
        if (st0.s > vE + 0.3) { const aB = this.P.aBrake * 0.9, mode = this.P.speed.RUN <= vE + 0.3 ? "RUN" : this.P.speed.JOG <= vE + 0.3 ? "JOG" : "WALK"; S.prep = { v: vE, mode, t: this.t }; S.until = Math.max(S.until, this.t + (st0.s - vE) / aB + 1.0); } } }   // (+ 1.0 s: a ball pushed ahead in a sprint is reached before the body can brake — 0.5 s from a fast run)
    // (BODY FEINT V2: a request replaced before its outcome is logged as SUPERSEDED (·ENTERED: its technique had begun and may still play out) — rapid input otherwise left no trace of it; the log only)
    if (this.skill && !this.skill.done) { const P0 = this.skill; P0.done = true; P0.result = P0.state === "ENTERED" ? "SUPERSEDED·ENTERED" : "SUPERSEDED"; P0.tEnd = this.t; this.log.skill.push(Object.assign({}, P0)); }
    this.skill = S; this.flags.replan = this.flags.replan || "skill"; this.log.events.push({ k: this.k, kind: "skill", v: Object.assign({}, o) });
    // (DRIBBLING VOCABULARY INTEGRATION: an intent for an entry that is not eligible (SUPERSEDED / EXPERIMENTAL — intentOf's `retired`) is
    // REJECTED at once with that reason: nothing is planned for it, the controlled carry goes on)
    if (o.retired) { S.done = true; S.result = "REJECTED"; S.rej[o.retired] = 1; S.tEnd = this.t; S.alt = actionId(this.plan.action); this.log.skill.push(Object.assign({}, S)); this.skill = null; return S; }
    // (a FEINT intent is the feint itself — played at once, the fake side the one AWAY from the requested exit (none asked: o.feintSide); a
    // feint-and-cut prefers its cut family for the next 0.6 s — B4 still chooses the touch, the foot and the moment)
    if (o.feint) { const q = this.req, tr = q && q.h != null ? wrap(q.h - S.h0) : 0, side = abs(tr) > 8 * DEG ? -Math.sign(tr) : (o.feintSide || 1); this.startFeint(o.feint, side, "manual");
      if (!S.ids.length && !S.gen) { S.done = true; S.result = "PLAYED"; S.state = "FEINT"; S.tPlayed = this.t; S.played = o.intent; S.prefer = o.prefer || null; S.preferUntil = this.t + 0.6; this.prefer = S.prefer ? { fam: S.prefer, until: this.t + 0.6 } : null; this.log.skill.push(Object.assign({}, S)); } }
    return S; }
  // (DRIBBLING VOCAB-1: the review harness's THREAT — a point on the pitch (a defender's place), or null; recorded as an event)
  setThreat(o) { this.threat = o && o.P ? { P: o.P.slice() } : null; this.flags.replan = this.flags.replan || "threat"; this.log.events.push({ k: this.k, kind: "threat", v: o ? Object.assign({}, o) : null }); }
  noteRej(r0) { const S = this.skill; if (!S) return; const r1 = this._rej || {}; for (const [k, v] of Object.entries(r1)) { const d = v - (r0[k] || 0); if (d > 0) S.rej[k] = (S.rej[k] || 0) + d; } }
  skillCands(st, keep, q, act) { const S = this.skill, out = []; if (!S || S.done || q.h == null) return out; const r0 = Object.assign({}, this._rej || {}), t = this.t;
    // (LA CROQUETA — VIDEO-GUIDED: its generic fallback, once entered, runs on — a template instance appearing a few ticks later switched the
    // plan mid-approach and jumped the foot)
    if (S.genFallback && S.state === "ENTERED" && act.kind === "GENERIC" && act.fam === S.gen) return out;
    // (ENTERED: its own running instance, pinned — re-targeted to the latest exit before its commitment, kept through it)
    if (S.state === "ENTERED" && act.tech && S.ids.includes(act.tech) && act.id === S.aid && t < act.tC + 0.02) { const p = this.instantiate(act.tech, act.m, q, st, keep, { pinned: act }); if (p) { p.skill = S.intent; out.push(p); } return out; }
    for (const id of S.ids) { if (!TEMPLATES[id]) continue; for (const m of S.foot === "R" ? [1] : S.foot === "L" ? [-1] : [1, -1]) for (const trimV of ENTRY_FAMILY.has(id) && TRIMMED[id] && !CC_ABL.entry ? [false, true] : [!!S.trim]) {
        // (every stride anchor the next 1.25 s offers — not only the earliest: the earliest may need a foot already swinging to jump to a new
        // touch (the possession model's veto); the resolver's cost then picks the stride)
        const tr = trimV && TRIMMED[id], T = tr ? TRIMMED[id] : TEMPLATES[id], firstF = T.firstFoot === "F" ? (m > 0 ? "R" : "L") : (m > 0 ? "L" : "R"), entryMin = this.L.windups ? CAPS.entryMin : this.P.commit + 0.04; let got = 0;
        for (const ta of this.anchorTimes(firstF, keep, st)) { const tc = ta - T.start; if (ta < t + this.P.react + 0.02 || tc < t + entryMin || tc > t + 1.25) continue; if (got >= 3) break;
          const p = this.instantiate(id, m, q, st, keep, { tA: ta, trim: !!tr }); if (p) { got++; p.skill = S.intent; out.push(p); if (p.action.setTouch) { const p2 = this.instantiate(id, m, q, st, keep, { tA: ta, noSet: true, trim: !!tr }); if (p2) { p2.skill = S.intent; out.push(p2); } } } }
        if (!got) { const why = this.whyNot(id, m, q, st); S.rej[why] = (S.rej[why] || 0) + 1; } } }
    this.noteRej(r0); return out; }
  // (why a technique has no instance now — the gate it fails first: the reasons the Lab shows for a REJECTED request)
  whyNot(id, m, q, st) { const T = TEMPLATES[id], h0 = st.s > 1.0 ? st.h : st.psi; let dr = m * wrap(q.h - h0) / DEG;
    // (DRIBBLING VOCABULARY INTEGRATION: a template with a validated entry speed says that first — a walk feint asked at a jog is the speed's
    // matter, not its angle's; the angle quoted is the validated band (entryBand), not the gate's drift margin)
    if (T.entryV && (st.s < T.entryV[0] || st.s > T.entryV[1])) return `entry ${st.s.toFixed(1)} m/s outside its validated ${T.entryV[0]}–${T.entryV[1]} m/s`;
    if (T.free) { if (abs(dr) > T.hard[1]) return `exit ${abs(dr).toFixed(0)}° beyond its ${T.hard[1]}°`; }
    else { if (Math.sign(dr) !== T.turn && abs(dr) > 140) dr += T.turn * 360; if (Math.sign(dr) !== T.turn) return `the exit is on the wrong side for this foot`; if (abs(dr) < T.hard[0]) return `exit ${abs(dr).toFixed(0)}° below its ${T.hard[0]}°`; if (abs(dr) > T.hard[1]) return `exit ${abs(dr).toFixed(0)}° beyond its ${T.hard[1]}°`;
      const EB = T.entryBand || T.entryHard; if (T.entryHard && abs(dr) < T.entryHard[0]) return `exit ${abs(dr).toFixed(0)}° below its validated ${EB[0]} – ${EB[1]}°`; if (T.entryHard && abs(dr) > T.entryHard[1]) return `exit ${abs(dr).toFixed(0)}° beyond its validated ${EB[0]} – ${EB[1]}°`; }
    if (st.s < T.vRange[0] - 0.4 || (T.vFloor > 0 && st.s < T.vFloor)) return `entry ${st.s.toFixed(1)} m/s below its ${Math.max(T.vFloor || 0, T.vRange[0])} m/s`;
    if (st.s > T.vRange[1] + 2.5) return `entry ${st.s.toFixed(1)} m/s far above its ${T.vRange[1]} m/s`;
    return "no feasible entry on the coming strides (foot / ball / support timing)"; }
  // ── DRIBBLING VOCAB-1: THE BODY FEINT (no ball contact) — a false weight shift: the shoulders / trunk / head and the side lean SOLD toward the
  // fake side and snapped back, the crouch of a coming plant; the root, the touches and the ball are untouched (the research: deceptive runners
  // exaggerate head / upper-trunk yaw and foot displacement and MINIMISE the centre of mass's sideways movement). Kinds: BODY_FEINT (trunk +
  // lean), SHOULDER_DROP (deep side lean + crouch), HIP_FAKE (a smaller, quicker hip / trunk shift)
  startFeint(kind, side, src) { const P = FEINT_KINDS[kind] || FEINT_KINDS.BODY_FEINT; this.feint = { kind, side, t0: this.t, t1: this.t + P.dur, src }; this.log.feints.push({ t: this.t, kind, side, src }); this.flags.replan = this.flags.replan || "feint"; }
  feintKeys(t) { const f = this.feint; if (!f || t > f.t1 + 0.4) return null; const P = FEINT_KINDS[f.kind] || FEINT_KINDS.BODY_FEINT, s = f.side, a = f.t0, d = P.dur;
    return { side: [[a + 0.02, 0], [a + 0.35 * d, s * P.side], [a + 0.75 * d, s * P.side * 0.8], [a + d + 0.06, -s * P.side * 0.35], [a + d + 0.30, 0]],
      trunk: [[a + 0.02, 0], [a + 0.35 * d, s * P.trunk], [a + 0.75 * d, s * P.trunk * 0.8], [a + d + 0.06, -s * P.trunk * 0.4], [a + d + 0.30, 0]],
      crouch: [[a + 0.3 * d, P.crouch], [a + d + 0.10, 0.04], [a + d + 0.35, 0.022]], arms: [[a + 0.3 * d, P.arms], [a + d + 0.3, 0.15]], look: [[a + 0.3 * d, 0.5], [a + d + 0.3, 0.85]] }; }
  // (B4: a named move's EXIT QUALITY instead of its reference-angle fit — the ball after its last planned contact against the body's planned path
  // over 1.0 s: the separation beyond the mode's limit, the ball's line off the request)
  techExit(plan, q, T, frame) { const cs = plan.contacts.filter((c) => c.src === "tech" && !c.done).sort((a, b) => a.t - b.t); if (!cs.length) return { sepMax: 0.6, sepPen: 0 };
    let bp = this.ball.p, bv = this.ball.v, tb = this.t;
    for (const c of cs) { const f = predict(bp, bv, c.t - tb); let v; if (c.aim.kind === "target") { const d = [c.aim.P[0] - f.p[0], c.aim.P[1] - f.p[1]], D = hyp(d[0], d[1]), sp = min(CARRY.vCap, speedFor(D, max(0.05, c.aim.T - c.t)) || CARRY.vCap); v = D > 1e-3 ? [d[0] / D * sp, d[1] / D * sp] : [0, 0]; } else v = [c.aim.speed * Math.cos(c.aim.h), c.aim.speed * Math.sin(c.aim.h)];
      bp = f.p; bv = v; tb = c.t; }
    const lim = q.mode === "SPRINT" ? 3.0 : q.mode === "RUN" ? 2.0 : q.mode === "JOG" ? 1.5 : 1.0; let sa = 0; for (let x = 0; x <= 1.0; x += 0.1) { const s2 = this.stateAt(tb + x, plan), b2 = predict(bp, bv, x).p; sa = max(sa, hyp(b2[0] - s2.P[0], b2[1] - s2.P[1])); }
    const sp = hyp(bv[0], bv[1]); return { sepMax: sa, sepPen: (sa > lim ? 0.6 * (sa - lim) : 0) + (sp > 0.5 && abs(wrap(hdg(bv) - q.h)) > 30 * DEG ? 0.4 : 0) }; }
  // the run bent toward the ball (it rolls away / was left behind): the request's speed (at least the ball's + 1), toward its interception
  chasePlan(st, keep, q) {
    // run to a point just behind the ball relative to where it must go next (the request, else its own line) — round it if need be — so the touch
    // that follows sends it on; the earliest such point the body can reach
    const b = this.ball.p, bv = this.ball.v; let best = null;
    for (let T = 0.2; T <= 1.4 + 1e-9; T += 0.05) { const f = predict(b, bv, T), u = q.h != null ? dir(q.h) : (f.speed > 0.3 ? [f.v[0] / f.speed, f.v[1] / f.speed] : dir(st.psi));
      const tgt = [f.p[0] - u[0] * 0.38, f.p[1] - u[1] * 0.38], d = [tgt[0] - st.P[0], tgt[1] - st.P[1]], D = hyp(d[0], d[1]), need = D / T;
      if (need <= this.P.speed.SPRINT * 0.92) { best = { T, h: D > 0.05 ? hdg(d) : (q.h != null ? q.h : st.psi), sp: clamp(max(need * 1.05, 1.2), 1.2, this.P.speed.SPRINT) }; break; } }
    if (!best) return null; const plan = this.mkPlan({ t0: this.t, st, stances: null, contacts: [], action: { kind: "CARRY", label: "CARRY", id: this.plan.action.kind === "CARRY" ? this.plan.action.id : ++this.aid, chase: true }, req: q, prog: { kind: "chase", speed: best.sp, h: best.h, until: this.t + best.T + 0.1 }, chKeys: this.carryChannels(st, q, this.t) });
    plan.stances = this.gaitFrom(plan, keep, [], this.t + 1.5); const touches = this.carryTouches(plan, keep, q, true); touches.sepPen = (touches.sepPen || 0) + 0.3; return { plan, touches };
  }
  // the carry's touches: the first swing end (either foot — the lane foot first) where the ball is in that foot's reach; the touch sends the ball to
  // the touching foot's later swing end (the rhythm: every swing at a jog / run, every other at a sprint) ahead in the lane on the planned path
  carryTouches(plan, keep, q, recover = false, skip = null) {
    const t = this.t, R = this.P.react, b0 = this.ball.p, bv = this.ball.v, out = { list: [], ok: false, sepMax: 0, sepPen: 0, info: "" };
    // a committed touch stays (re-aimed below to the new path)
    const kept = keep.contacts.find((c) => c.src === "carry"), gKept = keep.contacts.find((c) => c.src === "generic");
    const ends = []; for (const X of ["R", "L"]) for (const s of plan.stances[X]) if (s.t0 > t + R && s.t0 < t + 1.45) ends.push({ F: X, tT: s.t0 - CARRY.touchBefore, st: s });
    ends.sort((a, b) => a.tT - b.tT);
    const ballAt = (T) => predict(b0, bv, T - t);
    // the ball's separation from the body over the next 1.2 s without a touch (the penalty if it would run away)
    for (let T = t; T <= t + 1.2; T += 0.1) { const s = this.stateAt(T, plan), bp = ballAt(T).p; out.sepMax = max(out.sepMax, hyp(bp[0] - s.P[0], bp[1] - s.P[1])); }
    const mode = q.mode, sAt = (T) => this.stateAt(T, plan);
    if (q.h == null && hyp(bv[0], bv[1]) < 0.05) { const me = sAt(t), d = hyp(b0[0] - me.P[0], b0[1] - me.P[1]); if (d < 0.75) { out.ok = true; out.info = "the ball at rest at the feet"; return out; } }
    let first = null, alt = null;
    const lastBy = { R: -9, L: -9 }; for (const c of this.contacts) lastBy[c.F] = max(lastBy[c.F], c.t); // (a foot never plays the ball twice in one swing)
    // (S99 MISSION — SPRINT_CARRY, the 99 pace only: open space at a steady sprint (sprintOpen) — the push planned the touch: none before it)
    const SC = this.sprintOpen(q, sAt(t)), lc = this.contacts.length ? this.contacts[this.contacts.length - 1] : null, due = SC && lc && lc.sc && lc.aimT > t + R ? lc.aimT : null;
    for (let pass = due != null ? 0 : 1; pass < 2 && !first && !alt; pass++)
    // (BALL-ON PACE V1: with the envelope the body is still gaining speed toward its ceiling — the stride timing drifts a little from the push's plan:
    // the due window is 0.15 s with an envelope, 0.06 s without)
    for (const e of ends) { if (e.tT < t + R - 1e-9 || e.tT < lastBy[e.F] + 0.2 || (skip && skip.has(e.F + e.tT.toFixed(4))) || (gKept && e.tT < gKept.t + 0.25) || (pass === 0 && e.tT < due - (this.P.ballEnv ? 0.15 : 0.06))) continue; const s = sAt(e.tT), th = s.psi, bp = ballAt(e.tT).p, rel = toLocal(bp, s.P, th), slow = s.s < 1.6;
      // (BALL-ON PACE V1, with the envelope: across to 0.34 m — the slower-braking ball-on body overtook a ball 0.24 – 0.34 m across)
      // (S99 MISSION, the 99 pace's RECOVERY: a ball just beside a body overtaking it is played by the foot that gets there — the inside of the
      // other foot slightly across the body (to 0.22 m) or a ball slightly behind the centre of mass (to 0.22 m): without it no pursuit could
      // touch it and control ended 0.3 s later with the ball 0.65 m away)
      const R99 = recover && this.P.pace && this.P.pace.accGait;
      const wide = slow || recover, okA = wide ? rel[0] >= (R99 ? -0.22 : CARRY.reach.slow.a[0]) && rel[0] <= CARRY.reach.slow.a[1] + (recover ? 0.12 : 0) : rel[0] >= CARRY.reach.a[0] && rel[0] <= CARRY.reach.a[1];
      const okL = wide ? abs(rel[1]) <= CARRY.reach.slow.l && rel[1] * sgn(e.F) >= (R99 ? (this.P.ballEnv ? -0.34 : -0.22) : -0.12) : rel[1] * sgn(e.F) >= CARRY.reach.l[0] && rel[1] * sgn(e.F) <= CARRY.reach.l[1];
      if (!okA || !okL) continue;
      // the lane foot (the ball's side) first; the other foot plays it (across, with the inside) when the lane foot's chance is > 0.35 s later
      const laneOk = wide || abs(rel[1]) <= 0.06 || sgn(e.F) === Math.sign(rel[1]); if (!first && laneOk) { first = { e, s, th, bp, rel }; break; }
      if (!alt) alt = { e, s, th, bp, rel }; }
    // (B2 prefFoot: when the touch must turn the ball, the other foot plays it whenever the lane foot's chance is > 0.10 s later — the preferred
    // foot stays the lane the ball is carried in, never a wait for it)
    let altGap = 0.35; if (this.L.prefFoot && q.h != null) { const bs = hyp(bv[0], bv[1]), s0 = sAt(t), ref = bs > 1.0 ? hdg(bv) : (s0.s > 1.0 ? s0.h : s0.psi); if (abs(wrap(q.h - ref)) > 12 * DEG) altGap = 0.10; }
    if (SC && first) altGap = Infinity;   // (SPRINT_CARRY: the lane foot plays its push — the other foot never intercepts it)
    if (alt && (!first || first.e.tT - alt.e.tT > altGap)) first = alt;
    // a committed touch (inside the reaction time) IS this plan's touch: it stays, re-aimed below for this path
    if (kept) { const s = sAt(kept.t); first = { e: { F: kept.F, tT: kept.t }, s, th: s.psi, bp: ballAt(kept.t).p, rel: toLocal(ballAt(kept.t).p, s.P, s.psi) }; }
    if (!first) { if (out.sepMax > 1.6) out.sepPen = 0.8 + 0.4 * (out.sepMax - 1.6); out.info = "the ball out of reach"; out.ok = q.h == null && out.sepMax < 0.8; return out; }
    out.ok = true; const { e, s } = first, F = e.F, pref = this.o.foot === "B" ? F : this.o.foot;
    // where the ball goes: STOP — to rest where the body stops; else ahead on the planned path, at the touching foot's next touch of the rhythm
    const scT = SC && q.h != null && (this.o.foot === "B" || F === pref) && s.s >= this.P.pace.sprintCarry.v; let aim, role = "carry", N = scT ? (SC === 2 ? this.P.pace.sprintCarry.N : 2) : CARRY.rhythm(mode, s.s);
    if (q.h == null) { const se = sAt(t + 1.4), stopAt = fromLocal(se.P, se.psi, 0.36, sgn(pref) * 0.08); aim = { kind: "rest", P: stopAt }; role = "stop"; }
    else { const laneFoot = this.o.foot === "B" ? F : pref, fe = ends.filter((x) => x.F === laneFoot && x.tT > e.tT + 0.15); let nx = fe[(laneFoot === F ? N : 1) - 1] || fe[fe.length - 1];
      if (!nx) { const Ts = this.gait(max(s.s, 1)).Ts; nx = { tT: e.tT + 2 * Ts * N }; }
      // (SPRINT_CARRY: the N-th swing end can lie past the planned stances — continued at their own stride period)
      if (scT && laneFoot === F && fe.length < N) { const per = fe.length >= 2 ? fe[1].tT - fe[0].tT : fe.length ? fe[0].tT - e.tT : 2 * this.gait(max(s.s, 1)).Ts; nx = { tT: (fe.length ? fe[fe.length - 1].tT : e.tT) + per * (N - fe.length) }; }
      const sN = sAt(nx.tT), thN = q.h != null ? q.h : (sN.s > 0.6 ? sN.h : sN.psi), laneF = laneFoot, lane = sgn(laneF) * CARRY.lane(mode);
      aim = { kind: "target", P: fromLocal(sN.P, thN, CARRY.ahead(sN.s), lane), T: nx.tT }; }
    // the touch: the ball arrives at e.tT; what the touch must do (its surface from the impulse it gives)
    const bArr = ballAt(e.tT), vIn = bArr.v; let vOut;
    if (aim.kind === "rest") { // the stop: under the sole when the body is slow; else a cushion that keeps the ball with the braking body
      const vb = s.s, inS0 = hyp(vIn[0], vIn[1]); if (vb < 2.4 || inS0 < 0.3) { vOut = [0, 0]; aim = { kind: "vel", speed: 0, h: s.psi }; }
      else { const sp = min(inS0, vb * 0.55), hh = inS0 > 0.3 ? hdg(vIn) : s.psi; vOut = [Math.cos(hh) * sp, Math.sin(hh) * sp]; aim = { kind: "vel", speed: sp, h: hh }; } }
    else { const d = [aim.P[0] - bArr.p[0], aim.P[1] - bArr.p[1]], D = hyp(d[0], d[1]), sp = min(CARRY.vCap, speedFor(D, max(0.1, aim.T - e.tT)) || CARRY.vCap); vOut = [d[0] / max(D, 1e-6) * sp, d[1] / max(D, 1e-6) * sp]; }
    // a touch that would change nothing is not made ("quick feet, not busy feet"): the ball reaches the aim on its own — the next swing end decides
    if (!kept && aim.kind === "target" && hyp(vOut[0] - vIn[0], vOut[1] - vIn[1]) < 0.35 && (!skip || skip.size < 4)) return this.carryTouches(plan, keep, q, recover, new Set([...(skip || []), e.F + e.tT.toFixed(4)]));
    // a running touch redirects the ball within CARRY.redirect° (beyond it: the ball keeps more of its line — the next touch / a technique finishes it)
    // (S99 MISSION, the 99 pace: a slow ball rolling BACK at the running body (> 100° off its travel, < 3 m/s) is not a running redirect — the
    // player meets it and pushes it on to its aim; capped at 48° it went off sideways at speed, out of every later reach (a 3 m loss))
    const inS = hyp(vIn[0], vIn[1]), against = this.P.pace && this.P.pace.accGait && inS < 3.0 && s.s > 1.6 && abs(wrap(hdg(vIn) - s.h)) > 100 * DEG;
    if (inS > 1.0 && s.s > 1.6 && !(recover && s.s < 3.0) && !against) { const dA = wrap(hdg(vOut) - hdg(vIn)); if (abs(dA) > CARRY.redirect * DEG) { const hh = hdg(vIn) + Math.sign(dA) * CARRY.redirect * DEG, sp = hyp(vOut[0], vOut[1]); vOut = [Math.cos(hh) * sp, Math.sin(hh) * sp]; aim = { kind: "vel", speed: sp, h: hh }; out.sepPen += 0.25; } }
    const surface = this.surfaceFor(F, vIn, vOut, s, role);
    // the touching foot lands right after its touch: its landing is placed off the path the touch gives the ball (planned before the touch,
    // it could stand where the redirected ball is about to roll — positions only, no decision reads them)
    if (e.st && e.st.t0 > t + R && e.st.src === "gait") { const L = e.st, psi = sAt(L.t0).psi, r = rgt(psi), sx = sgn(F); let need = 0, side = sx;
      for (let x = max(e.tT, L.t0 - 0.04); x <= min(L.t1, L.t0 + 0.3); x += 0.02) { const b = predict(bArr.p, vOut, x - e.tT).p, d = [b[0] - L.pos[0], b[1] - L.pos[1]], a = d[0] * Math.cos(psi) + d[1] * Math.sin(psi), l = d[0] * r[0] + d[1] * r[1];
        if (a > -0.22 && a < 0.30 && abs(l) < 0.20) { const nd = 0.20 - abs(l); if (nd > need) { need = nd; side = l >= 0 ? -1 : 1; } } }
      if (need > 0) { const k = min(0.20, need); L.pos = [L.pos[0] + r[0] * side * k, L.pos[1] + r[1] * side * k]; } }
    const c = { id: ++this.cid, t: Math.round(e.tT / DT) * DT, k: Math.round(e.tT / DT), F, surface, role: role === "stop" ? (hyp(vOut[0], vOut[1]) < 0.05 ? "stop (sole)" : "stop (cushion)") : this.carryRole(F, vIn, vOut, s), aim, src: "carry", tech: "CARRY", bPred: bArr.p, vInPred: vIn, vOutPred: vOut, sc: scT && aim.kind === "target" ? true : undefined };
    if (kept && abs(kept.t - c.t) < 0.03 && kept.F === c.F) { kept.aim = c.aim; out.list.push(kept); } else out.list.push(c);
    { const lim = q.h == null ? 1.2 : mode === "SPRINT" ? 3.0 : mode === "RUN" ? 2.0 : mode === "JOG" ? 1.5 : 1.0; let sa = 0; for (let x = 0; x <= 1.2; x += 0.1) { const T2 = c.t + x, s2 = sAt(T2), b2 = predict(bArr.p, vOut, x).p; sa = max(sa, hyp(b2[0] - s2.P[0], b2[1] - s2.P[1])); }
      out.sepMax = sa; out.sepPen = (out.sepPen || 0) + (sa > lim ? 0.6 * (sa - lim) : 0); if (q.h != null && hyp(vOut[0], vOut[1]) > 0.5 && abs(wrap(hdg(vOut) - q.h)) > 30 * DEG) out.sepPen += 0.4; }
    // when the ball, too, runs along the request: this touch if it sends it within 25° of it, else the next touch of the rhythm (a capped correction
    // needs a second one)
    if (q.h != null) { const sp = hyp(vOut[0], vOut[1]); out.tAligned = sp < 0.5 || abs(wrap(hdg(vOut) - q.h)) < 25 * DEG ? c.t : c.t + 2 * this.gait(max(s.s, 1)).Ts * N; }
    out.info = `${c.role} ${F} ${surface.toLowerCase()} in ${(c.t - t).toFixed(2)} s`;
    return out;
  }
  // (S99 MISSION — SPRINT_CARRY's open space: the 99 pace's sprintCarry, SPRINT asked along the travel (within ang°), the body at speed, the ball
  // running along the request, a steady stick (the decision's volatility), no opponent's challenge active or within 1 s — any of these ends it)
  // GRADED: 2 — the stick held within 4° for ≥ 0.8 s, the body ≥ 8.5 m/s, the request within 4° of the travel: the long push (N = 3);
  // 1 — steering a little (within ang°): the lane foot every other swing (N = 2); 0 — the ordinary carry (either foot, the 0.35 s rule)
  sprintOpen(q, s0) { const pc = this.P.pace && this.P.pace.sprintCarry; if (!pc || !q || q.mode !== "SPRINT" || q.h == null) { this.scHold = null; return 0; }
    const H = this.scHold; if (!H || abs(wrap(q.h - H.h)) > 4 * DEG || this.t < H.t0) this.scHold = { h: q.h, t0: this.t };
    if (s0.s < pc.v) return 0; const dev = abs(wrap(q.h - s0.h)); if (dev > pc.ang * DEG) return 0;
    const bv = this.ball.v; if (hyp(bv[0], bv[1]) > 1.0 && abs(wrap(hdg(bv) - q.h)) > 15 * DEG) return 0;
    if (this.volatility && this.volatility() > pc.vol) return 0;
    if (this.opp && this.opp.some((e) => !e.hit && this.t > e.t0 - 1.0 && this.t < e.t1 + 0.3)) return 0;
    return dev < 4 * DEG && s0.s >= pc.vLong && this.t - this.scHold.t0 >= pc.hold ? 2 : 1; }
  carryRole(F, vIn, vOut, s) { const a = abs(wrap(hdg(vOut) - (s.s > 0.6 ? s.h : s.psi))) / DEG; return a < 12 ? "carry" : a < 50 ? "carry correction" : "carry turn"; }
  // the contact surface from the impulse relative to the body and the touching foot (TECHNICAL-CONTROL-1.2: the laces / outer instep forward, the
  // inside across the body, the outside away from it, the sole to stop / pull back)
  surfaceFor(F, vIn, vOut, s, role) {
    const dv = [vOut[0] - vIn[0], vOut[1] - vIn[1]], m = hyp(dv[0], dv[1]), th = s.s > 0.6 ? s.h : s.psi; if (role === "stop") return hyp(vOut[0], vOut[1]) < 0.05 ? "SOLE" : "INSIDE";
    if (m < 0.4) return "LACES"; const a = wrap(hdg(dv) - th) / DEG, side = a * sgn(F);
    if (abs(a) > 125) return "SOLE"; if (abs(a) <= SURF_FWD) return "LACES"; if (side > 0) return "OUTSIDE"; return "INSIDE";
  }
  // when the body runs on the request's line: heading within 15°, speed ≥ min(2.5, 60 % of the mode's)
  lineTime(plan, q) { if (q.h == null) return null; const vMin = min(2.5, 0.6 * this.P.speed[q.mode]);
    for (let i = 0; i <= plan.n; i += 6) { const t = plan.t0 + i * DT, s = this.stateAt(t, plan); if (s.s >= vMin && abs(wrap(s.h - q.h)) < 15 * DEG) return t; } return null; }
  // ═══ A TECHNIQUE INSTANCE ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
  // id, mirror m (+1: the right foot strikes as authored, −1: the left), the request, the present, the commitments. Returns a full plan or null.
  instantiate(id, m, q, st, keep, o = {}) {
    const T = o.trim || (o.pinned && o.pinned.trim) ? TRIMMED[id] : TEMPLATES[id], t = this.t, P = this.P;
    if (this.o.attrs.dri < P.techMin[id] || q.h == null) return null;
    const F = m > 0 ? "R" : "L", S = other(F);
    // the entry: the travel heading now (the pinned instance keeps its own); the turn in the reference frame (Δr: + right for the right foot)
    const pin = o.pinned, h0 = pin ? pin.h0 : (st.s > 1.0 ? st.h : st.psi), turnW = wrap(q.h - h0);
    let dr = m * turnW / DEG; const free = !!T.free, refS = free ? 0 : T.turn * T.ref;
    // (a reversal can be done the long way round: a drag-back to the right for a request 170° to the left)
    if (!free && Math.sign(dr) !== T.turn && abs(dr) > 140) dr = dr + T.turn * 360;
    // (DRIBBLING VOCAB-1: a FREE technique's exit is the request itself — any side, 0° included, up to its hard limit)
    if (free ? abs(dr) > T.hard[1] : (Math.sign(dr) !== T.turn || abs(dr) < T.hard[0] || abs(dr) > T.hard[1])) return null;
    // (DRIBBLING VOCABULARY INTEGRATION: a template's validated ENTRY band — entryHard — gates only a new instance; once under way (pinned) it is
    // re-planned within its own hard range, so a stick that moves during the move never aborts it)
    if (!pin && T.entryHard && !free && (abs(dr) < T.entryHard[0] || abs(dr) > T.entryHard[1])) return null;
    // (… and, where a template asks it — carryFoot — its playing foot the carrying foot: the Body Feint's lie and set touch are the carrying
    // foot's; a right-footed carry asked to fake right → exit left played its left foot across the body — crossings, knee pops, 1200 °/s toe
    // turns, 9 cm-a-tick foot jumps in the sweep. A both-footed carry: the foot on the ball's side)
    if (!pin && T.carryFoot) { const cf = this.o.foot === "B" ? null : this.o.foot, rt = [-Math.sin(h0), Math.cos(h0)], lat = m * ((this.ball.p[0] - st.P[0]) * rt[0] + (this.ball.p[1] - st.P[1]) * rt[1]);
      if (cf && F !== cf) return this.rej(`the ball is on the ${cf === "R" ? "right" : "left"} foot`); if (lat < 0) return this.rej("the ball is on the other foot's side");
      // (… the previous touch the carrying foot's: V4 entered a stride after a left-foot carry touch (the carry after a feint's outside exit)
      // floated 0.25 s; every validated entry of both moves follows the carrying foot's own touch)
      const lastC = this.contacts.length ? this.contacts.filter((c) => !c.missed).pop() : null; if (cf && lastC && lastC.F !== cf) return this.rej("the last touch was the other foot's");
      // (… and — aheadMin — rolled out ahead of the body: a walk feint placed as a touch had just left the ball 0.37 m ahead floated; every
      // clean entry of the sweep had it ≥ 0.44 m ahead)
      if (T.aheadMin != null && (this.ball.p[0] - st.P[0]) * Math.cos(h0) + (this.ball.p[1] - st.P[1]) * Math.sin(h0) < T.aheadMin) return this.rej("the ball is not yet out ahead"); }
    // (… and — steady — a settled carry: the speed within dv of every 0.1 s over its settle time, the heading within dh° of 0.2 s ago. Entered
    // while the carry accelerated (a walk into a jog, a jog into a run) or braked, or while the body turned toward the stick, the feint's set
    // touch met another ball and another stride — 1500 °/s toe turns, crossings, a run's feint played by the jog's template as a pending
    // request slowed the body; a walk feint just after a jog (its braking sole touch) floated for ≈ 0.8 s after the speed had settled)
    if (!pin && T.steady && t > 0.2) { const K = T.steady, vT = this.P.speed[q.mode];
      // (the stick's speed too: a run asked to jog has not begun to brake when the request comes — its feint at 5.0 m/s popped a knee)
      if (vT != null && abs(vT - st.s) > 1.5 * K.dv) return this.rej(vT > st.s ? "the carry is about to accelerate" : "the carry is about to brake");
      for (let k = 0.1; k <= K.settle + 1e-9 && k <= t; k += 0.1) { const sb = this.stateAt(t - k);
        if (abs(st.s - sb.s) > K.dv) return this.rej(k > 0.25 ? "the carry is still settling into this speed" : st.s > sb.s ? "the carry is accelerating" : "the carry is braking"); }
      const sb = this.stateAt(t - 0.2), hb = sb.s > 1.0 ? sb.h : sb.psi; if (abs(wrap(h0 - hb)) / DEG > K.dh) return this.rej("the body is turning"); }
    const v0 = st.s; if (!pin && v0 < T.vRange[0] - 0.4) return null;
    // (DRIBBLING VOCABULARY INTEGRATION: … and its validated entry SPEED — entryV — for a new instance: LEG-WAVE V4 from a jog, not braked into
    // from a run (a 0.6 s setup) nor from a walk)
    if (!pin && T.entryV && (v0 < T.entryV[0] || v0 > T.entryV[1])) return this.rej(`entry ${v0.toFixed(1)} m/s outside its validated ${T.entryV[0]}–${T.entryV[1]} m/s`);
    // (BODY FEINT V2 — VIDEO-GUIDED: the walking feint opened at its false step only up to a 50° exit — beyond it the long walking stances crossed
    // the fake foot's exit stride over the exit foot (6 cm); the full entry takes the larger exits cleanly. tools: ABL=bfball)
    if (!pin && T.trimmed && id === "BFEINT_L" && !CC_ABL.bfball && abs(dr) > 50) return this.rej("a walking feint opened at its false step exits ≤ 50°");
    // (BODY FEINT V2: a feint is not begun inside the previous feint's authored exit — its stances to the exit foot's landing after the exit
    // touch: a feint chosen there set its ball with a swing through the planted exit leg (alternating feints, a 6 cm crossing))
    if (!pin && T.bodyFeint && !CC_ABL.bfseq && this.bfEnd != null && this.t < this.bfEnd - 1e-9) return this.rej("the previous feint's exit is still under way");   // (bfEnd: adopt(); control is back with the carry by then)
    const k = free ? 1 : dr / refS, rot = (dr - refS) * DEG;           // the post-contact scaling, the exit frame's rotation (reference frame)
    const hFr = free && T.com.hFrac ? new Curve(T.com.hFrac) : null, exitDeg = free ? dr : refS * k;   // (free: the share of the requested turn made by τ)
    // ── the anchor: the template's first stance (its foot, at tA) on the stride ─────────────────────────────────────────────────────────────
    const firstF = T.firstFoot === "F" ? F : S;
    if (!pin && !o.tA) { // every anchor the stride offers, earliest first: the first one that works
      // (B5 windups: a technique may be entered later — its decisive contact as close as CAPS.entryMin, the D99 ceiling — baseline commit + 0.04)
      const entryMin = this.L.windups ? CAPS.entryMin : P.commit + 0.04;
      for (const ta of this.anchorTimes(firstF, keep, st)) { const tc = ta - T.start; if (ta < t + P.react + 0.02 || tc < t + entryMin || tc > t + 1.25) continue;
        const r = this.instantiate(id, m, q, st, keep, Object.assign({}, o, { tA: ta })); if (r) { if (r.action.setTouch) { const r2 = this.instantiate(id, m, q, st, keep, Object.assign({}, o, { tA: ta, noSet: true })); if (r2) { r2.alt = r; return r2; } } return r; } }
      return null; }
    let tA, tC; if (pin) { tC = pin.tC; tA = tC + T.start; } else { tA = o.tA; tC = tA - T.start; }
    // ── THE SPEEDS: the approach v0 → vA at tA (constant until tb, then a ramp at Agility's braking / acceleration), the template's own pre-contact
    // braking re-mapped from vA down to the contact speed vC (inside Agility's braking), its post-contact speeds scaled by vC / its own ───────────
    const vRef0 = T.com.v[0][1], vRefC = new Curve(T.com.v).at(0), aB = brakeOf(T, P, v0), aU = P.aAcc;
    const vAfor = (tb) => (v0 >= vRef0 ? max(vRef0, v0 - aB * max(0, tA - tb)) : min(vRef0, v0 + aU * max(0, tA - tb)));
    const vCfor = (vA) => (vA <= vRef0 ? max(0.05, vRefC * vA / max(0.1, vRef0)) : min(vA, max(vRefC, vA - brakeOf(T, P, vA) * (tC - tA))));
    const tau = (x) => tC + x;
    // (BODY FEINT V2 — VIDEO-GUIDED: a larger exit takes longer to turn into — beyond 1.2 × the reference turn its post-touch heading / facing keys
    // are stretched in time by the extra turn (90°: × 1.35): turned at the 45° rate, the pelvis went 60° round a walking exit foot still planted
    // and the fake foot's exit stride crossed it (8 – 10 cm). tools: ABL=bfturn)
    const tauX = T.bodyFeint && k > 1.2 && !CC_ABL.bfturn ? (x) => (x > 0 ? tC + x * (1 + 0.35 * (k - 1)) : tau(x)) : tau;
    const hKeys = T.com.h.map(([x, d]) => [tauX(x), h0 + m * ((x >= 0 || T.com.scaleAll ? d * k : d) + (hFr ? hFr.at(x) * dr : 0)) * DEG]);
    if (hFr) for (const [x] of T.com.hFrac) if (!hKeys.some((q) => abs(q[0] - tau(x)) < 1e-6)) hKeys.push([tau(x), h0 + m * (new Curve(T.com.h).at(x) + hFr.at(x) * dr) * DEG]);
    hKeys.sort((a, b) => a[0] - b[0]);
    // (CRUYFF-CHOP-1: an elite template entered above its reference speed sheds speed after its contact no faster than the body can — ≤ 1.25 ×
    // Agility's braking, A99-C's own in its turns — instead of dropping to its reference's post-contact speeds × 1.45: the chop at a sprint fell
    // 7 → 3.3 m/s within 0.1 s; it now keeps speed through the turn as the body's own arc does)
    const aPost = P.aBrake * 1.25;
    const keysFor = (vA) => { const vC = vCfor(vA), sp = clamp(vC / max(0.05, vRefC), 0.5, 1.45), K = T.com.v.map(([x, v]) => [tau(x), x < 0 ? vC + (v - vRefC) * (vA - vC) / (abs(vRef0 - vRefC) > 1e-3 ? vRef0 - vRefC : 1) : T.credible && !CC_ABL.credible ? max(v * max(sp, 1), vC - aPost * x) : v * sp]);   // (… and its re-acceleration is never scaled below its own: the body's rate does not shrink with a slower entry)
      // (ADV-4: … and, for the four ADV-4 families (`d38`), never above the ball-carrying D38 curve from its lowest speed after the contact — the
      // approved Cruyff and chop are left as reviewed: capped, the Cruyff at a run would be 0.08 s slower — a finding for the owner)
      if (T.d38 && !CC_ABL.d38) { let iMin = -1, vMin = Infinity; K.forEach(([tt, vv], i) => { if (tt >= tC - 1e-9 && vv < vMin) { vMin = vv; iMin = i; } });
        if (iMin >= 0) { const tMin = K[iMin][0]; for (let i = iMin + 1; i < K.length; i++) K[i][1] = Math.min(K[i][1], d38From(vMin, K[i][0] - tMin)); } }
      return { vC, sp, K }; };
    const dispT = (K) => { const sc = new Curve(K), hc = new Curve(hKeys); let d = [0, 0]; for (let x = tA; x < tC - 1e-9; x += DT) { const s = sc.at(x), h = hc.at(x); d = [d[0] + s * Math.cos(h) * DT, d[1] + s * Math.sin(h) * DT]; } return toLocal(d, [0, 0], h0); };
    const pos = (x, tb, vA) => { if (x <= tb) return v0 * (x - t); const u = min(x, tA) - tb, vx = v0 + (vA - v0) * u / max(1e-6, tA - tb); return v0 * (tb - t) + u * (v0 + vx) / 2 + (x > tA ? vA * (x - tA) : 0); };
    // (DRIBBLING VOCAB-1, PHASE 1 — HARD BRAKE: a technique entered above its speed range (a reversal from a sprint) brakes FROM THE REQUEST,
    // at the braking limit — the body does not run on at full speed toward a late braking inside the technique's window; tb is pinned to now)
    const overSpeed = !pin && v0 > entryMax(T, P) + 0.5, tbLo = t, tbHi = overSpeed ? t : tA, Bref = [T.B[0], m * T.B[1]];
    let tb, vA, set = null, drift = 0;
    if (pin) { tb = max(t, pin.tb); vA = pin.vA; }
    // the ball: with a set touch (the striking foot's swing end before tA, the ball in its reach then — catch it at speed, set it, brake) or rolling
    // to the technique's point by itself (the braking start solved along the track; the lateral offset within tolerance: a small drift)
    const prevSet = pin ? this.plan.contacts.find((c) => c.role === "set touch" && !c.done && c.tech === id) : null;
    if (prevSet) set = { t: prevSet.t, td: pin.setTd, kept: true };
    // (DRIBBLING VOCABULARY INTEGRATION: a template may forbid the set-touch entry — rollOnly: LEG-WAVE V4 was approved from the ball the
    // carry rolls it; a set touch placing it at the template's nominal point gave another entry (a float, a 1050 °/s toe turn, the receiving
    // foot ahead of the ball in every such case of the sweep) — it is declined instead, the entry the earliest stride the rolling ball allows)
    else if ((!pin || pin.setTouch) && !o.noSet && !T.rollOnly) { const TsA = this.gait(max(v0, 0.5)).Ts, b0 = this.ball.p, bv = this.ball.v, R = P.react;
      const tds = []; for (let j = 0; j < 4; j++) tds.push((T.firstFoot === "F" ? tA : tA - TsA) - j * 2 * TsA);
      // (DRIBBLING VOCAB-1: never beyond a touch already committed — the set touch's ball is predicted rolling free; a carry touch committed
      // before it sends the ball elsewhere: an inside hook's left foot then reached 0.47 m across, behind the standing leg, for its set touch)
      const tK = SET_ABL ? Infinity : Math.min(Infinity, ...keep.contacts.filter((c) => !c.done && c.t > t - 1e-9 && c.role !== "set touch").map((c) => c.t));
      search: for (const td of tds.sort((x, y) => x - y)) { const tT = td - CARRY.touchBefore; if (tT < t + R || tT > tA - 0.02 || tT > tK + 0.02) continue;
        for (const tbx of overSpeed ? [tbLo] : [tA, max(tT, tbLo), (tbLo + tA) / 2, tbLo]) { const vAx = vAfor(tbx); if (T.vCmax != null && !CC_ABL.vcmax && vCfor(vAx) > T.vCmax + 1e-6) continue; const cp = fromLocal(st.P, h0, pos(tT, tbx, vAx), 0), bp = predict(b0, bv, tT - t).p, rel = toLocal(bp, cp, h0);
          if (rel[0] >= CARRY.reach.a[0] && rel[0] <= CARRY.reach.a[1] && rel[1] * sgn(F) >= CARRY.reach.l[0] && rel[1] * sgn(F) <= CARRY.reach.l[1]) { set = { t: Math.round(tT / DT) * DT, td }; tb = tbx; vA = vAx; break search; } } } }
    if (!set && !(pin && pin.setTouch)) { if (!pin) { // rolling there
        // (DRIBBLING VOCABULARY INTEGRATION: … except a template approved only from its set touch — setOnly, the Body Feint: entered with the ball
        // rolling to it, the walk's free foot jumped 6 – 9 cm a tick, a 1200 °/s toe turn; it waits for a stride with the set touch in reach)
        if (T.setOnly) return this.rej("no set touch in reach");
        const bp = predict(this.ball.p, this.ball.v, tC - t).p, rel = toLocal(bp, st.P, h0), f = (tbx) => { const vAx = vAfor(tbx), dT = dispT(keysFor(vAx).K); return pos(tA, tbx, vAx) + dT[0] - (rel[0] - Bref[0]); };
        // (BODY FEINT V2 — VIDEO-GUIDED: the feint opened at its false step takes the ball where its last carry touch rolls it (the reference: the
        // ball is not touched during the lie, the free foot collects it) — its point ahead within −0.14 … +0.10 m of the template's (the reference's free foot lands by a ball level with the pelvis … just ahead), the first
        // that the approach's braking can meet; the authored motion is unchanged, only which entries are feasible (tools: ABL=bfball))
        if (T.bodyFeint && T.trimmed && !CC_ABL.bfball) { const B0 = Bref[0]; for (const dB of [0, -0.05, 0.05, -0.10, 0.10, -0.14]) { Bref[0] = B0 + dB; const a = f(tbLo), b = f(tbHi); if (!(Math.sign(a) === Math.sign(b) && min(abs(a), abs(b)) > 0.05)) break; Bref[0] = B0; } }
        // (LA CROQUETA — HOP/SWEEP V2: likewise its ball-side foot meets the ball where the last carry touch rolls it — its point ahead within
        // ±0.10 m of the template's: at a jog the carry's ball runs 0.4 – 0.5 m ahead, and the fixed point left only entries a second away)
        if (T.croqHS) { const B0 = Bref[0]; for (const dB of [0, 0.05, -0.05, 0.10, -0.10]) { Bref[0] = B0 + dB; const a = f(tbLo), b = f(tbHi); if (!(Math.sign(a) === Math.sign(b) && min(abs(a), abs(b)) > 0.05)) break; Bref[0] = B0; } }
        const fLo = f(tbLo), fHi = f(tbHi);
        if (overSpeed ? abs(fLo) > 0.12 : Math.sign(fLo) === Math.sign(fHi) && min(abs(fLo), abs(fHi)) > 0.05) return this.rej("rolling there");
        let lo = tbLo, hi = tbHi; for (let i = 0; i < 18; i++) { const mid = (lo + hi) / 2; if (Math.sign(f(mid)) === Math.sign(fLo)) lo = mid; else hi = mid; } tb = (lo + hi) / 2; vA = vAfor(tb);
        const dT = dispT(keysFor(vA).K); let needL = rel[1] - dT[1] - Bref[1];
        // (LA CROQUETA — HOP/SWEEP V2: … and across, wherever the ball already is within 0.18 – 0.36 m to the ball-side foot's side — the leg goes
        // out to it; the body is not steered to fix the ball's line before an explosive move)
        if (T.croqHS && !CC_ABL.hsline) { const nat = m * (rel[1] - dT[1]), band = T.lineBand || [0.18, 0.36]; Bref[1] = m * clamp(nat, band[0], band[1]); needL = rel[1] - dT[1] - Bref[1]; }   // (X-SWEEP V3: the band per template — its ball-side leg further out)
        // (… and its point across within 0.08 m of the body's line … the template's: the ball on the exit side as far as it already is — never
        // a drift toward the exit to fetch it)
        if (T.bodyFeint && T.trimmed && !CC_ABL.bfball && needL * m < -0.08) { const want = m * T.B[1] + (needL * m + 0.08); if (want >= 0.08) { Bref[1] = m * want; needL = rel[1] - dT[1] - Bref[1]; } }
        if (abs(needL) > 0.16) return this.rej("drift");
        // (BODY FEINT V2: the approach never drifts toward the true exit before the lie — a 10° steer toward it was the tell of the false-step entry; toward the fake it is part of the load, up to 8 cm: the honest signal (the centre of mass) stays small)
        if (T.bodyFeint && !CC_ABL.bfdrift && (needL * m > 0.04 || needL * m < -0.08)) return this.rej(needL * m > 0 ? "the feint would drift toward its exit first" : "the feint would drift too far toward its fake"); drift = needL; } }
    if (tb == null) { tb = tA; vA = vAfor(tA); }
    if (vA < T.vFloor - 1e-6 && T.vFloor > 0) return this.rej("speed floor");
    const KS = keysFor(vA), sKeys = KS.K, sig = KS.sp, vC = KS.vC;
    // (CRUYFF-CHOP-1: a technique made near a stop (the Cruyff's drag behind the plant leg) is never entered at a speed its contact cannot be
    // made at — a faster entry brakes first: the earlier braking start, the preparation of a manual request (requestSkill))
    if (T.vCmax != null && !CC_ABL.vcmax && !pin && vC > T.vCmax + 1e-6) return this.rej("the contact would be too fast (brake first)");
    const speedFit = (abs(sig - 1) > 0.2 ? (abs(sig - 1) - 0.2) * 1.2 : 0) + (v0 > T.vRange[1] - 1.0 ? 0.15 : 0);
    // (a re-planned instance inside its window starts its keys from the present)
    if (pin && t > tA) { const cut = (K, v) => [[t, v]].concat(K.filter((x) => x[0] > t + 0.04)); const hNow = st.s > 0.3 ? h0 + wrap(st.h - h0) : hKeys.find((x) => x[0] >= t)?.[1] ?? h0;
      sKeys.splice(0, sKeys.length, ...cut(sKeys, st.s)); hKeys.splice(0, hKeys.length, ...cut(hKeys, hNow)); }
    const sC = new Curve(sKeys), hC = new Curve(hKeys);
    // ── the plan: the centre of mass (approach + keys + carry), the pelvis, the channels ───────────────────────────────────────────────────────
    let fKeys = T.face.map(([x, dd]) => [tauX(x), h0 + m * ((x > 0 ? dd * k : dd) + (hFr ? hFr.at(x) * dr : 0)) * DEG]); if (t > tA) fKeys = [[t, h0 + wrap(st.psi - h0)]].concat(fKeys.filter((x) => x[0] > t + 0.04));
    const prog = { kind: "tech", t0: t, tb: max(t, tb), tA, v0, vA, h0, drift: 0, tEnd: tau(T.end), sC, hC, fC: new Curve(fKeys) };
    if (drift) prog.drift = Math.atan2(drift, max(0.3, pos(tA, tb, vA)));
    // (BODY FEINT V2: the approach's lateral drift as a heading BUMP that is back on the entry line at the window's start (sin, its full lateral
    // need) — the ordinary ramp ends rotated by its angle and the keys snap it back at tA (a 10° heading / pelvis jump in one tick, ≈ 1250 °/s),
    // and reaches only half its need. FINDING: every template with a drift has that snap; only the feint's approach is changed here)
    if (drift && T.bodyFeint) { prog.drift = Math.atan2(drift * Math.PI / 2, max(0.3, pos(tA, tb, vA))); prog.bump = true; }
    // (LA CROQUETA — HOP/SWEEP V2: its short approach's drift likewise out and back (the heading back on the entry line at the template's first
    // key) — a straight drift left the root's heading 8.9° off at the load and it snapped back in one tick: a 1000°/s pelvis and shoulder spike)
    if (drift && T.croqHS && !CC_ABL.hsbump) { prog.drift = Math.atan2(drift * Math.PI / 2, max(0.3, pos(tA, tb, vA))); prog.bump = true; }
    if (T.croqHS && !CC_ABL.hsbump) prog.psiKeyed = true;   // (… and the pelvis keyed to that heading through the approach: lagging behind it, it snapped to the template's first facing key)
    if (T.bodyFeint) { prog.bf = true; prog.psiOff = wrap(st.psi - h0); }   // (… blended from the facing it had: keyed to the heading at once, the pelvis jumped by the carry's lead)   // (… and its pelvis keyed to the heading through the approach: a follower lagging 10° behind the bump met the keys' entry-line facing at tA — a 10° jump)
    // (LA CROQUETA — X-SWEEP V3: two more lateral channels a template may key — bend (the spine and the chest's side bend over the pelvis, deg,
    // + = toward F) and proll (the pelvis's roll, deg, + = F's hip up); zero for every other template: their poses unchanged)
    const chKeys = {}; for (const kk of ["lean", "side", "trunk", "crouch", "arms", "gait", "look", ...(T.bend ? ["bend"] : []), ...(T.proll ? ["proll"] : [])]) chKeys[kk] = T[kk].map(([x, val]) => [tau(x), (kk === "side" || kk === "trunk" || kk === "bend" || kk === "proll") ? m * val : val]);
    for (const kk of ["armSide", "armHold", "shDrop", "headYaw"]) if (T[kk]) chKeys[kk] = T[kk].map(([x, val]) => [tau(x), m * val]);   // (BODY FEINT V2: the signed channels mirror with the foot)
    // (BODY FEINT V2 — VIDEO-GUIDED: the authored arms — armE the exit side's, armF the fake side's, each [tau, abduction, flexion, elbow] — onto
    // the right / left arm by the mirror (m = +1: the exit to the right), their blend weight and the head's drop unsigned)
    if (T.armE && T.armF) { const sideE = m > 0 ? "R" : "L", sideF = m > 0 ? "L" : "R";
      for (const [arr, X] of [[T.armE, sideE], [T.armF, sideF]]) { chKeys["abd" + X] = arr.map((r) => [tau(r[0]), r[1]]); chKeys["flx" + X] = arr.map((r) => [tau(r[0]), r[2]]); chKeys["elb" + X] = arr.map((r) => [tau(r[0]), r[3]]); } }
    for (const kk of ["armW", "headDrop"]) if (T[kk]) chKeys[kk] = T[kk].map(([x, val]) => [tau(x), val]);
    const action = { kind: id, tech: id, label: T.label, id: pin ? pin.id : ++this.aid, m, F, S, h0, tC, tA, vA, vC, sig, turnDeg: dr, k, rot, tb, setTd: set ? set.td : null, tCommit: tC - (this.L.narrow ? finalApproach(T, P) : P.commit), tRelease: tau(this.L.exits ? max(0.06, CAPS.exitShare * exitRelease(T)) : max(0.12, ...T.stances.filter((x) => x.F === "S" && x.t0 <= 0.02).map((x) => x.t1))), setTouch: !!set, speedFit, exitH: q.h, trim: !!T.trimmed };
    const plan = this.mkPlan({ t0: t, st, stances: null, contacts: [], action, req: q, prog, chKeys });
    const O = this.stateAt(tC, plan).P, Bw = set ? fromLocal(O, h0, Bref[0], Bref[1]) : predict(this.ball.p, this.ball.v, tC - t).p;
    action.O = O; action.B = Bw;
    // (DRIBBLING VOCABULARY INTEGRATION: a template may require the ball where its approved motion meets it — entryBall { ahead, out }, from the
    // origin at its first contact, in its entry frame (out: toward the touching foot). LEG-WAVE V4 was approved meeting it 0.44 ahead, 0.28 out;
    // the sweep (tools/lib_croq_sweep.mjs) found its toe snaps with the ball ≥ 0.51 ahead, its receiving foot ahead of the ball with it 0.33
    // ahead, its fast forward swings with it ≤ 0.19 out: outside the window the entry is declined, never re-shaped)
    if (T.entryBall && !pin) { const dx = Bw[0] - O[0], dy = Bw[1] - O[1], ah = dx * Math.cos(h0) + dy * Math.sin(h0), out = m * (-dx * Math.sin(h0) + dy * Math.cos(h0)), E = T.entryBall;
      if (ah < E.ahead[0] || ah > E.ahead[1] || out < E.out[0] || out > E.out[1]) return this.rej(`the ball is not where it meets it (${ah.toFixed(2)} ahead, ${out.toFixed(2)} out)`); }
    // (LA CROQUETA — VIDEO-GUIDED: the set touch is the first foot's own last carry touch, the ball on its side — the reference's ball inside the
    // left foot. A ball still on the receiving foot's side (> 2 cm across the body's line) would be fetched across the body: the first foot's
    // way back to its set-up plant crossed the planted leg (8.8 cm at a jog). That entry is not this croqueta: a later one, or the generic transfer)
    if (T.croqVG && set && !set.kept) { const bp = predict(this.ball.p, this.ball.v, set.t - t).p, cp = this.stateAt(set.t, plan).P, latF = m * ((bp[0] - cp[0]) * -Math.sin(h0) + (bp[1] - cp[1]) * Math.cos(h0));
      if (latF < -0.02) return this.rej("croqueta: the ball on the receiving foot's side for its set touch"); }
    // a set touch sends the ball along the entry line to the technique's point — one that would throw it off that line (> 60°) is no set touch
    if (set && !set.kept) { const bp = predict(this.ball.p, this.ball.v, set.t - t).p, dev = abs(wrap(hdg([Bw[0] - bp[0], Bw[1] - bp[1]]) - h0)) / DEG;
      if (dev > 60 && hyp(Bw[0] - bp[0], Bw[1] - bp[1]) > 0.25) return this.rej("set off-line"); action.setPen = dev > 25 ? 0.5 * ((dev - 25) / 35) ** 2 : 0; }
    // the stances: the template's (world), the approach's steps fitted before them, the carry gait after
    const map = (p, w) => { const a = p[0], l = p[1] * 1; if (!w) return [a, m * l]; const c = Math.cos(rot * w), s2 = Math.sin(rot * w); return [a * c - l * s2, m * (a * s2 + l * c)]; };
    const built = [], anchors = T.stances.map((ts) => { const X = ts.F === "F" ? F : S, t0 = tau(ts.t0), t1 = tau(ts.t1); let pos = null;
      if (!ts.at) pos = null;   // (DRIBBLING VOCAB-1: a stance the gait places itself — the set step)
      // (LA CROQUETA — VIDEO-GUIDED: a stance placed ACROSS from an earlier one of the template's — the first foot's landing beside the
      // receiving foot still planted, under the moving body, whatever the pace: across (entry-heading frame) from that foot, p[1] + toward F;
      // along the entry from the body at ts.at.t, p[0])
      else if (ts.at.rel === "stance") { const o = built[ts.at.of], s0 = this.stateAt(tau(ts.at.t), plan);
        if (o && o.pos) { const l = (o.pos[0] - s0.P[0]) * -Math.sin(h0) + (o.pos[1] - s0.P[1]) * Math.cos(h0); pos = fromLocal(s0.P, h0, ts.at.p[0], l + m * ts.at.p[1]); } }
      else if (ts.at.rel === "com") { const s0 = this.stateAt(tau(ts.at.t), plan); pos = fromLocal(s0.P, h0, ts.at.p[0], m * ts.at.p[1]); }
      else if (ts.at.rel === "travel") { const s0 = this.stateAt(tau(ts.at.t), plan); pos = fromLocal(s0.P, s0.h, ts.at.p[0], m * ts.at.p[1]); }
      else if (ts.at.rel === "O") { const p = map(ts.at.p, ts.w || 0); pos = fromLocal(O, h0, p[0], p[1]); }
      else if (ts.at.rel === "B") { pos = fromLocal(Bw, h0, ts.at.p[0], m * ts.at.p[1]); }
      else if (ts.at.rel === "ballAt") { const bAt = this.ballAfterDecisive(Bw, h0, m, T, tC, tau(ts.at.t), k, sig, exitDeg); const exitH = h0 + m * exitDeg * DEG; pos = fromLocal(bAt, exitH, ts.at.exitAt[0], m * ts.at.exitAt[1]); }
      const yaw = !ts.at ? null : ts.yaw === "travel" ? this.stateAt(t0, plan).h + sgn(X) * 5 * DEG : h0 + m * (ts.yaw + (ts.w || ts.wYaw ? (dr - refS) * (ts.w || ts.wYaw) : 0)) * DEG;
      const pivot = ts.pivot ? ts.pivot.map(([x, dd]) => [tau(x), m * dd * k * DEG]) : null;
      const a = { id: ++this.sid, F: X, t0, t1, pos, yaw, kind: ts.kind, src: "tech", pivot, heel: ts.heel ? [tau(ts.heel[0]), ts.heel[1]] : null, swingIn: ts.swingIn ? this.mapSpec(ts.swingIn, { tC, h0, m, rot, O, B: Bw, k }) : null }; built.push(a); return a; });
    // (DRIBBLING VOCAB-1: the set touch's landing holds until the standing foot's own landing — 0.16 s left the body with no support for 0.2 s
    // before a shield roll / short Cruyff's standing foot came down (a float at walking pace) — leaving its own foot ≥ 0.16 s to swing on)
    if (set && set.td != null && set.td < tA - 0.05) { let t1 = set.td + 0.16; const sA = anchors.filter((a) => a.F === S && a.t0 > set.td).sort((a, b) => a.t0 - b.t0)[0];
      const fN = Math.min(...anchors.filter((a) => a.F === F && a.t0 > set.td).map((a) => a.t0), ...T.contacts.filter((c) => c.F === "F").map((c) => tau(c.tau)));
      if (sA && !SET_ABL) t1 = max(t1, min(sA.t0 + 0.03, fN - 0.16));
      anchors.push({ id: ++this.sid, F, t0: set.td, t1, pos: null, yaw: null, kind: "after the set touch", src: "tech" }); }
    plan.stances = this.gaitFrom(plan, keep, anchors, t + 1.5);
    // (SUPPORT: a technique whose own step the shared foot plan refused — a committed landing it cannot take within bounds — is not this plan)
    { const rf = anchors.find((a) => a.refused); if (rf) return this.rej(`support refused (${(rf.kind || "a step").split(" ·")[0].slice(0, 40)})`); }
    // (BODY FEINT V2: no flight the gait cannot have — the steps spread before its anchored false step left both feet off for 0.32 s at a jog
    // (alternating feints): the entry is the next stride then. The running gait's own flight is ≈ 0.1 – 0.2 s)
    if (T.bodyFeint && !CC_ABL.bfflight) { const iv = ["R", "L"].flatMap((X) => plan.stances[X].map((x) => [x.t0, x.t1])).filter((x) => x[1] > t && x[0] < tC + T.stances[T.stances.length - 1].t1).sort((a, b) => a[0] - b[0]); let reach = t, gap = 0;
      for (const [a, b] of iv) { if (a > reach) gap = max(gap, a - reach); reach = max(reach, b); } if (gap > (v0 < 3 ? 0.13 : 0.22)) return this.rej("the entry would leave the body in the air"); }
    // (B4: no magic foot — a set touch must be played by a foot in the air at the end of its swing (it lands 0.03 – 0.14 s after it) in the gait
    // actually planned; 88573ef0 assumes it, and its gait can move that landing: the foot would be drawn half a metre from the ball it plays)
    if (this.L.generic && set && !set.kept) { const SF = plan.stances[F], land = SF.find((x) => x.t0 > set.t - 1e-6); if (SF.some((x) => x.t0 <= set.t + 1e-6 && x.t1 >= set.t - 1e-6) || !land || land.t0 - set.t < 0.03 || land.t0 - set.t > 0.14) return this.rej("set touch: the foot not in the air at the end of its swing"); }
    // the contacts: the set touch, the decisive, the template's exit touch; then the carry picks the ball up
    const frame = { tC, h0, m, rot, O, B: Bw, k, F, S, exitH: h0 + m * exitDeg * DEG };
    // (CRUYFF-CHOP-1: the set touch that must SLOW the ball — a Cruyff / chop setting it behind a body overtaking it — is a sole stop; drawn with
    // the laces the boot reached in front of the ball pitched −86° to push it back, fighting its clearance tick to tick (12 – 14 cm jumps))
    let setSurf = "LACES"; if (set && PREP_TECH.has(id) && !CC_ABL.setsole) { const bS = predict(this.ball.p, this.ball.v, set.t - t), d = [Bw[0] - bS.p[0], Bw[1] - bS.p[1]], D = hyp(d[0], d[1]), sp = speedFor(D, max(0.1, tC - set.t)) || 0, vi = bS.v, din = hyp(vi[0], vi[1]);
      if (din > 0.5 && (d[0] * vi[0] + d[1] * vi[1]) / max(D, 1e-6) * sp < 0.55 * din * din) setSurf = "SOLE"; }
    const cs = []; if (set) cs.push({ id: ++this.cid, t: set.t, k: Math.round(set.t / DT), F, surface: setSurf, role: "set touch", aim: { kind: "target", P: Bw, T: tC }, src: "tech", tech: id, frame });
    for (const tc of T.contacts) { const X = tc.F === "F" ? F : S, tt = tau(tc.tau), launchDeg = tc.aim.launch === "exit" ? exitDeg + (tc.aim.off ? tc.aim.off * Math.sign(exitDeg) : 0) : tc.aim.launch * k, h = h0 + m * launchDeg * DEG;
      cs.push({ id: ++this.cid, t: Math.round(tt / DT) * DT, k: Math.round(tt / DT), F: X, surface: tc.surface, role: tc.role, decisive: !!tc.decisive, aim: { kind: "vel", speed: tc.aim.v * this.launchScale(T, sig), h }, src: "tech", tech: id, swing: this.mapSpec(tc.swing, frame), frame }); }
    // (B6 target: each of the technique's touches sized to arrive where the body plays the ball NEXT — its next contact's moment (the body then,
    // ahead on the exit line), or after its last one the preferred foot's next swing end on the request's line — the authored direction kept
    // within ±15°, the authored speed within 0.6 – 1.5 ×; the drag-back's sole pull keeps its authored launch (its next stance is placed on it))
    if (this.L.target) { const order = cs.slice().sort((a, b) => a.t - b.t); let bp = set ? Bw : predict(this.ball.p, this.ball.v, tC - t).p;
      for (let i = 0; i < order.length; i++) { const c = order[i]; if (c.role === "set touch") continue; if (c.aim.kind !== "vel" || (id === "DRAGBACK" && c.decisive)) { bp = null; continue; }
        const cb = c.decisive ? Bw : bp; if (!cb) continue; const nxt = order[i + 1], laneF = this.o.foot === "B" ? c.F : this.o.foot;
        let T2, P2; if (nxt) { T2 = nxt.t; const s2 = this.stateAt(T2, plan); P2 = fromLocal(s2.P, frame.exitH, 0.36, sgn(nxt.F) * 0.06); }
        else { const ls = plan.stances[laneF].find((x) => x.t0 - CARRY.touchBefore > c.t + 0.2); T2 = ls ? ls.t0 - CARRY.touchBefore : c.t + 0.5; const s2 = this.stateAt(T2, plan); P2 = fromLocal(s2.P, q.h, CARRY.ahead(s2.s), sgn(laneF) * CARRY.lane(q.mode)); }
        const d = [P2[0] - cb[0], P2[1] - cb[1]], D = hyp(d[0], d[1]); if (D < 0.05) continue; const h = c.aim.h + clamp(wrap(hdg(d) - c.aim.h), -15 * DEG, 15 * DEG), sp = clamp(speedFor(D, max(0.1, T2 - c.t)) || c.aim.speed * 1.5, 0.6 * c.aim.speed, 1.5 * c.aim.speed);
        c.aim = { kind: "vel", speed: sp, h, sized: true }; bp = predict(cb, [sp * Math.cos(h), sp * Math.sin(h)], (nxt ? nxt.t : c.t + 0.3) - c.t).p; } }
    plan.contacts = keep.contacts.concat(cs.filter((c) => c.t > t + 1e-9 && !keep.contacts.some((kc) => abs(kc.t - c.t) < 0.03)));
    // (the carry after the technique: its touches are planned when the re-plans reach that time)
    plan.nContacts = cs.length; plan.tLine = tC + T.tLine * (0.8 + 0.2 * abs(k)); plan.sepMax = 0.6;
    if (this.L.generic) { const ex = this.techExit(plan, q, T, frame); plan.sepMax = ex.sepMax; plan.sepPen = ex.sepPen; }
    { const xt = cs.filter((c) => !c.decisive && c.role !== "set touch").map((c) => c.t); action.exitT = xt.length ? Math.min(...xt) : null; action.setT = set ? set.t : null;
      // (DRIBBLING VOCAB-1: a technique whose first touch comes BEFORE its decisive one — the elastico's cue, the Matthews' nudge, a sole pull's
      // first contact — is committed from that touch: once the ball has been played in it, the move is the committed physical event)
      const pre = cs.filter((c) => !c.decisive && c.role !== "set touch" && c.t < tC - 1e-9).map((c) => c.t); if (pre.length) action.tCommit = Math.min(action.tCommit, Math.min(...pre) - 0.02); }
    // (DRIBBLING VOCABULARY INTEGRATION: … and — entryLead — its first touch no later than validated: LEG-WAVE V4 placed with its first touch a
    // stride later (≈ 0.67 s away) met a ball the carry had rolled on — its receiving foot drove forward at 8.5 – 9.7 m/s (V4: 7.1); the request
    // waits for the next tick's nearer entry instead)
    if (!pin && T.entryLead && cs.length) { const t1 = Math.min(...cs.map((c) => c.t)); if (t1 - t > T.entryLead) return this.rej("its first touch a stride later than validated"); }
    return plan;
  }
  // where the decisive contact's ball is at time x (its launch from B at tC: the template's aim)
  // (the technique's launches scale with its body speeds: σ, the reference's ball / body ratio kept — a reversal restarts the body from almost
  // nothing whatever the approach, so its launches barely scale)
  launchScale(T, sig) { return abs(T.turn * T.ref) >= 120 ? clamp(sig, 0.8, 1.1) : clamp(sig, 0.7, 1.5); }
  ballAfterDecisive(Bw, h0, m, T, tC, x, k, sig = 1, exitDeg = null) { const dc = T.contacts.find((c) => c.decisive), refS = T.turn * T.ref, h = h0 + m * (dc.aim.launch === "exit" ? (exitDeg != null ? exitDeg : refS * k) : dc.aim.launch * k) * DEG, v = dc.aim.v * this.launchScale(T, sig); return predict(Bw, [v * Math.cos(h), v * Math.sin(h)], max(0, x - tC)).p; }
  // a swing spec in the technique's frame (kept relative: the presentation resolves it on the posed body and the real ball)
  mapSpec(spec, frame) { return spec ? Object.assign({}, spec, { frame }) : null; }
  // the times the given foot can land its next stances (the template's first stance): the stride as it runs, ±25 % per step
  anchorTimes(X, keep, st) {
    const t = this.t, S = keep.stances, lastR = S.R[S.R.length - 1], lastL = S.L[S.L.length - 1], G = this.gait(max(st.s, 0.5)), Ts = G.Ts, out = [];
    // the foot to land next and when (committed landing, or its natural one)
    let tNext, Fnext; if (lastR.t0 > lastL.t0) { Fnext = "L"; tNext = max(lastR.t0 + Ts, lastL.t1 + 0.18, t + 0.03); } else { Fnext = "R"; tNext = max(lastL.t0 + Ts, lastR.t1 + 0.18, t + 0.03); }
    if (lastR.t1 === Infinity && lastL.t1 === Infinity) { tNext = t + 0.22; Fnext = X === "R" ? "L" : "R"; }
    // (B5 windups: the step into a technique may also be a QUICK one — 35 % of a stride sooner — the gait's spacing still applies)
    for (let i = 0; i < 6; i++) { const f = i % 2 === 0 ? Fnext : other(Fnext), tt = tNext + i * Ts; if (f === X) { out.push(tt); out.push(tt + 0.25 * Ts); out.push(tt - 0.2 * Ts); if (this.L.windups) out.push(tt - CAPS.quickStep * Ts); } }
    return out.filter((x) => x > t + 0.04).sort((a, b) => a - b);
  }
  // ── the HUD's summary of the present ─────────────────────────────────────────────────────────────────────────────────────────────────────
  hud() { const st = this.stateAt(this.t, this.plan), b = this.ball.p, bv = this.ball.v, a = this.plan.action; const last = this.contacts[this.contacts.length - 1];
    let cps = 0; for (let i = this.contacts.length - 1; i >= 0 && this.contacts[i].t > this.t - 3; i--) if (!this.contacts[i].missed) cps++;
    return { t: this.t, action: a.label, actionKind: a.kind, m: a.m || 0, foot: last ? last.F : "—", surface: last ? last.surface : "—", speed: st.s, ballSpeed: hyp(bv[0], bv[1]), reqH: this.req ? this.req.h : null, mode: this.req ? this.req.mode : "RUN", reqSpeed: this.req && this.req.h != null ? this.P.speed[this.req.mode] : 0,
      facing: st.psi, travel: st.h, turn: this.req && this.req.h != null ? wrap(this.req.h - (st.s > 1 ? st.h : st.psi)) : 0, sep: hyp(b[0] - st.P[0], b[1] - st.P[1]), cps: cps / 3, why: this.plan.why, provisional: this.P.provisional, phase: this.phaseOf(a) }; }
  phaseOf(a) { if (!a.tech) return a.label; const t = this.t; if (t < a.tA) return "ENTRY · approach"; if (t < a.tC - 0.01) return "ENTRY"; if (t < a.tC + 0.03) return "CONTACT"; if (t < a.tRelease) return "PROTECTION"; return "EXIT"; }
}
