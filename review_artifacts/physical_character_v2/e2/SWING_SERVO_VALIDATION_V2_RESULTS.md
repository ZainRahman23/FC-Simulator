# Swing-servo validation v2 (SV-2): DOES NOT VALIDATE → STOPPED

**Authority:** user decision 2026-10-06 (`../sources/2026-10-06_user_decision_sv2_battery.md`).

**Preregistration:** `SWING_SERVO_VALIDATION_V2_PREREG.md`, frozen in 84b92b1 before any battery run. The battery ran on that commit (clean archived tree; `evidence_sv2/commit.txt`).

**Evidence** (`evidence_sv2/`):
- `sv2_eval_summary.txt`, `sv2_eval.json`;
- `logs/`, `records_240_REF_165/`;
- `diagnostics/`;
- `whatif_pg_invalid_allowance/`.

**Not done, per the stop rule (prereg §5 / §8):**
- no allowance entered: `FS.clearAllow` stays `null`;
- no PG-1;
- no 30 mm touchdown matrix;
- no E2-5 change;
- no official E2.

No gain, bandwidth, trajectory, apex (30 mm stays), threshold or criterion was changed. Nothing below was used to alter the battery.

## 1. The four verdicts (kept separate)

All 876 frozen runs are present.

| verdict | result | detail |
|---|---|---|
| **Reachability** | as designed | 14 pre-freeze rejections (C-L11, 7 bodies × 2 legs), reported separately. Runtime: 0 rejections and 0 unreached IK targets in any swing window. **But** C-L11 on V2-long-legs passes reachability and is not executable (§2, F1) |
| **Tracking accuracy** | **FAIL** (T-1 only) | T-1: **FAIL** on 2 of 10 trajectory ids. T-2 (peak ≤ 10, RMS ≤ 5 mm, every run): **PASS**. T-3 (rate stability): **PASS** |
| **Integrity / energy / torque** | **FAIL** | I-1 PASS, **I-2 FAIL** (52 runs), **I-3 FAIL** (6), **I-4 FAIL** (4), I-5 PASS, **I-6 FAIL** (84), I-7 PASS |
| **Clearance allowance** | **NOT VALID** (computed for the record) | 3.65 4.20 4.25 4.05 3.15 2.10 1.00 0.00 0.00 0.05 0.80 1.65 mm (φ 0.20 … 0.80) |

**Where the failures are (VAL-ON):**

| set | T-1 | I-2 | I-3 | I-4 | I-6 |
|---|---|---|---|---|---|
| **R** (representative E2 steps) | pass (β 0.21 / 0.23) | 0 / 96 | 0 | 0 | 0 |
| **C** (corridor extremes) | **C-F7 0.26, C-L5 0.28** (≤ 0.25) | C-F13 10; C-L11 6 | C-L11 6 | C-L11 4 | C-L11 6 |
| **H** (harder) | pass | 36 (H-T45, H-A40, H-F15, H-D) | 0 | 0 | 78 (H-D 44, H-F15 34) |

**The representative set R passes every tracking and integrity item at every body, leg and rate.**

**Tracking accuracy is good everywhere:**

| measure | value |
|---|---|
| RMS with D1 (means per trajectory) | 1.3 – 2.3 mm |
| worst peak | 4.2 mm (H-T45) |
| ON / OFF RMS ratio | 0.19 – 0.46 |

## 2. Failure mechanisms (diagnostic only; nothing changed)

### F1: C-L11 on V2-long-legs, a servo runaway at the reach boundary (I-2, I-3, I-4, I-6)

Source: `diagnostics/c_l11_long_legs_blowup.txt`.

**What happens:**
- At φ ≈ 0.80 – 0.82, on the descent toward a 0.11 m outward goal, the applied torque step grows geometrically, 1.9 → 2.6 → 3.9 → 6.4 → 11.5 → 23 N·m per tick.
- The knee flexion axis (knee.y) saturates first.
- The IK residual stays ≤ 1e-15 throughout: the target is "reached", so the runtime reachability check does not fire.
- **It happens with D1 off as well:**

| | commanded Δτ0 peak | energy closure | TOUCHDOWN entries |
|---|---|---|---|
| D1 off | 3 – 6·10² N·m | — | 2 |
| D1 on | 10¹³ – 10¹⁵ N·m | up to 5.4 J / tick | 2 – 3 |

