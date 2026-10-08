# DIAGNOSTIC — locomotion viability probe (V2): no case reaches step 2; the first failure is the between-steps weight transfer (A, with a B component), not a structural limit. Verdict YELLOW

> **Diagnostic only.** This is not a qualification, not E2, and not walking.
> - No frozen criterion, official verdict, mechanism or controller behaviour changed.
> - Nothing here is evidence for or against E2.
> - Authority: `../../sources/2026-10-08_user_instruction_locomotion_viability_probe.md`.

**What was run, and the budget:**
- **Runs:** 16 at 240 Hz on 4 bodies, about 8 s wall time each.
- **Development:** one smoke run, then a measurement-only trace extension; all 16 final runs are hash-identical to their pre-extension versions.
- **Probes 2–4 were not run.** The stop rule applies: the same failure prevents step 2 on every body.

**Files:**
- Harness: `sandbox/visual/physchar2/tools/loco_probe.mjs`. It was later extended with the CF-1 counterfactual (`--cf=1`, default off, `../loco_cf1_2026-10-08/`); with `--cf=0` it reproduces these 16 runs bit-identically.
- Tables: `tools/loco_probe_report.mjs` → `LOCO_PROBE_TABLES.md`.
- Evidence: `evidence/*.json.gz`, one per run, with per-step records, the failure snapshot and a 60 Hz trace.
- Reproduction: `scripts/run_loco_probe.sh`.

## 1. What was composed (existing primitives only)

**Configuration: PSTAR5CHABV.** This is A + B + DVG, the most advanced adopted configuration (`e2/DVG2_RESULTS.md`).
- The TD2C touchdown coordinator did not validate, so it is **not** used.
- The tracked-clearance certificate has no validated allowance (SV-2R was not entered). It is computed and logged, not enforced: the declared E2-smoke diagnostic `diagNoClearance`, with the placeholder allowance 0 / 0 / 0.

**One continuous simulation per run.** Nothing is reset between steps, and nothing is added to the controller.

**The E2 lead-in:** settle, then the pelvis drops 25 mm over 1–3 s and is held.

**Per step (the swing leg alternates):**
1. **Weight transfer:** the E1b / G3 λ request, stance share 0.5 → 1, minimum-jerk over 4 s.
2. **Release:** the swing foot is TOUCHING for ≥ 0.5 s, the E2 protocol's rule.
3. **The E2 commanded step,** run by a fresh `ctrl/v2_step.js` StepSequencer per step:
   - the planner decides;
   - B1 lifts from the measured state;
   - swing (A30 trajectory, T = 0.6 s, apex 30 mm);
   - measured-contact acceptance and hand-back;
   - the DCM double-support plan back to the quiet-stance reference (T_ds = 4 s).
4. **DONE:** λ returns to 0.5, then the next step starts.

**Why a fresh sequencer per step:** the sequencer is a one-shot scheduler. Its per-step fields (airborne seen, accepted, contact times) persist after DONE. The controller never reads the sequencer, only its request fields.

**Two step kinds, both preregistered E2 commanded steps inside the planner's corridors:**
- **forward:** 0.10 m forward of the swing foot's own anchor. This makes a step-to gait. A step-through foothold, about 0.20 m from the anchor, lies outside the commanded corridor (0.07 – 0.13 m), so it cannot be commanded.
- **lateral:** 0.08 m outward. The feet stay side by side, which keeps the existing lateral transfer applicable.

## 2. Results matrix

Left-first and right-first runs are mirror-identical for every body. Each cell covers both.

| Body | Step 1 | Step 2 | 6 steps | 20 steps | faster cadence | first failure |
|---|---|---|---|---|---|---|
| V2-REF | ✓ forward, ✓ lateral | ✗ no liftoff (forward); transfer aborted (lateral) | not reached | not reached | not run (stop rule) | step 2, before liftoff — see §4 |
| V2-165-62 (light / short) | ✓ forward, ✓ lateral | ✗ same | not reached | not reached | not run | same |
| V2-198-92 (heavy / tall) | ✓ forward, ✓ lateral | ✗ same | not reached | not reached | not run | same |
| V2-long-legs (the class-B C-L11 saturation body that engaged DVG) | ✓ forward, ✓ lateral | ✗ same | not reached | not reached | not run | same |

**Summary (16 runs):**

| measure | value |
|---|---|
| completing 1 step | 100 % |
| completing 2 | 0 % |
| reaching 4, 6, 10 or 20 | 0 % |
| median consecutive steps | 1 |
| maximum consecutive steps | 1 |

**The failures are not catastrophic:**
- no fall;
- no slip (≤ 0.01 mm);
- no saturation storm;
- no energy anomaly.

