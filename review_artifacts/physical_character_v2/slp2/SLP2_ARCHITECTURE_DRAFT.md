# SLP-2 — architecture of authoritative locomotion with a physical articulated character (APPROVED 2026-10-09: decisions 1 – 4, `../sources/2026-10-09_user_approval_slp2.md`; preregistration `SLP2_PREREGISTRATION.md`)

**Source:** `../sources/2026-10-09_user_decision_slp2_separation_design.md` (verbatim).

**Preserved, unchanged:** SLP-1 (`../slp1/SLP1_RESULTS.md`, 627d935) and SLP-1b (`../slp1/SLP1b_RESULTS.md`, e4f572f) are failed architectural experiments. Their evidence shapes this design:
- **SLP-1:** support caps derived from recoverability cannot also provide propulsion.
- **SLP-1b:**
  - Through-COM leg forces propel only when the COM leads the foot, which a path-holding support suppresses.
  - When the legs carry the weight on schedule, pitch stays ≤ 1.5° and tracking ≤ 3.5 cm.
  - The first single support costs the support only 16 – 49 N·m on average.

## 0. The design in one paragraph

**The authoritative trajectory moves the whole body as a field, not through the pelvis and not through the feet.**

- **A (locomotion authority).** Every body of the articulated character gets the force m_i · a_T(t), where a_T is the football layer's authoritative acceleration. This is a mass-proportional uniform field, like a second gravity.
  - It translates the whole-body COM exactly along the authoritative trajectory, provided no other net external force acts.
  - It creates no joint load and no torque about the COM.
  - It **never looks at the physical state**, so it cannot erase, resist or even notice a collision.
- **B (physical support / recoverability).** This is SLP-1's finite, compliant turf ↔ pelvis spring with its unchanged recoverability caps and authority law.
  - It is the only feedback on the difference D between the physical body and the authoritative trajectory.
  - Its finite budget decides whether D is corrected, becomes a stumble, or ends in a fall.
- **C (leg and skeletal locomotion).** SLP-1b's driver keeps the physically actuated legs planting feet, carrying body weight and holding the pelvis. Its scheduled stance forces have **zero net horizontal impulse per step**: C explains the motion and is never asked to propel the mass.
- **Fall.** When recoverability is exhausted, A and B fade together. The body keeps exactly the momentum it has and falls physically, while the authoritative trajectory continues untouched.
- **Separation of states.** Physics never writes the authoritative state. The authoritative layer never writes the physical state. The difference between them is an explicit, reported quantity.

## 1. The exact boundary between authoritative translation and physical displacement

**Authoritative state T(t)** — owned by the football simulation; read-only to physics:
- position p_T, velocity v_T, acceleration a_T (horizontal) and facing ψ_T.
- Physics never modifies T, never integrates it, never feeds anything back into it.

**Reference body state R(t)** — a fixed function of T and C's schedule:
- whole-body COM c_R(t) = p_T(t) + h·ŷ + δ_C(t);
- velocity v_R(t) = v_T(t) + δ̇_C(t);
- pelvis orientation q_R(t) = facing ψ_T, upright.
- h = the nominal COM height. δ_C = the zero-step-mean sway and bounce that C's own scheduled stance forces produce (SLP-1b's B4 precompute, open loop).

**Physical state S(t)** — the Jolt bodies, the only thing physics integrates:
- c_S, v_S, the pelvis orientation q_S, and every body's pose and velocity.

**Discrepancy D(t) = S − R:** position c_S − c_R, velocity v_S − v_R, orientation q_R⁻¹ q_S, and the capture-point form ξ_S − ξ_R.
- This is the only coupling quantity.
- It is recorded and reported, never hidden.

**Equation of motion of each body i** (world frame; all terms are Jolt-integrated forces / impulses):

```
m_i v̇_i = m_i g                         gravity
        + α · m_i a_T(t)                  A: authoritative translation (uniform field, state-independent)
        + F_joint,i + F_actuator,i        C: internal (sum to zero over the body)
        + F_contact,i                     turf contacts (C's foot plants) and any collision
        + F_B,i                           B: finite, compliant feedback on D (pelvis only), caps × α
```

**Sum over all bodies:**

```
M v̇_S = M g + α M a_T + Σ F_turf + Σ F_collision + F_B

and, with v̇_R = a_T + δ̈_C and C's scheduled turf force F_turf,sched ≡ M (δ̈_C − g):

M (v̇_S − v̇_R) = (Σ F_turf − F_turf,sched) + Σ F_collision + F_B − (1 − α) M a_T
```

**So the boundary is exact:**
- **A carries all of the authoritative acceleration.** It contributes nothing to D's dynamics while α = 1.
- **D changes only through:**
  - (a) turf forces that differ from C's schedule (slips, C realisation errors) and any collision;
  - (b) B's restoring force, which is finite;
  - (c) A's fade (1 − α) when recoverability is lost.
