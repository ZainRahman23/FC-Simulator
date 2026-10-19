// ═══ technical_control1/tc_attrs.js — TECHNICAL-CONTROL-1: the three attributes (capability) and the dribbling STYLE (tendency) ═══════════════════
// ATTRIBUTES — how well the player can execute (owner, 19 Oct: the three principles approved):
//   Ball Control → the precision of each ball contact (RECEIVE-KILL-1.2 B's curve × RECEIVE-TURN-1's bounded keyed draws — unchanged, read nowhere else)
//   Dribbling    → the speed, coordination and sophistication of technical foot actions (cadence, a foot's reach off its plan, reaction, contact clusters,
//                  and — smoothly weighted, never unlocked in bands — how readily a sophisticated technique is chosen when it is the useful one)
//   Agility      → the body's reorientation (braking, redirection, hip yaw rate, pivot, acceleration, support-step period, run correction)
// RECEIVE-ELITE-1's anchors are kept for the receive (its 99 reference was approved); Dribbling gains the cluster interval and the sophistication
// weight, Agility the curve (lateral acceleration) of a run that bends without a plant.
// STYLE — how the player tends to execute: it weights action / foot / surface choices and the touch rhythm WITHIN what the attributes allow; it
// never changes an attribute, a limit or an execution draw (owner §22, §39: style ≠ attribute modifier).
import { tab } from "../receive11/rx_actions.js";
import { ATTR as ATTR_E } from "../receive_elite1/re1_attrs.js";
export const ATTR = {
  version: "TECHNICAL-CONTROL-1",
  dri: Object.assign({}, ATTR_E.dri, {
    cluster: [[1, 0.36], [50, 0.26], [70, 0.21], [90, 0.16], [99, 0.13]],     // s: the two contacts of one technical action (inside → outside, drag → push)
    soph: [[1, 0.0], [40, 0.05], [60, 0.25], [75, 0.5], [90, 0.8], [99, 1.0]],  // how readily a sophisticated technique is chosen when it is the useful one
    cadence: [[1, 0.46], [50, 0.34], [70, 0.27], [90, 0.19], [99, 0.15]], sameFoot: [[1, 0.56], [50, 0.46], [70, 0.38], [90, 0.30], [99, 0.26]],
    reach: [[1, 0.10], [50, 0.13], [70, 0.17], [90, 0.21], [99, 0.24]], react: [[1, 0.21], [50, 0.17], [70, 0.14], [90, 0.11], [99, 0.10]], spacing: [[1, 1.45], [50, 1.30], [70, 1.15], [90, 1.04], [99, 1.00]],
  }),
  agi: Object.assign({}, ATTR_E.agi, {
    aLat: [[1, 5.0], [50, 6.5], [70, 7.5], [90, 9.0], [99, 10.0]],            // m/s²: a bending run's lateral acceleration (no plant)
    aBrake: [[1, 6.0], [50, 7.5], [70, 9.0], [90, 11.0], [99, 12.5]], aTurn: [[1, 5.5], [50, 6.5], [70, 8.0], [90, 10.0], [99, 11.5]], omega: [[1, 380], [50, 480], [70, 600], [90, 800], [99, 900]],
    entryK: [[1, 0.75], [50, 0.85], [70, 0.95], [90, 1.12], [99, 1.20]], pivotBase: [[1, 0.17], [50, 0.14], [70, 0.11], [90, 0.07], [99, 0.05]], pivotOmega: [[1, 340], [50, 420], [70, 520], [90, 720], [99, 820]],
    accel: [[1, 3.6], [50, 4.2], [70, 4.8], [90, 5.8], [99, 6.4]], goShare: [[1, 0.68], [50, 0.62], [70, 0.55], [90, 0.46], [99, 0.42]], stepT: [[1, 0.30], [50, 0.27], [70, 0.24], [90, 0.20], [99, 0.18]], vAdj: [[1, 1.8], [50, 2.2], [70, 2.8], [90, 3.3], [99, 3.6]],
  }),
};
export function techParams(r) {
  const o = { ratings: { bc: r && r.bc != null ? r.bc : 99, dri: r && r.dri != null ? r.dri : 99, agi: r && r.agi != null ? r.agi : 99 }, dri: {}, agi: {} };
  for (const [k, T] of Object.entries(ATTR.dri)) o.dri[k] = tab(T, o.ratings.dri);
  for (const [k, T] of Object.entries(ATTR.agi)) o.agi[k] = tab(T, o.ratings.agi);
  return o;
}
// ── THE STYLE PROFILE (6 dimensions, each 0 … 1; 0.5 neutral) ────────────────────────────────────────────────────────────────────────────────────
//   foot      preferred-foot touch bias — how strongly a touch returns to the preferred foot when geometry allows (0 two-footed … 1 dominant)
//   surface   { inside, outside, sole } — relative preference among the surfaces that can play a touch
//   rhythm    touch frequency: 0 = stride touches (carry the ball further, touch less), 1 = touch at almost every step (close control)
//   technical how readily a technical action (drag, Cruyff, double touch …) is taken when it is functional — × Dribbling's sophistication
//   feint     how readily a disguise (body feint, step-over exit) is used when the space geometry calls for one — × Dribbling's sophistication
//   direct    directness: the straightest, quickest progression; larger touches into space; fewer adjustment touches
export const STYLES = {
  NEUTRAL:       { label: "neutral", foot: 0.5, surface: { inside: 1.0, outside: 1.0, sole: 1.0 }, rhythm: 0.5, technical: 0.5, feint: 0.3, direct: 0.5 },
  DOMINANT_FOOT: { label: "dominant-foot carrier", foot: 0.92, surface: { inside: 1.0, outside: 1.25, sole: 0.8 }, rhythm: 0.55, technical: 0.4, feint: 0.25, direct: 0.6 },
  TWO_FOOT:      { label: "two-foot technician", foot: 0.08, surface: { inside: 1.15, outside: 0.95, sole: 1.0 }, rhythm: 0.7, technical: 0.55, feint: 0.25, direct: 0.5 },
  DIRECT_RUNNER: { label: "direct runner", foot: 0.55, surface: { inside: 0.9, outside: 1.15, sole: 0.6 }, rhythm: 0.15, technical: 0.15, feint: 0.1, direct: 0.95 },
  CLOSE_CONTROL: { label: "close-control technician", foot: 0.4, surface: { inside: 1.0, outside: 1.2, sole: 1.7 }, rhythm: 0.95, technical: 0.85, feint: 0.25, direct: 0.3 },
  FEINT_HEAVY:   { label: "feint-heavy dribbler", foot: 0.6, surface: { inside: 1.0, outside: 1.1, sole: 1.0 }, rhythm: 0.6, technical: 0.65, feint: 0.95, direct: 0.4 },
};
export const styleOf = (s) => (typeof s === "string" ? STYLES[s] || STYLES.NEUTRAL : s || STYLES.NEUTRAL);
