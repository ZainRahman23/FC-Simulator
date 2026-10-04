# Physical Character V2: consolidated pre-G4 decision report (research runway, 2026-10-04)

**Source:** `sources/2026-10-04_user_instruction_pre_g4_research_runway.md`.

**Status:**
- **Research only. G4 not started.** No swing / lift / stepping code exists.
- **Nothing adopted:** no twist policy, ankle stiffness, knee model / limit or reachability contract.
- **Accepted behaviour preserved:** all new controller options are diagnostic and default-off. The default path is verified bit-identical (4 G3 state hashes + IK checksums), guarded by permanent tests R5.a–d. Component regressions **35/35** (R6.a–e: certificate soundness; research tooling only, no controller dependency).
- **Nothing pushed.**

**Details:** `pre_g4_runway/`:
- `TWIST_MECHANISM_AND_POLICY.md`
- `ANKLE_KNEE_AND_RATE.md`
- `REACHABILITY_STRESS_AND_TAXONOMY.md`
- `G3_G4_INTERFACE_AUDIT.md`
- `G4_FIRST_EXPERIMENTS.md`
- `evidence/`

## 1. Root cause of the twist oscillation

**What the controller does:**
- The posture IK takes the leg's redundant twist DOFs (knee axial rotation; the passive ankle ab/adduction) at their **current** values.
- So the hip-rotation target **follows the leg twist** (regression slope −0.975; static R5.c −0.985).
- The twist is therefore a **zero-stiffness direction**, and the hip PD reduces to K·(ψ_ref − ψ): **a pelvis spring referenced to the feet's heading, whose reaction acts on legs that are not anchored in yaw** (free ankle zone at k = 0; no knee axial stiffness).

**Why it pumps energy:** the spring's work through the leg, ∮K(ψ − ψ_ref)·φ̇ dt, is positive when twist and pelvis yaw are out of phase.
- **Measured phase:** the twist leads by 47–57°.
- **Work split** (hip-rotation, per hip, 8 s): **stiffness term +19 to +32 J**, damping −17 to −28 J.
- The hip rotators are the energy source; the passive tissue only dissipates.
- The ankle end range (±10° soft) bounds the cycle at about 10–12°, 0.56–0.75 Hz.

**Falsified alternatives:**
- discretisation (identical at 240 / 480 / 720 Hz);
- actuator activation lag (identical with instantaneous activation);
- a moving heading reference (foot yaw 0.00°).

**Morphology:** under "current", 25 of 40 cases (8 bodies × 5 disturbances, k = 0.13) are sustained or growing; the lightest body decays.

## 2. Current vs reference posture policy

**Policies:**
- current (validated);
- reference (`ikRefTwist`);
- blend α (state-dependent mix);
- drifting reference τ (state-dependent: the reference slowly follows the twist).

| | current | reference | blend 0.5 | drift τ 2 s |
|---|---|---|---|---|
| twist-mode stability, 8 bodies × 5 disturbances (k = 0.13) | **25 / 40 non-decaying** | 0 / 40 | 0 / 40 | 0 / 40 |
| stability boundary (worst body) | — | — | α ≥ 0.25 (0.25 slow) | τ ≥ 1 s (0.5 s unstable) |
| commanded 10 / 20 / 30° pelvis turn (k = 0.13) | overshoot to 32.4°, oscillation up to 4° | **exact, all at the hips**, ankle ≤ 0.5° | exact | exact |
| toe-out stances to 45° | ok | ok | — | ok |
| static yaw stiffness, k = 0.13 (N·m/°) | (phase-contaminated) | 0.26–0.34 | 0.46–0.60 | 1.4–2.2 |
| G2 rows, k = 0.13 (diagnostic) | S4 fails | pass | **pass** | **pass** |
| G2 push boundaries vs accepted | 0 changes | 0 | 0 | 0 |
| G3-native rows, k = 0.13 | D, I2 fail (twist cycle) | 15 / 15 | **15 / 15** | 15 / 15 after the snapshot fix* |
| rate attack, worst body, 180 / 480 Hz | sustained / growing (≈ 11°) | — | decaying (≤ 0.06°) | decaying (≤ 0.09°) |
| held-out T4 drift on V2-198-92 / V2-190-85 (row D limit 1°) | **5.5° / 7.1° (fail)** | — | 0.06° / 0.00° | 0.02° / 0.04° |
| twist probes not re-centred, 3 bodies, k = 0.13 | 5 (V2-REF) / 18 / 8 | 0 / 0 / 0 | 0 / 0 / 0 | 1 / 1 / 1 |
| k = 0 batteries | — | — | (§2a) | (§2a) |

