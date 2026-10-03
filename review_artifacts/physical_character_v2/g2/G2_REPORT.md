# V2-G2: active standing / balance report

**Status: G2 PASS — ACCEPTED by the user (2026-10-03, G3 instruction).** All 13 rows of the pre-registered criteria (`G2_CRITERIA.md` v1, committed in `3bd8533` before the final run) pass on final run 2. Run 1 failed two rows, both traced to my own implementation errors; both evaluations are kept (§2).

- No stepping, walking or gait planning was implemented. V1's controller was not ported.
- No G0 / G1 plant change, and no change to any approved anatomy, topology, contact architecture, passive-tissue specification, actuator capability or authority rule.
- **Stopped. G3 not started. Nothing pushed.** The review server is running on :8172.

**The question G2 answers:** *Can the validated V2 humanoid maintain and recover quiet upright standing using only physically legitimate, finite internal joint actuation and ground contact?*

**Yes, within a measured envelope.**
- All eight generated bodies stand untouched for 60 s with every actuator at ≤ 8.1 % of its isometric capacity.
- All of them recover thorax pushes of 10 N·s from all 8 directions in place. V2-REF and V1-matched also recover 5 and 15 N·s.
- The no-step boundary was measured for every body. Beyond it the body falls physically, and every fall is preceded by the capture point leaving the support polygon.

**Supporting files:**
- `G2_TABLES.md`: every number, generated;
- `json/g2_results.json` (620 runs), `json/g2_checks.json`, `json/g2_browser.json`, `json/g2_regression.json`;
- `json/run1/`: run 1's evaluation;
- `shots/`;
- `V1_C1_STUDY.md`;
- `../DECISIONS.md`: G2-A1…A11.

## 1. Gate rows (final run 2)

| # | criterion | result | value |
|---|---|---|---|
| 2.1 | quiet stance 60 s, every body | **PASS** | 8/8. COM 4.00 cm ahead of the ankles. Knees 4.0°. COM range ≤ 1.03 mm. Foot slip ≤ 1.08 mm. Top actuator ≤ 8.1 % of T_iso. 0 saturated ticks. 0 external force. |
| 2.2a | required envelope | **PASS** | 96/96 recovered in place. Recovery 0.3–1.7 s. Slip ≤ 2.2 mm. Tilt ≤ 1.4°. |
| 2.2b | boundary: monotone, symmetric | **PASS** | 40 sweeps, 0 inversions. L = R, FL = FR, BL = BR for every body (12/12). |
| 2.3 | capacity integrity | **PASS** | 0 ticks over 617 runs |
| 2.4 | release / capture-point consistency | **PASS** | 204 non-recoveries, all falls, all with ξ leaving the support first. Ledger exact. Authority writes 0. |
| 2.5 | controller cost | **PASS** | 0.108 ms mean, 0.507 ms p99 per tick, with 9 workers in parallel. Single-thread development figure: 0.042 / 0.157. Budget 0.15 mean. |
| S4 | angular impulses 4 / 8 N·m·s | **PASS** | 6/6. Up to 12 N·m·s (pitch 16) also recover. |
| S5 | 10 initial offsets | **PASS** | 10/10 QUIET within ≤ 1.0 s |
| F | foot / CoP smoothness, penetration | **PASS** | No piece-set transitions. Net CoP ≤ 2.68 mm per tick. Tracking ≤ 2.62 mm. Turf penetration ≤ 0.90 mm. |
| D | determinism ×3, snapshot / restore, browser = Node | **PASS** | 6/6, 3/3, 6/6 |
| E | energy / authority ledger | **PASS** | Residual ≤ −0.285 J in every run (energy only ever lost to contact and the implicit solver) |
| R | earlier gates | **PASS** | G0 all checks pass. G1 curated 10/10. G1 full results unchanged: 227 hashes, 0 differences. |

## 2. Run 1 → run 2 (recorded openly)