- **Collisions are entirely physical displacement.** Ordinary translation is entirely authoritative.

## 2. The eight questions

### 2.1 What carries authoritative translation

**Proposal:** the whole-body COM, through a mass-proportional uniform force field applied to every character body each tick:
- `BodyInterface::AddForce(body, m_i · α · a_T)` at the body's COM, an existing Jolt call already wrapped by `core/v2_jolt.js addForceAt`;
- at engagement, the authoritative velocity is the body's own: SLP-2 starts from rest, so nothing is written.

| alternative | verdict |
|---|---|
| **Kinematic pelvis / root** (`MoveKinematic`) | Infinite authority at the root. A collision cannot move the pelvis; only limbs flap. Disengaging needs a motion-type switch (discontinuous). **Rejected.** |
| **Velocity motor on the pelvis** (Jolt motor toward v_T) | State feedback: it cancels collision momentum up to its force limit, and acts at one body, so it loads the joints and pitches the trunk. That is exactly SLP-1 / 1b's failure mode. **Rejected for A** (kept, finite, as B). |
| **Constraint / motor reference to a moving anchor** | Same as a velocity motor, with feedback. **Rejected for A.** |
| **Moving reference frame** | Jolt has no non-inertial simulation frame. The uniform field m_i·a_T is the **exact translational equivalent** of simulating the character in a frame accelerating with the trajectory, while the turf stays world-fixed (the feet really step on the pitch). **This is the proposal.** |
| **Global gravity vector g + a_T** (`PhysicsSystem::SetGravity`) | Mathematically identical and free of cost, but one vector per world: it would apply one player's a_T to every other dynamic body. Usable only in a single-character test. **Rejected for production; per-body force instead.** |
| **Jolt `CharacterVirtual` / character controller** | A kinematic capsule, not an articulated body. **Rejected.** |

**Why the field is clean:**
- Σ_i r_i × m_i a = (Σ m_i r_i) × a, so the torque about the whole-body COM is zero. A changes no angular momentum and induces no joint load.
- Relative motion of the limbs, all joint, actuator and passive behaviour, and every contact are exactly as they would be with no locomotion authority at all.

### 2.2 The articulated body stays physical and contactable

- All 14 bodies stay dynamic. Unchanged:
  - masses and inertias, SixDOF joints and engine stops;
  - passive tissue;
  - the capacity-limited `ActuatorLayer`;
  - per-sub-shape contacts and friction;
  - gravity, 240 Hz, 150 / 2 iterations.
- A constrains no degree of freedom; it is a known external field like gravity.
- Contacts with the turf (C's feet) and with anything else (impactor, opponent, post) are ordinary Jolt contacts, solved in the same step as B's constraint motor.
- A collision on a shank propagates through knee, hip and pelvis by the actuators' and tissue's finite stiffness, as it would on a free body.

### 2.3 Collision impulses are preserved

- A is a function of time only (a_T(t), α(t)). It has no term in the body's position or velocity, so a collision's momentum change stays in D.
- After a lateral impulse J the COM velocity deviates by J / M and keeps that deviation. Nothing in A pulls it back.
- B pulls it back finitely: a compliant spring of 1 – 4 Hz with recoverability caps 275 – 334 N. Over a 30 ms collision B can contribute at most ≈ 10 N·s, and the SLP-1 cancellation test (support impulse opposing the hit ≤ 0.5·J within 0.1 s) is retained.
- B never reads collision events (unchanged rule); it reacts to D only through its spring, after the fact.

### 2.4 Representing the temporary difference

- D(t) is a first-class, recorded state: position, velocity, orientation and the capture-point form (§1).
- **Presentation** shows S, the physical body: the collision is visible.
- **The football layer** keeps T: its outcome is not silently changed.
- An explicit discrepancy channel reports D, α and the contact events to the football / presentation layers. Policy for using it (e.g. the football layer deciding that a divergence becomes a foul or a fall) is a later decision; SLP-2 only produces and logs it.

### 2.5 Finite recoverability: corrected, stumble or fall

This is SLP-1's law, unchanged in form:
- margin m̂ = 1 − ‖ξ_S − ξ_R‖ / R, with R the lateral one-step capture reach;
- authority α̇ = −α·ω·max(0, −m̂) + (1 − α)·ω·max(0, m̂)·[not FALLEN].

The difference now is that **ordinary locomotion no longer consumes B's budget** (A carries the acceleration; C's predicted sway is in R), so the budget is genuinely the disturbance budget.