\* The drift policy first failed G3 row N (snapshot / restore) because its filter state was not in the controller's saved state. That was a defect of the diagnostic option. It is fixed and verified bit-exact; the default state is unchanged.

**§2a, k = 0 gate batteries** (no ankle law; `pre_g4_runway/evidence/gates/`):

| | blend 0.5, k = 0 | drift τ 2 s, k = 0 |
|---|---|---|
| G2 rows | pass (S4 yaw 8: 2.98°, at the 3° limit) | **S4 fails** (yaw 8 leaves the trunk 7.1° off) |
| G3-native | 15 / 15 | 15 / 15 (row N passes: the snapshot fix confirmed) |
| twist T5 / U:R | **8.2–8.7°** | **6.3–6.7°** |
| probes not re-centred (3 bodies) | 9–12 / 20 | 12–14 / 20 |
| static yaw stiffness | 0.18–0.71 N·m/° | 1.0–12 N·m/° |

**Reading:**
- **A reference-like policy removes the limit cycle, but not the free ±10° ankle twist.**
- **The ankle stiffness reduces the twist and re-centres it, but cannot remove the limit cycle under "current".**
- **Double-support twist suppression needs both** (policy + k ≈ 0.13–0.15), which gives 1.3–1.6° and 0–1 / 20 un-re-centred.
- **Single support needs more** (item 5).

## 3. Strongest evidence for and against changing the policy

**For leaving "current":**
1. "Current" is non-passive by construction (a world-referenced spring reacting on free legs), and the measured energy flow confirms it.
2. Every reference-like policy removes the limit cycle in all 40 cases.
3. Legitimate turns go cleanly through the hips (the anatomical allocation), with no over-constraint found (turns to 30°, toe-out to 45°).
4. Gate rows pass under blend 0.5 / drift τ 2 s at k = 0.13 (diagnostic).

**Against, or what changing does not solve:**
1. Under a pure reference, whole-body yaw stiffness falls to the passive ankles (≈ 2k).
   - The validated 2.8 N·m/° is not a real anchor: it is the legs twisting the ankles into their end range while the hip spring holds the pelvis.
   - It is still a behaviour change people would notice.
2. **No policy fixes single-support yaw anchoring** (item 5 / 15): the stance ankle reaches its end range from 1–2 N·m·s yaw impulses under every policy.
3. A fixed reference cannot accept a legitimately rotated foot whose twist the hip cannot absorb. The state-dependent drift form handles this, but adds a time constant (with a measured stability boundary) and controller state.

## 4. Knee axial-limit root cause

**The failing case:** V1-matched "perturb" rests prone with the **knee flexed ~145°** (not near extension: the screw-home band is not involved).

**At k > 0:**
- the ankle neutral stiffness steers the passive collapse into a twisted rest that loads **the ankle ab/adduction end range (25 N·m) and the knee axial end range (23 N·m) in series**;
- the left foot is pinned with 108 N;
- the knee end-stop law gives 16.9 N·m at the G1 1.5° tolerance and **23.1 N·m at 2.4°**, exactly the measured excess;
- at k = 0 the free foot rotation leaves the knee at 22.4°, inside its range, unloaded.

**What it is not:** not the controller (G1 is passive), not numerical (a static equilibrium; 13–14 of 15 perturbed members), not screw-home.

**Anatomy evidence:** the knee axial ROM is marked "recalled" (unverified). **Evidence is needed:** tibial axial ROM and torque–rotation curves vs flexion; ankle–subtalar axial end-range torque.

## 5. Ankle-law findings

