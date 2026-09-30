# Physical Character V1.1 — anatomy / joint-ROM calibration

**Status:** built, measured, awaiting your visual review · worktree `physical-character-v1` · **nothing committed or pushed** · C3 not started.
**Date:** 2026-09-30 · Jolt 5.6.0 · 240 Hz × 1 · one character, one process, one headless browser, sequential runs.

The V1 baseline stays reproducible. Every approved Gate A/B/C1/C2 test re-runs **bit-identically** under `--calib V1`. V1.1 is a separate calibration (`--calib V1.1`), and the harness switches between the two bodies live.

## 0 · Summary

| question | answer |
|---|---|
| Why were the hips 32 cm apart? | The Astra shared-skeleton template hangs each leg from x = ±0.1805 m. For this player that becomes ±0.1615 m, i.e. **81 % of the visible hip half-width**. Human hip joint centres sit at about ±9 cm. It was a rig property, not a physics or collider choice. |
| Corrected spacing | **18.4 cm** (±9.2 cm; Bardakos & Freeman 2012, Hara 2016, Harrington 2007). The mesh, colliders and visible width (40.8 cm) are unchanged. |
| Single-leg stance | Static hip-abduction demand drops **124 → 74 N·m** (88 → 53 % of the unchanged 140 N·m cap). The 13.4° compensating lean is no longer needed (0°). Measured in a 20 s hold: **98 → {{SL_V11_MEAN}} N·m** (70 → {{SL_V11_PCT}} % of the limit), no lean, held 20.45 s. |
| Dorsiflexion | 20° was a non-weight-bearing, knee-extended number applied to a loaded, knee-flexed stance ankle. V1.1 uses 30°, still well inside the weight-bearing norm (> 40°). The neutral orientation and ankle joint centre were correct. |
| Muscles | **No capacity raised.** Four caps were *lowered* to the evidence: hip flexion 190 → 170, hip extension 250 → 230, shoulder abduction 65 → 60, elbow flexion 75 → 60 N·m. Hip abduction stays 140. |
| Gate B / C1 | Same or better. C1 PR50 now **recovers** (V1 fell); PR45 recovers in 0.83 s (V1 2.83 s). |
| Gate A | **Regressions:** drop A knee-stop energy injection +{{A_EGAIN}} J (V1 2.6 J); drop B shoulder hard-limit excursion 16.4° (V1 5.6°); elbow soft-stop overshoots; drop E starts with the arm inside the head (a V1-authored pose). |
| Gate C2, approved controller | **Regression:** no weight transfer completes. The swing foot keeps 85 N against the 38 N gate. |
| C2 + the recalibrations the anatomy requires (R1, R2) | Still no transfer (57 N). J_repeat falls. |
| C2 + diagnostic D1 (not adopted) | The V1.1 body *can* do it: {{D1_SUMMARY}}. |
| Recommendation | Adopt V1.1 as the anatomical body. **Do not** make it the working baseline until you rule on the C2 controller item (D1), forward-step acceptance under the larger ROM, and the Gate A items (§16). |

## 1 · Research summary and sources

