# INTENT RECOGNIZER V1 — DESIGN (from the owner's recordings; NOT IMPLEMENTED)

This is a design for the owner to review. Nothing here is implemented:
- no recognizer;
- no thresholds in code;
- no buffering;
- no automatic Body Feint or Croqueta.

No gameplay file is changed.

The evidence is in `OWNER_INPUT_ANALYSIS.md`: 21 real owner attempts, made with a mouse, in one context. Every number below refers back to it. The starting values in §4 are **round numbers with margin around the owner's ranges**, to be tuned by feel. They are not fitted.

---

## 1 · What the recordings say the recognizer must be

1. **One special intent family, not one per move.**
   - The only input that differed in *kind* from ordinary steering was the **side contradiction**: show one side of the running line, then go to the other. That covers 7 of 7 feints and 5 of 5 croqueta attempts.
   - Every ordinary turn was one-sided (8 of 8).
   - The Croqueta attempts were the same contradiction at lower amplitude.
2. **Judged against the player's running line, never the pitch.**
   - The reference is the direction the stick had been holding while the player carried the ball.
   - Left and right are the player's.
3. **Read from where the stick went, not how fast.**
   - Angular velocity overlaps between sharp cuts and feints (1545 vs 1568 °/s).
   - Magnitude carried nothing with the mouse.
   - The path across varied (centre, back, front).
4. **Recognized when the contradiction becomes visible, not when the gesture ends.** That is ≈ 0.2 s after the swing starts (167–250 ms for feints, up to 362 ms for croqueta attempts). The gesture settles later, at 200–462 ms.
5. **The intent's time is the swing's start; the body's time is the next valid stride.** The two are separate moments, joined by a short request buffer.
6. **The exit stick is a side, not an angle.**
   - The owner's natural exits were 67–82°.
   - At a run the Body Feint is validated for 35–40°.
   - The move plays its own validated exit, then ordinary steering continues toward the stick.
7. **The technique gates are not a false-positive filter.** The canonical Body Feint would have played at most frames of the owner's *ordinary* right turns. Protection against accidental feints must come from the recognizer.

---

## 2 · Architecture

```text
RAW STICK (any device, per frame)
  → A CLEANUP          the stick in the player's frame: angle against the RUNNING LINE (+ = right), radius; deadzone; the first 0.2 s after
                       leaving neutral flagged as ACQUISITION (owner: off-direction first presses resolved in 87–200 ms)
  → B RUNNING LINE     the direction the stick has held steadily (≈ ±8° for ≥ 0.3 s) while the player carries the ball at walk / jog / run;
                       it follows gentle arcs (owner: lines held 0.8–3.4 s, wobble ±0.8–4.8°)
  → C FEATURES         since leaving the line: the side, its peak depth, time since leaving, time held near the peak, whether / when the stick
                       crossed the line to the other side, where it is now (in front / behind), the radius, the player's gait zone
  → D EVIDENCE         LINE ──swing to side A──▶ FIRST SIDE (provisional: nothing acted on, no added latency)
                         FIRST SIDE ──crosses to side B in front, in time──▶ CONTRADICTION ⇒ DECEPTION A→B confirmed
                         FIRST SIDE ──settles / holds on A──▶ ordinary (a cut)    ──back to the line──▶ ordinary (a wobble)
                         FIRST SIDE ──released──▶ ordinary (stop)                  ──goes behind──▶ ordinary (a reversal)
  → E HYSTERESIS       one event per gesture; re-armed only when a new line is held; a second contradiction inside the buffer replaces the first
  → F INTENT EVENT     { DECEPTION, fake side A, exit side B, tIntent = the swing's start, tRecognized, exit direction, gait zone }
  → G REQUEST BUFFER   alive from recognition until entered, cancelled, or one stride cycle (≈ 2 steps: 0.63 s at a run)
  → H OPPORTUNITY      the canonical technique gates, asked every tick while the request lives (the existing explicit-request path:
                       sim.requestSkill — 0.55 s to enter, strides up to 1.25 s ahead — the same path the sandbox's 7 / 8 / 9 / 0 keys use)
  → I SELECTOR         DECEPTION A→B → [ BODY FEINT fake A → exit B , CROQUETA toward B ]: each asks its own validated gates; the earliest
                       feasible first stance wins; neither within the buffer → nothing special (the ordinary vocabulary steers toward the stick)
```

