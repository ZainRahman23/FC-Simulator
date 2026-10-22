# DRIBBLING VOCAB-1 — handoff

## Playables (LOCAL ONLY — a real player's model)

- **THE DRIBBLING LAB:** http://127.0.0.1:8361/sandbox/visual/vocab1_lab.html
  - `?case=<n>` opens the gallery on case n; `&mode=mirror` or `&mode=pair` opens it mirrored or side by side.
- **THE UNIFIED JOYSTICK SANDBOX:** http://127.0.0.1:8361/sandbox/visual/vocab1_sandbox.html

## The code (`sandbox/visual/vocab1/`)

It is a copy of `phys1/`, which carries CARRY-B and the physical ratings. Every other page is unchanged, and the locked baseline passes its check.

| File | What |
|---|---|
| `v_tech.js` | **The library**: 17 new parametric techniques (the heel chop added on the morning of 22 Oct) in the locked baseline's reference format, built on the research's ten contact primitives. Parametric builders: `elastico()`, `solePull()`, `stopGo()`, `withSetStep()`. The merged `TEMPLATES` (the locked five + the new). |
| `v_meta.js` | **The catalogue**: every technique's family, STATUS, AUTO / MANUAL mode, purpose, entry, exit, primitives and difficulty dimensions. `AUTO_TECH` (the templates B4 may choose), `intentOf()`, and `feasibilityFor(id, dri)` (the future Dribbling envelope — the identity at 99, NOT calibrated). |
| `v_cases.js` | **The curated replays**: 79 cases (normal, high / low speed, mirror, AUTO, REJECTED, pressure, threat) and 12 chains. |
| `v_run.js` | **The case runner**, the same code in the Lab and in node: `caseOpts`, `runCaseOn`, `summarize`. |
| `u_tc.js` | **The resolver additions:**<ul><li>the manual TECHNICAL INTENT `requestSkill()`: PENDING → ENTERED (pinned) → PLAYED / REJECTED (with the reasons) / CANCELLED, recorded as an event;</li><li>`skillCands()` (every stride anchor), `whyNot()`;</li><li>FREE (request-exit) techniques; commitment from a technique's first touch;</li><li>body feints `startFeint()` (`FEINT_KINDS`); the threat `setThreat()` and its B4 term;</li><li>the HARD BRAKE entry above a technique's speed range;</li><li>the merged library; the set-step gait-placed stances;</li><li>the set touch's landing held until the standing foot lands; no set touch beyond a committed touch.</li></ul> |
| `u_sim.js` | `feintTick()`: the analog feint recognition; the request quantised before the unified step reads it (the replay path bit-identical); committed turn-step landings keep their anticipation. |
| `u_gait.js` | **Phase 1:**<ul><li>one footfall, one support (an anchor takes a kept footfall);</li><li>the pivoting support;</li><li>the turn step (around the planted foot; landing for the facing it will stand under, within reach, turned toward it);</li><li>the pivot recomputed by every plan, unwrapped;</li><li>the off-ball shift never across the root's line.</li></ul> |
| `u_body.js` | **Phase 1:**<ul><li>the turn step's route kept when the step also plays the ball;</li><li>the swing corridor 0.20 m right after the hips turn;</li><li>a carry touch's approach on its own side;</li><li>the heel rise from touchdown (≤ 6° a tick); a pivoting plant turns ≤ 10° a tick;</li><li>the HEEL contact pose;</li><li>the library's templates.</li></ul> |
| `u_viewer.js` | **The LAB:**<ul><li>the gallery, `labPlay` (looped deterministic replay), MIRROR, L | R, AUTO ⇄ REQUEST, CHAIN MODE (`labBranch`), the info box, the phase timeline, the diagnostics overlay, TRY IT LIVE;</li><li>the cameras front / rear.</li></ul>**The SANDBOX:** the skill palette (E requests). |
| `c_sim.js` | Replays the `skill` / `threat` events. |

## The tools (`sandbox/visual/vocab1/tools/`)

| Command | What |
|---|---|
| `node v_extreme.mjs [--ball 0]` | Phase 1: the extreme-redirection leg / support torture on the sandbox's player, classified normal-speed / slow-motion / diagnostic |
| `node v_cases_run.mjs --body 1 --json f` | Every curated case and chain through the Lab's own runner: results, phases, possession, body |
| `node v_battery.mjs [--body 1]` | Every library technique requested in its entry, both feet |
| `node v_try.mjs <ID> --mode RUN --angle -45 --foot R` | One request |
| `node v_feint.mjs` | Analog feint: intended / genuine / noise / random torture |
| `node v_intent_torture.mjs` | Random manual requests under the random stick: possession, outcomes, thrashing, CPU |
| `node c_torture.mjs --configs CONTROLLED --pace D38 --vocab EXPANDED --carry B` | The prolonged possession torture |
| `S99_CARRY=B node s99_bodytorture.mjs --configs D38:EXPANDED` | The posed-body random torture |
| `node v_bodytort.mjs [--seeds 6] [--seed0 1]` | The posed random torture, classified like v_extreme (ABL=… for the ablations: ant, app, heel, pivkeep, set, side, …) |
| `node v_cpu.mjs` | CPU, re-plan cost, candidates per re-plan, worst tick — against `ballon1` |
| `node v_det.mjs --seeds 18` | Determinism, including the replay path |
| `PT_TMP=… PUPPETEER_NODE_MODULES=… node v_browser.cjs --out dir` | The Lab and the sandbox in Chrome |
| `node v_catalogue.mjs --cases evidence/cases.json --out VOCABULARY.md` | The catalogue |

## Evidence

`review_artifacts/dribbling_vocab1/evidence/` holds every tool's output, with `*_BEFORE.txt` = the build tonight started from (`ballon1`, CARRY-B).

## Not done / next on the owner's word

1. The owner's visual review of every technique.
2. The remaining crossings under A99-C's low-speed facing whip: needs a low-speed facing-rate decision (agility / physical: the owner's).
3. The heel chop's exit step and the roulette's drag (both EXPERIMENTAL, both playable).
4. Calibrating the Dribbling envelope (`feasibilityFor`) and Weak Foot.
5. Defenders.
