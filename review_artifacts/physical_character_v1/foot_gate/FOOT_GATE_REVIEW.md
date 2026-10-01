# Foot-architecture gate — F0 / F1 / F2: measured comparison and recommendation

**2026-10-01. STOP for review. Nothing promoted.**
- The body, the walker and every approved gate are unchanged and bit-identical:
  - A, B, C1 and C2 for V1 and V1.1;
  - C3 29/29, D 7/7, G1 26/26, G2a 10/10;
  - the G2b walker cases.
- F1, F2 and F2h exist only as opt-in comparison bodies (`buildBodySpec(…, { footModel })`).
- Not started: G2c–G2e, jogging/running, the Reference Tackle.
- Nothing pushed.

## How to review

- **Side-by-side review page**
  - File: [`viewer/index.html`](file:///Users/zainrahman/Downloads/FC%20Simulator%20worktrees/physical-character-v1/review_artifacts/physical_character_v1/foot_gate/viewer/index.html)
  - Served: <http://127.0.0.1:8171/review_artifacts/physical_character_v1/foot_gate/viewer/index.html>
  - What it shows: the feet side by side on one timeline, aligned on the same event. Each column has the colliders, a foot close-up, and synced traces of heel height, toe clearance, MTP angle, ankle torque (with the 150 N·m limit) and load.
  - The seven scenarios:
    1. Ordinary step
    2. Long step
    3. Heel rise / late stance
    4. The exact toe-scuff failure
    5. Maximum viable step
    6. Controller-A walk with each foot's own maps
    7. Controller-A walk with F0's maps
  - Every recording is a deterministic replay whose hash equals the measured run.
- **3D harness with the rendered character**
  - <http://127.0.0.1:8171/sandbox/visual/physchar/index.html?suite=G2>, test list, group *"Foot gate (opt-in comparison)"*.
  - `FG_same_F0 … F2h`: every foot with F0's Controller A.
  - `FG_own_F0 … F2h`: every foot with its own maps.
  - Browser and Node hashes are identical for all eight.
- **Figures:** `fig/FG1_state_matched.png` … `fig/FG5_swing_mechanism.png`.
- **Data:** `json/`.
- **Scripts:** `analysis/` (`state_matched.py`, `swing_vs_L.py`, `build_viewer.py`, `figs.py`) and `sandbox/visual/physchar/tools/` (`footgate_steps.js`, `g2walk_eval.js --foot/--models/--first/--frames`, `g2walk_ident.js --foot/--only/--frames`, `fg_frames.js`).

## In plain English

1. **The articulated toe works as anatomy says in stance, but the swing breaks it.**
   - In stance, the heel rises high, the body rolls over the toe joint with the toes flat, and the ankle needs less torque.
   - The foot therefore leaves the turf much more steeply pitched, as a human foot does.
   - Our swing is built around the rigid boot. It holds that steep pitch, and the boot's 12.6 cm of toe beyond the joint hangs 0–2 cm above the turf.
   - Result: after ordinary-to-long steps F2 fails 94–99 % of swings, at the same state where the current boot fails 13–29 %.
   - With a human-length toe (F2h) the penalty shrinks, but it is still no better than the current boot.
2. **The human-sized rigid foot (F1) mostly makes collisions easier.**
   - Its swings fail a little less often at matched states (8 % vs 13 %, 20 % vs 29 %).
   - Continuing to walk afterwards is not better (70 % vs 80 %, 58 % vs 60 %), and its longest viable step is shorter (0.39 m vs 0.42 m).
   - Its shorter, narrower sole gives the ankle less room to steer: sideways steps overshoot by up to 11 cm, and it slips more.
   - With its own controller maps it walks 5 steps from every start, where the current boot walks 9.5–11. It does not run away; it stalls and falls backward.
3. **The current walker's failure is exactly the chain you described, up to one link.**
   - The speed creeps after 6–9 steps.
   - The step request sits at its 0.30 m bound, and the achieved step is 0.35–0.43 m.
   - The next swing starts from a fully straight trailing leg, and the toe meets the turf at 40–76 % of the swing.
   - The boot does pivot on its tip with the ankle at 136–150 N·m.
   - **But replacing the foot does not break the chain.** At matched states no alternative foot continues walking more often than the current boot.
   - So the narrow forward window is not mainly the foot. **This corrects what I wrote in the G2b review.** That claim ("74 % → 14 %" with the human-sized collider) was measured on the older inner loop (v7). With the higher swing lift (v8), the current boot is already at 13–29 %, and the foot-swap advantage almost disappears at matched states.
4. **Nothing hidden.**
   - The passive toe joint absorbs energy and never produces it: net −3 to −20 J per foot per run.
   - Mass and inertia are redistributed exactly.
   - Determinism holds across Node, the browser and replays.
   - The articulated foot costs about 8 % more CPU.

## Recommendation

**Neither A nor B as a body change now. Keep F0 (the current body) for walking.**

- **Not B.** Articulation is not supported by these measurements for walking:
  - under the equivalent controller and under each foot's own recalibrated maps, F2 is clearly worse and F2h is worse;
  - at matched states, neither continues more often than F0;
  - its stance benefit is real (lower ankle torque, human-like heel rise and toe-off), but the swing does not convert it into longer viable steps.
- **Not A either.** The human-sized rigid foot does not improve walking at matched states:
  - its continuation is equal to F0's, its maximum viable step is shorter, and its walk is shorter;
  - its swing gain is mostly collision geometry, the risk you flagged;
  - it gives up stance control authority (shorter CoP range, narrower sole).
- **Of your two options, A is closer:** no articulation.
- **What I would do next (your decision; not started):** work on the binding constraint, which does not depend on the foot:
  - forward-speed regulation (the request bound plus the +1.25 forward eigenvalue);
  - swing execution (the foot lags its command by 5–10 cm in early swing, and in failing swings the foot pitches further toes-down than commanded);
  - designed from human swing kinematics rather than the rigid-boot pivot, so the swing stops assuming a rigid toe-off.
- **When to revisit B:** re-run this gate (F2h vs F0, same scripts) when that exists, and before jogging/sprinting.
- **Why B may matter later:**
  - forefoot work (sprint push-off, acceleration, cutting, planting on the ball of the foot) loads the forefoot with the heel up;
  - a rigid foot can only offer an edge there, at a long lever: the boot tip is 0.28 m ahead of the ankle, which is about 214 N·m per body weight against a 150 N·m ankle, against about 115 N·m over an MTP 0.15 m ahead;
  - the toe flexors are strongest at 25–45° of MTP dorsiflexion (Goldmann & Brüggemann 2012), which is what push-off uses.
  - This gate measured walking only; it cannot settle running.
- **If B is revisited, two integration items:**
  1. The MTP end stop needs an **absolute** stiffness. Every hinge's soft stop is frequency-based, so its stiffness scales with the child body's inertia. On the 0.19 kg toe that let the joint go 46° past its +60° stop when the body collapsed onto a near-vertical foot. In normal stance it never reached the stop.
  2. The swing generator must not assume a rigid-tip toe-off.

## The decisions I need from you

1. **Foot.** Accept *keep F0, promote neither F1 nor F2*?
2. **Next work item.** Forward-speed regulation and swing execution on F0, written foot-agnostically. Or something else?
3. **Re-test of B.** Keep F2h as a ready opt-in and re-run this gate before running/sprinting work?

---

## Technical

### 1. The three foot models (opt-in, `pc_body.js applyFootModel`)

| | F0 (current) | F1 (diagnostic) | F2 (articulated) | F2h (articulated, human outline) |
|---|---|---|---|---|
| collider | rigid box 0.164 × 0.15 × 0.358 m, tip 0.276 m ahead of the ankle | rigid, 0.11 m wide, toe edge 0.20 m ahead, heel unchanged | hindfoot box heel → MTP; toe box MTP → boot tip (0.277) | as F2 on the human outline: 0.11 m wide, toe tip 0.225 m |
| bodies / constraints | 14 / 13 | 14 / 13 | 16 / 15 | 16 / 15 |
| MTP | — | — | 0.15 m ahead of the ankle, 0.031 m above the studs | same |
| mass split | 1.069 kg foot | unchanged | toe 18 % (0.192 kg), COM 3.5 cm beyond the MTP, 3 cm above the sole; whole-foot mass, COM and inertia preserved exactly (parallel axis; code throws if a remainder is negative) | same |
| MTP joint | — | — | passive hinge −30° … +60°; spring 0.5 N·m/deg (28.6 N·m/rad) toward 0, damping 0.3 N·m·s/rad, cap 15 N·m; no active torque | same |

Further implementation details:
- **Rendered mesh:** unchanged for all models.
- **Passive joints:** `spec.passiveJoints`, outside the controller and the arbiter, which never touch them.
- **Planning outline:** planning and geometry use the full rigid outline (`planBox`).
- **Sensing:** toe contacts and toe dynamics are merged into the foot's sensing.

**Evidence (verified sources):**

| quantity | evidence | value used |
|---|---|---|
| MTP location | first MTP at 70–79 % of foot length from the heel (Thompson et al. 2019, n = 453) | 0.15 m ahead of the ankle ≈ 73 % of a 0.29 m foot (0.152 × 1.9 m stature); the rig's own toe bone sits at 73 % of the boot |
| toe stiffness and mass | trajectory-optimised walking with toe joints: optimum 1.04 N·m/deg (simulation), 0.98 preferred by 20 subjects; toe 0.2 kg, 0.08 m long (Cho, Lee & Hur 2025) | 0.5 N·m/deg; toe 0.192 kg |
| toe flexor capacity | 6.3–14.2 N·m maximal voluntary, highest at 25–45° MTP dorsiflexion (Goldmann & Brüggemann 2012) | 15 N·m cap on the passive spring; no active toe torque, so no hidden propulsion |
| foot mass | de Leva 1996, 1.37 % of body mass | 1.069 kg |

**Not re-verified in this session:** an MTP quasi-stiffness of ≈ 0.1 N·m/kg/rad used in the earlier session. The value chosen sits between it and Cho 2025.

**Verification:**
- total mass 78.000 kg;
- composite foot COM and inertia identical to F0;
- standing (G2a in place): MTP flexes about 6° at landing with 1–2 N·m;
- every approved gate bit-identical (`tools/review/regress.sh`, 12/12 suites).

### 2. Protocols, and what was and was not state-matched

Following your instruction 9, there are two comparisons, kept separate.

**Part 1 — the EQUIVALENT controller.** F0's Controller A (maps M8A, F0's first step) on every foot.
- Six-start walks.
- The identical dithered closed-loop identification: 600 runs, seed 71, in-swing re-decision off, so each executed step is the commanded one.
- Open-loop step protocols with immutable world-space footholds.

