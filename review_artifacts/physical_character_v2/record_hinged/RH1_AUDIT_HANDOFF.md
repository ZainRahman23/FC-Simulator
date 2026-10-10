# RH1 audit handoff: facts and provenance

**Scope.** This document records facts and provenance only. It contains no architecture proposal and no threshold change.

**Instruction:** `sources/2026-10-11_user_instruction_hold_rh1_audit_handoff.md` (36ec2e91).

**Status:**
- RH1 is held and not adopted.
- RH1, V2, RUN-1, the criteria, the collision architecture and the simulation are unchanged since the RH1 results (fa5915b2). This audit added documentation and audit tools only.
- **Nothing pushed.**

## 1. Provenance

| what | commit / object |
|---|---|
| motivating measurements: RUN-1 → V2 handoff contract R2 | 6a0cf340 (2026-10-10 20:56) |
| motivating measurements: V2 upper-body representation study (D12n) | edfa2b8f (21:50) |
| user decision to build RH1 (D1–D4) | 084f736d (21:54) |
| RH1 preregistration (frozen) | 50eae23a (22:06) |
| RH1 build: spec, hinge post-step, MC-1, evaluation tools | 2ab15cab (22:20) |
| battery driver; the battery ran from a scratch copy of this commit | 196815e5 (22:24) |
| RH1 results, evidence, gate evaluator, diagnostics | fa5915b2 (23:32) |
| hold instruction | 36ec2e91 (2026-10-11 00:13) |
| audit tools + spec diff | ff5be5e3 |
| frozen locomotion baseline (consumed by `git archive` only) | tag `locomotion-v2-straight-baseline-1` = 4a226b1f |
| simulation used by the PI-1 mapping tools | V1.3 5042230 (`git archive`) |
| runner record | `assets/characters/outfield/vinicius/rig.json`, blob 6ca64389 |

## 2. The RH1 specification and its exact differences

**Identity:**
- id `PI1-runner-vinicius-RH1`;
- file `sandbox/visual/physchar2/spec/v2_pi1_runner_rh.js`, built through the opt-in post-step `spec/v2_hinges.js`;
- spec hash **e2892d27** at ankle K 0.13.

**Lineage:** V2 generator → R0 = `PI1-runner-vinicius` (record overrides) → RH1 (three joint centres from the record).

**Exact differences** (`evidence/spec_diff.json`, from `scripts/rh1_spec_diff.mjs`; every differing leaf is listed there):

| pair | differing leaves | content |
|---|---|---|
| **RH1 vs R0** | 101 | see the moved centres below. Plus: the four child bodies' origins re-expressed (COM and collider world placement unchanged), the upper-arm `distal`, the render-skeleton positions / frames, the human id and the `hinges` provenance block |
| R0 vs V2-REF | 1962 | the record overrides: H 1.76 m, M 73 kg, ankleH 0.0386364, kneeH 0.2651623, hipH 0.5122814, hipHalf 0.0866456, shoulderHalf 0.1403375, sjcH 0.8175175, armScale 1.0578941 |
| RH1 vs V2-REF | 2002 | the two rows above combined |

**The moved joint centres (RH1 vs R0):**

| joint | R0 (m) | RH1 (m) | Δ |
|---|---|---|---|
| lumbar | (0, 1.068905, −0.029920) | (0, 1.029058, 0) | 49.83 mm |
| thoracic | (0, 1.286757, −0.038720) | (0, 1.243945, 0) | 57.73 mm |
| elbow L / R | (∓0.548255, 1.458831, 0) | (∓0.559812, 1.458831, 0) | 11.56 mm |

**Unchanged, bit for bit or ≤ 1e-12** (`evidence/rh1_spec_check.json`, 13 / 13):
- the 20 existing spec hashes;
- masses;
- world COM;
- inertia (canonical frame);
- collider world placement;
- joint frames, ranges, passive law and capacities;
- disabled pairs, landmarks, contact and equipment;
- the lower body, and the hip / knee / ankle / neck / shoulder joints.

## 3. Qualification outcome (preserved as run)

**RH1: 50 / 54 gating rows pass** under the rules of `RH1_PREREG.md` §6.
- **Configuration:** qualification-v2 adopted (v2k, ankle K 0.13, reference twist + lifecycle, 240 Hz, 150 / 2, plane turf).
- **Bodies:** RH1 as subject, R0 as control, plus the 8 qualified bodies as regression.
- **Raw outputs:** `evidence/battery/`. **Evaluation:** `evidence/battery/eval/gate_eval.json`.
- **8-body regression:** identical to `knee_correction/evidence/qual/`: G0 8 / 8; G1 74 / 74; perturbed 300 / 300; G2 617 / 617 + 3 snapshots; G3 332 / 332; J2a 81 / 81; KV6c 8 / 8; twist 192 / 192.
- **Counting:** G0 enters as one gating row, the classification row (§5.3).

