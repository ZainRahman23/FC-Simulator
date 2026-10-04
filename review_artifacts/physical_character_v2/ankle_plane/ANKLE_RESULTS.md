# Ankle neutral-zone stiffness re-investigation (Phase F) and the 180 Hz energy event (Phase G): results

**Pre-registration:** `ANKLE_REINVESTIGATION_PREREG.md` (`4b544ca`), committed before any k > 0 run.

**Source:** `../sources/2026-10-04_user_decision_j2a_gate_ankle_ik_research.md`, Decision 3 and Phase G.

**Status: no candidate is evidence-supported under the pre-registered requirements with the validated controller.**
- **Nothing is adopted.** The code default stays k = 0.
- The mechanism behind the failures is identified (§3). Proceeding needs a **controller design decision** (§6), so this stops for you.

**Data:**
- per-k results (compressed): `k0.11/`, `k0.13/`, `k0.15/`;
- k = 0 twist sets: `k0/twist/`;
- Phase G: `phaseG/`;
- held-out attacks: `evidence/`.
- All runs were on the pre-registration commit's code, in scratch copies; the repository's k = 0 results were never overwritten.

## 1. Pre-registered requirements per candidate

| # | requirement | k = 0.11 | k = 0.13 | k = 0.15 |
|---|---|---|---|---|
| A | passive; no unexplained energy creation | **pass** | **pass** | **pass** |
| B | G1, 0 failing gate checks | **FAIL** | **FAIL** | **FAIL** |
| C | twist ≤ ½ of k = 0 in T5 / U:R **and** every probe re-centres | **FAIL** | **FAIL** | **FAIL** |
| D | G2 rows, no boundary decrease | **FAIL** | **FAIL** | **FAIL** |
| E | G3 v3.3 gating rows | **FAIL** | **FAIL** | G3 rows pass (P2 fails only through B / D) |
| F | unloaded foot (≤ 2 mm slip in every U run) | **FAIL** | **FAIL** | **pass** |
| G | morphology | **FAIL** | **FAIL** | **pass** |
| H | energy events explained (Phase G) | **pass** | **pass** | **pass** |

**Details by requirement:**

- **A (all pass):**
  - G0 PASS (run from the repository with `--out`; 0.V1 is a repository guard);
  - G1 rig 34/34; G1 energy rows pass; G1 1.2e: 0 flags;
  - G2 E residual max −0.28 J; G3 L max −0.29 / −0.29 / −0.30 J.
- **B (all fail):**
  - k = 0.11: 1.S′, V1-matched perturb 1.3d 1.74° (knee_L axial rotation);
  - k = 0.13: 1.S (V2-REF upright 1.3d 2.10°, elbow_R) and 1.S′ (V1-matched upright 2.05° lumbar rotation; leanR 1.4b 5.03 mm; perturb 2.39° knee_L axial);
  - k = 0.15: 1.S′, V1-matched perturb 1.4e 5.31 mm and 1.R (not at rest);
  - (1.V1 is the repository guard, not applicable in the scratch copies.)
- **C (all fail on the probes; the T5 / U:R half-condition passes):**

  | k | T5 / U:R twist | probes not re-centred (of 20) |
  |---|---|---|
  | 0 (reference) | 11.1° / 11.1° | 16 |
  | 0.11 | 3.5° / 1.9° | 19 |
  | 0.13 | 1.6° / 1.6° | 5 |
  | 0.15 | 1.3° / 1.4° | 4 |

- **D (all fail on S4):**
  - k = 0.11: roll 4 / 8 final trunk 4.1° / 7.0°;
  - k = 0.13: roll 8 3.09°;
  - k = 0.15: yaw 4 / 8 3.9° / 3.6° (limit 3°);
  - **0 push-boundary changes at every k.**
