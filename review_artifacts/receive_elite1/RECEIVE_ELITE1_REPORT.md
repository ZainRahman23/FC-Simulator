# RECEIVE-ELITE-1 — elite tight control: Ball Control 99 · Dribbling 99 · Agility 99, then each attribute worked backward

**Status:** presented for review. **NOT frozen** — RECEIVE-V1 is not frozen, nothing is integrated beyond the receive pipeline. Owner instruction (19 Oct): `sources/2026-10-19_user_instruction_elite_tight_control_99.md`.
Review page (local only — the character is a real player's model): `review/RECEIVE_ELITE1_REVIEW.html` · lab: `sandbox/visual/receive_elite1.html` · evidence: `evidence/`.
I cannot play video in real time: the visual statements below come from frame stills / strips taken from the lab and from the posed skeleton's diagnostics.

**Headline.** Through a moving turn of 90° or more the ball now stays **0.45–0.65 m** from the player (max, medians over 3 seeds) instead of **3.30–5.22 m**; through a stationary receive-and-turn **0.42–0.54 m** instead of 0.65–0.85 m. Over the 672-run movement matrix at 99/99/99: CLEAN 639 → **657**, TAKEN 15 → **0**, MISSED 16 → **12**; the moving big-turn median 3.38 → **0.47 m**. The body is back on its exit line with the ball close 0.20–0.81 s after the first contact (CURRENT 0.65–2.35 s).

## 1. Why the previous model created excessive ball separation
Every receive-and-turn had ONE authored contact whose ideal sent the ball to where the body would next meet it **after its whole turn** — RECEIVE-TURN-1's reconnection point (the root after the rotation and a 0.55 – 0.75 m run, + 0.40 m), RECEIVE-CONTROL-1.1's handoff point (the ball 1.2 – 2.4 m ahead of the runner when DRIBBLE-V1 takes it). Nothing played the ball between the receive and DRIBBLE-V1. A moving receiver often touched it at his run speed and paid the turn afterwards (an overrun of 1 – 2 m), so the ball had to travel as far as the body's slowest moment; the generic body (TURN-1's angle–speed law, 9 m/s² redirection, 520 – 620 °/s) set that time. Result: 3.30–5.22 m through moving turns ≥ 90°.

## 2. The new elite-control philosophy
Simulation decides, animation explains. The receive technique is selected as before; after the selection everything is AUTHORED football: the body's path (Agility), the feet (Dribbling), contacts that place the ball where the NEXT foot will be — just ahead of the body on its authored path — and Ball Control's execution of every contact. The ball is never attached, parented, teleported or frozen: each contact is one kernel `schedule()` at the ball's own position (inside the kernel's contact window), the rigid-body ball is free between contacts. More contacts, not fewer: the ball follows the body through the turn in short segments. "As close as the action requires": a straight sprint's first touch is still a stride touch into space (sprinting 0°: 2.23 m, as CURRENT 2.05 m); turns ≤ 30° at speed keep one stride touch; larger turns become tight sequences.

## 3. Ball Control / Dribbling / Agility responsibility split
- **Ball Control** — the precision of each contact: RECEIVE-KILL-1.2 B's curve × RECEIVE-TURN-1's bounded keyed draws, unchanged (key: seed | RECEIVE | receiver | R<event> | c<contact> | receive-control-v2 | dimension). Nothing else reads it.
- **Dribbling** — the technical foot actions (`re1_attrs.js`): the shortest interval between contacts (99: 0.15 s alternating feet, 0.26 s the same foot; 50: 0.34 / 0.46 s), how far off its plan a foot still plays the ball (0.24 → 0.13 m), the reaction to what a touch did (0.10 → 0.17 s), the contact point's spacing (×1.00 → ×1.30).
- **Agility** — the body's reorientation: peak braking into the plant (12.5 → 7.5 m/s²), redirection after the contact (11.5 → 6.5 m/s²), hip yaw rate (900 → 480 °/s), TURN-1's angle–speed law ×1.20 → ×0.85, a standing pivot (0.05 s + 820 °/s → 0.14 s + 420 °/s), acceleration out (6.4 → 4.2 m/s²), support-step period (0.18 → 0.27 s), run correction (3.6 → 2.2 m/s). The generic receiver sat between 70 and 80 on most rows. Agility also scales the moving selection's limits and the approach's braking (the same rules, the agile limits).