## 4. The four failing rows, with R0 on the same test and harness

| row (frozen criterion) | RH1 | R0, same test | harness for R0 |
|---|---|---|---|
| **G1 1.S** "every scenario passes every criterion" | **FAIL**, 14 / 17: leanL 1.3d 1.74° (shoulder_L abduction; limit 1.5°); dropA 1.R 0.094 rad/s (limit 0.05); isoSelfCol 1.4d 24.60 mm (limit 10) | Its counterpart, row 1.S′ (same scenarios and criteria), **FAILS**, 16 / 17: only isoSelfCol 1.4d 24.59 mm. **leanL passes** (0.00°); **dropA passes** (0.000 rad/s) | the same G1 battery run (`g1_run.js` copy, RH1 in V2-REF's role, R0 in V1-matched's); hashes reproduced by `rh1_g1_diag` |
| **G3 G** T7 4 s / 2 s ramps: stood or recovered, slip ≤ 1 mm, no abort, hold mean ≥ 0.93 | **FAIL**: aborts 3.66 / 2.34 s; hold mean 0.562 / 0.606 | **FAIL**: identical aborts and hold means | the frozen `g3_run.js`, R0 substituted in V2-REF's rows exactly as the battery ran RH1 (audit D, `evidence/audit/`); frozen evaluator through `rh1_audit_g3_body.mjs` (self-check 15 / 15 on RH1) |
| **G3 H** H1 32 / 32, H2 18 / 18, H3 no abort in nominal T7 | **FAIL**: H3 = 6 aborts (H1, H2 pass) | **FAIL**: H3 = 6 (H1, H2 pass) | as above |
| **G3 K′** every excessive T11 request not realised as a stable stance | **FAIL**: λ 1.2 / 1.4 excessive (margins −1.42 / −7.38 cm); T11:over:1.4:sup ends "stood" after an abort at 2.78 s | **FAIL**: identical margins and outcomes | as above |

**Other G3 rows on R0, same harness:** A, B, C, D, E2, F2, L, M, N and Q pass, the same pattern as RH1.

## 5. Classification

**5.1 RH1-introduced failures** (R0 passes the same scenario in the same run):
- **G1 leanL 1.3d.** RH1 ends prone with the left shoulder 1.74° beyond its hard limit.
  - Perturbed ensemble 4 / 15, below the 5 / 15 systematic threshold.
  - In-memory attribution: trunk hinges only 2.28°; elbow hinges only 0.34°.
- **G1 dropA 1.R.**
  - The left arm moves at ≈ 9.5–10.5 s (peak 0.56 rad/s) and is at rest by 13.5 s in a continued run.
  - It occurs only with both hinge sets (trunk-only 0.003, elbow-only 0.011 rad/s).

**5.2 Failures shared with R0** (identical values; newly found, since R0 had never been run through G3):
- G3 G;
- G3 H (through H3);
- G3 K′.

**5.3 Previously recorded or accepted exceptions:**

| exception | status | on RH1 |
|---|---|---|
| G1 isoSelfCol 1.4d (boot ↔ boot, 13 m/s leg-into-leg swing) | **user-permitted, PI-1-scoped** (D1C, 2026-10-09, `sources/2026-10-09_user_decision_d1c_replace_cases_compat_gate.md`): permitted for the artificial stress test only, with the 10 mm criterion kept in every actual PI-1 state | fails identically: foot_L ↔ foot_R 24.60 mm vs R0 24.59 mm, first contact 0.017 s, 20 steps |
| G0 0.4c, 0.6a, 0.6b, 0.6e, 0.10a (record hip / shoulder spacing; profile-override check references) | **recorded in the PI-1 D-1 body check but never waived by the user** (`sources/2026-10-09_user_instruction_d1a_investigation.md`: "before I waive anything"). Exempted for RH1 only by `RH1_PREREG.md` §6 when R0 fails them identically | fails identically on all 5. Without the preregistered exemption, G0 fails for both RH1 and R0 |
| KC-4: G1 1.S′ V1-matched upright and its perturbed systematic (user decision 2026-10-05) | accepted as non-E1a-gating | not an RH1 row; reproduced unchanged in the 8-body regression |

