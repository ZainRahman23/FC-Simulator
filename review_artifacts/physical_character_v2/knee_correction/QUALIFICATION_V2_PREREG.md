# Corrected-knee qualification v2: superseding criteria, adopted configuration, qualification sequence

**Status:**
- **PREREGISTERED**, committed before any run of this sequence.
- Code and configuration are frozen at this commit. Criteria are not changed after results; a defect found later is recorded as an erratum next to this text.

**Sources:**
- `../sources/2026-10-04_user_instruction_close_decisions_before_e1a.md` (verbatim);
- the audit and decisions in `DECISION_CLOSURE.md`.

**Unchanged and still authoritative:** `KNEE_CORRECTION_PREREG.md` (v1, frozen), its results and FAIL verdicts (`KNEE_CORRECTION_RESULTS.md`), the old knee, and every historical result.

**E1a is not run in this sequence.**
- Its only E1a-like manoeuvre is KV6c, the bilateral planned pelvis drop, which tests knee behaviour and is not the E1a protocol.
- E1a is run only after your explicit approval.

## 1. Superseding criteria (versioned; the originals are still computed and reported next to them)

| new | supersedes | rule | derivation / discrimination |
|---|---|---|---|
| **KV2b′** | KV2b | (a) W_el + ΔU ≤ 0.02 J + 0.5 % ∫\|P_el\|; (b) W_visc ≤ 0.02 J; (c) \|W_el + ΔU\| converges with dt: order ≥ 0.5 from 240 → 480 Hz, monotone from 180 Hz, or < 5 mJ. Exact decomposition from the drive encoding (elastic = λ/dt + c·ω_end + explicit remainder; viscous = −c·ω_end) | `DECISION_CLOSURE.md` §1.1 |
| **KV3b′** | KV3b | per cycle 2–5: closure ≤ +0.05 J; W_el ≤ +0.02 J + 1 % ∮\|P_el\|; energy at the same phase rises by ≤ 0.02 J | §1.2 |
| **KV4a.3′** | KV4a.3 | refinement continuity over φ ∈ [−5, 40]° at 2.5 / 5 / 10 / 15 N·m, per side: max 0.05°-step increment ≤ 0.75 × max 0.1°-step increment; no 0.05°-step increment > 0.1°; C¹ reported | §1.3 |
| **G1-5′** | G1 row 5 (knee-flexion damping rig expectation) | the expected flexion-row torque is −c·ω + cos(tw)·(−∂U_spec/∂φ) from the independent spec law; tolerances unchanged. Selected by `V2_KNEE_CRIT=v2` | §1.4 |
| **K′** | G3 row K | every T11 "over" request whose quasi-static target lies outside the stance foot's usable region (signed margin < 0, `tools/k_premise.mjs` at the T11 start state) is not realised as a stable stance; feasible requests are reported | §5 |
| **C1′** | twist battery C1 | as C1, except that an HO3 fall shared with "current" is exempt (the preregistered C7 exemption, applied to C1) | §4 |
| **C7′** | twist battery C7 | as C7, with "ok" judged on the **supporting** feet: HO1 / HO2 right, HO3 both; no fall / step required; supporting slip ≤ 20 mm; the non-supporting foot is reported | §4 |

**Not changed:**
- every other criterion of the v1 knee battery, G0–G3 and the twist battery;
- **G1 1.3d's 1.5° hip settled-excursion tolerance**, and the G1 perturbed-ensemble acceptability rule (≤ 8.1 % with no scenario failing ≥ 5 / 15).

## 2. Adopted configuration (frozen; this is also the E1a v2 configuration, `E1_PREREGISTRATION_V2_CONFIG.md`)

| element | value | flags |
|---|---|---|
| knee | `v2k`, **central parameters** (`KNEE_PARAMETERIZATION.md` §3–5, frozen 097dcb7) | `V2_KNEE_MODEL=v2k` / `kneeModel:"v2k"` |
| deep flexion (> 120°) | **provisional uncertainty family**, δ150 ∈ [−8, +10]°, w150 ∈ [0.3, 1.0]; central member used, no member selected; outside the certified envelope (0–40°) | — |
| ankle | k = 0.13 N·m/° (passive unloaded tissue value) | `V2_ANKLE_NEUTRAL_K=0.13` |
| twist semantics | reference: twist DOFs target their anatomical neutral, the knee's θ0(φ); voluntary heading only through `yawCmd` | `ikRefTwist: true` |
| support lifecycle | on | `lifecycle: true` |
| controller | the validated G3 stand controller | G3_STAND |
| physics | 240 Hz; anatomy, mass / inertia, limits, capacities, feet, skeleton contract unchanged | — |

