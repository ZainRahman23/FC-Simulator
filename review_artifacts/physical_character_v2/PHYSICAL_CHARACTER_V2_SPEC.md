# Physical Character V2: production body specification (design only, for review)

**Status:** DESIGN FOR REVIEW. Nothing implemented. V1 untouched. Nothing committed or pushed.
**Date:** 2026-10-02.
**Scope:** research, architecture and an implementation-ready specification of the V2 physical humanoid. No runtime code, no walking work, no assets, no Unity.

**Evidence tags used throughout:**

| tag | meaning |
|---|---|
| **[H]** | measured human evidence (literature; source in §27) |
| **[V1]** | V1 empirical evidence (repository measurement; path given) |
| **[ENG]** | engineering design choice (a decision, not a fact) |
| **[HYP]** | hypothesis that V2 must test |

**Companion files** (same directory):
- `PHYSICAL_CHARACTER_V2_SPEC.json`: the body, joint, actuator, skeleton and mapping tables in machine-readable form.
- `calc/v2_anthro.py` (anthropometry, mass, COM, inertia, V1.1 reconstruction) and `calc/v2_spec.py` (generates the JSON and `calc/tables_generated.md`: bodies, skeleton, colliders, actuators). Every number in §6, §10, §11, §12, §14, §15 and §16 comes from them. Re-run: `cd calc && python3 v2_spec.py ..`.
- `sources/2026-10-02_user_brief_v2_clean_sheet.md`: the brief this answers, verbatim.

---

## Contents

1. Executive recommendation
2. V1 frozen state: verified, not disturbed
3. Challenge the premise: is a new physical body justified?
4. V1 lessons that directly change V2
5. Did V1 have physical properties that made locomotion unnecessarily fragile?
6. Final semantic / render skeleton contract
7. Coordinate and canonical T-pose contract
8. Physical-body topology (first principles)
9. Physics ↔ render mapping contract
10. Anthropometric specification
11. Physical body table (V2-REF, 1.82 m, 78 kg + equipment 0.91 kg)
12. Foot architecture
13. Joint architecture
14. Actuator architecture
15. Collider architecture
16. Mass distribution and inertia validation
17. Scale and body variation
18. Football sanity check (no implementation; does the body prevent any of these?)
19. Determinism and auditability (designed in, not bolted on)
20. Performance (one player and 22)
21. V1 reuse matrix
22. V2 gate sequence and measurable pass criteria
23. V1 as oracle and comparator
24. Risks, open questions and decisions needed
25. Proposed branch, worktree and file layout
26. First implementation gate: what I would build first after approval
27. Sources

---

## 1. Executive recommendation

**Build V2. Keep V1 frozen as the comparator.** But build it for the right reasons, and do not expect the body alone to fix walking.

1. **V1 has not been shown to be a body that cannot walk.** V1's best perfect-model oracle walked 40 steps on one of two long starts. Its dominant failure, forward speed creep, survived every foot swap at matched states. No measurement ties that failure to a body property. [V1: `g2_stepper/G2_STEPPER_REVIEW.md`, `foot_gate/FOOT_GATE_REVIEW.md`]
2. **V1's body is a stylised-mesh body, and it cannot become the production body without becoming a different body.** Its geometry came from Astra's "Gabriel" display mesh and shared template:
   - 36 × 16.4 cm box boots;
   - a 4.3°-splayed neutral stance, with feet 32 cm apart under hips 18.4 cm apart;
   - shoulder joint centres at bideltoid width;
   - an upper arm 25 % short;
   - no parametric generator;
   - no production-skeleton mapping.

   Each correction moves every approved hash. V1.1 is the proof: its partial anatomy correction broke C2 weight transfer (85 N left on the swing foot) and needed three controller recalibrations (R1, R2, D1). [V1: `v1_1/ANATOMY_V1_1_REPORT.md` §9]
3. **Some V1 body and actuator properties did constrain locomotion, and V1 measured them:**
   - the boots' width set a minimum step width of 0.17–0.20 m, against a human 0.08–0.13 m, leaving 2 cm of sideways correction room;
   - the shared ankle torque budget left ±9 N·m of roll, about a 1.2 cm CoP shift;
   - late-stance plantar-flexion ran at 129–146 of a 150 N·m cap.

   These are real constraints, but they are linked to the sideways mode, not to the forward creep that ended V1's walking. **[V1] linked, causality for the final failure not shown.** (§5)
4. **What V2 lets us correct cleanly that V1 cannot:**
   - an anatomical, parametric, scale-able body generated from a human specification;
   - the production semantic skeleton as the render contract from day one;
   - a human-scale boot with realistic contact geometry;
   - DOFs football needs (knee axial rotation, forearm pronation);
   - an evidence-based dynamic actuator model (torque–angle–velocity, activation, eccentric capacity) instead of a shared vector budget with fixed caps;
   - zero hidden damping;
   - a transition gate that tests the walking hypothesis on a clean body instead of rediscovering it after sustained walking fails.
5. **V2 reuses V1's strongest parts:**
   - the Jolt adapter pattern and the pinned engine;
   - deterministic maths and hashing;
   - the arbiter and ledger, and the sensing;
   - the contact-event lifecycle;
   - the snapshot oracle, the matched-state bench and the stride accounting.

   It does **not** port V1's walking controllers, maps or experimental options (§21).
6. **Topology:** 14 rigid bodies and 13 joints, the same count as V1, arrived at independently (§8). The differences are in what each body and joint is:
   - 35 rotational DOF vs V1's 31 (knee axial rotation, forearm pronation);
   - an anatomical neutral;
   - joint frames centred on their ROM;
   - colliders designed physics-first;
   - mass and inertia from the human specification, including boots.

   Hands (for goalkeepers) and a physical forefoot (for sprinting) are designed as **leaf extensions** that never change the core topology.
7. **Performance:** V2 per-player physics cost is about V1's (same body count). **22 real-time players are not feasible in single-threaded WASM** (V1: ≈ 0.25 s CPU per simulated second per character). This depends on where the authoritative physics runs, not on V2's topology. It is the most important open decision outside the body itself (§20, D7).
8. **First build after approval:** V2-G0 only. That is the human specification → semantic skeleton → physical body → colliders / inertia generator, the T-pose mapping, chirality and scale tests, and static construction in Jolt with readback. Then STOP (§26).

## 2. V1 frozen state: verified, not disturbed

All checks read-only. No checkout, edit, retag or clean anywhere.

| item | verified value |
|---|---|
| Freeze tag | `checkpoint/physchar-v1-final-research`: annotated tag object `207d9bb`, resolving to commit **`11149df`** ("checkpoint(physchar-v1): freeze complete pre-V2 research state") |
| Worktree | `/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v1`, branch `prototype/physical-character-v1`, HEAD = `11149df`, no upstream |
| Tracked tree | clean (no modified or staged files). Untracked files are the intentionally un-versioned review evidence listed in the snapshot |
| Earlier tag | `checkpoint/physchar-pre-crossover` → `b0a84d2` (Gate C5) |
| Non-Git snapshot | `…/_preserved_2026-10-02_physical_character_v1_final/`: `SHA256SUMS` **104/104 OK** (re-checked today) |
| Regression hashes | **not re-run** for this design task. The freeze record states regress.sh 12/12, G2W_A8 6/6, foot gate 42/42 ×2, session_check 16/16 |
| Read in full | `PHYSICAL_CHARACTER_V1_FINAL_HANDOFF.md`, `PHYSICAL_CHARACTER_V1_LESSONS.md`, `PHYSICAL_CHARACTER_V1_MANIFEST.json`, `g2_stepper/RENDER_SKELETON_CONTRACT.md`, `g2_stepper/DECISION_RECORD.md`, `v1_1/ANATOMY_V1_1_REPORT.md` |
| Read in part | the Astra Unity Humanoid audit (§A, D–J, M, N, Q, R, checklist), the Astra remaining-walking-failure report (§D, L, M, N), the foot gate review, the G2 plant report, the G2b night log, `pc_body.js`, `pc_jolt.js`, `pc_balance.js` limits, module headers of every `pc_*.js` |

## 3. Challenge the premise: is a new physical body justified?

### 3.1 The case for continuing V1 (taken seriously)

- **V1 works up to walking.** Gates A–C2, G1 and G2a are approved and hash-stable. The contact substrate is proven (first touch ≤ 1.8 mm, same-step response).
- **The oracle says the body can walk.** The best two-step oracle (Gu) held 40 searched steps on R@0.5 (45 upright). Astra's walking report concluded: *"revisit foot/body architecture only when failures persist under competent oracle selection and are tied to a demonstrated physical limitation."*
- **The leading hypothesis is a controller change.** It is transition-planned double support. On V1 it could be tested in days.
- **The foot gate found no foot that walks better at matched states.**
- **Reimplementation cost is real.** It is 49 commits of accumulated tooling.

### 3.2 Why that case does not hold for the production body

| consideration | continue V1 | V2 clean-sheet |
|---|---|---|
| **Known fragility** | Dominant failure (forward creep) not body-linked. Sideways mode measurably constrained by the boot width and the ankle budget (§5). | Same control problem. The body-linked sideways constraints are removed by design. G5 tests the transition hypothesis on a clean body. |
| **Body / proportion uncertainty** | Every number traces to a stylised display mesh: boot 35.7 cm vs ≈ 30 cm; upper arm 0.234 m vs ≈ 0.31 m; shoulder JCs at bideltoid width; feet 32 cm apart in the neutral. Correcting it is a new body under old controllers. | Generated from a human specification with evidence per parameter (§10). |
| **Controller uncertainty** | Controllers, maps (`mU1_tau*`) and thresholds were identified on this body. V1.1 showed that a body change invalidates them (C2 broke). `pc_plan.js` alone is 121 KB of opt-in flags. | Controllers rebuilt gate by gate with ported mechanisms and fresh baselines. No flag archaeology. |
| **Reusable infrastructure** | All of it, but entangled with the body (`pc_body` indices, `LEG = 0.9243` constants, maps). | The body-agnostic parts port (§21). The entangled parts are reference only. |
| **Reimplementation cost** | Zero now. Every body correction re-earns all gates anyway. | V1 reached approved Gates A–C2 about 8 h after the pivot from a blank start [V1: git log 09-29 18:16 → 09-30 02:12]. V2 starts with the infrastructure. |
| **Production skeleton** | 23-bone Astra runtime rig. The production semantic skeleton is documentation only. | The production semantic skeleton is the render contract from G0. |
| **Body variation** | Gabriel only. No generator. | Parametric from G0 (§17). |
| **Football requirements** | No knee axial rotation (V1.1 swing ankle twist sat on its ±10° stop because of it). No forearm pronation. Fixed isometric-level caps. 150 N·m plantar-flexion cap, below athlete capacity (§14). | Knee axial rotation, forearm pronation, dynamic torque–velocity capacity, eccentric braking capacity, leaf extensions for GK hands and the forefoot. |
| **22 players** | Infeasible in WASM, independent of body. | Same. Needs a runtime decision (D7). |

### 3.3 Verdict

**A new body is justified. What makes it justified is not the walking failure.**
- V1 cannot become the production foundation without being rebuilt.
- Rebuilding it inside V1 would destroy its value as a frozen comparator, while carrying its experiment debris.

**What V2 must not claim:** that a better body fixes walking. Walking remains a control problem until G5–G7 say otherwise.

**The fastest falsification of the transition hypothesis would be on V1.** I do not recommend it: you froze V1, and its quantitative result would not transfer to V2's body. V2-G5 is built to answer it.

## 4. V1 lessons that directly change V2

| # | V1 lesson | evidence | V2 change |
|---|---|---|---|
| L1 | Physical authority works and is worth its cost | [V1] Gate D first touch ≤ 1.8 mm; D6 honest recovery | Same invariant from G0. No root force, teleport, pinning, hidden support, scripted outcome. The ledger closes every gate. |
| L2 | Anatomy before control; controllers tuned on the wrong body are wasted | [V1] V1.1 broke C2; R1 / R2 / D1 | Body frozen at G0 review before any controller exists. G1 is passive. |
| L3 | Render skeleton ≠ physics body | [V1] `RENDER_SKELETON_CONTRACT.md` | §6 skeleton contract and §9 mapping table are G0 deliverables with a T-pose round-trip test. |
| L4 | Colliders fitted to a stylised mesh import its stylisation | [V1] boot box 0.358 × 0.164 m from `footwearMin/Max`; the shoulder centre had to be moved inside the mesh | Colliders generated from the human specification, physics-first. Mesh offset is a check, not a source (§15). |
| L5 | Neutral pose must be anatomical | [V1] the V1.1 splayed bind forced limits re-expressed about the bind (`romOf`), a knee axis ⊥ to the splayed leg, and a 7.5 % sagittal→twist leak at the hip | Canonical T-pose with vertical, parallel legs under the hip joint centres. Every joint frame is defined anatomically, then centred on its ROM (§13). |
| L6 | The sideways mode needs narrow steps and ankle roll authority | [V1] G2 plant report: width ≥ 17 cm impossible to narrow; ±9 N·m roll budget | Human-width boot (11.3 cm at 1.82 m). Per-axis ankle inversion / eversion capacity (no shared budget floor) (§12, §14). |
| L7 | A shared "vector effort" budget is not physiology | [V1] `budgetLimits` floor 25 % → roll 9 N·m | Per-axis directional capacity surfaces. Couplings only where muscles are shared, as explicit group budgets (§14). |
| L8 | Hidden engine damping enters the stride balance | [V1] Jolt linear damping 0.05 ≈ −2 N·s per stride, the same order as the +2.7 N·s per stride creep | Linear and angular body damping = 0. Optional explicit aerodynamic drag, ledgered (§19). |
| L9 | Hard limits are a hidden resistance path | [V1] lessons #21; Gate A knee-stop energy +12.8 J (V1.1) | Passive soft-limit torques (ledgered) inside a hard engine stop placed beyond the anatomical range. Absolute (not frequency-based) stop stiffness (§13). |
| L10 | The double support is the control lever and the unpredictability source | [V1] §I.8: next-step residual ≈ 2× touchdown residual | G5 is a first-class transition gate with the instrumentation to tell whether the physical transition is healthy (§22). |
| L11 | Judge walking by stride-level, phase-matched state; count fall-aware; commanded ≠ achieved | [V1] lessons #6, #16 | Gate metrics defined that way from G4. |
| L12 | Long oracle walks can be fragile paths | [V1] 0.1 mm command difference: 13 vs 34 steps | Every walking criterion includes a command-perturbation robustness test (§22, G7). |
| L13 | Snapshot / restore and the oracle are the best diagnostics | [V1] 5–20× cheaper, bit-exact | Controller state designed as a snapshot-able struct from G2. Oracle ported at G6 (§19, §21). |
| L14 | The physics is the performance bottleneck | [V1] ≈ 0.25 s CPU per simulated s per character | Solver-iteration convergence study at G1. Runtime decision before G2 perf criteria (§20). |
| L15 | Friction observer must not read another body's push as low μ | [V1] D6 `muValid` fix | Ported with the fix (§21). |
| L16 | The rigid-boot swing generator broke the articulated toe | [V1] foot gate: F2 94–99 % swing failure | V2's swing is designed foot-agnostically from the start. F1 is re-tested at a dedicated gate before running (§12). |
| L17 | First steps must be short; a fixed nominal fails at initiation | [V1] §I.5 | G4 / G5 entry states include initiation from standing. |

## 5. Did V1 have physical properties that made locomotion unnecessarily fragile?

**Answer:** yes for the sideways mode, with measured links. No evidence for the forward speed creep that ended V1 walking. The table separates evidence from causality.

