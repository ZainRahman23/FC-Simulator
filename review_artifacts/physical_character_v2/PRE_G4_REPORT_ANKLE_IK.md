# Physical Character V2: G3 closed, ankle reinvestigation and 180 Hz study, anatomical-IK research (2026-10-04)

**Source:** `sources/2026-10-04_user_decision_j2a_gate_ankle_ik_research.md` (verbatim).

**Status:**
- **Stopped at the pre-G4 decision point.** G4 not started; no foot lift, swing, touchdown, stepping or walking.
- **No ankle law adopted** (the default stays k = 0). No anatomy, mass, limit, actuator, foot, skeleton or rate change.
- **Nothing pushed.**

**Detailed documents:**
- `g3/G3_CRITERIA_v3.3.md`;
- `ankle_plane/ANKLE_RESULTS.md` (pre-registration `ankle_plane/ANKLE_REINVESTIGATION_PREREG.md`);
- `ik_anatomical/IK_ANATOMICAL_REACHABILITY.md`;
- `ik_anatomical/FOOTHOLD_REACHABILITY_CONTRACT.md`.

## Decisions needed from you

1. **The posture IK's twist-DOF policy (controller).** This is the prerequisite for any ankle law, and the main new finding.
   - The validated "hold the redundant twist DOFs at their current value" policy produces an **actuator-powered leg-twist limit cycle** after medium disturbances (k = 0 included).
   - No passive stiffness in the evidence range removes it robustly.
   - "Twist at reference" (`ikRefTwist`, an existing option) removes it at every k and body tested. But whole-body yaw stiffness then becomes the passive ankles only (≈ 2k N·m/°; 0.26–0.35 at k = 0.13 / 0.15), against 2.8 N·m/° produced actively now.
2. **The prone-rest knee-axial interaction (plant).** At every k > 0, V1-matched comes to rest with the knee 1.4–2.4° beyond its narrow screw-home axial limit (G1 1.3d / 1.4e; 13–14 of 15 perturbed members). Resolving it touches anatomy (the knee axial limit / end-stop compliance) or a G1 criterion.
3. **Then the ankle law:**
   - a re-pre-registered k = 0.11 / 0.13 / 0.15 run under the chosen controller;
   - the diagnostic shows 0.13 (the evidence centre) and 0.15 both meeting every controller-dependent requirement under "twist at reference".
4. **The foothold-reachability contract** (item 10) and its open choices.

## 1. G3's final versioned criterion definition and PASS evidence

**Criteria v3.3** (`g3/G3_CRITERIA_v3.3.md`, commit `bb0ec47`, committed separately):
- **J2a** (controller mirror-equivariance) is the **normative** left / right symmetry gate.
- **J2b** (two independently evolved mirrored runs) is a **permanent plant mirror-divergence diagnostic**: reported by class, never gating.
- Every other row is v3.2's. History v1 … v3.2 is preserved.
- **Rationale recorded as you gave it:** a test-design correction backed by the pre-registered test-of-the-test, not a relaxation.

**Result: G3 PASS, 20/20 rows** (19 gating, J2b reported):
- J2a 81/81;
- all other gating rows pass, including O (browser = Node 4/4), P2 and S2 (0.097 ms).

## 2. J2a results and deliberate-asymmetry detection

**J2a: 81/81.**
- 443,469 ticks probed in both directions; discrete decisions identical; replay bit-exact.
- **Worst / tolerance:** command torque 3.3e-11 / 3.1e-10 N·m; CoP 6.7e-13 / 2.3e-11 mm; IK residual 1.8e-15 / 2.2e-14.
- **J2a also passes 81/81 at k = 0.11, 0.13 and 0.15:** the ankle law is mirror-symmetric.

**Deliberate asymmetries** (5 pairs each; `g3/json/g3_mirror_v3_inject-*.json`), all detected by 9–12 orders of magnitude:

| injection | detected via | measured / tolerance |
|---|---|---|
| right capacity −5 % | actuator capacity | 11 N·m / 2.2e-11 |
| right foot mass +5 % | contact force | 0.9 N / 1.2e-10 |
| right region +2 mm | commanded CoP | 2.0 mm / 2.3e-11 |

## 3. J2b diagnostic distributions

**81 G3 pairs (final configuration):**

| class | n | median | p90 | p99 | max |
|---|---|---|---|---|---|
| A, no slide | 50 | 0.033 mm | 0.055 mm | 0.092 mm | 0.203 mm |
| B, slide + recovery | 17 | 0.336 mm | 1.17 mm | 1.19 mm | 2.46 mm |
| C, failure through the common abort | 14 | 0.038 mm | 0.083 mm | 0.277 mm | 0.460 mm |

