# Bounded 30 mm touchdown matrix: metric definitions, reading rules and the 10 ms rationale

**Written before** the SV-2 battery's evaluation was read, and before any 30 mm touchdown data existed.

**Authority:**
- user decision 2026-10-06 (`../sources/2026-10-06_user_decision_sv2_battery.md`);
- `SWING_SERVO_VALIDATION_V2_PREREG.md` §7 (frozen in 84b92b1).

This file adds the operational definitions, the reading rules and the sourced rationale for the window. It does **not** change E2-5, any E2 criterion or any threshold. The matrix runs only if SV-2 validates and PG-1 certifies 32 / 32 (prereg §8).

## 1. Matrix (prereg §7, unchanged)

- PSTAR5CH, trajectory A30, certificate **enforced**.
- Non-test nominal steps: forward 0.07 m and lateral 0.06 m.
- 8 bodies × both legs × 180 / 240 / 480 Hz = 96 runs.
- Runner `scripts/run_td_matrix_A30.sh`; metrics `tools/e2_td_metrics.mjs`.

## 2. Metric definitions (`tools/e2_td_metrics.mjs`)

**Frozen quantities**, taken unchanged from `tools/e2_eval.mjs` `evalStep`:

| quantity | definition |
|---|---|
| contact time t_c | E2's measured contact |
| contact φ | E2's definition |
| **instantaneous peak** | max probe normal load of the swing foot over the rows [t_c, t_c + 0.1 s]. This is E2-5's impact |
| approach normal / tangential speed | foot velocity on the last row before t_c |
| 50 ms impulse | E2's definition |
| penetration | lowest boot point within 0.1 s of t_c |
| rebound | TOUCHDOWN → AIRBORNE count; re-entries < 60 ms |
| E2 verdicts | every criterion, for information |

**Added quantities.** All use the span [t_c − 2 ticks, t_c + 0.1 s]: the probe can register the contact up to two ticks before the measured contact state.

| quantity | definition |
|---|---|
| peak over the span | max load in the span |
| **max load averaged over an exact 10 ms window of physical time** (and 20 ms) | each row's load is held over its solver step [t_i − dt, t_i). The window mean uses fractional tick weights, so the window is exactly 10 ms at every rate. Max over every window lying inside the span. Same function as the frozen SV-2 evaluator; unit test: one impulse J in one tick gives J / 10 ms at 180 / 240 / 300 / 480 Hz, while the instantaneous sample is J / dt |
| 20 ms and 50 ms impulse | from the start of the first loaded tick |
| rebound | contact-loss rows and max upward foot speed in (t_c, t_c + 0.1 s] |
| actuator torque steps | max applied Δτ and commanded Δτ0 in the span, beside the E1a-7 rate-rule limits at that rate; the run's E2-9 verdict and value |

## 3. Reading rules (fixed now; diagnostic, not criteria)

Groups are body × leg × direction (32).

**S1: no solver-step scaling.** In every group, the 10 ms mean at 240 Hz and at 480 Hz is ≤ 1.2 × its 180 Hz value.
- **Derivation:** a quantity that scales with 1 / dt, as the rigid-contact one-tick sample does, predicts ratios of 1.33 (240 / 180) and 2.67 (480 / 180).
- 1.2 lies below the smaller of the two, so the rule separates "rate-stable" from "∝ 1 / dt" at both rate pairs.
- It was **not** fitted to any data.

**S2: verdict consistency.** For each group, report whether its 25 % BW verdict differs between rates, for both the 10 ms mean and the instantaneous peak.

**S3: physical differences.** Beside each load ratio, report the approach-speed and 50 ms-impulse ratios.
- A decrease with rate that matches a decrease in approach speed is a difference in the simulated touchdown, not an artefact of the measure.
- A decrease that is larger than the approach-speed decrease is reported as unexplained.

**"Materially rate-stable"** means S1 holds in every complete group. S2 and S3 are reported and discussed; they do not override S1.

