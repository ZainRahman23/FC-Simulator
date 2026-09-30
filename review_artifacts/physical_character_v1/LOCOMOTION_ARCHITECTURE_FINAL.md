# Physical locomotion architecture: final (Claude + Astra reconciled)

**Status:** architecture and plan only. Nothing here is implemented. Locomotion has not started, accepted physics behaviour is unchanged, the Reference Tackle has not started, and nothing is pushed.

**Inputs reconciled:**
- my `LOCOMOTION_PROPOSAL.md` (commit 4062764);
- Astra's independent report *"Touchline: independent physical-character architecture review"*;
- the D6 diagnostic (`d6_diagnostic/D6_DIAGNOSTIC_REPORT.md`, checkpoint f18c8a7);
- the pre-reboot handoff;
- targeted checks made for this document: the Jolt headers, our own joint/motor configuration, the D6 joint-limit loading, and the existing `anim3d/of_loco.js` gait family.

**How claims are marked**
- **[R] research-supported principle.** The physics, or a published result.
- **[E] engineering choice.** A defensible design decision, not the only one.
- **[H] Touchline hypothesis.** Believed, but it must be tested in a named gate before it is relied on.

---

## 1. Executive architecture

**One continuous, actively controlled physical footballer.** The same 14-body V1.1 Jolt character stands, starts, walks, runs, turns, stops, acts, gets hit, recovers, stumbles or falls. Locomotion is not a new character. It is a **support-planning layer** added above the balance machinery we already have, and it feeds **one actuator authority per joint**.

<!-- SVG:stack -->