## 3. Qualification sequence (scratch tree copied from this commit; evidence `evidence/qual/`)

**Q0: freeze and identity**
- **a. Default path (KV0):**
  - the 4 G3 hashes of `scratchpad/b/hashcmp.mjs` (T5, U:R, T7:R:0.25, T8:hold:L:FR:15) identical to `hash_head.txt`;
  - component suite all pass (52 / 52, incl. R9.a–b);
  - `tools/guard_v1.sh` OK in the worktree.
- **b. The corrected knee is the one officially qualified:** run hashes of Q3b (G1, V2-REF and V1-matched) and Q3e (G3, every job) identical to the official 097dcb7 runs in the same configuration (`evidence/official/gates/g1_k0.13_v2k`, `g3_results_e1acfg_v2k`). This stage's code changes are harness / viewer only.

**Q1: corrected-knee mechanics** (`knee_v2k_bench.mjs --crit=v2`, `knee_v2k_rig.mjs --part=all --crit=v2`)
- **Pass:** KV1a–e, KV2a, **KV2b′** (a, b, c), KV3a, **KV3b′**, KV4a.1–2, **KV4a.3′**, KV4b, KV6a, KV6b, KV7a, KV7b and KV8 (180 / 240 / 480 Hz).
- The originals KV2b / KV3b / KV4a.3 are reported; their FAIL stays the recorded v1 result.
- **Controls must still discriminate:**
  - the old knee passes KV2b′ (`--model=old --part=kv8 --crit=v2`), KV3b′ and KV4a.3′;
  - `--adv=naive`, `inject` and `spring` each fail KV2b′ and KV3b′;
  - the stepped comparator fails KV4a.3′;
  - `g1_row5_audit.mjs`: corrected and old knee pass G1-5′, naive fails.
  - A control that stops discriminating fails Q1.

**Q2: E1a-envelope knee behaviour (adopted configuration)**
- **a. KV6c on all 8 bodies:**
  - command: `knee_v2k_ctrl.mjs --policy=reference --model=v2k --stand='{"lifecycle":true}'`, k 0.13;
  - pass: no fall; foot slip ≤ 0.5 mm; |θ − θ0(φ)| ≤ 2.0° throughout;
  - reported: E1a-16 (flexion 0–40°) and E1a-17 (≤ 3°) forecasts, knee-axial actuator / passive work, the hips' and knees' smallest margin to their hard limits.
- **b. Determinism:** V2-REF run twice, with identical output.
- **c. Deep-flexion irrelevance:**
  - command: `deep_irrelevance.mjs` (8 family members) on V2-REF, V2-165-62, V2-198-92;
  - pass: identical final hash across members on each body, and max knee flexion < 120°.

**Q3: gates in the adopted configuration**
- **a. G0** (`V2_KNEE_MODEL=v2k`): every row passes (0.V1 needs the git checkout: Q0a guard).
- **b. G1 full** (`V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 V2_KNEE_CRIT=v2`, `g1_run.js --no-dx --no-v1`):
  - every gating row passes, row 5 as G1-5′ (1.V1: Q0a guard);
  - KV7c (knee-axial overshoot × 1.5 + 1° ≤ bound-to-Jolt-stop distance) holds.
- **c. G1 perturbed ensembles** (`B_TURF=plane`, `b_sweep.mjs --set=perturb240 --k=0.13`, V2-REF + V1-matched × 10 scenarios × 15): failure rate ≤ 8.1 % and no scenario failing ≥ 5 / 15.
- **d. G2 full** (`V2_XSTAND` = reference + lifecycle):
  - every gating row of G2 v1 passes, D with the re-measured browser check (Q5b);
  - R is replaced by Q3a–c; 2.5 (controller cost) is not re-measured (`final_pre_e1a/RATE_PERFORMANCE.md` §2).
