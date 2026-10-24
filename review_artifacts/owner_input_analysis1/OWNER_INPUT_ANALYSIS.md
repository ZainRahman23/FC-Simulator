# TOUCHLINE — OWNER INPUT ANALYSIS V1

**What this is:** the owner's own left-stick recordings, analysed offline. The recordings were made in LEFT-STICK INPUT LAB V1 on 24 Oct 2026, between 00:43 and 01:21 UTC.

**What it is not:** an intent recognizer. No recognizer exists, and nothing here runs live, triggers, selects or buffers a technique. No gameplay file is changed: Body Feint, Croqueta LEG-WAVE V4, carry, gait, Agility, Technical Control, B4/B5, support and ball physics are all untouched.

- Branch: `prototype/left-stick-intent-v1`, continuing the recorder session `4d8ff0f9` (cut from the milestone `f775daac`).
- The owner's instruction, verbatim: `sources/2026-10-24_user_instruction_owner_input_analysis.md`.
- The design that follows from this analysis: `INTENT_RECOGNIZER_V1_DESIGN.md`.
- The page: **TOUCHLINE — OWNER INPUT ANALYSIS V1**, `http://127.0.0.1:8362/sandbox/visual/lsi1_owner_analysis.html`. Serve the worktree root on port 8362.

Treat everything below as **design evidence, not training data**. With 1–5 attempts per label, every group is reported as its actual values, median [min–max]. No confidence is claimed, and no threshold is fitted.

---

## 0 · How the analysis was done