| regime | condition (continuous, from the resulting state) | what happens |
|---|---|---|
| **Corrected** | m̂ stays well above 0; B unsaturated | B's spring returns D → 0 in ≈ 1 / f; C keeps its schedule; feet land where the schedule says (the pelvis is back near R) |
| **Displaced / recovering** | B saturates briefly; m̂ > 0 | D decays more slowly; footholds land off target (C captures the planted pose where the foot actually lands); visible but recovered |
| **Stumble** | m̂ around 0 → α dips | A and B fade partially: the body lags or drifts relative to T, stride is disrupted, then α re-rises when physics plus B bring m̂ back above 0 |
| **Fall** | m̂ stays negative → α → 0 | A and B fade to zero; C switches to posture hold at FALLEN (no gait); the articulated body falls physically |

Nothing in this table is an impulse threshold. Location, direction, momentum and foot phase enter through the state they produce.

### 2.6 Momentum at disengagement

- **No write:** the `authorityWrites` counter stays 0. α is continuous, and A and B are forces scaled by α, so linear momentum changes only by bounded forces over time, never by a jump.
- **Angular momentum:**
  - A applies zero torque about the COM at any α, so its fade has no rotational effect at all;
  - B's torques fade with α;
  - C's actuators are internal (they redistribute, never create, the body's angular momentum about its COM; only contacts and gravity change it).
- The falling body therefore carries exactly the linear and angular momentum produced by the collision, the contacts and the fading authorities.
- SLP-1's loss-continuity test (no write, no per-tick COM Δv > 0.5 m/s) is retained.

### 2.7 Leg contacts: pose and support, not propulsion

**Yes, they stay physical:**
- the legs carry body weight through real stance contacts (SLP-1b showed 78 – 123 % in walk / jog before the forward failure);
- friction plants the foot; contacts can slip, be swept or trip;
- the stance legs hold the pelvis through the controller's validated posture-"ik" frame (SLP-1b B1).

**They are no longer asked to propel:**
- C places each foothold so that stance is centred under the reference COM: **no SLP-1b B2 shift**, so the stance ground force (through the COM) has zero net horizontal impulse per step;
- its intra-step oscillation is predicted (δ_C) and is part of R, so B does not fight it.
- A supplies all of M·a_T. The net forward impulse of the legs is ≈ 0 by design and is measured.

**Vertical:** physical. Legs plus gravity, with B correcting the residual.
- For flight gaits C keeps SLP-1b's scheduled half-sine stance force and ballistic bounce in R.
- SLP-1b showed that stance loading decays after impact in jog / run. That shortfall is a C (authoring) quality item; it consumes B's budget and is reported as such. **A does not compensate it**, because compensating measured contact forces would also hide disturbance consequences (e.g. a swept stance leg).

### 2.8 Path to cheap physical LOD

The ordinary state of an unobstructed runner becomes, by construction, "D ≈ 0, B effort ≈ 0, A = M·a_T, C = scheduled leg motion".

1. **Kinematic LOD** for unobstructed runners:
   - pose = T + C's kinematic leg motion, no articulated solve;
   - collision proxies stay kinematic.
2. **Promotion to full physics** before any meaningful contact:
   - triggered by a time-to-contact / proximity test with other players, ball or obstacles, or by a football-layer contact event;
   - the handoff is seamless because the physical initial state equals R (positions, velocities), and A carries the body on along T after promotion with no transient.
3. **Demotion** when D, B effort and non-foot contacts have settled for a hold time.
4. **Optional middle tier** (to be measured, not assumed): articulated physics at reduced rate / iterations / tissue fidelity for players near contact.

SLP-2 can measure the prerequisite: that an undisturbed runner's B effort and D are near zero.

## 3. How "no silent outcome change" and "no erased collision" coexist

They act on **different states**.

**A collision changes only S, and therefore D. It never changes T.**
- The football outcome lives in T and is not written by physics.
- Any influence must go through the explicit discrepancy channel (§2.4), so nothing changes silently.
- In production, consequential contacts (tackles, shoulder charges) are decided by the football layer in the first place. The physical collision then explains an outcome already in T.

**A cannot erase the collision.** A is independent of S. B is finite, compliant and slower than a collision.
- So the collision's momentum stays visible in S, and is only reabsorbed gradually and within budget.
- If it is beyond budget, the body physically stumbles or falls.

**The one genuine conflict is surfaced, not resolved silently:** a physical fall while T keeps running.
- In SLP-2 it is logged as a discrepancy event, with its time, D, α and contacts.
- Its policy is a later football-architecture decision. Options include: only football-decided contacts may exceed B's budget; or the football layer may adopt a physical fall.

## 4. Computational consequences (estimates; nothing optimised)

**Measured today** (Apple M4, single thread, µs per 240 Hz step):

| | autonomous CF-6 walk | SLP-1b |
|---|---|---|
| Jolt (150 / 2 iterations) | 338 | 288 – 315 |
| passive tissue | 202 | 227 – 249 |
| controller / driver | 182 (leg IK ≈ 70) | 128 – 304 |
| actuators | 19 | — |
| diagnostics | 130 | — |
| total | 892 | 827 – 951 |

