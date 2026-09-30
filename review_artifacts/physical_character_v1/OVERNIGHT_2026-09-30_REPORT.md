# Physical character: overnight runway report, 30 Sep 2026

Worktree `worktrees/physical-character-v1` (branch `prototype/physical-character-v1`). All work was done there. Your original tree was not touched, nothing was pushed, and nothing in the football simulation was modified.

## 1. Where I reached, and why I stopped

**Reached (in roadmap order):**
- V1.1 integration and promotion.
- C3 one-step corrective stepping.
- C4 reactive arms.
- C5 protective fall response.
- A two-character vertical slice (Gate D, 7 tests).
- The first physically honest step toward the Reference Tackle: **D6**, a slide tackle into a standing player.

**Why I stopped short of the Reference Tackle itself.** In the reference, the attacker *jogs at ≈ 3 m/s*, lifts his knee, hurdles the slider, and his *moving trailing leg* is caught. The physical character has no locomotion: it stands, balances, and takes one reactive step. Reproducing the attacker tonight would need a kinematic attacker, root dragging, or animation driving the outcome, and all three are forbidden. I also consider a gait controller an architectural decision for you, not an overnight improvisation. So the Reference Tackle is blocked on a prerequisite, and I stopped there instead of faking it (see §10).

## 2. V1.1 status: promoted working foundation

`WORKING_CALIB = "V1.1"` (pc_body.js). Every runner and the harness default to it, and V1 stays reproducible with `--calib V1`. Details: `v1_1/PROMOTION.md`.

- **A. C2 weight transfer (planned physical unloading).** The unloading foot's commanded share gets an *upper bound* that ramps to 0. The controller takes the least-effort split within that bound, and never goes below the **physical minimum**, found by exact convex clipping of (1 − a)·A ⊕ a·B ∋ p*. The liftoff criterion was not weakened; one stricter condition was added (holding ξ on the stance foot may use ≤ 80 % of the stance ankle's torque). Result: J_repeat 6/6 (V1: 5/6).
- **B. Anatomy-invalid fixtures.** Only Gate A drop E was invalid for V1.1: its authored elbow started the forearm 112 mm inside the head. It is re-authored as elbow 100 → 80°, for V1.1 only. Two findings are reported rather than tuned:
  - Drop A: +12.8 J from the position correction when the knee stop is hit carrying 341 J.
  - Drop B: a 16.4° transient past the shoulder limit, with the arm trapped under the body.
- **C. Physically useful reach.** A consistent pelvis-height band per pelvis position:
  - upper edge = reach to every intended contact;
  - lower edge = 5° stance-ankle dorsiflexion margin.

  Every placement up to the planner's anatomical limit is accepted without bounce. Envelope: forward 26 cm, backward 18 cm, outward 8.3 cm.

## 3. Gate by gate

### 3.1 V1.1 integration and promotion checkpoint: **PASS**
The objective, implementation and measurements are in §2 and `v1_1/PROMOTION.md`.
- C1: 8 stood, 37 recovered, 14 fell. PR50, DR45 and S_weak_PR40 now recover (they fell on V1).
- C2: 13 done; I_block is blocked by design.
- Determinism: 35/35 ×3. Browser = Node: 38/38.

### 3.2 C3: physics-driven corrective stepping (one step): **PARTIAL**
**Objective:** when C1 declares STEP_NEEDED, choose a foot and foothold and execute one physical step: sensed liftoff, finite-motor swing, sensed touchdown, acceptance in the new support. Otherwise fall honestly.

**Implementation (`pc_step.js`):**
- **Foothold:** LIPM prediction ξ_td = p_st + (ξ − p_st)·e^{ωT}, with the foot's weight point aimed at ξ_td + 3 cm (Hof 2008; Pratt 2006; Koolen 2012).
- **Reach:** checked at touchdown with the pelvis carried by the predicted COM, plus hip range of motion. The stance heel may rise.
- **Swing:**
  - swing-foot speed ≤ 4.5 m/s (the measured human reactive range);
  - active-lift unloading with sensed liftoff;
  - C2's knee-forward swing at reactive duration (0.25 + 0.2 s/m, ≤ 0.40 s).
- **Landing and acceptance:** landing compliance (kp × 0.35, recovering over 0.15 s); a second step is flagged only while ξ is outside *and receding*.
- **Crossover:** now planned in 3-D (§3.2.1).

**Results (29 tests, deterministic ×3, Browser = Node 29/29):**