**Under reference-like policies:** the ankle stiffness becomes the whole-body yaw anchor (≈ 2k N·m/°). The twist probes re-centre at k = 0.13 / 0.15.

**Separating the resistances** (static yaw torque):
- ground free moments carry 82–99 %;
- the two-foot shear couple carries 1–18 %;
- the transmitted torque passes through the ankle ab/adduction (≈ 0.8–1.0 N·m per ankle) and the hip rotators;
- under "current" at k = 0 the ankles sit in their end range.

**Constant linear law:**
- the evidence (0.11–0.15 N·m/°) is unloaded or lightly loaded;
- a loaded ankle is expected to be stiffer, but no loaded value is in the local evidence;
- a load-dependent law is physiologically plausible but non-conservative (needs passivity accounting), and does not cleanly separate the knee case (14 % BW on the pinned foot).

**Single-support yaw anchoring (G4-critical):** near-single support (G3 U:R) with a pelvis yaw impulse:
- **1 N·m·s:** stance-ankle peak 11–13° (k 0.13–0.15 / 0); end range at every k and every policy.
- **2 N·m·s:** 15–16°, at the hard limit; a foot relocates under the stable policies.
- **Requirement scoping** (sensitivity only, never candidates): ≈ **≥ 1 N·m/° loaded axial stiffness** keeps it within ≈ 5° at 1 N·m·s. That is about 10× the unloaded evidence.

## 6. Rate / 180 Hz findings

**Same-state convergence of the worst event** (awkward passive fall, k = 0.15): ΔE_max = 6.92 J (180 Hz) → 4.55 (200) → 2.67 (220) → 0.59 (230) → **0.51 (240)** → 0 (≥ 260 Hz).

**What it is:**
- monotone; net dissipative (window −650 to −694 J);
- a stiff end-range spring near the semi-explicit stability limit;
- confined to pathological passive-fall end-range states;
- 0 events in ≈ 1,500 runs at 240 Hz.

**Bounded, but the 240 Hz production rate has a thin margin.** Fix options, if ever needed (decisions):
- implicit end-range stiffness;
- or a rate ≥ 260 Hz, which is a physics-rate change and needs approval.

## 7. Anatomical-reachability findings

- **Ground footholds with |yaw| ≤ 30°:** **0 invalid in every one of the 8 morphologies** (2,256).
  - Tightest margin: hip rotation 1.1° (p5 8.8°).
- **±45° at ground level:** 15–26 % invalid per body (28 / 192 … 48 / 184), with the twist DOFs held at their instantaneous values. Pelvis yaw ≤ 20° toward the foot resolves 1,023 of the 1,208 ±45° invalid targets (85 %; 78–93 % per body; corrected from an earlier "74–91 %" against `ik_anatomical/evidence/ik_pelvis_yaw.json`).
- **Raised targets with a flat foot:** fail on ankle DF. This is a convention artefact; swing poses should leave pitch free.
- **Aggressive multistart** (257 starts × 1,336 invalid targets): **0 solver misses.** The warm start reached the best residual in 1,329 / 1,336.
- **Certificates are practical.** A branch-and-bound with a rigorous Lipschitz bound (`tools/ik_cert_core.mjs`):
  - **1,336 / 1,336 PROVEN-INFEASIBLE** as the IK problem is defined (0 undecided); ≈ 4 s (isolated; 12 s under 9-way load) median per target;
  - the bound survived a falsification attempt over 5 body / state combinations: 0 violations in 585,000 random pairs; 0 pruned cells containing a known solution over 2,086 valid targets; permanent regression R6.
- **But PROVEN-INFEASIBLE is a property of the problem definition, not the leg.** The IK holds knee axial rotation (actuated) and ankle ab/adduction (passive) at their **instantaneous** values.
  - Freed inside their passively unloaded ranges (soft limits; the knee with its approved screw-home coupling): **1,265 / 1,336 (94.7 %) become FEASIBLE**, including **every ground and 5 cm target**.
  - The actuated knee axial alone, inside its coupled soft range: 84.4 %.
  - Freed inside the hard limits: 98.7 %. The remaining 18 are raised backward toe-out targets (8-D certificate: 4 attempted with the generic and again with the tight twist levers, all undecided at 4·10⁸ cells, so they stay UNKNOWN-NOT-FOUND; 8-D certificates need a better method).
