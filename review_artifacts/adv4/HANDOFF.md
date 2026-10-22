# ADV-4 — handoff

- **Lab:** http://127.0.0.1:8361/sandbox/visual/adv4_lab.html. The ADVANCED AUTO SOLUTIONS section is first in the gallery; `?case=<n>` opens a case.
- **Sandbox:** http://127.0.0.1:8361/sandbox/visual/adv4_sandbox.html. STOP-AND-GO with Shift (or the SPRINT button) held is the hesitation.
- **The code** is `sandbox/visual/adv4/`, a copy of `cruyff_chop1/` (CRUYFF-CHOP-1 and VOCAB-1 are unchanged).

| File | What changed |
|---|---|
| `v_tech.js` | `advOf` (elite + `credible` + `d38`)<br>`STOPGO_E` (DEADEN: `vCmax` 1.5, `bodyBrake`, `releaseAt` 0.10, hard 0–15°; HESITATE)<br>`vTurnOf` → `VTURN` (70–120°, ≥ 2.0 m/s, `vCmax` 2.2, `releaseAt` 0.24, the exit touch) and `VTURN_B` (a reference only)<br>`MATTHEWS_C` (35–95°, ≥ 2.0 m/s) |
| `u_tc.js` | `D38_ON` / `d38From` (the ball-carrying D38 curve)<br>the `d38` cap in `keysFor` (ADV-4 templates only)<br>`brakeOf` / `stopRate` (`bodyBrake`: the rated A99-C stop, read-only from `agility99/movement.js` PROFILES)<br>`exitRelease` + `releaseAt`<br>`TRIMMED.VTURN` / `VTURN_B` + `ENTRY_FAMILY`<br>`PREP_TECH` + the new ids<br>`noFam` (families withheld from B4)<br>ABL switches: `d38`, `bodybrake`, `release` |
| `v_meta.js` | V_TURN (`ids` VTURN)<br>STOP_AND_GO (`ids` DEADEN, `idsSprint` HESITATE)<br>MATTHEWS (`ids` MATTHEWS_C)<br>the CROQUETA text<br>V_PULL / PULL_PUSH / L_DRAG / DEADEN_EXPLODE / HESITATION / FAKE_STOP removed as player-facing entries |
| `v_cases.js` | the curated replays of the four families (NORMAL / MIRROR / variants / REJECTED)<br>`ADV_COMPARES` (11 A \| B pairs; `stop` pairs to the relaunch)<br>`ADVANCED` (the six cards, their classification and their "why" sentence)<br>the chains<br>intents carry `sprint` |
| `v_run.js` | `exitMetrics(…, o)`: prep, exit speed `v1`, the stop-and-go relaunch (`o.stop`)<br>`noFam` cases<br>the sprint flag with a request |
| `u_viewer.js` | the ADVANCED AUTO SOLUTIONS cards (PLAY / COMPARE / MIRROR / AUTO / TRY / 1× 0.5× 0.25×)<br>the A \| B table (prep, exit speed, relaunch)<br>both lanes' paths under DIAG<br>`withSprint()` for live and sandbox requests |
| `adv4_lab.html` | the card styles; the compact A \| B table |

## Tools (`adv4/tools/`)

- `node adv_measure.mjs [--fam CROQUETA,V_TURN,MATTHEWS,STOP_AND_GO] [--modes …] [--angles …] [--lanes …] [--phases 4] [--json f]`
  - each family against the basic solutions (B4 alone, B4 without it, the named basics), 4 stride phases;
  - STOP-AND-GO to the relaunch.
- `node adv_compare.mjs [--json f]` — the Lab's ADV_COMPARES, the six cards (PLAY / MIRROR / AUTO) and the chains, run in node with the Lab's runner.
- `ABL=<rule>` switches one rule off: `bodybrake`, `vcmax`, `d38`, `credible`, `release` (plus CRUYFF-CHOP-1's `entry`, `prep`, `setsole`, `eliteT/C/H`).
- `v_cpu.mjs` now compares against `cruyff_chop1`.
- `v_battery.mjs` and `v_try.mjs` use the family ids and the sprint flag.
- `v_browser.cjs` clicks every ADVANCED card button.

## Evidence (`review_artifacts/adv4/evidence/`)

| File | What it holds |
|---|---|
| `measure_BEFORE_*` / `measure_AFTER_*` | the four families, before and after (the BEFORE stop-and-go used the old relaunch threshold) |
| `compare.txt` / `.json` | the Lab's replays |
| `ablations.md` | each rule switched off alone |
| `cases.*` | the curated replays |
| `battery.txt` | every technique requested in its curated entry |
| `extreme_ball_on` / `_off` | the extreme reversal scenarios |
| `body_torture_classified.txt` | 18 seeds; the reference is CRUYFF-CHOP-1's file |
| `body_torture_s99.txt` | + `_REF_cruyff_chop1_same8seeds.txt` |
| `torture_verbose.txt` | 40 seeds |
| `torture_wide.txt` | 160 seeds per build |
| `intent_torture.txt` | random manual requests under torture |
| `determinism.txt` | determinism, including the replay path |
| `cpu.txt` | CPU against `cruyff_chop1` |
| `contact_gaps.txt` | boot ↔ ball gaps in the curated cases |
| `feint.txt` | the analog feint |
| `browser.json` | the headless Chrome run |

## Not done / next on the owner's word

1. The owner's 1× review: the six cards and their COMPAREs.
2. The five decisions in the report (§9).
3. Open body defects:
   - the V-turn's and the compact Matthews' exit stride at a walk (both rejected there);
   - the V-turn's 60° continuation;
   - the angled deaden;
   - the V-turn from a sprint at 120° (⚠2 in 4).
4. Defenders: where the V-turn's protection, the Matthews' cue and the stop-and-go's hesitation can be scored.
