# TECHNICAL CONTROL — FOUR HIGH-VALUE DRIBBLING SOLUTIONS (ADV-4): stopped for your review (22 Oct 2026)

## ▶ PLAYABLES (LOCAL ONLY — the character is a real player's model)

- **THE DRIBBLING LAB — http://127.0.0.1:8361/sandbox/visual/adv4_lab.html**
  - **New, at the top: ADVANCED AUTO SOLUTIONS.** Six cards: CROQUETA, V-TURN, MATTHEWS, STOP-AND-GO, CRUYFF, RONALDO CHOP.
    - Buttons: **▶ PLAY · COMPARE · MIRROR · AUTO · TRY**, plus **1× / 0.5× / 0.25×**.
    - Each card answers "why better than the basic solution in this replay?" in one sentence, with that replay's numbers. Where the answer is "it is not", the card says so.
  - **COMPARE** puts lane A (the advanced family) beside lane B (the basic solution), from the identical entry, synchronised.
    - The table shows: request → decisive, → useful exit, total, **preparation**, speed at the contact, **lowest speed**, **exit speed** (1 s later), **control back**, and metres along the exit.
    - **DIAG** draws both lanes' ball and body paths.
    - Stop-and-go pairs are measured to the **relaunch**.
  - The COMPARE list holds 11 new pairs plus the 9 CRUYFF-CHOP-1 pairs.
  - New chains: croqueta → accelerate; croqueta → outside cut; V-turn → accelerate; V-turn → croqueta; Matthews → outside exit → accelerate; stop-and-go → D38 sprint; stop-and-go → 45° exit.
- **THE JOYSTICK SANDBOX — http://127.0.0.1:8361/sandbox/visual/adv4_sandbox.html.** STOP-AND-GO pressed **with the sprint key held** is the hesitation.
- **CRUYFF-CHOP-1 is unchanged** as the reference (`cruyff_chop1_lab.html`), and so is VOCAB-1.

> I cannot play video in real time. Everything here was measured in the simulation (node and headless Chrome); how it **looks** at 1× is your review.

---

## 0. The verdict in one table

**The default player:**
- S99 · Acc99-D38 · A99-C · Agility B · D99 · BC99 · CARRY-B · CONTROLLED.
- Right-footed; the MIRROR is the left-footed twin.

**How the times were measured:**
- Times are request → **useful exit**: the body within 30° of the request at ≥ 70 % of cruise; for stop-and-go, the relaunch.
- Each cell is averaged over 4 stride phases (`tools/adv_measure.mjs`).
- There are **no defenders**, so deception and protection are not scored.

