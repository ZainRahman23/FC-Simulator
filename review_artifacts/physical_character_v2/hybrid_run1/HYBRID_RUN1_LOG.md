# HYBRID-RUN-1 log

**Instruction:** `sources/2026-10-15_user_instruction_hybrid_run1_animation_driven_interruptible_runner.md` (≈ 02:35 BST, 15 Oct 2026; saved at `73f3cac5`).

**Work time:** 15 Oct ≈ 02:35 → 04:00 BST.

**Commits:**
- `f5d966b9`: WIP, the no-contact parameters frozen.
- The final commit, which carries this log.

**Frozen throughout:**
- **Never modified:** RUN-1 (consumed only through the `locomotion-v2-straight-baseline-1` archive and the preserved run-in `run1r_4.147.json`, sha256 `8c2e8507…`), V1, C3, ball physics, PVP-1 / PVP-1A files, SP2F2 and SP2F3.
- **Not done:** no friction calibration, no M1b change, no tendon or gait generator.

## 1. The question

**Target:** keep RUN-1 as the intent, and put a physical body underneath it that tracks the intent with finite authority, so that contacts win.

**Approach:** build the body first, then show:
1. it does not damage RUN-1;
2. shoulder contact interrupts it;
3. the frozen PVP-1 tackle.

## 2. Intent and entry

- **Intent sampling:** RUN-1 is sampled at the simulation rate, so step n is frame k0 + n. Nothing is interpolated in the frozen runs.
- **Fractional-time queries** (lerp / slerp) exist only for the phase-synchronisation experiment.
- **The entry state** is RUN-1's own pose plus body velocities from the finite differences of frames k0 ± 1. It is joint-consistent, so the body starts as a moving athlete, not a static ragdoll.
- **Velocity writes:** one write per body at step 0, and none after.

## 3. Development of the no-contact runner (in order; intermediate variants run in scratch, not kept as evidence)

1. **Joint drive.**
   - **Tried first:** the V2 athlete-capacity actuator layer (Hill force–velocity, activation 15 / 50 ms).
   - **What happened:** it saturates when asked to follow RUN-1 on a free body.
   - **What replaced it:** `AnimationDrive` (`hr_drive.mjs`): the same implicit Jolt motors with a constant finite limit of κ · T_iso, κ = 2. Its job is to make an undisturbed body follow RUN-1, not to explain how RUN-1 is produced, so the human capacity model is the wrong tool for it.
2. **Feed-forward.**
   - **What happened:** the sp_id chain inverse dynamics, with base acceleration and gravity, double-counted what the gait support already provides.
   - **What replaced it:** `hr_id.mjs`, the relative-motion inverse dynamics (no base linear acceleration, no gravity). It drops out on a supporting leg.
3. **Gait support.**
   - **The force pair:** the intended ground reaction is applied through the real stance boot as an internal force pair. Horizontal is velocity-only.
   - **First version:** completed the run but ran about 0.5 m/s slow (1.8 m behind RUN-1 at 2.45 s), with a stumble at 0.7 s from an early touchdown.
   - **Where the slowdown came from:** the swing leg's forward momentum, absorbed through the planted boot at touchdown, was an extra braking ground reaction that the pair did not know about.
   - **Fix:** load-sensed ground-reaction tracking. The horizontal turf force the boot actually received is fed back (β 1, τ 0.02 s), so the total follows the intent.
   - **Result:** the speed deficit fell to 1.2 % (5.6 cm/s).
4. **Orientation.**
   - **The problem:** RUN-1 is kinematic, and its angular momentum is not dynamically consistent; its inverse dynamics put the centre of pressure beyond the toes (PVP-1 log §2). Following its pelvis orientation needed roughly 100–170 N·m in flight and up to ~450 N·m in late stance.
   - **The resulting moment** has two parts:
     - a supported part, bounded by the support's lever;
     - an animation-consistency part, ≤ 450 / 150 N·m, scaled by the trunk's authority.
   - Both parts are logged every step.
5. **Stance-leg compliance.** A supporting leg runs at 30 % joint authority with no feed-forward. Its stance is carried by the support, not by the joint drive.
6. **Phase synchronisation** (opt-in, `phase.on`).
   - **Idea:** re-time RUN-1's playback by physical touchdowns.
   - **First version:** treated boot proximity as a touchdown and fired falsely. It was changed to real load (> 200 N).
   - **Result:** neutral. **Off** in every frozen run.
7. **Swing-foot placement** (opt-in, `place.on`).
   - **Idea:** a SIMBICON-style hip offset proportional to the COM velocity error (12° per m/s across, 8° along, ≤ 15°).
   - **Result:** it made the disturbed runner worse. **Off** in every frozen run.
