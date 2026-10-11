# PPR-2 preregistration: qualification of the standing substrate

Frozen together with `PPR2_FREEZE.json`, which holds the SHA-256 of every file below, and committed **before** any candidate run of this battery.

**What has already been seen:** the exploratory runs listed in `PPR2_DESIGN.md` §9. These criteria were not changed after any candidate battery result, because none exists yet.

## 1. What is qualified

| | Parameters | Role |
|---|---|---|
| **S\*** (candidate) | `PPR2_CANDIDATE_S.json`: A + A2 + B + C on PPR-1's intrinsic muscle mechanics (θ_y, ζ 0.2, a_cc 0.02) | qualified; decides the replay |
| S_A (reference) | `PPR2_REFERENCE_SA.json`: A + A2 only (corrected law, V2 body spec, no B, no C) | reported against the same criteria; decides nothing except the A / B wording in §5 |
| CURRENT V2 (reference) | IFM-1 SnapshotTone, unchanged | reported against the same criteria; decides nothing |

**Unchanged throughout:**
- V2 anatomy, masses, inertias, joint limits, colliders, contact and friction settings;
- solver (240 Hz, 150 / 2);
- RUN-1, the slide and the authoritative simulation.

**No delayed active balance, no stepping, no regulator.** S\* has no state feedback of any kind.

## 2. Battery (`ppr2/scripts/ppr2_battery.mjs`, run by `ppr2_qualify.mjs`)

The runner is alone (scene SOLO; PVP-1A-DX sealed), in the PVP-1A-DX entry pose (`pvp1/fixture/PVP1A_FIXTURE.json`, unchanged). The time step is 1/240 s.

**t0 = step 24 (100 ms).** It is the post-settle reference and the onset of every perturbation.

Every response in T2–T4 is the run **minus the same law's unperturbed run**.