**Properties:**
- **Ordinary steering is untouched.** The recognizer observes the stick. It never delays or edits the heading the movement receives (the A/B option in §7 is the only exception, and it is opt-in).
- **The recognizer knows nothing about techniques.** It reads only the stick history and two body facts: the gait zone, and that the player has the ball. Recognition is therefore the same whatever the selector can play.
- **Deterministic and replayable.** It is a pure function of the recorded stick and the recorded state. Every lab recording can be replayed through it offline, which is how V1 will be checked against these 21 attempts and the next ones.

---

## 3 · PROPOSED INTENT VOCABULARY V1 (the smallest the data supports)

| intent | what the owner does | handled by |
|---|---|---|
| **STEER** (implicit, the default) | everything that is not a confirmed deception: gentle arcs, sharp cuts, corrections, stop (release), go (press) | the existing pipeline and vocabulary, **unchanged** |
| **DECEPTION LEFT → RIGHT** | show the left of the running line, then go right | the selector: Body Feint (fake L → exit R); Croqueta toward the right where validated |
| **DECEPTION RIGHT → LEFT** | the mirror | the selector: Body Feint (fake R → exit L); Croqueta toward the left where validated |

**Not in V1, and why:**
- **SHARP CUT / HARD REVERSAL / STOP / REACCELERATE.** The owner's sharp cuts, gentle arcs and stop-and-go carry no information the pipeline doesn't already read (heading, magnitude, release). The existing vocabulary already turns them into cuts, turns and stops. Giving them names adds no control.
- **LATERAL ESCAPE.** No separate signature exists in the recordings. The owner's lateral-escape-like attempts (the croquetas) were deceptions, and a plain lateral move is a cut. Revisit after the jog recordings (`OWNER_INPUT_ANALYSIS.md §11`, item 4).

---

## 4 · PROPOSED BODY FEINT RULE (DECEPTION → BODY FEINT)

**In words:** *the player is carrying the ball along a line he has been holding. If the stick swings clearly to one side of that line, and within about a third of a second crosses back over the line to the other side (in front of him, not behind), he wants to show the first side and go to the second. Ask for the Body Feint, fake first side → exit second side. The feint happens on the next stride where the canonical Body Feint is valid. If none comes within about one stride cycle, nothing special happens and he simply steers.*

| element | the owner's recordings | starting value for the first playtest (tune by feel) |
|---|---|---|
| a held running line | held 0.8–3.4 s, wobble ±0.8–4.8° | within ±8° for ≥ 0.3 s, the player carrying at walk / jog / run |
| a clear first side A | feints 48–143° (≥ 69° where not cut short by the screen edge); croqueta attempts 26–45° | ≥ 25° from the line |
| the first side held briefly | feints 50–121 ms; croqueta attempts 67–250 ms | ≤ 0.25 s near its peak (longer = he cut; **needs the "changed my mind" recordings**) |
| crossing to side B | 167–250 ms after the start (feints); ≤ 362 ms (croqueta attempts) | within 0.40 s of the swing's start |
| B clearly, and in front | exits 19–82° from the line | ≥ 15° past the line on B, and less than 100° from it (a reversal ends behind) |
| not an acquisition | 5 of 21 first presses 46–167° off the line, settled in 87–200 ms, from rest | ignore the first 0.2 s after the stick leaves neutral; never from rest |

**For each part of the mapping:**
- **Gesture evidence:** the five rows above.
- **Recognition moment:** the first frame on side B past the margin. For the owner that is ≈ 0.2 s after the swing started (167–250 ms), before the gesture settles.
- **Buffer lifetime:** from recognition until the move is entered or cancelled, or one stride cycle has passed (≈ 0.63 s at a run). The canonical explicit-request window (0.55 s to enter, strides up to 1.25 s ahead) already matches.
- **Physical eligibility:** the canonical Body Feint gates, **unchanged**:
  - the speed band: walk 0.6–2.65, jog 2.65–4.3, run 4.3–7.6 m/s;
  - the exit band: walk 45–55°, jog 35–60°, run 35–40°;
  - the carrying foot plays it;
  - the ball on that foot's side, ≥ 0.42 m ahead, with a set touch;
  - a settled carry;
  - not inside a previous feint's exit.
