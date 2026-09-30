# Physical Character V1: Gate B report

> **Addendum, 2026-09-29.** Added after the independent balance review and your approval of Gate C1. The original report below is left unchanged.
>
> **What stays valid:** Gate B's motor architecture is accepted. The **limb-level** results stand:
> - target tracking;
> - continuity under reversal and step changes;
> - finite authority against a fixed post;
> - contact acting on the arrival step;
> - blocked-hip compliance and release;
> - determinism and cost.
>
> **What changes: every whole-body result that depended materially on the temporary pelvis support is SUPPORT-ASSISTED.** None of it is evidence of autonomous balance. The re-analysis in `../balance_review/` measured how much work the support did:
> - **F_chest:** the support delivered 45 of the 46.6 N·s shove within 0.6 s.
> - **F_pelvis:** it delivered 25 of 45 N·s.
> - **The knee raise (B):** it carried about 57 N horizontally and 36 N vertically during the hold.
> - **E:** it saturated for 2.4 s.
> - **Without it (B_off):** the foot lifts with the centre of mass still on the midline.
>
> **The support's status now:**
> - It is retired from all new tests.
> - It survives only as a labelled **historical Gate B fixture**, so the 20 Gate B hashes stay reproducible (verified unchanged).
> - Every Gate C1 test asserts it is absent, and its measured pelvis external-force residual is ≈ 0 N.

**Active control with finite strength.** The Gate A humanoid is driven by authored joint-space targets through finite-strength Jolt motors. The rigid bodies are still the only spatial state. Worktree `physical-character-v1`. Nothing committed or pushed.