At 892 µs that is ≈ 0.21 s of CPU per simulated second per player, so 22 players ≈ 4.7 s per simulated second.

**What A + B + C would remove or reduce for an unobstructed supported runner:**

| work | now | why it can shrink under A / B / C | rough estimate (to be measured) |
|---|---|---|---|
| balance law, allocation, planners, supervisor | inside the 182 µs controller | gone (bypassed already in SLP-1 / 1b) | — |
| C driver at 240 Hz | 116 – 130 µs without IK | schedule and statics need not run at 240 Hz; statics loop is O(joints × subtree) and can be cached / incremental | → 20 – 40 µs |
| leg IK frequency (2 bounded LM solves per tick) | ≈ 70 µs when converging; up to 300 µs on unreachable targets | targets are smooth schedules; IK at 60 Hz with interpolated joint targets | → 15 – 25 µs |
| 150 Jolt velocity iterations | ≈ 290 – 340 µs | chosen for passive / standing balance accuracy (G1). With balance carried by A / B, joint-drift tolerance can be looser; the solve scales ≈ linearly with iterations | 20 – 30 iterations → ≈ 60 – 110 µs (needs a drift / separation validation) |
| physics rate 240 Hz | — | an unobstructed runner may not need 240 Hz (implicit motors stay stable; foot contact speed sets the floor) | 120 Hz → ×0.5 per simulated second |
| passive-tissue evaluation | ≈ 200 – 250 µs | full nonlinear tissue matters near ROM ends and in impacts; for ordinary motion a reduced model or lower rate may do | ×0.3 – 0.5 |
| diagnostics (probes, G1 / G2 measurement, hashing) | ≈ 110 – 130 µs | production off | → ≈ 0 |
| **full articulated solving** | everything above | kinematic LOD for unobstructed runners (§2.8) | **≈ 0 physics** per unobstructed player |

**Order of magnitude:**
- Reduced-fidelity articulated runner (120 Hz, 20 – 30 iterations, reduced tissue, IK at 60 Hz, no diagnostics): ≈ 150 – 250 µs per step × 120 Hz ≈ **20 – 30 ms per simulated second per player** (≈ 7 – 10 × less than today).
- Kinematic LOD: ≈ 1 ms per simulated second.
- Only players in or near meaningful contact pay full physics.

These are design estimates only. Amendment 4 is still in force: none of this is attempted in SLP-2.

## 5. SLP-2 test, to be preregistered on approval (smallest experiment)

**Unchanged from SLP-1 / 1b:**
- V2-REF; straight line at 1.2 / 3 / 6 m/s with the same trajectories (gait inputs, ramps);
- the same 21-case matrix including the rigid impactor, every run twice;
- the same B (constraint, caps, spring candidates 1 / 2 / 4 Hz, R, J*, α law);
- the same integrity, cancellation, continuity and stop rules; default off; new code paths only (driver version "2").

**Changes:**
- **A:** uniform field α·m_i·a_T on all 14 bodies (per-body `AddForce`), ledgered (W_A = Σ F_A·v).
- **C:** SLP-1b's B1 (posture-"ik" stance frame / actual swing frame) and B3 (half-sine flight-gait stance forces). **Without B2** (no foothold shift); footholds are centred for zero net horizontal stance impulse.
- **R:** T + δ_C (SLP-1b's B4 precompute, now without any acceleration term).

**Criteria:**
- **Undisturbed:** A1 – A6 as before, plus:
  - A7: legs carry ≥ 50 % of body weight;
  - A9: B's ordinary effort is small — saturated on ≤ 5 % of ticks (as A3), and its mean |force| ≤ 25 % of its caps [ENG; the ordinary share of the recovery budget];
  - A10: net forward impulse by A ≈ M·Δv_T (by construction; verified), legs and B each ≈ 0 net.
- **Disturbance matrix:** the full progression with α / m̂ time series; torso vs swing-leg vs stance-leg at matched impulse; impactor propagation through the articulated chain; A's log proves it never responded to D.
- **Stop rules:** the user's existing list.

## 6. Decisions requested

1. **Approve** A as the mass-proportional uniform field (whole-body translation, state-independent), not a pelvis motor, kinematic root or global gravity.
2. **Approve** that A and B fade together with the single recoverability authority α, so a fall carries the physical momentum and the authoritative trajectory continues untouched.
3. **Approve** that A carries only the authoritative horizontal acceleration:
   - A does not compensate measured or scheduled leg forces, horizontal or vertical;
   - C's realisation errors therefore remain physical and consume B's budget.
4. **Approve** the discrepancy channel as report-only in SLP-2. Its use by the football layer is a later decision.
5. Then I preregister, freeze, implement and run SLP-2 as in §5.
