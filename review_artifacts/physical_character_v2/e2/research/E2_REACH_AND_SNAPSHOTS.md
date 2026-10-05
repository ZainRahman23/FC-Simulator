# E2 planning prerequisites: body-specific reach and the four STEP_REQUIRED snapshots (planning-only; no physical E2 step)

**Tools:**
- `tools/e2_plan_audit.mjs`: a deterministic copy of the E1b harness that stops at the capture time and runs the audit in-process;
- `tools/e2_plan_lib.mjs`.

**Outputs:** `../evidence_planning/` (reach_*, snap_* = current law, snapDCM_* = DCM-plan law).

## 1. Kinematic reach (Touchline IK + certifier; per morphology and side)

**Method** (audit §3):
1. **Analytic rejection:** hip-to-foot distance > thigh + shank + 0.12 m.
2. **Landing geometry:** no overlap with the stance foot, gap ≥ 10 mm, no crossover (the centroid at least half a foot width outward of the stance foot).
3. **Bounded leg IK** in the **soft-limit** box, the E1a-10 convention.
4. If it fails, the **branch-and-bound certificate** (`tools/ik_cert_core.mjs`, rigorous Lipschitz bound, cap 200 000 cells): PROVEN-INFEASIBLE or UNDECIDED.
5. **Cells:** a 1 cm cell is a candidate only if its 4 corners **and** its centre are FEASIBLE and valid. No convex hull of samples.
6. **Swing path:** the nominal foothold's full path is certified at 11 samples. Planned steps use an explicit quintic with a 25 mm apex at α = 0.5; recovery runs from the hover pose with no apex.

**Pelvis frame:**
- **Planned steps:** the frame the controller used for the swing leg at mid-hover single support (E1b, PSTAR4).
- **Snapshots:** the frame at the end of the disturbance.

**Results:**

| corridor (offsets from the swing foot's anchor) | all 8 bodies × L / R |
|---|---|
| forward 0.07–0.13 m × lateral ±0.02 m (35 nodes) | **35 / 35 FEASIBLE; 24 / 24 candidate cells**; nominal (0.10, 0) and its swing path **certified** |
| lateral 0.05–0.11 m outward × fore-aft ±0.02 m (35 nodes) | nominal (0, 0.08) and its path **certified** everywhere. Feasible: 30 / 35 (most bodies), 28 / 35 (V2-short-legs), 34 / 35 (V2-long-legs). Every other node is UNDECIDED (never PROVEN-INFEASIBLE) at the far edge (0.11 m, plus 0.10 m for V2-short-legs) |
| snapshot region 0–0.20 m outward × ±0.03 m (V2-165-62, 4 snapshots) | feasible to 0.12–0.13 m outward (97–98 / 147 nodes, 77–78 / 120 candidate cells); UNDECIDED beyond; nominal (in place) certified |

**Kinematic and timed reach are kept separate.**
- §1 is kinematic only.
- Time / torque qualification is applied in the snapshot audit: the minimum swing time from the servo-bandwidth tracking bound, plus a torque check (`E2_TIMING_LOAD_ASSUMPTIONS.md` §4).
- **The final selected foothold and its swing path are re-certified online** in E2.

## 2. The four STEP_REQUIRED snapshots

**Snapshots:** V2-165-62 L 240 Hz, R 240 Hz, L 180 Hz, L 480 Hz, each at the end of the P15 disturbance + 1 tick.

**Planning primitive:** (foothold, touchdown timing, support / load-transition plan).

**Search:**
- footholds = every FEASIBLE node of §1;
- swing time T from T_min(d) to 0.60 s (0.01 s grid);
- ramp T_r ∈ {0.225, 0.2, …, 0.10} s.

**Model:** the validated capture model (`ctrl/v2_capture.js`, 32 / 32), with:
- the landing region translated to the candidate;
- explicit partial loading: support grows with s; realised-load lag 8 ms;
- the measured margins of `E2_TIMING_LOAD_ASSUMPTIONS.md` §3, applied by phase;
- touchdown delayed by 0.04 s;
- landing uncertainty from the base plus the bandwidth term.

**Robustness ranking:** the slack, i.e. the extra touchdown delay still tolerated. The best five candidates have their swing path certified.

| balance reference used in the model | result (all four snapshots) |
|---|---|
| **current controller** (ξ_ref from the λ-weighted centroids, λ return over 0.6 s from contact) | **NO_CERTIFIED_ONE_STEP.** No candidate with the measured margins; with no margins at all, only a 0.20 s swing / 0.10 s ramp from 3 cm outward |
| physical best case (CoP held at the realisable limit) | feasible with all margins from 3 cm outward (in place on 3 / 4) at T = T_min, T_r 0.10 |
| **DCM-plan tracking** (revised architecture: ξ_ref integrated forward from the measured ξ with the planned CoP at the margin-shrunk achievable limit, tracked by the existing law) | **CERTIFIED_ONE_STEP in all four.** Most robust: **4 cm outward, 1 cm back, swing ≈ 0.207 s, ramp 0.10 s, slack 53–64 ms**; swing path certified |

**What this establishes:**
- **One-step recovery of the four obligations is feasible in the planning model only with the revised DCM reference layer.** The current reference holds the CoP back while the λ return is slow.
- This is a planning prediction, not a validated outcome. The DCM layer's realisation is what E2 must show physically.

**Not certified by the planning model (must be checked physically in E2):**
1. **The old stance foot stays in contact (R-2).** The certified plan moves essentially all load to the landed foot; under the old controller that lifted this body's stance foot. The 1-D LIPM has no friction or unloading model.
2. Acceptance torque rate at the 0.10 s ramp for this (light) body: E1b-7 measured 4.96–11.07 N·m in the class-B PSTAR4 runs.
3. AP motion and the angular momentum (4.6 kg·m²/s) at the snapshot.

**The planning result for these four is CERTIFIED_ONE_STEP only under the DCM-plan law.** Under the existing reference it is NO_CERTIFIED_ONE_STEP, which, as the audit states, does not mean physically impossible.
