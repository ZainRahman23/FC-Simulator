# Touchline Core Loop v2: "Build a system, then test it"

Status: **APPROVED for full build (2026-09-30).** Resolved decisions are in §13. §6 (cards), §6.5 (visual engagement), §12 (architecture and contracts) and §14 (balance methodology) are binding for implementers.
Builds on PR #1 (`claude/coach-mvp`, based on `touchline-current`).

---

## 1. The pitch in one paragraph

You are a football coach whose real job happens between matches. You pick a **playing system**, the soccer version of a deck archetype. You build a **squad that fits it** through a budget, the transfer market and your academy. You **train** players and partnerships so that the specific combinations your system needs get better: a full-back and winger who overlap, a crosser and a header who connect, a press that works as a unit. The match is where the build gets tested. You watch it play out and make a handful of adjustments with the real levers (shape, instructions, subs). You prepare those adjustments before kick-off, the way you'd pick your hand in a card game. After the match, the game shows you which parts of your build worked and which didn't. Across a season, a coherent build beats a pile of good players, and the player can see why.

It's roster strategy like Pokémon and TFT with football rules. The match plays out on its own, as in an autobattler, and the building happens between matches, as in a deckbuilder.

## 2. Who it's for and what they want

| Player | Wants | Delivered by |
|---|---|---|
| Build-crafters (TFT, Slay the Spire, Pokémon, Super Auto Pets fans who like football) | Synergies, "my build came online", discovering combos | Systems, fit, partnerships, training points |
| FM-lite managers (FIFA Career Mode, FM Mobile) | Transfers, money, squad identity, a season arc | Economy, market, board, season "run" |
| Armchair tacticians (tactics YouTube, "they should press here") | Their tactical idea being right, and proof | Prepared in-match plans, Decision Lab, review of how the system performed |

Design pillars:
1. **Build decisions matter more than reaction speed.** The best player is the one who built best, not the one who clicked fastest.
2. **Every stat is real.** Fit scores, partnership effects and previews are computed from the same attributes the engine uses, and they are checked against simulated seasons. Nothing is decorative. This follows the project principle "individual attributes, never Overall".
3. **Commitment has a cost.** Switching system costs familiarity. Heavy training costs fitness. Money spent now isn't there in January.
4. **Every match teaches you something.** Each result says what the build did well or badly, with evidence.

## 3. The loop hierarchy

```
CAREER (multi-season meta)       reputation → budgets, job offers, club DNA
 └─ SEASON = one "run"           pre-season camp → 38 matchweeks → season review
     ├─ WINDOW (summer/January)  draft: buy / sell / loan / scout
     └─ MATCHWEEK                train → prepare → play → review
         └─ MATCH                watch the build + play prepared plans (3–6 decisions)
```

### 3.1 Season (the run)
1. **Summer window + pre-season camp** (the draft phase): 4 camp weeks with 3 friendlies. This is where most building happens.
2. **Matchweeks 1–19.** Some weeks have a midweek fixture (see §7.3), so rotation matters.
3. **January window:** a short, expensive market that lets you correct your build.
4. **Matchweeks 20–38.**
5. **Season review:** board verdict, prize money, player growth and ageing, contracts, youth intake. Reputation feeds the next season's budget.

### 3.2 Matchweek (the core 5–15 minute loop)
1. **Report.** Injuries, fitness, form and news from the last match.
2. **Train.** Spend this week's Training Points (TP). See §5.
3. **Prepare.** Pick the XI, the system variant and set-piece roles, and **write up to 3 in-match plans** (your hand for the match). See §6.1.
4. **Test (optional).** The Analyst runs your plan against this opponent across 16 futures. It is limited to 2 runs a week. See §6.4.
5. **Play.** Watch and play your plans. See §6.2.
6. **Review.** How the system performed, how partnerships performed, how the plans worked. See §6.3.

## 4. Systems: the deck archetype

### 4.1 What a system is
A system is a named bundle of things the engine already has:
- a **formation** (currently 4-3-3, 4-2-3-1 or 4-1-4-1);
- values for **all 13 team tactics** (build-up tempo, passing directness, progression risk, width, chance creation, box commitment, after winning possession, after losing possession, block height, pressing intensity, defensive width, marking, line behaviour);
- an **attacking role, defensive role and effort level for every slot** (for example LB = OVERLAP / PRESS_FULLBACK, RW = INSIDE_FORWARD / TRACK_FULLBACK, ST = TARGET / PRESS_CBS).

The engine already supports every lever here. The new part is packaging the levers into a system and scoring how well the squad fits it.

### 4.2 Launch systems (8)

