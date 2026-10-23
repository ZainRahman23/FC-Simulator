# HANDOFF — DRIBBLING VOCABULARY INTEGRATION (Body Feint + La Croqueta), 24 Oct 2026

**Build:** `sandbox/visual/vocab2/`, a copy of `croqlw/` (b489e4fd). It is the current gameplay build.
**Pages (local only, :8361):** `vocab2_lab.html` (Dribbling Lab) · `vocab2_sandbox.html` (Joystick Sandbox).
**Recovery point before integration:** tag `checkpoint/touchline-feint-croqueta-approved-2026-10-23` (commit 9140be54; code ≡ b489e4fd); `milestone/APPROVED_MOTIONS_MANIFEST.md`.
**Status:** both moves PROVISIONALLY APPROVED MOTION FOUNDATIONS, integrated as AUTHORITATIVE vocabulary entries. Not frozen. Not in production. Nothing pushed.

## What changed against croqlw (and nothing else)

| File | Change |
|---|---|
| `v_tech.js` | **Entry gates only; no motion parameter changed.**<br>· `bodyFeintOf` / `BFEINT_L/J/R`: `entryHard` · `entryBand` · `entryV` · `carryFoot` · `setOnly` · `holdLine` · `aheadMin` · `steady`.<br>· `croqLWOf` / `CROQ_LW`: `entryHard` · `entryV` · `entryBall` · `rollOnly` · `carryFoot` · `holdLine` · `steady` · `entryLead`. |
| `u_tc.js` | The gates in `instantiate`. They apply to a **new** instance only; a pinned re-plan is never gated, so a move under way is never aborted.<br>Also:<br>· `whyNot` gives speed reasons first and quotes the validated band;<br>· a retired entry is rejected at once (`requestSkill`);<br>· `S.holdLine`;<br>· a pending integrated request is retried every 0.05 s (`"pending entry"`). |
| `c_sim.js` | `reaim` also holds a pending `holdLine` request's carry touches on its entry line, as it already did for a braking preparation. |
| `u_sim.js` | The old analog feint (`feintTick`) is off unless `o.analogFeint` or `ABL=analogfeint` is set. |
| `v_meta.js` | · `CROQUETA` → `CROQ_LW` only; `BODY_FEINT` → `BFEINT_L/J/R`; `lib` classes.<br>· The old overlay feint, the feint → cut combos and the unreviewed depths are not eligible.<br>· `ALIASES` (`BODY_FEINT_V2` → `BODY_FEINT`), `libOf`, `headlineReason`. |
| `v_cases.js` | `VI_CHAINS`, `VI_MOVES`; the old overlay feint's cases request `BODY_FEINT_OVERLAY`. |
| `u_viewer.js` | · The Lab's first section, THE DRIBBLING VOCABULARY — INTEGRATED, replaces the generation-by-generation review sections.<br>· The `lw4` engine (croqlw) is added as the croqueta's A lane.<br>· The sandbox gets the explicit requests (7 / 8 / 9 / 0) and CRUISE (U); the palette is eligible entries only; the analog-feint switch is removed. |
| `tools/` | New: `lib_repro.mjs` · `lib_bf_sweep.mjs` · `lib_croq_sweep.mjs` · `lib_chain_probe.mjs` · `lib_chains.mjs` · `lib_vi_cases.mjs` · `vi_browser.cjs`. |

## Reproduce the evidence (from `sandbox/visual/vocab2/tools`)

```sh
node lib_repro.mjs --a ../../croqlw/ --set all          # croqueta (vs croqlw) + Body Feint (croqlw's BF ≡ feint2ef's): every joint + ball, every tick — IDENTICAL
node lib_repro.mjs --a ../../feint2ef/ --set bodyfeint  # the six approved feint cases + mirror vs feint2ef
node lib_bf_sweep.mjs --angles 25,30,35,40,45,50,55,60,65 --transitions --delays 0.1,0.2,0.3,0.45,0.6,0.8,1.0,1.3   # (+ --twin)
node lib_croq_sweep.mjs --hints none --angles 35,38,40,42,45,48,50 --runups 2.2,2.25,…,3.0 --transitions --from WALK,RUN   # (+ --pref R --sides L: the cross case)
node lib_chains.mjs                                     # the 7 curated chains × mirror, twice each (determinism)
node lib_chain_probe.mjs --first BODY_FEINT --a1 45 --follow cut --a2 -50   # control return / chain timing (see INTEGRATION_REPORT §5)
node lib_vi_cases.mjs                                   # the Lab's integrated cards: approved · ordinary play · declined
PT_TMP=<dir> PUPPETEER_NODE_MODULES=<dir> node vi_browser.cjs --out <dir> --node <lib_vi_cases.json>
# the regression suites, as built and with ABL=analogfeint — review_artifacts/vocab_integration1/evidence/regression/
node ../../../../review_artifacts/vocab_integration1/tools/regress_compare.mjs
node ../../../../review_artifacts/vocab_integration1/tools/vi_cpu.mjs --rounds 5   # (and ABL=analogfeint)
```

## Next (only on the owner's word)

The final left-stick recognizer is **not started**. The owner's order lists it as the next design task once this milestone is accepted. Each move's "not generalized" list (`VOCABULARY.md`) is the open work. Do not retune either motion.
