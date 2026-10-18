# RECEIVE-KILL-1 report — kill / deaden the ball

18 Oct 2026, branch `prototype/dribble-1`. **Presented for review — not frozen. The Ball Control constants are calibration values, not locked.**

**Owner instruction:** verbatim in `sources/2026-10-18_user_instruction_receive_kill_1.md`.

**Code:** `sandbox/visual/receive_kill1/`. It is new and isolated: RECEIVE-CONTROL-1.1, DRIBBLE-V1, TURN-1.2 and the ball physics are unchanged and re-verified.

**Video:** I cannot play video in real time. My visual judgements come from the still strips (`sheets/`) and stills, not from watching the clips.

## How to read the numbers

- **Distance** is the ball's distance from the intended point 2.0 s after the touch, in metres. That is when the receiver's next touch would come, and where the ideal ball is by construction.
- **Control state.** These are consequences of the rigid-body result, never drawn:

  | State | Distance |
  |---|---|
  | SET | ≤ 0.5 m |
  | CONTROLLED | ≤ 1.2 m |
  | LOOSE | ≤ 2.5 m |
  | CONTESTABLE | ≤ 4.5 m |
  | LOST | beyond 4.5 m |

- **Heavy touch** means the ball is beyond 1.2 m.
- **Distributions** use 200 keyed seeds per cell. The same seeds are used at every rating.
- **The receiver** is stationary, in clean conditions. Only Ball Control varies.

---

## 1. The Ball Control execution formula

The action computes the ideal post-contact velocity `v_ideal` first (item 7). Ball Control only sets the error around it. The error is a velocity, in the surface's own frame:
- the rebound axis `n` (the way an over-stiff surface returns the ball);
- the lateral axis `l`;
- a third axis `t` (up for a foot on the turf, the surface tangent otherwise).

```
v_out = v_ideal + ε_reb·n + ε_lat·l + ε_t·t
ε_a   = σ_a · N_a                         (rebound: N < 0 = under-cushioned, the ball runs through → × run_surface;
                                           a foot on the turf can only lift the ball → |N_t|)
σ_a   = k_a,surface · vRef · D · E(BC, D)           vRef = 10 m/s
E     = eFloor + eSkill · q(BC) · c(D)              eFloor = 0.0068, eSkill = 0.40
q(BC) = ((100 − BC) / 90)^1.1                       BC 10 → 1 … BC 99 → 0.0071
c(D)  = D / (D + 1.0)                               Ball Control's share of the error
N_a   ~ N(0, 1), keyed: matchSeed | "RECEIVE" | receiverId | receiveEventId | "receive-kill-v1" | axis | 0
```

There are two physical caps:
- The rebound along `n` can be no faster than an uncushioned bounce off that surface: `e · v_in,n`, with boot 0.48, body 0.35, head 0.45.
- A run-through can be no faster than 0.9 × the incoming speed.

The key never contains Ball Control, so BC 10 … 99 get the same `N` and the error vector simply rescales (item 21). Code: `rk_model.js` `execute()`.

## 2. The incoming-difficulty formula

```
vEff = sqrt((w_h · v_h)² + (w_z · v_z)²)       the incoming speed the surface must manage
D    = m · (vEff / vRef) · (1 + 0.6·H² + 0.8·J + 0.5·B + 0.10·shift)
```

| Term | Meaning |
|---|---|
| `vEff` | The square root of the weighted incoming kinetic energy per unit mass. Owner question 12: the energy, through its square root, is the right input. The error is a velocity, so a speed-like D keeps it proportional; energy itself (∝ v²) would make D grow 225× from 2 to 30 m/s instead of 15×. |
| `m` | The surface's intrinsic difficulty: inside foot 1.0, sole 1.1, thigh 1.15, instep 1.25, chest 1.25, outside 1.3, head 1.6. |
| `H` | `(z − zNom) / zHalf`, clamped to ±1.5: the contact height relative to the surface's natural height. |
| `J` | `(z − 1.92) / 0.3`: a header that needs a jump. |
| `B` | `(1 − cos bearing) / 2`: the ball arrives from the side or behind the facing. |
| `shift` | The receiver's repositioning before the contact (m). |

