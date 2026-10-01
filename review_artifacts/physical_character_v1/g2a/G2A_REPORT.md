# G2a — yaw / angular-momentum regulation + the first human in-place gait

2026-10-01 · worktree `physical-character-v1` · branch `prototype/physical-character-v1` · V1.1 body · nothing pushed.

**Status: built and validated. Awaiting your visual review. G2b has not been started.**

- **G1:** promoted and checkpointed locally as commit `772d0bd` ("physchar: G1 PROMOTED — locomotion architecture parity (G1a) + closure (G1b)").
  - The 30 N·s mid-swing fall is recorded as an accepted boundary and is not rescued.
- **G2a code:** uncommitted, on top of that checkpoint.

**Review page:** `http://127.0.0.1:8171/sandbox/visual/physchar/index.html?suite=G2` (the side panel has the seven review cases). §9 explains it.

---

## 0. The answer in brief

- **Physics: PASS.** All eight physical criteria pass (§5).
  - The walk in place: 16/16 steps, footholds ≤ 2 cm from plan, stance slip ≤ 0.13 cm.
  - External-impulse ledger ≤ 0.041 N·s, with no root force, teleport or velocity write.
  - Deterministic ×3; the browser hash equals Node's.
  - Support never yields to style.
  - Every approved gate is hash-identical, **including G1 26/26**.
- **Yaw: regulated.**
  - In place, the pelvis stays within **5°** of the intended heading (8.7° peak-to-peak) with no drift (−0.07°/cycle).
  - G1's stepping on the same body: ±13° (25.7° p-t-p); G1b recorded it as ±12° and growing.
  - An **intended 30° turn** is followed: pelvis −30.0°, chest −29.9°, feet −29.2°. Nothing pins the heading.
- **Human-likeness: much closer, but not yet a convincing human. You judge this; my honest view:**
  - **Now human-shaped:**
    - the knee lift (knee 70°, hip 35°, foot 14 cm up, toes hanging);
    - forefoot contact and then the heel lowering (≈ 56 ms);
    - a bent stance knee (≈ 22°);
    - the contralateral arm coming forward as the knee rises, at the reference's amplitude (36° vs 35.5°);
    - an upright, steady thorax;
    - a pelvis bob and roll.
  - **Still a careful march, not a natural walk in place:**
    - **long double support:** both feet are down ≈ 45 % of the time, so it reads as "lift, pause";
    - **no heel rise before toe-off:** the foot leaves nearly flat, then pitches toes-down in the air;
    - a deliberate 9 cm side-to-side weight shift;
    - arms that swing mostly at the shoulder.
  - §7 lists what is and is not fixed, and why. By your rule ("if the physics passes but the body still looks like a stiff march, G2a is not complete"), **I would not call G2a complete on looks until you have seen it.** The two limitations above are the ones I expect you to notice.

---

## 1. What changed

New files (`sandbox/visual/physchar`):

| File | What |
|---|---|
| `pc_gateg2.js` | G2a scenarios (the walk, the intended turn, eight attribution diagnostics) and `analyzeG2a`. The analysis covers: yaw against the intended heading; the vertical angular-momentum budget by body group; per-swing kinematics; contact sequence; style against the reference. |
| `tools/g2a_run.js` | The evidence run and criteria. `--scenarios-only` writes the regression baseline. |
| `results/v1_1/g2a_V1.1.json` | The G2a hash baseline (10 scenarios). `regress.sh` now checks it after G1. |

Changes to existing modules. Each is opt-in for the new controller's human gait; G1 and every earlier gate are hash-identical:

| Module | Change |
|---|---|
| `pc_ref.js` | of_loco's WALK as the in-place reference: `inPlaceWalkParams` and `refPose` with `inPlaceAdapt` (§3). Adds trunk yaw/roll mapping (twist axis +y, roll → −swingZ). |
| `pc_loco.js` | The human style at the measured phase: `_refPhase`, `_humanStyle` including the style's own velocity and thorax stabilisation. The human swing path `_refSwingAt`. The intended heading, including an intended turn. |
| `pc_balance.js` | `headingIntent`; the planned pelvis posture (`pelvisStyle`), with height referenced to the ground under the stance feet; style posture targets (`styleNominal`); axis-selective landing compliance (`settleAxes`). |
| `pc_plan.js` | Human swings call the locomotion layer's path. The landed foot's anchor is its level pose about the toe. Heel-rocker settle after a forefoot landing. Double support ends on contact. An intended turn (`turnAt`) rotates the in-place footholds. Touchdown detection is not armed during the toe pivot. |
| `pc_act.js` | `styleHold`: a P3-owned posture spring takes only the envelope headroom left by P0/P1, and its yield is logged. |
| `pc_gateg1a.js` | A diagnostics-only `onLoco` hook; records the reference phase. |
| `pc_harness.js`, `index.html` | The G2 review suite (§9). |

