# User decision 2026-10-10 (≈04:40 BST) — adopt the interaction-time physics pivot (after Astra's architecture review); preserve all prior work as evidence; next task: preregister and execute the smallest interaction-time physics vertical slice (A swinging-leg impact, B planted-leg sweep, C same hit / different support state); stop for review (verbatim)

Received in the Claude Code session as the whole message (pasted text), in reply to the consolidation (15b0d5c6). Reproduced verbatim below.

---

Architecture decision: adopt the interaction-time physics pivot.
Astra's architecture review is complete. I am ending the attempt to make sustained autonomous V2 locomotion or pre-contact physical running a production prerequisite.
Preserve all CF, SLP, PI-1, PCS, LC-1, REV, V1.3 and related work exactly as research/evidence. Do not delete, rewrite or reinterpret failed experiments. Do not modify the existing simulation baseline merely to make old PI-1 gates pass.
Production architecture from this point forward:
- The football simulation remains authoritative for ordinary player trajectory, movement and gameplay outcome.
- Ordinary locomotion will be animation/skeletal-presentation driven, not V2-physics propelled.
- A separate locomotion effort will replace/improve the existing running presentation. That is not your task in this session.
- V2 is retained as the articulated physical interaction body.
- V2 physics should activate only when meaningful physical interaction requires it.
- The simulation decides what happened; physics should produce a mechanically credible realization of that interaction; presentation must remain simulation-neutral.
Therefore stop trying to make the existing procedural runner physically continue running after promotion. Do not start another PI-1/PCS revision whose success requires sustained pre-contact V2 locomotion.
Your next task is to design and execute the smallest interaction-time physics vertical slice, based on Astra's recommended direction.
Start by consolidating the production contract and preregistering the experiment before changing implementation. Reuse validated V2 components and existing authoritative interaction records wherever appropriate.
The first slice should answer three questions:
A. Swinging-leg impact
Construct a mechanically valid V2 interaction state at/very near authoritative contact for a runner whose struck leg is airborne. Give the body the authoritative whole-body translational momentum/facing and a mechanically coherent articulated state. Apply the authoritative collision impulse once, at the mapped physical contact location. Do not require V2 to have physically run to that state.
Determine whether the struck limb responds physically, whether momentum propagates sensibly through the articulated body, whether the response is deterministic, and whether any recovery authority erases or substantially cancels the collision.
B. Planted-leg sweep
Construct a mechanically valid V2 single-support state at/very near authoritative contact, with the appropriate planted foot, whole-body velocity/momentum and body configuration. Apply the authoritative lateral tackle impulse once to the corresponding lower-leg region.
Then allow V2 physics to determine the mechanical response. Record the chain through foot/leg → hip/pelvis → COM → torso → support loss → fall/turf contact if it occurs.
Do not prescribe a fall animation or hidden fall impulse.
C. Same hit, different support state
Where possible, run a matched comparison using the same body, comparable contact location/direction and same impulse magnitude with the relevant leg airborne versus planted.
This is an important test: the two responses should differ because of their mechanical states, not because of an outcome-specific animation or hidden physics rule.
Authority rules
- Do not alter the authoritative football simulation trajectory or outcome.
- Do not feed presentation/physics state back into the simulation.
- No presentation RNG.
- No hidden state writes after initialization to force the expected result.
- The initialization of V2 at interaction time is allowed and must be explicitly recorded.
- Apply the authoritative collision impulse exactly once. Guard carefully against double-counting an impulse/contact already represented elsewhere.
- Physics is allowed to determine the detailed bodily response; it is not allowed silently to change the authoritative football result.
- If the authoritative outcome and unrestricted physical evolution disagree, report the disagreement rather than tuning physics until it matches.
Do not require the old presentation pose to be copied exactly if that pose is mechanically invalid. The interaction initializer may construct the nearest mechanically valid V2 state using authoritative quantities such as position, facing, whole-body linear/angular motion, support state, contact location and gait/context information. Every approximation must be explicit and measurable. Do not solve old presentation discontinuities as part of this slice.
Likewise, do not make the old rigid-foot/toe-pivot presentation mismatch the central problem unless it actually prevents these interaction-time experiments. We are testing the interaction architecture, not rehabilitating the old locomotion system.
For every run, capture at minimum:
- authoritative interaction/outcome and contact timing;
- initialization state and any differences from the source presentation;
- contact body/region, point, normal and relative velocity;
- authoritative requested impulse and actual physical impulse;
- per-body linear/angular momentum before and after;
- COM/pelvis trajectory;
- joint states and hard-limit margins;
- actuator/recovery-support usage and saturation;
- planted-foot contact/slip/support state;
- whether/when support is lost;
- fall/turf contacts if applicable;
- deterministic hashes/repeatability;
- simulation/presentation neutrality;
- CPU cost, with physics cost separated from diagnostics.
Run no-tackle controls from the same initialized states where useful so we can distinguish collision response from an initializer/controller failure.
The objective is NOT to prove that V2 can run. The objective is to determine whether V2 can be initialized at a meaningful interaction state and produce a credible, deterministic, simulation-neutral physical response to an authoritative football collision.
Before implementation, inspect the existing evidence and identify exactly which components can be reused unchanged and which old gates are no longer applicable under this architecture. Write a short preregistration with explicit pass/fail criteria. Do not quietly inherit PI-1 requirements whose purpose was sustained pre-contact physical locomotion.
If the first interaction state cannot remain mechanically valid even for the short collision-response interval, stop and identify the failing subsystem rather than adding locomotion machinery.
If these three tests succeed, stop for my review before building reconciliation/hand-back, recovery animations, broader tackle coverage, bumps, aerial collisions or production integration.
Keep all changes isolated/versioned, preserve existing regressions and hashes, commit locally under the existing project rules, and do not push except under the established publication/housekeeping rule.
At the end, give me:
1. whether interaction-time V2 activation is demonstrated;
2. swinging-leg result;
3. planted-leg result;
4. matched planted-vs-airborne comparison;
5. whether the collision remained visibly physical rather than being cancelled by support/recovery;
6. any disagreement between physics and authoritative outcome;
7. evidence that no old locomotion requirement contaminated the experiment;
8. deterministic/neutrality results;
9. measured CPU cost;
10. the smallest next step, without starting it.
Do not work on the new production run/locomotion animation in this session. That will be developed separately.