| System | Shape | Identity | Key slot demands (attributes the engine uses for those actions) |
|---|---|---|---|
| **Gegenpress** | 4-3-3 | Win it back within seconds, attack a broken defence | All: stamina, acceleration, aggression; CMs: standing tackle, interceptions; front three: sprint speed, reactions |
| **Positional Play** | 4-3-3 | Patient short passing, pin the defence with wide players | CMs/CBs: short passing, ball control, vision, composure; wingers: dribbling, crossing |
| **Wing Overload** | 4-2-3-1 | Overlapping full-backs and crosses into a big striker | FBs: stamina, crossing, sprint speed; ST: height, heading, jumping, strength; CAM: vision |
| **Target Man** | 4-4-1-1 variant of 4-1-4-1 | Long balls to a target man, second balls, set pieces | ST: height, strength, heading; CMs: long passing, aggression; CDM: interceptions |
| **Counter Strike** | 4-1-4-1 | Deep block, break fast into space | CBs: defensive awareness, heading; wingers/ST: sprint speed, acceleration, finishing; CDM: interceptions |
| **Low Block** | 4-1-4-1 | Stay compact, defend the box, nick one | CBs: heading, strength, standing tackle; CDM: interceptions, positioning; GK: reflexes, handling |
| **Inside Forwards** | 4-3-3 | Wingers cut inside to shoot, full-backs give width | Wingers: dribbling, finishing, long shots, opposite foot to their side; FBs: crossing, stamina |
| **Total Football** | 4-2-3-1 | Roaming, rotation, everyone joins attacks | All: stamina, vision, ball control; high "versatility" (see §4.4) |

Players can also build a **custom system** by editing any bundle. Custom systems start with lower familiarity (§5.3) and have no named bonuses.

### 4.3 System Fit (the synergy readout)
Every slot in a system has a **demand vector**: weights over the attributes the engine reads for that slot's role. For example INSIDE_FORWARD weights dribbling 0.25, finishing 0.2, long shots 0.15, acceleration 0.15, ball control 0.15, and gives a weak-foot bonus when the player's natural side is opposite the flank.

- **Slot fit** (0–100) = the player's attributes projected onto that demand vector, adjusted for fatigue. It shows as a coloured ring on the card, like TFT trait pips.
- **System fit** (0–100) = the average of the slot fits, plus the **unit bonuses** below.
- **Unit bonuses**, shown as trait counters like TFT's "3/5 Pressers":
  - **Engine Room**: 3 midfielders with stamina 80 or more.
  - **Aerial Threat**: 2 or more targets with heading 78 or more and height 188 cm or more, plus a crosser with crossing 80 or more.
  - **Pace in Behind**: 2 or more forwards with sprint speed 88 or more.
  - **Wall**: a CB pair that both have defensive awareness 80 or more and a partnership level (§5.2) of 2 or more.

These bonuses are readouts, not magic. The engine never sees "Engine Room". A squad that earns it really does press better, because the stamina is real. The bonus thresholds are tuned so that each active bonus corresponds to a measurable effect in the season harness (§9). A bonus that can't be shown to matter gets cut.

Honesty rule: **every number the player sees has to predict results.** Acceptance test: over 3 simulated seasons, System Fit correlates with points after controlling for average attributes. Target: a fit gap of about 15 points is worth about 8–12 league points per season.

### 4.4 Player identity
Each player card shows:
- **Best systems.** The top 3 systems for this player, with slot fit.
- **Traits.** Derived tags such as "Presser", "Aerial", "Creator", "Engine", "Poacher", "Ball-carrier" and "Set-piece specialist", each with a clear attribute threshold. These are the "types", as in Pokémon.
- **Versatility.** The number of slots where the player's fit is 70 or more.
- **Growth**: potential, age curve, and which attributes he is still able to improve.

## 5. Training: the upgrade layer

### 5.1 Training Points (TP)
- **Pre-season camp:** 40 TP over 4 weeks, which is when you do most of your building.
- **In season:** 6 TP a week, or 3 in weeks with a midweek fixture.
- **Unspent TP carries over,** up to a cap of 10.
- **Staff upgrades:** buying better coaches (§7.2) adds +1 or +2 TP a week.

Each week you spend TP across three tracks. Where a player wasn't trained this week and needs a rest, a separate **Rest** toggle gives him extra recovery instead.

### 5.2 Track A: individual development
- **Cost:** 1 TP = one focused drill on one attribute for one player.
- **Gain:**
  - base +0.6 to that attribute;
  - multiplied by an age factor (≤21: 1.5, 22–27: 1.0, 28–31: 0.6, 32 and over: 0.3);
  - multiplied by potential headroom, `(pot − current)/10`, clamped to between 0.2 and 1.5;
  - with diminishing returns within the season.
- **Caps:** at most +4 per attribute per season from training. Minutes played give extra growth on top (as now).
- **Load:** each drill adds 3 load. Load above 12 in a week gives −5% starting energy and a small injury-risk increase. This is the push-pull.
- **What it does:** it changes the player's **real attributes**, which is the input the engine reads. Engine code is unchanged.

### 5.3 Track B: partnerships (the combo layer)
A partnership is a **named pair (or trio) plus a pattern**:

| Pattern | Members | Boost while both start (per familiarity level 1/2/3) |
|---|---|---|
| **Cross & Head** | crosser + target | crosser: crossing +2/+4/+6; target: heading accuracy +2/+4/+6 and positioning +1/+2/+3 |
| **Overlap** | FB + winger (same flank) | FB: crossing +1/+2/+3 and stamina +1/+2/+3; winger: vision +1/+2/+3 |
| **One-Two** | CM/CAM + ST | short passing +2/+3/+5 and reactions +1/+2/+3 for both |
| **Through Ball** | creator + runner | creator: vision +2/+4/+6; runner: positioning +2/+3/+5 |
| **CB Partnership** | CB + CB | defensive awareness +2/+3/+5 and interceptions +1/+2/+3 for both |
| **Pressing Trio** | 3 front/mid players | aggression +1/+2/+3, reactions +1/+2/+3 and stamina +1/+2/+3 for all three |
| **Keeper–Back line** | GK + both CBs | GK: positioning +1/+2/+3; CBs: composure +1/+2/+3 |

- **Familiarity:** 0 to 100 points. Level 1 at 30, level 2 at 60, level 3 at 90.
  - Gained from drills: 1 TP gives +10.
  - Also +2 per match both players start together, which rewards a settled team.
  - Decays by 3 a week if the pair doesn't play together.
- **Slots:** at most 4 active partnerships, rising to 6 with staff upgrades. This forces choices, like a deck-size limit.
- **How it applies:** at kick-off the manager layer adds the boosts to the attributes of the players involved, for that match, and only if all members start. This uses inputs only, with no engine change.
  - **v1 limit:** if a member is subbed off, the others keep the boost for the rest of that match. This is disclosed in the UI.
  - Making the boost end on a sub needs an engine hook (§10). Phase 2.
- **Transfers** create no partnerships, so a new signing starts at familiarity 0. Loyalty is worth something.

### 5.4 Track C: system familiarity and set pieces
- **System familiarity** runs from 0 to 100 for each system.
  - Your chosen system gains +8 a week, +3 per TP spent on it, and +3 per match played in it.
  - A switch drops the new system to 40, or 20 for a custom system.
  - **Effect:** it adds to how well players read the game in that system: reactions, positioning and composure +0 to +4, scaled from familiarity 40 up to 100. This is applied at kick-off (an input).
  - Switching mid-season is allowed but costs you for 3–4 weeks. That's the commitment cost.
- **Set-piece routines (v1, input-only):** you pick the corner taker, free-kick taker and penalty taker, and 1 TP drills the taker's crossing, free-kick accuracy or penalties. The engine currently picks takers automatically: best crosser, best free-kick accuracy, best penalties.
  - **v1:** choose who takes them. This needs a small engine hook (§10).
  - **Phase 2:** designed routines such as near post, far post, short corner, or a designated target runner. These need an engine hook.

## 6. Match day

### 6.1 Preparation: build your hand
1. **XI and bench.** Drag to pick. Fit rings and trait counters update live.
2. **Starting system and opposition tweaks.** Scouting suggests them, and you can accept or ignore each one.
3. **Hand: pick 5 Tactic Cards from your deck** (§6.6). The Analyst's preview for this opponent is on every card.
4. **Set-piece takers and routines** (engine hooks E1/E4).
5. **Analyst test (optional).** Uses 1 of the week's runs.

### 6.2 Live match: watching is the core
- You watch in Broadcast (default) or Tactical view. The match is paced like a broadcast: slower near the boxes, faster in midfield (the existing interest pacing). Presentation is covered in §6.5.
- **Hand bar.** Your 5 cards sit under the pitch at all times. **You can play a card live, without pausing.** It applies at the second on screen, using the existing deterministic rewind to that second. This keeps the pseudo-real-time feel.
- **Influence (the energy stat):** you start with 3 ⚡, gain +1 at half-time, +1 when you concede (the comeback valve), and can hold at most 5. Cards cost 0–3 ⚡.
- **Moments** still pause the match: goals, red cards, fatigue alerts, their shape change, and the 60'/75' check-ins. The prompt says what changed and **highlights the 1–2 cards in your hand that answer it**, each with its preview for the current game state. You can also choose Manual (the full tactics and subs panel) or Stay the course.
- **Substitutions:** 5, in 3 windows (real rules). They cost no ⚡, but many cards include a substitution as part of their effect.
- The **"since your change" tracker** stays, now per card.
- **The AI coach plays cards too:** each CPU club has a system deck and a simple policy (§6.6.5). Its plays show in the feed as they happen ("Everton play PARK THE BUS · 5-4-1"). This gives the player something to react to.

### 6.3 Review: did the build work?
The Review is reorganised around the build:
- **System report.** For each pillar of the system, it shows whether it worked. Each pillar's metric comes from the event ledger:
  - Gegenpress: ball recoveries within 5 s of a loss, and field tilt;
  - Wing Overload: crosses, headed shots, full-back final-third entries;
  - Counter Strike: fast-break shots.

  Each one is graded against the benchmark for that system.
