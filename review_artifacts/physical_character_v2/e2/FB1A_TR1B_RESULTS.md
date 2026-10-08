# 1A / 1B validation: 1A DOES NOT VALIDATE (one item), 1B DOES NOT VALIDATE → STOPPED before the touchdown coordinator

**Authority:** `../sources/2026-10-06_user_decision_1A1B_touchdown_timing.md` ("Preregister and validate both corrections before using them to choose touchdown timing. If either correction fails substantively, stop.").

**Preregistration:** `FB1A_TR1B_PREREG.md`:
- design and criteria committed in d6d4868 [published as c4c7061], before any 1A / 1B code;
- implementation, tools and amendments A1 – A3 frozen in 452cc60 [published as 0150ce8], before any battery run;
- A3 recorded the smoke-based prediction that 1B-3 and 1B-5 would fail.

**Battery:** `scripts/run_fb_val.sh` on a clean archive of 452cc60 [published as 0150ce8]; 2,160 / 2,160 runs; 0 runtime reachability exclusions.

**Evidence** (`evidence_fb/`):
- `fb_eval_summary.txt`, `fb_eval.json.gz`;
- `fb1a_check.txt` / `.json`;
- `logs/run_logs.tgz`;
- `records_240_REF_198/` (V2-REF left, V2-198-92 both legs, 240 Hz, 5 configurations);
- `diagnostics/` (post-hoc, labelled).

**Stop rule applied:**
- the coordinator design is not frozen;
- no coordinator preregistration;
- no PG-1;
- no official E2;
- no E2-5 change.

**Unchanged:**
- 1A and 1B stay default-off; nothing uses them;
- every threshold, capacity and gain;
- T-1, the 30 mm apex and recovery issue C;
- AB and AB2 evidence and verdicts.

Nothing is pushed.

## 1. Verdicts

| item | result | detail |
|---|---|---|
| **G-1** identity | PASS | KV0 IDENTICAL; 99c29491; b62309f5; 3dd9f13d; b63184da; 58 / 58 (at the freeze and after the refactor) |
| **G-2** determinism | PASS | 864 / 864 BASE + AB end hashes equal the AB2 run logs |
| **G-3** completeness | PASS | 2,160 / 2,160 runs; exclusions identical |
| **1A-0** correctness | PASS | 400 cases. (a) ω = α = 0 reproduces D1 exactly (400 / 400). (b) 1A's added kinematic error ≤ 1.1·10⁻⁷. (c) Wrench vs angular-momentum rate ≤ 1.1·10⁻⁶ (amendment A1 control). The raw finite-difference error, 1.2·10⁻², is the original D1's own |
| **1A-1** AB2 contract for AB + 1A | PASS | AB-1 … AB-10, AB2-4a / 4b / 7, I-1, I-4 … I-7, L-1, L-2, G-3: all pass |
| **1A-2** non-inferiority vs AB | **FAIL (1 item)** | Set H (a): the max world foot angular speed at the first touching tick is 0.464 rad/s against AB's 0.363 (+0.01 allowed). The median improves (0.040 → 0.035). Every other item, (a) R / C and (b) – (f), passes |
| **1A-3** α gating | PASS | α̂ is used only while AIRBORNE, untouched and unlatched (0 exceptions). Switch-off step ≤ 2.0 N·m |
| **1B-0** identity before engagement | PASS | 432 / 432 runs identical to AB up to the TOUCHDOWN entry |
| **1B-1** construction | PASS | Closure of (τ0, K, D) ≤ 10⁻⁹; shared statics identical in both laws; σ path valid |
| **1B-2** transition certified | PASS | The transition term never exceeds L_cmd. **0** engaged violations with Δσ ≠ 0 |
| **1B-3** no regression in the transition region | **FAIL** | Runs with violations: R 6 → **10**, C 0 → 0, H 8 → **42**. Max commanded Δτ0 (H) 37.9 → **64.4** N·m; max applied 10.3 → **21.0** |
| **1B-4** no regression outside it | PASS | |
| **1B-5** touchdown and support | **FAIL** | Rebounds R 0 → **6** (all 180 Hz R-L: V2-198-92, V2-190-85, V2-long-legs, both legs). Max landed-foot slip R 3.1 → 4.3 mm; H 5.9 → **10.4** mm |
| **1B-6** energy | PASS | |
| **1B-7** per rate | **FAIL** | Transition regression at every rate in H (180: 0 → 10; 240: 2 → 16; 480: 6 → 16) and at 240 / 480 Hz in R |
| FT | FAIL | Driven by 1B: 1B-3 / 1B-5 / 1B-7, I-6 (5 new rebounds), and AB-4c. Under 1B the recorded w_A is the approach law's weight c, which steps to the default a·c at disengagement. AB-4c is the A-weight property check; 1B changes its semantics |

## 2. Diagnosis of 1A-2 (the single 1A failure)

The failing statistic is the foot's angular speed at the **first tick with touching pieces**, t1. On the fast H-T45 swings at 180 / 240 Hz, the foot arrives at 90 – 110 mm/s, which is 0.4 – 0.6 mm per tick against the 0.5 mm contact-report margin.

**That tick can already carry the contact impulse.** The foot is then pivoting about the touched point: tangential speed of the potential-contact points ≈ 0, foot angular speed 0.3 – 0.5 rad/s.
- V2-short-legs L 180 H-T45 and V2-long-legs L 240 H-T45 (re-run, `diagnostics/`):
  - AB + 1A: the touching tick carries Fz 55 / 28 N and an angular speed of 0.46 / 0.38 rad/s;
  - AB: that tick carries only 14 / 6 N, and its pivot spike, 0.50 / 0.53 rad/s, is **one tick later**.