| layer | rate | owns | never does |
|---|---|---|---|
| **L5 Football intent** (not physics) | match tick | desired planar velocity, facing, optional timed foot constraints, action requests | set a body transform; decide a physical outcome |
| **L4 Motion planner** | 60 Hz + on every contact event | the N-step footstep plan (timed, reachable, occupancy-aware); speed and turn regulation; the **viability monitor**; the capability envelope reported back to L5 | apply a force; write a pose |
| **L3 Gait / support state** | 240 Hz | per-foot contact truth (from Jolt) → support mode; per-foot role; continuous stride phase, re-synchronised by actual events | advance a phase the body has not followed |
| **L2 Task controllers** | 240 Hz | **stance/support** (C1's CoP law, Jᵀ gravity compensation, virtual force, trunk via the stance hip); **swing**; **posture/style** (reference); **arms**; **protective** | exceed their priority class; bypass L1 |
| **L1 Actuator arbiter** | 240 Hz | one target + gains + torque envelope per joint axis; priority allocation; activation-rate limit; torque–velocity envelope; the work/power ledger | leave any motor at Jolt's ±FLT_MAX default |
| **L0 Jolt + sensing** | 240 Hz | rigid bodies, joints and limits, contacts, friction; sensing of contacts, loads, slip, rocking, external contact | — |

**Principles, locked (from the user) and confirmed by the evidence so far:**
- the Jolt body is the only spatial state;
- no root support, kinematic capsule or teleport;
- finite motors;
- contacts can defeat intent;
- actual touchdown overrides planned touchdown;
- reference motion supplies preferences only;
- football authority is separate.

**What already exists and evolves; nothing is thrown away and no second controller is created:**
- **C1 → stance controller:** the CoP law, Jᵀ gravity support, hip strategy, feet-in-place.
- **C2 → support-transfer logic:** planned unloading, liftoff gate, load acceptance.
- **C3 → the foothold law** inside the N-step planner (its latched one-shot decision is retired).
- **C1 classifier → the viability monitor.**
- **C4 → arm module.**
- **C5 → protective module.**
- **pc_sense** stays the contact truth, including the D6 fix: a foot touched by another body is no measurement of turf friction.

**Direction:**
- **[E]** B + C as originally proposed: GBWC-style feedback (Coros et al. 2010) plus reference-driven style (Lee et al. 2010; DReCon-like in spirit).
- **Strengthened by Astra:** an explicit support-state model, a single actuator arbiter, a layered latency model, stride-level impulse auditing, perturbations in every gate, and a flight/landing gate before running.
- **Deferred:** learned control (DeepMimic, DReCon). It stays a later option for motion quality, behind the same actuator and observation interface.
- **No engine migration.**

---

## 2. Claude vs Astra: reconciliation

Each row gives: my original position | Astra's | evidence | revised conclusion | what stays uncertain. The tag in the last column says what kind of conclusion it is.

| # | topic | Claude (original) | Astra | evidence | **revised conclusion** | uncertain → test | type |
|---|---|---|---|---|---|---|---|
| 1 | Overall approach | B + C: Coros-style walking on the existing layers + reference gait targets | Hybrid contact-aware controller; GBWC "best first direction"; learned control later | SIMBICON (Yin 2007), GBWC (Coros 2010), Lee 2010, DReCon (Bergamin 2019), DeepMimic (Peng 2018) | **Agree; unchanged in substance.** Add Astra's structure (§§3–5). | Whether hand-built feedback reaches human motion quality → visual gates G2/G5 | [E] |
| 2 | Gate 0 | None; went straight to L1 | Instrumentation first: momentum closure, actuator audit, convergence, frozen-command tests | D6 showed why the ledger matters (the friction-observer bug was found by instrumentation) | **Adopt, but small:** D6 already did most of it. The remaining items (actuator ledger, 480 Hz convergence check, internal-momentum test, frozen-command diagnostic) are the **entry of G1a**, not a separate long gate. | – | [E] |
| 3 | Pushes | A separate late gate (L5) | Perturbations in **every** gate, at stance, unloading, early and late swing, and touchdown | Pijnappels 2004 (phase-dependent responses); the C3 finding that recovery quality depends on swing execution | **Adopt Astra.** Every gate carries a perturbation matrix; my L5 disappears as a separate gate. | Phase-specific failure modes of the new swing → G1–G3 | [R] principle / [E] schedule |
| 4 | Running entry | Go to jog (L3) after walking, possibly straight after L1 | Prove push-off → flight → landing (G4) before running | Running = spring-mass stance + ballistic flight (Blickhan 1989; McMahon & Cheng 1990); flight must be physically produced | **Adopt Astra; I withdraw "L3 straight after L1".** G4 = a vertical hop + a single leap from a walk, before continuous running (G5). | Whether the rigid box foot gives usable push-off → G4 | [R] |
| 5 | Speed changes and stopping | Stop in L2; speed changes in L4 | Start, stop and speed change **inside** walking | Speed is regulated by foot placement and step timing from the first steps (Raibert 1986; Coros 2010) | **Adopt.** G2 = start, three speeds, changes, stop. | – | [E] |
| 6 | Turns | L4, after jog | G3: 3-D walking + constrained recovery **before** flight | C3's lateral gap (crossover needs a 5–6 m/s foot; step sequences are the fix) | **Adopt the order, trimmed:** G3 = turns, side, back and crossover steps, blocked-foothold recovery, lateral pushes. Curves at speed are left to G6. | Lateral step sequences with 140 N·m hip abduction → G3 | [E] + [H] |
| 7 | Actuator authority | Implicit: each module shapes targets; one Jolt motor per joint with a budgeted torque cap | **One final actuator arbiter**; torque–velocity, activation rate, power/work ledger; no module gets its own full strength | Jolt motor limits default to ±FLT_MAX (**verified**, MotorSettings.h); Hill torque–velocity; Anderson et al. 2007 torque–angle–velocity surfaces; Geijtenbeek 2013 activation dynamics | **Adopt, and make explicit** (§4). Our code already clamps every joint every step (no FLT_MAX motor), so torque can already never exceed the cap. What is new is the **choice of which request loses** under saturation, and the **speed-dependent envelope**. | Whether priority allocation computed on a *predicted* torque works with Jolt's implicit spring motor → G1a saturation tests | [R] physics / [E] design / [H] realisation |
| 8 | Hard limits as hidden bracing | Not considered | Limits are a separate, possibly unbounded resistance path; check them | Jolt: SixDOF **rotation limits cannot be soft** (verified, SixDOFConstraint.h). Our knees and elbows have soft 20 Hz stops; hips, ankles, spine and shoulders are hard | **Measured:** in D6 no limit carried load (struck-leg margins ≥ 7°, knee limit torque 0). **Rule:** log limit engagement in every gate; the ankle dorsiflexion stop (30°) is the expected one in late stance and running. | Hard-limit loading in running landings → G4/G5 | [R] Jolt fact / [H] |
| 9 | Latency | D6: 0 vs 100 ms delay made no difference | Three mechanisms: immediate mechanical, delayed feedback, slower task-level; sweep 0–250 ms; **frozen targets ≠ frozen feedback** | Pijnappels 2004 (support-limb responses ≈ 65 ms after trips); DeMers 2017 (pre-activation vs reflex) | **Adopt the layered model** (§9). Astra is right about my freeze diagnostic: it held *targets*, so the PD impedance still reacted (it is the "pre-activation" part). A **frozen-command** diagnostic is added to G1a. The new controller runs with **configurable delays from day one**: [E] default 50 ms feedback, 120 ms planning, swept 0/50/100/150/250. | Which delays keep human-like recovery without making the controller too weak → G1a/G1 sweep | [R] structure / [E] values |
| 10 | Capture point | Classifier: ξ outside the hip-extended support → STEP_NEEDED → release | ξ is a diagnostic, not a fall oracle; use support feasibility (friction cone, CoP in patch, torque, **time**, occupancy) and N-step selection; "planner failed" ≠ "physically unrecoverable" | Hof 2008; Curtze et al. (cautions on margin of stability); Koolen 2012; Wieber 2002 (viability) | **Adopt.** The C1 classifier cannot survive gait unchanged anyway: single support is *normal* in walking, and a region-shrink rule would call STEP_NEEDED on every swing. It becomes the **viability monitor** (§6), with ξ as its fast core estimate. This also retires two D6 observations (the C3 refusal latch, the C1 release window). | Cost and determinism of an N-step check at 60 Hz → G1a | [R] + [E] |
| 11 | Reference motion | Gait cycles as joint targets for non-balance joints + nominal leg shapes; "author or record" | Preferences only; the root trajectory is never a constraint; rebase to the actual state (DReCon) | DReCon; Lee 2010; my D6 used reference *joint* keys only | **Agree.** New fact: **`anim3d/of_loco.js` already authors a continuous IDLE/WALK/JOG/RUN/SPRINT family for this rig** (biomechanical curves, one phase convention, flight, retraction, lean from acceleration, backpedal). It is the reference source (§7), sampled by the *measured* phase and speed. Its root and stride are ignored. | Dynamic feasibility of of_loco's kinematic curves; the missing toe joint → G2/G4 | [E] + [H] |
| 12 | Propulsion | Capture-point foot placement + a Coros virtual forward force | Ground impulse ledger; stride impulse balance; no hidden root forces; Hamner 2010 | Newton; Hamner, Seth & Delp 2010; Winter 2009; Morin 2011 (sprint force orientation) | **Agree; made auditable:** the force-plate instrument from D6 measures the exact GRF on the moving character (§8). | Whether the virtual-force feed-forward stays inside the friction cone at acceleration → G2/G6 | [R] |
| 13 | Gait state | L/R stance FSM with contact-sensed transitions | Continuous phase + per-foot states + a separate contact record; planned vs actual; hysteresis without fictitious support | SIMBICON; hybrid zero dynamics (Westervelt, Grizzle & Koditschek 2003) for phase as a state function | **Merge:** per-foot **roles** driven by physical events; phase is **state-based** (progression over the stance foot) and re-synchronised at contact events, never a free-running clock (§5). | Phase robustness under large perturbations → G3 | [R] + [E] |
| 14 | Contact model | Coulomb, per material pair | Studs have rotational traction too; audit yaw resistance, rocking, patch | Turf-traction research (via Astra) | **Partly disagree:** don't model rotational traction yet. A box foot with multi-point Coulomb contact already resists yaw through distributed friction. **Measure** stance-foot yaw resistance in G3 turns and add a traction model only if the measurement demands it. | Yaw traction adequacy for cuts → G3/G6 | [H] |
| 15 | Numerics | 240 Hz, 30/4 iterations, speculative contacts | Halve dt, raise iterations, rotating-limb CCD tests, momentum closure | The Jolt docs on LinearCast; our substrate spike: at 13–15 m/s the defaults tunnel, speculative 0.25 m + adaptive substeps gave 0 tunnels | **Adopt.** The gate world uses speculative **0.02 m**; at 240 Hz a 15 m/s relative approach moves 6 cm per step. Add a **deterministic, state-triggered, capped** collision-substep rule before running contacts (G5/G6). Convergence checks at 480 Hz from G1a. | Solver sufficiency for 2–3 BW landings and leg–leg contact at speed → G4–G6 | [R] + [E] |
| 16 | Muscle models | Not considered | Borrow activation and capability constraints before any full muscle model | Geyer & Herr 2010; Geijtenbeek 2013; Zajac 1989 | **Adopt:** activation-rate limits, torque–velocity, and eccentric > concentric in the arbiter. No muscle model. | Envelope parameters → G1a (permissive), G5 (binding) | [R] + [E] |
| 17 | Football authority | "Physics never decides football outcomes" | Football cannot also insist on a player transform; unreachable actions must be adjudicated explicitly | – | **Adopt:** a **capability envelope** goes up to L5, and actions are *attempted* with their outcome *reported* (§3.4). | The interface design → before G6/G7 | [E] |
| 18 | Acceptance numbers | Timing ±15 %, straightness 10 cm/m, stop ≤ 2 steps | 3 cm foothold, 0.15 m/s speed error, 5 % convergence; fixed before acceptance; held-out set | – | **Combine** (§11); values are declared per gate *before* testing and never retuned per trial. | – | [E] |

**Where I did not simply defer to Astra:**
- rotational traction (row 14);
- splitting G1 into **G1a** (architecture swap with regression parity to C2/C3) and **G1** (stepping capability), because the risky part is the new arbiter and monitor, not stepping itself;
- the concrete G4 content (a vertical hop + a single leap);
- keeping my B + C direction and the virtual-force mechanism, now audited.

---

## 3. Control stack

### 3.1 Data flow

- **Sensed state** (pc_sense): the Jolt state, contacts, per-foot load / shear / slip / rocking / external-contact, whole-body COM, momentum, angular momentum. It is the **only** input to decisions.
- **Delays:** each layer reads the sensed state through its own configurable delay buffer ([E], §9). The actuator arbiter and Jolt never wait.

### 3.2 Rates

| rate | what runs there | why |
|---|---|---|
| 240 Hz | Jolt step; arbiter output (targets, gains, limits); L2 task controllers; sensing | Contact and motor dynamics; the current 240 Hz × 1 world |
| 60 Hz, plus events | L4 planner: N-step plan, viability, reference parameter selection, capability envelope | Planning horizons are 0.3–1.5 s; replanned immediately at liftoff, touchdown, and new external contact |
| event | plan revision on touchdown, liftoff, obstruction, slip onset, new contact | Actual contact is truth |

### 3.3 Command interface (L5 → L4), built general from the start

- **Command:** `{ vDesired: planar vector, facing: yaw, footConstraints?: [{ foot, where, when, tolerance }], action?: request }`.
- There is no "walk / run mode". The gait family is **continuous in speed and direction relative to the facing** (forward, side, back); of_loco already has one phase convention across all gaits.
- The capability envelope is reported back every planner tick: current max acceleration, deceleration and turn rate given the state and contacts.

### 3.4 Football contract ([E])

- L5 *requests*: "plant left foot near P at t ± Δ", "slide from here".
- L4 *attempts* the request, or answers "infeasible (reason)".
- Physics decides what actually happened, and **L5 adjudicates** football outcomes separately from that report. L5 never moves the body.

---

## 4. Actuator authority and budget

<!-- SVG:arbiter -->

### 4.1 One actuator per joint axis, one envelope

- **[R]** Joint torque capability depends on the joint, the direction, the angle and the velocity. Eccentric (lengthening) torque exceeds isometric; concentric torque falls with speed (Hill 1938; Anderson, Madigan & Nussbaum 2007). Activation rises and decays over tens of milliseconds (Zajac 1989).
- **[E]** Each joint axis has **one** envelope:

  τ_max(dir, q, q̇) = τ_iso(dir) · f_v(q̇, dir) · a(t)

  - τ_iso(dir) is the directional limit already in `LIMITS_V11`;
  - f_v is a torque–velocity factor (1 at rest, falling for concentric motion, up to ≈ 1.3 eccentric);
  - a(t) is an activation that may change only at bounded rates (**rise ≈ 20–40 ms, fall ≈ 50–80 ms**, [E] from Zajac-range time constants).
- **Rollout:** G1a starts **permissive** (f_v ≡ 1, activation unconstrained), so behaviour matches C1–C3. The envelope becomes binding in G5, where speed matters.
- **[R, verified]** Jolt clamps the motor's accumulated impulse per step to the configured limits, and the defaults are ±FLT_MAX. The arbiter **asserts that every motor has finite limits every step**; ours already do (`budgetLimits` per step).

### 4.2 How requests combine (no module has its own strength)

1. **Posture-target ownership, by role, one owner per joint at a time [E]:**

   | joints | owner |
   |---|---|
   | stance leg | stance controller (IK from the *actual* foot, C1) |
   | swing leg | swing controller |
   | spine, neck, arms | posture/style (reference) |
   | a limb claimed by an action (kicking leg, tackling leg) | action, **only through L4** (it becomes a special swing) |
   | everything, once the viability monitor declares no upright recovery | protective (C5) |

2. **Additive torque terms, in torque space, each tagged with a priority class:**
   - gravity compensation (Jᵀ);
   - the stance virtual force (Jᵀ F: propulsion, braking, balance);
   - the hip-strategy trunk torque;
   - the arm angular-momentum torque (C4);
   - action feed-forward;
   - reference inverse-dynamics feed-forward (style).
3. **Priority allocation when the predicted total exceeds the envelope [E].** Scale down in this order, lowest first:

   | order | class | contents |
   |---|---|---|
   | 1 (dropped first) | P4 comfort | posture smoothing |
   | 2 | P3 style | reference tracking beyond what support needs |
   | 3 | P2 task | football action |
   | 4 | P1 balance | virtual force, hip strategy, capture-driven swing |
   | 5 (kept longest) | P0 support | stance-leg weight bearing within friction and CoP feasibility |

   Within a class, scale proportionally.
4. **To Jolt:** one equilibrium-point target (posture ⊕ τ_ff / kp, as today), one kp/kd, one [lo, hi] envelope. Jolt's clamp is the hard physical guarantee that the **total can never exceed the envelope**. The allocation decides **which request loses**.

**[H] to test in G1a:** allocation is computed on a *predicted* torque (spring + damping + feed-forward at the current state). Jolt's implicit spring realises a slightly different torque. The test: saturation scenarios, where the realised P0 torque must stay ≥ 95 % of its request while P3 is dropped.

### 4.3 Passive paths are part of the budget ledger

- Joint friction (0.3–2 N·m) is logged.
- **Hard SixDOF limits** (hip, ankle, spine, shoulder, neck) and **soft hinge stops** (knee, elbow, 20 Hz). Knee and elbow limit impulses are logged. For SixDOF joints the *angle margin* is logged, because Jolt exposes no limit impulse there.
- Any limit engagement during locomotion is reported per stride. The ankle dorsiflexion stop is expected in late stance; C2 found that at the stop the limit cancels dorsiflexion torque.

### 4.4 Stiffness and damping ([E] + [H])

- **Stance gains** are justified against human joint quasi-stiffness in walking (e.g., Shamaei, Sawicki & Dollar 2013), not "as stiff as stable". Stable-PD numerics (Tan, Liu & Turk 2011) is not a license for high gains (Astra).
- **Swing gains are low**, with feed-forward (gravity + reference inverse dynamics), so the swing leg's own pendulum dynamics show. This is the main lever against the "servo" look ([H], visual gates).

### 4.5 Ledger (every gate, every run)

- **Per joint axis:** τ, q̇, P = τ·q̇, positive and negative work per stride, saturation time, and limit engagement.
- **Whole body:** the external-impulse ledger (§8.3). No unexplained momentum is allowed.

---

## 5. Support and gait state model

<!-- SVG:gait -->

### 5.1 Truth layer (existing pc_sense) [R principle: actual contact is truth]

- **Per foot:** contact points, touching, load, shear, slip, rocking state (HEEL / FLAT / TOE / EDGE), external-body contact.
- **Support mode**, derived and never scheduled: DOUBLE, SINGLE_L, SINGLE_R, FLIGHT, NON_FOOT (a non-foot body on the turf).

### 5.2 Intent layer: per-foot role [E]

`STANCE → UNLOADING → SWING → DESCENDING → LOADING → STANCE`, with these guards (events trigger; time windows only guard):

| transition | trigger (physical) | guard |
|---|---|---|
| STANCE → UNLOADING | the planner schedules the next step and the viability monitor allows it | – |
| UNLOADING → SWING | **sensed liftoff** (no touching contact and < 25 N for 3 steps, as in C2/C3) | timeout → *step aborted*: the planner re-plans |
| SWING → DESCENDING | the swing trajectory reaches its approach segment | – |
| DESCENDING / SWING → LOADING | **sensed touchdown**: a turf contact whose load is rising, at whatever place and time it happens | – |
| LOADING → STANCE | measured load ≥ an acceptance share, not slipping (C2 acceptance) | – |

**Deviations:**
- **Early touchdown:** the swing ends *now*, where the foot is; the foothold becomes the actual one and the next step is re-planned from the actual state. The foot is never driven through the turf.
- **Late touchdown:** descend at a bounded speed for ≤ Δt. With no contact → **MISSED**: the viability monitor re-plans (the other foot, an extended reach, or protective).
- **Obstructed swing:** a non-turf contact on the swing foot or shin (another player, an obstacle) → **OBSTRUCTED**. Stiffness along the contact normal drops to the swing floor, and the step is re-routed or aborted. **Contact with another body is not support** (the turf-only rule; the `externalSupport` option stays experimental).
- **Stance slip:** support is DEGRADED. Friction-limited balance uses the fixed observer.
- **Flight:** both feet AIR. A *planned* flight is ballistic: only landing preparation (leg angle of attack, retraction, pre-activation) runs. An *unplanned* flight is a viability check.

### 5.3 Phase [R: phase as a function of state (HZD); E: this form]

- **Stride phase** φ ∈ [0, 1), with the of_loco convention: right heel strike at 0, left at 0.5.
- **In stance**, φ advances with the **measured progression of the COM over the stance foot**, normalised by the planned step, blended with time only when the progression stalls.
- **In swing**, φ advances with the swing's own normalised progress.
- **At every actual touchdown or liftoff**, φ is **re-synchronised** to that event's nominal phase. A disturbed body therefore never leaves a running reference cursor behind: no elastic tether (Astra, §3.7).

### 5.4 There is no separate "recovery state machine" [E]

- **Recovery** is the same planner producing short, fast or crossover steps.
- A **stumble** is a sequence of such steps.
- A **fall** is the viability monitor finding no N-step capture: the protective module takes posture ownership, and physics decides.

---

## 6. Footstep planning

### 6.1 Models [R]

- **Walking:** LIPM / DCM capture dynamics (Pratt et al. 2006; Englsberger et al. 2015), N-step capturability (Koolen et al. 2012), and step-timing adaptation as a free variable (Khadiv et al. 2020).
- **Running:** spring-mass stance and ballistic flight, with a Raibert-style neutral point plus a velocity-error term for foot placement (Raibert 1986; Kwon & Hodgins 2010 for the IPM + reference combination).

### 6.2 Plan [E]

At 60 Hz and at every event, plan **N = 2–3 steps** from the **actual** COM state and support, and execute only the first. Each candidate step is (foot, position, yaw, touchdown time, swing duration, clearance), subject to:

1. **Reach at the predicted touchdown time:** a *time-indexed* reachable set (leg length at ≤ 99.5 %, bounded pelvis lowering, hip ROM with margin), extending C3's `_feasible`.
2. **Swing feasibility:** peak foot speed ≤ the torque–velocity envelope (C3's `vFootMax` becomes a derived quantity), and the swing path clears the stance foot (C2/C3 rules, plus the crossover route).
3. **Occupancy:** the swept volumes of other bodies (another player's legs, obstacles) at the touchdown time.
4. **Support feasibility at the new stance:** the friction cone at the planned stance load, and the CoP inside the foot's patch.

### 6.3 Regulation [R + E]

- **Speed:** the foothold offset from the capture point / neutral point, plus step timing.
- **Turning:** the foothold yaw, plus the stance-hip yaw moment, each limited per step by hip twist ROM and measured stance-foot yaw traction (§2 row 14).

### 6.4 Viability monitor = the same planner in "can I capture?" mode [E]

Outputs, each recorded with its reason:

| output | meaning |
|---|---|
| NOMINAL | continue the nominal gait |
| MODIFIED | a single-step correction |
| SEQUENCE | a multi-step stumble |
| NO_CAPTURE_FOUND | → protective |

"Planner found none" is recorded **separately** from physical inevitability (Astra, §1.6). This replaces both the C3 refusal latch and the C1 release rule.

---

## 7. Reference-motion role

### 7.1 Source [E]

`anim3d/of_loco.js`, the existing presentation-layer gait family for this exact rig:
- IDLE / WALK / JOG / RUN / SPRINT parameter sets at 0 / 1.45 / 3.0 / 5.5 / 8.2 m/s, blended by speed on **one phase convention**;
- stance fractions 0.80 / 0.62 / 0.42 / 0.36 / 0.30;
- a flight phase, swing retraction, lean from acceleration, trunk twist toward the facing, backpedal.

It uses the same bone-rotation conventions as D6's reference keys, so it maps to physics joint targets the same way (ROM-clamped). Later, football actions get their own reference clips (kicks, slide entry).

### 7.2 What reference data controls vs what it never controls

| reference controls (as preferences, P3 style priority) | reference never controls |
|---|---|
| swing-leg shape (knee flexion profile, hip path) | root position, velocity, heading |
| stance-leg nominal knee flexion (compliance, loading response) | foot world placement, touchdown time |
| pelvis rotation and obliquity, trunk counter-rotation | stride length and cadence (the planner decides; the reference's preferred cadence–speed curve is a *cost term*) |
| lean *preference* vs planned acceleration | support, liftoff or landing decisions |
| arm swing and elbow, head stabilisation | anything under saturation (P3 is dropped first) |
| relative phase relations (arms opposite legs, heel-strike phases) | – |

### 7.3 Sampling rule [E]

The reference is sampled at the **measured** φ, at the **measured** speed and direction relative to the facing. **There is no independent reference cursor.** Toe curves (the physics foot has no toe joint) map to a foot-pitch preference only.

**[H]** of_loco's kinematic curves may be dynamically infeasible in places (they were designed with a toe joint and root authority). This is flagged by the style-torque saturation share in the G2/G5 reviews.

---

## 8. Physical propulsion

### 8.1 Where forward motion comes from [R]

- M·c̈ = Σ F_ground + M·g (+ other contacts). Only the ground, or another body, can accelerate the COM.
- In the sagittal inverted-pendulum approximation, ẍ = ω²(x − p): the body accelerates forward only when the **CoP p is behind the COM**, i.e. the COM is ahead of where the stance foot pushes. The stance foot then pushes the ground backward, and static friction pushes the body forward.
- **Where the energy comes from:**
  - walking: hip extensors in early and mid stance, and ankle plantarflexors in the late-stance push-off; the knee mostly absorbs at loading (Winter 2009);
  - running: plantarflexors and quadriceps dominate support and propulsion; the arms regulate angular momentum rather than propel (Hamner, Seth & Delp 2010);
  - sprint starts: acceleration depends on *orienting* the ground force forward (Morin, Edouard & Samozino 2011).

### 8.2 The mechanisms in the controller: all internal torques whose reaction reaches the COM only through the foot [E]

1. **Foot placement is the primary speed regulator** [R].
   - A foothold short of the capture point / neutral point lets the body keep "falling" forward: it accelerates.
   - A foothold beyond it brakes.
   - Stepping *later* at the same place accelerates.
2. **Stance virtual force** (Coros et al. 2010; Pratt et al. 2001, virtual model control).
   - A desired force F on the COM becomes τ = J_stanceᵀ F on the stance-leg joints.
   - Physically, this is the joint torque the leg must produce to transmit that ground force. The reaction appears **only if** the foot grips (friction cone), the CoP stays inside the foot, and the envelope allows it; otherwise the foot slips or rolls and the force is simply not realised.
   - **This is the only feed-forward, and it is internal.**
3. **Push-off:** late-stance ankle plantarflexion and hip extension, from the reference profile plus the virtual force, rolling on the box foot's front edge ([H] G2/G4).
4. **Swing-leg retraction** before touchdown reduces braking (Seyfarth, Geyer & Herr 2003) [R]; of_loco has `retract`.

**Forbidden:** root or pelvis forces, `setVel`, support constraints, and contact-free acceleration. D6 audit: controllers call none of these, and only tests and the t = 0 initial conditions do; this audit is repeated per gate.

### 8.3 Audit, with the D6 force-plate instrument [R + E]

The force plate from D6 (`pc_jolt cfg.plateFrom`) gives the **exact GRF** on the moving character. Per stride:
- ∫F_z dt = M·g·T within ± 2 % at steady speed;
- net horizontal impulse = M·Δv within ± 5 %;
- in flight, the COM acceleration equals g within ± 2 %: no mid-air steering;
- the external ledger closes: ΔP = ∫(F_ground + other contacts) + M·g·Δt, with no residual.
- **GRF shapes vs normative** [R]: the walking vertical GRF double hump peaks ≈ 1.0–1.2 BW; the running single hump ≈ 2–3 BW at jogging to running speeds (Winter 2009; Cavanagh & Lafortune 1980).

---

## 9. Disturbance and recovery integration

### 9.1 Same pipeline, no special mode [E]

Disturbance → changed *actual* state → next planner tick (or the event) re-plans the footholds:
- **corrective placement** if one step captures;
- a **multi-step stumble** if a sequence does;
- NO_CAPTURE_FOUND → **protective**, and physics decides.

A player hit while running therefore cannot keep following the gait: the phase is state-based, the plan is re-derived, and contacts override the plan.

### 9.2 Latency layers [R structure (Astra; Pijnappels 2004; DeMers 2017) / E values]

| layer | delay | what |
|---|---|---|
| mechanical | 0 | contacts, constraints, passive properties, the **current** activation and impedance of every motor |
| feedback ("reflex") | ≈ 50 ms default, swept 0–250 | stance ankle/hip corrections, swing-leg stiffening, arm response |
| decision | ≈ 120 ms default, swept | step re-planning, action abort, protective hand-over |

Delays apply only to what a layer *observes*, never to collision or joint transmission. Activation-rate limits bound how fast any new command takes effect.

### 9.3 Priorities during a disturbance [E]

- Recovery (P0/P1) pre-empts the football action (P2) and style (P3).
- L5 is *told* (a capability drop, action infeasible). It is never allowed to decide the physical outcome.

### 9.4 What D6 contributes

- The response continuum (absorbed → local → whole-body → step → fall) is the **regression target** for the gait-time perturbation matrices.
- The same measurement code (pc_d6diag, generalised) and the force plate carry over.

---

## 10. Authored vs procedural vs physical

| element | authored / reference | procedurally planned | physically solved |
|---|---|---|---|
| gait-cycle joint shapes | of_loco curves (P3 preference) | sampled at the measured phase and speed | the realised joint angles |
| phase | the convention (RHS 0, LHS 0.5) | state-based clock + event re-sync | – |
| step location and yaw | – | N-step planner | the actual touchdown place |
| step timing | preferred cadence–speed curve (cost term) | the planner (timing adaptation) | the actual liftoff and touchdown |
| swing foot trajectory | clearance and knee-profile preferences | smooth, bounded, re-plannable path from the actual liftoff | the realised swing (can be early, late or obstructed) |
| pelvis / trunk posture | rotation, obliquity, lean preferences | lean from the *planned* acceleration | the realised trunk motion (not held vertical) |
| arm swing | rhythm and amplitude preference | phase-locked, plus the angular-momentum term | the realised arms |
| push-off | timing and profile preference | virtual force + ankle/hip feed-forward | the actual GRF (plate) |
| touchdown | – | planned target | **actual contact is truth** |
| balance corrections | – | CoP law, hip strategy, footholds | realised within friction and torque |
| impedance schedules | engineering-authored per role and phase | – | – |
| stumble / fall | – | viability monitor → sequence / protective | the outcome |

This keeps enough authored information for human-looking motion (of_loco's biomechanical curves) without canned playback: every authored quantity is a *preference at P3*, and every decision is procedural on the actual state.

---

## 11. Final gated roadmap

<!-- SVG:gates -->

**Common contract for every gate [E]:**
- **Declared up front and never retuned per trial:** fixtures, commands, morphology (V1.1), surface μ, budgets.
- **A held-out set:** other push magnitudes, directions and phases; intermediate speeds; μ variants.
- **Determinism:** ×3 in Node. Browser = Node when Puppeteer is available (currently deferred).
- **Always:** no root/pose/velocity writes; no hidden support; the external ledger closes; all motors finite.
- **Regression:** all approved suites (A/B/C1/C2/C3/D + the D6X matrix) stay hash-identical. The locomotion controller is a **new code path**, and shared-code changes need explicit approval.
- **Separate verdicts:** **physical validity** and **human motion quality** each need your visual sign-off.

### G0 — explainable disturbance mechanics: **substantially done** (D6)

- **Done:**
  - the contact and ground impulse ledger (the force plate);
  - the response continuum;
  - the friction-observer fix;
  - limit loading measured;
  - no hidden actuation;
  - the frozen-target diagnostic.
- **Remaining, folded into G1a's entry:**
  - the actuator ledger (τ, q̇, P, W, saturation, limits);
  - a 480 Hz convergence check on D6 / D6X / C3 subsets (integrated impulse within 5 % away from boundaries);
  - the internal-momentum test (a free-floating character with gravity off, driving all motors: |ΔP| < 0.5 N·s, |ΔL| < 0.5 kg·m²/s over 2 s);
  - the frozen-*command* diagnostic.

### G1a — architecture skeleton with regression parity (**proposed first implementation gate**, §15)

- **Objective:** replace C1–C3's monolith with the final architecture (arbiter, support/gait state, planner + viability monitor, task controllers) and show it **does at least what C1–C3 do**, with the same body. No new locomotion capability yet.
- **Out of scope:** walking, running, turning, reference style, the binding torque–velocity envelope.
- **Details:** in §15.

### G1 — repeatable load transfer and individual steps

- **Objective:** unload either foot, lift, place and accept weight, repeatedly and rhythmically, with no external support.
- **Implemented:**
  - rhythmic stepping in place and to placements;
  - state-based phase;
  - the swing controller v2 (low-gain + feed-forward; heel-up and progression-with-lift as defaults if G1a confirms them);
  - reference sampling (IDLE → WALK at 0 speed);
  - the latency sweep.
- **Out of scope:** travelling gait, turning, running.
- **Scenarios:**
  - 20 alternating in-place steps at step periods of 0.5 / 0.6 / 0.7 s;
  - placements forward 20 cm, back 15 cm, out 10 cm, in 5 cm, crossed 3 cm, each ×4 alternating;
  - perturbations of 15 / 30 N·s in 4 directions at 4 phases (loading, mid-stance, early swing, late swing);
  - a blocked foothold (a static obstacle on the planned spot).
- **Pass:**
  - foothold error vs the plan at liftoff: median ≤ 3 cm, max ≤ 5 cm;
  - step timing within ± 15 % of the plan;
  - stance-foot slip ≤ 1 cm per step;
  - minimum toe clearance ≥ 1.5 cm;
  - no non-foot contact in unperturbed runs;
  - 15 N·s pushes are recovered at every phase;
  - 30 N·s pushes produce an interpretable response (in place, extra step or sequence) that is monotone in impulse;
  - a blocked foothold → an alternative step or a *recorded* failure, never a pass-through.
- **Visual:** weight visibly shifts before the lift (pelvis lateral ≈ 2–4 cm); the knee flexes in swing and there is no marching; no foot drag, contact jitter or servo buzz; arms not frozen. Reviewed in slow motion from the fixed side and front cameras.
- **Failure modes:** early touchdown by toe drag (C3 finding); hip saturation on backward swings; chatter at liftoff; phase drift.
- **Performance:** controller ≤ 0.4 ms per character per 60 Hz frame (+ Jolt ≈ 0.55–0.7 ms).
- **Your decision:** approve the swing style and the default delays; approve the G2 speed set.

### G2 — walking with start, speed change and stop (straight)

- **Objective:** continuous walking generated by the body's own contacts, starting and stopping from its own state.
- **Implemented:**
  - travelling gait: foothold offset + step timing;
  - the stance virtual force;
  - push-off;
  - swing retraction;
  - full WALK reference style;
  - arm swing;
  - the GRF-shape review panel.
- **Out of scope:** turning beyond heading hold; running.
- **Scenarios:**
  - standing → 0.8 / 1.2 / 1.5 m/s;
  - 30 s at each speed;
  - 0.8 ↔ 1.5 speed changes;
  - stop from each speed;
  - perturbations of 20 / 40 N·s at 4 phases;
  - held-out: 1.0 m/s, μ 0.6.
- **Pass:**
  - steady speed error ≤ 0.15 m/s;
  - lateral drift ≤ 10 cm over 10 m and heading drift ≤ 3°;
  - reaches the commanded speed within 4 steps; stops within 2 steps, then settles in ≤ 1 s;
  - vertical impulse per stride = M·g·T ± 2 %; net horizontal impulse per stride = M·Δv ± 5 %;
  - vertical GRF double hump with peaks 1.0–1.3 BW;
  - at 1.2 m/s: double support 12–30 % of the cycle, and cadence within the human band for this leg length (≈ 95–125 steps/min);
  - slip ≤ 1 cm/step; toe clearance ≥ 1.5 cm;
  - 20 N·s pushes recovered within ≤ 3 steps; 40 N·s: interpretable, monotone.
- **Visual:**
  - heel strike → foot flat → heel rise → toe-off rolling;
  - pelvis rotation and obliquity present;
  - knee not locked in stance;
  - arms counter-swinging;
  - no robotic constant-velocity limbs, marching or skating;
  - side-by-side with the of_loco kinematic render at the same phase and speed, and with your chosen reference footage.
- **Failure modes:** the rigid 36 cm box foot's toe clearance and toe-off ([H]); virtual force outside the friction cone; style torques saturating; a walk that only works at one speed.
- **Performance:** controller ≤ 0.5 ms per character-frame.
- **Your decision:** the foot model (keep the box, or revise the collider / add a toe segment) based on the G2 measurements; human-quality sign-off.

### G3 — omnidirectional walking and constrained recovery

- **Objective:** steer, side-step, back-step, cross over, and recover when the obvious step is unavailable.
- **Implemented:**
  - footstep yaw and the stance-hip yaw moment;
  - lateral and backward gait via the direction-relative reference (of_loco backpedal);
  - the crossover route from C3, now inside multi-step plans;
  - protective hand-over (C5 evaluated, enabled only if it passes).
- **Out of scope:** curves at running speed; cuts.
- **Scenarios:**
  - turns of ±45° and ±90° while walking at 1 m/s, and in place;
  - circles of radius 2 m and 4 m at 1 m/s;
  - S-curves;
  - 3 side-steps each way; backward walking at 0.6 m/s;
  - lateral pushes of 40 / 55 / 70 N·s at 4 phases (the C3 lateral gap);
  - blocked capture foothold;
  - a stance-foot yaw-traction test.
- **Pass:**
  - path error ≤ 10 % of the radius; heading error ≤ 5°;
  - 55 N·s lateral pushes recovered with step sequences (C3 could not);
  - higher impulses end in an honest fall with protective response;
  - zero obstacle pass-throughs;
  - the yaw-traction measurement is recorded (it decides §2 row 14).
- **Visual:** natural pivots (no ice-skating turns); believable crossovers; stumbles that look like stumbles.
- **Failure modes:** hip twist and abduction saturation; foot-yaw slip; phase confusion in back-stepping.
- **Performance:** the planner's N = 3 search within ≤ 0.2 ms average at 60 Hz.
- **Your decision:** turning quality; whether a rotational-traction model is needed.

### G4 — push-off → physical flight → physical landing

- **Objective:** produce flight with the existing articulated body, then land and continue.
- **Implemented:** takeoff planning (a spring-mass stance target), landing preparation (angle of attack, pre-activation, compliant landing gains), the flight support mode.
- **Out of scope:** continuous running; jumping for headers (a later action).
- **Scenarios:**
  - **G4a:** a two-leg vertical hop in place (target flight 80–120 ms), then land and stand;
  - **G4b:** from a 1.2 m/s walk, one leap (push off one leg, flight, land on the other at a planned foothold), then continue walking;
  - a perturbation on landing;
  - held-out: different hop heights.
- **Pass:**
  - a real flight interval (no contact) ≥ 60 ms;
  - in flight, COM acceleration = g ± 2 %;
  - takeoff impulse (plate) = M·Δv ± 3 %;
  - landing foothold error ≤ 5 cm; no bounce-off > 1 cm;
  - peak landing GRF ≤ 3.5 BW for these small hops;
  - hard-limit engagement logged and ≤ 2° past margin;
  - motor positive work ≥ the take-off energy.
- **Visual:** crouch-and-extend with arm drive; soft landing with knee and ankle yielding; no pogo-stick stiffness; no hover.
- **Failure modes:** insufficient push-off from the box foot ([H]); hard ankle-stop impacts; energy injected by limits; the envelope binding too early.
- **Performance:** Jolt impacts at 2–3 BW with no solver instability at 240 Hz (convergence check at 480 Hz).
- **Your decision:** whether push-off quality requires the foot revision before G5.

### G5 — continuous jog/run and walk–run–walk transitions

- **Objective:** repeatable running with physically produced flight, connected to walking without a reset.
- **Implemented:**
  - running footstep law (neutral point + velocity term) with the flight model;
  - the JOG and RUN reference;
  - the torque–velocity envelope made **binding**;
  - deterministic adaptive collision substeps (for leg speeds);
  - swing retraction.
- **Out of scope:** sprinting, cuts, tackles.
- **Scenarios:**
  - 30 strides at 2.5 and 3.5 m/s;
  - walk 1.4 → run 3.0 → walk 1.4;
  - perturbations of 30 / 60 N·s at 4 phases;
  - held-out: 3.0 m/s, μ 0.6.
- **Pass:**
  - a flight phase every stride at 3.5 m/s;
  - stance 0.18–0.30 s (human-band);
  - vertical GRF single hump 2.0–3.0 BW;
  - speed error ≤ 0.2 m/s;
  - stride impulse balance as in G2;
  - slip ≤ 2 cm/step;
  - sustained saturation ≤ 30 % of stance;
  - walk–run transition near ≈ 2 m/s, without a reset or leg swap (Hreljac 1993: human preferred transition ≈ 2 m/s).
- **Visual:**
  - running, not shuffling: visible flight;
  - knee recovery rises with speed;
  - forward lean from acceleration only;
  - arm drive;
  - vs the of_loco kinematic twin and your footage.
- **Failure modes:** a "running" gait that is actually a fast walk; landing bounce; tunnelling in leg–leg contact (hence the substeps); envelope-limited speed.
- **Performance:** ≤ 0.8 ms controller + Jolt with substeps ≤ 1.0 ms per character-frame worst case.
- **Your decision:** running-quality sign-off; the performance direction (§13).

### G6 — the football running envelope

- **Objective:** acceleration from standstill, braking, curved runs, cuts, lateral shuffle and backpedal, inside a **measured** capability envelope; commands outside it are limited or fail physically.
- **Implemented:**
  - the start/acceleration law (forward force orientation, Morin 2011);
  - braking steps;
  - curve and cut planning (traction shared between braking and turning, a_lat = v²/R);
  - the capability envelope published to L5;
  - perturbations while running;
  - rotating-limb collision tests.
- **Out of scope:** football actions; injury; tackles.
- **Scenarios:**
  - 0 → 5 m/s starts;
  - 5 → 0 stops;
  - curves of R = 3, 6 and 10 m at 3–5 m/s;
  - 45° and 90° cuts at 3–4 m/s;
  - lateral shuffle; backpedal at 2 m/s;
  - over-envelope commands;
  - pushes while running;
  - held-out combinations.
- **Pass:**
  - the envelope table is measured and deterministic;
  - traction utilisation ≤ μ, with no hidden forces;
  - over-envelope commands degrade (wider turn, slower, extra steps, or physical loss of balance), never execute perfectly;
  - all values within declared human-plausibility bands (to be fixed at G5 review).
- **Visual:** athletic starts (low, forward-driving), plant-and-cut mechanics, believable deceleration.
- **Failure modes:** traction saturation (yaw traction again), CCD misses at high foot speeds, planner cost.
- **Performance:** measured for 4 characters in one world; worst-case contacts recorded.
- **Your decision:** the capability envelope values; the football-authority interface.

### G7 — football transitions and held-out interaction acceptance

- **Objective:** enter and leave a small set of football actions with the same bodies and ownership:
  - a slide tackle *physically attempted* from a run: lower the body, redistribute support, extend the leg, inherit momentum;
  - a plant-foot kick preparation;
  - a receiving posture.
- **Implemented:** action reference clips (P2/P3), action requests through L4, reach adjudication.
- **Validation:** the preserved **Reference Tackle as one held-out case**. The attacker jogs, hurdles and is caught; the slider runs in. It is **never tuned to reproduce**. The D6 arrival-speed issue is superseded because the slider now brings its own physical momentum.
- **Pass:**
  - pose and velocity are continuous at action entry;
  - unreachable actions are reported, not rescued;
  - collision outcomes are consistent across held-out loads, directions, timings and surfaces;
  - no action-triggered velocity injection;
  - no tackle-specific friction or collision filtering.
- **Your decision:** integration with the football simulation.

---

## 12. Test and validation strategy

- **Fixtures:**
  - initial states are deterministic: the N pose, or a previous gate's *steady-state snapshot*, which requires controller snapshots (§13);
  - commands are scripted;
  - perturbations are defined by impulse, point, direction and gait phase (the phase is triggered on the *measured* phase).
- **Instruments:**
  - **Force plate** [E]: in single-character locomotion gates **the turf itself is the force plate** (`plateFrom: 0`). Every run is then the instrumented run, and the D6 twin problem disappears.
    - **[H]** Plate-turf and static turf must agree statistically: checked in G1a on C1/C3 fixtures (outcomes and key metrics, not bits).
    - Multi-character gates use per-character plates (a layer per character).
  - **Measurement code:** pc_d6diag generalised → `pc_diag` (gait metrics, ledger, limit engagement, phase/contact agreement).
- **Regression:** approved suites (hashes) after every gate; the D6X matrix as the contact-response regression (class per case, allowing only documented boundary cases).
- **Numerics:** a 480 Hz convergence check of integrated impulses on each gate's core scenarios (≤ 5 % away from outcome boundaries).

**Motion-quality review (built into the harness from G1):**
- a slow-motion 0.1× / 0.25× and frame-step review (0.25× exists);
- fixed, non-following cameras available (to show real translation over the ground grid);
- onion-skin of previous frames;
- the **gait diagram** (per-foot contact bars: planned vs actual);
- **joint-angle curves** vs the reference and normative bands (Winter 2009);
- the **GRF curve** (plate) vs normative shapes;
- a COM top-view path;
- a footprint trail: planned vs actual footholds;
- the **of_loco kinematic twin** rendered beside the physical character at the same phase and speed;
- your reference footage beside it (comparison only, never a target).

**Motion-quality rubric (your rating, 1–5):** weight transfer, foot roll, knee/hip naturalness, pelvis/trunk, arm swing, rhythm, "robotic-ness". Plus objective proxies:
- high-frequency joint oscillation power (servo buzz);
- symmetry index;
- normalised jerk;
- the style-torque saturation share.

**Rule: a gate passes only with both verdicts.**

---

## 13. Performance and determinism strategy

**Measured today** (Node, single-threaded WASM, per 60 Hz frame = 4 steps at 240 Hz; Gate D post-fix run):

| cost | two characters | per character |
|---|---|---|
| Jolt | 1.10–1.37 ms | ≈ 0.55–0.7 ms |
| controllers | 0.17–0.85 ms | 0.08–0.43 ms |

A single character in C1 costs 0.6–0.8 ms. A naive 22-player extrapolation is ≈ 15–22 ms per frame, over a 16.7 ms frame on one thread. This is not premature to note, but it is premature to optimise.

**Rates:**
- **240 Hz:** Jolt, arbiter, sensing, stance / swing / posture controllers. [H] The stance controller may run at 120 Hz with zero-order hold; test in G2.
- **60 Hz + events:** the planner, viability monitor, reference parameters, capability envelope.

**Expensive components:**

| component | why |
|---|---|
| Jolt constraint solve | 30 velocity / 4 position iterations, 26 joints/character + contacts |
| N-step search | candidate grid × feasibility |
| split2u-style CoP allocation | convex clipping |
| IK solves | per leg, per step |

**Safe adaptive work (deterministic only):**
- fixed-size candidate sets and fixed iteration counts;
- deterministic tie-breaks;
- no wall-clock budgets;
- collision substeps chosen by a **state rule**: the relative speed of the nearest cross-character body pairs, with a **hard cap** (e.g., ≤ 4). Iterations are never changed mid-run.

**Determinism:**
- all control maths uses pc_math's deterministic functions (Math.* only for measurement);
- snapshots = Jolt state + **controller state**: phase, roles, plans, viability results, delay buffers, filters, activation states, latches;
- replay-hash tests from mid-run snapshots start at G1a;
- Browser = Node is measured when Puppeteer is available.

**Open (not decided here):**
- Jolt's multithreaded determinism in the WASM build (to verify before relying on it);
- physics in a worker;
- a physical level of detail for distant players (a product decision; must keep the same character architecture).

---

## 14. Known risks and open questions

1. **Motion quality from hand-built feedback** ("robotic").
   - Mitigations: low-gain swing + feed-forward, the reference style layer, phase-locked arms and pelvis, and the visual gates.
   - Fallback: a learned residual policy (DReCon-like) behind the same arbiter, only with deterministic inference.
2. **Foot model:** the art-fitted rigid 36 cm box boot has no toe joint, which affects toe clearance (C3 toe-drag), rocking and toe-off. The decision point is G2/G4 measurements. Options: a revised collider (rounded heel/toe) or a 15th body (toes).
3. **Lateral authority:** hip abduction 140 N·m and V1.1 geometry for lateral steps; C3's crossover limit. Tested at G3.
4. **The torque–velocity envelope may cap running speed.** That is honest, but it needs plausibility review at G5/G6.
5. **Numerics at running speed:** landing impacts and leg–leg contact at relative speeds > 10 m/s (speculative 0.02 m at 240 Hz). Needs the substep rule and convergence evidence.
6. **Performance for 22 players** (§13).
7. **Latency defaults** for the new controller (the approved gates keep zero delay).
8. **Friction:** multi-point Coulomb vs stud rotational traction (§2 row 14).
9. **The football-authority interface:** the capability envelope and action adjudication.
10. **Plate-as-turf instrumentation** ([H], checked in G1a).
11. **of_loco dynamic feasibility** as a physical reference ([H]).
12. **The D6 observations:**
    - arrival-speed sensitivity is superseded at G7 (the slider runs in);
    - shin-contact bistability stays a regression watch, revisited at G6/G7 (leg–leg contacts at speed);
    - the C3 refusal latch and the C1 release window are retired by the viability monitor in G1a (the old gates keep their approved behaviour).

**Do the listed C3/C4/C5 items block G1?**
- **C3 permanent refusal and the C1 release window:** not blockers to *fix* in the old code. The **old classifier is structurally unsuitable for gait** (single support is normal), so G1a replaces both with the viability monitor. Its first regression scenarios include the D6 transient (far foot airborne, struck foot slipping) to prove there is no latch and no premature release.
- **D6 arrival speed and shin bistability:** not blockers; documented; revisited at G7 / G6.
- **C4 reactive arms:** not a blocker. Arm swing comes from the reference plus the arm module; C4's torque-source mechanism is re-evaluated in G3 perturbations.
- **C5 protective:** not a blocker for G1–G2. It is evaluated at G3, where perturbation falls first occur during gait.

---

## 15. The exact smallest first implementation gate: **G1a, architecture skeleton with regression parity**

**Why this first:**
- The risk is not "can the body take a step". C2 and C3 already step.
- The risk is whether the **final architecture** (one arbiter, support/gait state, viability monitor, state-based phase, delayed observation) can stand, transfer, step and recover **at least as well as the old monolith**, with no new hidden authority.
- Doing this first means walking is built on the final skeleton, not retrofitted.

**Implemented (new files; the old gates untouched):**
1. **`pc_act.js` (actuator arbiter):**
   - ownership + additive torque terms + priority classes;
   - the envelope (initially permissive: `LIMITS_V11` directional limits with today's budget rule; f_v ≡ 1; an activation-rate limit present but set wide);
   - the ledger: τ, q̇, P, positive/negative work, saturation, limit engagement;
   - the assert that every motor is finite.
2. **`pc_gait.js` (support/gait state):** support mode from pc_sense; per-foot roles with event triggers (early, late, missed, obstructed); the state-based phase (single-cycle stepping only in G1a).
3. **`pc_plan.js` (planner + viability monitor):**
   - N = 2 capture-step planner (C3's foothold law, reach, swing-speed and clearance feasibility, crossover route), re-planned at 60 Hz and on events;
   - NOMINAL / MODIFIED / SEQUENCE / NO_CAPTURE_FOUND with reasons;
   - no latch.
4. **`pc_loco.js` (controller composition):**
   - the stance controller = C1's CoP law, gravity Jᵀ, hip strategy, feet-in-place, re-hosted as P0/P1 requests;
   - C2's transfer and acceptance;
   - the C3 swing, with the h0 / heelUp options on trial;
   - configurable observation delays (defaults 50 / 120 ms, swept).
5. **G0-closure diagnostics:** the 480 Hz convergence check, the internal-momentum test, the frozen-command diagnostic; **plate-as-turf** for G1a's own fixtures, with a plate-vs-static comparison.
6. **Harness:** a "Loco" suite with the gait diagram, ledger panel and slow motion (0.1×).

**Deterministic scenarios:**

| # | scenario | pass (declared) |
|---|---|---|
| S1 | quiet stance 10 s | upright; COM sway ≤ C1's ± 20 %; no saturation beyond C1's |
| S2 | weight shift L → R → L (C2 transfer, no lift) | liftoff criteria met (unload ≤ 5 % BW) within C2's time ± 20 % |
| S3 | single placement forward 20 cm, back to stance; mirrored | C2-equivalent: accepted, no bounce, foothold ≤ 3 cm |
| S4 | 10 alternating in-place steps at a 0.6 s period | all liftoffs sensed; timing ± 15 %; slip ≤ 1 cm/step; no non-foot contact |
| S5 | the C3 push set (F70, F80, F100, B40, B50, R40 in place, R55) with the new planner | **no regression:** every case C3 recovered is recovered; the failures fall honestly or improve |
| S6 | the D6 transient (far foot airborne while the near foot slips): the D6_slide fixture with the new controller as B | no latch; no release while a foot is being re-planted; still recovers (D6 continuum preserved for D6_slide / v60 / load80) |
| S7 | a 15 N·s lateral push at mid-swing during S4 | an interpretable modified step or sequence; no fall |
| S8 | a saturation test: a stance support request plus a large style request on the same joints | realised P0 torque ≥ 95 % of its request; P3 dropped first |
| S9 | the internal-momentum test (free-floating, gravity off, all motors cycling) | ΔP ≤ 0.5 N·s, ΔL ≤ 0.5 kg·m²/s over 2 s |
| S10 | the 480 Hz convergence check of S4, S5 (F80) and D6_slide | integrated impulses within 5 % (boundary cases reported) |

**Common:** determinism ×3; all approved suites hash-identical (the old controllers are unchanged).

**Performance:**
- controller ≤ 0.4 ms per character per 60 Hz frame (today's C1–C3: 0.08–0.43 ms);
- planner average ≤ 0.1 ms at 60 Hz;
- no allocation growth.

**Visual review:**
- S3 / S4 / S7 in slow motion, side and front, with the gait diagram;
- the criteria are G1's visual list, at the level C2/C3 achieved; *no worse*, plus a visible weight shift before each lift.

**Deliberately out of scope:** travelling gait, reference style (only IDLE sampling), the binding torque–velocity envelope, turning, running, football actions, D6 tuning.

**Decisions I need from you to start G1a:**
1. Approve the architecture: the one arbiter with priority classes; the support/gait state model; the viability monitor replacing the old classifier *for the new controller only*.
2. Approve **of_loco.js as the reference-motion source** (preferences at P3, sampled at the measured phase).
3. Approve the **default latencies for the new controller** (50 ms feedback / 120 ms planning, swept 0–250), while the approved gates keep zero delay.
4. Approve **plate-as-turf** for single-character locomotion gates.
5. Approve the G1a pass criteria above, or amend them before any implementation.

---

## References

Primary sources consulted or relied on. Astra-cited items were used as Astra summarised them; I did not re-read them.

- Yin, Loken & van de Panne (2007). *SIMBICON: Simple Biped Locomotion Control.* ACM TOG 26(3).
- Coros, Beaudoin & van de Panne (2010). *Generalized Biped Walking Control.* ACM TOG 29(4).
- Lee, Kim & Lee (2010). *Data-Driven Biped Control.* ACM TOG 29(4).
- Kwon & Hodgins (2010). *Control Systems for Human Running using an Inverted Pendulum Model and a Reference Motion Capture Sequence.* SCA.
- Peng, Abbeel, Levine & van de Panne (2018). *DeepMimic.* ACM TOG 37(4).
- Bergamin, Clavet, Holden & Forbes (2019). *DReCon: Data-Driven Responsive Control of Physics-Based Characters.* ACM TOG 38(6).
- Geyer & Herr (2010). *A Muscle-Reflex Model that Encodes Principles of Legged Mechanics.* IEEE TNSRE.
- Geijtenbeek, van de Panne & van der Stappen (2013). *Flexible Muscle-Based Locomotion for Bipedal Creatures.* ACM TOG 32(6).
- Pratt, Carff, Drakunov & Goswami (2006). *Capture Point.* Humanoids.
- Koolen et al. (2012). *Capturability-based Analysis and Control of Legged Locomotion, Part 1.* IJRR 31(9).
- Englsberger, Ott & Albu-Schäffer (2015). *Three-Dimensional Bipedal Walking Control Based on Divergent Component of Motion.* IEEE T-RO.
- Khadiv, Herzog, Moosavian & Righetti (2020). *Walking Control Based on Step Timing Adaptation.* IEEE T-RO.
- Wieber (2002). *On the Stability of Walking Systems* (viability).
- Westervelt, Grizzle & Koditschek (2003). *Hybrid Zero Dynamics of Planar Biped Walkers.* IEEE TAC.
- Pratt, Chew, Torres, Dilworth & Pratt (2001). *Virtual Model Control.* IJRR.
- Raibert (1986). *Legged Robots That Balance.* MIT Press.
- Blickhan (1989). *The Spring-Mass Model for Running and Hopping.* J Biomech.
- McMahon & Cheng (1990). *The Mechanics of Running.* J Biomech.
- Seyfarth, Geyer & Herr (2003). *Swing-Leg Retraction.* J Exp Biol.
- Hof (2008). *The "extrapolated center of mass" concept.* Hum Mov Sci.
- Curtze et al. (margin-of-stability cautions; via Astra).
- Pijnappels et al. (2004) (trip responses ≈ 65 ms; via Astra).
- DeMers, Hicks & Delp (2017) (pre-activation vs reflex in landing; via Astra).
- Hamner, Seth & Delp (2010). *Muscle Contributions to Propulsion and Support during Running.* J Biomech.
- Winter (2009). *Biomechanics and Motor Control of Human Movement*, 4th ed.
- Cavanagh & Lafortune (1980). *Ground Reaction Forces in Distance Running.* J Biomech.
- Hreljac (1993). *Preferred and Energetically Optimal Gait Transition Speeds in Human Locomotion.* MSSE.
- Morin, Edouard & Samozino (2011). *Technical Ability of Force Application as a Determinant Factor of Sprint Performance.* MSSE.
- Shamaei, Sawicki & Dollar (2013). *Estimation of Quasi-Stiffness of the Human Knee in the Stance Phase of Walking.* PLoS One.
- Anderson, Madigan & Nussbaum (2007). *Maximum Voluntary Joint Torque as a Function of Joint Angle and Angular Velocity.* J Biomech.
- Zajac (1989). *Muscle and Tendon: Properties, Models, Scaling, and Application to Biomechanics and Motor Control.* Crit Rev Biomed Eng.
- Tan, Liu & Turk (2011). *Stable Proportional-Derivative Controllers.* IEEE CG&A.
- Jolt Physics source, verified for this document:
  - `MotorSettings.h`: torque and force limits default to ±FLT_MAX; the spring is used for position targets.
  - `SixDOFConstraint.h`: the angular-velocity target is in body 2's constraint space; the orientation target is in body 1's; soft rotation limits are not supported.
