# SPEED-99-V1: Sprint Speed 99 + Acceleration 99, ball-off (21 Oct 2026)

> **Update, the same evening:** the playtest blocker (manual play capped at RUN's 5.3 m/s) is fixed on the page. See `PLAYTEST_FIX_REPORT.md`. The candidates are unchanged.

**Presented for your playtest.**
- Nothing is frozen and nothing is integrated.
- Ratings 1–98 are not defined.
- **LOCAL ONLY:** the character is a real player's model.
- Ball-off only: the ball-on comparison (CONTROLLED-99-PACE) comes after you choose a ceiling.

I cannot play video in real time. Every judgement below comes from the simulation, posed-body audits and browser screenshots. How fast it feels is yours to judge on the page.

Your brief is in `sources/`, verbatim; the § numbers below are its sections. Tags:
- **[MF]** measured in football
- **[MT]** measured in track
- **[INF]** inference
- **[DESIGN]** a gameplay choice

The research, with every source, is in `RESEARCH.md`.

---

## The playground

# ▶ `http://127.0.0.1:8361/sandbox/visual/speed99.html`

- **Defaults:** BALL OFF, BC99 / D99 / A99-C, FULL, the joystick, candidate **B**, with a **reference runner** at CURRENT pace.
- **`SPRINT SPEED + ACCELERATION 99`** (top bar): `CURRENT` / `A` / `B` / `C`.
  - CURRENT is TC-CONTROLLED-1's movement, bit-identical (48 / 48 runs).
  - `⇄ same input → next pace (N)` replays your own last input through the next candidate.
- **The reference runner:** a second player in a lane 2.5 m to the side, driven by the same input at another pace (or off). The panel shows who is ahead and by how much.
- **The pace panel:**
  - speed in m/s and km/h;
  - the candidate and its top speed;
  - this run's distance, time and top speed;
  - the 5 / 10 / 20 / 30 / 40 / 60 m splits, the reference's beside them.

  A run starts when you push the stick from rest, or press SPRINT after not sprinting.
- **Playtest → SPEED-99 pace presets:**
  - 0–5 / 0–10 / 0–20 / 0–30 m, long sprint 0–60 m (with cones);
  - walk / jog / run → sprint;
  - 45° / 90° / 120° / 180° + accelerate;
  - sprint → stop / release / jog;
  - repeated sprint / 90° cuts;
  - a curved sprint.
- **Other controls:**
  - The BALL checkbox exists but says what it is: ball-on is **not yet adapted** to 99 pace.
  - The ball model, poke and release are behind ⚙.
  - `tc_controlled1.html` is unchanged.

**Checked in Chrome:**
- 8 / 8 preset runs are deterministic.
- The page's splits equal node's to the hundredth.
- `⇄ next pace` replays identical input.
- Node ≡ browser on 8 sessions.
- No console or HTTP errors.

---

## 1. Research (§2): what a 99 should be

| | measured | source |
|---|---|---|
| Fastest match speeds | 37.0–37.4 km/h (10.3–10.4 m/s): Premier League record 37.38 km/h, Bundesliga 37.16 km/h | [MF] 25 Hz optical tracking (error ±0.4–0.7 m/s) |
| Typical elite match peaks | 29–32 km/h | [MF] |
| National-team footballers, from first movement | 10 m 2.01 s, 20 m 3.24 s, 30 m 4.39 s, 40 m 5.51 s; V0 9.2 ± 0.4 m/s | [MF] Haugen 2019 / 2020 |
| The acceleration curve | v(t) = vmax(1 − e^(−t/τ)), i.e. acceleration falls **linearly** with speed; τ ≈ 1.0–1.1 s for footballers *and* sprinters | [MF/MT]. LaLiga's pooled tracking line fits R² 0.979 |
| Where top speed is reached | 99 % of vmax at about 40 m (step 28) | [MF] Takai 2025 |
| Fast footballers at speed | 9.33 m/s: step 1.98 m × 4.73 Hz, contact 0.104 s, flight 0.108 s | [MF] |
| First four steps | 1.21 m × 4.58 Hz, contact 0.148 s; step rate plateaus after about step 4 | [MF] |
| Bolt (track contrast) | about 12.3 m/s; 10 m about 1.75 s from first movement | [MT] |
| Height / mass vs speed in adult elite players | no robust effect | [MF] |

**The conclusion [INF]:** a 99 is mostly a higher top speed with a normal-shaped curve. Nobody accelerates with a tiny τ. The research suggests getting responsiveness from zero input latency and strong acceleration out of moving starts, not from τ below about 0.95 s.

## 2. The current movement, audited (§3)

**CURRENT, measured in the real simulation with the ball off** (`evidence/matrix.txt`)
- **Top speed:** 8.0 m/s (28.8 km/h), reached by about 10 m and capped there.
- **From standing:** 10 m 2.05 s, 20 m 3.30 s, 30 m 4.55 s, 40 m 5.80 s, 60 m 8.30 s.
- **The first steps from standing** (speed at 0.1 / 0.3 / 0.5 / 1.0 s): 0.68 / 1.91 / 3.0 / 5.18 m/s.

| What | Today | Verdict |
|---|---|---|
| top-speed cap | SPRINT = 8.0 m/s, set **by Agility** (lerp 6.6–8.0) | **historical constraint**: Sprint Speed did not exist; Agility carried it |
| acceleration | aAcc 7.0 m/s², set **by Agility** (lerp 3.6–7.0) | **historical constraint** (the same) |
| acceleration curve | A99-C's advance(): aAcc · clamp(1 − s/11, 0.35, 1), stopped at 8 m/s | the linear shape is right ([MF]); the numbers are history: no acceleration past about 10 m, where real players keep accelerating to about 40 m |
| launch | full acceleration on the first tick (first speed gain after 0.008 s), no input latency | deliberate; kept |
| velocity smoothing | none on the authoritative speed | kept |
| speed tiers | the request: WALK 1.5 / JOG 3.2 / RUN 5.3 / SPRINT (stick zones .40 / .72, sprint button). The actual speed changes continuously | deliberate control scheme; kept (RUN 5.3 = the good RUN, §9) |
| **acceleration while steering** | A99-C allows no speed gain until a turn "motion" completes, and **every analog change starts a new motion**: with the stick turning even 20°/s and SPRINT held, the player stays at **jog speed (3.28 m/s) for 4 s**; at 5°/s, 3.6 → 5.2 m/s | **implementation constraint**: the rule's intent ("no speed restored by a re-request") never meant a curve can't accelerate. Probably part of the "not a 99" feel |
| A99-C above 8 m/s | its envelope scales reorientation time and loss with speed **up to 8 m/s only** (clamp(s / 8, 0, 1)) | **constraint** once top speed exceeds 8: a 180° from 10.35 m/s got the 8 m/s reversal's 0.42 s, about 30 % more braking than A99-C itself defines, and the body could not support it |
| re-acceleration after cuts | A99-C: no gain until the reorientation completes, then the baseline's law | A99-C's rule; kept |
| braking / relaunch | aBrake 9.5 m/s² (lower requests); A99-C's own stop (stopTime 0.34 s, scaled with speed) | A99-C / baseline; kept (not Speed or Acceleration) |
| stride frequency | RUN-1's baked table: 2.7 → 4.55 steps/s, held from 9.5 m/s | presentation; extended for the candidates |
| hidden acceleration cadence | below 3 m/s while accelerating, steps capped at 0.23 s; above 3 m/s the steady table: **at the 4th step the cadence drops from 4.3 to 2.9 steps/s** (period jump 50 %, length 99 %) | **constraint**: replaced for the candidates by a continuous acceleration gait |
| top-speed stance | the landing lead stops growing at 0.27 m (5 m/s); contact 0.102 s at 9.5 m/s | presentation; fine at 8 m/s, too long for 10 m/s (§6) |
| acceleration lean | none: lean = f(speed), 12° at ≥ 6 m/s; the drawn trunk is 5–9° all the way through a sprint start | added for the candidates |
| body-size pace penalties | **none**: no height, mass or weight anywhere in the movement path; leg length is used by the pose only | §19: nothing to remove |

## 3. The candidates (§4, §5, §13)

**Sprint Speed (vmax) and Acceleration (the curve) are separate parameters** (`speed99/pace.js`).
- The curve is the measured linear acceleration–velocity profile: a(v) = a0 (1 − (v / vmax)^p), with a0 = vmax / τ.
- It is held at a small floor near vmax, so vmax is actually reached, at about 35–40 m.
- RUN / JOG / WALK speeds, braking and A99-C's envelope are unchanged.

| | top speed | τ | a0 | shape | what it is |
|---|---|---|---|---|---|
| **CURRENT** | 8.0 m/s (28.8 km/h) | (≈ 1.57) | 7.0 m/s² | linear, capped | today |
| **A · elite realistic** | 10.0 m/s (36.0 km/h) | 1.10 s | 9.1 m/s² | linear | [INF] the tested national-team V0 + 2–2.5 SD; the 36 km/h class of league peaks |
| **B · exceptional football ceiling** | 10.35 m/s (37.3 km/h) | 1.05 s | 9.9 m/s² | linear | [INF] the league-record top speeds; a0 ≈ Bolt's |
| **C · responsive gameplay ceiling** | 10.35 m/s | 0.95 s | 10.9 m/s² | p 1.35 (more acceleration through the middle speeds) | **[DESIGN]** beyond the human data: 10 m faster than Bolt's from first movement |

**Interaction rules with A99-C** (§10, §11): A99-C's redirection timing and retention are unchanged at and below 8 m/s.
1. **Acceleration while steering.** During a retarget that A99-C itself says costs no speed (retention ≥ 0.995: an analog curve, a small correction), the speed may rise.
   - The gain is limited by a friction circle on the lateral acceleration (9 / 10 / 11 m/s² for A / B / C).
   - Real cuts keep A99-C's rules exactly.
2. **A99-C above 8 m/s.** Its own speed scaling continues (v up to vmax / 8), so above its old ceiling it keeps the braking and redirection capability it defines, not a harsher one.
   - A 90° cut from 10.35 m/s retains 81 % of entry speed (84 % at 8 m/s) and takes 0.31 s instead of 0.275 s.

Agility still does **not** mean full speed through everything: at a 90° cut from top speed, B drops from 10.35 to 8.38 m/s, and a 180° still stops to zero first.

## 4. Distance and time tables (§15)

Times are from the press (simulation, ball off); speeds are at the mark.

| From standing | 5 m | 10 m | 20 m | 30 m | 40 m | 60 m | top | 90 % / 95 % of top |
|---|---|---|---|---|---|---|---|---|
| CURRENT | 1.37 s @6.4 | 2.05 @8.0 | 3.30 | 4.55 | 5.80 | 8.30 | 8.0 m/s | 1.67 / 1.83 s |
| A | 1.25 @6.8 | 1.90 @8.2 | 3.03 | 4.07 | 5.07 | 7.07 | 10.0 | 2.53 / 3.29 s (15 / 22 m) |
| B | 1.20 @7.0 | 1.83 @8.6 | 2.92 | 3.92 | 4.89 | 6.82 | 10.35 | 2.42 / 3.14 s (15 / 22 m) |
| C | 1.09 @7.7 | 1.68 @9.2 | 2.70 | 3.67 | 4.64 | 6.57 | 10.35 | 1.77 / 2.26 s (11 / 16 m) |
| *national-team mean [MF]* | — | *2.01* | *3.24* | *4.39* | *5.51* | — | *≈ 9.0–9.2* | — |

Speed at 0.1 / 0.3 / 0.5 / 1.0 s from standing:

| | 0.1 s | 0.3 s | 0.5 s | 1.0 s |
|---|---|---|---|---|
| CURRENT | 0.68 | 1.91 | 3.0 | 5.18 m/s |
| A | 0.87 | 2.39 | 3.66 | 5.98 m/s |
| B | 0.94 | 2.58 | 3.93 | 6.36 m/s |
| C | 1.07 | 3.0 | 4.61 | 7.37 m/s |

| Rolling starts: 10 m / 20 m / 40 m | walk → sprint | jog → sprint | run → sprint |
|---|---|---|---|
| CURRENT | 1.85 / 3.10 / 5.60 | 1.63 / 2.88 / 5.38 | 1.40 / 2.65 / 5.15 |
| A | 1.74 / 2.87 / 4.90 | 1.57 / 2.68 / 4.72 | 1.37 / 2.46 / 4.49 |
| B | 1.68 / 2.77 / 4.73 | 1.52 / 2.60 / 4.56 | 1.34 / 2.39 / 4.35 |
| C | 1.55 / 2.58 / 4.51 | 1.42 / 2.44 / 4.37 | 1.27 / 2.27 / 4.21 |

**Slowing down:**

| | sprint → release (RUN) | sprint → jog | sprint → stop |
|---|---|---|---|
| CURRENT (from 8 m/s) | 0.28 s, 1.9 m | 0.50 s | 0.33 s, 1.3 m |
| B (from 10.35 m/s) | 0.53 s, 4.1 m | 0.75 s | 0.39 s, 2.05 m |

These are A99-C's and the baseline's braking, not Speed's.

**Curved sprint** (jog → sprint with the stick turning 20°/s), speed after 1 / 2 / 4 s:

| | 1 s | 2 s | 4 s |
|---|---|---|---|
| CURRENT | 3.28 | 3.28 | 3.28 m/s (never accelerates) |
| A | 7.20 | 8.82 | 9.96 m/s |
| B | 7.54 | 9.22 | 10.35 m/s |
| C | 8.37 | 9.83 | 10.35 m/s |

## 5. After a cut (§12)

Each run is at top speed, then the stick snaps by the angle and is held with SPRINT.

| | entry | min | new line at | speed then | 7 m/s again | 90 % / 95 % of own top | along the new line in 1 / 2 / 3 s |
|---|---|---|---|---|---|---|---|
| **45°** CURRENT | 8.0 | 7.88 | 0.08 s | 7.92 | 0.17 s | 0.17 / 0.17 s | 7.9 / 15.9 / 23.9 m |
| 45° B | 10.35 | 10.17 | 0.08 | 10.23 | 0.18 | 0.18 / 0.18 | **10.2 / 20.5 / 30.9** |
| **90°** CURRENT | 8.0 | 6.72 | 0.20 | 6.93 | 0.38 | 0.46 / 0.62 | 6.7 / 14.7 / 22.7 |
| 90° A | 10.0 | 8.14 | 0.23 | 8.42 | 0.33 | 0.98 / 1.74 | 7.6 / 17.0 / 26.9 |
| 90° B | 10.35 | 8.38 | 0.23 | 8.70 | 0.33 | 0.99 / 1.71 | **7.9 / 17.6 / 27.8** |
| 90° C | 10.35 | 8.38 | 0.23 | 8.70 | 0.33 | 0.77 / 1.27 | **8.0 / 18.0 / 28.3** |
| **120°** CURRENT | 8.0 | 5.12 | 0.30 | 5.45 | 0.98 | 1.06 / 1.22 | 4.6 / 12.4 / 20.4 |
| 120° B | 10.35 | 5.91 | 0.33 | 6.46 | 0.72 | 1.95 / 2.68 | 5.0 / 13.7 / 23.4 |
| 120° C | 10.35 | 5.91 | 0.33 | 6.46 | 0.64 | 1.49 / 1.98 | 5.2 / 14.4 / 24.6 |
| **180°** CURRENT | 8.0 | 0 | 0.96 | 3.21 | 2.01 | 2.09 / 2.25 | −0.1 / 5.3 / 13.1 |
| 180° B | 10.35 | 0 | 1.01 | 4.15 | 1.65 | 2.89 / 3.61 | −0.6 / 5.8 / 14.6 |
| 180° C | 10.35 | 0 | 0.91 | 4.14 | 1.39 | 2.24 / 2.73 | −0.4 / 6.9 / 16.5 |

**Repeated 90° cuts over 12 s** (mean speed / net distance):

| | mean speed | net distance |
|---|---|---|
| CURRENT | 7.2 m/s | 64.8 m |
| A | 8.0 m/s | 72.3 m |
| B | 8.3 m/s | 75.3 m |
| C | 8.8 m/s | 80.0 m |

**Reading these honestly:**
- Out of 45–120° cuts, every candidate is clearly more dangerous in absolute terms: more metres in the first 1–3 s, and back above 7 m/s sooner.
- Relative to their own higher top speed, A and B take longer to get back to 95 %. That is what a linear curve does near vmax ([MF]).
- **The 180° gains least:** A99-C stops the player to zero first, so the first metres out of a full reversal are a standing start. Only C gains noticeably there.
- If the post-cut explosion still feels short in your hands, the lever is the Acceleration curve's middle (C's p), not A99-C.