**Run 1** used the same pre-registered criteria. 11 of 13 rows were evaluable; two failed. Its checks and tables are in `json/run1/`.

1. **2.2b symmetry failed for V2-190-85:** left boundary 20 N·s, right 25 N·s.
   - At 25 N·s the left run slid 21 mm and the right run 19 mm, either side of the 20 mm in-place threshold.
   - **Cause: a controller implementation defect.** The per-foot CoP allocation offered the leftover CoP shift to the *left* foot first. That is index-order dependent: the shift is amplified 10× on a lightly loaded left foot but 1.1× on a loaded one, so a left push and a right push were treated differently.
   - **Fix:** the leftover is applied as a common shift to every foot that can still move toward it (DECISIONS G2-A10).
2. **F failed in all six CoP sweeps** with an identical 100.9 mm "jump".
   - **Cause: a measurement-window bug in the runner.** It counted from t = 0, i.e. the release-and-settle tick, before the ramps begin at t = 1 s. The criterion and its development basis cover the ramp phase.
   - **Fix:** the window starts at the ramp (G2-A10).

**Run 2:** the entire validation was rerun with the criteria unchanged, and every row passes. Because the allocation fix changed the controller, run 2's numbers supersede the development numbers in DECISIONS G2-A7 / A8 wherever they differ.

## 3. The controller (`ctrl/v2_stand.js`): smallest mechanism the measurements support

1. **State estimation.** Exact simulation state; the consumed variables are listed in the code (`CONSUMED`).
   - COM position and velocity; COM height h; ω0 = √(g/h); extrapolated COM ξ = c + v/ω0 (Hof 2005).
   - Foot poses → each foot's measured usable region; the support region is their hull.
2. **Balance objective.** ξ → ξ_ref, which is 4 cm anterior of the mid-ankle point along the feet's heading.
3. **Physically achievable response.**
   - Desired CoP p* = ξ + kξ(ξ − ξ_ref), with **kξ = 1/3**. That is closed-loop ankle stiffness 1.33 mgh and a velocity gain of ≈ 0.43 mgh·s, matching human quiet-standing identification (Peterka 2002, ≈ 1.3 mgh; recalled).
   - p* is clamped to the support region. The ground force passes through the COM.
   - Lateral CoP comes from **load transfer** (lever rule), with each foot keeping ≥ 10 % body weight. Each foot's CoP is allocated so that the load-weighted CoPs reproduce p*.
4. **Finite actuator commands.**
   - Feed-forward joint torques from the static equilibrium of each joint's distal subtree, under g − A plus the desired foot wrenches. For the ankles this *is* the balance torque.
   - A weak posture **preference** on top:
     - legs: hips and knees servo toward the leg configuration that keeps each foot where it is, with the pelvis at its reference orientation and height but its *current* horizontal position;
     - upper body: joint-space;
     - ankles: none, because balance owns them.
   - All gains derive from each body's own masses, levers and inertias (K = 1.5·m_sup·g·L, ζ = 0.7). There is one configuration for every body and no per-body tuning.
5. **Actuators** (`sim/v2_actuation.js`, spec §14).
   - τ_cap = T_iso·M·g_θ·f_ω·a: Anderson 2007 torque–angle; Hill / eccentric torque–velocity; Thelen activation 15 / 50 ms; ankle plantar-flexion reduced with knee flexion.
   - Each joint has a **parallel actuator constraint** whose limits are exactly the capacity (G2-A1). Capacity integrity holds by construction, and the active-work ledger is exact.
   - Passive tissue stays in the G1 rows, unchanged.

**What was measured and not adopted:**
- leg posture in joint space (fights lateral balance) or task space (an unloaded leg goes limp);
- unconditional load transfer (an unloaded foot relocates);
- hip / trunk strategy;
- arm counter-motion;
- other kξ values;
- sensing latency and motor noise.

Each is in DECISIONS G2-A5…A9 with its measurement. Run 2's evaluation is in §8.

