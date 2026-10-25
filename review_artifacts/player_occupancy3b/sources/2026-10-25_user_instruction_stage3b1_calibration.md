# Owner instruction — STAGE 3B.1 LIMB MOMENTUM CALIBRATION (25 Oct 2026, ≈ 20:00 EET), verbatim

Stage 3B.1 is a substantial improvement and the architecture looks directionally correct. **Do not start Stage 3B.2 yet.**

Before building recovery/landing, resolve the one decision identified in item 11:

> How much of authored limb speed should count as collision momentum?

The current flagship result concerns me:

- equal-speed jog;
- ordinary thigh brush;
- both players moving in essentially the same overall direction;
- yet the canonical 2+ m/s sideways knee swing produces 18.05 + 25.45 N·s of limb momentum transfer;
- both players receive STRONG / RECOVERY STEP responses.

That appears potentially too severe for an ordinary running thigh brush.

However, **do not simply multiply limb momentum by an arbitrary smaller constant.**

I want an evidence-driven calibration of the limb momentum source term.

# Goal

Preserve the important success of 3B.1:

- no fake animated-speed impulse;
- momentum/energy accounting closes;
- no forward-energy creation;
- the limb that transfers momentum actually loses that momentum;
- symmetry / rotation / mirror / determinism invariants remain;
- Stage 3 remains unchanged;
- pre-contact authored motion remains exact.

But determine how much of an authored limb's velocity represents **collision-effective velocity** rather than ordinary cyclic animation.

## 1. Diagnose the flagship case in detail

For the equal-speed jogging thigh brush, decompose each contacting limb's world velocity at contact into at least:

- player/root translational velocity;
- velocity of the limb relative to its own root/hip;
- component along the contact normal;
- tangential component;
- separating vs closing component.

Show exactly where the current 18.05 and 25.45 N·s values come from.

I want to know whether the system is currently counting the entire sideways knee swing when only some component is actually closing the two physical surfaces.

## 2. Test collision-effective velocity formulations

Evaluate several physically motivated candidates. At minimum compare:

A. current 3B.1 formulation;

B. contact-normal relative surface velocity only;

C. contact-normal limb velocity relative to its own articulated parent/root, combined with the bodies' root closing velocity without double-counting;

D. a formulation using the actual relative velocity of the two contacting surfaces along the stable contact normal.

You may test another formulation if the evidence justifies it.

Do NOT choose based on which produces prettier gameplay statistics.

Choose based on physical interpretation, invariants and behaviour across different contact types.

## 3. Build a contact spectrum

Test the candidates on deliberately different encounters:

- very light thigh brush while jogging in parallel;
- stronger thigh collision;
- crossing thigh contact;
- knee-to-thigh;
- knee-to-knee;
- shin-to-shin;
- fast swinging leg into a relatively stationary leg;
- one player standing;
- one player walking;
- both jogging;
- opposing/head-on movement;
- Body Feint contact;
- Croqueta contact;
- Standing Tackle interaction.

Include mirrored and rotated versions.

The model must distinguish a **brush** from a genuine **strike/block/trip-producing collision** without role-specific attacker/defender rules.

## 4. Preserve Astra's response discipline

Continue using the useful principles found in the Astra audit:

- animation itself must never create free body momentum;
- stable contact normal where appropriate;
- paired accounting;
- no passive energy gain;
- no forward-lead bias;
- equal/opposite physical response;
- deterministic results.

But remain on our Stage 1 mesh-measured body volumes and Stage 3 architecture.

Do not import Astra's thin leg capsules, procedural gait, Strength system, rigid leg-to-body blocking, or A99 support timeline.

## 5. Do not tune the balance classifier to hide a bad impulse

Keep Stage 3's existing capture-point/balance response unchanged during this experiment.

If a light brush produces STRONG only because the incoming impulse is too large, fix the limb-contact source term.

Do not weaken STRONG/RECOVERY thresholds merely to make the output look better.

Likewise, do not modify Standing Tackle, Body Feint or Croqueta motion.

## 6. Required accounting

For every tested contact report:

- contact pair;
- contact normal;
- root velocities;
- limb/world velocities;
- limb-relative velocities;
- normal closing velocity;
- effective masses;
- candidate impulse;
- momentum removed from each limb;
- momentum passed to each body;
- ground/support contribution if applicable;
- residual;
- kinetic energy before/after;
- resulting Stage 3 balance classification.

I want it possible to trace every N·s.

## 7. Acceptance tests

Whatever formulation you recommend must retain:

- zero unpaired impulse;
- zero passive energy gain;
- zero forward-energy bias;
- rotation invariance;
- mirror invariance;
- determinism;
- no animation-driven body acceleration without corresponding limb momentum loss;
- exact pre-contact preservation.

Also specifically test that increasing purely tangential limb speed does not incorrectly create a larger normal collision impulse.

## 8. Keep the remaining 3B problems separate

Do NOT solve yet:

- boot-on-boot;
- planted-against-planted;
- two committed legs landing into one another;
- recovery landing placement;
- crossed-leg increase;
- Stage 3's committed-defender balance bug;
- falls;
- ground contact;
- get-up;
- shoulder duel.

Record their current numbers but leave them for their appropriate stages.

## 9. Visual Lab

Extend the 3B Lab so I can inspect representative contacts and switch between:

- current 3B.1;
- each serious candidate;
- recommended formulation.

Show:

- contact normal;
- contacting limb surfaces;
- velocity vectors;
- normal velocity components;
- momentum transferred;
- resulting Stage 3 response;
- OLD ghost where useful.

Include slow motion and frame stepping.

## Deliverable

At the end, tell me plainly:

1. why the ordinary jogging thigh brush currently becomes STRONG;
2. whether that result is physically justified;
3. which collision-effective limb velocity formulation you recommend;
4. what the flagship 18.05 + 25.45 N·s becomes under the recommended formulation;
5. how light brushes, strong collisions and genuine limb strikes differ;
6. whether 3B.1 is then strong enough to freeze as the foundation for 3B.2;
7. any failures discovered but deliberately deferred.

Do not start 3B.2.

Do not modify Stage 3.

Do not freeze, merge or publish.

Stop for my visual review of the calibrated 3B.1.