| step | what | evidence |
|---|---|---|
| **locate** | The owner saved the attempts in the lab, which keeps them in Chrome's IndexedDB for the origin `127.0.0.1:8362`, database `touchline-left-stick-lab-v1`. Nothing was exported. The store was **copied** into a separate headless Chrome profile and read there, so the owner's browser was never touched. | `../left_stick_lab1/recordings/owner_2026-10-24_session1_21attempts.json` |
| **exact** | All 21 attempts re-simulate in node identically to the browser: same hash, 0 state cells differ, same timeline, ticks and derived signals. The delivered requests equal the canonical `pt_input.js` pipeline. | `evidence/owner_verify.txt` |
| **describe** | Each attempt is cut into a held approach line and a gesture by `sandbox/visual/lsi1/lsr_gesture.js` (the page uses the same code). The cut levels are **analysis conventions**, not recognizer thresholds: a line held ≥ 0.30 s within ±4°; a change of ≥ 15° from it; the onset is the last frame still within 2°. | `evidence/owner_analysis.txt` |
| **probe** | **When could the body have done it?** `tools/lsr_owner_probe.mjs` re-simulates each session up to every request frame (60 Hz, from 0.2 s before the onset to 1.0 s after). It then issues the sandbox's own explicit request (the 7 / 8 / 9 / 0 keys) and reads the canonical resolver's answer. Three variants: **AS PLAYED** (the owner's input, then the request), **OWNER** (his own stick after the request) and **HELD** (counterfactual: the running line held from the onset). | `evidence/owner_probe.txt`, `owner_probe.json` |
| **page** | Every section below is drawn from `data/owner_input_analysis.json`. | `sandbox/visual/lsi1_owner_analysis.html` |

---

## 1 · OWNER DATASET

All 21 attempts are **real owner recordings**:
- **live pointer source:** raw pointer down / coalesced / up events;
- **a real browser:** the owner's own Chrome 155, not headless automation;
- **not test attempts:** none is among the recorder's 14 committed test attempts, which live only in `../left_stick_lab1/evidence/lsr_recorder_tests.json`.

The owner's store contains **0** synthetic, demo or automated attempts.

| label (the owner's) | real attempts | source | start | duration | G marks |
|---|---:|---|---|---|---:|
| FEINT LEFT → EXIT RIGHT | **5** | mouse | RESET | 5.4–8.2 s | 0 |
| FEINT RIGHT → EXIT LEFT | **2** | mouse | RESET | 6.3–6.8 s | 0 |
| CROQUETA LEFT INTENT | **2** | mouse | RESET | 4.7–4.8 s | 0 |
| CROQUETA RIGHT INTENT | **3** | mouse | RESET | 5.0–6.1 s | 0 |
| GENTLE LEFT | **2** | mouse | RESET | 5.0–8.2 s | 0 |
| GENTLE RIGHT | **2** | mouse | RESET | 4.3–5.2 s | 0 |
| SHARP LEFT | **2** | mouse | RESET | 4.8–5.6 s | 0 |
| SHARP RIGHT | **2** | mouse | RESET | 4.2–4.8 s | 0 |
| STOP → GO | **1** | mouse | RESET | 7.7 s | 0 |
| **total** | **21** | | | | **0** |

**Not recorded:**
- NORMAL CARRY, REVERSAL, zig-zag, "changed my mind", and lateral escape without a croqueta intent;
- any WALK or JOG attempt;
- any touch or gamepad attempt.

Every attempt does contain a 0.8–3.4 s straight carry before its gesture. Those carries are used below as normal-carry evidence.

**What each attempt holds:**
- **raw pointer samples:** 52–121 per attempt, at 60 Hz, unclamped;
- **processed stick:** 251–495 frames;
- **simulation input ticks:** 1003–1980, at 240 Hz;
- **physical-state rows:** 502–990, at 120 Hz;
- **the timeline:** touchdowns, contacts and actions.

The owner's orientation note is confirmed by the data:
- every one of the 20 direction gestures started from a straight run toward the **coaches**: world heading 87–94°, screen-up;
- the stadium's benches and technical areas lie beyond the +y touchline;
- so the player's left and right were the screen's left and right in every attempt.

The analysis is done **player-relative** throughout: angles are measured from the line the player was running, + = his right.

---

## 2 · READ THE DATA WITH THESE LIMITS

1. **Mouse, not thumb.** All 21 attempts were made with a mouse dragging the lab's on-screen stick (84 px radius).
   - The pointer travelled up to **7.8 stick radii** (≈ 650 px) from the stick's centre.
   - So the stick sat at **full tilt (radius 1.00)** in nearly every gesture sample: magnitude carried no information.
   - Samples arrive once per frame (16.9 ms); there is no sub-frame resolution.
   - The owner's target device (a thumb on a phone or a gamepad stick) may behave differently. Nothing here generalises to the thumb without thumb recordings.
2. **The left screen edge.** The lab's stick sat 12 px from the window's left edge, and the window sat at the screen's left edge.
   - The pointer was pinned at **x = −1.38 stick radii** in 16 attempts, and during the gesture in **14 of the 20** direction gestures:
     - all 7 feints;
     - all 5 croquetas;
     - both sharp lefts.
   - At the edge the hand kept moving but the cursor did not. The stick's direction then followed only the pointer's **height**.
   - So every **left-side** angle in this dataset is set by the edge, not by the hand. This covers the left false phases, the left exits and the sharp lefts.
   - The large left/right asymmetry in exit angles (right exits 67–82°, left exits 24–29°) is very probably that artefact.
   - The lab now has **pad at centre** (`?pad=centre`; see §11).
3. **No G marks.** No attempt was marked, so every timing is relative to an **inferred onset**: the last frame still on the held running line before a change of 15° or more.
4. **One context.** All 20 direction gestures began in the same state:
   - running at **5.3 m/s** (RUN; one was braking toward a jog);
   - ball on the **right** foot (0.06–0.22 m right, 0.47–0.72 m ahead);
   - technical and last-touch foot **R**, action CARRY, nothing committed.

   The sandbox player is **right-footed**. So nothing here speaks to walk, jog, the left foot, or a player under pressure.
5. **Every attempt starts from rest** (RESET). The player stood at the centre spot facing a goal, so each run began with a turn toward the coaches.

---

## 3 · WHAT THE HAND DID — every attempt

Each row is mirrored so the **exit is +**; the counter is the first phase's peak **against** the exit (0 = one-sided). Times are measured from the inferred onset. "edge" counts the pointer samples pinned at the screen edge, during the first phase / the exit.

| # | label | shape | counter ° | → peak ms | dwell ms | transit | → exit side ms | exit ° | settled ms | travel ° | peak ω °/s | min r | edge |
|---|---|---|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---|
| 1 | FEINT L→R | contradiction | 104 | 146 | 67 | CENTRE 17 ms | 183 | 80 | 250 | 286 | 1568 | 0.31 | 7 / 0 |
| 2 | FEINT L→R | contradiction | 143 | 150 | 67 | BACK 17 ms | 167 | 82 | 200 | 278 | 4791 | 0.90 | 7 / 0 |
| 3 | FEINT L→R | contradiction | 107 | 117 | 50 | CENTRE 17 ms | 167 | 67 | 233 | 278 | 1824 | 0.76 | 5 / 0 |
| 4 | FEINT L→R | contradiction | 48 | 183 | 121 | FRONT 17 ms | 233 | 74 | 317 | 167 | 2786 | 1.00 | 9 / 0 |
| 5 | FEINT L→R | contradiction | 75 | 100 | 83 | FRONT 17 ms | 200 | 76 | 433 | 220 | 2741 | 1.00 | 7 / 0 |
| 6 | FEINT R→L | contradiction | 69 | 167 | 100 | FRONT 33 ms | 233 | 29 | 300 | 189 | 3320 | 1.00 | 1 / 20 |
| 7 | FEINT R→L | contradiction | 73 | 183 | 117 | FRONT 33 ms | 250 | 24 | 250 | 172 | 2934 | 1.00 | 1 / 28 |
| 8 | CROQ LEFT | contradiction | 34 | 117 | 67 | FRONT 33 ms | 167 | 30 | 200 | 106 | 1948 | 1.00 | 0 / 15 |
| 9 | CROQ LEFT | contradiction | 32 | 133 | 117 | FRONT 50 ms | 238 | 19 | 238 | 81 | 1157 | 1.00 | 1 / 11 |
| 10 | CROQ RIGHT | contradiction | 43 | 179 | 154 | FRONT 17 ms | 233 | 73 | 300 | 157 | 2463 | 1.00 | 8 / 0 |
| 11 | CROQ RIGHT | contradiction | 26 | 63 | 154 | FRONT 37 ms | 233 | 45 | 300 | 94 | 971 | 1.00 | 6 / 0 |
| 12 | CROQ RIGHT | contradiction | 45 | 150 | 250 | FRONT 29 ms | 362 | 55 | 462 | 143 | 1190 | 1.00 | 12 / 0 |
| 13 | GENTLE LEFT | one-sided arc | 0 | — | — | — | — | 46 (arc, 883 ms) | — | — | 138 | 0.46 | — |
| 14 | GENTLE LEFT | one-sided arc | 0 | — | — | — | — | 46 (arc, 950 ms) | — | — | 332 | 0.71 | — |
| 15 | SHARP LEFT | one-sided | 0 | — | — | — | — | 57 | 167 | 55 | 1187 | 1.00 | 6 / 13 |
| 16 | SHARP LEFT | one-sided | 0 | — | — | — | — | 77 | 100 | 78 | 1545 | 1.00 | 3 / 8 |
| 17 | GENTLE RIGHT | one-sided arc | 0 | — | — | — | — | 41 (arc, 583 ms) | — | — | 149 | 1.00 | — |
| 18 | GENTLE RIGHT | one-sided arc | 0 | — | — | — | — | 27 (arc, 950 ms) | — | — | 225 | 1.00 | — |
| 19 | SHARP RIGHT | one-sided | 0 | — | — | — | — | 63 | 87 | 64 | 1347 | 1.00 | — |
| 20 | SHARP RIGHT | one-sided | 0 | — | — | — | — | 46 | 117 | 46 | 686 | 1.00 | — |
| 21 | STOP → GO | release → re-press | — | — | — | — | — | released 450 ms (new direction −32°), then 396 ms (−1°) | — | — | — | — | — |

**Peak ω** is measured between 60 Hz samples at least 0.5 from the centre, so it is a single-frame step and the true peak is unresolved. Peak angular **acceleration** (59k–255k °/s²) is reported in the evidence file but is not meaningful from 60 Hz mouse samples.

**Starting state** for every gesture:
- direction: the run toward the coaches;
- magnitude: 1.00, except #13 at 0.62 and #14 at 0.82, the only part-tilt steering in the dataset.

**Stick wobble while the run line was held:** ±0.8–4.8° (median ±2.1°) over holds of 0.8–3.4 s. This is the normal-carry baseline.

**Start-up transients.** At the first press of an attempt (player at rest), the pointer landed **46–167° off** the eventual line in 5 of 21 attempts (#1, #8, #9, #13, #19). The stick then swung onto the line within 87–200 ms, three times passing near the centre. These are acquisition artefacts, not gestures, but they look like reversals.

---

## 4 · SHAPES BY INTENT (described before categorised)

- **FEINT (7):** *"full tilt to one side of my running line, a beat, then full tilt across the line to the other side, and hold it"*.
  - The first side was held only briefly: 50–121 ms within 10° of its peak.
  - The crossing took one or two frames.
  - The route across varied: twice it cut through or near the centre; once it swung **around the back** (−143° → 180° → +82°); four times it swept **across the front along the rim**.
  - It never returned to neutral, and it was never a slow arc.
  - In the owner's suggested words it is **"flick → reversal"**, but the reversal is to the other **side**, not back through the start.
- **CROQUETA (5):** **the same shape, smaller and slower in its first part.**
  - The first side was only 26–45° from the line (feints: 48–143°) and was held longer (67–250 ms).
  - The crossing was always **across the front along the rim**.
  - It is best described as *"a small show to the other side, then go"*: a lateral pulse with a counter-pulse in front of it. It is not a lateral hold.
- **SHARP turn (4):** one-sided **sharp angular change**: 46–77°, settled 87–167 ms after the onset, then held 650–983 ms. There is no first phase against the exit.
- **GENTLE turn (4):** one-sided **smooth arcs** or **continuous sweeps**: 27–46° over 583–950 ms (29–70°/s on average). Two of the four were made at part tilt (the jog zone).
- **STOP → GO (1):** **direction → neutral → direction**: released for 450 ms, then 396 ms, and pressed again.

---

## 5 · BODY FEINT — what is common (7 attempts)

| measure | values (median [min–max]) | note |
|---|---|---|
| false-direction angle | 75° [48–143] | left false phases 48–143° are **edge-set floors**; the two unclipped (right) false phases: 69°, 73° |
| false-direction magnitude | 1.00 in all 7 | mouse beyond the radius |
| false-direction duration | onset → peak 150 ms [100–183]; dwell at the peak 83 ms [50–121] | |
| false cue → true exit | onset → exit side reached 200 ms [167–250]; the crossing itself 17–33 ms | |
| angular reversal | travel 220° [167–286] | |
| peak angular velocity | 2786°/s [1568–4791] | 60 Hz single steps |
| through neutral? | 2 of 7 near or through the centre (chord 0.16 and 0.36 radius); 1 around the back; 4 across the front | never inside the deadzone |
| magnitude drop in the reversal | only in the 2 centre crossings (frame radius 0.31, 0.76) | none otherwise |
| true-exit angle | right exits (unclipped) 67–82°, median 76°; left exits 24–29° (**edge-set**) | |
| true-exit magnitude | 1.00 | |
| true-exit hold | 817 ms [533–1417], every one until release | |
| settled | 250 ms [200–433] after the onset | |

**Is there a clear, repeatable input signature for Body Feint in the owner's natural behaviour?** **Yes, as a shape, with three caveats:** it was made with a mouse, n is 7, and all of it comes from one context.

All 7 attempts share the signature:
1. From a held running line, the stick goes clearly to **one side** at full tilt: 69° or more wherever the screen edge did not cut it short, and at least 48° even where it did.
2. Within **≈ 0.15–0.25 s** of starting, it crosses the line to **the other side**.
3. It stays there.

What is **not** repeatable:
- the route across (centre, back or front);
- how deep the false side goes;
- the exact exit angle.

So the signature is the **side contradiction and its timing**, not a path, a speed or an angle.

---

## 6 · BODY FEINT vs ORDINARY STEERING — "I turned" vs "I lied one way and went the other"

| feature | BODY FEINT (7) | CROQUETA attempts (5) | SHARP (4) | GENTLE (4) | separates? |
|---|---|---|---|---|---|
| **direction contradiction** (≥ 10° on the side opposite the exit) | **7 / 7** | **5 / 5** | **0 / 4** | **0 / 4** | **yes, in every attempt** |
| first phase against the exit | 48–143° | 26–45° | 0 | 0 | yes (by definition of the contradiction) |
| onset → exit side reached | 167–250 ms | 167–362 ms | settled 87–167 ms (one side) | arcs 583–950 ms | — |
| peak ω °/s | 1568–4791 | 971–2463 | 686–1545 | 138–332 | **no**: sharp cuts and feints meet (1545 vs 1568) |
| angular travel | 167–286° | 81–157° | 46–78° | 15–40° | consequence of the contradiction |
| false-direction dwell | 50–121 ms | 67–250 ms | (holds the exit 650–983 ms) | — | only once a side change follows |
| magnitude pattern | full tilt | full tilt | full tilt | part or full | **no** (mouse) |

**What separates "I turned" from "I lied":** in these recordings only the **direction contradiction**, a first side followed within ≈ ¼ s by the other side, separates them. Every ordinary turn stayed on one side of the running line, and every feint and croqueta attempt crossed it.

Angular velocity does **not** separate them. A recognizer that fires on fast stick motion would fire on the owner's sharp cuts.

**Where false positives could occur.** Most of these cases are **not in the recordings**; §11 lists what to record.

- **Changed my mind.** A real cut one way, then a real decision to go the other way, is *kinematically the same shape*. Only the first side's dwell might separate it (feints held 50–121 ms; croqueta attempts up to 250 ms), and **no changed-mind attempt was recorded**. This is the case that decides how safe the rule is.
- **Zig-zag dribbling.** Alternating sides is a contradiction if a leg is short. The rule needs a **held line before the first swing** (the owner's lines were held 0.8–3.4 s) and a short first side. No zig-zag was recorded.
- **Acquisition / correction transients.** 5 of 21 first presses landed 46–167° off the line and swung onto it in 87–200 ms, three times passing near the centre. They happened from rest, before any held line, so a rule that needs a held line *and* a moving player excludes all five.
- **Small corrections.** Wobble on a held line was ±0.8–4.8°: far below any first side that matters.
- **Hard cut.** One-sided, so no contradiction (0 / 4). A cut that overshoots and corrects back stays on one side.
- **180° reversal.** Not recorded. A reversal ends **behind** the player; the feint exits ended 24–82° from the line. Keeping the exit **in front** (well under 90° in all 7) excludes reversals made by sweeping round a side.

---

## 7 · CROQUETA — what the hand did, and does it deserve its own gesture?

**What the owner did:**
- In all 5 attempts, a small swing **against** the croqueta side: 26–45°, median 34°; the left ones are edge-set floors.
- Held 67–250 ms (median 154).
- Then a full-tilt swing **across the front** to the croqueta side: 19–73°, median 45°; 167–362 ms after the onset (median 233).
- Settled 200–462 ms after the onset.

That is the deception shape at lower amplitude:

| | BODY FEINT | CROQUETA attempts |
|---|---|---|
| first phase against the exit | 48–143° | 26–45° |
| dwell at its peak | 50–121 ms | 67–250 ms |
| angular travel | 167–286° | 81–157° |
| peak ω | 1568–4791 °/s | 971–2463 °/s |

The ranges **meet** (largest croqueta counter 45°, smallest feint 48°). With the left side set by the screen edge, the gap cannot be trusted.

**Compared with the other moves:**
- **Ordinary lateral turn / sharp cut:** croqueta attempts had a counter, cuts never did.
- **General lateral escape:** not recorded, so it cannot be compared.

**Whether the canonical Croqueta could ever have played: never, in any of the 5.**
- At the owner's speed (5.3 m/s) Croqueta V4 is outside its validated entry: **2.6–3.6 m/s, a jog** (`CROQ_LW entryV`).
- To the **right** it is never available to this right-footed player ("the ball is on the right foot": the carrying foot must play it).
- So 0 of 305 request frames played, in every variant.
- The only Croquetas the gates would have allowed anywhere in the dataset came in an *ordinary* GENTLE LEFT (#13), after the player had slowed to a jog. Requests from +700 ms onward played there, with the first stance at +1251 ms.

**Does Croqueta have a natural distinct owner gesture?** **B: PARTIALLY, and the signature is not Croqueta's own.**
- The owner's croqueta attempts share a repeatable shape: a small show to the other side, then a lateral exit.
- But that shape is the Body Feint's contradiction at lower amplitude, separated from it only by degree.
- It is not ordinary lateral movement either (that would be C): every attempt had the counter, and no cut did.
- So the gesture expresses an **intent**: *get away to that side, having shown the other*. It is not a request for Croqueta by name.

The design (`INTENT_RECOGNIZER_V1_DESIGN.md §5`) therefore makes Croqueta a **contextual technique** for that intent, chosen when the body is in the state Croqueta V4 was validated in, with **no gesture of its own**.

---

## 8 · PHYSICAL STATE — when the owner expressed intent vs when the body could execute it

**At the inferred onset** (all 20 direction gestures):
- 5.3 m/s, RUN, travelling straight along the approach (0–2.5° off);
- ball on the right, 0.06–0.22 m lateral and 0.47–0.72 m ahead;
- technical foot and last-touch foot **R**, action CARRY, **nothing committed**;
- the stride phase varied from attempt to attempt:
  - support foot R 7 times, L 7, in flight 6;
  - next touchdown in 2–313 ms;
  - next ball touch in 79–629 ms.

The owner therefore expressed intent at **arbitrary points of the stride and the touch cycle**. One step at a run lasts 316 ms.

**What the ordinary vocabulary did with the gestures** (no recognizer exists):
- The **false phase was answered within 33–50 ms** by a real redirect toward the fake (a LATERAL TRANSFER or a COMPACT INSIDE / OUTSIDE REDIRECT) in 6 of the 7 feints.
- In #2 a set touch for a drag-back **touched the ball at +129 ms**, before the stick even reached the exit side at +167. The plan then thrashed: CHOP → DRAG-BACK → CRUYFF → INSIDE REDIRECT → STOP.
- Today a deception gesture therefore makes the body cut toward the fake, then cut back.

**When the canonical Body Feint could have played.** This covers the shape this player can execute: **fake left → exit right**. That is 8 gestures: the 5 FEINT L→R plus the 3 CROQUETA RIGHT, which have the same shape. Times are ms **from the inferred onset**:

| requested… | plays | the move's first stance | its decisive touch |
|---|---:|---|---|
| at the onset (the intent itself) | **8 / 8** | 396 [179–592] | 796 [579–992] |
| at the recognition point (exit side ≥ 10°: 217 [167–362]), **as played** | **6 / 8** (#2 "ball not yet out ahead", #4 "ball on the other foot's side") | 996 [421–1492] | 1396 [821–1892] |
| at the recognition point, **HELD** (counterfactual: steering not given the first phase) | **8 / 8** | 646 [421–1003] | 1046 [821–1404] |
| with the owner's **own** exit angle | **1 / 8** | — | — |

**Mirror (fake right → exit left), 4 gestures:** never, at any frame, in any variant ("the ball is on the right foot"). For this right-footed player the approved mirror belongs to the **left-footed twin**.

**The owner's own exits.** At a run the Body Feint accepts a 35–40° exit (hard 32–43°, `BFEINT_R`). The owner's natural unclipped exits were 67–82°, so a request carrying the owner's own stick played in **3 of 488** frames.

**What this means for the design:**
- **Intent and opportunity are separate moments.**
  - The owner shows the intent at the onset.
  - The intent becomes **recognizable** about 0.17–0.36 s later.
  - The body can **start** the Body Feint on the next valid stride: 0.22–0.64 s after recognition (HELD).
  - The touch follows 0.4 s after that.
- **The race.** Recognition (≈ 0.2 s) is fast enough to beat the ordinary cut's commitment most of the time (6 of 8). But whatever the first phase has already done to the ball decides the rest.
  - When the first phase is not steered (HELD), every attempt stays feasible and the move comes ≈ 350 ms sooner (median first stance 646 vs 996 ms).
  - The price would be added latency on every genuine sharp cut. That is an owner decision, and a feel test, not a metric (`INTENT_RECOGNIZER_V1_DESIGN.md §7`).
- **The exit angle is read as a side.** The stick's exit tells the side; the move uses its own validated exit for the gait. The literal angle cannot be used.

---

## 9 · INTENT MARKERS

No attempt carries a G mark. There is therefore **no** "G timestamp", "gesture start relative to G" or "first opportunity after G" to report.

In their place, every timing above is measured from the **inferred onset**: the last frame still on the held running line before a change of 15° or more. The table in §3 gives, from that onset:
- the gesture start (= 0);
- the first-side peak (the reversal): 63–183 ms;
- the moment the exit side is reached: 167–362 ms;
- the first physical opportunity (§8).

The onset is the analysis's own inference and **was not moved to the physical opportunity**.

The G mark is set in REVIEW: scrub to the instant you meant the gesture, then press **G** or MARK.

---

## 10 · BUFFERING — what the evidence says (nothing implemented)

1. **Intent → next valid Body Feint opportunity.**
   - From the onset, the first stance comes at 179–592 ms: about one step to two steps, set by which foot is due and by the ball's set touch.
   - From recognition (HELD), the first stance comes 221–641 ms later (median 413) and the touch 621–1042 ms later.
   - Once a stride exists, the resolver adopts the move on the same tick (median 0 ms). It looks ahead 1.25 s for strides.
2. **Intent → next valid Croqueta opportunity:** **no evidence**. The croqueta was never feasible in any owner attempt (speed, or foot).
3. **How long a request must stay alive.** Long enough to reach the next valid stride of the right foot with the ball set: **up to one stride cycle**, ≈ 0.65 s at a run (two steps of 316 ms). The existing explicit-request window (`requestSkill`: 0.55 s to enter, strides up to 1.25 s ahead) covers every case observed. Nothing in the data asks for a longer buffer.
4. **The intent's timestamp stays the onset.** The buffer starts at recognition and ends at entry, cancellation, or one stride cycle, whichever comes first.

---

## 11 · MORE DATA NEEDED — only what would change the design

**First, the device.** Every figure above comes from a mouse.

- Record with the **target device** first: the thumb on the phone (serve the lab on the LAN; that is the owner's call) or a gamepad.
- If recording with the mouse again, open the lab with **`?pad=centre`** (or choose *pad at centre*). This removes the screen-edge clipping.
- **Mark every attempt with G in REVIEW.**

| # | record | why it matters |
|---|---|---|
| 1 | **6 × "CHANGED MY MIND"**: start a real sharp cut one way at a run, then decide to go the other way (no deception intent). Label it e.g. `CHANGED MIND L→R`. | The one false positive that looks exactly like the feint. Its first-side dwell, against the feints' 50–121 ms, decides whether the rule is safe. |
| 2 | **6 × ZIG-ZAG**: left-right-left at a run, each leg held about as long as feels natural. | The second false positive: how short a natural zig-zag leg is. |
| 3 | **6 × FEINT RIGHT → EXIT LEFT and 6 × FEINT LEFT → EXIT RIGHT**, on the target device (or the mouse at *pad at centre*), all marked with G. | The left side was clipped in all 7 feints, so the depth of the false side and the left exit angle are unknown. The extra attempts also give each direction more than 2 (R→L) or 5 (L→R) examples. |
| 4 | **5 × CROQUETA LEFT INTENT at a JOG** (part tilt, ≈ ½ stick), plus **5 × LATERAL ESCAPE LEFT at a jog without intending a croqueta**. | Croqueta V4 exists only from a jog, and for this player only to the left. Is the croqueta intent at a jog still a small counter-then-go, and does it differ from a plain lateral escape? |
| 5 | **4 × 180° REVERSAL** each side, done as you naturally would. | So the rule can be checked against reversals (they should end behind, not across). |
| 6 | **3 × 10 s NORMAL CARRY** with the natural corrections of a real dribble. | The wobble baseline beyond a held straight run. |
| 7 | **4 × FEINT at a JOG** (part tilt) each direction. | Does the shape hold when the stick is not at full tilt? The Body Feint's jog band (35–60°) is wider than the run's. |

---

## 12 · Files and reproduction

**Inputs and tools:**
- **The owner's dataset:** `review_artifacts/left_stick_lab1/recordings/owner_2026-10-24_session1_21attempts.json` (`TOUCHLINE_LEFT_STICK_RECORDING_V1`, 21 attempts).
- **Describe:** `node sandbox/visual/lsi1/tools/lsr_owner_analysis.mjs <dataset> --probe evidence/owner_probe.json --tests ../left_stick_lab1/evidence/lsr_recorder_tests.json --json data/owner_input_analysis.json` → `evidence/owner_analysis.txt`.
- **Probe:** `node sandbox/visual/lsi1/tools/lsr_owner_probe.mjs <dataset> --out evidence/owner_probe.json --step 4` → `evidence/owner_probe.txt`.
- **Exactness:** `node sandbox/visual/lsi1/tools/lsr_verify.mjs <dataset>` → `evidence/owner_verify.txt`.
- **The lab's own summary table:** `node sandbox/visual/lsi1/tools/lsr_report.mjs <dataset>` → `evidence/owner_lab_report.txt`.

**Checks:**
- **The page and the lab change:** `sandbox/visual/lsi1/tools/oa_browser.cjs` → `evidence/oa_browser.txt`.
- **No gameplay changed:** `../left_stick_lab1/tools/milestone_regress.mjs` → `evidence/milestone_regress.txt`.
