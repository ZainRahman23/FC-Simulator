# G2b overnight runway — working log (2026-10-02)

Format per entry: **question → experiment → measurement → conclusion → adopted / reverted.**

The brief:
- Phases 1–10:
  1. new generic swing executor;
  2. isolated matched-state tests;
  3. re-identification;
  4. robust walking basin;
  5. speed envelope;
  6. start/stop;
  7. yaw;
  8. human-likeness;
  9. F2h rerun;
  10. regression.
- Local commits only.
- Every mechanism is opt-in; the approved gates stay bit-identical.

Bench conventions:
- The matched-state step bench is `tools/g2_stepbench.js`.
- Every case replays the same deterministic walk (unified controller, the best configuration of `fa55c9d`, `mU1` maps, the pelvis-rate internal model) up to step K, then changes one thing:
  - a commanded step `req` (with `identFixed`: the unified inner loop keeps its stance reference);
  - a swing variant `var`;
  - a mid-swing change `retarget { tau, d, dT }`.
- The time axis is PHYSICAL time from the moment the step's commands start acting (the step start + 50 ms).

---

## P1-1. A swing executor that plans from the actual foot state (`pc_swingx.js`, opt-in `human.over.swingGen = "x"`)

**Question:** can a swing executor be built that does all of the following?
- It is generic.
- It re-plans from the actual foot state.
- It reports its reachable set.
- It executes as well as the inherited swing.

**Build** (details in the file header):
- **Clock:** the plan runs in physical time. A command computed from the 50 ms-old view acts 50 ms later, so the plan is evaluated at view + 50 ms.
- **Start state:** the actual foot state at that instant, predicted from the view by its own velocity and the plan's acceleration.
- **Horizontal:** quintics in the step's heading frame, ending at rest at the landing pose.
- **Capability:** the reachable landing interval from any state is the exact set of quintic endpoints within the leg's acceleration and speed bounds. It is asymmetric for a moving foot.
- **Infeasible requests** are executed to the nearest reachable point and reported.

**Vertical, round 1:** the boot's lowest point was planned directly.
- **Measured:** the target ran away upward at 3 m/s within 60 ms of the step start.
- **Cause:** an algebraic loop. The ankle's dorsiflexion range forces the toes down when the shank tilts back, and a higher ankle tilts the shank further.
- **Reverted.** Replaced by:
  - an ankle path (base + lift);
  - a clearance guard on the outline's lowest point (commanded attitude, and the actual attitude while it hangs lower);
  - a floor whose descent is gated by the plan's horizontal arrival;
  - continued descent after the planned touchdown (no hover).

**Re-planning from the actual state on every foothold change (60 Hz):**
- **Measured:** the foot velocity oscillated sign from re-plan to re-plan (−0.6 ↔ +1.8 m/s); the walk fell in 3 steps.
- **Cause:** re-anchoring the target to a 50 ms-old (predicted) state at 60 Hz is a high-gain delayed feedback loop.
- **Adopted instead:**
  - foothold and timing changes re-plan from the plan's own state (continuous, C²);
  - the plan is re-anchored to the actual state at liftoff, and when the actual foot has drifted more than 4 cm / 0.8 m/s from it;
  - the reachable set reported to the planner is always computed from the ACTUAL state.

## P2-1. Fixed requests at matched states (4 starts × steps 4, 6 × step 0.20 / 0.27 / 0.34 m; 24 cases per variant)

| executor | swing OK | landing error, forward (cm) | landing error, sideways (cm) | touchdown (s) | min clearance | foot velocity at touchdown, fwd / vert (m/s) |
|---|---|---|---|---|---|---|
| inherited | 24/24 | +2.8 ± 3.0 | +1.2 ± 1.7 | 0.368 | 3.1 cm | +0.18 / −0.39 |
| X, lift spanning 80 % of single support | 20/24 | +2.0 ± 5.5 | +1.4 ± 2.7 | 0.396 | 1.2 cm | +0.70 / −0.92 |
| **X, lift spanning the whole single support (`fC` 1.0)** | **23/24** | **+1.1 ± 4.8** | +2.1 ± 3.0 | 0.384 | 1.0 cm | +0.61 / −0.84 |
| X, arriving 60 ms early | 12/24 (9 early) | +3.3 ± 7.0 | — | — | — | — |