D is continuous: no buckets. For a ground ball D = 0.22 at 2 m/s, 1.0 at 10 m/s and 3.0 at 30 m/s. Code: `difficulty()`.

## 3. How horizontal speed affects difficulty

Horizontal speed enters `vEff` with the weight `w_h`:
- 1.0 for foot, chest and head;
- 1.15 for the thigh, where a flat ball into a raised thigh is awkward.

On the ground, D is simply proportional to the speed (0.22 → 3.04 for 2 → 30 m/s). The error then grows with D twice:
- through the scale `vRef·D`;
- through Ball Control's share `c(D)`.

## 4. How vertical speed affects difficulty

Vertical speed enters `vEff` with the surface's weight `w_z`:

| Surface | w_z | Effect of a dropping ball |
|---|---|---|
| Inside / outside of the foot | 1.6 | Harder: a dropping ball on the inside is awkward |
| Head | 1.3 | Harder |
| Chest | 1.15 | Harder |
| Sole | 1.0 | Neutral |
| Instep | 0.9 | Slightly easier |
| Thigh | 0.8 | Easier: the thigh is built for dropping balls |

At the same total speed (10 m/s), going from flat to a 60° descent changes D (`evidence/rk_scaling.json`):

| Surface | Flat | 60° descent |
|---|---|---|
| Inside of the foot | 1.00 | 1.47 |
| Head | 1.76 | 2.00 |
| Chest | 1.25 | 1.39 |
| Instep | 1.25 | 1.16 |
| Thigh | 1.32 | 1.04 |

Extra vertical speed always adds energy, so a ball arriving with significant downward velocity is harder than a gentle one at the same height. The owner's example (ENERGY matrix):

| Ball | Surface | D | BC 70 median |
|---|---|---|---|
| 3 m/s roller | inside | 0.32 | 0.02 m |
| 25 m/s at the foot | inside | 2.54 | 0.90 m |
| 25 m/s dropping 50° onto the foot | instep | 3.05 | 1.67 m |
| 25 m/s at chest height, 15° | chest | 3.19 | 3.32 m |
| 25 m/s at chest height, 50° | chest | 3.45 | 3.66 m |

## 5. How arrival height affects surface selection

The selection is causal and BC-independent.
- The planner reads the free-ball prediction along the whole path, every 2 ticks.
- At each tick, every surface whose envelope contains the ball is a candidate. The envelope covers height band, max speed, arrival bearing and descent.
- Each candidate gets a score: `J = D + 1.0 · shift + preference` (preference 0–0.25; the other foot +0.04).
- AUTO takes the lowest J. FORCED restricts the candidates to one surface or group; impossible combinations are refused and listed with the reason.

AUTO's map at 10 m/s (`evidence/rk_scaling.json`, review page §5):

| Arrival | Choice |
|---|---|
| Ground | inside of the foot |
| Landing balls at ~0.2 m | sole |
| 0.3–0.6 m | raised inside foot, or instep when dropping |
| 0.7–1.1 m | thigh |
| 1.2–1.6 m | chest, or the thigh when dropping steeply: AUTO lets it drop (DROP matrix: 50° and 65° → thigh) |
| ≥ 1.6–1.7 m | head when flat; the chest when dropping 30–45° and the thigh at 60° (AUTO waits for the ball) |

Arrival direction moves the choice too (SIDE matrix): from the right at 60° or 90°, the inside of the *left* foot.

## 6. The control surfaces implemented

Seven authored actions, both sides where sided (`SURFACES` in `rk_model.js`):

| Action | Ball-centre band (m) |
|---|---|
| FOOT_INSIDE | 0.10–0.62 |
| FOOT_SOLE | 0.10–0.24 |
| FOOT_INSTEP | 0.14–0.62, dropping |
| FOOT_OUTSIDE | 0.10–0.35, from the foot's side |
| THIGH | 0.70–1.15 |
| CHEST | 1.05–1.58 |
| HEAD | 1.58–2.25 |

