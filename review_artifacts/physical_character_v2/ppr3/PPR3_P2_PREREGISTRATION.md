# PPR-3 P2 preregistration: S2 + P2 qualification

Frozen with `PPR3_P2_FREEZE.json` and committed **before** the qualifying S2 + P2 run. What was seen during design is in `PPR3_P2_DESIGN.md` §5.

## 1. System

- **S2:** `params/PPR3_S2_CANDIDATE.json`, unchanged (qualified 18 / 18).
- **P2:** `params/PPR3_P2_CANDIDATE.json`.
- **Entry:** `fixture/PPR3_STANDING_ENTRY.json`. P2's history at t < 0 is the entry sample.
- **Runner alone.** No stepping. PVP sealed.

## 2. Battery (`scripts/ppr3_p2_qualify.mjs`, constants `P2B`)

| Family | Protocol | Read |
|---|---|---|
| **U** undisturbed | 60 s (14,400 steps) with motor noise | Fall; first 250 ms audit; posture drift (last 10 s vs 1–2 s); COM / COP sway from 2 s; separation; penetration |
| **P** pushes | Pelvis-COM pulse, 50 ms, at t = 2 s; fwd / back / left / right × small / moderate / large (same magnitudes as the S2 battery: 0.25 / 0.4 / 1.5 × this stance's zero-delay limit); 4 s window | Recovery (fall cause / time, COM peak and its time, settling time); full causal chronology against the undisturbed twin; neural-torque onset per joint family; 1 s metrics; the same push on the **S2-replay** twin (undisturbed commands = mechanics only) |
| **M** human-matched | Rietdyk 1999 form: 20 N·s over 350 ms at the pelvis, forward and left | Recovery, COM peak and time, settling, chronology |
| **T** thresholds | Bisection (7 iterations, from 0 to the large impulse) on the 50 ms pelvis pulse, forward and left | Smallest impulse that loses no-step balance within 4 s |
| **D** determinism | 4 s standing; moderate forward push; each twice | final hashes |

**Fall / loss of no-step balance:** within 4 s of onset, any of:
- the COM horizontal projection leaves the base of support (sole contacts within 5 mm);
- the pelvis drops > 150 mm relative to the twin;
- a foot carries < 5 N for > 50 ms.

**Recovered:** no fall, and over the last 1 s the COM is within 10 mm of the twin and the pelvis within 10 mm.

## 3. Human references (from the PPR-3 reviews)

| Measure | Human value | Source |
|---|---|---|
| COM sway RMS | 4.1–4.3 mm AP, 1.7–2.0 mm ML | Foulger 2025; narrower stance |
| Automatic postural EMG | 100 ± 20 ms (60–145) | Horak 1989 |
| Active torque | ≈ 100–160 ms | Robinovitch 2002: 99 ms |
| Pelvis push recovery, 20–23 N·s | COM peak 56–70 mm at ≈ 0.5–0.6 s; response lasts 2–3 s | Rietdyk 1999; 86 kg, hip-width stance |
| Feet-in-place limit | ≈ 0.44–0.56 × the zero-delay XcoM limit | PPR-2 literature |

## 4. Criteria (frozen in `scripts/ppr3_p2_eval.mjs`; all must pass)

| ID | Criterion |
|---|---|
| U1 | 60 s undisturbed with noise: no fall, no stop |
| U2 | First 250 ms with P2 running: the S2 entry criteria (load, penetration, separation, COP under COM, no start-up transient) |
| U3 | No slow fold or creep: last-10-s mean vs 1–2 s mean: key axes ≤ 3°, pelvis ≤ 10 mm, COM ≤ 15 mm |
| U4 | Alive but bounded: COM RMS AP within [1.0, 12.9] mm, ML within [0.43, 6.0] mm |
| U5 | Separation ≤ 5 mm, penetration ≤ 1 mm over 60 s |
| P1 | Small pushes (×4) recovered without a step |
| P2 | Moderate pushes (×4) recovered without a step |
| P3 | Large pushes (×4) lose no-step balance within 4 s |
| P4 | COM peak excursion: small < moderate < large in every direction |
| P5 | **Causality:** every push, P2 commands bit-identical to the twin until the disturbance enters P2's delayed sensory state; first command difference ≥ onset + 1 + 6 steps; no activation difference before it |
| P6 | First neural torque change (> 0.1 N·m) at ankle / knee / hip / lumbar ≥ 60 ms after onset; ≤ 200 ms for moderate pushes |
| M1 | Rietdyk-form pushes: recovered; COM peak within [24, 120] mm; time to peak within [0.25, 1.0] s; settled by 3.5 s |
| T1 | Threshold forward within [8.5, 19.4] N·s, lateral within [21.8, 49.8] N·s ([0.35, 0.80] × the zero-delay limit) |
| DET | Bit-identical reruns |

**Reported, not judged:**
- COP velocity (contact-solver jitter, even after a 100 ms moving average);
- the S2-replay decomposition;
- per-family torque onsets;
- energy;
- CPU.

## 5. Decision rules (pre-stated)

1. **S2 + P2 qualifies** iff every §4 criterion passes. The standing foundation is then established and PPR-3 stops for review (stop condition A).
2. **If it fails,** each failure is diagnosed. A labelled successor (P2b, …) is made only for an identified causal failure, with an independently justified change, and is re-qualified on this same frozen battery. If the failure traces to a property needing an architectural decision, PPR-3 stops (stop condition B).
3. **Answer to "what P2 adds":** the S2-replay twin vs live S2 + P2, per push, recorded together with the chronology.

## 6. Frozen files

`PPR3_P2_FREEZE.json` lists the SHA-256 of:
- `PPR3_P2_DESIGN.md`, `PPR3_P2_PREREGISTRATION.md`;
- `params/PPR3_P2_CANDIDATE.json`, `params/PPR3_S2_CANDIDATE.json`;
- `fixture/PPR3_STANDING_ENTRY.json`;
- `scripts/ppr3_ctrl.mjs`, `ppr3_statics.mjs`, `ppr3_body.mjs`, `ppr3_run.mjs`, `ppr3_measure.mjs`, `ppr3_battery.mjs`, `ppr3_p2_qualify.mjs`, `ppr3_p2_eval.mjs`;
- the imported PPR-2 / PPR-1 / PVP-1A modules.
