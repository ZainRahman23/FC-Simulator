# GK far dive / reach — presentation correction (2026-09-23)

Review page: `review_artifacts/gk_far_dive_fix/GK_FAR_DIVE_FIX_REVIEW.html`. Verification records: `verification/`.
Rule: **simulation decides what happens; animation visually explains what happened.** Nothing in the simulation, ball path, save
outcomes, camera, V6 clip or the shared-rig fallback was changed; the frozen V6 fixture 42 is byte-identical.

## 1. Reproduction and instrumentation
`probe_dive.js` (scratch tool) runs a fixture or an ad-hoc scenario through the 3D backend and records, per tick: authoritative root /
velocity / hand / ball / state / commit / contact; presentation root offset; pelvis, chest, head, shoulder, elbow, wrist transforms
BEFORE the procedural pass (FK of the authored pose with its pelvis offset) and AFTER (the solve); the requested hand target; the
glove centre; residuals; torso assist; ground lift; leg floor; elbow angle and bend normal; NaN. Fixtures 42, 49, 50, 12, 15, 13,
14, 2, 36, 40, 34, 39, 35 and 14 adversarial synthetic shots (wide R/L above the bar, very wide, very high, top corner, from central,
SW- and NW-facing origins, extreme wide+high) on BOTH rigs.

## 2. Cause (from the transforms)
- **The launch.** `gkLaunchPlan` fits one ballistic arc from the plant through the solved full-extension pelvis at the simulation's
  exec-end; nothing bounds the fitted launch velocity. Fixture 36 (exec 0.155 s → 0.10 s of flight) fits 6.45 m/s on the shared rig
  (5.20 m/s on Courtois). After exec-end the momentum continuation (FOLLOW / DESCENT of the landing plan) keeps rising for 0.5 s:
  pelvis 2.84 m / head 3.43 m (test rig), 2.15 m / 2.79 m (Courtois); presentation root 2.5 m (sanity cap) / 1.9 m from the
  authoritative root, the constant horizontal velocity carrying the body past the goal. First divergent tick = the first tick after
  exec-end; stage = the launch-plan continuation. The torso assist stayed within its 20° bound; the ground clamp and IK are not involved.
  **Latent on the shared rig, and worse there** (lower hips → larger fitted rise); not introduced by the true-height retarget.
- **The arms.** `skelIK2` clamped a target nearer than the folded chain to |a−b| but kept aiming the forearm at the raw target, so the
  elbow closed to 5–14° when the post-contact glove fade lerped toward an authored wrist under the body / pitch, or a brace hand target
  sat beside the hip (fixtures 12, 35, 2, 13, adversarial 0–7, 12, 13; both rigs). No true bend-plane flips: the angle between
  consecutive elbow bend normals never exceeds 90° per tick on any run (the earlier flip metric was a false positive as the arm passes
  overhead).

## 3. Fix (reusable rules, not fixture hacks)
| rule | code | bound |
|---|---|---|
| bounded flight: after exec-end the pelvis rises at most `followRiseM` (3 cm, the accepted V6 follow-through) above max(contact pelvis, standing hip + jumpMaxM·launch); the vertical velocity at exec-end is capped accordingly, the excess bled off over `capBlendT` 50 ms (velocity-continuous); horizontal velocity unchanged; uncapped arcs keep the original plan bit-for-bit; the landing plan touches down from the capped segment | `gk_graph.js` `gkLaunchPlan`, `gkLaunchState`, `gkLandingPlan` (+ `flightCap` review switch) | hipY + 0.55·launch + 0.03 m |
| anatomical elbow fold: an arm target inside the 30°-folded reach is met at that fold, the forearm aimed at the reachable point on the shoulder→target line | `ik.js` `skelIK2` (`GK_IK_MIN_ELBOW_DEG`) | 30° |
| FK elbow joint limit before the procedural pass (safety net; never triggered on the current library) | `gk_graph.js` `elbowLimit` | 30° |

Results (fixture 36): pelvis 2.84 → 1.53 m / 2.15 → 1.59 m; head 3.43 → 2.15 / 2.79 → 2.23 m; presentation root 2.50 → 1.72 /
1.88 → 1.44 m; elbow min 41 → 86° / 63 → 80°; outcome CONTROLLED PARRY unchanged; glove residual at contact 0.008 → 0.028 m (test,
the first bounded tick is the contact tick) / 0.009 → 0.007 m (Courtois). Elbow minimum 30° on every dive / adversarial run, both rigs
(was 5–14°). No NaN, no flips, no discontinuity events in the dive set.

## 4. Regression (final code)
- 80 fixtures × 300 ticks, both rigs: 0 bad continuity assertions, 0 NaN; presentation-root deviation max 1.47 m (test) / 1.21 m
  (Courtois) — both fixture 42, the frozen V6 slide, unchanged; torso assist max 20° (its cap); FK joint-limit interventions 0;
  glove residual at contact: 50 contacts, max 0.709 / 0.587 m (the low-dive cradle catches 49, pre-existing), mean 0.25 m; miss residual
  max 0.36 / 0.40 m (fixture 9, kept); sole clearance while planted ≥ −3 mm.
- Full-precision simulation traces: sprite ≡ animation OFF ≡ 3D test ≡ 3D Courtois on all 80 × 260 and 12 × 300 (events + camera).
- Frozen manifests: 42 identical (every joint, every tick); 55–60 identical joints; 45 / 64–75 differ only by the earlier ball-radius fix.
- Remaining joint-limit violations outside this scope: the distribution / cradle arm solves can fold to 19–27° (fixture 67 wind-up on
  Courtois, 27 on the test rig) — the same 30° limit should be applied to those chains in the distribution pass.

## 5. Tooling added
`capture.js --adhoc <json> --adhocIndex i` (ad-hoc scenarios), `--preset broken` (review switches: `GK_GRAPH.flightCap=false`,
`GK_IK_MIN_ELBOW_DEG=0`); `survey_all.js` extended (presentation-root deviation, torso, elbow min, jumps, joint-limit ticks, hit / miss
residuals); `probe_dive.js` per-tick instrumentation.
