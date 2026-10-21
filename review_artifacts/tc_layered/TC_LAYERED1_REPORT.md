# TC-LAYERED-1: the responsiveness pass on 88573ef0, layer by layer

**Status:** presented for the owner's hands-on review. Not frozen, not integrated, local only (the character is a real player's model).

**Pages:**
- Layered A/B playground: http://127.0.0.1:8361/sandbox/visual/tc_layered.html
- Immutable baseline: http://127.0.0.1:8361/sandbox/visual/tc_baseline_88573ef0.html (unchanged; `bl_lock_check.sh` PASS)

I cannot play video in real time. The numbers below come from deterministic simulation and headless-Chrome captures. They describe the motion but do not judge its feel; your hands-on review decides (§23).

## 1. What was built

The layered copy lives in `sandbox/visual/tc_layered/`. It is 88573ef0's own simulation, body and viewer, copied, with every improvement behind its own flag. Everything else is imported read-only from the locked baseline: the ball, parameters, technique templates and input.
- **ALL OFF = exact 88573ef0.** 233/233 runs are identical to the locked engine: every required test plus the rapid-input sequences, checked on hash, contacts and actions. The same holds with only B1 on, because B1 is presentation only.
- **In the browser too:** the same input through A, B1 and the locked engine gives one identical hash.

