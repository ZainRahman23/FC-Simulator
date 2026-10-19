# TECHNICAL-CONTROL-1.3: body and leg phasing removed, especially receive → play / dribble

**Status:** presented for the owner's visual review. NOT frozen, NOT integrated. No new skills were added (owner: "do not add more fancy skills until this transition / phasing pass is visually approved").

- **Instruction:** saved verbatim at `sources/2026-10-19_user_instruction_transition_phasing.md`.
- **Review page (local only):** `review/TECHNICAL_CONTROL13_REVIEW.html`.
- **Lab:** `http://127.0.0.1:8361/sandbox/visual/technical_control13.html`.
  - Body: after · before · **before vs after on the same simulation**.
  - The torture set is at the top of the case list.
  - Every feet view shows the posed legs' clearances live (red = the limbs intersect).
- **What I could and could not see:** I cannot play video in real time. Everything here was judged from per-frame measurements on the posed skeleton and from stills. The motion at normal speed and in slow motion is the owner's to judge.

## 1. What did not change

The body is presentation only:

- the ball, the player's path and every contact are identical, bit for bit (§4);
- the carry lanes, the outside / instep carry model, the touch frequency, and Ball Control / Dribbling / Agility's responsibilities are TECHNICAL-CONTROL-1.2's, untouched.

## 2. Where the phasing came from

