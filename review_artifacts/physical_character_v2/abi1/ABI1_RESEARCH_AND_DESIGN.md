# ABI-1: active balance investigation — research and design (Phase 1)

**Status:** research and design only. **No B or C controller code exists when this is written.**
- The preregistration (`ABI1_PREREGISTRATION.md`) freezes the numbers chosen here before any B or C code is written.
- The source instruction is `sources/2026-10-11_user_instruction_active_balance_investigation.md` (commit `64ce7d0f`).

**Literature:** `research/BALANCE_LITERATURE.md`, compiled by a research subagent in this session with citations checked against PubMed / Europe PMC.

**What exists so far** (harness only, no controller):
- `scripts/abi1_plant.mjs` subclasses the frozen PVP-1A plant (`pvp1/scripts/pvp1a_sim.mjs`, imported and not modified).
- Condition A, run through it with no controller, reproduces the committed CF1 N2 record bit for bit: 260 / 260 per-step state hashes, final `20c6161b170403f8`.

## 1. The question, restated

PVP-1A-DX showed:
- native two-player contact exists;
- sustained contact matters;
- both bodies react;
- the disturbance starts at the struck leg.

Visually, though, the runner reads as a mannequin. ABI-1 asks whether the missing ingredient is **active, outcome-blind, physiologically delayed, capacity-limited balance control**, rather than collision magnitude.

**Method:** the collision is held fixed. A, B and C differ only in the runner's controller.

## 2. What condition A physically does

The record is the CF1 N2 run: the arms-cleared tackler and the frozen runner (`pvp1/evidence/diag_cf1/N2.json.gz`), re-measured with `scripts/abi1_metrics.mjs`.

### 2.1 Timeline

| step (ms) | event |
|---|---|
| 3 (12.5) | First native contact: the tackler's foot_L strikes the runner's shank_R, 5.2 N·s over steps 3–8. |
| 7–63 | The tackler's boot rides under the runner's planted right foot (61.6 N·s) and carries it forward about 0.44 m. |
| 29 (121) | The right foot's turf load falls below V2's own unload threshold (1 % BW, held 12.5 ms). The base of support (BoS) becomes the left foot alone. |
| 29 (121) | The extrapolated centre of mass (XcoM, ξ) is **0.19 m outside** that BoS, medial to the left foot. By Hof's / Pratt's criterion, from this instant **the support geometry needs a step, or balance is lost.** |
| 29–60 | Single support on the left foot (650–700 N). The pelvis drops toward the unsupported right side and tilts backward. COM velocity is about 0.24 m/s forward and 0.23 m/s to the right. |
| 61 (254) | The swept right foot comes back down passively, at about +0.41 m forward and 0.26 m right. **In the same step** the still-sliding tackler's head strikes the runner's pelvis. The simulation has no such contact, so it is non-authoritative and is not used as evidence. |
| 126 | The runner's first integrity failure (anchors). |

### 2.2 What A is mechanically

A's runner controller is IFM-1's **SnapshotTone**:
- a joint-space PD toward the entry pose, with gains frozen at entry, acting with **zero latency**:
  - per axis: ankle 497, knee 293, hip 110, lumbar 133 N·m/rad;
  - the summed sagittal ankle stiffness is **1.39 mgh**;
- plus a **constant** statics bias computed once at entry, with half the body weight on each leg.

**What follows:**
- **No load transfer.**
  - The swept, airborne right leg keeps pushing with its half-body support torques.
  - The left leg, now carrying the whole body, gets no extra feed-forward. Its knee and hip yield on stiffness alone.
- **No balance feedback.** Nothing reacts to the COM, the XcoM or the BoS.
- **No trunk or arm response, and no free-leg response.** Every target is the entry pose, so the tone opposes any movement of the arms, trunk or free leg.
- **No stepping.**
- **Saturation, with no controller asking for it.** The tone itself saturates actuators inside the window: knee_L tibial rotation at 99 % of capacity, ankle_L inversion 100 %, ankle_R dorsiflexion 93 % and inversion 91 %; 140 saturated axis-steps over steps 1–60. The foot sweep twists the feet against the stiff tone.

