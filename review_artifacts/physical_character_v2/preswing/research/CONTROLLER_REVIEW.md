# Unloaded but touching foot: humanoid and animation controller review

**What this is:** a literature and implementation review delegated to a research subagent (papers plus open-source code), 2026-10-05, recorded here unchanged in substance.
- IHMC claims come from the open-source develop branch; its parameters vary per robot.
- Hyon and Miura rest on abstracts only.
- The cone projection in recommendation 1b is the reviewer's own synthesis.

## Bottom line

- **No reviewed system keeps a contacting foot below 1 % BW for long while servoing its horizontal pose with unbounded force.** In robotics this state exists only as a short unloading ramp just before swing. The normal-force cap is ramped to about 0, and the friction cone takes tangential capacity to 0 with it [5, 8, 2, 9].
- **The drag mechanism is known.** Joint-PD controllers that work feed the PD a *contact-consistent* desired position and velocity (q_des, q̇_des), solved with the stance foot held still, so the damping never pulls the foot. Examples: WBLC on Mercury, WBIC on Mini Cheetah, MIT's Atlas controller [5, 6, 4]. Using q̇_des = 0 while the pelvis moves produces exactly our 0.3–0.5 N.

## 1. QP / whole-body controllers

**Contact model:** a friction-cone force variable plus a motion condition on the foot.
- **Friction cones:**
  - TSID: 4-sided pyramid with fMin ≤ fz ≤ fMax [8];
  - MIT Atlas (Drake): N_d = 4 pyramid [4];
  - IHMC: ρ basis vectors [1, 2];
  - OCS2: μFz − √(Fx² + Fy² + ε) ≥ 0, so tangential capacity goes to 0 as Fz goes to 0 [10].
- **Motion conditions:**
  - zero foot acceleration (Crocoddyl; its Baumgarte position-correction gains default to 0) [11];
  - an SE(3) equality with optional Kp / Kd toward the contact pose [8];
  - a "no-slip" condition p̈ = −ηṗ plus slack [4];
  - a high-weight contact-acceleration cost [5].
- **De Lasa** found strict zero-acceleration contacts fragile and used non-penetration inequalities instead [16].

**Unloading before liftoff:**
- TSID ramps fMax linearly to fMin + 1e-3 before removing the contact [8].
- WBLC uses a 0.03 s transition that lowers the normal-force cap to 0 and moves the weights from contact acceleration to reaction force. Tangential force is penalised more than normal [5].
- IHMC scales its Fz bounds by (1 − p) [2].
- Herzog drives the force to 0 with a regulariser while the contact constraint is still active, then switches to the swing task [9].

**Horizontal position is held by the contact constraint plus friction, not by a servo.** The exceptions are instructive:
- **IHMC `SupportState`, when barely loaded:** x / y and yaw are held in world, but as task-space feedback at the CoP inside a friction-limited QP. z is never held. The threshold defaults to 0 (off) [2].
- **IHMC toe-off:** contact shrinks to a toe point or line. Toe x / y, roll and yaw are held; pitch is free. A `ToeSlippingDetector` triggers swing on strong slip [2, 3].
- **Atlas:** when contact is planned but no force is measured, μ is set to a small constant, "only allowing normal contact forces" [4].
- **The pattern:** at low load, ask the foot for *less* tangential force.
- **Mini Cheetah stance leg:** Cartesian Kp = 0 and Kd = 7 on foot velocity *relative to world*, plus the MPC's friction-cone-limited force feed-forward [7].

## 2. Contact transitions and swing start

- **Swing starts from the measured state:**
  - IHMC `setInitialConditionsToCurrent` (current sole pose and twist, optional pelvis-velocity injection) [2];
  - Mini Cheetah `setInitialPosition` on the first swing tick [7];
  - de Lasa solves a boundary-value problem from the current state [16].