So it is not a D1 defect; D1 amplifies it. All 3 rates and both legs are affected.

**Interpretation (hypothesis, not verified):** loss of conditioning of the rate and acceleration feed-forward as the knee approaches full extension laterally.

**What it exposes:**
- The planner's reachability certifier (landing validity, goal IK feasibility, 11-sample path IK feasibility) certifies positional reachability. It does not certify that the servo can execute the path.
- The user's rule says an unreachable trajectory must be rejected by reachability, not inflate the allowance. This case is unreachable in execution but certified reachable.
- It also entered the allowance in bins 0.25 – 0.40 (raw 4.2 mm). Those bins are not binding.

### F2: touchdown torque transients just after the E1a-7 onset window (I-2: C-F13, H)

Source: `diagnostics/i2_violation_timing.txt`.

**Timing:**
- All 56 violating ticks in the 46 non-C-L11 runs lie **6 – 21 ms after measured contact**.
- E1a-7's contact-onset window is 2 ticks at 180 / 240 Hz (11.1 / 8.3 ms) and 4 ticks at 480 Hz (8.3 ms).
- Applied Δτ is 10.1 – 15.0 N·m against the 10 N·m limit. A few commanded Δτ0 cases also exceed (480 Hz ≤ 15 N·m; H-D at 180 Hz 42 vs 40).

**Shape** (traces, `diagnostics/i6_rebound_traces.txt`):
- First contact is on 2 – 4 hull points at 40 – 50 N.
- **2 – 5 ticks later** the sole goes flat, with a second, larger load spike (to 300 N at 240 Hz on H-F15) and the torque step.

**The step and the long forward steps:**
- Steeper steps land with higher downward and forward speed. C-F13: up to 0.135 m/s down. H-T45 / H-A40 / H-F15: 0.13 – 0.18 m/s.
- The step falls outside the onset window, which starts at the first touch, not the later foot-flat contact.

**D1 makes it worse:**

| | runs failing the I-2 rule (C / H) | max applied Δτ (C / H) |
|---|---|---|
| D1 off | 6 / 12 | 8.9 / 11.3 N·m |
| D1 on | 16 / 36 | 12.6 / 15.0 N·m |

**The cause of the D1 increase is not isolated.**
- It is not a faster landing: at contact the foot is as fast or *slower* with D1 in every trajectory (240 Hz means 0.074 – 0.123 vs 0.073 – 0.141 m/s without).
- Candidates, not tested: the D1 feed-forward torque changing when the swing target is handed back to the landed anchor at contact, and the foot-flat second impact.

### F3: landed-foot contact loss on long steps (I-6: H-D, H-F15)

**What happens:**
- After touchdown, during the 0.5 s rest with the landed foot unloaded (contact ≠ support), the foot drifts 4 mm forward and up to 1 mm up.
- It loses all contact pieces about 0.2 s after touchdown (TOUCHDOWN → AIRBORNE), then touches down again.
- It always ends in SUPPORT.

**Where:**

| | H-F15 | H-D | R-L |
|---|---|---|---|
| D1 on | 34 / 48 | 44 / 48 | 0 / 48 |
| D1 off | 0 / 48 | 12 / 48 | 2 / 48 |

So it is not D1-specific, though D1 makes it much more frequent. It occurs after the long, fast landings, with the placed foot carrying no load.

### F4: T-1 residual is vertical and D1-insensitive

Source: `diagnostics/t1_beta_per_axis.txt`.

**Horizontally, D1 removes most of the acceleration-correlated lag:**
- forward axis: β 2.1 – 2.7 → ≈ 0.02;
- lateral axis: β 1.4 – 1.7 → 0.19 – 0.23.

**Vertically it does not:**

| trajectory | vertical β, D1 on | vertical β, D1 off |
|---|---|---|
| R-F | 0.38 | 0.43 |
| C-F7 | 0.36 | 0.40 |
| C-L5 | 0.28 | 0.22 |

- The pooled β is therefore set by each trajectory's share of vertical acceleration. C-F7 and C-L5 are short steps, so their vertical share is high and the pooled β is above 0.25. R passes narrowly.
- β falls with rate: C-F7 0.36 / 0.30 / 0.21 at 180 / 240 / 480 Hz.
- The joint fit (β with velocity-lag γ and bias) gives 0.19 – 0.24.

