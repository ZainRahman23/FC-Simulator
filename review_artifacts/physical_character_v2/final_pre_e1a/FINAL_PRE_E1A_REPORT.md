# FINAL PRE-E1a REPORT: Touchline Physical Character V2 (2026-10-04)

**Source:** `../sources/2026-10-04_user_instruction_final_pre_e1a_resolution.md`.

**State:**
- **E1a / E1b / E2 not run.** No walking, swing planning or repeated stepping.
- **Nothing adopted.** Every new mechanism is default OFF.
- **The accepted G0–G3 baseline is bit-identical:** 4 G3 state hashes plus IK checksums after every code change; component regressions 44/44.
- **Nothing pushed.**

**Recommendation: DO NOT AUTHORISE E1a** (§13).

**Detail documents (this folder):**
- `TWIST_POLICY_PREREG.md` / `TWIST_POLICY_RESULTS.md`
- `SINGLE_SUPPORT_YAW.md`
- `KNEE_AXIAL_CONCLUSION.md`
- `ANKLE_LAW_PREREG.md` / `ANKLE_LAW_RESULTS.md`
- `BOUNDARY_COMPONENTS.md`
- `REACHABILITY_CONTRACT_FINAL.md`
- `E1_PREREGISTRATION.md`
- `E2_RECHECK.md`
- `RATE_PERFORMANCE.md`
- `literature/` (three primary-literature reviews)
- `evidence/`

## 1. Which posture / twist policy, and why

**Reference semantics:** the leg's twist DOFs are targeted at anatomical neutral. Voluntary turns arrive only as heading commands. A deliberate twist (e.g. a planned knee-axial setting) is an explicit command, never adopted from the state.

| | reference | blend 0.5 / 0.35 | drift τ 1 / 2 s | current |
|---|---|---|---|---|
| voluntary turn held (k = 0.13) | ✓ on all 8 bodies (20.0° of 20°) | creeps on 1–2 heavy bodies | creeps on 7 bodies | 16.4° of 20° |
| accidental twist not adopted | ✓ (0.16° left) | ✓ | ✗ by construction (7.8–8.3° adopted at k = 0) | ✗ (4.8° adopted) |
| energy source | none (0.00 J) | none | none | **5.15 J** of hip-rotation work |
| settle after a disturbance | **2 s** | 4–6 s | 4–5 s | 6 s; sustained on 5 bodies |
| stance ankle under the gentle lift | **1.3°** | 1.8–2.3° | 1.4–1.6° | 5.8° |
| 180 / 480 Hz | decays (6 / 6) | — | — | — |

- **Strict preregistered outcome: no policy is eligible.** Reference's only failure is HO3 on the lightest body.
- HO3 is a 15 N·s push that fells that body under **every** policy, "current" included. The fallen body's twist is then classified as oscillation.
- **That is my preregistration flaw.** I sized HO3 from V2-REF's boundary. It is not re-scored.
- **Why reference is right independently of scores:**
  - it is the only candidate whose target never depends on the accumulated state;
  - so accidental twist is always a deviation, and voluntary orientation is always a command.
- **At k = 0 no policy meets the semantics.** The zero-stiffness ankle zone defeats turn settling and the single-support anchor. **The policy needs k > 0** (§5).

## 2. What anchors yaw in true single support in our model

- **The stance ankle's foot ab/adduction axis is the only path** for net vertical-axis torque from turf to body. It is **passive-only**.
- Hip and knee axial actuators only re-orient segments relative to each other.
- **The turf is not the limit:** rotational traction is 28–63 N·m.

**Measured** (single-support hold):

| | k = 0 | k = 0.13 |
|---|---|---|
| 1 N·m·s impulse: stance ankle peak | 12.5° (into the end range) | 9.8° |
| 0.5 N·m·s impulse: stance ankle peak | 11.3° | 4.8° |
| gentle lift: stance ankle peak | 7.9° | 1.3° |

## 3. What human evidence implies about the architecture

- **Human single-support yaw resistance is distributed:**
  - talocrural congruence, which is load-dependent;
  - tibiofibular rotation;
  - **the oblique subtalar axis, through which inverter / evertor muscles produce active foot yaw**;
  - midfoot;
  - knee axial rotation;
  - hip orientation;
  - arm / trunk counter-rotation for yaw angular momentum.