Each surface has its own:
- envelope;
- natural height;
- ideal result;
- capability;
- difficulty weights;
- error shape;
- authored preparation.

`RECEIVE_KILL1_ANIMATION_CONTRACT.md` lists each per action.

## 7. What "perfect" control means for each surface

The ideal is what a perfect execution does with this ball. The exit leaves the surface toward a **settle point**. Its speed comes from a table built through the ball kernel, so the ideal ball (bounces and roll included) is at the settle point 2.0 s after the contact.

Above the surface's absorption limit `vAbs`, even the perfect cushion returns `κ · (v_in − vAbs)` along `n`. That is the surface's physical limit: the review cells show it as "surface limit +x m/s".

| Surface | Perfect means | Limit |
|---|---|---|
| Foot inside / outside | Dead at the foot: a few cm of give, settles 0.40 m ahead | inside 20 m/s (κ 4 %); outside 12 m/s (6 %) |
| Sole | Dead under the sole (residual 0) | 9 m/s (6 %) |
| Instep | Cushioned down (−0.4 m/s) and settles at the foot | 10 m/s (6 %) |
| Thigh | A small pop (+0.5 m/s), drops in front, settles 0.55 m ahead | 10 m/s (7 %) |
| Chest | Cushioned down (−0.4 m/s), falls in front, settles 0.60 m ahead — never stuck to the chest | 12 m/s (7 %) |
| Head | A cushioned pop (+1.4 m/s), drops about 1 m in front — never dead in mid-air | 6 m/s (12 %): the head keeps the most |

At BC 99 the median distance is 2–5 cm for manageable balls on every surface. It is 0.75 m for a 20 m/s chest ball and 1.33 m for a 20 m/s head ball: those are the surface limits, not Ball Control.

## 8. Ball Control 10–99 scaling

| BC | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90 | 99 |
|---|---|---|---|---|---|---|---|---|---|---|
| q(BC) | 1.000 | 0.879 | 0.759 | 0.640 | 0.524 | 0.410 | 0.299 | 0.191 | 0.089 | 0.007 |
| E at D 0.2 (≈ 2 m/s roller) | .073 | .065 | .057 | .049 | .042 | .034 | .027 | .020 | .013 | .007 |
| E at D 1.0 (10 m/s) | .207 | .182 | .158 | .135 | .112 | .089 | .067 | .045 | .025 | .008 |
| E at D 2.2 (22 m/s) | .282 | .248 | .215 | .183 | .151 | .120 | .089 | .059 | .031 | .009 |

E is relative. The rebound error σ of a foot kill is `10 · D · E` m/s:
- 0.15 (BC 10) to 0.015 m/s (BC 99) at D 0.2;
- 6.3 to 0.19 m/s at 22 m/s (D 2.23).

## 9. Easy-ball compression

Easy balls compress the ratings twice:
- **The error is proportional to D.** A 2 m/s roller has a tenth of the error scale of a 20 m/s pass.
- **Ball Control's share of it, c(D), falls toward 0 for easy balls.** It is 0.17 at D 0.2, 0.5 at D 1 and 0.75 at D 3.

The turf does the rest: its rolling resistance is strong at low speed (1 m/s rolls 0.22 m).

The rebound σ spread between BC 10 and BC 99 (`rk_scaling.json` → `compression`):

| D | Spread | BC 10 / BC 99 |
|---|---|---|
| 0.2 | 0.13 m/s | 10× |
| 1.0 | 2.0 m/s | 25× |
| 3.0 | 8.9 m/s | 34× |

The easy benchmark (2 m/s roller, straight, preferred foot, stationary, clean):

| BC | Median distance | p90 | Heavy |
|---|---|---|---|
| 10 | 0.03 m | 0.05 m | 0 % |
| 50 | 0.01 m | 0.03 m | 0 % |
| 99 | 0.00 m | 0.01 m | 0 % |

