# G1a — locomotion architecture parity: the new stack on the approved body

> **Status (2026-09-30): built and validated; awaiting your visual review.** Nothing is committed and nothing is pushed. G2 (continuous walking) has not been started.
>
> **Interactive review:** <http://127.0.0.1:8171/sandbox/visual/physchar/index.html?suite=G1&test=S4_steps10>. Pick a scenario from the **test** list; the side panel has every scenario, clickable. Use speed **0.1×** for slow motion.
>
> **Evidence:** `review_artifacts/physical_character_v1/g1a/json/g1a_results.json`, produced by `node tools/g1a_run.js --out …`. It is sequential, takes 61 s, and repeats every scenario ×3.

## 1. Result at a glance

| id | criterion (approved, plus your unexpected-contact addition) | result | measured |
|---|---|---|---|
| S1 | quiet stance: upright; sway ≤ C1 + 20 %; no extra saturation | **PASS** | sway RMS 0.90 mm vs C1 QS20 0.91 mm · drift 0.13 vs 0.13 cm · 0 saturated steps |
| S2 / S2b | weight transfer: the liftoff gate opens (≤ 5 % BW) within C2's time ± 20 % | **PASS** | 1.17 s / 1.18 s vs C2 1.196 s · swing foot 0.2 % BW |
| S3 | 4 placements: accepted, foothold ≤ 3 cm, no bounce | **PASS** | 4/4 · 2.2 / 1.8 / 2.2 / 0.4 cm · no re-lift |
| S4 | 10 in-place steps: liftoffs sensed; timing ± 15 %; slip ≤ 1 cm; no non-foot contact | **PASS** | 10/10 · touchdown +12…+17 ms against a 400 ms swing · slip ≤ 0.02 cm · foothold ≤ 3.3 cm |
| S5 | the C3 push set: everything C3 recovers is recovered; failures fall honestly | **PASS** | F70 / F80 / F100 / B40 / B50 recover with a step · R40 recovers in place · R55 falls (as C3) |
| S6 | D6 with the new stack as B: no latch, no release while re-planting, continuum preserved | **PASS** | D6_slide / v60 / load20 recover, load80 falls, at 0/0 **and** 50/120 ms · 0 releases while re-planting · no refusal latch |
| S7a / S7b | 15 N·s lateral push at mid-swing: an interpretable modified step; no fall | **PASS** | upright · the following footholds adjusted 5.2 cm (S7a) / 1.1 cm (S7b) |
| S8 | saturation: P0 realised ≥ 95 %; P3 dropped first | **PASS** | support realised **96.2 %** (without arbitration: 9.2 %) · style yielded 4259 of 4305 N·m·s · P0/P1 yielded 0 |
| S9 | internal momentum: ΔP ≤ 0.5 N·s, ΔL ≤ 0.5 kg·m²/s | **PASS** | ΔP 0.00002 N·s · ΔL 0.20 kg·m²/s |
| S11a | unexpected early ground contact becomes the touchdown immediately | **PASS** | TOUCHDOWN 108 ms EARLY, 8.1 cm short, on 2.5 cm raised turf · phase re-synchronised at the event · upright |
| S11b | obstacle in the swing path → OBSTRUCTION; reaction ≤ delay + 2 steps; no pass-through | **PASS** | OBSTRUCTION at the contact · executor reaction 50 ms (= its feedback delay) · deepest box contact 0.9 mm · upright |
| S11c | the toe strikes a turf edge the foot cannot stand on → obstruction, not touchdown | **PASS** | contact normal outside the friction cone → OBSTRUCTION · reaction 50 ms · upright |
| ledger | no external or root force except turf, push and obstacle mounts | **PASS** | worst per-step residual 0.075 N·s over all scenarios · no support fixture, teleport or velocity write |
| det | determinism | **PASS** | 24/24 scenarios ×3 identical · S6 identical · **browser hash = Node** for S4 (headless Chrome, already installed) |
| approved | every approved suite hash-identical | **PASS** | A 5/5 + 5/5 · B 20/20 + 20/20 · C1 59/59 + 59/59 · C2 13/13 + 14/14 · C3 29/29 · D 7/7 (post-fix baseline) |
| **S10** | 480 Hz convergence: integrated impulses within 5 % | **FAIL** (boundary cases) | S4 totals 0.003 % and shear 1.3 %, touchdown times identical — but the 50 ms landing windows differ 4–15 % · F80 recovers at 240 / 720 / 960 Hz, **falls at 480 Hz** · D6_slide: same outcome, total A→B 17.6 % |
| **perf** | controller ≤ 0.4 ms per character per 60 Hz frame | **FAIL** | 0.13–0.76 ms. The approved controller this reuses already costs 0.47–0.70 ms in C2 by the same measure (§7) |
| obs | S2x (a second transfer), S7c / S7d (30 N·s mid-swing) | observations | reported in §8 as G2 items |