**Classification** (§3 explains it):
- Physiologically, A's tone lumps intrinsic muscle stiffness, which is real at 0 ms, together with stiffness that a human would produce only through reflexes (≥ 40 ms).
- Its magnitude, 1.39 mgh at the ankles, is above the published intrinsic estimates (below 1 mgh, §3).
- A is therefore **a stiffer-than-human statue at zero latency.** It is not a passive human, and it is not an active one.
- It is kept unchanged as condition A. This is a V2 limitation and is reported as one.

## 3. Human response, 0–250 ms after an unexpected disturbance to a planted leg

The verified literature review is `research/BALANCE_LITERATURE.md` (sources, measured vs inferred).

**The short version** (t = 0 at first boot–shin contact; [M] measured, [I] inferred, as labelled there):
- **The sweep is far faster than any lab perturbation.** The foot is carried at ≈ 6 m/s mean. Lab platforms run at 0.05–0.55 m/s. The sweep is over before any automatic postural torque exists.
- **0 to about 40 ms: passive.**
  - Inertia, intrinsic muscle and tendon stiffness and damping, and joint and ligament tissue.
  - Intrinsic ankle stiffness in quiet stance is **0.64–0.91 mgh** (Casadio 2005; Loram & Lakie 2002), below the gravitational toppling stiffness. By itself it cannot hold the body up.
  - It **softens with amplitude**: 13–19 % mgh by about 7° of rotation (Loram et al. 2007a). The passive "spring" yields during a violent sweep.
- **About 40–100 ms: reflexes.**
  - Short-latency (≈ 40–50 ms) and medium/long-latency (≈ 70–100 ms) stretch reflexes.
  - Automatic postural responses at roughly 70–110 ms of EMG, ordered distal → proximal for ankle-strategy responses, proximal-first for hip-strategy responses.
  - Muscle force lags EMG by an electromechanical delay. **Corrective joint torque therefore appears at about 120–160 ms.** Beck et al. 2023 estimate ankle torque at ≈ 130 ms; Allum et al. 2002 see torque responses by ≈ 160 ms.
  - Recommended central torque-onset latencies: swept leg 125 ms, planted leg 140, hip / trunk 140, arms 130, planted-leg push-off 100, swept-leg retrieval 180 ms.
- **About 100–250 ms: active whole-body responses.**
  - Stance-leg loading and unloading (load transfer), knee and hip torques, trunk counter-rotation, arm responses (≈ 80–140 ms EMG) and free-leg responses (trip studies ≈ 60–140 ms EMG).
- **Reactive stepping takes longer.**
  - Step onset as early as 160 ms, mean 250 ms (McIlroy & Maki 1993).
  - Toe-off at 236–328 ms (Do et al. 1982).
  - Foot-off 306 ± 25 ms and swing 168 ± 27 ms (Saumur 2021, a preprint); re-contact ≈ 400–500 ms.
  - A **dynamic** (XcoM-type) trigger predicts steps far better than "COM outside the BoS" (71 % vs 11 %, Pai 2000). People often step before mechanics require it.

**Consequences for this case** (from §2.1):
1. **0–125 ms is passive in a real footballer too.** For the first ≈ 120 ms after contact he *is* a mechanical body receiving force, with intrinsic, *yielding* stiffness. A cannot be faulted for the absence of active control there. It can be faulted for a non-yielding 1.39 mgh tone (§2.2), which is stiffer than intrinsic and the "pillar" the literature warns about.
2. **The support-loss response comes too late for the window.** The support is lost at 121 ms; a physiologically delayed controller senses it ≈ 121 ms later, at ≈ 242 ms, and the primary window ends at 250 ms.
   - Inside the trustworthy window, active control has ≈ 125 ms of visibility (≈ 125–250 ms).
   - The response to the support loss has ≈ 8 ms.
