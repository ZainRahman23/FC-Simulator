// ═══ technical_control1/tc_actions.js — TECHNICAL-CONTROL-1: the compact TECHNICAL VOCABULARY and its automatic selection ════════════════════════
// No skill-move input (owner §11): the movement intent is the input, the footballer chooses the footwork. Nine mechanically distinct actions —
// each solves a football problem (owner §14), none is chosen for being fancy:
//   CARRY        inside / outside / laces touch along the run — close (every step), one-footed (every other step) or a stride carry (open space)
//   OUT_TOUCH    the foot on the turn side redirects with its OUTSIDE — a small correction at speed, a cut away without breaking stride (15° – 70°)
//   IN_CUT       plant, the foot away from the turn cuts the ball across the body with its INSIDE — the sharp change of direction (30° – 115°)
//   STOP         the SOLE stops the ball as the body brakes — a stop
//   DRAG_BACK    the SOLE pulls the ball back while the body stops and turns; the other foot plays it out — a reversal (115° – 180°)
//   CRUYFF       the foot away from the turn plays the ball with its INSIDE behind the standing leg, the body pivots round — a reversal (105° – 180°)
//   DRAG_ACROSS  the SOLE rolls the ball across the front of the body to the other foot, which plays it on — the ball on the wrong side of the
//                stance for the turn, a tight lateral shift (35° – 95°)
//   DOUBLE       inside → inside / outside: one foot plays the ball laterally to the other, which plays it on at once — a quick lateral shift,
//                a tight left-right sequence (25° – 90°)
//   FEINT_EXIT   a body feint (the centre of mass dips the other way) then the outside of the foot on the turn side takes the ball away — only when
//                the space geometry calls for disguise (the contest proxy), never on its own (25° – 100°)
// SELECTION: for the intent's turn Δ (signed, + right), a small feasible set — family × the next swings (which foot plays it, and when) — scored:
//   fit (Δ inside the family's range), time to the first contact, the body's cost (Agility: the entry speed of the plant, braking feasibility —
//   a less agile body needs a later swing, never a ball into space), the reach of the ball at that contact, sophistication (each family's level,
//   affordable in proportion to Dribbling's smooth weight, plus a simplicity prior: elite dribbling is mostly simple), the style (preferred foot,
//   surfaces, technical / feint tendency), the contest proxy. Deterministic: fixed order, strict comparison; no randomness.
import { DEG, clamp, wrapA, tab } from "../receive11/rx_actions.js";
export const VOCAB = {
  CARRY:       { label: "carry touch", soph: 0.0, range: [0, 30], body: "RUN", first: { foot: "any", role: "carry" } },
  OUT_TOUCH:   { label: "outside touch / cut", soph: 0.1, range: [12, 70], body: "PLANT_SOFT", first: { foot: "turn", role: "out", surfaces: ["OUTSIDE", "LACES"] } },
  IN_CUT:      { label: "inside cut", soph: 0.15, range: [30, 115], body: "PLANT", first: { foot: "away", role: "cut", surfaces: ["INSIDE"] } },
  STOP:        { label: "sole stop", soph: 0.15, range: [0, 180], stop: true, body: "STOP", first: { foot: "any", role: "sole", surfaces: ["SOLE", "INSIDE"] } },
  DRAG_BACK:   { label: "sole drag-back", soph: 0.45, range: [115, 180], body: "STOP", first: { foot: "any", role: "drag", surfaces: ["SOLE"] }, second: { foot: "other", role: "push", gap: "sameFoot" } },
  CRUYFF:      { label: "Cruyff-like turn", soph: 0.55, range: [105, 180], body: "PIVOT", first: { foot: "away", role: "behind", surfaces: ["INSIDE"] } },
  DRAG_ACROSS: { label: "drag across the body", soph: 0.5, range: [35, 95], body: "PLANT_SOFT", first: { foot: "turn", role: "across", surfaces: ["SOLE", "INSIDE"] }, second: { foot: "other", role: "push", gap: "cluster" } },
  DOUBLE:      { label: "double touch (inside → inside / outside)", soph: 0.55, range: [25, 90], body: "PLANT_SOFT", first: { foot: "away", role: "lateral", surfaces: ["INSIDE"] }, second: { foot: "other", role: "push", gap: "cluster" } },
  FEINT_EXIT:  { label: "body feint + outside exit", soph: 0.65, range: [25, 100], body: "FEINT", contest: true, first: { foot: "turn", role: "out", surfaces: ["OUTSIDE", "INSIDE"] } },
};
export const FAMILY_ORDER = ["CARRY", "OUT_TOUCH", "IN_CUT", "STOP", "DRAG_BACK", "CRUYFF", "DRAG_ACROSS", "DOUBLE", "FEINT_EXIT"];
// the ball's place at each role's contact, body-local [ahead, lateral] for the contact foot's side (s = +1 right foot, −1 left foot)
export const ROLE_AT = { carry: null, out: [0.32, 0.17], cut: [0.30, 0.10], sole: [0.24, 0.06], drag: [0.24, 0.06], behind: [0.10, 0.02], across: [0.26, 0.06], lateral: [0.30, 0.10], push: [0.34, 0.10] };
export const SEL = { wFit: 0.6, wTime: 1.3, wSpeedLoss: 0.9, wReach: 2.0, wSoph: 3.0, wSimple: 2.0, wTech: 1.6, wFoot: 0.9, wSurface: 0.25, wFeint: 2.4, wContest: 0.6, wrongSide: 0.5, natural: 0.25, maxSwings: 5 };
// which foot a family's contact uses for a turn to side `sg` (+1 right): "turn" = the foot on the turn side, "away" = the other, "any" = either
export function footFor(rule, sg) { return rule === "turn" ? (sg > 0 ? "R" : "L") : rule === "away" ? (sg > 0 ? "L" : "R") : null; }
// the entry speed and program of a family's body (Agility: TURN-1's angle–speed law × entryK)
export function bodyFor(fam, absDeg, v, ag, entrySpeed) {
  const f = VOCAB[fam], eS = entrySpeed(absDeg, ag);
  if (f.body === "RUN") return { kind: "RUN" };
  if (f.body === "PLANT_SOFT") return absDeg <= 40 ? { kind: "RUN" } : { kind: "PLANT", vEntry: Math.min(v, eS * 1.15), vOut: Math.min(v, eS * 1.05) };
  if (f.body === "PLANT") return { kind: "PLANT", vEntry: Math.min(v, eS), vOut: Math.min(v, eS * 0.95) };
  if (f.body === "FEINT") return { kind: "PLANT", vEntry: Math.min(v, eS * 1.05), vOut: Math.min(v, eS), dip: true };
  if (f.body === "PIVOT") return { kind: "STOP", vEntry: Math.min(v, 1.6), vOut: 1.6 };
  return { kind: "STOP", vEntry: Math.min(v, 0.7), vOut: f.stop ? 0 : 1.4 };
}