**What follows from each outcome:**
- If S1 holds: the analysis gives the evidence and a recommendation for a versioned E2-5 amendment, for decision.
- If S1 fails: no amendment is recommended on this evidence.

Either way E2-5 stays as frozen until decided.

## 4. Correction to `E2_A30_PG1_RESULTS.md` §3, the 25 mm touchdown analysis (found while writing this tool)

That analysis said it used windows of 5 / 10 / 20 ms. **It did not compute exact physical-time windows.** It averaged an integer number of ticks, k = round(T / dt). For the "10 ms" window:

| rate | ticks | actual window |
|---|---|---|
| 180 Hz | 2 | 11.1 ms |
| 240 Hz | 2 | 8.33 ms |
| 480 Hz | 5 | 10.4 ms |

**Other errors in it:**
- It took contact as the first non-AIRBORNE state, not E2's t_c.
- Its table says "L leg". Each group kept only the last record read, which was the **R** leg.
- Its "why 10 ms" line said 10 ms is "the shortest window that spans ≥ 2 ticks at 180 Hz". That is wrong: 10 ms is 1.8 ticks at 180 Hz.

**Corrected 25 mm values.** Exact windows, E2's t_c, both legs, 96 runs. Old data only (`evidence_pg_A30/touchdown_metrics_25mm_exact.txt` / `.json.gz`), computed before any 30 mm run.

### 4a. Corrected 25 mm results

| metric | max at 180 / 240 / 480 Hz | ratio vs 180 Hz over 32 groups: 240 \| 480 | 25 % BW pass 180 / 240 / 480 |
|---|---|---|---|
| instantaneous peak (frozen E2-5) | 22.7 / 28.3 / **43.5** % BW | 0.78 – 1.83 \| 1.08 – **3.03** | 32 / **26** / **20** |
| max exact 10 ms mean | 20.1 / 20.1 / 17.2 % BW | 0.84 – 1.10 \| 0.70 – 0.96 | 32 / 32 / 32 |
| max exact 20 ms mean | 14.9 / 13.7 / 11.7 % BW | 0.73 – 0.97 \| 0.56 – 0.91 | — |
| 50 ms impulse | 3.87 / 3.36 / 2.99 N·s | 0.75 – 0.96 \| 0.53 – 0.85 | — |
| approach normal speed | 0.13 / 0.12 / 0.12 m/s | 0.70 – 1.40 \| 0.64 – 0.97 | — |

- On the old data, S1 would hold: max ratio 1.10. No 10 ms verdict flips; 14 instantaneous-peak flips.
- The qualitative conclusion of the earlier analysis stands.
- Its numbers are superseded by this table. Its 10 ms maximum was 22.1 % BW at 240 Hz; the exact value is 20.1.
- The 30 mm matrix is the test. This table is the 25 mm comparison only.

## 5. Why 10 ms (sources gathered before the 30 mm data)

The window was **named by the user** in the decision of 2026-10-06 and preregistered in SV-2 §7 before any 30 mm touchdown existed. The evidence for that duration specifically:

**(a) Physical timescale of the human heel-strike transient.** It must not be averaged away.
- Blackburn JT, Pietrosimone BG, Harkey MS, Luc BA, Pamukoff DN. *Comparison of three methods for identifying the heelstrike transient during walking gait.* Med Eng Phys 2016;38(6):581–585. PMID 27118622, doi:10.1016/j.medengphy.2016.04.008.
  - The Radin and modified Hunt methods identify the heel-strike transient "11-16ms following ground contact".
  - The authors recommend a 75 Hz vGRF low-pass for it.
  - A 10 ms window is shorter than that time to peak. It resolves the transient instead of averaging it into the loading response; a 20 ms or 50 ms window does not.