3. **A reactive step lands outside the window.** Re-placing the swept foot would land at ≈ 400–500 ms, hence the labelled continuation EXT (§6.2).

## 4. Passive vs active, and ongoing vs reflex

| mechanism | latency | V2 representation in ABI-1 |
|---|---|---|
| inertia, segment coupling, contact | 0 ms | the physics (Jolt), every condition |
| passive tissue (ligament, capsule, joint damping) | 0 ms | V2 PassiveLayer, every condition |
| intrinsic muscle stiffness / tone | 0 ms | **A's SnapshotTone**, every condition, unchanged (stiffer than intrinsic, §2.2) |
| **ongoing postural control**: delayed balance feedback running before and after contact | the sensory delay | **GBC-1 balance law (B, C)**. It runs from activation, on the delayed state. Before contact it sees only the standing entry state. |
| short-latency reflex | ≈ 40–50 ms | lumped into the tone; not modelled separately (§7) |
| automatic postural response: ankle / knee / hip / trunk / arms and load transfer | ≈ 100 ms to torque | **GBC-1 (B, C)**: one delay for the balance channels |
| reactive step | decision on the delayed state, then swing | **GBC-1 step law (C only)** |

GBC-1 has no event detector. It never decides that "a tackle happened". It is one continuous law on the delayed physical state.
- Its first response *to the contact* is defined as **the first step at which B-N2's command differs from B-C0's** (the same controller without contact). Before contact the frames are identical, so this measures the contact-caused active response exactly.

## 5. Existing V2 components (reuse first)

| component | status | use in ABI-1 |
|---|---|---|
| **V2-G2 balance law** (`ctrl/v2_stand.js`): ξ, p* = ξ + kξ(ξ − ξ_ref) clamped into the support region, LIPM foot forces, lever-rule load split, inverse statics with d'Alembert, kξ = 1/3 (Peterka) | **validated** (G2 PASS, accepted 3 Oct): no-step push limits Δv ≈ 0.20–0.25 m/s | **the core of GBC-1**, the same equations |
| hip / trunk strategy L̇ = M·g·(ŷ × r) on the CoP residual, bounded "flywheel" fading over 10° | evaluated in G2-A8, **not adopted**: no robustness gain | included in B as a component; ablated (B0 / B1) to measure its *visual* contribution |
| arm counter-motion, same law, bounded by 60° | evaluated in G2-A8, **not adopted**: no measurable change | included in B; ablated |
| observation latency `delay` | G2-A9 report-only: 100–150 ms stable in quiet stance | the delay line (one value for every balance channel) |
| support lifecycle constants (`ctrl/v2_support.js` LIFECYCLE): loadOff 1 % BW, loadOn 3 % BW, debounce 12.5 ms | validated with G3 / E1 | support sensing (no new constants) |
| PostureDriver stance ↔ swing gain blend (BLEND 30 ms) and the swing servo gains (4 Hz, ζ 0.8) | IFM-1 / REV2 / E1 | the stepping leg in C |
| bounded leg IK (`legIKBounded`) | validated (IK studies) | the stepping leg's joint targets in C |
| E2 step machinery (`v2_step` / `v2_footstep` / `v2_touchdown`) | **E2 never validated** (TD2C U-1) | **not used**: too much state machinery for a minimal law |
| ActuatorLayer (capacity, activation τ 15 / 50 ms, saturation) | validated, G2 | every command passes through it unchanged |

## 6. Design

### 6.1 The disturbance: one collision held fixed

**Primary fixture: `PVP1A_DX_CF1_FIXTURE.json`.** It is the PVP-1A-DX fixture with only the tackler's arms cleared (post-hoc variant CF1).

**Why CF1, not DX:**
- DX's tackler is untrusted from step 1, because the forearm sits 39.5 mm inside the thigh.
- CF1's tackler is clean except steps 19–28, where the left ankle sits at its hard limit under load.
- The runner's contact is the same in both (first contact step 3; Δv 0.197 vs 0.20 m/s).

