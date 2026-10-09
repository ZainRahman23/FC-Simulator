# Track B: PI-1 with pose-compatible F0 promotion. PREREGISTRATION (frozen before any CHARCOLLIDE-1 code, corrected fixture or case selection)

**Source:** `../../sources/2026-10-09_user_decision_trackA_toe_solver_trackB_pose_compatible_pi1.md`.

**Status:** frozen at the commit that adds this file. At that point:
- no CHARCOLLIDE-1 code or profile existed;
- no corrected (v1.3) fixture had been run;
- no candidate had been selected.

Later changes are recorded amendments (§9), never silent edits.

**Independence from Track A.** Track B uses only the frozen **F0** D-1 runner (`pi1RunnerSpec`, unchanged). No F1 code path, F1 parameter or Track A result enters Track B. If Track A ever produces a validated toe, its integration into PI-1 is a later, separate, versioned experiment.

## 1. What is frozen and reused unchanged

- **CHARCOLLIDE-1:** `../CORRECTION_DESIGN_FROZEN.md` §1 (7c090de), exactly as written. It covers:
  - landmarks from `ofLocoCycle` on the character's own skeleton, with the simulation's stride clock;
  - the `gkRootMatrix` basis;
  - inscribed capsules with radii from the character's V2 colliders and its record-length boot sections;
  - segment kinds;
  - an unchanged `planted` rule;
  - unchanged pelvis / torso capsules.
- **Record-length boot.** The CHARCOLLIDE-1 foot / toe capsules come from the record-length boot (the D-1F1 boot geometry, which exists without articulation), while the promoted body in Track B is F0, with a ≈ 0.22 m anatomical boot. This is not adjusted.
  - Any gameplay contact on the rendered forefoot beyond the F0 boot will fail CG-1 / CG-4 / CG-5.
  - Any presentation toe-ground contact that F0 cannot carry will fail the contact row of §3.
- **PI-1 preregistration:** `../PI1_PREREGISTRATION.md` (6ef7e1e), with its criteria, mechanisms and stop conditions. It is amended in §8 only to cite the corrected baseline and cases.
- **Compatibility gate:** `../PI1_COMPAT_GATE.md` (ab9a626), thresholds unchanged, including the 30 mm shared-joint adjacency and the ≤ 10 mm self-penetration.
- **Promotion tolerances:** `../PI1_COMPAT_GATE.md` §3, written for this F0 body, plus the rows of `../CORRECTION_DESIGN_FROZEN.md` §4 that have an F0 counterpart (§3 below).

## 2. Operational details of CHARCOLLIDE-1 (decided now; no number is chosen from an outcome)

1. **Branch and version.**
   - Branch: `prototype/slide-contact-v1.3-charcollide` from e2c98ec, in its own worktree, committed locally.
   - Version label: **slide-contact V1.3 (CHARCOLLIDE-1)**.
   - Profiles live in a data file `sandbox/visual/pt_charcollide.js`, loaded after `pt_react.js`.
   - A player uses the model only if `PT_CHARCOLLIDE.profiles[ctx.char]` exists. Only `vinicius`, the D-1 runner, gets a profile; every other player keeps the legacy model.
2. **Profile generation.** `physchar2/tools/charcollide_profile.mjs` runs on the V2 branch and records the SHA-256 of `rig.json` and of the profile. Its inputs:
   - `assets/characters/outfield/vinicius/rig.json` (SHA-256 b8e67cff…, identical at e2c98ec and on the V2 branch);
   - the D-1 runner's V2 colliders: the thigh tapered capsule rTop / rBot; the shank frustum rTop / rBot;
   - the record-length boot hull (`f1BootParts` of `PI1_RUNNER_F1`, geometry only).

   It also writes `CHARCOLLIDE_PROFILE.md`, the old → new table with the source of every number.
