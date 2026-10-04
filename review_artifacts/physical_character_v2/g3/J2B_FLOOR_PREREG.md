# J2b: independent characterisation of the physical mirror floor (pre-registered before the characterisation run)

**Source:** `../sources/2026-10-04_user_decision_option1_controller_symmetry.md` §5:
- "Do not set new tolerances from the two currently failing values (0.126 mm, 2.08 mm). After the controller corrections are fixed, measure the physical mirror floor using a separate preregistered characterization set … Stop for my approval of any revised J2b numerical tolerances before using them to declare G3 passed."

**Status:**
- The controller corrections are fixed: commit `e9bcf96` (regions, IK, quaternions), with component regressions 14/14.
- This characterisation **recommends** tolerances. It does not apply them.
- J2b in the gate keeps the D4 numbers (0.1 / 2.0 mm) until the user approves new ones.

## The characterisation set (`tools/j2b_floor.mjs`)

This is a **separate set, not the 81 G3 gate pairs.** Every situation is a mirrored pair: trial A and trial B, its exact reflection (mirrored scenario, mirrored initial state). Self-symmetric scenarios are compared against their own reflection.

| family | bodies | situations |
|---|---|---|
| near-single-support | all 8 | T5 / T6 |
| swing-ready | all 8 | U:R / U:L |
| fast transfer (sliding expected) | all 8 | T7 0.5 s R / L |
| quiet stance (self-symmetric) | all 8 | 10 s, L foot vs the reflection of the R foot |
| sagittal push at the boundary (self-symmetric) | all 8 | F, B at the body's largest recovered impulse |
| push at the largest recovered impulse | all 8 | R / L, FR / FL, BR / BL (where measured) |
| push just below the boundary | all 8 | the same directions, 2.5 N·s below the largest recovered impulse |
| push at the smallest failing impulse (failure) | all 8 | the same directions |
| transfer speeds | V2-REF | T1 / T2; T7 at 4 / 2 / 1 / 0.75 / 0.25 s |
| pushes during transfer | V2-REF | T8 hold and ramp, R / FR / BR / F / B and their mirrors, 10 / 15 / 20 N·s |
| short pelvis pushes (other duration) | V2-REF | R / L, 50 ms, 10 / 20 / 30 N·s |

- The push boundaries come from the post-correction G2 run (`../g2/json/g2_results.json`, the 2.2b boundaries). They are not taken from any J2b result.
- **Symmetric perturbations:** every pair is also run with a tiny initial COM-velocity offset δ·u on A and its mirror image on B. δ is 10⁻⁶, 10⁻⁴ or 10⁻³ m/s, with 2 directions each. Self-symmetric runs use sagittal offsets only.
- **Repeated deterministic runs:** every 10th job is run again. Its results must be identical (same hashes).
- **Size:** ~1,150 pair runs.

## Classes and metrics

- **Meaningful sliding** means either trial has a foot more than 1.0 mm from its start.
- **The classes:**
  - **A**: no meaningful sliding;
  - **B**: sliding, control continues (no fall);
  - **C**: physical failure (a fall declared).
- **Scoring window:** for C, everything is scored only through the common abort / failure declaration (the common supervisor abort, else the first fall).
- **Per pair:** the maximum mirrored foot-displacement difference in the window; the slide magnitude; contact-piece transitions; outcome classes; abort and fall timing differences.
- **Reported:** per class, family and body, the distributions (median, p90, p99, maximum). Not only the worst case.

## Attribution (`tools/j2b_floor.mjs --attribution`)

The attribution subset is up to 6 base pairs per family from V2-REF, V2-165-62 and V2-198-92. Each mirror trial B is re-run in a world whose L/R creation order is swapped (`cfg.mirrorOrder`, a diagnostic option, default off and bit-identical when off).

| creation order swapped | what moves |
|---|---|
| `bodies` | body IDs, hence contact-pair order and island body order |
| `joints` | constraint and actuator order |
| `all` | both |

- **Reading:** the remaining A ↔ B difference with `all` is what Jolt's creation ordering does *not* explain (our code's own L-before-R accumulation order, floating-point state). `bodies` vs `joints` separates contact ordering from constraint / solver ordering.
- **Floating-point state:** the spread of the difference across perturbation sizes; 10⁻⁶ m/s is close to last-bit sensitivity.
- **Morphology:** the per-body distributions.
- **Sliding and contact transitions:** the difference against slide magnitude and the transition count.

## Tolerance recommendation rule (fixed now; applied to the results, not chosen after them)

For each class, the **recommended tolerance is the smallest value of the 1–2–5 series that is ≥ 2 × the class maximum** over the whole characterisation set: all bodies, families and perturbations. A 2× margin over the independently measured maximum is D4's own margin convention.
- For C, the same rule applies to the positional difference through the declaration, with sliding and non-sliding windows kept separate (as in J2b). Timing compatibility is recommended as "abort and fall within N ticks", with N = 2 × the measured maximum timing difference, at least 1 tick.
- The rule always uses the class **maximum**. A pair more than 3× above its class p99 is also flagged and explained, so that the recommendation's driver is visible; it is never dropped.
- **The recommendation goes to the user. It is not used to declare G3 passed.**