| V1 property | V1 value | human / V2 | V1 evidence of consequence | causal status |
|---|---|---|---|---|
| **Boot width** | 0.164 m box | ball breadth 0.105 m (ANSUR II, 1.82 m); V2 boot 0.113 m | Min step width ≈ 0.17–0.20 m (human 0.08–0.13). Nominal 0.22 m left 2 cm of room. "Foot placement can only correct one sideways direction". [V1 `g2_walk/NIGHT_LOG.md` row f; `g2_char/G2_PLANT_REPORT.md` §5] | **[V1] linked** to the sideways mode. Not shown for the creep. |
| **Wide gait → yaw couple** | feet 25–37 cm apart in DS → ≈ 12 N·m couple; pelvis yaw ±15–20° | human pelvis yaw ≈ 4–6° | Yaw rotates the walk against the planner frame. [V1 NIGHT_LOG row j; plant report §6] | **[V1] linked.** Partly a consequence of the boot width. |
| **Ankle roll authority** | ±9 N·m (35 N·m cap × 25 % budget floor) → CoP shift ≈ 1.2 cm | human inversion / eversion capacity tens of N·m (§14) | "Sideways balance has to come from DS CoP and foot placement" [V1 NIGHT_LOG row b] | **[V1] linked** (actuator policy, not anatomy). |
| **Boot toe lever** | tip 0.276 m ahead of the ankle | V2 0.227 m (1.82 m); barefoot toe tip 0.217 m | Failing swings pivot on the boot tip with the ankle at 136–150 N·m. Toe-scuff 13–29 % of swings at matched states. [V1 foot gate §"In plain English" 3] | **[V1] linked** to swing failures. **Not causal for creep:** the 0.20 m F1 foot did not continue better at matched states. |
| **Ankle plantar-flexion demand / cap** | cap 150 N·m (1.92 N·m/kg, no velocity dependence); late stance median / p90 = 129 / 146 N·m at ≈ 0.5 m/s | human walking at 1.25 m/s peaks at 1.46 ± 0.15 N·m/kg (114 N·m at 78 kg) and uses ≈ 86 % of the angle / velocity-adjusted capacity; athlete isometric ≈ 2.6 N·m/kg (§14) | V1's median 1.65 N·m/kg at 0.5 m/s exceeds what a human uses at 2.5× the speed [V1 foot gate FG4] | **[HYP]** the long toe lever and the short, quick gait raised the ankle demand, and the cap is low for an athlete. Untested. |
| **Splayed neutral** | feet ±0.161 m, hips ±0.092 m, 4.3° splay | vertical legs under the hips | Quiet-stance hip ab / adduction 24 N·m per side (17 % of cap) vs 0.2 in V1. Swing-ankle twist hit its ±10° stop. Stance hip twist at its budget floor ≈ 2 s. [V1.1 report §12, §15] | **[V1] linked** to actuator load. Not to the walking failure. |
| **No knee axial rotation** | hinge knee + ankle "twist" ±10° | knee axial rotation ≈ 0 extended, tens of degrees flexed (§13) | Swing-ankle twist at its stop during hover [V1.1 report §15 item 4] | **[V1] linked** (minor). |
| **Upper arm short** | 0.234 m (V1.1 joint-centre line) | ≈ 0.31 m at 1.90 m | Arm inertia about the shoulder 0.41 vs V2 0.55 kg·m² (§16). Arms cancelled 40 % of the yaw momentum vs a human 64 %. [V1 plant report §6] | **[HYP]** contributes to the weaker counter-swing. Not shown. |
| **Engine damping** | 0.05 linear + angular per body | 0 in a human (air drag ≈ 0.1 N at walking speed) | ≈ −2 N·s per stride, part of the stride impulse balance [V1 handoff §H] | **[V1] measured. Not a cause:** a speed-proportional drag is stabilising. Removed in V2 for honest accounting. |
| **Body mass distribution / leg inertia** | de Leva fractions; leg about the hip 3.30 kg·m² | V2 1.90 m instance: 3.04 barefoot, 3.28 with boots | — | Small differences (§16). Not a cause. |

**Conclusion for V2:**
- The sideways-mode constraints (boot width, roll budget, splay, missing knee axial DOF) are removed by design.
- The forward creep is not addressed by the body. It is a G5–G7 control question.
- V2 must not be judged a failure if it walks no better at G7 with the same controller ideas. It would still have removed the measured body constraints and become a production foundation.

## 6. Final semantic / render skeleton contract

**Source:** the frozen `RENDER_SKELETON_CONTRACT.md` (Astra Unity Humanoid audit, adopted by the user), unchanged in topology. V2 adds the exact joint placement, the local-axis convention and the driver class of every bone.

**Locked rules:**
- No structural change after animation production starts. Additions attach only as leaf branches.
- One topology for goalkeepers and outfield players. Proportions never change topology.
- No `hip_L` / `hip_R` render bones.
- No heel bone.
- No IK helper bones in the exported skeleton.
- Twist bones are branches, never inserted into a semantic chain.
- Fingers, eyes and jaw are deferred. If fingers are ever added: full 5 × 3 Unity-compatible chains.

**31 bones.** Positions are canonical T-pose, CCS (§7), for V2-REF (1.82 m, 78 kg, boots). "f" = fraction of barefoot stature H, and the 0.020 m boot sole stack is added to every height. Every other body size is generated from the same fractions (§17).

| # | bone | parent | Unity | Touchline req. | joint position at T-pose (m) | how placed |
|---|---|---|---|---|---|---|
| 0 | `root` | — | unmapped | yes | (0, 0, 0) | ground below the mid-hip joint centre |
| 1 | `hips` | root | Hips | yes | (0, 0.957, 0) | mid-HJC (0.515 f, ANSUR II) |
| 2 | `spine_01` | hips | Spine | yes | (0, 1.110, −0.031) | = physical **lumbar** joint (omphalion level, 0.017 H posterior) |
| 3 | `spine_02` | spine_01 | Chest | yes | (0, 1.335, −0.040) | = physical **thoracic** joint (xiphoid level, 0.022 H posterior) |
| 4 | `spine_03` | spine_02 | UpperChest | yes | (0, 1.460, −0.040) | midway xiphoid → C7 (on the thorax body) |
| 5 | `neck` | spine_03 | Neck | yes | (0, 1.586, −0.031) | = physical **neck** joint (C7 / cervicale, 0.8605 f) |
| 6 | `head` | neck | Head | yes | (0, 1.702, −0.010) | atlanto-occipital level (0.924 f), on the head body |
| 7, 13 | `clavicle_L/R` | spine_03 | Left/RightShoulder | yes | (∓/±0.020, 1.513, +0.086) | sternoclavicular joint; tip = SJC |
| 8, 14 | `upperArm_L/R` | clavicle | Left/RightUpperArm | yes | (±0.198, 1.472, 0) | = physical **shoulder** (GH centre) |
| 9, 15 | `upperArm_twist_L/R` | upperArm | unmapped | yes | 50 % SJC → EJC | deformation branch |
| 10, 16 | `lowerArm_L/R` | upperArm | Left/RightLowerArm | yes | (±0.493, 1.472, 0) | = physical **elbow** |
| 11, 17 | `forearm_twist_L/R` | lowerArm | unmapped | yes | 60 % EJC → WJC | deformation branch |
| 12, 18 | `hand_L/R` | lowerArm | Left/RightHand | yes | (±0.774, 1.472, 0) | wrist joint centre (on the forearm body in the core topology) |
| 19, 25 | `upperLeg_L/R` | hips | Left/RightUpperLeg | yes | (±0.091, 0.957, 0) | = physical **hip** (HJC) |
| 20, 26 | `thigh_twist_L/R` | upperLeg | unmapped | yes | 50 % HJC → KJC | deformation branch |
| 21, 27 | `lowerLeg_L/R` | upperLeg | Left/RightLowerLeg | yes | (±0.091, 0.530, 0) | = physical **knee** |
| 22, 28 | `calf_twist_L/R` | lowerLeg | unmapped | yes | 50 % KJC → AJC | deformation branch |
| 23, 29 | `foot_L/R` | lowerLeg | Left/RightFoot | yes | (±0.091, 0.091, 0) | = physical **ankle** |
| 24, 30 | `toe_L/R` | foot | Left/RightToes | yes | (±0.091, 0.038, +0.130) | midpoint of the oblique MTP line (MTP1 at 0.741, MTP5 at 0.63 of foot length from the heel) |

Bone order is parent-first and fixed forever (index = export order). Names are frozen.

## 7. Coordinate and canonical T-pose contract

### 7.1 Finding: the existing frame label is self-contradictory

The existing assets and code (`rig.json`, `of_rig.js`, `skeleton.js`, `gl_renderer.js`) declare "+X = character's RIGHT, +Y up, +Z forward, **right-handed**". Those four statements cannot all be true.
- In a right-handed frame, right × up = backward.
- So (+X right, +Y up, +Z forward) is a **left-handed** triad. It is Unity's convention.
- The world frame (x = pitch x east, y = height, z = −pitch y) is also left-handed. Pitch y is south-positive: fixtures "from the south" sit at y = 42 on the 68 m pitch.
- The data are therefore **self-consistent and anatomically unmirrored**: a character facing +Z_w (north) has its right side at +X_w (east). Only the label is wrong.
- This matters because the project already recorded one lateral-mirror defect (Dribbling V1 `ofBootPlan`, R boot where the rendered left foot is).
- V2 states the contract unambiguously and tests it.

### 7.2 V2 contract

| item | contract |
|---|---|
| Units | SI: metres, kilograms, seconds, radians, newtons, N·m. Degrees only in human-facing tables. |
| Canonical character space (CCS) | **+X = anatomical right, +Y = up, +Z = anatomical forward. A LEFT-HANDED triad**, numerically identical to Unity's and to the existing Touchline data. Rotation maths (quaternions, cross products) is numerically unchanged. Consequence: a positive rotation about +Y turns +Z toward +X, i.e. **positive yaw = turn right** (clockwise seen from above). |
| Physics / world frame | Same handedness and up axis: x_w = pitch x, y_w = height, z_w = −pitch y. Jolt is used numerically; gravity (0, −9.81, 0). Character yaw ψ from a pitch heading h (atan2 in pitch x / y): **ψ = h + 90°**. One function, `pitchToWorld`, owns this. Nothing else converts. |
| Ground plane | y_w = 0 = the **stud-tip plane** of a rigid ground (G0–G7). Turf compliance and stud penetration are a later gate (§24). |
| Origin / root | Character origin = `root` = the ground point below the mid-HJC in the canonical pose. Facing +Z. |
| Root at run time | **Derived, never authoritative:** position = (pelvis mid-HJC x, 0, z); rotation = yaw-only, from the pelvis body's +Z projected onto the ground. If the pelvis +Z is within 30° of vertical (lying), use the pelvis +Y projection, sign-continuous. Pure function of the physical state. No filtering inside the contract (presentation may filter its own copy). |
| Pelvis placement | `hips` = mid-HJC at height (ankle height + shank + thigh). Pelvis body frame = CCS axes in the canonical pose (no tilt). |
| Feet | Soles flat on y = 0, long axes along +Z, AJC directly below the HJC (no splay), first-MTP joint at 74.1 % of the barefoot foot length from the heel, toes straight. |
| Arms (T-pose) | Horizontal along ±X at SJC height, elbows at 0°, forearms in neutral rotation: **palms down, thumbs forward** (Unity Humanoid T-pose). Wrists straight. Clavicles neutral. |
| Trunk / head | Upright. Spinal joint centres posterior of the segment COM line (§10). Head facing +Z with the Frankfort plane horizontal. |
| Bone local axes | **+Y_local = toward the child joint** (along the bone). **+Z_local = anatomical forward** for spine, neck, head, arm and leg bones. For `foot`, `toe`: +Y_local = forward, +Z_local = up. **+X_local = Y × Z** (standard formula; always a proper rotation). Spine chain and root: local = CCS axes. Right arm: X_local = down. Left arm: X_local = up. Legs: X_local = left on both sides. |
| Left / right symmetry | L frame = the mirror (negate world x) of the R frame, then X negated, so Y and Z mirror exactly. **Mirror operator on a local rotation q = (x, y, z, w): q_mirrored = (x, −y, −z, w); on a CCS position (x, y, z): (−x, y, z).** G0 unit-tests it on every bone. |
| Chirality test (G0) | (1) The bone named `upperLeg_R` has its position at +X in the CCS. (2) A character yawed to face pitch +x (east) has its right foot at pitch y > 0 (south). (3) The rendered right foot is the physical `foot_R`. (4) A deliberately mirrored copy FAILS all three. |
| Determinism of the contract | One canonical spec JSON per body. Generated twice from the same human specification, it is byte-identical (hash). |

## 8. Physical-body topology (first principles)

### 8.1 Method

For each candidate rigid body: what football mechanism needs it to move independently, physically? A body earns its place only if merging it would remove a mechanism that changes a football outcome:
- a contact that would land elsewhere;
- a momentum transfer that would be wrong;
- a balance capacity that would change.

The tie-breaker is solver conditioning (Jolt is maximal-coordinate sequential impulses, which converge worst with light, low-inertia bodies at the end of chains) and cost.

### 8.2 Candidates

| candidate | physics needs it because | decision |
|---|---|---|
| **pelvis** | Root of both legs. Hip joint torques react against it. Pelvis–trunk counter-rotation in running. | **body** |
| **abdomen** (lower torso) | 16.3 % of body mass, the largest single segment. A separate lumbar joint (flexion / extension dominant) and thoracic joint (axial rotation dominant) put trunk bending and twisting at the right height, for sprint counter-rotation, kicking lean, shielding and absorbing a shoulder charge in two places. Merging it moves 12.6 kg rigidly with either the pelvis or the thorax. | **body** |
| **thorax** (upper torso) | Shoulder-challenge contact body. Arm and neck attachment. Thoracic rotation. | **body** |
| **head** (with neck mass) | Heading contact. Head–ball impulse must reach the trunk through a finite neck. A visible, physical head reaction to collisions. | **body** |
| neck body | Would split C0–C7 motion. Adds a ≈ 1 kg body between 12.5 kg and 5.3 kg bodies (poor conditioning). The render neck / head split is procedural. | **no** (render-procedural) |
| clavicle / scapula bodies | Shoulder-girdle elevation adds ≈ 5–8 cm of overhead reach (goalkeeper). Two ≈ 1 kg bodies with closed-chain scapulothoracic contact are expensive and ill-conditioned. | **no** in core. GK reach is an open item (§24). Render clavicle rigid to the thorax in G0. |
| **upper arms** | Arm swing angular momentum, shielding, shoulder contact, fall bracing. | **body** |
| **forearms** | Elbow flexion: sprint arm carriage, bracing, shielding, handball geometry. | **body, with the hand merged** |
| hands | Goalkeeper catching, parrying and punching need wrist motion and a palm surface. Outfield needs only a hand collider for bracing and handball. A 0.47 kg distal body adds conditioning risk and 2 bodies. | **leaf extension H** (GK first). Core: a hand collider on the forearm body |
| **thighs** | Leg swing, hip power, kicking. | **body** |
| **shanks** | Knee flexion: everything. Shin contact in tackles. | **body** |
| **feet** | Ground contact, ankle torque (CoP), ball striking. | **body** |
| physical forefeet | Forefoot push-off with the heel up (sprint start, acceleration, cutting). The lever falls from the boot tip to the MTP line. | **leaf extension F1**, gated before running (§12) |

### 8.3 Decision: core topology = 14 bodies, 13 joints, 35 rotational DOF

```
pelvis ─ lumbar (3) ─ abdomen ─ thoracic (3) ─ thorax ─ neck (3) ─ head
                                                  ├─ shoulder_L (3) ─ upperArm_L ─ elbow_L (2) ─ forearm_L   [hand collider]
                                                  └─ shoulder_R (3) ─ upperArm_R ─ elbow_R (2) ─ forearm_R   [hand collider]
pelvis ─ hip_L (3) ─ thigh_L ─ knee_L (2) ─ shank_L ─ ankle_L (3: 2 actuated + 1 limited) ─ foot_L
pelvis ─ hip_R (3) ─ thigh_R ─ knee_R (2) ─ shank_R ─ ankle_R (3) ─ foot_R
```

**Same body count as V1, arrived at independently.** The differences from V1:
- **Knee:** 2 DOF (flexion + axial rotation) instead of a hinge.
- **Elbow:** 2 DOF (flexion + pronation / supination) instead of a hinge.
- **Frames:** every joint frame centred on its ROM about an anatomical neutral, with no splay.
- **Geometry, mass, inertia and colliders:** generated from the human specification, not from a mesh.

### 8.4 Alternatives considered

| option | bodies / joints / rot. DOF | gains | costs | verdict |
|---|---|---|---|---|
| 12-body (single torso) | 12 / 11 / 32 | −14 % bodies | Bending and twisting at one joint at the waist. A shoulder charge bends the body at the wrong place. Abdomen mass rides with the thorax. | rejected |
| **14-body core** | **14 / 13 / 35** | all football mechanisms in §18 except GK hands and forefoot push-off | — | **adopt** |
| 16 (+ hands, H) | 16 / 15 / 39 | GK wrist, palm orientation, parry compliance | +14 % bodies; a 0.47 kg distal body | **extension**, enable for GK before GK gates |
| 18 (+ hands + forefeet) | 18 / 17 / 41 | sprint forefoot lever | Toe ≈ 0.2 kg body: foot / toe inertia ratio ≈ 30+, the worst conditioning in the character | **extension F1**, gate before running |
| 20+ (+ neck, clavicles) | 20 / 19 / 47+ | girdle reach, neck split | ill-conditioned closed chains, cost | rejected for now |

Extensions add **leaf** bodies only. Nothing in the core changes: names, indices of core bodies, joint frames, mapping classes. The render skeleton is identical in every option.

## 9. Physics ↔ render mapping contract

**Driver classes:**

| class | meaning |
|---|---|
| **DIRECT** | world transform = a physical body's transform × a constant bind offset. Exact (≤ 1e-6 m at rest, ≤ 1 mm in motion). |
| **AIM** | position exact (on a body), direction = the body's swing, and only twist redistributed. |
| **PROC** | procedural from physical state, presentation-only, bounded. |
| **DEFORM** | deformation-only branch (twist extraction). |
| **DERIVED** | structural, computed from physics. |

