# DRIBBLING VOCAB-1 — research: a functional taxonomy of dribbling technique

This research was done by a subagent on 22 Oct 2026, from coaching material, biomechanics and match analysis.

- **Tags:** [U] marks a claim with no source found; [syn] marks synthesis.
- **Sources:** listed at the end.
- **How it is used:** the library in `sandbox/visual/vocab1/v_tech.js` / `v_meta.js` is built on the primitives found here.

## 0. How good the sources are

- **Coaching mechanics.** These come mostly from drill and session-plan sites and how-to guides:
  - Sport Session Planner, with Coerver and Meulensteen sessions;
  - the TeamSnap / Tracy Chao "Attacking Moves" sheet;
  - Mojo, We Make Footballers, Wikipedia and Goal.com.

  No official Coerver, FA or UEFA manual defines the individual moves. The sources often give one name to different moves (stepover vs scissors, chop vs Cruyff, the V-pull's push surface).
- **Biomechanics** of change of direction is solid: peer-reviewed research, plus two studies of cutting with a ball.
- **Move-frequency data is thin.** No study counts specific moves (stepover vs Cruyff vs chop) in elite matches.

## 1. The key structural finding — about 10 contact primitives [syn]

Nearly every named move is a **sequence of primitives**, plus a body fake and a timing pattern:

| | Primitive |
|---|---|
| P1 | Carry push (laces, outer laces, inside, little-toe edge) |
| P2 | Cut in front of the standing foot (inside / outside) |
| P3 | Cut behind the standing leg (inside: Cruyff, chop) |
| P4 | Hook: the foot wraps past the ball and pulls it back (inside / outside) |
| P5 | Sole pull / roll, with the pull direction as a parameter |
| P6 | Transfer to the other foot (inside → inside) |
| P7 | No-contact fake (the foot over / around the ball; a body or shoulder feint) |
| P8 | Same-foot double contact (outside → inside or inside → outside) |
| P9 | Heel contacts |
| P10 | Stop / deaden (sole or inside) |

Primitives plus approach speed, fake and exit parameters cover families 2–14 without a bespoke animation per named trick. **This is the library's design.**

## 2. The families: mechanics, purpose, distinctions

### Carry and pace
- **Close carry:**
  - small touches with the ball kept near the feet, in tight space or under pressure;
  - "little-toe" (outside) touches;
  - Euro 2021: the commonest one-foot pattern was inside–inside–outside, and 49.6 % of dribbles changed surface within one foot.
- **Sprint carry:**
  - "laces on the outer side of the foot";
  - a push about every 4–5 steps;
  - full sprint mechanics between touches.
  - Academy players dribbled at 5.19 m/s on a straight path; speed fell steeply on curves.
- **Knock-on / push-and-run:**
  - push the ball past one side of the defender with the outside of the foot, run round the other side;
  - timed to the gap; it exploits pace and the space behind.
- **Space touch vs control touch:**
  - slow down and use small touches approaching an opponent;
  - take a bigger touch out of the move;
  - "don't wait until you are on top of the defender".

### Inside / outside cut
- **Inside cut.** Angle slightly, wind up as if to shoot, then cut the ball with the inside of the right foot back toward the left standing leg. Move the standing leg out of the way, then take the ball on with the left foot.
- **Outside cut.** Drive at the defender, fake a shot, take it with the outside of the right foot to the right — one contact.
- **Inside hook ("spin-off").** Stop the ball, put the inside of the foot over and behind it, rotate and lower the body, drag the ball the opposite way (≈ 180°). It escapes a defender who presses without tackling.
- **Outside hook.** The outside of the foot goes over and behind the ball, the standing knee bends, and the ball is taken back with the outside (≈ 180° toward the hooking foot's side).
- **How they differ.** A cut redirects in front of the standing foot without wrapping; a hook wraps past the ball (P4); a Cruyff sends it behind the standing leg (P3).

### Chop
- **Ronaldo chop.**
  - Hop off the plant foot. In the air, the inside of the dribbling foot slices the ball "slightly backward and to the side", behind the other leg. Land and push off after it.
  - Done "at top speed", "just before the defender reaches the ball", then shield with the body.
  - Exit angle in the sources: ≈ 60° to ≥ 90°.
- **The chop vs the Cruyff [syn].** Both use the inside of the foot, behind the standing leg. The chop is made **in flight, keeping the run into a new lane**. The Cruyff is made from a **planted stance after a slow, faked approach**, with an exit of 135–180°.

### Cruyff / behind-body
- **Cruyff turn.**
  - Fake a shot, pass or cross.
  - The standing foot plants "a step past the ball" / in front of it.
  - The inside of the swinging foot taps the ball back behind the standing leg as the shoulders turn; turn ≈ 180° and accelerate.
  - Coaching: slow approach, bent knees, a big exit touch.
- **Distinctions.** Drag-back: sole contact, no fake needed. Inside hook: pulled back on the hooking-foot side. Chop: airborne, keeps momentum.

### Sole / drag (one sole-pull primitive)
- **Drag-back.** The sole on top kills the ball and pulls it straight back; turn 180° and go. Chest open. Use with the back to goal or under tight marking.
- **L-drag / L-turn.** The right sole pulls the ball back; past the standing leg, the inside of the right foot pushes it behind that leg (an "L"). The standing leg clears with a small hop; exit ≈ 90° behind the body.
- **V-pull.** The sole pulls the ball back, then the same foot pushes it out (a "V"). One plan says the push uses the outside.
- **Pull-push / stop-start.** Sole back, then the same foot forward: stop and relaunch past a defender running alongside.
- **Sole roll.** Drag the ball across with the sole, then take it on with the other foot or the same one.
- **[syn] One primitive with settings.** Drag-back, V-pull, L-turn, pull-push, the sole roll and the first phase of the roulette are one sole pull with parameters:
  - the pull vector;
  - the follow-up foot and surface;
  - the follow-up direction;
  - body rotation.

  The genuinely distinct parts are the follow-up contact and whether the body rotates.

### Lateral transfer
- **La Croqueta (Laudrup → Iniesta).**
  - The inside of one foot moves the ball **sideways** onto the inside of the other, which pushes it forward "nearly in the same motion" — a push, not a kick.
  - Draw the defender in, then accelerate. It beats a reaching leg or a two-man trap in tight space.
- **The inside-inside transfer** has the same contacts over separate strides.
- **Kroos shuffle:** the receiving version.

### Feints
- **Body feint / dummy (no contact).**
  - A quick shoulder drop about 1 m from the defender, the feint foot beside the ball; faster is better; look where you want the defender to think you'll go.
  - Biomechanics (rugby): deceptive runners **exaggerate foot displacement and head / upper-trunk yaw while minimising sideways movement of the centre of mass**. The library's body feint is built exactly so.
- **Matthews feint (Coerver drag-push), contact required.** Lean and drop the shoulder left, nudge the ball left with the inside of the right foot, hop left, take it right with the outside of the same foot: "push, hop, take".
- **The shot / pass / cross fake.** Used with cuts and the Cruyff; the preferred feint of EURO 2004 attacking midfielders.
- **Which need contact.** None: body feint, shoulder drop, stepover, scissors. Yes: Matthews, drag-push, elastico, croqueta.

### Stepover / scissors (the clearest distinction)
- **Scissors (the "outside step over").**
  - Fake an outside-foot pass.
  - The leg loops **round the front of the ball from inside to outside**, with no touch, landing ≈ 2 o'clock.
  - The **outside of the other foot** takes the ball away.
- **Stepover (the "inside step over").** Fake an inside touch. The foot passes **over the front of the ball toward the midline**, then the **outside of the same foot** pushes the ball back the other way.
- **Double scissors / double stepover:** two loops.
- **Use.**
  - Run at a defender who gives some space; slow on the approach, speed up out of it.
  - If the defender is too close, the swinging leg can foul.
  - Skilled players keep speed, use less foot lift and more forward trunk lean, then accelerate hard.

### Elastico (flip-flap)
- **Elastico.** The outside of the dominant foot pushes the ball toward the dominant side; the foot moves quickly round it and the inside pushes it the other way.
  - The foot stays in contact and the two touches "fuse into one": guided, not kicked. Pushing the first touch too far is the classic error.
  - It relies on explosive acceleration.
- **Reverse elastico.** Inside, then outside [U]. It has the Matthews contact order, done fast without the hop [syn].

### Spin / roulette
- **Marseille turn / roulette.**
  - At about 1 m from the defender, the stronger sole drags the ball back.
  - Spin 180° and plant between ball and defender, back to the defender.
  - The other sole drags the ball on to complete the 360°; accelerate.
  - Use only against a defender actually tackling.

### Heel / speed change
- **Heel chop.** Pretend to go one way, jump over the ball, strike it in another direction with the heel.
- Heel-to-heel and the heel flick are game vocabulary only [U].

### Stop / hesitation
- **Stop-start.** Stop abruptly so the defender commits, then accelerate. Sell it with the hips, shoulders and eyes; take a bigger final touch.
- **Fake stop, hesitation, deaden-and-explode** have no separate definitions [U]. They are the stop-start with or without ball contact [syn]. Timing: match the defender's speed, then accelerate suddenly.

### Protection / shielding
- **Shield.** Side-on, knees bent, wide base, the ball on the foot farthest from the defender; move the ball away from the side the defender comes round.
- **Roll-away.** A sole roll-over away from the defender.
- **Spin-off turns:** the hooks.

## 3. Biomechanics of change of direction (it shaped Phase 1 and the speed ranges)

**Angle–speed trade-off.** Approach speed falls as the cut sharpens:

| Cut | Approach speed (males) |
|---|---|
| 45° | 4.7 m/s |
| 90° | 3.8 m/s |
| 135° | 3.5 m/s |
| 180° | 3.4 m/s |

- At speed the cut actually made is shallower than intended: a planned 45° sidestep came out at 34.9 / 29.4 / 23.8 / 17.5° at 2 / 3 / 4 / 5 m/s.
- A 90° cut at maximum speed needs 3–5 steps.

**Plant-foot contact time:**

| Cut | Contact (s) |
|---|---|
| 45° | 0.16–0.24 |
| 90° | 0.25–0.35 |
| 135° | 0.39–0.50 |
| 180° | 0.42–0.52 |

**Braking before the plant.**
- The penultimate step is a preparatory braking step and dominates for cuts of 60° or more.
- For 180° turns the antepenultimate step contributes more.
- Deceleration steps grow with angle and approach: 2.7–6.4 steps for 90–180° from 4–20 m.
- The centre of mass drops 0.18–0.35 m on the plant.

**Sidestep vs crossover.** The sidestep (plant opposite to the new direction) gives a sharper cut but loses more speed; the crossover keeps speed with shorter contact.

**With the ball.** Dribbling speed fell from 5.19 to 2.13 m/s as path curvature rose; curved-dribble speed predicted 1v1 success (r = 0.70), sprint speed did not.

**Matches.** About 726 turns per match, mostly 0–90°. About 24.5 significant turns per player per match, about 70 % of them 120–180°, most entered at 3.0–5.5 m/s.

## 4. What elite players actually use

- **Euro 2021** semi-finals and final: about 25.5 dribbles per team per match, 36.6 % with feints, 69.3 % with a change of direction, 32.7 % with a quick start.
- **EURO 2004** attacking midfielders preferred the kick-fake and the dummy step.
- A 2013 study: "dribbles and disguised movements are rarely implemented".
- No study counts stepovers, Cruyffs, chops or elasticos.
- **[syn] Implication for auto vs manual.** The common layer is changes of direction and pace, surface changes within a carry, kick-fakes into cuts or Cruyffs, dummy steps and turns. **Elastico, roulette, heel moves and rainbows are rare**, so they belong in the manual / specialist layer. This is the library's AUTO / MANUAL classification.

## 5. When each move is used

- **General:** slow down before the defender; close the gap keeping your speed, match the defender, then explode.
- **By move:**

  | Move | When |
  |---|---|
  | Body feint | about 1 m, defender central |
  | Roulette | about 1 m, against an active tackler |
  | Scissors | when the defender gives space (too close: a foul) |
  | Chop | defender head-on, at speed, just before they reach the ball |
  | Cruyff | the fake, a slow approach |
  | Hooks | a defender pressing without tackling |
  | Drag-back | back to goal |
  | Croqueta | tight space, a double-up |
  | Push-and-run | space behind |
  | Shield | defender close behind / beside |

## Sources

**Coaching / technique**
- [1] T. Chao, "Technical Ball-Work: Attacking and Moving" (TeamSnap) — https://marketing-content.teamsnap.com/youth_sports_drills/TracyChao-attackingmoves.pdf
- [2] Mojo, How to Do the Ronaldo Chop — https://www.mojo.sport/coachs-corner/how-to-do-the-ronaldo-chop/
- [3] Mojo, How to Do a Scissor — https://mojo.sport/coachs-corner/how-to-do-a-scissor/
- [4] We Make Footballers, How to master a Step Over — https://wemakefootballers.com/au/news/how-to-master-a-step-over
- [5] We Make Footballers, Flip flap (elastico) — https://wemakefootballers.com/uk/news/how-to-master-an-elastico-flip-flap-skill
- [6] We Make Footballers, Roulette turn — https://www.wemakefootballers.com/news/how-to-master-the-roulette-turn/ ; Sikana — https://www.sikana.tv/en/sport/soccer-skills-the-roulette-turn
- [7] Wikipedia, Flip flap — https://en.wikipedia.org/wiki/Flip_flap_(association_football)
- [8] Wikipedia, Cruyff turn — https://en.wikipedia.org/wiki/Cruyff_turn
- [9] Wikipedia, Marseille turn — https://en.wikipedia.org/wiki/Marseille_turn
- [10] Wikipedia, Step over — https://en.wikipedia.org/wiki/Step_over
- [11] Wikipedia, Dummy (football) — https://en.wikipedia.org/wiki/Dummy_(football)
- [12] Goal.com, Best football skills — https://www.goal.com/en-my/lists/best-football-skills-how-to-do-ronaldo-chop-elastico-cruyff-turn-soccers-top-trick-moves/blt9a4896aea1e854d9
- [13] Coerver Feint to Finish (drag push / drag scissors) — https://www.sportsessionplanner.com/s/nqm9i/Coerver-Feint-to-Finish.html
- [14] R. Meulensteen NSCAA demo (spin-off hooks) — https://www.sportsessionplanner.com/s/Oyff/NSCAA-demonstration.html
- [15] The Chop session — https://www.sportsessionplanner.com/s/EGCK
- [16] Cruyff turn sessions — https://sportsessionplanner.com/s/vVKX/Turning-Cruyff-Turns.html ; https://www.sportsessionplanner.com/s/XBMab/Barcelona-Cruyff-stop-start.html
- [17] Jobs in Football, La Croqueta — https://jobsinfootball.com/blog/skills/la-croqueta/
- [18] ESPN, signature moves (Iniesta's croqueta, Kroos' shuffle) — https://www.espn.com/soccer/story/_/id/37506736/iniesta-croqueta-kroos-shuffle-modern-football-best-signature-moves
- [19] Sole roll to beat a defender — https://www.sportsessionplanner.com/s/Colib/Sole-Roll-to-beat-a-defender.html
- [20] SoccerXpert, shielding — https://www.soccerxpert.com/tips/details/soccer-shielding
- [21] Running with the ball at speed — https://www.sportsessionplanner.com/s/C7xki/Foundation-Phase---Individual-Penetration-(Running-with-the-ball-at-speed).html
- [22] England Football, moving with the ball — https://learn.englandfootball.com/articles/resources/2022/How-to-help-your-players-move-with-the-ball
- [23] Push and Run — https://www.sportsessionplanner.com/s/zgyV/Push-and-Run.html
- [24] Sikana, The feint — https://sikana.tv/en/sport/football/soccer-skills-the-feint
- [25] Chop (heel chop) — https://learnenglishthroughfootball.com/football-language-chop/
- [26] Drag Back session — https://sportsessionplanner.com/s/baeg/Drag-Back.html
- [27] L Turn, V Turn session — https://www.sportsessionplanner.com/s/FEOdb/L-Turn-V-Turn.html
- Stop-start sessions — https://www.sportsessionplanner.com/s/CGGU/Stop-start.html

**Biomechanics**
- [B1] Dos'Santos et al. 2018, the angle–velocity trade-off (Sports Med) — https://pmc.ncbi.nlm.nih.gov/articles/PMC6132493
- [B2] Falch et al. 2020 (Front Sports Act Living) — https://pmc.ncbi.nlm.nih.gov/articles/PMC7739774
- [B3] Dos'Santos et al. 2019, the penultimate foot contact — https://salford-repository.worktribe.com/output/1368035
- [B4] Dos'Santos, Thomas, Jones 2021, braking in a 180° turn — https://salford-repository.worktribe.com/output/1348620
- [B5] Dos'Santos et al. 2021, 90° cutting — https://pmc.ncbi.nlm.nih.gov/articles/PMC8363537
- [B6] Biomechanical comparison of cutting techniques (SCJ 2019) — https://lida.sport-iat.de/ta/Record/4055855
- [B7] Jab step (sidestep plant) — https://www.flikulti.com/theory/essentials/cutting/making-cuts/building-a-better-turn/types-of-cut/jab-step/
- [B8] Bloomfield et al. 2007, JSSM — https://jssm.org/jssm-06-63.xml-abst
- [B9] Griffiths et al. 2025, turn demands of an EPL team (PLOS ONE) — https://pmc.ncbi.nlm.nih.gov/articles/PMC12017906/
- [B10] Santiago et al. 2019, dribbling speed along curved paths — https://lida.sport-iat.de/dfb/Record/4054965
- [B11] Lo et al. 2019, kinematics of cutting with dribbling — https://scholar.lib.ntnu.edu.tw/en/publications/kinematics-analysis-of-cutting-with-dribbling-during-different-ap-2/
- [B12] ISBS 2017, the pivot-foot position in a dribbling cut — https://commons.nmu.edu/isbs/vol35/iss1/61
- [B13] Brault et al. 2010, deception in rugby — https://pure.qub.ac.uk/en/publications/balancing-deceit-and-disguise-how-to-successfully-fool-the-defend/
- [B14] Stepover deception perception — https://pmc.ncbi.nlm.nih.gov/articles/PMC6215843
- [B15] Univ. of Tsukuba 2026, the scissors feint — https://www.tsukuba.ac.jp/en/research-news/20260521110000.html
- [B16] Duarte et al. 2010, 1v1 interpersonal coordination — https://rdpc.uevora.pt/handle/10174/2095

**Match data**
- [F1] Chornobai et al., dribbling indicators, EURO 2021 — https://sportscience.ldufk.edu.ua/index.php/discourse/article/download/1955/1780
- [F2] 1v1 solutions in attack, EURO 2004 — https://lida.sport-iat.de/dfb/Record/4038782
- [F3] The Analyst, dribbler stats — https://theanalyst.com/articles/definitive-guide-to-dribblers-stats
- [F4] CIES, best dribblers — https://www.cies.ch/cies/news/news-detail/article/best-dribblers-hazard-ahead-of-neymar-and-messi
- [F6] Structure of technical-competitive activity in modern football — https://www.bisp-surf.de/Record/PU201306004514

**Vocabulary only**
- [V1] EA FC 26 skill moves (Insider Gaming) — https://insider-gaming.com/all-new-skill-moves-in-ea-fc-26-simplified-skills-explained/