- **With the instantaneous definition the verdict is knife-edge and state-dependent.** Moving one held twist by ≤ 1° flips 17.5 % of the invalid set to FEASIBLE, ≤ 3° flips 42 %, and ≤ 10° flips 83 % (every ground target). The validated controller's twist moves ±10–12°. The definitions "instantaneous" vs "posture reference" disagree on 468 targets (237 / 231).
- **Robust across definitions:** ground footholds with |yaw| ≤ 30° are 0 invalid of 2,256.
- **E2 check:** at standing pelvis height, 10 cm (even 5 cm) lateral footholds are out of reach in all 8 bodies, and 10 cm forward has a margin of only 5.9–8.6°. With a pelvis drop of ≥ 2.5 cm every E2 target is valid in every body, margin ≥ 17°.
- **Taxonomy** (`pre_g4_runway/REACHABILITY_STRESS_AND_TAXONOMY.md` §4):
  - FEASIBLE (verified solution);
  - PROVEN-INFEASIBLE (certificate **plus its problem definition**);
  - UNKNOWN-NOT-FOUND (search record; never reported as impossible).

## 8. Proposed reachability contract (updates to `ik_anatomical/FOOTHOLD_REACHABILITY_CONTRACT.md`; for approval)

**Layers:** L1 geometric ⊇ L2 anatomical (approved limits) ⊇ L3 dynamically executable (G4).

**Additions from this runway:**
1. the result taxonomy above; PROVEN-INFEASIBLE carries its problem definition;
2. the pelvis hypothesis includes **yaw** (a turn yaw-sharing rule);
3. swing poses leave **foot pitch free**;
4. a planning margin rule (≥ 5° per axis proposed; excludes fewer than 5 % of the ±30° ground class);
5. **the held twist values are a planning input, not the instantaneous joint values.**
   - Proposal: plan the actuated knee axial rotation as a 7th coordinate inside its screw-home-coupled soft range.
   - Hold the passive ankle ab/adduction at reference, with ±10° as touchdown tolerance only.
   - This interacts with the twist-policy decision.
6. the planner uses FEASIBLE only (one bounded solve); certificates are for offline audits (seconds per target);
7. L3 must include single-support yaw anchoring (item 5) and the abort-path foothold.

## 9. G3 → G4 transition hazards (external-lift harness; 12 hazards, 8 confirmed)

**Confirmed:**
- **H1:** an airborne "loaded" foot has no position stiffness.
- **H2:** the hold pose can re-arm in the air (a stale airborne target).
- **H3:** the load flag chatters at touchdown, even slow touchdown, with **one-tick torque steps of 6.6–158 N·m**.
- **H4:** the sensed load is a residual, so self-contact reads as load.
- **H6:** the heading uses the airborne foot.
- **H7:** the balance midpoint uses the airborne ankle (a 9 cm foot drift moved it 4.6 cm).
- **H9:** the abort returns to bilateral with the foot in the air (falls).
- **Lateral drift of the airborne foot:** 5–9 cm.

**From code:**
- **H5:** support by touching pieces, with the whole region as the support geometry;
- **H8:** the pelvis height target uses the airborne ankle. Checked empirically: **masked in G3** (≤ 0.7 mm at 35–68 mm lifts), because the feasibility cap uses the on-ground hold pose. It becomes live once the unloaded leg's target pose is airborne;
- **H10:** swing-foot yaw is uncontrolled under "current";
- **H11:** stance gains on a swing leg.

**Not hazards:** the actuator and passive layers (state-only); the share of an out-of-support foot (0); load-based hip strategy. The one-tick sensing latency is inherent, not stale.

## 10. Proposed first G4 experiment: lift → hover → replace (`G4_FIRST_EXPERIMENTS.md`)

**Yes, it is the right first experiment.** It isolates contact loss, airborne control and reacquisition. **Staged:**
- **E1a:** 5 mm, 0.5 s hover;
- **E1b:** 20 mm, 1.5 s hover, plus perturbations.

