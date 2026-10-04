# Controller symmetry corrections, independent J2b floor, near-reach IK: report — **STOPPED for decisions (J2b tolerances; G1; J2a IK polish)**

**Source:** `../sources/2026-10-04_user_decision_option1_controller_symmetry.md` (Option 1).

**Not done:** the ankle experiment, a G3 PASS declaration, G4. Nothing is pushed.

**Commits:**
- `e9bcf96`: corrections plus component regressions;
- `39c9ad0`: v3.1 erratum and J2b characterisation, pre-registered;
- the result commit follows.

**Evidence:** `evidence/`, `component_regressions.json`, `ik_study_*.json.gz`, `before/` (pre-correction results), `../g3/json/` (`g3_checks_v31.json`, `g3_mirror_v3.json`, `g3_mirror_floor.json`, `j2b_floor*.json`), `../g3/J2B_FLOOR_PREREG.md`, `../g3/G3_CRITERIA_v3.1_ERRATUM.md`.

## 1. Exact implementation of each correction

**1. Foot regions** (`sim/v2_geom.js` `hull2Canonical`; `ctrl/v2_stand.js` region construction):
- **Method:** the usable region is the radial 5 mm inset of the **canonical** convex hull of the boot's plantar points:
  - the strictly convex vertices: a vertex is removed when its distance from the chord of its neighbours is ≤ 1 nm, a distance that is exactly sign-symmetric under reflection;
  - ordered CCW from the vertex of smallest z.
- **Why:** the old `hull2` kept 3–5 **exactly collinear** sole points per boot (chord distance ~1e-18 m). Which ones it kept depended on rounding: V2-REF left 5, right 4. The radial inset moves each kept point 5 mm toward the centroid, which carved **notches of up to 0.72 mm** on both feet, and the extra left notch was the 4.8 µm L/R difference.
- **Requirements, as you set them:**
  - the boot geometry is mirror-identical (0 m mismatch, all 8 bodies) and unchanged;
  - mirrored inputs give mirrored regions (Hausdorff 3e-18 m);
  - deterministic canonical order;
  - **no CoP-area reduction:** the corrected region **contains** the old one, with area +0.11 … +0.29 % (the notches filled);
  - no vertex is added, and only collinear (geometrically meaningless) points are removed by a fixed rule.
- **Alternative not chosen:** keep *every* boundary point (notches kept, mirrored). It reproduces the old left region bit-exactly, but preserves a dependence on which boot sample points lie on an edge.
- **Old evidence preserved:** `../g3/G3_V3_EVALUATION.md`, `../g3/symfix_diagnostic/`.

**2. Leg IK** (`ctrl/v2_stand.js` `legIK`, constants `IK`):
- **Method:**
  - **central-difference** Jacobian (x ± h, h = 1e-6): the sample set maps onto itself under reflection, which fixes the one-sided cause;
  - **Levenberg–Marquardt** with Marquardt-scaled damping μ(1 + H_ii): μ0 = 1e-2, ÷10 after an accepted step, ×10 after a rejected one;
  - converged to a residual of **1e-12** (≤ 12 iterations), plus a gradient stop for unreachable targets (the least-squares optimum).
- **What it never does:** move the target or relax reachability. It returns the residual; err ≤ 1e-6 means reached.
- **Selection:** by `tools/ik_study.mjs` over 10,880 problems × 3 methods, then 4 LM variants. Problems were captured from real G2 quiet stance, T1, T5 and U:R holds on all 8 bodies, plus a reach-boundary sweep (s = 0.8 … 1.05, 13 directions), mirrored, with perturbed starts.
- **Equivalence:** production ≡ the study's M2d bit-for-bit.

**3. Quaternions** (`core/v2_jolt.js` `unitQ`):
- **Method:** every Jolt-sourced orientation is normalised at the boundary: body reads, constraint-space rotations, motor targets, readbacks, and the G1 rig.
  - IEEE sqrt, so deterministic, and browser = Node;
  - a degenerate input throws rather than producing NaN.