---

## 2. How yaw is physically regulated

### 2.1 The two root causes

1. **A heading that was not intended.**
   - G1's balance controller took the desired pelvis heading from the planted feet's mean forward direction.
   - In single support that is the stance foot's toe-out (±2°), alternating every step. That resonantly forced the growing pelvis-yaw oscillation G1b recorded.
   - Fix: the heading is now an **intended heading**. It is set once from both feet, and an intended turn changes it.
   - Removing this is the largest single factor: 29.2° → 8.7° pelvis p-t-p.

2. **Physical yaw authority is small.**
   - The ground can only twist the body through the stance foot. In the V1.1 actuator model the ankle's twist motor is 20 N·m, shared across axes by the approved multi-axis budget, which leaves **5–8 N·m** in stance.
   - The ankle's twist play is ±10° before its passive stop.
   - The swing leg's reaction on the pelvis peaks at ~13 N·m. So with any un-cancelled internal momentum, the pelvis and stance leg rotate within that play.
   - Yaw must therefore be managed **internally**, by making the body's moving parts cancel each other's vertical angular momentum. The fix is **not** to make the ankle or hip stronger.

### 2.2 The mechanisms

All of these act through finite actuators. None pins the pelvis, writes the root, adds a world-space constraint or cancels angular velocity directly.

| Mechanism | What it does |
|---|---|
| **Intended heading** | The balance controller's desired pelvis heading (stance hip twist, through the finite arbiter). An intended turn rotates it together with the in-place footholds. |
| **Counter-swing phased to the in-place legs** (`pc_ref inPlaceAdapt`) | In place, the swing leg's vertical angular momentum follows the knee's fore-aft motion: forward as it rises, back as it lowers. That is a quarter cycle away from the walk, where the leg sweeps forward through the whole swing. So the arm swing, the trunk yaw and the pelvis yaw follow c = (φ_R − φ_L)/hipFlex of the in-place hip flexion: the contralateral arm comes forward as the knee rises. Amplitudes are the WALK set's own. |
| **The style's own velocity** | The style joints get the reference's velocity as their target velocity. With zero target velocity, the shoulder's damping cancelled its own drive and the arm lagged ≈ 100 ms (the C2 principle, now applied to style). |
| **Reference phase from the physical swing** | The reference's swing phase starts when the foot leaves its toe pivot. Run from the step's start, the arms led the leg by 90 ms. |
| **Axis-selective landing compliance** (`settleAxes`) | The heel rocker and the landing compliance are sagittal needs. Because the motor stiffness is one number per joint, they also softened the landed ankle's twist and roll (× 0.07). The landed foot then could not brake the yaw the landing leg brings into double support (the pelvis yawed ~9° in every double support). Twist and roll keep full stiffness through the equilibrium point (their errors scaled by 1/k). |
| **Thorax stabilisation** | Lumbar and thoracic twist = −(pelvis yaw − its own low-passed heading, τ = 0.6 s), within ±10°. The chest holds its heading while the pelvis rotates beneath it with the legs. Holding the thorax to the *intended* heading was positive feedback in a turn: he spun. |

### 2.3 Attribution

Each variant removes one mechanism, from the evidence run. L_z is the vertical angular momentum about the whole-body COM.

| Variant | Outcome | Pelvis yaw p-t-p (max) | Chest p-t-p | Whole-body L_z p-t-p (kg·m²/s) | Arms vs legs L_z r |
|---|---|---|---|---|---|
| **G2a** | upright | **8.7° (5.0°)** | 8.5° | **1.79** (legs 3.28) | **−0.83** |
| G1's heading (instantaneous stance foot) | upright | 29.2° (16.6°) | 20.8° | 2.55 | −0.68 |
| arms on the WALK's cos 2πu timing | upright | 18.8° (10.8°) | 18.7° | 5.05 | −0.03 |
| arms held (no counter-swing) | upright | 15.0° (9.8°) | 12.2° | 3.41 | −0.07 |
| style without its own velocity | upright | 20.2° (12.0°) | 13.8° | 2.85 | −0.48 |
| landed ankle soft on all axes | upright | 11.5° (6.2°) | 10.4° | 2.04 | −0.80 |
| the WALK's feed-forward thorax twist | upright | 10.6° (5.4°) | 9.0° | 2.26 | −0.84 |
| no active trunk twist | upright | 8.6° (4.8°) | 7.9° | 1.43 | −0.87 |
| G1's robotic stepping (idle arms, G1 swing and heading) | upright | 25.7° (13.1°) | 26.8° | 3.58 | +0.38 |

