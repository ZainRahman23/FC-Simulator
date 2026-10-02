# Physical Character V1: final handoff (frozen research state, 2026-10-02)

**Purpose of this document:** a fresh engineer, or a Claude session with no memory of the conversations, can recover the complete V1 state from it, understand why everything exists, and continue.

**Status:** **FROZEN. No development in progress. Nothing pushed.** V2 has not started. Transition-planned walking (§S) is a hypothesis, not an implemented or approved solution.

**Companion documents:**
- `PHYSICAL_CHARACTER_V1_LESSONS.md`: the short "what V1 taught us" list.
- `PHYSICAL_CHARACTER_V1_MANIFEST.json`: machine-readable paths, flags and status.
- `sources/`: the user's briefs and decisions, plus the independent (Astra) research, verbatim.
- `HANDOFF_2026-09-30_REBOOT.md`: the running chronological handoff; it holds the per-gate detail.

---

## A. What V1 is

A **fully dynamic, physically articulated football player** for Touchline, researched as a sandbox prototype.

- **The body:** a Jolt rigid-body humanoid (14 bodies, 13 joints, finite torque-limited motors) is the only spatial state of the character.
- **What controllers may do:** decide joint targets and gains; nothing else.
- **What moves the body:** everything the body does results from motors, gravity, contacts and friction.
- **Forbidden:**
  - root propulsion or velocity writes, pelvis pinning;
  - teleports, kinematic overrides;
  - hidden upright or braking forces;
  - scripted outcomes.
- **Football authority:** the authoritative football simulation decides football outcomes. Physics never decides them, and failure is allowed to be physical.

**Pipeline** (unchanged since approval, `sandbox/visual/physchar/`):

```
intent (football / test / walk request)
  → sensing + support reasoning                 pc_sense (contact truth, CoP, capture point, friction observer)
  → physically achievable targets               pc_support (C2) · pc_step (C3) · pc_plan / pc_loco (G1–G2 locomotion stack) · pc_ref (reference keys)
  → finite motors                               pc_balance (C1 CoP law, hip strategy; C4 arms, C5 protective) · pc_act (one actuator arbiter + ledger)
  → Jolt articulated rigid bodies + contacts    pc_jolt (JoltPhysics.js WASM, single-threaded), pc_body (anatomy / mass / ROM)
  → solved state → rendered skeleton            pc_fit (render fit; the rendered bones are fitted from the bodies)
```

**History:**
- 2026-09-29: the pivot from authored contact animation to a physically articulated character.
- The physics substrate was decided: Jolt (`SUBSTRATE_DECISION.md`). The custom XPBD design of `ARCHITECTURE.md` was superseded.
- Gates A → B → C1 → C2 were approved.
- V1.1 anatomy was promoted (2026-09-30).
- C3–C5, Gate D and D6 followed, then the locomotion architecture (`LOCOMOTION_ARCHITECTURE_FINAL.md`, reconciled with an independent Astra review).
- G1 was promoted, G2a approved, then the G2b walking research (2026-10-01 → 10-02).
- The Physical Stepper consolidation (2026-10-02) ended with this freeze.

## B. Exact frozen state

| item | value |
|---|---|
| Worktree | `/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1` |
| Branch | `prototype/physical-character-v1`. **No upstream.** |
| Freeze tag | **`checkpoint/physchar-v1-final-research`** (annotated, local only). The freeze commit adds this document; resolve it with `git rev-parse checkpoint/physchar-v1-final-research^{commit}`. Its parent is `d133e1a` (the Physical Stepper STOP). |
| Branch point | `4baf37b` = `fc-simulator/touchline-current` on GitHub. Every commit after it on this branch exists **only locally**. |
| Earlier local tag | `checkpoint/physchar-pre-crossover` → `b0a84d2` (Gate C5). Local only. |
| Non-Git snapshot | `/Users/zainrahman/Downloads/FC Simulator worktrees/_preserved_2026-10-02_physical_character_v1_final/`. It holds the full self-contained Git bundle, the untracked evidence, the volatile scratch, the session transcripts, the memory notes and checksums. Its README holds the exact hashes. |
| Earlier snapshots | `_preserved_2026-09-29_physical_character_gate_a`, `…gate_b`, `…gate_c1`; `_preserved_2026-09-30_physical_character_gate_c2`, `…v1_1`, `…overnight`. All re-verified on 2026-10-02: 90/90 file checksums, 3/3 overnight artifacts, the bundle verifies. |
| User's original tree | `/Users/zainrahman/Downloads/FC Simulator` (branch `prototype/3d-animation-pipeline`). It was **never touched** by V1. |

## C. Body (V1.1, `WORKING_CALIB = "V1.1"`, `pc_body.js`; V1 reproducible with `--calib V1`)

**Player:** "Gabriel", **78.0 kg** total, de Leva (1996) mass fractions, inertia from de Leva radii of gyration × our segment lengths.

**14 bodies (kg):**
- trunk and head: pelvis 8.71, abdomen 12.74, chest 12.45, head 5.41;
- arms, per side: upperArm 2.11, foreArm (+hand) 1.74;
- legs, per side: thigh 11.04, shin 3.38, foot 1.07.