| quantity | evidence | used in V1.1 |
|---|---|---|
| Hip joint centre (HJC), medio-lateral | Bardakos & Freeman 2012: 90.6 mm from the midline (men). Hara et al. 2016 (CT, n = 157): ML = 8 + 0.086·LL mm ≈ 92 mm here. Harrington et al. 2007 (Bell/Davis/Harrington review): ≈ 90 mm | **±0.092 m** |
| HJC height | Drillis & Contini: greater trochanter ≈ 0.530 H | unchanged (0.533 H) |
| Pelvis width | the visible mesh is 40.8 cm at hip-centre height. Male bi-trochanteric breadth is ≈ 33–36 cm, so human HJC spacing is ≈ 50–55 % of it | mesh unchanged |
| Knee joint centre | hip–knee–ankle mechanical alignment ≈ 180 ± 3° (neutral) | on the hip→ankle line (±0.128 m) |
| Ankle joint centre | ≈ malleolar height (≈ 0.04–0.05 H) | mesh value kept (0.088 m) |
| Shoulder joint centre | glenohumeral centre ≈ 5–7 cm below acromion height (acromion 0.818 H = 1.554 m). The rig's (±0.258, 1.595) lies 8 cm *above* the deltoid cap, outside the mesh | **(±0.245, 1.485)** |
| Segment masses / COMs / radii of gyration | de Leva 1996 (male columns) | unchanged fractions. COM now on the joint-centre line |
| ROM | CDC normative joint motion (Soucie et al. 2011, males 20–44): hip flex 130.4, **hip ext 17.4**, knee flex 137.7, **ankle DF 12.7 (non-weight-bearing, knee extended)**, PF 54.6, shoulder flex 168.8, elbow flex 144.6. Weight-bearing lunge test norms: DF **> 40°** | §5 |
| Strength | Harbo et al. 2012 (isometric, men < 30 y): knee ext 265 ± 73, **hip flex 167 ± 37**, DF 44 ± 11, **shoulder abd 60 ± 14**, **elbow flex 50 ± 18** N·m. Isokinetic: **hip ext 197 ± 58**, knee flex 106, PF 128. Hip abduction ≈ 1.3–1.9 N·m/kg (≈ 101–148 N·m at 78 kg) | §6 |

Distinguishing **visible width** from **joint-centre width**: the eye reads the pelvis at its surface (40.8 cm here). The femoral heads sit deep inside, about 9 cm either side of the midline, with the greater trochanters and gluteal mass lateral to them. V1 used a template joint at 79 % of the visible half-width. V1.1 moves only the joint centres. The mesh and every collider are the same in world space.

## 2 · Why the hip centres were 32 cm apart

1. The Astra shared skeleton (`canonical/source/data/shared-skeleton.json`) places `thigh_R` at **x = +0.1805 m** (mirror for L), with the legs as straight vertical columns.
2. Per player: x = (0.1805 − `hipJointNarrowingM` 0.026) × `girdleWidth` 1.04 × (1.90 / 1.85)^0.2 = **0.1615 m**, so 32.3 cm apart. The mesh is built around those columns, so the feet also sit at ±0.161 m.
3. V1 used the rig bone origins as joint centres (§4 of the architecture), so the physics inherited the template's 32.3 cm. That is **1.76×** the human 18.4 cm.
4. Consequence (Gate C2): the single-leg abduction moment arm grows with the half-spacing d, τ0 = g[m_up·d + m_pel·d + m_leg·(2d + e)] = 124 N·m (88 % of the cap). The controller had to lean the trunk 13.4° over the stance hip to bring it to 98 N·m.

It was not the colliders, the controller or the physics: it was a rig-template property carried into the physics.

## 3 · Corrected hip spacing

`CALIBS["V1.1"].centres.thigh.x = 0.092` gives **18.4 cm**. Knees go on the hip→ankle line (±0.128 m). Keeping them at the mesh's ±0.1615 made an 8.2° varus leg, and its two-bone IK fought the knee hinge: quiet stance saturated ankle roll at ±32 N·m. The knee hinge axis is now perpendicular to the straight, splayed bind leg. Ankles stay at the mesh (±0.161). The neutral stance is therefore a **4.3°-splayed** stance: feet 32.3 cm apart under hips 18.4 cm apart, a shoulder-width stance. Hip ab/ad and ankle inv/ev limits are re-expressed about that bind, so the anatomical ranges are unchanged: the bind femur is 4.3° abducted and the bind foot 4.3° inverted.

![anatomy](contact_sheet_anatomy.jpg)

## 4 · The 14 bodies: V1 → V1.1 parameter table

Joint centre (JC), segment length, mass, COM, inertia and collider for every body. The audit checks the physics skeleton against the rendered (rig) skeleton. Full machine output: `json/spec_v1_vs_v11.json` / `.txt`.