- **No jumps at the switch:** WBLC blends joint-position commands [5]; Atlas resets its integrated velocity references on any contact change [4].
- **Contact detection:**
  - IHMC: low / high force thresholds plus a CoP test, glitch filters of 2–3 ticks, and an alpha-filtered load % [2];
  - Atlas estimator: Schmitt trigger at 575 N [4];
  - Humanoid-Gym: Fz > 5 N [19];
  - probabilistic fusion [25].

## 3. Animation controllers

- **SIMBICON:** joint PD plus a state machine that switches on time or foot contact. No foot pinning [14].
- **Coros 2010:** low-gain joint PD with Jacobian-transpose virtual forces. The ankle term is zeroed when the foot is "not well planted" [15].
- **De Lasa 2010:** the contact objective's target is the foot points projected onto the ground, so it acts only along the normal. Damping is on the points' world velocity, under unilateral friction constraints. In heel-off only the front corners stay in contact. In effect this is vertical-only anchoring plus damping relative to the ground [16].
- **Geijtenbeek 2013:** no position targets on the stance leg (positive force feedback). Lift-off is a state [17].
- **DeepMimic:** joint PD only, with no contact logic [18]. RL foot-slip penalties ignore feet below a contact threshold [19].

## 4. Joint-space PD drag: established remedies

- **(a)** q̇_des from contact-consistent kinematics: WBLC passes KinWBC's q̇_des to the joint PD [5]; WBIC projects every task into the null space of the contact Jacobian [6]; Atlas integrates the QP's accelerations into a velocity reference [4].
- **(b)** Damping on end-effector velocity relative to the ground [7, 16, 4].
- **(c)** Projected / constraint-consistent inverse dynamics [12]; these need a dynamics model.
- **(d)** Feedback in task space only [9].
- **(e)** Passivity-based damping injection [13].

## 5. Pivoting and toe-off

- **Robotics holds yaw during toe-off** [2, 3].
- **Controlled slip is established:** Miura et al. let the feet slip on purpose and model the rotation as minimising frictional power [21].
- **Humans** spin-turn about the front foot [22]. The required coefficient of friction peaks just before toe-off [23].
- **Physics:** the yaw friction torque a foot can resist is about (2/3)·μ·N·R ≈ 0.02 N·m at N ≈ 1 N. Any yaw servo on this foot overpowers friction, so leave yaw free.

## Ranked recommendation (joint PD, no QP)

1. **Vertical-only anchoring + compliant horizontal + velocity feed-forward.**
   - **(a) Velocity feed-forward:** q̇_des from the IK with the foot's world twist set to 0, either by finite-differencing the IK as the pelvis moves or by J_leg⁻¹ times the hip-induced velocity with its sign reversed. Run the PD on (q_des − q, q̇_des − q̇). Without this the drag stays, because it comes from the damping.
   - **(b) Horizontal and yaw:** re-seed the targets to the current foot pose (Kp ≈ 0). Apply world-relative damping, optionally with the foot-space wrench clipped to |f_t| ≤ μ_safe·N̂.
   - **(c) Vertical: choose a regime explicitly.**
     - Indefinite rest: N ≥ N_min, a few % BW.
     - Pre-swing: ramp the normal-force cap to about 0 over 30–150 ms, then swing from the current pose and twist.
   - **(d) Hysteresis:** separate on / off load thresholds plus a 2–3 tick debounce.
   - **(e) Leave to physics:** the yaw pivot, toe-pitch rotation, and micro-slip as N goes to 0. Detect gross slip and start swing early.
2. **Anchor kept, force bounded.** Workable, but re-seed the anchor whenever the bound saturates, or the error winds up and the foot snaps back. It still needs (a).
3. **Vertical-only anchoring alone.** Removes the stiffness pull, not the damping drag.
4. **The present anchor servo.** Unsupported, and it contradicts friction-cone practice.

## Robotics versus animation

- **Robotics** treats any slip as a failure (μ margins, regularised cones, slip detectors).
- **Animation and biomechanics** care about plausibility. Footskate is perceptible below about 21 mm in most conditions [24]. Humans do shear and pivot at toe-off [22, 23].