**Proposed pre-registered criteria S1–S13**, including:
- **true single support:** 0 pieces and 0 load for ≥ 80 % of the hover;
- hover accuracy ±2–3 mm, ≤ 5 mm drift, ≤ 2° yaw;
- touchdown ≤ 5 mm / ≤ 2° from the lift-off pose;
- **no one-tick torque change > 10 N·m and no flag chatter;**
- impact ≤ 25 % BW;
- energy, determinism and symmetry (J2a rule) on the new components;
- all 8 bodies;
- a single-support abort for the perturbation set.

## 11. Proposed second experiment: short reachable step (E2)

- ground-level, yaw 0, 10 cm forward (E2a), then 10 cm lateral (E2b);
- each target pre-checked L2 with ≥ 5° margin at the planned pelvis height;
- **checked:** E2 needs a planned pelvis drop of ≥ 2.5 cm. At standing height E2b is out of reach in all 8 bodies, and E2a is out of reach for V2-165-62. With the drop, every body is valid with ≥ 17° margin;
- ≥ 15 mm clearance; touchdown ≤ 10 mm / 3°;
- load acceptance onto the new foothold; the E1 criteria re-scoped;
- the executed path stays inside the anatomical limits.

## 12. Performance implications

- **Twist policies:** no measurable cost (same IK chain; drift adds 6 `decompose` per tick).
- **Validated tick budget** (isolated): controller + actuators 0.093–0.103 ms (budget 0.15); IK ≈ 86 % of the controller; physics 0.31–0.34 and passive 0.14–0.15 ms per tick.
- **Foothold queries:** bounded IK classification ≈ 0.13 ms; a converged fallback 1–8 ms.
- **Infeasibility certificates:** ≈ 4 s (isolated; 12 s under 9-way load) median, max 135 s under load (the 19 µm near-miss, 79 M cells) per target (single core; p50 5.6 M cells, max 79 M). **Offline only.** 8-D (twist-free) certificates did not finish within 4·10⁸ cells (≈ 12 min per target under load).
- **A rate of 260 Hz** (if chosen for the 180 Hz-type margin): physics and passive cost roughly +8 %.
- **G4's swing-leg inverse-dynamics feed-forward:** estimated small next to the IK.

## 13. New regressions and instrumentation

**Permanent:**
- **R5.a–d:**
  - twist-policy options default-off;
  - blend 0 ≡ current and 1 ≡ reference, bit-for-bit;
  - mechanism slope current ≈ −1 vs reference ≈ 0;
  - drift filter state saved by `getState`; the default state is unchanged.
- **R6.a–d: certificate soundness:**
  - the Lipschitz rate claims hold;
  - no cell containing a known solution is pruned;
  - a known invalid target is certified, and the same target made solvable by moving the held knee twist is not;
  - the 8-D chain ≡ `legChain` bit-for-bit.
- **R6.e:** the opt-in tight twist levers satisfy their 8-D rate claims.
- **Suite 35/35.**

**Diagnostic options (default-off, bit-identical):** `ikTwistBlend`, `ikTwistTau` (filter state in `getState`), `yawCmd`.

**Tools:**
- `twist_energy.mjs` (power flow, work split, phase, rate / activation switches);
- `turn_test.mjs`, `twist_toeout.mjs`, `ss_yaw_anchor.mjs`;
- `liftoff_probe.mjs` (`--body`, `--profile=ramp`);
- `ik_taxonomy.mjs`;
- `ik_certificate.mjs` (`--soundness`, `--tight`), `ik_cert_core.mjs`, `ik_twist_free.mjs` (`--sens`, `--refall`, `--cert`, `--tight`), `e2_target_check.mjs`;
- `phaseG_events.mjs --rates`;
- `twist_mode.mjs --bodies --stand`;
- `ank_reftwist_eval.mjs` (tag).

## 14. Remaining technical debt