## 6. Making the body explain it (§7–9, §16–18)

Presentation only, and only for the candidates. CURRENT's pose is unchanged, and the RUN at RUN speeds is RUN-1 exactly.

**Changes**
- **The acceleration gait.** While the plan is driving hard, the steps are quicker and the contacts longer: about 4.0 steps/s at the first step, reaching 4.7 by the 4th; contact 0.20 s falling to 0.105 s. The feet land under or just behind the body at first.
  - It blends continuously into RUN-1's table as acceleration fades. CURRENT's 3 m/s cadence cliff is gone.
  - B's 2nd–4th steps: 4.26 → 4.5 → 4.7 Hz, contact 0.165 → 0.127 s, length 0.80 → 1.20 m (measured first four steps [MF]: 4.58 Hz, 0.148 s, 1.21 m).
- **Top-speed cadence.** Above 8 m/s the cadence rises to 4.8 Hz at most. At 10.35 m/s that gives 2.16 m steps at 4.8 Hz, contact 0.085 s and flight about 0.12 s ([MF] fast footballers 4.73 Hz × 1.98 m at 9.33 m/s).
  - The step does not simply get longer, and playback is not sped up (§18). The authoritative velocity is the attribute; the gait follows it.
- **The top-speed stance fits the leg.** The landing lead is 0.33–0.35 m and the contact ends about 0.52 m behind. Before this, a toe-off about 0.7 m behind the hips pulled the drawn pelvis down for a tick.
- **The acceleration lean** (3° per m/s², capped at 30°). The **drawn trunk**, measured on the posed skeleton (`evidence/trunk_lean.txt`):