## 4. 99/99/99 stationary reference (CURRENT → NEW, medians over seeds 1–3)
| action | technique | outcome C / N | max sep. turn | mean sep. turn | max sep. receive | contacts | intervals (s) | min speed | speed +0.5 s | +1.0 s | orientation (s) | stable continuation (s) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| stationary 30° | DIRECTIONAL | CLEAN 3 / CLEAN 3 | 0.66 → **0.49** | 0.59 → **0.45** | 1.84 → **1.63** | 2 → **4** | 0.34 · 0.20 · 0.40 | 0.00 → **0.00** | 2.13 → **3.02** | 2.71 → **5.50** | 0.07 → **0.04** | 1.90 → **0.54** |
| stationary 60° | DIRECTIONAL | CLEAN 3 / CLEAN 3 | 0.65 → **0.46** | 0.57 → **0.43** | 1.91 → **1.61** | 2 → **4** | 0.34 · 0.20 · 0.41 | 0.00 → **0.00** | 2.03 → **2.95** | 3.04 → **5.50** | 0.12 → **0.07** | 1.95 → **0.55** |
| stationary 90° | HALF_TURN | CLEAN 3 / CLEAN 3 | 0.79 → **0.50** | 0.65 → **0.43** | 1.91 → **1.61** | 2 → **4** | 0.35 · 0.21 · 0.41 | 0.00 → **0.00** | 2.03 → **2.95** | 3.29 → **5.50** | 0.12 → **0.07** | 0.65 → **0.56** |
| stationary 120° | HALF_TURN | CLEAN 3 / CLEAN 3 | 0.83 → **0.53** | 0.68 → **0.45** | 1.90 → **1.62** | 2 → **4** | 0.36 · 0.20 · 0.40 | 0.00 → **0.00** | 1.97 → **2.90** | 3.30 → **5.50** | 0.14 → **0.08** | 0.66 → **0.56** |
| stationary 135° | HALF_TURN | CLEAN 3 / CLEAN 3 | 0.85 → **0.54** | 0.69 → **0.46** | 1.90 → **1.62** | 2 → **4** | 0.36 · 0.20 · 0.40 | 0.00 → **0.00** | 1.94 → **2.87** | 3.29 → **5.50** | 0.16 → **0.09** | 0.67 → **0.57** |
| stationary 150° | THROUGH_TURN | CLEAN 3 / CLEAN 3 | 0.71 → **0.42** | 0.54 → **0.34** | 1.90 → **1.61** | 2 → **4** | 0.39 · 0.21 · 0.40 | 0.00 → **0.00** | 1.57 → **2.65** | 3.10 → **5.50** | 0.28 → **0.17** | 0.70 → **0.60** |
| stationary 180° | THROUGH_TURN | CLEAN 3 / CLEAN 3 | 0.77 → **0.47** | 0.58 → **0.36** | 1.90 → **1.62** | 2 → **4** | 0.41 · 0.20 · 0.40 | 0.00 → **0.00** | 1.45 → **2.56** | 3.09 → **5.50** | 0.32 → **0.20** | 0.74 → **0.62** |

## 5. 99/99/99 moving reference (running 5.5 m/s)
| action | technique | outcome C / N | max sep. turn | mean sep. turn | max sep. receive | contacts | intervals (s) | min speed | speed +0.5 s | +1.0 s | orientation (s) | stable continuation (s) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| running 30° | STRIDE | CLEAN 3 / CLEAN 3 | 1.69 → **0.87** | 1.17 → **0.55** | 1.86 → **1.62** | 1 → **2** | 0.20 | 4.55 → **4.56** | 5.50 → **5.50** | 5.50 → **5.59** | 0.22 → **0.06** | 1.56 → **0.20** |
| running 60° | STRIDE | CLEAN 3 / CLEAN 3 | 1.89 → **0.94** | 1.31 → **0.56** | 1.99 → **1.71** | 1 → **2** | 0.21 | 4.33 → **4.31** | 5.34 → **5.27** | 5.50 → **5.61** | 0.28 → **0.08** | 1.57 → **0.21** |
| running 90° | OPEN_TURN | CLEAN 3 / CLEAN 3 | 3.30 → **0.48** | 2.32 → **0.44** | 3.33 → **1.62** | 1 → **4** | 0.22 · 0.21 · 0.20 | 3.10 → **3.59** | 3.34 → **4.12** | 4.18 → **5.50** | 0.45 → **0.08** | 1.85 → **0.63** |
| running 120° | THROUGH_TURN | CLEAN 3 / CLEAN 3 | 4.22 → **0.49** | 2.93 → **0.39** | 4.22 → **1.64** | 1 → **4** | 0.25 · 0.23 · 0.40 | 2.19 → **2.03** | 2.38 → **3.40** | 3.45 → **5.50** | 0.71 → **0.15** | 2.10 → **0.47** |
| running 150° | THROUGH_TURN | CLEAN 3 / CLEAN 3 | 4.43 → **0.45** | 3.12 → **0.33** | 4.43 → **1.86** | 1 → **4** | 0.22 · 0.18 · 0.20 | 1.15 → **0.99** | 1.50 → **2.42** | 3.06 → **4.52** | 0.73 → **0.19** | 2.10 → **0.60** |
| running 180° (pass from the front) | THROUGH_TURN | CLEAN 3 / CLEAN 3 | 3.32 → **0.46** | 2.25 → **0.32** | 3.33 → **1.85** | 1 → **4** | 0.22 · 0.18 · 0.20 | 0.15 → **0.01** | 1.25 → **2.97** | 2.80 → **4.61** | 0.55 → **0.24** | 1.86 → **0.60** |