2026-09-29 · Gabriel Magalhães (190 cm, 78 kg) · Jolt 5.6.0 (JoltPhysics.js 1.1.0, wasm-compat) · 240 Hz × 1 collision step, 30 velocity / 4 position iterations (Gate A's configuration, unchanged)

![Gate B contact sheet](contact_sheet.jpg)

---

## Verdict

**My opinion: Gate B passes all ten of your criteria, with one condition you need to hold me to.** Every whole-body result here depends on a temporary pelvis support. It is finite and visible, and it can be defeated or removed, but it does real work:
- about 60 N / 30 N·m on average over the knee-raise test;
- saturated for 2.4 s in the blocked-leg test;
- at its 250 N limit during the chest and pelvis shoves.

With the support removed:
- the standing body topples like a statue after about 5.5 s;
- single-leg stance falls;
- a shove knocks him over.

That is the correct physical result, because nothing here balances. It means Gate B shows **controlled limbs on a supported body**, not a character that can stand by itself.

| criterion | evidence | |
|---|---|---|
| **1 Intentionality** | Slow knee raise (B): 3.0° RMS target error over 13 joints, and the pose is clearly the requested one (stills B1/B2). With 8× strength the error drops to 1.1° RMS. | ✅ |
| **2 Continuity** | A mid-motion reversal (D1) and an instant step change of the request (D2) both produce continuous motion. In D2 the hip saturates for 388 ms and accelerates at its torque limit. Largest per-step correction pop in any run that stays up: 0.37 mm (1.4 mm in the falls). Nothing snaps. | ✅ |
| **3 Finite authority** | A fixed post blocks the leg (E): **0 mm geometric penetration** (closest approach 0.06 mm; Jolt's own depth ≤ 0.23 mm). At 8× strength: ≤ 0.74 mm. The motor output is capped exactly at its limit (hip_R 220 N·m). | ✅ |
| **4 Contact on the contact step** | See the four-step table in §6: approach speed drops from 1.02 m/s to 0.22 m/s **in the step the gap closes** (1.13 → 0.14 mm), then 0.004 m/s. Contact force 885 N in that step. | ✅ |
| **5 Compliance** | While blocked, hip_R holds 22° of error at 208 N·m. The reaction flows through the body: stance hip 22°, lumbar 8°, and the support saturates. Shoves propagate: a chest shove moves the neck 8°, lumbar 7° and thoracic 4°. | ✅ |
| **6 Recovery** | After the post is removed, hip_R is within 5° of target in 0.45 s. After shoves, recovery takes 0.12–0.48 s. Nothing in the controller scripts recovery; it comes from target error and damping. | ✅ (the support helps with whole-body shoves) |
| **7 No hidden synchronization** | Audit counters: **0 teleports, 0 velocity writes after t = 0 in all 20 tests.** Targets reach the solver only through Jolt's motor API. | ✅ |
| **8 Stability** | No NaNs. Joint separation ≤ 0.73 mm in every run where he stays up (≤ 3.4 mm in falls). No energy growth in hold windows. No jitter at candidate strength: hold-window body angular velocity ≤ 0.9°/s once settled. C and D2 never settle, because they never reach their pose (§14). | ✅ |
| **9 Determinism** | 20/20 tests bit-identical over 3 runs, and **Chrome = Node for 20/20**. | ✅ |
| **10 Performance** | 0.56–0.67 ms per 60 Hz frame for one character: Jolt 0.53–0.65 ms, controller 0.03 ms. That is about 3× Gate A's passive cost and about 4 % of a frame. | ✅ |

**Visually bad frames, flagged even where the numbers pass (details in §14):**
- **C:** the fast return drops the right foot onto the left foot.
- **D2:** the back-swing leaves the right toe planted behind, and the body ends in a forward-leaning split stance.
- **E:** the blocked hip folds the trunk forward instead of bracing.
- **E_strong:** the 8× profile jackknifes the whole body around the post while its joint errors look excellent.

All of these are physically consistent. They show what is still missing: nothing decides where a foot is placed, nothing balances, and no posture is braced in anticipation of a load.

---

## 1. The interactive review harness

```
cd "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1"
python3 -m http.server 8171          # your server from the Gate A review is still running on 8171
# Gate B: http://127.0.0.1:8171/sandbox/visual/physchar/index.html            (?test=E to open a test)
# Gate A: http://127.0.0.1:8171/sandbox/visual/physchar/index.html?suite=A    (unchanged)
```

- **Built on Gate A's harness:** I extended it rather than replacing it, so it has the same playback: 1× / 0.5× / 0.25×, ±1 physics step, scrubber, worst-frame jump, orbit camera and presets, and every Gate A overlay.
- **suite** switches between Gate A drops and Gate B tests. Each run is simulated in the browser with the same modules and WASM as the Node suite, and the side panel shows whether the hashes match.
- **Gate B overlay row:**
  - **target ghost:** forward kinematics of the requested joint targets, drawn orange. It can hang off the actual pelvis (shows joint-space error) or sit at the requested root (shows root error too).
  - **actual skeleton.**
  - **target error labels:** Δ° per joint.
  - **motor torque:** a world torque vector at each joint, 1.5 mm per N·m, coloured green → yellow → red by effort ÷ limit.
  - **saturation:** a red cross plus "SAT n N·m".
  - **pelvis support:** its target, the pull line, a force vector, and "SUPPORT n N · n N·m [SAT]".
  - **obstacle + contact force:** the post, its contact points, a force arrow, and the gap in mm.
  - **disturbance:** the impulse arrow.
- **Gate A overlays that still apply:** colliders, COMs, joint anchors / axes / limits, ground contacts, contact normals, penetration, velocities, joint error ×20.
- **Timeline:**
  - KE (yellow) and target-error RMS (cyan), with markers for contact (magenta), obstacle removal (green) and impulse (yellow).
  - **A joint panel for any joint:** requested angle (dashed) against the solved one (solid), for hinges or for a chosen swing / twist component; |error| (red); motor effort ÷ limit (orange); saturated steps (red band); contact force (magenta); support force (violet).
  - Clicking either chart scrubs to that time.
- **Side panel:** the test's measurements, per-joint RMS / peak / torque / saturation, the motor profile, the support settings and effort, the blocked-limb and disturbance summaries, the audit counters, CPU, and the Node suite table.

## 2. Research: what the controller is built on

I kept this pass bounded. I read Jolt's source directly and checked a few citations.

| source | what I took from it |
|---|---|
| **Jolt 5.6.0 source** (`SixDOFConstraint.cpp/.h`, `HingeConstraint.cpp`, `MotorSettings.h`, `SpringPart.h`, `Ragdoll.cpp`), read at tag v5.6.0 | See the list below. |
| **Tan, Liu & Turk (2011)**, *Stable Proportional-Derivative Controllers*, IEEE CG&A 31(4):34–44 | Computing PD forces from the **next-step** state makes arbitrarily high gains stable at large timesteps. Jolt's soft-constraint motor is the constraint-space analogue: implicit in the spring, and solved together with the contacts. |
| **Catto (2011)**, *Soft Constraints* (GDC), the formulation `SpringPart.h` cites (from prior knowledge, not re-fetched) | Implicit spring-damper as a velocity constraint. It is timestep-aware by construction. |
| **Loram & Lakie (2002)**, J Physiol 545:1041–1053 | Human intrinsic ankle stiffness is about 90 % of the load stiffness mgh, which is not enough to stand without active control. This predicts, and explains, why the support-off stance topples (§9). |
| **Harbo, Brincks & Andersen (2012)**, Eur J Appl Physiol 112:267–275 | Male isometric knee extension is 246.6 ± 56.3 N·m, the anchor for the knee limit. I could not retrieve the full table in this pass, so the other regions use typical dynamometry ranges; see §8. |
| **Zordan & Hodgins (2002)**, *Motion capture-driven simulations that hit and react* (SCA); **Geijtenbeek & Pronost (2012)**, CGF review (both from prior knowledge) | Active ragdolls should track with gains scaled to the inertia they move and should yield on impact. The target stays a request; contact decides the outcome. |

**What Jolt's source says about its motors:**
- `EMotorState::PositionAndVelocity` gives τ = k·(θ_target − θ) + c·(ω_target − ω).
- `ESpringMode::StiffnessAndDamping` takes k and c in absolute units, N·m/rad and N·m·s/rad.
- The spring is a *soft constraint*: softness γ = 1/(dt·(c + dt·k)) and bias = dt·k·γ·C. That makes it implicit and stable at any stiffness.
- The motor impulse is clamped **per step** to [dt·τ_min, dt·τ_max] inside the same Gauss–Seidel velocity iterations that solve contacts and limits.
- SixDOF rotation error is −2·(q⁻¹·q_target).xyz, expressed on body 2's constraint axes. That equals 2·sin(θ/2), so the spring slightly under-pulls at large errors.
- `SetTargetOrientationCS` clamps the target to the joint limits.
- Joint friction applies only when the motor is off.
- Jolt's own `Ragdoll::DriveToPoseUsingMotors` drives poses exactly this way.

**Conclusion:** use Jolt's integrated motors. The torque limit, the timestep, the damping and contact coupling all live inside one solve. A JS-side PD that adds torques before the step would respond to contact one step late and needs explicit gain stability limits. Nothing here depends on large gains.

## 3. Controller: the chain as built

```
authored key poses (joint params) ──► joint-space TARGETS (constraint-space quaternion per SixDOF joint, angle per hinge)
   + target angular velocity (one-sided difference inside the active segment)
   ──► Jolt constraint MOTOR per joint: PositionAndVelocity, implicit spring (kp, kd), torque limit ±τmax per axis
   ──► solver: motors + joint limits + contacts + friction + inertia, 30 velocity / 4 position iterations, 240 Hz
   ──► solved rigid bodies (the only spatial state) ──► skinned mesh
```

- **Targets are in each joint's own anatomical coordinates.** They use the same swing–twist parameterisation Gate A's limits and measurements use, not world-space bone rotations.
- **Shortest path:** the target quaternion is sign-aligned with the current rotation.
- **Target timing:** the target sent for a step is the request for the *end* of that step.
- **Segment boundaries:** a step change in the request is sent with zero feed-forward velocity, never an infinite one.
- **Deterministic authoring maths:** interpolation is nlerp with a min-jerk time law. Everything that feeds a target uses only + − × ÷ √ and Gate A's deterministic `dsin` / `dcos` / `dtan`. `Math.atan2` appears only in measurement.
- **Authoring vs physics:** key poses are authored in joint parameters (`pc_control.js: POSES`). The stance ankles and the root are *solved* so the stance foot is flat at its home place, and so the COM sits over the stance foot in single stance (bisection on the stance hip). That is authoring consistency only. The physics sees nothing but joint targets and, if enabled, the support's root target.

## 4. Test sequence

All tests run at 240 Hz and start at rest.

| test | what it asks | notes |
|---|---|---|
| **A** / A_reduced / A_off | start in Gate A's relaxed drop-A pose on the turf; at t = 0 the motors switch on with the neutral-stance target (a step request) | support candidate / ¼ / off |
| **B** / B_reduced / B_off | stance → **right knee raise** (hip 75°, knee 95°, trunk lean 8 + 8 + 6°, counter-arms) over 1.5 s, hold 1.5 s, back over 1.5 s | the COM target moves over the left foot |
| **C** / C_weak / C_strong | the same, in **0.3 s** transitions | strength comparison |
| **D1** | the fast raise starts; at 0.65 s, near peak target velocity, the request **reverses** linearly back to stance | target reversal with momentum |
| **D2** | the fast raise starts; at 0.70 s the request **jumps instantly** to a back-swing (hip extension 22°, knee 100°, arms swapped), held 1 s, then back | step change |
| **E** / E_strong | right-leg forward reach (hip flexion 60°) into a **fixed post** (capsule r 5.5 cm, shin-sized); the post is **removed at 3.0 s** | the mandatory blocked-limb test |
| **E_push_weak / E_push / E_push_strong** | the same reach into a **movable post**: 25 kg on a spring (2500 N/m) with a 180 N force limit, i.e. a finite-strength obstacle | bulldozing comparison |
| **F_chest / F_pelvis / F_limb** (+ F_chest_off) | holding stance; at 1.0 s a 50 ms impulse: 47 N·s at the right shoulder, 45 N·s at the pelvis, or 7 N·s at the left hand | disturbance |

## 5. Measurements

Full suite, 20 tests, 3 runs each (`gateb_final_240x1.json` / `.log`). "Mesh below turf" is the rendered skin, measured by CPU-skinning at 60 Hz.

| test | strength / support | err RMS° | peak err° (joint) | motor sat ms (Σ joints) | joint sep mm | hard lim° / soft° | turf mm max/rest | mesh below turf mm | self mm | KE max J | pelvis end mm/° | support mean N / N·m, sat ms | CPU ms/frame (Jolt + ctl) | det |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | cand / cand | 1.76 | 10 (knee_L, step at t=0) | 0 | 0.19 | 0 / 0 | 1.4 / 0.83 | 1.3 | 0 | 0.73 | 12.8 / 1.73 | 33.4 / 11.2, 0 | 0.61 (0.57 + 0.04) | 3/3 |
| A_reduced | cand / ¼ | 1.7 | 10 (knee_L) | 0 | 0.2 | 0 / 0 | 1.45 / 0.74 | 1.4 | 0 | 0.7 | 29.3 / 0.99 | 17.3 / 2.5, 0 | 0.56 | 3/3 |
| A_off | cand / **off** | 1.82 | 10 (knee_L) | 0 | 0.21 | 0 / 0 | 1.52 / 0.37 | 1.4 | 0 | 0.71 | 123.6 / 6.95 (toppling) | off | 0.56 | 3/3 |
| **B** | cand / cand | **3.03** | 7.9 (ankle_R) | 250 | 0.24 | 0 / 0 | 1.85 / 0.82 | 1.2 | 0.45 | 5.54 | 14 / 1.35 | 62.8 / 30.3, 0 | 0.60 | 3/3 |
| B_reduced | cand / ¼ | 5.18 | 21.7 (shoulder_L) | 592 | 0.23 | 0.43 / 0 | 5.02 / 0.02 | 22.8 | 1.69 | 328 | **FELL** | 73.5 / 23.5, 4508 | 0.64 | 3/3 |
| B_off | cand / **off** | 6.34 | 39.7 (neck) | 1960 | 3.15 | 0.11 / 0 | 4.1 / 0.01 | 22.6 | 5.32 | 498 | **FELL** | off | 0.67 | 3/3 |
| **C** | cand / cand | 6.13 | 32.6 (hip_R) | 546 | 0.58 | 0 / 0 | 7.99 / 1.71 | 5.6 | 5.37 | 59.8 | 66.2 / 13.6 ⚠ | 152.5 / 60.1, 1104 | 0.60 | 3/3 |
| C_weak | **×¼** / cand | 18.2 | 57.5 (neck) | 7719 | 0.49 | 0.43 / 0 | 2.43 / 1.67 | 2 | 2.12 | 49.4 | 40 / 8.62 | 146.2 / 66.9, 692 | 0.66 | 3/3 |
| C_strong | **×8** / cand | 1.08 | 10.5 (ankle_L) | 0 | 0.73 | 0 / 0 | 6.3 / 0.81 | 2.7 | 4.53 | 91.2 | 46.4 / 4.94 | 141.8 / 43.5, 483 | 0.59 | 3/3 |
| **D1** | cand / cand | 1.59 | 8 (ankle_R) | 108 | 0.32 | 0 / 0 | 2.9 / 0.96 | 1.6 | 0 | 23.8 | 11.1 / 0.43 | 64.3 / 9.8, 142 | 0.62 | 3/3 |
| **D2** | cand / cand | 9.28 | 70.6 (hip_R, the step) | 751 | 0.25 | 0 / 0 | 2.19 / 1.05 | 1.9 | 0.26 | 46.9 | 28.9 / 17.6 ⚠ | 107.3 / 65.9, 1421 | 0.62 | 3/3 |
| **E** | cand / cand | 7.25 | 33.8 (hip_R) | 2808 | 0.22 | 0 / 0 | 1.55 / 0.44 | 1.2 | 0 | 13.3 | 33 / 8.63 | 106.9 / 80.1, 2367 | 0.62 | 3/3 |
| E_strong | ×8 / cand | 1.7 | 11.2 (hip_L) | 0 | 0.21 | 0 / 0 | 2.11 / 0.07 | 1.4 | 0 | 21.7 | 73.6 / **47.9** ⚠ | 198.7 / 124.7, 4346 | 0.61 | 3/3 |
| E_push_weak | ×¼ / cand | 17.9 | 48.3 (hip_L) | 7855 | 0.16 | 0.23 / 0 | 1.12 / 0.36 | 1.1 | 0 | 22.5 | 30.6 / 49.1 | 89.8 / 82.8, 2667 | 0.62 | 3/3 |
| E_push | cand / cand | 7.44 | 33.8 (hip_R) | 646 | 0.22 | 0 / 0 | 1.5 / 1.06 | 1.2 | 0 | 13.3 | 17.6 / 19.9 | 71.3 / 95.2, 3333 | 0.61 | 3/3 |
| E_push_strong | ×8 / cand | 0.97 | 6.8 (hip_L) | 0 | 0.19 | 0 / 0 | 2.44 / 0.79 | 2.2 | 0 | 27.2 | 16.2 / 3.15 | 65.6 / 26.7, 204 | 0.61 | 3/3 |
| **F_chest** | cand / cand | 1.28 | 8.3 (neck) | 0 | 0.18 | 0 / 0 | 1.94 / 0.54 | 1.7 | 0 | 22.8 | 8.1 / 0.59 | 32.1 / 6, 63 | 0.59 | 3/3 |
| F_chest_off | cand / **off** | 3.71 | 40.7 (neck) | 581 | 3.43 | 0.67 / 0 | 3.03 / 0.06 | 15.8 | 1.89 | 498 | **FELL** | off | 0.64 | 3/3 |
| **F_pelvis** | cand / cand | 1.04 | 3.3 (lumbar) | 0 | 0.18 | 0 / 0 | 1.33 / 0.62 | 1.2 | 0 | 5.45 | 7.4 / 0.63 | 24.8 / 4.9, 54 | 0.57 | 3/3 |
| **F_limb** | cand / cand | 1.18 | 9.2 (elbow_L) | 0 | 0.18 | 0 / 0 | 1.27 / 0.65 | 1.2 | 0 | 6.46 | 7.5 / 0.63 | 22.6 / 4.5, 0 | 0.57 | 3/3 |

- **Per-joint peak torque and saturation** for every test are in the JSON and in the harness side panel.
- **Tables for the two most informative tests:**
  - **C (fast transition, candidate):** the right leg hits its limits. hip_R 220/220 N·m, saturated 192 ms; knee_R 190/190, 133 ms; ankle_R 110/110, 146 ms. The trunk stays below its limits: lumbar 138/200.
  - **E (blocked):**
    - hip_R 220/220, saturated 933 ms, peak error 33.8°;
    - the **stance** hip_L 220/220, saturated 1671 ms, peak error 23.1°. It is the one resisting the reaction;
    - knee_R 156/190 and lumbar 109/200: loaded, not saturated.
- **Hold windows** (last 0.5 s of every constant request):
  - Candidate strength settles to 1.1–3.7° RMS error, with body angular velocity ≤ 0.9°/s and KE ≤ 0.01 J.
  - Two runs never settle, because they don't reach their pose: C (9.1° error, still creeping at 7.2°/s) and D2 (6.7° error, 3.7°/s); see §14.
  - Energy doesn't grow in any hold window except the falling runs.

## 6. The blocked-limb test (mandatory)

**E:** the leg is asked to reach 60° of hip flexion, and a fixed post sits in its path. The boot reaches it at 1.04 s.

**The contact step.** "Gap" is the geometric post-step distance between the post and the nearest collider. "Depth" is Jolt's listener value at the start of the step (negative = separated, a speculative contact).

| step | t (s) | gap after the step | Jolt depth at the start | boot approach speed | contact force | hip_R error | hip_R torque |
|---|---|---|---|---|---|---|---|
| 247 | 1.0292 | 5.24 mm | −8.72 mm | 0.874 m/s | 0 N | 33.4° | 220 (SAT) |
| 248 | 1.0333 | 1.13 mm | −5.20 mm | 1.016 m/s | 0 N | 33.2° | 208 |
| **249** | 1.0375 | **0.14 mm** | −1.09 mm | **0.217 m/s** | **885 N** | 33.1° | 220 (SAT) |
| 250 | 1.0417 | 0.06 mm | +0.15 mm | 0.004 m/s | 634 N | 33.1° | 220 (SAT) |

At 1.02 m/s the boot would travel 4.2 mm per step and go 3 mm into the post on step 249. Instead, the speculative contact is solved together with the motor in step 249. The approach is arrested in the step in which the boot arrives, with no penetration and no delayed reaction.

**While blocked (1.35–2.95 s):**
- **hip_R:** requested −60°, holding about −40°. Error 22.1° on average, motor 208 N·m on average, saturated 17 % of the time. It uses about 94 % of its available impulse (τmax·dt = 0.92 N·m·s per step).
- **Contact force** 122 N on average (impact peak 885 N). Penetration stays ≤ 0 (closest gap 0.06 mm; listener ≤ 0.23 mm).
- **Response elsewhere:** the hip flexor's reaction pitches the pelvis forward. The stance hip_L holds 21.9° of error and saturates at 220 N·m; lumbar 8.1°, neck 4.3°, stance knee 6.7°. The support pulls 96 N and saturates its 100 N·m torque limit.
- **Visually:** the trunk folds forward over the pinned leg (still E2).

**After the post is removed at 3.0 s:** hip_R goes from 20.6° of error to within 5° in **0.45 s**, continuously, with no jump; its end error is 3.6°. The removal is an environment change: the post's lock and body leave the world. Nothing touches the character.

**Other strengths and the movable post:**

| run | first contact | max penetration | peak / held contact force | hip_R error while blocked | the obstacle |
|---|---|---|---|---|---|
| E (candidate, fixed) | 1.042 s (boot) | **0 mm** (listener 0.23) | 885 / 122 N | 22.1° | fixed |
| E_strong (×8, fixed) | 0.675 s | **0.74 mm** (listener 0.96) | 1086 / 159 N | 2.5°, because the *pelvis* is 48° off: the body jackknifes around the leg | fixed |
| E_push_weak (×¼, movable) | never: the leg can't lift that far (21 mm short) | — | — | — | not touched |
| E_push (candidate, movable) | 1.042 s | 0.30 mm | 196 / 190 N (the post's own limit) | 18.6° | pushed **139 mm**; equilibrium where the hip torque equals the post's 180 N limit |
| E_push_strong (×8, movable) | 0.675 s | 0.76 mm | 326 N | 0.5° | **bulldozed 970 mm** |

## 7. Disturbances

Each shove is a 50 ms impulse while holding the stance. Recovery means the target-error RMS stays within max(0.5°, 10 % of the peak) above the pre-impulse baseline for 0.25 s.

| test | impulse | peak RMS (baseline 1.01°) | worst joints | pelvis moved | support peak | recovered in |
|---|---|---|---|---|---|---|
| F_chest (right shoulder, toward his left and back) | 46.6 N·s | 2.76° at +0.25 s | neck 8.3°, lumbar 6.7°, thoracic 4.1°, knee_L 2.4° | 30.6 mm | **263 N (at limit, 63 ms)** | **0.48 s** |
| F_pelvis (backward) | 45 N·s | 1.57° at +0.08 s | lumbar 3.3°, neck 2.9°, hips 1.8° | 20.5 mm | **253 N (at limit, 54 ms)** | **0.12 s** |
| F_limb (left hand, up and forward) | 7.1 N·s | 3.36° at +0.08 s | elbow_L 9.2°, shoulder_L 8.4°, neck 2.1°, lumbar 1.9° | 9.5 mm | 65 N | **0.23 s** |
| F_chest_off (no support) | 46.6 N·s | 12.9°, never recovers | neck 40.7° … | 1.8 m | — | **falls** |

- **The propagation is visible:** impact → local joints (neck, lumbar, arm) → neighbours → motors pull back.
- **The recovery path is not scripted.**
- **Honestly, though:** the whole-body shoves are largely absorbed by the temporary support, which hits its force limit. Only the limb knock is resisted mainly by the joint motors (support 65 N).

## 8. Regional motor profile (candidate)

- **τmax:** torque limit per constraint axis. These are approximate adult-male isometric maxima, averaged over the two directions of each joint. The knee is anchored on Harbo 2012 (extension 247 N·m, flexion about 130 N·m). The others are typical dynamometry ranges I didn't re-verify in this pass:
  - hip: extension about 250, flexion about 190;
  - ankle: plantar about 170, dorsi about 45;
  - trunk: extension about 250, flexion about 180;
  - shoulder about 60–80; elbow about 50–75; neck about 20–45.
- **Stiffness:** kp = τmax / θsat. θsat is the error at which the spring alone reaches τmax: a linear compliant region, then saturation.
- **Damping:** kd = 2·ζ·√(kp·I_load), ζ = 1. I_load is computed from the body spec in the neutral pose:
  - the distal chain for trunk, neck and arms;
  - for hips, knees and ankles, the larger of the distal leg and half the body above the joint, because in stance they carry the body.

| region (joints) | τmax N·m | θsat | kp N·m/rad | I_load kg·m² | kd N·m·s/rad |
|---|---|---|---|---|---|
| spine (lumbar, thoracic) | 200 | 20° | 573 | 6.29 / 2.80 | 120 / 80 |
| neck | 35 | 30° | 67 | 0.13 | 5.9 |
| shoulder | 70 | 30° | 134 | 0.62 | 18.2 |
| elbow | 60 | 30° | 115 | 0.09 | 6.5 |
| hip | 220 | 20° | 630 | 7.79 | 140 |
| knee | 190 | 20° | 544 | 20.6 | 212 |
| ankle | 110 | 15° | 420 | 47.0 | 281 |

- **Strength comparison:** one multiplier on τmax and kp (kd follows √kp, so ζ stays 1). Weak = ×0.25, strong = ×8.
- **No player attributes:** there is no Strength, Balance or Agility yet.
- **Simplifications to revisit:** limits are symmetric per axis (flexion strength = extension strength), and there is one kp per region (twist as stiff as swing).

## 9. Pelvis / root policy: explicit

- **What it is.** A **temporary Gate B support**: a SixDOF constraint from the turf to the pelvis with all six axes *free*, each driven by a finite PositionAndVelocity motor toward the **authored root target**. That target is the pelvis place the stance solve says the pose needs.
- **Candidate:** k 3000 N/m, c 967 N·s/m, **≤ 250 N per axis**; k 400 N·m/rad, c 164, **≤ 100 N·m per axis**.
- **Reduced:** ¼ of that (63 N, 25 N·m).
- **Off:** no constraint exists.
- **Visible:** a magenta line from the target to the pelvis, a force vector, and a label with N, N·m and SAT.
- **Measured** every step, and summarised per test (§5).
- **What it does and doesn't do:**
  - It is **not balance, and not the final system.** It never sets a position or velocity; it can only pull with bounded force.
  - It is **defeatable:** it saturates in C, D2 and E, and in both shove tests.
- **What happens without it:**
  - **A_off:** the motors hold the stance (1.8° RMS), but the body leans forward and topples at about 5.5 s like a stiff statue, arriving face-down with the stance pose intact. The ankle springs (2 × 420 N·m/rad) are only about 1.03× the load stiffness mgh (about 820 N·m/rad), which is exactly Loram & Lakie's point: stiffness alone doesn't stand.
  - **A_reduced:** stands (support mean 17 N).
  - **B_reduced / B_off:** single-leg stance falls; the support saturates for 4.5 s before failing.
  - **F_chest_off:** the shove topples him.

## 10. Physics stays causal

- **Authored data only requests joint angles** plus the support's root target.
- **Everything else is the solver's:**
  - contact response, fall direction, secondary motion (arms swinging on a shove, the trunk folding over a blocked leg), and separation;
  - what happens when a request is impossible: the foot on the foot in C, the toe planted in D2.
- **Audit counters in the adapter:** position writes after t = 0 = **0**; velocity writes after t = 0 = **0** (all 20 tests).

## 11. Debug visualisation

See §1. The ghost is exactly the requested pose. Where it separates from the physical body, the error labels and the joint panel say by how much, and the torque vectors and SAT markers say whether the motor is giving up (saturated) or holding (compliant spring).

## 12. Strength comparison (the operating region)

| | too weak (×¼) | **candidate** | too strong (×8) |
|---|---|---|---|
| C fast transition | 18.2° RMS; lumbar sags 46° (the trunk slumps); the knee raise falls far short (hip_R 53° behind at peak); 7.7 s of saturation | 6.1° RMS; visible lag and saturation on the fast leg (hip/knee 192/133 ms); the trunk holds | 1.1° RMS; no saturation; rigid, robot-like exactness; KE 91 J; turf 6.3 mm; no measurable jitter (hold ω ≤ 1.2°/s) |
| E fixed post | (not run: can't reach) | holds 22° of hip error; the trunk folds; 0 mm penetration | reaches 2.5° by **jackknifing the whole body** (pelvis 48° off); penetration still only 0.74 mm |
| E movable post | never reaches the post | pushes it 139 mm, to its own force limit | **bulldozes it 970 mm** |

- **The useful region is near the candidate.** Weak cannot hold posture. Strong wins every argument with the environment: it bulldozes, and it contorts itself when the environment won't yield. With implicit springs, strong does **not** jitter. Its cost is rigidity, bulldozing, and self-contortion that hides behind a small joint error.

## 13. Timestep

Gate A's configuration is unchanged (240 Hz × 1, 30 / 4 iterations); sleeping is disabled because a sleeping body ignores a changing target. Checking whether motors need a different rate (`gateb_timestep_compare.txt`):

| rate | B err RMS | E err RMS | C joint sep | C turf / self pen | ms/frame |
|---|---|---|---|---|---|
| 60 Hz | 3.25° | 7.19° | 17.3 mm | 51.6 / 32.4 mm | 0.22 |
| 120 Hz | 3.04° | 7.21° | 6.4 mm | 33.1 / 19.5 mm | 0.37 |
| **240 Hz** | **3.03°** | **7.25°** | **0.58 mm** | **8.0 / 5.4 mm** | **0.60** |

- **Motor tracking barely depends on the rate:** the implicit motor is timestep-robust.
- **240 Hz is still what the constraints and contacts need:** the Gate A reasons. No change, and no adaptive stepping.

## 14. Known failures and limitations

1. **No balance.** Without the temporary support the character can't stand (§9). Every whole-body result depends on it.
2. **Nothing decides where a foot lands.**
   - **C:** in the fast return, the physical pelvis lags the requested root, so the right foot's joint targets put it down near the midline, on the left foot. It stays there: 9° residual error, support saturated (still C3).
   - **D2:** the back-swing touches the right toe down behind. Friction holds it, and the body ends in a forward-leaning split stance: hip_R 15° error, pelvis 17.6° off (D2 end still).
   - Both are correct physics for the request, and both are visually bad.
3. **The blocked leg folds the trunk** instead of the body bracing (E2). The finite stance hip and the finite support lose to the hip flexor's reaction. A player would brace in anticipation; that is future work.
4. **Joint error alone is misleading.** E_strong reports 1.7° RMS while the whole body is jackknifed. Root and global orientation error (the pelvis-vs-root readout) must be read alongside it.
5. **Torque limits are per constraint axis (a box).** A joint driven on two or three axes can exert up to √2–√3 × τmax in magnitude. The reported peaks are per-axis maxima. A spherical limit would need a custom clamp.
6. **Jolt's rotation error is 2·sin(θ/2).** The spring under-pulls by 10 % at a 90° error. It is irrelevant in practice, because motors saturate at 15–30° of error.
7. **Simplifications:** symmetric strength per axis, one kp per region, no velocity-dependent strength (force–velocity), no fatigue, no player attributes.
8. **The poses are mine.** I authored the knee raise, reach and back-swing in joint space to exercise the controller; they don't come from animation data.
9. **Cost:** motors triple the Jolt cost against the passive Gate A (0.2 → 0.6 ms per 60 Hz frame). That is still small for one character; my estimate for two players at Gate D is about 1.2–1.5 ms per frame.
10. **Gate A limitations stay visible:**
    - Rendered-mesh sinking is *not* worse: ≤ 5.6 mm in every run where he stays up (the boots fit well), and about 23 mm only in the falls, as in Gate A.
    - Limit overshoot is *better*: hard ≤ 0.67° (falls only) and soft 0°, because targets sit inside the ranges.

## 15. Determinism

- **Hash:** FNV-1a over the exact Float64 bits of position, rotation and velocities of all 14 bodies, every step.
- **Repeats:** 20/20 tests bit-identical over 3 runs in Node 22.19.
- **Cross-runtime:** **Chrome 154 = Node for 20/20** (`gateb_crossruntime_chrome_vs_node.txt`).
- **Gate A unchanged:** Gate A's five hashes still reproduce after the adapter changes (A 5bbffb56 · B 2f8a9c80 · C 34af33e · D 55b97ba8 · E 48f19a22).
- **No presentation RNG anywhere.**

---

## Evidence and files

**Evidence (`review_artifacts/physical_character_v1/gate_b/`):**

- `contact_sheet.jpg`: 20 key frames, with the bad ones labelled red.
- `stills/`: 33 viewport frames, including the contact step ±1 physics step (E1a / E1b / E1c).
- `harness_frames/`: full harness screenshots with the joint panel.
- `gateb_final_240x1.json` / `.log`: every metric, per joint.
- `gateb_timestep_compare.txt`, `gateb_crossruntime_chrome_vs_node.txt`.

**Code (`sandbox/visual/physchar/`, all untracked):**

| file | change |
|---|---|
| `pc_control.js` | new: targets, poses, stance solve, motor profiles, support policy |
| `pc_gateb.js` | new: tests, runner, measurement |
| `tools/gateb_run.js` | new: the Node runner |
| `pc_jolt.js` | Gate B surface added: motors, support, obstacles, impulses, audit. Gate A's paths are unchanged, and its hashes are re-verified. |
| `pc_harness.js` + `index.html` | extended |

**Gate A baseline preserved:** `worktrees/_preserved_2026-09-29_physical_character_gate_a/physical_character_gate_a_baseline.tgz`, with a README holding sha256s and hashes.

**Reproduce:**

```
cd "…/physical-character-v1/sandbox/visual/physchar"
node tools/gateb_run.js --tests all --repeat 3 --mesh --out results/gateb_final_240x1.json
node tools/gateb_run.js --tests C,E,F_chest,B --tsc 120x1 --brief     # rate comparison
node tools/gateb_run.js --poses --profile                             # authored poses + motor profile
```

**Not done, as instructed:** balance or locomotion, Reference Tackle, a second character, tackle collision, fast swept-limb contact, defence, production integration, commits and pushes.
