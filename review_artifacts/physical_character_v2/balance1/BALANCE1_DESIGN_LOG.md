# BALANCE-1 design log (disclosed design-stage work, before any preregistered battery run)

The instruction is saved verbatim in `sources/2026-10-12_user_instruction_overnight_m1b_adoption_balance1.md` (2f16fff4).

## Design-stage rules

**Design probes only:**
- undisturbed standing (noise-free and with motor noise);
- 2 N·s forward and 4 N·s lateral pelvis pulses (`scripts/b1_probe.mjs`);
- held 20 N pelvis pulls (`diag` scripts);
- open-loop identification of the coordination map (`ident`);
- reduced linear models (`scripts/b1_linear.mjs`).

**Not run:** no qualification-battery push or threshold before the freeze.

**Placeholders (D0–D8 only).** Hip, trunk, neck, ankle-inversion and arm muscle groups used explicitly labelled placeholder contraction lags (knee-extensor values, "[PLUMBING ONLY]") until the BALANCE-1 literature review returned. From D9 on, every group is canonical (`spec/v2_muscles.js`, literature §19.1).

## D0. M1b canonical integration (milestone 6ac988ef)

**What was added:**
- `sim/v2_muscle.js` `MuscleLayer` / `MuscleAxis`: excitation-only interface; torque commands throw;
- `spec/v2_muscles.js`: strict tables; an unparameterized muscle group throws.

**Equivalence.** The canonical axis reproduces the qualified M1b model byte for byte on every MUSCLE-1 experiment.

**Whole body.** With constant entry excitation the M1b body leaves standing at 1.429 s (S2: 1.425 s), with the same clean first 250 ms.

**Two bugs found, both corrected in the BALANCE-1 body law:**
1. PPR-3's P2 reads per-axis short-range constants that the first M1b body law did not expose. The resulting non-finite intents were silently masked to zero, so the "M1b + frozen P2" posture channel was off in early diagnostics.
   - Corrected: constants are exposed.
   - Non-finite controller output now throws.
2. BALANCE-1's posture and reflex stiffness were computed from muscle activation before the layer's first plan. That made them zero, so the posture channel was off in D1–D5.
   - Corrected: they now use the entry excitation.

## D1. First candidate structure (A0)

**Structure:**
- COM objective through the legs' static Jacobian (PID + COM acceleration, Pasma 2017 gains);
- upper-body groups with a merged lumbar + thoracic group;
- head, knees (mean squat mode), posture.

**Result:** diverges undisturbed after ≈ 5 s.

## D2. Separate thoracic group

**Cause:** a single upper-body lean group leaves the lumbar-vs-thoracic bending mode unobserved.

**Result:**
- with K_D 0.45 s and no acceleration term: stable undisturbed;
- with Pasma's K_D 0.87 s: marginal;
- with acceleration feedback (a finite difference of the delayed COM velocity): destabilising.

**Decision:** acceleration feedback dropped. A physiological COM-acceleration signal (otolith, plantar force) is low-pass, and a raw difference is not a defensible sensor.

## D3. Noise-driven lateral fall (A1)

**Symptom:** with motor noise, the pelvis translates over the feet while the trunk leans the other way. The COM integral winds up and the body falls at ≈ 25 s.

**Diagnosis tests:**
- without the integral: no fall in 40 s, but large drift;
- with the frozen P2 on M1b: also falls (see D0 bug 1 for the caveat);
- with all contraction lags made near-instant: P2 still falls;
- with S2's secant strain law patched in: P2 holds a forward 20 N pull with fast muscles, but not with M1b lags.

**Finding:** S2's secant law (strain measured from the entry pose for all time, scaled by activation) was a hidden, activation-amplified pose spring. MUSCLE-1's history-consistent law has none. Low-frequency postural stability must now come from the controller.

## D4. Support length per leg (knees)

**Change:** a common squat-mode objective leaves the knee difference (pelvis roll) unregulated, so each leg now holds its own length.

**Result:** physically correct, but not the cause of D3.

## D5. Knee support gain

**Old value:** P2 used 0.2 × the squat-mode gravitational stiffness. That rested on S2's knee quasi-static 99 N·m/rad, which came from the secant law.

**New value:** under M1b, BALANCE-1 uses the same rule as the other gravity-load objectives: 1.3 × the measured gravitational stiffness.

