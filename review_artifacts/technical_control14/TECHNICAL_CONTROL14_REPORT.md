# TECHNICAL-CONTROL-1.4: Dribbling 99 = the fastest technique, not the most touches

**Status:** presented for the owner's visual review (owner §19). NOT frozen, NOT integrated. The fancy-move library is not expanded.

- **Instruction:** saved verbatim at `sources/2026-10-19_user_instruction_99_fastest_technique_not_most_touches.md`.
- **Review page (local only):** `review/TECHNICAL_CONTROL14_REVIEW.html`.
- **Lab:** `http://127.0.0.1:8361/sandbox/visual/technical_control14.html`.
  - Model menu: TC1.4 · TC1.2 technique (TC1.3 body) · Dribbling 99 | 80 | 50 · before vs after.
  - Every view's header names the chosen action and counts the ball contacts since the direction change was asked.
- **What I could and could not see:** I cannot play video in real time. Everything here comes from the authoritative simulation's measurements and from stills. The motion at normal speed and in slow motion is the owner's to judge.

## 1. What was wrong (measured on TECHNICAL-CONTROL-1.2)

The test: 5.5 m/s, Ball Control and Agility 99, a right-footed player.

- At Dribbling 99, a 90° cut took 3 ball contacts, 120° took 4 and 150° took 4.
- Dribbling 99 was no more efficient than Dribbling 50. At 120°, 99 even took one contact more (4 against 3).

There were four causes.

1. **The turn was decided a touch late.** TECHNICAL-CONTROL-1's between-contacts decision (`watch`) was written but never called, so every turn was decided at the next contact.
2. **Setup touches.** A carry touch was inserted before the action whenever one fitted.
3. **Recovery touches.** After the cut, the carry rhythm touched at every footfall while the body was still turning.
4. **No fast through-stance cut** in the vocabulary. The Cruyff was the closest, but it brakes to 1.6 m/s first.

## 2. The correction

Code: `sandbox/visual/technical_control14/`, with `tc14_core.js` (`EffEpisode extends CarryEpisode`, `EffSim extends FlowSim`) and `tc14_body.js` (`ChopBody extends FlowBody`). It is a gameplay layer on TECHNICAL-CONTROL-1.2's carry model.

- **The turn is decided when it is asked.** The between-contacts decision now runs every 6 ticks.
  - A contact already on its way can still become the action's contact if Dribbling's adapt time remains before it: 0.05 s at 99, 0.10 s at 80, 0.16 s at 50.
