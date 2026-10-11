# PPR-3: the physiological standing foundation (design; S2 part, before its qualification)

The instruction is saved verbatim in `sources/2026-10-11_user_instruction_ppr3_complete_physiological_standing_foundation.md` (commit f7cef6b3).

PPR-1 and PPR-2 are preserved unchanged. Neither result nor threshold is rewritten here; `PPR3_CRITERIA_AUDIT.md` covers PPR-2's failed criteria.

**PVP is sealed.** `ppr3/scripts/ppr3_run.mjs` cannot run a PVP scene at all. No PVP-1A-DX, ABI or tackle has been run or viewed in PPR-3.

**Not modified:** RUN-1, the slide, the simulation, outcomes, collision geometry, solver / timestep, TRC-1 rendering, PVP records, and the canonical V2 spec.

**Architecture under test** (the instruction's working hypothesis): **S2** = the body mechanics that exist now; **P2** = continuous nervous-system feedback on past sensed state.

This document fixes S2. P2 is designed only after S2 has been evaluated as a substrate (`PPR3_P2_DESIGN.md`, later).

Labels: [M] measured human, [E] derived from measured values, [MODEL] model conversion, [D] design choice.

Literature (this phase):
- `ppr3/research/STANDING_TONE_LITERATURE.md` (tone);
- `ppr3/research/POSTURAL_TIMING_CONTROL_LITERATURE.md` (timing, delays, sway, recovery);
- `ppr3/research/ECCENTRIC_PERSISTENCE_DAMPING_LITERATURE.md` (persistence, damping).

Earlier phases' reviews are cited, not repeated.

## 1. Timing: what a substrate can be judged on (POSTURAL_TIMING §recommended windows)

**First neural contribution to muscle force after an unexpected disturbance.** Short-latency stretch-reflex EMG [M] starts at:

| Muscle | Onset |
|---|---|
| Hamstrings | 20 ± 4 ms |
| Quadriceps | 23–25 ms |
| Gluteus medius / paraspinals | 28 ms |
| Neck | 22–25 ms |
| Soleus, gastrocnemius, tibialis anterior | 41–46 ms |

Electromechanical delay then adds 10–22 ms [M].

**Intrinsic-only windows** (no neural change in force can have occurred): ankle 0–40 ms, knee / hip / trunk 0–30 ms, neck 0–25 ms; whole body 0–30 ms.

**Later windows:**
- segmental reflex: ≈ 30–100 ms;
- automatic postural responses: EMG 100 ± 20 ms (60–145), active torque ≈ 100–160 ms [M].

**Consequence.** PPR-2's 300 ms "passive" window contained the whole automatic postural response; its proposed single 175 ms τ is a lumped effective delay, not a latency. **S2 alone is judged only inside the intrinsic windows,** or with protocols matched to human intrinsic-stiffness estimates (quasi-static, or sub-degree regimes where stretch reflexes are absent; Loram & Lakie 2002; Sakanaka 2016).

## 2. The standing qualification entry (`ppr3/fixture/PPR3_STANDING_ENTRY.json`, `ppr3/scripts/ppr3_entry.mjs`)

**Construction.** The same athletic posture as the PVP runner (knee 14.2°, hip 7.4°, ankle 9.7° dorsiflexion, ankle centres 0.42 m apart, COM 26 mm ahead of the sole centres), with two corrections:
- each foot rotated 4.43° about its own ankle so its sole is flat (the PVP entry stood them on their medial edges);
- the body lowered 4.42 mm so the lowest sole point is exactly at the turf.

Zero velocities. Nothing else changes. COM height 0.9801 m.

**Measured on that entry (calibration):** the cold-started solver carries body weight within 4 steps (690–766 N, then 724–726 N against 725 N), with 0.01 mm pelvis motion and ≤ 0.02 mm penetration. **No settling rig is needed.** The previous start-up transients came from the PVP entry's hover and rolled feet.

**Controller history at t < 0** (for P2): the entry sample, i.e. the body has been standing still.

## 3. S2: the substrate (`ppr3/scripts/ppr3_body.mjs`; candidate `ppr3/params/PPR3_S2_CANDIDATE.json`)

**Neural side: excitation only, constant without P2.** Per axis, the activations follow V2's activation dynamics (15 / 50 ms) from excitations solved once at entry. They are the minimal activations that:
- meet the joint-specific floors (T),
- and make the net active torque equal the tonic target.

**Tonic target** = rest statics (A2) − the passive share (B). No regulator and no state feedback.

| Component | What | Evidence | Kind |
|---|---|---|---|
| **A** excitation | fixed from the pre-contact state; P2 (later) may add only delayed corrections | PPR-2 (activation bit-identical struck vs unstruck) | control law |
| **A2** rest statics | COP under the COM (PPR-2); **new:** the inward force pair between the feet (statically indeterminate) chosen by **minimum squared activation** (static optimisation) instead of PPR-2's PostureDriver-derived pair | Pair 78 → 16 N per foot. Hip abductor tone 32 % → **4.0 %** (gluteus medius 3.6 ± 1.5 % [M], not tuned); ankle invertors 22 % → 5.4 % | control law [MODEL] |
| **T** standing tone | activation floors per anatomical muscle group = the review's **ready-stance mid values**, EMG % MVC ≈ activation | §3.1 | body / neural setting |
| **B** passive elasticity | PPR-2 values about anatomical slack: ankle 46, knee 17, hip 19, lumbar flexion 10, neck 1.6 / 2.4 N·m/rad | Loram 2007a; Riener & Edrich; Liu 2024 | body |
| **C** persistent eccentric support | strain element = generalised Maxwell body. Instantaneous stiffness K splits into a persistent arm 0.15 (residual force enhancement), a slow arm 0.30 (τ 0.5 s) and a fast arm 0.55 (τ 20 ms). The strain force does not vanish at zero velocity; it relaxes at constant length | ECCENTRIC_PERSISTENCE §recommendation (central values). PPR-2's indefinite hold overstated persistence 2.5–5 × | body |
| bidirectional short-range stiffness (**correction**) | the summed strain torque is capped at R⁺ + R⁻ (each side yields at θ_y, in stretch *and* shortening); PPR-2 capped it at the stretched side's reserve only | Huxley & Simmons; bidirectional-perturbation stiffness rises with agonist torque (Hunter & Kearney; Weiss) | body (law correction) |
| intrinsic muscle mechanics | K = Σ (e − 1)·a·capIso/θ_y with PPR-1's θ_y (ankle 0.967°, knee / hip 1°, trunk 3°); plateau e unchanged (V2 1.20–1.35, adequate per PPR-2 literature) | PPR-1 / PPR-2 | body (unchanged) |
| damping | D = 2ζ√(K·I), ζ = 0.2: ankle ≈ 1, hip ≈ 8, lumbar ≈ 10 N·m·s/rad | Within the review's ranges: ankle ≈ 1 (0.3–2), hip 3–10 (2–14), lumbar 10–40, knee ζ ≈ 0.2 | body (unchanged) |
| force–length | the net active torque uses the isometric capacity at the current angle (a mechanical muscle property) | V2's capacity model, unchanged | body (mechanics) |

**Not in S2:**
- no frozen-pose spring other than the yielding strain element. Its persistent 15 % arm is the residual force enhancement: it persists while activation is constant, and yields with the rest.
- no regulator, root constraint or impulse.

### 3.1 Tone floors (STANDING_TONE §2, ready-stance mid)

Values are % MVC as activation. Each sensitivity variant uses the review's range ends; the variants are reported, not deciding.

| Axis | Positive direction muscles | Floor | Negative direction muscles | Floor | Low / high variants |
|---|---|---|---|---|---|
| ankle df | dorsiflexors (TA) | 1 | plantar flexors | 7 | 0.5 / 2 · 5 / 10 |
| ankle inv | invertors | 2 [D gap] | evertors | 4 | 1 / 5 · 2 / 8 |
| knee flex | flexors | 3 | extensors | **8.5** (Potter & Kirby 1991: 7.6 at 10°, 10.9 at 20°) | 1 / 6 · 6 / 11 |
| knee rot | each | 3 [D gap] | each | 3 | 1 / 6 |
| hip flex | flexors | 3 | extensors | 5 | 1.5 / 4 · 3 / 8 |
| hip abd | abductors | 4 [D at 42 cm] | adductors | 3 [D gap] | 2 / 8 · 1 / 6 |
| hip rot | each | 3 [D gap] | each | 3 | 1 / 6 |
| lumbar flex | flexors | 2.5 | extensors | 7 | 1.5 / 5 · 4 / 12 |
| lumbar lat / rot | each side | 6 / 4 [E] | each side | 6 / 4 | 3 / 10 · 2 / 8 |
| thoracic flex | flexors | 2.5 | extensors | 5 | 1.5 / 5 · 3 / 9 |
| thoracic lat / rot | each side | 6 / 4 [E] | each side | 6 / 4 | as lumbar |
| neck flex | flexors | 2 [D gap] | extensors | 5 | 1 / 4 · 2 / 7 |
| neck lat / rot | each | 4 [D gap] | each | 4 | 2 / 6 |
| shoulders, elbows | each | 2 [D] | each | 2 | — |

**EMG → activation.** EMG % MVC is the review's central estimate. Curvature of the EMG–force relation could make true activation up to ≈ 2–3 × higher in large muscles at low levels [MODEL]. That is noted as a direction of uncertainty, not applied.

## 4. Calibration-stage disclosure (before the S2 freeze)

- **Entry construction**, and the cold-start check on CURRENT V2 and on PPR-2's S\*.
- **S2 with placeholder tone** (2 % floors, PPR-2's C): open-loop standing collapses within ≈ 0.5 s.
- **S2 placeholder plus a feasibility P2** (literature-scale gains): it stands for 4 s with the spine zigzagging (thoracic −17°, lumbar +13°). This is plumbing, not the P2 to be qualified.
- **The causal-identity mechanics** shown on that pair: P2 commands bit-identical until the first channel's delay.
- **Eccentric-hold mechanics** on placeholder tone: PPR-2's hold vs the literature arms.
- **The candidate S2's first 250 ms** (smoke): load 712 → 742 → 730 → 726 N; penetration 0.007 mm; separation 0.004 mm; pelvis −0.04 mm; COM 0.08 mm; max joint drift 0.25°.
- **The S2 qualification tooling** on CURRENT V2 only.

**What was not run on the candidate before the freeze:** no isolated test, push, release or eccentric-hold run, and no open-loop standing evaluation.

**How each parameter was chosen:**
- every S2 parameter comes from a literature value or a stated principle (minimum effort, bidirectional short-range stiffness);
- none was adjusted after a candidate run;
- the hip-abductor agreement with gluteus medius EMG emerged; it was not targeted.
