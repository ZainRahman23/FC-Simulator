# TECHNICAL-CONTROL PLAYTEST-1.2 — handoff

**Page:** the same sandbox as PLAYTEST-1, `sandbox/visual/tc_playtest1.html`, served from the worktree root: http://127.0.0.1:8361/sandbox/visual/tc_playtest1.html
**Module map:** `review_artifacts/tc_playtest1/HANDOFF.md` still describes the modules; this file lists only what PLAYTEST-1.2 added.

## Simulation (`tc_playtest1/pt_sim.js`)

**`OFF` (exported):** switches for bisection only. All are off in play.

| switch | mechanism |
|---|---|
| `air` | in-flight landing commitment |
| `retime` | its bounded re-time |
| `gv` | gaitValid |
| `fc` | footCan |
| `hold` | held touch |
| `vol` | volatile input |
| `intent` | intent deferral |
| `order` | feet-order pelvis band |
| `side` | own-side touches / landings |

**Commitment — `committed(cur, t)`:**
- landed stances;
- an airborne foot's next landing, within 0.35 s (`posC` stored);
- the landing after a committed touch;
- contacts within `react`.

**Merging into a committed landing — `gaitFrom`:** a technique stance on a committed landing is merged into it.
- re-aim ≤ 0.15 + 3·Δt, cap 0.45 m;
- re-time later by ≤ 25 % of the remaining flight, cap 70 ms;
- the re-timed landing is measured against the committed one carried with the body.

`anchorTimes` offers those landings, including the later re-time.

**Validation:**
- `gaitValid(S)`;
- `ownSide(p, X, other, psi)`;
- `footCan(plan, X, tc, Q, vBody)`;
- `ballFits(plan)`: the technique's ball ≤ 0.30 m from its decisive contact point, for candidates and for pinned re-instances.

**`controlAt(t)`** drives the HUD:
- status, phase, next contact, margin;
- raw vs active intent;
- the queued action.

**Intent:**
- deferral: a change within 0.25 s waits for a decision point (≤ 0.15 s since the plan);
- volatility: ≥ 2 changes in 0.5 s.

**Determinism:** the trig comes from `physchar2/core/v2_math.js`: `dsin`, `dcos`, `datan2`, `dacos`, `dnorm`. This is used by `pt_sim.js`, `pt_ball.js` and `pt_input.js`.

## Presentation and page

**`pt_body.js`:**
- plan-pure `stAt` / `ballAt` (`plan.ball0`);
- swing inheritance from the displayed foot;
- `detour` / `bootPen`;
- `clearOfBall` with sliding push and a contact-window fade.

**`pt_torture_seq.js`:** the 35 torture sequences (`SEQ`), `MODES` (stick radius per speed group, sprint flag) and `T0`.

**`pt_viewer.js` + `tc_playtest1.html`:**
- the torture preset (select + speed group + ▶ play) driving the page's own stick;
- the CONTROL HUD lines and status strip;
- `PT.torture(name, mode)`, `PT.load(rec)`, `PT.hud().control`.

## Tools (`tc_playtest1/tools/`)

| tool | does |
|---|---|
| `pt_torture.mjs [--json f] [--only s] [--modes …] [--nopose]` | the 140-run suite with every §12 metric |
| `pt_torture.mjs --extended N` | N random seeds × 4 speed groups (control only) |
| `pt_trace.mjs "<seq>" <MODE> t1,t2` | decision trace of one torture run |
| `pt_legs.mjs` | classify leg crossings |
| `pt_jumps.mjs` | classify foot jumps |
| `pt_bisect.mjs` | key sequences with each `OFF` switch |
| `pt_record.mjs` | a torture run → a session record for the page |
| `pt_frames.cjs` | load a record in Chrome, seek, screenshot |
| `pt_torture_browser.cjs --out d [--seqs a\|b] [--mode M]` | the page's torture preset in Chrome |
| `pt_tests.mjs` | now includes the mirror sweeps (W→D, run and sprint) |

**Browser tools** need these variables:
- `PUPPETEER_NODE_MODULES=<scratch>/node_r/node_modules`;
- `PT_TMP` and `TMPDIR` set to a scratch directory (the system temp is not writable here).

Each tool deletes its Chrome profile afterwards. The disk is nearly full.

## Not done (see the report §5–6)

- Leg crossings (387 spans), foot jumps (461), 5 support collisions, 1 crossed support.
- Ball inside a boot 4.4 %.
- Owner decisions on the in-flight commitment's phase cost and on the next step.
