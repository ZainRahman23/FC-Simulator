# TOUCHLINE — LEFT-STICK INPUT LAB V1 — report (24 Oct 2026)

> **NO INTENT RECOGNIZER EXISTS YET.** This lab collects evidence for designing it. Nothing in it selects, triggers or buffers a technique. The intent labels are the owner's notes, and the simulation never reads them.

The owner's instruction (verbatim) is `sources/2026-10-24_user_instruction_left_stick_input_recorder.md`.

## 0. Where it is

| | |
|---|---|
| Branch | `prototype/left-stick-intent-v1`, cut from the milestone `f775daac` (`milestone/feint-croqueta-vocab-v1`, tag `checkpoint/touchline-feint-croqueta-vocab-v1-2026-10-24`). Both verified on `fc-simulator` before the cut. |
| Worktree | `~/Downloads/FC Simulator worktrees/left-stick-intent-v1` (sparse, like `dribble-1`) |
| Page | `sandbox/visual/lsi1_lab.html` |
| Serve | from the worktree root: `python3 -m http.server 8362 --bind 127.0.0.1` |
| URL | http://127.0.0.1:8362/sandbox/visual/lsi1_lab.html |
| Code | `sandbox/visual/lsi1/`: `lsr_lab.js` (the app), `lsr_signals.js` (derived signals and stick events), `lsr_state.js` (the physical-state reader), `lsr_schema.js` (the file format), `lsr_summary.js` (summaries and statistics), `lsr_plots.js` (drawings), `lsr_synth.js` (recorder-test traces), `tools/` |
| What changed in the canonical code | **Nothing.** The branch only adds files: `lsi1/`, `lsi1_lab.html` and this folder. |

**Local only.** The character is a real player's model, so never publish the page or its screenshots.

### How the lab sits on the canonical footballer

The lab page frames the canonical joystick sandbox, `vocab2_sandbox.html?external=1`. That page is not modified: same player, ball, carry, gait / support, Technical Control, vocabulary and CONTROLLED possession.

`external=1` is the page's own automation switch. With it, the page draws a frame only when told to, through `window.PT.tick`.

Each animation frame, the lab does four things, in order:

1. It reads the inputs.
2. It hands the stick to the canonical pipeline exactly as the sandbox's own stick does: `PT.stick` → `pt_input.js` `stickVector`, with the canonical deadzone 0.08 and zones 0.40 / 0.72.
3. It advances one canonical frame (`PT.tick`).
4. It records.

The physical state is read from the simulation's own 12 s history when an attempt stops (`lsr_state.js`). Nothing runs inside the simulation's tick, and the simulation never reads anything the lab computes.

The sandbox's game state is as the milestone ships it:

- **Ball, pace and vocabulary:** layered FULL · EXPANDED · D38 · CONTROLLED · CARRY-B · ball on.
- **The old analog feint is OFF.** This is checked at boot (`o.analogFeint` false) and written into every recording (`sandbox`).
- **No automatic Body Feint or Croqueta.** B4's ordinary automatic answers (redirects, braking touches, hooks, Cruyff / chop, LAT …) are the footballer's existing movement response. They are recorded and not suppressed.
- **The temporary explicit requests still work:** 7 / 8 BODY FEINT, 9 / 0 CROQUETA, E, and U CRUISE. Any attempt that used one is flagged `REQ` (`flags.explicitRequests`).
- **Contamination check:** a Body Feint or Croqueta action without a request would be counted as `flags.autoVocab`. It was 0 in every test.

## 1. What is recorded (one attempt)