## 4. Quiet-stance reference (`ctrl/v2_stance.js`)

| item | value | basis |
|---|---|---|
| foot placement | under the hips; heel centres 16.6 cm apart at 1.82 m | McIlroy & Maki 1997 ≈ 17 cm (recalled) [H] |
| toe-out | 7° per foot, by hip external rotation | ≈ 14° between the feet [H] |
| knees / hips | 4° / 3° flexion | near-extended quiet stance [H] |
| spine, head | anatomical neutral, gaze level | [ENG] |
| arms | hanging, shoulder abduction 6°, elbows 12° | [H] |
| COM | 4.0 cm anterior of the mid-ankle point | spec 2.1 band 2–6 cm; human ≈ 4–6 cm (recalled) [H]→[CTRL] |
| ankle DF / inversion; whole-body lean | solved per body: feet flat to 1e-14, COM on target; V2-REF ankle DF 3.8°, lean 2.8° | — |

The pose is a preference. When balance needs a deviation, balance wins.

## 5. The measured controllable CoP region (G2 step 2)

**Method:** slow (1 cm/s) ramps of the balance target in 8 directions.

**Where the foot starts to rotate:** exactly on the edge of the boot's **loaded flat-contact hull** (pieces 0–7), not on the geometric sole:
- forward 13.2 cm ahead of the ankle on the CoP's line. The hull's front edge slants from 11.4 cm laterally to 14.5 cm medially, as a real forefoot does;
- heel −6.1 cm;
- lateral ≈ 3.5 cm at mid-foot under single-foot load.

The toe-spring pieces 8–9 sit 3.5–11 mm above the turf and are unusable until the foot pitches. The controller uses the hull with a 5 mm margin.

**Smoothness:** within the region the CoP crosses the compound-piece boundaries with no contact-set change, ≤ 2.68 mm net-CoP change per tick, and ≤ 2.62 mm tracking error (row F).

## 6. Results

### 6.1 Quiet stance (S0, 60 s)

**Every body stands:**
- COM 4.00 cm ahead of the ankles;
- knees 4.0°;
- COM range ≤ 0.2 mm (1.03 mm for V2-long-legs);
- feet 387 / 387 N at V2-REF.

**Actuator use:** the top actuators are the ankle plantar-flexors and lumbar extension, at 7.0–8.1 % of T_iso (≈ 15 N·m per ankle). There is no saturation after 1 s. Spec §14 expected about 15–25 % at the ankle; it reports usage and is not tuned to that figure.

**Noiseless sway is ≈ 0** (0.01 mm RMS). V2 has no neural noise model; humans sway 5–10 mm. See §8.

### 6.2 Push recovery: thorax, 100 ms (S1–S3, S7)

**Required envelope:** 96/96 recovered in place.
- Recovery time 1.0–1.4 s at 10 N·s and 1.6–1.7 s at 15 N·s.
- Foot slip ≤ 2.2 mm.

**No-step boundary** (highest recovered in place / first not recovered, N·s; body-normalised Δv = J/M in m/s):

| body | F | B | L = R | FL = FR | BL = BR |
|---|---|---|---|---|---|
| V2-REF (78.9 kg) | 15 / 20 (0.19–0.25) | 15 / 20 | 20 / 25 (0.25–0.32) | 20 / 25 | 25 / 30 (0.32–0.38) |
| V1-matched (78.9 kg) | 15 / 20 | 15 / 20 | 25 / 30 | 20 / 25 | 25 / 30 |
| V2-165-62 (62.9 kg) | 10 / 15 (0.16–0.24) | 10 / 15 | 15 / 20 | — | — |
| V2-175-70 | 15 / 20 | 15 / 20 | 20 / 25 | — | — |
| V2-190-85 | 20 / 25 (0.23–0.29) | 20 / 25 | 25 / 30 | — | — |
| V2-198-92 (92.9 kg) | 20 / 25 (0.22–0.27) | 20 / 25 | 30 / 35 | — | — |
| V2-long-legs / short-legs | 15 / 20 | 15 / 20 | 20 / 25 | — | — |