## D5b. Posture channel corrected (D0 bug 2)

**Result:** with the posture channel actually active, A2 survives 60 s with noise and holds lateral and backward 20 N pulls.

**Remaining problems:**
- sway far above human: COM RMS 9.1 / 8.9 mm, hip RMS 9°;
- 0.9 Hz lateral ring;
- forward 20 N pull falls: the ankle reaches the toe limit, because position gain 1.33 mgh barely exceeds gravity and plantarflexor force rises slowly. Sustained pulls are not in the battery.

## D6. Integral action on the orientation groups

**Cause:** the 9° hip "sway" is a slow (0.03 Hz) jackknife drift of the null space (hip flexion, ankle plantarflexion, lumbar extension).

**Change:** Peterka-type K_I 0.17 s⁻¹ on each group.

**Result:** hip RMS 9 → 4.4°; lateral COM RMS rose to 14.6 mm.

## D7. Lateral mode and the coordination map

**The lateral ring** is the four-bar translation mode: pelvis ±17 mm, both hips together, lumbar in quadrature. Period ≈ 1.05 s; damping ratio ≈ 0.05.

**Reduced lateral model:**

| Condition | Result |
|---|---|
| G_g 1,381.6 N/m, 100 ms COM delay + M1b muscle lag, delayed PD (A) | unstable or marginal |
| the same with internal-model prediction (B) | well damped |
| A with a 50 ms sensory channel | well damped |

**Identification** of the coordination map, open loop:
- the legs' Jacobian delivers 0.90 of a commanded AP COM force, but only **0.65** of a lateral one (the rest bends the trunk);
- so the lateral loop's effective low-frequency stiffness is ≈ 0.87 of gravitational, plus small intrinsic support.

**Compensation tested:** dividing by the measured effectiveness destabilises the loop, so the lateral loop is delay-limited, not gain-limited.

**B with an uncalibrated internal model** (gain 1, pendulum per axis) makes AP worse on the full body.

**Pending:** the physiologically defensible lateral sensory channel (proprioceptive / plantar ≈ 50–60 ms vs a 100 ms multisensory COM estimate), and the hip-abductor / evertor contraction lags. Both await the literature review.

## D8. Upper-body orientation loops at 50 ms (pre-literature)

**Change:** orientation groups (hat, trunk, upper) on a 12-step (50 ms) channel instead of 100 ms; lateral prediction with effectiveness compensation (cpD1).

**Result:** AP sway human-like in amplitude (60 s noise: COM RMS 3.2 / 5.4 mm). The forward 2 N·s probe was well damped (7.4 mm peak at 0.6 s). The lateral 4 N·s probe left a sustained pelvis–trunk anti-phase oscillation (period ≈ 0.7 s). The 50 ms value had no literature basis yet.

## D9. Literature-mapped muscles and channels; effectiveness compensation removed

**Literature** (`research/BALANCE_MUSCLE_AND_BENCHMARK_LITERATURE.md`, delivered 06:20):
- muscle groups §19.1, inverted on the same cascade by `scripts/b1_groups_derive.mjs`, which reproduces the review's table exactly: hip 126–135 / 54 ms, trunk 135–144 / 68.5 ms, neck 107 / 79 ms;
- sensory delays §19.2.

**Changes:**
1. Every group is canonical in `MUSCLE_GROUPS`, with labels and preregistered sensitivity ranges. No placeholder remains.
2. Channels are mapped to the literature's destination-specific latencies:

| Channel | Latency | Steps |
|---|---|---|
| COM → ankle (and knee) | 100 ms | 24 |
| COM → hip axes of the COM map | 75 ms | 18 |
| Orientation offsets | 75 ms | 18 |
| Orientation rate (proprioceptive velocity, [MODEL], Goodworth & Peterka 2009) | 30 ms | 8 |
| Head (vestibulocollic) | 22 ms | 6 |
| Knee / leg | 100 ms | 24 |
| Posture | 100 ms | 24 |

**Result with the D7 compensation still in place:**
- A diverged laterally under noise.
- One-channel ablations did not explain it.

**Cause:** the D7 effectiveness compensation (ML command ÷ 0.65). D7 had already shown that it destabilises A.

**Change:** removed (eff [1, 1]). This also removes a fitted body-response factor.