## Evidence gaps

- No source covers a long-lasting near-zero-load foot under joint PD.
- Inverse statics omits leg inertia, so fast body motion pushes some inertial load into the foot whatever the gains. Only a normal preload, or accepting slip, removes it.

## Sources

1. Koolen et al. 2016, IJHR 13(1) — doi:10.1142/S0219843616500079
2. IHMC Open Robotics Software (`SupportState`, `FootControlModule`, `OnToesState`, `ToeSlippingDetector`, `SwingTrajectoryCalculator`, `WrenchBasedFootSwitch`), develop branch — https://github.com/ihmcrobotics/ihmc-open-robotics-software
3. Griffin et al. 2018, ICRA — https://arxiv.org/abs/1709.03660
4. Kuindersma et al. 2016, Auton Robots 40(3) — https://groups.csail.mit.edu/robotics-center/public_papers/Kuindersma14.pdf
5. Kim et al. 2020, IJRR 39(8) (WBLC) — https://arxiv.org/abs/1901.08100
6. Kim et al. 2019, arXiv (WBIC) — https://arxiv.org/abs/1909.06586
7. MIT Cheetah-Software (`ConvexMPCLocomotion.cpp`, `LegController.cpp`) — https://github.com/mit-biomimetics/Cheetah-Software
8. TSID (`inverse-dynamics-formulation-acc-force.cpp`, `contact-6d.cpp`) — https://github.com/stack-of-tasks/tsid
9. Herzog et al. 2016, Auton Robots 40(3) — https://arxiv.org/abs/1410.7284
10. OCS2 `legged_robot` (`FrictionConeConstraint.h`) — https://github.com/leggedrobotics/ocs2
11. Mastalli et al. 2020, ICRA (Crocoddyl) — https://arxiv.org/abs/1909.04947
12. Mistry, Buchli & Schaal 2010, ICRA (doi:10.1109/ROBOT.2010.5509646); Righetti et al. 2013, IJRR (doi:10.1177/0278364912469821); Aghili 2005, IEEE T-RO (doi:10.1109/TRO.2005.851380)
13. Hyon, Hale & Cheng 2007, IEEE T-RO 23(5) — doi:10.1109/TRO.2007.904896
14. Yin, Loken & van de Panne 2007, SIGGRAPH (SIMBICON) — https://www.cs.ubc.ca/~van/papers/Simbicon.htm
15. Coros, Beaudoin & van de Panne 2010, SIGGRAPH — https://www.cs.ubc.ca/~van/papers/2010-TOG-gbwc/paper.pdf
16. de Lasa, Mordatch & Hertzmann 2010, SIGGRAPH — doi:10.1145/1778765.1781157
17. Geijtenbeek, van de Panne & van der Stappen 2013, SIGGRAPH Asia — https://www.goatstream.com/research/papers/SA2013/SA2013.pdf
18. Peng et al. 2018, SIGGRAPH (DeepMimic) — https://arxiv.org/abs/1804.02717
19. Gu, Wang & Chen 2024, arXiv (Humanoid-Gym) — https://arxiv.org/abs/2404.05695
20. Tan, Liu & Turk 2011, IEEE CG&A (Stable PD) — doi:10.1109/MCG.2011.30
21. Miura et al. 2013, IEEE T-RO 29(4) — doi:10.1109/TRO.2013.2257574
22. Hase & Stein 1999, J Neurophysiol 81(6) — doi:10.1152/jn.1999.81.6.2914
23. Yamaguchi, Suzuki & Hokkirigawa 2017, PLoS ONE — doi:10.1371/journal.pone.0179817
24. Pražák, Hoyet & O'Sullivan 2011, SCA — doi:10.1145/2019406.2019444
25. Hwangbo et al. 2016, IROS — doi:10.3929/ethz-a-010711905