- **Execution:** BODY FEINT fake A → exit B at **the gait's validated exit angle**. The stick's exit gives the side. After the move returns control, ordinary steering continues toward the stick.
- **Cancel:**
  - the stick released or back on the old line before the move is entered;
  - the stick goes behind;
  - a new contradiction (it replaces the request);
  - the ball is lost or loose;
  - another technique already committed;
  - the buffer runs out (→ ordinary steering, no move).
- **Mirror:** DECEPTION RIGHT → LEFT is the same rule, mirrored, mapping to BODY FEINT fake RIGHT → exit LEFT.
  - **For the right-footed sandbox player that move does not exist in the canonical vocabulary.** The approved fake right → exit left is the left-footed twin's. The gates declined it at every frame of all 4 owner gestures of that shape.
  - V1 would recognize the intent and fall back to the ordinary cut, unless the owner decides otherwise (§8).

**What the probes say this rule would have done with the owner's recordings.** These are the canonical gates, asked offline; nothing was run live.
- The 8 gestures of the shape this player can play (fake L → exit R): a request at the recognition point **plays 6 of 8** as played, and **8 of 8** if the first phase is not steered (§7).
- The first stance comes 221–1199 ms after recognition as played, and 221–641 ms if not steered.
- The 8 ordinary turns are never recognized: none crosses the line.

---

## 5 · PROPOSED CROQUETA POLICY

**Contextual technique selection: no explicit gesture.**

The owner's croqueta attempts were the DECEPTION shape. Croqueta is therefore one of the techniques the selector may choose **for a DECEPTION toward side B**, and only when **its own canonical validated entry holds** (`CROQ_LW`, untouched):
- an entry speed of **2.6–3.6 m/s**: a jog, not braked into from a run, not from a walk;
- an exit of **40–45°**;
- **the carrying foot plays it.** For the right-footed player that means only toward the **left**: the ball goes from the right foot across to the left. Toward the right is the left-footed twin's.
- the ball on that foot's side, **0.39–0.47 m ahead and 0.20–0.30 m out**, with that foot's touch the last;
- a settled carry (speed within 0.4 m/s over 0.5 s, heading within 6° of 0.2 s ago);
- a feasible stride on the coming strides.

**When Croqueta is preferable to an ordinary cut:** in exactly that state, and no other. Outside it, the intent goes to the Body Feint where that is valid, and otherwise to the ordinary cut.

**When both the Body Feint and the Croqueta are valid:** the **earliest first stance** wins, which honours the intent's timing. A tie goes to an owner setting.

The counter's amplitude (smaller in the croqueta attempts) is **not** used in V1:
- it overlaps the feints' (45° vs 48°);
- it was cut short by the screen edge;
- it was measured with a mouse.

Revisit it with thumb recordings at a jog.

**Evidence status:** the Croqueta was **never** feasible in any owner croqueta attempt. All were at a run, and three were toward the right. There is therefore no owner evidence yet of how the croqueta intent looks *where the Croqueta can actually be played* (`OWNER_INPUT_ANALYSIS.md §11`, item 4).

A Croqueta from a **plain one-sided lateral move** (no counter) would be automatic selection inside ordinary steering. That is ADV-4's old auto-solution idea. It conflicts with "ordinary movement remains ordinary" and **is not proposed** unless the owner asks for it after those recordings.

---

## 6 · FALSE-POSITIVE ANALYSIS (per rule element)

