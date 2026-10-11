# ABI-1 results: active balance on the PVP-1A collision

**Status:** executed as preregistered. VISUAL_PENDING (the owner judges believability).

**Commits:**
- source `64ce7d0f`;
- research `7ab29075`;
- preregistration `7cf107fe`;
- pre-run freeze `5a8704ca` (amendment AM-1, disclosed no-contact checks);
- run-1 evidence `dc4da05a`;
- S-IMPACT `ea0b20f3`.

**What it is not:** not PVP-1A and not PVP-1B. No change to RUN-1, the simulation, contact, anatomy, friction, the solver, the slide tackle or the PVP-1A diagnostic. Nothing was written back to gameplay.

**Review page:** `review/ABI1_REVIEW.html`, served at http://127.0.0.1:8350/abi1/review/ABI1_REVIEW.html.

## 1. In one paragraph

**Valid comparison.** The same native collision was run with three runner controllers. A is the current frozen V2 tone; B adds GBC-1, a generic, outcome-blind balance law (V2's validated G2 law on 120.8 ms-old physical state, through V2's finite actuators); C adds a physically triggered step. The comparison is valid: all of V1–V8 pass, and B and C are bit-identical to A until the controller first acts, 120.8 ms after contact.

**Inside the trustworthy window (0–250 ms) active control barely shows.** B differs from A by at most 0.57 px at the gameplay camera, and by 33 mm / 8° at close range only at the very end. The reason is physiology plus the window, not the collision:
- a human-latency controller cannot act before ≈ 125 ms;
- the decisive event (the swept foot loses support at 121 ms, leaving the XcoM 0.19 m outside the remaining foot) reaches it only at ≈ 242 ms;
- from 254 ms the passive tackler's head strikes the runner's pelvis, a contact the simulation does not have.

**Beyond the window, active control is the missing ingredient.** It is visible in the labelled EXT continuation and at the 0.75× impact level, where only authoritative contact occurs for the whole 1.08 s:
- the controlled runner swings its arms and works its trunk (EXT, 3.4 px at the gameplay camera);
- at 0.75×, A's trunk slowly folds to 38° while B holds it and recovers to 3° (6.5 px).

**The step law fails here, and the cause is diagnosed.** Its 120 ms-old support information triggers a step for a foot that the physics had already put back down. B does not recover from the 1.0× sweep either: physics does not allow standing on one foot with the XcoM 0.19 m outside it, and the controller is capable of failing.

## 2. Direct answers

### 1. Is PVP-1A's visual weakness primarily insufficient impact magnitude, insufficient active control, both, or neither?

**Not insufficient magnitude.** At 1.0× the sweep removes the right foot's support at 121 ms and leaves the XcoM 0.19 m outside the remaining left foot. A real footballer would have to re-plant or fall. The collision is strong enough to demand an obvious response.

**Within the trustworthy 0–250 ms: neither magnitude nor active control.**
- For the first ≈ 120 ms a real footballer is also a passive body (literature: first corrective torque ≈ 120–160 ms).
- A physiologically delayed controller changes the gameplay image by < 1 px in this window, even at a fast 100 ms delay (1.0 px).
- What makes A read as a mannequin there is its **passive layer**. The SnapshotTone is a zero-latency, non-yielding 1.39 mgh posture servo, whereas measured human intrinsic stiffness is 0.64–0.91 mgh and softens with amplitude to ≈ 0.15 mgh. So the body above the struck leg barely moves: upper body 2.0 px against 7.9 px for the swept leg. That is the "pillar".

**After 250 ms: insufficient active control.** That is where the arm and trunk response and the trunk recovery appear (EXT; 0.75×).

**So: the passive layer in the first ≈ 120 ms, active control after ≈ 250 ms, and in between a window too short for either to show.**

### 2. What is the minimum active controller that materially improves it?

**Inside W1: none.** No controller with a physiological delay changes the gameplay image materially there.