**Part 2 — the SEPARATED recalibration.**
- Round 1: identification on each foot under F0's maps, giving each foot's own maps.
- Round 2: identification under those own maps (600 runs, seed 72, also run on F0 for parity).
- Round-2 maps and each foot's own measured first step were fitted with the same scripts, `fit_maps.py` and `first_step.py`. F0's recomputed first step reproduces its existing one: 0.224, 0.343, 0.47.
- Only the maps and the first step change. Controller structure, bounds and inner loop do not.
- No inner-loop or swing tuning per foot.

**State matching.**
- The open-loop "slow" protocol: identical commands reached different states at the test step (F2 0.57 m/s vs F0 0.35 m/s), so it is confounded.
- The "speed" protocol: every foot over-accelerated, so it is uninformative.
- The controlled step protocol (each foot's own Controller A run-up to a test step): it was not state-matched either. Speed at the test step was F0 0.25, F1 **−0.13** (stalled backward), F2 0.96 and F2h 0.95 m/s.
- These are reported in `json/steps_*` but **not used to compare capability**.
- The capability comparison instead conditions the identification transitions on the state that matters: the previous step's length L and the forward speed v at the step start. It pools rounds 1 and 2 with every failed swing kept (`analysis/state_matched.py`).

### 3. Results

**Walks** (six deterministic starts, upright steps of 30; FG2):

| | F0 | F1 | F2 | F2h |
|---|---|---|---|---|
| Part 1 — F0's maps | **11.2** (9–13) | 4.0 (4–4) | 4.3 (4–5) | 5.3 (5–6) |
| Part 2a — own round-1 maps | (= M8A) | 5.2 (5–6) | 4.5 (4–5) | 6.3 (5–9) |
| Part 2b — own round-2 maps | 9.5 (6–12) | 5.0 (5–5) | 5.0 (4–6) | 6.2 (5–7) |
| how the walk ends | forward runaway → early touchdown | stall backward (capture point −0.03 → −0.4 m at the minimum step) + width overshoot | forward runaway; swings fail early | forward runaway |

**Swing failure, all identification transitions:**

| | F0 | F1 | F2 | F2h |
|---|---|---|---|---|
| round 1, overall | 15 % | 14 % | 47 % | 23 % |
| round 1, after ≥ 0.38 m steps | 33 % | 18 % | 92 % | 27 % |
| round 2 (own maps), overall | 23 % | 13 % | 50 % | 21 % |
| round 2, after ≥ 0.38 m steps | 36 % | 31 % | 94 % | 31 % |

These distributions are not state-matched.

**State-matched capability** (rounds 1 + 2, every transition kept; cells where every foot has n ≥ 15; FG1). Each entry is swing failure / continuation:

| previous step, speed | F0 | F1 | F2 | F2h |
|---|---|---|---|---|
| 0.20–0.28 m, 0.15–0.35 m/s | 5 / 65 % | 7 / 53 % | 43 / 2 % | 30 / 27 % |
| 0.20–0.28 m, 0.35–0.55 m/s | 4 / 87 % | 1 / 86 % | 17 / 6 % | 3 / 72 % |
| 0.20–0.28 m, 0.55–0.75 m/s | 20 / 54 % | 6 / 50 % | 6 / 23 % | 2 / 56 % |
| 0.28–0.36 m, 0.35–0.55 m/s | 13 / **80 %** | 8 / 70 % | 96 / 0 % | 36 / 38 % |
| 0.28–0.36 m, 0.55–0.75 m/s | 26 / 62 % | 9 / 65 % | 52 / 29 % | 14 / 51 % |
| 0.36–0.44 m, 0.35–0.55 m/s | 53 / 35 % | 47 / 37 % | 97 / 0 % | 76 / 6 % |
| 0.36–0.44 m, 0.55–0.75 m/s | 29 / **60 %** | 20 / 58 % | 99 / 1 % | 35 / 43 % |
| **maximum viable step** at 0.55–0.75 m/s (95th-percentile length of steps that continued) | **0.42 m** | 0.39 m | 0.32 m | 0.38 m |
| continuation after steps ≥ 0.40 m at that speed | **59 %** (n 39) | 38 % (n 26) | 0 % (n 77) | 21 % (n 19) |

- Continuation = the swing completes AND the body is upright two steps later.
- Execution reachability and continuation viability are reported separately.
- Transitions too close to the end of a run to know were excluded, not counted as successes.

**Stance and toe-off mechanics.** Part 2b walks, upright steps, each foot with its own maps (FG4):

| | F0 | F1 | F2 | F2h |
|---|---|---|---|---|
| peak ankle plantar-flexion τ, late stance, median / p90 (limit 150) | 129 / 146 N·m | 116 / 137 | 124 / 136 | 124 / 135 |
| heel height at liftoff, median | 10.7 cm | 5.0 | **19.4** | 11.3 |
| rollover point (forward-most loaded contact ahead of the ankle) | 0.285 m (tip) | 0.202 (edge) | 0.280 (toe tip, via the MTP) | 0.228 |
| hindfoot pitch at liftoff, median (p10) | −16° (−23°) | −8° (−11°) | **−31° (−42°)** | −20° (−33°) |
| min toe clearance in completed swings, median (p10) | 3.9 (1.0) cm | 6.6 (1.8) | 5.3 (**0.0**) | 4.8 (**0.0**) |
| MTP peak dorsiflexion median (p90); MTP τ p90 | — | — | 16° (36°); 14.5 N·m | 9° (24°); 13.4 N·m |
| touchdown peak vertical load, median (p90) | 0.91 (1.54) BW | 1.06 (1.68) | 0.82 (1.02) | 0.87 (1.32) |
| foothold execution error, forward / width (mean ± sd) | +3.0 ± 4.7 / +0.4 ± 2.0 cm | +3.1 ± 2.7 / −0.4 ± 2.1 | +1.5 ± 15.7 / +2.7 ± 4.9 | +2.4 ± 7.3 / +1.5 ± 3.6 |
| planning error (map cross-validated rms, τ 0.2 s), forward / width | 3.0 / 3.0 cm | 3.2 / 3.5 | 3.2 / 3.5 | 4.5 / 4.6 |
| pelvis yaw range per step, median | 28° | 32° | 26° | 24° |
| transverse WBAM range per stride (human 0.014 ± 0.003) | 0.041 | 0.054 | 0.070 | 0.058 |
| saturated actuator axes (mean per swing tick) | 2.3 | 3.2 | 3.3 | 3.0 |
| external-impulse ledger residual (max) | 0.029 N·s | 0.030 | 0.043 | 0.046 |
| CPU, ms per simulated second (same 8 s run, 3 sequential repeats, median) | 85 | 75 | 92 | 86 |
| determinism | identical on repeat, Node = browser, replays = measured runs | same | same | same |

- **Human reference for toe-off:** the foot is far steeper at toe-off: 68.6° ± 6.5° in an IMU reference set (Fang, Liu & Jiang 2018). The definition differs from ours, so treat it as direction, not a target.
- **Minimum toe clearance in human walking:** median under 2 cm (Begg et al. 2007).
- **Stance slip (step protocols, not state-matched):**
  - open-loop "slow" protocol: median 1.3 / 0.7 / 1.8 / 1.7 mm (F0 / F1 / F2 / F2h);
  - controlled protocol: 2.3 / 11.8 / 11.7 / 6.4 mm.
- **Touchdown foot velocity:** in `json/steps_*`.

### 4. The causal chain

**F0, the exact failure states** (FG3; viewer tab 4). In all six starts, after 6–9 steps:
1. The forward speed error goes ≈ 0 → +0.03 → +0.15 → +0.3–0.5 m/s over 2–3 steps.
2. The foothold request sits at its **0.30 m bound** for the last 2–4 steps.
3. Achieved steps are 0.35–0.43 m, executing +6–13 cm past the request.
4. The next swing starts from a trailing leg at **0.99–1.00** extension, with the heel 6–20 cm up.
5. The rollover point is at the boot tip (0.28 m) and the ankle is at **136–150 N·m**.
6. The toe meets the turf at **0.40–0.76** of the swing.
7. The step lands −0.26 to +0.13 m, and the body is down within 1–2 steps.

**Is the foot the link that breaks?** No.
- At matched (L, v), F1's shorter rigid lever and F2/F2h's articulation do not raise continuation above F0's.
- The links that do not depend on the foot are the binding ones: the speed creep, the request bound, and the straight trailing leg.

**F2, your test sequence:**

| your step | result |
|---|---|
| heel rises | ✔ 19 cm median at liftoff (F0 11) |
| forefoot supports | ✔ late stance on the toe body alone, MTP 16° median (36° p90), torque up to the 15 N·m cap |
| rollover progresses forward | ✔ to the toe tip through the joint, not over a rigid edge |
| stance finishes without impossible ankle torque | ✔ median 124 vs 129 N·m, p90 136 vs 146. Statics: forefoot stance over the MTP ≈ 115 N·m per body weight vs 212 at the boot tip |
| swing clears | **✘** see below |
| long step remains viable | **✘** 94–99 % swing failure after steps ≥ 0.32 m at matched states; continuation 0–1 % |

**Why the swing does not clear:**
- The hindfoot leaves at −31° median (−42° p10), against −16° for F0.
- The swing generator holds the toe-off pitch, and its shank-tilt limit keeps it there. That generator was developed on the rigid boot.
- The toe tip, 12.6 cm of boot beyond the MTP, hangs 0–2 cm above the turf through early and mid swing.
- In the swing the MTP stays within ±1°, so the swinging foot is effectively rigid.
- F0's own failing swing (step 8) has the same signature: commanded pitch about −45°, the actual foot drifting to −50° to −60° with little ankle torque, and the toe at about 1 cm (FG5).

This is not what the hypothesis predicts, so I report it rather than tune toward it.

**F1, your caution (instruction 7).** The swing gain is collision geometry:
- it lifts off almost flat (−8°, heel 5 cm);
- its toe is 7.6 cm shorter.

It loses stance authority:
- the CoP can only reach 0.20 m;
- the sole is 11 cm wide;
- width errors reach +11 cm in its own-map walks, and stance slip is larger.

Net: no continuation gain.

**Yaw:** measured only; nothing added. The foot models do not change the yaw mechanism: pelvis yaw per step 24–32° for every foot. The higher WBAM for F1, F2 and F2h comes with their shorter, failing walks.

### 5. Astra's warnings: how they were applied

(The walker-specific Astra report was not found on disk. The warnings applied are those in your message.)

- **Planning, execution and measurement kept apart.** Map cross-validated error (planning) and achieved − target foothold (execution) are reported separately. Controller decisions use the sensor's delayed capture point; the analysis uses the same quantity.
- **Immutable world-space targets.** Every diagnostic step protocol commands fixed world footholds. The identification runs decide only at the step start, with no in-swing adjustment.
- **Failed swings are viability evidence.** None is dropped. The swing-failure, continuation and state-cell analyses all include them.
- **Reachability ≠ continuation.** Reported as separate columns everywhere.
- **No frame-bug inference.** No correlation was used to claim a frame bug. The F2 swing mechanism was traced directly: commanded vs actual, tick by tick (FG5).
- **Not only closed-loop successes.** A step map can only be fitted where a next state exists, so the maps use completed transitions. But the identification data are dithered (not just the controller's own operating points), and the capability comparison uses all transitions.
- **Existing data preserved.** Every earlier file is untouched. New data are in `foot_gate/json` and new maps in `g2_walker/json/m8F*`.

### 6. Corrections to earlier statements

- G2b review, plain-English point 4 ("what makes that window so narrow is mostly the body"). **Not supported at matched states on the current inner loop (v8).** The quoted "50 % → 18 %, 74 % → 14 %" was measured on v7, before the higher swing lift.
- The same review's decision 1(a) expected the human-sized collider to widen the window. **It does not, at matched states.**

## Sources

- Thompson AT, Zipfel B, Muzigaba M, Aldous CM (2019). Flexion location of the first metatarsophalangeal joint and the location of forefoot bend in general purpose women's footwear. *Foot Ankle Surg* (PMID 30321980).
- Goldmann JP, Brüggemann GP (2012). The potential of human toe flexor muscles to produce force. *J Anat* (PMID 22747582).
- Cho K, Lee KW, Hur P (2025). Optimizing toe joint stiffness to improve human-like walking. *Sci Rep* (PMC12475067).
- Fang X, Liu C, Jiang Z (2018). Reference values of gait using APDM movement monitoring inertial sensor system. *R Soc Open Sci* (PMID 29410801).
- Begg R, Best R, Dell'Oro L, Taylor S (2007). Minimum foot clearance during walking: strategies for the minimisation of trip-related falls. *Gait Posture* (PMID 16678418).
- de Leva P (1996). Adjustments to Zatsiorsky–Seluyanov's segment inertia parameters. *J Biomech*.