Forward runs stop in a quiet, loaded double support. Lateral runs return to bilateral support through the supervisor. One failure mechanism dominates every body; its numbers scale with body size.

## 3. Step 1 is clean on every body (the state handed to step 2 is physically viable)

| step 1 | forward (8 runs) | lateral (8 runs) |
|---|---|---|
| liftoff after the command | 0.121 – 0.125 s | 0.121 – 0.125 s |
| contact, φ from liftoff | 0.910 | 0.917 – 0.924 |
| clearance min, φ 0.2 – 0.8 (apex 30.2 mm) | 6.50 – 6.52 mm | 6.78 – 6.84 mm |
| swing tracking error max | 1.45 – 1.84 mm | 2.08 – 2.65 mm |
| touchdown velocity, down / horizontal | 0.035 – 0.047 / 0.019 – 0.040 m/s | 0.039 – 0.048 / 0.025 – 0.039 m/s |
| foothold error vs. commanded | 1.21 – 1.67 mm | 2.48 – 3.30 mm |
| stance-foot slip / tilt | ≤ 0.01 mm / 0° | ≤ 0.01 mm / 0° |
| ξ margin to the stance foot in single support | 38 – 46 mm | 36 – 44 mm |
| p* outside the support | 0 | 0 |
| leg joint hard-limit margin | 11.9 – 12.5° | 10.9 – 11.6° |
| saturated axis-ticks | 1 – 2 | 8 – 12 |
| max Δτ0 per tick | 7.7 – 15.3 N·m | 12.5 – 30.2 N·m |
| positive energy closure (max per tick) | 0.035 – 0.053 J (≤ 0.007) | 0.021 – 0.036 J (≤ 0.005) |
| at DONE: ξ to the quiet-stance reference / COM speed | 4.1 – 5.1 mm / 0.011 – 0.013 m/s | 10.8 – 13.7 mm / 0.016 – 0.019 m/s |
| re-plans; liftoff re-certification | 0; certified | 0; certified |

The realised CoP was measured up to 13.5 – 26.4 mm outside the controller's usable-region polygon during the lateral steps, during acceptance. It is reported here and was not investigated.

**After step 1, every run sits in a quiet, symmetric double support:**
- both feet in SUPPORT;
- ξ within 4 – 14 mm of its reference;
- COM speed 1 – 2 cm/s;
- feet where they were placed.

By every recorded measure this is a viable initial state for another step. **But this is indirect evidence:** no second step was physically attempted, for the reasons below.

## 4. The first failure: the between-steps transfer cannot carry the body into the next single support

**Forward (8 / 8 runs), A — missing gait-level transfer planning.**
- After a 0.10 m forward step the feet are staggered.
- The existing transfer (G3, `ctrl/v2_stand.js`) moves the balance target only **laterally**, in the heading frame, to the λ-weighted point between the region centroids. Its forward coordinate stays at the double-support midpoint.
- The controller splits load by projecting p* onto the line between the two feet's region centroids, with the 10 % floor relaxed to the request.
- So with λ at full stance, the target sits laterally on the stance centroid but **47 – 55 mm behind it**. The projected stance share is only **0.858 – 0.876**.
- Distance is not the problem: the step-2 transfer needs 0.095 – 0.114 m, about step 1's. The forward component is what the primitive cannot follow.
- The controller commands exactly that, and the measured foot loads match to four decimals. The trailing foot keeps **12.4 – 14.2 % BW**, steady, against the lifecycle's 1 % release threshold.
- It is never released, so step 2 never lifts off.

Per body (left-first):

| body | stance centroid fwd − ξ_ref fwd | trailing foot, commanded = measured |
|---|---|---|
| V2-REF | 51 mm | 0.132 BW |
| V2-165-62 | 47 mm | 0.142 BW |
| V2-198-92 | 55 mm | 0.124 BW |
| V2-long-legs | 51 mm | 0.132 BW |

The transfer primitive was designed and validated (G3, E1b) for the quiet side-by-side stance only.

**Lateral (8 / 8 runs), B — transfer schedule vs. the supervisor's single-support test, on a wider stance.**
- After a 0.08 m outward step the feet are 0.25 m apart. The stance centroid lies 0.135 – 0.153 m from where ξ starts the transfer (the double-support midpoint). That is about 1.5 – 1.6 × the step-1 transfer, 0.083 – 0.100 m, which is the geometry E1b validated.
- Under the validated 4 s λ schedule, the requested stance share reaches the supervisor's 0.85 threshold while the DCM is still being driven toward that centroid: ξ is only 0.3 – 6.5 mm inside the stance region.
- To keep moving the COM, the required CoP trails between the feet, **14 – 29 mm outside the stance region**.
- The stance-only test (> 10 mm for 20 ms) aborts to bilateral support at once.
- This is correct supervisor behaviour for the request as scheduled. The λ (load) schedule and the DCM motion are not coordinated for this stance geometry.

