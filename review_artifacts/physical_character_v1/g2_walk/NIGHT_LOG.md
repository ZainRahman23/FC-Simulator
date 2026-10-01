# G2b–G2e overnight log (2026-10-01)

The user approved G2a (checkpoint `6f1ef85`) and authorised G2b → G2c → G2d → G2e, each gated on evidence. Not in scope: G3, running, the Reference Tackle, push.

Each entry: problem → investigation → change → result → remaining problem.

## 0. Starting point

- **Rhythm ξ plan.** The G2a rhythm's capture-point plan is symmetric about the midpoint between the feet: ξ_ini = m + k(p_st − m), ξ_td = m − k(p_st − m).
  - This makes the double support carry the forward / lateral transfer (ξ behind the new foot at touchdown).
  - That is the "settle over each foot / lift-pause" look.
- **No stance-leg velocity feed-forward in single support.** Stance damping (≈ 290 N·s/m, C2 finding) would brake a walk.

## 1. G2b design (first pass)

- **Walking ξ plan.** The periodic LIPM solution with a FINITE double support, the CoP moving linearly from the trailing to the leading foot over Tds:
  - c = Δ·κ / (E1·E2 − 1) along the walk, and Δ·κ / (E1·E2 + 1) laterally (the mirrored gait);
  - κ = (E2 − 1)/(ω·Tds), E1 = e^{ω·Tss}, E2 = e^{ω·Tds}.