**Size:** β_y · a_y / ωn² is 0.47 – 0.77 mm RMS (max 0.80 – 1.32 mm), against a total error of 1.29 – 1.70 mm RMS (R and C).

**It is the same error that sets the end of the descent.**
- As the reference decelerates into the turf (upward acceleration), a positive β_y puts the foot **below** the reference.
- At the last row before contact (240 Hz, D1 on), the foot's lowest point is at the turf while the reference's is still **1.1 – 2.4 mm** above it.
- So contact comes **early**, at φ 0.87 – 0.91. The reference is then still descending at 0.05 – 0.08 m/s and the foot faster, at 0.075 – 0.12 m/s (means).
- The binding allowance bin [0.75, 0.80] (1.60 mm raw) measures this same deviation.

**Cause (hypothesis, not verified):** pelvis vertical motion coupling (S2 found a pelvis-motion residual γ ≈ 0.25) and/or discrete-time actuation lag, since β falls with rate.

## 3. The allowance (NOT VALID) and what PG-1 would have done: what-if only

| bin start φ | .20 | .25 | .30 | .35 | .40 | .45 | .50 | .55 | .60 | .65 | .70 | .75 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A (mm) | 3.65 | 4.20 | 4.25 | 4.05 | 3.15 | 2.10 | 1.00 | 0.00 | 0.00 | 0.05 | 0.80 | **1.65** |

The binding bin [0.75, 0.80] has raw value 1.6004 mm, from V2-165-62 R 240 Hz C-F13 (evaluator convention). The preregistered 0.05 mm round-up makes it 1.65.

**What-if** (`whatif_pg_invalid_allowance/`; scratch copy; not PG-1; nothing entered in the code): the 32 PG-1 decisions with these bins.
- **0 / 32 certified.**
- Margin 4.976 – 4.977 mm at φ 0.799 against the 5 mm limit: **short by 0.023 mm**.
- Without the round-up (1.6004) it would be 5.027 mm.
- **Consequence for any re-validation:** at 30 mm the certificate sits within a few hundredths of a millimetre of the limit at φ 0.80. The descent-end bin is set by the forward corridor extreme on the lightest body. Any servo battery like this one will likely leave PG-1 marginal. The apex is not changed (decision: "Do not change the 30 mm apex again").

## 4. Touchdown at 30 mm: SV-2 data (reported; not the bounded matrix, not a criterion)

The SV-2 harness ends each step on the turf with E2's own hand-back, at the A30 trajectory. Its touchdowns are an independent 30 mm data set; the matrix itself was not run.

**Caveat:** the steps are larger than the matrix's (0.07 / 0.06), and the harness is not E2's sequencer.

Max over 16 body-legs at 180 | 240 | 480 Hz; exact windows (`diagnostics/touchdown_30mm_sv2_summary.txt`):

| trajectory | instantaneous peak % BW | **10 ms mean % BW** (pass ≤ 25 / 16) | approach down m/s |
|---|---|---|---|
| R-F (0.10 fwd, the official S-F size) | 37.2 \| 40.5 \| 47.4 | **27.8 (8) \| 24.9 (16) \| 22.4 (16)** | 0.120 \| 0.115 \| 0.104 |
| R-L (0.08 lat) | 16.5 \| 18.4 \| 29.1 | 15.5 \| 15.7 \| 15.1 (all pass) | 0.101 \| 0.097 \| 0.089 |
| C-F7 (0.07 fwd) | 28.2 \| 30.6 \| 48.1 | 22.0 \| 22.7 \| 20.3 (all pass) | 0.116 \| 0.109 \| 0.097 |
| C-F13 (0.13 fwd) | 36.9 \| 50.3 \| 63.2 | **30.8 (0) \| 30.3 (2) \| 26.2 (6)** | 0.135 \| 0.123 \| 0.110 |
| C-L5 (0.05 lat) | 20.8 \| 23.1 \| 28.1 | 17.8 \| 17.4 \| 15.9 (all pass) | 0.100 \| 0.101 \| 0.085 |

Over all 80 R + C groups:

| measure | 240 / 180 | 480 / 180 |
|---|---|---|
| instantaneous peak ratio | 0.85 – 1.56 | 1.01 – **2.12** |
| 10 ms mean ratio | 0.83 – 1.08 | 0.72 – 0.98 |
| approach-speed ratio | 0.85 – 1.08 | 0.79 – 0.98 |

