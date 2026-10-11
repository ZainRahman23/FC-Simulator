# PPR-3 S2 preregistration: substrate qualification (S2 alone)

Frozen with `PPR3_S2_FREEZE.json` (SHA-256 of every file below) and committed **before** any qualifying S2 run. What had been seen before the freeze is listed in `PPR3_DESIGN.md` §4.

## 1. Conditions

| Condition | Parameters | Role |
|---|---|---|
| **S2** (candidate) | `params/PPR3_S2_CANDIDATE.json` | qualified; decides whether the substrate goes forward unchanged |
| S2 − T | the candidate with every floor = 0.02 (PPR-2's uniform co-contraction) | ablation, reported |
| S2 − B | the candidate without passive elasticity | ablation, reported |
| S2 − C (Hill) | the candidate with the strain force erased at constant length (fRes 0, wS 0, wF 1, τF = one step): V2's velocity-gated behaviour | ablation, reported |
| S2 / C = PPR-2 hold | the candidate with an indefinite hold (fRes 1) | ablation, reported |
| S2 tone low / high | `params/PPR3_S2_TONE_LOW.json`, `PPR3_S2_TONE_HIGH.json` | sensitivity, reported |
| CURRENT V2 | IFM-1 SnapshotTone, unchanged | reference, reported |

Every condition runs the same battery (§2) from the same entry (`fixture/PPR3_STANDING_ENTRY.json`).

## 2. Battery (`scripts/ppr3_s2_qualify.mjs`, constants `S2B`; functions `scripts/ppr3_battery.mjs`)

Runner alone, S2 with constant excitation (no controller).

**Tests begin at step 60 (250 ms),** after the entry audit window. Every disturbed run is read against its undisturbed twin.

| Family | Protocol | Read |
|---|---|---|
| **E** entry | 960 undisturbed steps | First 250 ms: foot load per step, turf penetration, joint separation, COP vs COM projection, pelvis vertical change, COM horizontal change, max key-axis drift. Open-loop envelope exit (10 mm / 3°) reported |
| **I** isolated | **ankle platform:** 0.005–0.08 rad toes-up, 41.7 ms ramp, body free. **Fast:** knee, hip, lumbar flexion, lumbar lateral, semi-isolated, ±0.01 rad, 29.2 ms ramp. **Quasi-static:** ankle, knee, hip, lumbar flexion and lateral held (both sides kinematic), ±0.01 rad | Ankle K/mgh at the end of ramp and at 71 ms. Fast elastic stiffness at 29.2 ms. Quasi-static stiffness from the substrate's own terms at 250 ms and 1 s |
| **P** pushes | Pelvis COM pulse, 50 ms, from step 60; forward / backward / left / right; small / moderate / large | Judged inside the whole-body intrinsic window (30 ms = 7 steps): max key-axis deflection and yield (strain torque at its cap). Reported to 100 ms: chronology, XcoM margin, foot loads |
| **R** hold / release | Torque pair ±5 N·m across ankle df, knee flex, hip flex, lumbar flex and lateral; 200 ms hold, release, 300 ms | Recoil at 25 / 50 ms; extrema; ζ; growth |
| **C** eccentric hold | Near-step (8.3 ms) 1° stretch of the tonically active side, then held (both sides kinematic): ankle (dorsiflexion), knee (flexion), hip (flexion) | Fraction of the stretch-induced strain torque left at 100 / 300 / 1000 ms |
| **D** determinism | 240-step standing and the moderate forward push, each twice | final hashes |

**Push magnitudes (N·s).** J = f·J_lim, the zero-delay XcoM no-step limit of this entry:
- m 73.91 kg, ω0 3.164 s⁻¹;
- flat-sole extents ≤ 5 mm above the turf: x −0.098…0.130 m, z ±0.266 m;
- J_lim forward 24.27, backward 29.01, lateral 62.22;
- f = 0.25 / 0.4 / 1.5.

| | small | moderate | large |
|---|---|---|---|
| forward | 6.1 | 9.7 | 36.4 |
| backward | 7.3 | 11.6 | 43.5 |
| left / right | 15.6 | 24.9 | 93.3 |

## 3. Windows (POSTURAL_TIMING §recommended)

- ankle 40 ms (platform ramp 41.7 ms);
- knee / hip / trunk 30 ms (fast ramp and read 29.2 ms);
- whole body 30 ms (push judgement).

**Sub-degree ankle rotations at 71 ms** are accepted because stretch reflexes are absent at sway size (Loram & Lakie 2002; Sakanaka 2016).

**Quasi-static held protocols** are compared only with human *intrinsic* low-frequency estimates (Kiemel 2008), i.e. matched protocols.

## 4. Criteria (frozen in `scripts/ppr3_s2_eval.mjs`; all must pass for S2)

| ID | Criterion | Basis |
|---|---|---|
| E1 | Foot load: steps 1–4 within ±10 % of body weight; steps 5–60 within ±1 % | [D] |
| E2 | Turf penetration ≤ 1 mm, joint separation ≤ 1 mm over 250 ms | [S] V2 G1 1.3c |
| E3 | COP within 5 mm of the COM projection from step 5 | [D] static equilibrium |
| E4 | Over 250 ms: pelvis vertical change ≤ 1 mm, COM horizontal ≤ 2 mm, max key-axis drift ≤ 0.5° | [D] no start-up transient |
| I1a | Ankle K/mgh at the end of the 41.7 ms ramp within [0.5, 1.5] × Vlutters 2015, all 5 amplitudes | [M/E] |
| I1b | Ankle K/mgh at 71 ms within [0.5, 1.5] × Sakanaka 2021 for rotations ≤ 1° | [M/E] |
| I2 | Ankle quasi-static (1 s) K/mgh within [0.13, 0.75] | [M/E] Loram 2007a passive floor; 1.5 × Kiemel ≈ 0.5 |
| I3 | Hip quasi-static (1 s) per side within [24, 111] N·m/rad | [M/E] Kiemel 2008 |
| I4 | Knee quasi-static (1 s) ≥ 17 N·m/rad | [E] Riener & Edrich passive; lower bound only |
| I5 | Lumbar flexion fast elastic stiffness within [55, 164] N·m/rad | [M/E] Brown & McGill 2009 intrinsic 109 |
| I6 | Lumbar lateral fast elastic stiffness ≥ 55 N·m/rad | [M/E] Brown & McGill 2009, lateral ≥ flexion |
| P1 | Small pushes (×4): no key axis yields within 30 ms, and some key axis deflects ≥ 0.01° | [D] resisted but compliant |
| P2 | Max deflection at 30 ms: small < moderate < large in every direction | [D] continuum |
| R1 / R2 | Release: no growing oscillation; ζ ≥ 0.05 where measurable | [D] |
| C1 | Eccentric hold fractions at 100 / 300 / 1000 ms within [0.25, 0.60] / [0.15, 0.45] / [0.08, 0.35] at ankle, knee and hip | [LIT-MODEL] |
| INT | Separation ≤ 5 mm in every push; no stop in small or moderate pushes | [S] |
| DET | Bit-identical reruns | [S] |

**Reported, not judged:**
- open-loop standing exit time and mode;
- fast hip / knee stiffness;
- push chronology and foot loads to 100 ms;
- CPU.

## 5. Decision rules (pre-stated)

1. **S2 passes** iff every criterion in §4 passes on the candidate. It then goes forward unchanged to P2 design.
2. **If S2 fails**, each failure is diagnosed. A labelled successor (S2b, …) is created only for an identified causal failure, with an independently justified change, and is qualified on this same frozen battery. Every result is preserved.
3. **Individual support for B, C, T** (final report §4). A component counts as **supported by this battery** if removing it (ablation §1) makes at least one §4 criterion fail that the candidate passes, *or* moves a measured quantity outside its human range. Otherwise it is reported as **not shown necessary by this battery**: the literature may still support it, but the battery cannot discriminate.

## 6. Frozen files

`PPR3_S2_FREEZE.json` lists the SHA-256 of:
- `PPR3_DESIGN.md`, `PPR3_S2_PREREGISTRATION.md`, `PPR3_CRITERIA_AUDIT.md`;
- `params/PPR3_S2_CANDIDATE.json`, `params/PPR3_S2_TONE_LOW.json`, `params/PPR3_S2_TONE_HIGH.json`;
- `fixture/PPR3_STANDING_ENTRY.json`;
- `scripts/ppr3_entry.mjs`, `ppr3_body.mjs`, `ppr3_statics.mjs`, `ppr3_run.mjs`, `ppr3_measure.mjs`, `ppr3_battery.mjs`, `ppr3_s2_qualify.mjs`, `ppr3_s2_eval.mjs`;
- the three PPR-3 literature reviews;
- the PPR-2 / PPR-1 / PVP-1A modules they import.