| | first steps | 1 s | top speed |
|---|---|---|---|
| CURRENT | 5–6° | 8° | 9° |
| B | 25° | 17° | 10° |
| C | 28° | 18° | 9–10° |

**Body integrity** (`evidence/body.txt`, `body_cut_sweep.txt`), ball off:

| | CURRENT | A / B / C |
|---|---|---|
| planted-foot slides (any scenario) | 0 | 0 |
| foot jumps / intersection frames on straight, rolling-start, curved, 45 / 90 / 120° | 0 | 0 |
| 180° (one entry phase) | 0 / 0 | A 0 / 6 · B 0 / 0 · C 1 / 0 |
| cut sweep, 4 angles × 6 entry phases: intersection frames (90 / 120 / 150 / 180°) | 16 / 11 / 60 / 38 | A 0 / 0 / 0 / 10 · B 0 / 0 / 14 / 0 · C 0 / 3 / 4 / 18 |
| cut sweep: foot jumps at 180° | 3 | A 2 · B 2 · C 3 |
| cut sweep: flights > 0.15 s (90 / 120 / 150 / 180°) | 2 / 6 / 4 / 6 | A 0 / 3 / 5 / 2 · B 4 / 5 / 5 / 2 · C 0 / 1 / 1 / 1 |
| pelvis "pops" (a 60 fps frame > 1.5 cm off its neighbours) | standing sprint 41, steady RUN 35 | 37–55 standing sprint |

