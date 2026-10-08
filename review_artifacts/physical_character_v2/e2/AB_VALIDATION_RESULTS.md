# A + B factorial validation: DOES NOT VALIDATE → STOPPED at stage 2

**Authority:** `../sources/2026-10-06_user_decision_AB_touchdown.md`.

**Preregistration:** `AB_VALIDATION_PREREG.md`, frozen in 54629de [published as 1a65417] before any battery run. The battery ran on that commit from a clean archived tree.

**Evidence** (`evidence_ab/`):
- `ab_eval_summary.txt`, `ab_eval.json.gz`;
- `logs/run_logs.tgz`;
- `records_240_REF_165/`;
- `identity/`.

All 1,728 runs present; 0 runtime reachability exclusions.

**Stop rule applied:**
- no touchdown handoff;
- no downstream value tuned;
- no criterion changed;
- A and B stay default-off, PSTAR5CHA / CHB / CHAB unused outside this battery;
- T-1 frozen; 30 mm apex unchanged; recovery C untouched.

## 1. Verdict per item

| item | result | detail |
|---|---|---|
| **AB-1** T-1 frozen (\|β\| ≤ 0.25 per id) | **PASS** | AB β −0.106 … 0.084, all 9 ids. BASE fails C-F7 0.261 and C-L5 0.276, reproducing SV-2 |
| AB-2 / AB-3 tracking / rate stability | PASS | |
| **AB-4a** no E1a-7 violation in the swing | **FAIL (1 run)** | V2-198-92 L 180 Hz R-L: commanded Δτ0 40.6 N·m (limit 40) at 2 ticks before contact |
| **AB-4b** no regression in runs with E1a-7 violations | **FAIL (set R)** | R 0 → 6 (all V2-198-92 R-L, both legs, every rate). C improves 10 → 0, H improves 36 → 8 |
| AB-4c weight continuity | PASS | |
| AB-5 energy (R, C) | PASS | Σ+ max 0.165 J (BASE 0.152) |
| AB-6 orientation (≤ 0.5 × BASE) | PASS | mean tilt 0.06–0.15° vs BASE 0.65–1.14° |
| **AB-7** vertical β_y (AB and A ≤ 0.5 × BASE) | **FAIL (R-L)** | R-L: AB 0.130 / A 0.133 vs required ≤ 0.123 (BASE 0.246), a 47 % reduction. Every other R / C id passes |
| AB-8 binding-window clearance | PASS | worst −1.60 → −0.60 mm (≥ −0.80) |
| AB-9 reach and soft-limit margin to contact | PASS | min margin 0.65° (C-L5; BASE 0.9°) |
| AB-10 rate stability of tilt and bin | PASS | |
| I-1, I-4 … I-7 | PASS | H-set I-6, reported: BASE 78 → AB 32 runs |
| L-1 ledger closure / L-2 B placement | PASS | closure ≤ 3.6·10⁻¹⁵; B only on ankle axes with c > 0, max 0.28 N·m |
| G-3 identity before the step command | PASS | |
| **C-1** T-1 collapses for the predicted reason | **PASS** | C-F7 0.261 / −0.028 / 0.265 / −0.029; C-L5 0.276 / 0.086 / 0.277 / 0.084 (BASE / A / B / AB) |
| C-2 orientation is M2's | PASS | B removes 90–95 % of tilt; A leaves it within ± 25 % |
| C-3 vertical is M1's | PASS | B leaves β_y within ± 0.002 |

**Per trajectory (BASE → AB):**

| id | β (T-1) | β_y | mean tilt (°) | worst d_low [0.75, 0.80] (mm) | contact φ |
|---|---|---|---|---|---|
| R-F | 0.212 → −0.066 | 0.378 → 0.126 | 0.82 → 0.10 | −1.11 → −0.41 | 0.886 → 0.911 |
| R-L | 0.232 → 0.080 | 0.246 → 0.130 | 0.83 → 0.07 | +0.10 → −0.14 | 0.908 → 0.920 |
| C-F7 | 0.261 → −0.029 | 0.361 → 0.121 | 0.67 → 0.08 | −0.75 → −0.29 | 0.892 → 0.917 |
| C-F13 | 0.174 → −0.091 | 0.404 → 0.131 | 0.99 → 0.13 | −1.60 → −0.60 | 0.880 → 0.906 |
| C-L5 | 0.276 → 0.084 | 0.283 → 0.122 | 0.65 → 0.06 | 0.00 → −0.09 | 0.904 → 0.919 |
| H-T45 | 0.072 → −0.047 | 0.212 → 0.097 | 0.84 → 0.11 | −0.35 → −0.56 | 0.896 → 0.909 |
| H-A40 | 0.241 → −0.023 | 0.343 → 0.123 | 0.89 → 0.11 | −1.09 → −0.46 | 0.894 → 0.918 |
| H-D | 0.179 → −0.039 | 0.258 → 0.146 | 1.14 → 0.12 | −0.90 → −0.56 | 0.893 → 0.908 |
| H-F15 | 0.154 → −0.106 | 0.426 → 0.134 | 1.12 → 0.15 | −2.01 → −0.79 | 0.874 → 0.901 |