Reading it honestly:

- **What does the work:** the intended heading, the arm counter-swing on the in-place timing, and the arms actually tracking it.
- **Thorax stabilisation is yaw-neutral** (8.7° vs 8.6° with no active twist). It is kept because it produces visible thorax counter-motion (7° p-t-p) without the walk feed-forward's cost.
- **The remaining ±5° residual** comes from the shape mismatch between a smooth arm swing and the legs' sharper two-lobe momentum.
- **A pelvis–trunk yaw damper** (P1 through the lumbar twist) was tried and **removed**. It changed nothing measurable, because the lumbar's own damping already couples pelvis and trunk.

The review page's "front" case charts the budget: arms mirror legs, and the whole body stays small.

---

## 3. How the reference gait is used

- **The reference.**
  - `anim3d/of_loco.js` WALK, unmodified, evaluated in the browser and Node from its own source.
  - The only replaced function is its render-skeleton pelvis grounding, a presentation step the physical body never uses.
- **Phase follows measured progress.**
  - In swing: the executor's measured swing progress, starting after the toe pivot.
  - In double support: the time since the *actual* touchdown, with the double support itself ending on contact.
  - The reference never runs on a clock of its own. With no rhythm the blend goes to the IDLE stance.
- **In-place adaptations** (`inPlaceWalkParams` / `inPlaceAdapt`, documented in the code). Everything else is the WALK set's own.
  - No stride: hip extension 0, full retraction.
  - The hip flexes **with** the knee. The walk's late hip flexion lifted the heel backwards 20 cm when there is no stride.
  - The counter-swing follows the in-place legs (§2.2).
  - The stance fraction is the rhythm's own.
  - The swing knee starts flexing from rest at toe-off, because the rigid boot's toe pivot cannot hand over to an already-moving knee without an acceleration spike.
  - Contact geometry is given as heights rather than angles, because the collider boot is 36 cm long (the reference's 12° contact pitch would lift its heel 7.5 cm):
    - forefoot contact with the heel 2 cm up;
    - pressed 1.5 cm through the turf;
    - a 6 cm heel lift in the toe pivot.
- **What the reference supplies.** Joint-space **preferences** only:
  - P3 style targets for lumbar, thoracic, neck, shoulders and elbows, with their velocities;
  - the planned pelvis posture: small yaw/roll offsets, and the stance knee's loading bend as a lower pelvis, applied as offsets on the balance controller's own desired pelvis;
  - the **shape** of the swing foot's path: the reference swing leg by FK from the *actual* pelvis, blended onto the planned foothold.
- **What it never touches.**
  - It never translates the root, teleports a foot, overwrites a solved transform, chooses a foothold or decides a touchdown.
  - The planner owns footholds and timing.
  - Contact truth decides touchdown, even early or mid-swing.
  - Jolt decides the motion.
  - Audit: 0 teleports, 0 velocity writes. The ledger shows the turf impulse is all the external impulse there is.
- **Arbitration.**
  - Style is P3 and yields first. The ledger shows 3.4 N·m·s yielded ("envelope") out of 507 requested; P0 support yielded 0.
  - Style joints whose posture is otherwise owned by P0 "posture" are re-owned by the style module as P3. They get no extra strength.

---

## 4. Authored vs procedural vs physically solved

| Element | Authored (of_loco WALK) | Procedural (controller) | Physically solved (Jolt) |
|---|---|---|---|
| Arm swing, elbow, trunk lean | amplitudes, elbow law, lean | in-place phase from the legs; target velocity; P3 arbitration | the arms' actual motion and its reaction on the body |
| Thorax yaw | — (walk twist not used in place) | stabilisation against the pelvis's oscillation | actual chest/pelvis yaw |
| Pelvis yaw / roll / height | small yaw/roll; knee loading → height | intended heading; ground-referenced height; offsets on the balance target | the pelvis pose (no root control exists) |
| Swing foot | the leg's joint-angle shape (in place) | toe pivot, clearance (3.5 cm on the lowest sole point), landing blend onto the planned foothold, C¹ path, inverse-dynamics feed-forward | the foot's path (it tracks within ~1 cm) |
| Stance legs | knee loading (as pelvis height only) | C1 balance law, IK, Jᵀ ground-reaction torques | everything |
| Footholds, timing | — | planner (rhythm, capture-point plan, foothold adjustment, turn) | touchdown time and place (contact truth) |
| Contact, weight transfer | — | forefoot-first plan; heel-rocker settle; double support ends on contact | the contact itself, the heel lowering, the load |

---

## 5. Physical validation

Run with `node tools/g2a_run.js --repeat 3`. Evidence is in `g2a/json/g2a_results.json`.

| ID | Criterion | Result | Measured |
|---|---|---|---|
| P1 | 16 / 16 steps land, upright, no failed step (walk, turn) | **PASS** | 16 / 16 both · 0 failed |
| P2 | footholds ≤ 5 cm from plan, stance slip ≤ 1 cm | **PASS** | ≤ 2.0 cm (walk) / 2.2 cm (turn) · slip ≤ 0.13 cm |
| P3 | every scenario: ledger residual ≤ 0.1 N·s, no root force, no teleports or velocity writes | **PASS** | ≤ 0.041 N·s · none |
| P4 | deterministic ×3 | **PASS** | walk `ec760ec3` ×3 · turn `7dee96d7` ×3 · browser = Node (checked on the review page) |
| P5 | yaw regulated: pelvis ≤ 8° from intended, drift ≤ 0.25°/cycle, upper body counter-rotates (r ≤ −0.5) | **PASS** | max 5.0° · −0.07°/cycle · r −0.82 · whole-body L_z 1.79 vs legs 3.28 kg·m²/s |
| P6 | an intended 30° turn is followed (pelvis and feet within 3°) | **PASS** | pelvis −30.0° · feet −29.2° · chest −29.9° |
| P7 | support (P0) never yields; style yields first and is logged | **PASS** | P0 0 · style 3.4 / 507 N·m·s yielded (envelope) |
| P8 | swing clears the turf (≥ 0.5 cm) and contact = the planned touchdown (≤ 80 ms) | **PASS** | min clearance 0.9 cm · −42 … −33 ms (early by design: the press-through landing) |

**Saturation, reported rather than hidden.** The stance ankles reach their envelope on some axis in a large share of control steps:

- Twist (yaw): the 5–8 N·m share.
- Roll: the lateral weight shift.
- The lumbar saturates mostly in pitch (trunk posture).

This is the approved finite actuator model doing what it should. It is also why yaw had to be managed internally.

---

## 6. Human-likeness (measured)

These are observations. Judge them visually on the review page.

| | Measured | Comment |
|---|---|---|
| Swing knee / hip | 70° / 35° | a real knee lift (G1: 7 cm flat-foot lifts) |
| Foot lift / toe clearance | ankle 14 cm · lowest sole point ≥ 0.9 cm | toes hang down ~20–28° mid-swing |
| Stance knee | 22° mean (min 20°) | bent, not locked |
| Contact | forefoot first 14/16 (2/16 mid-sole) · heel down after 56 ms | |
| Heel rise before toe-off | **0.1 cm** | **not achieved** (§7) |
| Arms | 36° shoulder swing (reference 35.5°) · elbow 15° · contralateral to the knee lift | mostly at the shoulder |
| Thorax | 7° counter-rotation; chest 8.5° vs pelvis 8.7° yaw | upright, steady |
| Pelvis / COM | bob 1.2 cm · roll 5.9° (reference 8°) · lateral sway 8.9 cm | the sway is deliberate |
| Rhythm | 104 steps/min · airborne 0.30 s of each 0.60 s step | **long double support** |

---

## 7. Visual limitations (honest)

1. **Long double support ("lift, pause").**
   - Both feet are down ≈ 45 % of the time (a person stepping in place: ~20–30 %).
   - The double support carries the whole lateral weight transfer: the COM is brought over each stance foot and stopped there.
   - A 0.5 s swing / 0.1 s double support (same cadence) **fell**. 0.48 / 0.12 stood. Shortening it is a stability edge, not a parameter to tune.
   - The real fix is a dynamic lateral transfer that swings the COM through (a natural fit for G2b/G2c), not a shorter timer.

2. **No heel rise before toe-off.**
   - The foot leaves nearly flat and pitches toes-down in the air. The swing's toe pivot is planned but not realised, because the foot is already unloaded when the swing starts.
   - Four physical attempts were made and reverted; none was kept because each broke the stable gait or was not physical:
     - a pre-swing heel rise in double support: it fights the balance CoP law, and its velocity target fought the stance-leg solve; the landed leg was pulled up;
     - a toe pressed into the turf through the pivot: no effect alone;
     - no free-leg feed-forward during the pivot: the heel then rose 3 cm, but the late plantar-flexion put the toe back on the turf (a false touchdown);
     - a toe-anchored pivot: unstable.
   - In forward walking the heel rises in terminal stance **while loaded**, driven by the body rolling over the forefoot. That is where it belongs (G2b).
   - The rigid 36 cm boot can only pivot about its far toe edge; a human foot pivots at the metatarsal heads.

3. **Lateral sway (9 cm) is deliberate.** It is the same mechanism as (1).

4. **Arms swing mostly from the shoulder** (elbow change 15°, reference 11°). They look a little stiff, like a pendulum.

5. **The pelvis still yaws ±5° with each step.** This is the arm/leg momentum shape mismatch (§2.3). A person stepping in place shows a few degrees too, so it may read as natural. Judge it.

6. **Swing-knee lift is higher than the reference** (70° vs 60°). This is the clearance requirement of the long boot. It looks like a slightly high march.

7. **2/16 first contacts in the mid-sole.** The forefoot arrives nearly flat on those steps.

8. **Not used in place:** heel strike, stride extension, push-off, speed. All of these are walking (G2b).

---

## 8. Performance

Profiled per character per 60 Hz frame (4 control steps), single thread, Node, same machine as G1b.

| | Production controller p50 / p95 (ms) | Physics (Jolt) p50 / p95 (ms) | Review instrumentation p50 / p95 (ms) |
|---|---|---|---|
| G2a walk | **0.58 / 1.48** | 0.67 / 0.74 | 0.10 / 0.50 |
| G1 S4 (same machine, same run) | 0.55 / 1.22 | 0.67 / 0.87 | 0.13 / 0.30 |

- **New costs** (mean per frame):
  - the human swing path: 0.16 ms (p95 0.46);
  - the reference style: 0.056 ms;
  - the balance controller itself is cheaper than S4's (0.18 vs 0.31).
- **The swing path's cost** is a full-body FK run 6× per control step: the path, its velocity, and the feed-forward's three samples. A leg-chain FK, or caching per observation, is the low-risk remedy when it matters. Not done now (do not over-optimise).
- **Projection:** the 22-player estimate from G1b (≈ 20 ms p50 per frame) rises by roughly 22 × 0.05 ≈ 1 ms at p50. Physics remains the larger share. The physics-scaling plan G1b flagged is still needed before match scale.

---

## 9. The review page

`http://127.0.0.1:8171/sandbox/visual/physchar/index.html?suite=G2`. It is the existing harness, with the simulation run in the browser.

**Controls:**
- **Playback:** 1× / 0.5× / 0.25× / 0.1×, frame stepping ◀ ▶ (one 240 Hz physics step, or the arrow keys), and scrubbing.
- **Cameras:** ¾ / front / side / back / top; drag to orbit, shift-drag to pan.
- **View:** mesh and/or physics.
- **Overlays (G1a bar):**
  - **reference skeleton** (orange): the reference request, by FK from the actual pelvis;
  - **headings:** pelvis cyan, chest yellow, intended white;
  - footholds planned vs actual, swing target path vs actual foot, arbiter yield/saturation, and the rest of the G1 set.
- **Bottom chart:** yaw · angular momentum by body group · knee/hip vs reference · vertical GRF · COM · capture point · arbiter per joint axis.
- **Side panel:**
  - criteria;
  - physical validation and human-likeness, kept separate;
  - per-swing kinematics;
  - the attribution table (click to load);
  - steps; the arbiter at the cursor and over the run.

**Review cases** (side-panel buttons, or `&review=<id>`):

| id | Case | Shows |
|---|---|---|
| `walk` | the walk (¾) | magenta ghost = G1's robotic stepping; yaw chart |
| `front` | counter-swing (front) | angular-momentum budget by group |
| `side` | legs vs reference (side) | knee / hip vs reference |
| `noarms` | yaw without arms | ghost: arms held |
| `phase` | walk-timed arms | ghost: arms on the walk's timing |
| `turn` | intended 30° turn | yaw chart with intended heading |
| `landing` | forefoot → heel | vertical GRF |

**Contact sheets** are produced by the page itself in headless Chrome and kept local (`g2a/sheets/`, not committed):

| Sheet | Content |
|---|---|
| `1_walk_three` / `1b_g1style_three` | one cycle at 0.1 s, G2a vs G1 |
| `2_walk_front` | one cycle from the front |
| `3_step_side_reference` | one step at 0.04 s with the reference skeleton |
| `4_noarms_three`, `5_walkphase_front` | the attribution variants |
| `6_turn_top` | the turn from above with the heading arrows |

---

## 10. Engineering findings (general, recorded for later gates)

- **A swing path fed to an inverse-dynamics feed-forward must be C¹ by construction.**
  - Kinks (a resting pivot handing over to a moving reference, a 2° clearance step, a 36 ms clearance release) produced 50–100 m/s² foot accelerations.
  - Those became hip-target spikes of 40–75°, saturating the hip.
  - Fixes: a blend window; a reference that starts from rest; softplus / soft-min clearance; offsets absorbed by the landing blend, not faded early.
- **Landing at rest kisses the turf.** A target that arrives at the surface with zero velocity makes a zero-load contact that hovers. Landing targets must press through (a finite contact velocity).
- **A forefoot landing must anchor the level pose.** Anchoring the heel-up contact pose, or referencing pelvis height to a heel-up ankle, lifts the landed foot back off the turf.
- **Motor stiffness is one number per joint.** Axis-specific compliance needs the equilibrium-point form.
- **Damping acts on the target velocity.** Any posture target that moves (style, heel rise) needs its own velocity, or its damping fights it.
- **In-place momentum differs from walking momentum.** The counter-swing that cancels a walking leg adds to an in-place leg's momentum.
- **Stabilising a body part against an absolute heading** can be positive feedback when the heading changes. Stabilise against the part's own low-passed heading.

---

## 11. Proposed G2 sub-gates (revisable)

| Gate | Content | Main criteria |
|---|---|---|
| **G2a** (this) | yaw / angular-momentum regulation; the human in-place gait | §5 + your visual verdict |
| **G2b** | **steady forward walking** (≈ 0.8–1.2 m/s, straight, 20+ steps) with the WALK reference as authored: heel strike, stance extension behind the body, a **loaded terminal-stance heel rise and push-off** (toe-off solved here), stride from the capture-point plan, a dynamic lateral transfer (COM swings through). | speed and heading tracking, foothold error, yaw, push-off/heel-rise present, GRF double hump, propulsion ledger (GRF · CoP · COM · joint work · no root force) |
| **G2c** | **start and stop**: gait initiation from quiet stance (anticipatory CoP shift before the first step), termination into quiet stance | no backward step, capture point inside support at the end, timing |
| **G2d** | **speed changes and turning while walking**: 0.6 ↔ 1.4 m/s transitions, curved paths and heading changes by foot placement + yaw | tracking error, no stalls, yaw bounded during turns |
| **G2e** | **qualification**: pushes during walking (S7-style), unexpected contact while walking (S11), the latency sweep, determinism, browser = Node, performance (leg-chain FK, 22-player projection), full regression; then promotion | the G1-style evidence set, on walking |

G3 (recovery, missing-ground search, jogging) stays out of scope.

---

## 12. Regression

`tools/review/regress.sh` (≈ 1 min 40 s, sequential): every suite is hash-identical.

| Suite | Result |
|---|---|
| V1: A 5/5 · B 20/20 · C1 59/59 · C2 13/13 | identical |
| V1.1: A 5/5 · B 20/20 · C1 59/59 · C2 14/14 | identical |
| C3 | 29/29 identical |
| D | 7/7 identical (post-μ-fix baseline) |
| **G1** | **26/26 identical** |
| G2a | 10/10 identical against its new baseline |

---

## 13. Files

- **Code:** `sandbox/visual/physchar/`
  - new: `pc_gateg2.js`, `tools/g2a_run.js`;
  - changed: `pc_ref.js`, `pc_loco.js`, `pc_balance.js`, `pc_plan.js`, `pc_act.js`, `pc_gateg1a.js`, `pc_harness.js`, `index.html`, `tools/review/regress.sh`.
- **Baseline:** `results/v1_1/g2a_V1.1.json`.
- **Evidence:** `review_artifacts/physical_character_v1/g2a/` — this report (`.md` / `.html`), `json/g2a_results.json`, and `sheets/` (local only).
