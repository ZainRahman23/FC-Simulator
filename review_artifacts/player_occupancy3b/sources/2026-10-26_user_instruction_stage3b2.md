Owner instruction, received 25 Oct 2026 ~22:45 UTC (00:45 EET 26 Oct; chronicle day 25 Oct), verbatim:

---

Approve **F+M as the calibrated Stage 3B.1 foundation**.

Freeze the 3B.1 contact/momentum formulation for this next stage. Do not retune it unless you discover a demonstrable invariant or accounting failure.

Proceed to **Stage 3B.2: recovery-step and landing geometry**.

The purpose of 3B.2 is NOT to add falls yet. It is to make a player who remains recoverable after contact place their feet physically and anatomically correctly around the opponent.

## Primary problems to solve

The current evidence identifies these related failures:

- legs landing into one another, with deepest overlap still about **22.4 cm**;
- recovery steps can target space occupied by the opponent;
- crossed legs increase during collision responses;
- boot-on-boot contact is unresolved;
- a planted foot can slide substantially when Stage 3 moves the body;
- feet/legs approaching a landing are not handled robustly;
- recovery responses can create visually implausible leg trajectories even when the momentum calculation is correct.

Treat these as one **foot-placement / landing-availability problem**.

Do not solve them by moving planted feet arbitrarily.

## Architectural rule

Keep:

**Stage 2 occupancy → frozen 3B.1 limb/contact physics → Stage 3 balance classification → 3B.2 feasible recovery placement**

3B.2 decides whether and where a recovery foot can land.

It must not rewrite the collision impulse that caused the recovery.

## Use the useful Astra concepts as reference, not as code to transplant

From the Astra audit, preserve the principles that proved useful:

- forecast the player's root/body motion;
- evaluate several possible landing positions rather than one fixed target;
- reject landings intersecting the opponent's predicted legs;
- maintain persistent foot identity;
- keep the landing on the player's anatomically correct side where possible;
- never cross the player's own legs simply to satisfy a target;
- respect leg reach;
- allow late landing retiming when a previously valid target becomes obstructed;
- release/cancel an impossible plant rather than leaving a hovering foot;
- a planted leg is not teleported;
- a blocked swing can yield around an obstacle rather than passing through it.

Do **not** import Astra's A99 gait timeline or replace the canonical locomotion system.

## 1. Build a landing-feasibility model

Before a recovery foot commits to the ground, generate and evaluate candidate landing positions.

Each candidate must be checked against:

- player's own support leg;
- opponent left thigh/shin/foot;
- opponent right thigh/shin/foot;
- predicted opponent leg positions over the landing interval;
- anatomical leg reach;
- hip range;
- knee range;
- ankle/foot orientation;
- correct side of the body;
- minimum foot clearance;
- ground plane;
- player's projected COM/capture requirement.

The chosen landing should be the nearest physically feasible solution that still performs the recovery job.

Do not choose a dramatically different step merely because it has more clearance.

## 2. Landing corridor

Construct a continuous corridor from:

current airborne foot → candidate landing.

A landing is not valid merely because its endpoint is clear.

The shin, knee and boot must be able to travel there without passing through either player's legs.

Use the Stage 1 mesh-measured collision volumes.

Show this corridor in the Lab.

## 3. Obstruction during the swing

If an initially valid landing becomes obstructed:

First attempt a small trajectory adjustment around the obstacle.

Then, if necessary:

- shorten the step;
- widen/narrow it within anatomical limits;
- retime landing modestly;
- select another valid candidate.

Do not snap the foot.

Do not teleport it.

Do not let it hover indefinitely.

Do not move the opponent merely to preserve the desired landing.

## 4. Planted feet

A genuinely planted foot is an anchor.

Stage 3/3B must not slide that foot 10–15+ cm because the root received an impact.

Instead the body must respond through:

- ankle/leg compliance;
- knee flexion;
- pelvis displacement within leg reach;
- trunk lean/rotation;
- unloading/releasing the plant when physically necessary;
- or ultimately a failure-to-recover classification.

Measure planted-foot drift explicitly.

Target effectively zero drift while the foot is classified as planted, apart from tiny numerical tolerance.

## 5. Boot-on-boot and planted-against-planted

Study these separately.

For boot-on-boot during a swing:

- detect the actual surfaces;
- determine whether the moving foot can slide/deflect around the other;
- preserve 3B.1 momentum accounting;
- prevent interpenetration.

For planted-against-planted:

do not invent a solution by moving either anchored foot.

Report the conflict and determine what body/support consequence follows.

If this necessarily belongs partly to 3B.3 or falls, leave the unresolved consequence explicit rather than faking it.

## 6. Crossed legs

Do not implement a cosmetic "never cross legs" rule.

Distinguish:

- anatomically legitimate crossover;
- transient close passage;
- impossible self-intersection;
- recovery foot landing on the wrong side because the planner chose a bad target.

Measure why crossed-leg ticks increased under 3B.1 and eliminate the ones created by recovery placement.

## 7. Preserve authored actions

Body Feint, Croqueta and Standing Tackle must retain their approved authored motion until the physical interaction actually requires deviation.

Do not globally reshape their animations.

When collision forces a deviation, record:

AUTHORED TARGET  
→ PHYSICAL OBSTRUCTION  
→ ALTERNATIVE FOOT PATH  
→ LANDING  
→ RETURN / HANDOFF

A decisive ball touch already made remains valid.

Ball and possession authority remain untouched.

## 8. Stress cases

Include at minimum:

- ordinary jog brush;
- head-on jog;
- crossing players;
- one standing / one jogging;
- Body Feint past standing player;
- Body Feint into recovering tackle;
- Croqueta past standing player;
- Croqueta into tackle recovery;
- Standing Tackle into carrier;
- knee/shin collision producing recovery steps;
- boot-on-boot;
- both feet attempting nearby landings;
- committed leg vs airborne recovery leg;
- mirrored cases;
- rotated-world cases.

Also specifically reproduce every current 22.4 cm / large-overlap landing case.

## 9. Acceptance targets

I do not want thresholds gamed, but the intended result is:

- no foot teleport;
- no indefinite hovering;
- planted-foot drift approximately zero;
- no landing through an opponent;
- no recovery trajectory through an opponent;
- substantial reduction of >5 cm leg penetration;
- no increase in unexplained crossed-leg events;
- no new forward-energy gain;
- 3B.1 accounting remains exact;
- no unpaired momentum;
- mirror invariance;
- rotation invariance;
- deterministic results;
- exact behaviour before physical contact;
- approved Body Feint/Croqueta/Tackle motion unchanged when unobstructed.

Report any case where these requirements are mutually impossible.

## 10. Do not hide genuine failure

This is important.

If the player receives an impact and **there is genuinely no physically reachable clear recovery step**, do not manufacture one.

Return a named result such as:

NO_FEASIBLE_RECOVERY / TRIP_CANDIDATE / FALL_CANDIDATE

and preserve the complete physical state at that instant.

That state will become the input to later 3B.3/3B.4 work.

Do NOT implement the actual fall yet.

## 11. Visual Lab

Extend the Lab so I can inspect:

- chosen recovery foot;
- original authored landing;
- all candidate landings;
- rejected candidates and rejection reason;
- selected landing;
- opponent predicted leg volumes;
- swing corridor;
- actual foot trajectory;
- support polygon / COM;
- planted-foot anchor;
- OLD / 3B.1 / 3B.2 comparison.

Include 1×, 0.5×, 0.25×, frame step and multiple cameras.

Make the problematic lower-body cases easy to select directly.

## Deliverable

At the end report:

1. why the 22.4 cm landing overlap occurred;
2. how 3B.2 chooses recovery landings;
3. how many previous recovery landings intersected an opponent and how many remain;
4. planted-foot drift before → after;
5. >5 cm leg-overlap ticks before → after;
6. crossed-leg events before → after, separated into legitimate and erroneous;
7. boot-on-boot findings;
8. every NO_FEASIBLE_RECOVERY / TRIP_CANDIDATE / FALL_CANDIDATE and why;
9. Body Feint / Croqueta / Standing Tackle regression results;
10. momentum/energy/invariant results;
11. whether 3B.2 is strong enough to become the foundation for **3B.3 trips and multi-step stagger**.

Do not implement trips, falls, ground contact or get-up yet.

Do not work on sustained shoulder duels yet.

Do not modify the calibrated F+M 3B.1 formulation merely to make landing statistics easier.

Do not freeze, merge or publish.

Stop for my visual review.