- **Dribbling sets preparation, foot-action speed, and the difficulty it can execute,** smoothly weighted and never banded (owner §5).
  - A candidate solution's cost counts:
    - its ball contacts;
    - the time to its decisive contact;
    - the time until the body runs on the new line (each candidate's body program is integrated);
    - its difficulty against Dribbling's execution capability.
  - Difficulty is the family's own, plus the angle beyond its comfortable range, plus the speed.
  - A touch before the action, planned for it, makes the action easier. That is the lower-rated player's control → cut.
  - The action played on the contact already on its way is the unprepared, hardest version.
- **THE CHOP** (Ronaldo chop / through-stance cut), for 85–165°:
  - The foot away from the turn plays the ball with its inside at mid-swing, sweeping across behind or through the standing leg. The other foot is planted beside the body at that moment (landed within the last 0.14 s), and the ball leaves along the new line.
  - The body plants with a hard redirection: TURN-1's entry speed × 1.08, and Agility's redirection × 1.15.
  - It is played on the contact already on its way only when the ball is already close (within 0.25 m of the chop point). At stride-carry distance the ball is 0.46 m ahead, so the touch already due sets the ball first.
  - TECHNICAL-CONTROL-1.4's body places the standing foot just past and beside the ball (presentation).
- **The Cruyff** is also played only off a standing leg.
- **The explosive outside cut** reaches up to 95° at high Dribbling (TC1: 70°).
- **The exit.** After the action, the next touch is the first footfall once the body runs on the new line. It comes earlier only if the ball would otherwise be more than 1.2 m from the body. No touch is added while the body turns, and none to hide low Agility (owner §12).
- **The styles' preferred techniques** (owner §16) are a choice layer of cost offsets:
  - close-control technician → drag-back / double touch / drag across;
  - two-footed technician → the double touch, the inside cut;
  - direct runner → the single outside / inside cut and the chop.
- **Unchanged:**
  - TECHNICAL-CONTROL-1.2's carry model (owner §6);
  - Ball Control's precision (the execution draws);
  - Agility's body;
  - TECHNICAL-CONTROL-1.3's transition body.

## 3. Results: the technique-efficiency test (owner §13)

Evidence: `evidence/tc14_summary.txt` / `.json`.

Setup: Ball Control and Agility 99, turns to the right, three request phases (seeds 1–3). "Contacts" counts every ball contact from the request until the body runs on the new line (within 15°, at least 2.5 m/s, held 0.2 s), including the touch already due when the turn was asked.

| turn · Dribbling | contacts, before → after | technique after | request → body on the new line, s |
|---|---|---|---|
| 60° · 99 | 2 · 2 · 2 → **1 · 1 · 1** | outside cut | 0.96 → **0.65** |
| 60° · 50 | 2 · 2 · 2 → 2 · 1 · 1 | outside cut | 1.27 → 0.85 |
| 90° · 99 | 3 · 3 · 3 → **1 · 1 · 1** | outside cut | 1.13 → **0.83** |
| 90° · 80 | 3 · 3 · 3 → 2 · 1 · 1 | inside / outside cut | 1.13 → 0.88 |
| 90° · 50 | 3 · 3 · 3 → **2 · 2 · 2** | set touch + outside / inside cut | 1.73 → 1.23 |
| 120° · 99 | 4 · 4 · 4 → **2 · 2 · 2** | due touch + **chop** (2 of 3) · drag-back | 1.30 → **0.83** |
| 120° · 80 | 3 · 3 · 3 → 2 · 2 · 2 | inside cut · drag-back · chop | 1.14 → 0.86 |
| 120° · 50 | 3 · 3 · 3 → 2 · 2 · 2 | drag-back · Cruyff | 1.71 → 1.02 |
| 150° · 99 | 4 · 4 · 4 → **2 · 2 · 2** | due touch + **chop** · drag-back | 1.27 → **0.85** |
| 150° · 50 | 3 · 3 · 3 → 2 · 2 · 2 | drag-back · Cruyff | 1.27 → 1.05 |
| 180° · 99 | 3 · 3 · 3 → 2 · 2 · 2 | Cruyff · drag-back | 1.02 → 0.94 |

**Turns to the left at 99.** For a right-footer the left turn is played by his carrying foot.

- At 60° and 90°, and at 120° in two of the three request phases, it is one strong inside cut across the body: **1 contact**, 0.43–0.99 s to the new line.
- Otherwise it is the chop (due touch + chop) or the drag-back: 2 contacts.

**The owner's acceptance cases at 99:**

- **A. 60°:** one outside / inside cut, 1 contact.
- **B. 90°:** one decisive contact.
- **C. 120°:** the chop. The touch already due when the turn is asked sets the ball, then the chop comes 0.22 s after the request. The body is on the new line at 0.71 s (TECHNICAL-CONTROL-1.2: 4 contacts, 1.30 s).
- **D. 150°:** 2 contacts (set + chop, or drag + push), 0.85 s.
- **E. 180°:** Cruyff or drag-back, 2 contacts, 0.94 s.

**Ball Control 50 (Dribbling 99, owner §11).** The same solutions are attempted, and the decisive contact is executed less precisely.

- The chop: 7–15° in direction, and −6% to −14% in speed.
- One 150° chop went 60° off (+72% speed).
- At Ball Control 99 the error is ≤ 2°.

**Agility 50 (owner §12).**

- 60–120°: no extra touches; the body takes longer to reach the new line (120°: 0.49 → 0.90 s from the contact).
- **150°: 3 contacts against 2 at Agility 99.** The closed loop adds a touch while the slower body turns — a limitation against §12 (§6).

**Styles at 99 (owner §16):**

- **close-control technician:** drag across at 60–90°, drag-back at 120–150° (2 contacts);
- **left-dominant carrier:** the preferred foot's inside cut (90°: 1 contact) and chop;
- **direct runner:** a single outside cut;
- **two-footed technician:** outside cut, chop, drag-back. It is the least distinct style, because its foot cost is already low.

**Open and tight carrying (owner §7, §8):** unchanged from TECHNICAL-CONTROL-1.2, and the same at Dribbling 99, 80 and 50.

| section | touches per second | footfalls between touches |
|---|---|---|
| open sprint 7.5 m/s | 1.15 | 4 |
| acceleration into space | 1.0 | 6 |
| straight 5.5 m/s | 1.73 | 2 |
| tight left-right sequence | 2.2 | 2 |

## 4. The body (owner §18)

TECHNICAL-CONTROL-1.3's phasing diagnostics, 108 runs (the efficiency cases × Dribbling 99 / 80 / 50 × seeds × both sides), on the same body: TECHNICAL-CONTROL-1.2's cuts with FlowBody → TECHNICAL-CONTROL-1.4 with ChopBody.

| | TC1.2's cuts | TC1.4 |
|---|---|---|
| frames with intersecting legs | 286 | 389 |
| worst overlap | 2.6 cm | 2.6 cm |
| pops per run, median | 16 | 11 |
| instant support swaps | 15 | 5 |
| planted slip, median | 0.8 mm | 0.6 mm |
| planted slip, worst | 17 mm | 48 mm (one 180° drag-back at D50) |

- The extra overlap frames are brief contacts (at most 2.6 cm) as the chopping and Cruyff legs pass behind the standing leg.
- **The chop's choreography:** the standing foot is planted at the contact, and the contact comes at mid-swing as the foot passes under the body. The first version played it in a flight phase, and its overlap was 679 frames.
- **TECHNICAL-CONTROL-1.3's torture set on TECHNICAL-CONTROL-1.4:** identical to TECHNICAL-CONTROL-1.3 (14 frames, 3 cases). Its receives have no direction change afterwards, so TECHNICAL-CONTROL-1.4 changes nothing there.

## 5. Checks

163 runs: the efficiency matrix, TECHNICAL-CONTROL-1.2's carry course × 4 players, and the receive chain × 99 / 80 / 50.

- Deterministic: 163/163.
- The body leaves gameplay untouched: 163/163.
- The posed skeleton is repeatable frame by frame: 163/163.
- Failures: 0.
- **The carry model on TECHNICAL-CONTROL-1.2's carry course,** TC1.2 → TC1.4:

  | carrier | outside | same foot | preferred-side lane |
  |---|---|---|---|
  | left- and right-dominant | 77 → 76% | 100 → 100% | 97 → 97% |
  | two-footed | 64 → 61% | 85 → 86% | — |
  | neutral right-footer | 68 → 57% | — | 94 → 82% |

  The neutral right-footer also changes in other surfaces and feet: instep 20 → 30%, preferred foot 97 → 86%. That comes from the course's cuts, which now use more inside cuts, chops and exits.
- **Protected and reference files:** 1,413/1,414 identical. They are TECHNICAL-CONTROL-1's protected list + TECHNICAL-CONTROL-1, 1.1, 1.2 and 1.3 at their commits. The one expected change is `technical_control13/tools/tc13_phase.mjs`: an option to run its diagnostics on another simulation, with the default unchanged.
- **CPU** (ms per simulated second, median):

  | | TC1.2 | TC1.4 |
  |---|---|---|
  | simulation alone | 13.0 | 12.1 |
  | with the body | 103 | 101 |

  The worst step with the body is 46 ms.

## 6. Limitations

- **The one-contact chop at stride-carry speed.** At 5.5 m/s the ball runs 0.46 m ahead of the body. A chop needs it beside or behind the standing foot, so the touch already due sets it: 2 contacts, of which the chop is the only one chosen for the turn.
  - Truly one-contact direction changes at 99 are the outside cut (60–90°) and, on the carrying foot, the inside cut across (60–120°).
  - A one-touch chop would need the ball already close (a close carry) or a deliberately softer last touch. I did not change the carry model for it (owner §6).
- **Separation.** It is larger after the decisive cut: median about 1.0 m (TC1.2: 0.7–0.9). The worst cases are a drag-back's push and the direct runner's cuts, at 1.4–1.7 m (2.15 m in one direct-runner 120° drag-back).
- **Vocabulary registration.** The chop is added to TECHNICAL-CONTROL-1's vocabulary object at import. TECHNICAL-CONTROL-1 and 1.2 never select it: it is not in their selection order.
- **Gait timing.** TECHNICAL-CONTROL-1's stride adjustment can still put an action's contact a few milliseconds before its swing starts when the forced contact comes too soon after that foot landed (seen in one inside-cut case). It is inherited.
- **Agility 50 at 150°** takes one contact more than Agility 99 (3 against 2): the ball is reached again by the closed loop while the slower body turns. Owner §12 asks for none; the exit timing for a slow body needs a further pass.
- **The 180° ankle flip** (TECHNICAL-CONTROL-1.3's F_180R sprint pivot) is not addressed in this pass; it remains as TECHNICAL-CONTROL-1.3 flagged it.

## 7. For the owner

1. **The visual review (§19):** Dribbling 99 | 80 | 50 on 60 / 90 / 120 / 150 / 180° (review page §3), the chop at normal speed and slowed (§4), and before vs after (§5). Is it "quick feet, not busy feet"?
2. **The chop's structure.** The due touch sets the ball, then one mid-swing chop off a planted standing leg. Is that acceptable as the elite solution at stride-carry speed, or should the carry before a likely turn be closer, so the chop can be the only contact?
3. **The Dribbling curves:** adapt 0.05 / 0.10 / 0.16 s at 99 / 80 / 50, the execution capability, and the difficulty per family and angle.
4. **The separation** after decisive cuts (about 1 m).