The pelvis pops are pre-existing: they come from the pose's leg-reach compression, which CURRENT's approved RUN has too.

## 7. CPU (§26)

Ball off, 8 programs × 60 s, idle machine (`evidence/cpu.txt`):

| ms per simulated second | whole step | decision | movement | support | body (60 fps) | tick p99 / worst |
|---|---|---|---|---|---|---|
| CURRENT | 5.6 | 4.2 | 3.0 | 0.8 | 5.1 | 0.11 / 2.2 ms |
| A | 5.6 | 4.1 | 3.0 | 0.9 | 4.8 | 0.13 / 2.4 |
| B | 5.6 | 4.2 | 3.0 | 0.9 | 4.8 | 0.14 / 2.4 |
| C | 6.7 | 5.2 | 4.1 | 0.9 | 4.7 | 0.16 / 2.4 |

No meaningful regression. Collision is not applicable with the ball off. The reference runner costs the page one more simulation and pose.

## 8. Known compromises and open points

1. **C is beyond human data** ([DESIGN]): it is faster than Bolt over 10–20 m. A and B sit inside the measured football ceiling.
2. **The two A99-C interaction rules (§3) are mine.**
   - The first lets the player accelerate through analog curves.
   - The second extends A99-C's own scaling above its 8 m/s reference.

   Both leave A99-C exactly as it is at and below 8 m/s, and both are in the copy `speed99/s_movement.js`; Astra's file is untouched. You may want the curve rule for CURRENT too: today's player cannot speed up while steering at all.
