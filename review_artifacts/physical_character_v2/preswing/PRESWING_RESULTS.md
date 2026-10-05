# Pre-swing / contact-boundary candidate P\*: validation results

**Inputs:**
- **Frozen inputs:** `PRESWING_VALIDATION_PREREG.md`, manifest and tools at commit **abdd3da**, before any official run.
- **Official run:** a clean scratch copy of abdd3da (`evidence/validation/commit.txt`, tree clean), 13:41–14:12:
  - 924 runs plus the 32-run external-lift matrix;
  - browser = Node on the 3 W runs;
  - the G0–G3 battery `scripts/regress_battery_pstar.sh` on commit 9ef02bf. It differs from abdd3da only in E1a / E1b tooling: no controller change.
- **Evaluator:** `tools/preswing_eval.mjs`, exactly as frozen (`evidence/validation/eval.log`, `eval.json`).

## 0. Bottom line

**VALIDATION PASS: V1–V15 all pass.** By the prereg (§5), P\* is adopted (PS-2), the E1a configuration is versioned (`../knee_correction/E1_PREREGISTRATION_V2_CONFIG_PSTAR.md`), and E1a is rerun as frozen.

## 1. Criterion table

| # | result | values |
|---|---|---|
| V1 | PASS 240 / 240 | Released by ramp end + 2 s (t_rel − ramp end −0.61…1.75 s). Then no contact loss, LOAD_ACCEPT or chatter; load max 2.17 N (≤ loadOn); resting load 0.90–1.49 N |
| V2 | PASS 240 / 240 | 2 % never released |
| V3 | PASS 240 / 240 | Contact-point slip across release ≤ 0.038 mm (≤ 0.5); whole rest window ≤ 0.089 mm; tilt ≤ 0.22°, yaw ≤ 0.37° |
| V4 | PASS 608 / 608 | Stance slip ≤ 0.312 mm |
| V5 | PASS 128 / 128 | Every lift (2 mm slow crossing, 5, 10, 20 mm; 1.5 / 2.5 cm): one AIRBORNE, one TOUCHDOWN, no bounce, one LOAD_ACCEPT, final SUPPORT, no chatter |
| V6 | PASS 32 / 32 | After a 2 s crossing of the 0.5 mm touch gap, the 2 mm dwell's clearance min is 1.99 mm |
| V7 | PASS | 2.5 cm: 5 mm hover error ≤ 1.28 mm (RMS ≤ 0.42); 20 mm ≤ 0.89 mm. Touchdown ≤ 1.39 mm from the anchor; impact ≤ 0.02 % BW |
| V8 | PASS 128 / 128 | No fall or chatter; resting-foot contact-point slip after perturbation ≤ 1.89 mm; outcomes identical to C (64 recovered, 64 stood) |
| V9 | PASS 793 / 793 | Closure ≤ 0.024 J / tick, Σ+ ≤ 0.114 J. Applied Δτ ≤ 6.89 N·m; Δτ0 ≤ 11.08 N·m. Over-capacity 0; authority writes 0; impulse = scheduled |
| V10 | PASS 32 / 32 | 180 / 480 Hz |
| V11 | PASS 3 / 3 | Determinism |
| V12 | PASS 3 / 3 | Browser = Node (b3116c3e, e8322c2a, fe00791a) |
| V13 | PASS 32 / 32 | External-lift matrix: no fall, no chatter, closure ≤ 7.1e-3 J / tick; applied Δτ ≤ 11.07 N·m |
| V14 | PASS 3 / 3 | Official touch-rest runs hash-identical (the new code is inert without its flags) |
| V15 | PASS | G0–G3 (`evidence_regression/`): see the breakdown below |

**V15 breakdown:**
- KV0 identical; suite 58 / 58; V1 guard OK; bench identical.
- G0 51 / 52 (0.V1 checkout-only).
- G1 74 / 74 hash-identical to qualification v2.
- G2 11 / 11; G3 v3.3 17 / 17 with K′; J2a 81 / 81.
- Twist battery C1′ / C7′.
- KV6c 8 / 8; boundary harness 9 / 9; yaw decomposition.
- Browser G1 10 / 10, G2 6 / 6, G3 4 / 4.

**Fast-perturbation slip, P\* vs C** (V8, reported):

| perturbation | P\* | C |
|---|---|---|
| forward push | 1.89 mm | 7.87 mm |
| push away | 0.48 mm | 5.17 mm |
| ±15° turns | ≤ 1.38 mm | ≤ 9.12 mm |
| other perturbations | ≤ 0.31 mm | ≤ 0.15 mm |

**Other reported values:**
- **REL0** (drop 0, 2 s transfer): release −0.35…2.40 s after the ramp end; 16 / 16 rest cleanly after release. This is the pre-existing allocation debt (PS-1), not gating.
- **Lifts at 1.5 cm:** 5 mm hover error ≤ 2.90 mm; 20 mm ≤ 1.06 mm.
- **Controller cost:** the median rises about 1–2 % overall and about 12 % in the released / lift phases (the extra linearised IK rate evaluation): 0.108–0.112 vs 0.096–0.099 ms per tick. The p95 stays within the machine-noise band (`evidence/validation/perf*.json`).

## 2. B1 on its own merits (`evidence_b1_regression/`)

**B1 alone (adopted + `ffLockedAxis`):** every G0–G3 item passes **except G3 I2**. V2-long-legs' swing-ready unload (U:R / U:L) slides its released foot 5.03 mm with a 0.34 mm lift. That is the pre-existing touching-hold defect: B1 correctly makes release reachable, and the old hold then fails as diagnosed.

**Conclusion:**
- B1 is a correct, verified fix.
- It must not be adopted without the touching-foot hold.
- In P\* (B1 + hold) I2 passes.

*(The frozen regression evaluator prints a static "configuration C" label in every battery's log.)*
