# CRUYFF-CHOP-1 — handoff

- **Lab:** http://127.0.0.1:8361/sandbox/visual/cruyff_chop1_lab.html. The COMPARE section is in the gallery; `?case=<n>` opens a case.
- **Sandbox:** http://127.0.0.1:8361/sandbox/visual/cruyff_chop1_sandbox.html
- **The code** is `sandbox/visual/cruyff_chop1/`, a copy of `vocab1/` (VOCAB-1 is unchanged).

| File | What changed |
|---|---|
| `v_tech.js` | `CRUYFF_E` and `CHOP_E`: elite deep copies of the locked references (`eliteOf`, flags `elite` / `credible`, the Cruyff's `vCmax` 3.0); they override `CRUYFF` / `CHOP` in `TEMPLATES` here (tools: `ABL=eliteT` / `eliteC` / `eliteH`) |
| `u_tc.js` | `entryMax()` (the over-speed threshold, with `vCmax`)<br>the credible post-contact speeds in `keysFor` (`credible`)<br>the contact-speed gate (`vcmax`)<br>`TRIMMED.CHOP` (no hop, 3.0–6.0 m/s)<br>`ENTRY_FAMILY`: both entries for Cruyff / chop, requested or automatic, plus the shortest-entry cost (`entry`)<br>`PREP_TECH` and the preparation phase in `requestSkill` and the line hold (`prep`)<br>the sole set touch (`setsole`) |
| `c_sim.js` | `reaim()` holds the line while a request prepares |
| `v_meta.js` | CRUYFF_SHORT removed<br>the four entries rewritten: `tier` SIMPLE / ELITE, entries, purposes |
| `v_cases.js` | new variants<br>`COMPARES`: 9 A \| B pairs with the measurement's run-ups |
| `v_run.js` | `exitMetrics()`, shared by the Lab and the tools<br>`noElite` cases (Cruyff / chop gated off) |
| `u_viewer.js` | the A \| B mode in `labPlay(c, "vs", pair)`<br>the COMPARE gallery<br>both lanes labelled<br>the comparison table in the info box |

## Tools (`cruyff_chop1/tools/`)

- `node cc_measure.mjs [--techs …] [--modes WALK,JOG,RUN,FAST,SPRINT] [--angle -120] [--phases 4]` — the hierarchy, phase-averaged.
- `node cc_compare.mjs` — the Lab's COMPARE pairs in node.
- `v_cpu.mjs` now compares against `vocab1`.
- The rest are VOCAB-1's tools, unchanged.

## Not done / next on the owner's word

1. The owner's 1× review of the COMPARE pairs.
2. The jog chop decision.
3. Sprint arc vs chop, once there are defenders.
4. Calibrating Dribbling (who reaches the elite solutions) and Weak Foot.
