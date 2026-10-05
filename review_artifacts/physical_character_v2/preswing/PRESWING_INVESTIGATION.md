# Pre-swing / contact-boundary investigation (diagnostic; candidate chosen, validation preregistered separately)

**Inputs:**
- **Authority:** `../sources/2026-10-05_user_instruction_preswing_contact_boundary_runway.md`. E1a is not rerun here; E1b and G4 are not started.
- **Literature:** `research/BIOMECHANICS_REVIEW.md` and `research/CONTROLLER_REVIEW.md` (delegated reviews, recorded unchanged in substance).
- **Evidence:** `evidence/lab_*.tgz` (manifests + results; `evidence/summarise_lab.mjs`), `evidence/lab_bm*_compact.tgz` (external-lift matrices without per-tick rows), `evidence/diag_scripts.tgz`.

All switches are **default OFF**. KV0 was identical after every edit, and the suite passes 58 / 58.

## 0. Bottom line

**Candidate P\*** (for preregistered validation):
- **B1** (`ffLockedAxis`, the separately verified feed-forward bug fix);
- **touchRest:** vertical target at the surface, plus a seat of loadOff / 2 through the leg's feed-forward;
- **contact-consistent desired-velocity feed-forward** `lcVff: "lin"`: the joint velocity reference is the rate of the leg's bounded IK solution under pelvis motion (and, while a swing target is commanded, under the target's own motion). It is a linearised, damped-least-squares step using the IK solver's own damping μ0, from the current solution;
- **re-seeded resting anchor** `lcTouch.reseed`: a resting foot's horizontal place and yaw follow the foot, so nothing servos them;
- the **original min(target, actual) leg frame**.

**What it changes, measured** (P\* vs C = B1 + touchRest):

| quantity | C | P\* |
|---|---|---|
| resting-foot slip during a 20° / 1 s body turn | 8–13 mm, at the friction limit | ≤ 1.9 mm |
| slip under a 5 N·s forward push | 11 mm | 3.9 mm |
| 5 mm lift hover error (2.5 cm) | ≤ 2.6 mm | ≤ 1.3 mm |
| 20 mm lift hover error (2.5 cm) | ≤ 6.5 mm (**fails E1b-3, ≤ 5 mm**) | ≤ 0.9 mm |
| liftoff after the command | 0.25 s | 0.17–0.19 s |
| external-lift matrix (8 bodies × 30 / 60 N × drop 0 / 2.5 cm) | 0 falls; applied Δτ ≤ 32 N·m | 0 falls, 0 chatter; applied Δτ ≤ 11 N·m |
| G2 | 2.2b symmetry 9 / 12 | all gating rows; 2.2b 12 / 12 |

## 1. What should be controlled vs what should emerge (research synthesis)

The two reviews agree:
- **Humans:** the pre-swing foot is not position-servoed. It rolls about the forefoot, its horizontal force falls with its vertical force, and it passes through the 0.1–0.5 % BW regime in about 1 ms.
- **Robotics:** a contacting foot is held by the contact constraint plus friction. The joint PD that drives it is fed a *contact-consistent* desired velocity (WBLC, WBIC, MIT Atlas), and horizontal targets re-seed to the current pose.
- **Animation:** de Lasa 2010 anchors only along the normal and damps relative to the ground.
- **Friction torque of a lightly loaded foot** is about 0.02–0.1 N·m, so yaw servoing overpowers friction.

| quantity | owner in P\* |
|---|---|
| vertical contact (stay on the surface, small preload) | **controlled:** surface target + seat loadOff / 2 (validated in the touch-rest work) |
| horizontal place and yaw while resting | **emergent:** friction / contact. The anchor re-seeds to the foot, so no servo pulls it back after a slip or pivot |
| leg damping relative to a moving pelvis | **removed** by the contact-consistent velocity reference. A still foot is not dragged, and damping still resists the foot's own motion |
| swing (commanded target) | **controlled:** existing servo + velocity reference of the commanded trajectory; starts from the current (re-seeded) pose |
| pivots, slips, micro-slip, foot rocking | **emergent** |

## 2. Mechanisms re-established (corrections to the touch-rest record, TR-3)

