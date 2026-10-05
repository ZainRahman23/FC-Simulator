# Pre-swing / contact-boundary candidate P\*: final preregistered validation (frozen BEFORE any official run)

**Authority:** `../sources/2026-10-05_user_instruction_preswing_contact_boundary_runway.md`.

**Evidence for the choice:** `PRESWING_INVESTIGATION.md` and the lab archives in `evidence/` (development data). None of the official runs below has been run.

**Status:**
- This document, the manifest and the tools are committed together before the official run.
- Criteria and thresholds are not changed after results. A later defect is recorded as an erratum next to the frozen text.
- All earlier preregistrations and failed evidence (touch-rest C, TR-1…TR-3) stay as they are.
- Default path: every switch is default OFF (KV0 identical; suite 58 / 58).

## 1. Candidate P\* (configuration under test)

**P\* = the adopted pre-E1a configuration** (v2k central knee, ankle k 0.13, G3 stand + `ikRefTwist` + `lifecycle`) **+** stand options `{ ffLockedAxis: true, touchRest: true, lcVff: "lin", lcTouch: { reseed: true } }`:

- **B1 (`ffLockedAxis`)** is the separately verified locked-axis feed-forward fix. Its own G0–G3 regression is evidence for its separate adoption decision (§5).
- **touchRest** keeps a resting foot's vertical target at the surface, plus a seat of loadOff / 2 through its leg's feed-forward (the touch-rest work).
- **`lcVff: "lin"`** is the contact-consistent desired-velocity feed-forward for a non-supporting leg.
  - **The velocity reference ω\*:** the rate of the leg's bounded IK solution caused by pelvis motion (a still foot is not dragged by the leg's damping). While a swing target is commanded on consecutive ticks, it also includes the commanded target's own motion.
  - **How it is computed:** one damped Gauss–Newton step (the IK solver's own damping μ0) on the residual difference, taken from the current solution with box-active coordinates held.
  - **How it enters the command:** τ0 += (1 − s)(D + dt·K)·ω\*.
- **`lcTouch.reseed`:** while a foot rests in contact (UNLOADING / TOUCHING / TOUCHDOWN / LOAD_ACCEPT) with no swing target, the contact anchor's horizontal place and yaw re-seed to the foot. Height and tilt are kept.
- The leg frame stays the original min(target, actual) pelvis height.

## 2. Dataset (`manifest.json`, `tools/preswing_manifest.mjs`; runner `tools/preswing_char.mjs`)

**Scenarios** (`gates/v2_unload.js`):
- settle;
- planned pelvis drop d;
- transfer of the stance share 0.5 → 1 − r over `ramp` from 3 s;
- then optionally a lift, a thorax push, a voluntary turn or a pelvis bump.

**What is unseen:** relative to development (4 body / foot cases at 2.5 cm; ramps 2 / 4; 5 N·s pushes at 8.5 s; ±20° turns; ±5 mm bumps), the dataset uses all 8 bodies and both feet, drops 1.0–3.0 cm, ramps 3 and 6 s, 4 N·s pushes at 9.0 s, ±15° turns, ±3 mm bumps, a 10 mm lift and lifts at 1.5 cm.

| set | definition | runs |
|---|---|---|
| **REL** | 8 bodies × L / R × drops {1.0, 1.5, 2.0, 2.5, 3.0} cm × ramps {3, 4, 6} s × r ∈ {0, 2 %} | 480 |
| REL0 | drop 0, 2 s transfer (the R1 regime); **reported** | 16 |
| **LIFT** | 8 × 2 × drops {1.5, 2.5} cm × lifts: X2 (2 mm, 2 s slow crossing, 1 s dwell), E5 (5 mm, the E1a sequence), M10 (10 mm), E20 (20 mm, the E1b sequence) | 128 |
| **FAST** | 8 × 2 × 8 perturbations after release (thorax 4 N·s F / B / toward / away; turns ±15° in 1 s; pelvis bumps ±3 mm; at 9.0 s; 2.5 cm) × arms {P\*, C = B1 + touchRest} | 256 |
| RATE | 180 / 480 Hz × 8 bodies (L) × {E5 lift, +15° turn} | 32 |
| DET | 3 repeat pairs (E5 lift, +15° turn, push away) | 6 |
| W | browser = Node: E5 lift, −15° turn, push toward | 3 |
| REPRO | 3 official touch-rest runs with their own flags (scope) | 3 |
| BOUNDARY | external-lift harness: 8 bodies × 30 / 60 N × drop 0 / 2.5 cm (`tools/boundary_probe.mjs`) | 32 |
| REGRESSION | G0–G3 battery (`scripts/regress_battery_pstar.sh`; evaluator `tools/touchrest_regress_eval.mjs`, unchanged) | — |

## 3. Acceptance criteria (all must hold)

**Thresholds come from existing definitions, never from data.**

| # | set | criterion | origin |
|---|---|---|---|
| **V1** | REL, r = 0 (240) | released by ramp end + 2 s. Then, until the end: no LIFTOFF / AIRBORNE / LOAD_ACCEPT; no chatter (either foot); sensed load ≤ loadOn; resting load (mean over the last 2 s) in (0, loadOff) | touch-rest R1 (E1a time-out); lifecycle constants |
| **V2** | REL, r = 2 % (240) | never released (no transition of foot n) | touch-rest R2 |
| **V3** | REL, r = 0 | **contact-point slip** over [t_rel − 0.1, t_rel + 0.5] s ≤ 0.5 mm | touch-rest R7's threshold, on the quantity it meant (TR-3: R7's origin metric measured rotation about a fixed contact point) |
| **V4** | REL, LIFT | stance-foot slip ≤ 1.0 mm | E1a-4 |
| **V5** | LIFT (128) | no contact loss or LOAD_ACCEPT after release before the command; exactly one AIRBORNE and one TOUCHDOWN; no bounce; exactly one LOAD_ACCEPT; final SUPPORT; no chatter | E1a-6 |
| **V6** | LIFT X2 (32) | after a slow (2 s) crossing of the 0.5 mm touch gap, the 2 mm dwell's minimum sole clearance is > 0.5 mm (clear of the touch gap) | redesigned R3 (§4) |
| **V7** | LIFT | at 2.5 cm: E5 hover error max ≤ 3 mm, RMS ≤ 2 mm, clearance ≥ 3 mm for ≥ 80 % of the hover; E20 hover error max ≤ 5 mm. All lifts: touchdown ≤ 5 mm from the anchor; impact ≤ 25 % BW | E1a-3, E1b-3, E1a-12 |
| **V8** | FAST, P\* (128) | no fall; no chatter; resting-foot contact-point slip from the perturbation to the end ≤ 20 mm; outcome class no worse than C's for the same case | G2's 20 mm relocation line; no regression vs C |
| **V9** | all P\* runs | closure increment ≤ +0.05 J per tick; Σ+ ≤ 0.5 J; over-capacity 0; authority writes 0; external impulse = the scheduled push only. Except FAST pushes: applied Δτ ≤ 10 N·m (≤ 25 at a contact onset and the next tick); Δτ0 ≤ 30 N·m | E1a-7 / -8 / -9 |
| **V10** | RATE (32) | 180 / 480 Hz: V5 rules for the lift; the turn without fall or chatter; energy as V9 | rate robustness |
| **V11** | DET | the three pairs are bit-identical | E1a-11 |
| **V12** | W | browser hash = Node hash at every 1 s mark and the end, 3 / 3 | gate browser rows |
| **V13** | BOUNDARY (32) | no fall; no chatter; closure ≤ 0.05 J per tick. Torque steps reported | the V3.9 rule (unload-fix / touch-rest regression) |
| **V14** | REPRO | hash-identical to the official touch-rest runs (`../touch_semantics/evidence/results_all_2146.tgz`) | scope: the new code is inert without its flags |
| **V15** | REGRESSION | every V3 item of the unload-fix regression rules (`../unload_fix/UNLOAD_FIX_PREREG.md` §4) for P\* | G0–G3 |