- **Our single passive coordinate stands in for several structures, and it lacks the active subtalar path and load stiffening.**
- **Numbers:**
  - unloaded 0.10–0.15 N·m/° (well supported);
  - **loaded small-angle stiffness: no measurement exists in what was found**;
  - loaded whole limb (active) ≥ about 0.35–0.44 N·m/°.
- **Demand:**
  - free moment 3–13 N·m;
  - ankle axial moment 7–25 N·m in running / cutting;
  - tibia-over-calcaneus rotation about 5°, mostly coupled to eversion.
- **Diagnostics** (none adopted; stance-ankle peak at 1 N·m·s):
  - load-dependent passive at the whole-limb bound (0.4 N·m/°): 6.9°, but **not conservative**;
  - active foot yaw at 5–10 N·m capacity: 1.4–2.1°, dissipative.
- **Recommended architecture D:**
  - the passive constant law now;
  - a finite-capacity active subtalar-type yaw path for running / turning / cutting, which is an actuator / anatomy decision;
  - arm / trunk angular-momentum management;
  - load stiffening only when a measurement exists.
- **The runway's "≥ 1 N·m/° for 5°" target is withdrawn as not evidence-based.**

## 4. Knee axial conclusion

- **Our knee axial ROM is about twice too wide** for a knee-only coordinate.
- **Its hard limits ignore flexion**, so full extension is the model's most compliant posture: the reverse of the data.
- **Its zero should shift internally with flexion:** about 10° by 60° and about 30° at 150°.
- **The G1 prone-rest blocker at k > 0 is a knee-envelope artefact.** The rest is near the natural deep-flexion internal rotation (32° at 146°).
  - The counterfactual takes failures from 13 / 15 to 0 / 15 with a literature-shaped envelope.
  - But that unfitted envelope is too narrow for violent falls: it breaks other G1 rows even at k = 0.
- **It cannot become live in E1a / E1b**, which have no deep flexion and no passive falls.
- **It must be fixed before the evidence-supported ankle law can be adopted.**

## 5. Which ankle law

- **The evidence supports a constant unloaded neutral law, k ≈ 0.13 N·m/°.** At k = 0.13 every controller-level requirement is met.
- **It fails G1 (AL1) under every knee model available now:**
  - current knee: systematic prone rest;
  - `lit1`: awkward-fall knee engine stops, also at k = 0;
  - `shift`: an awkward-fall elbow rest.
  - Perturbed failure rates: ⟨SWEEP⟩.
- **Per the preregistered rule it is not adopted, and k = 0 remains.**
- **No law is sufficiently validated**, and no load-dependent law is supported by a measurement.

## 6. G3 → G4 boundary components and their validation

**What was built:** an explicit per-foot support / contact lifecycle (`ctrl/v2_support.js`; option `lifecycle`; default off):
- **states:** SUPPORT / UNLOADING / TOUCHING / LIFTOFF / AIRBORNE / TOUCHDOWN / LOAD_ACCEPT;
- debounced, hysteretic transitions;
- **contact ≠ support**;
- intent-gated load acceptance;
- self-contact guard.

**Continuous support and airborne weights drive:**
- toe-out-corrected heading and the balance midpoint;
- the pelvis-height reference;
- a scaled support polygon and load-share caps;
- the leg target: a contact anchor captured on the turf, frozen in the air, re-captured flat at touchdown;
- a soft-limit bounded IK in a world-space frame (contact height min(target, actual));
- stance ↔ swing gains (4 Hz servo);
- abort-to-touchdown.

**Covered hazards:** H1, H2, H3, H4, H5, H6, H7, H8, H9, H11. H10 depends on §1 / §5; H12 is inherent.

**Validation:**
- **unit regressions R7.a–i;**
- **an external-lift harness, which is not E1a: 88 runs on the frozen code:**
  - 8 bodies × 30 / 60 N × drop 0 / 2.5 cm × k 0 / 0.13;
  - aborts;
  - 180 / 480 Hz.
