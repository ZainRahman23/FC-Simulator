# Physical Stepper — architecture decision record (2026-10-02)

## Inputs and evidence order

- **The brief:** the user's "MAJOR ARCHITECTURE CONSOLIDATION — PHYSICAL STEPPER", Parts 0–29.
- **Three Astra reports:**
  - Stepper / Rabona;
  - the Unity Humanoid render-skeleton audit;
  - the remaining walking failure (stance vs planning).
- **The repository's own measurements**, mainly `g2_overnight/` (2026-10-02) and `g2_unified/` (2026-10-01).
- **Rule:** where a report conflicts with a repository measurement, the measurement wins and the conflict is recorded below.

## Component decisions

| component | decision | basis |
|---|---|---|
| Foot F0 (rigid 36 cm boot) | **KEEP** (default) | Foot gate 2026-10-01: best walking baseline. Brief Part 1. |
| Foot F2h | **KEEP opt-in, DEFER** | Rerun only once F0 walks robustly under the new planner (Part 25). |
| Inherited walking swing + pelvis-rate internal model (`walk.swingBase "model"`) | **KEEP** | Bench 2026-10-02: fixed requests +2.8 ± 3.0 cm; late foothold changes executed with gain 0.65 / 0.57 / 0.50 (τ 0.15 / 0.20 / 0.25, sd 0.3–0.5 cm, symmetric); timing changes executed fully. |
| Swing executor X (`pc_swingx.js`) and the hybrid | **EXPERIMENTAL** (opt-in; not adopted) | Measured worse: map error 7.6–8.2 vs 3.6–4.3 cm; timing ⅓ executed; scatter 1.5–3.8 cm. |
| Unified inner loop: funnel stance reference, closed-loop double support toward the orbit, speed loop | **KEEP** as the frozen baseline inner loop | The beam oracle held 26–28 steps with it unchanged. Stance changes are evidence-gated (Part 15). |
| Placement decision layer: maps-mode single-step solve, global linear maps, `uRef` pull | **REPLACE** with the Physical Stepper planner | Typical 6–11 steps on every variant. The myopic oracle gives 13–19; the depth-2 oracle 26–28. Linear maps get worse with more data (mU1 14.7 → mU7 8.5 → mU8 4.5). |
| Global linear step maps as the planner's model | **REPLACE** | With phase / contact-conditioned local transition models plus a separate realized-action (execution) model and a continuation-feasibility model (Parts 10–13). |
| Objective: instantaneous speed at the step start, capture-point orbit targets | **REPLACE** | With stride-level speed, phase-matched state and a continuation cost (Parts 2, 13). |
| Matched-state step bench (`tools/g2_stepbench.js`) | **KEEP** | The execution-map instrument. |
| Identification pipeline (`uident.py`, `g2walk_ident.js`, `fit_maps.py`) | **KEEP as infrastructure** | It will log a richer state for the new models. |
| Jolt oracles (myopic, depth-2 beam) | **KEEP** as offline reference and teacher | Rebuilt on a worker pool with replay-from-scratch branching. That is exact by determinism, so no snapshot / clone risk. |
| Late correction via the inverse execution model (`ctrl.late`) | **EXPERIMENTAL** | Its realized-action model becomes the planner's execution model. As a stand-alone layer it did not help (6.8–8.3 steps). |
| `ctrl.preview`, `ctrl.Lref`, `walk.rocker`, `walk.ssHeelRise`, `human.descentGate / liftShape / blendACap`, flatter landing, `dsExtEnd` 0.99, stance gain k / funnel variants | **EXPERIMENTAL** (opt-in; not adopted) | Each measured; none moved the typical walk. |
| Stance mechanics changes (ankle impedance after load acceptance, push-off regulation) | **DEFER, evidence-gated** | Only through the Part 15 2×2 (stance × {planner, oracle}). |
| Yaw work, start / stop, speed envelope | **DEFER** | Parts 23–24, only once walking is robust. |
| Render skeleton (Unity Humanoid contract) | **KEEP AS DOCUMENTATION** (frozen) | `RENDER_SKELETON_CONTRACT.md`. Independent of the physics body. |
| Football actions (ball touch, strike, interception, release) | **DEFER** | Schema only (Part 6). |

## Conflicts between the reports and the repository's own earlier conclusions

1. **The recommendation "A: stance mechanics first" (my overnight review) is withdrawn.**
   - The repository's own beam oracle held 26–28 steps with the stance unchanged, which supports the planning-led order (Astra stance report; brief Part 15).
   - Stance stays evidence-gated.
2. **"The body gains speed over every single support" was presented as a defect. It is not, by itself.**
   - Human single support decelerates and then re-accelerates; the redirection spans the transition (Adamczyk & Kuo, via the Astra report).
   - The measured quantity that matters is STRIDE-level net horizontal impulse and stride-average speed drift. Single-support Δv on its own is not the measure (Part 2).
   - The overnight data remain valid, but are re-read in those terms.
3. **The overnight "CoP stays at the heel for 0.2–0.3 s" figure mixed two measurements.**
   - It used the sensor's COMBINED (whole-body) CoP, which in double support includes the trailing foot (Astra §D5).
   - From now on the CoP is reported only in single support (where combined = stance-foot CoP) or per foot where a per-foot moment balance is available.
   - The per-tick ankle-torque finding (damping −52 … −174 N·m holding the ankle on its dorsiflexion side during load acceptance) is a direct measurement. Whether it limits capability is untested. That is the first candidate for the Part 15 2×2.
4. **Step lengths need re-checking.**
   - "≈ 0.40 m oracle steps" were COMMANDED steps; "≈ 0.26 m controller steps" were achieved.
   - Actual opposite-foot touchdown distances must be compared before using either number (Astra §D8).
5. **The Stepper report gives no simpler physical walking algorithm** (its evidence is architectural). Nothing in it argues against the continuation-aware planner. Adopted from it: the contact-event interface, with football actions as constraints evaluated before feasibility.

## The architecture being built

```
requested locomotion (speed, heading)
   ↓
nominal gait generator: a few candidate support events (scaled by speed, leg geometry, measured state)
   ↓
continuation-aware planner: two contact transitions on a cheap surrogate
   (realized-action model + transition model + continuation feasibility), first action applied
   ↓
committed contact-event references (versioned; PROPOSED → ACCEPTED → EXECUTING)
   ↓
existing finite-motor execution (unified inner loop + inherited swing) — unchanged
   ↓
Jolt contacts → ACHIEVED / MISSED / INTERRUPTED / CANCELLED → replan from the actual state
```

The full-Jolt oracles stay offline (reference, teacher, diagnostic).
