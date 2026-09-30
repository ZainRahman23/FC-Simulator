# Physical Character V1: Gate C2 report

**Weight transfer and deliberate foot placement.**

The 14-body Jolt humanoid can do all of the following with finite joint torques and ground reaction only:
- shift its weight between its feet;
- unload a foot physically, lift it, and hold it in sustained single support;
- swing it under finite motors to a validated target;
- set it down wherever it actually lands, and rebuild double support from there.

Requests the body can't do are projected or rejected, with the reason reported. An obstructed swing stalls and is reported; it is not driven through.

- **No pelvis support, no root anchor, no state writes after t = 0.** All three are asserted and measured in every test.
- **No corrective stepping.** `STEP_NEEDED` is never connected to a step.
- **Nothing committed or pushed.** Worktree `physical-character-v1`.

2026-09-30 · Gabriel (190 cm, 78 kg) · Jolt 5.6.0 (JoltPhysics.js 1.1.0) · 240 Hz × 1 collision step, 30 velocity / 4 position iterations. The solver, body and C1 strength profile are unchanged.

![C2 contact sheet 1](contact_sheet_1.jpg)
![C2 contact sheet 2](contact_sheet_2.jpg)

---

## 1. Assessment first: does C2 pass?

**My opinion: yes on nine of your ten pass criteria, and partially on the tenth (repeated placements).** There are real caveats about how much this body can reach and how hard it works. They come from its proportions and are listed after the table.

| your pass criterion | evidence | |
|---|---|---|
| **1. Physical load transfer** | Weight moves only by moving the balance reference ξ_ref; the feet's loads follow physically. **A_shift:** the measured R share steps 5 % → 95 % → 50 %. The per-step load change is at most 27.8 N and ΣL+R stays within 0.94 N of body weight on average. Before every liftoff the swing foot's measured load falls to **0 N**, or 38 N (5 % BW) in J #2. | ✅ |
| **2. Lift only after genuine unloading** | The liftoff gate is measured and must hold for 50 ms: swing-foot load < 5 % BW, ξ ≥ 2 cm inside the stance sole, \|v_COM\| ≤ 8 cm/s, and the stance foot loaded and not sliding. The foot counts as "off" only when it has no touching contact point and < 25 N. At liftoff: swing load 0 N, stance ξ margin 6.4–7.1 cm, COM margin 3.9–7.9 cm, \|v\| 0.02–0.07 m/s, transfer 1.1–1.6 s. **J #2 was rejected because the rear foot kept 91 N; it did not lift.** | ✅ |
| **3. Sustainable single support** | **B:** 3.26 s (R up) and 3.29 s (L up) of single support. ξ margin stays ≈ 7.7 cm, root residual 0.02 N, no drift. **It is not effortless:** see caveats 1–2 (stance hip at its directional budget, 13° trunk lean). | ✅ |
| **4. Reachable placements work** | C, D, E, F×2, G×2, H and J (5 of 6) are placed, loaded and accepted, with landing errors of 1.2–8.1 cm. **The body's single-support reach is short:** C (10 cm out), D (20 cm fwd) and E (15 cm back) are projected by 4.4 / 1.5 / 4.7 cm before liftoff (§5 F13). | ✅ (with reach caveat) |
| **5. Unreachable → rejected or projected** | G_far (1.2 m forward) is projected to 18.5 cm; G_far_side (0.8 m sideways) to 5.6 cm. The reasons are listed: pelvis drop beyond what the stance ankle allows, hip extension/abduction limits, beyond single-support reach. | ✅ |
| **6. No landing on the other foot** | The checks use the **actual** stance sole, not a canned offset: footprint clearance ≥ 3 cm, crossover (≥ 10 cm to its own side), and the swing path past the stance footprint. F_onfoot is projected 19.5 cm and F_cross 27.9 cm; both land clear. **F_onfoot's swing leg brushed the stance leg: 3.6 mm self-contact** (caveat 5). | ✅ |
| **7. Actual touchdown is authoritative** | Touchdown is **sensed** contact, wherever it happens. H's forefoot hit the 3 cm slab first: 4 contact points at y = 3.0 cm, 7.6 cm before its planned height. The stance is rebuilt from the touchdown pose, and a foot that loses contact is reached back to *that* pose, never to the marker or its old anchor (§5 F9). Final contact is 2–8.5 cm from the feasible target; all reported. | ✅ |
| **8. Blocked limbs yield** | **I:** the swing foot hits the 22 cm box (first contact 2.41 s, peak 505 N, 0.12 mm penetration). It stalls, meaning ≥ 6 cm behind its path *and* < 5 cm/s toward it, for 150 ms, which gives FAILED_BLOCKED. The foot is held where it stopped, not driven through, and he stays upright. No recovery is attempted. | ✅ |
| **9. No root support** | In all 13 tests: support fixture absent (asserted), 13 joint constraints only, bodies = 14 + ground (+ slab/box), **0 teleports, 0 velocity writes**. Pelvis external-force residual **0.018–0.041 N mean, ≤ 0.14 N max.** | ✅ |
| **10. Repeated placements deterministic and stable** | 13/13 tests bit-identical over 3 runs, and **Chrome = Node for 13/13**. **J:** 5 of 6 alternating placements done, upright throughout, root ≤ 0.14 N. **#2 (L forward from the staggered stance) was honestly rejected**, so the loop doesn't close: final foot drift L 13 / R 11 cm. | ⚠️ partial |