**Reading:**
- The 10 ms mean shows no solver-step growth. The plan's S1 rule (ratio ≤ 1.2) would hold, since no ratio exceeds 1.08.
- Its decrease with rate follows the decrease in approach speed. That is a physical difference in the simulated landing between rates, not an artefact of the measure.
- **A rate-robust measure does not by itself make 30 mm forward landings meet 25 % BW.**
  - R-F, the official forward size, exceeds it at 180 Hz for 8 of 16 body-legs (up to 27.8 % BW). The heavier bodies are the ones over.
  - C-F13 exceeds it at every rate.
- The physical touchdown load at 30 mm for forward steps ≥ 0.10 m is at or above the limit. That is what the requirement was meant to bound (the analysis plan, §5), and the data say the landing itself, not only the metric, is the issue.

**Correction issued earlier in this session** (`TOUCHDOWN_A30_ANALYSIS_PLAN.md` §4): the 25 mm touchdown analysis in `E2_A30_PG1_RESULTS.md` §3 used integer-tick windows, R-leg-only groups and a wrong "≥ 2 ticks" claim. The exact-window recomputation on the old data is in `evidence_pg_A30/touchdown_metrics_25mm_exact.*`: 10 ms max 20.1 / 20.1 / 17.2 % BW, all 96 pass.

## 5. Status and the decisions this needs

**E2 STATUS: BLOCKED.**
- Gate 1 (the servo battery validates): **not met**.
- Gate 2 (PG-1 under an independent allowance): not reached. The what-if is short by 0.023 mm.
- Gate 3 (touchdown metric): partly answered. The 10 ms measure is rate-robust, but 30 mm forward landings exceed 25 % BW at 180 Hz on it.

**Decisions for the user.** None is taken here; each needs a versioned amendment and a fresh frozen battery.

1. **Reachability scope (F1).** Should the reachability verdict include execution feasibility, for example a knee-extension or conditioning margin along the path?
   - Then C-L11 on V2-long-legs would be rejected by reachability, as the user's rule intends for unreachable cases, instead of failing integrity.
   - Without such a rule, the corridor extreme C-L11 is a genuine servo failure for that body.
2. **Touchdown and descent end (F2, F3, F4, §3, §4).** The foot reaches the turf early, at φ 0.87 – 0.91. It is running 1 – 2.4 mm below a reference that is still descending at 0.05 – 0.08 m/s, and arrives at 0.075 – 0.12 m/s on average (maxima 0.10 – 0.18).
   - One mechanism links four findings: the vertical, D1-insensitive acceleration residual (F4).
     - the T-1 failures;
     - the binding clearance bin;
     - the early, fast contact behind the foot-flat transients (I-2), the long-step contact loss (I-6) and the 30 mm forward landing load (E2-5);
     - and probably the I-6 rebound.
   - **Candidate levers, both needing your decision:**
     - a touchdown-behaviour change, landing-phase velocity shaping of the reference;
     - a servo change for the vertical residual (not diagnosed beyond the hypothesis in F4).
3. **T-1 (F4).** The residual is vertical, rate-dependent and D1-insensitive, so T-1 as frozen cannot pass for short steps without addressing vertical coupling. T-2 and T-3 pass with large margins. Whether T-1 stays gating, and on which axes, is a criteria decision for a new version.
4. **Clearance at φ 0.80 (§3).** Even with a validated servo, the 30 mm certificate is within 0.03 mm of the limit under the preregistered round-up. This needs to be in view before the next battery is designed, since the apex stays at 30 mm.

**My recommendation, for decision:**
- Decide (2) first. The vertical descent-end residual is the common factor in T-1, the binding clearance bin, the touchdown transients and the 30 mm landing load.
- Before choosing a lever, a bounded **diagnostic** (no behaviour change) should isolate its cause: pelvis coupling vs actuation lag, as F4 leaves open.
- Then add an execution-feasibility rule to reachability (1).
- Then freeze an SV-3 that keeps R and C and this evaluator unchanged except as decided.

**Kept unchanged:**
- passive-ankle compensation stays diagnostic-only;
- recovery issue C untouched;
- old batteries and results preserved.
