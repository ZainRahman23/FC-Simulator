# Ankle law: preregistered comparison (final pre-E1a stage, §4)

**Written before the official comparison runs** (full G1 / G2 / G3 of each candidate configuration). The policy battery, the yaw-anchor architecture diagnostics and the knee counterfactual already ran; they are inputs.

**Thresholds below are not changed after the official runs.**

## 1. Evidence summary (`literature/`, `SINGLE_SUPPORT_YAW.md`)

| property | evidence | status |
|---|---|---|
| unloaded passive foot rotation about the tibial axis (whole complex, relaxed, ≤ 1.7 N·m) | 0.10–0.15 N·m/° (Watanabe 2012, Hattori 2022, Ficanha 2015: full text) | **supported**; our law's coordinate and range match |
| loaded small-angle passive stiffness | **no measurement found**. Articular geometry gives about 30 % of rotational stability at 1 BW | direction supported, **magnitude unknown** |
| loaded whole-limb (ankle + knee + hip in series), active | ≥ about 0.35–0.44 N·m/° at 2 Hz (Lee 2014, figure) | lower bound for the whole leg |
| active foot yaw (oblique subtalar axis, about 37–42°) | mechanism and moment arms exist (up to about 20 mm); **capacity unmeasured** | missing in our orthogonal ankle |
| end range | about 0.8–1.7 N·m/° secants to 20–40°, from failure tests | end range only, not the neutral zone |

## 2. Candidates

- **L0:** k = 0. The accepted control. Outside the unloaded evidence: zero stiffness in ±10°.
- **L13:** constant neutral-zone law, k = 0.13 N·m/°. The centre of the unloaded evidence. The implemented G3-R7 law: linear in the soft range ±10°, saturating beyond it, conservative, mirror-symmetric.
- **L11 / L15:** the edges of the evidence range. Sensitivity only: G1 targeted and the single-support diagnostics.

**Not candidates (diagnostic only, reported in `SINGLE_SUPPORT_YAW.md`):**
- **load-dependent passive:** no measured magnitude, and not conservative (energy ½·Δk·x² enters at every stiffness change);
- **active ankle yaw:** an actuator / anatomy decision for you.

**Knee model:**
- **current:** the accepted knee;
- **envelope:** the literature-shaped diagnostic envelope `KNEE_ENVELOPE_LIT1`, pending your decision (`KNEE_AXIAL_CONCLUSION.md`).

**Twist policy for the G2 / G3 runs:** reference (the policy-battery leader; its adoption is a separate decision, `TWIST_POLICY_RESULTS.md`). The experimental lifecycle is on for G3.

## 3. Criteria (per candidate × knee model)

| # | requirement | test | threshold |
|---|---|---|---|
| AL1 | passive-physics integrity | full G1 (`tools/g1_run.js`, scratch tree) | every gating G1 row passes, as accepted (V1-freeze row 1.V1 not applicable in a scratch tree) |
| AL2 | no unexplained energy | G1 energy rows (incl. 1.2e passivity); boundary harness | G1 energy rows pass; harness closure increment ≤ +0.05 J per tick |
| AL3 | unloaded plausibility | evidence range; LIFT touchdown | k ∈ [0.10, 0.15]; swing-foot yaw at touchdown ≤ 2° |
| AL4 | loaded behaviour (bounded; no loaded number exists) | HO1, LIFT (policy battery) | HO1 stance-ankle ab/adduction peak ≤ 15° (no hard-limit excursion) and back within 3° after 3 s; LIFT stance ankle ≤ 5° |
| AL5 | morphology | battery-wide | all 8 bodies |
| AL6 | rate | boundary harness, 180 / 480 Hz | no fall; closure ≤ +0.05 J per tick |
| AL7 | G0–G3 regression safety | full G2 + G3 (criteria v3.3) with reference + lifecycle | G2 gating rows pass; G3 v3.3 native rows pass (J2a / browser / bench rows taken from the accepted runs, not re-measured) |
| AL8 | approaching single support | T5, U:R (policy battery) | stance and unloaded ankle ab/adduction peak ≤ 3° (the G3-F1 twist was 10–13° at k = 0) |

## 4. Decision rule

1. Adopt the candidate nearest 0.13 that meets AL1–AL8 under the knee model that will be in force.
2. If it meets them only under the proposed knee envelope, adoption is **conditional on your approval of the knee revision**. It is then reported as the recommended law, not adopted.
3. If no candidate meets them, report that no law is sufficiently supported.