**What you asked G1a to demonstrate, and where to see it:**

| demonstration | scenario | what to look at |
|---|---|---|
| stance | S1_stance | the C1 overlays; the monitor holds NOMINAL; the ledger line stays at the weight |
| intentional weight transfer | S2_transfer, S2b_transfer | ξ travels onto the stance foot; the unloaded foot's role is UNLOADING; the gate opens at 1.17 s |
| one physical step | S3_place, S11a_earlyTurf | planned (orange) vs actual (cyan) footprint; the swing path and trace |
| 10 alternating in-place steps | S4_steps10 | the gait diagram (roles and phase); fixed footholds; touchdown +12…17 ms against plan |
| representative C1 push behaviour | S5_F70 … S5_R55 | the same outcome classes as C3 |
| D6 transient without latched refusal or premature release | S6 (Node; table in the side panel) | load20 recovers **without** the release the baseline needed |
| disturbance during swing | S7a / S7b (and S7c / S7d) | the next foothold moves; in S7c/d the honest fall |
| saturation: support kept, style yields first | S8_styleConflict vs S8n_naive | the magenta yield band on the knee / hip chart; no fall vs COM −11.7 cm |
| internal-momentum accounting | S9_internal | side panel: ΔP, ΔL |
| 240 / 480 Hz convergence | S10 (Node; table in the side panel) | §6 |
| unexpected contact overriding the plan | S11a / S11b / S11c | the banner at the event (EARLY TOUCHDOWN / OBSTRUCTION); the role flips at the contact, not when the plan expected it |

## 2. What was built

The new stack is five modules plus the gate runner. It composes the approved controllers rather than rewriting them.

| file | role (LOCOMOTION_ARCHITECTURE_FINAL layer) |
|---|---|
| `pc_act.js` | **L1 — the actuator arbiter.** One envelope per joint axis. The core request (hold + damping + P0 gravity + P1 balance / hip / arms) passes unchanged, which gives parity. P2 / P3 / P4 are added only within the remaining headroom and may not cancel more than κ (0.25 / 0.05 / 0) of an opposing higher-priority request. P0 / P1 extras such as the swing feed-forward are never scaled. The **ledger** records per joint and step: every module's request, the allowed share, the predicted total, **Jolt's realised torque**, the envelope, and who yielded and why (envelope or conflict). |
| `pc_gait.js` | **L3 — support / gait state from contact truth.** Support mode; per-foot role; stride phase. Truth overrides intent: an actual touchdown is the touchdown now, with the early or late offset recorded and the phase re-synchronised. It stays authoritative until the executor acknowledges it. A non-turf contact, or a turf contact outside the friction cone, on a swing leg is an OBSTRUCTION, latched for that swing. Lifts are classified as liftoff, early lift or unplanned lift. |
| `pc_plan.js` | **L4 — the viability monitor and step executor.** The monitor evaluates the 120 ms planning view against the prospective support: the sensed region, plus feet touching but still loading, plus feet re-planting near their anchors, plus the landing footprint of a step under way. It adds the hip-strategy capacity and the friction-limited capture, and re-searches at 60 Hz with **no latch**. WAIT_VIEW holds a decision until the planning view has caught up with a contact event the executor has already acted on. The executor runs timed rhythmic steps and C3's corrective steps, obstruction handling, and acceptance. The planner holds the rhythm on fixed home footholds and the LIPM ξ plan, with C2's transfer. |
| `pc_loco.js` | **Composition.** Truth → gait; 50 ms feedback view → executor + C1 balance law; 120 ms planning view → monitor. P3 style from `of_loco` IDLE; P1 swing inverse-dynamics feed-forward; arbiter → Jolt targets, gains and envelope. |
| `pc_ref.js` | `of_loco.js` sampled as a **P3 preference only**: joint targets that never move the root or touch state. |
| `pc_gateg1a.js`, `tools/g1a_run.js` | The G1a world (turf as force plate), the scenarios, the external-impulse ledger, and the criteria evaluation. |