- Abort Δ 0 ticks in 14 / 14; 0 class mismatches; 0 failures without a common abort.
- **Floor population** (1,257 pairs): A max 0.206 mm (n 524), B max 3.58 mm (n 375), C max 0.683 mm (n 173); abort Δ ≤ 1 tick.
- **At k = 0.11:** A max 0.520 mm (n 49), B max 1.65 mm, C max 0.34 mm (reported).

## 4. Ankle results for k = 0 / 0.11 / 0.13 / 0.15 (`ankle_plane/ANKLE_RESULTS.md`)

**Pre-registered requirements A–H, validated controller:**

| | A passive | B G1 | C twist + re-centring | D G2 | E G3 | F unloaded foot | G morphology | H energy events |
|---|---|---|---|---|---|---|---|---|
| 0.11 | pass | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | pass |
| 0.13 | pass | FAIL | FAIL | FAIL | FAIL | FAIL | FAIL | pass |
| 0.15 | pass | FAIL | FAIL | FAIL | G3 rows pass (P2 via B / D) | pass | pass | pass |

**Twist reduction (V2-REF ankle ab/adduction):**

| | k = 0 | 0.11 | 0.13 | 0.15 |
|---|---|---|---|---|
| T5 / U:R | 11.1° | 3.5 / 1.8° | 1.6° | 1.3–1.4° |
| G2 push R 10 | 11.8° | 9.2° | 6.2° | 5.6° |
| G2 push R 20 / T7 1 s | 12–14° | 12–14° | 12–14° | 11–12° (unchanged: the law saturates beyond ±10°) |

- **Probes not re-centred:** 16 (k = 0) / 19 / 5 / 4 of 20.
- **Heavy bodies keep the twist** (V2-198-92 4.4° at k = 0.15; probes 17/20 not re-centred).
- **Hip counter-rotation** ≈ 0.75 × the ankle value; knee rotation ≤ 0.6°; passive torque ≤ 0.1–6 N·m.
- **Loaded vs unloaded** (T5 bins): stance 11.1 → 1.3° and unloading 10.7 → 0.7° at k = 0.15.

## 5. The complete 180 Hz finding (Phase G)

**H1:** no step above 0.05 J at 240 / 360 / 480 / 720 Hz at any k (379 runs per k); 0 invalid manifolds.

**H2: events at 180 Hz only**, every one traced to its first bad tick with the full ledger:

| event family | where | at which k | what happens | rate convergence |
|---|---|---|---|---|
| (a) drop1m landing, ≤ 0.77 J | knee and ankle end-range potential oscillates step to step | every k, **including k = 0** | net dissipative | from the same state, gone at ≥ 240 Hz |
| (b) awkward passive fall, ≈ 7 J | right ankle swings **in mid-air** into triaxial end range (ab/adduction 13.7 → 20.8°, DF 46–50°, inversion 30–38°) | k = 0.11 and 0.15 only | **ΔU from velocity integration +7.20 J while the drive rows do −0.03 J**, contact −0.02 J; returned the next step (−12.0 J); window −690 J | 6.92 J (180 Hz) → 0.51 J (240) → 0 (360+) from the same state |

**Classification:**
- **Numerical integration error of the stiff approved end-range law at a large timestep.**
- Not a legitimate stored-potential release (it vanishes with dt).
- Not Jolt / contact (no invalid manifold, no contact work, no teleport).
- Not instrumentation (the ledger closes).
- The neutral law cannot store 7 J; k only steers passive falls into the ab/adduction end range.

**Reachability:** only passive-fall stress states (G2 / G3 reach ≤ 13° ab/adduction, small DF / inversion).

**Verdict:**
- **Not a foundational passive-law defect.** It is the known 180 Hz accuracy limit (TD-1 / TD-15), present at k = 0.
- **H passes at every k.**
- **Recorded:** the same-state replay still shows 0.51 J at 240 Hz. Also recorded: a k-independent 1.28 J/step passivity-residual peak at 360 Hz, a property of the dissipation estimate (ΔE ≤ 0.007 J there).

## 6. G1 / G2 / G3 effects of every ankle candidate

**G1 (nominal):**
- every k: rig 34/34; variants 40/40; energy rows pass; 1.2e 0 flags;
- 0.11: 1.S′ (knee axial 1.74°);
- 0.13: 1.S + 1.S′ (4 runs);
- 0.15: 1.S′ (1.4e 5.31 mm, not at rest).