8. **Tolerances.**
   - **Rule:** regional error tolerances were fixed before any contact run, from the no-contact run (`b04ec761`): max(3°, 1.5 × the region's largest no-contact error).
   - **Values:** legs 11°, trunk 3°, arms 3°.
   - **Check:** the final no-contact run `52c3320f` gives the same values (maxima 7.2°, 1.8°, 0.9°).

## 4. Frozen parameters (`hr_runner.mjs` DEFAULTS)

- **Gains:** natural frequency f and damping ratio z, applied on the subtree inertia.

  | Joint | f | z |
  |---|---|---|
  | hip | 8 Hz | 0.8 |
  | knee | 8 Hz | 0.8 |
  | ankle | 7 Hz | 0.8 |
  | lumbar | 6 Hz | 0.9 |
  | thoracic | 6 Hz | 0.9 |
  | neck | 5 Hz | 0.9 |
  | shoulder | 6 Hz | 0.8 |
  | elbow | 6 Hz | 0.8 |

- **Drive:** κ 2.
- **Support:**
  - **Pair:** Ky 150, Dy 25, Kv 4, KvFwd 25; μ 0.9; Fmax 3.5 BW.
  - **Pelvis moment:** Ko 2500, Do 250; lever 0.4 (pitch/roll), 0.2 (yaw); animation part acPR 450, acYaw 150.
  - **Stance leg:** stanceAuth 0.3.
  - **Ground-reaction tracking:** grfBeta 1, grfTauS 0.02.
  - **Contact detection:** footPoint "contact"; contactN 20; proximityM 0.004; stanceMarginS 0.02; gateRampS 0.01.
  - **Envelopes:** lean 35–60°; reach 1.15 m; tilt 35–70°.
  - **Sensitivity switch:** acCut null.
- **Authority:**
  - eTol legs 11°, trunk 3°, arms 3°;
  - eScale 15°; jScale 4 N·s; floor 0.15;
  - τ down 0.02 s, τ up 0.3 s;
  - sensing delay 0.02 s, window 0.03 s.
- **Off:** phase sync; foot placement.

## 5. Contact scenes (fixed before running; `hr_scenes.mjs`)

**Shoulder scenes (SH):**
- A runs straight (RUN-1 from frame 462).
- B starts 1.1 m to A's right, half a step out of phase (frame 543), at an intended heading of −θ.
- B straightens over [t_c − 0.1, t_c + 0.2] s, where t_c is solved by bisection so that the intended COMs are 0.42 m apart.
- t_c = 1.404 s (BRUSH, 6°), 0.842 s (BUMP, 10°), 0.554 s (STRONG, 15°).

**PVP scenes:**
- CANON qR / offR from `pvp1_running/evidence/PVP1_conditions_meta.json`.
- Recipient RUN-1 clock: k0 462, kRef 568.
- TWIN: the tackler parked at its entry pose.

## 6. What the contact runs showed, in the order found

1. **BRUSH / BUMP / STRONG** (frozen 720-step records):
   - The first runs looked like a continuum: BRUSH absorbed by both runners; BUMP and STRONG topple A at +1.16 / +1.51 s.
   - B never falls. Its own intent drove the contact, and the contact mostly cancels its veer.
2. **PVP:**
   - The TWIN runs on.
   - F2 / F3 override the struck leg (authority 0.17), bring the far boot down early (+96 / +108 ms; the twin's next step is at +213 ms) and push the recipient sideways. The recipient falls at +1.01 / +0.96 s.
   - The struck boot unloads on the twin's own schedule. The tackle catches it at its toe-off.
3. **Diagnostic clip text overlap.** The C diagnostic clips had the authority bars and the collision info box drawn on top of each other. `hr_capture.cjs` now stacks them; only the C_DIAG clips were re-captured.
4. **The animation-consistency moment** was saturating after contact (diagnostic text "animation 450 N·m"). Sensitivity check `hr_sens_ac.mjs`, with the option `acCut`, null in every frozen run:
   - Removed at first contact: every struck runner falls sooner, and even BRUSH runners fall.
   - Removed at a fixed time with no contact: the runner also falls, 1.3–2.0 s later.
   - Conclusion: the moment carries load in the architecture as it stands.
5. **Extended window.** Running NC for 5 s showed a "fall" at 3.99 s. Its cause: RUN-1's run-in has 1249 frames, so an intent from frame 462 ends at step ≈ 785 (3.27 s), and the intent then freezes with zero velocity. B's intent (frame 543) ends at 2.93 s. Every scene was re-run to the end of its RUN-1 data (`hr_extend.mjs`, 783 steps; identical step for step over the first 720):
   - NC and TWIN: no fall.
   - **BRUSH: A falls at 3.158 s (+2.25 s after the brush; last contact 1.733 s).**
   - B is never down within its data.

   This changed the BRUSH reading from "absorbed" to "runs on, then falls". It is the basis of MODERATE BUMP CAN RECOVER: NO. The clip "BRUSH, late" (+0.8 → +2.35 s) was rendered from the extended record.
6. **Leg authority timing.** Leg authority after BUMP / STRONG starts to fall within +0.25 / +0.4 s, not after ~1 s as I first wrote. The page and report were corrected.
7. **Sign convention.** Checking the lateral sign: on this body thigh_L sits at −x when facing +z. `hr_analyze.mjs` uses left = local −x, the anatomical left. PVP-1's collision data used +x, so its "left" is the anatomical right. That is an erratum in the PVP-1 collision review text; it is recorded in the report, and PVP-1 is not edited.

## 7. Records

**In scratch:**
- `$S/hr/runs` (frozen, 720 steps);
- `$S/hr/runs_ext` (783 steps);
- `$S/hr/runs_sens` (sensitivity);
- `$S/hr/runs_accut`, `$S/hr/runs_long` (exploratory, superseded by the two above).

**Preserved outside Git:** `_preserved_2026-10-15_evidence_outside_git/hybrid_run1/{runs,runs_ext,runs_sens}`.
