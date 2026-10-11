# PVP-1A-DX: diagnostic two-body run after the PVP-1A H2 stop (FROZEN before any two-character stepping)

**Status:** a **diagnostic**, explicitly **not PVP-1A**.
- PVP-1A remains **BLOCKED (H2)** (`PVP1A_STOP_H2.md`).
- Nothing PVP-1A-DX shows can turn that into a pass.
- It exists to answer the physical question PVP-1A could not reach: what two native V2 bodies do in this authoritative interaction.

**Definition:** **identical to `PVP1A_PREREGISTRATION.md` §3–§12** (bodies, world, two-character build, controllers, runner entry, modes C0 / N2 / X2, 260-step horizon and windows, contact definitions, CG rows, integrity and ledger numbers, controls, isolation, offline outcome evaluator, response analysis, determinism, neutrality, CPU, visuals), with one exception:

- **Tackler entry:** the frozen-objective optimum at τ 51.0, exactly `fixture/PVP1A_FIXTURE.json` `write.tackler`.
  - It **fails** G-T1 (15.2 / 17.0 mm vs 10) and G-T3 (hip_R–TUCK 55.7 mm vs 30).
  - It passes G-T2 (15.9 / 11.2 mm) and G-T4 (0.54 mm).
  - Its contact-relevant geometry: the boot front is 15 mm from the authoritative LEG tip, and the predicted first contact is shank_R ↔ foot_L at τ 51.75 vs the authoritative 51.5.
  - **This mismatch is carried into every result as a label.**

**Reporting:**
- Every frozen PVP-1A criterion is evaluated and reported with its value, as a **would-be** result.
- Any verdict word is prefixed **DX-**: DX-MECHANICAL-PASS, DX-PARTIAL, DX-ARCHITECTURAL-FAILURE.
- No threshold, window or rule is changed. No second entry and no parameter search.
- Post-hoc analyses are labelled post-hoc. Allowed: solver / timestep sensitivity and counterfactuals that isolate causes. None may change the reported DX result.