No render bone ever writes physics, and the ball is never parented or moved for presentation.

| bone | class | driven from | rule |
|---|---|---|---|
| `root` | DERIVED | pelvis | §7.2 root rule |
| `hips` | DIRECT | pelvis | — |
| `spine_01` | DIRECT | abdomen | the bone sits at the physical lumbar joint |
| `spine_02` | AIM | thorax (swing) | Position = the physical thoracic joint (on both bodies). Swing = the thorax's. Axial twist of the thorax relative to the abdomen split 50 / 50 with `spine_03`. Both bone origins lie on the thorax, so the aim is exact. |
| `spine_03` | DIRECT | thorax | Must be exact: the arms and head hang from it |
| `neck` | AIM | head (swing) | Position = the physical neck joint. Twist split 27 % neck / 73 % head (C1–C2 supplies 73 ± 17 % of cervical axial rotation, Zhou 2020) [H] |
| `head` | DIRECT | head | — |
| `clavicle_L/R` | DIRECT (rigid to thorax) in G0 | thorax | The physical shoulder joint centre is fixed in the thorax, so any clavicle motion would move the render shoulder off the physical one. Open decision: allow a bounded PROC shrug ≤ 1.5 cm presentation deviation (§24). |
| `upperArm_L/R` | DIRECT | upperArm | — |
| `upperArm_twist_L/R` | DEFORM | upperArm vs thorax | 50 % of the upper arm's twist about its long axis |
| `lowerArm_L/R` | DIRECT | forearm | includes pronation / supination |
| `forearm_twist_L/R` | DEFORM | forearm vs upperArm | 50 % of the pronation / supination |
| `hand_L/R` | DIRECT (core: rigid on forearm) / DIRECT on hand body (H) | forearm / hand | Wrist straight and rigid in the core, so the render hand stays on the physical hand collider. A bounded presentation-only wrist bend is an open item (§24). |
| `upperLeg_L/R` | DIRECT | thigh | — |
| `thigh_twist_L/R` | DEFORM | thigh vs pelvis | 50 % of hip axial rotation |
| `lowerLeg_L/R` | DIRECT | shank | includes knee axial rotation |
| `calf_twist_L/R` | DEFORM | shank vs thigh | 50 % of knee axial rotation |
| `foot_L/R` | DIRECT | foot | — |
| `toe_L/R` | PROC (F0) / DIRECT (F1) | foot + sensed contact | F0: when the forefoot is loaded and the heel is up, the toe pitches so the render toes lie on the turf (clamped 0–60° dorsiflexion). Otherwise neutral or an animation preference ≤ 15°. It never changes a contact. F1: the forefoot body. |

**Bind offsets.** Each DIRECT bone stores one constant transform. The bone's world transform at the canonical pose divided by its body's world transform at the canonical pose. G0 test: at the canonical pose, every bone reproduces §6 to ≤ 1e-6 m and ≤ 1e-6 rad.

**Skinning.** Mesh deformation uses the bones only. Colliders are never derived from the mesh.

## 10. Anthropometric specification

### 10.1 Baseline body: V2-REF

**V2-REF = 1.82 m barefoot stature, 78 kg body mass** (professional male outfield player). [H]
- CIES Football Observatory (2022, 31 UEFA leagues): 182.3 cm.
- FIFA World Cup 2018 squads (n = 736): 182.4 cm, 77.2 kg.
- English Premier League, DXA (Costello et al. 2025 preprint): 182.7 cm, 78.9 kg, body fat ≈ 12 %.
- Bloomfield et al. 2005 (n = 2,085): 1.80–1.83 m, 74.3–77.5 kg.
- Goalkeepers and centre-backs run ≈ 1.87–1.90 m and 84–87 kg. They are a variation, not the baseline.

**V1-matched instance = 1.90 m, 78 kg.** It is generated by the same pipeline and used only for V1 comparisons.

### 10.2 Parameter table

All lengths are fractions of barefoot stature H unless stated. Every row is a parameter of the generator; the "V2-REF" column is that row evaluated at 1.82 m.

| parameter | value | evidence | tag | V2-REF |
|---|---|---|---|---|
| Segment masses | de Leva 1996 male %: head 6.94, UPT 15.96, MPT 16.33, LPT 11.17, upper arm 2.71, forearm 1.62, hand 0.61, thigh 14.16, shank 4.33, foot 1.37 | de Leva Table 4 (verified) | [H] | §11 |
| Segment COM and radii of gyration | de Leva % of segment length. Shank uses the KJC→AJC row (440.3 mm, CM 43.95 %, r 25.1 / 24.6 / 10.2), because V2's distal shank endpoint is the AJC. | de Leva Table 4 | [H] | §11 |
| Radius-of-gyration axes | sagittal r = about the AP axis, transverse r = about the ML axis, longitudinal r = about the long axis (fits the trunk wider than deep, the head deeper than wide) | reading of de Leva, consistent with V1 | [H] / [ENG] reading | — |
| Ankle JC height | 0.039 H barefoot | Drillis & Contini 0.039; de Leva AJC = sphyrion − 12.6 mm; ANSUR II lateral malleolus 0.0415 H | [H] | 0.071 + sole 0.020 = **0.091 m** |
| Knee JC height | 0.280 H | ANSUR II lateral femoral epicondyle height 492 / 1756 mm | [H] | **0.530 m** |
| Hip JC height | 0.515 H | ANSUR II trochanterion 901 / 1756 mm; de Leva HJC = trochanterion + 3.2 mm | [H] | **0.957 m** |
| Stature closure check | HJC + de Leva CERV→MIDH (0.3465 H) + head (0.1395 H) = 1.0010 H | — | [H] | residual +1.9 mm |
| Trunk landmarks | omphalion = HJC + 0.0837 H; xiphion + 0.1238 H; suprasternale + 0.0980 H; cervicale (C7) = 0.8605 H | de Leva LPT / MPT / UPT / head lengths | [H] | 1.110 / 1.335 / 1.513 / 1.586 m |
| HJC half-spacing | 0.050 H | Bell / Harrington regressions with de Leva bispinous breadth → 183–184 mm; Hara 2016 171–179 mm; Bardakos 90.6 mm per side | [H] | **±0.091 m** |
| SJC height | 0.798 H | acromion 0.818–0.821 H (Drillis / ANSUR II) − de Leva SJC 34.5 mm below the acromion (scaled) | [H] | **1.472 m** |
| SJC half-spacing | 0.109 H | ANSUR II biacromial 0.231 H (footballer-sized subset, n = 304) / 2, minus ≈ 1.2 cm acromion-edge → humeral-head-centre offset | [H] + [ENG] offset | **±0.198 m** |
| Upper arm / forearm / hand | 0.1618 / 0.1545 / 0.0495 H (SJC→EJC, EJC→WJC, WJC→MET3) | de Leva | [H] | 0.295 / 0.281 / 0.090 m |
| Elbow / wrist height check (arms down) | 0.636 / 0.482 H | Drillis 0.630 / 0.485 | [H] check | — |
| Spinal joint AP offset (posterior of the segment COM line) | lumbar −0.017 H, thoracic −0.022 H, cervical −0.017 H | gravity line anterior of the lumbar spine (qualitative). Dumas 2007 places the torso COM near its anteriorly defined CJC–LJC line. | [ENG] | −0.031 / −0.040 / −0.031 m |
| Head joint (atlanto-occipital) | 0.924 H | between eye 0.936 H and chin 0.870 H (Drillis) | [ENG] | 1.702 m |
| Foot length (barefoot) | 0.153 H | Drillis 0.152; ANSUR II 0.1544; ANSUR footballer-sized subset 0.1525 | [H] | 0.2785 m |
| Ball / heel breadth | 0.376 / 0.268 × foot length | ANSUR II | [H] | 0.105 / 0.075 m |
| AJC from the heel | 0.22 × foot length (evidence range 0.18–0.24) | Papachatzis 2023, Baxter 2012, Salami 2020 (derived) | [H] range, [ENG] pick | 0.061 m |
| First MTP from the heel | 0.741 × foot length | ANSUR II ball-of-foot length; Thompson 2019 0.70–0.79 | [H] | 0.145 m ahead of the AJC |
| Fifth MTP from the heel | 0.63 × foot length | Hawes & Sovak (recalled) | [H] recalled | 0.114 m ahead of the AJC |
| Hip breadth (surface) | 0.190 H | Drillis 0.191; ANSUR II 0.197 | [H] | 0.346 m |
| Chest / waist depth | 0.131 / 0.119 H | ANSUR II footballer-sized subset (237 / 215 mm) | [H] | 0.238 / 0.217 m |
| Bideltoid breadth | 0.291 H | ANSUR II 510 mm | [H] | 0.530 m |
| Head length / breadth | 0.114 / 0.088 H | ANSUR II | [H] | 0.207 / 0.160 m |
| Limb tissue densities | thigh 1050, shank 1090, upper arm 1070, forearm 1130 kg/m³ | Dempster, via Winter | [H] | collider radii only |
| Boots | 0.20 kg each; FG studs 12 mm; sole stack 20 mm under the heel; toe allowance 10 mm; heel counter 5 mm; upper + flare 8 mm | Loud 2024 (studs); modern boots 160–250 g; fit allowance recalled | [H] / [ENG] | — |
| Shin guards; kit | 0.08 kg each; shirt 0.20 kg, shorts + socks 0.15 kg | — | [ENG] | — |

**Why the leg heights come from ANSUR II, not from stacking de Leva lengths.** de Leva's own thigh + shank + ankle height gives a hip at 0.533 H. With de Leva's trunk and head on top, the stature overshoots by 1.9 % (3.4 cm at 1.82 m). ANSUR II's measured trochanterion and epicondyle heights (n = 4,082) close the stature to 0.1 % with de Leva's trunk and head. So V2 uses ANSUR joint heights and de Leva segment fractions. Leg length (HJC → AJC) = 0.476 H (0.866 m at 1.82 m; V1: 0.924 m at 1.90 m, V2 at 1.90 m: 0.904 m).

**What is not claimed:**
- de Leva's sample is 1990s Soviet PE students, not professional footballers.
- Footballers' segment masses, especially the thighs, may differ. Two-predictor regressions are a later variation hook (§17), and the sensitivity is reported at G0.
- Joint heights vary ±3–4 % between populations.

## 11. Physical body table (V2-REF, 1.82 m, 78 kg + equipment 0.91 kg)

**Body frame:** origin = the body's proximal joint centre (pelvis: mid-HJC); axes = CCS at the canonical pose.

**Mass properties** go to Jolt explicitly (`EOverrideMassProperties::MassAndInertiaProvided`, COM via `OffsetCenterOfMassShape`). Colliders never contribute mass.

**Inertia method:**
- de Leva radii of gyration × the generated segment length, principal axes aligned with the segment (long, AP, ML);
- composites (forearm + hand, foot + boot, shank + shin guard) by the parallel-axis theorem;
- equipment as boxes.

| body | semantic bones driven | segment length (m) | mass (kg) | COM from proximal joint, CCS (m) | I_xx / I_yy / I_zz about COM (kg·m²) | collider (§15) | parent joint |
|---|---|---|---|---|---|---|---|
| pelvis | `hips` (+ derived `root`) | 0.152 (HJC → omphalion) | 8.803 (incl. kit 0.09) | (0, +0.059, 0) | 0.0614 / 0.0696 / 0.0765 | rounded box | — (root body) |
| abdomen | `spine_01` | 0.225 (omphalion → xiphion) | 12.737 | (0, +0.124, +0.031) | 0.0948 / 0.1416 / 0.1502 | rounded box | lumbar |
| thorax | `spine_02` (aim), `spine_03`, `clavicle_L/R` | 0.251 (xiphion → C7); de Leva UPT 0.178 | 12.649 (incl. kit 0.20) | (0, +0.125, +0.040) | 0.0817 / 0.1721 / 0.2032 | rounded box + girdle capsule | thoracic |
| head | `neck` (aim), `head` | 0.254 (vertex → C7) | 5.413 | (0, +0.127, +0.031) | 0.0346 / 0.0238 / 0.0320 | sphere + neck capsule | neck |
| upperArm_L/R | `upperArm`, `upperArm_twist` | 0.295 | 2.114 | (±0.170, 0, 0) | 0.0046 / 0.0133 / 0.0149 | deltoid sphere + tapered capsule | shoulder |
| forearm_L/R (+ hand) | `lowerArm`, `forearm_twist`, `hand` | 0.281 + hand 0.090 | 1.739 (1.264 + 0.476) | (±0.190, 0, 0) | 0.0021 / 0.0253 / 0.0264 | tapered capsule + hand capsule | elbow |
| thigh_L/R | `upperLeg`, `thigh_twist` | 0.428 | 11.075 (incl. kit 0.03) | (0, −0.175, 0) | 0.2187 / 0.0449 / 0.2187 | tapered capsule | hip |
| shank_L/R | `lowerLeg`, `calf_twist` | 0.439 | 3.457 (3.377 + guard 0.08) | (0, −0.194, +0.001) | 0.0398 / 0.0070 / 0.0414 | tapered capsule | knee |
| foot_L/R (+ boot) | `foot`, `toe` (PROC) | foot 0.2785; boot 0.2935 | 1.269 (1.069 + boot 0.20) | (0, −0.049, +0.063) | 0.0067 / 0.0071 / 0.0018 | convex hull | ankle |

- **Totals:** 78.91 kg, of which body 78.00 and equipment 0.91.
- **Canonical COM** (T-pose): height 1.058 m.
- **Arms-down standing COM:** 1.034 m above the stud tips = **0.557 H barefoot-equivalent**.

Arm values are in the T-pose (long axis = X). The V1-matched 1.90 m instance is in `PHYSICAL_CHARACTER_V2_SPEC.json`.

## 12. Foot architecture

### 12.1 Human and boot evidence → V2-F0 geometry

Values for V2-REF (1.82 m barefoot); every row scales with the human specification.

| quantity | evidence | V2-REF value | tag |
|---|---|---|---|
| Barefoot foot length | 0.153 H (Drillis 0.152; ANSUR II 0.1544; ANSUR footballer-sized subset 0.1525) | 0.2785 m | [H] |
| Ball breadth | 0.376 × foot length (ANSUR II) | 0.105 m | [H] |
| Heel breadth | 0.268 × foot length (ANSUR II) | 0.075 m | [H] |
| Ankle joint centre height | 0.039 H barefoot (Drillis; de Leva AJC = sphyrion − 12.6 mm; ANSUR lateral malleolus 0.0415 H) | 0.071 m barefoot → **0.091 m** above the stud tips | [H] + [ENG] sole |
| AJC position along the foot | 0.18–0.24 of foot length from the heel (lateral malleolus → posterior Achilles 4.1 cm, Papachatzis 2023; plantar-flexor moment arm 5.2–5.9 cm, Baxter 2012; functional centre 7 % FL anterior of the malleolar midpoint, Salami 2020) | 0.22 FL → heel 0.061 m behind the AJC (barefoot) | [H] range, [ENG] pick |
| First-MTP joint | 0.741 × foot length from the heel (ANSUR II ball-of-foot length; Thompson et al. 2019: 0.70–0.79) | **0.145 m ahead of the AJC** | [H] |
| Fifth-MTP joint | ≈ 0.63 × foot length (Hawes & Sovak, recalled): an oblique metatarsal break | 0.114 m ahead of the AJC, lateral | [H] recalled |
| Boot outsole length | foot + toe allowance 10 mm (football boots fitted tight, 5–10 mm, recalled) + heel counter 5 mm | **0.294 m** | [ENG] from boot construction |
| Boot ball width | ball breadth + 8 mm (upper + sole flare) | **0.113 m** | [ENG] |
| Boot heel width | heel breadth + 8 mm | **0.083 m** | [ENG] |
| Boot heel behind the AJC | 0.061 + 0.005 | **0.066 m** | [ENG] |
| Boot tip ahead of the AJC | 0.217 + 0.010 | **0.227 m** | [ENG] |
| Sole stack under the heel | FG round studs 12 mm (Loud et al. 2024) + soleplate / insole ≈ 8 mm | 0.020 m | [H] + [ENG] |
| Toe spring | boot forefoot rocker | 0.012 m, from the MTP line to the tip | [ENG] |
| Mass | de Leva foot 1.37 % M + boot 0.20 kg (modern FG boots 160–250 g) | 1.069 + 0.20 = **1.269 kg** | [H] + [ENG] |
| COM (foot frame: origin AJC, +Z forward) | de Leva 44.15 % heel→toe; boot mass mostly in the soleplate | (0, −0.049, +0.063) m | [H] + [ENG] |
| Inertia about the COM | de Leva foot radii × foot length + boot as a box, parallel axis | I_ML 0.0067, I_vert 0.0071, I_long 0.0018 kg·m² | [H] + [ENG] |

**V1 vs V2 at the same stature** (V1-matched instance 1.90 m):