Every rating kills it. The differences exist but are a few centimetres. At 5 m/s: BC 10 median 0.13 m (p90 0.30) vs BC 99 0.01 m.

## 10. Hard-ball differentiation

Hard benchmark: 22 m/s ground pass, straight, preferred foot, stationary, clean. 200 seeds; the TYPICAL draw in brackets:

| BC | Median | p90 | Heavy | Lost | Owner's qualitative target |
|---|---|---|---|---|---|
| 99 | 0.03 (0.04) | 0.06 | 0 % | 0 % | exceptional deadening |
| 90 | 0.12 (0.10) | 0.30 | 0 % | 0 % | excellent |
| 80 | 0.33 (0.24) | 0.87 | 6 % | 0 % | good, visible residual movement |
| 70 | 0.68 (0.56) | 1.91 | 20 % | 1 % | reasonable, clearly imperfect |
| 50 | 1.80 (1.42) | 5.52 | 65 % | 14 % | significant heavy-touch risk |
| 30 | 3.52 (2.91) | 10.9 | 82 % | 38 % | difficult control |
| 10 | 5.71 (5.02) | 15.6 | 92 % | 60 % | very poor result likely |

None of these outcomes is hardcoded: they come from the formula and the rigid-body ball. At 25 m/s the medians are 0.04 (BC 99), 0.45 (BC 80) and 2.49 m (BC 50).

## 11. Ground-control matrix

Rolling ground balls, AUTO (inside of the foot); median distance (m) with the heavy share:

| Speed | BC 10 | BC 30 | BC 50 | BC 70 | BC 80 | BC 90 | BC 99 |
|---|---|---|---|---|---|---|---|
| 2 m/s (D 0.22) | 0.03 | 0.02 | 0.01 | 0.01 | 0.01 | 0.00 | 0.00 |
| 5 (0.51) | 0.13 | 0.09 | 0.06 | 0.04 | 0.03 | 0.01 | 0.01 |
| 8 (0.81) | 0.42 (8 %) | 0.27 | 0.15 | 0.08 | 0.05 | 0.03 | 0.01 |
| 12 (1.21) | 1.24 (52 %) | 0.76 (26 %) | 0.41 (8 %) | 0.17 | 0.10 | 0.05 | 0.01 |
| 16 (1.62) | 2.63 (77 %) | 1.58 (61 %) | 0.82 (32 %) | 0.32 (6 %) | 0.17 | 0.07 | 0.02 |
| 20 (2.02) | 4.66 (88 %) | 2.78 (78 %) | 1.42 (57 %) | 0.55 (16 %) | 0.28 (2 %) | 0.10 | 0.03 |
| 25 (2.54) | 7.74 (94 %) | 4.84 (88 %) | 2.49 (76 %) | 0.90 (37 %) | 0.45 (11 %) | 0.15 | 0.04 |
| 30 (3.04) | 10.5 (96 %) | 7.04 (93 %) | 3.69 (82 %) | 1.42 (56 %) | 0.65 (22 %) | 0.21 (2 %) | 0.07 |

The bouncing (rising at 0.30 m) and low aerial (0.40 m, dropping 25°) matrices are in `evidence/rk_tables.md` and on the matrix page. Both use the raised inside foot, the instep or the sole.

## 12. Thigh-control matrix

Forced THIGH, ball at 0.95 m dropping 35°:

| Speed | BC 10 | BC 30 | BC 50 | BC 70 | BC 80 | BC 90 | BC 99 |
|---|---|---|---|---|---|---|---|
| 3 m/s (D 0.37) | 0.26 | 0.21 | 0.15 | 0.09 | 0.07 | 0.04 | 0.02 |
| 5 (0.61) | 0.62 (6 %) | 0.47 (4 %) | 0.35 | 0.21 | 0.15 | 0.08 | 0.03 |
| 8 (0.98) | 1.29 (56 %) | 0.98 (38 %) | 0.73 (12 %) | 0.43 (2 %) | 0.29 | 0.15 | 0.05 |
| 12 (1.48) | 2.38 (82 %) | 1.83 (72 %) | 1.28 (54 %) | 0.77 (18 %) | 0.51 (6 %) | 0.27 | 0.08 |
| 16 (1.98) | 3.68 (88 %) | 2.85 (84 %) | 1.99 (75 %) | 1.18 (49 %) | 0.80 (18 %) | 0.45 (2 %) | 0.15 |
| 20 (2.44) | 4.98 (92 %) | 3.91 (88 %) | 2.75 (83 %) | 1.64 (66 %) | 1.13 (44 %) | 0.60 (8 %) | 0.27 |
| 24 (3.31) | 7.52 (98 %) | 5.53 (94 %) | 3.90 (89 %) | 2.35 (79 %) | 1.59 (65 %) | 0.86 (25 %) | 0.38 |

The same D spreads further on aerial surfaces than on the ground. An airborne error travels freely until the ball lands; on the ground, turf friction acts at once.

## 13. Chest-control matrix

Forced CHEST, ball at 1.32 m dropping 20°:

| Speed | BC 10 | BC 30 | BC 50 | BC 70 | BC 80 | BC 90 | BC 99 |
|---|---|---|---|---|---|---|---|
| 4 m/s (D 0.54) | 0.71 (19 %) | 0.56 (12 %) | 0.39 (4 %) | 0.23 | 0.16 | 0.09 | 0.04 |
| 6 (0.79) | 1.32 (56 %) | 1.01 (38 %) | 0.71 (20 %) | 0.42 (5 %) | 0.29 | 0.16 | 0.06 |
| 8 (1.05) | 2.02 (76 %) | 1.55 (66 %) | 1.08 (44 %) | 0.64 (17 %) | 0.43 (6 %) | 0.24 | 0.08 |
| 12 (1.57) | 3.60 (90 %) | 2.77 (84 %) | 1.94 (73 %) | 1.12 (47 %) | 0.76 (23 %) | 0.41 (4 %) | 0.12 |
| 16 (2.06) | 5.37 (94 %) | 4.18 (92 %) | 2.96 (84 %) | 1.74 (68 %) | 1.23 (50 %) | 0.73 (20 %) | 0.41 |
| 20 (2.57) | 7.35 (96 %) | 5.67 (94 %) | 3.98 (90 %) | 2.44 (78 %) | 1.73 (67 %) | 1.11 (44 %) | 0.75 (6 %) |
| 25 (3.22) | 9.51 (98 %) | 7.59 (97 %) | 5.47 (93 %) | 3.36 (86 %) | 2.39 (80 %) | 1.62 (70 %) | 1.20 (50 %) |

Above 12 m/s into the chest, BC 99 still has the surface limit: 0.41 m at 16 m/s, 0.75 at 20 and 1.20 at 25.

## 14. Head-control matrix

Forced HEAD, ball at 1.78 m dropping 15°:

| Speed | BC 10 | BC 30 | BC 50 | BC 70 | BC 80 | BC 90 | BC 99 |
|---|---|---|---|---|---|---|---|
| 3 m/s (D 0.57) | 0.95 (35 %) | 0.73 (21 %) | 0.52 (6 %) | 0.32 | 0.22 | 0.12 | 0.05 |
| 5 (0.91) | 2.07 (78 %) | 1.63 (66 %) | 1.18 (48 %) | 0.73 (13 %) | 0.50 (4 %) | 0.28 | 0.10 |
| 8 (1.44) | 4.11 (91 %) | 3.24 (88 %) | 2.32 (81 %) | 1.44 (62 %) | 0.99 (36 %) | 0.54 (6 %) | 0.19 |
| 12 (2.14) | 7.22 (98 %) | 5.59 (95 %) | 4.11 (89 %) | 2.60 (80 %) | 1.82 (73 %) | 1.06 (38 %) | 0.53 |
| 16 (2.86) | 10.6 (99 %) | 8.21 (98 %) | 6.08 (94 %) | 3.86 (90 %) | 2.75 (82 %) | 1.61 (68 %) | 0.92 (14 %) |
| 20 (3.57) | 14.1 (99 %) | 10.8 (98 %) | 8.02 (97 %) | 5.13 (93 %) | 3.63 (88 %) | 2.19 (80 %) | 1.33 (62 %) |

