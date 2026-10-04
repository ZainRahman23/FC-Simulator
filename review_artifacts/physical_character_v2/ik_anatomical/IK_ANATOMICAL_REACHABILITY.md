# Anatomical reachability of G4-style footholds: characterisation and constrained-IK candidates (Decision 2 research)

**Source:** `../sources/2026-10-04_user_decision_j2a_gate_ankle_ik_research.md`, Decision 2.

**Status:** research only.
- **Nothing is adopted.** The opt-in limit-respecting IK (`legIKBounded`, `ikBounds` default off) and its tests are kept as research infrastructure.
- No IK architecture decision for G4 is made here. No swing, stepping or foothold execution.

**Tools:**
- `tools/ik_anat_study.mjs`: characterisation plus 5 methods; the same states and targets as `tools/ik_g4_study.mjs`.
- `tools/ik_pelvis_yaw.mjs`: plausibility under pelvis yaw.

**Evidence:** `evidence/ik_anat_full.json.gz`, `.log`; `evidence/ik_pelvis_yaw.json`, `.log`.

**Proposal for approval:** `FOOTHOLD_REACHABILITY_CONTRACT.md`.

## 1. The invalid 8 %, characterised (20,736 targets; 16,704 geometrically reachable; 1,336 geometric-but-not-anatomical)

### By foot yaw (relative to the current foot; + = toe-out, i.e. hip external rotation)

| foot yaw | geometric | invalid | share |
|---|---|---|---|
| 0° | 4,800 | 36 | 0.75 % |
| +30° | 2,976 | 0 | 0 |
| −30° | 2,976 | 92 | 3.1 % |
| +45° | 2,976 | 605 | 20 % |
| −45° | 2,976 | 603 | 20 % |

### Ground-level targets (height 0: actual footholds, foot flat on the turf)

| foot yaw | geometric | invalid |
|---|---|---|
| 0° | 752 | **0** |
| ±30° | 1,504 | **0** |
| ±45° | 1,504 | 272 (18 %) |

**Every geometrically reachable ground-level foothold with foot yaw within ±30° is anatomically valid,** in every family (forward 15–45 cm, backward, crossing, outward, diagonals, widths) and every body.

### Which limits bind

- **Hip rotation: 1,110 targets** (excess median 3.0°, p90 6.8°, max 14.7°). All at ±45° foot yaw.
  - The production IK's solutions need hip **external** rotation of median 60° (range 49–74°) for toe-out 45°.
  - They need **internal** rotation of median 50° (range 37–62°) for toe-in 45°.
- **Ankle dorsiflexion: 260 targets** (excess median 3.1°, max 10.4°).
  - **All are lifted targets** (230 at +10 cm, 30 at +5 cm) with the foot held flat in the air.
  - The leg is at knee flexion 73–85° behind or beside the body, so the flat foot demands DF 45–55°. This comes from the study's target convention (foot orientation fixed, even in the air), not from a foothold.
  - These are the 36 invalid targets at yaw 0 (32 "slight backward" plus 4 "inward" at pelvis drop 10 cm, height 10 cm, every body), all 92 at −30°, and 132 at −45°.
- **Ankle inversion:** 5 targets (≤ 1.4°).
- **Hip flexion, hip abduction, knee flexion:** never.

### Knee and ankle state in the invalid solutions

- **Knee flexion:** 5–85° (median 44°).
- **Knee hyperextension:** only in the production IK's fallback for *geometrically unreachable* targets (earlier finding), never in an invalid but reached solution.
- **Ankle DF:** −20…55°. **Inversion:** −31…30°.

### Distance and direction

- At pelvis drop 0 a ground-level 15 cm forward step is already beyond full extension (s ≈ 1.007).
- **Invalidity grows with pelvis drop and height:** 272 → 411 → 653 at drop 0 / 5 / 10 cm, as more yawed and lifted targets enter the geometric workspace.
- **Families with the most invalid targets:**

  | family | invalid |
  |---|---|
  | far outward | 265 |
  | diagonal in | 206 |
  | diagonal out | 170 |
  | long forward | 160 |
  | slight backward (DF, lifted) | 156 |
  | medium forward | 131 |

### Morphology

- Invalid per body (of ≈ 2,048–2,128 geometric):

  | body | invalid |
  |---|---|
  | V2-165-62 | 236 |
  | V2-175-70 | 179 |
  | V2-short-legs | 179 |
  | V2-198-92 | 169 |
  | V2-REF | 158 |
  | V2-190-85 | 146 |
  | V1-matched | 136 |
  | V2-long-legs | 133 |

  The smallest body has the most, because its shorter leg makes the same yawed target need more hip rotation.
- **State:** swing-ready 652 vs near-single-support 684.
- **L / R:** 0 classification mismatches.