| test | outcome | STEP_NEEDED s | liftoff +s | touchdown +s | landing err cm | recovered +s | trunk max ° | why (failures) |
|---|---|---|---|---|---|---|---|---|
| A_inplace_F50 | RECOVERED_IN_PLACE | - | - | - | - | - | 6.6 |  |
| A_inplace_B30 | RECOVERED_IN_PLACE | - | - | - | - | - | 5.9 |  |
| A_inplace_R40 | RECOVERED_IN_PLACE | - | - | - | - | - | 4.8 |  |
| B_F70 | RECOVERED_WITH_STEP | 1.054 | 0.029 | 0.254 | 5.4 | 0.55 | 14.6 |  |
| B_F80 | RECOVERED_WITH_STEP | 1.05 | 0.033 | 0.25 | 7.8 | 0.71 | 19.8 |  |
| B_F90 | RECOVERED_WITH_STEP | 1.042 | 0.037 | 0.204 | 26.6 | 0.63 | 19.8 |  |
| B_F100 | RECOVERED_WITH_STEP | 1.038 | 0.037 | 0.246 | 10.1 | 0.75 | 22.3 |  |
| B_B40 | RECOVERED_WITH_STEP | 1.3 | 0.037 | 0.225 | 5.5 | 0.96 | 9.2 |  |
| B_B50 | RECOVERED_WITH_STEP | 1.046 | 0.033 | 0.196 | 13.8 | 0.91 | 8 |  |
| B_B60 | STEPPED_FELL | 1.038 | 0.037 | 0.192 | 26.6 | - | 93.4 | ξ still outside after the step (2nd step needed) |
| B_R55 | FELL_NO_STEP | 2.004 | - | - | - | - | 95.6 | best foothold leaves ξ 12.7 cm outside the new support |
| B_R65 | FELL_NO_STEP | 1.379 | - | - | - | - | 104.4 | best foothold leaves ξ 12.7 cm outside the new support |
| B_R75 | FELL_NO_STEP | 1.05 | - | - | - | - | 109.2 | best foothold leaves ξ 21.3 cm outside the new support |
| B_L55 | FELL_NO_STEP | 2.017 | - | - | - | - | 96.5 | best foothold leaves ξ 12.6 cm outside the new support |
| B_L70 | FELL_NO_STEP | 1.054 | - | - | - | - | 103.7 | best foothold leaves ξ 15.0 cm outside the new support |
| B_FR70 | FELL_NO_STEP | 1.725 | - | - | - | - | 93.1 | no reachable foothold (neither foot) |
| B_FR90 | FELL_NO_STEP | 1.308 | - | - | - | - | 103.2 | no reachable foothold (neither foot) |
| B_BL45 | STEPPED_FELL | 1.567 | 0.038 | 0.379 | 4 | - | 97.6 | ξ still outside after the step (2nd step needed) |
| B_BL60 | STEPPED_FELL | 1.054 | 0.05 | 0.158 | 43.2 | - | 93.7 | ξ still outside after the step (2nd step needed) |
| C_proj_F115 | RECOVERED_WITH_STEP | 1.033 | 0.042 | 0.263 | 6.8 | 0.75 | 22.3 |  |
| C_proj_R90 | FELL_NO_STEP | 1.042 | - | - | - | - | 110.5 | best foothold leaves ξ 22.4 cm outside the new support |
| C_proj_B75 | STEPPED_FELL | 1.033 | 0.038 | 0.204 | 37.2 | - | 93.5 | ξ still outside after the step (2nd step needed) |
| D_late_F80_100ms | STEPPED_FELL | 1.146 | 0.133 | 0.254 | 51.3 | - | 91.5 | ξ still outside after the step (2nd step needed) |
| D_late_F80_150ms | STEPPED_FELL | 1.196 | 0.188 | 0.233 | 57.3 | - | 91.5 | ξ still outside after the step (2nd step needed) |
| D_late_R65_100ms | FELL_NO_STEP | 1.154 | - | - | - | - | 107.6 | best foothold leaves ξ 12.0 cm outside the new support |
| E_fric_F80_mu0.25 | FELL_NO_STEP | 1.05 | - | - | - | - | 91.5 | no reachable foothold (neither foot) |
| E_fric_R65_mu0.2 | RECOVERED_IN_PLACE | 1.054 | - | - | - | - | 6.2 | step refused (stance foot slipping); survived in place |
| F_nofoot_F160 | STEPPED_FELL | 1.025 | 0.046 | 0.308 | 28.2 | - | 91.5 | ξ still outside after the step (2nd step needed) |
| F_nofoot_B110 | STEPPED_FELL | 1.025 | 0.038 | 0.213 | 27.8 | - | 93.4 | ξ still outside after the step (2nd step needed) |