3. **Boot sections and inscription.**
   - The heel radius uses the hull's half-width / half-height in the plane z = z_heel-centre.
   - The MTP radius uses the same in the plane z = z_MTP.
   - The toe radius r_t uses the front (toe-box) hull at z = z_tip-centre, with r_t solved by a fixed-point iteration (z_tip-centre = tip − r_t).
   - The tool then **verifies inscription**: 2,000 deterministic surface samples of each capsule must lie inside the corresponding convex boot pieces' union, with a tolerance of 0.5 mm. If any sample lies outside by more than that, the radius is reduced to the largest inscribed value by bisection, and the reduction is reported.
4. **Tapered capsule contact.** The simulation's segment–segment test (closest points between axes, Ericson) is used unchanged. The radius of a tapered segment is interpolated linearly at the closest parameter on its axis: r(t) = r_a + (r_b − r_a)·t. Every existing `pr.r + sg.r − d` test uses r(t). For a constant-radius segment, r(t) = r.
5. **Root basis.** `gkRootMatrix(x, y, dir)` is written in the simulation's pitch coordinates by an identical formula. A unit check against `gkRootMatrix` runs in the harness, with equality required to 1e-12.
6. **Flight bob.** b = `_bob` of `ofLocoCycle` evaluated at the phase where the most recent stance ended, minus 1e-6 cycles. Ground contact still holds there. It is pure in the phase.
7. **Pose.**
   - Idle blend: wGait = the presentation's formula from `ofLocoTick`, with `OF_IDLE` and lean / turnRoll / twist = 0.
   - The pelvis offset is `pose._pelvis`, as in `ofLocoGroundPelvis`.
   - FK uses `skelFK` on a skeleton built by `ofCharSkeleton` logic from the profile's bones. That skeleton is simulation-owned and cached on the profile object.
8. **Callers.** Every call of `ptRxBody` / `ptRxSegments` for a profiled player uses the profile. The V1.2 `footLen` argument is ignored for profiled players, because the profile defines the foot.
9. **Neutrality gate (must pass before any search).**
   - The in-page authoritative traces and gameplay hashes are identical across OFF / FULL / LOCO for every rx fixture.
   - The export run twice is identical.
   - Every non-profiled player is unchanged: a fixture whose runner is not `vinicius` gives a gameplay hash identical to e2c98ec. If no such fixture exists, a synthetic run with the profile removed must reproduce the e2c98ec hashes exactly.

## 3. F0 pose-compatibility gate (PCG-F0)

**Pose.** The F0 body is posed by **PM-1-F0**: `../CORRECTION_DESIGN_FROZEN.md` §3 without its toe item.
- pelvis from the rig;
- R-K for thigh / shank;
- foot = the rig foot rotation, with the 3-DOF ankle absorbing twist;
- parent-first projection onto hard ROM;
- velocities by the second-order backward difference of the same mapping.

**Not used:** no R-B pitch fix, no vertical shift, no frame selection.

**Unmapped rig bones.** The rig toe bone, like every unmapped rig bone, stays presentation-only (PI-1 §5). It keeps its stream-A local rotation, so the rendered toe never snaps.

**A frame is eligible only if every row holds:**

