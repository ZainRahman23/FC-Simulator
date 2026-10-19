# TECHNICAL-CONTROL-1.2: the carry model (the owner's correction)

**Status:** presented for the owner's visual acceptance (owner §24). NOT frozen, NOT integrated. Fancier skills wait for this acceptance.

- **Instruction:** saved verbatim at `sources/2026-10-19_user_instruction_carry_model_correction.md`.
- **Review page:** `review/TECHNICAL_CONTROL12_REVIEW.html` (local only).
- **Carry lab:** `http://127.0.0.1:8361/sandbox/visual/technical_control12.html`.
  - Carry model: TC1.2 · TC1 (old) · old vs new.
  - Views: run side-front · from behind (the ball's lane) · above, plus the feet views.
- **What I could and could not see:** I cannot play video in real time, so I could not watch the Messi footage. The model follows the principles in the instruction and the observational research cited there: Messi's surfaces (inside, outside, instep, sole, tip), outside-of-the-preferred-foot carrying sequences with running steps between touches, and inside to control → outside to move forward.

## 1. Why the old model ping-pongs

TECHNICAL-CONTROL-1:

- aimed every carry touch at a point on the **next touching foot's** side (±10 cm);
- took nearly every footfall and alternated the feet, so most touches had to send the ball across the body;
- treated an inward impulse as the inside's job, and the inside was the cheapest surface;
- let its closed loop move the next touch to the other foot for 0.3 cost;
- picked the double touch (inside → inside) at every change of a tight weave.

## 2. The model (`tc12_core.js`)

`CarryEpisode extends TechEpisode` and `CarrySim extends TechSim`. TECHNICAL-CONTROL-1 is unchanged: its receive, gait, actions, Ball Control's precision, closed loop and chase are reused.

- **Ball lane.**
  - A dominant-foot carrier (style foot ≥ 0.7, with a preferred foot) keeps the ball 15 cm toward the preferred side, outside that foot's own line. The weak foot's lane is 10 cm.
  - Any other player keeps each foot's lane at 10 cm.
- **The foot follows the lane.** A touch that takes the ball across the centre line costs:
  - 1.5 for a dominant-foot carrier, 1.1 for a player with a preferred foot, 0.9 for a two-footed player;
  - less when the intent bends toward that side;
  - half while turning.

  A weak-foot touch costs a dominant-foot carrier 2.2 × the style's foot bias. The closed loop's re-found contact keeps the dominant foot unless only the weak foot can play the ball.
- **Running steps between touches** depend on the context: speed, open space, turning, the style's rhythm and Dribbling's cadence. Footfalls are wanted per touch from a close table to a stride table:
  - a moderate carry touches every stride (touch → step → touch);
  - an open sprint ≥ 6.5 m/s breaks ties toward every two strides (touch → three steps → touch);
  - a tight turn touches every footfall.
- **Surfaces by function** for a carry touch (an action's contacts keep their ordered surfaces). The impulse direction is measured relative to the run, positive outward for the touching foot.
  - outside / outer instep from −15 to +50°: the forward carry, slight outward redirection, acceleration, the preferred foot's repeated touches; its cost is 0 for the strong foot, 7 for the weak one;
  - outside beyond 50°: the outside cut;
  - instep: the straighter, larger push at speed;
  - inside below −15°: inward correction and across the body; it costs 22 as a forward carry;
  - sole: the actions.
- **The actions on the lane.** An action whose first foot is not the ball's lane foot pays 0.8. The sophisticated families pay 1.2 × sophistication more simplicity. The double touch loses TC1's bonus as the tight sequence's default. So the outside cut toward the ball's side and the inside across the body away from it, both with the lane foot, are the plain answers (owner §15 – §17).
- **New style profile: *dominant-foot close-control carrier*** (`DOMINANT_CLOSE`): foot 0.95, outside 1.45, inside 0.9, sole 1.1, rhythm 0.8. It is a choice layer, not an attribute modifier, and is added to TECHNICAL-CONTROL-1's `STYLES` when `tc12_core.js` is imported.
- **TC1 bug fixed for TC1.2 runs:** a two-footed player got "R" as his preferred foot in dribble starts (a duplicated key). TC1.2 gives him no preferred foot.
- **Small contacts:** a carry touch rolls the ball to the next point in its lane at about the body's speed. The median impulse is ≈ 2.4 m/s for both models; nothing changed in the ball physics.
- **Attribute responsibilities are unchanged:**
  - Ball Control → precision;
  - Dribbling → cadence, coordination, vocabulary;
  - Agility → the body's reorientation.

## 3. Results

The course is 10 sections × 3 seeds at 99 / 99 / 99: straight moderate (4.5 m/s), straight fast (7.5), slight left and slight right (15°), 30° and 60° cuts both ways, a tight weave, and acceleration into space. Evidence: `evidence/tc12_summary.txt` / `.json` and `evidence/tc12_carry_sweep.jsonl`.

| | left-dominant old → new | right-dominant old → new | two-footed old → new | TC1 default (right-footed, neutral) old → new |
|---|---|---|---|---|
| preferred / left–right | L 99 → **100%** | R 99 → **100%** | L 49 / R 51 → **L 27 / R 73%** | R 68 → **93%** |
| inside | 12 → **10%** | 13 → **10%** | 57 → **20%** | 41 → **16%** |
| outside / outer instep | 10 → **79%** | 8 → **79%** | 5 → **67%** | 6 → **71%** |
| instep | 78 → **11%** | 79 → **11%** | 38 → **13%** | 51 → **13%** |
| same-foot consecutive contacts | 98 → **100%** | 97 → **100%** | 48 → **85%** | 43 → **96%** |
| running steps between contacts (mean) | 0.98 → **1.34** | 0.97 → **1.34** | 0.81 → **1.19** | 1.27 → **1.35** |
| ball's lateral offset, mean toward the preferred side | 10 → **15 cm** | 10 → **14 cm** | (abs 8 → 10 cm) | 3 → **9 cm** |
| time in the preferred-side lane | 97 → **98%** | 96 → **97%** | — | 60 → **92%** |
| centre-line crossings per second | 0.18 → **0.14** | 0.22 → **0.18** | 0.94 → **0.31** | 0.95 → **0.25** |
| touches per second | 1.78 → **1.59** | 1.78 → **1.59** | 1.94 → **1.76** | 1.57 → **1.63** |
| separation, worst | 0.87 → 1.00 m | 0.87 → 1.00 | 0.79 → 1.00 | 0.87 → 1.32 |

The two-footed player switches lanes when the direction asks. An example contact sequence (R / L = foot; O outside, I inside): RO RO RI LO LO LO LO, where the right inside brings the ball across, then the left outside carries.

## 4. Checks

Evidence: `evidence/tc12_checks.json`. The 75 runs are:

- the carry course × the 4 players;
- TECHNICAL-CONTROL-1's course, neutral style, at 99 / 80 / 50;
- the receive → dribble chain.

Results:

- **Deterministic:** 75/75 (two runs, animation off).
- **The legs leave gameplay untouched:** 75/75. Animation on with TECHNICAL-CONTROL-1.1's legs gives the same ball, contacts and path as animation off.
- **Failures:** 0, as for the old model.
- **Separation:**
  - carry course: median 0.66 m (old 0.65);
  - TECHNICAL-CONTROL-1's course: 0.83 (old 0.92);
  - chain: 0.87 (old 0.87).

  The worst cases are the open sprints into space (acceleration: 1.28 m at 99, old 0.87; 1.47 at 50, old 1.26). There the model takes fewer, longer stride touches, as owner §9 asks. The 120° turn is 0.68 m (old 0.86).
- **Protected and frozen files:** 959/959 identical. Evidence: `evidence/frozen_check.txt`.
- **CPU** (animation off; evidence: `evidence/tc12_cpu.json`):
  - per simulated second: 12.8 ms (TECHNICAL-CONTROL-1: 12.9);
  - worst 240 Hz step: 7.9 ms (4.9). The occasional extra cost is the closed loop's search restricted to the dominant foot.

## 5. Limitations

- **Two-footed lane.** The two-footed player stays in the lane it starts in during straight runs (73% right over the course). It switches when the direction asks for it.
- **The neutral right-footer becomes strongly one-footed** (93%). That is the lane model's consequence for a player with a preferred foot: the left foot plays in turns and lane changes.
- **"Outer instep" is the OUTSIDE label.** No new surface label was added to the authoritative contacts. TECHNICAL-CONTROL-1.1's contact search turns the leg in, from the hip, so that the outer forefoot meets the ball.
- **Sprint separation.** It is larger in open sprints (up to 1.28 m at 99). This is a judgement call.
- **Style registration.** The new style is registered into TECHNICAL-CONTROL-1's style table at import time. TC1's own lab is unaffected unless TC1.2 is loaded.

## 6. For the owner (owner §24)

1. **The visual acceptance** of basic carrying, at normal speed and in slow motion. Use the review page §3: old vs new for left-dominant, right-dominant and two-footed 99 / 99 / 99, plus TC1's default.
   - If it reads as a footballer running with the ball, the broader skill and style work continues on this vocabulary.
   - If not, I stay on the fundamentals.
2. **The lane offset:** 15 cm for a dominant-foot carrier.
3. **The neutral player's foot balance.**
4. **The sprint stride-carry length.**