- With the new swing on EVERY step, the unified controller (maps identified under the inherited swing) falls before step K in 36/48 cases. Re-identification is needed (Phase 3).

**The overshoot is not saturation** (`tq.mjs`, per-tick swing-leg torques):
- The swing hip uses ≤ 120 of 230 N·m through the deceleration.
- The foot carries ≈ 0.4 m/s more speed than commanded through mid-swing, and the delayed joint feedback (the joint PD on 50 ms-old state) cannot remove it in time.
- The foot overshoots its command by 4 cm (inherited) / 7 cm (X).

## P2-2. Late foothold changes at matched states (3 starts × steps 4, 6 × change at τ 0.10–0.30 s × ±4 / ±8 cm)

Share of the change executed:

| change | inherited | X |
|---|---|---|
| +8 cm at τ 0.2 / 0.25 / 0.3 | 0.99 / 0.96 / 0.85 | 1.11 / 0.94 / 0.85 |
| −8 cm at τ 0.1 | 0.35 | 0.62 |
| −8 cm at τ 0.2 | 0.12 | 0.44 |
| −8 cm at τ 0.25 | 0.03 | 0.05 |
| −8 cm at τ 0.3 | −0.07 | −0.33 |

- Late LENGTHENING is executed by both executors (under the pelvis-rate internal model; the earlier E4 figures were measured before it).
- SHORTENING is the hard direction. It is not the motors (hip ≤ 120 N·m): the foot decelerates at ≈ 15 m/s² where the plan asked 22 m/s². X's 30 m/s² capability estimate was a false positive for braking.
- **Adopted:** asymmetric capability (push 30, brake 15 m/s²; calibration pending). A foot that cannot be stopped within the bounds aims where it will go anyway (least braking).
- **Physical consequence:** a late SHORTER step must come mainly from an EARLIER touchdown, not from stopping the foot. The reachable set is a region in (foothold, touchdown time), so the planner must use both. The bench now supports `retarget.dT`.

## P2-3. The execution map at matched states: both executors, measured against the SAME unchanged step

Grid:
- 3 starts × steps 4, 6;
- a change at τ 0.15 / 0.20 / 0.25 s (view time from the step start);
- forward foothold change d ∈ {−8, −4, 0, +4, +8} cm × touchdown-time change dT ∈ {−60, −30, 0, +30} ms.

The previous "share" figures in P2-2 were confounded by the per-start landing bias. Here each changed step is compared with its own unchanged step.

**Inherited swing** (`json/bench_execmap_base.json.gz`):

| change at | foothold d → executed | sd | touchdown dT → executed |
|---|---|---|---|
| τ 0.15 | g ≈ 0.65 (−8 → −5.6, +8 → +5.2) | 0.4–0.5 cm | ≈ fully (±60 → ±55 ms, sd ≈ 10 ms) |
| τ 0.20 | g ≈ 0.57 (−8 → −4.7, +8 → +4.3) | 0.3–0.5 cm | fully |
| τ 0.25 | g ≈ 0.50 (−8 → −3.9, +8 → +4.0) | 0.3–0.6 cm | fully |

- Symmetric: shortening is executed as well as lengthening.
- An earlier touchdown also shortens the step slightly (≈ −1.1 cm per −60 ms).

**Swing X** (`json/bench_execmap_x.json.gz`):
- Gain 0.7–0.9 at τ 0.15–0.20, but scatter 1.5–3.8 cm.
- Timing changes are executed only ≈ ⅓, with ±33 ms scatter.

**Conclusions:**
- The inherited swing executes late corrections PARTIALLY but very PREDICTABLY. A planner can invert that (request Δ/g).
- The premise of the 2026-10-02 review ("the inherited swing cannot execute late corrections") was wrong once the pelvis-rate internal model is on: the E4 numbers predate it.
- **X is NOT adopted** for walking; it stays opt-in with its bench evidence. The hybrid (X horizontal + inherited vertical) was also less precise (−1.8 ± 4.3 cm vs +2.8 ± 3.0 cm) and was not adopted.