**Common cause.** Walking needs the double-support phase to carry the DCM onto the next stance foot, in 2-D and for any stance geometry. The existing commanding layer is built around the opposite pattern:
- return to the double-support midpoint (the E2 DS plan, 4 s);
- then a quiet-stance lateral λ transfer.

That pattern only reaches a single support from the side-by-side stance it was validated on.

**C (fundamental limitation): no evidence.** Nothing measured in the body, contact, actuation or energy points to a structural problem. Every failure traces to commanding-layer primitives.

## 5. What sustained walking minimally needs, beyond what exists

**A, required:**
1. **A gait-level DCM / CoM plan through double support onto the next stance foot,** replacing "DS Hermite to the midpoint, then lateral λ transfer". It must work for staggered and wide stances, with the load (λ) schedule coordinated with the DCM motion.
2. **Continuous foothold planning relative to the stance foot.** The planner today:
   - certifies one step from quasi-static double support;
   - accepts anchor-relative corridors only: forward 0.07 – 0.13 m, outward 0.05 – 0.11 m, no inward or step-through targets;
   - decides from a quiet DCM.
3. **A supervisor / acceptance rule for planned single support during a moving transfer.** The stance-only CoP test assumes λ and ξ arrive together.

**Needed for cadence:**

4. **Overlapping phases.** The default composition spends about 10 s per 0.10 m step:
   - 4 s transfer;
   - about 1.3 s release;
   - 0.12 s lift;
   - about 0.55 s swing;
   - 4 s DS plan.

   That is about 0.01 m/s.

**Known, still open:**

5. **Recovery-step touchdown** (R-B unsolved; TD2C applies to commanded steps only).

**Running (not present, not built here):**

6. A flight phase, ballistic / impact planning, and the timestep-dependent impact ledger issue (TD-15, TD2C U-1).

## 6. Higher-cadence probe (Probe 4): not reached

Probe 4 runs only where ordinary chaining shows some viability, and no case completed a second step. The only timing observation possible: in the single step, the fast part already behaves well (a 0.6 s swing, touchdown at under 5 cm/s, contact at φ 0.91). The cycle time is dominated by the quasi-static transfer and double support, which are exactly the parts identified in §5.

## 7. Verdict: YELLOW

**Why not GREEN:**
- Zero repeated steps were demonstrated.
- The chain-level dynamics are untested: state-error growth over steps, drift, double-support shortening, touchdown at higher speed.
- Step 1 says nothing about them.

**Why not RED:**
- Step 1 is clean and consistent across the reference, light / short, heavy / tall and long-legs bodies, in both directions, on both sides.
- The post-step state is quiet and inside the support.
- Both step-2 failures are fully explained by commanding-layer primitives built for the quiet parallel stance. None is a body / contact / actuation / energy problem.

**Why YELLOW and not "minor":**
- The missing piece is a whole layer: gait-level double-support / DCM planning plus continuous foothold planning, not a parameter.
- Until it exists, V2 cannot initiate a second step with legitimate mechanisms.

**Implication for the qualification path:**
- The next walking blocker is not a first-step edge case such as TD2C's obs20 at 180 / 240 Hz. It is the absent between-steps transfer.
- That argues for scheduling the gait-level DS / transfer design, or at least the counterfactual below, before more first-step polishing.

**What would change the verdict: proposed next diagnostic (needs the user's approval, because it supplies a missing mechanism).**
- **CF-1:** a counterfactual, explicitly labelled and never counted as V2 capability.
  - The between-steps DCM reference comes from the existing DCM layer's Hermite: from the measured state to the next stance foot's region centroid, in 2-D, over the transfer time.
  - It is delivered through the existing request fields (`xiRef` / `xiRefDot`).
  - Everything else is unchanged.
- **Then:** rerun Probes 1 → 3, and Probe 4 if chaining works. About 16 – 30 runs, minutes of compute.
- **What it would test:** whether the body / contact / control architecture chains steps once that gap is filled. That evidence decides GREEN vs. a C finding.

## 8. Harness notes

**Hash neutrality.** The trace extensions added after the first run (foot loads, commanded shares, region margins, the failure's load-split geometry) are read-only. All 16 final runs reproduce their earlier end hashes.

**Defect caught before any probe run.** A mid-line `//` comment swallowed the rest of a line in the harness: the recorded defect class, as in E2 I-1 and while writing the DVG2-E1 fix. `node --check` caught it, and the comment was moved.

**What was not changed:**
- no production, controller, planner, lifecycle or criterion code;
- `e2_run.mjs` and the E2 tools;
- the DECISIONS register.