- Before the impact the two configurations do not differ.

**Post-hoc diagnostic, not a verdict** (`diagnostics/pre_impact_foot_rate_F_vs_AB.txt`): at the last contact-free tick t_nc, the foot angular speed is unchanged by 1A.

| set | paired Δ median | paired Δ max |
|---|---|---|
| R | −0.001 | +0.002 rad/s |
| C | −0.002 | +0.004 rad/s |
| H | −0.000 | +0.011 rad/s |

Over [φ 0.75, t_nc) it is +0.005 rad/s at the median (≤ 0.011).

The verdict stays as frozen: **1A does not validate**. Whether the measure belongs at the last contact-free tick is a decision for the user (§5).

**What 1A changes otherwise** (reported; AB → AB + 1A):
- **T-1 β moves toward 0 on forward steps:** R-F −0.066 → −0.006; C-F13 −0.091 → −0.014; H-F15 −0.106 → −0.019.
- **Binding-window worst d_low:**
  - better forward (C-F13 −0.60 → −0.47; H-F15 −0.79 → −0.60 mm);
  - worse lateral (R-L −0.14 → −0.20; C-L5 −0.09 → −0.14 mm).
- **Mean tilt:** mixed (R-L 0.067 → 0.083°; C-F13 0.130 → 0.096°).
- **Transition-region violating runs:** R 6 → 1, H 8 → 12.
- **Tangential potential-contact speed before contact:** −1.8 … −3.1 mm/s (median).
- **Added wrench:** ≤ 2.3 N·m hip, ≤ 0.43 N·m knee, 0 at the ankle. The effects are small, as §0 of the prereg predicted.

## 3. Diagnosis of 1B

**The construction works as specified:**
- identity before engagement;
- exact closure;
- the governor never lets the transition term contribute to a violation.

**All 141 violating engaged ticks** (every 1B and FT run) are dominated by the **approach law's own change**, (1 − σ)·Δτ_app, of up to −64 N·m against the 40 N·m limit at 180 Hz. At those ticks the transition term is 0 and Δσ = 0 (governor stall).

**Mechanism.** The approach law is the airborne law: swing damping, plus A's singularity-robust pelvis-motion rate with w_A = c. It keeps weight (1 − σ) ≈ 0.9 through the impact, so the measured pelvis jolt passes through the singularity-robust rate and the swing damping. That is the amplification that made the refuted `srAll` unstable in contact.

Under AB, the per-factor a-blend reduces A's weight (a·c) and the damping within the same ticks, which partly absorbs the jolt. Example, V2-198-92 L 180 R-L, gain × pelvis-rate change:

| tick after contact | AB + 1B | AB |
|---|---|---|
| 1 | 19.3 N·m | 0.2 N·m |
| 3 | −46.9 N·m | −26.1 N·m |

Removing the cross terms removed that absorption.

The new rebounds and the larger slip follow from the different post-contact command. The R-L rebounds occur after disengagement, under the unchanged default contact law: the foot rises 0.96 mm vs 0.40 mm.

## 4. Reported for the touchdown design (inputs, not verdicts)

**Approach-law commanded-rate demand before contact (σ = 0).** The velocity feed-forward changes by up to:
- **36.6 N·m / tick at 180 Hz** (limit 40) on V2-198-92 R-L: pelvis-rotation part 23.0 + reference part 13.6;
- 33.4 on V2-198-92 H-T45 (20.0 + 13.5).

No late-approach violation in any configuration, but the heavy body runs at ≥ 90 % of the commanded-rate limit, ≈ 60 % of it from pelvis rotation. **Any coordinator timing must keep (D + dt·K)·q̈\* within that budget in the possible-contact band,** including the pelvis-induced part.

**Contact speeds at the first touching tick:** median 67 / 71 / 108 mm/s (R / C / H). The first touching tick can already contain force, so measurements "at contact" should be taken at the last contact-free tick.

**Approach the impact at low speed (Decision 3)** to reduce the jolt that drives the post-contact rate in every configuration.

## 5. Decisions needed (none taken)

1. **1A.**
   - (a) Authorise a versioned amendment that measures the contact-rate items at the last contact-free tick t_nc (and over the pre-contact band), evaluated on a fresh battery. On these records the post-hoc numbers are non-inferior.
   - (b) Keep the FAIL and do not adopt 1A. It is correct (1A-0), but its behavioural effect is small and mixed.
2. **1B.** Redesign options, each needing a new preregistration:
   - (a) **Terminal regime before the earliest possible contact.** A's singularity-robust pelvis-motion treatment belongs to the free swing. The terminal approach switches the pelvis-motion rate to the contact-compatible μ0 treatment **before** the possible-contact band (Decision 4: "establish the terminal control regime before the earliest possible contact"). The command-level blend at contact then joins two laws whose pelvis-motion compensation is already compatible. Its natural home is the coordinator design, which defines the band.
   - (b) The pelvis-motion rate as a **shared** term with one contact-valid regularisation, keeping the command-level blend for the gain- and target-specific parts.

   Either needs A's late-swing vertical benefit (M1) re-checked, because A matters most late in the swing.
3. **Proceeding.** Whether to proceed to the coordinator design on the AB baseline, with 1A / 1B not adopted, folding 2(a) into its terminal regime and keeping the contact-transition continuity as the coordinator battery's gating requirement.

**Recommendation:** 2(a) inside the coordinator's terminal regime, plus the low-speed contact search, preregistered together. For 1A, option (b) unless the user wants (a).

Everything stays local.
