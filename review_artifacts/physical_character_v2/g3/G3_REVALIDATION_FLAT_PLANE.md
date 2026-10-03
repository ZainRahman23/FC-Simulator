# V2-G3 revalidation on the flat-plane turf (criteria v2, ankle k = 0): **18/19, NOT PASSED on row J2. STOPPED for a decision on J2**

**Sources:**
- `../sources/2026-10-03_user_decision_flat_plane_turf_reopen_g1.md` §9;
- criteria `G3_CRITERIA_v2.md` (approved, `a028bed`) plus the configuration addendum `G3_CRITERIA_v2_ADDENDUM_FLAT_PLANE.md` (pre-registered, `5f91cb1`).

**Configuration:** flat-plane turf (G1 v4), ankle k = 0 (historical), controller `G3_STAND` unchanged, **no tuning**.

**Evidence:**
- run outputs: `json/g3_results.json` (332 jobs), `json/g3_checks_v2.json`, `json/g3_checks.json` (v1, historical), `json/g3_mirror_pairs.json`, `json/g3_bench.json`, `json/g3_browser.json`, `json/g3_earlier.json`, `json/g3_twist.json`, `G3_TABLES.md`;
- `flat_plane_validation/`: `g3_compare.md`, `g3_mirror_turf.json`, `ctrl_mirror.json.gz`, `g3_mirror_falls.json`, run logs.

**Baseline:** box-turf G3 run 3 (`../box_turf_history/g3/`).

**This is the first evaluation of criteria v2.** The ankle-law pass halted it before its final run.

## 1. Result

| row | result |
|---|---|
| run | 332 / 0 errors (197 s) |
| A bilateral baseline | PASS: load_R 0.500, slip 0.33 mm |
| B T1 / T2 strong transfer | PASS: holds 0.838 / 0.846, end 0.502 / 0.498, slip 0.26 mm |
| C T3 cycle R → L | PASS |
| D T4 five cycles, drift | PASS: pelvis drift 4.0 → 4.0 mm (Δ 0.02), yaw Δ 0.09°, hold means unchanged |
| **E2 near-single-support** | **PASS**: unloaded foot ≤ 4.10 % BW settled, ≥ 8 pieces touching, stance foot 95.90 % min / 96.85 % mean, ξ margin 3.5 cm, slip 0.27 mm |
| **F2 swing-ready** | **PASS**: unloaded foot ≤ 0.52 % BW, slip 0.26 mm, lift 0, tilt 0.16°, stance 99.5–99.8 %, ξ margin 4.1 cm |
| G T7 speed | PASS |
| H perturbation during transfer | PASS: H1 32/32, H2 18/18, H3 0 false aborts |
| **I2 every body (8)** | **PASS 8/8**: T9 holds ≤ 4.45 % BW (short legs); U per body ≤ 0.71 % BW, slip ≤ 0.27 mm, lift 0, tilt ≤ 0.17° |
| **J2 mirror symmetry** | **FAIL** (literal; analysis §2) |
| K excessive request | PASS: λ 1.2 / 1.4 / 1.4-supervised fail physically (step required → fell); fast 0.25 s fails |
| L authority / impulse / energy | PASS: 162/162, residual ≤ −0.297 J |
| M CoP across boot seams | PASS: ≤ 0.62 mm per tick |
| N determinism ×3, snapshot | PASS |
| O browser = Node | PASS 4/4 |
| P2 earlier gates | PASS: G0, G1 v4, G1 browser, G2 12/12 excluding R, G2 browser |
| Q force-plate twin | PASS: 4.1e-6 of M·g·dt |
| **S2 controller cost (isolated)** | **PASS**: controller + actuators 0.046 ms mean (median 0.042, p99 0.163); controller alone 0.035; actuators ≈ 0.011; IK-timer instrumentation 0.0008 ms |

**v1 (historical, same run): 15/19.** I, J and S fail exactly as in box run 3: short legs 94.9 %; mirror slip 0.82 mm (box 0.76); in-run cost under 9 workers 0.154 ms (box 0.173). P fails literally, because it is superseded by P2.

### The pre-step state (the user's seven questions)