| # | debt |
|---|---|
| 1 | The validated controller's twist limit cycle (k = 0, two of three bodies; 25 / 40 at k = 0.13 across 8 bodies). |
| 2 | Single-support yaw anchoring is inadequate at evidence-range stiffness. |
| 3 | G1 knee-axial prone-rest interaction for any k > 0; knee axial ROM evidence "recalled". |
| 4 | The 240 Hz margin for end-range integration in passive-fall stress states (0.51 J). |
| 5 | Interface hazards H1–H12. |
| 6 | G2 S4's single-sample "final trunk" criterion is phase-sensitive. |
| 7 | IK: contract decisions; fallback cost. The 6-D certificate is implemented. 8-D (twist-free) certificates are undecided at 4·10⁸ cells, even with the tight twist levers; they need a better method (interval arithmetic or a reparameterisation). **The validated IK's reachability depends on the instantaneous twist** (a definition issue, §7). |
| 8 | Earlier debts: the radial-inset margin; G1 chaotic marginality (5 % of perturbed members at k = 0). |

## 15. Exact decisions needed from you

1. **Twist policy:** leave "current" for a reference-like target? If so, which form:
   - **blend α ≥ 0.35–0.5** (simple, no state); or
   - **drifting reference τ ≥ 1–2 s** (accepts sustained foot rotation; adds state).
2. **Single-support yaw anchor** (the G4 prerequisite).

   **The physics:** in single support the net yaw moment on the body comes only from the stance foot's free moment, which passes through the ankle's ab/adduction axis. That axis is **passive-only** in this model. **No actuator above the ankle can create net body yaw torque against the ground.** Active control can only redistribute angular momentum internally (trunk / arm counter-rotation, bounded), or hold the pelvis while the legs twist (what "current" does).

   **So the options are:**
   - (a) a stiffer **loaded** passive axial path: authorise sourcing loaded ankle–subtalar axial stiffness evidence (the scoping says ≳ 1 N·m/°, ≈ 10× the unloaded range);
   - (b) an **actuated** ankle axial / subtalar path: an anatomy / actuator decision;
   - (c) accept that single-support yaw disturbances are absorbed by stance-ankle deflection, plus internal counter-rotation (trunk / arms), within bounded amplitudes. That would make E1's perturbation criteria the test.
3. **Ankle law form:** constant vs load-dependent, after the evidence in 2(a).
4. **Knee:** authorise sourcing knee axial ROM / torque–rotation evidence. **No change now.** Decide how G1 1.3d should treat that interaction, given the evidence.
5. **G4 boundary components (H1–H12):** approve the design scope.
6. **Reachability contract:** taxonomy, pelvis-yaw hypothesis, margin rule, limit set, and **how the twist DOFs are defined**:
   - held at instantaneous (as now; knife-edge);
   - held at reference;
   - knee axial planned inside its coupled soft range (proposal);
   - or both free.
7. **E1 / E2 designs and the proposed criteria.**
8. **Rate:** accept the thin 240 Hz margin (report-only in passive-fall stress states), or plan an implicit end-range treatment.

## 16. Recommendation: are we ready to authorise G4?

**Not yet for G4 experiment runs. Yes for G4 preparation once decisions 1, 2 and 5 are taken.**

**The biggest remaining blocker is single-support yaw anchoring.** It is set by the stance ankle's axial torque path, which is passive-only here, so no posture policy or hip strategy can supply it.
- With one foot down, the only yaw anchor is the stance ankle's axial path.
- At the evidence-range stiffness, and under every posture policy tested, modest yaw impulses (about what a swing leg will produce) drive the stance ankle into its end range and can relocate a foot.
- E1's hover would expose it immediately.

**Recommended sequence:**
1. Decide the twist policy (item 1). The evidence strongly favours leaving "current".
2. Commission the loaded-ankle evidence and / or the active yaw strategy design (item 2).
3. Implement the boundary components behind default-off flags, with G0–G3 regressions bit-identical when off.
4. Then authorise E1a.
5. **Before E2:** decide how the reachability contract defines the twist DOFs (item 6). Under the validated "instantaneous" definition, the reachability of a foothold changes with the twist state. Plan E2 with a pelvis drop of ≥ 2.5 cm.

**E1 does not depend on the reachability contract** (it lifts and replaces the foot in place). **E2 does.**
