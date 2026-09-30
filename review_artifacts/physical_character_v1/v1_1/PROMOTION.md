# V1.1 integration and promotion checkpoint (2026-09-30, overnight runway)

**Result:** V1.1 is **promoted** as the working physical-character foundation (`WORKING_CALIB = "V1.1"`, pc_body.js). Runners and the harness now default to it.

V1 and every piece of historical evidence stay reproducible with `--calib V1`. Every approved Gate A–C2 test was re-run after all the changes below and is identical to the approved hashes: A 5/5, B 20/20, C1 59/59, C2 13/13. The anatomy of V1.1 is the one reported in `ANATOMY_V1_1_REPORT.md`; nothing anatomical changed here.

## What had to change, and why (problem → cause → fix)

All controller changes are options of the **V1.1 working controller** (`controllerProfile(spec)` in pc_balance.js). V1 runs the approved controller, so the V1 hashes cannot move.

### A. C2 weight transfer — the planned, physically bounded unloading (`unloadPlan`)

**Problem.** With the approved controller, no V1.1 transfer lifted off: the swing foot kept 85 N against the unchanged 38 N gate.

**Cause.** Double support is statically indeterminate: the joint torques decide how the ground reaction is split between the feet. The approved split minimises summed ankle effort, and in a transfer that keeps 4–8 % of the weight on the foot being unloaded. V1 lifted off only because of an accidental +6 mm medial CoP bias (anatomy report §9).

**Fix, in three parts:**
1. **Unloading.** During TRANSFER the support layer schedules an **upper bound** on the unloading foot's commanded share: from its measured share at the start of the transfer to 0 at the end (min-jerk). The balance controller (`split2u`) takes, among the distributions that reproduce the demanded CoP p* exactly, the least-effort one within the bound. The share can never fall below the **physical minimum**: the smallest share for which p* is realisable with the stance CoP inside the stance foot's contact polygon, (1 − a)·A ⊕ a·B ∋ p*, found exactly by convex-polygon clipping. So the swing foot is unloaded only as the COM/ξ state lets the stance foot carry the whole demand.
2. **Liftoff gate.** Unchanged thresholds (5 % BW, ξ ≥ 2 cm inside the stance sole, |v| ≤ 8 cm/s, 50 ms), plus one new, stricter condition: holding ξ over the stance foot alone may need at most **80 % of the stance ankle's finite torque** on each axis.
3. **Load acceptance.** The mirror case appeared in acceptance. A forward-inward diagonal placement settled balanced and flat, but at 34 % BW, just under the 35 % acceptance criterion (unchanged). The approved preload and split are kept while ξ travels. After ξ_ref arrives, the landed foot's lower bound rises to the even split the double-support reference implies, over 0.5 s, and never above what physics can realise. Ramping that floor *with* the transfer was tried and rejected: it pushed both CoPs to the sole edges, saturated the ankles and destabilised a narrow inward placement. That matches the earlier C2 lesson that a foot cannot be loaded before the COM moves toward it.

**Exposed on the way (fixed):** a foot at 0 N hovers. When it lost contact, C1's "re-plant" pressed it 4 mm into the turf, which re-loaded it by up to 190 N and reset the liftoff gate. The foot a planned transfer is unloading is now held at its anchor height and not pressed.

### C. Physically useful reach (`reachAll`, `ankleReach`)

**Problem.** V1.1's 30° dorsiflexion lets the feasibility planner admit longer steps: 26 cm forward vs V1's 18 cm. Forward placements from 22 cm up lost balance in acceptance.

**Cause (measured, not assumed).** Touchdown itself was clean (landing knee 26° flexed at touchdown in every case). Two things went wrong afterwards:
- **The landed foot bounced off.** The foot left the turf and dropped out of the pelvis-height reach check (it was no longer "stance"). The pelvis rose 7 cm back to nominal, the straight front leg could not reach the ground, and acceptance moved ξ toward a foot that was not there.
- **Inconsistent pelvis height.** The pelvis height took the reach limit of the pelvis's *present* position and the rear ankle's dorsiflexion limit at its *goal* position at the same time. Right after touchdown the rear ankle's future dorsiflexion lifted the pelvis above the height at which the front leg could reach its foot *now*.

**Fix — a consistent pelvis-height band per pelvis position:**
- The band's upper edge is the lowest height every *intended* foot contact still reaches at 99.5 % extension. Intended contacts are: stance feet where they are, swing feet at their touchdown point, and feet being re-planted at their anchor.
- The band's lower edge is where a stance ankle comes within 5° of its dorsiflexion stop.
- The target lies in the band of the present position; anticipation of the goal only moves it within that band.
- The feasibility planner also checks both ankles' dorsiflexion at the resulting double stance. It did not bind in any test, but it is the correct constraint.