- **Verified** (`component_regressions.json`, R2):
  - ‖q‖² − 1 ≤ 4.4e-16 (raw Jolt: 2.2e-7);
  - orientation change ≤ 2.9e-7 (numerical error only);
  - exact L/R joint-axis correspondence (1.7e-15);
  - no NaN at identity, 90° or 180°;
  - deterministic.

**Permanent component regressions** (`tools/v2_component_regressions.mjs`): **14/14** pass.
- R1 regions: 5/5.
- R2 quaternions: 5/5.
- R3 **IK mirror-equivariance:** 4/4, over 558 problem pairs on 3 morphologies:
  - classification identical in every pair;
  - reachable: Δ ≤ 1.6e-15 m;
  - unreachable: always reported, Δ ≤ 5e-11 m;
  - targets never modified.

## 2. J2a before / after

| | J2a result | worst controller-output mirror differences |
|---|---|---|
| **before** (v3, former controller) | 0/81 | commanded CoP 1.66 mm, per-foot CoP 23 mm, torque 1.7 N·m (BR pushes) |
| **after** (v3.1: `sigmaErr` not gated; tolerances from the corrected controller's floor, same rule) | **79/81** | CoP 6.7e-13 mm, forces 1.4e-12 N, activations 9.3e-11; **2 pairs** (T8 hold BL15 mirror, U:R V2-198-92): IK residual 1.00e-12 → torque 2.4e-8 N·m > 1.2e-10 |
| after + **diagnostic IK polish** (one LM step after convergence; not adopted) | **81/81** | torque 3.2e-11 N·m, IK 1.8e-15 (all within the v3.1 tolerances) |

- **The 2-pair residual** was disclosed before the run. At rare ticks one mirrored LM solve stops just under the 1e-12 threshold while the other takes one more step. The polish step removes this dependence on the stopping threshold.
- **After a fall** (targets grossly out of reach) the IK is still not mirror-exact (reported, not gated; §8).
- **The corrected controller's floor** is ~10⁴ lower for torques (2.1e-7 → 1.2e-11 N·m), because the old IK's convergence noise is gone. So are the v3.1 tolerances.

## 3. G2 before / after (620 jobs)

- **Outcomes: 619/620 identical. Push-recovery boundaries: 0 changes. Symmetry 12/12.** Every behavioural row passes.
- **The one change:** `eval` kξ = 0.5 (a report-only alternative gain), R 25 N·s: fell → recovered.
  - **Attribution** (pre-correction code + one correction at a time): the **region fix alone or the quaternion fix alone** flips it; the IK fix does not.
  - At kξ = 0.5, 25 N·s sits on that alternative's own recovery boundary.
- **Row F (CoP sweeps):** max per-tick net-CoP jump **3.48 → 0.54 mm**. The old region notches caused CoP jumps at the region boundary.
- **One post-fall toe impact:** V2-REF FR 25 N·s, already falling; 14.2 mm manifold depth, 0.35 s after the fall declaration (before: 0.6 mm in that run). This is a chaotic fall path; the 1.4n envelope is a G1 gate, so it is reported here.
- **Row 2.5 (in-run, 9 workers):** 0.404 ms, measured with an external app at ~270 % CPU. **Not the production gate** (your §6); see §7.
- **Row D:** ×3 6/6, snapshot 3/3, **browser = Node 6/6** (re-run).
- **Row R:** superseded (G1 changed).

## 4. G3 physical before / after (332 jobs)

- **Outcome classes: 323/324 identical.**
- **The change:** `strategy` arms variant (report-only), T8 hold R 10: fell → recovered. **Region fix alone.**
- **10 supervisor abort times moved, all by the region fix:**
  - nominal T7 0.75 s: R and L both +1 tick (symmetric);
  - report-only variants: +4 to +67 ms.
- **Cause:** the notch-free regions are up to 0.72 mm larger, so the supervisor's "CoP outside the stance foot" dwell trips later.
- **All physical rows pass:** A–I2 (8/8 bodies), K, L, M, N (determinism, snapshot), O (**browser 4/4**, re-run), Q.
- **Integrity:** 0 invalid turf manifolds, 0 envelope violations.
- **v3.1 overall: 17/20.**
  - J2a: 2 pairs (§2).
  - J2b: 1 pair at 2.073 mm against D4's 2.0.
  - P2: the earlier gates; G1 fails (§9), and G2 2.5 is the in-run measurement.

## 5. Independent J2b floor (1,027 pair runs, 0 errors; repeats 94/94 bit-identical; `evidence/j2b_floor_report.md`)

| class | n | median | p90 | p99 | max (mm) |
|---|---|---|---|---|---|
| **A** no meaningful sliding | 443 | 0.031 | 0.059 | 0.087 | **0.106** (V2-175-70 quiet stance, self-symmetric) |
| **B** sliding, control continues | 301 | 0.137 | 1.08 | 2.07 | **2.10** (V2-REF T8 ramp FR 10) |
| **C** failure, no sliding before the declaration | 21 | 0.029 | 0.057 | 0.066 | **0.069** |
| **C** failure, sliding before the declaration | 168 | 0.85 | 6.27 | 12.8 | **14.8** |
| — of which the window ends at a **supervisor abort** (G3) | 77 | 0.043 | — | 0.35 | **0.42** |
| — of which the window ends at the **fall** (G2: no supervisor; the body is already tipping) | 91 | 2.53 | — | 13.0 | **14.8** |

- **Timing (C):** aborts within ≤ 1 tick; falls within ≤ 5 ticks (0: 111, 1: 52, 2: 9, 3: 9, 4: 4, 5: 4). Class mismatches 0; one-sided falls 0.
- **Morphology:** A maxima 0.066–0.106 mm across the 8 bodies; B 0.42–2.10 mm (the largest only on V2-REF, the only body with T8 pushes).
- **No outliers** (> 3 × p99).
- **By family:**
  - swing-ready ≤ 0.074 mm;
  - near-single-support ≤ 0.086;
  - slow transfers ≤ 0.099;
  - fast transfers ≤ 1.27;
  - pushes just below the boundary ≤ 0.21;
  - at the largest recovered impulse ≤ 1.17;
  - pushes during transfer ≤ 2.10.

**Where the asymmetry comes from:**

| candidate | test | finding |
|---|---|---|
| Jolt constraint / solver ordering | mirror trial in a world with **swapped L/R joint creation order** | median difference ×0.97–1.00: **no effect** |
| contact ordering (body IDs) | **swapped body creation order** | ×0.90–1.17: **no effect** |
| both | swapped bodies + joints | ×0.87–1.06: **no effect** |
| floating-point state | symmetric initial-velocity perturbations | 10⁻⁶ m/s changes the difference by about its own size (A: median change 0.007 vs base 0.033 mm; B 0.015 vs 0.16). It is **chaotic amplification of any rounding-level difference** |
| sliding / contact transitions | correlation | log Δ vs log slide **0.63**, vs contact transitions 0.49. The floor grows with sliding: ≤ 0.11 mm without slide, ≤ 2.1 mm with 1–10 mm slide |
| morphology | per body | small spread (above) |

**Conclusion:** the floor is the sensitivity of contact-rich dynamics to the last bits, amplified by stick-slip. It is not a specific ordering. Not explored: possible asymmetry inside Jolt's convex-hull builder for the mirrored boot pieces.

## 6. Proposed J2b tolerances and justification (pre-registered rule: smallest 1–2–5 value ≥ 2 × the class maximum) — FOR YOUR APPROVAL

| class | measured max | 2 × max | **rule** | current D4 |
|---|---|---|---|---|
| A no sliding | 0.106 mm | 0.21 | **0.5 mm** | 0.1 |
| B sliding, control continues | 2.10 mm | 4.21 | **5 mm** | 2.0 |
| C, through the common declaration, no sliding before | 0.069 mm | 0.14 | **0.2 mm** | 0.1 |
| C, sliding before (whole class) | 14.8 mm | 29.7 | **50 mm** | 2.0 |
| C timing | abort ≤ 1, fall ≤ 5 ticks | — | **≤ 10 ticks** | 1 tick |

- **Coarseness:** the 1–2–5 rounding makes A 0.5 mm (4.7 × max). If you prefer, 0.25 mm is still ≥ 2 × max.
- **The C-sliding value comes from G2 falls.** Without a supervisor, those windows run to the fall declaration. **Every failing pair in the G3 gate ends at a supervisor abort**, whose subset maximum is 0.42 mm; the same rule gives 1 mm for that subset.
- **With the rule's numbers, the G3 gate's J2b would be 81/81:** non-sliding 0.086, sliding 2.073, failing 0.324 mm; abort timing equal; falls ≤ 1 tick. **Not declared**; your approval is needed.

## 7. Isolated performance (approved method: one process, idle machine, warm-up + 7 trials, median of trial means)

| scenario | controller mean (before → after) | median | **controller + actuators mean** | p99 |
|---|---|---|---|---|
| G2 quiet stance | 0.023 → **0.108** | 0.022 → 0.101 | 0.034 → **0.119** | 0.143 → 0.234 |
| G3 T5 | 0.035 → **0.118** | 0.031 → 0.111 | 0.046 → **0.129** | 0.163 → 0.256 |
| G3 U:R | 0.036 → 0.123 | 0.031 → 0.116 | 0.047 → **0.135** | 0.166 → 0.286 |
| G3 T3 | 0.037 → 0.124 | 0.032 → 0.116 | 0.048 → **0.135** | 0.164 → 0.277 |
| G3 T8 hold R push R10 | 0.041 → 0.124 | 0.040 → 0.116 | 0.052 → **0.135** | 0.172 → 0.259 |

- **IK contribution** (G3 T5, controller IK timer, 5 isolated trials): **0.023 → 0.107 ms per tick** (both legs), at 6.5 LM iterations per solve from the warm start.
- **Within the 0.15 ms budget** (worst mean 0.135 ms), but the margin shrank from ~3× to ~10 %.
- Per your §6 the IK was not optimised.
- The 9-worker in-run figure (G2 2.5: 0.404 ms) included an external application at ~270 % CPU and is not the gate.

## 8. Near-reach-limit IK investigation (adopted method, all 8 bodies, 13 directions, mirrored, perturbed starts; production ≡ study)

| distance s = target / full reach | reached (≤ 1e-6) | residual (median / max) | iterations (mean) | mirror Δ (m) | L/R classification mismatch |
|---|---|---|---|---|---|
| 0.80 … 0.999 | 832/832 at each s | ≤ 4e-14 / ≤ 1.0e-12 | 6.3–7.0 | ≤ 2.3e-15 | 0 |
| **1.000** (singular, full extension) | 832/832 | 3.2e-9 / 9.6e-9 (12-iteration cap) | 12 | 8e-11 | 0 |
| 1.001 | 0/832 (correct) | 8.7e-4 / 9.4e-4 (= the geometric shortfall) | 12 | 7e-11 | 0 |
| 1.005 … 1.05 | 0/832 (correct) | = the shortfall | 10.5–12 | ≤ 1e-8 | 0 |

- **Reachable-target accuracy:** ≤ 1e-12 everywhere reachable, including the real captured targets (64; residual ≤ 9.2e-13; mirror Δ 1.5e-15).
- **Unreachable classification:** exact to geometry. The residual equals the reach shortfall (0.79 mm already at s = 1.001), so the classification boundary sits within ~1 µm of full extension. **No target is ever classified differently for the left and the right leg** (0 of 10,880).
- **Convergence near the boundary:** linear (singular Jacobian) at exact full extension; it reaches 3e-9 … 1e-8 within 12 iterations, still well inside "reached".
- **Mirror equivariance:** ≤ 3e-15 m reachable; ≤ 1e-8 m at or beyond the boundary.
- **Sensitivity to the start:**
  - from the controller's warm start, never a hyperextended solution;
  - ±1° perturbations never change the solution for reachable targets;
  - ±5° change it in ~4–5 % of cases and ±15° in ~30 %: the IK has **no joint limits**, so a second, **hyperextended-knee branch** exists, and the standing knee (≈ 4–7° flexed) sits close to the extension singularity where the branches meet;
  - at or beyond the boundary, different starts reach different points of a non-unique optimum (rotation about the straight leg) with the same residual; the reachability classification never flips.
- **Morphology:** uniform across the 8 bodies.
- **Cost:** ~47–54 µs per solve in the study harness; in the controller, 0.107 ms per tick for both legs (§7).
- **After a fall** (targets 0.5–2.3 m out of reach), solves stay unconverged after 12 iterations and are not mirror-exact (≈ 9e2 N·m torque differences). That only happens when the leg cannot reach at all.

## 9. Regressions and determinism

| check | result |
|---|---|
| component regressions | **14/14** |
| G0 | **PASS** |
| **G1** | **FAIL, 2 rows**: **1.S′**, V1-matched leanR settles with the elbow 1.93° past ROM (limit 1.5°); **row 8**, upright @ 360 Hz touches the engine stop for 1 tick (shoulder abduction). 1.S, variants 40/40, determinism, snapshot, rig, 7.HS, 1.1f, 1.V1 and 1.E pass. **G1 browser = Node 10/10** |
| G2 | behavioural rows pass; D: ×3 6/6, snapshot 3/3, browser 6/6 |
| G3 | N: ×3 + snapshot bit-exact; O: browser 4/4 |
| J2a (81 pairs) | 79/81 (§2) |

**The G1 failures are chaotic marginality that already existed in the accepted plant, not a regression:**
- G1 has no controller, so only the quaternion normalisation reaches it. It changes passive torques by ~1e-7 relative, which reroutes chaotic falls.
- Under the **old** code, V1-matched leanR at 240 Hz already failed the same settled-excursion check in **4 perturbed runs** (1–20 µm/s start perturbations), and upright already hit the engine stop in a perturbed run.
- Over the same 854 perturbed runs (G1 set + perturbation set), the corrected plant fails per-run gate rows **43 times against 53** for the old code (engine-stop 5 vs 4; settled excursion 16 vs 18).
- The official nominal runs simply landed on the other side.
- `evidence/*sweep*`.

## 10. Remaining concerns / decisions

1. **J2b tolerances:** your approval of §6 (or other numbers) before G3 can be declared.
2. **G1:** fails 2 marginal chaotic rows after the quaternion correction (§9). Options:
   - (a) accept them as pre-existing marginality (evidence above), possibly with an ensemble / statistical form of 1.3b / 1.3d (a criteria change);
   - (b) limit the quaternion normalisation to the controller and actuator inputs (G1 bit-identical; the plant keeps the 3e-7 inexactness);
   - (c) other.
3. **J2a's 2-pair residual:** adopt the one-step IK polish (validated diagnostically: 81/81), which requires a G2 / G3 re-run, or accept the IK's 1e-12 stopping tolerance as part of the floor.
4. **IK cost:** 0.107 ms per tick, leaving a ~10 % margin to the 0.15 ms budget before any G4 swing-leg control. Not optimised, per your rule.
5. **For G4:** the IK has no joint limits (hyperextended branch from large start offsets); full extension is singular and converges slowly; post-fall / grossly unreachable solves are unconverged and not mirror-exact. Swing-leg IK in G4 should own branch selection and limits.
6. **The plant floor is chaotic amplification, not Jolt ordering.** J2b tolerances will always be statistical floors, not exact values.
7. **Machine contention:** an external application used ~270 % CPU during some runs. Correctness results are unaffected (deterministic); the benchmark ran only after the machine was idle.