| row | quantity (F0 vs presentation) | tolerance | source |
|---|---|---|---|
| P-1 | pelvis / root position | ≤ 10 mm | COMPAT §3 |
| P-2 | pelvis orientation | ≤ 2° | COMPAT §3 |
| P-3 | trunk / head orientation | ≤ 3° | COMPAT §3 |
| P-4 | hip, knee, ankle centres | ≤ 10 mm | COMPAT §3; CORRECTION §4 (hip) |
| P-5 | foot orientation (each foot) | ≤ 5° | COMPAT §3 |
| P-6 | thigh / shank long-axis direction | ≤ 2° | COMPAT §3 |
| P-7 | twist about a limb's long axis | ≤ 10° | COMPAT §3 |
| P-8 | elbows / wrists (rendered) | ≤ 15 mm | COMPAT §3 |
| P-9 | foot the presentation holds in contact, by its contact flag (heel / flat / toe alike) | F0 boot lowest point within [−5, +2] mm of the pitch | COMPAT §3 |
| P-10 | any body not held in contact | lowest point ≥ −5 mm | CORRECTION §4 |
| P-11 | rendered boot penetration into the pitch | ≤ 10 mm | COMPAT §3 |
| P-12 | joint limits | the PM-1-F0 mapping needs no clamp beyond the hard ROM; any projection residual must itself meet P-1 … P-7 | CORRECTION §4 (margin ≥ 0) |
| P-13 | self-collision of the posed F0 body (allowed pairs) | ≤ 10 mm | COMPAT CG-8 / CORRECTION §4 |
| P-14 | per-body linear velocity vs the presentation's material point (backward difference) | ≤ 0.25 m/s | COMPAT §3 |
| P-15 | per-body angular velocity vs the presentation's bone | ≤ 2.0 rad/s | CORRECTION §4 |
| P-16 | whole-body COM velocity | ≤ 0.05 m/s | COMPAT §3 |
| P-17 | whole-body angular momentum | ≤ 10 % | COMPAT §3 |

**Not applied.** The toe-body rows of CORRECTION §4 (MTP centre 10 mm, toe tip 15 mm, toe orientation 5°) have no counterpart on F0, which has no toe body.
- **Reported every frame, never hidden:**
  - the presentation's MTP flexion;
  - the rendered toe tip's distance from the F0 boot tip. This includes the static ≈ 55 mm length difference: record boot 0.2752 m ahead of the ankle joint vs the F0 anatomical boot.
- **Toe-pivot frames.** Their incompatibility is gated through P-9: a presentation toe contact that the shorter rigid boot cannot carry fails it. It is also gated through P-10 / P-5.

**How this meets the user's list:**

| requirement | covered by |
|---|---|
| authoritative state unchanged | §2.9 and NT-1 … NT-4 |
| collision geometry not changed for an outcome | §1–2, frozen |
| no turf penetration | P-9, P-10, P-11 |
| no joint-limit excess | P-12 |
| no meaningful promotion impulse | P-9, P-10, P-14 … P-17; plus PI-1 PR-3 / PR-4 later |
| no visible foot snap | P-4, P-5, P-7, P-9; the toe stays presentation |

**Frames evaluated, for each candidate:**
- (i) the **predicted promotion frame** k_p: the first tick with d_pred ≤ 0.25 m (PI-1 §6.1), computed by the simulation's own (v1.3) functions. PCG-F0 at k_p is reported for every fixture.
- (ii) Every tick from k_p to the decisive contact (CG-7), or for the near miss to the end of its PRE window (envelope passed).

**Promotion timing is never moved.**

**Implementation.** `pi1/scripts/compat_lib.mjs` / `compat_gate.mjs` (v1.2) is extended into `pi1/trackB/scripts/` with R-B disabled and P-9 … P-17 as defined. The v1.2 scripts stay unchanged as evidence.

## 4. Rebaseline and natural search

**Runs.** Every rx fixture of `tools/anim3d/of_react_scenarios.js`, in file order, unchanged, on V1.3. Also the frozen PI-1 §2 near-miss rule `rx_miss`: the smallest |off| on a 0.01 m grid with no contact and a minimum surface distance in [0.10, 0.20] m, searched to |off| ≤ 2 m.

**Recorded per fixture:**
- outcome class;
- struck primitive / segment;
- support state;
- simulation contact time;
- J;
- k_p;
- PCG-F0 at k_p;
- the full gate (CG-1 … CG-8 / NM).

**Categories** (CORRECTION §5):
- (1) no contact;
- (2) a recoverable contact (CORRECTION or STUMBLE);
- (3) a planted / weight-bearing-leg contact producing FALL.

**Selection** (COMPAT §5, unchanged):
- the original triple (rx_miss / rx_free_leg / rx_planted_leg) if each yields its category and passes the gate;
- otherwise the first fixture in file order whose V1.3 outcome is in the category and which passes the gate.

