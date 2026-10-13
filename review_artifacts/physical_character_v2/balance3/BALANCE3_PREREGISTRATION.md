# BALANCE-3 candidate B3: preregistration

**Status.**
- Frozen in `BALANCE3_FREEZE_B3.json` before any B3 performance run: no battery, development, review or long-window run.
- The only B3 execution before the freeze was the construction / sign check (`evidence/B3_PREFREEZE_SIGNCHECK.json`): one entry step, plus the law evaluated on a synthetic deviation.
- C3 is preserved unchanged as the 16 / 17 baseline (`balance2/c3/`, `BALANCE2_FREEZE_C3.json`).

**Instruction:** `sources/2026-10-13_user_instruction_balance3_coordinated_ankle_hip.md`.

## 1. The problem (from the audit, `BALANCE3_BODY_AUDIT.md`)

- **P8** fails on backward small (0.287 vs ≤ 0.26). It is the first swing of a slow trunk-lean mode: the trunk stays ≈ 1.2° forward about the hips and returns with τ ≈ 9 s. With integrals active it becomes a ≈ 9 s oscillation.
- **Low-frequency stiffness of the HAT about the hips:**
  - the body supplies 1.01 × gravity (M1b persistent strain arm + passive B; the human passive hip range is 0.6–1.2 ×, Kiemel 2008);
  - the controller supplies ≈ 0 (the BALANCE-1 map defect);
  - so the net is ≈ 0.
- **The rigid two-segment model mispredicts this body.** Hip torque moves the COM about 7 × less than the model says (open-loop replay).
- **C4's failure** was overlapping objectives: the hips, spine and ankles each regulated composites that share mass. That produced spine counter-rotation and a slow ≈ 5 s oscillation with hip and ankle torques in anti-phase.

## 2. What the evidence supports (`research/BALANCE3_ANKLE_HIP_LITERATURE.md`)

**Measured, robust across studies:**
- ankle and hip contributions **blend continuously**: hip torque is added to ankle torque, with no switch (Runge 1999; Park 2004 / Hong & Park 2025; Creath 2005; Zhang 2007);
- trunk and legs move **in phase below ≈ 1 Hz** (Creath 2005; Zhang 2007);
- feedback is **cross-coupled**: hip torque depends on leg angle, ankle on trunk angle (Kiemel 2011; Boonstra 2013; Engelhart 2016);
- sagittal releases of about 4° are **"typically free of overshoot"**, critically damped (Zelei 2021).

**Model-fitted to human data:**
- **Alexandrov 2005 eigenmovement control** (9 subjects; R² 0.94–0.96). Each sagittal eigenmovement has its own delayed PD loop on its own coordinate:
  - A, whole body about the ankles: delay 120.8 ms, K_S 1.15, K_V 0.31 s;
  - **H, trunk against legs: delay 66.1 ± 10.2 ms, K_S 1.15 ± 0.07, K_V 0.17 ± 0.02 s**;
  - K, the knee;
  - gains nearly independent of amplitude;
  - [E] H-mode non-oscillatory, τ ≈ 0.48 s.
- In joint space, independent modal loops form a **symmetric, coupled** gain matrix (Alexandrov 2017).
- In trunk bending the **ankle eigenmovement accompanies the trunk motion and compensates the COM shift** it causes (Alexandrov 2001).

**Unsupported or unknown (and therefore not used):**
- numerical joint-space gain matrices;
- integral action in any fitted model;
- sagittal overshoot at COM peaks ≤ 40 mm;
- scale invariance of overshoot.

**Note:** the research could not verify the AP figures behind P8, because Rietdyk 1999's journal paper is medio-lateral. The earlier PPR-3 notes cite the thesis's A-P column as read in full. **P8 is not changed.** The only sagittal data (Zelei) are stricter.

## 3. Controller B3 (`b3/b3_ctrl.mjs`, `b3/params/B3.json`)

**Structure: eigenmovement objectives (Alexandrov 2005), mapped onto the existing architecture.** Each objective owns a distinct coordinate, so no two loops regulate the same physical quantity.

| Mode | Coordinate | Implementation | Status |
|---|---|---|---|
| **A**, whole body about the ankles | COM AP state | C3's COM objective, with its prediction, quiet-band integral and support-envelope governor | **unchanged** (it carries the qualified legitimate forward behaviour) |
| **K**, knee | Per-leg knee angle | BALANCE-1 / C3 knee objective | **unchanged** |
| **H**, trunk against legs | **Mean sagittal hip angle** | **New**: law below | added |
| Spine posture | Lumbar / thoracic / neck composites | C3 objectives | unchanged. A whole-body lean does not change the hip angle, and spine bending does not change it either, so the H-mode cannot fight the spine loops or the COM loop through overlapping coordinates |

**H-mode law:**
- τ_H = −(K_S · G_H · Δξ_H(t − 75 ms) + K_V · G_H · ξ̇_H(t − 30 ms)), split equally across both hips, in the direction that rotates the trunk about the hips.
- **Coordination:** a simultaneous ankle companion τ_A = c · τ_H, in the direction that cancels the COM shift of the trunk correction. The trunk correction is therefore COM-neutral, and the A-mode loop has nothing to fight.

**Output** only through the canonical M1b excitation interface. **No** event detection, outcome input, test-case logic, integral, or hidden instantaneous feedback.