| ordinary input | could it trip the rule? | protection | evidence |
|---|---|---|---|
| normal steering, small corrections | no: wobble ±0.8–4.8° never reaches a 25° side and then crosses | the first-side depth | **recorded** (20 held lines) |
| gentle arcs | no: one-sided | the crossing | **recorded** (4 of 4 never crossed) |
| hard cut | no: one-sided; an overshoot that corrects back stays on one side | the crossing | **recorded** (4 of 4 never crossed) |
| zig-zag dribbling | **yes**, if a leg is short | the held line before the first swing (≥ 0.3 s); the short first-side hold (≤ 0.25 s) | **not recorded**: record 6 zig-zags |
| "I changed my mind" (a real cut one way, then a real decision to go the other) | **yes: the same shape** | only the first-side hold limit, and the body's own commitment (an already-committed cut makes the Body Feint gates decline) | **not recorded**: the decisive comparison, record 6 |
| camera / controller correction, acquisition transient | no | the held line + a moving player + ignoring 0.2 s after leaving neutral | **recorded**: all 5 transients came before any held line, from rest |
| 180° reversal | no, if it ends behind | the exit must be in front (< 100°) | **not recorded**: record 4 each side |
| a thumb slipping across the centre (touch) | unknown | the side must be held / clearly reached | mouse data only |

**The gates are no defence.** The canonical Body Feint would have played at most request frames of the owner's ordinary SHARP and GENTLE right turns (46–58 of 61 frames). Every protection has to be in the recognizer.

---

## 7 · RESPONSIVENESS

| intent | earliest recognition | typical | how much of the gesture | before it completes? |
|---|---|---|---|---|
| STEER | immediate (per frame, as today) | — | — | — |
| DECEPTION | 167 ms after the swing's start | ≈ 200 ms (feints, median 200); ≈ 230 ms (croqueta attempts) | the first side plus the crossing; the exit hold is not needed | **yes**: the gesture settles at 200–462 ms |

**Recognition cannot come earlier from the stick alone.** For its first ~150 ms a feint's first side looks like a sharp cut: the same speed, and 48–143° against 46–79°. A provisional state can open at the first swing, but acting on it would delay every genuine cut. No 400–500 ms wait is needed: recognition comes at ≈ 0.2 s, and the body's own stride timing sets the execution after that.

**The A/B worth playing (feel decides, not these numbers):**
- **A, the V1 default:** the first side steers the body as it does today.
  - The deception is recognized at ≈ 0.2 s and the feint plays on the next valid stride.
  - Owner data: 6 of 8 played; first stance 421–1492 ms after the onset.
  - Before the feint, the body may visibly start a cut toward the fake.
- **B, first-phase hold:** while a fast, large swing from a held line is undecided (≤ 0.25 s), the movement keeps the line. It then resolves to the cut (applied up to 0.25 s late) or to the deception.
  - Owner data: 8 of 8 played; first stance 421–1003 ms.
  - The cost is that every genuine sharp cut is delayed by up to the hold.

---

## 8 · OWNER DECISIONS before V1 is built

1. **The mirror for this right-footed player.** DECEPTION RIGHT → LEFT has no canonical Body Feint, because fake right → exit left is the left-footed twin's move. Choose one:
   - V1 recognizes the intent and plays the ordinary cut;
   - or a right-footed fake right → exit left is validated later (a Body Feint change, not part of this work).
2. **The exit angle.** Confirm that the stick's exit is read as a side: the Body Feint uses its validated 35–40° at a run, then ordinary steering continues.
3. **The Croqueta.** Choose one:
   - contextual within DECEPTION (a jog, and toward the left for this player);
   - or no Croqueta from the left stick in V1 until the jog recordings exist.
4. **A or B (§7),** decided by playing.
5. **The device for the next recordings:**
   - the phone's thumb (needs the lab served on the LAN);
   - a gamepad;
   - or the mouse with *pad at centre*.

---

## 9 · What building V1 would touch (later, after review)

- **A new module beside the input pipeline.** It reads the stick history (the same frames the lab records) and emits DECEPTION events into the **existing explicit-request path** (`sim.requestSkill`, the path the sandbox's 7 / 8 / 9 / 0 keys already use).
- **A lab overlay.** It would replay every recorded attempt through the recognizer offline, then live, with the recognition point drawn.
- **No change to** Body Feint, Croqueta LEG-WAVE V4, carry, gait, Agility, Technical Control, B4 / B5, support, ball physics or the vocabulary.
