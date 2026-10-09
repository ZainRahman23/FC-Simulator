# D-1A: read-only investigation before PI-1 (self-collision relevance, the weight-bearing mismatch, counterfactual contact)

**Instruction (verbatim):** `../sources/2026-10-09_user_instruction_d1a_investigation.md`.

**Nothing was changed:**
- the D-1 body (`spec/v2_pi1_runner.js`) is used exactly as frozen;
- the tackle record, the simulation, the presentation, collision geometry and G1 are untouched;
- no promotion physics exists.

**Read-only proof:** every in-page trace reproduced the recorded gameplay hashes: 7f691b4f (fall) and d3703246 (recover), FULL and LOCO.

**Method:**
- **Pose source:** the D-1 body posed from the **recorded** presentation (AIR FULL = ordinary presentation; AIR LOCO = the same without the reaction overlay), via the preregistered mapping (§5), at 240 Hz (4 interpolated samples per tick).
- **Distances:** GJK on V2's own collider support functions (validated against analytic sphere / capsule cases and brute-force vertex distances), V2's exact signed distance for capsule pairs, and an exact capsule-axis scan for penetration.
- **Support state:** an independent in-page trace of both systems.
- **Scripts:** `scripts/d1a_kinematic.mjs`, `d1a_trace.cjs`, `d1a_contact_primitives.mjs`, `d1a_contact_depth.mjs` (+ `d1a_lib.mjs`).
- **Results:** `d1a/`.

## 0. Timing convention (this corrects my stop report)

**AIR row k is the state after squad tick k + 1.** The existing probe tools already note this ("trace row i is after tick i+1").

The simulation's contact is at squad tick 50, sub-step 2, i.e. squad time **49.5**. That lies between rows 48 and 49. Below, every time is given in squad ticks.

My stop report read row 49 as tick 49. **Its "left foot already lifting at the contact tick" finding was a misreading;** §B gives the facts. An erratum has been appended to that report.

## A. Self-collision relevance

**Setup:** the exact D-1 body on the recorded motion; minimum over all 75 allowed self-collision pairs and over the boot↔boot pair; relative velocity of the closest points.