| Toggle | Layer | Owner items | What it does |
|---|---|---|---|
| Immediate acknowledgement | B1 | §1–2 | **Presentation only** (the simulation hash is unchanged). The newest stick intent shows within 1–2 frames as one connected body. Head toward the new line ≤ 60°, pelvis opening ≤ 9°, torso ≤ 13° more (shoulders ≤ 22° off the hips' heading). Leans come from the root's real acceleration plus a little anticipation, knees flex ≤ 2 cm for the coming brake, and the next support foot turns toward the new line ≤ 14°, rotated about the ball of the foot during its swing and then planted that way. If a technique turns the long way round, the lead follows the technique. |
| Revisable / earlier touch opportunities | B2 | §3–4, §15 | The next ordinary carry touch is brought forward by a shortened step (0.04–0.12 s sooner, support ≥ 0.06 s, swing ≥ 0.16 s). It replaces that touch, never adds one. Three conditions: it must send the ball onto the new line (±25°), come ≥ 0.30 s after the last touch, and the swing that plays it must be at most 30 % faster than that foot's natural swing (no magic foot). A retimed swing finishes its visual blend before its touch. |
| Preferred foot = preference | B2 | §5 | When a touch must turn the ball, the other foot plays it whenever the lane foot's chance is > 0.10 s later (baseline 0.35 s). |
| Carry approach changes before the ball does | B2 | §16 | When the baseline would hold its old line until the touch, the body instead angles 60 % or 35 % toward the request, at speed or braking, if it still reaches the ball on its own path. |
| Narrow contact commitment | B3 | §6–8 | A technique commits only in its striking foot's final approach. That window comes from its own swing: chop 45 ms, Cruyff 45, hook 50, outside cut 80, drag-back 80 (baseline 80 ms for all). A set touch no longer commits the whole technique. An uncommitted technique may be re-timed (a fresh anchor beside the pinned one). |
| Generic effort turns | B4 | §9–11 | Six functional actions as candidates: compact inside redirect, compact outside redirect, across-body gather, urgent reach, braking touch, braking pivot.<br>• Each is one touch at the end of a real swing, so the foot drawn at the ball is the foot that plays it.<br>• The other foot's plant is anchored just before it, relative to the ball.<br>• The root stays on the carry's own tracker (Agility untouched): on its line or intercepting the ball's path until the touch, then turning or braking at its limits.<br>• The touch timing is re-anchored on the stride like a technique's.<br>• Named moves now compete on the same cost and are scored on their real exit (where the ball is against the body afterwards). Their comfortable range stays as a quality limit: without it a 90° outside cut lost the ball 5/8 times at sprint. |
| Short technical exits | B5 | §13 | Control returns at the end of the striking foot's authored follow-through (chop 0.14 s, Cruyff 0.13, hook 0.09, drag-back 0.08, cut 0.06), not at the plant's release (0.12–0.28 s). There is no exit lock, so the technique runs on only as one candidate. |
| Short wind-ups | B5 | §12 | The Cruyff, hook and drag-back can open at their plant, without their braking step on the entry line, when the body is already slow enough for it (≤ 1.25× the plant's speed). The chop keeps its hop because it carries its pre-turn. |
| Next-action-aware BC99 targets | B6 | §14 | A technique's decisive and exit touches are sized to arrive where the body plays the ball next: the next contact's moment, or the preferred foot's next swing end on the request's line. The authored direction is kept within ±15° and the authored speed within 0.6–1.5×. The drag-back's sole pull keeps its authored launch. |

**Presets:** A = all off · B1 · B2 = B1 + the three B2 toggles · B3 · B4 · B5 = B4 + exits + wind-ups · ALL = B5 + B6.

**Not changed (owner):**
- Agility and authoritative movement: acceleration, braking, lateral and yaw limits, speeds, the carry tracker's curvature and its 50° braking rule.
- Ratings (BC / D / A 99).
- Weak foot.
- Styles.
- Rapid-input zero-loss work.

## 2. Report card (§22–23)

The owner's required tests at 99/99/99, run on the analog stick. Each test has 8 traces (4 stride phases × both directions), each against a counterfactual run with the stick left where it was. Times are medians, in seconds after the stick change; "!n" = n held changes not reached within 2.0 s.

| Test | A (88573ef0) | B1 | B2 | B3 | B4 | B5 | ALL |
|---|---|---|---|---|---|---|---|
| **visible response** (all tests) | 0.13–0.43 | **0.01** | 0.01 | 0.01 | 0.01 | 0.01 | 0.01 |
| 15–30° corrections: contact / line | 0.20 / 0.13 (!1 / !4) | same | **0.07 / 0.05** (no failures) | 0.07 / 0.05 | 0.07 / 0.05 | 0.07 / 0.05 | 0.07 / 0.05 |
| jog 45° | 0.22 / 0.25 | same | 0.18 / 0.23 | 0.18 / 0.23 | **0.15** / 0.25 | 0.15 / 0.25 | 0.15 / 0.25 |
| jog 90° (LOST) | 0.48 / 0.65 (3) | same | 0.48 / 0.62 (3) | same | 0.51 / **0.79 (0)** | same | same |
| run 45° | 0.29 / 0.47 | same | **0.16 / 0.41** | same | same | same | same |
| run 90° | 0.55 / 0.70 | same | same | same | **0.30** / 0.73 | same | 0.30 / 0.73 |
| sprint 45° | 0.33 / 0.55 | same | 0.27 / 0.48 | same | **0.21 / 0.47** | same | same |
| sprint 90° | 0.68 / 0.86 | same | same | 0.66 / 0.85 | **0.78 / 0.97 (worse)** | same | 0.78 / 0.97 |
| sprint 120° | 0.69 / 0.97 | same | same | 0.68 / 0.92 | same | same | 0.68 / 0.92 |
| sprint 180° | 0.54 / 1.11 | same | same | same | same | same | same (unchanged) |
| rapid L/R · run (LOST) | 0.35 / 0.66 (3) | same | 0.18 / **0.36** (4) | 0.14 / **0.32** (4) | 0.18 / 0.59 (5) | 0.18 / 0.59 | 0.18 / 0.59 |
| 0→90→0→−90 · run | 0.52 / 0.78 (!12 / !21) | same | 0.50 / 0.71 | 0.50 / 0.77 | **0.40 (!4)** / 0.70 | 0.42 / 0.71 | 0.42 / 0.82 |
| rapid L/R · sprint | 0.14 / 0.43 | same | 0.31 / 0.57 (worse) | 0.31 / 0.55 | 0.26 / 0.55 | 0.30 / 0.55 | 0.30 / 0.55 |
| 0→90→0→−90 · sprint | 0.52 / 0.79 | same | 0.49 / **0.56** | 0.54 / 0.76 | 0.43 / 0.68 | 0.43 / 0.68 | 0.43 / 0.70 |

**Action lock** is how long the resolver could only run an already-committed technique after a stick change. It shows up only in the 0→90→0→−90 tests: p95 0.19–0.22 s in A, 0.14 s run / 0.00 s sprint from B4 on. The full card is in `evidence/REPORT_CARD_all_configs.txt`; it includes heading change, exit, touches and redundant touches, separation, LOST and every body warning.

**Each layer alone over A** (the same file, rows "+early", "+narrow", …):
- **+early:** the biggest single gain on corrections and 45° turns. It also adds foot jumps in rapid input (rapid L/R run 85 → 111, circle run 245 → 290).
- **+prefFoot, +approach:** small effects.
- **+narrow:** small effects; sprint 0→90→0→−90 line is worse (0.79 → 0.91).
- **+generic:** run 90° contact 0.55 → 0.30 and 0→90→0→−90 run line 0.78 → 0.38. Sprint 90° is slower (0.68 → 0.83 contact).
- **+exits:** a small loss on 0→90→0→−90 run line (0.78 → 0.89).
- **+windups:** almost never applies (needs a slow body).
- **+target:** more touches and leg crossings at sprint 90 / 120° (legs 2 → 24, 1 → 13); 0→90→0→−90 run line 0.78 → 0.46.

## 3. Body warnings (§17): surfaced, never acted on

These are measured on every posed tick. The page shows them live in the BODY WARNINGS panel. **88573ef0 itself has them:**
- The rendered pelvis is up to 0.44 m from the root at sprint turns (95th percentile 0.15 m). The pose pulls the pelvis after a planted foot left out of reach: a walking stance held while the body accelerates, or a long swing before a technique's plant.
- The chop's exit touch is sometimes executed while that foot is still planted, 0.3–0.6 m from the ball ("contact foot gap"; 13 contacts > 4 cm at sprint 90°).
- Ball-clearance pushes make a foot jump 0.12–0.31 m per tick just after some touches. This is the baseline's presentation, left unchanged.

**What the layers add (vs A, from the report card):**
- **B1:** practically nothing (the pose shifts a few mm).
- **B2:** more foot jumps in rapid input and circles (+15 % run circle … +80 % rapid L/R sprint). Pelvis↔root 95th percentile is up in rapid L/R run (0.09 → 0.15 m).
- **B4:**
  - leg crossings up in circles (42 → 86 spans);
  - pelvis↔root 95th percentile 0.28 → 0.37 m in the run circle;
  - contact gap 95th percentile 0.19 m in rapid L/R sprint (A: 0.03);
  - foot jumps at sprint 90° fall (69 → 27).
- **B6:** contact gap 95th percentile at sprint 90 / 120° up 0.05 → 0.12 m; leg crossings up.

The worst warnings show where the body may be failing to explain the action. They are not proof that it looks wrong at normal speed. Please judge them on the page; the 0.25× replay with body debug shows them best.

## 4. Known visual issues (from the diagnostics; not watched)

1. **B4's braking pivot and urgent reach** account for a share of the extra leg crossings in circles. The across-body gather crosses the legs by design.
2. **B2 / B4 in rapid alternation:** feet re-timed often, so more foot jumps (the baseline's own blend and clearance code doing more work).
3. **B6:** the ball placed tighter in the exit meets the feet more (ball-in-boot, leg crossings at sprint turns).
4. **Baseline, all configurations:**
   - a planted foot sometimes left far behind while accelerating;
   - the chop's exit touch from a planted foot;
   - the clearance jitter.

## 5. AGILITY / MOVEMENT DEPENDENCIES, deliberately not changed

1. **Sprint 90° / 120° lines.** The generic actions run on the carry tracker, whose turn rate is lateral acceleration ÷ speed (≈ 79°/s at 8 m/s), braking only beyond 50°. So a compact redirect at sprint cannot turn the body faster than Agility allows, and B4's sprint 90° line is slower (0.97 vs 0.86 s) than the chop, whose authored body motion turns sharper than the tracker's limit. Making ordinary sprint turns as sharp as the chop needs a movement-capability change.
2. **Sprint 180°.** No layer moved it (0.54 / 1.11 s). Braking from 8 m/s at 9.5 m/s² and re-accelerating at 7 m/s² sets the floor.
3. **Rapid L/R at sprint.** It got worse with B2 (0.43 → 0.57 s line). Earlier touches redirect the ball, but the body cannot follow it faster than its lateral limit, so the line comes later.
4. **The carry's 48° redirect cap** is a technical limit, not Agility. B4 goes beyond it with the generic actions.

## 6. How to use the page

- **Presets:** A … ALL, or the individual checkboxes. A change resets the session.
- **Engine:** "locked 88573ef0" runs the locked engine itself.
- **Same input:** play, then **Same input →** a configuration ▶, or **X** to step the same recorded input along the chain A → B1 → … → ALL → locked engine. The replay shows the same window of the recorded input through the chosen configuration.
- **Test:** plays any of the owner's required tests through the page's own stick, from a reset. It is the same trace the report card uses.
- **Other controls:** the BODY WARNINGS panel (toggle "body warnings"), plus body debug, 0.25× replay and Q (replay last action), as in the baseline.

## Evidence

- `evidence/ALL_OFF_EQUIVALENCE.txt`: 233/233 identical with all off, and again with B1 only.
- `evidence/REPORT_CARD_all_configs.*`: every test × A, B1–B5, ALL and each layer alone. `REPORT_CARD_chain_summary.txt` has the compact chain.
- `evidence/browser/`:
  - the Chrome run: all 8 configurations on sprint 90° via the stick, deterministic;
  - the same-input chain, with identical input and the same hash for A, B1 and the locked engine;
  - no console or HTTP errors.
- `evidence/RESIM_node_vs_browser.txt`: 17/17 sessions identical.
- `screens/`: each configuration at +120 / +520 ms after the sprint 90° snap, the B4 chain replay, ALL in rapid L/R with body debug (headless captures).
- `sources/`: the owner's instruction, verbatim.