| | V1 F0 | V2-F0 |
|---|---|---|
| boot length | 0.358 m | 0.306 m |
| boot width | 0.164 m | 0.117 m |
| boot tip ahead of the AJC | 0.276 m | 0.237 m |
| boot heel behind the AJC | 0.081 m | 0.069 m |
| foot mass | 1.07 kg, no boot | 1.27 kg incl. boot |

### 12.2 V2-F0 collider: rigid boot hull

- One **convex hull** per foot, generated from the boot outline:
  - the plantar outline: heel arc, waist, oblique ball line (MTP1 medial-forward, MTP5 lateral-back), toe arc with the big-toe side forward;
  - **toe spring** (outline points beyond the MTP line rise linearly to 12 mm at the tip);
  - an upper silhouette: heel counter ≈ 0.065 m above the sole, instep ≈ 0.075 m, toe box ≈ 0.045 m.
- Convex radius 5 mm.
- The hull is the contact surface for the turf, the ball and other legs.
- **Why a hull, not a box:**
  1. The heel is ≈ 3.4 cm narrower than the ball. A rectangle overstates heel lateral support.
  2. The oblique MTP break and the toe spring keep the contact on the ball of the foot through the first ≈ 8° of heel rise (atan(12 mm / 82 mm)). A box pivots on its far tip edge immediately. That pivot is the failure V1 measured (the swing pivoting on a 0.276 m tip lever at 136–150 N·m).
- **Contact behaviour:** Jolt reduces a hull–plane manifold to ≤ 4 points, so the support polygon follows the actual loaded part of the outline.

### 12.3 V2-F0 vs V2-F1

| | V2-F0 rigid foot | V2-F1 foot + forefoot (MTP hinge) |
|---|---|---|
| bodies / joints | 1 / 0 per foot | 2 / 1 per foot |
| MTP | — | oblique axis through MTP1–MTP5. DF 0–60° (gait 42°, heel rise 58°, ≈ 65° needed: Nawoczenski 1999, Hopson 1995), PF 0–30° |
| forefoot mass | — | ≈ 15–18 % of foot + boot (incl. toe box) |
| passive MTP | — | spring ≈ 0.5–1.0 N·m/deg (barefoot evidence; boot bending stiffness to be added, unknown), damping, **absolute** end-stop stiffness |
| active MTP | — | optional toe-flexor actuator ≤ 15 N·m (maximal isometric 6.3–14.2 N·m, Goldmann & Brüggemann 2012), stores / returns energy, no hidden propulsion |
| late-stance lever | MTP line up to ≈ 8° heel rise (toe spring), then the tip (0.227 m) | MTP line (0.145 m) throughout heel rise |
| plantar-flexor torque at push-off, per unit forefoot load | up to 1.57× F1 once beyond the toe spring | 1.0 |
| solver conditioning | foot / shank mass ratio 1 : 2.6 | forefoot ≈ 0.2 kg; foot / forefoot inertia ratio ≈ 30+: the worst pair in the character |
| V1 evidence | F0 best for walking at matched states | F2h: real stance benefit (heel rise, lower ankle torque), swing failure under a rigid-boot swing generator; never better than F0 for walking at matched states |
| render | `toe` PROC (§9) | `toe` DIRECT |
| football relevance | walking, standing, transfer, kicking surface | sprint start, acceleration push-off, cutting on the ball of the foot, rising onto the toes (heading jump take-off) |

### 12.4 Recommendation

**Begin with V2-F0.** Design F1 as a ready leaf extension and gate it explicitly **before jogging / running**.

Why F0 first:
1. Every gate up to G7 is walking-speed or slower, where V1 found no matched-state benefit from articulation.
2. F1 adds the worst-conditioned body pair in the character.
3. F0's lever problem is mitigated by real boot geometry (toe spring, oblique MTP break), not by inventing a joint.