**Held identical across A, B and C:**
- every entry pose and velocity (the same written state; its hash is checked);
- the tackler (mass, geometry, tone (0, 0), 4.625 m/s slide);
- friction, solver and contact configuration.

**Native coupling:**
- The contact impulses are not prescribed. They come out of the physics. Once B's runner moves differently, its contact with the tackler changes, and that is genuine physics.
- Every step's impulses are recorded and compared.
- Before the first active response, A, B and C are **bit-identical**. That is checked, and it proves the collision is the same until control acts.

**Secondary replication:** A / B / C on the DX fixture itself, labelled as such.

### 6.2 Windows of claim

- **W1 (primary): steps 1–60 (0–250 ms).**
  - It ends before step 61, the first non-authoritative cross contact in A (tackler head → runner pelvis).
  - A condition's W1 ends earlier if, in that condition, a cross contact other than the authoritative set occurs, or the runner's integrity fails. The authoritative set is runner {shank_R, foot_R} ↔ tackler {foot_L, shank_L}.
- **EXT (diagnostic continuation):**
  - The same runs, except that cross-character pairs other than runner leg ↔ tackler leg are rejected from t = 0.
  - Through step 60 this is **bit-identical** to the frozen contact set (measured on A: first difference at step 61).
  - EXT lets the passive tackler's torso pass through the runner, so it shows the runner's response without the non-authoritative head strike.
  - Its window ends at the first cross contact outside the authoritative set, or at a runner integrity failure. For A that contact is step 150 (625 ms): the tackler's thigh_L reaches the runner's shank_L.
  - EXT is a labelled diagnostic, never primary evidence.

### 6.3 GBC-1: the generic balance controller

**What it senses.** A frame per recorded step:
- every runner body state (exact Jolt state; V2 mass model for the COM);
- each foot's turf normal force, from the decoded contact cache.

**Delay.** It reads only the frame from **d steps earlier**.
- Before activation the history is the standing entry state, with both feet supporting at M·g / 2.
- The +0.5 mm entry grounding gap is an instantiation artefact. The debounce absorbs the 2 zero-load steps it causes.

**Support.** Each foot gets V2's lifecycle thresholds (1 % / 3 % BW, held 12.5 ms), applied to the delayed loads. The BoS is the hull of the supporting feet's usable regions.

**What it never receives:**
- any simulation record, outcome label or contact event;
- the tackler's identity or state;
- the fixture.

**The law (B)**, evaluated on the delayed frame Y:
1. ω0 = √(g / c_y), ξ = c_h + v_h / ω0.
2. ξ_ref = the point of the current BoS nearest the entry XcoM ξ0. The intended state is "keep standing where you were, over whatever supports you".
3. p*_raw = ξ + kξ (ξ − ξ_ref), with kξ = 1/3.
   - p* = p*_raw clamped into the BoS. This is the **ankle strategy**, limited by the feet.
   - The residual is r = p*_raw − p*.
4. Horizontal COM acceleration A = ω0² (c_h − p*).
   - The supporting feet share the load by V2-G2's lever rule. The double-support floor is 10 %; an unsupported foot gets 0.
   - Each foot's force is share · M · (A_x, g, A_z), at its own CoP inside its region.
   - This is **load transfer**: unloading the swept leg, loading the stance leg.
5. Joint torques by inverse statics (V2-G2): each joint's distal subtree under the effective gravity g − A, plus the foot forces inside the subtree.
   - This produces the **knee and hip support response** to the new load distribution.