- **Harness results:**
  - **0 falls, 0 lifecycle chatter;**
  - stance slip ≤ 0.06 mm;
  - energy-closure increments ≤ +0.015 J per tick;
  - **all 48 torque steps > 10 N·m within 0.1 s after a touchdown** (impact through the servo damping);
  - ≤ 11 N·m in the gentle case.
- **Eight counterexamples were found and fixed** along the way (the strut, the acceptance deadlock, hyperextension, frame shocks, …), all kept in `BOUNDARY_COMPONENTS.md`.
- **Not validatable before E1a:** the commanded lift / hover / replace path (unit-tested interface only).

## 7. Final reachability contract

- **Three levels:**
  - reachable;
  - feasible inside the planning box (hard limits − 5°, knee axial in its unloaded envelope);
  - executable from the current state (G4; reserved).
- **Planning problem:**
  - **solved:** hip, knee flexion, ankle DF / inversion, **knee axial (actuated) in its unloaded range**;
  - **held:** the passive ankle ab/adduction at neutral; it is a touchdown tolerance only;
  - **searched:** pelvis height (0–10 cm drops, smallest preferred) and pelvis yaw sharing;
  - **fixed:** pelvis pitch / roll;
  - **foot:** flat at touchdown, yaw within the requester's tolerance; free pitch in swing poses.
- **Result classes:**
  - FEASIBLE: verified;
  - PROVEN-INFEASIBLE: a certificate **with its exact problem definition**;
  - UNKNOWN-NOT-FOUND: never "impossible".
- **Solver failure is never a proof.** The fallback pose never replaces the request.
- **Certificates are offline.**

## 8. Exact preregistered E1a / E1b criteria

**Frozen in `E1_PREREGISTRATION.md`.**
- **Lift height:** 5 mm sole clearance is genuine liftoff (resting penetration ≤ 0.03 mm; touch threshold 0.5 mm; airborne load exactly 0).
- **E1a: 15 criteria**, on all 8 bodies plus a mirrored run:

  | # | criterion |
  |---|---|
  | 1 | contact loss ≥ 80 % of the hover |
  | 2 | single support |
  | 3 | hover error ≤ 3 mm, tilt ≤ 1.5°, yaw ≤ 2°, clearance ≥ 3 mm |
  | 4 | stance slip ≤ 1 mm |
  | 5 | ξ margin ≥ 1 cm, COM ≤ 2 cm, no abort |
  | 6 | one liftoff / touchdown, no chatter |
  | 7 | torque steps ≤ 10 N·m, ≤ 25 N·m at contact onset |
  | 8 | energy closure ≤ +0.05 J per tick, Σ ≤ 0.5 J |
  | 9 | capacity |
  | 10 | limits, no hyperextension |
  | 11 | determinism |
  | 12 | touchdown ≤ 5 mm / 2°, impact ≤ 25 % BW |
  | 13 | smooth acceptance |
  | 14 | two-foot recovery |
  | 15 | morphology |

- **E1b:** 20 mm, 1.5 s hover, perturbations of 5 N·s pushes and a 0.5 N·m·s yaw impulse (stance ankle ≤ 10°), and a 15 N·s abort case.

## 9. Known technical debt

1. The single-support **active yaw path** (subtalar) is missing. Loaded ankle stiffness is unmeasured.
2. The **knee axial envelope** is wrong: too wide, flexion-blind, fixed zero. A fitted envelope is needed.
3. G1's settled end-range tolerance flags passive-fall rests chaotically (5 % at the accepted plant). **Every plant change moves which rest trips it.**
4. HO3 in the twist preregistration was mis-sized (recorded).
5. Lifecycle:
   - the hover servo has only been tested against external forces;
   - touchdown impact steps reach 40–44 N·m when a 60 N external force drives the foot down;
   - force-driven bounces under external force.
6. The 240 Hz end-stop margin in passive falls (unchanged; no E1 risk measured).
7. Earlier debts carried forward: knee strength near extension, the radial-inset margin, 8-D certificates, interface H10 / H12.

## 10. What blocks E1a, and what E1 can safely discover