**Reading the table:**
- In body-normalised units the sagittal boundary is ≈ 0.20–0.25 m/s for every body. It is set by foot length (the CoP margin) and COM height.
- Lateral is wider because the stance width exceeds the forward margin.
- The bigger bodies have bigger feet and more mass, so they recover larger impulses.

### 6.3 Why the body falls beyond the boundary (204 non-recoveries, causal classification)

**Every non-recovery is "step required → fell".** ξ left the support polygon before the fall in every case. No fall occurred with ξ inside, so the classification agrees with the capture-point evidence.

| binding cause at ξ's exit | runs |
|---|---|
| the impulse drove the capture point outside the support *during* the push | 156 |
| heel / toe / edge contact lost (the foot rotated about its edge) | 58 |
| CoP held at the support boundary | 38 |
| foot slipped | 10 |
| ankle torque saturated | 3 |

Several causes can apply to one run. No fall is a controller instability.

**The physical limits, identified in development:**
- **Forward / backward:** the measured CoP edge. A thorax push adds ≈ 0.27 m × J of pitch angular momentum; righting the trunk costs about 2 cm of extra CoP excursion.
- **Lateral:** ankle eversion capacity (≈ 35 N·m) at the foot's outer edge, and the hip abductors' activation rise.

### 6.4 Angular perturbations (S4) and initial offsets (S5)

**Angular impulses** on the thorax:
- yaw / pitch / roll at 4 and 8 N·m·s recover in place, with the trunk back within 3° (6/6);
- up to 12 N·m·s also recovers on every axis, and pitch 16;
- roll 16 and yaw 16 displace a foot.

Thorax-only angular impulses spin the light upper trunk a long way: up to 34° at pitch 8 and 69° at yaw 8. The posture preference returns it within ≈ 1.5 s.

**Initial offsets:** all ten settle to QUIET within ≤ 1.0 s with no slip. They were knees 12°, hips 10°, COM over the ankles, COM 7 cm ahead, trunk 10° flexed, arms 30° abducted, head 20° flexed, and 5 cm/s COM velocities.

### 6.5 Actuators, energy, authority

**Capacity integrity:** 0 ticks above the instantaneous capacity in 617 runs.

**Peak use in the V2-REF envelope:**
- ankle plantar / dorsiflexion 41 % of capacity (61.8 N·m);
- knee flexion 34 %;
- hip abduction 23 %;
- lumbar lateral bend 18 %.

Saturation is brief: 0.1–0.17 s summed over 24 pushes, mostly the activation rise at push onset.

**Authority and energy:**
- authority writes 0 in every run;
- the external-impulse ledger equals the scheduled test impulse exactly;
- the energy residual is always negative (≤ −0.285 J): there is no unexplained source.

### 6.6 Cost (V2-REF quiet stance, 9 workers in parallel)

| component | ms / tick |
|---|---|
| physics step (150 iterations, including 13 actuator constraints) | 0.620 |
| passive tissue layer | 0.355 |
| controller | 0.078 |
| actuators | 0.040 |
| instrumentation | 0.105 |
| measurement / hashing | 0.132 |

The single-thread development figures are about half these values (step 0.33 ms; controller + actuators 0.042 ms). The actuator constraints add ≈ 0.3 ms per tick to the 150-iteration solve (**TD-1 extended**, §9).

## 7. Human-likeness (reported, not tuned)

