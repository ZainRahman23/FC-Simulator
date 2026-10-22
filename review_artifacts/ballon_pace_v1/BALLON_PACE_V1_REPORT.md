# BALL-ON PACE V1: the D99 ball-carrying movement envelope, three candidates to play

*22 Oct 2026. Local only: the character is a real player's model, never publish. Nothing frozen, no rating scaling. **None of the three is chosen: they are yours to play.***

## ▶ PLAYABLE URL

### `http://127.0.0.1:8361/sandbox/visual/ballon1.html`

It opens on S99 38 km/h · D38 · A99-C · D99 · BC99 · CONTROLLED · BALL ON · CARRY-B (the middle candidate, only as a starting point). **The same player BALL OFF runs beside you on the same input.**

| Control | What it does |
|---|---|
| **BALL-ON PACE** | BALL OFF / CARRY-A / CARRY-B / CARRY-C, instant. **⇄ N** replays the session through the next one. |
| **BALL-OFF twin beside** | Toggles the reference runner. |
| **Playtest presets** | RACE 60 m and 100 m (side-on pair camera), RACE first 15 m (close), gradual 30° steering, 45°/s curve, 45° and 90° cuts + re-acceleration, sprint → tight control → sprint, stop → start. |
| **Pace panel** | Physical vmax, D38, the available ball-on vmax now, the push available, the acceleration now, the control demand, running to the ball, the carry type. |

S99 38 km/h, D38 and A99-C are unchanged: they remain the ball-off ceilings. I cannot play video in real time. The numbers below are simulation and browser measurements.

---

## 1. The model: a continuous envelope, not a multiplier

**Control demand D** (0 = open stable sprint carry … 1 = tight control) is a continuous soft-OR of:

- the request against the travel (4° → 45°). In a pursuit of the ball (the controlled ball's chase / SECURE), its own heading is used instead: running to the ball is not steering it;
- the travel's own turn rate (→ 120°/s);
- the stick's activity;
- a technique in progress.

It is smoothed in time: it rises within ≈ 0.1 s and falls over ≈ 0.5 s, because re-organising the ball after a demanding phase is not instant. The carry types (OPEN SPRINT CARRY · RUNNING CARRY · TIGHT CONTROL · TECHNIQUE · RUNNING TO THE BALL) are diagnostic names only; nothing switches at them.

**Available vmax** = physical vmax × (open − (open − tight) · D). It rises toward the candidate's knock-on ceiling only while the free ball is 1.0 → 2.0 m away (beyond the sprint carry's own 0.7–0.9 m lead), in any direction: a knocked-on ball ahead, a ball sent onto a new line by a technique's exit, a ball to be secured. The player is running *to* the ball, not manipulating it, so more of the physical capability is there, but only while the ball is out there. That is control geometry, not a boost of its own: a released ball 2.8 m ahead took CARRY-B from 9.66 to 10.13 m/s until the player closed on it. Along a plan, the free ball counts only until the body reaches it (the plan's own next touch is there).

**Available acceleration** is D38's own curve with:

- its launch × (1 − per-touch cost × the touch share);
- its taper toward the *available* vmax.

