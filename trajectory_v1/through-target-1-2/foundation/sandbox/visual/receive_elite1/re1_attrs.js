// ═══ receive_elite1/re1_attrs.js — RECEIVE-ELITE-1: the three technical attributes and what each one owns ════════════════════════════════════════
// Owner (19 Oct): build the 99 / 99 / 99 reference first, then work backward — each attribute separately, never one "technical quality" scalar.
//   BALL CONTROL → the precision of each ball contact: how closely the actual launch matches the intended touch. Unchanged model: RECEIVE-KILL-1.2 B's
//                  curve (rk_model relErr) times the bounded keyed draws of RECEIVE-TURN-1 (seed | RECEIVE | receiver | R<event> | c<contact> |
//                  receive-control-v2 | dimension). Nothing here reads it.
//   DRIBBLING    → the speed / frequency of the technical foot actions: the shortest interval between two contacts of the sequence (alternating
//                  feet; the same foot needs its own swing cycle), how far off its plan a foot can still play the ball (repositioning), how soon
//                  after a touch the player has adapted to what it actually did.
//   AGILITY      → the body's reorientation: braking into the plant, the redirection of the centre of mass after the contact, the yaw rate of the
//                  hips, a standing pivot's set-up and rate, the acceleration out, the support-step period through the turn, how quickly the
//                  run can be corrected toward the real ball.
// Every value is an anchor table over the rating (piecewise linear between the anchors). The 99 column is the ELITE REFERENCE (tuned first, by
// eye); the 50 column is a professional who still performs every receive and turn — slower feet, a slower body (owner §27: never absurd).
// The previous generic receiver (RECEIVE-CONTROL-1.1 / RECEIVE-TURN-1, no attributes) sits between 70 and 80 on most rows (noted per row).
import { tab } from "../receive11/rx_actions.js";
export const ATTR = {
  version: "RECEIVE-ELITE-1",
  dri: {
    cadence:  [[50, 0.34], [70, 0.27], [90, 0.19], [99, 0.15]],   // s: shortest interval between two sequence contacts, alternating feet
    sameFoot: [[50, 0.46], [70, 0.38], [90, 0.30], [99, 0.26]],   // s: … with the same foot twice (its own swing cycle)
    reach:    [[50, 0.13], [70, 0.17], [90, 0.21], [99, 0.24]],   // m: how far from its planned contact point a foot still plays the ball
    react:    [[50, 0.17], [70, 0.14], [90, 0.11], [99, 0.10]],   // s: after a touch, until the player plays to what it actually did
    spacing:  [[50, 1.30], [70, 1.15], [90, 1.04], [99, 1.00]],   // × the contact point's distance ahead of the body (slower feet keep the ball a touch further)
  },
  agi: {
    aBrake:   [[50, 7.5], [70, 9.0], [90, 11.0], [99, 12.5]],     // m/s²: peak braking of the preparation into the plant (generic 9.5)
    aTurn:    [[50, 6.5], [70, 8.0], [90, 10.0], [99, 11.5]],     // m/s²: mean redirection of the body's velocity after the contact (generic 9.0)
    omega:    [[50, 480], [70, 600], [90, 800], [99, 900]],       // °/s: peak hip rotation (generic 620)
    entryK:   [[50, 0.85], [70, 0.95], [90, 1.12], [99, 1.20]],   // × TURN-1's angle–speed law (the speed a plant at that turn is entered at)
    pivotBase:[[50, 0.14], [70, 0.11], [90, 0.07], [99, 0.05]],   // s: a standing pivot's set-up (generic 0.10)
    pivotOmega:[[50, 420], [70, 520], [90, 720], [99, 820]],      // °/s: a standing pivot's mean rate (generic 520)
    accel:    [[50, 4.2], [70, 4.8], [90, 5.8], [99, 6.4]],       // m/s²: acceleration out of the turn (generic 5.0)
    goShare:  [[50, 0.62], [70, 0.55], [90, 0.46], [99, 0.42]],   // the run out starts when this share of a standing pivot is done (generic 0.55)
    stepT:    [[50, 0.27], [70, 0.24], [90, 0.20], [99, 0.18]],   // s: the support-step period through the turn
    vAdj:     [[50, 2.2], [70, 2.8], [90, 3.3], [99, 3.6]],       // m/s: correction of the run toward the real ball (generic 3.2)
  },
};
export function eliteParams(r) {
  const dri = r && r.dri != null ? r.dri : 99, agi = r && r.agi != null ? r.agi : 99, o = { ratings: { bc: r && r.bc != null ? r.bc : 99, dri, agi }, dri: {}, agi: {} };
  for (const [k, T] of Object.entries(ATTR.dri)) o.dri[k] = tab(T, dri);
  for (const [k, T] of Object.entries(ATTR.agi)) o.agi[k] = tab(T, agi);
  return o;
}