**What works:**
- Forward steps up to 100 N·s (and 115 N·s with a projected foothold) and backward steps up to 50 N·s are caught by one physical step.
- In-place controls never step.
- Late reactions, low friction, and pushes beyond any single step fall honestly, with the stated reason.
- On μ 0.2 turf, the 65 N·s lateral push is *survived in place*: the feet slide with the push and absorb the lateral momentum. That is plausible physics, not a bug.

**Visual:** F80 is a plausible reactive step with the stance heel rising (`gate_c3/sheet_F80_side.jpg`). Flagged: low swing clearance, and the landing error on B_F90 (26.6 cm).

#### 3.2.1 The lateral gap: a body limit, not a missing patch (`gate_c3/analysis/crossover/`)
A lateral or forward-right push beyond the in-place boundary (≥ 55 N·s) can only be caught by the **unloaded** leg crossing in front of the stance leg: the loaded leg cannot be unloaded in time. This matches the human data (Maki & McIlroy 1997; Mille et al. 2005). I rebuilt the crossover as a real 3-D route:
- the swing ankle passes ≥ 7 cm in front of the stance shin;
- while the footprints overlap, its sole stays ≥ 4 cm above the stance boot;
- feasibility checks the planned trajectory's peak 3-D foot speed.

Measured results:
- **Physiological cap (4.5 m/s):** every lateral and forward-right case needs **5.1–6.3 m/s**. The free foot must travel 65–85 cm from the 32 cm-wide stance, including the shin detour and a 13–19 cm lift over the art-fitted 16 × 15 × 36 cm boot. The planner refuses with that reason, and the body falls honestly.
- **Boot-sized collider (experiment only, 29 × 10.5 × 8.8 cm):** the lift drops to 13 cm, but the lateral travel does not change. Still 5.1–5.8 m/s.
- **Cap lifted to 7 m/s (a non-physiological mechanics test):**
  - the swing hip saturates from 23 % of the swing;
  - the foot lags 20–25 cm;
  - it strikes the stance shin and comes to rest *on top of* the stance boot, never touching the ground.

  Physics blocks the pass-through, as it should.
- **An earlier trigger doesn't rescue it:** at 1.05 s, R65 still needs 5.1 m/s.

Lateral recovery beyond ≈ 50 N·s needs **more than one step** (a side-step or crossover sequence), and C3 is scoped to one. All C3 hashes were unchanged by the new planner (29/29).

