# Ankle neutral-zone stiffness re-investigation on the corrected (flat-plane) plant: PRE-REGISTRATION (Phase F + Phase G)

**Status: PRE-REGISTERED.**
- Committed before any k > 0 run of this phase. The draft history is in git (`f85e396` and earlier).
- **Nothing is adopted by this investigation.** The code default stays k = 0.

**Sources:**
- `../sources/2026-10-04_user_decision_j2a_gate_ankle_ik_research.md`, Decision 3 and Phase G (verbatim there);
- earlier: `../sources/2026-10-03_user_decision_flat_plane_turf_reopen_g1.md` §10 / §12 and `../sources/2026-10-03_user_decision_j2_split_ankle_reinvestigation.md` (the 8 requirements and the measurement list).

**Precondition: met.**
- G0 PASS, G1 PASS, G2 PASS on the final symmetry package.
- **G3 PASS 20/20 under criteria v3.3** (`bb0ec47`, `../g3/G3_CRITERIA_v3.3.md`).

**Preserved, unchanged:**
- flat-plane turf, accepted anatomy, accepted actuator capacities, accepted contact architecture;
- corrected foot regions, controller-boundary quaternion normalisation, corrected deterministic IK;
- the G0 / G1 / G2 / G3 baselines (their committed k = 0 results are not overwritten).

**The earlier ankle results are history, not evidence for this decision.** They were measured on the box turf (reversed-manifold defect, Investigation B): `../g3/G3_ANKLE_LAW_STOP_REPORT.md`, `../ankle_law_k010_validation/`, `../ankle_law_sensitivity/`.

## The law (unchanged form; only k varies)

- **Form:** G3-R7, implemented in the passive layer (`spec/v2_joints.js`) and selected by the Node-only env `V2_ANKLE_NEUTRAL_K` (N·m/°).
- **Axis:** the passive-only ankle foot ab/adduction (whole-complex internal / external rotation about the tibial axis).
- **Shape:** linear inside the approved ±10° soft range, centred at the anatomical neutral; saturating at k·10° beyond it.
- **On top, unchanged:** the approved end-range law and end-stop.
- **Properties:** conservative, convex, restoring, internal = external rotation, L = R.

## Evidence and candidates (fixed now; no values added after seeing results)

| source (full text) | measurement | secant at 1.7 N·m |
|---|---|---|
| Hattori 2022 | cadaver, 5 N axial load, calcaneus vs tibia, subtalar free | 0.12–0.14 N·m/° |
| Watanabe 2012 (Int Orthop) | in vivo, unloaded, whole complex | 0.11–0.15 N·m/° |

**Candidates:** **k = 0.11, 0.13, 0.15** N·m/° (the lower bound, centre and upper bound of [0.11, 0.15]).

**Baseline:** **k = 0** on the plane. Its gate results are the committed final runs. The phase-specific tools (twist, rate sweep) are run at k = 0 too.

**Removed from the draft:**
- the report-only continuity point k = 0.10. The decision lists exactly k = 0 / 0.11 / 0.13 / 0.15, and Investigation B already settled the box-turf contamination question.
- Out-of-range values (0.3 / 0.5) are not tested.

## Execution

- **Where:** each k runs in a scratch copy of `sandbox/visual/physchar2` taken at this pre-registration's commit, with `V2_ANKLE_NEUTRAL_K = k` (inherited by every forked worker). The ROOT-relative outputs land in the scratch copy.
  - Each k's results are then copied (compressed) to `ankle_plane/k<k>/`.
  - The repository's committed k = 0 results and the viewers are never touched.
- **Battery per k, in order:**
  1. G0 `g0_run.js`;
  2. G1 `g1_run.js`, criteria v4;
  3. G2 `g2_run.js`, 620 jobs;
  4. G3 `g3_run.js`, 332 jobs;
  5. `g3_mirror_pairs.mjs`;
  6. `g3_mirror_v3.mjs` (J2a gate + J2b diagnostic);
  7. `g3_earlier.mjs`, `g2_report_tables.mjs`, `g1_report_tables.mjs`, `g3_report_tables.mjs` (criteria v3.3);
  8. `g3_twist.mjs`, V2-REF, plus the same twist set on all 8 bodies (`--human=`; morphology sensitivity);
  9. **Phase G:** `b_sweep.mjs --set=rate` with `B_TURF=plane` (4 scenarios + V1 singleLeg × 180 / 240 / 360 / 480 / 720 Hz × 5 lift perturbations), plus `--set=g1` with `B_TURF=plane` (the G1 validation set with the per-step energy invariant).
- **Every requirement is evaluated and reported for every candidate, even after a failure.**

## Requirements per candidate (all must hold; same tools and criteria as the accepted gates; nothing loosened)