**Reported, not gating:**
- REL0 (drop 0, 2 s transfer): release time and rest quality;
- lift accuracy at 1.5 cm;
- liftoff delay;
- rotation of the resting foot;
- FAST slip per perturbation for P\* and C;
- external-lift torque steps;
- controller cost (`tools/touchrest_perf.mjs` extended to P\*).

## 4. Changes relative to the touch-rest criteria (stated so they are visible)

1. **R7 → V3: the same 0.5 mm threshold on the quantity R7 was meant to measure.** TR-3 showed the origin displacement R7 measured is the foot rocking about a fixed contact point (no slip). V3 uses contact-point slip. The rotation is reported.
2. **R1's absolute deadline at drop 0 / 2 s transfer is reported (REL0), not gating.** `PRESWING_INVESTIGATION.md` §6 attributes it to pre-existing allocation dynamics: the lever-rule share leak during a slow COM convergence on straight legs, which the original configuration shows too. The deadline stays gating for every drop of 1–3 cm and ramps of 3–6 s (V1), and E1a's own 2 s time-out is unchanged.
3. **R3 → V6, the boundary test redesigned:**
   - **The touch-rest R3 commanded a hover at exactly the 0.5 mm touch-sensing gap.** That tests the sensor, not the transition.
   - **V6 tests a slow crossing through the gap** (2 mm over 2 s, about 1 mm/s at the gap) and a dwell clear of it.
   - **The 2 mm dwell is derived from the servo characterisation** (development hover error ≤ 1.3 mm), not from the R3 failures.
   - **No spatial hysteresis is introduced:** development slow crossings showed no flicker (`PRESWING_INVESTIGATION.md` §5).