**Beyond W1:**
- the V2-G2 law alone (ankle strategy + load transfer + inverse statics, ablation B0) gives a close-range-visible difference (EXT: 1.04 px, 60 mm, 16°);
- adding the hip term changes nothing measurable (B1: 1.05 px);
- the **arm counter-motion term** lifts it to MATERIAL_AT_GAMEPLAY_CAMERA (3.42 px; shoulders up to 52°).

**So the minimum is the G2 law plus arm counter-motion, on a ≈ 120 ms delay.**

At 0.75× the trunk hold comes from the law's continuously updated gravity statics, which the frozen tone lacks. That level was not ablated, so the attribution to statics alone is inferred, not measured.

### 3. Does active balance without stepping help?

**Visually, yes, after ≈ 250 ms:**
- arms and trunk respond;
- at 0.75× the trunk no longer collapses;
- quiet standing improves: 1.08 s drift 57 → 20 mm, trunk 4.9° → 2.3°.

**Mechanically, not at 1.0×.** The XcoM stays ≈ 0.2 m outside the support at the end of every window, in A, B and C. Recovering would need a step.

### 4. When does reactive stepping become necessary?

**Mechanically**, at the instant support is lost with the XcoM outside the remaining foot:
- 121 ms at 1.0×;
- 67 ms at 1.25× and 1.5×;
- never within 1.08 s at 0.25–0.75×, where no foot unloads.

**In practice, with physiological delay**, the earliest step decision comes ≈ 242 ms after contact. By then the passive physics had already re-planted the swept foot (step 55, 229 ms, in B / C).
- The preregistered step law, acting on 120 ms-old support state, re-lifted that planted foot at step 67.
- The delayed "touchdown" then latched onto the old reload, and C took repeated steps without ever improving on B.

**Stepping is therefore necessary from ≈ 120 ms, but a useful step needs a faster load / contact channel** (cutaneous ≈ 50 ms) or a predictive trigger (time-to-boundary; literature). This is a design question for you; it was not tuned.

### 5. Does the response originate causally from native contact?

**Yes, by construction and by measurement:**
- B and C body states are bit-identical to A through step 30, and the full hash through step 29 (AM-1).
- Each controller's commands with contact equal its commands without contact until step 32 = first contact + 29 (the delay). Every difference after that is caused by the contact, through sensed physical state only.
- No hidden impulse: GBC-1 acts only as actuator torque. No torque ever exceeds capacity, and the runner's ledgers are clean.

### 6. Does the tackler still receive the appropriate equal / opposite response?

**Yes, in every step and condition.** The equal / opposite residual is 0.
- The tackler slows from 4.61 to ≈ 2.2 m/s by 250 ms (Δ|v| −2.39 A, −2.42 B / C), and to 0.24–0.28 m/s by ≈ 540 ms (EXT).
- The runner's control barely changes the tackler's response.

### 7. Is the controller physically capable of failing, or is it an artificial stabiliser?

**Capable of failing.** It can only apply joint torques; it never applies an external force, and the CoP cannot leave a foot.
- At 1.0× it does not recover without a step, and the XcoM stays ≈ 0.2 m outside.
- With intrinsic-level tone (S-TONE) and on the DX fixture, B loses balance in EXT.
- It saturates the shoulders and the stance ankle's frontal axis rather than exceeding capacity.
- In quiet stance it holds, as a human does.

### 8. Are V2's existing actuator ranges and capacities sufficient?