- **DCM foothold law** (feed-forward, from the plan's own ξ): Δ = (E2·(ξ_eos − p_st) − c_next)/κ. It reduces to the nominal step when periodic and adapts to early / late touchdowns. The executor's measured-ξ foothold adjustment stays on top.
- **Planned COM.** ċ_d = ω(ξ_d − c_d) gives the stance legs a velocity feed-forward in single AND double support.
- **Timing from speed.**
  - Human walk ratio ≈ 0.0063 m per (step/min) → cadence = √(60·v / 0.0063).
  - Double support = 20 % of each step (≈ 10 % of the cycle per double support, ≈ 20 % in total).
- **Reference.** of_loco WALK at the requested speed, as authored (no in-place adaptation).
- **Contacts.** Heel-strike landing given as a toe height. Heel rocker after contact.

## 2. First forward walk attempts (G2b_walk08, 0.8 m/s)

- **Bug.** The step list inherited `fwd: 0` from the in-place helper → a zero-length walk. Fixed: walking steps carry no `fwd`, so the nominal comes from the speed.
- **Then.** The first step is 42 cm; the COM accelerates to 0.58 m/s along the planned ξ. The trailing foot cannot leave: its toe drags, the 0.25 s liftoff timeout expires, and a corrective step follows.
- **Investigation.**
  - The trailing leg reaches FULL extension: hip–ankle 0.927 m = L1 + L2 (0.484 + 0.443) at the end of single support, with the foot flat.
  - At pelvis ≈ 0.96 m, a flat trailing foot lets the hip lead it by at most ≈ 0.30 m.
- **MEASURED RIGID-FOOT LIMITATION.**
  - The collider boot is 0.358 m long; its only pivot is the toe edge, 0.277 m ahead of the ankle.
  - A loaded heel rise needs W × 0.277 ≈ 208 N·m of plantar-flexion against the V1.1 envelope ≈ 150 N·m. So the heel can only rise when that foot carries < ≈ 72 % BW, i.e. in double support.
  - A human pivots at the metatarsal heads (≈ 0.15 m → ≈ 110 N·m), so the heel rises from mid-stance.
  - A 20° heel rise would raise the hip's lead over the trailing ankle from 0.30 → 0.49 m. That is the human mechanism this foot lacks.
- **Decision (conservative, reversible).** Keep the approved body.
  - Pre-swing heel rise in double support: the trailing foot's CoP is confined to its toe edge, it unloads across the double support, and its heel-rise target has a consistent velocity.
  - Double support ends when the trailing foot has actually unloaded.
  - A toe joint stays an option, documented, NOT built.
- **Also seen.** From standing, the first step under-accelerates (0.45 vs 0.8 m/s), ξ lags its plan, and the CoP demand stays on the trailing foot. Fix: a speed ramp over the first steps.

## 3. Iterations 02:00 → 10:00 — no stable forward walk yet

Every change below is OPT-IN under `rhythm.walk` / `human.walk` (G1 / G2a code paths untouched). Test: `G2b_walk08`, the matrix runner (`$SP/g2/mat.mjs`), and `G2b_dbg`.

### 3.1 Measured mechanisms (each confirmed by trace)

| # | Problem | Measurement | Change | Result |
|---|---|---|---|---|
| a | The ankle tracking the step-start plan braked the walk | v 0.49 → 0.18 m/s in single support | `plan.kXi` per axis: along the walk 0, sideways 0.5 (`kXiErr`) | Braking gone. The sideways error then went uncorrected, so it was kept sideways. |
| b | The stance ankle has almost no sideways authority in late stance | Arbiter envelope on ankle roll **±9 N·m** (the approved direction-weighted budget, plantar-flexion dominates) → CoP shift ≈ 1.2 cm | none (approved actuator model, not touched) | **Limitation.** Sideways balance has to come from double-support CoP and foot placement. |
| c | The trailing foot still carried 150–300 N at the end of double support with a commanded share of 0 | Arbiter terms: ankle damping 86–111 N·m, knee damping −250 N·m, stance hold +200 N·m; the trailing leg posed from the desired pelvis was regulating body height (pelvis 1.4 cm low) | (1) the unloading leg's pose takes the ACTUAL pelvis height as it unloads; (2) PRE-SWING RELEASE: its stiffness and damping follow its planned share down to 15 % (the landing-compliance equilibrium-point form — gravity and commanded torques kept) | Trailing load at liftoff 230 → 60–70 N. A first version that also used the actual pelvis horizontal position dragged the foot 7 cm inward — reverted to height only. |
| d | The trailing toe re-contacted ≈ 25 ms after liftoff (200–380 N) | The swing clearance guard ramped in over the first 10 % of the swing; the commanded pitch (≈ level) was unreachable with the shank tilted back, so the toe hung against the dorsiflexion stop | Guard on from liftoff with its margin ramping in; the commanded pitch is the leg's reachable pitch | Toe re-contact gone. |
| e | The partial sideways placement gain (0.6) diverges by construction | One step multiplies a sideways ξ error by E1·E2/κ ≈ 6.5 (Tss 0.55) — 12 at the human walk ratio's 0.69 s stance at 0.4 m/s; leaving 40 % uncorrected grows it ≈ 2.6× per step | Gain options 0.85 / 1.0 tested | Not sufficient alone. |
| f | Foot placement can only correct one sideways direction | The boots (16.4 cm wide) set a minimum step width ≈ 0.20 m; nominal 0.22 leaves 2 cm of room | Wider nominal widths (0.26–0.34) tested; **adaptive single-support duration** (`adaptT`: the stance lasts as long as the measured offset needs to reach the nominal width) | Not sufficient alone. |
| g | The first transfer from standing was short by 1.2–2 cm | With the sensitivity above → the first step needed 0.43 m width (clamp 0.34) and the error cascaded | `firstTol`: the first transfer ends when the measured ξ reaches its target | Not sufficient alone. |
| h | The min-jerk sideways transfer ignored the body's momentum at touchdown (starts at zero velocity) | It demanded 1.2 m/s sideways transfers; the CoP lagged → overshoot past the new foot | `latDS: "track"`: every tick, the LIPM boundary solution for the CoP now (ramping onto the new foot) that lands ξ at the next stance's offset, clamped to the feet; double support extends (bounded) until reached | Sideways offsets at stance start tightened to 5–13 cm (target ≈ 6). |
| i | Double-support timing | Human total double support at 0.8 m/s ≈ 28–30 % of the cycle (stance ≈ 64 %), not 20 % | `dsFrac` 0.29 option | Not decisive. |
| j | Large pelvis yaw in walking | ±15–20° per step (G2a in place: 5° max). Whole-body vertical angular momentum −0.9 → +2.5 kg·m²/s: an external couple in double support (trailing foot pushes forward, leading foot brakes, feet 0.3–0.45 m apart → ≈ 12 N·m); the arms swing WITH the legs in double support | — | **Open.** It rotates the walk against the planner's heading frame (alternating long/short, wide/narrow steps). |

### 3.2 Where it stands

- **v ≈ 0.** The walking planner holds 20/20 steps with G2a timing. But that is a large sideways limit cycle: widths pinned at the clamp, ξ swinging 12–30 cm.
- **0.4 / 0.6 / 0.8 m/s.** 56 configurations of the options above (timing, width, gain, timing adaptation, landing, double-support form, monitor corrective steps on / off). **All fall within 2–7 steps** — sideways (a fall over the outside of the stance foot) plus the yaw rotation.
- **Speed sensitivity.** Outcomes flip with tiny speed changes (0.001 and 0.1 walk, 0.05 and 0.15 fall): a marginally stable sideways mode.

### 3.3 Honest assessment

- The DCM walker fights this body on the sideways axis. Three facts combine:
  - weak sideways ankle authority in late stance (approved budget);
  - a 0.20 m minimum step width (boot geometry);
  - the step's exponential sensitivity.
- The yaw coupling of a wide gait makes it worse.
- No change so far has been a hidden force. All are planner / gain / timing / compliance changes.
