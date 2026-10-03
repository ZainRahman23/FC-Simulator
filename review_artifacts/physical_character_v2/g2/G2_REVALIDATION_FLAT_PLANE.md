# V2-G2 revalidation on the flat-plane turf — **PASS, no material behaviour change**

**Sources:**
- `../sources/2026-10-03_user_decision_flat_plane_turf_reopen_g1.md` §8: "rerun the complete accepted 620-run G2 suite under the new turf representation … Do not tune the G2 controller unless a genuine controller defect is demonstrated."
- G1 v4 PASS: `../g1/G1_REVALIDATION_FLAT_PLANE.md`.

**Evidence:**
- run outputs: `json/g2_results.json`, `json/g2_checks.json`, `json/g2_browser.json`, `json/g2_regression.json`, `G2_TABLES.md`;
- `flat_plane_validation/`: `g2_compare.md`, `g2_regress.json`, `g2_yaw.json`, `g2_cop.json`, `g2_final_run.log`.

**Baseline:** the accepted post-D1G1 box-turf G2 run (`postD1G1/g2_results_postD1G1.json.gz`). The committed pre-D1G1 copy is kept in `../box_turf_history/g2/`.

**No controller, actuator, criteria or scenario change.** The only difference is the turf representation (G1 criteria v4).

## 1. Result: 620/620 jobs, 0 errors (199 s, 9 workers); every behavioural criterion passes

| row | result (plane) | accepted box-turf run |
|---|---|---|
| 2.1 quiet stance, 8 bodies | **8/8** | 8/8 |
| 2.2a push grid | **96/96** | 96/96 |
| 2.2b boundaries, monotone, symmetric | **40 sweeps, 0 inversions, symmetry 12/12** | same |
| 2.3 actuator over-capacity | **0 ticks / 617 runs** | 0 |
| 2.4 non-recovery = fall, ledger | **204 / 204 (step-required), exact** | 204 / 204 |
| 2.5 controller cost | **0.109 ms mean, 0.458 ms p99** | 0.108 / 0.507 (accepted) |
| S4 angular impulses | **6/6** | 6/6 |
| S5 initial offsets | **10/10** | 10/10 |
| F CoP sweeps + penetration | **6/6**; net jump ≤ 3.48 mm (limit 5), track ≤ 2.50 mm (limit 5); penetration max 0.91 mm | 6/6; ≤ 2.68 / ≤ 2.62 mm |
| D determinism ×3, snapshot, browser = Node | **6/6, 3/3, 6/6** | same |
| E energy ledger | **max residual −0.286 J** (414 runs) | −0.285 J |
| R "G1 unchanged" | literal FAIL, **superseded** by the approved plant change | — |

**Row R.** G1's hashes changed by design: 208 of 227 differ from the accepted box-turf G1. The 19 identical ones are the tests that never touch the turf (isoMomentum, isoSelfCol, hsKickShin, hsSelfCol20). They are bit-identical, confirming that the change is confined to turf contact.
- The G3 criteria v2 row P2 replacement holds: G0 8/8, G1 v4 PASS, G1 browser = Node 10/10, G2 rows 12/12 excluding R, G2 browser 6/6.
- The record is `../g3/json/g3_earlier.json`. `G2_TABLES.md` keeps the literal row and carries the supersession note.

## 2. Plane vs box: paired comparison of the same 620 jobs (`tools/b_g2_compare.mjs`, `tools/regress_compare.mjs`)

**Outcome-level comparison:**
- 617 paired runs plus 3 snapshot jobs, which are exact on both turfs.
- **Outcome class changes: 0 / 620.**
- **Push-recovery boundaries (largest recovered / smallest failed impulse per body × direction) changed: 0.**
- No state hash is identical; contact geometry differs at the bit level, as expected.

| quantity | box median / p95 / max | plane median / p95 / max | paired median Δ |
|---|---|---|---|
| quiet stance COM sway RMS AP (mm, 8 bodies) | 0.031 / 0.045 / 0.290 | 0.006 / 0.047 / 0.049 | −0.018 |
| quiet stance COM mean speed (mm/s) | 0.003 / 0.004 / 0.018 | 0.002 / 0.004 / 0.007 | −0.0003 |
| foot slip max, all jobs (mm) | 7.99 / 1,014 / 1,475 | 8.00 / 1,040 / 1,479 | 0.000 |
| foot tilt max (°) | 6.07 / 171.3 / 179.1 | 6.07 / 171.0 / 179.5 | 0.000 |
| push ξ deviation max, recovered (cm) | 4.65 / 10.16 / 11.95 | 4.65 / 10.16 / 11.95 | 0.000 |
| push recovery time (s) | 1.31 / 2.56 / 3.55 | 1.31 / 2.56 / 3.56 | 0.000 |
| push support margin min (cm) | 6.87 / 10.21 / 10.47 | 6.87 / 10.21 / 10.47 | 0.000 |
| actuator peak fraction of capacity | 0.662 / 1.000 / 1.000 | 0.662 / 1.000 / 1.000 | 0.000 |
| actuator over-capacity ticks | 0 | 0 | 0 |
| energy-ledger closure (J) | −0.567 / −0.351 / −0.285 | −0.569 / −0.354 / −0.286 | 0.000 |
| turf penetration max (mm) | 0.040 / 6.07 / 8.91 | 0.040 / 5.74 / 8.15 | −0.0001 |

