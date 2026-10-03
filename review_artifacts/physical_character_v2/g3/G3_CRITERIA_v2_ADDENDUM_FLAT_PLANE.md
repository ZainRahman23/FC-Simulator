# V2-G3 criteria v2: configuration addendum for the flat-plane revalidation (pre-registered before the run)

**Source:** `../sources/2026-10-03_user_decision_flat_plane_turf_reopen_g1.md` §9: "Revalidate G3 only after G2 passes … Keep the ankle at the historical: k = 0."

**Gate rows are unchanged.** The rows, limits, definitions and the S2 benchmark method are exactly those of `G3_CRITERIA_v2.md` (approved, `a028bed`). v2 has never been evaluated, because the ankle-law validation stopped before its final run. This is its first evaluation. Only the configuration under test changes.

| item in `G3_CRITERIA_v2.md` | this evaluation |
|---|---|
| plant change 1: deterministic math (G3-R1, G3-R1b) | **kept** |
| plant change 2: ankle neutral-zone law, k = 0.10 N·m/° | **not applied: k = 0**, the historical accepted ankle (the code default since G3-R8). The law stays implemented and selectable for the later ankle investigation |
| turf | **Jolt `PlaneShape` (y = 0)**: the approved flat-plane decision, G1 criteria v4 |
| controller | `G3_STAND`, unchanged; no G3 tuning |
| P2 | G0 PASS (incl. the 0.9n law-form test); **G1 criteria v4** PASS on the full flat-plane run; G1 browser = Node; G2 criteria v1 rows except R pass (R superseded); G2 browser = Node. All recorded in `json/g3_earlier.json` (G2 PASS on the plane: `../g2/G2_REVALIDATION_FLAT_PLANE.md`) |
| "Reported, not gated" ankle sensitivity (k = 0 / 0.05 / 0.10 / 0.15 / 0.3 / 0.5) | **deferred** to the ankle re-investigation the user decision orders after G1 → G2 → G3 are clean (decision §10). Not part of this evaluation |

**Also reported** (not gated):
- v1 rows on the same run (historical). v1 row P literally fails: G1 and G2 hashes changed by the approved plant change, which the v2 P2 row replaces.
- Comparison with the box-turf G3 run 3 (`../box_turf_history/g3/`) for the T-tests, U, T8 and T9 outcomes and the key hold metrics.
- `tools/g3_twist.mjs` at k = 0 on the plane.
- The physics-integrity invariants (1.4m / 1.4n / 1.4k) over every G3 job.

**Order:**
1. `g3_run.js`;
2. `g3_mirror_pairs.mjs` (J2);
3. `g3_bench.mjs`, alone on an idle machine (S2);
4. `g3_browser.mjs` (O);
5. `g3_earlier.mjs` (P2);
6. `g3_report_tables.mjs` (v1 + v2);
7. `g3_twist.mjs` (report).

If a row fails, it is reported and investigated, **not** tuned. A material behaviour change stops the work for the user's decision.
