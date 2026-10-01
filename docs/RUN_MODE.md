# The Run — the main mode (v3 loop)

## Why this exists

The v2 build added systems, traits, partnerships, Tactic Cards and an economy, but kept Football Manager's shape around them: eleven tabs, a 38-week season, and attribute steppers. The genre we are borrowing from (Slay the Spire, TFT, Super Auto Pets, Pokémon) gets its pull from a different shape:

| What the genre player comes for | Season mode before | The Run |
|---|---|---|
| **Choosing from limited offers** | Everything available at once; 29 attribute steppers | After every match: pick **1 of 3** rewards |
| **Seeing the build do its thing** | Traits as stat lines after the match | Trait and partnership moments called out on the pitch, with the play slowed around them |
| **Cards that belong to your build** | Mostly generic plans ("everything forward") | Partnership cards that name your players; trait cards that only work while the trait is on the pitch |
| **Stakes and a short run** | 38 matches; one result barely matters | 7 fixtures that get harder, 3 strikes, a final |
| **A clear next step** | The player has to know which tab to open | One sequence, one primary button per step |

Season mode is still there as the long game.

## The loop

1. **Choose a system.** Pick 1 of 3 offered (from the 8). Each shows what it asks for, its starting cards and its fit with your squad. You keep it for the whole run. The starting deck is 6 cards: 2 of the system's signature cards plus All-Out Attack, See It Out, Fresh Legs and Hit Back.
2. **Pick the next opponent.** Each round offers a **standard** fixture and an **elite** one. The elite one is a club from the next tier up, with a visible threat (*In form: their striker +6 Finishing, +6 Composure*) and a harder CPU coach, but a win there pays a **rare** reward. The final has a single boss: the strongest club, with *Cup final experience: every starter +3 Reactions, +3 Composure*.
3. **Set the XI and hand.** The board shows each player's fit for his job, active traits, partnerships and sharpened players. Pick 5 cards from the deck. The default hand prefers build cards that can fire with this XI.
4. **Play the match.** It runs at **Highlights (8×)** by default. The existing interest-based pacing slows down for chances, and the play also slows around trait and partnership moments. The match stops at **decision beats** (30', 60', 80'), at half-time, after goals and after red cards. At each stop you see the last 15 minutes and the cards in your hand that answer the situation. Influence works as before: 3 at kick-off (+1 per Assistant reward), +1 at half-time, +1 after conceding, capped at 5.
5. **Result.** A win gives 3 reward offers, a draw 2 and a loss 1. A loss costs a strike. In the final, a draw also costs a strike and the final is **replayed** (like the old FA Cup replays) until you win it or run out of strikes. Walking out of a match counts as a 3–0 defeat. The result screen lists what your build did: combos, trait moments, cards played and scorers.
6. **Reward: pick 1 of 3.**
   - **New card.** A system signature card, a universal card, or a trait card (weighted towards traits that are active or one player short).
   - **Partnership.** A pattern drilled to Lv2 (Lv3 if rare) with the best-suited XI players. It adds the combo card, which names those players.
   - **Sharpen a player.** +3 (rare +5) to the two attributes his job demands most, for a player in a weaker slot. Kick-off modifier, capped at +10.
   - **Signing.** A player from another club who fits your weakest slot better than the current starter. He goes straight into the XI.
   - **System drills.** +20 familiarity (rare +30).
   - **Upgrade** a card in the deck.
   - **Assistant manager.** +1 starting Influence (at most +2 total).

   At least one card or partnership offer is always on the table.

## What is causal and what is presentation

- Rewards change real engine inputs only: the deck and hand, partnership modifier layers, **boost modifier layers** (new, `source: "boosts"`), system familiarity, the starting Influence bonus, and the lineup itself. Nothing is added to the score or the event resolution.
- Opponent threats are visible modifier layers on named CPU players, plus the CPU card policy's existing difficulty setting.
- Trait cards (`ENGINE ROOM SURGE`, `AERIAL ASSAULT`, `IN BEHIND`, `THE WALL HOLDS`) target the trait's kick-off members, computed from base attributes in `build.prepare_request`. They stop being playable once the trait drops below its count, for example after a member is subbed off or sent off.
- Trait callouts on the pitch and on the result screen are read from the ledger after the fact. A callout fires only for a real payoff:
  - **Engine Room:** a regain in the opponent's half that leads to our shot within 12 s.
  - **Aerial Threat:** a header attempt.
  - **Pace in Behind:** a completed through ball to a runner.
  - **Wall:** a block or clearance in our box.

  Callouts never change the football.
- The run keeps its own squad and build under `localStorage['touchline:run:v1']` and never writes into the season save. While a run screen or run match is showing, the run squad is swapped into `S.current`; `saveState()` always persists the season squad.

## Engine and build changes (Python)

- `build.run_boosts` / `kickoff_modifiers`: `build.boosts = {pid: {attr: x}}` for starters, clamped to `CONST["boost_cap"]` (10). They are written as their own modifier layer and never into base attributes.
- `build.influence_bonus` → starting Influence (at most `CONST["influence_bonus_max"]` = 2).
- `build.unlocks`: cards granted by rewards are allowed in the deck and hand.
- Cards with a `"trait"` field: `who: {"trait_members": id}` resolution, a `can_play` check, the `Trait(...)` keyword and generated text. Trait membership is stored in the prepared request as `builds[team].traits`, so replays are exact.
- CPU hands never draw trait cards.
- All hooks are input-gated: requests without these fields behave exactly as before.

## Limits

- The ladder uses existing club strength. Liverpool is one of the strongest squads, so the early rounds are easy, much like Act 1. Difficulty mostly comes from the elite and final threats and the CPU difficulty setting.
- The current engine's scoring concentration and draw-rate issues (see `tools/balance/report.md`) are not fixed here.
- A reload during a run match reconnects if the server still holds the match. If it has expired, you kick off again from the same plan.
- Human playtesting is still the test for whether this loop is fun. See the evaluation questions in the PR.