- **E:**
  - k = 0.11: row D (T4 yaw drift Δ 3.3° vs ≤ 1°) and I2 (6/8);
  - k = 0.13: D (Δ 1.07°) and I2 (7/8);
  - k = 0.15: every G3-native row passes, including J2a 81/81, D, I2 8/8, F2, H;
  - the browser parts of P2 and S2 are deferred, as pre-registered.
- **F:**
  - k = 0.11: unloaded-foot slip V2-190-85 2.05 mm, V2-198-92 2.06 / 2.28 mm;
  - k = 0.13: V2-198-92 2.17 / 2.03 mm;
  - k = 0.15: ≤ 2 mm everywhere.
- **G:** G1 variants 40/40 at every k; G3 I2 fails at 0.11 and 0.13.
- **H:** see §4.

**Changes against k = 0 that are not failures:**
- **G2:** 0 boundary changes at every k. One report-only arm (kξ 0.5, push R 25 N·s) flips to "recovered" at every k; at k = 0.15, S4 roll 16 also goes relocated → recovered.
- **G3:** two report-only outcome changes at every k (knee 10° arm recovered; hip-unbounded strategy arm relocated), and 10 abort shifts of ±1–2 ticks, identical within each mirrored pair.

## 2. Measurements (V2-REF twist set; before / after against k = 0)

Ankle ab/adduction (internal / external rotation) excursion, max of both legs:

| scenario | k = 0 | 0.11 | 0.13 | 0.15 |
|---|---|---|---|---|
| G2 push R 10 | 11.8° | 9.2° | 6.2° | 5.6° |
| G2 push R 20 | 13.6° | 12.2° | 11.9° | 11.6° |
| G3 T5 (near-single-support) | 11.1° | 3.5° | 1.6° | 1.3° |
| G3 U:R (swing-ready) | 11.1° | 1.8° | 1.6° | 1.4° |
| G3 T7 1 s ramp | 13.1° | 12.0° | 11.5° | 11.1° |
| G3 T8 hold push R 10 | 13.2° | 10.5° | 6.2° | 5.1° |

- **Shank rotation relative to the planted foot:** equals the ankle ab/adduction within 0.3°.
- **Hip counter-rotation:** about 0.75 × the ankle value (T5: 10.1 / 2.7 / 1.5 / 1.3°).
- **Knee axial rotation:** ≤ 0.6° throughout.
- **Pelvis yaw excursion (T5):** 2.0 / 2.2 / 0.3 / 0.2°.
- **Passive ab/adduction torque:** T5 ≤ 0.10–0.39 N·m; pushes ≤ 0.6–6.1 N·m (k = 0 end range included).
- **Loaded vs unloaded** (T5 bins, k = 0 → 0.15):
  - stance leg at 0.8–0.9 load: 11.1° → 1.3°;
  - unloading leg at 0.15–0.3 load: 10.7° → 0.7°.
- **CoP, slip, actuator use:** G2 / G3 row values change only marginally. Slip in U runs is ≤ 0.7 mm for V2-REF at every k; heavy bodies are under F.
- **Settling / re-centring:** see C and §3.
- **Morphology:** T5 / U:R twist at k = 0.15 is 1.3–1.6° in 7 of 8 bodies, but **4.4° in V2-198-92**. Probes not re-centred: V2-190-85 15/20, V2-198-92 17/20, short-legs 9/20.
- **Rate:** G1 row 8 (180 / 240 / 360 / 720 Hz) passes at every k. Rate sweeps: §4.
- **Energy / passivity:** A, and §4.

**Reading:** the law removes most of the twist in slow transfers and moderate pushes for most bodies, as intended. It does not remove it after large or fast disturbances (it saturates beyond ±10°), and not in the heavier bodies.

## 3. Mechanism: the residual twist is an actuator-powered limit cycle of the controller (held-out attacks, `evidence/twist_mode_*`)