**13 joints:**
- sixdof (swing–twist, asymmetric anatomical limits): lumbar, thoracic, neck, shoulder ×2, hip ×2, ankle ×2;
- hinge: elbow ×2, knee ×2.

**Motors:**
- Jolt motor targets with kp / kd, torque caps from human evidence, and soft 20 Hz hinge stops.
- SixDOF rotation limits are hard, which is a Jolt property.

**Solver:** 240 Hz × 1 collision step, 30 velocity / 4 position iterations, no sleeping (`TIMESTEP_CONFIGS["240x1"]`, `GATE_C1_TSC`).

**V1.1 anatomy** (`v1_1/ANATOMY_V1_1_REPORT.md`, `v1_1/PROMOTION.md`):
- hip width 18.4 cm;
- colliders world-identical to V1;
- ROM and torque set to evidence (e.g. 30° ankle dorsiflexion);
- leg length (hip → foot) 0.9243 m.
- **Reachable envelope** (right foot, quiet stance): forward 26 cm, backward 18 cm, outward 8.3 cm.

**Feet** (`footModel`, opt-in; the gate is §K):
- **F0 (default, kept):** the rigid 36 cm boot.
- **F1:** a rigid human-sized outline.
- **F2:** a passive articulated MTP (metatarsophalangeal) joint on the boot outline.
- **F2h:** the same on the human outline. 16 bodies (foot 0.876 + toe 0.192 kg per side); mass, COM and inertia preserved; no propulsion.
- **Physical toes are deferred.**

## D. Controller architecture

**Standing and reactive layers:**
- **C1 — balance:** feet-in-place balance (`pc_balance`). Capture-point CoP law, hip strategy, gravity Jᵀ compensation, posture; STEP_NEEDED / release logic.
- **C2 — transfer and placement:** weight transfer and deliberate foot placement (`pc_support`). Planned unloading (`unloadPlan`), liftoff gate, load acceptance, feasibility planner with pelvis-height band.
- **C3 — one-step corrective stepping** (`pc_step`): LIPM foothold, reach check, finite-motor swing, sensed touchdown, acceptance.
- **C4 — reactive arms:** `ctrlExtra.reactiveArms`, off by default.
- **C5 — protective fall response:** `ctrlExtra.protective`, off by default.

**Locomotion stack** (`LOCOMOTION_ARCHITECTURE_FINAL.md`, L0–L5):
- one actuator arbiter with a budget and ledger (`pc_act`);
- an event-driven gait-role model (`pc_gait`);
- planner and executor (`pc_plan`: `LocoPlanner`, `StepExecutor`, `ViabilityMonitor`);
- the `of_loco` reference (`pc_ref`);
- the `LocoController` (`pc_loco`) with feedback / plan delays (`delayFb` 0.05 s, `delayPlan` 0.12 s).

**Locomotion milestones:**
- **G1:** stepping capability in the new stack (G1a skeleton with regression parity, G1b closure).
- **G2a:** yaw / angular-momentum regulation + a human in-place gait (`pc_gateg2`).

**Walking (G2b), all opt-in under `rhythm.walk`:**
- Controllers A / B (`pc_walker`, maps in `pc_walker_models`).
- **The unified controller** (`walk.ctrl.kind "U"`, `pc_unified`), the current best walking configuration:
  - a vd orbit, funnel stance reference, closed-loop double support (DS) and a speed loop;
  - joint-map placement (maps `mU1_tau*`);
  - the inherited human swing with the pelvis-rate internal model (`walk.swingBase {w:"model", learn:{rate:0.05}, pure:[0]}`).
  - The test is `G2W_A8`. The best configuration used everywhere since: `{kind:"U", vd:0.5, from:1, ramp:{a:0.3}, place:"maps", uRefSim:false, lat:{rho:0.4}, adapt:null, reachIter:false}`.
- **The Physical Stepper** (§J): `walk.ctrl.stepper`, opt-in, not adopted.

## E. What is approved (exact gate history)

