# E2 preregistration: criteria and test set (FROZEN FOR REVIEW; no E2 implementation or run yet)

**Architecture:** `E2_DESIGN.md`.

**Base:** PSTAR4 + the E2 options (`step`, `xiRef2D`, `recoveryStep`, plus the via-apex swing and capture-aware placement modules), together **configuration PSTAR5**.

**Order after approval:**
1. Implement default-off; KV0 and PSTAR4 hash identity.
2. Certify the reach octagons (procedure in `E2_DESIGN.md` §1).
3. A declared smoke run at a non-test step size.
4. **Freeze** the tools and this document's harness definitions.
5. The official run.
6. Results.

No criterion changes after any result. Failed runs are kept.

## 1. Test set

| set | runs | protocol |
|---|---|---|
| **S-F** forward step | 8 bodies × swing foot L / R = 16 | settle → transfer 4 s → release (TOUCHING ≥ 0.5 s) → swing 0.60 s to the foothold 0.10 m forward (same lateral position and yaw), apex 0.025 m → touchdown → λ return 4 s → 4 s quiet |
| **S-L** lateral step | 8 × L / R = 16 | as S-F, foothold 0.08 m outward |
| **S-RATE** | S-F and S-L × {V2-REF, V2-165-62, V2-198-92} × L × {180, 480} Hz = 12 | as above |
| **S-P** perturbed planned step | S-F × {V2-REF, V2-165-62, V2-198-92} × L × {lateral toward the swing side, forward} 5 N·s thorax push at 50 % of the swing = 6 | as S-F (capture adjustment active) |
| **R-B** recovery steps (E2 obligations from E1b) | the 4 STEP_REQUIRED cases: V2-165-62 L 240 / 180 / 480 Hz, R 240 Hz | the frozen E1b P15 protocol (20 mm lift, 1.5 s hover, 15 N·s toward the lifted side) with `recoveryStep` |
| **R-A** class-A regression | the 19 class-A P15 runs | unchanged in-place recovery (E1b closure must still hold) |
| **DET** | repeats of V2-REF S-F L and V2-165-62 R-B L 240 Hz | — |
| **W** browser = Node | V2-REF S-F L, V2-REF S-L R, V2-165-62 R-B L 240 Hz | hash identity |
| **E1** regression | E1a (10) and the full E1b closing set under PSTAR5 | E1a PASS; E1b closing evaluation PASS |
| **G** | G0–G3 battery with the PSTAR5 flags | V3.1 … V3.10 |

## 2. Criteria for planned steps (S-F, S-L, S-RATE, S-P)

| # | criterion | threshold (source) |
|---|---|---|
| E2-1 | transfer and release | stance share ≥ 0.95 and swing-foot load < loadOff (1 % BW) before the swing command; release only by the lifecycle (E1a-2 analogue) |
| E2-2 | **physical liftoff** | exactly one LIFTOFF → AIRBORNE of the swing foot, measured (turf-touching pieces 0 and load < 0.05 N), within 0.3 s of the swing command; none before the command |
| E2-3 | controlled swing | swing-foot error vs the commanded trajectory ≤ 5 mm RMS and ≤ 10 mm max during the swing; yaw error ≤ 2°; tilt ≤ 3°; lowest boot point ≥ 5 mm above the turf between 20 % and 80 % of the swing (no stub) |
| E2-4 | placement | at TOUCHDOWN, foot within **10 mm** (horizontal) and **2°** of the final commanded foothold. Undisturbed steps: no capture adjustment beyond the deadband |
| E2-5 | **measured touchdown** | exactly one TOUCHDOWN after ≥ 60 % of the swing; no bounce or chatter (E1a-6); impact peak ≤ 25 % BW (E1a-12) |
| E2-6 | load acceptance | LOAD_ACCEPT exactly once; s monotone to 1; landed-foot load fraction tracks the request within 0.10 from 1 s after the λ ramp ends (E1a-13) |
| E2-7 | stance integrity | stance-foot slip ≤ 1.0 mm and yaw ≤ 0.5° (E1a-4); the stance foot never leaves SUPPORT (no unplanned support change) |
| E2-8 | balance | ξ inside the stance region with ≥ 1 cm margin during the swing (E1a-5); no abort (S-P: no abort and no fall) |
| E2-9 | torque continuity | E1b-7: applied ≤ 10 N·m (25 in the 2 contact-onset ticks), commanded ≤ 30 N·m; RATE rule × max(1, 240/hz) applied, × 240/hz commanded |
| E2-10 | energy | E1a-8 (closure ≤ +0.05 J / tick, Σ+ ≤ 0.5 J, authority writes 0, external impulse = the scheduled push only) |
| E2-11 | capacity | E1a-9 (no over-capacity; saturation ≤ 5 % of swing ticks) |
| E2-12 | anatomical limits | E1a-10 (hard margin ≥ 0; swing-leg soft ≥ −2°; knee ≥ 0°) |
| E2-13 | final stable support | at the end: both SUPPORT; ξ within 1.5 cm of its target; pelvis yaw within 1° of its start; leg twists within 2° (E1a-14); new step length / width within **1 cm** of the command |
| E2-14 | knee envelope / path | E1a-16 / E1a-17 as frozen |
| E2-15 | determinism / portability | DET hash-identical; W browser = Node 3 / 3 |
| E2-16 | morphology | every S-F / S-L run on all 8 bodies and both sides passes E2-1 … 14 |

## 3. Criteria for recovery steps (R-B; the E2 obligations)

| # | criterion | threshold |
|---|---|---|
| R-1 | recovered by stepping | no fall; both feet SUPPORT at the end; classified **"recovered by stepping"** in the four-way report |
| R-2 | **no unplanned support change** | the old stance foot stays in contact (never AIRBORNE) and slips ≤ 5 mm (the E1b-18 slip value) |
| R-3 | capture-aware placement | the final commanded foothold lies in the IHMC capture region ∩ reach at the last adjustment (or the infeasible flag is raised, in which case R-3 fails); the landed foot within 20 mm of that foothold |
| R-4 | measured touchdown and acceptance | one TOUCHDOWN (measured), LOAD_ACCEPT on sustained contact only (TA-1), bilateral within 2 s of the abort |
| R-5 | integrity | E1b-7 (RATE rule), E1a-8, E1a-9 (P15 form), E1a-10 |
| R-6 | reach | the foothold is inside the body's certified reach octagon |

The R-A (class A) runs must still pass the E1b closing evaluation unchanged.

## 4. Four-way P15 reporting (unchanged categories)

recovered without changing foothold / step required / recovered by stepping / fell.

- Under PSTAR5 the 4 obligations must move from "step required" to "recovered by stepping".
- The class rule (T-A verdict at the end of the disturbance) is unchanged.

## 5. Decision rule

**E2 PASS requires:**
- every S-F / S-L / S-RATE / S-P run passes §2;
- every R-B run passes §3;
- R-A, DET, W, the E1 regression and G pass.

Any substantive failure → stop and report, no tuning. Mechanical tooling defects → erratum and re-evaluation on the same runs.