**Tool:** `tools/twist_mode.mjs`: 20 s after thorax angular impulses (roll / yaw / pitch 4 and 8 N·m·s) and pushes (R / F 15 N·s); bodies V2-REF, V2-165-62, V2-198-92; amplitude envelope of the ankle ab/adduction and pelvis yaw.

**Validated controller (twist DOFs held at their current values in the posture IK):**

| body | k = 0 | k = 0.11 | k = 0.13 | k = 0.15 |
|---|---|---|---|---|
| V2-REF | roll 8 / yaw / push R: **sustained** 8–11° | **growing** after roll 4 (4.6 → 9.9°), sustained otherwise | sustained / growing slowly | **decaying** (time constant ≈ 8–9 s) |
| V2-165-62 | decaying | decaying | decaying | decaying |
| V2-198-92 | sustained 9–12° | growing / sustained ≈ 10.5° | growing / sustained | **growing after roll 4 (2.9 → 9.7°), sustained otherwise** |

**What the energy ledger shows** (15–20 s window):
- **Sustaining** cases: passive dissipation ≈ actuator net work (k = 0, V2-REF, roll 8: 1.24 J vs +1.16 J; k = 0.15, V2-198-92, roll 4: 1.64 J vs +1.68 J). **The passive plant only dissipates; the actuators power the oscillation.**
- **Diagnostic `ikRefTwist`** (the evaluated, not adopted option G3-A7: twist DOFs solved at reference): the oscillation **decays or stays quiet at every k for every body** (one exception, a push that falls anyway).
- **The cause** is therefore the posture IK's "hold the redundant twist DOFs at their current value" policy. The actuated hip / knee rotators follow the twist and feed it.

**Consequences:**
- **The pathological free twist at k = 0** (G3-F1 / TD-11) is not only an absence of passive stiffness. Under the validated controller it is a **self-sustained, actuator-powered limit cycle** after medium disturbances, in two of three bodies.
- **A passive stiffness alone cannot meet the pre-registered requirements robustly.**
  - At 0.11 / 0.13 it makes the mode **grow** in V2-REF / V2-198-92: it saturates at the ±10° zone edge and the restoring torque stops growing.
  - At 0.15 it damps V2-REF but not V2-198-92.
- **The S4, C, D, F and I2 failures are faces of this mode:**
  - "final trunk within 3°" samples a still-oscillating twist;
  - the probes don't re-centre;
  - T4 yaw drifts;
  - the heavy bodies' unloaded feet are dragged.

**With `ikRefTwist`** the whole-body static yaw stiffness becomes the passive ankles in parallel:

| k | yaw stiffness with `ikRefTwist` |
|---|---|
| 0 | 0.10–0.40 N·m/° |
| 0.11 | 0.23–0.34 N·m/° |
| 0.13 | 0.26–0.34 N·m/° |

That is about 2k, against **2.8 N·m/°** (λ 0.5) actively produced by the validated controller. Under the validated controller with k > 0, the yaw-stiffness measurement is phase-contaminated by the oscillation (readings 0.5–46 N·m/°).

**G1 1.3d at k > 0 (knee axial rotation in prone rest):**
- V1-matched "perturb" settles with the left knee axially 1.4–2.4° beyond its (screw-home-narrow) hard limit at every k > 0; at k = 0 it is 0.19° (lumbar).
- **Plausible mechanism:** a stiffened ankle passes the leg's axial load to the knee's end-stop, where a free ankle used to absorb it.
- Perturbed-ensemble failure rates at 240 Hz: §5.

## 4. Phase G: the 180 Hz energy events (rule H)

**Sweeps** (`phaseG/`; `b_sweep`, plane turf):
- **rate set:** 4 scenarios × 5 lift perturbations + V1 singleLeg × 180 / 240 / 360 / 480 / 720 Hz, 125 runs per k;
- **G1 set:** the G1 validation runs with the per-step energy invariant, 254 runs per k.

