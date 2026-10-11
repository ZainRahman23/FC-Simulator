# PVP-1 design research: case selection and readiness

**Instruction:** `sources/2026-10-11_user_instruction_pvp1_design_preregister.md` (17fa068f).

**Status:** research and design only. Nothing was built, stepped or changed.

**Evidence:** every number below comes from committed records and is reproduced by `scripts/pvp1_survey.mjs` → `evidence/PVP1_SURVEY.json`. That script creates no Jolt world.

---

## 1. Recommendation

**Use IB1-SR (`rx_behind_standing`).** It is the single best existing case, but it comes with one conflict you must rule on (D1).

| | IB1-SR facts (authoritative V1.3 record, 5042230, gameplay hash a2678624) |
|---|---|
| players | runner vinicius (73 kg), **standing** (v = 0, double support, ball ahead); tackler gabriel (78 kg, H 1.90 m), slide tackle from behind at 6 m/s |
| decisive contact | tick 52 sub 2 (τ 51.5): the tackler's extended-leg primitive **LEG → runner's planted right shin**; relative speed 4.53 m/s; contact point at 0.108 m height, just above the ankle, on the camera-facing side |
| simulation's contact model | J 75.64 N·s, support lost (sweep), dvCom 0.259 m/s, dvTackler 0.97 m/s |
| authoritative outcome | **STUMBLE (recoverable)**: 3 recovery steps of 0.32 s, until 1.927 s. No fall. The slide continues (TACKLE MISS at tick 80) |
| simulation's balance law | capture-point error e0 = 0.312 m, step reach 0.228 m. **The FALL boundary is e0 = 0.352 m, a margin of 40 mm** |
| later contacts | ticks 66 and 68: two contacts absorbed during the stumble, with 13.5 cm and 11.3 cm gameplay penetration. Both fall outside the proposed 150 ms window |
| existing evidence | CG-1 … CG-6 pass (segment, support, timing Δ0, location 0.037 m, overlap 0.74, normal 5.4°). CG-7 fails on tackler-primitive continuity (17.9 mm vs 10 mm). **The only REV2 end-to-end pass:** a zero-discontinuity handoff of the standing runner, with physical first contact on shank_R at the same sub-step, 37 mm from the gameplay point |
| what REV2 did not test | the tackler there was a two-segment stand-in driven along the authoritative slide, not a body. The post-contact response was never evaluated, because PI-1 did not run |

**Why SR is the right case:**
- It is the strongest recoverable contact in the whole record set: a weight-bearing leg struck at 4.5 m/s.
- Physically, a planted shin struck from behind by a 78 kg slider should push the leg over several steps. That is the continued-contact regime that IFM-1's planted-leg and toe-pad cells said is informative.
- It has the best prior correspondence evidence of any case.
- The contact is on the side facing the gameplay camera.

## 2. Why no other existing case fits

There are 26 authoritative fixtures in the V1.3 export: 20 `rx_*` and 6 defending slide fixtures. **In every one, the tackler is a slide tackle**, recorded only as six capsule primitives. Only four are recoverable:

| case | runner | decisive contact | why not |
|---|---|---|---|
| **rx_behind_standing (IB1-SR)** | standing | LEG → planted shin_R, STUMBLE, J 75.64 | **recommended** |
| rx_standing | standing | LEG → planted shin_R, STUMBLE, J 75.64 (tackled from the side) | not in the frozen IB-1 set; REV2 rejected it (standing-pose rows P-5 / P-17) |
| rx_free_leg (IB1-FL) | **3 m/s** | LEG → swing foot_L (CORRECTION, J 2.82), then LEG → swing toe_R (STUMBLE, J 3.63) | a toe clip with no sustained leg or body contact; CG-4 fails; blocked by the leg-geometry mismatch (§3, item 4) |
| rx_rear_diag | 5.5 m/s | LEG → toe_L, CORRECTION, **J 0** | no real contact |

**The other classes:**
- Every other contact case is a FALL (planted-leg sweeps, toe trips, the trunk hit in sl_loose), NEGLIGIBLE (J 0), or no contact.
- IB-1 already recorded that no minor body-bump case exists, and that the only strong trunk hit (sl_loose, TRUNK → pelvis) is a FALL.

## 3. Readiness: do the limitations make a two-full-body test premature?

**Short answer:**
- **For a running runner: yes, premature.** Two authority-level blockers apply: items 2 and 4 below.
- **For SR: no.** Those two blockers do not apply to a standing runner. What remains are testable risks, each with a hard stop in the preregistration. SR never exercises LV2, though.

### 3.1 Limitations by category