| body | parent joint | JC V1 → V1.1 (m) | length | mass kg | COM (world) V1 → V1.1 | collider | fit % | rendered region |
|---|---|---|---|---|---|---|---|---|
| pelvis | root | (0, 1.012, 0) | — | 8.71 | y 1.058 | box 0.36 × 0.27 × 0.24 | 88.6 | pelvis / shorts |
| abdomen | lumbar | (0, 1.129, 0) | — | 12.74 | y 1.257 | box | 86.4 | lower trunk |
| chest | thoracic | (0, 1.362, 0) | — | 12.45 | y 1.552 | box | 87.1 | upper trunk + clavicles |
| head | neck | (0, 1.634, 0) | — | 5.41 | y 1.767 | sphere + neck capsule | 91.3 | head, neck (no hair) |
| upperArm L/R | shoulder | **(±0.258, 1.595) → (±0.245, 1.485)** | **0.343 → 0.234** | 2.11 | (±0.258, 1.397) → **(±0.253, 1.350)** | tapered capsule, **world-identical** | 78.5 | upper arm |
| foreArm L/R | elbow | (±0.258, 1.251) | — | 1.74 | (±0.258, 1.048) | tapered capsule + hand capsule | 72 | forearm + hand |
| thigh L/R | hip | **(±0.1615, 1.012) → (±0.092, 1.012)** | 0.482 → 0.484 | 11.04 | (±0.162, 0.815) → **(±0.107, 0.815)** | tapered capsule, **world-identical** | 75.5 | thigh |
| shin L/R | knee | **(±0.1615, 0.530) → (±0.128, 0.530)** | 0.442 → 0.443 | 3.38 | (±0.162, 0.333) → **(±0.143, 0.333)** | tapered capsule, **world-identical** | 70.3 | shank |
| foot L/R | ankle | (±0.161, 0.088) | — | 1.07 | (±0.162, 0.045, 0.077) | box (boot) | 100 | boot |

Total **78.000 kg** in both. Left and right are mass- and geometry-symmetric in both. Whole-body COM at bind: 0.567 H (V1) → 0.565 H (V1.1).

**Physics vs rendered skeleton.** In V1 the physics skeleton *is* the rig skeleton. In V1.1 the rendered chain (harness: *Anatomy → rendered skeleton*) keeps the rig's hip at ±16 cm and its shoulder 8 cm above the cap. The physics centres sit where the anatomy is. Skinning uses M = [R_body | pos − R·origin], so a relocated origin needs no render change: at bind the two skeletons coincide on the mesh. Under large rotations the mesh region skinned to a body still rotates about the *anatomical* centre, which is the intended correction.

## 5 · ROM: current → evidence → V1.1

| joint · axis | V1 | evidence | V1.1 |
|---|---|---|---|
| hip flexion | 120 | 130 (CDC, knee flexed); ~80–90 straight-leg | 120 (kept) |
| **hip extension** | **30** | **17.4** (CDC males) | **20** |
| hip abduction / adduction | 45 / 30 about the vertical femur | 40–45 / 30 (AAOS) | 45 / 30 **anatomical**, re-expressed about the 4.3°-abducted bind (R: −34.3…+40.7 from bind) |
| hip rotation | ±45 | 35–45 | ±45 (kept) |
| knee flexion / hyperext. | 140 / 3 | 137.7 / 0–5 | kept |
| **ankle dorsiflexion** | **20** | 12.7 NWB knee-extended · **> 40 weight-bearing lunge** | **30** |
| ankle plantarflexion | 50 | 54.6 | kept |
| ankle inversion / eversion | 35 / 15 about the bind | 35 / 15 (AAOS, subtalar + midfoot) | 35 / 15 **anatomical**, re-expressed about the 4.3°-inverted bind (R: −30.7…+19.3) |
| ankle "twist" (foot ab/adduction) | ±10 | forefoot ab/adduction ≈ 10–20; the model's knee has no axial rotation | ±10 (kept — see §15) |
| shoulder flex / ext / abd | 150 / 50 / 150 | 168.8 / 50–60 / 180 incl. scapula (no scapula here) | kept |
| elbow | −2…145 | 144.6 | kept |
| spine, neck | as C1 | within AAOS ranges | kept |