**Changes to shared modules** are all opt-in or proven neutral; every approved suite is hash-identical:

- `pc_balance.js`:
  - `expose` / `monitor`: hooks for the arbiter and the monitor.
  - `swingMovingBase`: swing joint velocity for a moving pelvis (§4a).
  - `replantActual`: an airborne foot is reached from the actual pelvis (§4h).

  All are off for C1–C3.
- `pc_sense.js`: a turf contact whose normal lies outside the friction cone is an **edge contact**, not support (§4f). On flat turf n_y = 1, so no approved run changes.
- `pc_jolt.js`: `plateLate` (§4c); obstacle bodies can report as turf.
- `pc_gated.js`: `opts.Bloco` (B runs the new stack) and `opts.sub` (physics sub-stepping). Both are experiments; the default path is untouched.

## 3. Latencies: approved as provisional, and measured

The feedback / planning delays apply only to what a layer observes. Contact and the motors are immediate. The approved gates keep zero delay.

| scenario | 0 / 0 ms | **50 / 120** (default) | 100 / 170 | 150 / 220 | 250 / 320 |
|---|---|---|---|---|---|
| S4 10 in-place steps | 10/10, ≤ 2.4 cm | **10/10, ≤ 3.3 cm** | 10/10, ≤ 3.3 cm | **falls** after 7 steps | never lifts (the gate times out; stands) |
| S5_F80 push | step, 2.5 cm | **step, 19.6 cm** | **falls** | falls | falls |
| S7a push in swing | **falls** late (§8) | **upright** | **falls** | falls | never lifts |
| S11a early turf | upright | **upright** | upright | upright | recovers with a step |
| S11b obstacle | upright, reaction 0 ms | **upright, 50 ms** | upright, 100 ms | **falls**, 150 ms | never lifts |

**Reading:** behaviour *is* sensitive to latency. In-place stepping tolerates 100 / 170 ms. The reactive push step degrades sharply above 50 ms feedback: F80's foothold error is already 19.6 cm at 50 ms and the step comes too late at 100 ms. The obstruction reaction time equals the feedback delay, exactly as designed. S7a is a **boundary case** in delay (see §8).

## 4. General issues found and fixed during G1a

Each is a physical or architectural correction, not tuning to a scenario.

**a. The swing leg was carried along by pelvis drift.** C2's swing IK converts the planned foot velocity into joint velocities *as if the pelvis were stationary*. The critically damped swing motors (kd ≈ 90 N·m·s/rad at the hip) then held the leg's configuration while the pelvis drifted 3 cm, and every foothold landed 5–6 cm forward and 2–3 cm outward. I first verified the inverse-dynamics model: ID of the measured motion matches Jolt's realised hip torque to about 1 N·m. The actual fix is `swingMovingBase`, which computes the joint velocity for the world trajectory given the hip's velocity and the pelvis's angular velocity. Result: **≤ 2 cm forward, ≤ 0.6 cm lateral**. It applies to the new controller only.

**b. In-place footholds drifted** because each step was planned from where the foot last landed. Rhythm steps are now planned from **home footholds** captured once. Planned centres are constant to ±1 mm after step 2.

**c. The force plate was not contact-identical to the turf.** It was created *before* the character, so it became body 1 of every foot contact. That ordering changed Jolt's contact solve: loads during the F70 push differed by up to 20 %, and S5_F70 flipped from recover to fall. With `plateLate` (plate created after the character), the loads match static turf to the newton, and **6/6 comparison scenarios give identical outcomes** with COM excursions within 0.2 cm. The ledger still closes (≤ 0.075 N·s). *Caveat for the D6 diagnostic:* its instrumented twin used the early ordering. That is why some twin runs landed across a decision boundary; the D6 conclusions came from the un-instrumented runs and stand.