## 6. 99/99/99 sprint reference (7.8 m/s)
| action | technique | outcome C / N | max sep. turn | mean sep. turn | max sep. receive | contacts | intervals (s) | min speed | speed +0.5 s | +1.0 s | orientation (s) | stable continuation (s) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| sprinting 0° (pass from behind) | STRIDE | CLEAN 3 / CLEAN 3 | 1.30 → **1.33** | 0.88 → **0.90** | 2.05 → **2.23** | 1 → **1** | — | 7.38 → **7.38** | 7.80 → **7.80** | 8.24 → **7.80** | 0.00 → **0.00** | 0.00 → **0.00** |
| sprinting 30° | STRIDE | CLEAN 3 / CLEAN 3 | 1.77 → **0.99** | 1.21 → **0.58** | 2.08 → **2.19** | 1 → **2** | 0.20 | 6.84 → **6.84** | 7.80 → **7.80** | 8.22 → **7.80** | 0.19 → **0.06** | 1.73 → **0.20** |
| sprinting 60° | STRIDE | CLEAN 1 · TAKEN 2 / CLEAN 3 | 2.71 → **0.62** | 1.83 → **0.50** | 2.81 → **2.17** | 1 → **3** | 0.20 · 0.36 | 5.96 → **5.92** | 6.51 → **7.53** | 7.46 → **7.80** | 0.42 → **0.08** | 1.81 → **0.20** |
| sprinting 90° | OPEN_TURN | CLEAN 3 / CLEAN 3 | 4.06 → **0.48** | 2.86 → **0.44** | 4.06 → **2.21** | 1 → **5** | 0.22 · 0.20 · 0.20 · 0.38 | 3.67 → **3.79** | 4.16 → **3.99** | 4.17 → **7.09** | 0.63 → **0.08** | 2.05 → **0.62** |
| sprinting 120° | OPEN_TURN | CLEAN 3 / CLEAN 3 | 5.18 → **0.45** | 3.74 → **0.42** | 5.18 → **2.36** | 1 → **5** | 0.22 · 0.21 · 0.22 · 0.40 | 2.41 → **2.70** | 3.88 → **2.72** | 2.63 → **6.05** | 0.85 → **0.10** | 2.32 → **0.65** |
| sprinting 150° | THROUGH_TURN | CLEAN 3 / CLEAN 3 | 5.22 → **0.65** | 3.75 → **0.44** | 5.22 → **2.33** | 1 → **6** | 0.19 · 0.24 · 0.18 · 0.20 · 0.39 | 1.16 → **1.21** | 2.96 → **1.21** | 1.65 → **5.20** | 0.93 → **0.19** | 2.35 → **0.81** |
| sprinting 180° (pass from the front) | THROUGH_TURN | CLEAN 3 / CLEAN 3 | 3.37 → **0.46** | 2.31 → **0.32** | 3.38 → **2.37** | 1 → **5** | 0.22 · 0.18 · 0.20 · 0.40 | 0.14 → **0.03** | 1.16 → **2.51** | 2.80 → **6.25** | 0.55 → **0.24** | 1.86 → **0.60** |