### Plausibility (normal walking / running vs extreme yaw)

**Normal gait:**
- foot progression angle ≈ 5–10° toe-out;
- small heading changes per step;
- foot flat at touchdown.

**In this study,** those footholds (yaw within ±30°, ground level) are **never** anatomically invalid.

**The invalid set is extreme foot yaw (±45°) with the pelvis held at its standing orientation.** Allowing the pelvis to yaw toward the new foot direction, as every turning step does:

| foot yaw | resolved by pelvis yaw | not resolved by ≤ 45° |
|---|---|---|
| +45° (605) | 552 by ≤ 20° (304 already by 5°) | 53: long / very long forward at the workspace edge, where turning the pelvis moves the hip back |
| −45° (603) | 471 by ≤ 10° | 132: the lifted flat-foot DF cases |
| −30° (92) | 0 | 92: all DF cases |

- **Pelvis yaw = half the foot yaw** resolves 944 of 1,300 yawed invalid targets.

**Conclusion:** the invalid 8 % is dominated by (a) ±45° foot yaw requested with a non-turning pelvis, and (b) a flat foot held in the air. Neither is a normal-gait foothold request. Both are real constraints for G4's planner: turning must share yaw between pelvis and hip, and swing poses must not demand a flat foot.

## 2. Constrained-IK approaches compared (`tools/ik_anat_study.mjs` part 2; every target plus its mirror)

**Reference:** M1 = the bounded LM with ≤ 400 iterations. **It is itself unconverged on 24 targets** (KKT up to 8.8e-5).

| method | classification | reached solutions | unreached fallback (5,368 targets) | mirror | cost (µs) |
|---|---|---|---|---|---|
| **M0** bounded active-set projected LM, ≤ 30 iterations | reference for anatomical class; 0 L/R mismatches | = `legIK` where valid (≤ 1e-9 rad) | **not converged:** KKT up to 7.5e-4, up to 3.5° from the optimum | 5.4e-8 rad unreached | p50 127, p99 1,903 |
| **M2** M0 + Gauss–Newton Tikhonov refinement (ε 1e-4 / 1e-6) | = M0 | untouched | **still not converged** (KKT up to 1.8e-4); ε = 1e-4 costs ≤ 0.76 mm of residual | 1e-5° | p50 770–890 |
| **M5** M0 + projected damped **Newton** with the full Hessian (central differences of the gradient), ε = 0 | = M0 | untouched | **converged:** KKT ≤ 4.4e-9 (median 3.7e-12), ≤ 11 iterations (median 1); residual never worse than M1 (better by up to 11 µm) | 1.3e-7 rad | p50 1,155, p99 8,277 (total; unreached only) |
| M5 with ε = 1e-6 | = M0 | untouched | KKT ≤ 1.6e-9; 1.9e-6 m residual cost | 1.8e-8 rad | p50 1,521 |
| **M3** log-barrier LM (interior) | = M0 (0 mismatches) | **biased** by up to 8.5e-4 rad (never touches the bound) | — | 1.9e-5 rad | p50 804, p99 7,221 |
| **M4** unconstrained `legIK` + post-check against the limits | = M0 (0 mismatches: no alternative valid branch exists in this target set) | = `legIK` | none (its fallback ignores the limits) | — | p50 118 |

**Why Gauss–Newton fails here:** at an unreachable target the optimum has a large residual. JᵀJ omits Σ rᵢ∇²rᵢ, which dominates there, so LM / GN converge only linearly.

**Adopted into the opt-in research solver** (Decision 2: "improve its fallback/unreachable-target behavior"; no new limits, no body change):
- **M5 (ε = 0)** as `legIKBounded`'s fallback refinement (`IK.boundedFallback = "newton"`, ≤ 25 iterations, `IK.hNewton` 1e-5).
- It runs only for unreached targets, so reached solutions and the classification are unchanged. The smallest unreached residual is 1.9e-5 m, 19× above the reach threshold.
- **Permanent test R4.g** gates the fallback KKT at 1e-7. Measured 3.8e-10 on 254 unreached solves; suite 26/26.
- `legIK` (the production controller IK) is untouched (R3.e bit-identity).

**Cost note:** classification is cheap (M4 / M0 ≈ 0.12–0.13 ms median). A converged *fallback pose* costs ≈ 1–8 ms per unreached query. A planner should request it only when it needs the pose (`IK.boundedFallback = "none"` skips it).

**Not prototyped:** a closed-form (analytic) leg IK enumerating all branches. The chain is hip 3 + knee 1 + ankle 2, with fixed axial-twist offsets and non-collinear anchors. It would give exact branch enumeration and speed. Not needed on this evidence: a unique valid branch per target, and the warm start finds it.