- Radin EL et al. *Relationship between lower limb dynamics and knee joint pain.* J Orthop Res 1991;9(3):398–405. PMID 2010844, doi:10.1002/jor.1100090312. The group differences were "within a few milliseconds of heel strike".
- Background, no durations in the abstracts:
  - Collins JJ, Whittle MW. *Impulsive forces during walking and their clinical implications.* Clin Biomech 1989;4(3):179–187.
  - Whittle MW. *Generation and attenuation of transient impulsive forces beneath the foot: a review.* Gait Posture 1999;10(3):264–275. PMID 10567759.
  - Verdini F et al. *Identification and characterisation of heel strike transient.* Gait Posture 2006;24(1):77–84. PMID 16263287.

**(b) Bandwidth: load measured at the bandwidth force-plate gait studies use.**
- A 10 ms moving average passes the frequency f with gain |sinc(f · 10 ms)|: −3 dB at ≈ 44 Hz, first null at 100 Hz.
- Published vGRF low-pass cut-offs for impact and loading measures span **25 Hz** (Lee WC et al., Front Bioeng Biotechnol 2021, PMC8335483: "cut-off frequencies of 25 and 10 Hz" for GRF and markers) to **75 Hz** (Blackburn 2016). 44 Hz lies inside that range.
- The impact component of the human vertical GRF is concentrated near **15 – 27 Hz**: Gruber AH, Edwards WB, Hamill J, Derrick TR, Boyer KA. *A comparison of the ground reaction force frequency content during rearfoot and non-rearfoot running patterns.* Gait Posture 2017;56:54–59. PMID 28499137, doi:10.1016/j.gaitpost.2017.04.037. Rearfoot maximum signal power 27.2 ± 3.9 Hz; non-rearfoot 15.4 ± 9.1 Hz; "10-20Hz range previously associated with impact".

| window | gain at 15 Hz | gain at 27 Hz | gain at 75 Hz (Blackburn's heel-strike-transient detection cut-off) |
|---|---|---|---|
| 5 ms | 0.99 | 0.97 | 0.78 |
| **10 ms** | **0.96** | **0.88** | **0.30** |
| 20 ms | 0.86 | 0.58 | 0.21 |

- **10 ms keeps ≥ 88 % of the impact-band content up to 27 Hz.** It does not keep the fine shape of the walking heel-strike transient: detecting that needs 75 Hz, and the 10 ms gain there is 0.30.
- So the 10 ms mean measures the load **sustained over a time shorter than the transient's rise**, not the transient's sharp edge.
- 20 ms removes 42 % of the content at 27 Hz, so it would understate a physical impact.

**(c) Numerical floor in this simulator.**
- One solver step is 5.56 / 4.17 / 2.08 ms at 180 / 240 / 480 Hz. 10 ms is 1.8 / 2.4 / 4.8 steps.
- A one-step contact impulse is averaged rather than sampled only when the window is ≥ the coarsest step (5.56 ms).
- A 5 ms window is shorter than one 180 Hz step, so it still samples the step: it is excluded on this ground, before any data.

**(d) What is not a reason.** Neither the pass rate at 25 mm nor any 30 mm result. A longer window (20 ms) would pass more easily, and it is excluded by (a) and (b), not chosen.

**Limits of the evidence:**
- The human data are for a loaded walking or running heel strike. E2-5 limits a placed, **unloaded** foot (contact ≠ support). The 10 ms timescale transfers as "short-duration physical load", not as a calibrated tissue threshold.
- The 25 % BW threshold itself is a design value from E1a-12 with no literature basis. It is kept, not re-derived.
- (b) gives a range, not one value: the published cut-offs of 75 → 25 Hz correspond to moving-average windows with the same −3 dB point of 5.9 – 17.7 ms. 10 ms is inside that range, not uniquely implied by it. The whole range already satisfies (c) (≥ 5.6 ms). (a) and (b) disfavour windows near its top: they approach or exceed the transient's 11 – 16 ms rise and attenuate the 27 Hz impact band (gain 0.66 at 17.7 ms).