## 7. Tight large-turn implementation
A large turn is a sequence. The technique's first contact (a through-stance turn's far foot behind / across the standing leg, a half-turn's back foot, an open turn's near foot) sends the ball only as far as the next foot's point: candidates on each of the next swings (Dribbling's cadence) at the touching foot's side or the body's centre line, the ball sent straight there if a surface of the technique faces that impulse and the path clears the standing foot; else the technique's own direction (RECEIVE-TURN-1 / RECEIVE-CONTROL-1.1's ideal) at the speed that brings the ball closest to the next foot; else a search over every direction the technique's surfaces can give. The body rotates around the ball (Agility), the next foot plays it again, touches continue while the body accelerates out on its exit line (every other step once it runs ≥ 3 m/s), then the exit touch. A moving receiver's selection scores the elite first touch (how far it leaves the ball from the next foot) and prefers planting before the touch on a large turn. A sequence whose first touch could not be reached even ideally (a dry run on the kernel's free ball) is not attempted: the technique's own touch is played (CURRENT's behaviour) — in the review set only at Agility 50 sprinting into 150°.

## 8. Rapid-contact architecture
`re1_core.js`: `EliteEpisode` runs live in RECEIVE-CONTROL-2's action frame (stationary receivers after RECEIVE-CONTROL-2's resolver, moving receivers after RECEIVE-CONTROL-1.1's selection — both pipelines' kills, aerial controls and set-offs unchanged). `pre()` at a contact tick: the plan (exit touch or touch toward the next foot), the surface that gives the impulse, the difficulty (RECEIVE-TURN-1's terms), Ball Control's execution with that contact index's keyed draws, one `schedule()`. `post()` one tick later, on the real ball (kernel prediction): the next contact within Dribbling's reach → as planned; beyond → the run corrected toward it from the reaction time at Agility's rate (≤ 0.35 m); else the contact moved on a swing; else a recovery (later, an uncapped correction); else released to DRIBBLE-V1. The footwork (swings, contact feet, the touchdown TURN-1.2 takes the body at) is simulation data. The exit touch: TURN-1.2 at the first touchdown at its slowest gait or faster, DRIBBLE-V1 through RECEIVE-MOVING-1's takeover window.

## 9. Authoritative contact timings (seed 1; time from the first contact · foot · surface · launch speed)
- **stationary 30°** — 1: +0.00 s L inside 1.75 m/s · 2: +0.34 s R inside 3.24 m/s · 3: +0.54 s L inside 5.45 m/s · 4: +0.95 s L inside 8.33 m/s (exit)
- **stationary 60°** — 1: +0.00 s L inside 2.10 m/s · 2: +0.34 s R inside 3.25 m/s · 3: +0.55 s L inside 5.43 m/s · 4: +0.95 s L inside 8.32 m/s (exit)
- **stationary 90°** — 1: +0.00 s R inside 1.44 m/s · 2: +0.35 s L inside 3.34 m/s · 3: +0.56 s R inside 5.48 m/s · 4: +0.96 s R inside 8.32 m/s (exit)
- **stationary 120°** — 1: +0.00 s R inside 1.20 m/s · 2: +0.36 s L inside 3.41 m/s · 3: +0.56 s R inside 5.46 m/s · 4: +0.97 s R inside 8.32 m/s (exit)
- **stationary 135°** — 1: +0.00 s R inside 1.08 m/s · 2: +0.36 s L inside 3.44 m/s · 3: +0.57 s R inside 5.46 m/s · 4: +0.97 s R inside 8.32 m/s (exit)
- **stationary 150°** — 1: +0.00 s L inside 2.65 m/s · 2: +0.39 s R inside 3.46 m/s · 3: +0.60 s L inside 5.45 m/s · 4: +1.00 s L inside 8.31 m/s (exit)
- **stationary 180°** — 1: +0.00 s L inside 2.31 m/s · 2: +0.41 s R inside 3.53 m/s · 3: +0.62 s L inside 5.47 m/s · 4: +1.02 s L inside 8.32 m/s (exit)
- **running 30°** — 1: +0.00 s R inside 5.73 m/s · 2: +0.20 s L inside 8.35 m/s (exit)
- **running 60°** — 1: +0.00 s R inside 5.00 m/s · 2: +0.21 s L inside 8.31 m/s (exit)
- **running 90°** — 1: +0.00 s R inside 4.22 m/s · 2: +0.22 s L inside 3.74 m/s · 3: +0.43 s R inside 5.15 m/s · 4: +0.63 s L inside 8.31 m/s (exit)
- **running 120°** — 1: +0.00 s L sole 1.38 m/s · 2: +0.25 s R inside 4.26 m/s · 3: +0.47 s L inside 5.67 m/s · 4: +0.88 s L inside 8.33 m/s (exit)
- **running 150°** — 1: +0.00 s L sole 0.45 m/s · 2: +0.22 s R inside 2.37 m/s · 3: +0.40 s L inside 3.14 m/s · 4: +0.60 s R inside 7.99 m/s (exit)
- **running 180° (pass from the front)** — 1: +0.00 s R inside 0.75 m/s · 2: +0.22 s L inside 1.55 m/s · 3: +0.40 s R inside 3.80 m/s · 4: +0.60 s L inside 8.04 m/s (exit)
- **sprinting 0° (pass from behind)** — 1: +0.00 s R inside 11.19 m/s
- **sprinting 30°** — 1: +0.00 s R inside 7.74 m/s · 2: +0.20 s L inside 11.21 m/s (exit)
- **sprinting 60°** — 1: +0.00 s R inside 6.44 m/s · 2: +0.20 s L inside 7.48 m/s · 3: +0.56 s L inside 11.20 m/s (exit)
- **sprinting 90°** — 1: +0.00 s R inside 4.85 m/s · 2: +0.22 s L inside 3.90 m/s · 3: +0.42 s R inside 5.00 m/s · 4: +0.62 s L inside 6.59 m/s · 5: +1.00 s L inside 11.15 m/s (exit)
- **sprinting 120°** — 1: +0.00 s R inside 4.23 m/s · 2: +0.22 s L inside 3.19 m/s · 3: +0.43 s R inside 3.97 m/s · 4: +0.65 s L inside 5.75 m/s · 5: +1.04 s L inside 10.90 m/s (exit)
- **sprinting 150°** — 1: +0.00 s L sole 0.39 m/s · 2: +0.19 s R inside 4.56 m/s · 3: +0.42 s L inside 0.89 m/s · 4: +0.61 s R inside 3.70 m/s · 5: +0.81 s L inside 6.05 m/s · 6: +1.20 s L inside 10.96 m/s (exit)
- **sprinting 180° (pass from the front)** — 1: +0.00 s R inside 0.31 m/s · 2: +0.22 s L inside 0.94 m/s · 3: +0.40 s R inside 3.42 m/s · 4: +0.60 s L inside 5.81 m/s · 5: +1.00 s L inside 10.85 m/s (exit)

## 10. Ball-separation measurements
Ball centre ↔ the player's root, horizontal (`tools/re1_metrics.mjs`). "Turn": the first contact → the body facing the exit for 0.15 s, + 0.3 s. "Receive": the first contact → DRIBBLE-V1's first touch (≤ 2.5 s). Over-time curves: the review page's §10 (CURRENT grey, NEW yellow). Reference set at 99/99/99: stationary turn max 0.65–0.85 → **0.42–0.54 m**; moving / sprinting ≥ 90° 3.30–5.22 → **0.45–0.65 m**; mean through the turn 2.25–3.75 → **0.32–0.44 m**. The receive maximum is now set by the exit touch (DRIBBLE-V1's takeover distance): stationary 1.84–1.91 → 1.61–1.63 m, moving ≥ 90° 3.33–5.22 → 1.62–2.37 m.

## 11. Body-turn timings
Orientation (facing within 10° of the exit, held): stationary 0.07–0.32 → **0.04–0.20 s**; moving ≥ 90° 0.45–0.93 → **0.08–0.24 s**. Stable continuation (the first contact played facing and running along the exit, ≥ 2.5 m/s, the ball ≤ 1.5 m): 0.65–2.35 → **0.20–0.81 s**. Speed 1 s after the first contact, moving ≥ 90°: 1.65–4.18 → **4.52–7.09 m/s**. A sprinter's 180° reversal still decelerates to ≈ 0 (min 0.03 m/s) — a reversal — but is back at 6.25 m/s 1 s after the contact (CURRENT 2.80).

## 12. Dribbling-99 foot cadence
Alternating contacts every **0.21 s** (moving, median, before the exit-line spacing; range 0.18–0.25 s); a standing turn's second contact as the pivot completes (0.34 – 0.41 s), then 0.20 s; every other step (0.36 – 0.41 s) once out on the exit line at ≥ 3 m/s. A foot plays the ball up to 0.24 m off its planned point.

## 13. Agility-99 body response
A standing 180° pivot in 0.24 s (CURRENT's generic 0.42 s), the run out from 42 % of it at 6.4 m/s²; moving: braking into the plant up to 12.5 m/s², the velocity redirected at 11.5 m/s², hips up to 900 °/s; orientation 0.08–0.24 s after the contact on moving turns ≥ 90°.

## 14. Ball-Control-99 precision
At BC 99 the largest execution error of any contact (determinism runs, every review action, seeds 1–2) is 0.21 m/s — a firm pass's first touch; the sequence's own touches ≤ 0.02 m/s; the next contact finds the ball 0.09 m from its planned point (median).

## 15. Independent Ball Control 50–99 (Dribbling 99, Agility 99; 20 actions × 3 seeds per row)
| BC | outcome | max sep. turn (med / p90) | mean sep. turn | contacts | mean interval (s) | first-touch error (m/s) | miss at 2nd contact (med / p90 m) | corrections / recovery touches | speed +1.0 s | orientation (s) | declined |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 99 | CLEAN 60 | 0.49 / 0.94 | 0.44 | 3.75 | 0.26 | 0.09 | 0.093 / 0.14 | 3 / 1 | 5.50 | 0.08 | 0 |
| 90 | CLEAN 60 | 0.48 / 0.96 | 0.43 | 3.75 | 0.26 | 0.32 | 0.101 / 0.24 | 4 / 0 | 5.50 | 0.08 | 0 |
| 80 | CLEAN 60 | 0.51 / 0.96 | 0.42 | 3.75 | 0.26 | 0.59 | 0.165 / 0.24 | 10 / 0 | 5.50 | 0.08 | 0 |
| 70 | CLEAN 60 | 0.55 / 0.97 | 0.42 | 3.75 | 0.26 | 0.78 | 0.198 / 0.24 | 22 / 2 | 5.50 | 0.08 | 0 |
| 60 | CLEAN 60 | 0.56 / 0.98 | 0.42 | 3.75 | 0.26 | 0.91 | 0.224 / 0.24 | 24 / 3 | 5.50 | 0.08 | 0 |
| 50 | CLEAN 60 | 0.56 / 0.99 | 0.43 | 3.75 | 0.26 | 1.05 | 0.240 / 0.24 | 31 / 4 | 5.50 | 0.08 | 0 |

Moving turns ≥ 90°:
| BC | outcome | max sep. turn (med / p90) | mean sep. turn | contacts | mean interval (s) | first-touch error (m/s) | miss at 2nd contact (med / p90 m) | corrections / recovery touches | speed +1.0 s | orientation (s) | declined |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 99 | CLEAN 24 | 0.47 / 0.50 | 0.41 | 4.62 | 0.24 | 0.13 | 0.090 / 0.21 | 3 / 0 | 5.50 | 0.17 | 0 |
| 90 | CLEAN 24 | 0.46 / 0.52 | 0.41 | 4.62 | 0.24 | 0.47 | 0.110 / 0.22 | 3 / 0 | 5.50 | 0.17 | 0 |
| 80 | CLEAN 24 | 0.46 / 0.56 | 0.39 | 4.62 | 0.24 | 0.88 | 0.178 / 0.24 | 4 / 0 | 5.50 | 0.17 | 0 |
| 70 | CLEAN 24 | 0.46 / 0.57 | 0.39 | 4.62 | 0.24 | 1.17 | 0.216 / 0.24 | 10 / 0 | 5.50 | 0.17 | 0 |
| 60 | CLEAN 24 | 0.46 / 0.58 | 0.40 | 4.62 | 0.24 | 1.37 | 0.238 / 0.24 | 11 / 0 | 5.50 | 0.17 | 0 |
| 50 | CLEAN 24 | 0.46 / 0.58 | 0.40 | 4.62 | 0.24 | 1.59 | 0.240 / 0.24 | 14 / 0 | 5.50 | 0.17 | 0 |

Same fast feet, same fast body, an increasingly imperfect first touch: its error grows ×11 (BC 50), the next foot reaches further and the run corrects more often; elite feet absorb most of it (limitation 2).

## 16. Independent Dribbling 50–99 (Ball Control 99, Agility 99)
| DRI | outcome | max sep. turn (med / p90) | mean sep. turn | contacts | mean interval (s) | first-touch error (m/s) | miss at 2nd contact (med / p90 m) | corrections / recovery touches | speed +1.0 s | orientation (s) | declined |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 99 | CLEAN 60 | 0.49 / 0.94 | 0.44 | 3.75 | 0.26 | 0.09 | 0.093 / 0.14 | 3 / 1 | 5.50 | 0.08 | 0 |
| 90 | CLEAN 60 | 0.54 / 0.96 | 0.45 | 3.55 | 0.30 | 0.09 | 0.093 / 0.14 | 4 / 0 | 5.50 | 0.08 | 0 |
| 80 | CLEAN 60 | 0.57 / 0.69 | 0.48 | 2.90 | 0.39 | 0.09 | 0.116 / 0.19 | 7 / 0 | 5.50 | 0.08 | 0 |
| 70 | CLEAN 59 · TAKEN 1 | 0.62 / 1.10 | 0.50 | 2.75 | 0.41 | 0.09 | 0.112 / 0.14 | 5 / 0 | 5.50 | 0.08 | 0 |
| 60 | CLEAN 60 | 0.69 / 1.12 | 0.60 | 2.60 | 0.56 | 0.09 | 0.106 / 0.15 | 7 / 0 | 5.50 | 0.08 | 0 |
| 50 | CLEAN 60 | 0.82 / 1.14 | 0.67 | 2.50 | 0.58 | 0.10 | 0.096 / 0.13 | 16 / 1 | 5.50 | 0.08 | 0 |

Moving turns ≥ 90°:
| DRI | outcome | max sep. turn (med / p90) | mean sep. turn | contacts | mean interval (s) | first-touch error (m/s) | miss at 2nd contact (med / p90 m) | corrections / recovery touches | speed +1.0 s | orientation (s) | declined |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 99 | CLEAN 24 | 0.47 / 0.50 | 0.41 | 4.62 | 0.24 | 0.13 | 0.090 / 0.21 | 3 / 0 | 5.50 | 0.17 | 0 |
| 90 | CLEAN 24 | 0.57 / 0.67 | 0.44 | 4.12 | 0.30 | 0.13 | 0.090 / 0.21 | 4 / 0 | 5.50 | 0.17 | 0 |
| 80 | CLEAN 24 | 0.64 / 0.69 | 0.50 | 3.50 | 0.40 | 0.13 | 0.128 / 0.19 | 7 / 0 | 5.50 | 0.17 | 0 |
| 70 | CLEAN 24 | 0.65 / 1.10 | 0.54 | 3.12 | 0.43 | 0.12 | 0.118 / 0.17 | 5 / 0 | 5.50 | 0.17 | 0 |
| 60 | CLEAN 24 | 0.92 / 1.12 | 0.66 | 2.75 | 0.59 | 0.12 | 0.129 / 0.15 | 7 / 0 | 5.50 | 0.17 | 0 |
| 50 | CLEAN 24 | 0.96 / 1.14 | 0.76 | 2.50 | 0.61 | 0.12 | 0.129 / 0.13 | 12 / 0 | 5.50 | 0.17 | 0 |

Precise touches, an agile body, slower feet: fewer contacts, longer intervals, the ball travels further between them — tightness decreases here.

## 17. Independent Agility 50–99 (Ball Control 99, Dribbling 99)
| AGI | outcome | max sep. turn (med / p90) | mean sep. turn | contacts | mean interval (s) | first-touch error (m/s) | miss at 2nd contact (med / p90 m) | corrections / recovery touches | speed +1.0 s | orientation (s) | declined |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 99 | CLEAN 60 | 0.49 / 0.94 | 0.44 | 3.75 | 0.26 | 0.09 | 0.093 / 0.14 | 3 / 1 | 5.50 | 0.08 | 0 |
| 90 | CLEAN 60 | 0.50 / 0.93 | 0.44 | 3.85 | 0.27 | 0.09 | 0.098 / 0.14 | 3 / 0 | 5.46 | 0.09 | 0 |
| 80 | CLEAN 60 | 0.51 / 0.91 | 0.44 | 4.00 | 0.28 | 0.09 | 0.099 / 0.15 | 4 / 0 | 4.79 | 0.11 | 0 |
| 70 | CLEAN 60 | 0.53 / 0.91 | 0.45 | 4.10 | 0.30 | 0.08 | 0.099 / 0.14 | 3 / 4 | 4.28 | 0.14 | 0 |
| 60 | CLEAN 60 | 0.52 / 0.93 | 0.45 | 4.25 | 0.30 | 0.08 | 0.099 / 0.14 | 6 / 3 | 3.92 | 0.15 | 0 |
| 50 | CLEAN 56 · TAKEN 4 | 0.52 / 0.91 | 0.45 | 4.05 | 0.30 | 0.08 | 0.098 / 0.14 | 3 / 0 | 3.55 | 0.17 | 3 |

Moving turns ≥ 90°:
| AGI | outcome | max sep. turn (med / p90) | mean sep. turn | contacts | mean interval (s) | first-touch error (m/s) | miss at 2nd contact (med / p90 m) | corrections / recovery touches | speed +1.0 s | orientation (s) | declined |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 99 | CLEAN 24 | 0.47 / 0.50 | 0.41 | 4.62 | 0.24 | 0.13 | 0.090 / 0.21 | 3 / 0 | 5.50 | 0.17 | 0 |
| 90 | CLEAN 24 | 0.46 / 0.52 | 0.41 | 4.88 | 0.25 | 0.10 | 0.106 / 0.23 | 3 / 0 | 5.09 | 0.19 | 0 |
| 80 | CLEAN 24 | 0.46 / 0.52 | 0.41 | 5.25 | 0.28 | 0.10 | 0.105 / 0.24 | 4 / 0 | 4.61 | 0.22 | 0 |
| 70 | CLEAN 24 | 0.44 / 0.58 | 0.41 | 5.50 | 0.26 | 0.10 | 0.104 / 0.23 | 3 / 4 | 4.08 | 0.22 | 0 |
| 60 | CLEAN 24 | 0.45 / 0.58 | 0.41 | 5.88 | 0.28 | 0.10 | 0.105 / 0.24 | 6 / 3 | 3.58 | 0.24 | 0 |
| 50 | CLEAN 21 · TAKEN 3 | 0.45 / 0.58 | 0.41 | 5.38 | 0.28 | 0.08 | 0.104 / 0.24 | 3 / 0 | 2.95 | 0.27 | 3 |

Precise touches, quick feet, a slower body: slower orientation, more steps and contacts through the turn, a slower exit; the separation stays tight (the feet keep up). At Agility 50 the sprinting 150° cannot plant in time and plays the technique's own touch (3 runs).

## 18. Combined 50 / 60 / 70 / 80 / 90 / 99
| BC/DRI/AGI | outcome | max sep. turn (med / p90) | mean sep. turn | contacts | mean interval (s) | first-touch error (m/s) | miss at 2nd contact (med / p90 m) | corrections / recovery touches | speed +1.0 s | orientation (s) | declined |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 99/99/99 | CLEAN 60 | 0.49 / 0.94 | 0.44 | 3.75 | 0.26 | 0.09 | 0.093 / 0.14 | 3 / 1 | 5.50 | 0.08 | 0 |
| 90/90/90 | CLEAN 60 | 0.51 / 0.96 | 0.43 | 3.85 | 0.27 | 0.30 | 0.121 / 0.21 | 7 / 0 | 5.46 | 0.09 | 0 |
| 80/80/80 | CLEAN 58 · TAKEN 2 | 0.60 / 0.78 | 0.47 | 3.33 | 0.38 | 0.55 | 0.186 / 0.19 | 25 / 3 | 4.73 | 0.11 | 0 |
| 70/70/70 | CLEAN 55 · TAKEN 5 | 0.64 / 0.82 | 0.51 | 3.23 | 0.44 | 0.64 | 0.170 / 0.17 | 49 / 10 | 4.28 | 0.14 | 0 |
| 60/60/60 | CLEAN 58 · TAKEN 2 | 0.69 / 0.83 | 0.54 | 3.15 | 0.47 | 0.74 | 0.150 / 0.15 | 50 / 20 | 3.92 | 0.15 | 0 |
| 50/50/50 | CLEAN 48 · TAKEN 12 | 0.71 / 1.33 | 0.57 | 3.00 | 0.57 | 0.87 | 0.130 / 0.13 | 58 / 37 | 3.55 | 0.17 | 0 |

Against CURRENT at the same ratings (the attributes reach DRIBBLE-V1 in both pipelines):

| ratings | CURRENT | NEW | max sep. turn C → N | speed +1.0 s C → N |
|---|---|---|---|---|
| 99/99/99 | CLEAN 58 · TAKEN 2 | CLEAN 60 | 1.80 → 0.49 | 3.27 → 5.50 |
| 90/90/90 | CLEAN 55 · TAKEN 4 · RECEIVED 1 | CLEAN 60 | 1.79 → 0.51 | 3.22 → 5.46 |
| 80/80/80 | CLEAN 46 · TAKEN 14 | CLEAN 58 · TAKEN 2 | 1.92 → 0.60 | 3.31 → 4.73 |
| 70/70/70 | CLEAN 39 · TAKEN 12 · RECEIVED 9 | CLEAN 55 · TAKEN 5 | 1.90 → 0.64 | 3.41 → 4.28 |
| 60/60/60 | CLEAN 34 · TAKEN 19 · RECEIVED 7 | CLEAN 58 · TAKEN 2 | 1.92 → 0.69 | 3.44 → 3.92 |
| 50/50/50 | CLEAN 26 · TAKEN 22 · RECEIVED 12 | CLEAN 48 · TAKEN 12 | 1.92 → 0.71 | 3.45 → 3.55 |

A continuum from almost glued and extremely responsive to slower feet, a slower body, less precise touches and more recovery — and a 50/50/50 professional still completes 48/60 of the set cleanly (CURRENT at the same ratings 26/60).

## 19. Receive → DRIBBLE-V1 takeover results
672-run movement matrix at 99/99/99: CURRENT CLEAN 639 · TAKEN 15 · RECOVERED 2 · MISSED 16 · NEW **CLEAN 657 · RECOVERED 3 · MISSED 12** (TAKEN = DRIBBLE-V1 took the ball but did not keep it on the new line). The exit distance: how close the exit touch can put the ball for the frozen DRIBBLE-V1 (× RECEIVE-CONTROL-1.1's HANDOFF_AHEAD, 60 runs each): × 1.0 CLEAN 60 (receive max 1.67 m) · × 0.85 CLEAN 25 · TAKEN 35 · × 0.7 CLEAN 54 · TAKEN 6 (receive max 1.19 m). Kept at × 1.0 — DRIBBLE-V1 (frozen) does not reliably take a closer ball.

## 20. Stationary regressions
Elite OFF ≡ RECEIVE-MOVING-1: **422/422** bit-identical (RECEIVE-CONTROL-2's cases × BC 50/99 × seeds, RECEIVE-MOVING-1's owner cases, the movement matrix). Elite ON, the receives it does not own — kill and hold, thigh / chest / head controls, kill-and-go, control-and-set-off: **24/24** bit-identical. The stationary turns: 34/34 changed (the elite sequence, by design); standing receives in the matrix 168 → 168 CLEAN. Protected files: 727/727 identical.

## 21. Moving regressions
Movement matrix, moving receivers: CURRENT CLEAN 471 · TAKEN 15 · RECOVERED 2 · MISSED 16 → NEW **CLEAN 489 · RECOVERED 3 · MISSED 12**. Speed 1 s after the contact rises at every turn ≥ 60° (review page §19). The 0° stride receives keep their space (sprinting 0° max separation 2.05 → 2.23 m).

## 22. Deterministic verification
Every run repeated: **240/240** identical (99/99/99, BC 50, DRI 50, AGI 50, 70/70/70, 50/50/50 × 20 actions × 2 seeds). Ball Control draws are never re-rolled by Dribbling or Agility (or Ball Control): the same contact index draws the same standard normals at every rating — **172/172** contact indices (809 draws). Chrome (the lab, animation off) = Node: **26/26**.

## 23. Animation ON/OFF neutrality
**100/100** identical with the presentation body on and off (contact ticks, launches, the player's path, the result, the DRIBBLE-V1 handoff; 20 actions × 5 rating sets, 46221 poses). The body: every contact foot at its contact pose ≤ 9.9 mm at the contact tick; planted-foot slip ≤ 5.4 cm. CPU: receive phase 17 → 21 ms per simulated second, DRIBBLE-V1 after 163 → 137, worst single step 46.1 → 39.9 ms, the moving selection 1.89 → 1.97 ms per receive.

## 24. Review page / lab links (local only)
- Review: http://127.0.0.1:8361/review_artifacts/receive_elite1/review/RECEIVE_ELITE1_REVIEW.html (26 clips, 31 frame strips, the separation graphs, every table above)
- Lab: http://127.0.0.1:8361/sandbox/visual/receive_elite1.html?case=ST_180_V12&compare=1 (CURRENT vs NEW) · `?case=F_180R_SPRINT_NORMAL` (gameplay + close + top) · `?case=L_120_RUN_NORMAL&vs=B99_D50_A99` (99 vs a reduced rating) · controls: case, Ball Control / Dribbling / Agility, pipeline, view (gameplay, close, top), speed 1× … 0.1×, frame step. Numbered rings are the authoritative contacts with their times; the graph shows the ball–player separation over time.

## 25. Remaining limitations
1. **The exit touch still uses space.** Through the turn the ball stays ≈ 0.4 – 0.65 m away; the exit touch then puts it where the frozen DRIBBLE-V1 takes it over (1.6 m ahead at 5.5 m/s, 2.0 m at 7.8 m/s, during TURN-1.2's 0.6 s run-out). Closer handoffs were measured and are not reliably accepted (§19).
2. **Ball Control's consequence is absorbed by elite feet.** With Dribbling 99 / Agility 99, BC 50's ≈ 1 m/s first-touch errors become a further reach and run corrections, not a looser ball; BC shows more with lower Dribbling (§18).
3. **Low Agility sprinting into a big turn** cannot plant before the ball; the elite sequence is declined and the technique's own touch is played (CURRENT's behaviour) — Agility-aware braking earlier in the approach would be the fuller answer.
4. **A standing turn's second contact** comes as the pivot completes (0.34 – 0.41 s), not within 0.25 s.
5. **Authored kinematics, not forces**: the human body (RECEIVE-TURN-1.1's, generalised to several contacts and a moving entry) explains the path with IK; the blend into TURN-1.2's pose at the switch leaves ≤ 5.4 cm of planted-foot slip; a far contact can fully extend a leg; the run-in before a moving action is this body's gait, blended in from TURN-1.2's pose over 0.14 s.
6. **Rating anchors are first values** (50 / 70 / 90 / 99), tuned on the 99 reference and checked for a continuum, not calibrated against player data.
7. No pressure or opponents; MISSED receives in the matrix (12, CURRENT 16) are passes no technique could take.
