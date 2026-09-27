// SLIDE CONTACT GEOMETRY V1.2 — counterfactual search grid (simulation only): the side-on chase at lateral offset L (both sides) and slide
// direction a (deg, toward the carrier's line), requested when the ball is d m away. Used to find pairs where the V1 near-leg geometry and the
// V1.2 far-leg sweep reach the SAME authoritative outcome, so their geometry can be compared at equal outcome.
const base = require("./of_slide_scenarios.js");
const SCEN = {};
for (const L of [0.45, 0.6, 0.75, 0.9]) for (const a of [0, 5, 10, 15, 20]) for (const sg of [1, -1]) {
  const dir = -sg * a * Math.PI / 180, S = JSON.parse(JSON.stringify(base.SCEN.sw_right)); S.drill.players[1].y = 34 + sg * L; S.cmds = [{ at: 5, do: "slideWhen", d: 1.9, dir }]; S.ticks = 150;
  SCEN[`cf_${sg > 0 ? "R" : "L"}_${Math.round(L * 100)}_${a}`] = S; }
module.exports = { SCEN, keysAt: base.keysAt };