**5.4 Unresolved rigid-foot / promotion compatibility** (handoff states at 3.0 / 5.5 / 7.8 / 9.5 m/s; owner per R2: V2 foot, R2 Q3):
- **Invalid instants** (the frozen RF-1 rule has no consistent solution; late toe pad and a few heel-up / forefoot landing): 6 / 12 / 16 / 22 of 240.
- **P-9 stance boot −5…+2 mm fails at valid instants:** 0 / 10 / 12 / 8, all in late toe pad.
- **Stance contact consistency (F0 contact point ≤ 0.18 m/s) fails:** 16 / 42 / 50 / 40.
  - Toe pad: up to 2.34 m/s.
  - Heel-up: up to 0.69 m/s.
  - Forefoot landing: up to 0.69 m/s.
  - Flat stance always passes.
- **HG-A v2 \|s\|** (reported only; v_auth open): passes at 174 / 197 / 160 / 88 instants.
- **R2 open questions (unchanged):** stride-clock ownership (R-5 / H-1) and turning (R-7).

**Procedural (fact):** the RH1 reproduction rule (§5, 1e-6 against the D12n study) failed as written. The worst difference is 1.15e-4 absolute, against study values stored to 4 decimals. The user has not ruled on it.

## 6. The motivating RUN-1 handoff measurements (preserved)

**R2, `interaction_time/run1_handoff/lv2/` (6a0cf340) — V2 as frozen, with the frozen mapping:**
- At FAST RUN / ALL-OUT the upper body is off by 16 / 26–27 / 30–31 mm (shoulders / elbows / hands) and by 0.23–0.57 m/s.
- Frozen P-14 fails at 68 % / 88 % of instants.
- P-12 shoulder hard range is exceeded at ALL-OUT (≤ 1.34°).
- The leg chain transfers exactly.
- Probe output `lv2_handoff_probe.json.gz`, sha256 57fb7b12… (`lv2/out/determinism.txt`).

**Upper-body study, `interaction_time/run1_handoff/lv2/upper/` (edfa2b8f):**
- With V2 unchanged, the material-velocity projection alone cuts ALL-OUT per-body velocity error from 0.52 to 0.14 m/s, |ΔP| from 4.9 to 1.8 N·s, and |ΔL| from 30 % to 4 %.
- D12n (RH1's anatomy + MC-1) at ALL-OUT: ≤ 6.5 / 5.4 / 2.6 mm, ≤ 0.093 m/s, |ΔP| ≤ 0.47 N·s, 0 instants over 0.18 m/s.
- Probe output `v2_upper_alt_probe.json.gz`, sha256 ecd3f64e… with timing fields removed (`lv2/upper/out/determinism.txt`).

**Both probes were re-run from the clean audit tree and reproduce these hashes exactly** (§7).

## 7. Reproducibility from committed files

**Command:** `zsh review_artifacts/physical_character_v2/record_hinged/scripts/rh1_audit_verify.sh <scratch dir> ff5be5e3`.
- It builds a clean tree from `git archive` only (plus `git archive` of the LV2 tag and of 5042230).
- Run 2026-10-11 00:21–00:33: **0 of 14 comparisons differ** (`evidence/audit/audit.log`).

| step | re-derived from committed files | result |
|---|---|---|
| A | `rh1_spec_check`, `rh1_spec_diff` | identical (13 / 13; diff identical) |
| B | `rh1_gate_eval` on the committed raw battery outputs | rows, regression, exemptions and summary identical: 50 / 54 |
| C | the failing rows re-run: `rh1_g1_diag` (leanL / dropA / isoSelfCol) and `rh1_g3_diag` (T7 / T11); RH1, R0, two attribution variants | identical; every run that has a battery counterpart equals the battery's hash (G1: 8 / 8 runs, RH1 and R0; G3: RH1 11 / 11 jobs) |
| D | R0 in V2-REF's G3 rows, frozen runner, identical harness | G / H / K′ fail as in §4; raw output `evidence/audit/g3_results_r0_in_v2ref_rows.json.gz` |
| E | `rh1_handoff_eval`, `rh1_instantiate` (0 Jolt steps) | identical except CPU timing fields |
| F | R2 `lv2_handoff_probe`, `v2_upper_alt_probe` | identical to the recorded determinism hashes |

**Not re-run:** the 50-minute battery. Its raw outputs are committed in `evidence/battery/` and are what step B evaluates.
- To regenerate: `scripts/rh1_battery.sh` at 196815e5.
- It hard-codes its scratch path and deletes its own output folder at start.

**Integrity:** `SHA256SUMS` beside this file covers every file under `record_hinged/` except itself.

**Main documents:**
- `RH1_PREREG.md` (frozen rules);
- `RH1_RESULTS.md` (full results as reported on 2026-10-10, unchanged);
- this file.
