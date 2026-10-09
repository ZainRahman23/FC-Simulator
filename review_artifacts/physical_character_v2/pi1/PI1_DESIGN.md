# PI-1: promotion into physical interaction (vertical slice 1). DESIGN ONLY, not implemented

**Status:** design for review. No code, no runs, no preregistration yet.

**Source:** `../sources/2026-10-09_user_decision_end_slp_series_pivot_promotion.md`.

**Architecture:** `../PHYSICAL_CHARACTER_ARCHITECTURE_PIVOT.md` §5.

**Not in scope:**
- implementing the slide tackle in gameplay;
- any gait experiment; TD2C / E2;
- multi-player promotion; the ball;
- in-page integration; optimisation; physical recovery stepping.

## 1. Question

> Can one normally locomoting player be promoted into meaningful physical interaction and respond plausibly to a football collision without requiring continuously physical locomotion?

PI-1 answers this for **one** player, **one** challenge type and the **smallest** set of cases that can tell the answer apart:
- a miss;
- a clip of the swinging leg;
- a sweep of the weight-bearing leg.

## 2. Target interaction, reduced

**Source scenario.** The previously built slide-tackle work on `prototype/3d-animation-pipeline`:
- Defending V1.1 slide (cdb0735): side-on, on the tucked-leg hip, one tackling leg, laces / inside, never studs.
- Tackled-Player V1 (f5f6076, `pt_react.js`).

**Its counterfactual pair** (`tools/anim3d/of_react_scenarios.js`). Both cases share the same slide line and runner speed; only the stride phase differs. The values below are the simulation's own records (`review_artifacts/tackled_player_v1`):

