# E1a / E1b: preregistered protocol and criteria (final pre-E1a stage, §7)

**Status:**
- **PREREGISTERED. NOT RUN.** No E1 execution of any kind has happened.
- **These criteria are frozen.** They are not changed after any E1 run begins. A defect found in them later is recorded as an erratum alongside the frozen text, never edited in place.

**Source:** `../sources/2026-10-04_user_instruction_final_pre_e1a_resolution.md` §7.

**Configuration under test:** the configuration your E1a authorisation fixes. Proposed in `FINAL_PRE_E1A_REPORT.md`:
- the G3 controller;
- the support / contact lifecycle (`lifecycle`);
- the twist policy;
- the ankle law;
- the planned pelvis drop.

The criteria below do not depend on that choice.

## 1. Lift height: is 5 mm a genuine liftoff? (decided from pre-E1 measurements; no E1 data)

| measurement (`tools/contact_gap_check.mjs`, 8 bodies, G3 states) | value |
|---|---|
| resting boot penetration, loaded or unloaded | 0.00–0.03 mm |
| "touching" definition (probe) | contact-point separation ≤ 0.5 mm |
| sensed load of a touching but unloaded foot | 1.3–4.0 N (0.2–0.5 % BW) |
| sensed load of an airborne foot | **exactly 0** (residual wrench) |
| speculative contact distance / penetration slop | 20 mm / 5 mm. Speculative manifolds exist within 20 mm but carry impulse only if the predicted approach closes the gap within a step (more than 1.2 m/s at 5 mm, 240 Hz) |
| foot tilt → sole clearance at heel / toe | ±2.3–2.8 mm per degree (half boot 134–159 mm) |

**Decision:** **5 mm is genuine liftoff**, defined as the foot origin raised 5 mm above its contact anchor with the foot held flat (sole clearance 5 mm).
- That is 10× the touch threshold and more than 100× the resting penetration.
- It holds provided foot tilt stays ≤ about 1.5°. Criterion E1a-3 enforces a clearance margin.
- No larger value is needed. E1b uses 20 mm.

## 2. E1a protocol (each of the 8 bodies; left foot lifted; plus the mirrored right-foot run on V2-REF)

| t (s) | phase | command (all through the existing controller mechanisms; no pose writes) |
|---|---|---|
| 0–1 | settle | quiet stance |
| 1–3 | planned pelvis drop | posture pelvis-height target −2.5 cm (min-jerk). Reach margin: at standing height a straight leg cannot hold a flat foot even 1 cm off its spot without passive hyperextension (measured, `BOUNDARY_COMPONENTS.md`) |
| 3–7 | transfer | λ_R 0.5 → 1.0 (min-jerk 4 s), supervised |
| 7 → | unload | wait until the left foot has been TOUCHING (unloaded, s = 0) for ≥ 0.5 s (time-out 2 s → test fails E1a-6) |
| +0.0–0.4 | lift | swing target from the contact anchor to anchor + 5 mm vertical (min-jerk 0.4 s), flat, anchor yaw |
| +0.4–0.9 | hover | 0.5 s at +5 mm |
| +0.9–1.3 | replace | swing target back to the anchor (min-jerk 0.4 s). Held at the anchor until TOUCHDOWN (grace 0.3 s), then cleared (contact-anchor logic) |
| replace + 0.2 → +4.2 | load acceptance | λ_R 1.0 → 0.5 (min-jerk 4 s); intent-gated acceptance |
| → +3 | recover | quiet |
| +3 → +5 | pelvis back | pelvis drop removed (min-jerk 2 s), then 2 s quiet |

**Single-support abort (active throughout):** the supervisor's existing trigger (stance-foot CoP demand outside the region by 1 cm for 20 ms). The lifecycle response: put the foot down on its contact anchor first, then return to bilateral.

## 3. E1a criteria (all must hold on all 8 bodies and the mirrored run)