**The 20° dorsiflexion investigation:**
- **Neutral orientation:** correct. At bind the foot is flat and the shank vertical in the sagittal plane; the V1.1 splay is frontal-plane only.
- **Ankle joint centre:** correct at 0.088 m (≈ malleolar height).
- **Stance consumption:** the nominal standing posture (slightly flexed knees) already uses **8.1°** of dorsiflexion (C1 QS20, both bodies), leaving 11.9° in V1.
- **Range:** this is the error. 20° lies between the non-weight-bearing, knee-extended norm (12.7°, gastrocnemius-limited) and the weight-bearing, knee-flexed norm (> 40°, soleus-limited). A stance ankle is loaded with the knee flexed, so 30° is a conservative value inside the evidence.

The approved C2 build never sat on the DF stop (0 ms at the stop in every C2 test). The limit bound indirectly: it capped the pelvis lowering the feasibility planner allows, and the lift shin angle. It was not raised to make C2 pass. Its consequence is that forward and far steps now pass feasibility at greater length (§11), and D_fwd_R and G_far then lose balance in acceptance (§12).

## 6 · Torque audit

Base caps (N·m, before the controller's strength multiplier, 1.0 for "candidate"):

| joint · direction | V1 (C1) | evidence | V1.1 |
|---|---|---|---|
| **hip flexion** | **190** | 167 ± 37 isometric | **170** |
| **hip extension** | **250** | 197 ± 58 isokinetic (isometric higher) | **230** |
| hip abduction / adduction | 140 | 1.3–1.9 N·m/kg → 101–148 | 140 (kept, **not raised**) |
| hip rotation | 60 | 40–60 | 60 |
| knee extension / flexion | 250 / 130 | 265 ± 73 / 106 isokinetic (isometric ≈ 130–150) | kept |
| ankle DF / PF / inv-ev | 45 / 150 / 35 | 44 ± 11 / 128 isokinetic (isometric 150+) / — | kept |
| **shoulder abduction** | **65** | 60 ± 14 | **60** |
| **elbow flexion** | **75** | 50 ± 18 | **60** |
| elbow extension, spine, neck | as C1 | within evidence | kept |

**Multi-axis total-effort budget:** unchanged. The M2 policy scales each axis's cap by its share of the rotation-error direction (floor 25 %), which keeps the vector effort within about 1.06× the directional budget. One V1.1 side-effect: the hip twist axis is now the femur's mechanical axis (hip→knee, 4.3° off vertical). About 7.5 % of a sagittal hip moment projects onto twist, and during C2 transfers and acceptance the stance hip's twist sits at its 25 % floor (15 N·m) for about 2 s. It is reported (§15), not tuned. Abduction (Z) never saturates.

## 7 · Mass / COM / inertia

- **Masses:** de Leva fractions × 78 kg, unchanged. Symmetric; total 78.000 kg.
- **COM:** V1 placed each limb COM at de Leva's fraction *straight below* the proximal centre, which was correct while the segment line was vertical. With relocated centres the thigh and shank lines tilt 4.3° and the upper-arm line 3°. V1.1 places the COM **on the joint-centre line** (de Leva's definition): thigh ±0.107 (not ±0.092), shank ±0.143, upper arm ±0.253. This is a real biomechanical correction.
- **Collider volume** is not used anywhere as a mass source.
- **Inertia:** de Leva radii of gyration × stature ratio, diagonal in body (world-bind) axes. The 4.3° segment tilt adds an off-diagonal term of about 6 % of the transverse moment, inside de Leva's inter-subject spread. Every measurement (KE, sensed angular momentum) assumes the diagonal form, so it is **left diagonal** and noted as an approximation.

## 8 · Colliders

**No collider changes.** Every V1.1 collider is world-identical to V1 (the same fit % in the table above). Colliders describe the visible body. The fit for a limb with a relocated centre is done along the rig segment and re-expressed about the new centre.

