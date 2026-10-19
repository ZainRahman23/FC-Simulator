# TECHNICAL-CONTROL-1 — handoff

**State:** presented for owner review.
- **NOT frozen:** neither RECEIVE-V1 nor a new DRIBBLE version is frozen.
- **NOT integrated:** sandbox only.
- Nothing further is queued.

The report is `TECHNICAL_CONTROL1_REPORT.md` (the 39 items). The review page is `review/TECHNICAL_CONTROL1_REVIEW.html` (LOCAL ONLY).

## What is where (`sandbox/visual/technical_control1/`)

### `tc_attrs.js`
- `ATTR`: RECEIVE-ELITE-1's Dribbling / Agility anchors, extended down to rating 1, plus:
  - `dri.cluster` (an action's contact pair) and `dri.soph` (the smooth sophistication weight);
  - `agi.aLat` (a bend's lateral acceleration).
- `techParams(ratings)`.
- `STYLES`: 6 profiles × foot / surface / rhythm / technical / feint / direct — a choice layer only.

### `tc_motion.js`
`MotionPlan` is the authored body path. It is a fixed-step integrator with the programs RUN / PLANT / STOP, plus a feint dip and a second-order facing follower.

### `tc_actions.js`
- `VOCAB`: the 9 actions (sophistication, angle range, body program, contact roles / feet / surfaces).
- `FAMILY_ORDER`, `ROLE_AT` (the ball's place per contact role), `SEL` (the selection weights), `footFor`, `bodyFor`.

### `tc_core.js`

**`TC` constants:**
- `touchU`, `landAfter`, `soleDv`;
- `gait` (incl. `stanceLen` 0.78), `rhythm`;
- `replanDeg` / `turnMin`, `recover`, `bridge`, `ddiff` (the dribble-touch difficulty), `idealCap`.

**`TechEpisode extends EliteEpisode`:**
- the body: `planAt` / `rootAt` / `psiAt`, and `splice` (re-plan with continuity, generations);
- the gait: `rebuildSwings` (the gait with forced contacts, procedural stride adjustment, stance cap) and `contactTimeOf`;
- the carry: `carryNext` (the rhythm), `plan` (receive first touch → RECEIVE-ELITE-1, then the technical carry / action; the bridge exit), `finishPlan` (surface + difficulty), `fitStyled` (surfaces incl. the stride surfaces by speed);
- the decisions: `decide` / `selectAction` / `applyAction` (the vocabulary), and `watch` (the intent between contacts);
- the closed loop: `post` / `findNext` (on the real ball; an action's later contacts keep their spacing) and `chase` (arrival-time search + shooting correction).

**`TechSim extends ReceiveSimE`:**
- `intentFn`;
- `withoutDecline` (the dry-run decline removed, restored after each call);
- `resolve2` / `beginAction` / `promote` (the cushion when the turn is not feasible);
- `afterPost`, `buildBody2` (inherit) and `startDribble` (a course start);
- the preferred foot from the player (weak foot 5 → none).

### `tc_body.js`
`TechBody` reads the contract only.
- **Startup:** `startState`, the moving run-in.
- **Feet:** `buildFeet`, `landAt` / `landAfterTouch` (reach-limited), `swingKeys` (RUN-1 template · body-relative preparation · `pathKeys`), `footAt`, `pivotFoot`.
- **Weight:** `loadOf` / `weights`.
- **Pose:** `poseAt` (pelvis / trunk / arms / head / choreography / blends / reach correction / IK).
- **Continuity:** `inherit` (C¹ across re-plans).

### `tc_course.js`
- `SECTIONS` / `COURSE`: the technical course.
- `EXTRA`: STOP and free `TURN<deg>[_L]_V<m/s>` sections.
- `RECEIVE_CHAIN`.
- `courseCase(id, seed)` / `anyCase(id, seed)`. Ids are `<SECTION>[_L][_V#][_B##_D##_A##][_S<STYLE>]`, or RECEIVE-ELITE-1's receive ids. The seed moves the intent change by +0 / 0.2 / 0.4 s.

### `tc_viewer.js` + `sandbox/visual/technical_control1.html`
The lab. URL parameters:
- `case`, `b`, `d`, `a`, `style`, `foot` (R / L / B), `seed`;
- `pipe` (NEW / RE1 / CURRENT), `compare=1|re1`;
- `vs=B##_D##_A##`, `vsStyle`, `vsFoot`;
- `bridge=sprint`;
- `single` / `A` / `B` (views), `rate`, `t`, `anim=0`, `graph=0`, `external=1`, `paused=1`.

### `tools/`

| tool | purpose |
|---|---|
| `tc_env` | `makeTech`; `footPlayer`; `TC1OVR` for experiments |
| `tc_metrics` | the §46 metrics; the body metrics |
| `tc_jobs` + `tc_sweep` + `tc_sweep.sh` + `tc_sweep_sum.py` | the sweeps: indep / presets / styles / foot / chain |
| `tc_vs_re1` | phases 1 – 2 on RECEIVE-ELITE-1's set |
| `tc_body_ab` | the human-motion A/B |
| `tc_vocab_spread` | skill usage over a spread of situations |
| `tc_neutral` | animation ON / OFF + the human-motion diagnostics |
| `tc_regress` | regression checks |
| `tc_det` | determinism and keyed draws |
| `tc_cpu` | CPU |
| `tc_chrome.cjs` + `tc_chrome_node.mjs` | Chrome = Node |
| `tc_frozen.py` | the protected-file check |
| `tc_capture.cjs` + `tc_clips.sh` + `tc_strips.sh` + `clip_lists/` | clips and strips |
| `tc_review_build.mjs` | builds the review page |
| `tc_evidence.sh` | everything, in order |
| `tc_try`, `tc_course_try` | development |

## Evidence (`evidence/`)

| file | contents |
|---|---|
| `tc_sweep.jsonl` + `tc_sweep_summary.{json,txt}` | 2,826 runs: indep BC / DRI / AGI × 9 levels, 12 presets, 6 styles, 9 foot × style sets, chain; course + receive chain × 3 seeds |
| `tc_chain.jsonl` + `tc_chain_summary.*` | 396 runs, bridge on / off |
| `tc_vs_re1.json` | phases 1 – 2 |
| `tc_body_ab.json` | the body A/B |
| `tc_vocab_spread.json` | the vocabulary spread |
| `tc_neutral.json` | 80 runs |
| `tc_regress.json` | regressions |
| `tc_det.json` | determinism |
| `tc_cpu.json` | CPU |
| `tc_chrome.json` / `tc_chrome_node.json` | Chrome = Node |
| `frozen_sha256_start.txt` / `frozen_sha256_end_check.txt` | protected files |

## For the owner's decision
1. **The visual bar at 99 / 80 / 50 and for the styles.** I cannot play video in real time; my checks are stills, strips and per-frame metrics.
2. **The bridge default.** Off is recommended: TECHNICAL-CONTROL-1 carries at every speed. `sprint` hands a straight sprint carry to DRIBBLE-V1, whose separation is then its own (2.1 m median, up to 4.3 m at low ratings).
3. **Low-BC looseness.** `TC.ddiff` (0.05 per m/s of run, 0.04 per m/s of impulse) is the knob; the protected BC curve stays.
4. **The contest proxy**, to be replaced by the engine's real space / defender geometry; weak-foot precision; a standing-with-the-ball state.
5. Freeze only after approval.

## Rebuild
```
cd sandbox/visual/technical_control1
python3 tools/tc_frozen.py start                    # once, from 140e96f1
zsh tools/tc_evidence.sh 9                          # sweeps, chain, neutrality, vs RE1, body A/B, spread, regressions, determinism, CPU, frozen end
node tools/tc_cpu.mjs <ev>/tc_cpu.json              # again, alone on the machine
node tools/tc_chrome_node.mjs <ev>/tc_chrome_node.json <specs> && PUPPETEER_NODE_MODULES=<dir> node tools/tc_chrome.cjs <ev>/tc_chrome.json <ev>/tc_chrome_node.json <profile>
S=<scratch with node_r + ffmpeg> zsh tools/tc_clips.sh tools/clip_lists/tc_clips.txt <ra>/clips 3
S=<scratch> zsh tools/tc_strips.sh tools/clip_lists/tc_strips.txt <ra>/strips 3
node tools/tc_review_build.mjs
```