**Blocks E1a (the configuration cannot be fixed with what is validated today):**
1. At k = 0, the only G1-valid ankle law, **no acceptable posture policy exists**:
   - "current" sustains oscillation and adopts twist;
   - every alternative fails turn settling / single-support yaw at k = 0.
2. k = 0.13 fails G1 under every available knee model.

**Can safely be discovered during E1:**
- hover-servo accuracy without external force;
- touchdown impact steps at a slow replace;
- single-support yaw under E1b's perturbations (preregistered as E1b-17);
- the commanded-lift path itself.

## 11. Have G0–G3 remained valid?

**Yes. The accepted baseline is unchanged:**
- every addition is default OFF;
- the default path is bit-identical after every change (4 G3 state hashes plus IK checksums);
- R2.f: the G1 passive-plant hashes;
- component regressions 44/44.

**The proposed G4 configuration** (reference + lifecycle + k = 0.13 + a knee envelope) **does not pass G1** (§5). Its G2 / G3, evaluated with the accepted evaluators in a scratch tree: **G2 (all 13 rows; R / 2.5 / D not re-measured):** every re-measured gating row passes.

**G3 v3.3 native rows: 13 / 15.** Two fail, both lifecycle behaviours at standing pelvis height (G3 has no pelvis drop):

| row | what failed | detail |
|---|---|---|
| **I2** | V2-long-legs U:R / U:L | the unloaded touching foot drifts **5.0 mm** under the lifecycle hold (limit 2 mm) |
| **K** | T11 "over 1.2" | the excessive request now **stands** instead of failing physically (row K requires that an excessive request is not silently made safe) |

- Every other outcome matches the accepted run.
- Twist in T9 is 1.2° vs 10.8° accepted..

## 12. Measured performance impact

| configuration (V2-REF, G3 U:R single-support hold, 4,081 ticks after warm-up) | controller + actuators per tick: median | p95 | max |
|---|---|---|---|
| validated G3 controller | 0.1012 ms | 0.171 ms | 2.58 ms |
| G4 proposal (reference + lifecycle) | 0.1016 ms (+0.4 %) | 0.147 ms | 2.85 ms |
| validated, with the external lift | 0.0978 ms | 0.113 ms | 0.33 ms |
| G4 proposal, with the external lift | 0.0991 ms (+1.3 %) | **0.215 ms** | 0.40 ms |

- **The median cost is unchanged.**
- **The p95 rises while a foot is airborne.** The non-supporting leg's soft-limit bounded IK iterates (up to 30 LM steps) when its target is out of reach inside the soft box.
- **Stated so it is not hidden:** a per-tick worst case of about 0.4 ms for one character. A 22-player budget should assume it for any swing leg.
- **The single-sample maxima of about 2.6–2.8 ms appear in both configurations:** JIT / GC outliers.

**Scale:** the lifecycle adds blends and, for a non-supporting leg only, a bounded IK without the Newton fallback. Physics and the passive layer still dominate the 22-player cost. Certificates and the Newton fallback stay offline.

## 13. Recommendation: **DO NOT AUTHORISE E1a**

**Smallest remaining blocker:** a passive leg-axial model with the evidence-supported nonzero ankle neutral stiffness that keeps G1 valid.

**Evidence and decisions required:**
1. **Fit** a knee axial envelope to the cited bone-level data: width at 0 / 30 / 90° flexion, internal zero shift, and room for violent falls, unlike `lit1`.
2. **Show** its G1 perturbed failure rate at k = 0.13 is comparable to the accepted plant's 5 %, with no systematic scenario.
3. **Your decisions:**
   - (a) approve that knee anatomy revision;
   - (b) how G1's settled end-range tolerance is judged for passive-fall rests (nominal vs perturbed rate);
   - (c) adopt reference semantics despite the HO3 preregistration flaw;
   - (d) enable the lifecycle components for E1.

**Then** E1a can be authorised against the frozen criteria. Everything else E1a needs is built and validated as far as is possible without running it.

**Alternative, not recommended:** run E1a at k = 0 with reference semantics. That is G1-valid, but it knowingly accepts unanchored single-support yaw in the ±10° free zone and failed preregistered posture criteria; E1a-14 (twist recovery) and E1a-3 (swing-foot yaw) are then likely to fail.