These are your decisions to confirm or overturn. They are reported in the morning report.

## 5. Adoption, E1a, E1b (only if §3 passes entirely)

1. **Adopt** the justified fixes:
   - B1, on its own regression evidence plus V15;
   - touchRest;
   - `lcVff: "lin"`;
   - `lcTouch.reseed`.

   Record this in DECISIONS.
2. **Version the E1a configuration** in `../knee_correction/E1_PREREGISTRATION_V2_CONFIG_PSTAR.md`. `tools/e1a_run.mjs` and `tools/e1a_eval.mjs` change **only** the configuration they set and assert:
   - a `--config=PSTAR` option;
   - the default configuration stays the original and must reproduce an official E1a run hash-identically.
3. **Rerun E1a exactly as frozen:**
   - 8 bodies, left foot lifted, plus the mirrored V2-REF run and the V2-REF repeat;
   - all criteria E1a-1…17, unchanged.
4. **If E1a passes, run E1b under its existing preregistration** (`../final_pre_e1a/E1_PREREGISTRATION.md` §4–§6). Its harness is built from the E1a harness with only the E1b protocol values: 20 mm, 0.6 s, 1.5 s hover, and the listed perturbations. It is committed before its run. **G4 is not started.**
5. **If anything fails:** diagnose causally, do not tune, do not loosen.

## Development record (at the freeze)

**Smoke check of the runner** (not evidence): 5 manifest entries (REL 1.5 cm / 3 s; LIFT X2 at 1.5 cm; FAST −15° turn P\* and C; REPRO lift). All ran as the mechanism predicts, and the REPRO run is hash-identical to its official touch-rest result.

**Tools frozen with this document:**
- `tools/preswing_manifest.mjs`, `tools/preswing_char.mjs`, `tools/preswing_eval.mjs`;
- `scripts/regress_battery_pstar.sh`;
- `tools/touchrest_perf.mjs` (P\* arm added).

**The B1-only G0–G3 regression** (`scripts/regress_battery_b1.sh`) was started before this freeze. It is evidence for §5 step 1, not a criterion of P\*.
