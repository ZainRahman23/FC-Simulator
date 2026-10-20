# TC-RESPONSIVE-1: the responsiveness experiment beside BASELINE-88573ef0

**Status:** presented for the owner's hands-on A/B. Not frozen, not integrated. Local only: the character is a real player's model.

**Pages:**
- A/B page: http://127.0.0.1:8361/sandbox/visual/tc_responsive.html
- Locked baseline: http://127.0.0.1:8361/sandbox/visual/tc_baseline_88573ef0.html (unchanged; `bl_lock_check.sh` PASS)

I cannot play video in real time. Every number below comes from deterministic simulation runs and headless Chrome captures, not from watching the motion. The owner's own play decides.

## 1. What was built (the approved architecture, with the owner's five decisions)

All new code lives in `sandbox/visual/tc_responsive/`. It is built from the locked 88573ef0 modules plus the deterministic and browser-test infrastructure. PLAYTEST-1.2's zero-loss and body gates are not imported.

| Owner decision | What the experiment does |
|---|---|
| 1. Two simulation-owned foot/contact proxies with finite reach and speed; presentation owns footsteps | `rs_sim.js` keeps a proxy per foot. A planted foot rests on its support. A free foot swings on a Hermite curve from its own position and velocity to the contact point behind the ball. Its speed is limited by `vFoot(v) = 2.2·max(2.5, v) + 4` m/s, and it may lift only after a 0.07 s support. At execution the proxy must be within `hitR + 0.06` m of the actual ball, or the touch is MISSED. The body (`rs_body.js`) draws the footsteps and must show the foot at the contact. |
| 2. Generic contacts for ordinary analog control; named moves as contextual candidates with no angle bucket and no timing penalty | Eight generic families: CARRY, INSIDE / OUTSIDE redirect, GATHER, URGENT REACH, CHECK TOUCH, BRAKING PIVOT, STOP. The five named techniques (chop, outside cut, Cruyff, hook, drag-back) are built as ordinary candidates. All candidates are scored by the same cost: time to the new line, time to the relevant contact, effort, separation, weak foot, response, continuity. Named moves win only when they are cheaper. |
| 3. Build from locked 88573ef0 plus test infrastructure only | The new engine sits beside the baseline. The baseline engine is loaded from `tc_baseline_88573ef0/` (read-only) for the A/B. |
| 4. Interceptor probe now, real defender later | `tools/rs_interceptor.mjs`: a deterministic sphere crosses the ball's path around a planned touch. |
| 5. Timing targets are report-card metrics only | Nothing was tuned to a target. The tables below are for information. |