- **Partnership report.** For each active partnership: events where both members were involved (e.g. Cross & Head: crosses from A to B, headers, goals) and whether it went for or against you. Players see their combos pay off.
- **Plan report.** Each plan you played, with its effect so far and the Decision Lab verdict (reused).
- **Player grades** tied to their slot demands: "Robertson: overlap role, 6 final-third entries, fit 81".
- **Next steps.** Concrete build suggestions, e.g. "Your press lost 40% of duels in midfield. An Engine Room trait is 1 player away (Jones needs stamina 80, currently 76, with 2 TP)."

### 6.4 The Analyst (the Decision Lab, aimed at the build)
- **Before the match:** "Test my plan against Everton". It plays 16 seeded futures of the whole match with your XI and plan, and reports expected points, win/draw/loss, and system pillar metrics. You can compare two variants. **2 runs a week.** Scarcity keeps it a decision rather than autopilot, and it keeps server load bounded.
- **After the match:** the existing paired counterfactuals for each plan played (unchanged).
- **Before the season:** "Stress-test my system". 3 simulated matchweeks against a typical mid-table side, costing 1 camp week's runs.

### 6.5 Visual engagement: the "Pokémon" layer
Watching the match is a core pillar, not a loading screen. Everything here is presentation only: it never changes the football.
1. **Goals you can see.** Broadcast shows AnimR2's choreography: the ball flies into the net, the net ripples (`netImpact`), and the scorer celebrates. The goal banner only appears **after** the ball goes in. After that come a short beat, walk-backs, and a visible kick-off. The pitch never goes blank during pauses; the last frame stays up. (Base: `wip/playtest-fixes` broadcast work.)
2. **Card play animation.** The played card flies from the hand bar onto the pitch, and the affected players glow. Role changes show as short arrows (e.g. Robertson's overlap run). A shape change shows the new shape as a ghosted outline for 3 s, then players move into it.
3. **Combo pops.** When a partnership pattern fires, a callout names it and the players involved (e.g. "COMBO · Cross & Head · Robertson → Ekitike"), and the play slows around it. Detection is read-only, from the event ledger.
4. **Trait activation at kick-off.** A banner lists the traits that are active ("ENGINE ROOM 3/3 · AERIAL THREAT 2/3"), in the style of TFT's trait bar.
5. **Player moments.** A goal, big save or tackle gives the player a brief card-flip "form up" pop (rating change). A fatigued player's label turns orange, then red.
6. **Momentum strip.** The existing momentum chart, with card plays marked on the timeline as icons.
7. **Training level-ups.** Attribute bars fill with an animated tick, and a partnership reaching a new level gets a "LEVEL 2" card flourish.
8. **Performance budget:** 60 fps at 1× on a laptop. Effects auto-reduce at 4× and above.

### 6.6 Tactic Cards (replaces generic "plans")
Cards follow Slay the Spire's anatomy: **every card states its exact interactions**, and the player can go as deep as they like. The face shows a headline and keywords. The body lists the concrete engine changes. The "numbers" drawer shows Analyst previews and variance.

#### 6.6.1 Card anatomy
```
┌ OVERLAP DRIVE ─────────────── ⚡1 ┐   type: PLAYER ORDER · COMBO(Overlap)
│ Robertson bombs on; Gakpo tucks in.│   duration: 15'   keywords: Fatigue 6
│ • Robertson: attack role OVERLAP,  │
│   attack effort 85                 │
│ • Gakpo: attack role INSIDE_FORWARD│
│ • Team: attacking width WIDE       │
│ • Lv2+: Robertson crossing +2      │
│ Preview v EVE (this state):        │
│   xG for +0.07 /15'  against +0.03 │
│   ±0.04 (16 futures)               │
└────────────────────────────────────┘
```
Fields:
- **name**, **cost** (0–3 ⚡) and **type**, one of:
  - SHAPE (formation change),
  - INSTRUCTION (team tactics),
  - PLAYER ORDER (roles and effort),
  - SET PIECE (E1/E4),
  - SUB (a substitution plus a role change),
  - REACTION (only playable after a trigger),
  - STANCE (lasts until another stance is played).
- **effects:** a list of engine commands. Every command uses the existing appliers (`tactics`, `instructions`, `formation`, `substitution`) or the new hooks: `modifiers` (E2 timed attribute deltas), `set_pieces` (E1/E4) and the new formations (E3).
- **duration:** permanent, or N minutes. Timed effects revert through **scheduled commands** (E2), which are part of the deterministic command log, so rewinds replay them exactly.
- **keywords:**
  - **Fatigue N:** the affected players lose N energy.
  - **Exhaust:** once per match.
  - **Combo(pattern):** needs that partnership in the XI; stronger at Lv2/Lv3.
  - **Trigger(x):** a REACTION card, playable only after x (conceded, opponent red card, 70'+ and level, and so on).
  - **Upgrade:** training improves the card (§6.6.3).
  - **Target(player):** you choose one of your players, or one opponent player the scouting report flagged.
- **Preview:** from the Analyst effect table (§14.2), for the current score, minute and opponent. It shows the mean ± standard error. Clicking opens the full distribution.

#### 6.6.2 Where cards come from (the deck)
- **System cards:** each of the 8 systems grants 4 signature cards while it's your chosen system.
  - Gegenpress: BLITZ, COUNTERPRESS TRAP, HIGH LINE, FRESH PRESS.
  - Low Block: PARK THE BUS (5-4-1, E3), BOX DEFENCE, OUTLET BALL, SIT IN.
- **Partnership cards:** a partnership at Lv2 unlocks its Combo card (OVERLAP DRIVE, CROSS & HEAD BARRAGE, ONE-TWO RUSH, THROUGH-BALL THREAT, WALL, PRESS TRIGGER).
- **Universal cards** (start in every deck): FRESH LEGS (a sub plus effort reset), SEE IT OUT, ALL-OUT ATTACK, TACTICAL FOUL (aggression up, card risk up), TIME WASTE (tempo PATIENT, directness SHORT, Fatigue −3 for all).
- **Set-piece cards** from drilling routines: NEAR-POST FLICK, SHORT CORNER, BIG MAN UP (E4).
- **Training and staff unlocks:** Analysts Lv2 unlocks READ THE GAME (reveals the AI's next card), Fitness Lv2 unlocks SECOND WIND (+8 energy to 3 players, Exhaust).
- **Deck limits:** 10–18 cards. Your hand is **5 chosen per match**, so deck-building happens between matches and hand-picking happens per match.
- **Launch content:** about 45 cards (8 systems × 4, 6 combos, 5 universal, 3 set-piece, a few unlocks). Each has an ID, JSON data and effect tests.

#### 6.6.3 Upgrading cards
Spending 2 TP on a card upgrades it once (Card+, as in Slay the Spire). An upgrade either cuts the cost by 1, adds duration, or adds one effect line. It's defined per card, and at most one upgrade per card.

#### 6.6.4 Card balance rules (enforced in §14)
- **Value per ⚡:** mean |ΔxG difference over 15'| per ⚡ must stay inside a band (target 0.05–0.09 per ⚡). No card may be strictly dominant, i.e. better than another card of the same cost in every context.
- **Every card has a context where it is bad** (a real trade-off). The effect table has to show a negative expected-points effect somewhere; otherwise the card needs a drawback.
- **Variance is surfaced:** high-variance cards (ALL-OUT ATTACK) show wide bands, which is information in itself.

#### 6.6.5 AI coach card policy
- The CPU draws a hand from its system deck.
- **When it plays:**
  - when behind at 60'+ (chase cards);
  - when ahead at 75'+ (protect cards);
  - when its energy is low (sub cards);
  - otherwise, 30% of the time at each 15' checkpoint.
- The choice is seeded and deterministic: the best card by effect table for the current state, mixed with the club's identity.
- **Difficulty** comes from how often it plays the best card: easy 50%, normal 75%, hard 95%.

## 7. Economy and roster

### 7.1 Money
- **Income:**
  - TV money: a flat share plus a merit payment by final position.
  - Gate receipts from home matches, scaled by club size and form.
  - Prize money for finishing places.
  - Player sales.
- **Costs:** wages (weekly), transfer fees (paid up front, or in 2 instalments), and staff upgrades.
- **Board limits:** a wage-to-revenue ratio above 80% triggers a warning; above 90% the board freezes signings. There's a budget per window, and a board objective per season.
- **Push-pull:** one superstar versus three players who fit the system; spend now versus keep cash for January.

### 7.2 Staff (meta upgrades, bought with money)
| Staff | Levels | Effect |
|---|---|---|
| Coaches | 1–3 | +1 TP/week per level (after level 1) |
| Fitness | 1–3 | Faster recovery, less injury risk from training load |
| Analysts | 1–3 | +1 Analyst run/week per level, and more detail in scouting reports |
| Scouts | 1–3 | Reveals more of a target's attributes before you buy (see below) |
| Academy | 1–3 | Better youth intake at season end |

Staff levels are how a club improves across seasons.

### 7.3 Squad pressure
- **Midweek fixtures:** 8 extra weeks with 2 matches, all in the league schedule's congested periods (December, and the run-in). There are no new competitions in v1; these weeks simply play 2 league matchweeks back-to-back. Rotation and depth then matter, and so do bench players' partnerships.
- **Fatigue:** kept close to the current values, but checked against real rotation. Starting 2 matches in 4 days should cost about 10–15% starting energy.

### 7.4 Transfer market
- Every listed player shows **traits**, **best-system fit for your chosen system**, age, potential, fee and wage. Your fit number is the headline: "Semenyo: Inside Forward fit 84 → fills your 3rd Pace in Behind".
- **Scouting fog:**
  - without Scouts, attributes show as ranges (±6);
  - scouting a player costs a small fee and 1 week, then shows exact values.
- **Negotiation:** the existing bid, rejection, counter and accept flow. Add loans in and out, and sell-on clauses in Phase 2.
- **Signings join the squad immediately,** shown with the "new, familiarity 0" marker.

## 8. What happens to the current build

| Current | In v2 |
|---|---|
| Squad screen and cards | Kept, plus fit rings, trait counters and a system picker |
| Philosophy presets | Become the 8 systems (with every role set per slot) |
| Match prep (scouting, suggested plan) | Kept, plus plan-writing (your hand) and Analyst test |
| One-click moment answers | **Replaced** by your prepared plans, plus Manual and Stay the course |
| Broadcast and Tactical views | Kept as they are |
| Assistant panel | Kept. It now also watches the system pillars ("your press is losing midfield duels"). |
| Review and Decision Lab | Kept and reorganised around the build (§6.3–6.4) |
| Transfers and finances | Kept, plus fit headline, scouting fog, staff and a fuller economy |
| Daily Challenge | Becomes **Ghost League**: your saved build (squad + system + plans) plays other players' saved builds. Asynchronous, one ranked submission a day, server-dated. This fixes Theo's exploit report at the same time. |
| Unfinished fix work in the git stash | Reapplied where it still fits: broadcast goal choreography, career integrity, balance harness |

## 9. Balance targets and the harness

The season harness (`tools/season_sim.py`, from the stash) becomes the balance gate. It runs 380-match seasons with the full manager layer: training, partnerships, familiarity and fit. Any change to the numbers must pass these targets:

- **League realism:**
  - draws 22–28%; goals per game 2.5–3.0; home win rate 42–48%;
  - champion 85–95 points, relegation line 30–38;
  - a top scorer takes 45% or less of his team's goals; top scorer tally 20–30 a season.
- **The build matters, but doesn't decide everything.** At equal average attributes:
  - a fit-90 squad against a fit-60 squad in the same system: about +8 to +12 points a season;
  - 4 level-3 partnerships against none: about +4 to +7 points;
  - full system familiarity against a switch at matchweek 1: about +2 to +4 points.
  - **A squad with much better players should still usually beat a well-built weaker one.** Underdogs can win (project principle 4), but talent isn't overridden.
- **Training economy:** a single season of TP can't turn a 70 into an 80. The realistic ceiling is +4 in each of 2–3 attributes for a young player.
- **Blowout cap:** fewer than 3% of matches decided by 5 goals or more.

Every UI number (fit, bonuses, plan previews) gets a **calibration test**: its prediction versus the harness outcome, and the test fails if it doesn't predict.

## 10. Engine boundary (needs Zain's sign-off)

Almost everything above is **input-only**. It changes the attributes, tactics, roles and lineups that the manager layer sends to an engine that stays unchanged. Four items would need small engine hooks. Each would be behind a flag, and with the flag off the engine would produce exactly the same results as now (project principle 7).

| # | Hook | Why | Size |
|---|---|---|---|
| E1 | **Designated set-piece takers** (corner, FK, penalty) read from team config, falling back to today's automatic choice | "You choose the taker" (§5.4) | Small: 3 selection sites in `engine.py` |
| E2 | **Match-scoped attribute modifiers that end when a member leaves the pitch** | Partnership boosts end on a sub (§5.3 v1 limit) | Small–medium |
| E3 | **A 3-at-the-back formation** (3-4-3 or 5-2-3) plus remaps | "Switch to a back five to protect the lead" is the most-requested plan. Today only back-four shapes exist. | Medium: anchors, remaps, and calibration against the reference fixtures |
| E4 | **Corner routine hints** (target zone: near/far/short; designated target) | Designed set-piece routines (Phase 2) | Medium |

Without any hooks, v2 still ships. You'd lose chosen takers (the automatic choice stays), boosts ending on a sub (disclosed), and back-five plans (plans use the 3 existing shapes).

## 11. Screens (new or changed)

1. **System Board** (new, the main building screen): system picker, pitch with fit rings, trait counters, partnership slots, familiarity meter.
2. **Training Week** (new): TP wallet; per-player drill picker with gain previews; partnership drills; load meter; rest toggles.
3. **Plan Builder** (new, in Match Prep): 3 plan cards from templates, editable, each with an Analyst preview.
4. **Match Prep:** adds plan builder, set-piece takers and the Analyst test.
5. **Live Match:** moment prompts offer plan cards, Manual, and Stay the course.
6. **Review:** system report, partnership report, plan report, next steps.
7. **Market:** fit headline, traits, scouting fog, compare with your current starter.
8. **Club (Finances and Staff):** income and costs, staff upgrades, board limits.
9. **Season Review** (new): board verdict, growth, contracts, youth intake, reputation.
10. **Ghost League** (replaces Daily).

## 12. Architecture, contracts and ownership (binding)

### 12.1 Source of truth
- **All build maths lives in Python, in the new module `build.py`.** That covers fit, traits, unit bonuses, training gains, partnership and familiarity progression, kick-off modifiers, the card catalogue and card compilation, previews, and the AI card policy.
  - Its functions are pure and deterministic, with no hidden RNG; any randomness is keyed from the save seed.
  - Being pure Python means the balance harness (§14) and the server run exactly the same code.
- **The career save stays in the browser** (localStorage, as today), extended with a `build` block (§12.3).
  - The server has no per-user state, except Ghost League entries and the Analyst run counter, which is keyed by anonymous player id.
- **The card catalogue** lives in `data/cards.json` (versioned) and **systems** in `data/systems.json`. Both are loaded by `build.py` and served to the UI.

### 12.2 Server API (new; all JSON)
| Endpoint | Input | Output |
|---|---|---|
| `GET /api/build/catalog` | none | `{systems, cards, patterns, traits, version}` |
| `POST /api/build/evaluate` | `{squad, xi, bench, system_id, build}` | `{slot_fit{slot:0-100}, system_fit, traits[{id,count,need,active}], bonuses, player_traits{pid:[...]}, best_systems{pid:[...]}}` |
| `POST /api/build/train` | `{squad, build, plan:[{kind:'attr'\|'pair'\|'system'\|'card', ...,tp}]}` | `{build', squad_deltas{pid:{attr:+x}}, load{pid}, log[]}` (deterministic) |
| `POST /api/build/week_tick` | `{squad, build, lineups_played[]}` | `{build'}` (familiarity gain/decay, load recovery) |
| `POST /api/build/preview` | `{match_id?, state?, card_id, side}` | `{dxg_for, dxg_against, dpts, se, n, context}` (effect table lookup; falls back to live paired sims when `match_id` is given and the Analyst budget allows) |
| `POST /api/analyst/test` | `{start_request, build, hand[], player_id}` | 16-future summary (uses weekly budget) |
| `POST /api/matches/start` (extended) | existing request, plus `build:{system_id, partnerships, familiarity, set_pieces, hand[]}` | server applies `build.kickoff_modifiers()`, then starts the match; response adds `active_traits`, `hand` (compiled cards) |
| `POST /api/matches/{id}/card` | `{card_id, at_clock, targets?}` | validates ⚡, trigger, Exhaust; compiles to commands (+ scheduled reverts); applies via the existing command/rewind path; returns `{applied, commands, influence}` |
| `POST /api/matches/batch` (extended) | CPU requests may carry `build`, and CPU policy plays cards | as now |
| `GET/POST /api/ghost/*` | build snapshot, player id | server-dated day, one ranked run a day, leaderboard |

**The command log carries card plays** as a `{kind:'card', card_id, at_clock, ...}` command. It compiles to primitive commands at apply time, with the compile deterministic in (card version, state). Rewinds, seeks, branches and the Decision Lab replay card plays exactly.

### 12.3 Save schema (browser)
```
build: {
  version: 1,
  system_id, custom_system?,
  familiarity: {system_id: 0-100},
  tp: {wallet, carried},
  partnerships: [{id, pattern, members:[pid...], fam:0-100}],   // max 4 (6 with staff)
  deck: [card_id...], upgrades: {card_id: 1},
  set_pieces: {corner, free_kick, penalty, routine?},
  load: {pid: n}, trained_this_season: {pid: {attr: +x}},
  staff: {coach, fitness, analyst, scout, academy},
  analyst_runs_left, influence_rules_version
}
```
The migration from the current save is automatic: default system from the current preset, starter deck, no partnerships.

### 12.4 Engine hooks (clearly labelled "ENGINE CHANGE" in the PR)
Each hook is behind a flag in `simulator/fc_simulator/worldflags.py` or the engine config. Each must pass a **flags-off identity test**: the reference fixtures produce the same ledger digest as before.
- **E1 `set_piece_takers`:** team config `{corner, free_kick, penalty}` player ids. If the chosen player isn't on the pitch, the automatic choice is used.
- **E2 `modifiers` applier plus scheduled commands:**
  - `{kind:'modifiers', team, deltas:{pid:{attr:+x}}, until_clock?}`.
  - Scheduled commands live in the session's command log and apply when the clock passes them, so rewinds are deterministic.
  - Modifiers are removed when the player leaves the pitch.
- **E3 formations:** at least `3-4-3`, `5-3-2` (5-2-1-2 variant allowed) and `4-4-2`.
  - Anchors plus remaps from and to every existing shape.
  - Calibration: the reference suite must not drift more than the documented tolerance, reported rather than tuned (project principle).
- **E4 `corner_routine`:** `{zone:'near'|'far'|'short'|'auto', target_pid?}`. It changes the landing point and target selection in `_execute_corner`, with default `auto`.

### 12.5 Ownership (parallel agents)
| Agent | Owns | Delivers |
|---|---|---|
| **engine** | `simulator/**`, `management.py` (appliers), engine tests | E1–E4, flags-off identity tests, calibration report |
| **build-core** | `build.py`, `data/cards.json`, `data/systems.json`, `server.py` build/analyst/card/ghost endpoints, `labsim.py` additions, `tests_build.py` | §4, §5, §6.6 logic, AI policy, API §12.2 |
| **balance** | `tools/balance/**`, `tools/season_sim.py`; may propose number changes to `data/*.json` and `build.py` constants **through build-core**, not direct edits | §14 harness, effect table, reports, tuning passes, economy simulation |
| **ui-build** | `web/coach-build.js`/`.css` (new), `web/coach-career.js` screens (System Board, Training, Market fit, Club/Staff, Season Review, calendar with double weeks, economy), `tests_ui/test_build_ui.py` | §7, §11 screens 1, 2, 7, 8, 9 |
| **ui-match** | `web/coach-match.js`/`.css`, `sandbox/visual/embed.js` (+ minimal `match.js`), AnimR2 presentation bits in `web/touchline.html`, `tests_ui/test_match_ui.py`, `tests_ui/test_broadcast_ui.py` | §6.1–6.5 UI, hand bar, card animation, combo pops, goal choreography (start from `wip/playtest-fixes`), Review, Analyst UI, Ghost League UI |

The `wip/playtest-fixes` branch (a local reference commit, `6c17ed8`) holds unfinished fixes. Each owner ports the relevant parts: career integrity to ui-build, broadcast to ui-match, the harness to balance, review/lab coherence to ui-match and build-core.

### 12.6 Definition of done
- The existing suites are green: backend 49, UI 24, with updates only where the behaviour intentionally changed.
- New tests: build maths, determinism (same save gives an identical season), cards compile and apply (including rewind replay), engine flags-off identity, UI flows.
- The balance gates in §9 and §14 pass, and `tools/balance/report.md` is generated.
- README: a screenshot walkthrough of the new loop. The PR description lists every engine change under **ENGINE CHANGES**.

## 13. Decisions (resolved)
1. **Scope:** build everything in §3–§8 now. Balance comes from statistical modelling and simulation (§14), not playtesting alone.
2. **Engine hooks E1–E4 are approved.** Each goes behind a flag with flags-off identity tests, and each is **clearly labelled in the PR** as an engine change.
3. **Career first.** A separate "Run mode" isn't built now; the season structure makes it cheap later.
4. **Ghost League replaces the Daily Challenge,** server-dated, with one ranked submission a day per player id.
5. **Double-match weeks:** yes, 8 of them, league-only.
6. **The live match stays a core pillar** (§6.5). Cards can be played live.
7. **Plans become Tactic Cards** with exact, specific interactions and adjustable depth (§6.6).

## 14. Balance methodology (statistical modelling, not vibes)
All of these run headless in Python, through the real engine via `labsim`, with fixed seeds. That makes every number reproducible. Tools live in `tools/balance/`.

### 14.1 Simulation primitives
- `sim_season(save, seeds)`: 380 matches, with CPU cards played by policy.
- `paired_effect(state, command_set, n)`: common-random-number counterfactual from any match state. This is the same technique as the Decision Lab: the same reseed list with and without the change, giving mean and SE of ΔxG for/against, Δgoals and Δexpected points.
- `state_library`: about 400 representative match states, sampled from simulated matches. They are stratified by minute (15/30/45/60/75), score difference (−2..+2), strength gap, and system pair.

### 14.2 Card effect table
- **Method:** for every card × state in the library, compute `paired_effect` with n=16. That gives about 45 × 400 × 32 half-matches. It can be batched with workers and cached by (card version, engine version).
- **Fit:** a small, interpretable regression per card, ΔxG ~ minute + score difference + strength gap + system pair.
- **Uses:**
  - UI previews: prediction ± SE for the live state;
  - balance reports: value per ⚡, dominance and contexts, variance;
  - the AI policy.
- **Gates:** §6.6.4 bands. A card outside them gets its cost or effects retuned, never the engine.

### 14.3 Build-value curves
Controlled experiments over seasons, measured in points gained, with 95% confidence intervals:
- fit gap (same average attributes, different fit);
- each unit bonus;
- partnerships at levels 0–3;
- system familiarity 40–100;
- training plans (a youth-focused plan against a first-XI plan).

Targets are in §9. Traits or bonuses whose effect can't be distinguished from zero get cut or retuned.

### 14.4 Matchup matrix
Round-robin simulations of system vs system at equal squad quality, for home and away. The goal is **no dominant system**: every system's expected points against the field must fall within ±0.15 per match of the mean. Some rock-paper-scissors is welcome, e.g. Counter Strike beating Gegenpress. The resulting matrix feeds scouting ("Their Gegenpress struggles against a Counter Strike").

### 14.5 Economy simulation
Monte Carlo over 5-season careers with scripted strategies: "buy stars", "develop youth", "fit-first", and "do nothing". Checks:
- no strategy runs away (e.g. infinite money from sell-on loops);
- the board's wage and budget limits bind sometimes;
- every strategy can reach the board objective in at least 30% of runs for the right club size.

### 14.6 Variance and "feel" metrics
From simulated seasons:
- how many decisions each match offers (moments per match, target 3–6);
- the share of matches whose result changes when the best card is played at the best moment. This measures agency; target 12–20%. If lower, cards feel pointless; if higher, the match is too swingy.
- comeback frequency;
- matches with no shot in 20+ minutes (flagged as "dead").

These numbers are reported on a balance dashboard (`tools/balance/report.md`, generated).


