# User decision 2026-10-09 (≈04:20, chronicle day 8 Oct) — accept the gate result; principled compatibility correction = Option 1 (character-derived runner gameplay colliders, new simulation baseline) + Option 2 (V2 toe-body extension); promotion mapping; rebaseline; re-gate; stop before PI-1 cases (verbatim)

Received in the Claude Code session, in reply to `pi1/PI1_V12_GATE_RESULTS.md` (3a140db). Reproduced verbatim below.

---

Accept the compatibility-gate result. Do not weaken or reinterpret the frozen 30 mm adjacency criterion, and do not solve this by restricting promotion to convenient frames.
I approve a principled compatibility correction before PI-1 consisting of Option 1 plus Option 2, with the following rules.
1. Runner gameplay collision geometry
Replace the runner's generic/default gameplay leg and foot collision geometry with collision primitives derived deterministically from the rendered/physical character's actual dimensions and anatomical landmarks.
This is a new simulation baseline and must be treated as such.
Do not tune collider dimensions, offsets or timing to preserve CORRECTION, FALL SIDE, or any previous outcome. Derive them from the character geometry first, freeze that derivation, then rerun the tackle fixtures and accept whatever outcomes naturally result.
The simplified gameplay colliders do not need to equal the physical mesh, but their anatomical mapping must be explicit and reproducible: thigh, shank, foot/toe regions and relevant joint landmarks must correspond between gameplay and promoted physics.
Record old → new collider geometry and the source of every dimension.
2. Physical foot representation
Treat the current V2 single rigid ~0.22 m boot versus the presentation's articulated ~0.27 m foot+toe as a genuine representation incompatibility.
I approve investigating and implementing the smallest separate toe-body extension needed to make the physical character geometrically compatible with the presentation foot.
Do not simply lengthen the existing rigid boot if that cannot reproduce heel-rise/toe-pivot poses.
The toe extension must:
- derive its geometry and joint location from the character/presentation dimensions rather than PI-1 tackle outcomes;
- use a physically explicit joint to the existing foot;
- preserve the existing foot/ankle architecture except where mechanically required;
- introduce no hidden pose or velocity writes;
- remain a normal collision body while physics is active;
- allow the presentation's normal toe-pivot/heel-rise range without penetrating the turf;
- preserve physically sensible joint limits;
- not be tuned against the PI-1 tackle results.
Before adopting it, run a small body-level regression showing that the extension does not break the existing V2 integrity properties relevant to PI-1. Do not reopen autonomous locomotion, SLP or CF qualification.
3. Promotion pose mapping
Preserve the knee solution Claude found: map the V2 thigh/shank into the actual plane of the presentation leg rather than changing the knee architecture.
With the toe body available, build the minimum deterministic pose mapping from presentation → physical character.
Measure promotion compatibility over the three candidate trajectories, not just one chosen frame:
- root/pelvis position and orientation;
- hip/knee/ankle/toe positions;
- foot and toe orientation;
- ground penetration;
- linear and angular velocity continuity;
- joint-limit margins;
- self-collision.
Promotion must not inject a meaningful contact impulse or visible pose pop.
Freeze quantitative tolerances before evaluating the corrected tackle outcomes.
4. Rebaseline slide-contact
Once both character-derived gameplay collision geometry and the physical toe representation are frozen, create a new versioned slide-contact baseline.
Rerun the existing fixture space from the corrected geometry. Do not attempt to reproduce the old labels deliberately.
Then search the resulting naturally occurring fixtures for:
1. a near miss;
2. a genuine recoverable contact;
3. a genuine planted/weight-bearing-leg contact producing a fall.
All three need not use the old fixture parameters. They must use the same frozen character/collision definitions and ordinary simulation rules.
If the corrected simulation no longer naturally produces one of those outcome classes in the existing fixture space, report that. Do not tune geometry to manufacture it.
5. Re-run the compatibility gate
For candidate contacts retain the already frozen requirements:
- body/segment correspondence;
- support state correspondence;
- timing within ±1 simulation tick;
- corresponding contact location;
- same-order penetration/overlap;
- matching approach direction;
- promotion-pose compatibility;
- ≤10 mm actual PI-1 self-penetration.
Do not alter the 30 mm shared-joint adjacency criterion after seeing the new results.
6. Protect the simulation-neutral architecture
All of this occurs before PI-1 promotion physics.
Gameplay collision geometry may change because we're creating a corrected new baseline, but once that baseline is frozen:
simulation decides what happens; physical presentation explains what happened.
Presentation/physics must not subsequently modify the simulation outcome.
7. Stop points
Stop and report before PI-1 if:
- character-derived gameplay colliders still cannot map meaningfully to the promoted physical body;
- the toe-body extension requires substantial redesign of V2 rather than a localized articulation;
- promotion cannot reproduce ordinary running poses without a meaningful pop/impulse;
- the corrected simulation cannot naturally supply suitable PI-1 contact cases;
- or existing relevant V2 integrity materially regresses.
Otherwise freeze the new collision/body baseline, amend/refreeze PI-1 to cite it, and stop for my review before implementing the three PI-1 promotion cases.
Do not resume autonomous walking/running physics, SLP, CF, TD2C/E2, general tackles, dribbling or browser integration.