**Result:**
- A stable: lateral 4 N·s peak 12.4 mm at 0.35 s;
- A and B survive 60 s of noise.

**Rejected structural alternatives (tested, no benefit):**
- spine joints in the COM map: ML step response only +6 %;
- an ML HAT objective on the hips: unstable.

## D10. Segment-frame orientation objectives (tested, rejected)

**Hypothesis:** the residual slow joint drift (ankle–hip anti-phase 1.6°, thoracic–neck lateral 2.4° / 2.0°, all < 0.2 Hz) came from composite-COM objectives hiding internal counter-rotations.

**Test:** offsets computed from each base segment's orientation in space (`frame: "segment"`, kept in the code, unused).

**Result:**
- no improvement for hat, head or upper;
- all four groups together fell under noise.

**Finding:** the drift was deterministic. It is unchanged with motor noise switched off, so it is a transient or instability, not a noise random walk.

## D11. Support symmetry (pelvis-yaw divergence)

**Diagnosis (noise-free, 60 s):** a slow, deterministic pelvis-yaw divergence:
- ankles −3.9° / +4.9°;
- hip flexion +2.6° / −3.9°;
- tibial rotations opposite.

It was also present in the pre-literature cpD1. The COM map drives both ankles together, so the DIFFERENTIAL sagittal leg lean has no objective. Under gravity each leg carries its share of the upper body like an inverted pendulum.

**Change:** a support-symmetry objective on the differential ankle angle (proprioceptive, leg channel). Gravitational stiffness per ankle is DERIVED from the entry geometry (K_d = (M_above/2)·g·L_hip + m_leg·g·h_legCOM ≈ 251 N·m/rad).

**First attempt** (kP 1.3, kD 0.45 like the pendulum objectives): a growing ≈ 2 Hz oscillation.

**Open-loop identification** (±10 N·m differential intent step): the mode is VISCOUS. After the muscle rise there is a near-constant velocity of ≈ 0.13 rad/s, an effective damping c ≈ 77 N·m·s/rad, and no inertial oscillation. Velocity feedback therefore has high-frequency loop gain kD·K_d/c ≈ 1.5 > 1 behind a ≥ 100 ms loop, which is unstable.

**Adopted:** kP 1.3, kI 0.17, kD 0 (a causal, measured reason, not a gain search).

**Result:** yaw held (differential < 0.6° over 60 s).

## D12. Posture channel restricted

**Remaining noise-free symptom:** a slow (≈ 25 s period) lateral wander: COM ML ±7 mm, lumbar and thoracic lateral bend in phase (±3 / ±5°).

**Integrators are not the cause.** Removing each integrator, all integrators, the knee loop, or the hip channel did not remove it.

**Removing the weak posture channel removed it completely** (COM ML ≤ 0.2 mm over 60 s). Axis subsets: arms only, or hip/knee rotation only, are quiet. With the spine axial rotations (lumbar / thoracic / neck rot) included, the wander returns.

**Adopted:** posture only on hip/knee axial rotation and the arms. The spine axial rotations keep their tone (T) and intrinsic muscle mechanics; they carry no task and no gravitational load.

**Result (60 s with motor noise, design probe):**

| Variant | COM RMS AP / ML | COP RMS (raw) AP / ML | Joint SDs | Lateral 4 N·s probe |
|---|---|---|---|---|
| A | 1.23 / 3.52 mm | 3.1 / 22.4 mm | 0.2–0.7° | ring −3.4 / +4.6 mm |
| B | 1.09 / 0.97 mm | 3.0 / 5.7 mm | 0.1–0.5° | settles within ≈ 3 s |

- Human joint SDs: 0.18–0.31° (Wang 2014).
- Forward 2 N·s probe (both): 6.8 mm peak at 0.52 s, well damped.

**These are the frozen candidates.** A and B are identical except for B's lateral prediction.

## Design-stage disclosure for the preregistration

**Seen at design stage:**
- design probes (above);
- 60 s quiet-standing statistics: COM / COP RMS and joint SDs;
- one DRY pipeline smoke test of the battery code with meaningless durations and 0.5 N·s pushes (not judged).

**Not seen:** NO battery push, threshold, Rietdyk-form push or sensitivity body result was seen before the freeze.

**U6 (joint SD) is added knowing the design-stage values above.** It is a literature human metric the mission names ("joint displacement"). The disclosure stands.