| # | criterion | threshold |
|---|---|---|
| E1a-1 | true contact loss | lifted foot: turf-touching pieces = 0 **and** sensed vertical load < 0.05 N for ≥ 80 % of the hover window |
| E1a-2 | true single support | lifecycle s_L = 0 and nSup = 1 during the whole hover; stance foot ≥ 99.9 % of the vertical contact load |
| E1a-3 | controlled swing foot | hover: position error vs the commanded target ≤ 3 mm max (RMS ≤ 2 mm); drift over the hover ≤ 2 mm; tilt ≤ 1.5°; yaw error ≤ 2°; minimum sole clearance ≥ 3 mm for ≥ 80 % of the hover |
| E1a-4 | bounded stance-foot slip | stance foot horizontal slip ≤ 1.0 mm and yaw change ≤ 0.5° over the whole run |
| E1a-5 | bounded balance | ξ inside the stance-foot region with ≥ 1 cm margin during the hover; COM horizontal excursion during lift / hover / replace ≤ 2 cm; no abort |
| E1a-6 | lifecycle without chatter | exactly one LIFTOFF→AIRBORNE and one TOUCHDOWN per lift; no state re-entered within 60 ms; no TOUCHDOWN→AIRBORNE bounce; unload reached within the time-out |
| E1a-7 | no discontinuous torque commands | per-tick change of every applied actuator torque ≤ 10 N·m, except ≤ 25 N·m in the 2 ticks after a contact onset (impact response through the implicit damping); per-tick change of every commanded τ0 ≤ 30 N·m |
| E1a-8 | no unexplained energy creation | energy-ledger closure increment ≤ +0.05 J in every tick; Σ positive increments ≤ 0.5 J over the run; authority writes 0; external impulse = 0 |
| E1a-9 | actuator capacities respected | no over-capacity event on any axis; saturation ≤ 5 % of hover ticks on every axis |
| E1a-10 | no anatomical-limit abuse | no joint beyond its anatomical hard limit at any tick; swing-leg solved coordinates never beyond their soft limit by > 2°; knee flexion ≥ 0° (no hyperextension) on the swing leg |
| E1a-11 | deterministic | two identical runs (V2-REF): bit-identical state hash at every 1 s mark and at the end |
| E1a-12 | touchdown | ≤ 5 mm and ≤ 2° from the original foothold; contact impact peak vertical load ≤ 25 % BW; no bounce (E1a-6) |
| E1a-13 | smooth load acceptance | LOAD_ACCEPT entered exactly once; s monotone to 1; replaced-foot load fraction tracks the request within 0.10 from 1 s after the λ ramp ends (G3 tracking measure) |
| E1a-14 | recovery to a valid two-foot state | at the end: both feet SUPPORT; ξ within 1.5 cm of its target; pelvis yaw within 1° of its start; every leg twist (ankle ab/adduction, knee axial) within 2° of its start |
| E1a-15 | morphology | all 8 bodies and the mirrored V2-REF run pass E1a-1 … E1a-14 |

**Reported, not gating:** hover servo errors over time, contact-gap profile, twist time series, stance-ankle yaw excursion, CPU per tick.

## 4. E1b protocol (after E1a passes)

As E1a with:
- lift **20 mm** (min-jerk 0.6 s);
- hover **1.5 s**;
- replace 0.6 s.

Perturbation runs (one per run, at the hover mid-point; V2-REF, V2-165-62, V2-198-92):
- thorax pushes F / B / L / R, 5 N·s, 100 ms;
- a pelvis yaw impulse of 0.5 N·m·s;
- one beyond-capacity case: thorax push toward the lifted side, 15 N·s.

## 5. E1b criteria

| # | criterion | threshold |
|---|---|---|
| E1b-1 … 15 | as E1a | E1a-3's hover error ≤ 5 mm max unperturbed; with a perturbation ≤ 15 mm peak and back within 5 mm in 0.5 s; E1a-5's "no abort" applies to the 5 N·s / 0.5 N·m·s cases |
| E1b-16 | perturbation recovery | every 5 N·s push and the 0.5 N·m·s yaw impulse recovered without abort or foot relocation |
| E1b-17 | single-support yaw | stance-ankle ab/adduction excursion after the 0.5 N·m·s impulse ≤ 10° and back within 2° in 3 s |
| E1b-18 | abort works | the 15 N·s case: either recovered, or the abort puts the foot down (TOUCHDOWN ≤ 0.4 s after the trigger) and returns to bilateral without a fall; stance slip ≤ 5 mm; no hard-limit excursion |

## 6. What E1 may discover without invalidating the configuration (declared in advance)

- **Single-support yaw anchoring under perturbation (E1b-17).** The evidence-supported passive ankle law alone is expected to be compliant (§2 of the report). Failing E1b-17 points to the active ankle-yaw path decision, not to a tuning change.
- **Hover servo accuracy under real swing dynamics.** The servo has only been exercised against external forces before E1.