Two intermediate V1.1 builds got this wrong, and I corrected both before measuring:
1. Refitting along the new centre lines slid the fit windows. The upper arm (11 cm shorter centre→elbow line) got a thinner, shorter capsule covering **65 %** of its vertices instead of 79 %. A deltoid-sphere patch only partly compensated.
2. The chest box read the relocated shoulder x for its arm cut-off and narrowed by 7 mm.

Upper-arm coverage, own colliders / ∪ chest ∪ forearm: V1 78.5 / 87.7 %, V1.1 78.5 / 87.7 %. The boot box (35.7 cm) is longer than an anatomical foot (≈ 27–30 cm). It is stylised and was left alone, as the brief asks: no inflation, only mechanical errors.

## 9 · Controller consequences: anatomical correction vs recalibration

With the anatomical body, the **approved C2 controller rejects every weight transfer**: the swing foot keeps 85 N against the 5 % = 38 N lift gate. Three separate items came out of the diagnosis.

**R1 — reach checked where the pelvis is going (`anticipateReach`, opt-in, off for V1). Logically required by the splay.** With hips narrower than feet, the unloading leg goes taut at 99.6–99.8 % extension before the COM reaches the stance foot. It then carries load as a strut, and ξ stalled 1.7 cm short. The pelvis-lowering reach check now also evaluates the planned COM goal. Result: 85 → 57 N.

**R2 — the runtime reach target equals the feasibility target (`reachToGround`, opt-in, off for V1). Logically required by the narrower hips.** The feasibility check lowers the pelvis to reach the touchdown depth (flat − 5 mm). The runtime pelvis lowering aimed at the approach point 15 mm *above* flat. V1's wider hips left about 2 % reach slack that hid the 2 cm inconsistency. In V1.1, single-support reach back to the old footprint needs about 100 % extension, and the straight leg hung 9 mm above the turf ("no ground contact 0.8 s after the planned touchdown").

**What still blocks the transfer (not caused by the anatomy, not fixed):**
- The transfer's ξ target is the stance *weight point*, about 5 cm behind the sole-centre line. At that equilibrium, `split2`'s minimum-ankle-effort distribution keeps about 4–8 % of the weight on the swing foot, because the fore-aft CoP demand is shared by two ankles.
- V1 only lifted because its realised CoP was biased **+6 mm medially**, so ξ overshot 1.5 cm past the target and the swing share went to zero.
- V1.1's realised CoP is biased **−5 mm laterally**. The CoP-law equilibrium then settles ξ − ξref = −b / kXi = **1 cm short**, and the swing foot keeps 57 N.
- (Probe at B_lift_R t = 2.4 s: ξ −15.2 cm, ξref −16.1, p* −14.7, measured CoP −15.2.)

The approved controller's lift criterion therefore depended on a favourable, unmodelled bias.

**D1 — diagnostic only (`--diag-unload`, not adopted, not part of any calibration).** During a planned TRANSFER the foot being unloaded gets zero commanded share whenever p* already lies inside the stance foot's contact polygon. It adds no strength and no external force. It shows the V1.1 body **can** unload: liftoff after 1.54 s, the same as V1's 1.55 s. It is a controller-policy change you have not approved. I report it separately and do not use it to restore the old result.

{{TABLE:Gate C2}}

## 10 · Single-leg comparison (deliverable 9)

{{TABLE:Single-leg}}

Statics, not tuning: the free leg's COM now sits 2.6 cm lateral of its hip (e ≠ 0, because the COM is on the splayed leg line). That term is in τ0 and in the single-support pelvis offset (it is 0 for V1, so V1 is bit-exact). The planned lean is the lean needed to bring τ0 to the 70 % target. V1.1 needs none.

![behaviour](contact_sheet_behaviour.jpg)

## 11 · Ankle and placement comparison (deliverable 10)

{{TABLE:Ankle and placement}}

