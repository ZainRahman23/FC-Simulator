# The smallest G4 experiments: design and proposed pre-registered criteria (pre-G4 runway, item 7): DESIGN ONLY, NOT IMPLEMENTED

**Status:** proposal for your approval. **No G4 code exists or was started.** Repeated walking is not designed.

## Is "lift → hover → replace" the best first experiment? Yes, with one refinement

**Why it is the right first experiment:**
- The interface audit (`G3_G4_INTERFACE_AUDIT.md`) shows that every high-severity hazard sits at **contact loss, airborne-leg control and contact reacquisition / load acceptance** (H1–H3, H5, H7, H9). That is exactly what lift–hover–replace exercises.
- It does so without a moving foothold, so a failure is attributable to the boundary itself, not to reach, swing timing or a new support geometry.

**Why the alternatives are worse first steps:**
- **A heel-off / toe-contact unloading (no contact loss):** useful for the partial-contact hazard (H5), but it does not test true single support, and G3 U already holds an unloaded foot in contact.
- **A short step:** it adds foothold choice, reach, swing trajectory and new-support geometry at once. That is E2.

**Refinement:** run E1 in two amplitude stages, which share all criteria:
- **E1a:** lift 5 mm, hover 0.5 s;
- **E1b:** lift 20 mm, hover 1.5 s, plus the perturbation set.

E1a tests the boundary with the least dynamics. E1b tests that the airborne leg is actually controlled. **E1b may run only after E1a passes.**

**Prerequisite decisions** (E1 cannot be meaningful without them):
- the posture twist policy (swing-foot yaw, H10; `TWIST_MECHANISM_AND_POLICY.md`);
- whether an ankle law is part of the plant (it changes the swing-foot dynamics);
- approval of the new controller components listed under "Components E1 needs".

## E1: stance → transfer → unload → lift → hover → replace (same foothold) → load acceptance → recover