| family | what it is now | where it beats the basic solution (measured) | where it does not | recommended class |
|---|---|---|---|---|
| **CROQUETA** | Unchanged geometry (B4's LAT): the right inside plays it across, the **left inside receives** it next stride (0.23 s) and carries on. | Far-side diagonals at jog/run: 0.36–0.45 s against **B4's own 0.52–0.59**, because B4's choice waits for the analog-feint hold. | Against a *requested* inside cut it is equal or 0.05 s slower (0.36/0.35, 0.41/0.39). To the ball's own side it is slower than the outside redirect. Rejected at a sprint. | **AUTO + MANUAL**. B4 picks it by itself in the Lab's state. |
| **V-TURN** | **New: one parameterized family**, 70–120°, ≥ 2.0 m/s. A moving sole pull (≈ 1.2 m/s), the same inside pushes it out 0.15 s later, an exit touch. | Against the **hook** at 120°: jog 1.01 vs 1.20, run 1.25 vs 1.33, sprint 1.79 vs 2.11. Against the **Cruyff from a sprint**: 1.73–1.79 vs 2.05–2.06. Body never below 0.6 m/s (hook 0.2), ball ≤ 0.66 m. | Never against **B4's ordinary choice**: inside cut 0.46–0.53 at 90°, braking pivot or B4 0.88–1.15 at 120°. The Cruyff is 0.07–0.20 s quicker at jog/run. | **MANUAL**. B4 never chooses it, correctly. Its value, the ball pulled away and protected, is not scored yet. |
| **MATTHEWS** | **New compact version**, 35–95°, ≥ 2.0 m/s: an inside cue (0.6 m/s nudge), round the ball, the same foot's outside takes it out 0.12 s later; a sidestep, no hop. | Against the **old drag-push**: 0.75–0.99 vs 1.14–1.57 s, and walk/jog body events gone. | **Never against the outside redirect / cut**: 0.36–0.50 s. The cue is for a defender's reaction, which nothing models. Not buffed. | **MANUAL**. B4 never chooses it. |
| **STOP-AND-GO** | **Rebuilt credible.** Deaden: braked as the **A99-C stop** brakes, contact ≤ 1.5 m/s, push on the D38 curve, straight on (≤ 15°). Sprint key held: the hesitation. | Against **stop → settle → go**: run 0.98 vs 1.14, sprint 1.07 vs 1.33; 7.3 m/s one second after the lowest speed (2.9 / 1.7). The hesitation: sprint 0.59 vs 0.65. | Against the **ordinary stop** (released → pressed): equal at run/sprint (0.98/0.93, 1.07/1.06), slower at a jog (0.85 / 0.57). A stick cannot tell B4 "stop, then go". | **MANUAL**. AUTO cannot read the intent from a stick. |

**Not changed (as approved):** the Cruyff and the chop. The B4 cards report their CRUYFF-CHOP-1 advantages over the hook in their replays (0.14 s and 0.17 s).

---

## 1. What changed (all in `sandbox/visual/adv4/`, a copy of `cruyff_chop1/`; the references are untouched)

Each rule can be switched off for the tools (`ABL=…`); its effect is in §6.

1. **The V-turn family** (`v_tech.js` `vTurnOf`, id `VTURN`; player-facing **V-TURN**).
   - One template, its turn keys scaled by the request (reference 80°, hard 70–120°).
   - A moving pull, then the same inside out across. An exit touch by the far foot keeps the plan going.
     - Without it, the possession model saw "no contact planned" after the push.
     - The SECURE fallback then took the body round at its own rate: the pelvis overshot by 35° and the legs crossed.
   - A shortest valid entry opened at the standing foot (`TRIMMED.VTURN`, ENTRY_FAMILY).
   - **Removed from the family, measured:**
     - The **behind-the-leg** variant (`VTURN_B`, kept as a reference) is the Cruyff's drag with one touch more, and it crossed the legs 9–10 cm at 120–150°.
     - So past ≈ 120° the reversal is the Cruyff's, hook's or drag-back's.
   - V-PULL, L-DRAG and PULL-PUSH are no longer player-facing or AUTO; the templates remain.
2. **The compact Matthews** (`MATTHEWS_C`; player-facing **MATTHEWS**). The VOCAB-1 drag-push stays as the reference.
3. **Stop-and-go made credible** (`STOPGO_E`; **STOP-AND-GO** = `DEADEN`, or `HESITATE` with the sprint key).
   - **`bodyBrake`:** the deaden brakes before its contact at the **rated A99-C stop's rate**: rest in max(0.12, 0.34 × (0.4 + 0.6 v/8)) s, ≈ 25 m/s² from a sprint.
     - This is the rate the *basic* stop uses when the stick is released.
     - Before, it braked at the planner's 0.9 × aBrake (8.6 m/s²), three times more gently, so it lost to the basic stop by construction.
   - **`vCmax` 1.5 m/s:** the deaden is a stop, so a faster contact brakes first.
     - Without it, a sprint's deaden met the ball at 2.6 m/s and ran past it, and no braking plant could be found.
   - **`d38`:** after the contact, the speed never exceeds the ball-carrying D38 curve from the lowest speed.
     - Before, the push was scaled to 1.45 × the reference: 6.7 m/s 0.4 s after a 0.9 m/s deaden, where D38 with the ball allows 4.4.
   - **≤ 15°:** pushed into 20–45° at a run, the legs crossed 5–8 cm. A new line is the next action (the chain "stop-and-go → 45°").
4. **`releaseAt`:** a manipulation of two touches (the V-turn's push, the deaden's push) returns control after its second touch.
5. **The D38 cap is not applied to the approved Cruyff and chop.** Capped, the Cruyff at a run would be 0.08 s slower (1.05 → 1.13). That is a finding for you, not a change.
6. **Measurement:**
   - `exitMetrics` (`v_run.js`) gained preparation, exit speed and the stop-and-go relaunch.
   - `adv_measure.mjs` gained the BASIC lane (`noFam`: the families withheld from B4, as a player without them) and a fair relaunch threshold: min(4.0, 0.9 × entry).
   - `adv_compare.mjs` runs the Lab's own replays in node.
7. **The Lab** (`u_viewer.js`, `v_cases.js`):
   - the ADVANCED cards, `ADV_COMPARES`, and the new chains;
   - the sprint key carried with a request;
   - the curated replays of the folded techniques replaced: V_PULL, L_DRAG, PULL_PUSH → V_TURN; DEADEN_EXPLODE, HESITATION, FAKE_STOP → STOP_AND_GO.

---

## 2. The four families, measured (4 stride phases per cell; ⚠n = normal-speed-visible body events in the 4 runs)

### CROQUETA — `evidence/measure_AFTER_CROQUETA.txt` (the croqueta itself is unchanged; the BEFORE file is identical)

| exit | WALK | JOG | RUN | SPRINT |
|---|---|---|---|---|
| 40° left (far side): croqueta / B4 / requested inside cut | 0.28 / 0.12 / 0.21 | **0.36** / 0.54 / 0.35 | **0.41** / 0.52 / 0.39 | rejected / 0.86 / 1.52 (2/4) |
| 55° left: croqueta / B4 / inside cut | 0.32 / 0.14 / 0.24 | **0.38** / 0.59 / 0.38 | **0.45** / 0.54 / 0.52 | rejected / 0.93 / 1.56 (2/4) |
| 40° right (the ball's own side): croqueta / B4 / outside redirect | 0.51 (2/4) / 0.26 / 0.22 | 0.65 (3/4) / 0.46 / 0.35 | 0.65 / 0.51 / 0.39 | rejected / 0.93 / 1.52 (2/4) |

- **Body: 0 normal-visible events** in every croqueta played.
- **Why B4 is slower on the far-side diagonal:** this is not a croqueta cost.
  - VOCAB-1's analog feint holds any new touch toward a 20–75° stick change for 0.15 s at ≥ 3 m/s, in case it is a feint.
  - A request skips the hold, and so does B4 once the hold ends.
  - In the Lab's RUN state, B4 chooses the croqueta itself.

### V-TURN — `evidence/measure_AFTER_V_TURN.txt` (BEFORE: the VOCAB-1 V-pull / L-drag)

| | WALK | JOG | RUN | SPRINT |
|---|---|---|---|---|
| 90°: V-turn / B4 / inside cut / Cruyff | rejected / 0.22 / 0.29 / 0.60 | **1.01** / 0.46 / 0.48 / 0.94 | **1.30** / 0.53 / 0.50 / 1.01 | **1.73** / 1.03 / 1.76 (2/4) / 2.05 |
| 120°: V-turn / B4 / inside hook / Cruyff | rejected / 0.34 / 0.86 / 0.60 | **1.01** / 0.88 / 1.20 / 0.94 | **1.25** / 1.15 / 1.33 / 1.05 | **1.79** ⚠2 / 1.05 / 2.11 / 2.06 |
| BEFORE (V-pull) 90° · 120° | 0.85 · — | 1.29 · rejected | 1.46 · rejected | rejected · rejected |

- **Where the envelope came from:** the measured body, not a pace bucket.
  - At **60°** the carry after its exit crossed or floated twice per run at a jog and a run, and the inside cut is the quicker answer there.
  - At **150°**, see the behind-the-leg variant in §1.
  - At a **walk**, its exit stride floated 0.21 s in every phase. That is an open body defect, not a football limit; the hook, Cruyff or braking pivot play there.
- **Possession and body:** 0 exits; jog and run at 90/120° clean; sprint 120° ⚠2 in 4 runs (it is prepared by braking from 9.7 m/s).

### MATTHEWS — `evidence/measure_AFTER_MATTHEWS.txt`

| | JOG | RUN | SPRINT |
|---|---|---|---|
| 50°: compact / BEFORE drag-push / outside redirect / outside cut | **0.75** / 1.19 ⚠4 / 0.36 / 0.39 | **0.95** / 1.36 / 0.50 / 0.93 | **1.39** / rejected / 1.55 (2/4) / 1.04 |
| 70°: compact / BEFORE / outside redirect / outside cut | **0.78** / 1.22 / 0.44 / 0.41 | **0.99** / 1.57 / 0.46 ⚠4 / 0.95 | **1.43** / rejected / 1.60 (2/4) / 1.10 |

- **Rejected below 1.6 m/s and under 35°.** The compact version floated 0.15–0.19 s at a walk, and crossed 5 cm at 30° from a run. The outside redirect or cut plays there.
- **The decisive contact waits for the body to reach the ball** 0.26 m ahead, like every template (Cruyff, V-turn). The one-touch cuts accept the ball anywhere in their reach box, which is why they are quicker. An alternate-support entry (opened at the sidestep) changed nothing and was removed.

### STOP-AND-GO — `evidence/measure_AFTER_STOP_AND_GO.txt` (relaunch: after the lowest speed, ≥ min(4.0, 0.9 × entry) within 30°)

| | stop-and-go | ordinary stop (released → pressed) | stop → settle → go | BEFORE (non-credible deaden) |
|---|---|---|---|---|
| STOP, JOG | 0.85 | **0.57** | 0.94 ⚠2 | 0.90 |
| STOP, RUN | 0.98 | 0.93 | 1.14 ⚠1 | 0.90 |
| STOP, SPRINT | **1.07** | 1.06 ⚠2 | 1.33 ⚠6 | 0.97 |
| HESITATION (sprint held), RUN | 0.53 ⚠1 | 0.43 | — | 0.90 |
| HESITATION, SPRINT | **0.59** | 0.65 | — | 1.05 |
| 45° new line (JOG / RUN / SPRINT) | rejected → B4 0.63 / 0.92 / 1.43 ⚠4 | | 1.05 / 1.22 / 1.33 | 0.95 / 0.95 / 1.11 |

- **Speed 1 s after the lowest:** stop-and-go 7.3 m/s, ordinary stop 4.5, stop → settle → go 2.9 (run). The ball is dead under the sole, and the push is already the first step.
- **"BEFORE" was faster at a run only because it was not credible:** 6.7 m/s 0.4 s after a 0.9 m/s deaden. The credible version costs 0.08 s at a run.
- **The basic stop is extremely quick** because A99-C stops in ≈ 0.34–0.38 s from any speed. That is your approved Agility; I did not touch it.

---

## 3. The required comparisons — the Lab's COMPARE replays (`evidence/compare.txt`; phase 0 = the replay itself)

| pair (A the advanced, B the basic) | A total | B total | A prep | lowest v A / B | exit v A / B | control back A | A / B body |
|---|---|---|---|---|---|---|---|
| CROQUETA vs INSIDE CUT, RUN 40° | 0.52 | **0.47** | — | 5.3 / 5.3 | 5.3 / 5.3 | — | 0/0 · 0/0 |
| CROQUETA vs B4 without it, JOG 40° | 0.47 | 0.47 | — | 3.2 / 3.2 | 3.2 / 3.2 | — | 0/0 · 0/0 |
| V-TURN vs INSIDE HOOK, JOG 120° | **1.12** | 1.19 | 0.52 | 0.6 / 0.2 | 3.2 / 3.2 | +0.24 | 0/4 · 0/1 |
| V-TURN vs B4 without it (braking pivot), JOG 120° | 1.12 | **0.81** | 0.52 | 0.6 / 2.7 | 3.2 / 3.2 | +0.24 | 0/4 · 0/0 |
| V-TURN vs INSIDE CUT, JOG 90° | 1.12 | **0.64** | 0.52 | 0.6 / 3.0 | 3.2 / 3.2 | +0.24 | 0/3 · 0/0 |
| MATTHEWS vs OUTSIDE REDIRECT, JOG 50° | 0.86 | **0.43** | 0.52 | 2.6 / 3.2 | 3.2 / 3.2 | +0.06 | 0/1 · 0/0 |
| STOP-AND-GO vs STOP → SETTLE → GO, RUN | **1.01** | 1.32 | 0.25 | 1.0 / 0.0 | 7.3 / 5.5 | +0.14 | 0/0 · 1/0 |
| STOP-AND-GO vs ordinary stop, RUN | 1.01 | **0.80** | 0.25 | 1.0 / 0.9 | 7.3 / 7.8 | +0.14 | 0/0 · 0/0 |
| STOP-AND-GO vs ordinary stop, SPRINT | **0.99** | 1.14 | 0.23 | 1.1 / 0.0 | 7.3 / 6.9 | +0.14 | 0/1 · 2/1 |
| STOP-AND-GO vs STOP → SETTLE → GO, SPRINT | **0.99** | 1.33 | 0.23 | 1.1 / 0.0 | 7.3 / 5.8 | +0.14 | 0/1 · 1/1 |
| HESITATION vs released 0.3 s → pressed, SPRINT | **0.54** | 1.57 | 0.28 | 5.3 / 0.6 | 8.4 / 7.2 | +0.06 | 0/0 · 0/0 |
| (CRUYFF-CHOP-1) CRUYFF vs INSIDE HOOK, JOG 120° | **1.05** | 1.19 | 0.52 | 0.7 / 0.2 | 3.2 / 3.2 | +0.09 | 0/1 · 0/1 |
| (CRUYFF-CHOP-1) CHOP vs INSIDE HOOK, RUN 120° | **1.27** | 1.44 | 0.57 | 2.2 / 0.2 | 5.3 / 5.3 | +0.11 | 0/2 · 0/0 |

**Possession in every lane:** kept (CONTROLLED); 0 missed contacts.

**Two cases need reading with care:**
- **The hesitation's "basic" lane** (stick released for 0.3 s) **is a full stop** with A99-C: 0.6 m/s.
- **There is no pure "brake → settle → accelerate" with a defender's timing**, so the stop-and-go pairs fix the press moment to adv_measure's average.

## 4. Chains (`evidence/cases.txt`, CHAIN rows; all requests PLAYED, possession kept)

| chain | played | total | body |
|---|---|---|---|
| Croqueta → accelerate | croqueta, then the sprint | 0.52 (8.4 m/s 1 s later) | 0/0 |
| Croqueta → outside cut | croqueta + outside cut | 0.52 | 0/0 |
| Croqueta → accelerate → outside cut | both | 0.53 | 0/0 |
| V-turn → accelerate | V-turn, then the sprint | 1.12 (6.5 m/s 1 s later) | 0/3 |
| V-turn → croqueta | V-turn + croqueta | 1.12 | 0/2 |
| Matthews → outside exit → accelerate | Matthews, then the sprint | 0.86 (7.8 m/s) | **1/0**: a 9 cm crossing in the *plain sprint carry*, 0.2 s after the Matthews |
| Stop-and-go → D38 sprint | deaden + push, then the sprint | 0.95 (7.3 m/s) | 0/0 |
| Stop-and-go → 45° exit | deaden + push, then B4's inside redirect onto 45° | — | **1/1**: a 0.21 s float in B4's *inside redirect* after the relaunch |
| Stop → feint → explode | deaden + body feint | 0.86 | 0/0 |

The decisive actions flow into the next one: the next request is taken at its tick, with no canned clip.

## 5. Integrity (`evidence/`)

- **Curated replays:** `cases.txt`
  - 105 cases; 81/90 with every request PLAYED (the rest are the REJECTED variants, as designed).
  - 0 possession exits, 0 missed contacts.
  - **10 normal-visible body events in 9 cases** (CRUYFF-CHOP-1: 11 in 10).
  - The Matthews replays are now clean (were 1/1 each). The two new events are the chain continuations in §4.
- **Extremes, ball on (140 runs):** 62 normal-visible, 131 slow-motion, 0 missed, 0 exits. CRUYFF-CHOP-1: 62 / 133. B4 does not choose the new families in the reversal scenarios. Ball off: `extreme_ball_off.txt`.
- **Body torture, classified** (18 seeds × 60 s; `body_torture_classified.txt`): **normal-visible 180, slow-motion 276.** The same seeds on CRUYFF-CHOP-1 gave 211 / 311.
- **Body torture, S99** (8 seeds, S99_CARRY=B; `body_torture_s99.txt` and the reference on the same seeds `body_torture_s99_REF_cruyff_chop1_same8seeds.txt`):
  - **All levels, 1084 vs 1013 (+7 %):** crossings 549 vs 487, jumps 107 vs 91, knees 160 vs 173, floats 263 vs 260.
  - **The rise is in the plain CARRY** (741 vs 660 events). L-drag and V-pull are no longer separate AUTO techniques (folded into V-TURN), so B4 carries more in those states.
  - The L-drag had 33 events itself.
- **Possession torture** (CONTROLLED, CARRY-B, 40 seeds × 60 s; `torture_verbose.txt`): see `torture_wide.txt` for 160 seeds per build (§8).
  - 0 missed contacts.
  - **Observed losses 10 (0.26/min) vs 5 (0.13/min).**
  - **None** happened during a new family's action: CARRY 4, croqueta 2, inside redirect 1, Cruyff 1, drag-back 1, outside hook 1.
- **Determinism** (`determinism.txt`): **18/18 identical** simulated twice, and **18/18** re-simulated from the recorded input + events (the page's replay path).
- **Browser** (`browser.json`; headless Chrome, `tools/v_browser.cjs`): 0 console errors, 0 HTTP errors.
  - 6 ADVANCED cards; all 30 card buttons clicked (PLAY / COMPARE / MIRROR / AUTO / 0.5×).
  - Each COMPARE drew lane B; TRY opened live play; the sandbox played a manual request.
- **CPU, gaps, feints, battery, intent torture:** `cpu.txt`, `contact_gaps.txt`, `feint.txt`, `battery.txt`, `intent_torture.txt` (see §8).

## 6. Ablations — each rule switched off alone (`evidence/ablations.md`)

- **A99-C stop braking for the deaden (`bodybrake`):** without it, the sprint stop-and-go takes **1.70 s instead of 1.07**.
- **Contact-speed caps (`vcmax`):** without them, the V-turn at a run is 0.13 s quicker (1.17 vs 1.30) but with 12 slow-motion events (7), and 0.06 s slower at 120°.
- **`credible` and `d38`:** **no change in any measured state.** With the contact-speed caps, the contacts stay at their reference speed, so these two are safeguards that do not bind. They bound the deaden's push only before the caps existed.
- **`release`:** control back at the first touch (0.10 s instead of 0.24 / 0.14), with no change in time or body now that the exit touch exists.

## 7. Honest findings

1. **Without defenders, two of the four (V-turn, Matthews) have no state where they beat B4's ordinary choice.** They beat their older versions and some other named moves (V-turn vs hook, V-turn vs Cruyff from a sprint), but not the cut or redirect B4 would play. I did not buff them; B4 never chooses them.
2. **The croqueta's measured edge over B4 is the analog-feint hold, not the croqueta.** Against a requested inside cut it is level.
3. **Stop-and-go is level with the A99-C stop at run and sprint.** It wins clearly against stop → settle → go and in exit speed. The A99-C stop (≈ 25 m/s² from a sprint) is far beyond a human's. If you ever soften it, the deaden's advantage grows by the same rule (`bodyBrake` follows the profile).
4. **The D38 cap would slow the approved Cruyff at a run by 0.08 s.** I left the Cruyff and chop as reviewed.
5. **The template limit:** every template technique waits until the body reaches the ball at its authored offset. That costs 0.3–0.6 s against the one-touch cuts, whatever the technique.
6. **Open body defects** (reported, not hidden):
   - the V-turn's and Matthews' exit stride at a walk (rejected there);
   - the angled deaden at 20–45° (narrowed to ≤ 15°);
   - V-turn from a sprint at 120°: ⚠2 in 4 runs;
   - two chain continuations (ordinary actions).
   - Narrowing the deaden removed B4's angled-deaden option in 1–2 of 4 phases at some sprint turns of 30–70°; B4 plays the knock-on or a redirect there instead.

## 8. The rest of the evidence

- **Possession torture, wide** (`torture_wide.txt`; the same seeded random joystick programs on both builds, 160 seeds × 60 s each):
  - **ADV-4: 25 observed losses (0.16/min).** CRUYFF-CHOP-1: 33 (0.21/min).
  - Missed contacts 0 in both.
  - The 40-seed difference above was noise.
  - The ADV-4 losses were in CARRY (9), plus one each in the braking pivot, inside redirect, Cruyff, drag-back, outside cut and chop. **None was in a new family's action.**
- **CPU** (`cpu.txt`, interleaved, the same input): **103.5 ms per simulated s** against CRUYFF-CHOP-1's 105.8.
  - Re-plans 40.6/s, mean 2.38 ms, p99 6.6 ms.
  - Worst tick 12.0 ms (15.3).
- **Battery** (`battery.txt`): **67/72 PLAYED.** Every one of the 22 family rows plays: V-turn ×6, stop-and-go ×4, hesitation ×4, Matthews ×4, croqueta ×4. The 5 failures are CRUYFF-CHOP-1's own, unchanged.
- **Intent torture** (`intent_torture.txt`; 361 random manual requests under the random stick): PLAYED 78 · REJECTED 209 · CANCELLED 71. **0 CONTROLLED exits, 0 missed contacts.**
- **Contact gaps** (`contact_gaps.txt`, 717 contacts in the curated cases): boot ↔ ball p50 0.0 · p90 0.6 · p99 8.2 cm.
  - The compact Matthews' contacts: p50 2.0, max 8.6 cm.
  - The V-turn and stop-and-go exit touches: max 1.4 cm.
- **The analog feint** (`feint.txt`): 38/48 intended feints confirmed, 0/16 genuine cuts mistaken for one, noise ≤ 1 per 20 s. Unchanged.

## 9. Your decisions

1. **Classification.**
   - I recommend **CROQUETA AUTO + MANUAL**, and **V-TURN, MATTHEWS, STOP-AND-GO MANUAL** until defenders or protection exist.
   - They are left AUTO + MANUAL in the code, as you set; B4 simply never picks the three.
2. **The V-turn envelope** (70–120°, ≥ 2 m/s): accept it, or ask me to fix the walk exit-stride float and the 60° continuation instead.
3. **Stop-and-go straight on only** (≤ 15°), with the new line as the next action, or the angled deaden back with its 5–8 cm crossings at a run.
4. **The D38 cap on the Cruyff and chop** (Cruyff run 1.05 → 1.13 s): apply it for consistency, or keep the reviewed version.
5. **The analog-feint hold** costs B4 ≈ 0.15–0.2 s on every 20–75° diagonal at ≥ 3 m/s. It is a VOCAB-1 design choice; keep it, shorten it, or skip it when the request is held steady.