| # | requirement | measured by | pass |
|---|---|---|---|
| A | **remains passive; no unexplained energy creation** | G0 (incl. 0.9n); G1 rig (row 5); G1 energy rows; G1 row 1.2e per run; G2 row E / G3 row L ledger residual | G0 PASS; rig 34/34; G1 energy rows pass; **no 1.2e flag in any G1 run at ≥ 240 Hz**; every G2 / G3 gate-run ledger residual ≤ +0.5 J |
| B | **passes G1** (incl. contact validity) | full `g1_run.js`, criteria v4: 1.4m turf validity and 1.4n envelope gate; 1.4k teleport reported | **0 failing gate checks**; changes against k = 0 reported |
| C | **materially reduces the free ankle / shank twist** | `g3_twist.mjs` (V2-REF) | in the G3 pre-step states (**T5 and U:R**, both legs) the max ankle ab/adduction excursion is **≤ ½ of the k = 0 plane value**, **and every torque-step probe re-centres**: \|offset 5.9 s after release\| ≤ 2° (λ 0.5 … 1.0, both sides, 0.5 and 2 N·m) |
| D | **preserves G2** | full 620-job `g2_run.js` | every criteria-v1 row passes, except R (superseded) and 2.5 (isolated benchmark, not k-dependent); **no push-boundary decrease** in any body × direction vs k = 0; symmetry rows pass; outcome changes reported |
| E | **preserves G3** | `g3_run.js` + mirror tools, criteria v3.3 | **every gating row passes**. Rows needing the law in the browser (O, and P2's browser parts) and the isolated benchmark (S2 / P2 2.5, k-independent code paths) are **deferred to a presented candidate** (a diagnostic, default-off viewer parameter, documented with the result) |
| F | **no unacceptable unloaded-foot dragging or compensatory behaviour** | U:R / U:L for all 8 bodies (rows F2, I2); twist set | unloaded foot ≤ 2 % BW, slip ≤ 2 mm, lift ≤ 5 mm, tilt ≤ 3° in every U run of every body (the F2 limits); world yaw, hip / knee counter-rotation reported |
| G | **valid across morphology variants; acceptable anatomical excursions** | G1 row 6 + D3a excursion table; G2 (8 bodies); G3 I2 (8 bodies); twist set on 8 bodies | all pass; settled excursions within the G1 1.5° compliance; the engine end-stop is used for emergencies only (as at k = 0) |
| H | **energy events explained (Phase G)** | `b_sweep` (plane) rate and g1 sets; `b_capture` + `b_ledger_table` for every event | see the Phase G rule below |

### Phase G rule (180 Hz and every other energy event)

**Event:** a step with ΔE > 0.05 J (the 1.2e floor), where E = KE + PE + U, from the per-step invariant of `b_sweep`.

**H1 (gating):** at **240 / 360 / 480 Hz**, no event that is not also present at k = 0 in the same run.

**H2 (gating):** every event at any rate (including 180 and 720 Hz) is traced to its **first bad tick** with the **complete energy ledger**. Ledger terms: work of gravity, contact, joint point constraints, hard-stop parts, passive drives, explicit passive torques and gyroscopic terms; ΔU and ΔPE split into velocity integration and position correction.

Each event is classified as one of:
1. a legitimate release of stored passive potential;
2. a numerical integration error;
3. an end-stop / passive-law interaction;
4. a timestep instability;
5. a Jolt / contact artifact;
6. an instrumentation error.

The candidate **fails H** if any event:
- (i) remains unexplained; or
- (ii) shows **net** energy creation: the cumulative residual Σ (ΔE + D_viscous) over the window from the first bad tick to 0.25 s after exceeds +0.5 J; or
- (iii) is a defect of the ankle law or its integration that **does not converge with rate** (the error must decrease from 180 → 240 → 360 → 480 → 720 Hz from the same captured state, dt halving), **and** occurs in states reachable in plausible football motion.

"Plausible" means ankle / leg excursions within the envelope visited by the G2 / G3 gate runs, or by the G1 non-stress scenarios. That envelope is measured, not assumed.

**Stop:** if this exposes a foundational passive-law defect, it is investigated in depth and reported before any candidate is chosen.

**Never:** 240 Hz passing does not excuse an unexplained event at another rate. Passivity criteria are not loosened.

## Measurements per candidate (reported before / after against k = 0; never used to choose)

- **Ankle behaviour (`g3_twist`, V2-REF and 8 bodies):**
  - ankle internal / external rotation (ab/adduction);
  - shank rotation relative to the planted foot;
  - hip counter-rotation; knee rotation;
  - passive ankle torque; actuator torque (ankle DF / inversion);
  - ground vertical moment and free moment;
  - loaded vs unloaded behaviour (stance-leg and unloading-leg bins);
  - settling / re-centring (torque-step probes).
- **Standing / pre-step:** CoP, foot slip, unloaded-foot movement / drag, push boundaries, actuator utilisation, symmetry (G2 / G3 results).
- **Passive physics:** G1 rows, falls, resting behaviour, morphology variants, rates (G1 row 8 ensemble + `b_sweep` rate set), energy / passivity (1.2e, ledger residuals, the passivity-residual floor).

## Selection rule (fixed now; never by G3 score)

1. **Evidence-supported:** a candidate in [0.11, 0.15] that meets **A–H**.
2. **If none is,** stop and report why each failed. **No other value is tuned or added.**
3. **If several are,** rank them by:
   1. biomechanical evidence;
   2. passive-physics integrity;
   3. human-like ankle / shank twist;
   4. G2 behaviour;
   5. G3 behaviour;
   6. morphology robustness;
   7. rate robustness;
   8. simplicity.

   **G3 row values are never used to choose.**
4. **Recommendation and stop:**
   - If choosing among valid candidates involves a meaningful trade-off, **stop for the user's decision**.
   - If one candidate is uniquely supported by the evidence and all validation with no meaningful trade-off, recommend it strongly, and **still stop before adoption**.
5. **A presented candidate's browser = Node checks** (G1 1.6c, G2 D, G3 O) are run through a diagnostic, default-off viewer parameter, documented with the result.

## Stop conditions

Stop for the user's decision on any of:
- a material architectural incompatibility;
- an engine-level event (any 1.4m / 1.4n violation, any blow-up) at a candidate k;
- a need to change anatomy, mass / inertia, joint limits, actuator capacity, foot dimensions, the skeleton contract, the physics rate, controller tuning, criteria, or the law's form.

No G4. No foot lift, swing, touchdown, stepping or walking. Nothing pushed.
