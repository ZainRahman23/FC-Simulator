# Touchdown coordinator TD2: terminal-approach / contact-search design study (offline; no physical test of any candidate)

**Authority:**
- `../sources/2026-10-07_user_decision_overnight_runway_coordinator.md`: do not adopt 1A, reject 1B, proceed from the qualified AB baseline. "Compare a finite set of candidate trajectory structures offline and reject infeasible ones before physical testing. Select the simplest evidence-supported design."
- `../sources/2026-10-06_user_decision_1A1B_touchdown_timing.md`, Decisions 2 – 7: the touchdown architecture, the bounded contact search, possible-contact geometry, measured contact / accommodation, timing priority and the metric.

**Baseline:** PSTAR5CHAB (A + B), qualified under AB2. 1A / 1B are not adopted; their code stays default-off and unused.

**Evidence used:** only records that already exist:
- the frozen FB battery's AB records (PSTAR5CHAB, 432 runs, 8 bodies × 2 legs × 180 / 240 / 480 Hz × 9 trajectories; `evidence_fb/`, records in the run scratch);
- the A + B uncertainty inputs of `TOUCHDOWN_COORDINATOR_DESIGN_STOP.md` §2;
- the coordinator-draft smoke runs (`evidence_td_design/`).

Scripts and outputs: `evidence_td2_design/`.

## 1. What the AB baseline does at touchdown (the problem to solve)

From the 432 AB runs: the potential-contact sole points at the last contact-free tick (speeds pooled over 180 / 240 / 480 Hz; per rate in `evidence_td2_design/ab_touchdown_profile.txt`), and the contact window [t1, t1 + 100 ms]:

| quantity | median | max | E2 criterion |
|---|---|---|---|
| downward speed (mm/s), R / C / H | 59 / 60 / 77 | 76 / 76 / 122 | E2-5 ≤ 150 |
| **tangential speed (mm/s), R / C / H** | **46 / 31 / 50** | **53 / 73 / 91** | **E2-5 ≤ 50 (foot velocity)** |
| instantaneous load peak (% BW), 180 / 240 / 480 Hz | 22 / 28 / 32 | **43 / 45 / 60** | **E2-5 ≤ 25** |
| load peak inside the first 12 ms (% BW), 180 / 240 / 480 Hz | 2.9 / 2.8 / 1.7 | 43 / 9 / 5 | — |
| contact-transition E1a-7 violating runs, R / C / H | 6 / 0 / 8 of 96 / 144 / 192 | — | E2-9 |

**Mechanism of the load peak** (`evidence_td2_design/`, V2-198-92 L 240 H-D):
- The first touch is an edge contact (4 pieces, tilt 0.18°).
- The foot then pivots about that edge at up to 0.34 rad/s, driven by the leg's continuing ≈ 50 mm/s descent.
- About 17 ms later it **slaps flat**: 35 % BW in one tick.

The peak correlates with the pivot rate (r = 0.63 – 0.70) more than with the normal speed (r = 0.33 – 0.45). The first-contact impact itself is small.

**Why the tangential speed is high:** contact occurs at φ ≈ 0.91, while the swing reference is still moving horizontally.

The AB touchdown therefore violates Decisions 2 – 4:
- tangential motion is not complete before possible contact;
- the approach is not low-speed;
- the contact-transition continuity is not clean.

## 2. Candidate trajectory structures (finite set) and offline verdicts