- **R7's "drift" is rotation, not slip.** The contact point stays fixed; utilisation is 0.3–0.5 against boot–turf μ 1.2; the foot rocks ≤ 0.4°. The new metric is contact-point slip: the velocity of the material point at the measured CoP, integrated while loaded.
- **G2 2.2b under C** is the released foot's airborne excursion during push recovery, straddling the 20 mm relocation line. There is also a **no-plan re-acceptance gap** (§7).
- **The leg's joint damping is the drag source:**
  - the implicit motor τ = τ0 − (D + dt·K)·ω acts on the joint's relative velocity;
  - when the pelvis moves over a still foot, ω ≠ 0;
  - so the damping pushes on the foot: 8–13 mm slip during turns with C, up to 36 mm with follow-targets alone.

## 3. Design comparison (`tools/preswing_lab.mjs`)

**Lab conditions:** 4 body / foot cases × 11 scenarios, all at drop 2.5 cm:
- fast 2 s transfer;
- ±20° turn;
- 5 N·s pushes F / B / toward / away;
- pelvis bumps ±5 mm;
- 5 mm (E1a) and 20 mm (E1b) lifts.

### Horizontal-hold options the user asked for, measured

| option | resting slip in turns | pushes (F / away) | swing hover error 5 / 20 mm | notes |
|---|---|---|---|---|
| present anchor servo (C) | 7.8–13.5 mm (utilisation 1.2: sliding) | 11.1 / 5.2 mm | 2.6 / 6.5 mm | dragged by joint damping |
| vertical-only anchoring, follow horizontal + yaw (no velocity reference) | 31–36 mm | 18 / 2.1 mm | 2.6 / 6.5 mm | worse: zero stiffness, drag unchanged |
| compliant / force-bounded hold | — | — | — | not built. Both reviews show a bound on the anchor force cannot remove damping drag (the drag source); the robotics review ranks it below the contact-consistent reference and notes it needs re-seeding anyway (otherwise snap-back after saturation) |
| **contact-consistent velocity reference + re-seed (P\*)** | **≤ 1.9 mm** | **3.9 / 0.9 mm** | **1.3 / 0.9 mm** | the established approach (§1) |

### Iterations that failed (kept; each with its measured reason)

| variant | failure | lesson |
|---|---|---|
| backward difference of IK targets as velocity reference, with follow targets | follow targets make the reference equal the foot's own velocity, so damping is cancelled: a −5 mm bump rotated a foot 29.5°, relocations | the reference must be the **still-foot** velocity, not the target's derivative |
| backward difference (anchor targets) | 45 N·m torque step when anchor re-captures were differentiated | never differentiate discrete re-captures |
| "split": IK **re-solve** with the previous pelvis frame | external-lift harness: τ0 steps 300–31 000 N·m, energy closure 8.6 J / tick, 1 fall | separately converged bounded-IK solutions differ by tolerance / branch noise near the straight-knee singularity |
| passivity bound (clamp the reference to the actual joint velocity) | flips 0 ↔ 70 N·m at the knee; cancels damping of *externally caused* motion | wrong reference for externally driven motion |
| linearised rate on r_prev alone | an unreached target's residual became a spurious step | linearise the **difference** of residuals |
| minimum (terminal) solver damping in contact ("linmin") | excellent resting foot, but 50 000–95 000 N·m τ0 steps for straight legs (external lift) | damped least squares is needed near the singularity: solver μ0 |
| actual-pelvis frame (`lcTouch.frame "actual"`) | delivers the full seat (3–4.8 N) and looks best in the lab, but **reproduces documented counterexample 6 (strut)**: after a 60 N lift the landed foot is pressed at 45–52 N; abort; fall 8 / 8 | the min(target, actual) frame stays |
| no-plan intent `nullWanted` (a foot in contact is wanted) | 25 N·s lateral push **falls**: no low-load release, so an unloadable foot stays in support | release on low load is essential |
| no-plan acceptance-only `nullAccept` | accepted after 100 ms on a 1-piece tilted contact; the foot shot 12 cm at 1.4 m/s | re-admission needs a settled flat contact; not pursued (§7) |

## 4. Robustness: external-lift harness (the matrix that found the strut)

8 bodies × 30 / 60 N × pelvis drop 0 / 2.5 cm, k 0.13 (`evidence/lab_bm*_compact.tgz`):

| config | falls | chatter | applied Δτ max | τ0 Δ max | closure max / tick |
|---|---|---|---|---|---|
| C | 0 | 0 | 32.3 N·m | 98.9 | 5.7e-3 J |
| P\* | **0** | **0** | **11.1 N·m** | 60.5 | 7.1e-3 J |

## 5. R3: contact boundary