**d. The monitor mixed views.** It combined the controller's friction radius (50 ms view) with the planning view's ξ (120 ms), and a single planning cycle was enough to order a step. Three consequences in S7, all fixed:
- the friction-limited capture is now evaluated on the planning view with capacity μ_eff·W, the average over the ~1/ω capture horizon, instead of the instantaneous normal load that collapses at every touchdown;
- "both feet off the turf" must persist 62.5 ms (a 1213 N landing bounces both feet ~1 mm up for 17 ms);
- with no foot touching, the last measured μ_eff is kept.

**e. The arbiter's prediction omitted P1 extras** (the swing feed-forward); it now includes them. The remaining difference between *allowed* and *realised* torque is real physics, and the ledger shows both. Jolt's motor is an implicit spring-damper whose damper acts on the end-of-step velocity.

**f. A turf edge counted as support.** A toe on a 4 cm patch's rounded edge (normal 45°) was sensed as touchdown and planted the foot 21 cm short; he fell. A contact supports the foot only if the vertical load lies inside its friction cone (|n_y| ≥ 1/√(1+μ²), 26.6° at μ 0.5). Otherwise it is an edge contact, and the gait layer makes it an OBSTRUCTION. **S11c now stays upright.**

**g. Gait truth was not sticky.** One step after an actual touchdown the role returned to the plan's SWING. The touchdown is now latched until the executor acknowledges it. A flickering obstruction is one event with the first contact time kept (the executor had reacted 130 ms late). Reaction latency is reported in wall-clock time.

**h. An airborne foot never got back to its anchor** (D6X_load20; S2x). C1's feet-in-place IK solves from the *desired* pelvis. With the pelvis displaced, the unloaded foot hovered 1.8 cm up and drifted 15 cm in 1.5 s. The baseline only "recovered" because its **premature release** dropped the limp leg. With `replantActual`, an off-turf foot is reached from the actual pelvis, and **load20 recovers without any release**.

**i. The transfer re-planting anchor followed the drifting foot.** It is now captured once per transfer.

## 5. What the arbiter shows (S8)

A deep-crouch style request at weight 1 on both stance legs conflicts with support. The arbiter admits **1 %** of it, 46 of 4305 N·m·s; every refusal is logged as *conflict* (4328 axis-steps) or *envelope* (39). Support is delivered at 96.2 % of its request, and he stays upright with the trunk under 4°.

The same request **without** arbitration (the diagnostic S8n) realises 9 % of support, drops the COM 11.7 cm, and triggers a fall release. In the review, select `knee_L` or `hip_L` and look for the magenta yield band. The *Arbiter at the cursor* table lists, per joint, every module's request, the allowed share, Jolt's realised torque and who yielded.

## 6. Convergence (S10): reported as boundary cases

| scenario | 240 Hz vs 480 Hz physics (control stays 240 Hz) |
|---|---|
| S4 | total impulse 0.003 %, shear 1.3 %, every touchdown time identical; the 50 ms landing-impact windows are 4–15 % higher at 480 Hz (impact dynamics are not converged at 240 Hz) |
| S5_F80 | recovers at 240, 720 and 960 Hz, and at 480 Hz on static turf; **falls at 480 Hz on the plate** — a secondary instability ~1 s *after* a successful recovery step, in a marginal post-step stance |
| D6_slide (new B) | same outcome; A→B impulse 0–35 ms within 3.8 %, 100–250 ms within 3.8 %; 35–100 ms differs 34 % and 250–500 ms 55 %; total 17.6 % |

The totals and the event timing converge; the impact-scale windows and one marginal case do not. This is a property of the approved contact / motor stack at 240 Hz, not of the new layers: S4 and D6's early windows agree.

## 7. Performance: fails the 0.4 ms budget, with context

Controller time per 60 Hz frame (4 control steps, Node): 0.13–0.76 ms (S1 0.17, S4 0.48, S5_F80 0.44, S2b 0.76).

A profile of S4 splits this into:

| component | ms per 60 Hz frame |
|---|---|
| reused balance controller | 0.36 |
| arbiter | 0.12 |
| planner + monitor + executor + gait | ≈ 0.08 |
| swing feed-forward | 0.016 |

By the same measure, the **approved** C2 controller costs 0.47–0.70 ms (A_shift 0.70), and C3's B_F80 costs 0.40 ms. The budget I wrote in the architecture document was therefore already exceeded by approved code. The new layers add roughly 0.05–0.35 ms. Optimisation, such as caching IK and budget computations, is a prerequisite before multi-character play, not a G1a blocker.

## 8. Open observations (the G2 list)

1. **No escalation from a rhythmic step to a corrective step mid-swing.** If the needed correction exceeds the ±12 cm foothold adjustment, the rhythmic step continues and he falls honestly: S7c / S7d at 30 N·s; S7a at 100/170 ms. At 0/0 ms, S7a's residual lateral oscillation grows over six steps until the last adjustment reaches 8.8 cm.
2. **No descend-to-contact search.** A swing foot that finds no ground at the planned height is MISSED after 4 cm (S7d).
3. **A touching-but-unloaded foot is not re-loaded.**
   - load80 at default delay stands 2.4 s on one foot before falling at 3.58 s (the baseline falls at 1.7 s).
   - S2x: after one transfer-and-back, the second transfer's gate never opens.
4. **The sequence planner can choose the same foot twice** (S7a at 0/0). A second outward step with the foot already out needs the other foot to move first.
5. Walking-quality items visible in the review:
   - pelvis yaw oscillates ±12° during in-place stepping;
   - the stance ankle's lateral torque (35 N·m) saturates in single support;
   - the trailing foot briefly lifts 75 ms after some touchdowns;
   - landings reach 1.2–1.6 BW;
   - the swing lags 3 cm mid-swing.
6. S10 boundary cases (§6) and performance (§7).

## 9. How to review

- **URL:** <http://127.0.0.1:8171/sandbox/visual/physchar/index.html?suite=G1&test=S4_steps10> (the lightweight server on 8171 is running).
- **Scene overlays** (the *G1a* bar):
  - footholds: planned (orange) vs actual (cyan), with the error line;
  - prospective support (blue);
  - swing target, planned path (yellow) and actual trace (cyan);
  - slab and box;
  - gait roles at the feet;
  - arbiter yields (magenta ring) and saturation (red);
  - delayed views: ξ as the 50 ms and 120 ms views see it.

  The C1 *Balance* overlays (COM, ξ, region, CoP demand) work as in C1–C3.
- **Banner:** the monitor state and verdict, plus the latest gait event (EARLY TOUCHDOWN in cyan, OBSTRUCTION in red).
- **Charts:**
  - *top:* the gait diagram — roles L / R, support mode, monitor verdict, event ticks;
  - *bottom:* the arbiter for the selected joint axis (joint / axis selectors) — allowed total, **realised**, spring, gravity, P1 feed-forward, P3 requested / allowed, envelope, yield and saturation bands.
- **Side panel:**
  - this scenario's criterion and the run summary;
  - the steps table (click to seek);
  - *Arbiter at the cursor*, and the arbiter over the run;
  - gait events (click to seek) and the monitor, executor and planner logs;
  - all criteria; the S6, S10, latency and plate tables; every scenario (click to load).
- **Suggested order:** S4 (0.1×, side camera) → S11a / S11c / S11b (at each contact) → S8 vs S8n (knee_L swing Y) → S7a → S2 / S3 → S5_F80.

## 10. Reproduce

```
cd sandbox/visual/physchar
node tools/g1a_run.js --out ../../../review_artifacts/physical_character_v1/g1a/json/g1a_results.json   # 61 s, sequential
zsh tools/review/regress.sh                                                                          # approved suites, ~3 min
```

Uncommitted and not pushed:

- **New:** `pc_act.js`, `pc_gait.js`, `pc_plan.js`, `pc_loco.js`, `pc_ref.js`, `pc_gateg1a.js`, `tools/g1a_run.js`.
- **Modified:** `pc_balance.js`, `pc_sense.js`, `pc_jolt.js`, `pc_gated.js`, `pc_harness.js`, `index.html`.
- **Evidence:** this folder.