| # | structure | offline verdict |
|---|---|---|
| C0 | E2 baseline: the goal on the turf at T, contact in the final descent at the reference's speed, hand-back from the moving reference | **rejected:** §1 (the measured AB behaviour) |
| C1 | corridor approach inside T = 0.6 s (the stopped draft) | **rejected:** no C2 final approach satisfies tangential completion, low speed and the validated jerk envelope together (`TOUCHDOWN_COORDINATOR_DESIGN_STOP.md` §4, `evidence_td_design/`) |
| C2 | **band-top approach + bounded search:** the validated E2 swing segment to the foothold **raised by the possible-contact band height h_B**, ending at rest at T with tangential motion and orientation complete; then a rest-to-rest search in the terrain-normal coordinate only, depth and duration derived (§3), until measured contact | **feasible:** §2.1 |
| C3 | C2 with a longer nominal swing (Decision 6, priority 2) | not needed: C2 satisfies the certified approach at T = 0.6 s |
| C4 | C2 with an earlier apex (Decision 6, priority 3) | not needed. The certifier is not shown to need a different allocation, and the approach is already inside the validated envelope |
| C5 | band-top hover with no search (touchdown by the clock) | **rejected:** contact is never guaranteed; contrary to Decision 2 ("measured Jolt contact, not the nominal clock") |
| C6 | C2 with a constant-speed creep (trapezoid) instead of a rest-to-rest quintic | **rejected:** non-C2 velocity corners (jerk impulses); the quintic is the smoothest single segment with the same bounds |

### 2.1 C2 is the validated swing, shifted (`evidence_td2_design/approach_kinematics.txt`)

The approach segment was rebuilt from the **measured** liftoff reference states and goals of all 144 AB 240 Hz records, with the goal raised by h_B = 2.05 mm. The apex rule is unchanged (max(start, goal) + 30 mm, H-A40 40 mm, at T / 2) and T is unchanged.

| set | max acceleration, horizontal / vertical (m/s²) | max jerk, horizontal / vertical (m/s³) | late descent (h ≤ 11.06 mm): \|a_V\| / \|v_V\| / \|j_V\| | foot height above the turf at φ 0.8 |
|---|---|---|---|---|
| R | 1.59 → 1.59 / 2.12 → 2.13 | 27.5 → 27.5 / 42.9 → 42.5 | 1.51 → 1.48 / 0.163 → 0.151 / 42.9 → 42.5 | 7.05 → **8.99** mm |
| C | 2.07 → 2.07 / 2.12 → 2.13 | 35.8 → 35.8 / 42.9 → 42.5 | 1.51 → 1.48 / 0.163 → 0.151 / 42.9 → 42.5 | 7.05 → 8.99 mm |
| H | 2.83 → 2.83 / 3.85 → 3.86 | 65.2 → 65.2 / 103.6 → 102.5 | 2.71 → 2.67 / 0.219 → 0.203 / 103.6 → 102.5 | 7.05 → 8.99 mm |

**Reading:**
- Every kinematic peak is equal or slightly lower (the descent is 2.05 mm shorter).
- The approach therefore stays inside the conditions under which A + B were validated.
- The clearance at the certificate's binding point gains 1.94 – 1.96 mm.
- Tangential motion and orientation are complete at T by construction, before the band.

**Not covered offline:**
- **The hover / search region is new:** φ 0.91 – 1.0 at rest, and the search. Decision 4: it is qualified by the validation (§4 of the prereg: the premise gate and the reported per-phase deviation). The late-descent uncertainty is not extrapolated into it.
- Pelvis motion during the hover is physical; the validation measures it.

## 3. C2 parameters, derived jointly from Touchline's own quantities (no donor constants)

**Inputs:**

| input | value | source |
|---|---|---|
| downward lowest-point uncertainty u_dn | 1.53 mm | A + B, φ ≥ 0.75 → contact, all sets |
| upward uncertainty u_up | 0.305 mm | A + B |
| contact-report margin d_c | 0.5 mm | a turf manifold point at ≤ 0.5 mm separation counts as touching |
| terrain / contact uncertainty Δ_T | 0.05 mm | measured spread of the resting lowest boot point over 432 AB runs: 0.012 mm (anchor and landed), rounded up to the SV-2 0.05 mm step |
| late-descent validated domain | \|a_V\| ≤ 2.6324, \|v_V\| ≤ 0.2169, \|j_V\| ≤ 49.46 | A + B |
| lowest rate | 180 Hz | E2 rates |
| E2-5 | normal ≤ 0.15 m/s; contact-point normal-velocity uncertainty 0.0375 m/s | E2 preregistration; A + B |
| E2-5 impact | ≤ 25 % BW, the frozen instantaneous metric | E2 preregistration |
| late-contact hold | 0.3 s | E2 §2a, `FS.lateHold` |

