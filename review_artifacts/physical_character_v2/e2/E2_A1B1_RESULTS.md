# E2 after amendment A1 + B1 (PSTAR5B): planning gate still FAILS → STOPPED before the official run

**Authority:** user decision 2026-10-06 (`../sources/2026-10-06_user_decision_e2_A1_B1.md`). Amendment: `E2_PREREG_AMENDMENT_A1B1.md`.

**Done:**
- A1 and B1 implemented and versioned (option `e2: 2`, configuration PSTAR5B);
- identity — PASS;
- planning gate under A1 / B1 — **PG-1 FAIL**;
- one non-test diagnostic smoke under B1.

**Not done:** freeze, any official stage. No commanded step was CERTIFIED_ONE_STEP, so per the decision none was executed officially.

**Unchanged:** every numerical threshold; the apex; the window; the recovery code path; the recovery smoke evidence.

## 1. Correction of my previous report

`E2_PRE_OFFICIAL_RESULTS.md` reported the clearance certificate failing "at φ 0.20". Under the frozen seeds the reference is symmetric, so it failed equally at **φ 0.80**:
- the margin was 2.9 mm at both ends, and my planning-only check printed it;
- the report did not say so;
- so A1 (moving the window origin to liftoff) could not fix the descent end.

I should have stated both ends.

## 2. Identity (`evidence_identity/A1B1_*`, `kv0_hashcmp_A1B1.txt`)

All bit-identical after the A1 / B1 code:
- KV0;
- PSTAR5 records SMK-1 / SMK-1D / SMK-R (the recovery smoke evidence is preserved unchanged);
- PSTAR4 E1b P15;
- PSTAR5B on non-stepping and class-A E1b runs (none, PF, P15).

Browser = Node holds on the B1 path (SMKB1D).

## 3. Planning gate under A1 / B1 (`evidence_pg_A1B1/`)

**PG-1 — FAIL. 32 / 32 commanded decisions are NO_CERTIFIED_ONE_STEP.**

| | forward | lateral |
|---|---|---|
| timed capture, plan VRP, reach, path | certified | certified |
| clearance certificate, φ ∈ [0.2, 0.8] of the post-liftoff swing | **fails at φ 0.80: margin 2.4 mm** (envelope 3.0 mm) | **fails at φ 0.80: margin 2.8 mm** (envelope 2.6 mm) |
| start of the window, φ 0.20 | passes (reference 10–12 mm) | passes |

**Cause, geometric:** with the 25 mm apex, BLF's spline puts the reference only **5.3–5.5 mm** above the turf at φ 0.80 of the post-liftoff swing. Any tracking envelope above 0.4 mm fails the 5 mm requirement there.
- This descent shape is BLF's: the apex-knot solve is numerically identical to BLF's QuinticSpline 2×2 interior-knot system (verified against the source, `src/Math/include/BipedalLocomotion/Math/QuinticSpline.h`).
- The apex construction is identical to BLF's SwingFootPlanner (`max(contacts) + step_height` at `foot_apex_time · duration`).

## 4. Diagnostic smoke under B1 (non-test; certificate logged, not enforced)

**SMK-B1D:** V2-REF, left swing, 0.07 m forward. 13 / 16 criteria pass.

| item | measured |
|---|---|
| liftoff | measured AIRBORNE +0.162 s after the command (lift profile; planning value 0.171 s). Foot 0.75 mm up, lift reference 2.70 mm |
| swing start | from the measured foot state (no teleport); applied torque change 3.0 N·m, commanded 12.7 N·m |
| touchdown | at φ 0.99 of the post-liftoff swing (planned liftoff + 0.60 s); total step 0.76 s, not compressed |
| placement | 3.3 mm; final step 7.32 × −0.05 cm |
| stance foot | 0.013 mm |
| DCM prediction error | 1.2 / 2.4 / 0.4 mm |
| E2-17 | clean |
| **E2-3 FAIL** | clearance **3.3 mm at φ 0.20** (≥ 5 first at φ 0.257); tracking max 8.4 mm (passes 10), **RMS 5.6 mm** (limit 5) |
| **E2-5 FAIL** | horizontal approach **0.064 m/s** (limit 0.05) |
| E2-18 (diagnostic) | the liftoff re-certification is NO_CERTIFIED (clearance at φ 0.80) |

**Tracking profile.** The 4 Hz swing servo (no acceleration feed-forward) lags the post-liftoff reference:
- the foot is up to 6 mm **below** it while rising (φ 0.2 – 0.4);
- it is up to 6 mm **above** it while descending (φ 0.7 – 0.9).

So physically the rise end fails (3.3 mm at φ 0.20) and the descent end has margin (9.5 mm at φ 0.80). The planning certificate subtracts a symmetric bandwidth envelope and fails at the descent end. **A sign-aware prediction of the servo response would move the planning failure to the rise end, where the measurement fails too.** The outcome therefore does not hinge on how the certificate is formulated.

## 5. Implementation defects found in the B1 diagnostic and corrected (before any official run)

| # | defect | correction |
|---|---|---|
| I-11 | Re-anchoring the swing target to the measured foot (B1) is a one-tick target change. The swing velocity feed-forward differenced it into a −0.43 m/s desired velocity: 88.6 N·m commanded jump, foot thrown back onto the turf 17 ms after liftoff | Treated like the controller's existing "anchor re-captures are never differentiated" rule. The target-motion feed-forward skips that one tick (`e2reanchor`, set only by the sequencer; the default path is bit-identical) |
| I-12 | Early-contact acceptance checked only that the contact location was feasible. The thrown-back foot was accepted as a zero-length "step"; the evaluator's comparison with the replaced foothold passed it | The planner keeps the current foothold while it certifies (commanded: nominal priority). A contact location is adopted only when the current foothold fails, and is then a genuine planner decision |

## 6. Classification and what a fix would change

**Root cause:**
- the swing servo's bandwidth lag (4 Hz, velocity feed-forward only) against the frozen 0.6 s / 25 mm trajectory, measured at about 6 mm, with the 5 mm clearance requirement over φ 0.2 – 0.8;
- for the planning certificate additionally the frozen apex: 5.4 mm reference at φ 0.80 leaves 0.4 mm for any envelope.

**Every remaining lever** changes architecture, a physical / controller constant, or something you excluded:

| option | changes | expected effect |
|---|---|---|
| **D1** swing acceleration feed-forward (the swing leg's own inverse dynamics on the reference acceleration), with the planner's clearance certificate predicting the servo's actual tracking response instead of a symmetric bound | controller architecture (swing servo), planner model | removes most of the lag: E2-3 rise clearance, RMS and E2-5 likely pass; descent clearance physically favourable. Needs planning + smoke verification |
| **D2** raise the swing servo bandwidth (lifecycle constant `swingHz` 4) | a lifecycle constant shared with E1a / E1b | lag ∝ 1/ωn² (6 Hz: about 0.44×); full E1a / E1b re-validation needed |
| **D3** lengthen the provisional swing seed T (e.g. 0.8 s) | a provisional seed | lag about 0.56× at the rise; the φ 0.80 reference height (5.4 mm) is unchanged, so the planning certificate still fails |
| apex / window / thresholds | A2 / A3 / B2 | excluded by your decision |

**Recommendation: D1.** It removes the cause (missing acceleration feed-forward) rather than trading margins. It keeps every threshold, the apex, the window, the BLF profile and the lifecycle constants. It makes the planner's clearance certificate model the actual servo. Recovery issue C stays deferred.
