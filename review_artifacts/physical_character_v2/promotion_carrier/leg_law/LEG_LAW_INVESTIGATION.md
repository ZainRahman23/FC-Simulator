# The shared leg law: why it is not physically realisable, and what a physical replacement would and would not fix (read-only investigation)

**Date:** 10 Oct 2026.

**Source:** `../../sources/2026-10-10_user_instruction_physical_leg_law_investigation.md` (f7e78c91).

**Unchanged and not modified:** the simulation, presentation (LC-1, V1.3), carrier, V2 body, collision model, thresholds and the frozen PI-1 / PCS-1 design. Everything here ran against them read-only.
- The two predictions use the frozen carrier through its existing `law` option, plus investigation-only harness switches. The PCS-1 default path is re-verified bit-identical.
- No PI-1 run was made.

## 0. Answers

**1. Can the vertical trajectory be made C1 and ballistic in flight without changing the authoritative horizontal locomotion? Yes.**
- The vertical is internal to the leg law; the root is untouched.
- A spring-mass vertical (Morin 2005, from the stride clock's own stance and flight timing, no fitted parameter) is C1 everywhere and exactly ballistic in flight. LC-1 already runs it in the presentation: pelvis / COM C1 at every speed, flight within 1.5 mm of ballistic.
- **The vertical alone is not enough for a physical gait.** The same law also:
  - **skates its stance foot:** the grounded point slides at a mean 3 – 8 m/s at jog and above;
  - **has C0 joint cusps;**
  - **loses swing clearance** under a physical pelvis: −20 mm at 3 m/s;
  - **runs out of reach at sprint:** 15 – 35 mm beyond full leg extension.

  A physical replacement needs all four corrected.

**2. Can one corrected law generate both the gameplay collision legs and the presentation legs? In principle yes, at a gameplay cost.**
- **Why they differ today:** the presentation adds plant IK and (LC-1) a vertical model that the simulation's legs lack.
- **What one law would need:** the vertical model, a non-skating stance, C1 joints and a clearance / reach constraint, all evaluated by the simulation itself.
- **The cost:** it needs either deterministic per-player plant anchors in the simulation (new gameplay state), or a stateless approximation that is exact only at constant velocity.

**3. Would it materially alter collision timing, geometry or outcomes? Yes.**
- The calibration check reproduces the recorded first contacts in 23 / 26 candidates.
- With physically realisable legs (the LC-1 legs as proxy), 12 / 26 change class or segment:
  - 5 switch between contact and miss;
  - 7 change the struck segment (one of them 8.5 ticks earlier);
  - 7 more shift timing only, by 0.25 – 1 tick.
- rx_planted_leg's contact moves from shin_L to foot_L (+0.75 tick).
- Outcomes would have to be re-baselined.

**4. Would it let the promoted runner survive the full pre-contact windows with no tackler? No, not with the current carrier.**
- With a physically consistent reference (proxy), the vertical mismatch disappears (pelvis within 1 – 16 mm) and the inverse-dynamics spikes disappear (≤ 29 N·m).
- But the runner is still coherent for only 3 / 6 / 2 ticks (rx_miss / rx_free_leg / rx_planted_leg), and 0 – 6 ticks on walk-to-sprint fixtures.
- The carrier's own actuation law saturates almost every leg and trunk actuator. Its velocity feed-forward asks 1.4 – 4.5 kN·m; recovery support is saturated on 89 – 93 % of steps in rx_miss / rx_free_leg and 57 – 100 % on the fixtures.
- So the swing foot cannot follow and drags.

**5. Which failures disappear, and which remain?** See §6. In short:
- **Disappear:** the vertical mismatch, the cusp torque spikes, the presentation-vs-gameplay leg disagreement, and the early-touchdown mechanism.
- **Remain:** the carrier's actuation saturation (now the binding failure), the PR-2 v2 handoff velocities, the record's 17.9 mm slide discontinuity, and V2's high-speed swing capacity.

**6. Any genuine V2 limitation?**
- **None at 3 m/s.**
- **From 4.2 m/s:** the swing motion needs hip torque above V2's modelled capacity for half of each swing (the Hill velocity scale, w0 = 15 rad/s). This also holds for the knee from 6.5 m/s. That is a candidate actuator-model limit, worth checking against human data.
- It has not caused any observed failure: the carrier fails first, at every speed.

**Verdict.** There is no single principled correction of the leg law that passes the next gate. The law correction (option 1) is necessary for consistency, but it is a gameplay change and not sufficient. The binding blocker for "an unobstructed promoted runner stays coherent" is the carrier's actuation law. **Stopped for your decision (§8).**

## 1. What was run (all read-only)

| script (`scripts/`) | what | output (`evidence/`) |
|---|---|---|
| `law_physics_audit.mjs` | The simulation's own leg law (V1.3 `ptRxBodyChar` in a read-only vm) at constant 1.45 – 8.2 m/s: 2 cycles × 2,000 samples, V2-mapped. Measures the vertical, discontinuities, implied force at the 240 Hz step, grounded-point slip, clearance, foot and joint speeds, swing inverse dynamics vs V2's capacity model, and the spring-mass vertical with its reach / clearance needs. | `law_audit.json` |
| `contact_geometry_prediction.mjs` | The simulation's contact test re-run offline at the 4 recorded sub-steps for all 26 candidates: (a) current law legs (calibration), (b) CHARCOLLIDE legs built from the LC-1 presented skeleton | `contact_geometry_prediction.json` |
| `pres_reference.mjs` + `pred_coherence.mjs` / `pred_detail.mjs` | Frozen PCS-1 carrier with the LC-1 presentation as its gait reference (the proxy for a physically realisable law), no tackler, 30 ticks; and the same on speed fixtures with either reference | `pred/`, `pred_speed/` |

**Disclosed:** the first proxy run mapped the presentation with RF-1 foot reconciliation. That snaps the foot pitch by ≈ 40° in one frame when a contact flag toggles, and produced 7.5 kN·m feed-forward spikes. RF-1 is a mapping artefact, so the proxy was rebuilt without it. Both runs are kept (`pred/rf1_artifact/`).

## 2. How the law makes its vertical, and why that is not physical

**Code** (V1.3 `anim3d/of_loco.js`, shared with the simulation via `ptRxBodyChar`):

**Stance** (`ofLocoGroundPelvis`):
- The pelvis is set wherever the authored hip, knee and ankle angles put the stance foot's lowest point on the pitch: min(heel, toe) before s = 0.62 and the toe after it, a hard switch.
- In double support it takes the higher requirement, with a 0.12 hand-over.
- **The vertical is a geometric by-product of the authored angles, not a trajectory.**

**Flight:**
- `bob = lerp(lastBob, landing, smoothstep(f)) + P.bob·sin(πf)`. The landing height is a cosine estimate of the landing leg, not its actual grounding.

**Per speed** (`law_audit.json`; forces from the V2 COM at the 240 Hz physics step; the pelvis gives the same within a few %):

| speed (m/s) | gait | COM range (mm) | stance force (BW) p1 / p50 / p99 | stance samples needing a **pull** | flight force (BW; ballistic = 0) | take-off v (m/s) | position step |
|---|---|---|---|---|---|---|---|
| 1.45 | walk | 101 | −14.6 / 0.80 / 13.2 | 14 % | — | — | −1.8 mm at heel → toe |
| 2.2 | walk | 123 | −15.4 / 0.25 / 55.0 | 42 % | — | — | −20.8 mm at toe-off |
| 3.0 | jog | 129 | −16.4 / **−0.59** / 70.5 | **67 %** | −11.6 … 162 | **−4.3** | 3.2 mm at touchdown |
| 4.2 | jog | 131 | −28.6 / −1.82 / 91.2 | 78 % | −11.1 … 189 | −6.1 | 8.0 mm |
| 5.5 | run | 128 | −56.6 / −2.88 / 137 | 71 % | −10.5 … 221 | −6.9 | 13.4 mm |
| 6.5 | run | 123 | −90.2 / −3.97 / 188 | 69 % | −9.7 … 287 | −9.5 | 18.6 mm |
| 7.5 | sprint | 151 | −126 / −6.08 / 254 | 67 % | −9.9 … 352 | −12.0 | 24.0 mm |
| 8.2 | sprint | 178 | −163 / −9.09 / 279 | 66 % | −10.6 … 419 | −14.7 | 28.0 mm |

**Discontinuity inventory and causes:**

| defect | cause in the code | size |
|---|---|---|
| position step at every touchdown (running) | flight's `landing` estimate ≠ the actual FK grounding of the landing leg; single-leg stance has no hand-over | 3 → 28 mm (jog → sprint) |
| velocity kink at touchdown and take-off | stance grounding ↔ smoothstep bob switch | 16 – 37 slope breaks per cycle (all speeds) |
| step / kink at heel → toe | hard switch `lg.s < 0.62 ? min(heel, toe) : toe` | 1.8 mm at walk; kinks at every speed |
| outgoing-leg drop (walk / run blend) | double-support max loses the outgoing leg at its toe-off | 20.8 mm at 2.2 m/s |
| vault and late-stance plunge | the grounded leg's authored extension and its late-stance knee flexion move the pelvis by geometry | 117 – 140 mm above a spring-mass trajectory; take-off −4.3 … −14.7 m/s |
| non-ballistic flight | `P.bob·sin(πf)` lift plus smoothstep | −11.6 … +419 BW, where ballistic is exactly 0 |
| joint C0 cusps | piecewise joint curves (hip at toe-off; knee max(); ankle lerps) | slope jumps hip 221 – 894 °/s, knee 247 – 1212 °/s |
| speed-parameter breaks | piecewise-linear parameter blend between gait anchors | C0 in speed (affects accelerating runs) |
| plant IK (presentation only) | world plants + IK, absent from the simulation's legs | the presentation-vs-gameplay leg gap (LC-1: p50 63 – 112 mm) |

**Why it cannot be realised after promotion.** A physical body obeys m·ÿ = F_ground − m·g, with F_ground ≥ 0 and F_ground = 0 in flight.
- The law asks for a pulling ground force on two thirds of stance at jog and above.
- It asks for a 10 – 400 BW non-ballistic acceleration in flight.
- It plunges at 4 – 15 m/s just before take-off.

A promoted body tracking its joint angles therefore cannot have the law's pelvis height. In PCS-1 the physical pelvis was 102 – 137 mm below it, and the swing foot struck the turf.

## 3. Other non-physical properties

| speed | grounded-point slip, mean speed (path per stance) | ankle excursion per stance | swing clearance (law) | swing-foot peak | knee peak |
|---|---|---|---|---|---|
| 1.45 | 2.5 m/s (287 mm) | 99 mm | 18.8 mm | 4.6 m/s | 352 °/s |
| 2.2 | 3.4 m/s (60 mm) | 17 mm | 35.9 mm | 6.0 m/s | 484 °/s |
| 3.0 | 3.0 m/s (776 mm) | 133 mm | 15.4 mm | 7.5 m/s | 613 °/s |
| 4.2 | 3.9 m/s (778 mm) | 153 mm | 14.0 mm | 10.9 m/s | 817 °/s |
| 5.5 | 4.9 m/s (771 mm) | 177 mm | 19.6 mm | 14.6 m/s | 1031 °/s |
| 6.5 | 5.9 m/s (792 mm) | 197 mm | 9.3 mm | 18.3 m/s | 1350 °/s |
| 7.5 | 7.0 m/s (814 mm) | 219 mm | 3.9 mm | 22.2 m/s | 1559 °/s |
| 8.2 | 7.9 m/s (829 mm) | 236 mm | **−0.6 mm** | 24.7 m/s | 1707 °/s |

**The gameplay legs' "planted" foot is not planted.**
- After about 15 % of stance it is grounded on its toe tip, which slides at roughly running speed.
- The authored hip sweep moves the foot about 0.65 m relative to the hip, while the root travels about 0.84 m per stance at 3 m/s.
- LC-1's net drift figure (13 – 119 mm, start to end) understated this.
- A physically planted foot under friction cannot do it. This is the mechanism behind SLP-2's stance braking and PCS-1's slip.

## 4. Requirements vs V2's envelope

**V2 envelope used:**
- **Geometry:** thigh 0.435 m, shank 0.399 m, ankle height 0.088 m.
- **Hard ROM:** hip flexion −25 … 140°, knee flexion −5 … 155°, ankle dorsiflexion −60 … 45°.
- **Capacity:** the spec §14 model (Hill concentric scaling w0 ≈ 15 rad/s, eccentric plateau).
- **Demonstrated loading:** legs carrying up to ≈ 1.2 BW in SLP-1b / SLP-2C. Running stance forces have not been demonstrated.

| requirement | law | with a spring-mass vertical (same stride timing) | V2 envelope |
|---|---|---|---|
| peak stance force | p99 70 – 279 BW (artefacts of the vault / plunge) | **1.87 – 2.62 BW** (3.0 – 8.2 m/s) | modelled capacity yes; **demonstrated only ≈ 1.2 BW** |
| flight | non-ballistic | rise 3 – 6 mm, ballistic | — |
| stance reach | grounded by construction | −3.6 / −4.9 / −6.6 / −7.3 mm margin (3 – 6.5 m/s); **+15.1 / +34.7 mm beyond full extension at 7.5 / 8.2** | reach-limited at sprint: the touchdown level must follow reach |
| swing clearance (authored swing angles) | 3.9 – 36 mm (−0.6 at 8.2) | **−20.4 mm at 3.0**, −7.5 at 4.2, 0 at 5.5, +4.6 … +10.8 above | a clearance correction is needed at jog |
| swing knee speed | 613 – 1707 °/s | (the same swing) | w0 ≈ 859 °/s: concentric capacity → 0 above |
| swing torque, median vs capacity (240 Hz, gravity + inertia) | hip 0.05 – 0.49 up to 3.0; **1.13 – 2.72 from 4.2**; knee ≤ 0.35 up to 4.2, **1.11 – 2.31 from 6.5** | similar (the swing is unchanged) | **limit at run / sprint swing speeds** |
| cusp impulses | hip slope jumps 221 – 894 °/s (unbounded torque at step resolution) | removable by C1 rounding (LC-1 D1) | — |

## 5. A physically realisable replacement: what it must contain

**Components:**
1. **Vertical:** spring-mass for running gaits; a C1 pendular / double-support model for walking. Levelled at the landing leg's geometric touchdown height, and capped by reach.
2. **Stance:** a rolling contact that does not slide. This needs stance-leg IK to a world-fixed contact consistent with the root motion.
3. **C1 joint curves.**
4. **A swing clearance / reach constraint.**

**Status:** components 1, 3 and 4 exist in the LC-1 presentation layer. LC-1 has open defects at sprint (60 Hz engagement onset), at the walk / run blend, and at the overlay hand-over.

**To serve all three roles,** the same function must run in the simulation's `ptRxBodyChar`:
- **Stateless form:** exact at constant velocity only. Under acceleration or turning the stance foot drifts by about ½·a·t².
- **Stateful form:** deterministic per-player plant anchors, which add gameplay state.

## 6. What a corrected trajectory fixes, and what stays

| failure | disappears with a physically consistent law? | evidence |
|---|---|---|
| physical pelvis 100 – 140 mm below the reference (PCS-1) | **yes** | proxy: pelvis within 1 – 16 mm |
| early swing touchdown caused by that mismatch | **the mechanism, yes** | — but the swing still drags for another reason (next row) |
| inverse-dynamics spikes at law cusps (2,381 N·m) | **yes** | proxy max 29 N·m (3 m/s), ≤ 92 N·m (5.5 – 7.5 m/s) |
| stance-foot skate in the gameplay legs | **only if the law plants** (component 2) | §3 |
| presentation vs gameplay leg disagreement | **yes**, if both use the same law | by construction |
| **carrier actuation saturation** (posture gains sized for standing, plus the PI-1 §8 velocity feed-forward (D + dt·K)·ω*) | **no, independent** | proxy: 1.4 – 4.5 kN·m requests, actuators saturated on hundreds of axis-steps, B saturated 57 – 100 %, coherent 0 – 6 ticks at every speed |
| PR-2 v2 handoff velocity error (60 Hz differences) | no | LC-1, PCS-1 |
| 17.9 mm record discontinuity (the slide leg stops at frame 43) | no (a tackler-record property) | AST-1E prereg |
| V2 swing capacity at ≥ 4.2 m/s | no (V2 model / speed) | §4 |

**Prediction runs:**

| run (frozen carrier, no tackler, 30 ticks) | reference | coherent ticks | first failures |
|---|---|---|---|
| rx_miss k47 | LC-1 proxy | 3 | CG-2 / slip at 52, CG-4 at 54 |
| rx_free_leg k39 | LC-1 proxy | 6 | CG-2 at 47, CG-4 at 48 |
| rx_planted_leg k38 | LC-1 proxy | 2 | slip at 42, CG-2 at 43 |
| walk / jog / run / sprint fixtures (8 frames) | LC-1 proxy | 0 – 6 | CG-2 / slip / CG-4 first |
| the same 8 frames | current law | 0 – 11 | the same rows |

## 7. Collision geometry change (prediction P1)

**Calibration.** Current law legs reproduce the recorded first contact in 23 / 26 cases. The remaining three are toe vs foot attribution, −0.5 tick, and a pelvis-first contact; the test here uses legs only.

**With the LC-1-proxy legs:**

| change | cases |
|---|---|
| near miss → contact | rx_heavy, rx_light, rx_sprint (≈ τ 60) |
| contact → miss | rx_rear, sl_left |
| struck segment changes | rx_jog (shin → foot, +0.75), rx_lateral (foot → shin), **rx_planted_leg (shin_L → foot_L, +0.75)**, rx_side_standing (shin_R 60.5 → shin_L 52.0), rx_square, sl_from_behind, sl_loose |
| timing shift only (≤ 1 tick) | rx_early_stance, rx_free_leg (−0.25, same foot_L), rx_front_diag, rx_glancing, rx_late_stance, rx_standing, sl_win |
| unchanged | rx_behind_standing, rx_facing_front, rx_rear_diag, rx_miss (still a miss), rx_airborne, sl_early, sl_late |

## 8. Options for your decision

| | option | effect | cost |
|---|---|---|---|
| **A** | Correct the shared law (simulation + presentation): spring-mass vertical, non-sliding stance, C1, clearance / reach | one consistent geometry for gameplay, presentation and the promoted reference; removes the vertical and skate defects | a gameplay change (12 / 26 first contacts change class or segment, 7 more shift ≤ 1 tick), needs re-baselining; stateful plants or a constant-velocity approximation; **does not alone pass the next gate** |
| **B** | Keep the gameplay legs; make only the presentation and the promoted reference physical (LC-1-like) | no gameplay change | the gameplay legs stay non-physical. CG-4 / CG-2 against the gameplay legs fail by construction unless coherence is re-defined against the presentation (a criteria decision). **Does not alone pass the next gate.** |
| **C** | Redesign the carrier's actuation (independent of A / B): feed-forward from the reference's physics (inverse dynamics + statics, ≤ 30 – 90 N·m), joint impedance sized for running motion rather than standing balance, no rate × stance-damping term | removes the binding blocker found by every run here | a change to the frozen carrier; needs its own design and preregistration |
| **D** | Check V2's actuator velocity model (w0) against human running data | settles whether ≥ 4.2 m/s swing is a body limit | read-only |

**Recommendation:**
- **C first, designed read-only and tested on the next gate** (an unobstructed runner, no tackler, ≥ 12.5 ticks) **against the physical proxy reference.**
  - That isolates the carrier from the law question without changing gameplay.
  - If it passes, the remaining choice is A vs B: whether gameplay collision legs should become physical, which is a gameplay decision.
- **D in parallel (read-only).** Nothing in A, B or C should be started without your approval.