| gate | status | evidence (all tracked) |
|---|---|---|
| A passive body | APPROVED 2026-09-29 (V1) | `sandbox/visual/physchar/results/gatea_final_240x1.json`; V1.1: `v1_1/json/promotion/gatea_V1.1.json` |
| B motors | APPROVED (V1) | `results/gateb_final_240x1.json`; `…/promotion/gateb_V1.1_all.json` |
| C1 balance | APPROVED (V1) | `results/gatec1_final_240x1.json`; `…/promotion/gatec1_V1.1_all.json` |
| C2 transfer / placement | APPROVED (V1) | `results/gatec2_final_240x1.json`; `…/promotion/gatec2_V1.1_working.json` |
| V1.1 anatomy / ROM | PROMOTED working foundation (2026-09-30, e14354b) | `v1_1/PROMOTION.md` |
| C3 one-step corrective stepping | PARTIAL (never approved) | `gate_c3/json/gatec3_V1.1_x3.json` (29 tests ×3) |
| C4 reactive arms | PARTIAL, off by default | `gate_c4/` |
| C5 protective falls | PARTIAL, off by default | `gate_c5/`; local tag `checkpoint/physchar-pre-crossover` |
| Gate D (two characters, one world) | PASS with limitations | `results/v1_1/gated_V1.1_post_mu_fix.json` (post-fix default reference); pre-fix `gated_V1.1.json` kept |
| D6 physical slide tackle | PARTIAL; recovery diagnosed physically justified; friction-sensing fix APPROVED | `d6_diagnostic/D6_DIAGNOSTIC_REPORT.md` |
| G1 (G1a + G1b) | PROMOTED 2026-09-30 (772d0bd) | `results/v1_1/g1_V1.1.json` (26 scenarios) |
| G2a in-place gait + yaw | APPROVED 2026-10-01 (6f1ef85) | `results/v1_1/g2a_V1.1.json` (10) |
| G2b forward walking | **NOT achieved** | §G–§J |
| Foot gate | STOPPED for review; F0 kept (user decision) | `foot_gate/FOOT_GATE_REVIEW.md` |
| Physical Stepper | Built opt-in; **not adopted**; STOPPED for decision | `g2_stepper/G2_STEPPER_REVIEW.md` |

**Hash regression at the freeze:**
- `regress.sh` 12/12 identical: A / B / C1 / C2 on V1 and on V1.1, C3 29/29, D 7/7, G1 26/26, G2a 10/10.
- G2W_A8 6/6: `5780483c 17d27b5d 5082d76a 47427dbb 1f5445fd b373d22e`.
- Foot gate slow protocol: F0 42/42, F2h 42/42.
- Snapshot-session validation: 16/16.
- Fresh run 2026-10-02 16:23–16:26 BST on `d133e1a`. The freeze commit adds only documents and preserved probe scripts, with no runtime change. The exact outputs are in the snapshot (`regression_final/`).

## F. What worked (mechanisms worth keeping)