**Sagittal capacity is sufficient.** Peaks in W1 / EXT stay well inside it: left hip abduction ≤ 149 of 174 N·m, knee ≤ 167 of 266 N·m (C's swing), ankle plantar-flexion ≤ 120 of 192 N·m.

**What saturates:**
- the **stance ankle's inversion / eversion** (≈ 37 N·m) and the **knee's axial rotation** (≈ 26 N·m), even in A, because the sweep twists the planted leg. This is G2's known lateral limit;
- the **shoulders** under the arm strategy (a bounded flywheel, as designed).

**V2's actuators rise faster than human muscle** (activation 15 ms; no limit on rate of torque development; human ≈ 50 % MVC about 100 ms after onset). Capacity is not the limitation; if anything, speed is super-human.

### 9. What genuine V2 limitations appear?

1. **The passive layer.**
   - The frozen SnapshotTone is a non-yielding, zero-latency servo at 1.39 mgh, and its gravity bias is fixed at entry.
   - It makes the runner a pillar in the first 120 ms, and it lets the trunk fold slowly once tilted (0.75×: 38° in 1 s).
   - With intrinsic-level stiffness the passive body cannot stand (C0: 14° trunk tilt in 1 s), but GBC-1 stands it (0.2°).
2. **No fast contact / load channel and no delay-robust stepping executor.** This is C's failure mode.
3. **Actuator dynamics faster than muscle**, and a weak frontal / axial stance foot (rigid F0 foot).
4. **The passive tackler (no slide drive) contaminates everything after ≈ 250 ms**, and earlier at higher speeds (167–196 ms at 1.25–1.5×).
   - At 2.0× the strike fails the runner's integrity ledger at step 2.
   - The trustworthy window is barely longer than human reaction latency.

### 10. Does this approach suit shoulder challenges, trips, tackles and other disturbances without event-specific logic?

**The balance part, yes in shape.**
- GBC-1 never saw the tackle. The same law and parameters handled quiet stance, the sweep and every impact level.
- It produced arm and trunk responses and trunk recovery without event logic.
- Pushes, shoulder challenges and stumbles unfold over 250–800 ms, which is where a delayed generic law shows. They should suit it, provided the body is not contaminated by other contacts.

**Three prerequisites before it can be trusted for trips and tackles:**
- a physiological passive layer instead of the frozen tone;
- a stepping executor with fast load sensing and a predictive trigger;
- an interacting opponent whose post-contact motion is authoritative (a slide drive or an approved continuation).

**One caveat holds in every case:** no controller matters in the first ≈ 120 ms; the passive layer decides the look there.

## 3. Evidence

### 3.1 Primary (CF1 fixture), W1 and EXT

| | A | B | C |
|---|---|---|---|
| W1 window | 60 | 60 | 60 |
| W1 type | NO_ACTIVE_RESPONSE | SUPPORT_LOST_PASSIVE_RELOAD | SUPPORT_LOST_PASSIVE_RELOAD |
| right-foot support | lost 29, reloaded 61 | lost 29, reloaded 55 | lost 29, reloaded 55 |
| XcoM outside the BoS at the W1 end | 0.262 m | 0.025 m | 0.026 m |
| EXT window end | 149 | 133 | 129 |
| EXT type | NO_ACTIVE_RESPONSE | SUPPORT_LOST_PASSIVE_RELOAD | STEP_TOUCHDOWN_XCOM_OUTSIDE (steps 58, 92, 160, 192) |
| EXT end: thorax tilt / COM drop | 32° / 27 mm | 26° / 19 mm | 23° / 73 mm |
| saturated axis-steps (W1 / EXT) | 140 / 194 | 175 / 384 | 178 / 490 |

**Visibility:**
- B − A, W1: SUBTLE_OR_NONE (0.57 px, 33 mm, 8°).
- B − A, EXT: MATERIAL_AT_GAMEPLAY_CAMERA from step 88 (3.42 px, upper body; shoulders 52°, elbows 25°, trunk 17°).
- C − B, W1: 0.01 px.
- C − B, EXT: 2.98 px (legs: knees 31°, ankles 28°).

**Other traces:**
- B / C tilt the trunk *more* than A between ≈ 290 and 520 ms, because the hip strategy deliberately rotates the trunk.
- Runner actuator work in W1: A −33.4 J, B −35.4 J.

### 3.2 Secondary (preregistered)

- **S-ABL:**
  - W1: B0 = B1 = B (0.57 px); the hip and arm terms are inactive until the residual appears at step 58.
  - EXT: B0 1.04 px, B1 1.05 px, B 3.42 px. The arms carry the visible response.
- **S-DELAY:**
  - 100 ms: W1 1.01 px; the swept foot reloads at step 50.
  - 150 ms: W1 0.25 px.
  - EXT is material at every delay.
- **S-TONE** (tone K × 0.561, D × 0.749):
  - C0: A_T drifts toward a fall (trunk 14° in 1 s); B_T stands (0.2°).
  - N2 EXT: A_T LOSS_OF_BALANCE (thorax 47°); B_T unresolved (37°); C_T LOSS_OF_BALANCE (65°, COM −12 cm).
- **S-DX** (DX fixture): W1 subtle (≤ 0.33 px); EXT B / C LOSS_OF_BALANCE.
- **S-CPU** (per step):
  - physics + plant ≈ 1.1 ms;
  - controller 0.025 ms (B), 0.21 ms (C; leg IK during the swing).

### 3.3 S-IMPACT (no level adopted)

| tackler v | what happens | B − A W1 / EXT (px) | thorax tilt at EXT end A / B / C |
|---|---|---|---|
| 0.25× | absorbed, no foot unloads | 0.01 / 1.18 | 5 / 2 / 2° |
| 0.5× | absorbed | 0.01 / 0.95 | 4 / 2 / 2° |
| 0.75× | authoritative contact only for 1.08 s; A's trunk folds, B / C hold it and recover | 0.07 / 6.50 | 38 / 3 / 3° |
| 1.0× | support lost at 121 ms, passive reload, no recovery in any condition | 0.57 / 3.42 | 32 / 26 / 23° |
| 1.25× | support lost at 67 ms; the tackler's head reaches the pelvis at 196 ms | 0.08 / 1.13 | 13 / 20 / 19° |
| 1.5× | support lost at 67 ms; head contact at 167 ms | 0.02 / 0.14 | 8 / 8 / 8° |
| 2.0× | runner ledger integrity fails at step 2: no evidence | — | — |

**The continuum the controller produces:**
- small → absorbed (0.25–0.5×);
- obvious correction over ≈ 1 s (0.75×);
- support loss that needs a step (1.0×).

Above 1.0× the window, not the response, becomes the limit.

## 4. What surprised me

- **The trustworthy window is about the length of human reaction latency.** For 250 ms of usable record, physiology leaves ≈ 125 ms of active control, and ≈ 8 ms of response to the critical event.
- **Smaller impacts make A look worse.** At 0.75× the frozen tone lets the trunk fold slowly to 38° over a second. The fold comes from the frozen gravity bias, not from the collision. Continuously updated statics remove it.
- **The arms matter most visually.** The arm term, "not adopted" in G2 for want of a robustness gain, is the largest visual contribution of the controller.
- **The hip strategy adds trunk motion.** B rotates the trunk more than A does, by design.
- **Physics re-plants the swept foot before any human-latency decision.** A step law on delayed support state therefore lifts a planted foot. Stepping needs a faster channel than balance does.

## 5. What this does not show

- general tackling, falls or recovery;
- moving runners;
- production readiness;
- that the simulation's STUMBLE is physically reproduced. The controller never saw it, and agreement was never a criterion.
- **EXT and S-IMPACT are diagnostics.** EXT lets the passive tackler's torso pass through the runner.

## 6. Recommended next step (not started; your decision)

1. **Review the visuals first.** Look at EXT and S-IMPACT 0.75×, the only places the active response is visible. Use the close and diagnostic views, frame-stepping from the first active response.
2. **If you want the footballer response, the next step is architectural, not tuning:**
   - (a) replace the frozen snapshot tone with a physiological passive layer plus always-on postural control (S-TONE shows GBC-1 stands a human-stiffness body);
   - (b) a stepping executor with a fast load channel and a predictive capture-point / time-to-boundary trigger;
   - (c) an authoritative post-contact motion for the tackler (slide drive), so the window can extend past 250 ms.
   - Each needs your approval; none is started.