**Validation of useful reach.** Every point was checked with the actual body and controller, all runs deterministic, on six measures: outcome, acceptance ξ margin, touchdown landing error, landed-foot bounce, joint-limit margin, and knee / ankle-pitch / hip-pitch saturation.

- **Forward sweep, 14–30 cm:** every step up to the planner's anatomical limit (26 cm) is accepted with no bounce and an acceptance ξ margin ≥ 7.4 cm. Before the fix, 22–26 cm bounced for 0.5–1 s or fell.
- **Boundary in 12 directions (right foot), plus 4 mirrored (left foot):** every placement at the planner's boundary is accepted with no bounce, ξ margin ≥ 7.3 cm and limit margin ≥ 1.9°.
- **Reachable envelope (right foot, from quiet stance):**
  - forward 26 cm;
  - backward 18 cm;
  - outward 8.3 cm;
  - diagonals as in `analysis/c2_sweep.mjs` output;
  - inward and crossed placements projected as in V1, without a minimum stance width.

Outward reach is short because the swing hip reaches from a pelvis held over the stance foot, and V1.1's hips are anatomically narrow. That is anatomy plus quasi-static stepping, not a controller artefact.

### B. Gate A fixtures

- **Drop E is the only V1.1 initial condition that was invalid:** the angles authored for V1's 11 cm higher shoulder start the right forearm 112 mm inside the head. It is re-authored for V1.1 only (`DROPS.E.jV11`, `dropParams`) as the smallest change found by search: elbow 100 → 80°, shoulder unchanged. The hand stays within 9.3 cm of the V1-authored position and the initial energy is 1134.5 vs 1135.0 J. Now: self-contact 3.4 mm, joint separation 2.6 mm, hard limit 2.5°, pop 1.6 mm, E+ 0.
- **Drop A (valid start) is a genuine finding, reported, not tuned.** V1.1's passive collapse reaches the knee flexion stop with 341 J of kinetic energy (V1: 155 J). The feet go 7.7 mm into the turf and the contact position correction returns **+12.8 J in one step** (V1: 2.6 J). Energy keeps falling overall and the body settles. The solver configuration is shared with V1, so it was not changed.
- **Drop B (valid start) is a genuine finding.** Lying on the right side with the right arm overhead and the forearm pinned under the body, the shoulder's combined twist + extension limit yields up to **16.4°** transiently at t ≈ 1 s (V1: 5.6°). It settles to the same resting configuration as V1: 1.2° beyond the limit vs 0.6°.

## Results on the promoted foundation

| gate | V1.1 result | vs V1 |
|---|---|---|
| A (5 drops, ×3) | all deterministic. Turf ≤ 11.9 mm, joint separation ≤ 5.0 mm, hard limit ≤ 2.6° except drop B 16.4° (transient). E+ ≤ 1.1 J except drop A 12.8 J (collapse). | drop A/B findings above |
| B (all 20; A, C, E, F_chest ×3) | comparable or better. C error 6.1 → 2.8°, pelvis end 66 → 11 mm. | B case self-contact 0.5 → 5.4 mm. Blocked-limb E: hip saturation 17 → 39 % while blocked. |
| C1 (all 59; 12 ×3) | 8 STOOD, 37 RECOVERED, 14 FELL | no outcome regressions. PR50, DR45 and S_weak_PR40 now RECOVER (V1 fell). |
| C2 (all 14 ×3, working controller) | 13 DONE (J_repeat 6/6), I_block FAILED_BLOCKED by design, all upright | V1: J_repeat 5/6. G_far / H_uneven now place the anatomically longer steps. |

- **Determinism:** 35/35 V1.1 comparison rows reproduce ×3.
- **Browser = Node:** 38/38 (`promotion_crossruntime.txt`).
- **CPU:** ≈ 1.0–1.4 ms per 60 Hz frame in C2 (4 physics steps at 240 Hz + sensing + controller, Node).

## Known limitations carried forward

- **Hip twist saturation.** The hip's twist axis (the femoral mechanical axis, 4.3° off vertical) sits at its 25 % budget floor (15 N·m) during transfers and acceptance. It saturates but has not caused a failure.
- **Stance ankle roll saturation.** The stance ankle's roll (inversion/eversion, 35 N·m) saturates during lateral weight transfers. This is real motor authority limiting transfer speed.
- **Touchdown speed.** The swing foot arrives with 0.4–0.6 m/s of horizontal velocity, as in the approved V1 C2.
- **Quasi-static stepping.** All C2 placements are quasi-static: the COM is held over the stance foot during the swing. Stepping *with* the body's momentum is C3's subject.

## Reproduce

```
node tools/gatec2_run.js --tests all --repeat 3                      # V1.1 working (default)
node tools/gatec2_run.js --calib V1 --tests all                      # the approved V1 evidence
node tools/gatec2_run.js --calib V1.1 --ctrl approved --tests all    # V1.1 anatomy + the approved controller (historical "raw")
```

The evidence is in `json/promotion/`.