**Per-bin worst d_low (R + C):** BASE −3.64 … −0.02 → AB −1.75 … +0.17 mm at φ 0.20 … 0.75, and −1.60 → −0.60 mm at φ 0.75 – 0.80.

## 2. Diagnosis of the failures (no change made)

### F-AB1 (AB-4a, AB-4b): commanded-torque continuity at the touchdown transition

**Where:**
- All 7 violations are the **commanded** torque change Δτ0, never the applied torque.
- They fall within −2 ticks … +5 ticks of measured contact, on the heaviest body V2-198-92, R-L, both legs, every rate.
- 40.6 / 30.2 / 15.9 N·m against 40 / 30 / 15. The ratio to the rate-scaled limit is nearly constant, so this is a steady command rate of about 7.3 kN·m/s around contact, not a discontinuity.

**What:** the ledger shows the swing hip's flexion-axis **velocity feed-forward** (D + dt·K)·ω* carries 80–90 % of the change. Two terms drive it at the transition:
- after TOUCHDOWN the airborne weight a decays, so the hip's servo damping D blends from the swing value toward the stiffer contact-hold value, multiplying ω*;
- ω* itself changes as E2's hand-back segment (from the still-moving reference state) takes over.

**Baseline and A:**
- BASE already reaches 24.6 N·m / tick at 240 Hz (82 % of the limit) at the same instant.
- A puts the full measured pelvis-motion rate into ω*, raising it to 28–30 N·m on this body and step.
- B alone (25.1) and the rest of the battery are unaffected.

**Classification:** the defect is in the touchdown transition: gain blend × velocity feed-forward, plus a hand-back starting from a moving reference. That is the transition the measured-contact touchdown coordinator (stage 4) is to replace. A makes the existing transition's commanded rate exceed the limit marginally on one body and step. The swing itself is clean: no violation earlier than 2 ticks before contact in any of the 432 AB runs.

### F-AB2 (AB-7, R-L): A is only partly active in early swing

**Mechanism:**
- A's weight is w_A = a · c.
- c is already 1 at liftoff: it ramps from the step command, about 0.12 s earlier.
- a, the lifecycle's airborne weight, ramps 0.02 → 1 over about 90 ms after the measured liftoff (φ 0 → 0.15). Measured on V2-REF L 240 R-L: a = 0.11 / 0.38 / 0.79 / 1.00 at φ 0.02 / 0.05 / 0.10 / 0.15.

**Pooled vertical β_y, 8 bodies × 2 legs × 3 rates:**

| | φ [0, 0.8] | φ [0, 0.2) | φ [0.2, 0.8] |
|---|---|---|---|
| R-L BASE | 0.246 | 0.461 | 0.196 |
| R-L A | 0.133 | 0.338 | **0.084** |
| R-F BASE | 0.378 | 0.406 | 0.372 |
| R-F A | 0.128 | 0.311 | **0.085** |
| C-L5 BASE | 0.283 | 0.428 | 0.249 |
| C-L5 A | 0.125 | 0.319 | **0.079** |

- Once A is fully weighted (φ ≥ 0.2), the vertical residual falls to the pinned-pelvis level (0.05–0.09). The remainder is in the first 90 ms after liftoff, while a ramps.
- R-L fails the relative criterion because its baseline β_y is smaller, especially late in the swing, so that early-swing remainder dominates.
- **This is consistent with the causal explanation (M1, C-1 / C-3 pass). The miss is A's airborne-weight ramp, not a different mechanism.**

## 3. Decisions needed (none taken; any change needs a versioned amendment and a fresh frozen battery)

1. **F-AB1, touchdown-transition continuity.** Options:
   - (a) accept that commanded-torque continuity *at* the transition is validated with the touchdown coordinator (stage 4), and bound A + B's own continuity criterion to the swing proper. The single swing-window case sits exactly on its 2-tick boundary;
   - (b) shape A + B through the contact transition themselves, e.g. tie the hip's velocity feed-forward to the same gain blend so their product changes smoothly. This anticipates part of the coordinator.
2. **F-AB2, A's early-swing weighting.** Options:
   - (a) keep w_A = a · c and accept the early-swing remainder, re-stating the vertical criterion per phase. This would be a new criterion; it cannot be applied to this battery;
   - (b) weight A by c and a faster, A-specific airborne ramp after the measured liftoff. This needs fresh stability evidence: the lift phase before liftoff is a contact regime, where the refuted `srAll` was unstable.
3. Whether to proceed to the touchdown coordinator with A + B as they are, given that T-1, orientation, clearance and every causal prediction pass.

Everything stays local.