The head is the hardest surface (m 1.6, vAbs only 6 m/s). Even BC 99 leaves the ball 0.5–1.3 m away above 12 m/s. AUTO would take the hard 15 m/s, 25° benchmark on the chest instead (shown on the BENCH row).

## 15. The interactive control lab

`sandbox/visual/receive_kill1_lab.html`

**Controls:**
- sliders for Ball Control (1–99), incoming speed, arrival height, descent angle (vertical velocity, + dropping, − rising), bearing and lateral offset;
- surface: AUTO / FOOT / THIGH / CHEST / HEAD, or a single foot surface;
- the draw (five standardised examples or keyed seeds 1–40);
- benchmark presets, camera, play / scrub / 1× – 0.1×, and the BC ladder.

**Views:**
- a gameplay / 3D view: the real character on the placeholder body, the ball, the green ghost IDEAL ball, the paths and the CONTACT marker;
- a side view and a top view with the stick figure.

**Panel:** every number is shown —
- the incoming state;
- AUTO's comparison;
- D with its parts;
- E, σ and the draws;
- ideal vs actual exit;
- residual and lateral / vertical errors;
- distances at 0.25 / 0.5 / 1.0 / 2.0 s;
- the state and the fingerprint.

## 16. Ideal-vs-actual trajectory visualization

Both the matrix and the lab draw both results:
- **IDEAL:** the green dashed path, the green ring at the intended point, the green ghost ball;
- **ACTUAL:** the orange path, orange dot at 2.0 s.

The **BC ladder** shows, for the current draw, where BC 10 … 99 each put the ball. At BC 99 the two paths overlap; as the rating falls on a hard ball they separate along the same direction (the same draw, rescaled).

The matrix page (`sandbox/visual/receive_kill1.html`) has 11 tabs: GROUND, BOUNCE, LOW, THIGH, CHEST, HEAD, HEIGHT, DROP, ENERGY, SIDE and BENCH. Each tab has:
- one incoming ball per row, ten rating columns;
- a side view (height) and a top view (lateral) in every cell;
- the distance, residual speed, lateral error, distances at 0.25 / 0.5 / 1 s and the control state;
- the 200-seed median / p90 / heavy / lost overlay;
- a click opens all numbers and an "open in the lab" link.

The page computes the cells itself, with the same code as Node (Chrome = Node, item 21).

## 17. Residual-speed measurements

Residual speed is the ball's speed just after the contact. Mean / median over 200 seeds (m/s):