#### 3.2.2 Experiment: does a second capture step rescue the "second step needed" failures? (`gate_c3/analysis/multistep/`)
This is an option, `step.maxSteps`, with default 1, so C3 stays as scoped: all hashes are identical at 1. The next step is handed over as soon as ξ is beyond the hip-extended new support and receding (C1's own criterion), 0–40 ms after touchdown. Waiting for C3's 30-step failure confirmation was 0.45 s too late.

**0 of 8 are rescued.** At the handover:
- **F160:** the trailing foot would need 147 cm in 0.4 s (10.9 m/s). The body is already moving at 1.8 m/s.
- **BL60:** the trailing foot would have to cross behind the stance foot.
- **B60:** it needs 4.9 m/s; the step is executed projected, and the body still falls.

**First reading:** C3's one-step capture policy takes the *longest* first step it can, which leaves the trailing foot too far behind for any second step. Sequences would then need **N-step capturability** (Koolen et al. 2012): a shorter first step chosen so the second is feasible.

That reading is incomplete. §3.2.3 shows the first steps already *plan* a capture and fall short in execution.

#### 3.2.3 Why the "second step needed" steps fall short: swing execution (`gate_c3/analysis/swing_execution/`)
A 2-step capturability planner (Koolen et al. 2012; option `step.nStep`, default off) exposed the real cause. B60's one-step plan *already predicts* a capture (+10.6 cm), and so do the others. Every such failure is an **early touchdown** at u = 0.44–0.73 of the swing, landing 26–57 cm short (the recovered steps land 5–14 cm from plan).

Two traced mechanisms:
- **Backward (B60):** C2's rise-first profile lifts the foot in place by hip *flexion* (−9 → −24°). The hip must then reverse into extension at about 400°/s, and saturates. Hip and knee lag 5–8°, the foot drops, and the toe touches at u 0.54.
- **Late forward (D_late):** as the knee flexes behind a falling, pitched trunk, the foot pitches 3 → 19° toe-down. The 27.6 cm forefoot skims the turf at 6–11 mm and touches at u 0.48.

Tested responses:

| variant | effect |
|---|---|
| boot-sized foot collider (experiment) | does **not** help: the same early touchdowns, and the smaller sole costs a recovery |
| progression starts with the lift (`step.h0 = 0`) | F90 landing error 26.6 → 8.3 cm |
| heel-up backward swing (`step.heelUp`), the foot lifted by knee flexion | B50 13.8 → 7.9 cm; B60 touches later and closer (26.6 → 19.2 cm) but still falls |

Neither option changes an outcome. The remaining limit is the swing hip's *finite* extension torque while the body falls backward. So I kept the reviewed C3 default, and left both options in for the C3 revision.

### 3.3 C4: whole-body reactive balance (arms): **PARTIAL, kept opt-in**
**Objective:** the arms join the hip strategy, with an arms-disabled comparison.

**Implementation:** the arms act as a torque source. Their equilibrium point moves with the demanded torque, and their target velocity is their actual velocity. Braking is range-aware: when ω²/2α ≥ the remaining range, they brake. This keeps the arm from arriving at its joint stop with its momentum. The first version (equilibrium offset only) moved the arms just ~15°. The unbraked version turned three recoveries into falls.

**Results (23 pairs, deterministic ×3):**

| gate | test | outcome off → on | recovery s off → on | trunk max ° off → on |
|---|---|---|---|---|
| C1 | PF55 | RECOVERED → RECOVERED | 1.94 → 1.90 | 7.2 → 10.1 |
| C1 | PF60 | RECOVERED → RECOVERED | 2.40 → 2.31 | 9.6 → 10.6 |
| C1 | PB30 | RECOVERED → RECOVERED | 1.33 → 1.21 | 5.9 → 6.5 |
| C1 | PR45 | RECOVERED → RECOVERED | 0.83 → 0.82 | 4.9 → 5.4 |
| C1 | PR50 | RECOVERED → RECOVERED | 0.95 → **1.12** | 5.1 → 6.2 |
| C1 | PL40 | RECOVERED → RECOVERED | 1.23 → **0.70** | 4.8 → 6.1 |
| C1 | DR45 | RECOVERED → RECOVERED | 0.78 → 0.75 | 6.5 → 6.4 |
| C1 | PF65 / PF70 / PB35 / PB40 / PB50 / PR60 / PL60 / DB35 | FELL → FELL | – | – |
| C3 | B_F80 | STEP → STEP | – | 19.8 → 17.4 |
| C3 | B_F100 | STEP → STEP | – | 22.3 → 20.7 |
| C3 | B_B50 | STEP → STEP | – | 8.0 → 13.9 |
| C3 | **C_proj_F115** | RECOVERED_WITH_STEP → **STEPPED_FELL** | – | 22.3 → 93.1 |

**What it shows:**
- No in-place boundary moves. That is consistent with the ≈ 2 cm capture capacity estimated for the arms' angular momentum.
- Recovery times change by −43 % to +18 %.
- One marginal step (C_proj_F115) regresses.
- PB35's earlier "recovery" with arms was an artefact of the joint stop, and it is gone.

**Visual:** under a forward push the arms swing back, which is the physically correct reaction direction (`gate_c4/sheet_PF60_noarms_arms.jpg`). Flagged: humans also throw the arms *forward* when stepping, and that isn't modelled.

### 3.4 C5: fall transition / protective response: **PARTIAL, kept opt-in**
**Objective:** once a fall is unavoidable, make a protective response in a few representative directions.

**Implementation:** the fall direction comes from ξ − COM in the body frame, which selects a protective posture:
- forward: hands ahead, chin tucked;
- backward: sit-down (hips and knees flex, hands behind);
- lateral: the near arm toward the ground.

The posture is blended in over the balance release ramp and driven by the same finite motors (protK 0.6 for arms/neck/spine, 0.45 for legs). Nothing is kinematic, and the contacts decide the outcome.

**Results (11 falls, deterministic ×3):**

| fall | first body on the ground off → on | hands land (s after release) off → on | head impact m/s off → on | pelvis impact m/s off → on |
|---|---|---|---|---|
| C1 PF65 | foreArm_L → foreArm_L | 1.41 → 1.40 | 0.80 → **0.15** | – |
| C1 G_fall | foreArm_L → foreArm_R | 1.11 → 1.09 | 0.76 → **0.12** | – |
| C1 PB40 | pelvis → **foreArm_L** | — → 1.01 | 0.57 → **0.14** | 1.08 → 1.16 |
| C1 PB60 | pelvis → **foreArm_L** | — → 0.87 | 0.41 → **0.15** | 1.46 → 1.23 |
| C1 PR60 | foreArm_R → foreArm_R | 1.10 → 1.05 | 0.83 → 0.86 | 0.18 → 0.08 |
| C1 PR70 | foreArm_R → foreArm_R | 1.19 → 1.15 | 0.86 → **no contact** | 0.21 → 0.23 |
| C1 PL60 | foreArm_L → foreArm_L | 1.10 → 1.05 | 1.23 → 1.02 | 0.22 → 0.24 |
| C3 C_proj_B75 | pelvis → foreArm_R | 0.87 → 0.76 | 0.97 → 0.83 | 2.49 → **1.52** |
| C3 F_nofoot_F160 | foreArm_L → foreArm_L | 0.76 → 0.78 | 1.09 → **0.30** | 0.14 → – |
| C3 D_late_F80_100ms | foreArm_L → foreArm_L | 0.65 → 0.64 | 0.77 → **1.20 (worse)** | 0.11 → – |
| C3 B_R65 | foreArm_R → foreArm_R | 1.07 → 1.02 | 0.78 → 0.87 | 0.19 → 0.08 |

**What it shows:**
- Forward and backward falls clearly improve: the hands land first and head impact drops to 0.12–0.30 m/s.
- Lateral falls are mixed.
- One late-reaction case is worse.
- Hand impact speeds rise, as expected for an arm reaching out.

**Visual:**
- Forward: OFF is a rigid plank; ON reaches forward, lands on the hands and lowers onto the forearms (`gate_c5/sheet_PF65_forward_off_on.jpg`).
- Backward: ON is a sit-down fall that rolls back (`sheet_PB60_…`).
- Lateral: ON reaches the near arm toward the ground (`sheet_PR70_…`).

Flagged:
- Legs stay rather stiff in forward falls.
- The sit-down roll lifts the legs high.

**Fixed after the visual review:** a lateral fall's bracing arm stayed raised while lying on the turf, because the brace was re-aimed and held forever. The brace is now held while any segment still moves (≥ 0.3 m/s), then fades to tone over 0.5 s (`gate_c5/sheet_fade_PR70_PF65.jpg`). All 11 impact metrics are unchanged, because the fade starts after the last impact. Two variants were rejected:
- the COM speed as the rest signal;
- freezing the direction at the first ground contact, which raised PB60's head impact from 0.15 to 0.33 m/s.

### 3.5 Gate D: two-character vertical slice: **PASS (with limitations)**
**Objective:** the critical invariant. When a leg meets a leg, the bodies cannot pass through each other, and the contact changes both bodies' motion *on that contact step*.

**Implementation (`pc_gated.js`):**
- **One world:** 28 bodies and 26 joints. B is A's spec translated, and both face +z, so no controller sees a new frame.
- **Separate control:** each character has its own sensor, balance controller, stepper or sequencer, and motors.
- **Sensing the other character:** each sees the other only as an unknown external body, never as turf or self. Support comes only from turf contacts.
- **Coupling:** physics is the only coupling, and nothing decides a football outcome.

**Isolation proof (`gate_d/analysis/d0_isolation.txt`):** while apart, each character's trajectory is **bit-identical** to its own single-character run. So a second character perturbs nothing through the world or solver ordering, and every single-character gate result carries over.

**Results (deterministic ×3 with protective off and on; Browser = Node 7/7; 0 teleports and 0 velocity writes after t = 0; pelvis residual ≤ 2.4 N, so no hidden support):**

| test | first touch | closing m/s | first step the contact acts: Δv along the normal, A / B (m/s) | deepest mm | A | B |
|---|---|---|---|---|---|---|
| D0 apart (control) | none | – | – | – | upright | upright |
| D1 heel clip (C2 placement into B's heel) | A.foot_R ↔ B.foot_R | 1.14 | −0.80 / +0.06 (2 steps before touch) | 0.7 | upright, placement DONE | upright |
| D2 shoved into (80 N·s) | A.foot_L ↔ B.foot_L | 3.6–3.9 | **−1.19 / +0.44**, then −1.50 / +0.57 | 0.3 | upright, step recovered | upright |
| D3 shoulder (65 N·s lateral) | A.foreArm_R ↔ B.foreArm_L | 0.90 | −0.33 / +0.32 | 1.2 | upright, **held up by B** | upright |
| D4 shoved hard (110 N·s) | A.foot_L ↔ B.foot_L | 3.3–3.7 | −2.07 / +0.83 | 1.6 | leans on B's back ~2 s, drifts off and falls (C3's one step used) | upright |
| D5 hard shoulder (110 N·s lateral) | A.foreArm_R ↔ B.foreArm_L | 1.31 | −0.64 / +0.67 | 1.8 (8.4 with protective) | fell | **knocked down** |
| D6 slide tackle | A.foot_R ↔ B.foot_L | 3.5 | −0.27 / +0.25 at 6 mm, then **−0.51 / +1.78** on the touch step | 5.0 (sustained; ≤ 1.7 in the first steps) | slide 1.24 m, stops at 1.22 s | upright (step refused: no foothold) |

On the step the gap would close, both bodies' velocities change in opposite directions along the contact normal. Through Jolt's speculative contacts, that is 1–2 steps *before* the ≤ 0.5 mm geometric touch, never after.

**Robustness:** B's placement ±5 cm and the slide gap ±10 cm (`gate_d/analysis/robustness.txt`). In all six variants the approach was arrested on or before the touch step. One outcome flips: with the slide gap at 0.85 m, the slower arrival knocks B down (limitation 2 below).

**Visual** (`gate_d/sheet_D2.jpg`, `sheet_D4.jpg`, `sheet_D5.jpg`, `sheet_D13.jpg`):
- D2/D4 read as bumping into, then leaning on, someone's back. In D4, A stands leaning lightly on B for about 2 s (head and abdomen contacts, classifier RECOVERABLE_HIP), then drifts sideways off him and, with his one step used, falls.
- D3: A leans on B's arm and is held up.
- D5: both go down, with A draped over B's hips.

Flagged: where colliders touch, the *rendered* meshes visibly overlap (head-to-head in D4). The colliders sit 1–3 cm inside the mesh, as reported at Gate A.

**Limitations found:**
1. **Support from another body is not part of the support region.** By design, support is turf-only. The option `externalSupport` (default off) adds the other body's contact points to the classifier's region, but never to the CoP polygon. It triggers when the force the feet do not carry (whole-body reaction minus both feet's load and shear) exceeds 10 % BW for 50 ms. It engages in D3/D4 but changes no outcome (`external_support_experiment.txt`): in D4, A's fall comes from drifting off B with his one step used, not from ignored support.
2. **A tracked limb rams into contact.** In a D6 robustness variant (gap 0.85 m) penetration first reached 9.3 mm. Two causes were found and one was fixed:
   - **Fixed: the reference data broke the body's joint limits.** The trail knee was keyed at 145° (limit 140°) and the trail ankle at 48° of dorsiflexion (limit 30°). The start pose began with a joint 9.4 mm apart, and the motors pushed into the stops all slide long. The reference targets are now **clamped to the body's range of motion** (2° margin), the same rule as Gate A's re-authored fixture. Start separation is now 0.0 mm, and the gap 0.85 m case drops to 5.1 mm.
   - **Remaining: the slider's hold motors drive the leg into the contact at full strength.** Weaker slider motors reduce it (strength 0.5 → 3.7 mm, 0.25 → 2.7 mm). The solver configuration is not the lever: speculative distance, slop, iterations and sub-steps were all tested with no consistent improvement (`gate_d/analysis/solver_config_experiment.txt`). A *reactive* yield was tested and rejected (`contact_yield_experiment.txt`): the penetration happens on the impact step itself, before any reaction to the contact can act. What reduces it is the leg's stiffness *going into* the impact, i.e. how firmly an authored action is tracked. So the remedy is a tracking-stiffness (co-contraction) choice for authored actions, and it belongs in the Reference Tackle design.

   Head-on contacts are clean (0.16–0.33 mm). In the same variant, B's outcome is **sensitive**: arriving at 3.1 m/s knocks him down, while the default 3.5 m/s arrival leaves him standing.
3. **Sustained compression** (not first touch) under load: 5 mm is the configured penetration slop. It reaches 8.4 mm when a foot is trapped between a falling pelvis and the turf (D5 with protective).

### 3.6 D6: the first physical step toward the Reference Tackle: **PARTIAL**
**Objective:** use the reference as *targets*, not playback.

**Implementation:**
- **Targets:** the slider holds joint targets interpolated from the reference's *measured tackler keys* (f94 → f114: legs, spine, neck, arms; joint angles only), **clamped to the body's range of motion**. He uses the same finite motors, via the controller's hold mode.
- **Not commanded:** the pelvis orientation, root path and plants of the clip. There is no root actuator, so his orientation, his slide and where he stops are physics.
- **Initial condition:** the one authored state, at t = 0, like Gate A's drops. The f94 pose, reclined 48°, 1 cm above the turf, moving at 5.5 m/s (the reference root speed at the seat landing). **The run-up is not simulated.**
- **The defender:** B stands with the full C1 + C3 stack.

**Result:**
- The slider decelerates on the turf from 5.5 m/s to 3.5 m/s at contact.
- His lead boot meets B's left boot and then B's shin, and the contact is arrested on the step it acts.
- B's planted, loaded foot holds, so he stays upright.
- The slider sits up and rolls back, as the reference keys flex his knee.

**Visual** (`gate_d/sheet_D6_slide.jpg`): the seat landing, the slide with the left arm raised as counterweight, and the extended lead leg read as a slide tackle. It differs from the reference because the reference attacker was *running*, and his *moving, unloaded* leg was caught.

### 3.7 Key sheets
![D6 slide tackle](gate_d/sheet_D6_slide.jpg)
![D5 hard shoulder: both go down](gate_d/sheet_D5.jpg)
![D2 shoved into B](gate_d/sheet_D2.jpg)
![C3 F80 corrective step](gate_c3/sheet_F80_side.jpg)
![C5 forward fall OFF / ON](gate_c5/sheet_PF65_forward_off_on.jpg)
![C5 bracing fades after rest](gate_c5/sheet_fade_PR70_PF65.jpg)
![C4 arms OFF / ON](gate_c4/sheet_PF60_noarms_arms.jpg)

## 4. Architecture (unchanged, and confirmed in code)
The pipeline is:

intent → sensing / support reasoning (pc_sense) → physically achievable targets (pc_support C2 · pc_step C3 · reference keys D6) → finite motors (pc_balance: capture-point CoP law, hip strategy, C4 arms, C5 protective; torque-limited, budgeted) → Jolt articulated rigid bodies + contacts (pc_jolt) → solved state → rendered skeleton (pc_fit).

The Jolt body is the only spatial state.

**Audited:**
- 0 teleports and 0 velocity writes after t = 0 across C3 and D (with protective on and off).
- No support fixture: every run's world passes the clean-world check (no support constraint, exact body count).
- Pelvis external-force residual: ≈ 0.04 N in C1, ≤ 0.14 N in C2, ≤ 2.4 N in Gate D. C3's recorder does not compute it.
- No kinematic override, root dragging, separation hack, canned reaction, or animation-decided outcome.
- 14 bodies per character, unchanged.

## 5. Regressions
After every change (including the C4/C5 hooks, the crossover planner and Gate D), every approved and promoted hash is identical:

| suite | V1 (approved) | V1.1 (promoted) |
|---|---|---|
| Gate A drops | 5/5 | 5/5 |
| Gate B | 20/20 | 20/20 |
| C1 | 59/59 | 59/59 |
| C2 | 13/13 | 14/14 |
| C3 | – | 29/29 |

C4 and C5 are opt-in (off by default), so they cannot move these. Gate D adds new evidence only.

## 6. Performance (Node, single-threaded WASM, per 60 Hz frame = 4 physics steps at 240 Hz + sensing + control)
| | ms per 60 Hz frame |
|---|---|
| one character, C1 standing | 0.6–0.8 |
| one character, C2 transfer/placement | 1.0–1.4 |
| one character, C3 stepping (29 tests) | mean 0.85, max 1.10 |
| two characters, Gate D | 1.2–2.0 |

That is well inside a 16.7 ms frame. All runs were sequential, one headless browser at a time, closed after use, and at `nice` priority.

## 7. Determinism
| evidence | result |
|---|---|
| ×3 reruns | every suite reproduces ×3: C3 29/29, C4 23 pairs, C5 22 runs, D 7/7 with protective off and 7/7 on |
| Browser = Node | promotion 38/38, C3 29/29, D 7/7, cross-suite smoke 8/8 |

The only nondeterminism risk remains the one noted at Gate A: cross-*browser* determinism is inferred (single-thread, no-SIMD WASM), and Chrome = Node is measured.

## 8. Review entry point
**One harness, all gates:** `http://127.0.0.1:8171/sandbox/visual/physchar/index.html`. Your existing server on 8171 serves the worktree root.
- **suite selector:** D (two characters), C3, C2, C1, B, A;
- **test selector:** grouped per suite;
- **body selector:** V1.1 or V1;
- **toggles:** reactive arms (C4) and protective fall (C5).

Every run is simulated in the browser with the same code, and its hash is compared with Node's on the side panel.

Suggested order:
1. `?suite=D&test=D2_shoved_into`, the invariant (side panel: the per-step gap / v_n / Δv table). "go worst → approach arrested" jumps to the step.
2. `?suite=D&test=D6_slide`, the slide tackle.
3. `?suite=D&test=D5_shoulder_hard`, then the same test with **protective fall (C5)** on.
4. `?suite=C3&test=B_F80`, a caught forward step; then `?suite=C3&test=B_R65` (the lateral gap, honest fall).
5. `?suite=C&test=PF65` with **protective fall (C5)** toggled, and `?suite=C&test=PF60` with **reactive arms (C4)** toggled.

Sheets and stills are in `gate_c3/`, `gate_c4/`, `gate_c5/` and `gate_d/`.

## 9. Preservation
Local commits only, on `prototype/physical-character-v1`, nothing pushed:

| commit | content |
|---|---|
| `4dbb5a2` | checkpoint: V1 approved baseline + V1.1 candidate |
| `e14354b` | V1.1 integration + promotion |
| `1aa4f5e`, `d0d8e0f` | C3 (+ crossover experiments, recorded and reverted) |
| `40ad2fe` | C4 |
| `b0a84d2` | C5 |
| tag `checkpoint/physchar-pre-crossover` | before the second crossover attempt |
| `e4dc66a` | C3 3-D crossover planner + the infeasibility evidence |
| `4cd5526`, `d79b5b3` | Gate D + D6 |
| `9df21f0` | evidence |
| `e97f909` | multi-step experiment (default off) |
| `596b147` | C5 bracing fade |
| `cca491e`, `be5c27b` | C3 swing-execution diagnosis + swing-shaping options (default off) |
| `7c7a6fc` | harness: Gate D panel first, C4/C5 toggles in suite D |
| `963bade` | C5 lateral head-flexion experiment (not adopted) |
| `1542819` | this report |
| `f5503ba` | D6: reference targets clamped to the body's range of motion; solver experiments |
| `0dee87c` | reactive contact yield (tested, rejected) |

- **Code, evidence JSON and analysis probes** are committed.
- **Stills and sheets** (heavyweight media) follow the existing policy: they are in the worktree, uncommitted.
- **Earlier snapshots** stay untouched in `worktrees/_preserved_*`.
- **No prior evidence was deleted.**

## 10. The single most important next decision
**How the attacker moves.** Everything after this point in the Reference Tackle needs a *moving* player. The attacker jogs, lifts his knee, hurdles, and his trailing leg is caught mid-stride. Lateral recovery beyond 50 N·s needs step *sequences*, which is the same capability.

The stepping experiments (§3.2.2–3.2.3) sharpen this. The existing foothold law, acceptance and physics work step by step. Two things are missing:
- a *policy* that chooses each step for the steps that follow (N-step capturability);
- swing trajectories planned *within the hip's torque limits* (heel-up backward swings, progression with the lift), because Cartesian min-jerk swings saturate the hip and touch down early.

My recommendation is a **locomotion gate built on the existing layers**:
- authored or recorded gait cycles as joint *targets*, the same way D6 uses the reference;
- capture-point foot placement for every step, i.e. C3's foothold law run each step (Pratt 2006; Coros, Beaudoin & van de Panne 2010, *Generalized Biped Walking Control*);
- SIMBICON-style stance-hip torso control (Yin, Loken & van de Panne 2007);
- finite motors and Jolt contacts as now.

That keeps the architecture, determinism and physical causality. The alternatives would give up causality (a kinematic attacker) or determinism (a learned policy).

Smaller choices that can wait until after this:
- **Adopt the C3 swing-shaping options as defaults?** `step.h0 = 0` and `step.heelUp` improve landing accuracy but change no outcome.
- **How firmly authored actions are tracked** (co-contraction): this, not the solver, sets the slider's impact penetration.
- **Should contact with another body count as support?** The option exists (default off) and changes no outcome in these tests.

Tested and ruled out as a lever: refitting the foot collider to boot size. It does not rescue crossovers (still 5.1–5.8 m/s) or the short steps, and its smaller sole costs in-place recovery.