**Largest change for recovered runs** (`regress_compare`): slip 4.17 mm, ξ deviation 0.17 cm, recovery time 0.075 s. 9 of 344 non-falling runs change foot slip by more than 1 mm.

**Quiet stance.** All 8 bodies stand on both turfs, and 2.1 passes item by item.
- S0 has no noise. Its "sway" is a deterministic micro-oscillation of a few hundredths of a millimetre, so its differences are numerical.
- The box's largest value was V2-long-legs at 0.29 mm (its slip 1.08 mm). On the plane the same body has 0.0001 mm and 0.25 mm.

**CoP behaviour (F sweeps).**
- The gated net-CoP jump and tracking error stay within limits on both turfs, with no consistent direction: 3 sweeps up, 3 down.
- The diagnostic per-foot jump rose in the L sweep (12.9 → 21.3 mm). `tools/b_g2_cop.mjs` re-ran all six sweeps on both turfs to find out why:
  - it is **one transient on the lightly loaded right foot** (114 N, t ≈ 20.18 s). A foot CoP is moment / force, so a 2.4 N·m moment change at 114 N moves it 21 mm;
  - over the whole 100–200 N band the plane's p99 per-foot jump is **lower** (L: 4.42 vs 5.57 mm; R: 5.90 vs 5.10; BL: 0.92 vs 1.38);
  - at ≥ 200 N the distributions match (p99 within ±0.6 mm).
  - Not systematic.

**Foot slip under yaw (S4 yaw H = 12: 7.6 → 11.8 mm).** `tools/b_g2_yaw.mjs` swept yaw impulses 8–16 N·m·s in 0.5 steps on both turfs, in one process:
- slip is **non-monotonic in H on both turfs**, a stick-slip sensitivity near the twist-friction threshold. For example, box H = 9.5 gives 6.62 mm and the plane gives 0.57 mm;
- the differences go both ways (the plane is lower at H = 9.5 and 12.5–15.5);
- **the recovered → foot-relocated transition is at the same impulse on both turfs** (13.0 → 13.5);
- no systematic torsional-friction difference.

**Symmetry:** 12/12 left/right pairs on both turfs; every boundary pair is unchanged.

## 3. Physics-integrity counters in G2 (plane; every G2 job carries the G1 invariants)

| counter | result |
|---|---|
| 1.4m invalid turf manifolds | **0** (all 620 jobs) |
| 1.4n turf-envelope violations | **0**. Max manifold depth 8.15 mm: V1-matched BR 35 N·s, a fall. Non-falling runs ≤ 1.60 mm |
| 1.4k teleport (> 5 mm) | **0 ticks**. Max 2.46 mm: V2-long-legs B 25 N·s, a fall. Non-falling runs ≤ 0.38 mm |
| passivity | not evaluated under actuation; the actuated energy check is row E (ledger closure, unchanged) |

## 4. Determinism and performance

- **Determinism:** ×3 identical hashes (6 curated scenarios); snapshot / restore 3/3 bit-exact; **browser = Node 6/6** (headless Chrome against the review server).
- **Performance**, same-process comparison (`tools/b_g2_yaw.mjs`, 3 repetitions per turf):

| run | physics step, box → plane (ms/tick) | controller (ms/tick) |
|---|---|---|
| quiet stance 10 s | 0.321 → **0.304 (−5 %)** | 0.025 → 0.025 |
| push F 15 N·s | 0.356 → **0.331 (−7 %)** | 0.069 → 0.065 |

Row 2.5 (9 workers in parallel) gives 0.109 / 0.458 ms, against the accepted 0.108 / 0.507. The post-D1G1 box rerun's 0.204 ms came from a contended machine and is not a turf effect.

## 5. Conclusion

**G2 passes on the flat-plane turf with no material behaviour change:**
- 0 outcome changes and 0 boundary changes;
- every criterion within its limits;
- the few metric changes are chaotic stick-slip or lightly loaded per-foot CoP, with no consistent direction.

**No controller defect was shown, and nothing was tuned.** Per the user decision, G3 (criteria v2, ankle k = 0) follows.
