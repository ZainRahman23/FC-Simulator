# SPEED-99-V1.1: Sprint Speed 99 = 38 km/h; three Acceleration-99 candidates (21 Oct 2026)

**Your decisions, applied:**
- Sprint Speed 99 = **38.0 km/h** (10.556 m/s, 38 / 3.6 internally) for every new candidate.
- Agility 99 = C.
- **Acceleration 99 is not selected.** Nothing is frozen, there is no ball, and ratings 1–98 are not defined.

**LOCAL ONLY.** Your brief is in `sources/`, verbatim. I cannot play video in real time: everything below comes from the simulation, posed-body audits and Chrome screenshots.

**Playground:** `http://127.0.0.1:8361/sandbox/visual/speed99.html`
- **Pace switch:** `CURRENT` · `C38` · `D38` · `E38` (opens on C38). A / B / C from V1 are under "earlier…".
- **`⇄ same input → next pace (N)`** cycles the four.
- **Reference runner:** CURRENT by default. It can be any pace; pick **C38** to compare only the acceleration.
- **`▶ TOP SPEED RUN`:** 80 m with the both-runners camera.
- **`▶ EXPLOSION TEST`** (new): the first 15 m, cones every 2.5 m, a **close side-on camera** on the player. Try it at 0.5× or 0.25×.
- Sprint as before: SPRINT LOCK / Mode SPRINT / key 4, or hold Shift.

---

## 1. How the candidates were chosen

They come from a study, not picked. `tools/s_accgrid.mjs`; `evidence_v1_1/acceleration_study.txt`.

The Acceleration curve is a(v) = a0 · (1 − (v / vmax)^p), with two parameters:
- **a0, the launch:** acceleration at rest.
- **p, how far into the speeds the launch holds:** p = 1 is the measured linear sprint profile; a larger p keeps more of it through the middle speeds.

All three candidates taper smoothly to 38 km/h. I integrated the curve exactly as the simulation does, over a grid of launch × p.

**The finding: C is conservative in the middle of the curve, not at the launch.** Keeping C's launch (11.1 m/s²) and raising only p:

| p | speed at 0.25 s | 70 / 80 / 90 % of vmax | 10 m | 20 m |
|---|---|---|---|---|
| 1.35 (C) | 2.60 m/s | 0.97 / 1.27 / 1.77 s | 1.66 | 2.67 |
| 2.2 | 2.73 | 0.80 / 1.00 / 1.33 | 1.55 | 2.52 |
| 3.0 | 2.77 | 0.74 / 0.90 / 1.16 | 1.51 | 2.47 |

The first response barely moves (+5–7 %), while the 40 → 90 % transition shortens by up to a third. That matches what you felt. Raising the launch instead mainly shifts the first 0.25 s.

**The candidates**

