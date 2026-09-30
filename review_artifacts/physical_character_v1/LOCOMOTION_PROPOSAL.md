# Locomotion gate: proposal for your decision

This is the next decision after the overnight runway (`OVERNIGHT_2026-09-30_REPORT.md` §10). It is a proposal only: nothing described here has been built.

## 1. Why locomotion is the next gate (evidence from the runway)

- **The Reference Tackle needs a moving attacker.** In the reference, the attacker jogs toward the camera at ≈ 3 m/s, lifts his knee (f104), hurdles the slider (f112), and his *trailing leg is caught mid-stride* (f127). That trailing leg is moving and lightly loaded.
  - D6 shows the slider can already be driven physically from the reference's joint keys, and that a *standing, planted* defender is not tripped.
  - The catch in the reference depends on the attacker's own gait: which leg is loaded, and where it is in its swing, at the moment of contact.
- **Lateral and large pushes need step sequences.** C3 shows single-step recovery ends at about 50 N·s sideways, 100 N·s forward and 50 N·s backward for this body.
  - Lateral: a crossover needs a 5–6 m/s foot.
  - Forward/backward: the "second step needed" failures cannot be rescued by adding steps. The experiments (§3.2.2–3.2.3) rule out step policy, collider size, swing shaping, and all of them combined.
  - What is missing is *gait-quality* stepping: steps planned before the body is unrecoverable, and swings that stay within the hip's torque.
- **Every tackle in football happens between moving players.** A standing-balance foundation cannot produce the attacker's side of any contact.

## 2. Requirements (your invariants, unchanged)

- **The pipeline:** intent → sensing / support reasoning → physically achievable targets → finite motors → Jolt articulated bodies + contacts → solved state → rendered skeleton.
- **The single spatial state:** the Jolt body.
- **Never:**
  - kinematic override;
  - animation copied into physics;
  - hidden root support or dragging;
  - teleports;
  - infinite motors;
  - canned reactions;
  - animation deciding outcomes.
- **Determinism:** ×3, and browser = Node.
- **Football authority** stays separate from locomotion.
- **The 14-body V1.1 character**, with the same motors and limits. No strength increases to hit targets.

## 3. Options