| Family | Protocol | Measured |
|---|---|---|
| **T1** undisturbed standing | 960 steps (4 s) | **Envelope exit:** the first time after t0 that the departure D = max(relative pelvis drop, relative COM horizontal displacement) reaches 10 mm, or any key axis moves 3° from its t0 angle. Also: e-folding time (log-linear fit of D over 5–25 mm), start-up, energy ledger to the exit, rest separation at t0 |
| **T2** pushes | Force pulse at the pelvis COM, 12 steps (50 ms), from t0. Directions forward, backward, left, right; small / moderate / large (§3). Window W = 300 ms | Max relative deflection over the 12 key axes; relative pelvis drop; relative COM displacement at W and its peak; relative COM velocity; XcoM margin to the base of support; loss (XcoM beyond the base, or a foot below 5 N); settling ratio; minimum foot load; energy ledger; separation |
| **T3** isolated displacement | **I1 ankle platform:** both feet kinematic, toes-up about the ankles, 0.005 / 0.01 / 0.02 / 0.04 / 0.08 rad in a 41.7 ms ramp, the body above free (Vlutters 2015 / Sakanaka 2021 protocol). **Knee_R and hip_R flexion:** the child chain kinematic about the joint centre, the parent free (same semi-isolated form), ±0.01 / ±0.04 rad, 41.7 ms ramp | Stiffness from total torque (actuator + V2 passive readbacks) and **elastic** stiffness (minus the law's own damping × relative rate), on the **measured** joint angle, at the end of the ramp, 71 ms and 100 ms; peak torque rate |
| **T4** release / settling | Torque pair ±5 N·m across ankle_R dorsiflexion, knee_R flexion, hip_R flexion and lumbar flexion. Held 200 ms from t0, released, 300 ms free | Hold deflection; residual set; signed extrema about the final value; damping ratio from successive alternating extrema; growth; viscous share at 50 ms (law terms) |
| **T5** energy | T1 (start-up 0–t0 separately; t0 to exit) and all T2 runs | Cumulative ledger residual; external, actuator and passive-damping work |
| **T6** integrity | All T1 / T2 runs | Joint-anchor separation (transient; at rest at t0 and 300 ms after small pushes); stops |
| **T7** determinism | Standing 240 steps, and the moderate forward push, each run twice | Final hashes |

**Key axes:** ankle dorsiflexion and inversion, knee flexion, hip flexion and abduction (each left and right), lumbar flexion and lateral bending.

**Elastic damping term:** for S, D is from the law's per-step record. For CURRENT V2 it is SnapshotTone's D (knee 81, hip 20).

## 3. Perturbation magnitudes (PVP-independent; derived before any candidate push)

**J_lim** is the zero-delay XcoM no-step limit of this stance (Hof 2005):
- J_lim = m·ω0·margin;
- m = 73.91 kg; COM height 0.9845 m, so ω0 = 3.157 s⁻¹;
- flat-sole extents x −0.098…0.150 m and z ±0.273 m; COM x 0.0257, z 0;
- **J_lim: forward 29.09, backward 28.96, lateral 63.63 N·s.**

**Fractions of J_lim** (STANDING_SUBSTRATE_LITERATURE §perturbations: feet-in-place small Δv ≲ 0.10–0.14 m/s, moderate 0.15–0.24 m/s, stepping ≳ 0.24–0.31 m/s, against a 0.55 m/s zero-delay limit for normal stance):
- small: f = 0.25;
- moderate: f = 0.4;
- large: f = 1.5, beyond any no-step response, even a delay-free one.

| N·s | small | moderate | large |
|---|---|---|---|
| forward | 7.3 | 11.6 | 43.6 |
| backward | 7.2 | 11.6 | 43.4 |
| left / right | 15.9 | 25.5 | 95.4 |

Forward small and moderate fall inside the literature's 74 kg bands (5–8 and 12–16 N·s for brief pushes). Backward and lateral are larger than the normal-stance literature. This posture has its COM 6 cm ahead of the ankles and a 0.55 m outer stance width, so its margins are larger.

## 4. Criteria (frozen in `ppr2_eval.mjs`; all must pass)

| ID | Criterion | Basis |
|---|---|---|
| QS1 | Envelope exit ≥ 0.45 s after the entry | [E] start-up 0.10 s + 2 × loop delay (τ = 0.175 s, Peterka & Loughlin 2004) |
| QS2 | e-folding time of the departure ≥ 0.175 s (λτ ≤ 1) | [E] √2 margin on the delayed-PD stabilisability limit λτ < √2 |
| QS3 | Envelope exit ≤ 4.0 s | [M] passive mechanics plus fixed tone cannot stand. Not superhuman |
| I1a | Ankle K/mgh at the end of the ramp within [0.5, 1.5] × Vlutters 2015 (0.93·(θ/0.29°)^−0.271), all 5 amplitudes | [M/E] band = ±2 SD of Loram & Lakie 2002 |
| I1b | Ankle K/mgh at 71 ms within [0.5, 1.5] × Sakanaka 2021 (0.94·(θ/0.2°)^−0.321), every amplitude with θ ≤ 1° | [M/E] |
| I2 | Knee elastic stiffness at 100 ms ≥ 17 N·m/rad, small amplitude, both signs | [E] Riener & Edrich passive value: a lower bound only, since no standing data exist |
| I3 | Hip elastic stiffness at 100 ms within [30, 91] N·m/rad, small amplitude, both signs | [M/E] Kiemel 2008: 95–147 for both hips, so 60.5 per hip × band |
| S1 (×4) | Small: relative pelvis drop ≤ 5 mm, and relative COM displacement at 300 ms ≤ ½ the COM-to-edge margin | [D] not a floppy ragdoll |
| S2 (×4) | Small: max relative key-axis deflection ≥ 0.2° | [D] not a rigid mannequin |
| S3 (×4) | Small: RMS relative key-axis speed over 200–300 ms ≤ that over 50–150 ms | [D] the transient settles |
| S4 (×4) | Small: no loss of no-step balance within 300 ms | — |
| M1 (×4) | Moderate: max deflection ≥ 1.3 × small, and (≥ 1° or relative COM ≥ 15 mm) | [D] substantial sway or yield |
| M2 (×4) | Moderate: no loss within 300 ms | — |
| L1 (×4) | Large: loss of no-step balance within 300 ms | — |
| C1 (×4) | Per direction, the relative COM at 300 ms and the max deflection both strictly increase small < moderate < large | the required continuum |
| R1 | No growing oscillation after release | [D] |
| R2 | Where an oscillation is measurable, ζ ≥ 0.05 | [D] |
| E1 | \|Σ ledger residual\| ≤ 1 J + 5 % of \|external work\| (T1 from t0 to exit; small and moderate T2 runs) | [S] solver accuracy where the feet stay planted. The ledger has no turf-contact term, so start-up impacts and the sliding or unloaded feet of large pushes appear as residual; those are reported, not judged |
| INT1 | Transient separation ≤ 5 mm; no stop in T1 or in small / moderate pushes | [S] V2 G1 1.3a (replaces the 1 mm used in PPR-1; `PPR2_CRITERIA_AUDIT.md` §3) |
| INT2 | Separation at rest ≤ 1 mm (T1 at t0; 300 ms after each small push) | [S] V2 G1 1.3c |
| DET | Bit-identical reruns | — |

**Reported, not judged:**
- CPU per step;
- GRF peaks;
- torque peaks and rates;
- actuator, passive and external work;
- the viscous share;
- start-up.

**PPR-1's suspect criteria** (PR1, PR2, the 1 mm transient, QS3) are replaced as proposed in `PPR2_CRITERIA_AUDIT.md`:
- PR2's linear-fit damping share is replaced by R1 / R2 plus the reported viscous share;
- PR1's both-signs yield ratio is replaced by the T3 stiffness-versus-amplitude curves, judged against human curves;
- the 1 mm transient is replaced by INT1 / INT2;
- PPR-1's QS3 is replaced by QS1–QS3.

## 5. Decision rules (pre-stated)

**1. Qualification.** S\* PASSES if and only if every criterion in §4 passes on S\*.

**2. Replay** (only if S\* PASSES). Exactly once, with no retuning:
- the PVP-1A-DX collision: native contact N2 and the no-cross-contact control C0;
- CURRENT V2 and S\*, 260 steps each;
- t = 0 is the first contact step (step 3).

Reported over 0–120 ms (bins 0–25 / 25–50 / 50–80 / 80–120):
- per-joint angle change N2 − C0 for the struck leg (ankle, knee, hip) and the trunk;
- the time each first exceeds 0.5°, which shows whether the response propagates contact → ankle → knee → hip → trunk;
- the activation trace of S\*, which must be bit-identical between N2 and C0 for the whole window (no active response);
- joint torques, energy and separation.

Rendering uses TRC-1, views as in PPR-1: CURRENT V2 | S\*.

If S\* FAILS, there is **no replay**. PVP-1A-DX stays sealed, and the failures are diagnosed.

**3. Final decision:**
- **D** if a failure is attributable to V2's architecture: INT1 / INT2 / DET failures, non-finite states, or a property that cannot be represented without changing anatomy, colliders, joint limits or the actuator architecture.
- Otherwise **C** if QS3 holds on S\*, i.e. it does leave the standing envelope: quiet standing needs a continuous delayed controller plus the substrate. The report states separately:
  - whether S\* qualified as that substrate;
  - whether the B and C extensions are needed. B and C count as "needed" if S_A fails I1a or I1b where S\* passes.
- Otherwise (S\* stands passively > 4 s): **A** if S_A passes every criterion, **B** if only S\* does.

## 6. Frozen files

Listed with hashes in `PPR2_FREEZE.json`:
- `PPR2_PREREGISTRATION.md`, `PPR2_DESIGN.md`, `PPR2_CRITERIA_AUDIT.md`;
- `PPR2_CANDIDATE_S.json`, `PPR2_REFERENCE_SA.json`;
- `scripts/ppr2_substrate.mjs`, `ppr2_plant.mjs`, `ppr2_run.mjs`, `ppr2_ankle_platform.mjs`, `ppr2_battery.mjs`, `ppr2_qualify.mjs`, `ppr2_eval.mjs`;
- the fixture.