- **Touch is a proximity sense:** a contact point with separation ≤ 0.5 mm.
  - Resting penetration is 0.00–0.03 mm and the airborne load is exactly 0 (E1 prereg §1), so resting vs airborne has a ≥ 17× margin.
  - The touch-rest R3 hover was commanded exactly at the gap.
- **Slow threshold crossings** (redesigned test; `evidence/lab_xlab.tgz`), C on 6 body / foot cases:
  - conditions: 2 mm over 2 s and over 5 s, so the 0.5 mm gap is crossed at about 1 and 0.4 mm/s; drops 2.5 and 1 cm;
  - every run: exactly 1 AIRBORNE entry and 1 TOUCHDOWN, 0 chatter, 0 bounce;
  - the 2 mm dwell is held at 1.98–2.00 mm clearance.

  **So spatial hysteresis is not physically or numerically justified.** The sense does not flicker on slow crossings, and the lifecycle's time debounces handle impacts.
- **Servo accuracy does need improvement, independently of R3:**
  - C's 20 mm hover error (6.5 mm) exceeds E1b-3 (≤ 5 mm). P\* gives 0.9 mm.
  - The dwell height for the redesigned test comes from this characterisation: hover error ≤ 1.3 mm, so 2 mm keeps the error band clear of 0.5 mm. It is not chosen from the R3 failures.

## 6. R1: straight-leg rebound

- **The sensed load tracks the controller's own command within 1–2 N.** The command itself is the lever-rule share.
- **The share is not physically necessary:** the CoP target lies 31–41 mm *inside* the stance foot's region. That is the pre-existing share leak, and B3 targeted the same mechanism.
- **Why it decays slowly:** after a fast transfer on straight legs the COM converges slowly (5 → 1.3 mm/s), so the leak decays slowly.
- **Status:**
  - genuine pre-existing debt: the original configuration does the same;
  - not contact semantics;
  - E1a at its protocol values releases ≤ 1 s after the ramp end, within its 2 s time-out.
- **G4 implication:** walking transfers are fast, so the load allocation must honour the plan when the stance foot can realise the CoP (a plan-consistent, continuous allocation). It should be designed with G4 and does not block E1.

## 7. G2 with no plan: the landed foot stays resting

- **What happens:** after a 25 N·s lateral push the released, then landed, foot rests in TOUCHDOWN at about 1 N, and the body ends on one leg.
- **Under the qualified configuration** it was re-accepted through the old hold's pressing side effect, which counterexample 6/7 analysis had tried to limit.
- **G2's rows pass** (recovered = no fall and slip ≤ 20 mm; 2.2b 12 / 12).
- **Why it is left as is:**
  - quiet standing with no plan has no intent to re-admit the foot, and "contact ≠ support" is the lifecycle's design;
  - both default-intent rules tried were refuted (§3);
  - E1 and G4 always carry an explicit plan, and E1b's abort sets λ back to bilateral.
- **Recorded as a semantic gap:** a standing-intent rule needs a settled-flat-contact condition and its own validation.

## 8. Football evaluation of P\*

| requirement | P\* |
|---|---|
| no artificial world-space pinning | yes. The anchor re-seeds to the foot; nothing pulls it back after a slip or pivot. The vertical surface target acts through finite actuators |
| no hidden support force | yes. The seat goes through the leg's own feed-forward and is subtracted from the other foot's command; authority writes 0; external impulse = scheduled only |
| legitimate pivots / slips not suppressed | yes. Yaw and horizontal place are left to friction; the velocity reference removes only drag, not the friction-limited contact; slips stay where they end |
| no energy creation | closure ≤ 0.014 J / tick in the lab; ≤ 7e-3 J / tick in the external-lift matrix |
| clean transition into swing | swing starts from the current (re-seeded) pose with the commanded trajectory's velocity reference; liftoff 0.17–0.19 s after a 0.4 s command; one AIRBORNE / TOUCHDOWN per lift |

## 9. Limits measured (all configurations alike; not P\* regressions)

- **10 N·s push away from the released foot:** 6–8 / 8 falls in every configuration, the original included. This is a capacity limit.
- **30° turn in 1 s over a released foot:** no configuration settles. This is the known missing active stance-ankle yaw path (E1b-17 debt).
- **5 mm lift at 1 cm drop:** hover error 4.3–5.6 mm in every configuration (a straight-leg servo limit). E1a and E1b run at 2.5 cm.

## 10. B1 on its own merits

- **Evidence:** the bench and the G2 symmetry with B1 alone (12 / 12) are recorded in TR-2.
- **Pending:** the full G0–G3 regression with B1 alone (`evidence_b1_regression/`).