Measured on TECHNICAL-CONTROL-1.2 (TECHNICAL-CONTROL-1.1's legs on the carry model) over the torture set at 99 / 99 / 99:

- **The hand-off from the run to the receive.** The legs switched from TURN-1.2's joints to the receive's IK in one frame: the knee jumped up to 35 cm.
- **Re-plans at every contact.** Each new plan re-evaluated the pelvis and legs from the revised future:
  - pelvis jumps of 3 – 10 cm;
  - a foot the new plan lifted out of its stance left at full swing pace;
  - a swing in progress caught up to the new path in 25 ms.
- **The pelvis.** A newly planted foot pulled it at full strength from the touchdown frame (a 4 cm jump when the foot landed at the edge of its reach).
- **No self-clearance.** Swings went straight across the turf, through the other leg. In the through-stance turns the body turns 90 – 180° in a tenth of a second, so a straight swing sweeps the foot through the standing leg as the body turns past it. There were 496 frames with intersecting limbs; the worst overlap was 14.9 cm.
- **Plants.** Run-in landings went where the technique put them, even when the incoming ball was there. The standing foot was then yanked up by the per-frame ball avoidance.

## 3. What TECHNICAL-CONTROL-1.3 does

Code: `sandbox/visual/technical_control13/tc13_body.js`, which defines `FlowBody extends LegBody` and `FlowSim extends CarrySim`.

TECHNICAL-CONTROL-1.1's body gained default-neutral hooks (`heelStart`, `heelFinal`, `reachWeight`, `pivotOnEdge`, a per-simulation contact-pose cache). With none of them set, its posed skeleton is the committed file's, frame by frame: 26/26 cases, 34,320 frames (`evidence/tc13_before_equiv_*.json`).

1. **One continuous hand-off.**
   - The gait's joint channels blend into the plan over 0.16 s. A swinging foot blends every channel; a planted foot blends only the hip swivel, with the ankle re-solved.
   - The first swing key sits on the hand-off frame, carrying the running foot's own recorded velocity.
   - A planted heel continues from the gait's height.
2. **Continuity across re-plans.**
   - The pelvis, upper body and swinging legs continue from what was actually posed in the last two frames, extrapolated one frame, and blend into the new plan over 0.12 s.
   - The new plan's swing reaches its path over 60 ms, or 80 ms for a foot just lifted.
   - A **late lift** is a foot the new gait lifts while it was still down. It stays down up to 50 ms longer and peels its heel from where it is. The hold is cut short once the leg cannot reach the foot with the heel at its push-off limit.
3. **The pelvis.**
   - A planted foot's reach pull ramps in over 80 ms, holds until the lift and fades over 60 ms after it.
   - Landings are kept within 95% of the leg's length.
   - A 7-sample (±60 ms) smoothing kernel.
4. **Leg self-clearance, planned per swing.** Resolved through the hip, knee, foot path and stride timing, never by twisting the ankle.
   - Every swing is sampled every 10 ms against the other leg (boot, shin, thigh, knee) and the ball's predicted path.
   - Each overlap adds a smooth bump that pushes against every overlapping pair at once. There are three passes, then a second round on the swings' own posed knee and toe (a boot pointed for the laces hangs its toe ≈ 20 cm lower than its ankle).
   - A pointed toe never goes into the turf.
   - The bumps taper to zero at the contact, so the contact itself is untouched.
   - A per-frame residual layer pushes at most 1.5 cm.
5. **Swings round a planted foot while the body turns** (more than 20° of turn during the swing) are planned in the turning body's frame about the standing ankle. The foot keeps its own side and travels round with the turn, after any contact of the swing. Lift and landing are unchanged.
6. **Plants.**
   - A landing is kept clear of the other foot, and (6 cm) of the spot where the other boot plays the ball next. This is checked once both feet's swings exist.
   - The receive's standing foot is kept clear of the incoming pass.
7. **Planted feet.**
   - A foot turning while on its edge turns about that edge, so the edge stays put.
   - A planted foot the body would turn more than 110° round leaves the turf early, TECHNICAL-CONTROL-1.1's early lift with one more test.
8. **The transition state at every contact** (`evidence/tc13_transition_states.json`) records:
   - which feet are planted or free, and the weight on each;
   - both feet's positions and velocities;
   - the stride phase;
   - the pelvis position and yaw, the hips, and the centre-of-mass estimate;
   - the yaw rate;
   - the touching foot's follow-through.
9. **Contacts flagged early.** A swing whose clearance the plan cannot resolve (still more than 2 cm after every pass) is flagged when first planned, typically 0.3 – 0.4 s before its contact. TECHNICAL-CONTROL-1.1's late-decision flags remain.

## 4. Results

The torture set has 26 cases with both turn sides, before → after. Evidence: `evidence/tc13_summary.txt` / `.json` and `evidence/tc13_sweep_{99,80,50}.jsonl`.

| | 99 before → after | 80 before → after | 50 before → after |
|---|---|---|---|
| frames with intersecting legs (beyond 1.2 cm) | 496 → **14** | 962 → **45** | 987 → **61** |
| cases with any intersection | 14 → **3** | 21 → **6** | 19 → **4** |
| worst limb overlap, cm | 14.9 → **6.3** | 15 → **10.1** | 15 → **9.8** |
| pelvis acceleration p99, median case, m/s² | 764 → **221** | 754 → **241** | 757 → **255** |
| … max, worst case | 4,294 → **712** | 5,485 → **808** | 6,510 → **1,063** |
| ankle acceleration max, median case, m/s² | 6,586 → **2,375** | 6,880 → **1,973** | 6,719 → **2,100** |
| … max, worst case | 21,948 → **13,044** | 19,622 → **6,356** | 16,253 → **6,009** |
| trajectory pops per case, median | 48.5 → **7.5** | 48 → **7.5** | 46.5 → **8.5** |
| planted-foot slip, median case, mm | 9.6 → **2.0** | 12.8 → **4.0** | 12.3 → **4.9** |
| … worst case, mm | 67.5 → **26.3** | 82 → **37** | 77.1 → **46** |
| hand-off knee jump, worst, cm | 35.1 → **3.1** | | |
| instant support swaps · too-short stances / swings | 0 · 0 / 0 → 0 · 0 / 0 | | |
| gameplay fingerprint identical | **26/26** | **26/26** | **26/26** |

How the diagnostics are measured: on the posed skeleton at 240 Hz (`tools/tc13_phase.mjs`).

- Limbs are capsules: thigh 7.5 cm, shin 5.2, boot 4.8, knee 6.
- A pop is a pelvis spike above 400 m/s² or an ankle spike above 2,500 m/s².
- Slip is measured at the posed support point: the edge the foot rolls on, else the ball of the foot.

### The owner's torture list

The review page §3 has every case with clips and strips.

| owner's case | the cases | after (99) |
|---|---|---|
| ground receive → straight | RL_0 sprint | clean |
| receive → 30° | L_30, L_30L, ST_30, ST_30L | clean |
| receive → 60° cut | L_60, L_60L, ST_60, ST_60L | clean |
| receive → 90° | L_90, L_90L, ST_90, ST_90L | clean |
| half-turn → preferred-foot outside carry (left-dominant close-control) | ST_90, ST_90L, ST_120, L_60 | 3 of 4 clean; L_60 has 6 frames, flagged early |
| through-stance turn → carry | ST_150, ST_180, ST_180L, L_150, L_150L | ST_180 6 frames (flagged early), ST_150 2 frames; the others clean |
| sprint receive → first carry touch | L_90, L_90L, L_30 sprint, F_180R | clean (no intersection) |
| receive → rapid same-foot second touch | L_60 L-dom (+0.31 s), ST_90L L-dom (+0.45), L_30L (+0.66) | see the table in the review page |
| receive → opposite-foot next touch | the other 23 cases (+0.20 – 0.78 s) | see the table in the review page |
| chest → foot → carry, thigh → foot → carry | **not available** | The receive → dribble pipeline has ground passes only. The chest / thigh controls exist only in RECEIVE-KILL-1's standalone study, so they are not tested here. |

## 5. Checks

123 runs (`evidence/tc13_checks.json`): the torture set × 99 / 80 / 50, TECHNICAL-CONTROL-1.2's carry course × its 4 players, and the receive chain.

- **FlowSim** gives TECHNICAL-CONTROL-1.2's fingerprint: 123/123. The hand-off foot history it records is presentation data.
- **The legs leave gameplay untouched:** 123/123.
- **Deterministic:** 123/123.
- **The posed skeleton is repeatable frame by frame:** 123/123. TECHNICAL-CONTROL-1.1's module-wide contact-pose cache made a second run in the same process, or the before body beside the after body in the lab, reuse the first run's poses (up to 7.7 cm). Each simulation now carries its own cache.
- Failures: 0. Transition states: 888 for 888 contacts.
- **Protected and reference files:** 1,249/1,250 are identical: TECHNICAL-CONTROL-1's protected list + TECHNICAL-CONTROL-1, 1.1 and 1.2 at their commits. The one expected difference is `tc11_body.js`, with the neutral hooks. Evidence: `evidence/frozen_check.txt`.
- **CPU** (`evidence/tc13_cpu.json`, torture set at 99, one Node process):

  | | ms per simulated second, median / max | worst 240 Hz step, median / max |
  |---|---|---|
  | the simulation alone | 13.2 / 15.7 | |
  | with TECHNICAL-CONTROL-1.2's legs (before) | 39.2 / 43.4 | |
  | with TECHNICAL-CONTROL-1.3's body (after) | **89 / 103** | **55 / 64 ms** |

  The worst step is a re-plan, which runs two clearance rounds on posed legs.

## 6. Flagged contacts and what remains

At 99, 10 swings are flagged early and 1 contact is a late decision (review page §4).

The remaining intersections at 99:

- **ST_180 (6 frames, flagged early).** The second touch is a right-foot outside played 0.41 s after the turn, right beside the left foot. The boot overlaps by up to 4.4 cm for 25 ms on the way.
- **L_60, left-dominant (6 frames, flagged early).** A same-foot second touch 0.31 s after the receive. The boots overlap by up to 6.3 cm.
- **ST_150 (2 frames).** 2.2 cm.

## 7. Limitations

- **The sprinting 180° turn (F_180R) at 99.** The planted foot's pivot passes ≈ 120° within 35 ms of its landing. The turn the ankle cannot take wraps, and the foot flips across in one frame: an ankle spike of 13,000 m/s², which TECHNICAL-CONTROL-1.2 had too (13,800). The early lift cannot act inside the minimum stance. The real fix is a landing yaw that anticipates the turn; I did not change landings for it in this pass.
- **Slip at a push-off at the reach limit.** Up to 26 mm (99) and 46 mm (50), in the last 10 ms before a lift with the heel at its 55° limit.
- **CPU.** 2.3× the before body's cost, and a 64 ms worst re-plan step. It has to be optimised before any integration, for example by running the second clearance round only on swings with an overlap and sampling 20 ms instead of 10 ms.
- **Larger IK corrections at 99.** The worst case is 24.1 cm (before 17.8): the clearance pushes a foot further round the other leg. At 50 it is smaller (24.5 → 18.3).
- **Chest / thigh receives** are not in the pipeline (§4).

## 8. For the owner

1. **The visual review.** Is receive → turn → dribble one continuous human action at normal speed and in slow motion? Start with the review page §3 before / after clips and the frame strips: through-stance turns, the half-turns with the left-dominant player, the sprint receives.
2. **The early lift for a planted foot the body turns round (110°)** and the late-lift hold (up to 50 ms). Both change only when a foot leaves the turf; the simulation's lift times are untouched.
3. **The F_180R sprint pivot.** Accept it as flagged for now, or let landings anticipate the coming turn next.
4. **CPU.** Optimise the body before any integration.