| question | answer (k = 0, plane) |
|---|---|
| near-single-support | **yes**: E2 and I2, 8 bodies, unloaded foot ≤ 4.5 % BW with the foot still touching |
| full / swing-ready unloading | **yes**: F2 and I2, 8 bodies, ≤ 0.71 % BW, no drag (slip ≤ 0.27 mm, lift 0) |
| reversible | **yes**: B, C, D: back to 0.50 ± 0.002 after every transfer and cycle |
| drift-free | **yes**: D, pelvis drift Δ 0.02 mm and yaw Δ 0.09° over five cycles |
| perturbation-tolerant | **yes**: H, all 5 N·s pushes in both stances, inward ≤ 15 N·s at the hold, no false aborts |
| mirror-consistent | **physically and in the controller, yes; the literal J2 row, no**. See §2 |
| physically failing under excessive requests | **yes**: K |

## 2. Row J2: why it fails, and what it does and does not show

The J2 sub-checks on the plane:

| J2 sub-check (v2 text) | result |
|---|---|
| non-sliding pairs: Δpos ≤ 0.1 mm | **49/49**, max 0.086 mm |
| sliding pairs: same class and Δpos ≤ 2.0 mm | classes **32/32 identical**. The 18 recovering pairs pass (≤ 1.28 mm). **The 14 falling pairs fail:** the T8 excess pushes 15–20 N·s, both trials "step required → fell". Δpos is 12–924 mm, accumulated after the fall |
| supervisor decision and abort time (≤ 1 tick) | **81/81 identical** |
| requested λ mirror-identical (≤ 1e-9) | **81/81** (max 1.1e-16) |
| commanded CoP mirror-identical within 0.1 mm before sliding | **fails in 79/81 pairs** (max 1.19 mm) |
| run lengths equal | 4 pairs differ: falling pairs whose falls are 1 tick apart (each run ends 0.5 s after its fall) |
| T9 R vs L hold means within 1e-3 | pass (1.5e-4) |

**Finding 1. The failure is not caused by the flat plane.** The same pairs re-run on the historical box (`tools/b_g3_mirror_turf.mjs`) give the same values:

| pair | commanded-CoP Δ before sliding, plane | box |
|---|---|---|
| T1/T2 | 0.104 mm | 0.105 mm |
| T7 0.25 s | 0.742 mm | 0.752 mm |
| T7 0.5 s | 1.191 mm | 1.070 mm |
| T7 0.75 s | 0.552 mm | 0.541 mm |
| T8 hold F20 | 0.171 mm | 0.195 mm |

**Finding 2. The 0.104 mm in 70+ pairs is measured where the two trials are still the same physical run.**
- Every G3 trial starts from the same state with the same request, until its scenario begins at t = 1 s.
- In that shared phase the two runs are bit-identical. The tool compares trial A with trial B **mirrored**, so it reports twice the common state's lateral offset: the release transient puts the commanded CoP 0.052 mm right of mid-ankle at t = 0.013 s.
- No controller asymmetry can exist there. The check measures the plant's settle asymmetry.

**Finding 3. The controller itself is mirror-exact** (`tools/b_ctrl_mirror.mjs`, a new direct probe).
- **Method:** at 241–477 sampled ticks of a real trial, capture the controller's exact input at the entry of `compute`: body states, passive-layer joint coordinates, sensed foot loads and contacts, and the controller + supervisor state. Feed its mirror image (x → −x, L ↔ R, λ → 1 − λ) to the mirror trial's controller.
- Result, over 6 pairs (T7 0.5 / 0.25 s, T1/T2, U:R/U:L, T8 hold F20, T8 hold BR5), until the fall:

| output | max mismatch |
|---|---|
| commanded CoP | **1.7e-4 mm** (the CoP allocation stops at a 1e-7 m residual) |
| requested λ | **5.6e-17** |
| load share | 3.9e-6 |
| per-foot CoP | 9.6e-3 mm |
| foot force | 3.2e-3 N |
| joint torques | **≤ 7e-4 N·m** (of ≤ 77 N·m) |

So the commanded-CoP difference between two physical runs is the controller's correct response to the plant's state difference.

**Finding 4. The plant's mirror floor is the known one.**
- D4 measured the deterministic L/R asymmetry, which appears when feet approach sliding. Its probable cause is sequential-impulse solver order.
- Before sliding, the fast T7 ramps' foot positions differ by 0.28–0.41 mm, and the commanded CoP follows with gain ≈ 2–4.
- The falling pairs stay consistent until balance is lost (`tools/b_g3_mirror_falls.mjs`):
  - abort at the identical tick;
  - fall at the same tick or 1 tick apart;
  - Δpos up to the abort ≤ 0.27 mm; up to the fall 0.24–5.84 mm;
  - only afterwards, chaotically, 12–924 mm.

