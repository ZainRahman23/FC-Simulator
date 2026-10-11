# PVP-1A preregistration: standing recoverable player-v-player native contact (FROZEN)

**Approval:** `sources/2026-10-11_user_instruction_pvp1a_overnight_mission.md` (25a87d55).

**The referenced amendment was never received.** That instruction refers to an earlier approval and "architecture amendment". No such message exists in this session or anywhere on disk, so its contents are **not** in this freeze. Everything else in that instruction is.

**Basis:**
- the draft `PVP1_PREREGISTRATION.md` (34a50865), which this document supersedes;
- `PVP1_CASE_SELECTION_AND_READINESS.md`, accepted as the case and readiness basis;
- `evidence/PVP1_SURVEY.json`.

**What this freeze covers:** it is committed before any PVP-1A code exists and before any Jolt world containing both players is stepped. Every number below is fixed now.

**What may still change before the pre-run freeze (§13):** only the implementation of the methods described here. Any such change is disclosed. No criterion, window, threshold or decision may change.

---

## 1. Claim scope (unchanged from the draft)

**A pass shows, for this one case only:**
- Two full V2 bodies enter physics from the simulation's authoritative state at one instant: a standing R0 runner and a sliding V1-matched tackler.
- They make native contact where and when the simulation says, within the frozen tolerances.
- That contact is sustained for as long as the geometry requires.
- The two-body articulated response is mechanically valid.
- The runner stays recoverable under the simulation's own balance law, applied **offline**.
- Nothing is written back.

**It does not show:**
- moving-runner PvP or any LV2 path (that is PVP-1B, not started);
- other tackle types, falls, the stumble recovery, or the hand-back;
- live-engine neutrality;
- multi-player CPU;
- generality or production readiness;
- qualification of any body.

## 2. Frozen authoritative facts (IB1-SR, V1.3 at 5042230, gameplay hash a2678624; read only)

**Players:**
- runner vinicius, 73 kg, standing at (50, 34), facing 0, double support;
- tackler gabriel, 78 kg, H 1.90 m, slide tackle from behind (dir 0).