3. **Hard cuts and reversals at top speed are still the body's weakest area**, as they already are in CURRENT: occasional foot jumps at 180°, more flights over 0.15 s for B. The A99-C reversal from 10 m/s to zero in about 0.35–0.4 s is very violent, as A99-C defines it.
4. **Braking is unchanged** (A99-C's stop: 10.35 → 0 m/s in 0.39 s over 2.05 m). That's far beyond human deceleration, but it's Agility's, not this task's.
5. **The drawn lean is moderate** (25–28° at the first steps). The research could not verify the oft-quoted 40–45°.
6. **Model 5 m times are the least reliable** ([INF]): the model assumes peak force at t = 0.
7. **The pelvis touchdown compression** (a 1–2 frame dip) exists in CURRENT's RUN too; I left the approved RUN's look alone.
8. **Ball-off only.** CONTROLLED-99-PACE, with long sprint touches and tightening under steering (§22–25), is the next step, once you choose a ceiling.
9. Two small page fixes, page-side only:
   - a playtest ending mid-frame no longer leaves its last request applied for the rest of that frame;
   - BALL OFF no longer draws the untouched start-spot ball. TC-CONTROLLED-1's page has the same cosmetic bug; I left that page alone.

## 9. Your decisions

1. **Which ceiling** (A / B / C, or between them) feels like a 99?
   - Normal-speed play is the test (§27).
   - Try `⇄ next pace` on the same run.
   - Keep the CURRENT reference runner on to see the separation.
2. **Is the post-cut explosion enough** (§5)? If not, more acceleration through the middle speeds (C's p), with A99-C unchanged.
3. **The two interaction rules** (§3): keep them? Should the curve rule also apply to CURRENT?
4. **Then:** the ball-on integration (CONTROLLED-CURRENT-PACE vs CONTROLLED-99-PACE) on the chosen ceiling.

## Evidence (`evidence/`)

| Path | What |
|---|---|
| `matrix.txt` / `.json` | starts, slowing, cuts, repeated, long, curves |
| `body.txt` / `.json` | integrity per scenario, steps |
| `body_cut_sweep.txt` | the 4 × 6 cut sweep |
| `trunk_lean.txt` | the drawn trunk |
| `cpu.txt` | CPU |
| `EQUIVALENCE_CURRENT_vs_TC_CONTROLLED1.txt` | CURRENT ≡ TC-CONTROLLED-1 (48 / 48) |
| `browser/` | screenshots, `s_browser.json`, sessions, `node_vs_browser.txt` |