| # | category | status in IFM-1 / earlier work (preserved, not waived) | effect on a running case | effect on SR |
|---|---|---|---|---|
| **1** | **Genuine V2 body limitations** | **R0** (runner body) is not globally qualified. G0 record rows 0.4c / 0.6a / 0.6b / 0.6e / 0.10a were never waived by you. **G3 G / H / K′ fail:** standing weight-transfer ramps abort (hold mean 0.56 / 0.61), and excessive requests are realised as stable. G1 isoSelfCol is user-permitted for PI-1 scope only. **V1-matched** is qualified, with one exception you accepted (KC-4, upright G1 1.S′). No V2 body has ever been qualified **seated or sliding**. IFM-1 SW: angular-ledger failure at 27.7 rad/s segment spin (engine integration). Track B: no pose row shows a body or joint limit | applies | **applies, and is relevant.** R0's G3 failures concern exactly the double- to single-support transfer that a swept right leg forces. The tackler's seated pose is unqualified territory. A fast-spinning swept foot may trip the SW-type ledger failure. Labelled, not waived |
| **2** | **RUN-1 → V2 mapping / handoff** | IFM-1: every running entry is HANDOFF_FAILED under the frozen reading. REV2: the running presentation's whole-body momentum is incoherent (HG-A; no moving runner had a valid promotion frame). RF-1 has invalid late toe-pad instants | **blocking** | **does not apply to the runner** (static presentation, velocity 0; REV2 handed it in with zero discontinuity). **The tackler has no RUN-1 or presentation source at all:** the record carries no tackler pose. A new mapping is needed (primitive fit), and it is unvalidated |
| **3** | **Rigid foot / toe (F0)** | The F0 boot is larger than the simulation's foot capsule (REV2 blocker 1: a boot hit before the shin when struck from the front). It cannot follow toe pivot or heel strike (Track B) | applies (toe pivot every stride) | **minor.** A standing runner has flat feet (P-9 −3.9 mm). Risk: the tackler's V2 boot may meet the runner's heel (23 mm gameplay clearance at contact) before the shin. Checked geometry-only before stepping |
| **4** | **Collision geometry vs the authoritative simulation** | **The simulation's runner contact body is the V1 locomotion law's legs** (CHARCOLLIDE-1: vinicius rig, inscribed V2 radii). **At 3.0 m/s, LV2's mapped legs are 0.197 m (p50) / 0.251 m (p90) from them; 0 % of instants are within CG-4's 0.10 m** (R2 contract, 6a0cf340). The simulation's slide primitives are fat capsules (r 0.06–0.16 m) | **blocking:** an LV2-driven runner cannot be struck where and when the simulation says | **small for the runner:** R0's leg = the simulation's leg exactly (thigh 0.435, shank 0.399, hip half-width 0.1525 m, same radii). **The tackler:** V1-matched's shank (r 52→35 mm) is thinner than the LEG primitive (70 mm), so physical contact is expected about one sub-step late. The frozen CG-3 allows ±1 tick |
| **5** | **Controller / support after activation** | IFM-1 SnapshotTone holds the entry pose. There is no reactive balance and no stepping. Running controls are healthy only to 66.7 / 87.5 ms (target truncation), then crouch | applies | **the runner:** a static standing pose gives constant targets (ȧ0 = 0), so no truncation is expected; the C0 control checks this. **No recovery stepping exists:** consistency can only be judged with the simulation's own balance law, not by executing the stumble. **The tackler:** PostureDriver statics with both feet unflagged is exact pelvis-rooted gravity compensation, which suits a body sitting on its pelvis. That controller has never been validated sliding; the control run checks it |

### 3.2 Two-character engine support (an implementation risk, not a limitation)

- The V2 world builds **one** character per Jolt world: one group filter, body indices as userData.
- A second character is possible with Jolt's per-group collision filtering, but the two-character plant has never been built:
  - two passive layers;
  - two actuator layers;
  - two controllers;
  - two G1 measurements.
- It needs an isolation check: each character in a two-character world, with cross-contacts rejected, must reproduce itself.

### 3.3 Characters

- The tackler gabriel is H 1.90 m, 78 kg, thigh 0.482 m. That matches the simulation's THIGH primitive (0.480 m).
- **The closest qualified V2 body is V1-matched** (H 1.90, 78.9 kg, thigh 0.447, shank 0.458). No gabriel-record V2 body exists, and building one would need a new qualification.
- Both meshes are in the frozen RUN-1 tag, byte-identical to the simulation commit:
  - vinicius rig blob 6ca64389;
  - gabriel rig blob a75a38ae.

## 4. Decisions only you can make (needed before implementation)

| # | decision | recommendation | why it is yours |
|---|---|---|---|
| **D1** | **SR has a stationary runner, so LV2 / RUN-1 is not exercised.** You asked for LV2 as the locomotion source. No existing case can exercise LV2 with an authoritative leg contact (§3, items 2 and 4) | accept SR for PVP-1. Treat "running PvP" as blocked upstream (simulation contact geometry ≠ LV2 legs) | it narrows your stated requirement. The alternatives change the simulation's contact body (a production change) or need a new fixture |
| **D2** | R0 as the runner, with its G0 / G3 / isoSelfCol status shown on every result | accept. R0 is the only body that matches the authoritative runner's geometry and mass | the qualified alternative (V2-175-70) fits the authority worse. Using R0 means running on an unqualified body |
| **D3** | V1-matched as the tackler (qualified; KC-4 exception) | accept | it is not gabriel's record body |
| **D4** | The tackler's pre-activation pose is **constructed** from the authoritative slide primitives, because the frozen record has no tackler animation. It is labelled as such | accept | it is presentation we build, not an existing asset |
| **D5** | Offline consumption of the frozen record: READ_ONLY_RECORD_NEUTRALITY_PROVEN / LIVE_NEUTRALITY_NOT_TESTED | accept for PVP-1. Live observer integration stays separate (INT-1) | it limits what PVP-1 can claim |