| Parameter | Value | Provenance |
|---|---|---|
| ξ_H | Mean anatomical hip-flexion angle, both hips | The H eigenmovement of a rigid-trunk model; excludes spine bending (audit §4). Sign verified pre-freeze: a forward trunk pulse raises it by +0.54° |
| G_H | 145.93 N·m/rad (both hips) | HAT gravitational stiffness about the hips, from entry statics (body schema; equals the audit value) |
| K_S | **1.15** | Alexandrov 2005 Table 1, H-mode mean |
| K_V | **0.17 s** | Alexandrov 2005 Table 1, H-mode mean |
| Angle delay | 18 steps = **75 ms** (new channel `hipAng`) | ≥ Alexandrov's H effective delay of 66.1 ms, rounded up to BALANCE-1's hip / trunk latency (never faster than human) |
| Rate delay | 8 steps = **30 ms** (existing `orientRate`) | Proprioceptive velocity, Goodworth & Peterka 2009 (25 ± 6 ms), BALANCE-1 |
| c (ankle companion) | **0.141** | This body's identified ratio. Open-loop replay at 400 ms: hip 5 N·m → COM −0.364 mm; ankle 5 N·m → +2.588 mm. 400 ms is the timescale nearest the H-mode τ of 0.48 s |
| Integral | **none** | No fitted human per-mode model includes one |

**K_S and K_V convention.** They are applied as the controller term on top of M1b's intrinsic stiffness. This is the convention BALANCE-1 already uses for its COM (Peterka) and knee objectives. Alexandrov's fits lump passive and active contributions together, so this convention gives a higher total stiffness than the human fit. That is disclosed, not tuned.

**Expected effect (stated before any run, not a tuning target).**
- At low frequency the hips gain net stiffness of ≈ (1.01 + 1.15 − 1) × G_H instead of ≈ 0. The trunk-lean mode should then return in well under a second rather than ≈ 9 s, removing the source of the P8 offset.
- **Risks:**
  - the spine loops (net 0.66 × at the lumbar) may still carry slow motion;
  - the C3 integrals may still create slow drift;
  - the companion ratio is an approximation, since the identified ratio varies from 0.25 to 0.14 between 200 and 400 ms;
  - the forward threshold may shift.

## 4. Qualification (all must pass; otherwise B3 is NOT QUALIFIED and nothing is tuned)

| ID | Requirement | Measured by |
|---|---|---|
| Q-B2F | **All 17 frozen B2F criteria**, including P8 ≤ 0.26 for every small / moderate push, T1′ forward [10.15, 14.21], U1–U6 quiet standing, P5 / P6 / P7, M1′ and DET | `balance2/scripts/b2_qualify.mjs` + `balance2/criteria/b2f_eval.mjs`, unchanged |
| L1 | No boot-tip load (share ≤ 0.02) in any run the frozen rule does not score as a fall | `balance2/scripts/c3_legit.mjs`, unchanged |
| L2 | Genuine falls: no frozen-rule forward fall is a physical recovery; physical forward limit ≤ frozen threshold + 0.7 N·s | same |
| FWD | Corrected forward behaviour preserved: T1′ forward within the B2F band **and** within ±1.0 N·s of C3's 12.09 | B2F evidence |
| CAUS | C1–C4 (the unchanged C3 audit) **and** C5: the H-mode torque trace is identical to the twin until ≥ onset + 1 + 8 steps | `scripts/b3_causality.mjs` |
| DET | DET passes **and** a full B2F rerun is bit-identical (every push's final hash) | B2F evidence × 2 |
| R1 | **Recovery duration:** for B2M back.small, back.moderate, fwd.small and fwd.moderate, \|push − twin AP COM\| ≤ max(4.1 mm, 0.10 × peak) for all t ∈ [3.5, 12] s. Basis: Alexandrov's A-mode τ ≈ 0.9 s gives 3τ ≈ 2.7 s; the frozen M1′ settling limit is 3.5 s; 4.1 mm is the human quiet-stance COM RMS AP (Foulger 2025) | `scripts/b3_long.mjs` |
| R2 | **No long-period trunk oscillation:** HAT pitch residual ≤ 1.0° for t ∈ [3.5, 12] s, same four pushes | same |
| R3 | **No ankle–hip fighting:** not (hip vs ankle torque-deviation correlation over 1–12 s < −0.5 with both RMS > 2 N·m), same four pushes | same |
| MUS | Physiological muscle limits: P7 (frozen) and peak support-muscle activation < 0.99 in every small / moderate push | B2F evidence (`effort`) |
| QUIET | Quiet standing stable: U1–U6, plus the 12 s quiet run with no fall and no boot-tip load | B2F + `b3_long.mjs` |
| VIS | Synchronized review (C3 \| B3; normal speed and slow motion): no visible boot-tip balancing, oscillation or fighting | `render/b3_save_runs.mjs` |

**Comparison, reported (C3 | B3):**
- backward small (P8);
- forward 12 N·s;
- the near-limit forward fall (14 N·s);
- quiet standing;
- lateral moderate (15 N·s).

**Hard rejection conditions** (any one means NOT QUALIFIED):
- any row above fails;
- any boot-tip support in a recovered run;
- a causality or determinism failure;
- any change to C3, M1b, anatomy, stance, foot, support geometry, the fall rule, the B2F criterion or P8.

## 5. Outcome mapping (frozen)

- **All of §4 pass:** B3 is frozen as the **qualified no-step recipient baseline** (`BALANCE3_QUALIFIED_NO_STEP_BASELINE.json`: file hashes, parameters, evidence).
- **Any fail:** B3 is NOT QUALIFIED.
  - Report which criterion failed and why.
  - No tuning, and no second candidate without a new preregistration.
  - If passing would need unsupported parameters or a body change, that is stated as the stop condition.
  - C3 stays the baseline.

PVP stays sealed. Nothing is pushed beyond the daily rule.
