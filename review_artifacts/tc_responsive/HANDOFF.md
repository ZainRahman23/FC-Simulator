# TC-RESPONSIVE-1 — handoff

**Page:** `sandbox/visual/tc_responsive.html` loads `tc_responsive/rs_viewer.js`. The local server root is the worktree:
- A/B page: http://127.0.0.1:8361/sandbox/visual/tc_responsive.html
- URL parameters: `?engine=baseline` opens on the baseline engine; `?sprintLong=1` turns on long sprint touches.
- Locked baseline page: http://127.0.0.1:8361/sandbox/visual/tc_baseline_88573ef0.html

The locked baseline must never be edited. `bash review_artifacts/tc_baseline_88573ef0/bl_lock_check.sh` (run from the worktree root) must PASS before every commit.

## Modules (`sandbox/visual/tc_responsive/`)

| File | Role |
|---|---|
| `rs_sim.js` | The experiment's authoritative simulation (240 Hz). It exposes the same PlaySim API as the baseline, so the viewer and body work on either engine. See the outline below. |
| `rs_body.js` | Presentation, built from the baseline body, which never writes to the sim. It adds: the acknowledgement layer (25 ms intent average: pelvis / torso / head lead, braking and lateral lean); plan-pure stances and ball; swing continuity (inherits the displayed foot, speed-capped); detours round the ball; smooth ball clearance. |
| `rs_viewer.js` | The A/B page. `ENG` maps `experiment` to `rs_*` and `baseline` to `../tc_baseline_88573ef0/pt_*` (read-only). It provides the engine switch, ⇄ same input (key X: re-simulate the recorded input on the other engine, then replay it), the torture preset, the long-sprint-touch toggle, and HUD clocks (root / contact / line since the last stick change) with the next contact's status. The test surface is `window.PT`: `engine()`, `load()`, `same()`, `torture()`, `record()`, `hud()`, `verify()`. |
| `pt_ball.js`, `pt_input.js` | 88573ef0's modules with deterministic trig (`physchar2/core/v2_math.js`), which is what makes node ≡ browser. |
| `pt_params.js`, `pt_tech.js`, `pt_baked.json` | Byte-identical copies of 88573ef0's. |
| `pt_torture_seq.js` | PLAYTEST-1.2's rapid-input torture sequences. Test input only; no 1.2 gameplay or gates were imported. |

### `rs_sim.js` outline

- **Constants.** `RX` holds the global limits: hysteresis 4°, approach ≥ 0.06 s, support ≥ 0.07 s, foot recovery 0.16 s, touch gap 0.10 s, foot speed `2.2·max(2.5, v) + 4` m/s, contact radius `R + 0.04`, witness 0.06 m. `FAM` holds each family's staging box, speed share, acceleration limit, proxy acceleration, maximum redirect and turn range.
- **`step()`.** Each tick: accept the latest intent (re-plan if it changes > 4°), run the interceptor probe, execute due contacts, record commitments, refresh, hash.
- **`execute(c)`.** The witness test (MISSED if the proxy is not at the ball, or if the ball was already played this tick). Then either the disturbed-ball deflected touch or the aimed launch. Then the next-touch schedule (`nextOpp`) and the commitment log.
- **`kept()`.** Keeps causally committed contacts (`c.t − t ≤ tauC` with the proxy free), past stances, landings under 0.05 s away, and the proxy state. Nothing else survives a re-plan.
- **`generic()`.** Builds the natural path (`_nat`: the body steering freely toward the intent, following the ball), then screens family × foot × contact time. The running plan's pending touch is always re-screened at its own time, which is the circle fix: a turning stick no longer postpones a touch forever. The best per family is built (at most 6), and named techniques are instantiated as further candidates.
- **`screen()`.** The cheap feasibility check: time-limited staging variants, staging-box clamp, carry departure from the natural path, top-speed check, and the proxy Hermite speed check from the foot's real state.
- **`buildGeneric()`.** Root track, envelope aim (or the check touch's roll-to-rest), the root track again with the follow-the-ball exit, contact anchors, plant, gait, then the support / proxy-speed checks.
- **`cost()`.** One cost for every candidate: line time, relevant-contact time, placement / busy / premature / schedule (non-urgent), effort, input response, separation, weak foot, switch, continuity.
- **`tauCommit(fam)`.** `√(2·R/aProxy)`.
- **`interceptAt()`.** The probe's sphere.

## Tools (`tc_responsive/tools/`, run with node from `tc_responsive/`)

| Tool | What it does |
|---|---|
| `rs_ab.mjs [--set primary\|secondary\|all] [--only s] [--json f] [--txt f]` | The A/B report card. Primary = the 24 preregistered paired traces; secondary = the owner's key tests. |
| `rs_torture.mjs --engine RX\|BASE [--nopose] [--json f] [--extended N]` | The torture suite and the extended random suite. |
| `rs_interceptor.mjs [--json f]` | Interceptor cases A / B / C. |
| `rs_neutral.mjs` | Gameplay hash with rendering off / on / a different visual variant. |
| `rs_resim.mjs <session.json>` | Re-simulates a browser session in node (either engine). |
| `rs_browser.cjs --out dir` | The A/B page in Chrome. Needs `PT_TMP`, `TMPDIR`, and `PUPPETEER_NODE_MODULES` set to a puppeteer-core install. |
| `rs_snap.mjs`, `rs_probe.mjs`, `rs_stop.mjs` | Snap sweep, single-trace probe, stop after release. |
| `rs_env.mjs` | `makeSim("RX"\|"BASE", o)`. |

## State

- Presented for the owner's hands-on A/B. Not frozen, not integrated.
- The results and known gaps are in `TC_RESPONSIVE1_REPORT.md`.
- The next steps depend on the owner's play. The candidates are the gaps in the report's §6: sprint reversal, exit speed, leg crossings, separation, stop at jog.
