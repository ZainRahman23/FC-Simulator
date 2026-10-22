# PHYSICAL RATINGS V1 — handoff

**Page:** http://127.0.0.1:8361/sandbox/visual/phys1.html (LOCAL ONLY). Query options:
- `?phys=PHYSICAL-99 | PHYSICAL-80-A | PHYSICAL-80-B | PHYSICAL-80-C` (default PHYSICAL-80-B, a starting point only);
- `?ref=0` (no reference runner);
- `?diag=1`.

**State:** provisional; NOT frozen; stopped for the owner's playtest. The ball is always off. Dribbling / Ball Control are not calibrated.

## The code (`sandbox/visual/phys1/`, a copy of `ballon1/`; `ballon1/` and every other page unchanged)

| File | What changed |
|---|---|
| `ratings.js` (new) | **The model:**<ul><li>Sprint Speed: `sprintKmh`, `sprintMs` — the approved mapping, in integer tenths.</li><li>Acceleration: `accCapability`, `accProfile` (generated curve, L bisected to the measured capability), `milestoneTimes`, `measuredCapability`.</li><li>Agility: `AGI_SCALES` A / B / C, `agiCapability`, `agilityProfile`, `redirectionDemand`, `curveCapacity`.</li><li>`PHYS_PRESETS`.</li></ul>The header documents every formula. |
| `s_movement.js` | A99-C's envelope reads `p.g` (Agility capability): duration × (1 + 2.0(1−g)Dm), retention ^ (1 + 4.5(1−g)Dm), a held curve's lateral-acceleration capacity 11 / (1−g), and the stop duration. `redirectionDemand` and `curveCapacity` are exported. With g absent (A99-C), the behaviour is unchanged. |
| `pace.js` | `applyPhys(P, phys, ratings, C)`: the rated vmax, acceleration curve, envExtend and Agility profile. 99 / 99 / 99 keeps D38's own objects. |
| `u_sim.js` | The plan uses `P.agiProfile` (A99-C when absent); exports `C_AGILITY`. |
| `c_sim.js` | `o.phys` applied on reset and in `setAttrs`. |
| `u_viewer.js` | `window.PHYS`:<ul><li>the PHYSICAL switch;</li><li>⇄ N (same input → next);</li><li>the reference runner (the other of 99 ⇄ 80);</li><li>the ratings HUD (redirection tracker);</li><li>CUSTOM RATINGS (⚙);</li><li>`PT.phys` / `nextPhys` / `redir` / `demand` / `refPhys`.</li></ul> |
| `s_tests.js` | `PHYS_TESTS` — the owner's 21 tests. |
| `tools/u_env.mjs` | `PHYS=PHYSICAL-80-C` or `PHYS=80,80,40,C` runs any tool on a rating set. |
| `sandbox/visual/phys1.html` | The page. It is a copy of `ballon1.html` with the PHYSICAL bar; the carry, techniques, stack and ball controls are hidden. |

## The tools (`sandbox/visual/phys1/tools/`)

| Command | What it produces |
|---|---|
| `node r_ratings.mjs --json f` | <ul><li>Sprint 1–99 validation.</li><li>The Acceleration anchors, measured in the sim.</li><li>The S99/Acc50 vs S50/Acc99 proof, and Agility / Acceleration never changing vmax.</li><li>PHYSICAL-99 / 80-A / B / C: splits, milestones, cuts, repeated steering, cut → accelerate, stop → accelerate.</li></ul> |
| `node r_agility.mjs [--scales A,B,C] [--ratings 99,90,…] --json f` | The Agility tables: cuts 30–180°, repeated input, gentle cases (S99 · Acc99 · ball off). |
| `node r_tables.mjs --agility … --ratings … --out …` | `PHYSICAL_RATINGS_V1_TABLES.md` from the evidence JSON. |
| `node r_equiv.mjs` | phys1 ≡ ballon1 (CARRY-B preserved); PHYSICAL-99 ≡ unrated ≡ the S99 build; determinism of the 80s and an extreme. |
| `node r_cpu.mjs` | The incremental CPU. |
| `PHYS=<set> node s_legs.mjs --pace D38` | Leg torture on a rating set. |
| `PT_TMP=… PUPPETEER_NODE_MODULES=… node r_browser.cjs --out dir` | The page in Chrome: presets, determinism, ⇄ N, custom ratings, screenshots. |

## Evidence (`review_artifacts/physical_ratings_v1/evidence/`)

`ratings.json/.txt` · `agility_tables.json/.txt` · `equiv.json/.txt` · `cpu.txt` · `browser.json` · `legs/s_legs_*.txt`

The browser screenshots stayed in the session scratchpad. They are not owner screenshots, so they are not committed.

## The owner's open decisions

1. The Agility scale: A, B or C.
2. The Acceleration curve: shape and bands.
3. Whether the 80 / 80 / 80 athlete feels correctly rated.

Then, on the owner's word: freeze or adjust the mappings, and Dribbling's share of the physical ability (later).