**Script** (per body × side; times are proposals, fixed before running):
1. **Stance:** quiet bilateral 1 s.
2. **Transfer:** λ → 1.0 (stance side) over 4 s, the G3 U profile.
3. **Unloaded settle:** ≥ 1.0 s with swing-foot load ≤ 2 % BW (G3 F2's limit), contact kept.
4. **Lift:** swing-foot target rises to h = 5 mm (E1a) or 20 mm (E1b), minimum-jerk over 0.3 s, at the lift-off pose (position + yaw).
5. **Hover:** E1a 0.5 s / E1b 1.5 s.
6. **Replace:** minimum-jerk descent over 0.3 s to the **lift-off pose**; contact detection; **load acceptance** as a continuous blend over 0.1 s (gains, target, load share).
7. **Return:** λ → 0.5 over 4 s.
8. **Quiet:** 3 s.

**Proposed pass criteria** (all must hold on every body variant, both sides, the nominal run and the perturbation set):

| # | criterion | measured by | proposed limit |
|---|---|---|---|
| S1 | no fall, no step, no relocation | G2 / G3 outcome; stance-foot slip | stood / recovered; stance slip ≤ 2 mm; no stance-foot contact-piece loss |
| S2 | **true single support** happened | swing-foot touching pieces and sensed normal load | 0 pieces **and** load = 0 for ≥ 80 % of the hover |
| S3 | hover accuracy | swing-foot pose vs target | height ±2 mm (E1a) / ±3 mm (E1b); horizontal drift ≤ 5 mm; yaw drift ≤ 2° |
| S4 | stance-foot support | CoP vs usable region, XCoM margin | CoP inside the stance region; ξ margin ≥ 1 cm (as G3 E2 / F2) |
| S5 | **touchdown at the same foothold** | swing-foot pose at first contact and after acceptance | ≤ 5 mm, ≤ 2° from lift-off; no slide > 2 mm during acceptance |
| S6 | **smooth reacquisition** (the H3 hazard) | commanded torque, per-tick change; load flag transitions | no one-tick change > 10 N·m on any axis (stance baseline ≈ 0.5); ≤ 1 support / unloaded transition per contact event (no chatter) |
| S7 | impact | swing-foot normal load in the first 50 ms after contact | ≤ 25 % BW, and no rebound (contact kept once ≥ 2 % BW) |
| S8 | load acceptance and return | λ tracking as G3 B / C; end state as G3 T-rows | RMS and end-state limits of G3 v3.3 rows B / C |
| S9 | energy / passivity / contact validity | G1 1.2e, 1.4k, 1.4m / n; G3 L ledger | no 1.2e flag at 240 Hz; ledger residual ≤ +0.5 J; teleport ≤ 5 mm; turf validity |
| S10 | **symmetry** | J2a-style probe of every new controller component | mirror-equivariant to the floor-derived tolerances (v3.3 J2a rule) |
| S11 | determinism | ×3 runs; snapshot / restore mid-hover; browser = Node | bit-identical |
| S12 | morphology | all 8 bodies | all pass; no per-body tuning |
| S13 | perturbations (E1b only) | thorax push 5 N·s × 8 directions at mid-hover; 2 N·m shank torque on the swing leg | recover. If the stance foot cannot hold, the **single-support abort** (put the swing foot down at the nearest anatomically and statically valid foothold, H9) engages, and that counts as a pass **only if** the foot lands within the usable-region criteria of S5 |

**Report-only:**
- swing-leg joint torques and saturation; twist angles of both legs;
- hover-foot oscillation spectrum;
- stance-leg twist (the limit cycle must not appear: twist-mode amplitude at 3 s after replacement ≤ 1°);
- the time from contact to 50 % load.

**Failure classes to record:** abort engaged, fall, relocation, chatter, torque step, hover drift, missed touchdown, rebound.

**Components E1 needs** (design scope for approval; from the audit):
- a swing-foot state with an explicit trajectory target and inverse-dynamics feed-forward (H1, H2, H11);
- continuous load acceptance (H3, H12);
- contact-patch support geometry during partial contact (H5);
- stance-only single-support references: heading, balance midpoint, pelvis height (H6–H8);
- a single-support abort (H9);
- a swing-foot yaw policy (H10);
- a self-contact guard on the load sensor (H4).

## E2 (after E1 passes): transfer → lift → short reachable swing → touchdown → load acceptance → recover

**Foothold:**
- a **ground-level, foot-yaw-0 target 10 cm anterior** of the lift-off pose for the swing foot (E2a), then a 10 cm lateral step (E2b);
- every target **pre-checked L2-anatomical with ≥ 5° margin on every axis** (the proposed contract), at the pelvis height the plan uses.

**Note:** at standing pelvis height, a 15 cm ground-level forward foothold is already beyond full extension for most bodies (reachability study). E2 therefore needs either step length ≤ 10 cm or a planned pelvis drop / knee-flexed stance, which is decided in the E2 pre-registration.

**Script:**
1. as E1 to the lift;
2. swing along a minimum-jerk path with ≥ 15 mm clearance at mid-swing over 0.5 s;
3. touchdown at the target;
4. load acceptance (blend 0.1 s);
5. λ → 0.5 on the **new** foot pair over 4 s;
6. quiet 3 s.

**Additional criteria over E1:**
- **touchdown at the target:** ≤ 10 mm, ≤ 3°;
- **new support:** the stance width / heading the plan intended; the COM settled inside the new support (ξ margin ≥ 1 cm);
- **reachability consistency:** the planned target was L2 with the stated margin, and the executed joint path stayed inside the anatomical hard limits (no beyond-limit IK solve before touchdown; cf. the G4 IK limit audit);
- **swing clearance:** no toe-turf contact during the swing;
- all E1 criteria S1, S4, S6–S12, re-scoped to the new foothold;
- **perturbations:** E1's set applied at mid-swing.

**Not designed here:** repeated stepping, walking, turning steps (these need the yaw-sharing rule), running.