- **e. G3 v3.3** (`g3_run.js --stand=…`):
  - every gating row passes, with K → K′;
  - J2a re-measured in this configuration (`g3_mirror_v3.mjs --stand=…`, which now mirrors the lifecycle state);
  - O re-measured (Q5b); P2 replaced by Q3a–d and Q5; S2 not re-measured.
  - Evaluator: `tools/qual_eval.mjs`.
- **f. Twist battery** (`twist_policy_battery.mjs`, as preregistered in `final_pre_e1a/TWIST_POLICY_PREREG.md`; reference and current; 8 bodies × 12 scenarios; k 0.13; `v2k`):
  - reference meets C1′, C1q, C2–C6 and C7′ on all 8 bodies;
  - evaluators: frozen `twist_policy_eval.mjs` plus `close_eval.mjs --policy`.

**Q4: no unexplained energy generation.** All of these must hold:
- G1's energy rows (in Q3b);
- G2 E and G3 L (Q3d / e);
- KV2b′ (a) and KV3b′ (Q1);
- twist C2 (Q3f);
- the boundary-harness per-tick closure (Q6c);
- KV6c knee-axial work reported.

**Q5: determinism and browser equivalence**
- **a. Node determinism:** G2 D (×3, snapshot), G3 N and Q2b.
- **b. Browser = Node in the adopted configuration** (headless Chrome over CDP from the review server on 8172, `--qs` configuration, Node results of Q3b / d / e): G1 10 / 10 curated, G2 6 / 6, G3 4 / 4 identical hashes.
- **c. Default-configuration browser regression:** g1 / g2 / g3 browser checks without `--qs` against the accepted `g*_results.json`, all identical.

**Q6: timestep**
- **a.** KV8 (Q1) and G1 row 8 (Q3b).
- **b.** KV6c (adopted configuration) on V2-REF, V2-165-62, V2-198-92 at 180 and 480 Hz: the KV6c criteria hold at each rate; knee flexion max within 1° of 240 Hz.
- **c.** `boundary_probe.mjs` (30 N lift harness, stand = reference + lifecycle, k 0.13, `v2k`) on the same 3 bodies at 180 / 240 / 480 Hz:
  - no fall;
  - no lifecycle chatter;
  - energy-closure increment ≤ +0.05 J in every tick (the E1a-8 tick threshold).
- **d.** Twist battery PY4, reference, 3 bodies, at 180 and 480 Hz: decay class QUIET / DECAYING, hip-rotation work ≤ 0.5 J.

**Q7: yaw decomposition remains observable** (KV10 in the adopted configuration)
- **Runs:** `yaw_decomp.mjs` scenarios A (`--stand='{"lifecycle":true}'`) and B; V2-REF, V2-165-62, V2-198-92; reference; k 0.13; `v2k` and, as comparator, the old knee.
- **Pass:**
  - every run reports all five contributions (ground, ankle, knee, hip, upper body);
  - the telescoping identity (ground + ankle + knee + hip = pelvis yaw) holds within 1e-6°;
  - scenario A joint-coordinate closure ≤ 0.3°;
  - no masking flag under the reference policy (an element out of its range with `v2k` but not with the old knee; ground slip > 0.5 mm; foot yaw > 0.5°).
- **Reported:** scenario B closure (a known method limit), the knee share.

**Q8: no tuning to E1a outcomes**
- No parameter, criterion or configuration change after this commit.
- No E1a run.
- A tool or implementation bug found during the sequence may be fixed and re-run only if it changes no criterion or parameter. It is recorded in the results.

## 4. Decision rule

- **E1a READY TO AUTHORISE** if Q0–Q7 all pass. E1a then still waits for your explicit approval.
- **Otherwise BLOCKED.** I stop with the smallest unresolved blocker, its evidence, the alternatives and a recommendation.
- **Stated before the run, from `DECISION_CLOSURE.md` §2:**
  - Q3b row 1.S′ and Q3c are **expected to fail** on the V1-matched upright splayed-leg hip rest, a genuine finding.
  - It will be recorded as FAIL. It is **not** waived, its tolerance is not changed, and no knee or hip parameter is selected to remove it.