| | `rx_free_leg` | `rx_planted_leg` |
|---|---|---|
| runner (the **victim**) | 3 m/s, recorded 73 kg, SINGLE_R (phase 0.325), L foot **swinging** | 3 m/s, 73 kg, SINGLE_L (phase 0.575), L foot **weight-bearing** |
| tackler (the user's "**attacker**") | SLIDE, [0, 4.717] m/s from the side (90°), recorded 78 kg, primitive LEG | same |
| contact | tick 50, sub-step 2 (t ≈ 0.825 s); foot_L at 0.173 m; v_n 4.08 m/s | tick 50, sub-step 2; foot_L at 0.057 m; v_n 4.70 m/s |
| impulse / effect | J = 4.26 N·s; swing landing shifted [0.017, 0.153] m and 0.122 s late; ΔV(COM) 0.007 m/s | J = 116.93 N·s; friction capacity 23.27 N·s; foot displaced 0.8 m; **support lost**; ΔV(COM) 0.192 m/s; tip 7 rad/s; vertical drop 0.677 m vs capacity 0.121 m → COLLAPSE |
| outcome (authoritative) | **CORRECTION**, 1 corrective step | **FALL SIDE**; on the pitch at 1.185 s; slides 0.658 m; up at 2.971 s |
| tackler | slowed 0.055 m/s | slowed 1.499 m/s |

Note on terms: Tackled-Player V1 calls the runner "attacker" because he is on the attacking team. In this document **victim = the tackled runner** and **tackler = the user's "attacker"**, the player making the challenge.

**Reductions:**
- **Three cases:**
  - `rx_free_leg` (CORRECTION);
  - `rx_planted_leg` (FALL);
  - **`rx_miss`**, the same as `rx_free_leg` with the tackler's line offset so that the simulation's closest approach is 0.10 – 0.20 m. The offset is set at freeze from the simulation's own geometry. In this case the promotion predictor fires but no contact occurs.
- **Fixed scenario:** no ball (the cases already place it 5 m away); scripted players (`ai: SCRIPT`); one challenge; flat turf.
- **One promoted player:** the victim. The tackler is a physical proxy (§7), not a V2.
- **Offline:** the V2 runs as an offline, record-driven consumer in Node. The simulation runs in its existing harness and exports a record (§9).
- **Simulation:** **no code change.** Only an exporter tool and scenario data (`rx_miss`).

## 3. Overview

```
football simulation (match.js + pt_defend + pt_react; authoritative; unchanged)
   │  per 60 Hz tick: authoritative interaction record (AIR), read-only, append-only
   ▼
presentation (consumes AIR; never writes back)
   ├─ cheap locomotion: Outfield Locomotion V1 pose generator on the victim's V2-proportioned skeleton (every tick)
   ├─ promotion manager: causal predictor → PROMOTE / DEMOTE (state machine §11)
   ├─ V2 interaction physics (only while promoted): victim V2 + tackler proxy + turf, 240 Hz, 4 steps per tick
   └─ output pose: procedural (LOCO) | physics→render mapping (promoted) | inertialized blend (demotion)
```

## 4. Pre-contact locomotion representation

- **Generator.** The victim is presented by **Outfield Locomotion V1**:
  - speed-driven gait from the simulation's own stride clock (`p.gaitPhase`) and velocity;
  - zero-slide world plants; foot IK; ground placement by turf-height query.
- **Rigid-body physics.** None for this player while in LOCO.
- **Skeleton.** The generator runs on a skeleton built from the **victim's V2 semantic skeleton** (V2 spec §6 / §10; `ofActorMake` accepts a ready skeleton). The cheap and physical representations therefore share segment lengths.
  - A bone correspondence table, prototype rig ↔ V2 semantic skeleton, is an implementation prerequisite.
- **Geometry agreement with the simulation's contact model.**
  - pt_react rebuilds the runner's legs from the same stride clock with capsules: foot r 0.05, shin 0.06, thigh 0.08, pelvis 0.15, torso 0.17.
  - Requirement **G-1:** the V2 victim's thigh, shank and foot lengths are within 1 cm of the simulation's body model for that character, and its mass equals the recorded weight. This is the Defending V1 lesson: sim contact geometry must derive from the rendered body.
  - **Decision D-1** (§16) chooses how to meet G-1.
- **What the stream supplies.** At every tick:
  - the authoritative root (position, velocity, facing);
  - the procedural pose (render-skeleton local rotations and root);
  - its causal finite difference, the pose at k minus the pose at k−1. This is what promotion uses.

## 5. When and how promotion occurs

**Trigger.** A pure function of the **current** authoritative state, never of future ticks:
- a challenge is live (the tackler is in SLIDE), **and**
- the predicted closest approach, within the next **T_lead = 0.10 s (6 ticks)**, is ≤ 0.10 m between:
  - the tackler's slide primitives, extrapolated with the simulation's published slide law (v, deceleration 5.5 m/s²);
  - the victim's segments, extrapolated from the stride clock.

**Implementation constraints:**
- The predictor may reuse simulation geometry code only if that code is pure. The write detector (§13) verifies this.
- There is **no impulse threshold.** Promotion happens before contact. It is triggered by the interaction becoming imminent, not by how hard the hit is.

**Lead.**
- The 0.10 s lead gives the physical body about 24 steps to establish its contact manifolds and actuator activation before the hit.
- It is short enough that no stride-level physical locomotion is involved: at 3 m/s it is under half a stance (t_c ≈ 0.26 s).
- PI-1 measures what the lead costs (B usage, deviation, slip) in all three cases.
- Expected promotion: about tick 44 (≈ 0.733 s) for both contact cases.

**Zero-lead fallback.** If the simulation records a contact for a player who is not promoted, that is not handled in PI-1. The predictor must fire in every PI-1 contact case, and the margin is reported. The fallback is open question Q2 in the pivot document.

**Mechanics: pool activation, not creation.**
- At harness start, one V2 victim body set, one proxy and the turf are created in a fixed order.
- Promotion adds them to the physics system and sets their state once (§6).
- Demotion removes them.
- Every per-body and per-constraint state is reset on activation: actuator activation, passive state, motor and constraint warm-start impulses. The contact cache is already off.

## 6. Pose and velocity initialization (the one declared state write)

All steps happen at the promotion tick k_p, before any physics step.

1. **Pose.**
   - The procedural pose at k_p is mapped to the 14 V2 bodies through the inverse of the §9 mapping (DIRECT / AIM bones give exact body transforms).
   - If any joint lies outside V2's limits, it is projected into the hard box (bounded IK). The residual is recorded.
2. **Ground.**
   - Each foot the procedural pose treats as planted is placed on the turf with a vertical whole-body shift: the lowest sole point at turf height, within the 5 mm slop.
   - Not allowed: penetration beyond slop + 1 mm (turf, self, proxy).
3. **Velocities.**
   - Each body's linear and angular velocity comes from the causal finite difference of the procedural pose, (k_p − 1 → k_p) / (1/60 s).
   - Then a **uniform horizontal shift** makes the whole-body COM velocity equal the authoritative root velocity. A uniform shift leaves angular momentum about the COM unchanged.
   - Linear momentum = M·v_auth. Angular momentum = that of the procedural motion (recorded).
4. **Actuators.**
   - Targets: the procedural pose stream, interpolated to 240 Hz (linear for positions, slerp for rotations), mapped into V2 joint coordinates.
   - Per-axis {K, D, τ0} from the existing posture law and statics.
   - Velocity feed-forward from the **target's** rate. That rate is state-independent, which avoids the SLP-2C C2 loop.
   - Activation starts at the level of the first command, so there is no lag ramp at promotion.
5. **Logging.** The write is logged once:
   - every body's state before and after;
   - the projection residual and the shift.
   
   After it, `authorityWrites` = 0 until demotion.

## 7. Collision representation

**Victim (promoted V2), unchanged from the spec:**
- **Colliders (§15):** boot hulls, shank capsules (shin guard in front), thighs, pelvis, trunk boxes, deltoid spheres, arms, head.
- **Contacts:** boot–turf μ 1.2; body–turf 0.5; hand–turf 0.7; body–body / boot–body 0.4; restitution 0; manifold reduction and contact cache off; self-collision by the GroupFilterTable.
- **Solver:** 240 Hz, 150 / 2 iterations.

**Tackler (the user's "attacker"): a dynamic slide proxy, not a V2.**
- **Shape:** one rigid compound body.
  - The sliding trunk on the pitch: capsule r 0.17, behind the leg along the slide direction.
  - The tackling leg: Defending V1.1's slide-leg capsule, spanning 0.46 – 1.12 leg lengths ahead of the slide root, at its full extension. In these cases contact comes about 0.33 s after launch, and the extension completes in 0.12 s.
- **Mass and DOFs:** mass = the tackler's recorded weight (78 kg). Allowed DOFs: translation + yaw. Pitch / roll are locked, because the proxy's own tipping is not under test.
- **Driven by** a B-type tether: a PositionAndVelocity motor toward the simulation's slide state (position, velocity, yaw).
  - Caps: 334 N horizontal, vertical feed-forward m·g.
  - Over a 10 – 20 ms impact the tether can contribute at most about 3 – 7 N·s, against J = 117 N·s in the planted case. So the momentum exchange at impact is physical.
- **Contacts:** none with the turf (its ground interaction is the simulation's slide law); contact with the victim only, μ 0.4.
- **Why dynamic and not kinematic.**
  - A kinematic body behaves as if it had infinite mass.
  - For a weight-bearing struck leg, the effective struck mass is about half the body (≈ 36.5 kg for the 73 kg runner): m_red ≈ 25 kg with a 78 kg tackler, against 36.5 kg with an infinite-mass one. A kinematic tackler would overstate the sweep by about 45 %.
  - For a swinging leg the difference is about 6 %.
- **Rendering:** the tackler keeps its procedural slide presentation. The proxy is its physical stand-in. A promoted tackler is open question Q7.

## 8. V2 components activated

| active while promoted | not active |
|---|---|
| 14 bodies, 13 SixDOF joints, limits / engine stops, passive tissue | autonomous balance (G2 balance feedback), CoP / capture planning |
| colliders and contact settings (§15); turf | E1a / E1b weight transfer, E2 stepping, TD2C, CF stepping |
| ActuatorLayer (capacity, activation, Hill); posture-tracking law {K, D, τ0}; statics feed-forward | SLP schedule driver, footholds, stance-force schedules (C) |
| bounded leg IK (initialization projection only) | A, the uniform field. The cases run at constant speed, so a_auth = 0. A stays available for accelerating cases and is not re-tested here. |
| **B**, the finite support: SLP SupportLayer, caps for the 3 m/s class (horizontal 274.95 N; vertical +1161.2 / −193.5 N; torque 81.80 N·m), spring 2 Hz, ζ = 1 (D-5) | the SLP α law driven by physical state. α is set by the simulation's outcome (§10). |
| contact probes, impulse readback, energy / work ledger, D series, per-tick hashes | — |

## 9. Authoritative simulation / presentation boundary

**The simulation owns:**
- the victim's and tackler's gameplay roots (position, velocity, facing);
- the stride clock;
- the contact record;
- the outcome class and its parameters: correction step; or fall direction, family, timings, fall-root trajectory and recovery window;
- possession.

None of these is ever written by presentation.

**The authoritative interaction record (AIR).** Exported per tick by a new **tool**; the simulation code is unchanged. It contains:
- the authoritative fields above;
- the procedural pose streams (LOCO; the of_react correction overlay; fall-basis and get-up target poses);
- hashes.

The V2 consumer reads it through a cursor that **cannot return ticks beyond the current one** (lookahead guard, §13).

**Physics owns** the victim's body configuration and contacts while promoted. Its only couplings to the authoritative root are declared, bounded and logged:
1. the promotion initialization (§6);
2. B, the bounded tether. Its target is the procedural pelvis pose, which is consistent with the authoritative root. After support loss its target is the simulation's fall-root trajectory.

**The simulation's own contact ΔV is never applied as a force.** The physical contact produces the physical ΔV. B corrects only the residual, within its caps, and the residual D is reported.

**Nothing flows back.** No physical quantity is read by the simulation.

## 10. How the collision response stays visible

**While promoted, the rendered victim *is* the physics.**
- Render bones come from the V2 bodies through the §9 mapping. DIRECT bones are exact.
- No authored overlay is applied during IMPACT, FALLING or GROUND.
- The actuator targets during IMPACT are the **unperturbed** locomotion intent: the procedural pose without the reaction overlay. Every deviation of the struck limb, trunk and arms is therefore physically caused.

**Measured against the no-contact procedural stream** for the same ticks (criteria V-1 to V-3):
- **onset:** in the first physics step of contact;
- **direction:** along the contact normal;
- **magnitude:**
  - free leg: the struck foot deflects;
  - planted leg: the boot is swept, support is lost, the pelvis drops and the body rotates.

**Review media,** as in Tackled-Player V1: gameplay camera, side view, 0.25×. Each case is shown as the Tackled-Player V1 procedural presentation next to the promoted physics, from **the same simulation record**.

## 11. States: stumble, fall, recovery

| state | entry | physics | actuator targets | B (victim) | exit |
|---|---|---|---|---|---|
| **LOCO** | start; blend end | none | — | — | predictor fires → PRE |
| **PRE** | promotion (§5, §6) | on | procedural locomotion stream | α = 1, 6 axes, target = procedural pelvis | first physical victim–proxy contact → IMPACT; challenge over with no contact (`rx_miss`) → BLEND |
| **IMPACT** | first contact | on | unperturbed locomotion stream (no overlay) | **CORRECTION / STUMBLE:** α = 1 (the simulation kept support). **FALL:** at the simulation's support-loss instant (here the contact; LOST + COLLAPSE), vertical and orientation α → 0 over 0.03 s, horizontal kept (T1). | **CORRECTION / STUMBLE:** demotion conditions (§12) → BLEND. **FALL:** → FALLING. |
| **FALLING** | support released | on | protective fall basis (of_react's FRONT / SIDE / BACK key poses, weighted by the simulation's rotation direction, on the simulation's topple timeline), at finite capacity | horizontal tether toward the simulation's fall-root trajectory, caps unchanged (T1) | pelvis or trunk on the turf → GROUND |
| **GROUND** | trunk contact | on | landed key pose of the simulation's family | as FALLING | rest (COM speed ≤ 0.05 m/s and kinetic energy ≤ 2 J for 0.2 s) **and** the simulation's recovery window has started → BLEND into GET-UP |
| **BLEND** | demotion | **off** (removed at blend start) | — | — | blend complete → LOCO (with the of_react correction overlay) or GET-UP |
| **GET-UP** | blend into authored recovery (of_react family for SIDE: roll to hands and knees → kneel → crouch), timed to the simulation's window | none | — | — | the simulation's "up" → LOCO |

**Stumble.**
- In PI-1 the simulation's STUMBLE is presented like CORRECTION: physics through the impact, then demotion into locomotion plus the of_react stumble overlay, which carries the simulation's multi-step stumble.
- Neither PI-1 case is a STUMBLE. That state is specified, not tested.
- Physical multi-step stumbling would need stepping control and is excluded.

**Variant T0 (diagnostic only, planted case).** No horizontal tether after support loss: pure physics. It measures the natural discrepancy between the physical fall and the simulation's fall trajectory. It is reported, not a pass criterion (Q5, D-2).

## 12. Return to cheap locomotion

**Demotion conditions (CORRECTION / STUMBLE / miss).** The first tick at which all of these hold:
1. no victim–proxy contact for ≥ 2 ticks;
2. **plant agreement:**
   - every physically loaded foot (≥ 20 N) is within 20 mm of the procedural plant;
   - every procedurally planted foot is physically loaded within 20 mm (or both feet are in swing);
3. the rendered pose deviation from the procedural target is ≤ 0.15 m at every joint.

**Forced demotion.** At **T_max = 0.6 s** after promotion, demotion happens anyway. Any condition still violated is reported as a failure of the relevant criterion.

**FALL.** Demotion when GROUND's exit holds. If the simulation's recovery window starts before physical rest, that is reported as outcome tension (O-4).

**Blend: inertialization** (offset decay, not cross-fade).
- At the demotion tick, physics is removed. The offset (physical render pose − target pose) and its rate are captured per joint and for the root.
- The offset decays to zero with a deterministic critically damped quintic over 0.20 s (into LOCO) or 0.30 s (into GET-UP).
- The output is the target plus the decaying offset. It is continuous in position and velocity.
- The root converges to the authoritative root.
- The target stream itself is the unmodified procedural / authored stream. After the blend, the presentation is **exactly** what a never-promoted player would show.

## 13. Determinism and reproducibility

| | requirement |
|---|---|
| DT-1 | every case run twice: identical per-tick hashes (physics state, B readback, state machine, rendered pose) |
| DT-2 | separate processes give identical hashes |
| DT-3 | history independence: the three cases in sequence in one process (pool reused) equal each case run fresh |
| DT-4 | render-rate independence: the consumer driven at 30 / 60 / 144 Hz render cadence (fixed-step accumulator) gives identical physics hashes |
| DT-5 | lookahead guard: running on the record truncated at tick k gives identical state up to k |
| DT-6 | no RNG and no wall-clock in the presentation path (static check, as `of_loco_regress.js`) |
| DT-7 | the AIR export is itself deterministic (identical hashes ×2), and earlier SLP / V2 hashes reproduce (no shared code path changed) |

## 14. Animation ON/OFF outcome-neutrality

| | requirement |
|---|---|
| NT-1 | simulation authoritative state per tick (every player, ball, possession, contact and outcome records) identical across presentation OFF / cheap ON / cheap + promotion, for all three cases (max \|Δ\| = 0; the existing gate style) |
| NT-2 | the V2 consumer has no write path: the AIR hash is identical before and after; inputs are deep-frozen; no import of simulation modules with mutable access |
| NT-3 | the promotion predictor reads only authoritative state (no physics → simulation dependency; static check) |

**Disclosure.** In PI-1 the V2 runs offline, so NT-1 holds for the V2 part by construction. It is verified structurally (NT-2, NT-3).
- The in-page gate with V2 running live is a requirement of the following slice, not of PI-1.
- The cheap-locomotion part of NT-1 is verified live with the existing gate.

## 15. Proposed CPU measurements

**Environment:** Apple M4, Node 22, single thread, sequential, 3 trials, medians. The existing simulator counters, unchanged.

| | measurement |
|---|---|
| M-1 | per 240 Hz step, by state (PRE / IMPACT / FALLING / GROUND): Jolt step, passive, actuators, target mapping, B, proxy tether, probes, measurement, total |
| M-2 | one-off promotion cost (pool activation, mapping, projection, velocity initialization, resets) and demotion cost (capture, blend set-up) |
| M-3 | cheap locomotion per player per 60 Hz tick, in Node if the generator runs headless; otherwise the browser figure, stated as such |
| M-4 | promoted duration per case; physics steps executed; physics steps on non-promoted ticks (must be 0) |
| M-5 | CPU per simulated second for each case: (a) never promoted; (b) promoted; (c) the counterfactual of continuous V2 for the same duration (M-1 × 240) |
| M-6 | extrapolation to 22 players and a stated interaction rate, using the formula of pivot §8 with measured M-1 to M-3 |
| M-7 | peak 60 Hz frame cost during promotion (4 physics steps + presentation) vs the 16.7 ms frame |

## 16. Pass / fail criteria

The same configuration is used for all three cases. No per-case tuning.

### Promotion continuity

| | criterion |
|---|---|
| C-1 | rendered joint positions at k_p differ from the procedural pose by ≤ 5 mm (mapped bones) |
| C-2 | whole-body COM velocity = authoritative velocity ± 0.02 m/s; angular momentum about the COM within 5 % of the procedural motion's |
| C-3 | penetration ≤ slop + 1 mm; joint-limit projection residual ≤ 2°; planted-foot speed ≤ 0.10 m/s |
| C-4 | energy Σ+ over the first 0.05 s ≤ 0.5 J |

### Pre-contact

| | criterion |
|---|---|
| L-1 | in PRE: B mean \|axis\| / cap ≤ 0.25 and not saturated; physical vs procedural pelvis ≤ 20 mm; planted slip ≤ 20 mm |

### Collision

| | criterion |
|---|---|
| K-1 | first physical contact within ± 1 tick of the simulation's contact tick (50), in both contact cases; none in `rx_miss` |
| K-2 | struck segment = the simulation's (left boot); contact point within 0.05 m of the simulation's point |
| K-3 | physical transferred impulse within 0.5 – 2× the simulation's J, direction within 30° of the simulation's normal; the proxy's ΔV in the same direction as the simulation's tackler slowing |

### Visible response

| | criterion |
|---|---|
| V-1 | struck-segment speed change ≥ 0.2 m/s in the first physics step of contact; visible in the frame that contains the contact |
| V-2 | struck-segment Δv direction within 30° of the contact normal |
| V-3 | free leg: struck foot deviates ≥ 0.05 m from the procedural reference within 0.15 s. Planted: the boot is displaced ≥ 0.20 m and unloaded (< 20 N) within 0.15 s. |

### Outcome consistency (the simulation decides; physics explains)

| | criterion |
|---|---|
| O-1 | CORRECTION: never fall-like while promoted (pelvis height ≥ 0.85× procedural; pelvis tilt within 15° of procedural); B saturated ≤ 10 % of promoted ticks |
| O-2 | FALL: trunk / pelvis on the turf within ± 0.15 s of the simulation's 1.185 s; landing family by trunk orientation = SIDE, on the side of the simulation's rotation direction (± 45°) |
| O-3 | FALL (T1): horizontal COM vs the simulation's fall root ≤ 0.15 m throughout FALLING / GROUND; \|J_B, horizontal\| ≤ 25 % of the horizontal momentum change over the fall |
| O-4 | physical rest reached before the simulation's recovery window opens, or the body is slower than 0.3 m/s there |

### Reconciliation

| | criterion |
|---|---|
| R-1 | rendered joint jump at the demotion tick ≤ 5 mm; joint speed jump ≤ 0.1 m/s |
| R-2 | during the blend: planted-foot slide ≤ 20 mm; rendered root = authoritative root within 1 mm at the blend end |
| R-3 | after the blend: the rendered pose equals the never-promoted procedural / authored pose for the same tick (identical) |
| R-4 | demotion by conditions, not forced by T_max, in `rx_free_leg` and `rx_miss` |

### Miss control

| | criterion |
|---|---|
| N-1 | `rx_miss`: the predictor fires; no contact; rendered deviation from the procedural pose ≤ 0.05 m while promoted; planted slip ≤ 20 mm; R-1 to R-3 hold |

### Determinism, neutrality, integrity

| | criterion |
|---|---|
| DT-1 to DT-7 and NT-1 to NT-3 | all hold (§13, §14) |
| I-1 | state written only at promotion (logged once); B caps never exceeded (≤ 1e-3 N); finite; energy Σ+ per promoted interval ≤ 5 J (ledger includes B and the proxy) |

### CPU

| | criterion |
|---|---|
| CPU-1 | no physics step on any tick without a promoted body |
| CPU-2 | promoted victim + proxy ≤ 1.2 ms per 240 Hz step (median; that is ≤ 4.8 ms per 60 Hz frame) |
| CPU-3 | the one-promotion scenario, including cheap locomotion for 22 players (M-3 × 22), stays ≤ 0.5 s CPU per simulated second over the promoted interval |
| | M-2, M-5 to M-7 are reported |

**Verdicts:**
- **PI-1 passes** if every criterion holds in every case and both runs.
- **Stop rules,** halting before the remaining runs:
  - any state write after promotion becomes necessary;
  - neutrality or determinism fails;
  - a contact case has no physical contact (geometry disagreement), which is to be reported and not tuned ad hoc;
  - passing would need per-case parameters.

## 17. Decisions for the user before preregistration

**D-1, victim body (G-1).** Recommended: **(a)** generate the victim V2 from the simulation's recorded identity of the runner (73 kg, the simulation's leg length) with the existing parametric generator (spec §17). It is gated by G0 plus the G1 passive subset before PI-1. This needs no simulation data change.
- Alternative **(b):** V2-REF (78.91 kg), with a scenario-local runner identity of the same mass and leg length.

**D-2, coupling after contact.** Recommended: **T1**, the B horizontal tether retained through FALLING / GROUND toward the simulation's fall root, with T0 as a diagnostic.
- Alternative: no physical coupling, plus a render-space root offset reconciled during the get-up blend.

**D-3, promotion trigger.** Recommended: the **causal predictor** with T_lead = 0.10 s.
- Alternative: presentation run a fixed delay behind the simulation, which gives exact contact knowledge at the cost of latency.

**D-4, execution.** Recommended: an **offline record-driven V2 consumer** in Node; in-page integration in the next slice.
- Alternative: in-page from the start (V2 WASM in match.html).

**D-5, B parameters.** Recommended: one value, **2 Hz, ζ = 1**, with the 3 m/s class caps. No calibration sweep: the windows are 0.1 – 0.6 s, and 2 Hz still lets a 10 – 20 ms impact act unopposed.

## 18. What implementation would involve (after approval; nothing started)

1. Freeze `pi1/PI1_PREREGISTRATION.md` (this design plus the D-1 to D-5 choices), before any PI-1 code or run.
2. Generate and gate the victim body (D-1).
3. On `prototype/3d-animation-pipeline`: the `rx_miss` scenario and an AIR exporter **tool**, with no simulation code change, and the frozen AIR records with their hashes. Committed locally only; that branch is never pushed without approval.
4. In the V2 worktree, new default-off files:
   - a promotion manager / mapping / initialization module;
   - the proxy;
   - the consumer harness;
   - the PI-1 probe.
   
   Existing V2 / SLP code paths unchanged (their hashes reproduce).
5. Runs:
   - 3 cases × 2;
   - T0 diagnostic × 2;
   - the DT-3 to DT-5 battery;
   - NT checks;
   - CPU × 3.
6. `PI1_RESULTS.md` with review media, then stop for review.

## Architectural rule (added 2026-10-09 after D-1A, user decision)

- **Explicit mapping required.** Gameplay collision primitives intended to drive physical presentation must have an explicit mapping to the rendered / physical character geometry.
- **No impossible claims.** A gameplay collision may be simplified, but it cannot claim an interaction that the corresponding physical character cannot plausibly reproduce.
- **Gated.** Every PI case passes the simulation ↔ physical-contact compatibility gate (preregistration amendment 1) before use.
- **Recorded.** Both geometries are recorded side by side.

See `../PHYSICAL_CHARACTER_ARCHITECTURE_PIVOT.md` §5.2a.
