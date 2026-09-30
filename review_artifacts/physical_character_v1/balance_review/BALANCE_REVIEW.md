# Independent review: Gate B and the balance architecture

**Scope.** Review only. Nothing was implemented; Touchline and the worktree code are untouched; nothing committed or pushed.

**Evidence base.**
- **Gate B's recorded runs, re-analysed read-only.** Two scratch probes (in `analysis/`):
  - centre of mass, extrapolated centre of mass (XCoM) / capture point, support polygon, and CoP from whole-body momentum;
  - per-foot ground reaction from the ankle constraint impulse.
- **Primary sources** (listed at the end).

**My position.** I built Gate B, so I have tried to review it as an outsider would: where my own report overstated things, I say so.

2026-09-29 · Jolt 5.6.0 · 240 Hz · Gabriel (190 cm, 78 kg)

---

## Summary

1. **Gate B's motor layer is sound; keep it.**
   - Jolt constraint motors with an implicit spring, a per-step torque clamp, and co-solved with contacts.
   - Six amendments are listed in §1. None of them changes the architecture.
2. **Gate B's whole-body conclusions are weaker than its report says.**
   - Re-analysing the recorded runs shows the temporary pelvis support cancelled **45 of the 46.6 N·s** of the chest shove within 0.6 s, and 25 of 45 N·s of the pelvis shove.
   - It carried about 57 N horizontally and 36 N vertically throughout the supported knee raise.
   - Without it, the knee raise **lifts the foot while the centre of mass is still on the midline**. The capture point leaves the base of support that very step.
   - The limb-level results (contact arrest, blocked hip, continuity, determinism) stand. The whole-body recovery results do not.
3. **Next step: delete the pelvis support from every balance pass criterion.** Replace it with:
   - a **support layer**, which owns contacts, the support polygon, the capture point, the contact schedule and the footholds;
   - a **whole-body target composer**, which turns support decisions into joint targets:
     - stance legs are built up from the *actual* planted foot;
     - the trunk is held in **world** orientation through the stance hips;
     - ankle and hip strategies act as target offsets.
   - Everything still acts only through the finite joint motors and the ground.
4. **Smallest next gate: Gate C1, "Feet-in-place balance, unsupported".**
   - Sensing and support state, ankle and hip strategies in double stance.
   - A physics-based classifier: recoverable / step needed / unrecoverable.
   - An honest fall transition, so no more statue falls.
   - No stepping yet. **Gate C2** adds anticipatory weight transfer, single stance and *planned* foot placement, which fixes the foot-on-foot and planted-toe cases. **Gate D** adds reactive corrective steps.

---

## 1. Is Gate B's motor architecture sound?