**Finding 5 (new, minor).** After a fall, with leg-IK targets 0.46–2.3 m out of reach, the leg IK is not mirror-exact: joint torque differences up to 654 N·m in the T8 hold F20 probe, from t = 5.85 s (fall at 5.70 s).
- Before the fall: ≤ 7e-4 N·m.
- It affects no G3 row: the runs end 0.5 s after the fall and the outcome classes are identical.
- Recorded as an observation for G4, where the swing-leg IK may meet infeasible targets.

**My error, stated plainly.** I wrote the v2 J2 operationalisation, and the user approved it. Its "commanded CoP within 0.1 mm before sliding" compares two physical runs, so it cannot separate controller asymmetry from the plant's floor, and it fails even when the runs are identical. Its "≤ 2.0 mm for every sliding pair" includes falls, whose divergence after the loss of balance is unbounded; D4 only measured recovering sliding pairs. Neither problem could show before this first evaluation, and both are present on the box. **A rule like this cannot be changed without the user, so I stopped.**

## 3. Plane vs box G3 (308 paired jobs, `tools/b_g3_compare.mjs`)

- **Outcome class changes: 0 / 308.**
- Supervisor abort times moved in 3 report-only variant runs (knee / strategy, T8 hold R10), by ≤ 9 ms.
- Paired medians of every hold, slip, tilt, roll, lean, yaw, drift, λ-tracking, ledger and penetration metric are 0. The large maxima are chaotic falls.
- 16 jobs (T9U, U per body) are new in criteria v2 and have no box partner.
- **Physics integrity over all 324 G3 runs:** 0 invalid turf manifolds; 0 envelope violations; teleport max 1.82 mm; max depth 8.50 mm (a fall).

## 4. Ankle twist at k = 0 on the plane (`tools/g3_twist.mjs`; report)

- **The free twist mode is unchanged by the turf:**
  - 10–14° ankle ab/adduction in G2 pushes and in G3 transfers (T5 10.7 / 11.1°, U:R 10.7 / 11.1°), counter-rotated by about 10° of hip rotation;
  - torque-step probe peaks 11–18°;
  - no re-centring after release (offsets up to ±13.6° at λ = 1).
- **The one exception:** G2 F15 is barely excited on the plane (1.5 / 1.3° vs 10.6 / 10.5° on the box). That is a near-neutral mode, so tiny state differences decide whether a sagittal push excites it.
- **This remains the motivation for the ankle question, which waits on G3.**

## 5. Decision requested: row J2

| option | what it means |
|---|---|
| **A (recommended): J3, same intent, measured where it is meaningful** | **(a) Controller mirror-equivariance, measured directly** by the mirrored-input probe in every pair until the fall: commanded CoP ≤ 1e-3 mm (10× the allocation stop), λ ≤ 1e-9, joint torques ≤ 1e-2 N·m; per-foot CoP and forces reported. **(b) The physical floor, with D4's approved numbers unchanged:** non-sliding Δpos ≤ 0.1 mm; recovering sliding pairs: same class and Δpos ≤ 2.0 mm; **falling pairs:** same class, identical abort decision and time (≤ 1 tick), fall time ≤ 1 tick, Δpos up to the abort ≤ 2.0 mm; divergence after the fall reported, not banded. **(c)** The two-run commanded-CoP difference and run-length equality are reported. On today's data every part passes. Re-evaluated on the full run (probe on all 81 pairs) before G3 is declared |
| B: keep J2 literally | G3 cannot pass without removing the plant's physical L/R floor (engine solver order). That is outside what I may change |
| C: accept G3 with J2 recorded as a known, explained deviation | no criteria change; the failure stays in the record |

**Consequence:**
- Per the user decision §10, the ankle re-investigation starts only after G1 → G2 → G3 is clean. **It has not been started.**
- Its pre-registration is drafted (`../ankle_plane/ANKLE_REINVESTIGATION_PREREG.md`, marked DRAFT) and will be committed as a pre-registration only after the J2 decision.