| measure | V2 | human (recalled ranges) |
|---|---|---|
| closed-loop ankle stiffness | 1.33 mgh (design, from kξ) | ≈ 1.3 mgh (Peterka 2002) |
| recovery time, small pushes | 1.0–1.7 s | ≈ 1–2 s |
| quiet-stance COM sway | ≈ 0 (no neural noise) | ≈ 3–6 mm RMS |
| COM ahead of the ankle | 4.0 cm | ≈ 4–6 cm |
| ankle plantar-flexor use, quiet stance | 7 % of T_iso | spec §14 expectation 15–25 % |
| hip / trunk contribution to small pushes | small: peak hip 23 % (lateral load transfer) | ankle strategy dominant for small perturbations |
| foot loading, quiet stance | 50 / 50 % | ≈ symmetric |

**Noise and latency** (report-only; V2 does not specify them numerically):
- A seeded motor-noise process gives human-magnitude COM sway (3–9 mm RMS), but the CoP is too fast: 84–253 mm/s at ≈ 3 Hz, against human ≈ 10 mm/s below 1 Hz. A realistic neural noise / latency model is outside G2.
- 50–150 ms observation latency is stable in quiet stance and for 10 N·s pushes.
- At 100–150 ms latency, forward 15 N·s falls; it recovers with exact state.

## 8. Ankle vs hip / trunk vs arms (instruction items 4–6)

**Ankle strategy plus lateral load transfer** is sufficient for ordinary quiet stance and for pushes up to the boundary in §6.2. It becomes insufficient when ξ leaves the support. In 156 of 204 failures that happens during the impulse itself.

**Hip / trunk strategy.** It acts only on the CoP residual (L̇ = M·g·(ŷ × r)), through loaded legs only, using finite hip torques. Total angular momentum changes only through the ground reaction; the trunk is not used as a reaction wheel.

| variant | development (before the allocation fix) | final run 2 |
|---|---|---|
| continuous | +5 N·s backward; −5 N·s backward-left (trunk over-rotated 27–33°) | no boundary change in any direction |
| bounded (fades over 10° of pelvis deviation) | no gain | no boundary change in any direction |

**Not adopted.** A time-optimal bounded flywheel strategy is future work.

**Arms**
- A: passive / low-gain arms are the gate configuration.
- B: arm counter-motion (shoulders, same law, bounded by 60° of arm deviation) produced **no change** in any boundary. Arms do not materially expand the no-step envelope at these impulses.

**kξ alternatives, final run 2:**
- kξ = 1 recovers right 25 N·s (gate configuration 20); forward / backward / FR / BL are identical. Recoveries are faster, but the stiffness (2 mgh) is above the human evidence.
- kξ = 0.5 is identical to the gate configuration.
- kξ = 1/3 is retained as pre-registered. Open question for you: trading human-like stiffness for 5 N·s of lateral margin.

## 9. Comparison with V1 C1, and technical debt

**V1 C1 comparison.** V1 pushed the *pelvis* COM for 50 ms. With the same application, V2-REF recovers 25 / 30 N·s in all four directions. V1 C1 (1.90 m / 78 kg) recovered F 60 / 65, B 30 / 35, R 45 / 50.

V2 is **lower forward and laterally**. The cause is the body, not the controller:
- **Feet.** V1's 0.357 × 0.164 m box boot put the toe edge 22.2 cm ahead of the COM projection and the outer edges 24.4 cm to the side. V1's own ideal ankle-only ceilings were 52 / 32 / 58 N·s. V2's human-sized boot gives a 9.2 cm forward margin (up to 10.5 cm medially) and ≈ 14 cm laterally.
- **V1's extra stabilisation.** V1 used a hip strategy (+4.7 cm ≈ +11 N·s), engine damping 0.05 and Coulomb joint friction, all of which add stability.
- **V2 is at its own ceiling.** V2's ideal ankle-only ceiling at the COM is ≈ 22 N·s forward, and V2 recovers 25 at pelvis level. V2's boundaries come from its own feet and actuators; they were not targeted at V1's.

**Technical debt.** TD-1…TD-6 are unchanged and stay open. New items:

| id | item | evidence | next step |
|---|---|---|---|
| TD-1 (extended) | The per-joint actuator constraints add 13 constraints to the 150-iteration solve | ≈ +0.3 ms per tick single-thread | Fold into the native / production solver study. Keep the exact capacity bound. |
| TD-7 | No numerically specified sensing latency / noise model | Noiseless sway ≈ 0. A crude motor-noise model gives human sway magnitude but a too-fast CoP. | Specify a physiological noise / latency model before human-likeness of sway is judged (gaits / fatigue gates). |
| TD-8 | Engineering constants in balance | minimum foot share 0.10; CoP margin 5 mm; excitation headroom 25 % / tone 2 %; posture κ = 1.5, ζ = 0.7; ankle damping 2 N·m·s/rad | Revisit with G3 weight transfer, where full unloading is the task |
| TD-9 | Hip / trunk strategy not adopted | Continuous and bounded versions: no robust gain | A time-optimal bounded flywheel (Pratt 2006) if later gates need a wider no-step envelope |
| TD-10 | Ankle plantar-flexion capacity vs knee flexion | Linear 1 → 0.74 over 0–60° (Billot 2022 single point) [ENG] | Calibrate at the capacity gate before running |

## 10. Review

**Server:** `python3 -m http.server 8172` from the worktree root.

**Page:** `http://127.0.0.1:8172/sandbox/visual/physchar2/viewer/g2.html`
- Playback, pause, slow motion, frame step, restart; cameras front / side / ¾ / top / follow.
- Overlays: COM, ξ and its target, commanded / measured / per-foot CoP, support polygon and foot regions, per-foot ground reaction, test impulse, angular momentum, boot pieces.
- Panels: phase, actuator torque / capacity / saturation, joint target vs actual, the Node run for comparison.
- Phase colours: <span>QUIET</span> (green), ACTIVE RECOVERY (yellow), STEP REQUIRED (orange, ξ outside the support), FALLEN (red).

**Curated scenarios** (`?scenario=…&human=…&t=…&cam=…`):

| what | query |
|---|---|
| Quiet balance | `scenario=quiet:10&t=5&cam=three&dist=3.5` |
| Forward recovery, CoP at the toes | `scenario=push:F:15&t=1.25&cam=side&dist=3.5` |
| Lateral load transfer | `scenario=push:R:15&t=1.2&cam=front&dist=3.5` |
| Diagonal recovery | `scenario=push:BL:20&t=1.3&cam=three&dist=3.5` |
| Beyond the boundary: step required → physical fall | `scenario=push:F:20&t=1.8&cam=side&dist=3.6`, then `t=3.2` |
| Trunk angular impulse | `scenario=torque:yaw:8&t=1.2&cam=three&dist=3.5` |
| Body variants | `scenario=quiet:10&human=V2-165-62&t=5`; `scenario=push:L:25&human=V2-198-92&t=1.3&cam=front` |
| Initial offset settling | `scenario=offset:COM over ankles&t=0.5&cam=side` |

Stills: `shots/g2_01…g2_10`.

## 11. What changed

| file | change |
|---|---|
| `sim/v2_actuation.js` (new) | §14 actuators |
| `ctrl/v2_stance.js`, `ctrl/v2_stand.js` (new) | stance reference; controller |
| `gates/v2_g2.js`, `gates/v2_g2_checks.js` (new) | G2Sim; criteria evaluation |
| `tools/g2_run.js`, `g2_report_tables.mjs`, `g2_browser.mjs`, `g2_capture.mjs` (new) | runner, tables, browser check, stills |
| `viewer/g2.html`, `viewer/v2_g2_viewer.js` (new) | review page |
| `core/v2_jolt.js` | opt-in actuator constraints and test-force calls |
| `gates/v2_g1.js` | optional scenario object and actuator flag (G1 defaults unchanged) |
| `gates/v2_g1_ankle.js` | subtracts the actuator impulses (permanent probe, extended) |

G0 / G1 results are unchanged.