**Decisive contact:**
- PLAYER_CONTACT at tick 52 sub 2, **τ_sim = 51.5**;
- LEG (its far end, the tackler's boot) → **planted shin_R**, at 0.911 of the shin's length from the knee;
- point (49.970, 34.208, 0.108); normal (0.671, −0.741);
- vn 3.042, vt 3.361, J 75.64, Jfric 11.64, dvCom 0.259, spin −0.303, dvTackler 0.970;
- supportLost true; tSup 0.060 s.

**Outcome:**
- **STUMBLE / recoverable**: 3 steps × 0.32 s, until 1.927 s.
- The slide continues; the tackle is a MISS at tick 80.
- The simulation absorbed contacts at ticks 66 and 68.

**Balance-law constants** (pt_react.js ptRxResolve):
- ω0 = 3.1621 rad/s;
- obstacle 0.139 m;
- step limits fwd 0.42 / back 0.20 / out 0.30 / cross 0.12 (× leg 0.865 m);
- gStep 2.756; maxSteps 4; neg 0.03 m;
- dropCap 0.121 m;
- authoritative e0 0.312 m; FALL boundary 0.352 m.

**Rules:**
- The simulation remains authoritative. Physics and presentation explain the result and **write nothing back**.
- The balance law is **only an offline evaluator** of the recorded physical trajectory. It never feeds the physical run.

## 3. Bodies, world and controllers

**Bodies:**

| player | body | status |
|---|---|---|
| runner | **R0** (`PI1-runner-vinicius`, spec hash 62d5d797, 73.91 kg) | not globally qualified: G0 record rows never waived; G3 G / H / K′; isoSelfCol PI-1-scoped. Shown on every result |
| tackler | **V1-matched** (generateSpec(V1_MATCHED), H 1.90, 78.91 kg) | qualified; KC-4 exception accepted |

**One Jolt world, G2_WORLD settings:**
- 240 Hz, 1 collision step;
- velocity / position iterations 150 / 2;
- plane turf;
- manifold reduction off, body-pair cache off;
- discrete CCD;
- max ω 100 rad/s;
- gyroscopic on;
- no damping, no sleeping;
- Jolt 5.6.0;
- the frozen contact policy. **The two specs' contact configurations must be identical, or hard stop H1.**

**The two-character build:**
- one **combined spec**: runner bodies 0–13, then tackler bodies 14–27, joints re-indexed;
- disabled pairs only *within* each character;
- every cross-character pair collides;
- built by the **unmodified** V2JoltWorld (`core/v2_jolt.js`).

**Per character**, its own unmodified components, each driving its own joints and bodies through an index-offset view of the shared world:
- PassiveLayer (v2k knee);
- ActuatorLayer;
- StandController with SLP_STAND, used only to supply PostureDriver's model;
- PostureDriver.

**Order per step** (G2Sim's own order):
1. both characters apply their passive and actuator plans;
2. one world step;
3. read;
4. damping loss and actuator after-step for each;
5. passive compute, SnapshotTone command and actuator compute for each;
6. measure.

**Controllers:** IFM-1's SnapshotTone, unchanged.
- K, D and the statics feed-forward come once from PostureDriver at entry.
- Support flags: runner **(1, 1)**, tackler **(0, 0)**.
- a0 = the entry joint coordinates; ȧ0 from the entry relative angular velocities (expected 0 for both); targets constant.
- Target-domain rule as in IFM-1.

**Nothing changes, anywhere:** no gain, friction, solver, geometry or threshold.

## 4. Activation and entry (one instant, both players)

**Instant:**
- **τ_act = 51.0**: the end of row 50, two sub-steps before τ_sim.
- Fallback only: if any cross-character V2 clearance < 1 mm at 51.0, take the latest earlier sub-step boundary ≥ 50.0 that clears.
- No boundary clears → H3.

**Frame:** local coordinates = the anim3d world (x = pitch x, y up, z = −pitch y) minus (50, 0, −34).

**Runner:**
- The frozen MC-1 mapper on R0's frames, applied to the LOCO presentation pose of row 50. That pose is static over rows 30–51.
- Every rig velocity is 0; legs L and R are stance.
- Grounding: one vertical translation, so the lowest boot point is +0.5 mm. Above 10 mm → H3.
- HG-A shift = 0, since the authoritative velocity is 0.

**Tackler: the primitive fit, at τ_act.**

| primitive | V1-matched bodies |
|---|---|
| LEG | shank_L + foot_L |
| THIGH | thigh_L |
| TUCK | thigh_R |
| TUCKSHIN | shank_R |
| BODY | pelvis |
| TRUNK | lumbar, thoracic and neck joint centres |

**Fit procedure:**
- Projected Levenberg–Marquardt inside the hard ranges.
- Free: pelvis pose; lumbar, thoracic, hips, knees, ankles.
- Fixed at V2 canonical: neck, shoulders and elbows.
- Objective, in priority order:
  1. the left boot's forward-most collider point along the LEG axis û sits at the LEG primitive's forward extreme, b + 0.07·û;
  2. the shank_L joint centres lie on the LEG line;
  3. the other joint centres lie on their primitive lines, with weak attraction to the primitive endpoints;
  4. a very small angle regulariser.

**Grounding:** one vertical translation, so the tackler's lowest collider point is at +0.5 mm.

**Velocities:** every tackler body gets the authoritative common primitive velocity at τ_act, (4.625, 0, 0) m/s, with ω = 0. This is an exact rigid motion.

**Fit gates** (evaluated after grounding; else **H2 TACKLER_FIT_BLOCKED**):

| gate | requirement |
|---|---|
| G-T1 | boot forward point within **10 mm** of b + 0.07·û, and the boot hull centroid within **10 mm** of the LEG line |
| G-T2 | knee_L and ankle_L joint centres within **30 mm** of the LEG line |
| G-T3 | every other fitted joint centre within **30 mm** of its primitive line; the pelvis COM within 30 mm of the BODY segment |
| G-T4 | grounding shift \|Δz\| ≤ **30 mm** |

Joints at a hard limit are reported.

**Entry checks for both** (IFM-1 numbers; else H3):
- anchors ≤ 1e-6 m;
- inside the hard ranges;
- turf penetration ≤ 1 mm;
- self-penetration ≤ 10 mm;
- read-back after the writes;
- momentum read-back ≤ 0.01 N·s per character;
- 28 + 28 authority writes;
- no cross-character overlap.

**What physics receives:** only the τ_act state. Authoritative data after τ_act reaches only the evaluator.

## 5. Modes, horizon and windows

| mode | definition |
|---|---|
| **C0** | Cross-character contacts rejected through the listener's validate callback. The tackler passes through. This is the control for both players |
| **N2** | Native contact |
| **X2** | Diagnostic, offline. N2 to the end of the first step that has a physical cross contact; full snapshot; the no-op restore must be bit-identical to uninterrupted N2; then cross contacts are rejected |

**Horizon:** **260 steps**, from τ_act 51.0 to τ 116.0 (the end of the authoritative reaction window, row 115).

| window | steps | span |
|---|---|---|
| **primary** | 1–14 | to τ_sim + 50 ms = τ 54.5 |
| **secondary** | 15–36 | to 150 ms after activation |
| **diagnostic continuation** | 37–260 | to τ 116.0; never evidence of validity |

**Trust:**
- For each character and each criterion, the step of its first failure is recorded.
- Every result after that step is labelled untrusted for that character.

## 6. Contact, correspondence and the causal ledger

**Physical contact:** a cross-character manifold whose decoded impulse is ≥ 1e-3 N·s in a step (REV2 A2). Decoding uses IFM-1's reconstruction: post-step cache, pre-step COM transforms.

**Contact begins / ends:** the first and last step with a cross contact, plus every interval.

**Correspondence** (the frozen PI-1 CG rows, REV2's physical form with A2 / E1, "stand-in" = the tackler body):

| row | requirement |
|---|---|
| CG-1 | the first contact is runner shank_R vs the tackler's shank_L / foot_L; adjacent runner bodies only within 30 mm of the shared joint |
| CG-2 | both runner boots planted (lowest ≤ 5 mm) at the first contact |
| CG-3 | \|t_phys − 51.5\| ≤ 1 tick |
| CG-4 | the point within 0.10 m of (49.970, 34.208), in the same segment region (±0.25) |
| CG-5 | the held physical runner pose vs the authoritative LEG over [51.5, 51.5 + 0.10 s]: max penetration ÷ the simulation's max unperturbed overlap ∈ [1/3, 3] |
| CG-6 | normal within 45°; approach relative velocity (pre-step) within 45° |

**Authority contradictions:**
- **PHYSICS_MISS:** no physical contact by τ_sim + 1 tick.
- **EXTRA_CONTACT:** a physical pair other than runner shank_R / foot_R vs tackler shank_L / foot_L that carries > 10 % of the primary-window cross impulse.

**Equal and opposite:**
- Per step, the Σ of decoded cross impulses on the runner plus the Σ on the tackler is ≤ 1e-9 N·s.
- The same holds for moments about O.

**Recorded every step:**
- all 28 bodies: position, rotation, COM, v, ω;
- every manifold: pair, sub-shapes, normal, points, depth, per-point normal impulse, friction impulse and point, angular friction;
- per-character turf impulses and foot loads;
- joint coordinates (per joint, per axis);
- actuator torques, saturation and work;
- passive U and damping loss;
- each character's and the system's COM, P, and L about O (O = the system COM at entry);
- energies;
- integrity values;
- hashes.

## 7. Integrity and ledgers (IFM-1's frozen numbers)

**Integrity, per character, per step:**
- finite state;
- anchor separation ≤ 1 mm;
- self-penetration ≤ 10 mm;
- **cross-character penetration ≤ 10 mm**;
- turf penetration ≤ 10 mm (exact collider geometry);
- engine-stop contact 0 steps (margin < 0.25°, as G1 defines it);
- actuator over-capacity 0;
- **safe stop:** non-finite, or any body > 25 m/s.

**Ledgers:**

| ledger | external terms | limits |
|---|---|---|
| per character, linear and angular (about O, position-correction term included) | gravity, turf, cross contacts | ≤ 0.01 per step; ≤ 0.05 cumulative over the primary window |
| combined system | gravity, turf only | ≤ 0.01 per step; ≤ 0.05 cumulative over the primary window |
| energy (combined system) | — | Σ⁺ of ΔE − (W_act − D) ≤ 0.5 J primary, ≤ 5 J secondary |

Per-character energy residuals (cross-contact work included) are reported.

**Statuses:** primary failure → NATIVE_INTEGRITY_FAILED. Later failure → SECONDARY_FAILURE_AT(t), per character. A valid primary result is always preserved.

## 8. Controls (C0)

C0 is valid over the primary window only if both of the following hold.

**Runner:**
- both foot bodies receive turf normal impulse > 0 in every step;
- boot sole-centroid travel ≤ 10 mm;
- pelvis COM height ≥ 0.85 × entry;
- no non-foot turf contact;
- integrity and ledgers pass.

**Tackler:**
- the boot forward point tracks the authoritative LEG forward extreme, advanced with the authoritative primitives every sub-step: ≤ **10 mm** to τ_sim, and ≤ **30 mm** through the primary window;
- COM v_x > 0;
- integrity and ledgers pass.

**Otherwise:** CONTROL_INVALID_PRIMARY. N2 is reported but not interpreted.

**Isolation (H6):** each character in C0 must match the same character alone in a one-character world built by the same code, bit-identically or within ≤ 1e-6 m / 1e-6 rad over the primary and secondary windows.

## 9. Outcome consistency (an offline evaluator)

**Runner, over the primary and secondary windows:**

| row | requirement |
|---|---|
| OC-1 | no runner non-foot body touches the turf (a manifold with impulse > 0, or depth > 0.5 mm) |
| OC-2 | pelvis COM drop ≤ 0.121 m |
| OC-3 | the simulation's balance law on the physical state (procedure below) |

**OC-3 procedure:**
1. At t\* = t_phys + 0.060 s, take e = (c_h + v_h / ω0) − ankle_L,h. Here c and v are the runner's whole-body COM with V2 masses (horizontal pitch plane), and ankle_L is the physical left ankle joint centre.
2. eH = |e| + 0.139.
3. rc = leg · hypot(e_f · (fwd if e_f > 0 else back), e_r · (out if outward else cross)). This is the simulation's formula, with facing 0 and step side L.
4. Recursion with gStep 2.756 for up to 4 steps.

**OC-3 classes:**
- NEGLIGIBLE (eH ≤ 0.03) → RESPONSE_WEAKER_THAN_AUTHORITY;
- CORRECTION / STUMBLE → **OUTCOME_CONSISTENT**;
- FALL → **OUTCOME_INCONSISTENT**.

**Tackler, OC-T:** COM v_x > 0 over the primary and secondary windows. Otherwise OUTCOME_INCONSISTENT (tackler).

**Diagnostic continuation (described, never a gate):**
- e(t) and the law's class evaluated at every step;
- runner state per step: SUPPORTED (a foot loaded, no non-foot turf contact), COLLAPSED (non-foot turf contact or pelvis drop > 0.121 m), or AIRBORNE;
- the first COLLAPSED time;
- the final state.

## 10. Response analysis (descriptive, frozen definitions)

**Detectability, N2 vs C0, per body** (IFM-1's thresholds): position ≥ 1 mm or orientation ≥ 0.1°.
- **Onset time** per body: its first detectable step.
- **Propagation:** the onset order along runner shank_R → foot_R / thigh_R → pelvis → abdomen → thorax → head / arms, and along tackler foot_L → shank_L → thigh_L → pelvis → trunk.

**Tackler physically affected:** any tackler body is detectable vs C0 by the end of the primary window. Also reported:
- tackler COM Δv (N2 − C0);
- the total cross impulse on the tackler.

**Articulation:**
- per-joint coordinate deviation, N2 vs C0;
- pelvis rigid deviation vs limb deviation;
- whether remote bodies (head, arms, the tackler's trunk) stay below detectability in the first 4 steps after contact.

**Continued contact:**
- the count and intervals of contact steps;
- N2 vs X2 over 0–50 ms after the first contact, using IFM-1's equivalence test (landmarks ≤ 10 mm, torso / struck-segment orientation ≤ 3°, the same support pattern). Not equivalent means continued contact matters.

**Physical vs model:** physical cross impulses, Δv_COM and spin are compared with the simulation's J / dvCom / spin / dvTackler. These are different models, compared descriptively.

## 11. Determinism, neutrality, CPU

**Determinism:**
- C0 and N2 each run twice in fresh processes, plus once more in reverse order in one process (fresh world per run).
- All must be bit-identical over 260 steps, by state hash per step.
- The X2 no-op restore must be bit-identical.
- Rendered poses and pixels must be repeatable.

**Neutrality:**
- ib_verify 59 / 1 / 0, before and after.
- Gameplay hash a2678624 recomputed from the consumed rows and events, before and after.
- Read-only opens; no write path.
- Status: **READ_ONLY_RECORD_NEUTRALITY_PROVEN / LIVE_NEUTRALITY_NOT_TESTED.**

**CPU:**
- One warm-up and 20 replays each for C0 and N2, instrumentation off.
- Per-step median / p95 / max over steps 1–36 and 1–260.
- 50 / 150 ms event totals.
- Components: Jolt, passive, actuators, tone.
- Entry costs: MC-1 and the primary fit.
- The overhead of the X2 branch.
- Measured, not extrapolated.

## 12. Visual review

| view | specification |
|---|---|
| **A. Gameplay** | the frozen RUN-1 viewer and character renderer, CAMERA_V1, zoom 1, 1280 × 720, normal speed. The rail follows the mean authoritative x of both players. 250 ms before activation, then the record. Clean |
| **B. Slow-motion close** | the viewer's own **6×** zoom (same pose and perspective), subject-centred on both players, every record step, at 0.25× and 0.1× |
| **C. Diagnostic** | the same frames, plus skeletons, struck colliders, cross-contact points / normals / impulses, support loads, COM, momentum indicators, and the authoritative primitives as outlines |
| **D. C0 vs N2 side by side** | identical start, time and camera; frame stepping and scrubbing; a contact marker |

**Common to all views:**
- Players: vinicius on R0, gabriel on V1-matched. Both meshes are frozen tag assets.
- Render rule: MC-1 §2(4).
- Before activation:
  - the runner shows the LOCO presentation;
  - the tackler shows the τ_act fit, rigidly carried by the authoritative BODY-primitive displacement and labelled as constructed.
- Nothing is interpolated or amplified, and no authored animation is added.
- Every view shows trust and window markers.

**Pixel screen:** IFM-1's 2 px marker on runner knee_R, ankle_R and the contact witness. Reported only.

**Visual status:** VISUAL_PENDING until you review.

## 13. Sequence and pre-run freeze

1. Commit this freeze.
2. Bind the inputs (manifest).
3. Build the harness.
4. The geometry-only fixture: entries, fit gates, clearances, the kinematically predicted first-contact pair.
5. **Pre-run freeze**: fixture plus implementation hashes, committed **before any two-character Jolt stepping**.
6. Run C0, N2, X2, the determinism runs and CPU.
7. Evaluate.
8. Render.
9. Write the results and the morning report.

**After results are seen:**
- **Harness bug:** the original is preserved, the correction is recorded separately, and corrected evaluations are labelled.
- **Physical fix found:** it is investigated only on a separately named experiment, never inside PVP-1A.

## 14. Hard stops

| # | condition |
|---|---|
| H1 | provenance: record / tag / simulation / spec hashes or contact configurations differ, or ib_verify ≠ 59 / 1 / 0 |
| H2 | TACKLER_FIT_BLOCKED |
| H3 | INITIALIZATION_INVALID: no clear instant, overlap, entry-check failure, or invalid runner mapping |
| H4 | CONTROL_INVALID_PRIMARY: N2 still reported, not interpreted |
| H5 | safe stop |
| H6 | isolation failure |
| H7 | any need to change physics, gains, geometry, the solver, thresholds or the simulation |

## 15. Verdicts (unchanged from the draft)

| verdict | when |
|---|---|
| **SUCCESS (scoped)** | entries and C0 valid; CG-1…6; N2 primary mechanics valid; OC-1…3 and OC-T consistent; determinism and neutrality; your visual acceptance |
| **MECHANICAL PASS** | all of the above, with the visual review pending |
| **PARTIAL** | entries, C0 and primary mechanics valid, plus any of: a CG row fails while contact still occurs within ±1 tick; RESPONSE_WEAKER; consistency in the primary window only; SECONDARY_FAILURE; EXTRA_CONTACT; not visible |
| **ARCHITECTURAL FAILURE** | with valid entries and C0: PHYSICS_MISS; OUTCOME_INCONSISTENT (runner or tackler); or primary NATIVE_INTEGRITY_FAILED |
| **BLOCKED** | H1–H3, H6 or H7 |

Stop before PVP-1B.