**Yes.** What Gate B got right:
- **The motors are the right mechanism.** Jolt's `PositionAndVelocity` motor with a `StiffnessAndDamping` spring is an implicit (stable-PD-like) drive. Its impulse is clamped per step to ±τmax·dt and solved in the same Gauss–Seidel iterations as contacts, limits and friction.
- **That is why contact wins on the arrival step,** and why tracking barely depends on the physics rate (B's error: 3.25° / 3.04° / 3.03° at 60 / 120 / 240 Hz).
- **Targets are in each joint's own anatomical coordinates.**
- **The body is never written after t = 0** (the audit counters prove it).
- **It is deterministic across Node and Chrome, and cheap** (about 0.6 ms per 60 Hz frame).
- **Balance can be built on top without changing any of this.** Every balance mechanism below operates by changing targets and gains.

**Six amendments, needed during Gate C:**

| # | issue | fix |
|---|---|---|
| M1 | **Torque limits are symmetric.** Ankle dorsiflexion gets 110 N·m where a human has about 45; the knee and hip are also asymmetric in reality. This overstates backward-push resistance. | Use Jolt's separate `mMinTorqueLimit` / `mMaxTorqueLimit` per axis. Verify the sign per axis with a one-joint test. |
| M2 | **The torque limit is a per-axis box.** A joint driven on two or three axes can exert up to √2–√3 × τmax. | Report vector magnitudes. Either scale the per-axis limits so the vector norm stays within the budget, or accept the box and document it. Decide before strength attributes exist. |
| M3 | **Damping is designed for stance and applied in swing.** The ankle kd of 281 N·m·s/rad was sized for the whole body standing on it; on a swinging 1 kg foot it is enormously over-damped. | **Contact-state gain scheduling:** stance / swing / loading-transition profiles per leg, switched from the *measured* contact state. The switch must be smooth (ramped over tens of ms). |
| M4 | **There is no feed-forward torque channel.** Jolt motors are position/velocity servos. Gravity sag (lumbar about 5–7°, stance knee) comes from pure PD. | Express desired joint torques as **equilibrium-point target offsets**: Δθ = τ_desired / kp, applied to the current angle. Use this for gravity compensation and for ankle / hip strategy torques. It stays inside the motor's clamp and implicit solve. Don't use raw `AddTorque`, which bypasses the clamp and the implicit damping. |
| M5 | **Stance-leg targets were authored**, solved kinematically from a home foot position. | Recompute them every step from the **actual** planted-foot pose (ground-up), see §8. |
| M6 | **Joint-error RMS is the headline quality metric.** It is blind to whole-body failure: E_strong scores 1.7° while jackknifed 48°. | Add task-space metrics (§11): COM / XCoM, trunk world orientation, pelvis height, foot placement, contact-schedule compliance. |

## 2. Concerns about Gate B's measurements and conclusions

I re-ran the recorded tests (inputs identical, hashes identical) and measured what the Gate B report didn't: support impulse, XCoM margin, and CoP. The full output is in `analysis/capture_point_analysis_of_gate_b.txt`.

**The measurement method is sound.**
- The net CoP from whole-body momentum sits inside the measured foot polygon (±5 mm) on 96.7–100 % of quasi-static steps.
- The total vertical ground reaction equals Mg to within 0.2–10.5 N.
- The per-foot vertical load from the ankle constraint impulse plus Newton's law on the foot sums to the total to the newton: double stance 380 / 379; single stance 704 / 26.

| # | Gate B claim | what the re-analysis shows | severity |
|---|---|---|---|
| C1 | "Deterministic shoves recover in 0.12–0.48 s without scripted recovery." | Over the following 0.6 s the **support delivered 45.0 of the 46.6 N·s chest shove (97 %)** and 24.6 of the 45 N·s pelvis shove. The chest shove still pushed the XCoM **39 mm outside** the foot polygon while supported. Unsupported (F_chest_off), the right foot unloads at +0.10 s and the XCoM leaves the remaining left foot at +0.125 s and never returns. **The whole-body recovery numbers measure the support, not the character.** Only F_limb (support 65 N) is a genuine motor recovery. | **High** |
| C2 | "Slow controlled pose tracking ≈ 3°" (knee raise B) | True at the joint level, but held with support help (about 57 N horizontal, 36 N vertical during the hold). Unsupported (B_off), **the right foot lifts at 1.36 s with the COM still within about 2 cm of the midline, while the left foot is at x = −0.16 m**: no weight transfer happened. The XCoM leaves the base of support *on the liftoff step*. The authored root shift only "worked" because the support dragged the pelvis. | **High** |
| C3 | The support is "finite, visible, defeatable" | All true. But its **target was the authored root**, so it is exactly the pattern to avoid, "pull the pelvis toward the animation", just bounded. It must not survive into balance. | High (architectural) |
| C4 | "The ankle springs are only ≈ 1.03 × mgh, so standing topples." | Correct but incomplete. The unsupported topple is a **slow control failure**: the COM creeps forward (z 0.02 → 0.17 m over 4 s) with no feedback. The XCoM leaves the base of support only at **≈ 4.9 s**, the CoP pins at the toe at 5.25 s (ankles then about 100 N·m each, near their 110 limit), and the heels lift at 5.5–5.75 s. For the first four seconds the capability was ample; **COM feedback was missing**. Peterka (2002) measured effective human stiffness at about 1.33 × gravity load, with a 150–200 ms loop delay. | Medium |
| C5 | Blocked-leg compliance: "the reaction flows through the body" | True, but the pelvis support pulled about 80 N and saturated for 2.4 s. The XCoM also left the foot polygon at 0.88 s, during the swing, *before* contact, and the support held it. The trunk-fold result is partly a consequence of the support's torque limit. It needs re-measuring unsupported. | Medium |
| C6 | "Zero geometric penetration," "stopped on its arrival step" | Holds. Jolt's own depth (≤ 0.23 mm) corroborates the approximate tapered-capsule SDF. "Arrival step" works because the 2 cm speculative contact acts one step early. That stops being true above about 4.8 m/s at 240 Hz (2 cm per step), the known fast-contact gate. | Low (a caveat, not an error) |
| C7 | Finite authority "capped exactly at 220 N·m" | Per axis only. The vector magnitude can exceed it (M2), and dorsiflexion is overstated (M1). | Low–Medium |
| C8 | Statue falls (A_off, B_off, F_chest_off) | The motors keep holding the stance pose all the way to the ground: face-down in the stance pose. That is unrealistic, and it produces the stiffest possible impacts. The balance layer needs a way to **stop requesting** posture once a fall is certain. | Medium |
| C9 | Per-foot GRF estimate | An airborne foot still reads about 26 N vertical / 80 N horizontal. The source is unverified (probably self-contact or constraint bookkeeping). It is fine for *which foot is loaded*, not for per-foot CoP control until understood. | Low |

**Conclusion.**
- **Gate B passes as a limb-control and contact gate.** Its whole-body passes should be re-labelled **"support-assisted"**.
- **None of its shove recoveries is evidence of balance.**

## 3. Recommended balance architecture

**The one rule:** every stabilising force the character exerts must be a **ground reaction produced by finite joint torques through planted feet**, or later, hands on the ground or another player. There are no external forces on the character's own bodies, ever.

```
 ┌──────────────────────── ACTION / INTENT (animation, AI, player input) ────────────────────────────┐
 │ what the body is trying to do: upper-body and swing-leg pose "style", desired trunk orientation,   │
 │ pelvis height, heading, desired COM motion (stand still / shift / later: velocity), and a SUPPORT  │
 │ INTENT (e.g. "lift R foot", "reach with R leg", later "run", "slide") — never a root transform     │
 └───────────────────────────────────────────────┬────────────────────────────────────────────────────┘
                                                 ▼
 ┌──────────────────────── SENSING / ESTIMATION (pure measurement, every step) ───────────────────────┐
 │ COM, COM velocity, XCoM ξ = c + ċ/ω0 (ω0 = √(g/h)), centroidal angular momentum;                   │
 │ per-foot contact state from Jolt manifolds (points, heel/toe/flat/air, slipping), per-foot load     │
 │ (ankle impulse + foot Newton), net GRF + net CoP (whole-body momentum); support polygon; margins;  │
 │ motor effort / saturation. Optional deterministic sensing DELAY (0 / ~100 ms).                      │
 └───────────────────────────────────────────────┬────────────────────────────────────────────────────┘
                                                 ▼
 ┌──────────────────────── SUPPORT LAYER (new) ───────────────────────────────────────────────────────┐
 │ support state machine per foot + whole-body phase (DOUBLE / SINGLE_L / SINGLE_R / FLIGHT /           │
 │ FALLING / GROUNDED); contact SCHEDULE (planned) vs contact STATE (measured); liftoff gating;         │
 │ footholds (planned now, reactive in Gate D); desired COM / XCoM reference; recovery classification │
 │ (in-place / hip / step-needed / unrecoverable) with hysteresis                                      │
 └───────────────────────────────────────────────┬────────────────────────────────────────────────────┘
                                                 ▼
 ┌──────────────────────── WHOLE-BODY TARGET COMPOSER (new) ──────────────────────────────────────────┐
 │ stance legs: ground-up IK from the ACTUAL planted foot to the desired pelvis pose (COM shift from  │
 │ balance), + ankle-strategy torque as target offsets; trunk: WORLD-frame orientation goal realised  │
 │ through the stance hip(s) (+ hip-strategy lean); swing leg: foothold / swing trajectory → IK        │
 │ relative to the ACTUAL pelvis; arms/head: action pose (+ later balance use); gravity compensation   │
 │ as target offsets; per-leg gain schedule from contact state; fall mode releases posture goals      │
 └───────────────────────────────────────────────┬────────────────────────────────────────────────────┘
                                                 ▼
          FINITE JOLT MOTORS (Gate B, amended M1–M4) → solver: contacts · friction · limits · inertia
                                                 ▼
                         solved rigid bodies (the only state) → render
```

**Where this comes from:**
- **SIMBICON** (Yin et al. 2007): world-frame torso control through the stance hip, and balance feedback on the swing hip / foot placement from COM position and velocity.
- **Generalized Biped Walking Control** (Coros et al. 2010): PD tracking, plus inverted-pendulum foot placement, plus Jacobian-transpose gravity and velocity compensation.
- **Momentum Control for Balance** (Macchietto et al. 2009): COM / CoP / angular momentum as the balance quantities.
- **Hof** (2005, 2008) and **Pratt / Koolen** (2006, 2012): XCoM / capture point as the stability condition and the foothold rule.

Everything is chosen to stay **joint-target-based**, so it composes with the Gate B motors. No whole-body QP or learned policy is needed at this stage.

## 4. The smallest next gate

**Gate C1: feet-in-place balance, unsupported.** It replaces the support for double stance and gives the character the ability to fail honestly.

| in C1 | out of C1 |
|---|---|
| **Sensing + support state:** COM, XCoM, contact states, per-foot load, polygon, net CoP, margins, delay parameter | stepping (Gate D) |
| **Stance-leg ground-up targets** from the actual feet; **trunk world-orientation** via the stance hips | liftoff, single stance, swing-foot placement (Gate C2) |
| **Ankle strategy:** CoP-reference law → ankle torque offsets (equilibrium-point) | arm wind-milling, protective reach choreography |
| **Hip strategy** when the ankle / CoP saturates | multi-step stumbling, get-up |
| **Gravity compensation** (target offsets) | locomotion of any kind |
| **Classifier** + **fall transition** (release posture goals, falling gain profile) | two players, ball, tackles |
| M1 asymmetric limits, M4 feed-forward offsets, M6 metrics | player attributes |

**Why this is the smallest:**
- It is the first point where the support can be removed from *any* pass criterion.
- It exercises every piece of the support layer except stepping.
- It produces the recoverability boundary the stepping gate needs as its trigger.

**Gate C2 (next): weight transfer and planned placement.**
- Anticipatory COM transfer before liftoff, with liftoff gated on the XCoM margin in the remaining foot.
- Unsupported single stance.
- The support layer decides *where a lifted foot comes down*: a foothold, not the animation's joint angles.
- Contact-state gain scheduling (M3).
- Re-running Gate B's B / C / D / E unsupported.
- This is where the foot-on-foot and planted-toe failures get fixed.

**Gate D: corrective stepping.** Only then two-player contact.

## 5. Exact tests

### Gate C1

Everything runs at 240 Hz, with the pelvis support **absent** (asserted: no support constraint exists in the world). Gate A and Gate B tests are kept as a regression; their hashes must be unchanged, because C1 adds a layer and doesn't edit B.

| id | test | pass condition (measured, not scripted) |
|---|---|---|
| C1-0 | **Sensing validation.** Replay Gate B A / A_off / B / E / F_* with estimation only | ΣGRF_y vs M(a−g) within 1 %; net CoP inside the measured polygon on ≥ 99 % of quasi-static steps; ΣL+R foot load = total ± 5 N; contact-state labels match contact geometry; the airborne-foot residual (C9) explained or bounded |
| C1-1 | **Quiet stance, 20 s**, from N | Stays up. COM drift < 1 cm. No growing oscillation. Sway and CoP excursions reported. Ankle effort well below saturation. KE → ~0. (A_off topples at 5.5 s; this must not.) |
| C1-2 | **Acquire stance from RELAXED** (Gate B's A, unsupported) | Settles into the stance with no fall and no overshoot oscillation |
| C1-3 | **Graded sagittal pushes at the pelvis / COM**, forward and backward: 10 → 70 N·s in 10 N·s steps, 50 ms each | Each run is classified by physics: *ankle-recovered* / *hip-recovered* / *step-needed → falls*. The boundary is reported against the LIPM prediction below. No falls in runs the classifier called recoverable. The "step-needed" flag must come **before** the visible fall (report the lead time; A_off shows the XCoM leads heel-lift by about 0.6 s). |
| C1-4 | **Graded lateral pushes** (both sides) and **chest / shoulder pushes** (with rotation) | As C1-3. F_chest's 47 N·s lateral shoulder shove must be classified correctly, whichever way it goes. |
| C1-5 | **The same pushes with a 100 ms sensing delay** | The boundary shrinks. No new instability; the controller must not oscillate with delay. |
| C1-6 | **Unrecoverable push → fall transition** | After the classifier says *unrecoverable*: posture goals are released within ≤ 150 ms, stance motors stop saturating against the fall, and the trunk and legs visibly articulate (not a plank). Time to trunk / hand ground contact and impact velocities are recorded (information only). |
| C1-7 | **Support degradation:** one foot on a μ = 0.1 patch, small push / weight shift | Slip detected (foot tangential speed while loaded). Classifier downgrades the support. Physics decides the outcome (slide, recover or fall); nothing prevents it. |
| C1-8 | **Strength sensitivity:** candidate / weak ×0.5 / strong ×2 on C1-3 | The boundary moves in the right direction. Strong must not become "unfallable" by stiffness alone; report whether it does. |
| C1-9 | **Determinism and cost** | 3/3 repeats, Chrome = Node for all C1 tests. ms per 60 Hz frame reported, split into Jolt / sensing / support + composer. |

**Expected numbers (my LIPM estimate for this body, not literature).** Standing N, COM height 1.07 m, ω0 = 3.03 rad/s. Toe edge 0.222 m ahead of the COM projection, heel edge 0.136 m behind, outer foot edges 0.244 m to the side. The impulse at the COM that an *ideal, instantaneous* CoP could still capture feet-in-place:

| direction | limit |
|---|---|
| forward | about 52 N·s (Δv 0.67 m/s) |
| backward | about 32 N·s (0.41 m/s) |
| lateral | about 58 N·s (0.74 m/s) |

Real ankle control is slower, so expect the ankle-only boundary below these and the hip strategy to extend it by a few cm of capture offset. **These are capability limits, not the behaviour we want:** Maki & McIlroy (1997) found people step well before reaching them.

### Gate C2 (preview)

- **C2-1:** "lift R" request, then anticipatory COM transfer, liftoff only when the XCoM margin in the left foot is ≥ δ, hold for 5 s, then place the foot at a planned foothold.
- **C2-2:** Gate B's B / C / D1 / D2 unsupported. No foot-on-foot; an unplanned toe-down is re-planned.
- **C2-3:** E blocked leg unsupported: brace, or honest fall.
- **C2-4:** small pushes in single stance.
- **C2-5:** regression.

## 6. What happens to the temporary pelvis support

**It is retired from the character.**
- It stays only as a **named lab fixture**. Gate B's tests keep it, so they remain reproducible. A diagnostic may use it to isolate a subsystem, for example measuring swing-foot IK accuracy with the body held.
- It is **never present in any balance or support pass criterion**, and never in production. C1 asserts it does not exist in the world.

**Is any bounded pelvis force biomechanically justified? No.**
- A person has no actuator that pushes on their own pelvis from outside. Every stabilising force is a ground reaction through the feet, or later a hand, a teammate or an opponent, each of which is its own physical contact.

**What the support was *standing in for* has a legitimate form: a virtual force.**
- Coros et al. 2010 compute a desired force at the COM or pelvis and realise it as **joint torques on the stance leg**, τ = Jᵀ·F.
- Those torques push on the ground. They are limited by the motors, by friction, and by the foot's ability to keep the CoP inside it: the foot tips if you ask too much.
- Implemented through M4 target offsets, that is the physically meaningful replacement for "pull the pelvis toward where it should be".

**Product note for later.** If gameplay ever needs super-human steadiness, express it as physically meaningful parameters (strength, foot friction, reaction delay), never as a hidden root force.

## 7. How foot contacts and support should be represented

The **support layer** owns the following. It is measured from Jolt contact manifolds and constraint impulses every step, and is deterministic.

```
FootContact (per foot) {
  state:  AIR | TOUCHDOWN | PLANTED_FLAT | ROLL_HEEL | ROLL_TOE | EDGE | SLIPPING | LIFTOFF   (with hysteresis)
  points: world contact points vs turf with depth > −0.5 mm (speculative contacts excluded), ≤ 4 per manifold
  polygon: convex hull of `points` in the ground plane                      (heel/toe/edge follow from which corners)
  load:   vertical GRF estimate  = m_foot·(a_foot − g) − F_ankle_joint     (ankle GetTotalLambdaPosition / dt)
  shear:  horizontal GRF estimate; friction use = |F_t| / (μ·F_n)
  slip:   tangential velocity of the contact patch while loaded
  anchor: the foot's ACTUAL pose at touchdown (updated, never snapped) — the reference for stance IK
  time_in_state
}
SupportState {
  phase:   DOUBLE | SINGLE_L | SINGLE_R | FLIGHT | FALLING | GROUNDED
  polygon: convex hull of all planted feet's points (+ later: hands/knees if on the ground); shrunk copy by margin δ
  com, com_vel, xcom (ξ), omega0, net_cop, net_grf, centroidal angular momentum
  margins: XCoM→polygon (signed, Hof's margin of stability), CoP→polygon, time-to-boundary (Hof)
  schedule: planned contacts (which foot, from when, target foothold) vs measured contacts
  classification: IN_PLACE | HIP | STEP_NEEDED(n) | UNRECOVERABLE  (+ timestamps, hysteresis)
}
```

**Support-foot selection:**
- In double stance, both feet support and the polygon is their hull.
- When one foot must lift (intent in C2, a step in D), **lift the less-loaded foot**, provided the remaining foot can contain the XCoM after transfer. Otherwise transfer weight first (anticipatory postural adjustment), or refuse or delay the lift.
- For reactive steps, prefer the leg on the side of the XCoM error that is unloaded. Avoid crossover and foot-on-foot footholds.

**Double vs single support:** the same machinery. The polygon shrinks to one foot, the stance-leg IK runs on one chain, and the trunk world-orientation torque comes from the one stance hip. In double stance it is split by load.

## 8. How COM / support error should change the targets

All outputs are **targets or target offsets for the finite motors**. Nothing else reaches the bodies.

- **1. Stance legs, ground-up.** Given the actual planted foot pose or poses and a *desired pelvis pose*, solve the stance-leg IK (ankle, knee, hip) for the joint targets every step.
  - The desired pelvis pose comes from the intent (height, orientation) plus the balance layer's horizontal COM goal. It is not the animation's root.
  - The legs push the pelvis there against the ground, with finite torque. They can fail: foot tips, foot slides, motors saturate.

- **2. Ankle strategy (CoP control).**
  - Desired net CoP: p* = ξ + k_ξ·(ξ − ξ_ref), clipped to the δ-shrunk polygon. This is the instantaneous capture-point control of Koolen / Pratt 2012.
  - Distribute p* to the feet (double stance: by load or proximity).
  - Per-foot ankle torque ≈ (p*_foot − ankle) × F_n,foot.
  - Apply as an M4 target offset: Δθ = τ/kp.
  - The foot geometry enforces the physical limit automatically: ask for a CoP outside the foot and the foot rotates (heel or toe lift, Goswami's foot-rotation indicator). The sensing sees the state change.

- **3. Hip strategy, when p* saturates at the polygon edge.**
  - Add a bounded trunk-lean offset in the direction that produces the needed horizontal ground reaction: Horak & Nashner's hip strategy, the flywheel in Pratt et al. 2006.
  - It is realised as a **world-frame trunk orientation target** through the stance hip(s) and lumbar / thoracic.
  - Bounded by trunk ROM and a time budget, and it decays back afterwards.

- **4. Trunk / chest.** The trunk's *world* orientation is a goal; the stance hips supply the torque (SIMBICON). This is what prevents the E-type jackknife and the forward fold over a pinned leg. The action layer can request a lean, and balance can bias it.

- **5. Pelvis height / COM height.** Through stance knee and hip IK. Lowering the COM raises ω0 slightly and widens the time-to-boundary, a useful secondary lever.

- **6. Gravity compensation.** Per joint τ_g = Jᵀ·(weights of the distal / supported bodies), applied as M4 offsets. This cuts the steady-state sag without raising stiffness, so compliance stays.

- **7. Anticipatory postural adjustment (C2).** A lift is granted only after the COM has been transferred so that the XCoM margin in the remaining foot is at least δ. **The support layer times the lift, not the animation clock.** This is exactly what B_off shows is missing.

## 9. How corrective stepping fits in later (Gate D)

**Trigger.** Physics-based, from the classifier:
- STEP_NEEDED when the XCoM is outside the (hip-extended) in-place capture region, or is predicted to leave it before a feasible swing could complete, using the temporal margin (Hof 2005);
- or *proactively*, below the physical limit, because humans step early (Maki & McIlroy 1997).

The proactive threshold is later a player attribute; C1 just measures the physical boundary.

**Foothold.**
- Place the CoP of the new foot at the **XCoM predicted at touchdown plus a small offset** (behind and outward), per Hof 2008. Equivalently, inside the 1-step capture region (Pratt 2006; Koolen 2012).
- Clip it to the reachable region (leg length, hip ROM, swing time the finite hip torque can achieve).
- Exclude the stance foot's footprint and crossover.
- Re-evaluate every step during the swing (continuous replanning), since the XCoM keeps moving.

**Swing.** A world-space foot trajectory (lift, travel, descend), converted to joint targets by **swing-leg IK relative to the actual pelvis** each step, with swing-profile gains. Touchdown is detected by contact state, not by time.

**Multi-step.** If one step does not capture, plan the next one: N-step capturability, i.e. a stumble. If no reachable foothold exists, the classifier says UNRECOVERABLE and the character falls.

**Beyond Gate D.** The same foothold machinery drives running (a contact schedule from gait phase plus XCoM-based placement, as in SIMBICON / Coros), tackling (the plant foot and slide are support intents) and being tackled (reactive steps, then the fall).

**The separation principle.**
- The **action** says *what*: kick, raise the knee, run toward, reach.
- The **support layer** says *where the feet are allowed to be and when they may leave the ground*.
- The **composer** turns both into joint targets.
- Animation joint angles for the swing leg become **style hints** (knee height, foot orientation, swing arc) that the composer respects **unless they contradict the foothold**.

## 10. Recoverable imbalance vs an unavoidable fall

**The classification ladder.** Evaluate it every step, with hysteresis and a minimum dwell time so deterministic mode switches don't chatter.

| class | condition (all physical, measured) | response |
|---|---|---|
| **IN_PLACE (ankle)** | XCoM inside the δ-shrunk polygon, and p* not saturated | ankle strategy |
| **HIP** | p* saturated at an edge, but the XCoM is within the hip-extended bound (trunk torque × time, ROM) | hip strategy + ankle |
| **STEP_NEEDED(n)** | the XCoM will leave the in-place region, or has left it, and a 1… n-step capture region is reachable | C1: flag + fall · D: step |
| **UNRECOVERABLE** | no reachable capture region (reach / time / strength); **or** the stance foot is slipping with no alternative support; **or** both feet unloaded with the XCoM beyond reach; **or** the trunk tilt and angular momentum are past what the hips can arrest | fall transition |
| **FALLING / GROUNDED** | the trunk or pelvis contacts the ground, or the COM height drops below a threshold | falling profile; later protective reach and get-up |

**Rules:**
- Physical evidence confirms the prediction: heel / toe lift, stance-ankle saturation, friction use near 1. The prediction is **never overridden** to keep the character up.
- **The controller never makes a fall impossible.** It only chooses targets within finite capability.
- The fall transition **releases posture goals**; it does not script a fall. The direction, speed and contact order of the fall remain the solver's.

## 11. Metrics and debug to expose

**Quantities:**
- **COM, velocity and XCoM:** 3D and ground projection, plus ω0.
- **Support polygon:** raw and shrunk.
- **Margins:** margin of stability (Hof) and time-to-boundary.
- **Net CoP and ground reaction:** the CoP-to-polygon margin, the momentum-derived GRF vector, and centroidal angular momentum.
- **Per foot:** state, contact points, load, shear, friction use, slip speed, anchor.

**Classification and control effort:**
- **Classifier:** the recovery class with timestamps, the **lead time** from "step needed / unrecoverable" to the visible fall, and hysteresis events.
- **Balance torque budget:** stance-ankle and hip effort ÷ limit, and CoP demand ÷ available foot lever.
- **Momentum ledger for pushes:** impulse applied, ground friction impulse, support impulse (must be **0**).

**Whole-body quality** (beyond joint RMS; M6):
- trunk world-orientation error;
- pelvis height error;
- COM / XCoM tracking vs intent;
- contact-schedule compliance: planned vs actual lift and touchdown;
- foothold error (C2 / D);
- a self-contortion indicator: pelvis-vs-intent orientation error, the one that exposed E_strong.

**Fall and cost:**
- **Fall metrics:** time from UNRECOVERABLE to first trunk / hand ground contact, and impact velocities of the head, pelvis and hands (information only for now).
- **Cost per 60 Hz frame:** Jolt / sensing / support layer / composer.

**Harness:**
- XCoM and COM markers with their ground projections.
- The polygon (raw and shrunk), the CoP and demanded CoP p*.
- Per-foot contact points coloured by state, with load bars.
- A classifier banner.
- A chart of margins against time.
- Keep the Gate B ghost and torque views.

## 12. Failure modes to watch

1. **Hiding failure with stiffness.** High gains make a statue that "passes" C1-1 but can't yield. C1-8 checks it.
2. **Balance fighting intent.** Feedback cancels the requested action; for example, a knee raise is suppressed forever. Requests must be delayed or refused *explicitly* by the support layer, not silently.
3. **Target offsets pinned at motor limits.** Continuous saturation means an effective bang-bang controller, chatter and limit cycles.
4. **Oscillation from feedback gain combined with delay.** Especially with the 100 ms sensing delay. Watch sway growth.
5. **Demanding a CoP outside the foot.** The foot rolls (heel / toe lift). If the state machine misses it, the IK keeps pushing a rolling foot.
6. **Slip misread as planted.** The stance IK drags a sliding foot, which acts like a hidden root force through friction.
7. **A stale foot anchor.** Stance targets computed from where the foot *was* produce torque spikes that look like teleport corrections.
8. **Mode chattering** at classification thresholds, which also threatens determinism. Use hysteresis, dwell times and integer-step timers.
9. **Super-human reflexes.** Zero-latency, noiseless feedback looks robotic. Human postural responses start at about 73–110 ms (Horak & Nashner 1986), and the loop delay is about 150–200 ms (Peterka 2002).
10. **Friction exploitation.** Lateral recovery that needs more than μ·N must slide, not succeed.
11. **Statue falls, or the opposite: a rag-doll collapse at the first wobble.** Watch how early the fall transition triggers.
12. **Footholds on the other foot and crossovers** (C2 / D): the exact Gate B C / D2 failure.
13. **Joint-RMS optimism** (E_strong): always read it next to the task-space metrics.
14. **Momentum accounting drift:** any non-zero support impulse or external force on the character in a balance test is a bug.

## 13. What not to implement yet

- **Out of C1:**
  - Stepping execution of any kind (Gate D), multi-step stumbling, walking, running, turning, jumping.
  - Protective arm reach and landing choreography, get-up, and learned falling policies (Ha et al. 2012; Kumar et al. 2017 are references for later).
  - Arm wind-milling or angular-momentum shaping beyond the trunk hip strategy.
  - Whole-body QP / MPC optimisation (Macchietto-style) or learned controllers (DReCon, RL). Both are possible later. The C1 design keeps a clean seam: targets in, motors out.
- **Out of Touchline scope for now:**
  - Player attributes (Strength, Balance, Agility, reaction time as ratings), fatigue.
  - Uneven terrain, slopes.
  - A second character, ball, tackles, fast swept-limb contact, the Reference Tackle.
  - Production integration, commits and pushes.
- **Never:** any external force on the character's own bodies to keep it upright, including the Gate B pelvis support.

---

## Appendix: re-analysis of the Gate B runs

From `analysis/capture_point_analysis_of_gate_b.txt`. The XCoM margin is Hof's margin of stability against the polygon of the feet's turf contacts (positive = inside).

| run | key moments |
|---|---|
| A_off (no support) | the COM creeps forward (z 0.02 → 0.17 m by 4.0 s) with the CoP following; XCoM margin 67 mm at 0.5 s, 103 mm at 4.0 s → **−30 mm at 5.0 s** (XCoM out) → CoP pinned at the toe edge from 5.25 s → feet contacts 8 → 4 (heels up) between 5.5 and 5.75 s → falls |
| F_chest (supported) | impulse 46.6 N·s → XCoM margin min **−39 mm** → **support impulse 45.0 N·s in 0.6 s** → back inside by 1.3 s |
| F_chest_off | right foot unloads at +0.10 s; the XCoM leaves the left foot at +0.125 s; CoP pinned at the left foot's outer edge (−0.25 m) → falls |
| F_pelvis (supported) | 45 N·s backward → XCoM margin min **12 mm**; support impulse 24.6 N·s |
| B (supported) | single-stance hold: COM 62 mm inside the left foot; support about 57 N horizontal, 36 N vertical |
| B_off | right foot lifts at about 1.36 s with the COM still within about 2 cm of the midline (left foot at x −0.16): the XCoM leaves the base of support on the lift step → falls |
| E (supported) | the XCoM leaves the foot polygon at 0.88 s (during the swing, before the post contact); support about 80 N; friction use up to 40 % |

**Per-foot vertical load** (knee raise B, ankle impulse + foot Newton, `analysis/per_foot_grf_probe_B.txt`):

| phase | left | right | L+R | whole-body total |
|---|---|---|---|---|
| double stance | 380 N | 379 N | 759 N | 759 N |
| single stance | 704 N | 26 N | 730 N | 730 N |
| after the return | 196 N | 553 N | 749 N | 749 N |

After the return the stance is uneven, because the feet moved.

## Sources

**Balance, capture point and foot placement:**
- Hof, Gazendam, Sinke (2005), *The condition for dynamic stability*, J Biomech 38:1–8. XCoM; margin of stability; temporal margin. <https://pubmed.ncbi.nlm.nih.gov/15519333/>
- Hof (2008), *The "extrapolated center of mass" concept suggests a simple control of balance in walking*, Hum Mov Sci 27:112–125. Put the CoP at an offset behind and outward of the XCoM at foot placement. <https://pubmed.ncbi.nlm.nih.gov/17935808>
- Pratt, Carff, Drakunov, Goswami (2006), *Capture Point: A Step toward Humanoid Push Recovery*, Humanoids. Capture point and region; LIPM + flywheel. <http://www.ambarish.com/paper/Pratt_Goswami_Humanoids2006.pdf>
- Koolen, de Boer, Rebula, Goswami, Pratt (2012), *Capturability-based analysis and control of legged locomotion, Part 1*, IJRR. N-step capturability; instantaneous capture-point control. <https://journals.sagepub.com/doi/10.1177/0278364912452673>
- Stephens (2007), *Humanoid Push Recovery*, Humanoids. Ankle / hip / step strategies and fall-inevitability decision surfaces. <http://www.cs.cmu.edu/~cga/papers/stephens-hum07.pdf>

**Human postural control:**
- Horak & Nashner (1986), *Central programming of postural movements*, J Neurophysiol 55:1369–1381. Ankle and hip strategies; 73–110 ms response latencies. <https://journals.physiology.org/doi/abs/10.1152/jn.1986.55.6.1369>
- Maki & McIlroy (1997), *The role of limb movements in maintaining upright stance: the "change-in-support" strategy*, Phys Ther 77:488–507. Stepping starts well before the stability limits and is preferred over the hip strategy. <https://academic.oup.com/ptj/article/77/5/488/2633179>
- Peterka (2002), *Sensorimotor integration in human postural control*, J Neurophysiol 88:1097–1118. Stiffness about 1/3 above the gravity load; 150–200 ms delay. <https://journals.physiology.org/doi/full/10.1152/jn.2002.88.3.1097>
- Loram & Lakie (2002), J Physiol 545:1041–1053. Intrinsic ankle stiffness is insufficient on its own. <https://pmc.ncbi.nlm.nih.gov/articles/PMC2290720/>

**Physics-based character control:**
- Yin, Loken, van de Panne (2007), *SIMBICON: Simple Biped Locomotion Control*, ACM TOG 26(3). <https://dl.acm.org/doi/10.1145/1276377.1276509>
- Coros, Beaudoin, van de Panne (2010), *Generalized Biped Walking Control*, ACM TOG 29(4). PD + inverted-pendulum foot placement + Jacobian-transpose compensation. <https://www.cs.ubc.ca/~van/papers/2010-TOG-gbwc/index.html>
- Macchietto, Zordan, Shelton (2009), *Momentum Control for Balance*, ACM TOG 28(3). <https://people.computing.clemson.edu/~vbz/papers/macchietto_2009_MCB.pdf>
- Bergamin, Clavet, Holden, Forbes (2019), *DReCon*, ACM TOG 38(6). Kinematic controller → physics tracking; a later option. <https://www.theorangeduck.com/media/uploads/other_stuff/DReCon.pdf>

**Falling:**
- Ha, Ye, Liu (2012), *Falling and landing motion control for character animation*, ACM TOG 31(6). <https://faculty.cc.gatech.edu/~sha9/projects/ha2012flm/2012_landing.pdf>
- Kumar, Ha, Liu (2017), *Learning a unified control policy for safe falling*, IROS. <https://arxiv.org/abs/1703.02905>

**From prior knowledge, not re-fetched:**
- Goswami (1999), foot-rotation indicator, IJRR.
- The Jacobian-transpose "virtual force" idea (Pratt's virtual model control, as used by Coros 2010).