**Derivation:**
- **Band height h_B** = ⌈u_dn + d_c⌉ (0.05 mm) = **2.05 mm**. Below the band top the actual sole can be reported touching. The approach must not enter the band before the search.
- **Depth D_max.** The search descends until contact is guaranteed for nominal terrain: the reference lowest point at d_c − u_up = 0.195 mm, less Δ_T. D_max = ⌈h_B − (d_c − u_up) + Δ_T⌉ = **1.95 mm**, so the search ends 0.10 mm above the foothold. No contact by then means the terrain is not where it is certified, and the search escalates.
- **Duration τ_s** of the rest-to-rest quintic over D_max, the largest of:

  | constraint | rule | τ |
  |---|---|---|
  | validated late jerk | (60 D / 49.46)^⅓ | 0.133 s |
  | validated late acceleration | √(5.77 D / 2.63) | 0.065 s |
  | validated late speed | 1.875 D / 0.217 | 0.017 s |
  | contact reported before force, 180 Hz | 1.875 D / (d_c · 180) | 0.041 s |
  | E2-5 normal speed with uncertainty | 1.875 D / 0.1125 | 0.033 s |
  | **E2-5 impact** | 1.875 D / v_imp | **0.147 s** |

  **v_imp** is the largest normal contact speed whose predicted instantaneous load stays ≤ 25 % BW. It comes from the AB records' through-origin bound load / speed at the strictest rate (480 Hz: 10.08 BW per m/s), giving 24.8 mm/s.

  **τ_s = 0.150 s**, rounded up to 5 ms. Peak speed 24.4 mm/s; peak acceleration 0.50 m/s²; jerk 34.7 m/s³ (all inside the validated late domain).
- **Time check:** τ_s ≤ 0.3 s (late hold). With nominal tracking, contact occurs when the reference lowest point reaches d_c: depth fraction 0.795, so **τ_c = 0.1005 s** after T, at 19 mm/s.

  Contact-time spread with the tracking uncertainty:
  - foot below the reference by u_dn → contact at the search start, ≈ 0 mm/s;
  - foot above by u_up → contact near the end, ≈ 4 mm/s.
- **Planned touchdown for balance / planning prediction (Decision 6):** liftoff + T + τ_c.
- **Escalation:**
  - no contact by the end of the search → hold the search-end pose;
  - no contact by the planned touchdown + 0.3 s (the unchanged late-contact rule) → failed touchdown and the existing re-plan;
  - in the validation harness, release to the lifecycle hold, a physically feasible continuation; no contact is declared.

## 4. Selected design: C2 ("TD2")

It is the simplest evidence-supported structure:
- it changes the commanded reference only: the approach goal plus h_B, then one quintic in one coordinate;
- it reuses the validated swing, E2's existing acceptance / hand-back / late-contact rules and the lifecycle's validated contact hold and load acceptance;
- it adds no new control mechanism.

**What it is predicted to fix:**
- tangential speed at contact → ≈ 0, since tangential motion completes at T;
- normal contact speed ≤ 24 mm/s;
- the pivot slap scales with the leg's descent speed at contact, reduced ≈ 3× vs AB;
- the commanded-rate demand at contact → the search's (≈ 2 N·m / tick) plus pelvis motion, against the AB approach's 36.6 / 40 at 180 Hz.

**What it does not fix:**
- the pelvis motion inherited from the swing;
- the a-blend transition of the lifecycle (unchanged). With the foot nearly at rest at contact, its product terms are small; the validation gates it.

**Open risk, measured by the validation:**
- the hover-region deviation;
- the pivot slap at 480 Hz, where the through-origin bound is the binding constraint;
- E1a-7 at the transition, now gated with zero tolerance over the possible-contact interval.