Why F1 is probably needed later:
- In top-speed sprinting the vertical ground reaction peaks at ≈ 3.6 BW (Weyand 2010), and the ankle moment peaks at 4.0 N·m/kg in midstance (Schache 2011).
- About 3 BW acting at the MTP lever (0.145 m) gives ≈ 330 N·m ≈ 4.3 N·m/kg, which reproduces the measured moment.
- At F0's tip lever once the foot pitches past the toe spring (sprint push-off pitches the foot ≈ 20–30°), it gives ≈ 520 N·m ≈ 6.7 N·m/kg. No human ankle produces that.
- So F0 should fail the running gate for a physical reason, and the F1 gate should be run then (the same scripts as V1's foot gate, plus a V2 swing designed foot-agnostically).

The render `foot → toe` contract is identical either way.

## 13. Joint architecture

### 13.1 Representation policy for multi-DOF joints in Jolt

1. **Constraint type.** Every core joint is a **SixDOFConstraint**:
   - translations fixed;
   - rotations limited, fixed, or (only the ankle's foot ab/adduction) passive.

   SixDOF is required because anatomical torque capacity is **asymmetric per axis and direction** (hip flexion ≠ extension). SwingTwist motors share one torque limit across both swing axes. V1 confirmed the per-axis min / max motor limits work.
2. **Decomposition.**
   - Jolt bounds rotation by **swing–twist** about the constraint X axis. X = the child segment's long axis.
   - The swing limit is an elliptical cone (symmetric) or a **pyramid** (asymmetric, used here). Swing components are not Euler angles: at large combined angles the reachable set differs from an intuitive per-axis box.
   - Anatomical angles are therefore **never read from Jolt's swing components**. One tested function per joint converts body orientations ↔ anatomical angles (ISB-style sequences).
3. **ROM-centred frames.**
   - The parent-side constraint frame is rotated by the ROM centre (table below), so the constraint's zero is mid-range and the canonical pose sits at −centre.
   - This keeps every anatomical pose ≥ 20° from the swing–twist singularity (180° swing), a G0 test.
   - The hip (−15…+120° flexion) becomes ±67.5° about 52.5°. The knee (0…140°) becomes ±70° about 70°.
4. **Two-level limits.**
   - **Soft** (where passive tissue resistance begins) = the active range below: an exponentially stiffening passive torque.
   - **Hard** = the engine stop at the passive extreme plus a margin: the anatomical 95th percentile or the loaded maximum, which the hard stop must never undercut.
   - The engine stop exists for violent impacts, never as the normal limiter (V1 lesson #21).
5. **Passive torques are folded into the implicit motor drive.** Each tick the passive spring is linearised at the current angle and added to the drive:
   - k_total = k_ctrl + k_pass(θ);
   - target = stiffness-weighted target;
   - torque limits widened by |τ_pass| (passive torque is not muscle capacity).

   That keeps passive stiffness unconditionally stable inside Jolt's implicit spring, instead of explicit torques with a k·dt²/I bound. The ledger separates active, passive and limit work.
6. **Pose-dependent limits** (biarticular and capsular coupling) are passive-torque laws whose parameters depend on the adjacent joint. Hard limits stay at the generous outer envelope.

### 13.2 Joint table

Degrees. Anatomical sign: flexion / abduction / internal rotation / dorsiflexion / inversion / pronation / right lateral bend / right axial rotation positive. Positions are V2-REF CCS at the canonical pose.

| joint | bodies | anatomical joint | DOF (motorised) | constraint X (twist) at canonical | motion: active (soft) range / hard limit | ROM centre | pose-dependent | evidence |
|---|---|---|---|---|---|---|---|---|
| **lumbar** | pelvis → abdomen | L3–L5 (lumped), at (0, 1.110, −0.031) | 3 (3) | +Y | flex/ext −25…+60 / −30…+70; lateral ±25 / ±30; axial ±7 / ±10 | flex +17.5 | — | Troke 2005 (young: flex 73, ext 29, lateral 28, rotation 7) [H]; thoracolumbar split [ENG] |
| **thoracic** | abdomen → thorax | T9–T12 + thoracic (lumped), (0, 1.335, −0.040) | 3 (3) | +Y | flex/ext −15…+30 / −20…+40; lateral ±20 / ±25; axial ±35 / ±40 | flex +7.5 | — | AAOS thoracolumbar totals 80 / 25 / 35 / 45 (recalled) minus lumbar [ENG] |
| **neck** | thorax → head | C0–C7 lumped at C7/T1, (0, 1.586, −0.031) | 3 (3) | +Y | flex/ext −60…+50 / −70…+60; lateral ±40 / ±45; axial ±70 / ±80 | flex −5 | — | AAOS / Youdas (recalled); 73 % of axial rotation at C1–C2 (Zhou 2020) [H], used for the render split (§9) |
| **shoulder** L/R | thorax → upperArm | glenohumeral + girdle lumped, centre fixed in the thorax, (±0.198, 1.472, 0) | 3 (3) | humerus axis (±X) | flexion 0…170 / 180; extension 0…55 / 65; abduction 0…170 / 180; horizontal adduction 0…130 / 140; IR / ER +70 / −90 (hard +80 / −100) | elevation 60° in a plane 30° anterior of coronal | rotation range varies with elevation | Soucie 2011 flexion 168.8 [H]; AAOS (recalled); scapulohumeral rhythm 1.25–1.7 : 1 [H] |
| **elbow** L/R | upperArm → forearm | humeroulnar + radioulnar | 2 (2); carrying-angle axis locked | forearm axis (±X) | flex 0…145 / −5…+150; pronation / supination +77 / −85 (hard +85 / −90) | flex +70; rotation 0 = palms down in the T-pose | — | Soucie 2011: 144.6 / 0.8; pronation 76.9, supination 85.0 [H] |
| **hip** L/R | pelvis → thigh | femoral head, (±0.091, 0.957, 0) | 3 (3) | −Y (femur) | flex/ext −15…+120 / −25…+140; abd/add −25…+40 / −35…+50; IR/ER −40…+30 / −50…+45 | flex +52.5, abd +7.5, rot −5 | hamstrings: straight-leg flexion ≈ 70–90° (recalled); rotation vs flexion (Han 2015, Simoneau 1998) [H] | Soucie 2011 flex 130.4 (p95 142) / ext 17.4; Roaas 1982 abd 38.8 / add 30.5; pro soccer IR 28.9, total arc 65.6 (Tak 2016) [H] |
| **knee** L/R | thigh → shank | tibiofemoral, (±0.091, 0.530, 0) | 2 (2); varus/valgus locked | −Y (tibia) | flex 0…140 / −5…+155; tibial IR / ER +20 / −30 (hard +30 / −40) | flex +70 | axial rotation stiffened near extension (screw-home) [ENG] | Soucie 2011 137.7, hyperextension 1.2 ± 2.1 (p95 6); loaded squat 157 (Hemmerich 2006) [H]; axial rotation (recalled) |
| **ankle** L/R | shank → foot | talocrural + subtalar (orthogonal approximation), (±0.091, 0.091, 0) | 3 (2): DF/PF + inv/ev motorised; foot ab/adduction passive | −Y (shank) | DF/PF −50…+20 / −60…+45; inv/ev −20…+25 / −30…+35; foot ab/adduction ±10 / ±15 (passive spring) | DF −12.5, inv +2.5 | dorsiflexion limit grows with knee flexion (gastrocnemius): ≈ 22° knee straight → ≈ 40° knee bent [H] | Soucie 2011 DF 12.7 (NWB, knee extended), PF 54.6; Cho 2016 22.3 / 40.5; WB lunge 38.8–43.2 [H]; Roaas inv/ev 27.7 / 27.6 [H] |

### 13.3 Passive properties (all joints)

| property | model | default | basis |
|---|---|---|---|
| End-range elastic torque | τ = A·(e^{B·(θ − θ_soft)} − 1) beyond each soft limit (double-exponential form of Riener & Edrich 1999 / Yoon & Mansour 1982); biarticular terms depend on the adjacent joint | Reaches 25 % of the joint's isometric capacity in the opposing direction at the hard limit. B = 6 rad⁻¹. Fitted per joint at G1. | [ENG] form from the literature; parameters to be fitted |
| Viscous damping | folded into the drive's kd | hip 0.5, knee 0.3, ankle 0.2, spine 1.0, neck 0.3, shoulder 0.3, elbow 0.15 N·m·s/rad | [ENG] order of magnitude. G1 checks free-limb energy decay. |
| Coulomb joint friction | none | 0 | [ENG]. V1's 0.3–2 N·m friction hid drift. |
| End-stop stiffness | absolute (N·m/rad), never frequency-scaled | per joint | [V1] foot-gate lesson: a frequency soft stop on a light body overshot 46° |

### 13.4 Expected torque envelope

Each motorised axis uses the §14 capacity of its joint and direction.

## 14. Actuator architecture

### 14.1 What the evidence says, and what it changes

Three kinds of numbers exist. They must not be mixed:

1. **Maximum voluntary torque on a dynamometer** (isometric, or isokinetic at a set speed): a single joint, a seated or lying posture, one direction.
2. **Net joint moments in real movements** (inverse dynamics). These include stretch–shortening, tendon recoil, biarticular transfer and passive tissue. **In athletes they exceed dynamometer maxima.**
   - Sprinting at 8.95 m/s needs hip flexion 4.30, hip extension 4.18 and plantar-flexion 4.00 N·m/kg (Schache 2011).
   - Young-male maxima are hip flexion 1.94, hip extension 2.76 and plantar-flexion 1.63 N·m/kg (Anderson 2007).
3. **Ordinary usage.** Walking at 1.25 m/s peaks at plantar-flexion 1.46 ± 0.15, hip extension 0.65, knee extension 0.47 N·m/kg (Fukuchi 2018 data). Young adults use ≈ 86 % of their angle- and velocity-adjusted plantar-flexor capacity, and ≈ 27–30 % of hip capacity (Anderson & Madigan 2014).

**Consequence.**
- A joint actuator built only from dynamometer curves would make sprinting physically impossible for reasons that are not physical. Anderson 2007's young-male hip-extension curve reaches zero torque at 374°/s, while sprinters' hips move faster.
- An actuator set to sprint peaks everywhere would make walking unrealistically easy.

V2 therefore uses an **effective joint-level capacity envelope**:
- Its floor and shape come from dynamometry.
- It is calibrated so that verified athletic net moments at their measured angle and velocity fall inside it at full activation.

The second requirement is validated at a **capacity gate before running**, not during the walking gates. Walking velocities are low and the dynamometer-anchored envelope governs there.

### 14.2 Capacity model (per motorised axis, per direction d = + / −)

τ_cap,d(t) = s_strength · T_iso,d · g_θ,d(θ, θ_adj) · f_ω,d(ω) · a_d(t) · (1 − φ_fatigue) · c_injury

| term | definition | default |
|---|---|---|
| **T_iso,d** | isometric capacity at the optimum angle | Table 14.3, N·m/kg × body mass (variation: × lean mass later) |
| **g_θ** | torque–angle relation, normalised to peak 1 | Hip / knee / ankle sagittal: Anderson 2007 young-male C2 / C3 cosine [H]. Ankle PF reduced when the knee is flexed (gastrocnemius slack). Other axes flat with end-range roll-off [ENG]. |
| **f_ω** | torque–velocity | **Concentric** (ω in the torque's direction): f = (1 − ω/ω₀) / (1 + ω / (k·ω₀)). k = 0.45 at joint level, fitted to professional players' knee-extension ratios (0.70 / 0.57 of the 60°/s torque at 180 / 300°/s; model 0.74 / 0.55) [H fit]. **Eccentric:** rises to e·T_iso within 0.1·ω₀, e = 1.25–1.35 (Fousekis eccentric/concentric 1.31–1.42; Thelen muscle-level 1.4) [H]. ω₀ per joint in Table 14.3: Anderson-derived where plausible (knee extension 20, knee flexion 26 rad/s); raised where Anderson's extrapolation contradicts athletic movement (hip 18 vs Anderson 6.5–8.9) [ENG]. |
| **a_d(t)** | activation (rate of torque development) | da/dt = (u − a)/τ, τ_act 15 ms, τ_deact 50 ms (Thelen 2003) [H]. From G2; sensitivity reported at G4. |
| **φ_fatigue** | three-compartment fatigue (resting / active / fatigued) | Xia & Frey Law 2008; per-joint F / R from Frey-Law 2012 (ankle 0.00589 / 0.00058 … shoulder 0.0182 / 0.00168 s⁻¹) [H]. **Hook only:** off until a fatigue gate. |
| **c_injury** | per-axis cap multiplier | 1. Hook only. |
| **s_strength** | per-player strength scale (per region later) | 1. Gameplay attributes are not designed here. |
| **dynamic enhancement** | Raises the envelope in documented (θ, ω, phase) regions so that the verified athletic peaks fit (stretch–shortening, tendon, biarticular) | **Off** until the pre-running capacity gate. Calibrated there against Schache 2011 / 2019, Nunome 2006, McErlain-Naylor 2014, Harper 2022. |

**Attribute hooks** (designed later):
- strength → s_strength and T_iso;
- explosiveness → τ_act and ω₀;
- fatigue → φ;
- injury → c_injury;
- body → mass, lean mass and proportions.

None of these is a 1–99 number in the physics.

**Couplings.**
- Per axis, per direction, independent by default. Dynamometers test each direction separately, and combined-direction maxima are poorly characterised: a stated approximation that probably overestimates combined-axis capacity.
- Where a muscle group serves two axes (plantar-flexors also invert; abductors also rotate), an **explicit group budget** can be enabled and is documented.
- **The V1 geometric vector budget (25 % floor) is not used.** It left ankle roll ±9 N·m.

**Jolt implementation:**
- each tick, the arbiter evaluates τ_cap,+ and τ_cap,− from the current (θ, ω, a, φ) and writes them as the motor's max / min torque limits;
- the controller supplies the target, kp and kd;
- the passive term (§13.1 item 5) is added;
- the implicit Jolt motor solves within those limits;
- the ledger records active work (motor lambda × ω), passive work and saturation per axis per tick.

The capacity uses the previous tick's ω: a one-tick lag, 4.2 ms.

### 14.3 Capacity table (young male athlete; V2-REF 78 kg)

f(ω) is the concentric fraction of T_iso at 3 / 6 / 10 rad/s.

| joint | direction | T_iso N·m/kg | T_iso N·m | V1.1 cap N·m | verified athletic net-moment peak N·m/kg | ω₀ rad/s | f(ω) at 3 / 6 / 10 | evidence |
|---|---|---|---|---|---|---|---|---|
| hip | flexion | 2.70 | 211 | 170 | 4.30 (sprint swing); kicks 194–309 N·m | 18 | 0.61 / 0.38 / 0.20 | Anderson & Madigan 2014 2.67; Anderson 2007 1.94 [H] |
| hip | extension | 3.60 | 281 | 230 | 4.18 (sprint terminal swing), 4.09 (initial stance) | 18 | 0.61 / 0.38 / 0.20 | Anderson 2007 2.76 at 53°; Anderson & Madigan 4.51 at 68° [H] |
| hip | abduction | 2.35 | 183 | 140 | 3.29 (sprint stance) | 15 | 0.55 / 0.32 / 0.13 | Thorborg 2011 elite 2.25–2.35; eccentric 2.6 (Mosler 2017) [H] |
| hip | adduction | 2.45 | 191 | 140 | 3.0 (eccentric) | 15 | 0.55 / 0.32 / 0.13 | Thorborg 2011 2.37–2.45; Mosler 2017 [H] |
| hip | internal rotation | 1.20 | 94 | 60 | — | 15 | 0.55 / 0.32 / 0.13 | hand-held dynamometer, protocol-dependent ×2 [H] |
| hip | external rotation | 1.00 | 78 | 60 | 0.75 (side-foot kick 56 N·m) | 15 | 0.55 / 0.32 / 0.13 | 0.42–1.0 [H]; Nunome 2002 [H] |
| knee | extension | 3.60 | 281 | 250 | 3.55 (sprint midstance), 3.58 (deceleration) | 20 | 0.64 / 0.42 / 0.24 | Fousekis 2010 professional 60°/s concentric 3.1–3.4 → isometric via f(60°/s); Šarabon 2021 3.19 [H] |
| knee | flexion | 2.10 | 164 | 130 | 1.76 (sprint terminal swing, eccentric) | 26 | 0.70 / 0.51 / 0.33 | Fousekis 2010 1.7–1.9 at 60°/s; Śliwowski 2017 1.66–2.11 [H] |
| knee | tibial IR / ER | 0.35 | 27 | — | — | 15 | 0.55 / 0.32 / 0.13 | recalled |
| ankle | plantar-flexion | 2.60 | 203 | 150 | 4.00 (sprint midstance, with tendon recoil) | 15 | 0.55 / 0.32 / 0.13 | Anderson & Madigan 2014 2.64; Billot 2022 150 N·m with the knee at 60° [H] |
| ankle | dorsiflexion | 0.60 | 47 | 45 | — | 17 | 0.59 / 0.36 / 0.18 | Billot 2022 net ≈ 45 N·m [H] |
| ankle | inversion / eversion | 0.50 / 0.45 | 39 / 35 | 35 / 35 (but ±9 under the V1 budget) | — | 12 | 0.48 / 0.24 / 0.06 | Maciel 2022 34.8 / 29.9 N·m (mixed sex, 38 y) → athlete [ENG] |
| trunk (lumbar and thoracic, in series) | flex / ext / lateral / axial | 2.00 / 3.00 / 1.50 / 0.90 | 156 / 234 / 117 / 70 | 180 / 250 / 150 / 80 | — | 15 | 0.55 / 0.32 / 0.13 | Pan 2025 non-athlete isometric 1.15 / 1.74 / 0.93 / 0.69; athletes isokinetic flex 211–297, ext 345–440 N·m (Zouita 2020) [H] → [ENG] pick |
| neck | ext / flex / lateral / axial | 0.69 / 0.40 / 0.48 / 0.20 | 54 / 31 / 37 / 16 | 45 / 25 / 30 / 20 | — | 12 | 0.48 / 0.24 / 0.06 | Vasavada 2001 (men) [H] |
| shoulder | flex / ext / abd / add / IR / ER | 0.95 / 1.15 / 0.85 / 1.40 / 0.70 / 0.47 | 74 / 90 / 66 / 109 / 55 / 37 | 70 / 80 / 60 / 60 / 45 / 45 | — | 15 | 0.55 / 0.32 / 0.13 | magnitudes recalled; ratios ext:flex 5:4, IR:ER 3:2 (Ivey 1985), add:abd ≈ 2:1 (Holzbaur 2007) [H] |
| elbow | flex / ext / pronation / supination | 0.98 / 0.62 / 0.13 / 0.14 | 76 / 48 / 10 / 11 | 60 / 50 / — / — | — | 18 | 0.61 / 0.38 / 0.20 | Kotte 2018 76.7 / 48.2 / 10.0 / 10.7 N·m [H] |
| wrist (H extension only) | flex / ext / radial / ulnar | absolute 12.2 / 7.1 / 11.0 / 9.5 N·m | — | — | — | — | — | Delp 1996 [H] |

**Expected usage** (reported, never tuned to):
- quiet stance: ankle ≈ 15–25 %, everything else < 15 %;
- slow walking: plantar-flexion ≈ 50–60 % of T_iso (human 1.46 / 2.6 = 56 % at 1.25 m/s), hip and knee 15–30 %;
- single-leg stance: hip abduction ≈ 38 % (static 70 N·m of 183).

**Compared with V1.1 at the same mass:**
- higher caps for plantar-flexion (+35 %), hip extension (+22 %), hip abduction (+31 %) and knee flexion (+26 %);
- full per-axis ankle roll instead of a 25 % budget floor;
- velocity dependence and eccentric capacity, which V1 had neither of.

These are evidence corrections toward athletes, not tuning. G2–G4 report usage and saturation per axis, and those reports judge them.

## 15. Collider architecture

### 15.1 Principles

- **Physics first.** Colliders model where contact actually happens. They are generated from anthropometry (breadths, depths, segment lengths, segment mass / tissue density for limb radii), never fitted to a display mesh and never used for mass.
- **No giant invisible volumes.** Tolerance against the skin surface (anthropometric surface now; the production mesh when it exists):

| region | tolerance |
|---|---|
| limbs | −10 mm (inside) … +3 mm (outside) |
| trunk | −20 … +5 mm |
| head | −15 … +5 mm |
| boot | ±5 mm (the plantar outline is the most important geometry in the character) |

- **Shape types:**

| shape | used for | why |
|---|---|---|
| Jolt TaperedCapsule | limbs | smooth rolling contact, cheap |
| rounded Box | trunk | flat back for lying stability, V1-proven |
| Sphere + Capsule | head / neck | — |
| ConvexHull | boot | §12.2 |

### 15.2 Collider table (V2-REF; generated, scales with the specification)

| body | shape | dimensions | placement (body frame at canonical) |
|---|---|---|---|
| pelvis | rounded box (cr 0.03) | breadth 0.346 × depth 0.228 × height 0.222 m | from 0.07 m below the HJC line to the lumbar joint; centre AP −0.010 (gluteal mass) |
| abdomen | rounded box (cr 0.03) | breadth 0.282 × depth 0.217 × height 0.225 m | lumbar → thoracic joint; centre AP 0 |
| thorax | rounded box (cr 0.03) + shoulder-girdle capsule | box breadth 0.300 × depth 0.238 × height 0.178 m (xiphion → suprasternale); capsule r 0.060, ML axis, x ±0.13, at y = 1.500 | girdle capsule = trapezius / clavicle contact for shoulder charges and aerial duels |
| head | sphere + neck capsule | sphere r 0.0955 (0.0525 H), centre 0.0575 H below the vertex, AP +0.010; neck capsule r 0.055, C7 → skull base | — |
| upperArm | deltoid sphere + tapered capsule | sphere r 0.055 (0.030 H), centre 0.012 m lateral of the SJC; capsule r 0.046 → 0.040, SJC + 0.04 → EJC − 0.01 | bideltoid half-breadth 0.265 m = ANSUR II 0.291 H / 2 |
| forearm | tapered capsule + hand capsule | capsule r 0.039 → 0.026, EJC → WJC; hand capsule r 0.025 (0.0135 H), length 0.110 from the wrist | the hand is part of the forearm body in the core |
| thigh | tapered capsule | r 0.087 (0.048 H) → 0.062 (0.034 H); axis from 0.02 m lateral / 0.05 m below the HJC to 0.02 m above the KJC | lateral offset = proximal tissue centroid; inter-thigh gap at the top 4.7 cm at canonical |
| shank | tapered capsule | r 0.053 → 0.035 (volume-matched, Dempster density); axis 0.01 m posterior (calf); KJC − 0.03 → AJC + 0.06 | stops above the boot collar |
| foot | convex hull | §12.2 | — |

Limb radii are volume-matched to segment mass / density for the shank, upper arm and forearm (equivalent radii within 3 mm of anthropometric girths). The thigh uses girth-based radii, because a volume match puts 0.10 m at the top. That would overlap the opposite thigh and exceed bitrochanteric breadth.

### 15.3 Self-collision policy (Jolt GroupFilterTable, one group per character, sub-group = body index)

- **Disabled (16 of 91 pairs):**
  - the 13 parent–child pairs;
  - pelvis–thorax (volumes meet at extreme flexion, and the joint limits govern);
  - abdomen–thigh_L / R (deep hip flexion is governed by the ROM limit and passive torque, as in V1).
- **Enabled: every other pair (75).** The important ones:
  - legs L ↔ R (thighs, shanks, feet, all 9 cross pairs): crossovers, scissors, foot-on-foot (V1 Gate B found returns landing on the other foot);
  - arms ↔ trunk (upperArm–abdomen / pelvis, forearm–thorax / abdomen / pelvis / thighs);
  - arms ↔ head;
  - thorax ↔ thighs (tucks, GK dives).
- **Canonical and reference-pose clearance:** no enabled pair overlaps at the 7 G0 reference poses. "Arms down" is defined with 6° shoulder abduction, the natural resting carry. At 0° abduction the upper arm would rest 2–3 mm into the abdomen box, a permanent resting contact.

### 15.4 Contact parameters

| parameter | value | basis |
|---|---|---|
| speculative contact distance | 0.02 m (Jolt default) | [V1] Gate A / D at 240 Hz. The ball needs its own CCD treatment (R2). |
| penetration slop | 0.005 m | [V1] |
| Baumgarte | 0.2 | Jolt default [V1] |
| restitution | 0 for body–body and body–turf | [V1]. The ball is handled separately. |
| boot–turf μ | **1.2** (range 1.0–1.6) | [ENG] default pending the turf gate. Studded-boot translational traction on natural grass is commonly reported above 1.0. V1 used 0.9. |
| body–turf / hand–turf / body–body / boot–body μ | 0.5 / 0.7 / 0.4 / 0.4 | [V1] values kept as [ENG] |
| rotational traction | not modelled (Jolt has no torsional friction). Emerges from ≤ 4 sole points. | R3 |
| friction observer | port with the D6 `muValid` fix | [V1] |

### 15.5 Football interactions the collider set must serve

| interaction | contact bodies | requirement |
|---|---|---|
| Shoulder challenge | deltoid spheres, girdle capsule, thorax box | bideltoid width correct ±1 cm; mass behind the contact = the thorax + arm chain |
| Leg contact / tackle | shanks (front: shin guard), thighs, boot hulls | first touch ≤ 3 mm (V1 Gate D invariant); contact geometry at the boot, not 4 cm in front of it |
| Aerial collision | head sphere, girdle capsule, upper arms | head–head and head–shoulder contact at the correct height |
| Falls | rounded trunk boxes, limb capsules, hand capsule | stable supine / prone / side lying; no trapped-limb energy (G1 1.2) |
| Ball (later) | boot hull, shank, thigh, thorax, head, hand capsule (handball) | CCD gate (R2) |

## 16. Mass distribution and inertia validation

Arms down, standing, **without equipment** unless noted (the literature is measured without boots).

| quantity | V2-REF 1.82 / 78 | V2 at 1.90 / 78 | V1.1 1.90 / 78 | human evidence |
|---|---|---|---|---|
| Whole-body COM height | 0.557 H (barefoot-equivalent) | 0.557 H | 0.566 H (from the stud plane) | 0.55–0.57 H (classical, recalled); de Leva assembly 0.564 H (computed by the research pass) |
| I about the frontal (ML) axis, pitch | 13.22 kg·m² | 14.41 | 14.66 | Santschi et al. 1963 ≈ 11–14 (recalled); de Leva assembly 13.2 [C] |
| I about the AP axis, roll | 13.96 | 15.22 | 15.80 | ≈ 11–14 (recalled); de Leva assembly 14.0 [C] |
| I about the vertical axis, yaw | 1.10 | 1.20 | **1.55** (+29 %) | ≈ 1.0–1.5 (recalled); de Leva assembly 1.1 [C] |
| Leg about the hip, straight | 2.79 (3.01 with boot + guard) | 3.04 (3.28) | 3.30 | 2.9 (de Leva assembly); 3.1 (Dempster via Winter) [C] |
| Leg about the hip, knee 90° | 1.74 (1.84) | 1.89 (2.00) | 2.08 | — |
| Arm about the shoulder, hanging | 0.508 | 0.553 | **0.414** (−25 %) | 0.49 (de Leva assembly); 0.59 (Dempster) [C] |
| Shoulder JC half-spacing | 0.198 m | 0.207 m | **0.245 m** | ANSUR biacromial → ≈ 0.109 H |
| Single-leg static hip-abduction demand | 69.6 N·m = 38 % of 183 | 72.7 N·m | 74.4 N·m = 53 % of 140 (V1: 124 = 88 %) | — |
| Parent / child mass ratios (worst) | thorax / upperArm 6.0 (inertia ratio 18); thigh / shank 3.2; shank / foot 2.7 | same | thorax / upperArm 5.9; shank / foot 3.2 | — (solver conditioning; F1 would add foot / forefoot ≈ 6, inertia ratio ≈ 30+) |

**Reading:**
- V2's whole-body COM and inertias sit inside the human evidence and agree with an independent de Leva assembly.
- Against V1.1 at the same stature and mass, V2 differs mainly in:
  - **yaw inertia** −23 % (V1.1's wide shoulders and splayed legs);
  - **arm inertia about the shoulder** +34 % (V1.1's short upper arm). V2 arms can counter-swing more angular momentum per rad/s. V1 measured 40 % yaw cancellation by the arms vs a human 64 %. This is a plausible contributor, **not shown**.
  - **leg swing inertia** −8 % barefoot. Boots add +8 %: equipment matters as much as the anthropometric difference.
- Pitch and roll inertia, COM height and segment masses are essentially equal. **V1's mass distribution was not a cause of walking fragility.** No measurement ties V1's walking to mass or inertia.
- Equipment shifts the COM 6 mm down and raises leg swing inertia 8 %. It is modelled explicitly because real players wear boots.

## 17. Scale and body variation

**Pipeline:**

```
human specification ─► semantic skeleton ─► physical body ─► colliders / inertia ─► joints / actuators
 (H, M, optional      (joint centres from    (masses, COMs,    (from segment          (frames from the skeleton,
  measurements,        normalised fractions)   inertia from      lengths, breadths,     ROM from evidence, capacity
  build, side)                                 the same lengths) masses)                scaled by mass / lean mass)
```

**Inputs.** Height H and body mass M are contextual physical metadata, never 1–99 attributes.

| input | default | effect |
|---|---|---|
| H (barefoot stature) | V2-REF 1.82 m | every length |
| M (body mass, no boots) | V2-REF 78 kg | every mass, inertia (∝ M·L²), default capacity |
| measured proportions (optional) | population fractions (§10) | leg / trunk ratio (sitting height), arm span, biacromial, bi-iliac, foot length; each replaces one fraction and lengths are renormalised so the stature stays exact |
| build | 1.0 | girth (collider radii ∝ √(segment mass / length)); later: segment-mass regressions on M and H (Zatsiorsky–Seluyanov two-predictor form) instead of fixed de Leva fractions |
| equipment | boots 0.20 kg, shin guards 0.08 kg, kit 0.35 kg | added explicitly, never folded into anthropometry |
| footedness, side | R | mirrors action authoring only. The body is symmetric. |

**Topology never changes.** Same body names and order, same joint names, same render skeleton, same mapping classes. G0 checks this on a variation set:
- 1.65 m / 62 kg;
- 1.75 m / 70 kg;
- 1.82 m / 78 kg;
- 1.90 m / 85 kg;
- 1.98 m / 92 kg;
- long-legged (sitting-height ratio −2 SD);
- short-legged (+2 SD).

**What would make variation impossible, and is avoided:**
- constants in metres anywhere outside the specification (V1: `LEG = 0.9243` in `pc_stepfeat.js`);
- controllers keyed to one body;
- colliders fitted to one mesh;
- a bind that is not anatomical.

V2 controllers must take lengths from the spec and work in leg-length-normalised units (ℓ/L, v/√(gL), f·√(L/g)).

## 18. Football sanity check (no implementation; does the body prevent any of these?)

| action | what it needs physically | V2 support | caveat / gate |
|---|---|---|---|
| Acceleration | hip extension and plantar-flexion power, forefoot push-off with the heel up, forward lean | actuator model with torque–velocity and power (§14); trunk 2 joints | F0 lever (§12.4) → **F1 before acceleration / sprint** |
| Sprinting | contact ≈ 0.09–0.11 s, ≈ 22–26 ticks (Weyand 2000); peak vertical GRF ≈ 3.6 BW (Weyand 2010); hip 4.2–4.3, ankle 4.0 N·m/kg (Schache 2011) | 240 Hz resolves contact; tapered limbs; ω_max in the capacity model | F1; solver iterations under high joint speed (G1 study); swing-leg CCD |
| Hard deceleration | knee-extensor moment ≈ 3.6 N·m/kg (Harper 2022); eccentric capacity ≈ 1.25–1.4× isometric; plant friction | eccentric branch of f(ω) (§14); μ 1.2 | turf model (R3) |
| Turning / cutting | hip rotation, **knee axial rotation**, foot yaw on a loaded foot, rotational traction; 180° turn: hip extension 2.9–3.6, knee extension 3.1 N·m/kg (Jones 2017) | knee 2-DOF (new); ankle twist passive ±12° | rotational traction not modelled (R3) |
| Plant-foot loading (kicks, cuts) | 1.5–2.0 BW in kicks (Lees 2010), 1.9–2.5 BW in cuts (Yi 2024); ankle inversion / eversion capacity; sole polygon | hull outline; per-axis roll capacity (no shared budget) | turf |
| Kicks / volleys | foot 22.7 m/s, shank 39 rad/s, knee extension 1206–1874°/s; knee muscle moment 130 N·m plus 79 N·m segment interaction (Nunome 2006; Kellis & Katis 2007); hip flexion 194–309 N·m; ball contact ≈ 8–12 ms | thigh / shank / foot chain; capacity allows high ω with low torque (the whip comes from segment interaction, not from knee torque at 2000°/s) | **ball–boot CCD and impact gate (R2)**; motor damping must not brake the whip (controller feed-forward ω targets) |
| Tackles / shoulder challenges | correct contact geometry, mass behind contact, finite joint compliance | §15.5; Gate D invariant ported | two-body gate after G4 |
| Shielding | trunk lean, arm bracing, hip strength | 3 trunk bodies, 2-DOF elbow, deltoid sphere | — |
| Jumping / heading | CMJ peak moments: ankle 2.8, knee 3.3, hip 2.2 N·m/kg (McErlain-Naylor 2014); neck torque (Vasavada 2001); head collider | actuator power; neck 3-DOF; head sphere | F1 helps take-off (toes) |
| Aerial collisions | head / shoulder heights, falls from height | §15.5; passive limits | — |
| Goalkeeper dives | lateral push-off, flight, side landing, overhead reach, hands | trunk lateral ROM, shoulder ROM | **H extension (hands)** and **girdle reach (R8)** before GK gates |
| Falls | rolling surfaces, bracing, passive limits, energy honesty | rounded boxes, hand capsule, passive torques, zero damping | G1 |
| Recovery / get-up | arm push (shoulder / elbow torque), hip and knee power from the ground | arm capacity (§14), no hidden support | later gate |

**Nothing in the topology prevents any listed action.** The four real dependencies:
- F1 for forefoot sprinting / acceleration;
- H for goalkeeping;
- a ball-contact / CCD solution for kicks;
- a turf model for cutting.

Each is a leaf extension or a separate gate. None is a topology change.

## 19. Determinism and auditability (designed in, not bolted on)

| requirement | design |
|---|---|
| Fixed step | Integer tick counter; physics 240 Hz × 1 collision step (V1 evidence: 60 Hz unusable, 120 Hz near-miss). Controller rates are integer divisors of the physics rate, chosen at G2. Time = tick × dt, never wall-clock. |
| Deterministic maths | Port `pc_math.js` (`dsin` / `dcos` / `dtan` / `datan2` / `dacos` / `dexp`, Cody–Waite + Taylor). `Math.*` trig only in measurement and display. |
| Engine | Pinned JoltPhysics.js wasm-compat build (single-threaded, no SIMD), checksum-verified. A native build later uses `JPH_CROSS_PLATFORM_DETERMINISTIC`. Bodies and constraints are created in spec order. |
| Hidden forces | Body linear and angular damping = 0. Gravity factor 1. No sleeping for active players. Any aerodynamic drag is an explicit, ledgered force. |
| Ledger | Every external impulse (tests, other bodies), all motor work per axis, passive-limit work, contact work and the engine's numerical residual. Root force = 0 is asserted every tick. |
| RNG discipline | No randomness in the physics or the controllers by default. If added (sensor / motor noise, perturbation sets), it comes from named, seeded, splittable streams (`perception`, `motor`, `test`). Each is part of the snapshot state. Presentation RNG is a separate stream the simulation never reads. |
| Ordering | Contacts sorted by (body A, body B, sub-shape, point) before any controller reads them. Candidate searches break ties by index. No iteration over hash maps. |
| Snapshot state | Physics (Jolt SaveState) plus one explicit controller-state struct: gait latches, filters, delay ring-buffers, integrators, contact-event lifecycle, RNG states. Validated bit-exact against from-scratch replays (the V1 `session_check` method). |
| Regression currency | Per-tick hash (FNV-1a as V1) over every body's position, rotation and velocities **and** the controller-state struct. ×3 determinism and browser = Node on every gate. |
| Render independence | Render and presentation read a frozen per-tick state and write nothing back. Gate test: presentation ON vs OFF gives an identical physics hash (the `of_loco_regress` method). |

## 20. Performance (one player and 22)

**Measured V1 baseline** (same body count):
- ≈ 0.25 s CPU per simulated second per character, i.e. ≈ 1.04 ms per 240 Hz tick, physics + controller, Node / WASM single-threaded;
- 2.1–3.1 ms per tick under load;
- the G1 controller alone 0.13–0.76 ms per tick;
- solver 30 velocity / 4 position iterations.

[V1 handoff §N; G2 stepper review §14]

**V2 per player:**

| item | count / estimate |
|---|---|
| Jolt bodies | 14 core (16 with H, 18 with H + F1) |
| constraints | 13 SixDOF (16 / 17 with extensions). Every core joint is SixDOF because of the asymmetric per-axis motor limits. |
| actuated rotational axes | 35 (§13). Each is one implicit motor row, a velocity row active only when driven. |
| contact manifolds, standing | 2 (feet), ≤ 4 points each → ≤ 8 normal + 16 friction rows |
| contact manifolds, falls | ≤ 8–10 bodies on the turf |
| self-collision pairs tested | 75 allowed pairs (§15); most are never near each other (broadphase-cheap) |
| controller | Budget ≤ 0.15 ms per player per physics tick averaged, with the low-level motor update at 240 Hz and balance / planning at lower or event-driven rates (decided at G2). V1's G1 controller missed a 0.4 ms budget. |

**Estimate** (ranges to be replaced by the G1 benchmark):

| configuration | physics per player per tick | 22 players: CPU per simulated second | feasible? |
|---|---|---|---|
| WASM single-thread, 30 iterations (V1-like) | 0.6–0.9 ms | 3.2–4.8 s | **no** (≈ 3–5× over real time on one core) |
| WASM single-thread, 12–15 iterations (if G1 convergence allows) | 0.3–0.5 ms | 1.6–2.6 s | **no** on one core |
| WASM multi-threaded build (COOP / COEP), 4 workers | as above ÷ ≈ 3 | 0.5–0.9 s wall | marginal, plus controller cost |
| native Jolt, job system, 4 threads, 12–15 iterations | 0.1–0.2 ms | 0.5–1.1 s CPU → 0.15–0.3 s wall | **yes** |

- **Topology is not the limiter.** 14 bodies are ordinary for a ragdoll.
- **What would make 22 unrealistic:** a 20+-body topology with closed-chain shoulder girdles, toe bodies in the core, or a requirement of 30+ iterations. V2 avoids the first two by design. G1 measures the third.
- Determinism across threads holds in Jolt given ordered API calls, but must be re-verified on the chosen runtime.
- **A cost-reduction lever not adopted:** a deterministic, state-based (never camera-based) physics level of detail for players far from the ball. It would compromise "physics decides" for those players and is listed as an open question only.

## 21. V1 reuse matrix

| V1 component | class | V2 action |
|---|---|---|
| `pc_math.js`: deterministic trig, V / Q helpers, FNV hash | **REUSE UNCHANGED** | Copy, checksum-documented |
| `vendor/jolt-physics.wasm-compat.js` (pinned engine) | **REUSE UNCHANGED** | Copy, sha256 recorded. Confirmed it exposes SwingTwist / pyramid swing, SaveState / StateRecorder, contact listener. Upgrade only by an explicit gate. |
| `tools/review/strip.py`, `page_shot.js`, capture scripts | **REUSE UNCHANGED** | Generic media tools |
| `pc_jolt.js`: the thin substrate adapter (the only file that knows Jolt) | **PORT / GENERALISE** | Keep the boundary and the motor API (`_drive` StiffnessAndDamping, per-axis min / max torque, lambdas). Change: damping 0; explicit mass properties; ROM-centred constraint frames; passive-torque pairs; per-foot force-plate support; contact-impulse access (custom binding item). |
| `pc_body.js` | **REFERENCE ONLY** | Its plain-data spec idea and the `shapeSdf` fit report (as a mesh check) port. The mesh-fitted colliders, the splay re-expression (`romOf`), `legLine` and the diagnostic foot options do not. V2 writes `v2_human` / `v2_body`. |
| `pc_sense.js`: contact truth, per-foot Newton wrench, net CoP from momentum, capture point, friction observer with the `muValid` fix | **PORT / GENERALISE** | Body indices from the spec. CoP reported only in single support or per foot. Add the per-foot CoP from the foot's Newton–Euler balance. |
| `pc_act.js`: one arbiter per axis, priority classes, ledger | **PORT / GENERALISE** | Keep the classes (P0 support > P1 balance > P2 task > P3 style > P4 comfort) and the ledger. Replace the fixed caps and M2 vector budget with the §14 capacity model. |
| `pc_gait.js`: support / gait state from contact truth | **PORT / GENERALISE** | Names only |
| `pc_control.js`: joint-space targets, swing–twist target maths, min-jerk | **PORT / GENERALISE** | ROM-centred frames change the target parameterisation |
| `pc_fit.js`: render fit | **PORT / GENERALISE** | Becomes the §9 mapping layer for the semantic skeleton (DIRECT / AIM / PROC / DEFORM) |
| `pc_balance.js` (C1): capture-point CoP law, gravity Jᵀ, hip strategy, release-with-tone | **PORT concepts** | Re-derived on the V2 body at G2. Constants re-measured, not copied (`copInset`, `kXi`, budget floor). |
| `pc_support.js` (C2): planned unloading, liftoff gate, load acceptance, feasibility vs the actual stance, pelvis-height band | **PORT concepts** | G3. The R1 / R2 / D1 recalibrations are V1-geometry fixes and are not ported. |
| `pc_step.js` (C3): capture-point foothold, finite-motor swing, sensed touchdown | **PORT concepts** | G4 |
| C4 reactive arms, C5 protective falls | **REFERENCE ONLY** | Revisit after G7, or at the falls gate |
| Gate D: two characters in one world, contact-invariant check (both bodies' Δv on the contact step) | **PORT** (test pattern) | Two-body gate after G4. The metric is reused. |
| D6 method: force-plate twin, frozen-controller run, one-variable matrix | **REUSE as methodology**; force-plate twin **PORT** | Used in G1–G5 validation of the per-foot wrench |
| `pc_stepper.js` contact-event lifecycle (PROPOSED → ACCEPTED → EXECUTING → ACHIEVED / MISSED / INTERRUPTED / CANCELLED; versioned; sensed-only achievement) | **PORT** (schema + lifecycle) | From G4. The surrogate planner and nominal generator are REFERENCE ONLY. |
| `pc_loco.js`, `pc_plan.js`, `pc_ref.js` (L0–L5 locomotion stack) | **REFERENCE ONLY** | The architecture concepts survive (event-driven gait roles, viability monitor, explicit observation delays, `of_loco` as preferences only). The code does not. |
| `pc_unified.js`, `pc_walker*.js`, maps `mU*`, Controllers A / B, the speed loop | **REFERENCE ONLY** | Identified on V1's body |
| `pc_swingx.js`, swing v2, `ctrl.late`, `preview`, `Lref`, `rocker`, `ssHeelRise`, `dsExtEnd`, `speedP`, `vReg`, `ankle2`, `dcmRef` | **DO NOT PORT** | Measured, not adopted |
| `budgetLimits` (M2 shared vector budget, 25 % floor) | **DO NOT PORT** | Replaced (§14) |
| Jolt default damping 0.05; mesh-box boot; splayed bind; `diagFootWidth` / `diagFootToe`; D1 unload hack; temporary pelvis support | **DO NOT PORT** | V1-specific workarounds or dead ends |
| Global linear step maps; 4-decimal command rounding | **DO NOT PORT** | Disproven (§I.1, lessons #20) |
| `tools/stepper/session.mjs` + `session_check.mjs` (exact snapshot / restore) | **PORT / GENERALISE** | The Jolt SaveState half is body-agnostic. The controller clone becomes the explicit state struct (§19). |
| `tools/stepper/oracle_fast.mjs` | **PORT** (G6+) | Comparator and teacher, never a controller. Fragility test built in. |
| `tools/stepper/gait_metrics.mjs` (stride impulse and energy accounting incl. damping) | **PORT** (G4+) | The base of the G5 instrumentation |
| `tools/g2_stepbench.js` (matched-state bench) | **PORT** (G4+) | — |
| `tools/review/regress.sh` | **PORT** (pattern) | New `regress_v2.sh` per gate, plus `guard_v1.sh` |
| `pc_harness.js` / `index.html` viewer | **PORT selectively** | Playback, scrub, overlays (colliders, COM, ξ, CoP, torque, saturation). New suites. |
| Identification pipeline (`g2walk_ident.js`, `fit_maps.py`) | **REFERENCE ONLY** | Methods only |

## 22. V2 gate sequence and measurable pass criteria

**Rules for every gate:**
- STOP for review at the end.
- ×3 deterministic; browser = Node where a browser path exists.
- Ledger closed: root force = 0; unexplained external impulse = 0; energy residual reported.
- Earlier-gate hashes unchanged, or the change is explained.
- Results are reported in absolute and body-normalised units, on V2-REF **and** the V1-matched instance. The variation set is included from G2.
- Parameters are never chosen to hit a boundary (V1 lesson). Boundaries are measured and reported.

### V2-G0: anatomy and static construction (no active control; Jolt used only for build and readback)

| # | criterion | pass |
|---|---|---|
| 0.1 | Spec generator determinism | Same human specification → byte-identical spec JSON (hash), ×3, Node = browser |
| 0.2 | Mass bookkeeping | Σ segment = M + equipment to 1e-9. Each segment = de Leva fraction × M (+ declared equipment) to 1e-9. |
| 0.3 | Inertia realisability | Every tensor symmetric positive definite and satisfies the triangle inequalities (I_a + I_b ≥ I_c) with ≥ 1 % margin |
| 0.4 | Whole-body COM | Standing arms-down COM height (barefoot-equivalent) 0.55–0.58 H. Canonical COM within ±1 cm AP of the ankle line. |
| 0.5 | Whole-body inertia | Arms-down inertias about the COM, normalised by M·H², inside the literature band of §16 |
| 0.6 | Joint-centre geometry | Inter-HJC 0.090–0.110 H. Inter-SJC within ±10 % of the §10 value. Leg-length ratio and segment fractions as §10. Exact stature reproduced (vertex at H + sole). |
| 0.7 | Skeleton round trip | Canonical bodies → 31 render bones reproduce §6 to ≤ 1e-6 m / 1e-6 rad. Every bone has exactly one driver class; every body drives ≥ 1 bone. |
| 0.8 | Chirality and mirror | §7.2 chirality test passes; a mirrored copy fails. The mirror operator verified on all bones (mirror ∘ mirror = identity; L / R bind frames match). |
| 0.9 | Joint frames and ROM | Canonical pose inside every ROM with ≥ 5° margin on every axis. Swing–twist decomposition stays ≥ 20° from its singularity over a dense sampling of each joint's full ROM. |
| 0.10 | Colliders | No collider overlap between allowed (non-filtered) pairs at the canonical pose and at 6 reference poses (arms down, quiet stance, lunge, deep squat 90°, single-leg stance, arms forward). Collider vs anthropometric surface within the §15 tolerances. |
| 0.11 | Engine readback | Every body, constraint and motor built in Jolt and read back: masses, COM offsets, inertia, constraint frames, limits, motor settings equal to the spec (≤ 1e-6 relative). No stepping, or one zero-gravity step showing zero motion. |
| 0.12 | Variation set | All of 0.1–0.11 pass for the 7 bodies of §17. Topology identical (names, order, joint count). |
| 0.13 | Viewer | Static body, colliders, COMs, joint frames and ROM cones, semantic skeleton overlay, a body selector for the variation set |

### V2-G1: passive physics

| # | criterion | pass |
|---|---|---|
| 1.1 | Momentum conservation | Gravity off, no contact, internal joint motion only (passive spring settle): total linear and angular momentum constant to 1e-6 relative over 2 s |
| 1.2 | Passive energy | Ragdoll (motors off, passive joint properties on) drops from standing and from 0.5 m / 1.0 m, falls F / B / L / R, a side-first fall, a supine roll. No step with net mechanical-energy increase > 0.5 J. Total energy monotonically non-increasing after first contact (tolerance 0.5 J). |
| 1.3 | Joint integrity | Joint separation ≤ 5 mm transient, ≤ 1 mm at rest. Hard-limit excursion ≤ 3° transient, ≤ 0.5° at rest. |
| 1.4 | Contacts | Turf penetration ≤ 10 mm transient, ≤ 3 mm at rest. Self-penetration ≤ 10 mm transient, 0 at rest between allowed pairs. First touch ≤ 3 mm for a 15 m/s body. |
| 1.5 | Solver convergence | 1.2–1.4 repeated at 10 / 15 / 20 / 30 velocity iterations. Select the minimum that passes everything with 2× margin. Record cost per tick per player at each. |
| 1.6 | Determinism | ×3 identical hashes; browser = Node; snapshot / restore bit-exact (port of `session_check`) |
| 1.7 | Comparison | V1 Gate A scenarios run on V2 and reported side by side (not pass / fail) |

### V2-G2: active standing (finite motors, no stepping)

| # | criterion | pass |
|---|---|---|
| 2.1 | Quiet stance | 60 s unsupported. COM 2–6 cm anterior of the ankle axis. Knees 0–15°. Every actuator ≤ 50 % of its isometric capacity. Zero external force. |
| 2.2 | Feet-in-place push recovery | Thorax impulses F / B / L / R in 5 N·s increments. Recover-or-fall boundary measured. Boundary monotone (no recover-fall-recover inversion). L / R boundaries within 10 %. Reported vs V1 C1. |
| 2.3 | Capacity integrity | Zero ticks where a commanded torque exceeds the instantaneous capacity (§14). Saturation time reported per axis. |
| 2.4 | Release | Beyond the boundary the body falls physically, with no hidden support. The classification is consistent with capture-point evidence. |
| 2.5 | Controller cost | Mean and p99 ms per tick per player. Mean ≤ the §20 budget, or reported as a FAIL. |

### V2-G3: weight transfer without stepping

| # | criterion | pass |
|---|---|---|
| 3.1 | Lateral transfer | Double support → ≥ 98 % body weight on one foot → back, ×10, at 3 rates (0.5 / 1.0 / 2.0 s). Per-foot vertical load tracks the plan with RMS ≤ 5 % BW. No foot slip > 2 mm. |
| 3.2 | Fore–aft transfer | Heel → forefoot loading on both feet. Per-foot CoP stays within the sole polygon inset 1 cm. |
| 3.3 | Single-leg stance | Lift one foot 5 cm, hold 10 s. Trunk lean ≤ 5°. Stance hip abduction ≤ 60 % of capacity. Both sides. |
| 3.4 | Per-foot wrench validity | The per-foot force and CoP estimator validated against a force-plate twin to ≤ 2 % BW and ≤ 5 mm |
| 3.5 | Robustness | 3.1–3.3 from a deterministic set of 10 perturbed start states (±1 cm COM, ±2 cm/s). 10 / 10 pass. |

### V2-G4: one step

| # | criterion | pass |
|---|---|---|
| 4.1 | Commanded steps | From quiet stance: forward 0.30 / 0.45 / 0.60 L, lateral 0.20 L, backward 0.20 L, crossover (L = leg length). Each completes and ends in a stable stance within 1.5 s. |
| 4.2 | Execution accuracy | Touchdown position error ≤ 3 cm; timing error ≤ 30 ms. Commanded vs achieved recorded separately, never mixed. |
| 4.3 | Swing quality | Minimum foot clearance ≥ 1.5 cm through swing. No toe scuff. No swing-leg contact with the stance leg. |
| 4.4 | Landing | Peak vertical GRF at touchdown ≤ 1.5 BW at walking-type step speeds (human walking 1.0–1.5 BW over 1–3 m/s, Nilsson & Thorstensson 1989). Touchdown foot velocity and foot–ground angle reported (human ≈ 24–28° foot pitch, ankle ≈ −6.6°: Fang 2018, Molina-Rueda 2021). Slip ≤ 1 cm. |
| 4.5 | Feasibility honesty | The step-feasibility check (reach, ROM, capacity) predicts success / failure with zero false-safe on the 4.1 set ± its perturbations |
| 4.6 | Contact events | Every step is a versioned PROPOSED → … → ACHIEVED / MISSED event, achieved only by sensed contact |

### V2-G5: two-step transition (first-class)

**Purpose:** decide whether the **physical transition** (touchdown → double support → opposite liftoff) is healthy, independent of any sustained-walking controller. The gate does not prescribe a double-support policy. It measures each candidate policy on the same instrumentation and states which are healthy.

**Protocol:**
- G4 step → touchdown → DS → opposite step → touchdown.
- Run over a grid of entry states:
  - from standing (initiation);
  - entry speeds at dimensionless speed v/√(gL) = 0.15 / 0.35 / 0.55, i.e. ≈ 0.44 / 1.0 / 1.6 m/s for V2-REF's 0.866 m leg;
  - step lengths 0.30–0.75 L;
  - × at least two DS termination policies: **event-terminated** (V1-style) and **planned-duration** (the V1 hypothesis).
- Each cell repeated over 50 matched-state perturbations: ±1 cm, ±2 cm/s, ±5 ms.

**Instrumentation, per transition:**

| quantity | definition | notes |
|---|---|---|
| Leading-leg collision | Lead-foot touchdown velocity (3D); peak vertical and horizontal GRF and loading rate in the first 50 ms; **collision work** W⁻ = ∫ F_lead · v_COM dt over DS (individual-limbs method, Donelan et al. 2002) | per-foot wrench from 3.4 |
| Trailing-leg unloading | Trail load profile; time from lead touchdown to trail load < 5 % BW; **push-off work** W⁺ = ∫ F_trail · v_COM dt; push-off impulse (horizontal, vertical); load at liftoff (must be ≤ 2 % BW, no dragging) | — |
| DS duration | Lead touchdown → trail liftoff, in s and % of stride. Mean and SD per cell. | Both events are defined by per-foot vertical force crossing 5 % BW. Detection method alone moves human DS by ≈ 6 points of the cycle (Vítečková 2020). |
| Per-foot load transfer | s(t) = F_z,lead / (F_z,lead + F_z,trail); 10–90 % transfer time; monotonicity = fraction of DS with ds/dt ≥ 0 | — |
| Horizontal impulse | J_x per limb, over DS and over the adjacent single supports. Stride sum. **Closure:** m·Δv_COM = Σ J (+ gravity) within 1 %. | the V1 audit method, per stride |
| COM velocity redirection | Angle of v_COM in the sagittal plane before and after DS; Δv_x, Δv_z; fraction of the redirection occurring inside vs outside DS (Adamczyk & Kuo) | — |
| CoP / contact progression | Per foot only, and only while F_z > 5 % BW. Lead heel → forefoot path; trail forefoot position. **Never the combined CoP in DS** (V1 lesson). | — |
| Next-leg readiness | At trail liftoff: trailing hip extension / knee-flexion velocity inside the swing-initiation envelope; capture point ξ relative to the new stance foot; reachability margin of the next foothold in L; ankle, knee and hip capacity margins | — |
| Motor work | Positive / negative work per joint axis, over DS and SS; passive-limit work; **energy closure** ΔKE + ΔPE = W_motor + W_passive + W_contact + residual, residual ≤ 2 % | — |
| Repeatability | Over the 50 matched perturbations: SD of DS duration, Δv, next-state ξ. **Smoothness:** the per-state in-sample quadratic-fit residual of (ξ, v, timing) vs the command, at touchdown and at the next step start (the V1 §I.8 metric). **Amplification ratio** = residual at the next step start ÷ residual at touchdown (V1: ≈ 1.5–2.5). | — |

**Pass: the physical transition is healthy for a policy and cell when ALL hold:**

| # | criterion | threshold |
|---|---|---|
| 5.1 | Momentum and energy closure | 1 % / 2 % |
| 5.2 | No foot slip | > 1 cm never. No trailing drag at liftoff (≤ 2 % BW). |
| 5.3 | Monotone transfer | Load transfer monotone in ≥ 90 % of DS |
| 5.4 | Next-leg readiness | All margins positive in ≥ 95 % of the perturbations |
| 5.5 | Unpredictability | Amplification ratio ≤ 1.3 [HYP threshold, revisable after the first measurement]; DS-duration SD ≤ 15 ms |
| 5.6 | Physical plausibility | Collision and push-off work per step within ×2 of the human reference, **reported**; a FAIL only if outside ×3. Reference: 0.205 / 0.242 J/kg per step at 1.25 m/s (step 0.71 m), scaling with (speed × step length)² (Adamczyk & Kuo 2009); trailing leg > 97 % of DS positive work (Donelan et al. 2002). |

**Gate output:** a per-cell healthy / unhealthy map per policy. That is the evidence on which a walking controller is chosen at G6–G7. The outcome is not prescribed.

### V2-G6: repeated stepping in place

| # | criterion | pass |
|---|---|---|
| 6.1 | Duration | 60 s at cadences 1.6 / 1.8 / 2.0 Hz, from 10 starts each |
| 6.2 | Drift and step width | Horizontal drift ≤ 10 cm/min; yaw drift ≤ 5°/min; step width 0.08–0.16 m (body-scaled, 0.045–0.09 H) |
| 6.3 | Cadence and balance | Cadence ±5 %. Per-stride horizontal impulse ≈ 0 (|J| ≤ 1 N·s). Pelvis yaw ≤ 8°. |
| 6.4 | Comparison | V1 G2a in-place gait reported side by side |

### V2-G7: forward walking (only now)

| # | criterion | pass |
|---|---|---|
| 7.1 | Sustained walking | 100 steps at 0.6 / 1.0 / 1.3 m/s (V2-REF; Froude-matched for the variation set), from 10 starts each. Fall-aware step counting. |
| 7.2 | No creep | Stride-average speed within ±5 % of command after 10 strides; mean per-stride drift ≤ 0.005 m/s |
| 7.3 | Human-like operating point | Walk ratio 0.0063–0.0066 m per steps/min (Murakami & Otaka 2017; Sakuma 2025), scaled by leg length. It is judged only at ≥ 1.0 m/s, because the constancy breaks below ≈ 1.03 m/s. Total DS ≈ 20–27 % of the cycle near 1.3 m/s (method-dependent, Vítečková 2020). Braking / propulsive GRF peaks ≈ 0.22 / 0.24 BW at 1.34 m/s (Sun 2018). |
| 7.4 | Robustness | Survive thorax impulses of ±15 N·s fore–aft / ±10 N·s lateral at random (seeded) phases in ≥ 90 % of trials |
| 7.5 | Command-perturbation robustness | Re-run with every committed command perturbed ±1 mm / ±1 ms: survival unchanged in ≥ 95 % of starts (the V1 13-vs-34 lesson) |
| 7.6 | Comparison | V1 G2W_A8 starts / oracle results reported at the V1-matched instance |

**After G7** (not designed here): start / stop → speed changes → turning → jogging → running → sprinting.
- Each gets its own gate.
- The F1 forefoot gate precedes running.
- The H hands gate precedes goalkeeper work.
- The ball-contact / CCD gate precedes kicks.
- The two-body gate precedes tackles.

## 23. V1 as oracle and comparator

- V1 stays frozen at `checkpoint/physchar-v1-final-research` and runs from its own worktree (or from the V2 branch, where `sandbox/visual/physchar/` is byte-identical to the tag and guarded).
- **Comparison set.** These are behavioural references, not implementation constraints.

| V1 reference | comparison |
|---|---|
| Gate A drops | V2-G1 passive drops on the same scenario list |
| C1 pushes | V2-G2 boundaries reported next to V1's (forward 60 / 65, backward 30 / 35, lateral 45 / 50 N·s), in N·s and in body-normalised units |
| C2 transfers | V2-G3 |
| C3 steps | V2-G4 |
| Gate D and D6 | V2 two-body gate (later) |
| G2a in-place gait | V2-G6 |
| G2W_A8 walking and oracle results | V2-G7 |
| Cost | ms per tick per player |

- **Normalisation.** Compare at the same stature and mass. V2 generates a **V1-matched instance (1.90 m, 78 kg)** for this. Compare also in body-normalised units.
- V2 never needs to reproduce V1 hashes. A V2 result that is worse than V1 on a comparable test must be reported and explained, never hidden.

## 24. Risks, open questions and decisions needed

### 24.1 Decisions I need from you

| # | decision | my recommendation |
|---|---|---|
| D1 | Baseline body: V2-REF 1.82 m / 78 kg (population mean of professional outfield players) plus a V1-matched 1.90 m / 78 kg instance for comparisons | **approve** |
| D2 | Core 14 bodies; hands (H) and forefoot (F1) as leaf extensions, H before GK work, F1 before running | **approve** |
| D3 | New DOFs vs V1: knee axial rotation, forearm pronation / supination | **approve** |
| D4 | Foot: V2-F0 rigid boot with the anatomical outline and toe spring (§12) | **approve** |
| D5 | Coordinate contract §7: keep the existing numbers, label them correctly as left-handed (Unity convention), and add the chirality test | **approve**. Separately, the existing assets' "right-handed" labels should be corrected in documentation (not in this task). |
| D6 | Branch from the V1 freeze tag (V1 present read-only, guarded) | **approve** (the alternative is branching from `touchline-current` and copying the ported files) |
| D7 | **Where the authoritative 22-player physics runs:** browser WASM (single- or multi-threaded) vs native or server Jolt | Needed before G2's performance criterion is final. G0 / G1 do not depend on it. |
| D8 | Body damping 0, with an explicit optional aerodynamic drag | **approve** |
| D9 | Equipment mass included (boots, shin guards, kit) | **approve** |
| D10 | Actuator capacity from **young male athlete** data (not the general population), with walking usage kept low by the controller, not by low caps | **approve** |

### 24.2 Risks and open questions

| # | risk / question | consequence | handling |
|---|---|---|---|
| R1 | Walking stays fragile on V2 | Same outcome as V1 at G7 | G5 decides whether the transition is healthy before walking. V1 is the comparator. The body is not claimed as the fix. |
| R2 | **Ball–boot contact.** Foot speed 15–25 m/s → 6–10 cm per 240 Hz tick, and contact lasts ≈ 2–3 ticks | Missed or tunnelled kicks; wrong ball speed | Dedicated CCD and ball-contact gate before kicks (V1 substrate spike: speculative distance + adaptive substep gave a 0.2 mm first touch at 15 m/s). Validate ball speed / foot speed ≈ 1.1–1.3 against kick data. |
| R3 | **Turf model.** The rigid stud plane has no compliance, no stud penetration and no rotational traction | Plant-foot loading, cutting, slipping | μ as a parameter (§15). Turf gate before cutting and running. |
| R4 | **22-player runtime** | Feasibility | D7, the G1 benchmark, a native path |
| R5 | **Per-foot GRF needs contact impulses** JoltPhysics.js does not expose (V1: issue #2128) | G3–G5 instrumentation | Foot-body Newton–Euler estimator validated against a force-plate twin (V1 method), or a small custom binding |
| R6 | **Soft passive limits are explicit torques** (computed outside the solver) | Instability with stiff limits on light bodies at 240 Hz | Stiffness bounded by a stability criterion (k·dt²/I_eff ≤ 0.25); the hard engine stop beyond the anatomical range; tested in G1 |
| R7 | **ROM coupling.** Hip rotation depends on flexion; ankle dorsiflexion on knee angle; knee axial rotation on flexion. Jolt limits are fixed per axis. | Unphysical poses inside a simple box / cone | Pose-dependent passive torques (§13) inside generous hard limits. Validated against the ROM evidence in G1. |
| R8 | **Shoulder girdle.** No clavicle bodies → no ≈ 5–8 cm girdle elevation | GK overhead reach underestimated | Open. Options: a translational girdle DOF, clavicle bodies for GK, or a raised SJC compromise. Decide before GK gates. |
| R9 | **No production mesh yet** | Collider–mesh tolerance can only be checked against anthropometric surfaces | G0 renders a procedural mannequin from the specification. The mesh check runs when Astra / Blender assets exist. |
| R10 | **Anthropometric generality.** de Leva fractions are a 1990s non-athlete sample; football squads vary | Mass distribution of muscular players | Variation hooks (§17); later two-predictor regressions; sensitivity reported in G0 |
| R11 | **Integration authority.** How the physical body's state relates to the football simulation's player state (`match.js` / `world.py`) is not designed here | Architectural | A separate design task before any football action gate |
| R12 | **Existing assets' frame labels** | Future mirror bugs | §7 contract + chirality test; documentation fix outside V2 |
| R13 | **Torque literature mixes conditions** (dynamometer isometric vs inverse-dynamics net moments) | Mis-sized actuators | §14 separates them explicitly; capacity per condition; G2–G4 report usage fractions |
| R14 | Fatigue and injury | — | Hooks only (§14). Designed later. |

## 25. Proposed branch, worktree and file layout

**Branch:** `prototype/physical-character-v2`, created from `checkpoint/physchar-v1-final-research` (commit `11149df`).
- The V1 code and tools are present read-only as the comparator and port source.
- History is continuous.
- V1's own branch and tag are never touched.

**Worktree:** `/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2`.

**Created during this design task** only to store this document safely: the V1 worktree must not be edited, and the main tree carries another session's uncommitted work. The documents are **uncommitted**, and nothing is pushed.

To undo: `git worktree remove "…/physical-character-v2" && git branch -D prototype/physical-character-v2`.

```
physical-character-v2/                         (branch prototype/physical-character-v2)
├── sandbox/visual/physchar/                    V1, READ-ONLY (guard: zero diff vs the tag, checked by tools/guard_v1.sh)
├── sandbox/visual/physchar2/                   V2 runtime (G0 creates only spec/, core/, map/, gates/v2_g0.js, tools/, viewer/)
│   ├── spec/   v2_human.js        human specification + population fractions + evidence table
│   │           v2_skeleton.js     semantic skeleton contract (31 bones, axes, mirror operator, chirality)
│   │           v2_body.js         physical body generator (bodies, masses, COMs, inertia)
│   │           v2_colliders.js    collider generator + self-collision matrix
│   │           v2_joints.js       joint table (frames, ROM, passive properties)
│   │           v2_actuators.js    capacity model (§14) — data + pure functions
│   ├── core/   v2_math.js         (port of pc_math.js)
│   │           v2_jolt.js         substrate adapter (port of pc_jolt.js; the only file that knows Jolt)
│   │           v2_world.js        fixed-step loop, RNG streams, ledger, hash
│   ├── map/    v2_render_map.js   physics → semantic skeleton (DIRECT / AIM / PROC / DEFORM)
│   ├── sense/  act/  ctrl/        (G1+ / G2+; empty at G0)
│   ├── gates/  v2_g0.js …
│   ├── tools/  g0_run.js, regress_v2.sh, guard_v1.sh, bench.js
│   ├── viewer/ index.html, v2_viewer.js
│   └── vendor/ jolt-physics.wasm-compat.js (copied from V1, sha256 recorded)
└── review_artifacts/physical_character_v2/
    ├── PHYSICAL_CHARACTER_V2_SPEC.md / .json   this design
    ├── calc/                                    v2_anthro.py + outputs (every number reproducible)
    ├── sources/                                 the user's V2 brief, verbatim
    └── g0/ …                                    gate reports (later)
```

## 26. First implementation gate: what I would build first after approval

**V2-G0 only, then STOP for review.** The order of work:

1. **Worktree hygiene.**
   - `tools/guard_v1.sh`: fails if `git diff checkpoint/physchar-v1-final-research -- sandbox/visual/physchar review_artifacts/physical_character_v1` is non-empty.
   - Copy `pc_math.js` → `core/v2_math.js` and the Jolt vendor build → `vendor/`, with sha256 recorded.
2. **`spec/v2_human.js`.** The human specification and the population fraction table of §10, with an evidence tag and a source per row. Input (H, M, overrides, build, equipment) → normalised landmarks.
3. **`spec/v2_skeleton.js`.**
   - The 31-bone contract: names, parents, Unity mapping, local axes, mirror operator.
   - Canonical T-pose placement from the landmarks.
   - The chirality test.
4. **`spec/v2_body.js`.** The 14 bodies:
   - masses, COMs and inertia tensors (de Leva radii × generated lengths, composite parallel-axis for forearm + hand, foot + boot, shank + guard);
   - equipment;
   - extension descriptors H / F1 (built only on request, never in core runs).
5. **`spec/v2_joints.js`.** The 13 joints:
   - anatomical frames, ROM-centred constraint frames;
   - hard limits, passive-torque parameters;
   - the swing–twist singularity check.
6. **`spec/v2_colliders.js`.** Colliders (§15), the boot hull with toe spring, the self-collision matrix, the overlap checks at the reference poses.
7. **`spec/v2_actuators.js`.** The capacity model as data + pure functions (§14). No controller uses it yet. G0 only validates its tables and units.
8. **`core/v2_jolt.js`.** The substrate adapter port:
   - build bodies with explicit mass properties, constraints with the centred frames, motors off;
   - zero damping;
   - readback of every parameter.
9. **`map/v2_render_map.js`.** The DIRECT / AIM / PROC / DEFORM mapping at rest + the T-pose round-trip test.
10. **`gates/v2_g0.js` + `tools/g0_run.js`.** Criteria 0.1–0.13, for V2-REF, the V1-matched instance and the 7-body variation set; JSON + hash output.
11. **`viewer/`.** Static inspection page:
    - colliders, COMs, joint frames, ROM cones;
    - semantic skeleton overlay;
    - body selector;
    - V1-matched V2 next to the frozen V1.1 body (read from the V1 spec, not run).
12. **`review_artifacts/physical_character_v2/g0/G0_REPORT.md`.** Tables, figures, deviations, then STOP.

**Explicitly not in G0:** gravity stepping (G1), motors (G2), controllers of any kind, walking, Blender, Unity, pushing.

---

## 27. Sources

(Numbers marked [H] in this document come from these. Values I could not verify against the original text are flagged in the tables as "recalled".)

**Verification status.** Two research passes checked these against primary text this session: full-text tables, PDFs or verbatim abstracts. Items marked † were seen only in a secondary reproduction. Items marked ‡ are recalled and unverified; their numbers are labelled "recalled" where used. The raw notes are in the session scratchpad (`research_anthro/`, `research_torque/`), not in the repository.

**Anthropometry and inertia**
- de Leva P (1996). Adjustments to Zatsiorsky–Seluyanov's segment inertia parameters. *J Biomech* 29(9):1223–1230. doi:10.1016/0021-9290(95)00178-6
- Dumas R, Chèze L, Verriest JP (2007). Adjustments to McConville et al. and Young et al. body segment inertial parameters. *J Biomech* 40(3):543–553. doi:10.1016/j.jbiomech.2006.02.013 †
- Winter DA (2009). *Biomechanics and Motor Control of Human Movement*, 4th ed., Wiley. Fig. 4.1 and Table 4.1, after Drillis R, Contini R (1966), *Body segment parameters*, Rep. 1166-03, NYU.
- Gordon CC et al. (2014). *2012 Anthropometric Survey of U.S. Army Personnel* (ANSUR II), NATICK/TR-15/007. Public male dataset, n = 4,082.
- Santschi WR, DuBois J, Omoto C (1963). *Moments of inertia and centers of gravity of the living human body*. AMRL-TDR-63-36 ‡ (numbers)
- Bell AL, Pedersen DR, Brand RA (1990). *J Biomech* 23(6):617–621 †. Harrington ME et al. (2007). *J Biomech* 40(3):595–602 †. Hara R et al. (2016). *Sci Rep* 6:37707. Bardakos NV, Freeman MAR (2012) [V1 source].
- Thompson et al. (2019), first-MTP location, n = 453 [V1 source]. Hawes MR, Sovak D (1994). *Ergonomics* 37(7):1213–1226 ‡. Jurca A et al. (2019). *Sci Rep* 9:19155.
- Baxter JR et al. (2012). *Proc R Soc B* 279:2018–2024. Salami F et al. (2020). *Gait Posture* 77:95–99. Papachatzis N et al. (2023). *J Exp Biol* 226:jeb245113.
- Loud D et al. (2024). *Orthop J Sports Med* 12(8):23259671241259823 (stud lengths).
- Goldmann JP, Brüggemann GP (2012). Toe flexor strength, *J Anat* [V1 source].

**Football population**
- Poli R, Ravenel L, Besson R. CIES Football Observatory Monthly Reports 22 (2017) and 79 (2022).
- FIFA World Cup 2018 squad data (n = 736) †.
- Bloomfield J et al. (2005). *J Sports Med Phys Fitness* 45(1):58–67.
- Costello N et al. (2025). EPL / EFL DXA body composition, preprint doi:10.21203/rs.3.rs-7761100/v1.
- Milsom J et al. (2015). *J Sports Sci* 33(17):1799–1806. Sutton L et al. (2009). *J Sports Sci* 27(10):1019–1026.

**Strength and actuator models**
- Anderson DE, Madigan ML, Nussbaum MA (2007). Maximum voluntary joint torque as a function of joint angle and angular velocity. *J Biomech* 40(14):3105–3113. doi:10.1016/j.jbiomech.2007.03.022
- Anderson DE, Madigan ML (2014). *J Biomech* 47(5):1104–1109 †
- Fousekis K, Tsepis E, Vagenas G (2010). Lower limb strength in professional soccer players. *J Sports Sci Med* 9(3):364–373.
- Śliwowski R et al. (2017). *PLoS One* 12(7):e0182177. Eniseler N et al. (2012). *J Hum Kinet* 31:159–168. Šarabon N et al. (2021). *Front Physiol* 12:767941.
- Thorborg K et al. (2011). *Am J Sports Med* 39(1):121–126. Mosler AB et al. (2017). *J Sci Med Sport* 20(4):339–343.
- Billot M et al. (2022). *Sci Rep* 12:20238. Maciel ES et al. (2022). *Foot Ankle Orthop* (conference abstract).
- Pan F et al. (2025). *Eur J Med Res* 30:471. Zouita ABM et al. (2020). *Int J Sports Phys Ther* 15(1):160–174 †
- Vasavada AN, Li S, Delp SL (2001). *Spine* 26(17):1904–1909. Kotte SHP et al. (2018). *Shoulder Elbow* 10(3):207–215 †. Delp SL et al. (1996). *J Biomech* 29(10):1371–1375.
- Holzbaur KR et al. (2007). *J Biomech* 40(11):2442–2449. Ivey FM et al. (1985). *Arch Phys Med Rehabil* 66(6):384–386.
- Thelen DG (2003). *J Biomech Eng* 125(1):70–77. Zajac FE (1989). *Crit Rev Biomed Eng* 17(4):359–411 ‡
- Xia T, Frey Law LA (2008). *J Biomech* 41(14):3046–3052. Frey-Law LA, Looft JM, Heitsman J (2012). *J Biomech* 45(10):1803–1808.
- Riener R, Edrich T (1999). Identification of passive elastic joint moments in the lower extremities. *J Biomech* 32:539–544 ‡ (functional form only). Yoon YS, Mansour JM (1982) ‡ (functional form only).

**Movement mechanics**
- Schache AG et al. (2011). Effect of running speed on lower limb joint kinetics. *Med Sci Sports Exerc* 43(7):1260–1271. Schache AG et al. (2019). *J Exp Biol* 222:jeb209460.
- Dorn TW, Schache AG, Pandy MG (2012). *J Exp Biol* 215(11):1944–1956.
- Fukuchi CA, Fukuchi RK, Duarte M (2018). A public dataset of overground and treadmill walking. *PeerJ* 6:e4640 (walking moments recomputed).
- Nunome H et al. (2002). *Med Sci Sports Exerc* 34(12):2028–2036. Nunome H et al. (2006). *J Sports Sci* 24(5):529–541. Kellis E, Katis A (2007). *J Sports Sci Med* 6(2):154–165 †. Lees A et al. (2010). *J Sports Sci* 28(8):805–817.
- Harper DJ et al. (2022). *Sports Med* 52(10):2321–2354 †. Jones PA et al. (2017). *Sports* 5(2):42. Yi F et al. (2024). *Front Bioeng Biotechnol* 12:1461247.
- McErlain-Naylor S, King M, Pain MT (2014). *J Sports Sci* 32(19):1805–1812.
- Weyand PG et al. (2000). *J Appl Physiol* 89(5):1991–1999. Weyand PG et al. (2010). *J Appl Physiol* 108(4):950–961.

**Walking and transitions**
- Adamczyk PG, Kuo AD (2009). Redirection of center-of-mass velocity during the step-to-step transition of human walking. *J Exp Biol* 212(16):2668–2678 (work values †)
- Donelan JM, Kram R, Kuo AD (2002). *J Biomech* 35(1):117–124 and *J Exp Biol* 205(23):3717–3727. Zelik KE, Kuo AD (2010). *J Exp Biol* 213(24):4257–4264.
- Murakami R, Otaka Y (2017). *J Phys Ther Sci* 29(4):722–725. Sakuma et al. (2025). *R Soc Open Sci* 12:250740. Vítečková S et al. (2020). *PeerJ* 8:e8835. Sun et al. (2018). *PeerJ* 6:e5517.
- Nilsson J, Thorstensson A (1989). *Acta Physiol Scand* 136(2):217–227. Chiu MC et al. (2013). *Gait Posture* 37(1):43–48. Fang X et al. (2018). *R Soc Open Sci* 5:170818. Molina-Rueda F et al. (2021). *IJERPH* 18(3):1343.
- Brenière Y, Do MC (1986). *J Biomech* 19(12):1035–1040.

**Range of motion**
- Soucie JM et al. (2011). Range of motion measurements: reference values and a database for comparison studies. *Haemophilia* 17(3):500–507.
- Roaas A, Andersson GBJ (1982). *Acta Orthop Scand* 53(2):205–208. Boone DC, Azen SP (1979) †
- Cho KH et al. (2016). *Ann Rehabil Med* 40(2):271–278. Konor MM et al. (2012) †. Troke M et al. (2005). *Man Ther* 10(3):198–206.
- Zhou C et al. (2020). *J Biomech* 98:109418. Han H et al. (2015). *J Phys Ther Sci* 27(2):441–445. Simoneau GG et al. (1998). *JOSPT* 28(3):158–164. Tak I et al. (2016). *Am J Sports Med* 44(3):682–688. Hemmerich A et al. (2006). *J Orthop Res* 24:770–781.
- Poppen NK, Walker PS (1976). *JBJS Am* 58(2):195–201. McClure PW et al. (2001). *J Shoulder Elbow Surg* 10(3):269–277. Nawoczenski DA et al. (1999). *JBJS Am* 81(3):370–376. Hopson MM et al. (1995). *JAPMA* 85(4):198–204.
- AAOS (Greene WB, Heckman JD, 1994) ‡; Youdas JW et al. (1992) ‡.

**Repository evidence (V1)**
- `review_artifacts/physical_character_v1/`:
  - `PHYSICAL_CHARACTER_V1_FINAL_HANDOFF.md`, `PHYSICAL_CHARACTER_V1_LESSONS.md`
  - `v1_1/ANATOMY_V1_1_REPORT.md`, `foot_gate/FOOT_GATE_REVIEW.md`
  - `g2_char/G2_PLANT_REPORT.md`, `g2_walk/NIGHT_LOG.md`
  - `g2_stepper/{G2_STEPPER_REVIEW, DECISION_RECORD, RENDER_SKELETON_CONTRACT}.md`
  - `sources/` (Astra Unity Humanoid audit, Astra remaining-walking-failure report)
- `sandbox/visual/physchar/`: `pc_body.js`, `pc_jolt.js`, `pc_balance.js`, all at `checkpoint/physchar-v1-final-research`.


---

**STOP FOR REVIEW.** Nothing in V2 is implemented. V2-G0 starts only after you approve this specification and the decisions in §24.1.