**G1 (perturbed, 300 runs at 240 Hz):** failing runs 5.0 % (k = 0) / 6.3 % / 11.3 % / 7.7 %. V1-matched "perturb" fails in 2 / 13 / 13 / 14 of 15 members: **systematic at k > 0**.

**G2:**
- **0 push-boundary changes at every k.**
- **S4 fails at every k:** final trunk 4.1 / 7.0° (0.11 roll), 3.09° (0.13 roll), 3.9 / 3.6° (0.15 yaw). This samples a still-running twist oscillation.
- **Report-only changes:** kξ 0.5 R 25 → recovered (all k); S4 roll 16 → recovered (0.15).

**G3 v3.3:**
- 0.11: D (yaw drift 3.3°) and I2 6/8 fail;
- 0.13: D (1.07°) and I2 7/8 fail;
- 0.15: every G3-native row passes;
- J2a 81/81 at every k;
- two report-only outcome changes and 10 ±1–2-tick abort shifts per k, mirror-identical.

**Diagnostic `ikRefTwist`** (not pre-registered): at k = 0.13 / 0.15, G2 all rows pass (S4 6/6), G3-native rows 15/15, 0 boundary changes, all probes re-centre in three bodies. G1 is unaffected, so the knee-axial failure remains.

## 7. Energy and passivity

- **Every k:** G0 PASS; G1 rig and energy rows pass; G1 1.2e 0 flags.
- **Ledger residuals:** G2 E max −0.28 J; G3 L max −0.29 to −0.30 J (limit +0.5 J).
- **Sweeps:** no step above 0.05 J at ≥ 240 Hz; 180 Hz events explained (item 5).
- **Twist limit cycle:** the passive plant only dissipates (1.2–1.7 J per 5 s); the actuators supply it.

## 8. Ankle recommendation

**No candidate is evidence-supported** under the pre-registered requirements with the validated controller.
- Nothing is adopted, and no other value is tuned or added.
- **The evidence points to deciding the controller's twist policy first, then the knee-axial question, then a re-pre-registered run.** Under "twist at reference", 0.13 (the evidence centre) and 0.15 both meet the controller-dependent requirements in the diagnostic. 0.15 has slightly less push twist. Perturbed G1 integrity is 11.3 % (0.13) vs 7.7 % (0.15).
- **This involves meaningful trade-offs** (yaw stiffness ≈ 2k vs the active 2.8 N·m/°; anatomy / criteria for the knee), so **this stops for your decision.**

## 9. Anatomical-IK / invalid-foothold characterisation

**The invalid 8 %** (1,336 of 16,704 geometrically reachable):
- **Ground-level footholds with foot yaw within ±30°: 0 of 2,256 invalid.**
- **Invalid footholds are:**
  - (a) ±45° foot yaw requested with a non-turning pelvis: hip rotation needs about 60° external / 50° internal, i.e. 3–15° beyond the limit;
  - (b) lifted targets with the foot held flat: ankle DF 45–55°.
- **A pelvis yaw toward the foot of ≤ 20° makes 1,023 of 1,208 ±45° cases anatomical.** Pelvis yaw = half the foot yaw resolves 944 of 1,300.
- **Knee:** 5–85° flexion; hyperextension only in the geometric fallback.
- **Smallest body most affected:** V2-165-62, 236 invalid.

**Constrained IK compared** (5 methods):
- the bounded active-set LM classifies exactly and mirror-exactly;
- **its fallback is now converged** by a projected Newton step (KKT ≤ 4.4e-9, previously 7.5e-4). Gated by the new permanent test R4.g; research infrastructure only, not adopted;
- Gauss–Newton regularisation and log-barrier methods were rejected;
- unconstrained IK + post-check classifies identically here and is the cheapest.

## 10. Proposed foothold-reachability contract (`ik_anatomical/FOOTHOLD_REACHABILITY_CONTRACT.md`, for approval)

**Three levels:** L1 geometric ⊇ L2 anatomical (inside the approved limits) ⊇ L3 dynamically executable (capacity, joint speed, swing time, balance, collision; reserved for G4).

**Query:**
- inputs: leg, state, foothold (touchdown: foot flat plus yaw ± tolerance; swing: pitch free), a **pelvis hypothesis** (height / yaw), the limit set;
- outputs: level, the unique solution, per-axis limit margins, binding limits, a converged fallback pose, the pelvis used.

**Guarantees, each tested:** determinism; mirror-equivariance; inside L; equal to L1 where valid; target never moved; fallback = box optimum.

**Open choices for you:** hard / soft / margin limits; twist-DOF treatment; pelvis policy; yaw tolerance; fallback semantics; solver of record.

## 11. Performance