| case / window | boot↔boot min (relative speed) | any allowed pair min (pair, relative speed) |
|---|---|---|
| near miss, promotion → +0.6 s | 208.6 mm (6.7 m/s; approach 0.34 m/s) | 56.2 mm (forearm_R↔thigh_R, 0.34 m/s) |
| recover, promotion (0.15 s) | 208.6 mm (6.7 m/s) | 80.1 mm (forearm_R↔thigh_R, 2.0 m/s) |
| recover, contact (± 1 tick) | 266.4 mm (6.6 m/s) | 85.9 mm (forearm_L↔thigh_L, 2.1 m/s; LOCO) |
| recover, correction interval (to the simulation's `until`) | **205.4 mm** (5.8 m/s; LOCO) | **50.2 mm** (forearm_L↔thigh_L, 0.29 m/s; LOCO) |
| fall, promotion (0.15 s) | 348.4 mm (5.7 m/s) | 56.2 mm (forearm_L↔thigh_L, 0.33 m/s) |
| fall, contact (± 1 tick) | 264.9 mm (9.9 m/s) | 64.0 mm (forearm_L↔thigh_L, 1.4 m/s) |
| fall, fall interval | **no physically valid recorded motion** (below) | — |

**Fall interval.**
- The only recorded fall motion is the cheap presentation's authored fall (Tackled-Player V1 overlay, FULL stream).
- Posed on the D-1 body it interpenetrates: thigh_L↔thigh_R by 134 mm, boot↔boot by 20.5 mm.
- It needs joint projections of up to 70° outside V2's ranges (knee 70°, elbow 78°, hip 46°, shoulder 51°).
- So it is not a trajectory the V2 body can occupy, and it cannot bound the physical fall. No fall trajectory was invented. The LOCO stream after contact is locomotion, not a fall.

**Answer to A:**
- **Not reachable.** The 24.6 mm boot↔boot penetration of the artificial isoSelfCol test (≈ 13 m/s boot-into-boot, no gravity) is not reachable in any recorded PI-1 promotion, contact or correction state.
  - The closest real boot approach is 205 mm.
  - The closest real self-approach of any allowed pair is 50 mm (forearm to thigh in the arm swing), at 0.3 – 2 m/s.
  - Nothing comes near the 10 mm criterion.
- **Unknown until physics runs.** The physical fall's self-contact can only be measured in an actual PI-1 run.

**Proposed PI-1-scoped exception (not applied).**
- **What it waives:** the G1 **isoSelfCol** stress case only (check 1.4d, for this runner body).
- **What stays active:** the existing 10 mm self-penetration limit stays in force in every PI-1 run, including the fall. Exceeding it is an integrity failure and a stop.
- **Nothing global changes:** no G1 tolerance and no other body is affected.
- **G0 rows** 0.6a / 0.6b / 0.10a (anatomical spacing bands) and 0.4c / 0.6e (rows that do not recognise profile overrides; realised geometry = record within 1e-7 m) are documented as checker assumptions, not waived silently.

## B. The weight-bearing mismatch: there is none at the contact instant

**Independent trace,** fall case, squad time 49.5 (`d1a/d1a_trace.json`):

| | simulation (pt_react) | presentation, unperturbed (LOCO) | presentation, ordinary (FULL) |
|---|---|---|---|
| state at 49.5 | `ptRxBody`: **L planted**, up = 0.075 cycle (47 ms after touchdown, 18 % of stance), stride SINGLE_L, R in swing | plant **locked**, weight 1.00, contact **true**, mode ankle; cycle requests stance (s = 0.21); sole on the pitch | the same at squad tick 49 and at 49.5; at squad tick 50 the plant enters **release** at t = 0.8333 s = the authoritative reaction time |
| foot position | ankle (52.630, 33.829, h 0.080) | ankle (52.643, 33.832, h 0.088): **14 mm** horizontal, 8 mm vertical from the simulation | — |
| foot velocity | stance: fixed by the stride law | D-1 boot: sole −1 to −2 mm (turf slop), ankle ≈ 0.06 m/s | lifts from squad tick 50 (overlay response) |
| touchdown | phase wraps at L stance start ≈ squad 46.7 – 47.5 | plant taken at squad 47 (foot reached the pitch within 0.03 m) | — |
| load | not modelled. The friction capacity assumes single support (weight share 1: J_fric = 0.65·1·73·9.81·0.05 = 23.27 N·s). | not modelled (kinematic lock) | — |
| dimensions | leg 0.865 m (`p.legLen` = LEG_REF): hip 0.934, thigh 0.441, shin 0.424, ankle 0.080, foot capsule r 0.05 ankle → toe 0.20 m, lateral 0.171 | rig: hip 0.922, thigh 0.435, shank 0.399, ankle 0.088, hip lateral 0.152, boot ≈ 0.356 m | same |

**The two rules:**
- **Simulation:** `planted = ((phase − p0) mod 1) < G.stance`, with p0 = 0 (R) / 0.5 (L), G = `ofLocoParams(v)` (jog stance 0.42), and phase = the simulation's own stride clock.
- **Presentation:** the cycle `ofLocoCycle` (the same stride clock, the same stance 0.42) requests the plant. The solver takes it when the authored ankle reaches the pitch (≤ 0.03 m, or after 0.09 s). It reports `contact` while the lock is held at full weight. A release begins when the request ends, on divergence (> 0.35 leg), at the reach cap, **or when the reaction overlay takes the foot (FULL only)**.

**Cause:** **(3), a timing / sample-alignment difference.**
- My row/tick off-by-one put the FULL row of squad tick 50 at "tick 49".
- In that tick, the reaction overlay begins responding to the authoritative FALL.
- **Not (1):** the different leg lengths move the foot by ≤ 14 mm and do not change the support state.
- **Not (2):** both definitions say planted / early stance.
- **Not (4):** no semantic disagreement.
- The weight-bearing label is correct.

## C. Counterfactual interpretation (diagnostic; the record, outcome and hashes are untouched)

**Setup:** the recorded slide primitives (pt_react V1 capsules: LEG r 0.07 with its axis 0.12 m above the turf; BODY r 0.16), swept against the posed D-1 body, versus the simulation's own capsule body (`d1a_contact_primitives.json`, `d1a_contact_depth.json`).

| | simulation capsule model | D-1 body (unperturbed LOCO, i.e. the state PI-1 promotes from) |
|---|---|---|
| **fall case** first slide contact | LEG → foot_L at **49.5** | LEG → foot_L at **≈ 50.25 – 50.5** (0.75 – 1 tick later) |
| overlap of the slide leg's path with the planted foot (to squad ≈ 55, the foot flat on the pitch) | **33 – 64 mm** | **≤ 9.5 mm**: the leg capsule's underside grazes the top of the forefoot |
| deeper overlap | — | 50 – 92 mm only from squad ≈ 55.5, when the heel rises in toe-off and the boot moves up into the path |
| slide BODY reaches the foot | (runner reacts) | ≈ squad 61.5 (≈ 0.2 s after the authoritative contact), foot already in toe-off |
| **recover case** first contact | LEG → foot_L at 49.5 | LEG → foot_L at ≈ 50.25 |
| overlap with the swinging foot | 39 – 75 mm | **48 – 82 mm**: a solid clip of the airborne foot, representable |
| **near miss** closest approach | 0.108 m | 0.257 m: still a miss |

**Answers (fall case):**
- **Same segment?** Yes: the slide LEG meets the left boot.
- **Planted, loaded, unloading or airborne at impact?**
  - **Planted**, flat on the pitch.
  - **Single support:** the right sole is 0.15 m up.
  - **Early stance:** 47 ms after touchdown, the loading phase. The leg carries the whole body by single support. No force exists in either kinematic record.
- **Still legitimately a weight-bearing-leg sweep?** As a **support-state** label, yes; it is accurate.
- **Is FALL SIDE physically compatible with the promotion state?**
  - **The starting state is compatible.** A runner on one planted leg, the other foot in the air, can be swept into a side fall.
  - **The recorded collision is not representable by the promoted body.**
    - The simulation decided the FALL from a solid LEG-on-planted-foot sweep: J 116.93 N·s laterally, foot displaced 0.8 m.
    - That sweep comes from its oversized contact model: a 10 cm-diameter capsule foot with its ankle at 8 cm, against a slide-leg capsule centred 12 cm up.
    - With the actual D-1 boot, the same recorded slide path only grazes the top of the planted forefoot (≤ 9.5 mm), from 12 – 17 ms later. The contact normal there is largely vertical.
    - The solid slide-body contact arrives ≈ 0.2 s later, by which time the unperturbed foot is lifting.
  - **Consequence:** a promoted V2 body would meet a different collision from the one that authorised the fall. Per your instruction, PI-1 should not be built around this collision. (This is a statement about representability, not about which geometry is "right".)

## Additional compatibility findings (relevant to any replacement case)

1. **Presentation knee out of the V2 knee's plane.**
   - The recorded locomotion bends the swing knee 6 – 8° in varus / valgus (right knee, squad ≈ 42 – 47; promotion is at squad ≈ 42). The V2 knee has no varus axis.
   - Projection leaves a 7° residual, and the mapped ankle lands up to 36 mm from the rig ankle.
   - PI-1's ≤ 5 mm promotion criterion (PR-1) would fail if promotion fell in such a phase.
2. **Toe-pivot boot length.**
   - In the presentation's toe-pivot stance phase, the rig's 0.356 m boot tip touches the pitch while the anatomical V2 boot (≈ 0.28 m) sits 21 – 28 mm above it.
   - Promotion during toe pivot would start the stance foot off the ground.
3. **The slide-contact V1.2 state (d539e7a / e2c98ec, accepted later)** re-derived the slider's leg from the rendered slide (contact radius 0.05 m) and uses the rendered boot length (0.27 m) for the runner's foot. It is the natural baseline for a re-recording, but it must be checked the same way.

## Recommendation: **D1C**: the recorded fall case is unsuitable for PI-1 and should be replaced / re-recorded

**What determines it:**
- **C decides.** At the authoritative contact the D-1 body reproduces the support state exactly (B: planted, single support, early stance; the label is correct), but **not the decisive collision.**
  - With the recorded slide primitive and the runner's actual boot, the contact that authorised FALL SIDE becomes a ≤ 9.5 mm graze 12 – 17 ms late, against the simulation's 33 – 64 mm sweep.
  - The real sweep only becomes available ≈ 0.2 s later, as the foot lifts.
  - A promoted body cannot represent the interaction the outcome rests on, so a PI-1 fall run would test the promotion architecture against the wrong collision.
- **Why not D1A:** A alone would support it. The G1 stress case is irrelevant to the recorded promotion / contact / correction motion, so a narrowly scoped isoSelfCol exception is justified. But A does not fix C.
- **Why not D1B:** every "minimal correction" that would make this recorded fall representable means changing collision geometry (the slider proxy, the boot or the simulation's capsules) until the hit happens. That fits the geometry to an outcome, which you have excluded.

**What the replacement should satisfy:**
1. Re-record the three PI-1 cases on one baseline whose slide-contact geometry is derived from the rendered bodies. The accepted V1.2 state (d539e7a / e2c98ec) is the candidate. No simulation code changes.
2. **Gate before freezing PI-1** (this D-1A method, preregistered as an amendment):
   - the decisive contact's segment matches;
   - its timing is within ± 1 tick;
   - its overlap with the D-1 body is of the same order as the simulation's;
   - the support states agree at the contact instant;
   - promotion does not fall in a knee-varus or toe-pivot phase (findings 1 – 2), or those residuals are within PR-1.
3. Carry over the PI-1-scoped isoSelfCol exception from A, with the 10 mm self-penetration limit active in every run.

Stopped. Nothing has been changed, re-recorded or implemented.