## P3-1. Identification under swing X

| identification | runs | upright steps | forward CV error of the step maps (τ 0 → 0.25) |
|---|---|---|---|
| inherited swing (i1) | 600 | 3037 | 3.6–4.3 cm |
| X (x1) | 600 | 2521 | **7.6–8.2 cm** |

X's sources of unpredictability:
- liftoff 125 vs 82 ms after the step start;
- air phase 0.28 ± 0.08 s (5 % of swings touch down within 0.1 s);
- double support 0.27 ± 0.14 s.

A reshaped lift (a quick C² rise to the peak by 0.12 s, a held mid-swing height, a late fall, whole-lowest-point approach) made fixed-request execution worse (early touchdowns). **Reverted to the default; recorded.**

## P4-1. Walks (6 starts, 40 steps, vd 0.5) — the best configuration is NOT robust

- **The best configuration of fa55c9d:** 14.7 = [9, 11, 11, 6, 11, 40].
- The 40-step start is the exception. Every variant below lands at a typical 8–11 upright steps per start.

| variant | mean upright | per start |
|---|---|---|
| one late correction, inverse execution model, τ 0.15, timing free | 7.2 | — |
| same, τ 0.20 | 6.8 | — |
| same, τ 0.20, timing fixed | 8.3 | — |
| timing restricted to the maps' data range [0.36, 0.44] | 9.8 | — |
| late correction + restricted timing | 4–5 | — |
| maps re-identified with a wide timing dither (σ 0.06 s, i6 → mU6) | 10.0 | [12, 12, 7, 8, 11, 10] |
| pooled i1 + i6 (mU7) | 8.5 | — |
| mU7 + late correction | 9.5 | — |

**The failure mechanism** (`brake.mjs`, per-step state at the step start, at liftoff and at touchdown, all six starts):

The steady orbit (L@0.6, steps 6–19) is consistent step to step:

| at | ξ | COM | CoP | speed |
|---|---|---|---|---|
| step start | −0.03 | −0.18 | — | 0.45 m/s |
| liftoff | +0.05 | −0.12 | −0.12 | 0.55 m/s |
| touchdown | +0.20 | — | — | 0.51 m/s |

(ξ, COM and CoP are along the walk, relative to the stance sole centre.)

**Every fall is preceded by a step that starts with the capture point AHEAD of the stance sole centre** (ξ0 > +0.05):
- From there, ξ grows +0.3 to +0.5 m within the single support.
- Speed escalates 0.45 → 0.85–1.2 m/s over 3–5 steps.

**Why:**
- At touchdown the COM is only 0.10–0.20 m behind the new sole centre (steps ≈ 0.27 m with a 0.36 m boot).
- The CoP stays at the new foot's HEEL (−0.11 to −0.17 m) until after liftoff, because the swing lands heel-first (toe 7 cm up, ≈ 11°). The heel edge is the only contact, so the CoP physically cannot move forward even when the double-support solve commands the toe.
- The CoP is therefore behind the COM in early stance and the body accelerates. By the time the ankle has rolled the CoP to the toe (≈ 0.25 s), ξ is beyond the toe and nothing can brake it.

**A flatter landing** (toe 0 / 2 / 3.5 cm up), not re-identified: 4.2–5.2 steps. Re-identified (toe 2 cm up, f2): identification survival 2746 vs 2860 upright steps (same seed / dither), forward CV error 5.4 vs 4.7 cm. **Not adopted.**

**Also checked:** the forward double support is already closed-loop toward the orbit (via the lateral-LIPM branch). A duplicate "trackU" option was a no-op and was removed.

## Gates (03:55)
- `regress.sh` 12/12 identical.
- G2W_A8 hashes 5780483c / 17d27b5d / 5082d76a / 47427dbb / 1f5445fd / b373d22e.
- Foot gate F0 42/42, F2h 42/42 identical.