**Isolated (idle) controller + actuators:** 0.093–0.103 ms per tick (budget 0.15); controller alone 0.081–0.091 ms. IK ≈ 86 % of the controller.

**Per component (ms per tick, warm):** passive 0.14–0.15, physics 0.31–0.34, tick 0.69–0.75.

**The ankle law:** passive layer at k = 0.15 is 0.145–0.151 ms vs 0.144–0.150 at k = 0. **No measurable cost.**

**Opt-in bounded IK:** classification ≈ 0.13 ms median; a converged fallback 1–8 ms (unreached targets only).

## 12. New regressions and instrumentation

**Permanent test:** **R4.g** (bounded-IK fallback = box optimum, KKT ≤ 1e-7). Component regressions **26/26**.

**Evaluators:** `gates/v2_g3_checks_v33.js` (`evaluateV33`, `j2bDiagnostic`), wired into `g3_report_tables`.

**Tools:**
- `tools/ik_anat_study.mjs` (characterisation plus 5 methods);
- `tools/ik_pelvis_yaw.mjs`;
- `tools/twist_mode.mjs` (twist-mode stability);
- `tools/phaseG_events.mjs` (events, window residual, same-state rate convergence);
- `tools/ank_reftwist_eval.mjs`.

**Diagnostic options (default off):**
- `g2_run` `V2_XSTAND`;
- `g3_twist` `--human` / `--stand`;
- `b_sweep --set=perturb240`.

## 13. Remaining technical debt

| # | debt |
|---|---|
| 1 | **The leg-twist limit cycle of the validated controller** (k = 0): actuator-powered, after medium disturbances, in V2-REF and V2-198-92. This is the real form of G3-F1 / TD-11. |
| 2 | **G2 S4's "final trunk within 3°"** is a single end-of-run sample, sensitive to oscillation phase. A settled-window measure would be robust (criteria debt; not changed). |
| 3 | **The knee's narrow axial end range in prone rest** vs G1 1.3d / 1.4e under any ankle stiffness. |
| 4 | **The 180 Hz end-range integration limit** (TD-1 / TD-15), incl. 0.51 J same-state at 240 Hz in a stress state; the 360 Hz residual peak of the dissipation estimate. |
| 5 | **G1 chaotic marginality:** 5 % of perturbed members fail at k = 0. |
| 6 | **IK:** the contract decisions; fallback cost; flat-foot-in-air convention in planning; pelvis-yaw sharing for turns. |
| 7 | **Yaw stiffness** ≈ 2k if "twist at reference" is adopted. |
| 8 | **Scratch-run infrastructure:** the V1-freeze guards (G0 0.V1, G1 1.V1) cannot run in scratch copies; G0's `--out` takes a space-separated path. One mistake: G0 overwrote the committed k = 0 G0 files once; detected and restored from git at once, no commit affected. |
| 9 | **Earlier items:** non-uniform radial inset; IK ≈ 86 % of controller cost; in-run 9-worker cost not representative. |

## 14. Local commits and review URLs

**Commits** (`prototype/physical-character-v2`, local only):

| commit | content |
|---|---|
| `bb0ec47` | G3 v3.3: J2a gate, J2b diagnostic, PASS 20/20 (separate commit) |
| `4b544ca` | ankle pre-registration (before any k > 0 run) |
| `12d6634` | IK fallback (Newton) + R4.g + anatomical study tools |
| `5dcb7ce` | IK characterisation and proposed contract |
| `2d4815e` | twist-mode stability tool and evidence |
| `1a0d609` | per-k ankle results archived; Phase G |
| `3219bdc` | ankle results complete; diagnostic `ikRefTwist` |
| (this report) | report and decisions log |

Earlier tonight: `833ec4a`, `5b9d756`, `f7b8a0c`, `8e57a3e`, `d67f417`, `f85e396`.

**Review server:** `http://127.0.0.1:8172/sandbox/visual/physchar2/viewer/index.html` (`g1.html`, `g2.html`, `g3.html`). Tables: `/review_artifacts/physical_character_v2/g3/G3_TABLES.md` (v3.3 section first).

## 15. The single biggest remaining blocker to starting G4

**The leg-twist limit cycle and the posture IK's twist-DOF policy (decision 1).**
- G4 puts a leg into single support and swing, exactly where the twist mode lives.
- Under the validated controller, a medium disturbance leaves a self-sustained ±10° ankle / shank twist in two of three bodies.
- No evidence-supported passive ankle stiffness fixes that alone.
- Until the twist policy is decided (and with it the ankle law and the knee-axial question), the swing-ready state is not a sound starting point for stepping.
- The foothold-reachability contract is the second decision G4 needs.