| approach | how it moves the body | fit with our layers | determinism / cost | risk |
|---|---|---|---|---|
| **A. SIMBICON** (Yin, Loken & van de Panne 2007) | Finite-state pose targets per gait phase. Balance feedback moves the swing hip's target by the COM offset and velocity (d, v gains). The torso is held by stance-hip torque. | Good: PD targets are what our motors take. | Deterministic, cheap. | Gains are hand-tuned per gait, and style is poor without a reference. |
| **B. Generalized biped walking control** (Coros, Beaudoin & van de Panne 2010) | Inverted-pendulum foot placement each step. Virtual forces through Jᵀ for speed control and gravity compensation. IK swing. Stance hip for torso. | **Best.** We already have capture-point footholds (C3), Jᵀ gravity compensation (pc_balance), IK swings (C2) and stance-hip torso control (the hip strategy). | Deterministic, cheap. | Needs a gait-phase layer and swing trajectories within torque limits (tonight's finding). |
| **C. Reference-tracking with balance feedback** (Lee, Kim & Lee 2010, *Data-driven biped control*; for running, Kwon & Hodgins 2010, *IPM + mocap reference*) | A recorded or authored gait cycle is the target. Balance is kept by modulating that reference: foot placement from an inverted-pendulum model, stance and swing timing adjusted. | Good. It is D6's principle (reference = targets) plus B's balance. | Deterministic, cheap. | Needs a clean reference gait cycle (walk / jog) for this rig. |
| D. DCM / capture-point walking with whole-body QP (Englsberger 2015; Kuindersma 2016) | Plan the divergent component of motion, then solve joint torques with a QP each step. | Partial: our motors are PD with torque caps, not torque-controlled. | A QP per step in JS is heavy; determinism is fine. | Significant new machinery. |
| E. Learned imitation policy (DeepMimic, Peng et al. 2018) | An RL policy tracks the reference. | The policy outputs PD targets; that fits. | Training is expensive and GPU-heavy; inference is deterministic. | A black box; debugging contact outcomes is hard. |

## 4. Recommendation: B + C, built on the existing layers

A **gait layer** above the existing balance layer:

1. **Phase and timing.** A left/right stance FSM with contact-sensed transitions (sensed touchdown ends a swing, as in C2/C3).
2. **Foot placement.** Each step's foothold comes from the capture-point law already used by C3: an inverted-pendulum prediction plus an offset that sets the desired speed (Coros 2010; Pratt 2006). The step policy is *N-step aware*: choose this step so the next is feasible (Koolen 2012).
3. **Swing.** Trajectories are planned in joint space within the hip and knee torque limits: the heel-up / early-progression findings of §3.2.3, with toe clearance for the 36 cm boot.
4. **Stance and torso.** The existing controller's Jᵀ gravity compensation and hip-strategy torso control, plus a virtual forward force for speed (Coros 2010).
5. **Style.** A reference gait cycle (walk, then jog) supplies the *joint targets* for the non-balance joints and the nominal leg shapes. Balance only modulates it (Lee 2010; Kwon & Hodgins 2010). This is how D6 already uses the reference.

**Why B + C?**
- They reuse almost everything the gates built.
- They keep every invariant, and they are deterministic and cheap: tonight's per-frame cost is 0.8–2 ms, so gait fits many times over in a 16.7 ms frame.
- They give the attacker's *style* from reference data without letting animation decide anything.

## 5. Staged gates (same validation at each: deterministic fixture, numbers, interactive review, known failures, regression)

| gate | objective | pass criteria (proposed) |
|---|---|---|
| L1 | Stepping in place, rhythmic | 20 steps, both feet, no support; ξ stays captured; step timing within ±15 % |
| L2 | Walk forward 1.0–1.5 m/s, start and stop | 10 m, straight within 10 cm/m; stop in ≤ 2 steps |
| L3 | Jog 2.5–3.5 m/s (the attacker's speed) | 20 m; flight phases sensed; foot placement from the capture law each step |
| L4 | Turns and speed changes | ±45° turns and 1 ↔ 3 m/s changes within 3 steps |
| L5 | Pushes during gait | the C3 pushes during walk and jog; recover with step sequences (the lateral / stagger gap closes here) or fall honestly |
| L6 | The attacker from the reference | jog + knee lift + hurdle from the reference's attacker keys as targets; then the D6 slider meets him: the Reference Tackle |

## 6. Risks and what tonight already measured

- **Toe clearance.** The art-fitted 36 cm boot and 30° dorsiflexion make toe clearance the main swing risk. Tonight: the forefoot skims at 6–11 mm in pitched swings; a boot-sized collider does *not* fix stepping.
- **Hip torque.** It saturates in fast swings (hip extension at 230 N·m × strength). Gait swings must be planned inside it; no strength increases.
- **Stance width.** The 32 cm stance width (the rig's feet) makes lateral steps long.
- **Impact stiffness.** How firmly authored actions are tracked sets impact penetration (D6). The jog's footfalls and the tackle both need a tracking-stiffness choice.

## 7. Decisions needed from you

1. **Approach:** B + C (recommended), or pure SIMBICON (A), or a learned policy (E)?
2. **Reference gait source:** author a walk and jog cycle for this rig, or use recorded data if you have it?
3. **Speeds and acceptance:** are L2 1.0–1.5 m/s and L3 2.5–3.5 m/s the right targets? Are the pass criteria in §5 right?
4. **Order:** L1 → L6 as listed, or go straight to the attacker's jog (L3) after L1?

## 8. References

- Yin, Loken & van de Panne (2007), *SIMBICON: Simple Biped Locomotion Control*, ACM TOG 26(3).
- Coros, Beaudoin & van de Panne (2010), *Generalized Biped Walking Control*, ACM TOG 29(4).
- Lee, Kim & Lee (2010), *Data-driven Biped Control*, ACM TOG 29(4).
- Kwon & Hodgins (2010), *Control Systems for Human Running using an Inverted Pendulum Model and a Reference Motion Capture Sequence*, SCA 2010.
- Kwon & Hodgins (2017), *Momentum-Mapped Inverted Pendulum Models for Controlling Dynamic Human Motions*, ACM TOG 36(1).
- Pratt, Carff, Drakunov & Goswami (2006), *Capture Point: A Step toward Humanoid Push Recovery*, Humanoids.
- Koolen, de Boer, Rebula, Goswami & Pratt (2012), *Capturability-based Analysis and Control of Legged Locomotion, Part 1*, IJRR 31(9).
- Englsberger, Ott & Albu-Schäffer (2015), *Three-Dimensional Bipedal Walking Control Based on Divergent Component of Motion*, IEEE T-RO 31(2).
- Peng, Abbeel, Levine & van de Panne (2018), *DeepMimic*, ACM TOG 37(4).
- Maki & McIlroy (1997), *The role of limb movements in maintaining upright stance: the "change-in-support" strategy*, Phys Ther 77(5).
