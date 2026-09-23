# Future outfield action-description / animation-resolver contract (2026-09-23)

Long-term chain: authoritative simulation → action / context description → animation resolver / graph → authored base motion →
procedural adjustment / IK → shared skeletal architecture → player morphology → skinned character → fixed Touchline camera / Mixed.

The animation layer never chooses a football outcome. It receives facts the simulation already produces (or produces in the goalkeeper
system today) and turns them into a pose. What follows is the minimum reusable description, modelled on the goalkeeper's
`gkActionDescription` (`gk_backend.js`) and on what `match.js` already holds for a field player (`t.p`, `t.kick`, `t.b`, `t.touch*`).

## Per tick (always)
```
{ now, tick,                                  // fixed 60 Hz simulation time
  root: [x, y], vel: [vx, vy], facing,         // authoritative root, velocity and facing (presentation root may differ only by explained offsets)
  speed, accel,                                // |vel| and its rate (locomotion family selection, stride / cadence)
  ball: { x, y, z, vx, vy, vz, held, ctrl },   // the authoritative ball (never written by animation; never parented)
  ctrlSince, touchT,                            // possession context (carry vs free)
  action: null | ActionDescription }
```

## ActionDescription (only when the simulation has committed to an action)
```
{ family,          // LOCOMOTION | TURN | RECEIVE | DRIBBLE_TOUCH | PASS | SHOT | CROSS | CLEARANCE | FIRST_TIME | VOLLEY | HEADER | TACKLE | SHIELD | CONTEST | FALL | RECOVER
  foot,            // "L" | "R" (acting foot / lead foot) — from the simulation's foot selection (ptSelectFoot / pfoot), never chosen by animation
  t0, tContact,    // commit time and the AUTHORITATIVE contact tick (e.g. t.kick.kickAt); presentation aligns its contact pose to it
  tEnd,            // when the simulation considers the action finished (follow-through budget)
  targetDir,       // the authoritative direction of the outgoing ball / movement (facing target for turns)
  contactPoint,    // where the simulation says the contact happens (ball position at tContact) — the presentation reaches it, it does not move it
  power,           // normalised charge / speed class (from KICK_CHARGE / ptFam) for the wind-up amplitude
  technique,       // LACES | INSIDE | OUTSIDE | CHIP | HEADER | … (the simulation's own technique id)
  outcome,         // authoritative result once known (contact | miss | won | lost) — used only AFTER the fact to select the follow-through
  rootTrajectory,  // optional: the simulation's planned root path (start → end) for actions that displace the player (tackle lunge, fall)
  contest }        // optional: the opponent's root / facing for shielding / physical contests (presentation only orients the body)
```
Rules: `foot`, `tContact`, `contactPoint`, `targetDir`, `outcome` are read-only inputs; the resolver may only decide WHICH authored
motion explains them and HOW the procedural layer reaches the contact point (bounded, like the goalkeeper's glove IK: never a root
launch, never a hidden reach multiplier — the residual is exposed when the body cannot reach). Left-foot actions are mirrors of the
authored right-foot motion (the goalkeeper convention).

## What already exists in the simulation today (`match.js`)
- root / velocity / facing / touch state for the field player (`t.p`), the ball (`t.b`), possession (`b.ctrl`, `ctrlSince`, `exclT`);
- kicks: `t.kick = { t0, kickAt (authoritative contact), end, fam, tech, foot, v0, vz, dir, charge, tgtD }` — enough for PASS / SHOT / CROSS / CLEARANCE / CHIP descriptions;
- dribble touches (`t.touchN`, `dribT`), the carry corridor (`t.corr`), the locomotion limiter (acceleration / brake / lateral);
- the goalkeeper's contact resolver as the template for aligning a presentation contact to an authoritative tick.

## What does not exist yet (do NOT invent in the animation layer)
- receiving / first-touch as a simulation event, headers, tackles, shielding, physical contests, falls and their outcomes;
- an authoritative root trajectory for displacing actions;
- foot selection for non-kick actions.
Until the simulation produces these, the resolver only handles LOCOMOTION / TURN / the kick families; everything else stays undescribed.

## What remains before production locomotion / dribbling / kicking animation work
1. Author the outfield locomotion cycles (walk, jog, run, sprint, side-shuffle, back-pedal, stop, turns) with feet on the ground at the
   plant phase, on the reference body; verify them on the six generic bodies with `of_validate.js` (slide / float / penetration / jumps).
2. Add the toe-pivot plant rule and 3-ring joint weighting (or DQ skinning) to the shared skin builder.
3. Define the kick family motions on the outfield rig from the existing charge / launch data (`ptKick` → `t.kick`), reusing the
   goalkeeper's contact-alignment pattern (authoritative contact tick, laces / instep contact point, bounded reach).
4. Wire `ActionDescription` into a resolver that selects motions deterministically (no RNG) from the simulation's own ids.
5. Production renderer per §10 of the performance report (shared program, merged draws, one skinned buffer per body, shared atlases).