**Causal commitment.** A contact is protected only once its contacting proxy has entered its final approach: the last `√(2·d/a_proxy)` before the touch (d = ball radius, a = the family's proxy acceleration). Changing the contact inside that window would need discontinuous foot motion. Only that one contact is protected. Everything else re-plans on the tick the stick changes, including the root, the other foot, and later contacts.

**Input response ≠ ball contact ≠ turn completion.** The report card measures four separate clocks:
- the authoritative root (the simulation's velocity or facing responds);
- the visible body (the acknowledgement layer);
- the first relevant contact (one that sends the ball toward the new intent);
- the new line (travelling within 15° of the intent at 40 % or more of the requested speed for 0.1 s).

The authoritative root brakes and turns from the first tick: velocity-vector steering, then a cubic approach to each contact's staging state. The visible lean and look is a presentation of what the root is already doing. It never stands in for a root that keeps running the old way.

**Other pieces:**
- Contextual touch interval. The next touch comes at the opportunity the last touch aimed for; sprint uses one-stride touches by default. The page has a "long sprint touches" toggle.
- Control envelope. A redirect aims the ball where the body will be at the next opportunity.
- A disturbed ball (not where the plan predicted) gets a physical deflected touch, never the old aim.
- A/B page: engine switch, ⇄ same input (key X), torture preset, replay.

## 2. Report card: the 24 preregistered paired traces (primary)

Each group is 4 stick traces × 4 stride phases (offsets i·cycle/4). Times are medians, in seconds after the stick change; p95 in brackets. "Contact" = the first relevant contact; "line" = the new line.

| Group | Engine | Root | Visible | Contact | Line | Exit 70 % | LOST | Stale |
|---|---|---|---|---|---|---|---|---|
| H90 · JOG | 88573ef0 | 0.07 (0.29) | 0.19 (0.36) | 0.55 (0.71) | 0.60 (0.71) | 0.60 | 2 | 0 |
| | experiment | **0.01** (0.02) | **0.01** (0.01) | **0.12** (0.37) | **0.36** (0.39) | 0.36 | 0 | 0 |
| REV · JOG | 88573ef0 | 0.07 (0.29) | 0.16 (0.19) | 0.88 (1.58) | 1.16 (1.56) | 1.31 | 1 | 4 |
| | experiment | **0.01** | **0.01** | **0.46** (0.75) | **0.78** (1.01) | 0.94 | 0 | 0 |
| RAP · JOG | 88573ef0 | 0.05 (0.07) | 0.08 (0.08) | 0.52 (0.68) | 0.80 (0.97) | 0.95 | 0 | 0 |
| | experiment | **0.01** | **0.01** | **0.10** (0.14) | **0.36** (0.37) | 0.38 | 0 | 0 |
| H90 · SPRINT | 88573ef0 | 0.35 (0.60) | 0.43 (0.66) | 0.80 (0.91) | 1.08 (1.09) | 1.54 | 0 | 3 |
| | experiment | **0.01** | **0.01** | **0.25** (0.28) | **0.67** (0.68) | 0.90 | 0 | 0 |
| **REV · SPRINT** | 88573ef0 | 0.24 | — | **0.70** (0.77) | **0.90** (0.95) | **1.40** | 0 | 5 |
| | experiment | 0.01 | 0.01 | 0.92 (0.92) | 1.26 (1.55) | 1.90 | 0 | 0 |
| RAP · SPRINT | 88573ef0 | — | — | 0.57 (**0.75**) | 0.76 (**0.93**) | 1.33 | 1 | 3 |
| | experiment | 0.01 | 0.01 | **0.28** (1.16) | **0.74** (1.49) | 1.04 | 0 | 0 |

(— = that clock did not fire within the deadline in the median trace.)

**Reading:**
- **Confirmed, measured:** the experiment answers the stick on the next tick, both in the simulation and on the body. The baseline answers after 0.05–0.35 s in the simulation and after 0.08–0.43 s on the body.
- Sprint reversal is worse. Relevant contact comes 0.22 s later than the baseline and the new line 0.36 s later. The experiment brakes the body physically, using a check touch and a braking pivot. The baseline's chop / drag-back templates reverse the ball sooner. **Inference:** the experiment's braking pivot / check touch is too conservative at sprint, and a sprint reversal is a case where a named move should win but is currently costed out.
- RAP · SPRINT has a worse tail (p95 1.16 / 1.49 vs 0.75 / 0.93).

## 3. Report card: the key tests (secondary, the owner's list)

| Test | Engine | Contact | Line | Exit 70 % | Line failed | LOST / double / stale |
|---|---|---|---|---|---|---|
| sprint snap 45° | 88573ef0 | 0.33 | 0.55 | 0.55 | — | 0 / 0 / 0 |
| | experiment | **0.16** | **0.32** | 0.33 | — | 0 / 0 / 0 |
| sprint snap 90° | 88573ef0 | 0.68 | 0.86 | 1.31 | — | 0 / 0 / 6 |
| | experiment | **0.24** | **0.65** | 0.91 | — | 0 / 0 / 0 |
| sprint snap 120° | 88573ef0 | 0.69 (p95 **1.05**) | 0.97 (p95 **1.33**) | **1.43** | — | 0 / 0 / 5 |
| | experiment | **0.44** (p95 1.22) | **0.95** (p95 1.81) | 1.68 | — | 0 / 0 / 0 |
| **sprint snap 180°** | 88573ef0 | **0.54** | **1.11** | **1.68** | — | 0 / 0 / 6 |
| | experiment | 0.63 | 1.21 | 2.08 | — | 0 / 0 / 2 |
| run rapid left/right | 88573ef0 | 0.35 | 0.66 | 0.68 | — | 3 / 0 / 7 |
| | experiment | **0.16** | **0.34** | 0.47 | — | 0 / 0 / 0 |
| run 0→90→0→−90 | 88573ef0 | 0.52 | 0.78 | 0.85 | 21/32 | 2 / 2 / 9 |
| | experiment | **0.20** | **0.46** | 0.49 | **9/32** | 0 / 0 / 1 |
| run small 20–40° | 88573ef0 | 0.20 | 0.18 | 0.25 | 4/64 | 0 / 0 / 0 |
| | experiment | **0.12** | **0.13** | 0.14 | 1/64 | 0 / 0 / 0 |
| sprint rapid left/right | 88573ef0 | 0.14 | 0.43 | **0.92** | — | 4 / 3 / 5 |
| | experiment | 0.11 | 0.40 | 1.14 | — | 0 / 0 / 0 |
| sprint 0→90→0→−90 | 88573ef0 | 0.52 | 0.79 | **1.10** | 21/32 | 5 / 1 / 12 |
| | experiment | **0.26** | **0.49** | 1.33 | 20/32 | 0 / 0 / 0 |
| sprint small 20–40° | 88573ef0 | 0.19 | 0.19 | 0.23 | 21/64 | 1 / 4 / 0 |
| | experiment | **0.13** | **0.17** | 0.17 | 0/64 | 0 / 0 / 0 |
| run 1 Hz circle | 88573ef0 | heading error 100°, 2.22 contacts/s | | | | 0 / 5 / 31 |
| | experiment | heading error 91°, 1.44 contacts/s, separation median 0.99 m | | | | 0 / 0 / 0 |
| sprint 1 Hz circle | 88573ef0 | heading error 93°, 2.09 contacts/s | | | | 2 / 7 / 32 |
| | experiment | heading error 93°, 1.97 contacts/s | | | | 0 / 0 / 1 |

"Stale" = a contact more than 80 ms after a stick change that sends the ball more than 60° off the current intent at more than 2 m/s.

**Circle fix found during this pass.** On a continuously turning stick, the experiment re-planned every ~12 ms and pushed the next touch back by one approach window each time, so the touch never happened. The sprint circle LOST the ball 8 times with about 0 contacts/s. The fix: the running plan's pending touch is always re-screened at its own time and re-aimed at the latest intent. The proxy's real speed limit is still checked, and the touch competes on cost. After the fix the sprint circle has 0 losses and 1.97 contacts/s. The primary 24 traces are unchanged (identical numbers).

## 4. Commitment durations, measured by family and context

| Family | Commitment | n (all A/B runs) |
|---|---|---|
| URGENT REACH | 29 ms | 146 |
| INSIDE / GATHER redirect | 33 ms | 31 |
| CARRY | 37–38 ms | 704 |
| CHECK TOUCH | 37–38 ms | 54 |
| BRAKING PIVOT | 42 ms | 16 |
| named techniques (HUD, e.g. drag-back) | ~36 ms | — |

**Observation:** the duration depends only on the family, never on the context (jog, sprint, circle, reversal). The window is `√(2·d/a)` and each family's proxy acceleration is a constant. The per-context table is in `evidence/AB_*.json` (`commit`). If the owner wants commitment to vary with speed or reach, the proxy acceleration has to become state-dependent. That is a design decision, not done.

## 5. Control, physics honesty, determinism

| Check | Experiment | 88573ef0 |
|---|---|---|
| Torture suite, 140 runs / 869 s: LOST | **0** | 26 |
| recoveries (pursuits started) | **100** | 528 |
| missed contacts | 0 | 0 |
| double touches | **0** | 11 |
| abandoned after commit | 0 | 0 |
| crossed supports | **10** | 43 |
| support collisions | 3 | 2 |
| foot jumps | **1332** | 1893 |
| leg-crossing spans | 656 | **528** |
| ball-in-boot ticks | 7524 | 7583 |
| Extended random suite, 240 runs / 2184 s: LOST | **0** | 108 |
| recoveries | **165** | 1235 |
| double touches | **0** | 48 |
| contacts | 5521 | 4065 |

**Interceptor probe:** 3 / 3 PASS (`evidence/INTERCEPTOR.*`).
- **A**, 150 ms before the touch: the interceptor plays the ball and the planned touch never applies.
- **B**, 25 ms before, inside the 38 ms commitment: the committed foot arrives and meets the ball physically. The result is a deflected touch, not the old aim.
- **C**, control: the touch executes and the interceptor finds nothing.

**Neutrality:** rendering off, rendering on, and a different visual variant give identical gameplay hashes for every case tested (`evidence/NEUTRALITY.txt`). The presentation never affects the simulation.

**Node ≡ browser:** 7 Chrome sessions on both engines re-simulate in node with identical hashes (`evidence/RESIM_node_vs_browser.txt`).

**A/B page in Chrome:**
- same-input switch: identical input on both engines, and the hash is identical when switched back;
- determinism verified on every run;
- no console errors, no HTTP errors;
- frame p99 16.8 ms;
- experiment work avg 1.2–1.5 ms, p99 4.8–7.6 ms, worst 12.6 ms (baseline avg 1.4 ms, p99 3.6–3.8 ms, worst 8.1 ms).

## 6. Known gaps (honest)

1. **Sprint reversals are worse than the baseline:** REV · SPRINT, sprint snap 180°, and the snap 120° tail. The experiment brakes physically with check touch and pivot; the baseline's chop / drag-back reverse the ball sooner. Not fixed.
2. **Exit to 70 % speed** after sprint changes is slower in several sprint tests (rapid L/R 1.14 vs 0.92; 0→90→0→−90 1.33 vs 1.10).
3. **Leg crossings are about 24 % higher** in the torture suite (656 vs 528 spans). The acknowledgement layer is not the cause (measured 244 vs 228 with it off).
4. **The ball runs further from the feet:** median separation 0.69–0.75 m vs 0.57–0.58 m at jog, and 0.99 m in the run circle. The experiment also touches more often (2.1–2.5 vs 1.7–2.1 contacts/s at jog).
5. **Stopping after release is slower at jog and run** (body below 0.3 m/s after 0.65–1.30 s vs 0.44–1.09 s). It is similar at sprint (1.30–1.45 s vs 1.01–1.88 s). See `evidence/STOP_AFTER_RELEASE.txt`.
6. **Named moves rarely win.** They appear mostly in circles and fast alternations, almost never on a single snap. Under the uniform cost the generic urgent reach or check touch is usually cheaper. This may be the right football answer, or it may be the cause of gap 1. Owner judgement.
7. **Neither engine follows a 1 Hz circle** (heading error about 90°). That stick rotates faster than either body can turn.
8. A few stale contacts remain: 2 in sprint snap 180°, 1 in run 0→90→0→−90, 1 in the sprint circle. Committed touches that fire inside the commitment window can still go the old way. That is by design.

## 7. What the owner should try (hands-on)

- On the A/B page, play sprint → snap 90° / 180°, rapid left / right, small corrections, and a circle. Press **X** to replay exactly the same input on the other engine, and **X** again to come back.
- The **long sprint touches** checkbox switches sprint between one-stride touches (default) and longer knock-ons.
- The **Torture** select + ▶ play runs a preset on whichever engine is selected.
- The HUD shows the next contact (PROVISIONAL / COMMITTED, with its commitment window), the feet, and the clocks since the last stick change (root / contact / line).

## Evidence

- `evidence/AB_PRIMARY_24.*`, `evidence/AB_SECONDARY_KEYTESTS.*`: the report cards, with per-trace data.
- `evidence/TORTURE_*.*`: experiment vs baseline, standard and extended.
- `evidence/INTERCEPTOR.*`, `evidence/NEUTRALITY.txt`, `evidence/RESIM_node_vs_browser.txt`, `evidence/STOP_AFTER_RELEASE.txt`.
- `evidence/browser/`: the Chrome run, sessions, same-input records.
- `screens/`: experiment and baseline at +120 / +520 ms after snap 90° and 180°, same input on each engine, torture mid-run (headless Chrome captures).
- `sources/`: the owner's instructions verbatim, and the research PDF.