**Gates A, B and C1 are preserved bit-for-bit:** A 5/5, B 20/20, C1 59/59 hashes identical (`preserved_gates_check.txt`). Every C2 behaviour is behind a support plan or a sensor option that C1 never sets.

**Caveats you should weigh.** Most trace to this body's proportions, which C2 did not change:
1. **Single support costs this body far more than a human.** Its hip joint centres are **32.3 cm apart (≈ 1.8 × human)**, so standing on one leg needs **124 N·m of stance-hip abduction statically: 88 % of the 140 N·m limit.** The pelvis dropped (Trendelenburg) and he fell until I added a **lateral trunk lean over the stance leg, sized from the body's own statics (13.4° → 98 N·m).** It's visible. Even with the lean, the stance hip runs at its directional (multi-axis) budget for most of single support.
2. **The stance ankle works hard.** It saturates at its budgeted limit for 1.2–2.2 s per placement.
3. **Short reach.** The ankle's 20° dorsiflexion caps pelvis lowering at ≈ 2.5–3.7 cm (§5 F13), so small requests get projected.
4. **Touchdowns aren't soft.**
   - Horizontal foot speed at contact is 0.1–0.7 m/s, vertical up to 0.63 m/s.
   - Backward swings (E, J #5) land early on the toe (u 0.72–0.8, foot pitched 11–20°).
   - After touchdown the landed foot moves 0.5–6.5 cm before acceptance.
   - E's swing ankle reaches its range-of-motion stop (0° margin) in that toe-strike.
5. **F_onfoot:** projecting inward keeps the landing clear, but the swing leg brushes the stance leg on the way (3.6 mm self-contact). Swing-path clearance is checked for the footprint, not for the shin.
6. **J #2 rejection.** In a staggered stance the force distribution keeps ≈ 12 % on the rear foot even with ξ 7.9 cm inside the front foot. Two attempts to force it off failed: the foot floated off, or the closed chain loaded it to 174 N. The rejection is the honest outcome.

**Decisions that are yours.** I did not make these changes, because they alter Gate A/C1 or are policy:
- **Hip joint centres:** move them toward human spacing. This changes Gate A's body, but would roughly halve single-support hip load and remove the need for the lean.
- **Ankle dorsiflexion:** raise the ROM from 20° to ≈ 30° with the knee flexed, which is the human range. This would widen placement reach.
- **Hip abduction strength:** raise it from 140 to athlete level (≈ 190 N·m).

---

## 2. What was built

```
observation (C1 Sensor, + option supportTouching)
   │
   ├─► SupportSequencer (pc_support.js)  ── requests: "shift weight", "lift this foot and hold", "place this foot about here"
   │     • validates / projects the request against the SENSED stance (feasibility, reach, ROM, exclusion)
   │     • plans weight transfers in capture-point space and the swing trajectory
   │     • advances ONLY on sensed contact / load / motion; reports every outcome and reason
   │     → plan { ξ_ref, ξ̇_ref, v_COM ref, swing-foot target {pos, rot, vel, reach}, lean, preload, settle, anchor }
   │
   └─► C1 BalanceController (pc_balance.js), unchanged unless a plan is present
         • CoP law + LIPM feed-forward, stance IK from the actual feet, Jᵀ gravity + GRF, hip strategy
         • C2 hooks: swing-leg IK + velocity feed-forward, stance velocity feed-forward, trunk lean, reach/ROM-limited
           pelvis height, exact two-foot CoP distribution, landed-foot compliance + preload, touchdown-pose re-plant
   → finite Jolt motors (same profiles and multi-axis budget as C1) → step → SENSE
```

### 2.1 Foot contact state machine: sensed, never declared

| role (per foot) | entered when (measured) | left when (measured) |
|---|---|---|
| LOADED | touching, load > 40 N (hysteresis 25 N) | — |
| UNLOADING | a lift/place request is in TRANSFER | the liftoff gate holds for 50 ms (§1, criterion 2) |
| LIFTOFF | gate passed → swing target starts rising | no touching point and load < 25 N for 3 steps (physically off) |
| SWING / HELD UP / ALIGNING | foot off | touchdown, or stalled → BLOCKED |
| (touchdown) | **armed** once the sole has risen ≥ 5 mm above its liftoff height, then **any sensed contact** | — |
| ACCEPTING | touchdown | loaded ≥ 35 % BW, load stable (band ≤ 8 % BW over 100 ms), sole settled (heel + toe), ξ transfer complete |
| PLANTED | accepted → part of the new double stance | — |
| SLIPPING | C1's windowed minimum-corner slide on a loaded foot | — |

The intent (the request) can only ask for a transition; the gates above decide it. Every failure ends in an explicit status with a reason:
- `REJECTED` (infeasible, or the weight transfer was not achieved);
- `FAILED` (no liftoff, dragged, no ground contact, balance lost, load not accepted);
- `FAILED_BLOCKED`.

### 2.2 Feasibility and projection: against the actual stance

For a requested sole centre and yaw, all of these are checked with the stance foot **where it actually is**:
- **Yaw:** within ±25° of the stance foot.
- **No crossover:** the swing foot stays ≥ 10 cm to its own side.
- **Footprint clearance:** ≥ 3 cm from the actual stance sole polygon.
- **Swing path:** ≥ 1 cm past the stance footprint.
- **Reach and hip ROM in the resulting double stance:** legs ≤ 99.5 % extended; hip flexion ≤ 70°, extension ≤ 25°, abduction ≤ 35°, adduction ≤ 15°.
- **Reach and hip ROM in single support, from where the pelvis will be:** over the stance foot, 1.9 cm medial of the COM by statics.
- **Pelvis lowering:** at most what keeps the stance ankle ≥ 5° off its dorsiflexion stop.

If the request fails, the target is **projected**: the farthest feasible point on the segment from the current foot toward the request, found by bisection. If less than 3 cm of movement is feasible, the request is **REJECTED**. The reachability boundary (36 rays) and the exclusion geometry are recorded for display.

### 2.3 Weight transfer, swing, touchdown, acceptance

- **Transfer:** ξ_ref follows a min-jerk path **in capture-point space** from its rest point to the stance foot's weight point, over 0.9 s.
  - The CoP law gets the LIPM feed-forward −ξ̇_d/ω₀. This produces the anticipatory CoP shift onto the unloading foot that starts a human transfer.
  - The stance legs get the joint velocities of the planned COM motion (§5 F1–F2).
- **Single-support lean:** the trunk leans laterally over the stance leg at the lumbar joint by the angle that brings the stance-hip abduction demand to 70 % of capacity. It is computed once from the body's masses and geometry.
- **Swing:** under **finite motors at half stance stiffness**, critically damped for the distal leg, and collidable. IK runs from the *actual* hip and pelvis. The velocity feed-forward is the trajectory velocity pushed through the same IK.
  - **Shape:** rise first (u 0 → 0.12), then horizontal progression (min-jerk, u 0.12 → 0.75), then a near-vertical approach to 1.5 cm above flat.
  - **ALIGN:** the foot waits there until stance balance re-converges (ξ within 1.2 cm, \|v\| < 5 cm/s, max 1 s).
  - **DESCEND:** it then descends at 8 cm/s until contact is sensed.
  - **Clearance:** a knee-forward bias keeps the shin ≤ 18° back at mid-swing, and the clearance is raised for the predicted toe drop (§5 F6, F15).
  - The swing ankle target is kept 5° inside its range of motion.
- **Acceptance:** starts at touchdown. The double-support reference is built **once, from the touchdown pose**.
  - The landed foot keeps a 6 % BW commanded preload.
  - Its ankle is compliant (20 % stiffness) so the heel rocks down.
  - It counts as support while on the turf.
  - The ξ transfer takes max(2 s, 12 s/m × distance).

---

## 3. Tests A–J

| test | request | outcome | key evidence |
|---|---|---|---|
| **A_shift** | weight 25 → 10 → 50 → 75 → 90 → 50 % toward R, no lift | 6/6 DONE, upright | R share 0.05–0.95 measured; max per-step load change 27.8 N; COM drift 0.8 cm; feet 0.1 mm |
| **B_lift_R / _L** | shift, lift 8 cm, hold 2 s, set down in place | DONE / DONE | swing 0 N at liftoff; **3.26 / 3.29 s single support**; touchdown 2.1 / 1.2 cm from its spot; accepted 2.0 s later; final 2.5 / 1.7 cm |
| **C_lat_R** | R 10 cm outward | DONE (projected 4.4 cm) | "single support needs 3.6 cm of pelvis drop, the stance ankle allows 2.5 cm"; landing 5.6 cm; final 8.5 cm |
| **D_fwd_R** | R 20 cm forward | DONE (projected 1.5 cm) | landing 3.1 cm, heel first; accepted 2.1 s after touchdown |
| **E_bwd_R** | R 15 cm backward | DONE (projected 4.7 cm) | early toe strike (u 0.8, 11° pitch, 0.72 m/s horizontal); landing 8.1 cm; final 6.4 cm |
| **F_onfoot** | R onto the left foot (32 cm inward) | DONE (projected 19.5 cm) | "footprint overlaps the stance foot · crossover · path through the stance foot"; lands 2.9 cm from the feasible target; **leg brush 3.6 mm** |
| **F_cross** | R 40 cm inward, 10 cm behind L | DONE (projected 27.9 cm) | crossover −8 cm + overlap + hip adduction 16° > 15°; lands 3.7 cm off |
| **G_far** | R 1.2 m forward | DONE (projected **101.5 cm** → 18.5 cm) | "needs 22 cm of pelvis drop (ankle allows 2.5); L hip extension 41° > 25°; beyond single-support reach; …" |
| **G_far_side** | R 0.8 m sideways | DONE (projected **74.4 cm**) | "needs 9 cm drop; beyond single-support reach; hip abduction …" |
| **H_uneven** | R 25 cm forward, 3 cm slab under the forefoot | DONE (projected 6.5 cm) | **forefoot touched the slab first** (all 4 points at y 3.0 cm); final rests across the slab edge (4 slab + 2 turf points, 5.9° toe-up, 364 N) |
| **I_block** | R 30 cm forward, 22 cm box in the path | **FAILED_BLOCKED** (as designed) | first box contact 2.41 s; peak 505 N; penetration 0.12 mm; stalled 150 ms; foot held; upright |
| **J_repeat** | R↑ L↑ R→ R← L↓ R↓ | 5 DONE, 1 REJECTED | #2 "weight transfer not achieved: swing load 91 N, ξ 7.9 cm inside the stance foot"; others land 3.4–4.4 cm off |

---

## 4. Metrics

All tests: bit-identical ×3, Chrome = Node, pelvis residual ≤ 0.14 N, joint separation ≤ 0.24 mm, turf penetration ≤ 1.9 mm, no NaN.

**CPU:** 0.95–1.55 ms per 60 Hz frame in Node, split as Jolt 0.56–0.76 ms, sensing ≤ 0.12 ms, controller + support ≤ 0.68 ms.

Column key: **load / ξm / COMm** are measured at liftoff (swing-foot load, stance ξ margin, COM margin). **SS** is single support. **err** is the landing error. **v↓ / v↔** are touchdown velocities (early = contact before the planned end). **acc** is the time from touchdown to acceptance. **sole** is min / peak sole clearance during progression. **slid** is stance slip. **lim** is the smallest joint-limit margin.

| request | load | ξm / COMm | SS | err | v↓ / v↔ | acc | sole | slid | lim |
|---|---|---|---|---|---|---|---|---|---|
| B R lift | 0 N | 6.8 / 7.5 cm | 3.26 s | 2.1 cm | 0.09 / 0.18 m/s | 2.0 s | 2.5 / 7.4 cm | 1.8 mm | 4.9° |
| B L lift | 0 N | 6.6 / 7.2 | 3.29 | 1.2 | 0.09 / 0.18 | 2.0 | 2.4 / 6.4 | 1.8 | 3.7° |
| C lateral | 0 N | 6.8 / 7.5 | 0.90 | 5.6 | 0.02 / 0.69 | 2.2 | 5.3 / 9.8 | 1.8 | 3.5° |
| D forward | 0 N | 6.8 / 7.5 | 0.96 | 3.1 | 0.05 / 0.49 | 2.1 | 2.8 / 8.8 | 1.7 | 4.3° |
| E backward | 0 N | 6.8 / 7.5 | 0.71 | 8.1 | 0.40 / 0.72 early | 2.0 | 4.6 / 16.6 | 2.0 | **0.0°** |
| F on-foot | 0 N | 6.8 / 7.5 | 0.81 | 2.9 | 0.18 / 0.49 early | 2.0 | 6.1 / 13.8 | 1.8 | 2.9° |
| F cross | 0 N | 6.8 / 7.5 | 0.78 | 3.7 | 0.28 / 0.54 early | 2.0 | 5.2 / 15.3 | 2.1 | 2.0° |
| G far | 0 N | 6.8 / 7.5 | 0.96 | 3.1 | 0.05 / 0.49 | 2.1 | 2.8 / 8.8 | 1.7 | 4.3° |
| G side | 0 N | 6.8 / 7.5 | 0.90 | 5.6 | 0.02 / 0.69 | 2.2 | 5.3 / 9.8 | 1.8 | 3.5° |
| H slab | 0 N | 6.8 / 7.5 | 0.86 | 3.8 | 0.13 / 0.61 | 2.4 | 2.8 / 8.8 | 2.5 | 4.3° |
| I block | 0 N | 6.8 / 7.5 | — | — | — | — | 2.8 / 6.1 | 1.2 | 3.0° |
| J #1 R fwd | 0 N | 6.8 / 7.5 | 0.93 | 3.5 | 0.04 / 0.56 | 2.0 | 3.7 / 9.2 | 1.7 | 4.7° |
| J #2 L fwd | REJECTED | — | — | — | — | — | — | 0.3 | 5.7° |
| J #3 R out | 38 N (5 %) | 6.0 / 3.9 | 0.77 | 4.4 | 0.01 / 0.52 | 2.2 | 4.3 / 8.8 | 1.5 | 4.0° |
| J #4 R in | 0 N | 6.5 / 7.9 | 0.90 | 4.3 | 0.01 / 0.37 | 2.0 | 4.0 / 9.0 | 1.3 | 3.9° |
| J #5 L back | 0 N | 7.1 / 7.0 | 0.45 | 3.9 | 0.63 / 0.11 early | 2.0 | 1.3 / 5.0 | 1.1 | 1.6° |
| J #6 R back | 0 N | 6.4 / 7.2 | 0.61 | 3.4 | 0.03 / 0.66 | 2.0 | 3.1 / 6.0 | 2.2 | 3.6° |

**Saturation per placement:** stance ankle 1.2–2.2 s; stance hip 0.1–0.8 s; swing leg ≈ 0 s. The swing leg is never saturated: it isn't artificially strong, and in I the box wins with 505 N.

**Swing-foot penetration at touchdown:** ≤ 0.7 mm.

**Load transfer smoothness:** ≤ 28 N/step without a lift (A). Touchdown impacts reach 256 N/step.

**Single support:** 0.45–0.96 s per placement; 3.3 s for the lifts.

**Other behaviour:**
- **G_far and D land at the same place.** Both requests point straight ahead, so the projection lands on the same reach limit: (0.161, 0.271), equal to 10⁻⁹ m. Their metrics are therefore identical to the printed precision.
- **G_far_side and C** do the same, landing at (0.217, 0.087).
- The state hashes still differ, because the bisections converge a few nanometres apart and the physics is bit-exact.

---

## 5. What I found building it: the honest history

Each item is a failure I hit, the measurement that explained it, and what changed. The probes are in `analysis/`.

**F1. The first transfer stalled.**
- **Symptom:** ξ stayed 2.5 cm outside the stance sole, and 189 N remained on the swing foot.
- **Measurement:** the realised CoP lagged the demand by ≈ 0.4 m per m/s of COM speed. The stance joints' damping, with a zero target velocity, acted as a ≈ 290 N·s/m drag on the deliberate shift.
- **Fix:** the stance legs get the joint velocities of the planned COM motion, the same principle as the swing leg's feed-forward.

**F2. A min-jerk *COM* path needs an impossible CoP.** To brake at the end of a 0.9 s shift, the CoP must sit ≈ 12 cm outside the stance sole. He overshot and fell. Planning in **capture-point space** keeps the feed-forward CoP on the unloading side by construction.

**F3. Geometry bug.** The sensor lists the four sole corners in "bowtie" order, so every stance-margin test was wrong. Fixed with a convex hull. An orientation bug in my `ccw()` was fixed too.

**F4. Trendelenburg.**
- **Measurement:** in single support the stance hip saturated at 115–130 N·m and the pelvis dropped 25° on the swing side. Statics show the cause: hip centres 32.3 cm apart need 124 N·m.
- **Fix:** a lateral trunk lean sized from the statics, at the lumbar joint where the model pivots it. A split lumbar/thoracic lean moved the COM only half as far as modelled.

**F5. A held foot over its old footprint hangs abducted** and adds ≈ 11 N·m to the stance hip. It is now carried with the pelvis's measured shift.

**F6. 20° of dorsiflexion plus a 36 cm boot.**
- **Symptom:** a knee-bend lift tilts the shin back 34°. The boot sits on its range-of-motion stop, pitched toe-down, and the toe never leaves the turf.
- **Fix:** lifts and swings are *knee-forward*: the shin is kept near vertical and the thigh flexes. The swing ankle target is clamped 5° inside its range of motion.

**F7. Velocity feed-forward spike.**
- **Symptom:** finite-differencing successive joint targets spiked to ≈ 2900°/s when a new trajectory began from the actual foot. It slammed the toe into the turf, and "touchdown" registered 8 cm up.
- **Fix:** the feed-forward is the trajectory velocity through the IK.

**F8. Liftoff and touchdown semantics.**
- Jolt keeps speculative contact manifolds up to 2 cm away, so "no manifold" was too strict a definition of off.
- "No touching points" alone let a creeping foot "touch down" 4 ms after liftoff.
- **Fix:** off means no touching points and < 25 N for 3 steps. Touchdown detection **arms** only once the sole has measurably risen.

**F9. The landed foot was dragged back to where it started.** C1's feet-in-place re-plant reached any airborne foot back to its *pre-lift* anchor, and "acceptance" then happened at the start position. **This is exactly what the spec forbids.** A foot that loses contact during acceptance is now reached back to its **touchdown** pose.

**F10. Stance IK for a pelvis the body hasn't reached lifts the new foot.**
- **Symptom:** the reach-lowering target jumped 7 cm at touchdown.
- **Fix:** the pelvis-height target is now always within ±1 cm of the actual pelvis. A later un-lowering step of 6.8 cm had launched him upward.

**F11. Load acceptance: three wrong ideas.**
1. **"Load the new foot first, then shift" is physically impossible.** Loading a foot beside you pushes the COM away from it. Tried: the pelvis rolled and the foot was lifted.
2. **A 0.6 s transfer off the old stance foot needs its CoP 10.7 cm beyond the only foot that can push.** That became 2 s, which needs ≈ 1.3 cm.
3. **Actively levelling a heel-landed boot is a push-off.** It launched the leg 19 cm. A **compliant** ankle, the heel rocker, works.

In addition, a foot on the turf must count as support before it carries 40 N, otherwise the classifier declares STEP_NEEDED in the middle of every acceptance.

**F12. The C1 lever rule fails in a staggered stance.** When both per-foot CoPs clamp at their sole edges, the commanded net CoP sat 6–9 cm ahead of p*. Under a plan, C2 now uses an **exact** two-foot distribution: (1 − a)·x + a·y = p*, choosing the minimum summed ankle moment.

**F13. The big one: the stance ankle on its dorsiflexion stop.**
- **Symptom:** forward placements fell backward during acceptance, with the demanded CoP at the heel and the realised CoP 6 cm ahead of it.
- **Cause:** pelvis lowering for the swing leg's reach bent the stance knee to 33°, putting the ankle on its 20° stop. At the stop, **the joint-limit constraint cancels the motor's dorsiflexion torque**, so the CoP cannot move heel-ward.
- **Fix:** lowering is now bounded by the stance ankle's range of motion. It is computed with the controller's own IK, in both the controller and the feasibility check. In practice that allows ≈ 2.5–3.7 cm, not 8 cm.
- **A units error of mine:** the "96 % leg extension" limit actually meant a 32° knee, more bent than standing. It is now 99.5 %, a knee of ≥ 11°.

**F14. Attempts that were reverted:**
- **Forward-biased stance balance point for forward placements:** he fell forward in single support.
- **Unload penalty on the transfer foot:** the foot floated off and drifted 15 cm.
- **Unload penalty with a floor:** the closed chain put 174 N on it.

**F15. Backward swings:** the knee-forward bias sent the foot 14 cm forward and snapped it back at ≈ 1 m/s. It is now disabled for backward targets, which rely on toe-drop-aware clearance instead. Backward landings are still early toe strikes (caveat 4).

---

## 6. How to review it

```
cd "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1"
# your server on 8171 is still running (python3 -m http.server 8171 from this folder)
# C2:  http://127.0.0.1:8171/sandbox/visual/physchar/index.html?suite=C2&test=D_fwd_R
#      (suite list also has C1 · Gate B (historical support fixture) · Gate A)
```

- **Controls:** play at 1× / 0.5× / 0.25×, step ±1 physics step, scrub, and jump to the first liftoff / touchdown / outcome. Camera presets are ¾ / front / side / back / top and orbit.
- **Gate C2 overlays:**
  - footprints: **requested** (orange), **feasible** (green), **actual touchdown** (cyan) and **final loaded contact** (white);
  - reach boundary (violet);
  - stance exclusion: the actual stance sole plus the 3 cm clearance (red);
  - **planned swing path** (yellow) and **actual foot trace** (cyan);
  - sole and stance-leg clearance labels;
  - slab and obstacle, with the contact force.
- **Balance overlays (from C1):** COM and velocity, ξ, support region and contact polygon, measured and demanded CoP, per-foot state / load / slip, motor torque and saturation, target ghost.
- **Phase banner:** shows the live stage and the request outcome. The status line shows roles, per-foot load, **root support = none + the pelvis residual**, and the joint-limit margin.
- **Charts:**
  - per-foot load / body weight history, with the 5 % liftoff gate, the phase strip and liftoff / touchdown / outcome markers;
  - selected-joint panel: nominal + gravity + balance → target vs actual, and effort against the budgeted limit. This is where motor target vs actual is shown.
- **Side panel:** a per-request report (projection and reasons, liftoff gate, touchdown, acceptance, block, metrics), whole-run load, drift, root, stability and CPU, and the **browser hash compared with Node**.

---

## 7. Files

**New:**

| file | contents |
|---|---|
| `pc_support.js` | SupportSequencer, feasibility and projection, swing, statics |
| `pc_gatec2.js` | tests A–J, runner, measurement |
| `tools/gatec2_run.js` | Node runner |
| `results/gatec2_final_240x1.json` / `.log` | 3-repeat results and log |

**Changed:** each change is behind a support plan or an option, so C1, B and A hashes are unchanged.

| file | change |
|---|---|
| `pc_balance.js` | C2 hooks (§2), `minPelvisY`, `split2`, `romClamp` |
| `pc_sense.js` | `supportTouching` option |
| `pc_jolt.js` | `addTerrainBox` |
| `pc_math.js` | `datan` / `datan2` / `dacos` / `dexp` |
| `pc_harness.js`, `index.html` | C2 suite, overlays, charts, side panel, `GATEC2_TEST` hook, plan camera |

**Evidence** (this folder):
- `contact_sheet_1.jpg` and `contact_sheet_2.jpg`;
- `stills/`: 79 frames;
- `json/`;
- `crossruntime.txt`: Chrome = Node, 13/13;
- `preserved_gates_check.txt`;
- `analysis/`: the probes behind F1–F15, plus the capture script and shot list.

**Preserved:** the C1 baseline is at `worktrees/_preserved_2026-09-29_physical_character_gate_c1/`, and the C2 state at `worktrees/_preserved_2026-09-30_physical_character_gate_c2/`.

## 8. Not done (STOP)

Out of scope and not started: corrective stepping, locomotion, a second player, the ball, the Reference Tackle, protective falls, and any change to Touchline. Nothing is committed or pushed. **I'm waiting for your visual review.**