PCG-F0 is part of the gate through CG-7. If the rx space lacks a category, the existing defending slide fixtures (`of_def_scenarios.js`, slide kinds) are searched the same way.

**Nothing is moved, offset or tuned to obtain an outcome or a compatible pose.**

## 5. Body check

**The F0 D-1 runner is used as frozen,** under PI-1 §4. The isoSelfCol stress test is covered by the D1C PI-1-scoped exception; ≤ 10 mm is enforced in every actual PI-1 state.

**No re-run is needed:** no F0 file changes. `8d2c04b` / `0ddba2b` left every F0 spec hash identical.

## 6. Stop rules

**Stop before PI-1** and report which class is blocked if:
- the neutrality gate (§2.9) fails;
- profile inscription cannot be met (§2.3);
- a category has no fixture passing the gate.

**Classes run independently.** PI-1 runs only the classes that have a frozen gate-passing candidate, in the order near miss → recover → fall. A blocked class is not run and is reported; nothing is manufactured.

**PI-1's own stop conditions (§14) apply unchanged:** stop at the first architectural failure.

## 7. Robustness check (only if near miss → recover → fall all pass)

Preregistered separately before it runs, under the earlier approval: small variations in contact timing / location and body geometry. Then stop before production integration.

## 8. PI-1 amendment 1 (written only after a candidate set passes the gate; committed before any PI-1 physics run)

**It will cite:**
- the V1.3 commit;
- the profile SHA-256;
- the F0 body;
- PM-1-F0 + PCG-F0;
- the frozen candidates and their records.

**It will state the adaptations the new baseline forces, without changing any criterion:**
- the tackler proxy is built from **all** of the V1.2 slide's own primitives at k_p (LEG, THIGH, TUCK, TUCKSHIN, BODY, TRUNK), in place of V1's two;
- the RC-6 / FL-5 reference values (J, landing time, family) come from the new records;
- the predictor uses the V1.3 simulation's own functions.

## 9. Amendments

### A1 (before any v1.3 code or fixture run): inscribed foot / toe capsule placement

**The finding** (the first profile run, `charcollide_profile.mjs` before A1). The §2.3 placement fails inscription:
- **Heel:** the heel-end sphere sits r ahead of the rig's heel point (footwear minimum z) and r above the stud plane. It protrudes **3.8 mm** at the V2 boot's rounded back (lateral-posterior, mid-height).
- **Toe:** the tip-end sphere sits on the stud plane, under the toe box. The V2 boot's toe spring lifts the toe-box bottom by ≈ 10 mm at the tip, so the sphere protrudes **10.0 mm**.
- **Bisection:** §2.3's bisection is ill-posed with that placement. Shrinking r moves the centre into the rounded corner, so the bisection returned r = 0 for the heel and toe.

No fixture had been run and no outcome seen.

**The amended rule.** CORRECTION §1 requires the capsules to be inscribed in the physical colliders. Under A1, for each capsule end:
1. the end plane is unchanged: heel-end z = −heelBack + r_h,design; MTP-end z = z_MTP; tip-end z = tip − r_t,design, with the §2.3 design radii from the sections;
2. the centre lies on the foot's centre line (x = 0) in that plane, at the height y that maximises the inscribed radius. A concentric sphere is inscribed (all 2,000 samples inside the boot pieces' union, tolerance 0.5 mm), so for a fixed centre the radius bisection is monotone. y is searched on a 0.5 mm grid over the section;
3. the end radius = that maximum, capped at the design radius;
4. if the cone band between the two end spheres protrudes, both end radii are scaled by one common factor, by monotone bisection with the centres fixed.

**Effect.** Where a section's bottom is flat at the sole, this reproduces the frozen "r above the sole". At the toe it places the centre above the physical (sprung) toe-box bottom, as the frozen text says ("r_t above the toe sole"). Thigh / shank are unchanged.