- No test in either body spends any time at the dorsiflexion stop.
- V1.1 uses more of its range: stance up to 22.5° of 30°, swing up to 25.3°. That is the larger ROM being used, not a stop.
- The feasibility planner is ROM-derived, so it now **accepts longer steps**: G_far 34.8 cm (V1 27.1), H_uneven 33.6 (27.1), D_fwd 28.6 (27.1), backward E_bwd −6.4 (−1.6).
- H_uneven, E_bwd and C_lat succeed at those lengths with D1: E_bwd lands 3.3 cm from target (V1 8.1 cm, on its toe). D_fwd_R and G_far lose balance in acceptance.
- Close and crossed placement are preserved: F_onfoot and F_cross are corrected exactly as in V1 (19.7 / 28.1 cm) and complete. No foot-separation rule was added.

## 12 · Gate A / B / C1 / C2 regression results (deliverable 11)

{{TABLE:V1 preservation}}

{{TABLE:Gate A}}

Gate A's "limit" column is the largest limit excursion, **soft stops included**. Knee and elbow stops are 20 Hz soft springs designed to be overshot under impact. **Hard**-limit violations, V1 → V1.1: A 0.9 → 2.3°, **B 5.6 → 16.4°** (shoulder_R, 206 steps > 2°), C 4.2 → 2.6°, D 5.3 → 2.6°, E 7.2 → 2.4°.

{{TABLE:Gate B}}

{{TABLE:Gate C1}}

Higher quiet-stance hip effort (22 % vs 4 %) is the splayed-stance statics: each hip holds 24 N·m of ab/ad torque (Z axis), about 17 % of its cap, where V1 held 0.2 N·m. That is physically correct for feet wider than hips.

![regressions](contact_sheet_regressions.jpg)

## 13 · Interactive before/after harness (deliverable 12)

`sandbox/visual/physchar/index.html` (served on :8171) now has:
- **body** selector: V1 approved / V1.1. It rebuilds the spec and poses and re-simulates the same test.
- **C2 controller** selector: as approved / + R1·R2 / + R1·R2 + D1 diagnostic.
- An **Anatomy** overlay row:
  - V1 ↔ V1.1 hip and shoulder centres drawn together on the live pelvis and chest (red V1, green V1.1, with spacing labels);
  - the visible hip width;
  - the physics skeleton and the rendered rig skeleton;
  - segment COMs, joint-limit cones, and live joint angles with limit margins.
- A side panel table of this body's anatomy vs the other body (centres, ROM, caps, mass, single-leg statics).

Each side panel's Node-suite hash comparison follows the selected body and controller. URL: `index.html?suite=C2&test=B_hold_R&calib=V1.1&ctrl=diag`. Existing overlays (colliders, COM, ξ, support, CoP, torque, saturation, footprints) are unchanged.

**Browser = Node:** {{XRT}} (every V1.1 Gate A/B/C1 test, every C2 test in all three controller variants, and V1 C2 spot checks) — `crossruntime.txt`.

## 14 · Determinism and performance (deliverables 13, 14)

{{TABLE:Performance}}

{{DET}}

## 15 · Regressions introduced (deliverable 15)

