# COUNTERFACTUAL DIAGNOSTIC CF-2 (on CF-1, forward only) — V2 now executes 9 consecutive genuine physical alternating steps on every body and side (72 physical steps), with every physical metric stationary. It then stops at a planner frame assumption (A), not a physical limit. Verdict GREEN (provisional, quasi-static scope)

> **Counterfactual diagnostic only** (the user's approval, 8 Oct 2026, saved verbatim in `../../sources/`).
> - CF-1 and CF-2 are not adopted V2 functionality. They qualify nothing and alter no E2 / TD2C verdict.
> - They live only in `tools/loco_probe.mjs` (`--cf=2` = CF-1 + CF-2, forward only; default off).
> - No controller, planner, lifecycle, touchdown, body, contact, actuator, capacity, swing-servo, hard-limit, clearance or physics code changed.
> - With `--cf=0` and `--cf=1` the harness reproduces the two previous studies bit-identically (16 / 16 each).

**Runs:** 240 Hz, the same 4 bodies, deterministic nominal forward step-to stepping.
1. Staged 2-step runs, left-first then mirrored right-first (8).
2. 20-step runs that stop at the first substantive failure (8). The staged runs are exact prefixes of these: running hashes are equal to 24 s.
3. Design-diagnosis runs (4, CF-1).

Wall time is about 49 s per 20-step run.

**Files:**
- Tables: `CF2_TABLES.md` (per-step accumulation for every step of every run) and `CF2_DESIGN_DIAGNOSIS.md`.
- Evidence: `evidence/`.
- Reproduction: `scripts/run_cf2.sh`.

## 1. Why the single-step planner rejected the trailing leg, and the mechanism chosen

**Diagnosis** (CF-1's refused step-2 decisions; `CF2_DESIGN_DIAGNOSIS.md`):

| quantity | value |
|---|---|
| ankle DF the trailing leg's mid-swing (φ 0.1 – 0.6) needs, with the sole flat | 20.1 – 25.3° |
| knee flexion at those samples | 25 – 41° |
| static soft-box ankle DF bound | 20°: the knee-straight active-ROM value (`rom.df.active`) |
| the body model's own pose-dependent soft limit | 24.2 – 26.8° at those knee angles: 20° + 15°·clamp(kneeFlex / 90°, 0, 1), Cho 2016 (`spec` COUPLINGS) |
| hard limit | 45° |

The coupled law is already applied by the physics' passive tissue layer (`sim/v2_passive.js` COUPLING_LAWS). Every refused sample lies inside it, with 1.3 – 4.4° to spare. **The rejection was the planner / IK box being more conservative than the body,** not the body.

**Alternatives evaluated and not needed:**
- **Toe-down foot pitch.** It would need 0.1 – 5.3° and would lower the lowest boot point by up to 11.7 mm, against a 6.5 mm swing clearance. It is a new rule.
- **A pelvis-aware path check.** The pelvis sways 12.7 – 14.7 mm mid-swing (mostly backward, back to 2.3 – 2.7 mm at touchdown). The existing COM-reference model predicts no pelvis motion during an E2 swing, so this would need a new pelvis model.

Neither is necessary: the coupled limit alone covers every refused sample.

**CF-2:** when a soft-bounded leg-IK solve fails the static box, it is retried with the ankle DF bound set to the body's coupling law at the solution's own knee flexion.
- A fixed point with ≤ 2 refinements; the result is accepted only if its DF ≤ the law at its own knee flexion.
- The law is applied convention-free from each body's spec: static bound + 15°·clamp(kneeFlex / 90°), knee flexion measured from its soft lower bound.
- Every solve the static box already reached is untouched.
- **What it adds:** no new parameter, no foot-pitch rule, no limit, capacity, gain or clearance change, nothing body-specific.
- **Where it acts:** wherever the planner or the controller solves that leg's soft IK. That is the path / reach certificates, the swing servo, and the held trailing leg during the release hold.

## 2. Results

| Body | physical step 1 | step 2 | step 4 | step 6 | step 10 | step 20 | first failure |
|---|---|---|---|---|---|---|---|
| V2-REF | ✓ | ✓ | ✓ | ✓ | ✗ (9) | — | step 10 decision: no certified reach node. The stance has narrowed to 9.0 cm, under the boot width of 11.3 cm (A) |
| V2-165-62 | ✓ | ✓ | ✓ | ✓ | ✗ (9) | — | same (8.2 cm vs 10.3 cm) |
| V2-198-92 | ✓ | ✓ | ✓ | ✓ | ✗ (9) | — | same (9.6 cm vs 12.2 cm) |
| V2-long-legs | ✓ | ✓ | ✓ | ✓ | ✗ (9) | — | same (8.9 cm vs 11.3 cm) |

Left-first and right-first runs are mirror-identical; each cell covers both.

- Consecutive physical steps, median / max: **9 / 9** on all 8 runs.
- **72 genuine physical steps in total,** each passing the complete lifecycle check:
  - the old support released (the swing foot TOUCHING, trailing load ≤ 0.36 % BW);
  - measured liftoff;
  - swing with clearance > 0 (window minimum 6.5 – 6.9 mm);
  - measured touchdown, accepted (contact at φ 0.91 – 0.92);
  - load acceptance and the landed foot in SUPPORT;
  - DONE.
- Each step inherited the complete state of the previous one: no reset.

## 3. Accumulation: bounded and periodic, except the commanded stance width

Mean of steps 1 – 3 vs steps 7 – 9 over all 8 runs:

| metric | range over 72 steps | steps 1 – 3 | steps 7 – 9 |
|---|---|---|---|
| liftoff after the command | 0.121 – 0.138 s | 0.126 | 0.130 |
| clearance, φ 0.2 – 0.8 | 6.50 – 6.88 mm | 6.62 | 6.67 |
| touchdown velocity (down) | 0.029 – 0.050 m/s | 0.045 | 0.041 |
| foothold error | 1.19 – 2.56 mm | 1.69 | 1.68 |
| stance-foot slip | 0.00 – 0.04 mm | 0.011 | 0.011 |
| ξ margin to the stance foot, single support | 37.7 – 45.9 mm | 41.7 | 41.9 |
| p* outside the support | 0 | 0 | 0 |
| pelvis tilt max | 4.5 – 5.6° | 5.0 | 4.9 |
| leg hard-limit margin | 11.2 – 13.4° | 12.0 | 13.0 |
| saturated axis-ticks per step | 0 – 2 | 0.33 | 0.25 |
| max Δτ0 per tick | 7.0 – 19.3 N·m | 13.1 | 11.8 |
| positive energy closure per step (max per tick) | 0.026 – 0.058 J (≤ 0.007) | 0.043 | 0.041 |
| ξ error at DONE / COM speed at DONE | 0.2 – 4.9 mm / ≤ 13 mm/s | 3.2 / 10 | 1.4 / 8 |
| at each decision: pelvis yaw drift / ξ error / COM speed | ±0.2° / ≤ 0.5 mm / ≤ 3.1 mm/s | | |
| swing-foot tilt (the sole stays flat) | 0.29 – 0.50° | | |

**One quantity accumulates: the commanded stance width.**
- It falls 12.6 – 12.9 mm per step. The prediction is 12.4 mm: each step goes 0.10 m along the stance foot's heading, which is toed out 7.1°, so 0.10 · sin 7.1° = 12.4 mm inward.
- V2-REF: 0.175 → 0.097 m over steps 1 – 7.
- **The physical system follows exactly:** feet land within 1.2 – 2.6 mm of the commanded footholds.

**Two consequences:**
- From step 8 the planner substitutes corridor nodes, giving shorter steps of 79 – 89 mm.
- The trailing-leg DF demand rises with the narrowing, 0.6 – 0.8° per trailing step. V2-REF goes 22.8 → 24.6°; the margin to the body's coupled limit falls 3.4 → 1.9°, minimum 0.9° (V2-165-62, step 8).
- Every swing-servo solve during an executed step succeeded within the coupled limit.

## 4. The step-10 blocker: A (another isolated-step assumption), not B or C

**What happens.** The single-step planner defines "forward" as the stance foot's heading and has no walking-direction frame or stance-width regulation. Its corridor's ±20 mm lateral freedom is only a fallback behind the nominal priority, so nothing counteracts the 12.4 mm per step inward drift. At step 10 the feet are 8.2 – 9.6 cm apart, centre to centre, against boot widths of 10.3 – 12.2 cm. Every side-by-side step-to foothold would overlap the stance boot, so 0 / 35 reach nodes certify.

**What it is.** Continuous foothold planning relative to a walking direction. The original probe already listed it as missing.

**Why it is not evidence against V2:**
- The failure is a geometric consequence of the commanding frame. The physical gait follows commands to ~2 mm.
- Every physical metric in §3 is flat across 9 steps: no growing DCM error, drift, slip, saturation, torque roughness or energy.
- Nothing lost balance, scuffed or fell.

## 5. Recorded, not investigated (per the instruction)

The wide-stance trailing-foot release (CF-1 lateral: 1.2 – 1.6 % BW held by the allocation fixed point) remains a future gait-layer requirement.

## 6. The question

> **"Have we now reached enough of continuous gait to actually test V2's underlying repeated-use stability, or are we still blocked by isolated-step assumptions before that test begins?"**

**Partly. The first real repeated-use test has now happened, and V2 passes it in the regime reached.**
- The character executed 72 genuine physical steps, 9 consecutive per run.
- Alternating support, with the complete physical state inherited step to step.
- The body, contact and control architecture stayed bounded and periodic: §3 shows no accumulation of any physical error.
- That is direct evidence about V2's repeated use, no longer inference from single steps.

**But the regime is quasi-static, and the dynamic test has not begun.**
- Each step ends in a near-quiet double support (ξ within 5 mm of its reference, COM ≤ 13 mm/s at DONE) before the next 4 s transfer. So momentum and state error are largely settled between steps.
- Repeated-use stability with carried momentum is the regime where V1's walking failed. It is still untested.
- It is still gated by isolated-step assumptions:
  1. **the stance-foot heading frame** (no stance-width regulation), which caps sequences at 9 steps (§4);
  2. **the quasi-static cycle:** 4 s DS plan + 4 s transfer + release per step, about 10 s per step. The planner certifies only from quiet double support.

## 7. Verdict: GREEN (provisional; scope: quasi-static repeated stepping)

**Why GREEN.** "V2 appears fundamentally capable of repeated locomotion" is now supported directly:
- 9 consecutive physical alternating steps on the reference, light / short, heavy / tall and long-legs bodies, both sides;
- every physical metric stationary;
- the only failures across three studies are missing or single-step-scoped commanding layers, each refused by narrow, explained margins, while the physics stays inside its hard limits.

**C evidence: none.**

**Why provisional:**
- the dynamic regime (shorter double support, carried momentum, faster touchdowns) is untested;
- three counterfactual layers were needed to get here: CF-1 transfer; CF-2 coupled IK limit; and the heading / stance-width frame, still missing.

**What would downgrade it:** repeated-use degradation once those layers exist and the cycle is shortened — growing DCM / pelvis error, saturation, energy, contact instability or balance loss. That would be evidence against V2, not missing functionality.

**Gait-layer requirements now known, none adopted:**
1. a between-steps 2-D DCM transfer (CF-1), plus explicit trailing-foot unloading on wide stances;
2. a leg-IK / planner soft box consistent with the body's pose-dependent soft limits (CF-2). This is a candidate genuine correction: the static box contradicts the body's own passive law;
3. foothold planning in a walking-direction frame with stance-width regulation (the step-10 blocker);
4. later: overlapping phases (cadence), recovery-step touchdown, running mechanisms.

## 8. Harness notes

**Isolation:**
- `--cf=0` and `--cf=1` are bit-identical to the committed probe and CF-1 evidence (16 / 16 each).
- The CF-2 measurement fields added later were hash-neutral (8 / 8 identical end hashes).

**A convention defect caught before any reported run.** The first form of the wrapper hard-coded the joint centres, and its guard caught it: the ankle's static soft DF bound is 32.5087° in solver coordinates, not 32.5. The wrapper was rewritten convention-free from each spec before the reported runs.

**Coupled solves per run:** 297 – 1,013, of which 47 – 78 were planner queries. Refused solves:
- 0 in 7 runs;
- 14 in V2-165-62 left-first, none during an executed swing (every per-step servo solve succeeded, minimum margin 0.89°).

The coupled solves also occur in the release hold, where the held trailing leg's IK is solved.