**H1, at 240 / 360 / 480 / 720 Hz:**
- 0 steps above 0.05 J at every k, in both sets; 0 invalid turf manifolds.
- The 240 Hz maximum rise, 0.0089 J, is the same at every k. **Pass at every k.**

**H2, events (> 0.05 J) at 180 Hz only:**

| k | runs with an event (of 25) | largest step | runs > 1 J |
|---|---|---|---|
| 0 | 5 | 0.79 J | 0 |
| 0.11 | 7 | 7.21 J | 3 |
| 0.13 | 5 | 0.65 J | 0 |
| 0.15 | 5 | 6.92 J | 1 |

Each traced to its first bad tick with the full ledger (`tools/phaseG_events.mjs`, `tools/b_capture.mjs` + `b_ledger_table.mjs`):

**(a) drop1m landing** (every k, ≤ 0.77 J):
- **State:** deep squat; knees 148–150°; ankles DF 47–53°, inversion 38–41°, ab/adduction 12–13°.
- **What happens:** the passive potential of the knee and ankle end ranges oscillates step to step at dt = 1/180 (ΔU +0.6 / −0.3 J, alternating).
- **Net:** the 0.25 s window is strongly negative (k = 0: −30.7 J). From the identical pre-event state at 240 / 360 / 480 / 720 Hz: **no step gains energy**.
- **Present at k = 0.**

**(b) awkward passive fall** (k = 0.11 and 0.15 only, about 7 J, t = 0.311 s):
- **First bad tick** 55 → 56. The right ankle swings **in mid-air** (contact work −0.02 J; landing at tick 60) into **triaxial end range**: ab/adduction 13.7 → 20.8°, DF 46–50°, inversion 30–38°.
- **Energy enters as ΔU from velocity integration** (+7.20 J), while the passive drive rows do −0.03 J. So the configuration-evaluated potential of the stiff approved end-range law rises without the corresponding torque work (semi-explicit integration of a stiff spring entered at speed).
- **The next step returns it** (−12.0 J). Window net −690 J.
- **From the identical state:** 6.92 J (180 Hz) → 0.51 J (240 Hz) → 0 (360 / 480 / 720 Hz): **it converges with dt.**
- **Why k matters:** the neutral law itself (saturating at 1.5 N·m) cannot store 7 J. k only changes the trajectory, so the ab/adduction axis reaches its end range.

**Classification:**
- **Numerical integration error of the stiff passive end-range law at a large timestep** (end-stop / passive-law interaction × timestep).
- Not a legitimate release of stored potential (it vanishes with dt).
- Not contact or Jolt (no contact work, no invalid manifold, no position-correction teleport).
- Not instrumentation (the ledger closes: ΔKE ≈ W gravity, ΔPE consistent).

**Reachability:**
- Only in passive-fall stress states, with the ankle simultaneously at 20.8° ab/adduction, 46° DF and 38° inversion.
- The G2 / G3 gate envelope reaches ≤ 13° ab/adduction, with small DF / inversion.
- 180 Hz is not a validation rate.

**Verdict:**
- **H passes at every k.** There is no net creation and no non-convergent reachable defect.
- **Not a foundational passive-law defect.** It is the known 180 Hz accuracy limit of the end-range law (TD-1 / TD-15), present at k = 0. The ankle law adds events only by steering passive falls into the ab/adduction end range.
- **Recorded, not dismissed:** the same-state replay still shows 0.51 J at 240 Hz. 240 Hz trajectories in the sweeps never reach it.

**Also recorded:** the per-step passivity residual r = ΔE + D peaks at 1.27–1.28 J at 360 Hz identically at every k (ΔE there never exceeds 0.007 J). This is a k-independent property of the dissipation estimate D, not energy creation.

## 5. Perturbed-ensemble G1 failure rates at 240 Hz (attribution of B)

*(filled in from `phaseG/sweep_perturb240_plane.json.gz` below)*

## 6. Recommendation (no adoption; stop for decision)

*(below)*