- **The substrate:** Jolt with Touchline owning the whole character layer. First touch ≤ 1.8 mm in Gate D, same-step contact response, deterministic.
- **C1:** the capture-point CoP balance with finite ankles, the hip strategy and feet-in-place. C1 V1.1 result: 8 stood / 37 recovered / 14 fell.
- **C2:** planned physical unloading (an upper bound on the unloading foot's share, never below the physical minimum), the stricter liftoff gate, and the consistent pelvis-height band. Every placement up to the anatomical limit is accepted without bounce.
- **C3:** forward pushes ≤ 100 N·s and backward ≤ 50 N·s caught with one physical step.
- **Gate D:** two characters in one Jolt world, with the contact invariant shown (both bodies' Δv on the contact step).
- **D6 diagnostic method:** a force-plate twin run, a frozen-controller test and a 24-run one-variable matrix. It found the friction-observer bug (`muValid` false while another body touches the foot) and proved the recovery physically justified.
- **G1 / G2a:**
  - the arbiter and ledger (no root force; ledger ≤ 0.041 N·s);
  - yaw within 5° in place, with a 30° intended turn followed;
  - contralateral arm swing.
- **G2b unified controller:** one start (L@0.6) walks all 40 steps of its test at ≈ 0.5 m/s. The pelvis-rate internal model in the swing cut landing error at matched states from +6.7 to +1.0 cm.
- **Instrumentation:**
  - fall-aware step counting;
  - the matched-state step bench (`tools/g2_stepbench.js`);
  - per-stride impulse / energy accounting including Jolt's linear damping (integrity 0.2–1.1 %);
  - the exact snapshot / restore session (`tools/stepper/session.mjs`; branches equal from-scratch replays bit for bit);
  - the snapshot Jolt oracle (`tools/stepper/oracle_fast.mjs`).
- **The contact-event interface** (Physical Stepper): a versioned PROPOSED → ACCEPTED → EXECUTING → ACHIEVED / MISSED / INTERRUPTED / CANCELLED lifecycle, classified only from sensed contact.

## G. What failed (negative results are part of the record)

- **C3 lateral recovery.** A lateral push ≥ 55 N·s needs a crossover with a 5.1–6.3 m/s foot, above the 4.5 m/s cap. The boot-sized collider was ruled out. Swing options and step sequences rescue 0/8 "second step" failures.
- **C4:** small effect, and C_proj_F115 regresses.
- **C5:** lateral head impact is mixed and D_late gets worse.
- **G2b Option 1:** fixed touchdown (peak 1.6 → 0.58 kN), but only 2–5 upright steps. Zero delay and independent torque limits do not help.
- **Controllers:**
  - Controller A: 9–13 upright steps (mean 11.2), forward step-to-step map unstable (+1.25);
  - Controller B (SIMBICON-style): 5–7.
- **Speed regulation** (`walk.dcmRef`, `walk.vReg`, `ctrl.ankle2`) holds 0.45 m/s, but survival is 10.2 vs 11.2.
- **Unified controller:** 14.7 mean upright steps (6–40). Not robust across starts.
- **Overnight swing executor X** (`pc_swingx.js`): step maps 2× less predictable; not adopted. The generic swing `v2` is not adopted.
- **Overnight variants, none of which moved the typical walk:** late correction (`ctrl.late`), preview, `Lref`, rocker, heel rise, flatter landing, `dsExtEnd`, stance gain / funnel variants.
- **Global linear step maps get worse with more data:** mU1 14.7 → mU7 8.5 → mU8 4.5.
- **The Physical Stepper's learned planner,** held out by start: 9.0 / 8.7 / 10.0 upright steps vs the controller's 14.7.
  - Forward capture-point error RMSE 4.5 cm, p95 8.5 cm.
  - False-safe rate 27 %.
- **Stance speed regulators under the oracle:** `speedI` with more authority; `speedP` (17.8 vs 18.2).
- **Foot alternatives F1 / F2 / F2h:** none continues walking more often than F0 at matched states.

## H. The current walking problem

**In plain English.** The character can take steps and sometimes walks a long way, but it does not walk reliably. From most starts it gradually speeds up, stride after stride, until a step can no longer catch it, and it falls forward.

The controller walks with short, quick steps and a short double support. That gait does not let it brake. Longer steps with a longer double support would brake, but nothing in the controller chooses that gait from the measured state. A smarter step-choosing layer trained to imitate an all-knowing search did not fix it: its predictions are not accurate enough, partly because the end of each double support is a discrete event that makes the next step hard to predict.

**Technically:**
- **Failure mode: speed creep.** Stride-level speed rises by +0.035 to +0.040 m/s per stride for searches around the controller's decision, ending in forward collapse.
- **The impulse audit:**
  - steady walking: DS propels +8 to +10 N·s per stride, single support (SS) brakes −6 to −8, the net ≈ +2 balances −2 N·s of Jolt damping;
  - creep: SS turns propulsive (+10 to +46 N·s per stride);
  - the SS CoP is already on the forefoot (+0.15 to +0.19 m at 75 % of SS), and the COM passes beyond it.
- **The double support is propulsive.** It tracks an orbit shifted by the speed integrator, which is bounded at ±0.08 m and saturates.
- **The speed loop's integral term moves ≈ 1.5 cm per step.**

## I. Oracle findings and corrections

The **Jolt oracle** is the deterministic simulator used as a perfect model. It searches step-start commands (df, dl, T): one step (myopic) or two steps (beam). Exact via snapshot / restore (`oracle_fast.mjs`). Diagnostic only, never a controller.

### I.1 Oracle fragility

The 2026-10-02 overnight beam oracle reported 28–34 upright steps.
- It reproduces **bit for bit** at HEAD (32 / 34 / 28) **only** when its 4-decimal commit rounding is emulated (`--round 4`).
- With exact commits the same search gives **26 / 13 / 20**.
- The two runs share every decision through step 3 and diverge from step 4 by ≈ 3 mm.
- **A ~0.1 mm command difference decides between 13 and 34 steps.** Those results were fragile paths, not evidence of robust walking.

**Evidence:**
- `g2_stepper/json/repro/*.json.gz`, `g2_stepper/json/matrix/legacy2_*.json.gz`;
- yesterday's logs: `g2_overnight/json/oracle2/`;
- the viewer scenario 1 (`g2_stepper/viewer/`).

### I.2 Speed creep

Present under every oracle and the controller (§H).

### I.3 Long steps can brake (correction)

The first analysis claimed "stepping cannot brake". That holds **only near the controller's own decision** (±12 cm, ±60 ms: ±0.7 cm/s stride-speed effect per step, and no braking candidate on average above 0.55 m/s).

With long steps in the action space (the union nominal ∪ feedback grid, or the absolute 0.10–0.52 m grid):
- braking steps exist in 72–80 % of states;
- at 0.55–0.8 m/s they give **−0.03 to −0.07 m/s per step**, and −0.01 to −0.06 m/s among steps that keep the next state acceptable;
- the best oracle's chosen steps brake at 0.65–0.8 m/s (−0.021).

### I.4 Good gait vs controller gait

Pre-collapse steps, identical instrumentation:

| | double support | COM behind landing foot at touchdown | ξ at step start | speed drift per stride |
|---|---|---|---|---|
| best oracles (Gu, beam, legacy2) | ≈ 0.30–0.32 s | ≈ 25–28 cm | ≈ 0 ± 3 cm | +0.007 to +0.016 |
| controller-centred searches (B / C) | 0.21–0.22 s | ≈ 19 cm | +2 to +5 cm | +0.035 to +0.040 |

- **The good gait:** long steps (≈ 0.33–0.36 m achieved, 0.35–0.41 m commanded) with a long braking double support.
- **The controller:** a short, quick gait.

### I.5 Lookahead

- **Foresight helps, case by case:** two steps vs one step around the controller's decision gives 20.8 vs 15.2 mean upright.
- **At matched states** the two-step pick differs in 52 % of decisions. It trades a slightly worse first step for a far better best second step (50 vs 98). Commands and next states differ by ≈ 0 on average: it preserves **continuation options**, not a state variable.
- **The best oracle, Gu** (two steps, nominal ∪ feedback): all 20 searched steps on 6/6 starts (mean 26.7 upright).
  - On a 40-step horizon it held **all 40 on R@0.5 (45 upright)**, recovering a 0.69 m/s excursion.
  - On L@0.6 it crept and collapsed after 29.
  - **Not robust.**
- **Cheaper stand-ins did not capture the benefit:** one step + learned terminal value 15.7 ≈ one step; a linear policy fitted to the oracle 6.5.
- **A fixed nominal (0.39 m / 0.40 s) fails at gait initiation:** the first steps must be short.

### I.6 Learned planner

- **Surrogate** (held out by start, walking region):
  - capture-point ξ_f RMSE 4.5 / p95 8.5 cm;
  - next-step velocity unpredictable (per-candidate error = true spread);
  - fall classifier: 27 % false-safe;
  - offline regret median 2.5; exact pick 28 %.
- **Live:** 8.7–10.0 upright steps.
- **Cost:** 0.47 ms per decision (horizon 1) / 1.4 ms (horizon 2); 18 / 55 ms of CPU per game second for 22 players.

### I.7 Stance experiments

No tested stance / speed-regulation change materially helped:
- `speedI` authority 0.25: still creeps;
- `speedP` 0.3: 17.8 vs 18.2 under the oracle, and worse on the plain controller;
- the earlier `vReg` / `ankle2` / `dcmRef`.

Because long steps CAN brake, stance changes are not indicated by the evidence.

### I.8 Double-support transition

Measured per state, with a quadratic in the command fitted to that state's own candidates (an in-sample, optimistic floor for any smooth model):

| | at touchdown | at the next step start |
|---|---|---|
| ξ | 1.24 cm | 1.80 cm |
| v | 1.36 cm/s | 2.90 cm/s |
| timing | 10 ms | 25 ms |

The event-terminated double support **roughly doubles** the transition's unpredictability. **Transition-planned walking is the current leading hypothesis (§S), not an implemented or approved solution.**

**Where this lives:** `g2_stepper/G2_STEPPER_REVIEW.md` (all numbers), `g2_stepper/DECISION_RECORD.md` (corrections), `g2_stepper/STEPPER_LOG.md` (the trail, including the claims that were later corrected).

## J. The Physical Stepper (2026-10-02)

**Architecture** (`pc_stepper.js` + the `walk.ctrl.stepper` hook in `pc_plan.js`):

```
requested locomotion → nominal gait generator (walk-ratio law ℓ = √(WR·v), WR 0.20 m·s at L 0.924 m, ∝ L^1.5)
  → continuation-aware planner (StepPlanner: surrogate z × u → z′ + realised step + P(bad); horizon 1, 1 + V, or 2 with a beam)
  → committed SUPPORT contact event (target = predicted landed sole centre ± (8, 6) cm, time window, command, prediction; versioned)
  → existing execution, unchanged (commanded step, no in-swing re-decision)
  → Jolt contact → classifySupport (sensed touchdown only) → ACHIEVED / MISSED / INTERRUPTED; replan
```

- **Schema:** the football event types (ball_touch, strike, interception, release, recovery) are schema only.
- **State record:** shared by the oracle, the data and the planner (`pc_stepfeat.js`).

**Results:**
- held-out live: 9.0 / 8.7 / 10.0 upright steps;
- events: 116 ACHIEVED / 10 MISSED / 18 EXECUTING at the fall (never repaired);
- landed vs predicted sole centre: 2.3 / 1.2 cm median.

**Limitations:**
- surrogate accuracy (§I.6);
- the oracle ceiling itself is not robust;
- the DS non-smoothness.

**A bug found and fixed:** the event target mixed the foot body origin with the sole centre (≈ 7 cm). It never fed back into control.

**Tools:** `tools/stepper/`. The reviews: `g2_stepper/G2_STEPPER_REVIEW.md`, `DECISION_RECORD.md`, `RENDER_SKELETON_CONTRACT.md`, `viewer/`.

## K. Foot experiments (`foot_gate/FOOT_GATE_REVIEW.md`)

- **Compared:** F0 · F1 · F2 · F2h as opt-in `footModel` bodies.
- **At matched states** no alternative continues walking more often than F0.
- **Maximum viable step at 0.55–0.75 m/s:** F0 0.42 · F1 0.39 · F2 0.32 · F2h 0.38 m.
- **Walks on their own maps:** F0 9.5–11.2 · F1 5.0 · F2 5.0 · F2h 6.2.
- **F2:** the stance mechanism works (heel rise, MTP rollover, lower ankle torque). The swing fails: the steep toe-off plus 12.6 cm of toe hang under the rigid-boot swing generator gives 94–99 % swing failure after steps ≥ 0.32 m.
- **F1:** the gain is collision geometry, and it loses stance authority.
- **The user's decision:** keep F0; F2h opt-in; foot-agnostic logic.
- **Re-run F2h vs F0 before running / sprinting.**

## L. Two-body / contact work (Gate D, D6)

**Gate D:**
- two characters in one world, 7 tests;
- contact on the step it happens;
- first touch ≤ 1.8 mm;
- D0 isolation bit-identical.

**D6 (a slide tackle into a standing player):**
- **B legitimately recovers.** The hit is to the outer boot, 1.8 cm above the turf, toward the midline. The foot slides 16 cm. Active balance is what holds him: frozen-controller runs fall.
- **The user's decision:** do not make the baseline fall; preserve the continuum.
- **Friction-sensing bug fixed and approved:** `muValid` is false while another body touches the foot, plus 50 ms.
- **Four open observations:**
  1. C3's permanent step refusal;
  2. C1's premature release window;
  3. arrival-speed sensitivity;
  4. shin-contact bistability.

Full detail: `d6_diagnostic/D6_DIAGNOSTIC_REPORT.md`, `HANDOFF_2026-09-30_REBOOT.md`.

## M. Determinism and integrity

**Determinism:**
- Deterministic per run and repeat (×3).
- Browser = Node, on the same modules.
- A state hash (FNV over every body's position, rotation and velocities, every tick) is the regression currency.
- Snapshot / restore is exact and validated (`tools/stepper/session_check.mjs` 16/16).

**Ledger:**
- external impulse ledger per run;
- no root force;
- the Jolt linear damping (0.05) is accounted explicitly.

**Trap:** chaotic sensitivity is real (§I.1). Never round committed commands in searches unless reproducing the 2026-10-01 engine.

## N. Performance

- **Physics + controller:** ≈ 0.25 s of CPU per simulated second per character (Node, idle); 2.1–3.1 ms per 240 Hz tick under load.
- **G1 controller:** 0.13–0.76 ms per tick (budget 0.4 ms; G1a perf criterion FAILED).
- **Physical Stepper planner:** 0.47 ms (horizon 1) / 1.4 ms (horizon 2) per decision.
- **22 real-time characters are NOT feasible in the current Node / WASM physics.** The physics, not the planner, is the bottleneck.

## O. Important diagnostics and tools (`sandbox/visual/physchar/tools/`)

**Regression:**
- `review/regress.sh [outdir]`: the full hash regression (12 comparisons).
- `g2walk_eval.js --test G2W_A8 --n 30`: the six walking hashes.
- `footgate_steps.js --foot F0|F2h --protocol slow`: 42 each, vs `foot_gate/json/steps_*_slow.json`.

**Gate runners:**
- `gatea_run.js` … `gatec3_run.js`, `gated_run.js`, `d6x_run.js`;
- `g1a_run.js --scenarios-only`, `g2a_run.js --scenarios-only`;
- `g2char_run.js`.

**Walking research:**
- `g2walk_ident.js` (identification);
- `g2walk_diag.js` (per-step diagnostics);
- `g2_stepbench.js` (matched-state bench).

**Physical Stepper (`stepper/`):**
- `session.mjs` + `session_check.mjs`: the exact snapshot session;
- `oracle_fast.mjs`:
  - configs legacy1 / legacy2 / B / C / E / G / Gu / Bu / Ew / Gw;
  - options `--policy`, `--terminal`, `--stepper … --commit ctrl`, `--round 4`;
- `oracle.mjs` + `sim_worker.mjs`: the replay oracle (reference);
- `gait_metrics.mjs`: identical instrumentation, impulse / energy;
- `surrogate.mjs`: fitting, leave-one-start-out, regret;
- `matrix_report.mjs`, `smooth_td.mjs`, `stepper_run.mjs` (live), `bench22.mjs`, `rec_review.mjs`.

**Probes and batch scripts:** `review_artifacts/physical_character_v1/scratch_probes/` (preserved scratch, NOT maintained; see its README).

**Capture:** `review/v11_cap.js` (headless Chrome; puppeteer-core), `review/strip.py`.

## P. Review pages

Serve the worktree root with `python3 -m http.server 8171 --bind 127.0.0.1`.

**Harness:**
- `http://127.0.0.1:8171/sandbox/visual/physchar/index.html` (suite / test / body selectors);
- e.g. `?suite=D&test=D6_slide`, `?suite=G1&review=steps`, `?suite=G2` (buttons C1–C8, W1–W6; `FG_*` cases).

**Viewers:**
- `review_artifacts/physical_character_v1/g2_stepper/viewer/index.html` (three scenarios: the oracle's fragility, controller vs the best oracle, the live Physical Stepper);
- `…/g2_overnight/viewer/`, `…/g2_unified/viewer/`, `…/g2_speed/viewer/`, `…/foot_gate/viewer/`;
- `…/index.html` (overview).

**HTML reports:** `OVERNIGHT_2026-09-30_REPORT.html`, `LOCOMOTION_ARCHITECTURE_FINAL.html`, `LOCOMOTION_PROPOSAL.html`, and per-gate `*.html` next to their `.md`.

## Q. Important source files (`sandbox/visual/physchar/`)

| file | role |
|---|---|
| `pc_body.js` | anatomy, mass, ROM, colliders, foot models, `WORKING_CALIB` |
| `pc_jolt.js`, `vendor/jolt-physics.wasm-compat.js` | the Jolt world wrapper and the pinned engine build |
| `pc_math.js` | vectors, quaternions, the hash |
| `pc_sense.js` | contact truth, CoP, capture point, friction observer |
| `pc_balance.js` | C1 + the controller profile; C4 / C5 options |
| `pc_support.js`, `pc_step.js` | C2, C3 |
| `pc_act.js`, `pc_gait.js`, `pc_loco.js`, `pc_plan.js`, `pc_ref.js` | the locomotion stack |
| `pc_walker.js`, `pc_walker_models.js`, `pc_unified.js` | walking controllers |
| `pc_swing.js`, `pc_swingx.js` | experimental swings (not adopted) |
| `pc_stepper.js`, `pc_stepfeat.js` | the Physical Stepper (opt-in) |
| `pc_gatea/b/c1/c2/c3/d/g1a/g2.js`, `pc_d6diag.js`, `pc_d6x.js`, `pc_g2char.js` | test suites and runners |
| `pc_harness.js`, `index.html` | the browser review harness |
| `pc_fit.js` | the render fit |
| `pc_control.js` | poses and motor helpers |

## R. Important reports and evidence (`review_artifacts/physical_character_v1/`)

**Design:**
- `ARCHITECTURE.md` (the original design; the substrate was later superseded);
- `SUBSTRATE_DECISION.md`;
- `LOCOMOTION_ARCHITECTURE_FINAL.md`.

**Gate reports:**
- `gate_a…c2/GATE_*_REPORT.md`;
- `v1_1/ANATOMY_V1_1_REPORT.md`, `v1_1/PROMOTION.md`;
- `OVERNIGHT_2026-09-30_REPORT.md` (C3–C5, D, D6);
- `d6_diagnostic/D6_DIAGNOSTIC_REPORT.md`;
- `balance_review/BALANCE_REVIEW.md`;
- `g1a/G1A_REPORT.md`, `g1b/G1B_REPORT.md`, `g2a/G2A_REPORT.md`.

**Walking research:**
- `g2_char/G2_PLANT_REPORT.md`;
- `g2_walk/G2B_OPTION1_REVIEW.md` + `NIGHT_LOG.md`;
- `g2_walker/G2B_WALKER_REVIEW.md` + `WALKER_LOG.md`;
- `foot_gate/FOOT_GATE_REVIEW.md`;
- `g2_speed/G2_SPEED_SWING_REVIEW.md` + `SPEED_LOG.md`;
- `g2_unified/G2B_UNIFIED_REVIEW.md` + `UNIFIED_LOG.md`;
- `g2_overnight/G2B_OVERNIGHT_REVIEW.md` + `OVERNIGHT_LOG.md` (**its oracle and "swing / stance" conclusions are corrected by g2_stepper**);
- `g2_stepper/G2_STEPPER_REVIEW.md`, `DECISION_RECORD.md`, `STEPPER_LOG.md`.

**Baselines:** the tracked files in §E. The untracked evidence (stills, sheets, logs, identification JSONs ≈ 950 MB) is in the snapshot `untracked_evidence.tgz`.

**Inputs:** `sources/`, the user's briefs / decisions and the Astra research, verbatim.

## S. Current unresolved hypotheses

1. **Transition-planned walking (leading hypothesis, NOT implemented, NOT approved).**
   - The idea: make the double support a planned contact phase. Its duration (and stride-level impulse) become decisions of the contact-event planner, made at the touchdown event and executed by the existing DS CoP solver with a planned rather than an event-terminated end.
   - **Evidence for it:**
     - the good gait differs mainly in DS;
     - the DS has the largest CoP authority;
     - braking needs the long-step / long-DS gait;
     - the event-terminated DS doubles the transition's unpredictability.
   - **Risk:** it changes the inner loop's DS termination. That is a controller change, not a body change.
2. **A better planner on today's action space:** DAgger, richer local / nonlinear models, touchdown-anchored prediction. The ceiling is the oracle, which held 40 steps on 1 of 2 long starts.
3. **A stance-mechanics redesign:** weakly supported, since long steps can brake.
4. **D6 observations 1–4** (§L) and the **C3 lateral limit**: open.

## T. Things NOT to rediscover (disproven, reverted, or corrected; with the reason)

**Substrate and body:**
- **A custom XPBD solver; Bullet / ammo.js.** Rejected for Jolt (substrate spike: blow-ups, tunnelling, no friction data).
- **"Lateral pushes need a bigger foot collider."** Ruled out for C3; the limit is crossover foot speed.
- **The foot (F1 / F2 / F2h) as the walking fix.** Not better at matched states; F2 fails in swing.
- **"The walking window is mostly the body (74 % → 14 %)".** Corrected: it was measured on inner loop v7 and is unsupported on v8 at matched states.
- **Lowering the pelvis 4 cm.** Worse.
- **Pelvis yaw as the hidden state.** Not it.

**Controllers and swing:**
- **Zero sensing delay / independent torque limits as the walking fix.** No help; the stepping controller was the gate.
- **"The inherited swing is the binding limit; rewrite the swing" (unified review).** Corrected overnight: the inherited swing + internal model executes late changes with gain 0.65 / 0.57 / 0.50 and timing fully. Swing X is worse.
- **More identification data for global linear maps.** Worse (14.7 → 4.5); the maps are not the right model class.
- **Single-support CoP speed regulators (`vReg`, `ankle2`), `dcmRef` tracking, more `speedI` authority, `speedP`.** No survival gain; during creep the CoP is already on the forefoot.
- **Overnight variants:** late correction, preview, `Lref`, rocker, heel rise, flatter landing, `dsExtEnd`. None moved the typical walk.

**Oracle and planner:**
- **"The plant is controllable by step-start placement for 26–28 steps; prediction is the only gap" (overnight).** Corrected: those runs were fragile (§I.1). The best exact oracle is not robust either.
- **"Stepping cannot brake".** Corrected: long steps brake (§I.3).
- **A fixed nominal gait without state feedback.** Fails at initiation.
- **Imitating the oracle with a linear policy, or with one step + learned terminal value.** No.

**Measurement traps:**
- **"Single-support acceleration is a defect".** Normal within-stride COM velocity oscillation is human. Judge speed at stride level / phase-matched (Astra; the user's Part 2).
- **The combined CoP read during double support as the stance-foot CoP.** Invalid; report the CoP only in single support or per foot.
- **The overnight "20/20" and "5–7 step" counts.** They included steps after a fall; always count fall-aware.
- **Commanded vs achieved step lengths** (commanded ≈ 1.13 × achieved). Never compare across the two.

**User decisions to respect:**
- **Making D6's baseline fall.** The user decided against it: the recovery is physically justified.
- **The 30 N·s mid-swing fall in G1.** Accepted as an honest boundary; do not artificially rescue it.

## U. Future production render-skeleton contract (separate from V1 physics; NOT implemented)

Frozen as documentation: `g2_stepper/RENDER_SKELETON_CONTRACT.md` (from the Astra Unity Humanoid audit; the user's Part 26).

**Hierarchy:** `root` (structural, unmapped) → `hips` (the render pelvis semantic, Unity Hips), then:
- three-spine torso: `spine_01 / 02 / 03` → Spine / Chest / UpperChest → `neck` → `head`;
- arms: `clavicle_L/R` (Shoulder) → `upperArm` → `lowerArm` → `hand`;
- legs: `upperLeg` → `lowerLeg` → `foot` → `toe` (Toes);
- deformation twist bones (upper arm, forearm, thigh, calf) as **unmapped branches**, never inserted into the chain.

**Rules:**
- No semantic `hip_L` / `hip_R` render bones. The physical left / right hip joints remain physics CONSTRAINTS.
- A render toe does not imply a physical toe.
- The structural root is not mapped to Unity Humanoid.
- Canonical reference / export pose: T-pose.
- Fingers, eyes and jaw are deferred.
- One semantic topology for goalkeepers and outfield players.

## V. Exact recovery instructions

**If the worktree is intact** (normal case):

```sh
cd "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1"
git status                                  # expect a clean tracked tree; untracked = review evidence (see the snapshot filelist)
git log --oneline -3; git rev-parse checkpoint/physchar-v1-final-research^{commit}
python3 -m http.server 8171 --bind 127.0.0.1 &   # review server (worktree root)
cd sandbox/visual/physchar
tools/review/regress.sh                     # expect 12/12 identical (~3–5 min)
node tools/g2walk_eval.js --test G2W_A8 --n 30 --out /tmp/g2w.json   # expect the six hashes in §E
node tools/footgate_steps.js --foot F0 --protocol slow --out /tmp/f0.json   # compare with review_artifacts/…/foot_gate/json/steps_F0_slow.json (42)
node tools/stepper/session_check.mjs        # expect 16 PASS
```

**If the worktree is lost:** use the snapshot `_preserved_2026-10-02_physical_character_v1_final/`. Its README has exact commands. In short:

```sh
SNAP="/Users/zainrahman/Downloads/FC Simulator worktrees/_preserved_2026-10-02_physical_character_v1_final"
git clone --branch prototype/physical-character-v1 "$SNAP/physical-character-v1_full.bundle" physical-character-v1-restored
cd physical-character-v1-restored && git checkout checkpoint/physchar-v1-final-research
tar -xzf "$SNAP/untracked_evidence.tgz"     # the untracked review media / logs / identification JSONs, at their original paths
shasum -a 256 -c "$SNAP/untracked_evidence.sha256"   # 510 OK
```

The volatile scratch (`volatile_scratch.tgz`) and the session transcripts are for archaeology only. Nothing in the frozen state depends on them.

**Environment:**
- macOS (arm64), Node v22 (22.19 at the freeze), Python 3 (for the http server and analysis scripts).
- The Jolt WASM build is vendored (no install).
- Headless captures need Google Chrome plus `puppeteer-core` (not installed in the repo; see `tools/review/README.md`).
- Assets: `assets/characters/outfield/gabriel/{rig.json, mesh.bin}` (tracked).