| | launch a0 | p | meaning |
|---|---|---|---|
| **C38** | 11.1 m/s² (τ 0.95) | 1.35 | C exactly, rescaled to 38 km/h |
| **D38** | 11.1 m/s² (C's launch) | 2.2 | the more explosive Acceleration 99: C's first response, a much stronger middle |
| **E38** | 11.5 m/s² (+3.5 %) | 3.0 | the upper gameplay-responsive ceiling: the middle held hard almost to the taper |

**What the curve actually gives at a given speed:**

| | at rest | at 50 % vmax | at 80 % vmax | near vmax |
|---|---|---|---|---|
| C38 | 11.1 m/s² | 6.8 | 2.9 | → 0.7 |
| D38 | 11.1 | 8.7 | 4.3 | → 0.7 |
| E38 | 11.5 | 10.1 | 5.6 | → 0.7 |

**Guard rails**
- Every candidate keeps a visible acceleration phase: 30 km/h is reached at 1.23 / 0.98 / 0.85 s, about 4–6 steps, never a jump.
- No candidate optimises 99 % vmax at the expense of the build. The 95 → 99 % taper still takes 0.6 / 0.53 / 0.43 s.
- For scale ([MT]): all three exceed any human launch. Bolt's is about 9.5–10 m/s²; this is a gameplay ceiling.

## 2. The curve (simulation, ball off, from standing)

| | 5 m | 10 m | 20 m | 30 m | 40 m |
|---|---|---|---|---|---|
| CURRENT (8 m/s) | 1.37 | 2.05 | 3.30 | 4.55 | 5.80 |
| **C38** | 1.08 | 1.66 | 2.67 | 3.62 | 4.57 |
| **D38** | 1.02 | 1.55 | 2.52 | 3.47 | 4.42 |
| **E38** | 0.98 | 1.49 | 2.45 | 3.39 | 4.34 |

Time to a share of vmax, in seconds:

| | 25 % | 50 % | 70 % | 80 % | 90 % | 95 % | 99 % |
|---|---|---|---|---|---|---|---|
| CURRENT (of 8 m/s) | 0.32 | 0.71 | 1.12 | 1.37 | 1.67 | 1.83 | 1.96 |
| **C38** | 0.26 | 0.58 | 0.97 | 1.27 | 1.77 | 2.26 | 2.86 |
| **D38** | 0.24 | 0.51 | 0.80 | 1.00 | 1.33 | 1.64 | 2.17 |
| **E38** | 0.23 | 0.47 | 0.71 | 0.88 | 1.12 | 1.35 | 1.78 |

Speed at a time, in m/s:

| | 0.25 s | 0.5 s | 0.75 s | 1.0 s | 1.5 s | 2.0 s |
|---|---|---|---|---|---|---|
| CURRENT | 1.62 | 3.00 | 4.18 | 5.18 | 6.77 | 8.00 |
| **C38** | 2.60 | 4.70 | 6.32 | 7.52 | 9.02 | 9.79 |
| **D38** | 2.73 | 5.17 | 7.09 | 8.44 | 9.83 | 10.33 |
| **E38** | 2.86 | 5.54 | 7.67 | 9.08 | 10.23 | 10.56 |

| Rolling starts: 10 m / 20 m | jog → sprint | run → sprint |
|---|---|---|
| CURRENT | 1.63 / 2.88 | 1.40 / 2.65 |
| C38 | 1.40 / 2.40 | 1.25 / 2.25 |
| D38 | 1.31 / 2.27 | 1.18 / 2.14 |
| E38 | 1.25 / 2.21 | 1.14 / 2.09 |

**Where C is conservative.** At 1.0 s, C38 is at 7.5 m/s (71 %); D38 is at 8.4 (80 %) and E38 at 9.1 (86 %). How much faster D38 and E38 are than C38:

| | 0.25 s | 0.5 s | 0.75 s | 1.0 s | 1.5 s |
|---|---|---|---|---|---|
| D38 | +0.13 | +0.47 | +0.77 | +0.92 | +0.81 m/s |
| E38 | +0.26 | +0.84 | +1.35 | +1.56 | +1.21 m/s |

The gap is small at the launch, largest through the middle of the curve (about 1 s, 70–90 % of vmax), then closing as all three taper to 38 km/h.

## 3. After a cut: the same attribute, no bonus

A99-C imposes the momentum loss, and the candidate's own curve rebuilds the speed. There is no special post-cut rule. Each run is at 38 km/h, then the stick snaps by the angle and is held with SPRINT.

| | min | back to 7 m/s | 90 % / 95 % of vmax | along the new line in 1 / 2 s |
|---|---|---|---|---|
| **45°** (all) | 10.36 | 0.19 | 0.19 / 0.19 | 10.4 / 20.9 m |
| **60°** (all) | 10.05 | 0.24 | 0.24 / 0.24 | 9.9–10.0 / 20.5 |
| **90°** C38 | 8.52 | 0.33 | 0.78 / 1.28 | 8.1 / 18.3 |
| 90° D38 | 8.52 | 0.33 | 0.62 / 0.93 | 8.3 / 18.7 |
| 90° E38 | 8.52 | 0.33 | **0.54 / 0.77** | 8.4 / 18.9 |
| **120°** C38 | 5.97 | 0.62 | 1.50 / 2.00 | 5.2 / 14.6 |
| 120° D38 | 5.97 | 0.57 | 1.16 / 1.47 | 5.4 / 15.4 |
| 120° E38 | 5.97 | 0.55 | **1.00 / 1.22** | 5.6 / 15.9 |
| **180°** C38 | 0 | 1.36 | 2.25 / 2.74 | −0.4 / 7.0 |
| 180° D38 | 0 | 1.21 | 1.80 / 2.12 | −0.3 / 8.0 |
| 180° E38 | 0 | **1.14** | **1.59 / 1.82** | −0.2 / **8.6** |
| *CURRENT 180° (8 m/s)* | *0* | *2.01* | *2.09 / 2.25* | *−0.1 / 5.3* |

**Reading the table:**
- 45° and 60° cost almost nothing (A99-C keeps 95–98 % of entry speed), so the candidates are equal there.
- From 90° up, the stronger middle is the cut → explode-away difference. The player comes out of A99-C's loss at 57–81 % of vmax, exactly where D38 and E38 differ from C38.
- 180° remains a stop to zero, then a standing start.
- **Repeated 90° cuts over 12 s:** mean speed 8.98 / 9.38 / 9.58 m/s (CURRENT 7.2).
- **Curved sprint at 20°/s:** 8.5 / 9.4 / 9.9 m/s after 1 s (CURRENT never accelerates).

## 4. The two movement fixes are preserved

- **Smooth steering keeps accelerating:** all three reach 38 km/h within 2 s while the stick turns 20°/s.
- **A99-C's redirection scales above 8 m/s:** its own scaling continues to 38 km/h.
- **CURRENT ≡ TC-CONTROLLED-1:** 24 / 24 runs.

## 5. Body (§ BODY)

**The changes**
- **Arm drive.** While a candidate accelerates hard, the arm swing grows by up to 45 % and the elbows flex a little more, by the forward acceleration over the next 0.1 s. Steady running is unchanged. This used to be speed-only.
- **The first step is now a push-off.**
  - From standing, every pace (CURRENT included) lifted both feet within 0.03 s, and nothing touched until 0.20 s: a 0.17 s float during the hardest push. At these launches it read as a hop.
  - For the candidates, the push foot stays planted until 0.03 s before the first step lands. A standing stance shortened by the support's early-release rule still counts as standing; otherwise E38's hard launch skipped the start step for a re-step and a 0.16 s float.
  - Now: push foot down 0–0.17 s, a 0.03 s flight, then the first step at 0.20 s, for all candidates.
  - CURRENT is unchanged.
- **The lean is held longer as the middle builds** (drawn trunk, `evidence_v1_1/trunk_lean.txt`):

| | 0.1 s | 0.4 s | 0.6 s | 0.8 s | 1.0 s | 1.3 s | top speed |
|---|---|---|---|---|---|---|---|
| CURRENT | 5° | 6° | 7° | 8° | 8° | 9° | 9° |
| C38 | 28° | 26° | 23° | 21° | 18° | 15° | 10° |
| D38 | 28° | 29° | 26° | 22° | 19° | 14° | 9° |
| E38 | 28° | 30° | 29° | 23° | 18° | 13° | 9° |

- **Stride development, no cadence explosion** (steps 2–4 from standing):

| | step length | cadence | contact |
|---|---|---|---|
| C38 | 0.91 → 1.15 → 1.41 m | 4.3 → 4.6 → 4.7 Hz | 0.15 → 0.11 s |
| E38 | 1.01 → 1.34 → 1.70 m | the same | the same |

  The cadence stays capped at 4.8 Hz.

**Integrity** (`evidence_v1_1/body.txt`, `body_cut_sweep.txt`)
- 0 foot slides in every scenario for every pace.
- **0 foot jumps and 0 intersections** on standing / jog → sprint, 45 / 60 / 90 / 120° + go, the curved sprint and the steady RUN.
- The 180° reversal at 38 km/h has 1 foot jump in each candidate.

Cut sweep (5 angles × 6 entry phases):

| | intersection frames (60 / 90 / 120 / 150 / 180°) | foot jumps at 180° |
|---|---|---|
| CURRENT | 19 / 16 / 11 / 60 / 38 | 3 |
| C38 | 2 / 1 / 0 / 15 / 23 | 2 |
| D38 | 3 / 0 / 4 / 5 / 45 | 3 |
| E38 | 1 / 1 / 0 / 22 / 35 | 4 |

The weak spot is still the 180° reversal from top speed, as for CURRENT. Pelvis pops (the touchdown compression of the approved RUN look) rise with speed.

## 6. CPU (ball off, 8 programs × 60 s)

| | ms per simulated second |
|---|---|
| CURRENT | 6.2 |
| C38 | 7.7 |
| D38 | 7.4 |
| E38 | 7.3 |

Tick p99 is 0.16–0.23 ms. The rise is movement planning that now continues to accelerate through steering. It is not meaningful.

## 7. Verification

- **Chrome:** 8 / 8 preset runs deterministic, the page's splits equal node's, `⇄ next pace` replays identical input, node ≡ browser on 8 sessions, no errors.
- **Manual = scripted** for C38 / D38 / E38 / CURRENT: SPRINT LOCK, Shift and top-bar SPRINT, each with a mouse-dragged stick, produce the same request as the TOP SPEED RUN preset and as node, with |Δspeed| ≤ 3.6·10⁻¹⁵ m/s over 2,400 ticks (`evidence_v1_1/manual_vs_scripted.json`).

## 8. Your decision

**Acceleration 99 = C38, D38, E38, or between.** In my reading of the numbers:
- **D38** is the one that matches your description: C's first response, aggressive continued build, then a smooth taper.
- **E38** is the upper bound: the middle held hard almost to 38 km/h.

Feel decides. Try EXPLOSION TEST at 1× and 0.5×, TOP SPEED RUN with the C38 reference runner, and the 90° / 120° / 180° cut presets.

Then: the ball-on integration (S99 38 km/h + Acc99 + A99-C + D99 + BC99 + CONTROLLED_BALL).

## Evidence (`evidence_v1_1/`)

| Path | What |
|---|---|
| `acceleration_study.txt` | the curve grid the candidates were chosen from |
| `matrix.txt` / `.json` | starts, the curve, cuts (45 / 60 / 90 / 120 / 180°), repeated, long, curves |
| `body.txt` / `.json` | integrity per scenario, steps |
| `body_cut_sweep.txt` | the 5 × 6 cut sweep |
| `trunk_lean.txt` | the drawn trunk |
| `cpu.txt` | CPU |
| `EQUIVALENCE_CURRENT_vs_TC_CONTROLLED1.txt` | CURRENT ≡ TC-CONTROLLED-1 |
| `manual_vs_scripted.json` | the manual = scripted proof |
| `browser/` | screenshots including the explosion test close-ups, `s_browser.json`, `node_vs_browser.txt` |
