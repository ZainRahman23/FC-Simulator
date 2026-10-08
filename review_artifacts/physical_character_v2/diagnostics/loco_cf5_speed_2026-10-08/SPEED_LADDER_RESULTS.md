# DIAGNOSTIC — CF-5 speed ladder: the validated continuous walk speeds up from 34 to 53 mm/s (0.57 → 0.89 steps/s) and stays continuous. The first refusal comes at 0.98 – 1.08 steps/s (60 – 67 mm/s on V2-REF), where the unchanged E2 planner's stop-step capture certificate rejects every corridor foothold (A). The lateral DCM offset behind it comes from the balance law's tracking lag (B). No structural instability (C), no approach to flight

> **Diagnostic only** (the user's approval, 8 Oct 2026: `../../sources/2026-10-08_user_approval_cf5_speed_ladder.md`).
> - CF-5 is unchanged and not adopted. No new mechanism, gain, capacity, friction, limit or touchdown tolerance was changed.
> - Only the cadence quantities CF-5 already takes were varied: the transfer duration `--Tst` and the swing duration `--Tsw`.
> - Step length stays 0.06 m. The planner's corridor caps it at 0.065 m, so step length could add at most 8 %.
> - One read-only diagnostic was added to the harness. At a refused CF-5 decision it records the planner's own reason for every corridor node, in the same tick and state. It changes no hash.
> - Previous study: `../loco_cf5_2026-10-08/CF5_RESULTS.md` (level L0 here).

**Runs:** 30 at 240 Hz, left-first, each executed twice with identical end hashes (30 / 30).
- V2-REF ladder, each level 4 → 10 → 20 steps:
  - L0 = CF-5 (Tst 1.00 s, swing 0.60 s);
  - L1: 0.70 / 0.55;
  - L2: 0.50 / 0.50;
  - L3: 0.35 / 0.45 (refused).
- One bisection: L2b, 0.42 / 0.47 (refused).
- L2 (the fastest V2-REF success) on the other three bodies, 4 → 10 → 20.
- L1 on those three as well, because L2 was refused on two of them.

**Files:**
- Analysis: `SPEED_LADDER_ANALYSIS.txt` and `SPEED_LADDER_CONTINUITY.txt` (CF-5's fixed continuity criteria).
- Refusal diagnosis: `SPEED_LADDER_REFUSALS.txt`.
- Tables: `SPEED_LADDER_TABLES.md`.
- Per-step trends and gait summary: `SPEED_LADDER_TRENDS.png`.
- Evidence: `evidence/`.
- Reproduction: `scripts/run_speed_ladder.sh`.

## 1. Commanded against realized gait (V2-REF)

Commanded speed = S / (Tst + release 0.1125 s + planning liftoff delay 0.171 s + swing T). The realized speed is higher because the measured liftoff comes 0.07 s after the command, not the planned 0.171 s.

| level | Tst / swing s | commanded speed / cadence | **realized speed** | realized cadence | step advance | COM forward through the cycle (mean; min – max) | COM 0.1 s before TD | at TD | 0.1 s after TD | after acceptance | **min per cycle** | both feet in contact / cycle | flight | result |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| L0 | 1.00 / 0.60 | 31.9 mm/s, 0.53 Hz | **34.3 mm/s** | 0.57 steps/s | 0.058 – 0.062 m | 33 – 37; 16 – 55 | 22 – 24 | 24 – 26 | 24 – 31 | 41 – 45 | **16 – 19** | 1.16 – 1.20 s | 0 | 20 / 20, 19 continuous |
| L1 | 0.70 / 0.55 | 39.1, 0.65 | **43.3** | 0.73 | 0.057 – 0.061 | 42 – 46; 21 – 69 | 30 – 33 | 31 – 32 | 33 – 39 | 60 – 63 | **21 – 28** | 0.85 – 0.89 | 0 | 20 / 20, 19 continuous |
| L2 | 0.50 / 0.50 | 46.7, 0.78 | **53.0** | 0.89 | 0.058 – 0.060 | 52 – 56; 26 – 84 | 39 – 43 | 37 – 40 | 43 – 49 | 62 – 67 | **26 – 37** | 0.65 – 0.67 | 0 | 20 / 20, 19 continuous |
| L2b | 0.42 / 0.47 | 51.1, 0.85 | 59.6 (2 steps) | 0.98 | — | 62; 29 – 91 | 50 | 44 | 48 | 57 | 29 | 0.59 | 0 | **refused at step 3** |
| L3 | 0.35 / 0.45 | 55.4, 0.92 | 66.6 (2 steps) | 1.08 | — | 68; 31 – 99 | 57 | 49 | 58 | 76 | 31 | 0.50 | 0 | **refused at step 3** |

**The faster walk stays genuinely continuous.** Every passing level meets CF-5's criteria on every eligible step. The touchdown speed rises from 24 – 26 to 37 – 40 mm/s, and the cycle minimum from 16 – 19 to 26 – 37 mm/s. The step length stays at the planner's 0.06 m, so all speed gain is cadence.

**Absolute scale.** 53 mm/s at 0.89 steps/s is about 4 % of normal human walking. The step-length corridor (≤ 0.065 m) caps speed at about 0.065 × cadence regardless of anything else.

## 2. Results

| Body | realized speed | cadence | step length | 20 steps? | min COM speed per cycle | saturation trend (ankle inversion) | first blocker | A / B / C |
|---|---|---|---|---|---|---|---|---|
| V2-REF | **53.0 mm/s** (L2) | 0.89 steps/s | 0.058 – 0.060 m | yes, 19 continuous | 26 – 37 mm/s | L0 / L1 flat 5 – 6 per cycle. L2: 14 → 25, plateau from step 12 | L2b (59.6 mm/s, 0.98 steps/s): planner refuses step 3, all 35 nodes "plan VRP outside the realisable region" | **A** (stop-step certificate), driven by **B** (lateral DCM lag) |
| V2-long-legs | **51.9** (L2) | 0.89 | 0.051 – 0.060 | yes, 19 continuous | 25 – 36 | L2: 14 – 26, halves 18.9 → 20.4, bounded | not reached at L2 (higher levels were V2-REF-only by protocol) | — |
| V2-165-62 (light / short) | **43.2** (L1) | 0.73 | 0.058 – 0.062 | yes at L1, 19 continuous | 20 – 27 | L1 flat 6. L2 rising (16 → 19 by halves) until the refusal | L2 (52.9 mm/s): planner refuses step 11 (same reason; its foot accepts a smaller lateral offset, 27.9 mm) | **A**, driven by **B** |
| V2-198-92 (heavy / tall) | **43.4** (L1) | 0.73 | 0.058 – 0.060 | yes at L1, 19 continuous | 21 – 29 | L1 flat 5 – 6. L2: 23 – 26 at steps 2 – 3 | L2 (53.5 mm/s): planner refuses step 4 (same reason; lateral DCM offset rises fastest, 31 → 33.6 mm) | **A**, driven by **B** |

## 3. The first blocker

The read-only refusal diagnosis covers all 11 refused decisions: L3 and L2b on V2-REF, L2 on light / short and heavy / tall, and each run's prefixes. In every one, **all 35 reach-certified corridor nodes fail the planner's own timed-capture check for the same reason: "plan VRP outside the realisable region".** No node failed the swing-time bound, the path certificate or reach.

**What the certificate tests.** For a commanded step, the E2 planner certifies a stop: E2's stop-step DCM plan from the measured state, ξ → (r_s, 0) by the planned touchdown, with the VRP inside the stance foot.

**The state at refusal:**
- the DCM is 28 – 34 mm toward the swing side of the commanded CoP;
- it is moving that way at 90 – 105 mm/s.

**Why every foothold fails.** Stopping that motion within the remaining 0.62 – 0.67 s needs a VRP beyond the stance foot's inner edge. The new foot cannot help before touchdown, so no foothold in the corridor can make the step stop-capable.

**What CF-5's walking plan would have needed:** a single-support VRP of 18 – 23 mm lateral and 9 mm toward the heel, well inside the foot, because it lets that motion carry onto the next foot.

The refusal is therefore the planner's single-step stop certificate rejecting a walking motion. That is **A** (missing walking-specific planning: a walking / continuation capture certificate).

Whether the physical gait would have stayed bounded past the refusal was not tested, because repairing it was out of scope.

**Where the lateral offset comes from: B.**
- **The lag.** The existing balance law (kξ = 1/3) lags the DS / SS DCM reference more as transfers get faster. CF-4 / CF-5 recorded this lag.
- **The ratchet.** At L2 the lag ratchets the lateral offset at the swing decision upward step by step, then converges to a body-dependent plateau within about 12 steps: V2-REF 26 → 30.4 mm, long-legs ≤ 28.9 mm.
- **Where the planner refuses:**
  - light / short: at 27.9 mm (its foot region is smaller);
  - heavy / tall: at 33.6 mm, with its offset rising fastest;
  - V2-REF: L2's plateau, 30.4 mm, sits just under its threshold; L2b / L3 start above it.

**Not C.**
- Where the gait ran, it was bounded: no growing DCM error, no capture-margin loss (83 – 102 mm at touchdown), no energy growth, no contact instability, no fall.
- The offsets converge.
- The refusals are planner decisions, not physical failures.

## 4. Bounded or accumulating, as speed rises

| quantity | L0 (34 mm/s) | L1 (43 mm/s) | L2 (53 mm/s) |
|---|---|---|---|
| capture margin at touchdown, DCM errors, energy residual, Δτ0, foothold error, touchdown speed | flat | flat | flat (swing DCM error 12 – 14 mm, flat) |
| **ankle-inversion saturation** | flat 4 – 6 per cycle | flat 4 – 6 | **jumps to 14 – 26 and accumulates over ~10 steps to a plateau** (REF 25 from step 12; long-legs halves 18.9 → 20.4) |
| lateral DCM offset at the swing decision | flat | flat | accumulates over ~12 steps to a plateau (above), co-moving with the saturation |
| toe-out (foot yaw) | −0.04 … −0.10° / step | −0.07 … −0.17° / step | −0.11 … −0.17° / step |
| foot slip (transfer phase) | flat ≤ 0.37 mm | rising to 0.6 – 1.2 mm | rising to 1.0 – 1.3 mm |
| leg hard-limit margin | flat ≥ 9.6° | REF flat; heavy / tall 9.9 → 8.0° | REF 10.3 → 8.8° |

**Ankle-inversion saturation: does it depend only on cadence?**
- Up to L1 (0.73 steps/s), yes: a constant per-cycle level from step 2.
- At L2 (0.89 steps/s) it also **accumulates step to step**: for about 10 – 12 steps with the lateral DCM offset, then plateaus on V2-REF and long-legs.
- In light / short and heavy / tall the accumulation is still climbing when the planner refuses.
- Nothing grows without bound within 20 steps.

**The other accumulating group:**
- It is the toe-out creep plus quantities that move with it: transfer slip ≤ 1.3 mm against the 20 mm relocation criterion, and hard-limit margin ≥ 8°.
- The creep runs faster as speed rises.
- Without heading regulation (A) it would eventually consume ankle margin. Within 20 steps it stays small.

## 5. Running boundary

**No gait came near flight.** Flight time is 0 at every level. Both feet stay in contact for 0.50 – 1.20 s per cycle: 54 – 68 % of the cycle, against ~20 % in normal human walking. Double support is far from disappearing.

**The limit is not a running boundary.** It is a walking-planning certificate at about 1 step/s. Nothing indicates that more speed needs flight, different support timing or a running swing.

## 6. The questions

1. **Fastest genuinely continuous walking demonstrated without another gait mechanism.**
   - **53.0 mm/s on V2-REF** (0.89 steps/s, 20 / 20 steps, 19 continuous) and 51.9 mm/s on long-legs.
   - On all four bodies: 43.0 – 43.4 mm/s (L1, 0.73 steps/s).
2. **Where the present CF-5 design first fails or refuses, and why.**
   - At 59.6 mm/s (0.98 steps/s) on V2-REF, and already at L2 (≈ 53 mm/s) on light / short (step 11) and heavy / tall (step 4).
   - The unchanged E2 planner's stop-step capture certificate refuses every corridor foothold. The DCM's lateral motion toward the swing side (90 – 105 mm/s) cannot be stopped within the stance foot.
   - CF-5's walking reference would not need to stop it.
   - Class A, driven by the balance law's tracking lag (B).
3. **Do errors stay bounded as speed rises?**
   - Balance, capture, energy, touchdown and foothold errors stay bounded at every passing level.
   - Two things begin accumulating step to step:
     - from L2: the lateral DCM offset and ankle-inversion saturation. They converge to a plateau within ~12 steps where the run continues, but the climb crosses the planner's threshold on two bodies;
     - from L1: the toe-out creep and its correlates (slip, ankle hard margin). Small within 20 steps, faster at higher speed.
4. **The first physical / controller limit on faster locomotion.**
   - The first limit actually hit is a planning one: the stop-step certificate (A).
   - Underneath it, the first controller limit is the DCM tracking lag of the balance law (kξ = 1/3) at faster transfers (B).
   - The first actuator limit is stance-ankle inversion, saturating ≈ 25 axis-ticks (≈ 0.1 s) per cycle at 0.89 steps/s.
   - Independently, the planner's step-length corridor (≤ 0.065 m) caps any speed at a few cm/s per step/s (A). It is the dominant ceiling for anything near real walking speed.
5. **Anything that materially increases the case for V3? No.**
   - No C-type behaviour appeared.
   - The limits are a planner certificate, a corridor, missing heading regulation and a correctable tracking lag.
   - Caveat: the ladder never left very slow walking (≤ 0.067 m/s). V2's behaviour at real walking speeds is still untested, because the planning layer stops it first.
6. **Next experiment: production walking development, not a running / flight-phase prototype.**
   - Nothing approached flight, and the blockers are walking-specific planning (A) and tracking (B).
   - Speed would need: a walking (continuation) capture certificate in place of the stop-step one; a step-length corridor sized for walking; heading regulation; and DCM tracking adequate for faster transfers.

## 7. Harness notes

- **The diagnostic.** `refusalDiag` in `tools/loco_probe.mjs` runs only at a refused CF-5 decision, read-only, in the same tick.
  - The L3 run's end hash is identical with and without it.
  - All 30 ladder runs reproduce bit-identically between the exploratory and final executions, including the L3 runs made before the diagnostic existed.
- **Regression on the final harness:** 106 / 106 end hashes (`--cf=0..4` 95, CF-5 11). Records are identical field for field for CF-3 (18 / 18), CF-4 (29 / 29) and CF-5 (11 / 11), excluding wall time and the planner's millisecond timer.
- **Stop.** Nothing adopted. The speed limit was not repaired. No new CF architecture, no running. TD2C / E2 not resumed. Stopped for review.