| Benchmark | BC 10 | BC 50 | BC 80 | BC 99 | Ideal |
|---|---|---|---|---|---|
| EASY 2 m/s | 0.4 / 0.4 | 0.4 / 0.4 | 0.4 / 0.4 | 0.4 / 0.4 | 0.39 (the cushion's give) |
| HARD 22 m/s | 5.7 / 5.3 | 3.1 / 2.8 | 1.2 / 1.1 | 0.3 / 0.3 | 0.31 |
| THIGH 6 m/s | 1.2 / 1.1 | 0.8 / 0.8 | 0.6 / 0.6 | 0.6 / 0.5 | ~0.55 (the pop) |
| CHEST 8 m/s | 2.3 / 2.2 | 1.4 / 1.2 | 0.7 / 0.7 | 0.5 / 0.5 | 0.48 |

For a foot kill the ideal itself keeps 0.3–0.4 m/s: the ball rolls the last few cm to the settle point. So distance, not residual speed, is the error measure. Per cell and rating, `evidence/rk_distribution.json` records `residMean` and `residMed`.

## 18. Placement-error measurements

Each cell and each run measures:
- the distance from the intended point at 0.25, 0.5, 1.0 and 2.0 s;
- the distance from the ideal ball at the same times;
- the lateral error at 1.0 s (signed, the surface's lateral axis);
- the vertical error (the post-contact peak height vs the ideal's).

Medians and 90th percentiles are in items 10–14 and `evidence/rk_tables.md`. Examples at 22 m/s:
- **The lateral error grows with the rebound:** with the TYPICAL draw it is 2.22 m at BC 10, 0.79 at BC 50, 0.14 at BC 80 and 0.01 at BC 99.
- **Vertical errors are small on the foot.** Ground kills can only lift the ball, by a few cm. They are larger on the thigh and head, where the pop's height varies.

## 19. Multi-seed distribution results

`evidence/rk_distribution.json` holds 74 incoming balls (all 11 matrices including the benchmarks) × 10 ratings × 200 keyed seeds = 148 000 kills. Each cell has:
- mean, median and 90th-percentile distance;
- mean and median residual speed;
- the heavy share (> 1.2 m) and the lost share (> 4.5 m);
- the full control-state counts.

`evidence/rk_tables.md` renders them all. Nothing was tuned to a possession percentage: the constants were set against the owner's qualitative descriptions of the 2 m/s and 22 m/s benchmarks (items 9–10). Every other cell follows from the same formula and the rigid-body ball.

## 20. Performance

Node, one process, run alone (`evidence/rk_cpu.json`). Times in milliseconds.

| Surface | Runtime per kill | Worst | Plan | Ideal | Execution | Launch | Candidates | Shared predictor |
|---|---|---|---|---|---|---|---|---|
| FOOT | 0.18 | 0.37 | 0.16 | 0.001 | 0.0003 | 0.017 | 1924 | 1.27 |
| THIGH | 0.12 | 0.32 | 0.11 | 0.001 | 0.0001 | 0.011 | 1319 | 1.10 |
| CHEST | 0.04 | 0.06 | 0.03 | 0.001 | 0.0001 | 0.011 | 200 | 0.76 |
| HEAD | 0.05 | 0.10 | 0.04 | 0.001 | 0.0003 | 0.011 | 644 | 0.72 |

A RECEIVE-CONTROL-1.1 receive costs 16 ms. The plan is a closed-form evaluation over the free-ball prediction, which is the match's shared predictor. There is no contact search.

**The ideal exit speed.**
- It is a table lookup: 15 columns, each built once from the kernel in 69 ms.
- That replaced an earlier kernel secant that cost 8–21 ms per kill.

**Other costs:**
- The test harness's pass solve (building a ball that arrives exactly as specified) takes 1–15 ms. It is not part of a receive.
- One post-contact second of free ball costs 0.5–0.9 ms.

**Matrix generation:**
- the 80-cell ground matrix: 0.23 s in Node, about 0.3 s in the page;
- all 74 balls × 10 ratings × 200 seeds: 69 s wall (11 processes).

## 21. Deterministic / matched-seed verification

From `evidence/rk_determinism.json` and `evidence/rk_chrome_node.json`:

| Check | Result |
|---|---|
| Draw keys and values | Identical for BC 10 … 99: 112/112 seed sets |
| The executed error is the same vector × E(BC, D) | 1034/1034 uncapped executions exactly (max deviation 3.5e-15); 86 executions hit a physical cap |
| Replay | 112/112 |
| Seeds differ | 98/98 |
| A fresh world from the pass's launch with one `schedule()` vs the matrices' snapshot path | 126/126 bit-identical |
| Animation on vs off (the body posed at every tick) | 14/14 |
| Chrome vs Node (decisions, executed launch, ball 3 s later) | 45/45 bit-identical |

The authoritative chain uses only `+ − × ÷`, `sqrt` and the kernel's deterministic `dsin`, `dcos`, `dexp`, `dlog` and `datan2`.

## 22. Regression verification

| What | Result |
|---|---|
| DRIBBLE-V1, same process, before / after 650 kills | 60/60 identical; frozen evidence 48/48 |
| RECEIVE-CONTROL-1.1 review cases, before / after the kills | 11/11 |
| D1 / RX / RXE parameter objects | Unchanged (`rk_regression.json`) |
| RECEIVE-CONTROL-1.1's own DRIBBLE-V1 regression | 60/60 + 48/48 |
| RECEIVE-CONTROL-1.1 matrix of record, rerun | 714/714 identical to `receive11/evidence/matrix_714.json`, CPU fields excluded |
| 65 hashed files (DRIBBLE-V1, TURN-1.2, RUN-1.3, BALL-PHYS / BALL-FEEL, the RNG and attributes, RECEIVE-CONTROL-1 and 1.1) | Identical (`frozen_sha256_end_check.txt`) |

RECEIVE-KILL-1 adds only new files; no shared RECEIVE-CONTROL-1.1 infrastructure changed.

## 23. Known limitations

- **Placeholder body.** It is procedural (`rk_body.js`) and not in the ball's world, so a run-through ball passes through the legs visually. Production clips must meet `RECEIVE_KILL1_ANIMATION_CONTRACT.md`; its warp limits are a proposal.
- **One contact.** The kill's result is the free ball. The follow-up touch (the foot after a chest or thigh control, or a second touch after a loose kill) is not modelled.
- **Owner's isolation.** The receiver is stationary in clean conditions: no opponent, pressure, fatigue, Agility, Dribbling or weak foot. Both feet are used with no weak-foot term; the preferred foot is a tie-break only.
- **Test passes.** The incoming balls are built by solving the pass that produces the requested arrival. All rows match it to under 1 µm except one bouncing row (8 m/s, rising 12°), where it is within 1.7 cm and 0.02 m/s. The actual arrival is reported in that row's header.
- **Spin is simplified.** Aerial passes arrive without spin. Exits are spin-free in the air and rolling on the turf.
- **Same D, different spread.** The same D spreads further on aerial surfaces than on the ground (item 12). That is physical, but it makes thigh, chest and head look harsher at the same speed. Owner call: lower their `k` or `m` if the review finds them too harsh.
- **Not locked.** The constants are calibration values: eFloor, eSkill, γ, Dc, the surface weights, capabilities, error shapes and the planner's shift cost.
- **Not wired into RECEIVE-CONTROL-1.1.** The kill model is not yet used by RECEIVE-CONTROL-1.1's CUSHION family, which still uses its own `rx_exec.js`. Integration is a later step.

## 24. Review links

All are local only; the lab server runs on `http://127.0.0.1:8361`.

| What | Where |
|---|---|
| Review page | `review_artifacts/receive_kill1/review/RECEIVE_KILL1_REVIEW.html` → `http://127.0.0.1:8361/review_artifacts/receive_kill1/review/RECEIVE_KILL1_REVIEW.html` |
| Calibration matrix | `http://127.0.0.1:8361/sandbox/visual/receive_kill1.html?m=GROUND` (tabs; `&draw=seed3`, `&zoom=near1`, `&dist=1`) |
| Control lab | `http://127.0.0.1:8361/sandbox/visual/receive_kill1_lab.html?v=22&bc=50&draw=TYPICAL` (`&h=1.32&drop=20&surface=CHEST`, `&cam=broadcast`) |
| Animation contract, handoff, status | `RECEIVE_KILL1_ANIMATION_CONTRACT.md`, `RECEIVE_KILL1_HANDOFF.md`, `RECEIVE_KILL1_STATUS.json` |
| Evidence | `evidence/`: distribution, tables, scaling, determinism, Chrome/Node, CPU, regression, frozen hashes, body contact |
| Clips | `videos/`: 24 clips (8 benchmarks × BC 10 / 50 / 99, TYPICAL draw) |
| Still strips and matrix screenshots | `sheets/`, `stills/`, `screens/` |