| Stream | Rate | Contents |
|---|---|---|
| **raw** — what the human / controller produced | every input event | **Virtual stick:** each pointer sample. That is the down, every *coalesced* move (the browser's full-rate samples between frames) and the up. Each is an offset from the pad's centre in thumb-travel radii (+x right, +y up), unclamped, with the event's own timestamp and pointer type.<br>**Gamepad:** axes 0 / 1 and RT / LT, whenever the pad reports a new state.<br>**Keyboard:** WASD down / up.<br>**Every raw event:** `appliedK`, the first tick of the frame that consumed it. |
| **frames** — what the input pipeline read | once per rendered frame (≈ 60 Hz) | The stick the pipeline held, raw (before the deadzone, clamped to the circle); the processed vector after the canonical deadzone, and its magnitude `m`; the source; the frame heading the stick latched (the camera forward when it left the deadzone); the camera heading; SPRINT / WALK / lock; the request delivered to movement (world heading, mode); the simulation rate. |
| **ticks** — what movement received | 240 Hz | The sim's own record (`S.log.input`): the heading delivered each tick (world, or none), the mode, and the input bits. |
| **derived** | per frame | The derived stick signals (§3). |
| **stickEvents** | — | The diagnostic stick events (§3). |
| **state** | 120 Hz (every 2nd tick) | The footballer (§4). |
| **timeline** | exact tick | Touchdowns and lift-offs; ball contacts (foot, surface, role, technique) and missed contacts; actions; selections of techniques and generic touches (with their entry / contact / commitment / control-return times); control return; possession changes; explicit requests and their outcome; every re-plan with its reason. |
| **session** | — | Enough to re-simulate the attempt bit for bit: the session's start options `o0`, its whole per-tick request record (run-length encoded; exact), its events, its tick count and hash. |
| meta | — | The label (preset or custom); the input source and per-source frame counts; the pad radius (CSS px) and devicePixelRatio; the deadzone and zones; the measured frame rate, 240 Hz ticks and 120 Hz state; the sim rate; synthetic or not; the user agent; the capture mode, the ticks and times (`k0` window start · `kStart` START · `k1` STOP); the marker levels and module versions; the owner's intent mark. |

## 2. The sampling pipeline: raw vs processed

```
thumb / mouse / pad ──► raw events (pointer coalesced ≈ 60–120+ Hz · gamepad polls · keys)          ← "what the human produced"
   │  (lab) offset ÷ travel radius → clamped to the unit circle → PT.stick(x, y)
   ▼
V.stick { raw (pre-deadzone), v = stickVector(raw, dz 0.08) }                                    ← "processed" (frames.rx/ry · px/py/m)
   │  (canonical frame, ONCE per rendered frame) request():
   │     heading = latched camera-forward + atan2(v.x, v.y)      mode = WALK r<0.40 ≤ JOG r<0.72 ≤ RUN · SPRINT / WALK buttons
   ▼
the same request for each 240 Hz tick of that frame → sim.step                                    ← "delivered to movement" (ticks · frames.reqH/mode)
   │  the sim re-plans when the heading moves > 4° (> 10° while the stick rotates steadily), the mode changes, or the stick starts / stops
   ▼
plan (the authoritative foot plan, contacts, action) → state / timeline                           ← "what the footballer did" (state · timeline · planReqH)
```

Facts about the existing pipeline, recorded and not changed:

- **One sample per frame.** The stick reaches the simulation once per rendered frame. The four 240 Hz ticks in between repeat the same request.
- **Latency is at most one frame.** In the pointer test, the time from an event to the frame that applied it was median 0.8 ms, max 16.6 ms.
- **Magnitude only picks a zone.** It reaches movement as three zones (walk / jog / run). Within a zone the analog value is dropped, so a 0.75 push and a 1.00 push request the same thing.
- **Direction is relative to the camera.** It is taken against the camera forward at the moment the stick left the deadzone, and that frame is held while the stick stays out (`frames.latch`).
- **Small turns wait.** A heading change of ≤ 4° (≤ 10° during a steady rotation) does not re-plan until the next footfall, contact or 0.3 s refresh. `state.planReqH` shows the request the plan in force was built for.
- **The sandbox can supply a heading.** With the stick at neutral, its CRUISE or explicit-request override can still deliver a heading. This shows in the ticks, and the attempt is flagged.

`lsr_verify.mjs` checks the pipeline on every recorded frame: the delivered request equals `pt_input.js` applied to the recorded raw stick, deadzone and latch (§8).

## 3. Derived diagnostics (`lsr_signals.js`, computed on the frames)

| Signal | Definition |
|---|---|
| `r`, `m` | `r` is the raw radius (clamped to 1); `m` = (r − dz) / (1 − dz), 0 inside the deadzone |
| `th` | The angle, 0 = up (camera forward), + = right. It is undefined (null) inside the deadzone. |
| `thu` | The unwrapped angle. Across a deadzone gap it takes the shortest jump. |
| `dth` | The change from the previous direction sample (across a gap, the jump) |
| `om`, `al` | Angular velocity °/s and acceleration °/s² (finite differences; null across a deadzone gap) |
| `rd` | Magnitude velocity, radius per s |
| `d50 d100 d150 d250 d500` | The direction change over the last 50 / 100 / 150 / 250 / 500 ms. It is `thu` now minus `thu` at t − W, interpolated between samples; through a deadzone gap it uses the last direction before it. |
| `maxRecent` | The largest change between now and any sample of the last 500 ms |
| `tSinceDir` | The time since `|d100|` was last ≥ 15° |
| `tSinceNeutral` | The time since the stick was last inside the deadzone |
| `tCorr` | How long the angle has stayed within ±10° of the current angle, looking back (capped at 3 s) |
| `tAbove40 / 72 / 95` | How long the radius has continuously been ≥ 0.40 / 0.72 (the canonical zone boundaries) / 0.95 |

**Diagnostic stick events.** These are drawn at DISPLAY levels (`MARKERS`). They are **not thresholds**: every raw sample is stored, and any analysis can recompute them at other levels.

| Event | Level |
|---|---|
| entered / left deadzone | r < 0.08 / ≥ 0.08 |
| returned near neutral | r falls below 0.30 |
| crossed centre | the direction before and after the < 0.30 region (or one segment through it) differs by ≥ 135° |
| rapid reversal | \|d150\| ≥ 135° (re-armed below 90°) |
| large angular turn | \|d250\| ≥ 60° (re-armed below 30°) |
| magnitude spike / release | rd ≥ +5 / ≤ −5 per s |
| direction hold | within ±10° for ≥ 300 ms at r ≥ 0.40 |

**Finding from the tests: angular velocity through the centre means nothing.** A swipe through the centre reads 10 800°/s at 60 Hz, and is undefined at 120 Hz, where one sample falls inside the deadzone. Read through-centre reversals with the crossing event and the Δ-windows instead.

## 4. The physical-state fields (`lsr_state.js` — read from the simulation's own record, canonical terms)

| Field | Meaning (source) |
|---|---|
| `t k` | Simulation time, tick |
| `x y` | Player position (the plan's centre of mass, pitch m) |
| `psi` | Facing |
| `h` | Velocity heading |
| `travel` | The HUD's travel: `h` above 1 m/s, else the facing |
| `vx vy s` | Velocity and speed |
| `reqH mode` | The desired direction and mode delivered this tick (`S.log.input`) |
| `planReqH` | The request the plan in force was built for |
| `turn` | The requested turn = request − travel (the HUD's "turn angle") |
| `relFacing relVel` | The request against the facing / the velocity |
| `turnVsBall turnVsSupport` | +1 = the turn goes toward the ball's side / the support foot's side; −1 = away |
| `bx by bz bvx bvy` | Ball position (m) and velocity (from the sim's ball track) |
| `bFwd bLat bDist` | The ball relative to the player, in the frame contacts use (velocity heading above 0.5 m/s, else facing). `bLat` > 0 means the right side. |
| `sup` | Support foot: none (flight) / L / R / both. A foot inside one of the shared foot plan's stances (possInfo's "support foot"). Swing = the other foot. |
| `lastTD(F)` · `nextTD(F)` · `nextTDL/R` | The last and next touchdown (and foot); each foot's next touchdown. Committed landings come from the persistent support plan. |
| `stepPhase` | (t − last touchdown) / (next − last touchdown) |
| `stepDur` | The last step's duration |
| `nextC` · `techF` | The next planned ball contact, and its foot: the **technical foot** (possInfo), i.e. the controlling / carrying foot |
| `lastC lastCF` | The last ball contact: time and foot |
| `poss` | Possession: FREE / CONTROLLED (CONTROLLED_BALL's state, from its log) |
| `act phase` | The vocabulary action of the plan in force (label, side, template / B4 family) and its HUD phase: ENTRY · approach / ENTRY / CONTACT / PROTECTION / EXIT, or the carry's label |
| `committed commitUntil` | possInfo's test: the next contact is within the reaction time, or a technique is between its commitment and its control return; until when |
| `skill` | An explicit request pending or under way |

**No separate gait-state machine exists in the canonical build.** The gait is the foot plan (support, touchdowns, step phase) plus the requested mode. The recorder does not invent another.

**"Earliest physically available next-action time" is not exposed by the canonical build as one number.** The recorder records the canonical pieces it does expose:

- the next touchdown, overall and per foot;
- the next planned touch and its foot;
- a committed action's control return (`commitUntil`).

## 5. The recording schema — `TOUCHLINE_LEFT_STICK_RECORDING_V1` (`lsr_schema.js`)

```
{ schema: "TOUCHLINE_LEFT_STICK_RECORDING_V1", version: 1, created, exported,
  meta: { lab: "LEFT-STICK INPUT LAB V1", milestone: { repository, branch, tag, commit: f775daac… }, simulation: { build: vocab2/, page, engine, dtS: 1/240, tickHz: 240 }, labBuild },
  sandboxChecks: { analogFeint: false, engine, vocab, pace, control, carry, ballOn },
  attempts: [ {
    id, label, labelKind (preset | custom), created, savedAt, status,
    input:   { source, sourceFrames, gamepad, padRadiusPx, devicePixelRatio, deadzone, zones, frameHz, tickHz, stateHz, simRate, synthetic, userAgent },
    capture: { mode (RESET | CONTINUOUS), preRoll, k0, kStart, k1, t0, tStart, t1, duration, autoStopped },
    markers: { levels (MARKERS), signalsVersion, stateVersion },   owner: { mark (sim s | null), note },
    session: { engine, o0, k, hash, inputRLE: [[count, h rad | −99, modeIdx, bits], …], events },
    frames:  COLS tHost tSim k n rx ry px py m src latch camH btn reqH mode rate
    raw:     COLS tHost x y kind src code rt lt appliedK
    derived: COLS t x y r th thu m dth om al rd d50 d100 d150 d250 d500 maxRecent tSinceDir tSinceNeutral tCorr tAbove40 tAbove72 tAbove95
    stickEvents: [ { t (host s), tSim, i (frame), kind, … } ],
    ticks:   { k0, reqH [deg | null], mode [idx], keys [bits] },
    state:   COLS (the §4 fields),   dict: { F, act, phase, skill },
    timeline: [ { t, kind: touchdown | liftoff | contact | miss | action | select | control | poss | request | request_end | replan, … } ],
    flags: { explicitRequests, autoVocab }, summary } ] }
```

- **COLS** is a columnar table: `{ n, fields: [...], data: { field: [values] } }`.
- **Angles** are in degrees, except `inputRLE`, which keeps the sim's own radians. Positions are in metres and times in seconds.
- **`tHost`** is real seconds from the window's first frame. **`tSim`** = k / 240.
- **Codes:**
  - `src`: 0 none · 1 mouse · 2 touch · 3 pen · 4 gamepad · 5 keys · 6 synthetic
  - raw `kind`: 0 down · 1 move · 2 coalesced · 3 up · 4 gamepad · 5 keydown · 6 keyup · 7 synthetic
  - `btn`: bit 1 sprint (button or Shift) · bit 2 walk (button or Alt) · bit 4 sprint lock
  - `mode`: 0 WALK · 1 JOG · 2 RUN · 3 SPRINT
  - `sup`: 0 none · 1 L · 2 R · 3 both
  - `poss`: 0 FREE · 1 CONTROLLED
- **Deterministic replay.** Build `o0` → step the run-length request record tick by tick, applying `events` at their tick → the hash must equal `session.hash`. The lab does this through the page's own loader (`PT.load`); `lsr_verify.mjs` does it in node.
- **Size.** About 145 KB per 3–4 s attempt. No assets.

## 6. Recording an attempt (the owner's workflow)

1. **Choose the intent.** Pick a preset from *I am trying to*, or type a custom label (it overrides the preset).
2. **Start.** Press **Enter**, or ● START RECORDING, or the gamepad's Menu button.
   - **RESET** (default): the footballer starts standing on the spot with the ball. Every attempt is self-contained, starts from rest, and re-simulates in < 0.1 s.
   - **CONTINUOUS**: the dribble goes on, and the attempt includes the 1.5 s before START.
3. **Dribble naturally and do the gesture.** Use the virtual stick (press and drag; release = neutral; never snapped), WASD, or a gamepad. The top bar shows which input is driving. You can keep the cursor on the pad and press Enter with the other hand.
4. **Stop.** Press **Enter** again, or ■. An attempt also stops by itself at 11.5 s, because the simulation keeps 12 s of history.
5. **Review.** The attempt replays in a loop: the footballer, the stick moving through its circle, and the plots with a playhead. You can:
   - pause and play with **Space** / **L**;
   - change the speed (1× / 0.5× / 0.25×);
   - click a plot to jump to that moment;
   - press **G** to mark the instant you meant the gesture (optional; the mark becomes the anchor);
   - press **verify ↻** to re-simulate and check the hash.
6. **Keep or drop it.** **Y** (SAVE) or **Backspace** (DISCARD). Saved attempts live in this browser (IndexedDB on `127.0.0.1:8362`).
7. **Repeat.** Aim for 10–20 attempts per label, done naturally rather than as one perfect gesture.
8. **Export.** ATTEMPTS → EXPORT (all / shown / selected) writes the JSON. **Keep the files.** Put them in `review_artifacts/left_stick_lab1/recordings/` so that analysis sessions can read them. IMPORT reads them back.

**Gamepad (standard mapping):**

| Control | Does |
|---|---|
| Left stick | the stick |
| RT | sprint |
| LT | walk |
| Menu | START / STOP |
| In review: A · B · X · Y | SAVE · DISCARD · MARK · play |

**Sandbox keys.** The lab takes the sandbox keys that would reset, replay or switch the session under the recorder: R Q B X M N T V P K, Space and `.`.

## 7. Comparing attempts

**COMPARE** shows every attempt of one label, aligned at an **anchor**. The default anchor is the owner's mark if set, else the largest 150 ms direction change. You can also choose:

- the peak ω;
- the first deadzone exit;
- the sharpest magnitude release;
- START.

For the chosen window (±0.5 … 1.5 s), the view shows:

- the stick paths overlaid (all in one hue, the highlighted attempt in the accent colour, ◯ marking the anchor);
- θ / r / ω against the time from the anchor;
- the descriptive statistics (n · min · q25 · median · q75 · max · sd) of each summary value;
- each attempt's entry state at the anchor: speed, mode, support, step φ, → next touchdown, → next touch, ball side, turn, the action, → the first action after it.

**ATTEMPTS** shows the summary table and each label's median [min – max]. **REVIEW** shows the timing box:

- **INPUT INTENT MOMENT** (the anchor);
- **SUPPORT / STRIDE OPPORTUNITY** (the next touchdown and the next planned touch, and whether an action was committed);
- **ACTUAL ACTION START** (the first action selected at or after the anchor, and the first touch).

The same three moments are drawn on the timeline. **These are descriptive, not thresholds.**

For analysis sessions:

```
node sandbox/visual/lsi1/tools/lsr_report.mjs <dataset.json> [--anchor mark|d150|…]   # the summary table + per-label ranges
node sandbox/visual/lsi1/tools/lsr_verify.mjs <dataset.json>                          # node ≡ browser: hash, state, derived, the pipeline
```

## 8. Verification (evidence/)

**Recorder tests on the derived signals** (`tools/lsr_test_signals.mjs` → `evidence/recorder_tests_signals.txt`): **129 / 129 checks pass.**

- The eight synthetic traces were run at 60 Hz, at 120 Hz, and at 60 Hz ±4 ms jitter.
- Angular travel is exact.
- Peak ω and the Δ-windows match the analytic values within 3 %.
- Each trace raises exactly its expected events:
  - smooth 45° / 90°: no large-turn marker;
  - rapid 90°: one;
  - both reversals: one crossing + one rapid reversal;
  - neutral → direction: deadzone exit + magnitude spike;
  - direction → neutral: deadzone entry + magnitude release.
- These are **recorder tests**, not football gestures.

**Lab end to end** (`lsi1/tools/lsr_browser.cjs` → `evidence/lsr_browser.txt / .json`, headless Chrome): **46 / 46 checks pass.**

- The eight traces were recorded through the virtual-stick path into the real footballer and saved. SMOOTH 90° was recorded three times, for the comparison.
- A real pointer drag on the pad (CDP mouse events) was recorded: raw down / 86 coalesced / up; event → applied frame median 0.8 ms, max 16.6 ms; one centre crossing.
- WASD was recorded through the sandbox's own key path.
- An emulated gamepad was recorded: Menu starts and stops, A saves, and 63 axis states were logged.
- A CONTINUOUS start was recorded: k0 = START − 360 ticks, with pre-roll frames present.
- An intent mark was set, and it became the anchor.
- R pressed inside the sandbox's frame did not reset the session; Enter there started and stopped a recording; Backspace discarded.
- The ATTEMPTS tab (14 rows, the per-label table) and COMPARE (3 × SMOOTH 90°) were exercised.
- A saved attempt still in the live session replays without re-simulation.
- Every saved attempt was re-simulated in the page (`PT.load`): hash and state track identical, 14 / 14.
- The dataset was exported (`evidence/lsr_recorder_tests.json`, 14 attempts, 2.0 MB), then imported into a fresh browser profile: every attempt replays by re-simulation and is identical (14 / 14), and the summaries are equal.
- 0 console or HTTP errors on every page.

**Node ≡ browser** (`tools/lsr_verify.mjs evidence/lsr_recorder_tests.json` → `evidence/lsr_verify.txt`): **14 / 14.** For every attempt:

- the hash is identical;
- every stored state cell is identical (0 differing cells);
- the timeline, request ticks, derived signals and events are identical;
- every frame's delivered request equals `pt_input.js` applied to the recorded raw stick, its deadzone and its latched frame (WASD: the heading).

These are the recorder tests. They are not football gestures. `evidence/lsr_report.txt` is the analysis tool's output on them.

**Regression** (`tools/milestone_regress.mjs` → `evidence/milestone_regress.txt`). The milestone's own suites were re-run in this branch and compared with the evidence committed at `f775daac`, line by line, CPU timings masked. **All 10 are identical:**

- the Body Feint and the Croqueta ≡ their review builds (every joint and the ball, every tick; `reproduction_vs_croqlw`, `reproduction_vs_feint2ef`);
- the Lab's integrated cards (approved · ordinary play · declined);
- the vocabulary chains, each simulated twice;
- both entry envelopes (`bf_sweep_right_footed`, `croq_sweep`);
- the 122 curated cases;
- the battery;
- determinism (18 seeds × 30 s, simulated twice and re-simulated from the record);
- possession torture (40 seeds × 60 s: 8 observed losses, 0 missed contacts, the same as committed).

Also: `bl_lock_check.sh` PASS, and `git diff f775daac` adds files only.

**CPU** (`evidence/lsr_browser.json` C). This uses the same scripted stick for 20 s in each case, headless Chrome at 60 Hz. The canonical work is the page's own measure: sim + pose + render per frame.

| | canonical work / frame | the lab's own cost / frame |
|---|---|---|
| the canonical sandbox page alone | 2.20 ms (sim 1.34) | — |
| the lab, diagnostics OFF | 1.90 ms (sim 1.12) | **0.072 ms** (p95 0.2, p99 0.3) |
| the lab, diagnostics ON | 1.66 ms | 0.77 ms (p99 2.2) |
| the lab, recording | — (`lab_REC` in the file) | ≈ 0.73 ms |

- **Per-tick cost inside the simulation: zero.** The lab runs no code in the tick.
- **STOP** (building the attempt, including the state sampling): 16 ms.
- The page work varies ±15 % between runs; the canonical page alone was not faster than inside the lab.

## 9. Known limitations

- **Frame-rate sampling.** The canonical page samples its input once per rendered frame. Frame jitter is real and recorded: `frames.tHost`. Three identical synthetic inputs reached different entry states (step φ 0.21–0.29, next touchdown 0.17–0.25 s) from frame timing alone.
- **Timestamps start at the browser.** Raw times are the browser's event times. OS / USB / touchscreen latency before the browser is not visible.
- **A mouse is not a thumb.** The pad's travel radius is recorded (84 px = the sandbox's stick; 110 / 140 px optional). Real mobile touch needs the page reachable from the phone, which means serving on the local network. That was not done; it is the owner's call.
- **Gamepads.**
  - The browser may apply its own deadzone or response curve.
  - The standard mapping is assumed.
  - It was verified with an emulated gamepad only, because no physical controller was available here.
- **Length.** An attempt is at most 11.5 s, because the simulation keeps 12 s of history.
- **CONTINUOUS sessions** re-simulate from the session's start when an older attempt is replayed, so the cost grows with the session. RESET attempts re-simulate in < 0.1 s.
- **The keyboard is digital.** WASD has no magnitude, and the base mode 1–4 is not recorded per frame (the delivered mode is).
- **The state is the plan, not the drawing.** It is read from the authoritative simulation (the plan), not the posed body (the presentation). The drawn feet may differ by the allowed presentation cheats.
- **Marker levels and anchors are display choices.** The automatic anchor (the largest 150 ms change) is a convenience, not a detector. The owner's mark is the human ground truth.
- **Storage is per browser and per origin** (`127.0.0.1:8362`): a different port means a different store. **Export** to keep a dataset.
- **Sandbox keys.** The lab takes the sandbox's page keys listed in §6. The canonical sandbox page itself is unchanged.
