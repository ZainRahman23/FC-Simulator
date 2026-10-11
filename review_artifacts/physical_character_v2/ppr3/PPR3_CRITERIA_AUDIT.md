# PPR-3 audit of PPR-2's failed criteria (read-only)

PPR-2's preregistration, criteria, thresholds and verdict are unchanged: S\* FAILED 36 / 45 (e454b068, 03c4fe8c). This audit asks whether each failed criterion was physically justified, and records how PPR-3 replaces it. Nothing here re-scores PPR-2.

Timing values are from `ppr3/research/POSTURAL_TIMING_CONTROL_LITERATURE.md` (§ windows), summarised in `PPR3_DESIGN.md` §2.

## 1. Did any PPR-2 criterion demand yield in a physically elastic direction?

**PPR-1's PR1 did.** It required a yield ratio ≥ 1.5 *for both signs* at the ankle, knee, hip and lumbar.
- Pushing a joint against its tonically active muscles is elastic up to the tonic torque plus the antagonist reserve.
- B was elastic there: lumbar − ratio 1.00, ankle − ratio 0.93 (ground-blocked).
- PPR-1 counted both as failures. PPR-2's audit (`ppr2/PPR2_CRITERIA_AUDIT.md` §1) found this unjustified and dropped PR1 from PPR-2's battery.

**PPR-2's own criteria never demanded yield in an elastic direction.** The closest is **M1** ("moderate: substantial sway *or* yield"):
- it requires the moderate push's maximum deflection to be ≥ 1.3 × the small push's (for a 1.6 × larger impulse), and ≥ 1° or ≥ 15 mm COM displacement;
- in a purely elastic regime deflection scales with impulse (≈ 1.6 ×), so M1 passes without any yield;
- S\* passed M1 in all four directions. It did not fail on a yield demand.

**What PPR-2 did get wrong is the time window over which it judged a substrate.** PPR-2's own report §4 said so. The failures below are re-examined on that basis.

## 2. PPR-2's failed criteria

| criterion (PPR-2) | what it demanded | physically justified? | PPR-3 replacement |
|---|---|---|---|
| **QS1** envelope exit ≥ 0.45 s (S\* 0.26 s) | the open-loop body stays inside a 10 mm / 3° envelope for start-up + 2 × 175 ms | **Partly.** An open-loop substrate must not leave standing faster than a delayed loop can act. But it judged the substrate against a *surrogate* loop (one 175 ms delay) instead of the actual delayed controller | S2 alone is not required to stand. Standing is judged on **S2 + P2** with the actual delays (literature, per channel). S2's open-loop departure is reported as a diagnostic |
| **QS2** e-folding ≥ 0.175 s (S\* 0.125 s) | λτ ≤ 1 for one 175 ms loop | **Not as written.** The stabilisability bound applies to the loop that actually exists. Human feedback has several channels with different delays (segmental proprioceptive, long-loop, vestibular). A single τ = 175 ms is not the right τ for every mode | Replaced by the closed-loop test itself: S2 + P2 must stand with physiological delays. A single-τ inequality is not used |
| **I3** hip elastic stiffness at 100 ms ∈ [30, 91] N·m/rad (S\* 16.6) | match Kiemel 2008's intrinsic hip stiffness (95–147 both hips) | **Partly.** The comparison was right in kind and the gap was real (≈ 4 ×). But PPR-2 read the simulated value at 100 ms after the ramp started, while the human values are intrinsic, non-delayed estimates. The windows did not match | Isolated hip, knee, trunk and ankle stiffness read **inside the intrinsic window** with matched protocols, against the human ranges (`PPR3_DESIGN.md` §4) |
| **S1 lateral** relative pelvis drop ≤ 5 mm and COM ≤ ½ margin at 300 ms (S\* drop 15 mm, lumbar lateral 23°) | small pushes do not collapse a substrate within 300 ms | **Not at 300 ms.** That is past every human feedback latency. **Within the intrinsic window the defect was still real:** 2.6° lumbar lateral bend at 50 ms, 10° at 175 ms, on a lumbar lateral stiffness of 21 N·m/rad against ≈ 88 N·m/rad of gravitational load | Substrate push responses judged only inside the intrinsic window (joint-specific). Collapse and recovery judged on S2 + P2 |
| **S3 back / left / right** joint-speed settling by 300 ms | the substrate's transient decays within 300 ms | **No.** Settling a gravity-loaded body is a feedback task. A passive human does not settle within 300 ms either | Settling and recovery judged only on S2 + P2 (recovery time, overshoot, against the human recovery dynamics) |
| **M2 forward** no loss of no-step balance within 300 ms (S\* crossed at 287 ms) | a moderate push does not cross the XcoM edge within 300 ms | **No, for a substrate.** The crossing happened after 175 ms, where the human loop acts | Loss and recovery judged only on S2 + P2. For S2 alone, only the intrinsic-window response is judged |

## 3. Criteria PPR-2 got right, kept in PPR-3

- **Ankle stiffness against the Vlutters 2015 / Sakanaka 2021 curves** (I1a / I1b): a matched protocol inside the intrinsic window. Kept, with the PPR-3 entry.
- **The small → moderate → large continuum** (C1). Kept, now evaluated on S2 + P2 for the whole recovery.
- **Large pushes must lose no-step balance** (L1). Kept for S2 + P2: a controller that saves everything fails.
- **Energy ledger** (E1, planted-feet windows), **joint-anchor separation** (V2 G1 1.3a / c: 5 mm transient, 1 mm at rest), **determinism**. Kept.
- **The causal identity test**, PPR-2's "struck vs unstruck activation". Extended in PPR-3 to the controller: two identical worlds must issue bit-identical P2 commands until the disturbance reaches P2 through its delayed sensory state.

## 4. Summary

PPR-1's PR1 is the only criterion in either phase that demanded yield in a physically elastic direction, and PPR-2 had already removed it.

PPR-2's real error was judging a substrate over 300 ms. Four of its nine failures (S3 ×3 and M2) arise only after any human feedback latency. QS1 and QS2 used a one-loop surrogate for a multi-channel delayed controller.

Two of PPR-2's failures remain substantive within any defensible window:
- the hip stiffness gap (I3);
- the lateral trunk weakness (S1 lateral).

Both point to the same cause, tone, which PPR-3 addresses from evidence (`ppr3/research/STANDING_TONE_LITERATURE.md`).