**The touch share is measured** (`tools/b_share.mjs`, the S99 build's own carry): about ½ of the steps from rest (the ball starts at the feet and must be pushed into the running path), in the running carry and in tight control; about ¼ in the 38 km/h sprint carry (every other stride). A touching stride cannot push fully. So the first steps and tight control pay most, the open sprint carry least, and a knocked-on ball less still. **It is not D38 × a constant.**

Mean acceleration in each speed band, as a share of ball off:

| Speed band | 0–2 m/s | 2–4 | 4–6 | 6–8 | 8–9 |
|---|---|---|---|---|---|
| CARRY-A | 90 % | 89 % | 88 % | 85 % | 75 % |
| CARRY-B | 84 % | 83 % | 81 % | 75 % | 57 % |
| CARRY-C | 77 % | 76 % | 74 % | 65 % | 36 % |

**Techniques** (Ronaldo chop, Cruyff, croqueta, drag-back, hook, compact redirects, braking pivot …) keep their own movement and A99-C. D38 then governs the re-acceleration inside the envelope of the moment.

**Every-other-stride** stays the sprint-carry cadence: pushes every 0.83–0.85 s for all three candidates.

## 2. The three candidates

| | Open sprint ceiling | Tight-control ceiling | Knock-on ceiling | Per-touch push cost | Push available, open sprint carry / from rest |
|---|---|---|---|---|---|
| **CARRY-A**, light | 95 % · **36.1 km/h** | 75 % · 28.5 km/h | 98 % | 0.20 | 95 % / 90 % |
| **CARRY-B**, medium | 91.5 % · **34.8 km/h** | 70 % · 26.6 km/h | 96 % | 0.32 | 92 % / 84 % |
| **CARRY-C**, stronger | 88 % · **33.4 km/h** | 65 % · 24.7 km/h | 94 % | 0.45 | 89 % / 77 % |

## 3. Ball off vs ball on (`tools/b_pace.mjs`)

Standing, then a straight full sprint, CONTROLLED, EXPANDED. Time in seconds; the gap behind ball off in brackets.

| | 5 m | 10 m | 20 m | 30 m | 40 m | 60 m | 100 m | Peak | Time to peak |
|---|---|---|---|---|---|---|---|---|---|
| **BALL OFF** | 1.02 | 1.55 | 2.52 | 3.47 | 4.42 | 6.31 | 10.10 | 38.0 km/h | 2.24 s |
| **CARRY-A** | 1.07 (+0.05) | 1.63 (+0.07) | 2.65 (+0.13) | 3.64 (+0.17) | 4.64 (+0.22) | 6.63 (+0.32) | 10.63 (+0.53) | 36.1 km/h | 2.28 s |
| **CARRY-B** | 1.11 (+0.09) | 1.68 (+0.13) | 2.74 (+0.22) | 3.77 (+0.30) | 4.81 (+0.39) | 6.88 (+0.57) | 11.02 (+0.92) | 34.8 km/h | 2.30 s |
| **CARRY-C** | 1.15 (+0.13) | 1.75 (+0.20) | 2.84 (+0.32) | 3.92 (+0.45) | 4.99 (+0.57) | 7.15 (+0.83) | 11.45 (+1.35) | 33.4 km/h | 2.33 s |

Time to 70 / 80 / 90 / 95 % of each configuration's *available* vmax:

| | 70 % | 80 % | 90 % | 95 % |
|---|---|---|---|---|
| BALL OFF | 0.80 | 1.00 | 1.33 | 1.64 |
| CARRY-A | 0.83 | 1.04 | 1.37 | 1.68 |
| CARRY-B | 0.86 | 1.06 | 1.39 | 1.70 |
| CARRY-C | 0.89 | 1.10 | 1.42 | 1.73 |

**In the race:** when the ball-off twin passes 40 m, A is ≈ 2.4 m behind, B ≈ 4.1 m and C ≈ 6.1 m. At 100 m the gaps are 0.53 / 0.92 / 1.35 s. The no-envelope S99 build is identical to ball off at every split, which was the problem you found.

## 4. Control demand (`tools/b_demand.mjs`)

Averages over the window after the change, 4 entry phases each.

| Scenario | Demand D | Available vmax A / B / C (m/s) | Push available A / B / C | Touches/s | Next useful touch | Exits |
|---|---|---|---|---|---|---|
| Straight open sprint carry | 0.00 | 10.03 / 9.66 / 9.29 | 95 / 92 / 89 % | 1.2–1.3 | +0.28–0.39 s | 0 |
| Gradual 15° steering | 0.11 | 9.80 / 9.41 / 9.03 | 94 / 91 / 88 % | 1.5–1.7 | +0.28–0.39 s | 0 |
| Gradual 30° steering | 0.16–0.18 | 9.70 / 9.29 / 8.86 | 94 / 91 / 87 % | 1.4–1.8 | +0.28–0.45 s | 0 |
| Sustained curve 45°/s | 0.51–0.53 | 8.91 / 8.46 / 8.05 | 92 / 88 / 83 % | 1.5–1.6 | +0.44–0.62 s | 0 |
| 20° sudden correction | 0.11 | 9.79 / 9.40 / 9.03 | 94 / 91 / 88 % | 1.2 | +0.14–0.19 s | 0 |
| 45° cut | 0.24–0.26 | 9.51 / 9.11 / 8.68 | 94 / 90 / 86 % | 1.2–1.4 | +0.14–0.19 s | 0 |
| 60° cut | 0.34–0.39 | 9.32 / 8.85 / 8.34 | 93 / 89 / 84 % | 1.4–1.9 | +0.25–0.37 s | 0 |
| 90° cut | 0.45–0.53 | 8.92 / 8.65 / 8.13 | 92 / 88 / 83 % | 1.4 | +0.67–0.87 s | 0 |
| Repeated ±30° (0.45 s) | 0.77–0.79 | 8.38 / 7.92 / 7.39 | 91 / 86 / 80 % | 1.2–1.5 | +0.14–0.18 s | 0 |
| Repeated ±60° (0.35 s) | 0.82–0.87 | 8.20 / 7.79 / 7.24 | 90 / 85 / 79 % | 2.1–2.3 | +0.25–0.34 s | 0 |
| Fast circle 270°/s | 0.92–0.94 | 8.07 / 7.58 / 7.02 | 90 / 85 / 78 % | 2.4–3.1 | +0.24–0.47 s | 0 |
| Stop → start | 0.01–0.04 | 9.94 / 9.59 / 9.26 | 94 / 90 / 86 % | 1.7 | +0.12 s | 0 |
| Sprint → tight control (±45° every 0.3 s, RUN) | 0.81–0.89 | 8.16 / 7.78 / 7.32 | 90 / 85 / 79 % | 1.9–2.5 | +0.18–0.38 s | 0 |
| Tight control → sprint | 0.23–0.24 | 9.56 / 9.12 / 8.72 | 94 / 90 / 86 % | 1.4–1.7 | +0.14–0.20 s | 0 |

Ball separation stays 0.5–0.9 m on average (max 0.8–1.5 m) in every scenario.

**Finding, not masked.** Under rapid ±60° oscillation and sprint → tight control, the ball-on player keeps more speed than the ball-off twin (about 6 vs 5 m/s). This predates the envelope (the no-envelope S99 build does the same). Ball off, A99-C sheds speed on every stick snap. Ball on, B4's actions hold their line until their touch and techniques run their own speed profile, so the ball-on body follows the oscillating stick less. The envelope never gives more than its available vmax. Whether ball-on movement under extreme oscillation should also be capped against what the ball-off body would do is a question for the integrity task.

## 5. Zero self-inflicted loss

**Final code, 24 simulated hours (8 h per candidate, `tools/c_torture.mjs`, seeds 1–240 and fresh seeds 1001–1240): 0 CONTROLLER_FAILURE, 0 missed contacts, for CARRY-A, CARRY-B and CARRY-C.** All 282 observed flags were raised while CONTROLLED_BALL held. Max separation 1.89 m; touches 2.72–2.80 per second.

The first two torture runs did fail (4, then 5 controller failures in 12 h). Each failure was diagnosed and fixed; see the table below. The failed runs' logs are kept under `evidence/torture/superseded/`.

The envelope never creates a loss mechanism: no heavy touches, no random loss. A slower body is simply planned with its slower path, and the ball is pushed for it.

**What the envelope needed to keep zero self-inflicted loss** (each found in the data, all in ballon1 only, none in the S99 build):

| # | Found as | Cause | Fix |
|---|---|---|---|
| 1 | An extra touch after every sprint-carry push | Along the plan the free ball counted beyond the plan's own next touch: the predicted body overtook the unpushed ball, "ball behind" demand slowed it, the push was planned short | The free ball counts only until the body reaches it |
| 2 | The same | The body still gaining speed toward its ceiling drifts the stride timing a few ms from the push's plan | SPRINT_CARRY's due window is 0.15 s with an envelope (0.06 s without) |
| 3 | Torture run 1: 4 controller failures in 12 h (drag-back exit pushes, a correction touch) | "Ball behind" raised the demand exactly when the player had to turn and run to the ball; running onto the ball counted only ahead in the path | "Running to the ball" by distance in any direction; no ball-behind demand |
| 4 | Torture run 1, the same | A recovery existed a few ticks after the failing re-plan; the next re-plan came too late. A slower-braking body overtook a ball 0.24–0.34 m across | While CONTROLLED has no contact planned: re-plan every 0.05 s. The 99 recovery reach goes across to 0.34 m |
| 5 | Torture run 2: 5 failures (a knock-on, then the stick swung away) | Every pursuit was planned inside the tight envelope the new stick direction implied, slower than the knocked ball | A pursuit's direction demand uses its own heading, not the stick |

## 6. Integrity, equivalence, performance

| Check | Result |
|---|---|
| Body, posed every tick, CARRY-B (straight sprint carry and 30 / 60 / 90 / 135 / 180° cuts from it) | 0 / 0 / 1 / 2 / 7 / 6 events, the same as the S99 build except 135° (7 vs 2: the reversal area you set aside for after the choice) |
| Equivalence (`tools/b_equiv.mjs`, `s_equiv.mjs`) | ballon1 without a candidate ≡ the S99 build 24/24 (BALL OFF, BALL ON · FREE, CONTROLLED); BALL OFF with a candidate ≡ BALL OFF 24/24; CURRENT ≡ TC-CONTROLLED-1 48/48 (bit-identical) |
| CPU (`tools/b_cpu.mjs`: the same torture input, all configurations in one process, interleaved over 3 rounds, CPU time — another application was using about one core meanwhile) | **No envelope 89.5 ms per simulated second · CARRY-A 92.1 (+3 %) · CARRY-B 92.0 (+3 %) · CARRY-C 89.1 (±0)**. Worst tick 10.0 → 10.7–11.2 ms. The first version cost +13–18 % (an `exp` and two `pow` per tick of every candidate plan, the physical acceleration computed twice). It now evaluates the demand, available vmax and push every 3rd tick, the free ball every 12th, and `advance()` computes the ball-on acceleration directly |
| Browser (`tools/b_browser.cjs`) | Opens on CARRY-B with the twin beside. The 60 m race preset for BALL OFF / A / B / C gives the same splits as node (A: 5 m 1.07 … 60 m 6.63). At the preset's end the twin is 3.9 / 6.6 / 9.3 m ahead. Deterministic; ⇄ N same input identical; no console or HTTP error |
| Page fix found by the browser check | The readout crashed the page's frame loop before the first simulation tick (no envelope value yet), so the page froze on load. Fixed. The presets were buried at the bottom of the Playtest list (so were the S99 page's mission presets); they are now first in both viewers |

## 7. Recorded for the next tasks

`DESIGN_NOTES.md` records, unimplemented:

- the future Dribbling model: retention of the physical capability and the ability to beat defenders, not random loss;
- skill-move feasibility as a broader entry envelope;
- Ball Control kept separate.

## Your call

Play **A, B and C** against the ball-off twin. **Stopping here:** no choice made, no 1–98 scaling, no freeze.