1. **C2, approved controller:** every weight transfer is REJECTED (85 N swing load). With R1·R2: 57 N, still rejected, and **J_repeat falls** in its 4th request (after three rejections, balance lost in ACCEPT). Cause: §9. Not fixed.
2. **C2 + D1 (diagnostic):** D_fwd_R and G_far lose balance in ACCEPT after the larger ROM admits longer forward steps (28.6 / 34.8 cm vs 27.1). I_block is held (as V1).
3. **Stance hip twist saturation** in C2 transfers and acceptance (twist at the 25 % budget floor, 15 N·m, about 2 s), from the femoral-axis tilt (§6).
4. **Swing ankle twist at its ±10° stop** during HOVER (D1 runs; margin 0.1° vs V1 4.9°). The IK asks for it: the foot keeps its liftoff yaw (7–11°, V1 2–4°) while the pelvis yaws ±4°, and the model's hinge knee has no axial rotation.
5. **Gate A drop A:** a single-step energy injection of **+{{A_EGAIN}} J** (V1 2.6 J) when both knees reach their flexion soft stop at t ≈ 0.55 s with the soles 5.6–7.5 mm in the turf (the same event releases 0.5 J in V1). The body stays awake to 3.6 s (V1 1.6 s). Elbow_R soft-stop overshoot {{A_ELBOW}}° (V1 8.7° on the knee).
6. **Gate A drop E:** the authored start pose (joint angles written for V1's shoulder, 11 cm higher) puts the right forearm **112 mm inside the head** at t = 0. That gives a 20.6 mm correction pop and a large self-penetration reading. It is a test-fixture artefact of the relocated shoulder; V1.1 needs its own drop-E arm pose.
7. **Gate A drop B (side-first fall):** the right arm starts overhead, authored 10° inside its abduction limit. The body rolls onto it, and the relocated (lower) shoulder centre is forced **16.4° past its hard limit** (V1 5.6°), with 206 steps beyond 2° (V1 120). Also self-penetration 5.0 mm (abdomen–upperArm_L; V1 0.2) and turf 11.9 mm (V1 7.9). **Drops C/D:** C elbow soft overshoot 10.8° (V1 4.2° on the shoulder); D correction pop 3.2 mm (V1 0.8). D improves turf penetration (5.3 vs 13.9 mm).
8. **Gate B E (blocked limb):** while blocked, hip saturation 39 % (V1 17 %) and post contact 247 N (V1 122 N). Recovery after removal is faster (0.37 vs 0.45 s). Cause not investigated.
9. **C1 PF60:** 59 ms of hip saturation (V1 0). Outcome unchanged (recovered).
10. **CPU:** Gate A 0.21 → 0.31 ms/frame (drop A stays awake twice as long); C2 +4–13 %; B and C1 unchanged (§14).

Nothing above was hidden by adding strength, fixtures or external forces.

## 16 · Recommendation: does V1.1 replace V1? (deliverable 16)

**The anatomy: yes.** V1.1 is the correct physical body:
- hip centres 18.4 cm;
- shoulders inside the mesh;
- COMs on the segment lines;
- ROM and torque caps inside the evidence.

It removes the structural problem you identified (88 % hip-abduction demand and a 13° compensating lean) without stronger muscles. Gate B and C1 are the same or better, including one push that V1 failed.

**As the working baseline: not yet.** Three things need your decision first:
1. **C2 transfer completion.** The approved controller's lift gate depended on a favourable CoP bias. Options: adopt D1 (unload intent during TRANSFER) as a proper controller change, re-validated on both bodies, or another fix you prefer. R1·R2 are the recalibrations the anatomy logically requires, and they are not enough on their own.
2. **Forward-step acceptance under the larger ROM.** Either acceptance is re-validated for 28–35 cm forward steps, or the feasibility planner's forward reach stays as conservative as V1's until then.
3. **Gate A items:** the knee soft-stop energy injection in drop A, the shoulder hard-limit excursion in drop B, and V1.1-valid start poses for drops B and E (arm poses authored for V1's shoulder).

Until then V1 remains the reproducible reference (`--calib V1`, bit-identical). V1.1 is selectable everywhere (`--calib V1.1`, the harness body selector).

**Stopped here as instructed: no C3, no stepping, no commit or push.**

## Files

- `ANATOMY_V1_1_REPORT.md / .html` — this report
- `contact_sheet_anatomy.jpg`, `contact_sheet_behaviour.jpg`, `contact_sheet_regressions.jpg`, `stills/` (36 harness captures)
- `json/final/` — every run (V1 preservation, V1 and V1.1 ×3 for A/B/C1, C2 in four configurations ×3) with logs
- `json/spec_v1_vs_v11.json / .txt` — per-body and per-joint parameters, V1 vs V1.1
- `crossruntime.txt` — browser vs Node, all V1.1 tests
- `analysis/` — every probe used in this report (transfer / CoP / descent / saturation-axis / twist / drop-A / arm-coverage), the batch, table and contact-sheet generators, and the capture script with its shot list

Reproduce:

```
node tools/gatec2_run.js --calib V1.1 [--recal] [--diag-unload] --tests all --repeat 3
```

The other runners take `--calib V1|V1.1`; `analysis/v11_batch.sh` runs everything.
