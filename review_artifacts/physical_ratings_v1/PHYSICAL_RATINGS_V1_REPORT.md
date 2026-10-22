# PLAYER PHYSICAL RATINGS V1 — report (22 Oct 2026)

## ▶ PLAYABLE URL: **http://127.0.0.1:8361/sandbox/visual/phys1.html**

- **What it opens on:** PHYSICAL-80-B, with PHYSICAL-99 running beside it as the reference. B is only a starting point; switch with the **PHYSICAL** buttons.
- **Status:** BALL OFF. LOCAL ONLY (the character is a real player's model). Nothing is frozen. **Stopped for your playtest.**
- I cannot play video in real time. Every number here comes from the simulation (node and headless Chrome) or from screenshots.

**What is decided and what is still open:**

| Item | State |
|---|---|
| Sprint Speed 99 = 38 km/h | owner decision |
| Acceleration 99 = D38 | owner decision |
| Agility 99 = A99-C | owner decision |
| CARRY-B | owner decision: the provisional D99 / BC99 ball-on envelope |
| Sprint Speed mapping | approved, implemented exactly |
| Acceleration mapping | provisional |
| Agility metric and its scales A / B / C | provisional; you choose a scale by playing it |
| Dribbling / Ball Control 1–98 | not calibrated |
| Skill moves | none added |

---

## 1. CARRY-B approved (recorded; nothing changed)

CARRY-B is recorded as the provisional D99 / BC99 ball-carrying envelope (`ballon_pace_v1/STATUS.json`, memory). Its implementation is preserved as it was:

- `ballon1/` is untouched.
- The `phys1/` copy without a rating set is **bit-identical** to `ballon1` with CARRY-B, ball on, CONTROLLED (`r_equiv.mjs`, 6/6 seeded 30 s torture programs).

The actual implementation values (`ballon1/carry_env.js`) next to the brief's rounded numbers:

| | Implementation | Brief |
|---|---|---|
| Open sprint | 0.915 × 38 = **34.77 km/h** (9.6583 m/s) | ~34.8 |
| Tight-control region | 0.70 × 38 = **26.60 km/h** (7.389 m/s) | ~26.6 |
| Knock-on ceiling | 0.96 | — |
| Per-touch cost | 0.32 | — |
| 40 m (from rest) | **4.808 s** | ~4.81 |
| 100 m (from rest) | **11.021 s** | ~11.02 |

---

## 2. SPRINT SPEED — the approved mapping, exact

`phys1/ratings.js` `sprintKmh(r)` and `sprintMs(r)`. The rating is clamped to 1–99, and the mapping is computed in integer tenths of a km/h, so no rounding drift accumulates:

```
90–99   tenths = 353 + 3·(r − 90)     (35.3 + 0.3·(r − 90) km/h)
40–89   tenths = 253 + 2·(r − 40)     (25.3 + 0.2·(r − 40))
1–39    tenths = 214 + 1·(r − 1)      (21.4 + 0.1·(r − 1))
m/s = tenths / 36   (99: the S99 build's own 38 / 3.6, bit for bit)
```

**Validation (`r_ratings.mjs`):**
- **Every rating 1–99:** all 98 steps are exactly 0.1 / 0.2 / 0.3 km/h in their band, with **0 errors**.
- **The brief's list:** all **23/23** values are exact (99 38.0 · 95 36.8 · 90 35.3 · 89 35.1 · 85 34.3 · 80 33.3 · 75 32.3 · 70 31.3 · 60 29.3 · 50 27.3 · 40 25.3 · 39 25.2 · 30 24.3 · 20 23.3 · 10 22.3 · 1 21.4, plus 91–98).
- **Continuity:** 39 → 40 is 25.2 → 25.3 and 89 → 90 is 35.1 → 35.3. Both are ordinary steps of their bands, with no jump.
- **Clamping:** 0 and −5 → 21.4; 120 → 38.0.
- **S80 = 9.25 m/s exactly** (333 / 36). In the sim, PHYSICAL-80's measured peak is 9.2500 m/s.
- **S99** equals 38 / 3.6, bit-identical to the S99 build.

The full 1–99 grid is in `PHYSICAL_RATINGS_V1_TABLES.md`.

---

## 3. ACCELERATION — the provisional rating → profile model

### Capability: one number that means one measurable thing

**c** is the owner's three bands:

| Band | Points per rating |
|---|---|
| 90–99 | 1.5 |
| 40–89 | 1.0 |
| 1–39 | 0.5 |

This gives 99 = 100 %, 95 = 94 %, 90 = 86.5 %, 80 = 76.5 %, 50 = 46.5 %, 20 = 26.5 % and 1 = 17 %.

**What c means:** it is the mean, over the 25 / 50 / 70 / 80 / 90 / 95 % milestones of the available vmax, of *(Acc99's time ÷ this rating's time)*, measured at the same top speed. In other words, it is the rating's normalised velocity-acquisition rate, independent of Sprint Speed.

### The curve: D38's family, with its shape changing (not D38 × c)

```
a(v) = a0 · max( 1 − (v / vmax)^p , aEnd )          (Acceleration 99 = the D38 object itself: a0 11.11, p 2.2, aEnd 0.7)
p    = 1 + 1.2 · c^1.5           the mid-speed persistence falls first
aEnd = 0.7 · c                    the late taper's floor (vmax is always reached)
a0   = D38's launch × L           L solved by bisection so that the MEASURED capability equals c exactly
```

The velocity is integrated exactly as the movement integrates it (s += a(s)·DT per 240 Hz tick). There are no velocity steps and no input latency. Acceleration applies to every gain: standing start, walk / jog / run → sprint, after a cut, after braking.

### Milestone table (in the sim, S99 · A99 · from rest — the same 38 km/h for every row)

The milestone times compare velocity acquisition alone.

| Acc | c (measured in the sim) | launch | p | 25 % | 50 % | 70 % | 80 % | 90 % | 95 % | 99 % vmax | 10 m | 40 m |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **99** | 100 % | 11.11 | 2.20 | 0.24 | 0.51 | 0.80 | 1.00 | 1.33 | 1.64 | 2.17 | 1.55 | 4.42 |
| **90** | 86.5 % | 10.00 | 1.97 | 0.27 | 0.58 | 0.92 | 1.17 | 1.57 | 1.95 | 2.58 | 1.63 | 4.52 |
| **80** | 76.5 % | 9.15 | 1.80 | 0.30 | 0.65 | 1.04 | 1.33 | 1.80 | 2.25 | 2.98 | 1.71 | 4.61 |
| **70** | 66.5 % | 8.23 | 1.65 | 0.33 | 0.74 | 1.20 | 1.54 | 2.10 | 2.65 | 3.50 | 1.80 | 4.74 |
| **60** | 56.5 % | 7.28 | 1.51 | 0.38 | 0.86 | 1.41 | 1.82 | 2.51 | 3.19 | 4.20 | 1.91 | 4.91 |
| **50** | 46.5 % | 6.24 | 1.38 | 0.45 | 1.03 | 1.71 | 2.23 | 3.10 | 3.96 | 5.21 | 2.05 | 5.16 |
| **40** | 36.5 % | 5.11 | 1.26 | 0.56 | 1.30 | 2.18 | 2.87 | 4.02 | 5.16 | 6.77 | 2.26 | 5.51 |
| **20** | 26.5 % | 3.87 | 1.16 | 0.75 | 1.77 | 3.01 | 3.98 | 5.63 | 7.26 | 9.49 | 2.57 | 6.08 |
| **1** | 17.0 % | 2.58 | 1.08 | 1.15 | 2.74 | 4.70 | 6.25 | 8.88 | 11.50 | 15.00 | 3.10 | 7.07 |

- **Launch** is in m/s². All times are in seconds.
- **The sim agrees with the model:** the capability measured from the sim's own milestone times equals the mapping at every anchor (±0.04 %).
- **Full table:** 14 anchors, with the 5 / 20 m splits and the late floor, in `PHYSICAL_RATINGS_V1_TABLES.md`.

### How the requested character comes out

The launch falls less than the build does:

| Acc | Launch (share of D38's) | Requested character | How it comes out |
|---|---|---|---|
| **99** | 11.1 m/s² (100 %) | explosive launch, strong build, late taper | D38 itself |
| **80** | 9.15 m/s² (82 %) | good launch, clearly slower build | reaches 25 % of vmax only 0.06 s later than 99, but 80 % takes 1.33 s vs 1.00 and 95 % takes 2.25 vs 1.64 |
| **50** | 6.24 m/s² (56 %) | reasonable but much slower acquisition | 95 % in 3.96 s |
| **20** | 3.87 m/s² (35 %) | poor without looking broken | 95 % in 7.3 s, but 10 m still in 2.57 s |

### Independence proof

**S99 / Acc50 vs S50 / Acc99**, from rest — speed in km/h:

| | 0.5 s | 1 s | 1.5 s | 2 s | 3 s | 4 s | 5 s | 6 s | 8 s | Own 90 / 95 / 99 % | 10 m | 40 m |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **S99 / Acc50** | 10.4 | 18.6 | 24.6 | 28.9 | 33.9 | 36.2 | 37.4 | **38.0** | 38.0 | 3.10 / 3.96 / 5.21 s | 2.05 | 5.16 |
| **S50 / Acc99** | 17.4 | 24.9 | 26.9 | **27.3** | 27.3 | 27.3 | 27.3 | 27.3 | 27.3 | 0.95 / 1.18 / 1.55 s | 1.77 | 5.72 |

- S99 / Acc50 eventually runs **38.0 km/h**, but slowly.
- S50 / Acc99 is at its **27.3 km/h** ceiling within 2 s.
- The two archetypes cross at **3.48 s / 23.0 m**: the quick-starting slow runner leads up to there, the slow-starting fast runner after.
- **Acceleration never changes vmax:** S80 with Acc80 / 50 / 20 / 1 peaks at 9.2500 m/s every time, given 30 s.

---

## 4. AGILITY — a measurable redirection rating

### Definition

**Agility** is how quickly and efficiently the travel can be redirected.

- **What it governs:**
  - the time to establish the new line;
  - the speed sacrificed in doing so;
  - how closely the travel follows a changing request;
  - the support solution: steps and braking.
- **What it does not govern:**
  - top speed;
  - the acceleration after the turn;
  - input latency (the request is heard on the same tick at every rating);
  - ball skill.
- **It is not a yaw-rate cap.** Every rating keeps A99-C's own redirection envelope; Agility only makes that envelope more demanding **in proportion to the demand**.

### REDIRECTION DEMAND (per heading request, 0–1)

```
Dm = clamp( (min(s / 10.56, 1.2) · sin(θ / 2))^1.5  +  0.6 · clamp(s · |ω| / 12),  0, 1 )
```

- **The first term** is the velocity change the request asks for, |Δv| = 2 s sin(θ/2), normalised by the 99 player's top speed:

  | Request | Demand |
  |---|---|
  | 15° at 20 km/h | 0.02 |
  | 30° at 38 km/h | 0.13 |
  | 90° at 38 km/h | 0.59 |
  | 120° at 38 km/h | 0.81 |
  | 180° at 38 km/h | 1.00 |

- **The second term** is the travel's own turning: a request made while already turning hard, s|ω| in m/s², is more demanding. This covers repeated steering and circles.

### Agility capability g, and what it does (`s_movement.js` envelope(), `ratings.js`)

Agility 99 is the A99-C profile object itself (g = 1: nothing changes).

```
reorientation duration × (1 + 2.0 · (1 − g) · Dm)             more time, more braking / support steps
retention  =  A99-C's retention ^ (1 + 4.5 · (1 − g) · Dm)     more speed sacrificed, smoothly at every angle; the exponent ≥ 1,
                                                               so never above A99-C's ceiling; a 180° keeps 0 % at every rating
a HELD curve (request turning while the travel turns, entry rate ω0): at most  11 / (1 − g)  m/s² of lateral acceleration —
                                                               above it the speed is given up at the braking rate, never the line
stop (stick released) duration × (1 + 2.0 · (1 − g) · min(s / 10.56, 1)^1.5)
facing time constant × (1 + 0.6 · (1 − g))                     (the body's facing only)
```

**Why it separates with demand:** the penalty is proportional to the demand, and A99-C's own retention for a gentle retarget is 1.0, and 1.0 to any power is 1.0. So low demand stays human and the ratings spread out as the demand grows. A 15° adjustment at 20 km/h takes 0.03 s and loses 0 % of the speed at **every** rating on every scale. A 10°/s curve at 38 km/h lags 0.2° at every rating.

### The three scaling candidates

All three have A99 = A99-C exactly. They differ only in how fast g falls below 99:

| Scale | 90–99 | 40–89 | 1–39 | 90 | 80 | 70 | 60 | 50 | 40 | 20 | 1 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **A · compressed** | 1.0 / pt | 0.6 / pt | 0.3 / pt | 91 % | 85 % | 79 % | 73 % | 67 % | 61 % | 55 % | 49.3 % |
| **B · balanced** (= Acceleration's bands) | 1.5 | 1.0 | 0.5 | 86.5 % | 76.5 % | 66.5 % | 56.5 % | 46.5 % | 36.5 % | 26.5 % | 17 % |
| **C · pronounced** | 2.0 | 1.2 | 0.4 | 82 % | 70 % | 58 % | 46 % | 34 % | 22 % | 14 % | 6.4 % |

Sustainable curve acceleration at Agility 80:

| A80-A | A80-B | A80-C |
|---|---|---|
| 73 m/s² | 47 m/s² | 37 m/s² |

### Anchor tables (S99 · Acc99 · BALL OFF; each cut from a 4 s full sprint at 38 km/h; mean of 4 stride phases)

Each cell reads **new-line time (s) / momentum retained / lowest speed (m/s)**:
- **new-line time:** from the request until the travel holds the new line within 5° above 1 m/s;
- **momentum retained:** the speed when the reorientation completes ÷ the entry speed. This is Agility alone: no speed is gained before the reorientation completes, so Acceleration cannot hide the difference.

| | 60° | 90° | 120° | 150° | 180° |
|---|---|---|---|---|---|
| **A99 (all scales)** | 0.17 / 95 % / 10.1 | 0.27 / 81 % / 8.6 | 0.38 / 57 % / 6.1 | 0.47 / 16 % / 1.6 | 0.57 / 0 % / 0 |
| A80-A | 0.19 / 94 % / 10.0 | 0.32 / 74 % / 8.0 | 0.47 / 42 % / 4.6 | 0.69 / 5 % / 0.5 | 0.71 / 0 % |
| **A80-B** | 0.20 / 93 % / 9.9 | 0.35 / 71 % / 7.6 | 0.52 / 35 % / 3.9 | 0.80 / 3 % / 0.3 | 0.79 / 0 % |
| A80-C | 0.20 / 93 % / 9.9 | 0.37 / 68 % / 7.3 | 0.55 / 31 % / 3.5 | 0.87 / 2 % / 0.1 | 0.85 / 0 % |
| A50-A | 0.21 / 93 % / 9.8 | 0.38 / 67 % / 7.2 | 0.57 / 29 % / 3.3 | 0.90 / 2 % | 0.88 / 0 % |
| **A50-B** | 0.23 / 91 % / 9.7 | 0.44 / 60 % / 6.5 | 0.70 / 19 % / 2.3 | 1.11 / 1 % | 1.07 / 0 % |
| A50-C | 0.25 / 90 % / 9.6 | 0.48 / 56 % / 6.1 | 0.77 / 15 % / 1.9 | 1.23 / 1 % | 1.20 / 0 % |
| A20-B | 0.26 / 90 % / 9.6 | 0.50 / 53 % / 5.8 | 0.82 / 13 % / 1.7 | 1.30 / 0 % | 1.27 / 0 % |
| A1-B | 0.27 / 89 % / 9.5 | 0.53 / 50 % / 5.6 | 0.88 / 11 % / 1.4 | 1.39 / 0 % | 1.36 / 0 % |
| A1-C | 0.28 / 89 % / 9.4 | 0.57 / 47 % / 5.3 | 0.94 / 9 % / 1.3 | 1.49 / 0 % | 1.46 / 0 % |

At 30° and 45°, every rating is within 0.01–0.05 s and 1–3 % of A99. The demand there is 0.13–0.24.

Support steps until the new line is established, scale B:

| | 90° | 120° | 180° |
|---|---|---|---|
| A99 | 1.3 | 1.8 | 2.5 |
| A80 | 1.5 | 2.3 | 3.5 |
| A50 | 2.0 | 3.0 | 4.8 |
| A1 | 2.3 | 4.0 | 6.0 |

Mean heading error over the first second at 90°: 13.8° (A99) · 17.8° (A80-B) · 22.8° (A50-B) · 27.7° (A1-B).

Time to stable locomotion at 90°: 0.31 s (A99) · 0.39 s (A80-B) · 0.50 s (A50-B) · 0.60 s (A1-B).

**All nine anchors (99 · 90 · 80 · 70 · 60 · 50 · 40 · 20 · 1) × all three scales, with every metric, are in `PHYSICAL_RATINGS_V1_TABLES.md`.** That includes the speed when the line is established, the heading error, the support steps, the time to stable locomotion and the demand.

### Repeated input (4 s from a full sprint): mean heading lag |request − travel| / mean speed (m/s)

| | ±30° every 0.45 s | ±60° every 0.7 s | ±60° every 0.35 s | 0→90→0→−90 every 1.0 s | rapid 90° every 0.5 s | circle 120°/s | fast circle 270°/s |
|---|---|---|---|---|---|---|---|
| **A99** | 12.0° / 9.9 | 29.5° / 7.2 | 50.3° / 4.4 | 10.2° / 9.6 | 22.2° / 8.3 | 2.4° / 10.6 | 5.4° / 10.6 |
| A80-A | 13.1° / 9.8 | 32.4° / 6.4 | 51.5° / 4.2 | 11.8° / 9.3 | 24.2° / 7.7 | 2.8° / 10.6 | 6.5° / 10.6 |
| **A80-B** | 13.7° / 9.7 | 33.6° / 6.1 | 52.3° / 4.1 | 12.7° / 9.1 | 25.1° / 7.4 | 3.1° / 10.6 | 7.0° / 9.7 |
| A80-C | 14.2° / 9.6 | 34.4° / 5.9 | 54.0° / 4.0 | 13.3° / 9.0 | 25.7° / 7.2 | 3.3° / 10.6 | 7.5° / 7.7 |
| **A50-B** | 15.6° / 9.3 | 37.6° / 5.4 | 55.8° / 3.7 | 15.4° / 8.5 | 27.7° / 6.6 | 4.0° / 9.7 | 9.1° / 4.8 |
| A1-B | 17.2° / 9.0 | 41.6° / 5.3 | 56.7° / 3.4 | 17.4° / 8.0 | 31.4° / 5.9 | 4.9° / 6.5 | 11.4° / 3.6 |
| A1-C | 17.8° / 8.9 | 42.1° / 5.2 | 57.0° / 3.3 | 18.1° / 7.8 | 31.5° / 5.8 | 5.1° / 5.9 | 12.1° / 3.4 |

- **±60° every 0.35 s** swings faster than even A99-C can reorient (a 120° swing in 0.35 s), so every rating lags ≈ 50–57°.
- **±60° every 0.7 s** is the cadence that separates the ratings.
- **The circles** separate through the sustainable curve acceleration. A 270°/s circle at 38 km/h asks for 50 m/s², which A99-C holds as its own ceiling.

### Separation from the other attributes

- **Agility vs Acceleration:** the retention figures are read **when the reorientation completes**, and A99-C gains no speed before then. So they are Agility's alone.
  - The "speed when the line is established" is also in the full tables. It equals that speed except for reversals, where the > 1 m/s threshold means re-acceleration.
  - Cut → accelerate (§5) then shows Acceleration rebuilding the speed separately.
- **Agility vs Sprint Speed:** A40 and A1 on all three scales, at S99 / Acc99, reach **38.00 km/h** in a straight line, with splits identical to A99 to the tick (`r_ratings.mjs`).
- **Agility vs Dribbling:** the page is ball off and the ball is never on; nothing about Dribbling is implemented.

---

## 5. PHYSICAL-80 (S80 · Acc80 · Agility 80, BALL OFF): A / B / C differ only in the Agility scale

| | vmax | 5 m | 10 m | 20 m | 40 m | 25 / 50 / 70 / 80 / 90 / 95 / 99 % of its vmax |
|---|---|---|---|---|---|---|
| **PHYSICAL-99** | 10.556 m/s (38.0 km/h) | 1.02 | 1.55 | 2.52 | 4.42 | 0.24 / 0.51 / 0.80 / 1.00 / 1.33 / 1.64 / 2.17 s |
| **PHYSICAL-80** (A = B = C) | **9.2500 m/s (33.3 km/h)** | 1.15 | 1.77 | 2.88 | 5.05 | 0.26 / 0.57 / 0.91 / 1.16 / 1.58 / 1.98 / 2.61 s |

- **The race:** when the 99 passes 40 m (4.417 s), the 80 is at 34.2 m, **5.8 m behind**.
  - In the browser: 5 / 10 / 20 / 40 m in 1.154 / 1.771 / 2.883 / 5.046 s against 1.021 / 1.554 / 2.521 / 4.417 s.
- **Milestones vs the Acceleration table:** they run 0.04–0.37 s quicker than Acc80's row in the Acceleration table, because the vmax is lower and the same curve reaches 90 % of a lower ceiling sooner. Capability is defined at the same vmax; these are at its own.

**Cuts from its own full sprint (9.25 m/s): new-line time / momentum retained / lowest speed (m/s)**

| | 30° | 60° | 90° | 120° | 150° | 180° |
|---|---|---|---|---|---|---|
| PHYSICAL-99 (from 10.56 m/s) | 0.07 / 100 % | 0.17 / 95 % / 10.1 | 0.27 / 81 % / 8.6 | 0.38 / 57 % / 6.1 | 0.47 / 16 % / 1.6 | 0.57 / 0 % |
| **PHYSICAL-80-A** | 0.06 / 100 % | 0.18 / 95 % / 8.8 | 0.29 / 77 % / 7.2 | 0.42 / 48 % / 4.6 | 0.59 / 11 % / 1.0 | 0.67 / 0 % |
| **PHYSICAL-80-B** | 0.06 / 100 % | 0.18 / 94 % / 8.8 | 0.31 / 75 % / 7.0 | 0.46 / 43 % / 4.1 | 0.69 / 7 % / 0.6 | 0.73 / 0 % |
| **PHYSICAL-80-C** | 0.07 / 100 % | 0.19 / 94 % / 8.7 | 0.32 / 73 % / 6.8 | 0.49 / 39 % / 3.8 | 0.75 / 5 % / 0.4 | 0.78 / 0 % |

The 80 enters every cut 1.3 m/s slower than the 99. At a lower speed the same angle is a lower demand, and A99-C's envelope is itself quicker at lower speed. So the 80's cuts are closer to the 99's than the S99 anchor tables suggest; that is what the mappings produce.

**Repeated steering: mean heading lag / mean speed (m/s)**

| | ±30° 0.45 s | ±60° 0.7 s | 0→90→0→−90 1.0 s | rapid 90° 0.5 s | circle 120°/s | fast circle 270°/s |
|---|---|---|---|---|---|---|
| PHYSICAL-99 | 12.0° / 9.9 | 29.5° / 7.2 | 10.2° / 9.6 | 22.2° / 8.3 | 2.4° / 10.6 | 5.4° / 10.6 |
| PHYSICAL-80-A | 12.1° / 8.6 | 30.3° / 5.8 | 10.8° / 8.2 | 22.6° / 6.9 | 2.8° / 9.3 | 6.5° / 9.3 |
| PHYSICAL-80-B | 12.6° / 8.5 | 31.4° / 5.6 | 11.5° / 8.0 | 23.4° / 6.6 | 3.1° / 9.3 | 7.0° / 9.3 |
| PHYSICAL-80-C | 12.9° / 8.5 | 32.2° / 5.4 | 12.0° / 7.9 | 24.0° / 6.5 | 3.3° / 9.3 | 7.5° / **7.6** |

In the fast circle only C slows below its top speed: 36.7 m/s² < 9.25 × 4.71 = 43.6.

**Cut → accelerate:** from the request to 90 % / 95 % of vmax on the new line, and the metres along the new line after 2 s.

| | 45° | 90° | 135° |
|---|---|---|---|
| PHYSICAL-99 | 0.11 / 0.11 s · 20.9 m | 0.62 / 0.93 s · 18.7 m | 1.44 / 1.75 s · 12.6 m |
| PHYSICAL-80-A | 0.11 / 0.11 · 18.3 | 0.82 / 1.23 · 15.9 | 1.82 / 2.22 · 9.2 |
| PHYSICAL-80-B | 0.11 / 0.11 · 18.3 | 0.92 / 1.32 · 15.6 | 1.94 / 2.34 · 8.2 |
| PHYSICAL-80-C | 0.12 / 0.12 · 18.3 | 0.98 / 1.38 · 15.3 | 2.02 / 2.42 · 7.5 |

**Stop → accelerate:** the stick is released at vmax, then the player sprints on.

| | Stop takes | Then 5 m / 10 m / 90 % vmax |
|---|---|---|
| PHYSICAL-99 | 0.39 s | 1.02 / 1.55 / 1.32 s |
| PHYSICAL-80-A | 0.45 s | 1.15 / 1.77 / 1.57 s (as from rest) |
| PHYSICAL-80-B | 0.50 s | same |
| PHYSICAL-80-C | 0.53 s | same |

I did not tune 80 toward any label. These are what the approved Sprint Speed mapping, the provisional Acceleration bands and each Agility scale produce.

---

## 6. Integrity

### Determinism and equivalence (`r_equiv.mjs`)

Seeded torture programs, 6 × 30 s each; every tick's hash, position, speed and ball are compared.

| Check | Result |
|---|---|
| phys1 without ratings ≡ ballon1 · BALL OFF | **IDENTICAL 6/6** |
| phys1 without ratings ≡ ballon1 · BALL ON · CONTROLLED · CARRY-B | **IDENTICAL 6/6** |
| phys1 without ratings ≡ ballon1 · BALL ON · FREE | **IDENTICAL 6/6** |
| PHYSICAL-99 ≡ phys1 without ratings · BALL OFF | **IDENTICAL 6/6** |
| PHYSICAL-99 ≡ phys1 without ratings · BALL ON · CARRY-B | **IDENTICAL 6/6** |
| PHYSICAL-99 BALL OFF ≡ the S99 build (`speed99/`) | **IDENTICAL 6/6** |
| PHYSICAL-80-A / -B / -C and S1 / Acc1 / A1-C, each simulated twice | **IDENTICAL 6/6 each** |

- **In Chrome (`r_browser.cjs`):**
  - the page's own determinism check (V) passes for every preset run;
  - no console errors and no failed requests;
  - ⇄ N replays the identical input through the next preset;
  - the custom rating set (⚙) applies: S50 → 7.5833 m/s = 27.3 km/h.
- **The page uses the same code as the node runs.** Its splits are the same to the tick: PHYSICAL-80 runs 5 / 10 / 20 / 40 m in 1.154 / 1.771 / 2.883 / 5.046 s.

### Feet and body (`s_legs.mjs`, posed every 1/240 s tick; 17 high-speed scenarios × 8 stride phases = 136 runs per set)

| | Runs with a visible failure | Jumps | Knee pops | Crosses | Floats | Swaps | Slides |
|---|---|---|---|---|---|---|---|
| PHYSICAL-99 (= the S99 build) | 52 / 136 | 1 | 53 | 150 | 35 | 0 | 0 |
| PHYSICAL-80-A | 51 / 136 | 5 | 17 | 193 | 59 | 0 | 1 |
| PHYSICAL-80-B | 49 / 136 | 5 | 16 | 176 | 53 | 0 | 0 |
| PHYSICAL-80-C | 48 / 136 | 4 | 16 | 138 | 45 | 0 | 0 |
| S99 / Acc99 / A1-C (extreme) | 48 / 136 | 16 | 17 | 80 | 75 | 0 | 0 |

The ratings add **no new failure class**:
- **Where the failures are:** the same scenarios as the existing S99 build: 150° / 180° reversals, ±60° every 0.35 s, the 270°/s circle, the hard stop.
- **Clean scenarios:** the straight sprint, gentle and sustained curves, 30–90° cuts and stop → sprint are clean for every 80.
- **Small differences between sets:**
  - the 80s float a little more in reversals: a longer, slower turn spends longer near zero speed;
  - they knee-pop less in the fast circle, because they run it slower.
- **Not fixed here:** these leg failures belong to the S99 build's support layer. Fixing them was out of scope: the brief said to preserve current systems.

### CPU (`r_cpu.mjs`, 4 × 60 s torture, best of 3 interleaved rounds)

| | CPU per simulated second | Worst tick |
|---|---|---|
| No ratings | 8.2 ms | 1.6 ms |
| PHYSICAL-99 | 8.6 ms | 1.5 ms |
| PHYSICAL-80-A / -B / -C | 8.1–8.4 ms (**−2 … +3 %**) | 1.2–2.8 ms |

PHYSICAL-99 runs exactly the same code path as "no ratings" and still reads +5 %, so differences of this size are measurement noise. An earlier run on the model before its final retention form read +2–4 %. The rating set adds no measurable cost.

### Known limitations

1. **The Agility constants are provisional choices, the same for all three scales:**

   | Constant | Value |
   |---|---|
   | Duration factor | 2.0 |
   | Retention exponent | 4.5 |
   | Turning-demand weight / reference | 0.6 / 12 m/s² |
   | Curve capacity | 11 / (1 − g) m/s² |
   | Facing | 0.6 |

   The scales differ only in g. If no scale feels right, these constants are the second lever.
2. **A99-C's ceilings stay:** ±60° every 0.35 s cannot be followed by any rating, and A99 holds a 270°/s circle at 38 km/h (≈ 50 m/s²). Both are A99-C's own behaviour and were kept on purpose (Agility 99 = A99-C).
3. **Turning from a standstill costs nothing in A99-C's travel model:** speed builds at once along the eased heading. So Agility does not change a turn made from rest (stop → accelerate backwards equals forwards). Agility acts on moving redirection only.
4. **Reversals (150° / 180°) take "new line" to mean > 1 m/s on the new line,** which includes about 0.1 s of re-acceleration from near zero. The Agility-only figure there is the retention at the end of the reorientation (≈ 0 %).
5. **The leg failures listed above already exist** in the S99 build and are not addressed here.
6. **Ball-on play with lower ratings is not built:** the page forces the ball off. CARRY-B's envelope multiplies the physical vmax, so it would scale with Sprint Speed, but how much of the physical ability Dribbling lets you use is the future Dribbling scale and is not implemented.

---

## 7. The page (`phys1.html`)

- **PHYSICAL:**
  - **PHYSICAL-99 / PHYSICAL-80-A / -B / -C** switch at once.
  - **⇄ N** replays this session's input through the next preset.
  - **"reference runner beside (99 ⇄ 80)"**: PHYSICAL-99 runs beside an 80, and the last 80 you played runs beside the 99. Same input, 2.5 m to the side.
- **Playtest (your tests first):**
  - standing sprint 0–40 m (both-runners camera) · long straight sprint 100 m;
  - gentle curve · 15° adjustment at 20 km/h;
  - 30 / 45 / 60 / 90 / 120 / 150 / 180° cuts;
  - repeated ±30° · repeated ±60° (0.7 s and 0.35 s);
  - fast circle 270°/s · circle 120°/s;
  - 0→90→0→−90 · rapid 90° changes;
  - cut → accelerate 90° / 135° · stop → accelerate.
  - **▶ TOP SPEED RUN** and **▶ EXPLOSION TEST** stay in the top bar.
- **HUD (right):**
  - current speed;
  - **SPRINT SPEED** rating → vmax;
  - **ACCELERATION** rating → capability, launch, current % vmax (bar) and the rating's milestone times;
  - **AGILITY** rating → scale, capability and curve capacity;
  - **REDIRECTION DEMAND** of the current motion (live);
  - **LAST REDIRECTION**: angle, entry speed, demand, **NEW LINE** time, **MOMENTUM RETAINED**, lowest speed;
  - this run's splits against the reference runner's.
- **⚙ diagnostics:** **CUSTOM RATINGS** (Sprint / Acc / Agility / scale → ▶ apply; e.g. S99 / Acc50 or S50 / Acc99), plus the existing replay, camera and body debug.
- **Unchanged:** `ballon1.html` (BALL-ON PACE V1, CARRY-B) and every other page.

## Decisions for you

1. **Agility scale:** play PHYSICAL-80-A / -B / -C and choose A, B or C, or say which direction to move.
2. **The Acceleration curve:** does Acc80 feel like "good launch + slower build"? If it doesn't, the levers are p (the persistence through the mid speeds) and the launch share.
3. **Whether the resulting 80 / 80 / 80 athlete feels correctly rated** — none of its three ratings was tuned toward a label.
