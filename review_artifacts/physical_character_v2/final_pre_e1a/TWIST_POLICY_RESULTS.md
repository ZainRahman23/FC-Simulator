# Posture / twist policy: results of the preregistered comparison (final pre-E1a stage, §1)

**Preregistration:** `TWIST_POLICY_PREREG.md` (commit d22a1e7, before any official run).
**Tools:** `tools/twist_policy_battery.mjs`, `tools/twist_policy_eval.mjs`.
**Evidence:** `evidence/policy/` (1,152 runs + 96 LIFT re-runs).

## 0. Process notes (recorded, not hidden)

1. **LIFT results were re-run.**
   - I changed experimental lifecycle code while the battery was running (touchdown debounce, actual-frame servo). The LIFT scenario is the only one that uses the lifecycle, so its first results mixed code versions.
   - All 96 LIFT runs were re-run on the final code. The evaluation uses only the re-runs (`--lift`).
   - Every other scenario runs with the lifecycle off; the default path was verified bit-identical after each edit.
2. **266 jobs crashed and were re-run.**
   - Two of my edits briefly broke a shared module: a missing import, then a mid-line comment in `gates/v2_g1.js` that swallowed the rest of a line, fixed in 6c8140c.
   - The crashed jobs produced no result files. They were re-run on the fixed code (0 errors).

## 1. Result (criteria exactly as preregistered)

| k | policy | eligible? | failing criteria (bodies) |
|---|---|---|---|
| **0.13** | **ref** | no (strict) | **C1 on V2-165-62 only:** HO3, a 15 N·s backward push, **fells that body under every policy including "current"**; the twist of a fallen body is then classified "sustained / growing" |
| 0.13 | b50 | no | C1 (V2-165-62, same fall); **C4** (V2-190-85, V2-198-92: the voluntary turn still drifting > 1° between 6 and 12 s) |
| 0.13 | b35 | no | C1 (same fall); C4 (V2-198-92) |
| 0.13 | d1 / d2 | no | C1 (same fall); **C4 on 7 bodies**; d1 also C3 on V2-190-85 |
| 0.13 | current | no | C1 (5), C2 (6: actuator-powered twist work), C3 (7: twist adopted), C4 (6), C5 (1), C6 (6) |
| 0 | every policy | no | C4 on 4–8 bodies (the turn does not settle); C6 on 7–8 bodies (stance ankle > 5° under the gentle lift: no yaw anchor in the ±10° free zone); drift policies fail C3 on all 8 bodies |

**Reported metrics** (medians over 8 bodies, k = 0.13):

| | ref | b50 | b35 | d1 | d2 | current |
|---|---|---|---|---|---|---|
| settle time after PY4 / PR8 (s) | **2** | 4 | 6 | 5 | 4 | 6 |
| SB: pelvis-yaw peak under 2 N·m (°) | 10.7 | 7.3 | 6.5 | 9.2 | 9.8 | 5.7 |
| SB: ankle twist left 6 s after release (°) | 0.16 | 0.32 | 0.07 | 0.72 | 0.45 | **4.76** |
| TURN: pelvis yaw at 12 s (cmd 20°) | 20.0 | 20.0 | 20.0 | 20.0 | 20.0 | 16.4 |
| U:R / T5 ankle twist peak (°) | 1.3 / 1.3 | 1.4 / 1.3 | 1.4 / 1.3 | 1.4 / 1.3 | 1.3 / 1.3 | 1.4 / 1.6 |
| HO1 stance-ankle peak (°) | 9.3 | 11.0 | 11.4 | 10.3 | 9.9 | 12.9 |
| LIFT stance-ankle peak (°) | **1.3** | 1.8 | 2.3 | 1.6 | 1.4 | 5.8 |
| PY4 hip-rotation actuator work, 12–20 s (J) | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | **5.15** |

## 2. Reading

1. **"current" is rejected.** It is an energy source (5.15 J of hip-rotation work after a disturbance). It adopts accidental twist (4.76° left 6 s after release, C3 on 7 bodies). It sustains oscillation (C1 on 5 bodies). It even fails to hold a voluntary turn (16.4° of 20°).
2. **The drift policies are falsified on the semantics they were designed around.**
   - At k = 0 they adopt the sustained deviation on all 8 bodies (C3; 7.8–8.3° left).
   - At k = 0.13 the ankle's own stiffness masks the adoption in C3, but they fail to hold the voluntary turn on 7 bodies (C4).
3. **Blend α = 0.5 / 0.35:** a reference policy with reduced restoring stiffness. They recentre fully (C3 passes), but the residual "follow-the-twist" fraction (1 − α) lets the voluntary turn creep on heavy bodies (C4).
4. **Reference** (twist DOFs targeted at the anatomical neutral; voluntary turns only through the heading command) meets every criterion on every body except the shared HO3 fall. It has:
   - the fastest settling (2 s);
   - the smallest single-support excursion under the lift (1.3°);
   - zero actuator work in the twist direction.

   It is the most compliant in pelvis yaw under a sustained torque (10.7°). That is the honest whole-body yaw stiffness, about 2k through the ankles plus the shear couple: the hips no longer hide the compliance by parking the legs at the ankle end ranges.
5. **No policy satisfies the semantics at k = 0.** The ±10° zero-stiffness ankle zone lets voluntary turns oscillate and single-support yaw go unanchored. **The posture policy needs the evidence-supported ankle stiffness** (`ANKLE_LAW_RESULTS.md`).

## 3. Why reference is the right semantics (independent of gate scores)

| requirement | reference | blend | drift |
|---|---|---|---|
| a voluntary turn is not dragged back | ✓: turns are commands to the heading target and go to the hips; the twist reference is joint-space anatomical neutral, not a world orientation | ✓ (but creeps on heavy bodies) | ✗ (creeps: the reference adopts transient twist during the turn) |
| accidental twist is not adopted | ✓: restored with full stiffness, never becomes a target | ✓: restored with α-stiffness | ✗ by construction (a twist held longer than τ becomes the target) |
| not an energy source | ✓ | ✓ | ✓ |
| controller state | none | none | a filter state |

**A deliberate leg twist** (e.g. a planned toe-out or a knee-axial setting for a foothold) enters reference semantics as an explicit command to the twist reference (`REACHABILITY_CONTRACT_FINAL.md`: the planned knee axial). It never enters by state adoption.

## 4. Decision

- **Strict preregistered outcome: no policy is eligible** at k = 0 or k = 0.13. The only obstacle for reference is HO3 on V2-165-62.
- **HO3 is a preregistration flaw on my part.** I set its magnitude from V2-REF's push boundary without checking the lightest body, so the scenario measures that body's push capacity (every policy falls, "current" included), not twist stability.
- **Under the rules I do not re-score it and do not adopt.**
- **Decision for you:** adopt **reference** semantics (`ikRefTwist`, with explicit twist commands for planned twists), together with the ankle law it requires.
- **Falsification at 180 / 480 Hz** (preregistration §4.5): results in `RATE_PERFORMANCE.md`.