6. **Hip / trunk strategy** (on r only; V2-G2's law, unchanged):
   - L̇ = M·g·(ŷ × r), applied through the hips of legs with load share > 0.25;
   - it fades linearly to 0 over 10° of pelvis deviation from the entry orientation.
7. **Arm strategy** (on r only; V2-G2's law, unchanged):
   - each shoulder applies 0.5 · M·g·(ŷ × r) to its arm;
   - it fades over 60° of arm deviation from the entry pose.
8. **Output.** Per motorised axis, Δτ = τ_GBC(Y) − τ_GBC(Y0).
   - τ_GBC(Y0) is the same law at the entry frame, so **Δτ ≡ 0 while the delayed frame is the entry frame**.
   - Δτ is added to the tone's feed-forward τ0. The ActuatorLayer then applies capacity, activation dynamics and saturation unchanged.

**Free leg in B.** A leg sensed as unsupported keeps A's tone and gets only gravity compensation from the law. There is no stepping motion.

### 6.4 GBC-1 + step (C)

**Trigger.** On the same delayed frame: ξ outside the BoS (dOut > 0), and no step in progress.

**Stepping leg:**
- if one foot is unsupported, that leg;
- otherwise the foot on the side ξ exits. Its load floor is released (target share 0), the lever rule shifts the load, and liftoff is the sensed unload.

**Foothold.** Each step uses the latest delayed frame.
- g = ξ_TD + b·û, where ξ_TD = p* + (ξ − p*)·e^{ω0·T_rem} is the LIPM capture point predicted at touchdown, and û is the exit direction (Hof's constant offset).
- Bounded by reach: the bounded IK returns the closest valid pose.
- No crossover: the target stays ≥ 0.15 m to the stepping side of the stance foot centroid.

**Swing:**
- the horizontal min-jerk progress s(τ) toward g over T_sw;
- the vertical lift is a sin² profile with apex h_c;
- the foot is level, at the yaw it had at the trigger;
- the bounded leg IK, in the actual pelvis frame, gives the hip / knee / ankle targets;
- the leg's gains blend stance → swing over V2's 30 ms (V2's own table: 4 Hz swing servo);
- feed-forward is gravity compensation.

**Touchdown and after:**
- **Touchdown** is the sensed turf load (V2 thresholds, 3 % BW for 12.5 ms), at any time after liftoff.
- **After touchdown** the leg holds its configuration at touchdown, with gains blended back to stance over 30 ms, and the balance law includes the foot.
- **Further steps** may follow under the same rule.

### 6.5 Physiological numbers

The values to freeze, with sources and ranges, are in `research/BALANCE_LITERATURE.md` and the preregistration. The central choices:
- **One balance delay, d = 29 steps (120.8 ms).**
  - The basis is ≈ 100 ms to neural command, plus an electromechanical delay of ≈ 20 ms that V2's 15 ms activation does not represent.
  - The first torque then comes ≈ 125 ms after the sensed event, and 63 % of the commanded change by ≈ 140 ms. That matches the literature's central values for the swept leg (125), planted leg (140), arms (130) and hip / trunk (140).
- **Swing T_sw = 0.17 s** (compensatory swing 168 ± 27 ms). The trigger at ≈ 242 ms then puts re-contact at ≈ 410 ms, inside the measured 400–500 ms.
- **Foothold offset b = 0.05 m and apex h_c = 0.04 m** are engineering choices [ENG]; the literature gives the principle (capture point + margin, Hof 2008) but no verified number.
- **Delay sensitivity at 100 and 150 ms** (secondary, preregistered). 100 ms is the neural command with no EMD allowance, roughly the athlete-fast bound; 150 ms is the slow end.
- **S-TONE** (secondary, preregistered): the same conditions with A's tone stiffness reduced to the measured intrinsic level (§7).

### 6.6 What would mean "materially improves"?

The owner judges "believable" visually (VISUAL_PENDING). The preregistered mechanical proxies are:
- visible difference from A (gameplay-camera px and 6× mm);
- load transfer;
- the XcoM margin;
- pelvis drop and trunk deviation;
- whole-body joint response amplitude;
- the timing of the first active response;
- saturation and the controller's work.

### 6.7 "Fighting the collision" and "capable of failing"

**GBC-1 cannot create an external force.** Every output is an internal joint torque inside V2's capacity, delayed ≥ 100 ms. The CoP cannot leave a foot.

**What could still be unrealistic, and is measured:**
- torques that are too fast or too large, against capacity and saturation;
- energy injection, from the controller's work;
- holding the runner up where the physics says it falls: the XcoM outside the BoS with no fall.

**"Capable of failing"** is tested directly:
- in B (no step) after support loss, where the XcoM is 0.19 m outside the stance foot;
- across the impact-sensitivity levels, where a capable controller must fall at large impacts.

## 7. Known simplifications (stated before any run)

- **A's zero-latency tone stays in B and C.** B is A plus control, as instructed.
  - The tone is 1.39 mgh at the ankles and does not soften with amplitude. The literature's intrinsic level is 0.64–0.91 mgh, falling to 0.13–0.19 mgh by ≈ 7°.
  - It is the documented "high-gain servo resisting the boot → pillar" pitfall, and it may mask active motion. It is reported, not "fixed".
  - The preregistered arm **S-TONE** measures its share: K × 0.561, which brings the summed sagittal ankle stiffness to 0.78 mgh, the mean of 0.64 and 0.91; D × √0.561 = 0.749, keeping the damping ratio. Applied uniformly; knee / hip intrinsic data do not exist [ENG].
  - A_T, the reduced tone without control, is expected not to stand.
- **No separate short-latency reflex model.** It is lumped into the tone, and the literature notes that low-gain short-latency responses can be destabilising.
- **One delay for every balance channel.** Arms, trunk and both legs share it. Physiologically, the planted leg lags the displaced leg by ≈ 15–20 ms, and swept-leg retrieval comes later (≈ 180 ms).
- **No first-trial startle or co-contraction.** A single unexpected tackle is a "first trial", which the literature notes exaggerates responses. This is omitted.
- **V2's actuators rise faster than human muscle.** The activation time constant is 15 ms, against human rates of ≈ 50 % MVC about 100 ms after onset. This is frozen V2 spec, reported as a limitation.
- **No vertical COM regulation beyond M·g statics, and no vision.**
- **The free leg is not actively flexed in B.** That would be stepping.
- **The step is a single-leg min-jerk swing with continuous re-aim.** There is no timing optimisation and no capture certification (E2 is not used).
- **The tackler stays passive** (no slide drive). Its later motion is not the simulation's. EXT exists only to see past its head strike.

## 8. Predictions (from §2 and §6, before any B / C code)

1. **B ≡ A bit for bit through step 30.** From step 30 the controller reads frame 1, which differs from the entry frame (settling), so B's first command increments are tiny and are not a contact response.
2. **B's first contact-caused active response at step 32** (contact step 3 + 29 = 133 ms): the first B-N2 ≠ B-C0 command.
3. **32–57:** an ankle-strategy deceleration of the forward XcoM (the CoP moves forward, about 30 N·m per ankle). Visually subtle.
4. **58 (242 ms):** the support loss reaches the controller. The CoP clamps at the left foot's medial edge, the residual is ≈ 0.2 m, the stance leg takes the full load, the swept leg unloads, the hip strategy saturates the left hip abductors, and the arms swing (≈ 60 N·m demanded, shoulder capacity ≈ 63 N·m).
   - **Inside W1 only for its last ≈ 8 ms; visible in EXT.**
5. **B cannot stand on one leg with the XcoM 0.19 m outside.** Without a step it keeps falling toward the right foot.
   - B's unloading of the swept leg may make its passive reload *later* than A's, because the airborne leg stops pushing down.
6. **C ≡ B until its trigger at step ≈ 58.** The touchdown falls outside W1, in EXT at ≈ 410 ms (T_sw 0.17 s), if the swing is unobstructed.
7. **Expected overall:** in W1, a small but genuine difference (B ≠ A over ≈ 125 ms, mainly the ankle strategy); a larger difference in EXT. **That would mean both "active control" and "the window" matter.** The impact-sensitivity sweep addresses magnitude.
