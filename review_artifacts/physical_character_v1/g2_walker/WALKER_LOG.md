# G2b walker — working log (inner loop first → Controller A, SIMBICON-style B baseline)

Started 2026-10-01 evening after the user approved the controller-redesign plan. Everything here is opt-in (`rhythm.walk.*`, `human.over.*`,
`ctrl.pelvisYawFollow`); approved gates stay bit-identical. Scratch probes: `$SCRATCH/w2/*.mjs`. Data: `json/`. Analysis: `analysis/*.py`.

## 1. Inner loop — what made double support unpredictable

**Measured (28 double supports, natural inner loop):** the landing foot carries ≥ 35 % BW within 4 ms of the (delayed) touchdown and is flat
within 0.03 s (median); the trailing foot needs 0.13–0.15 s to fall below 30 % BW and 0.21–0.22 s to unload — very consistent. Double
support 0.225 / 0.233 / 0.304 s (p10/50/90). The long tail correlates with the landing foot's time-to-flat (r = 0.89).

**Delay mismatch (found):** the executor detects touchdown on the 50 ms-old view; on the hand-over tick the physical foot has already been
loading for 50 ms (≈ 80 % BW at hand-over, median). The double-support plan restarted at s = 0 (CoP on the trailing toe), the split unloaded
the landed foot and it could bounce. **Fix `walk.dsLead`:** evaluate the double-support plan ahead by the feedback delay (as the swing is).

**Gate (found):** the end of double support waited for heel AND toe contact of the landed foot. **`walk.dsFlat: false`:** the load decides.

Result (`dsLead` + `dsFlat:false`): double support **0.175 / 0.188 / 0.217 s** (was 0.225 / 0.233 / 0.304) — shorter and half the spread.
Not adopted: `walk.noSoften` (no effect), `walk.settleSole` (whole-sole CoP region for the settling foot — never engaged in these runs).

**Heel-strike bounce:** ≈ 10 % of genuine touchdowns lose contact within 0.15 s (impact rebound under the swing controller during the 50 ms
before the hand-over). Most "bounces" in the first count were toe scuffs of failing swings (foot 28–42° toes-down, heel 18–24 cm up) — not
landings. Left as is for now.

## 2. Yaw — where the twisting momentum comes from

Whole-body vertical angular momentum, impulse per phase, split into the ground-force couple about the COM and the free moments:

| phase | ΔLy | couple | free moments |
|---|---|---|---|
| SS | −0.5 … +2.2 | −3.0 … +2.0 | +2.6 … −3.6 (opposes the couple) |
| DS | ±2–2.5 | ±1 | **±3.3–3.5** |

The free moments come from the stance module's hip-twist torques (both hips, −15 … −36 N·m in double support) driving the pelvis toward its
planned yaw. Making that pelvis-yaw target compliant (`ctrl.pelvisYawFollow` 0.5 / 0.8) made it WORSE (transverse range 0.039 → 0.047–0.051
m/s, pelvis 38° → 44–53°) — the regulation counters a source, it is not the source. In single support the couple (stance foot's fore-aft
force × its sideways offset) is unbalanced in these runs because the open-loop steps accelerate the body; in steady walking it should
cancel. **Decision: evaluate the yaw work on steady walking, once a controller walks.**

**Human reference (verified):** transverse-plane whole-body angular-momentum RANGE in level walking **0.014 ± 0.003 m/s** (normalised by body
mass × height; Silverman, Neptune et al., *Whole-body angular momentum during stair ascent and descent*, Gait & Posture, Table 1, 80 steps/min).
For this body (78 kg, 1.9 m) ≈ 2.1 kg·m²/s peak-to-peak. Ours in the open-loop runs: 0.039 m/s (≈ 2.8×). (The "< 0.03" bound quoted in
G2_PLANT_REPORT.md was not verified — corrected here.)

## 3. Controller A — measured, timing-conditioned step maps

`pc_walker.js` (decideA / adjustA / solveStep), wired in `pc_plan.js` (`rhythm.walk.ctrl = { kind: "A", models: {τ: map}, nom, rho, sig, lo,
hi, inSwing }`). The state x = sensor capture point relative to the stance foot (forward, inward-mirrored) at the step's decision instant
(view time); u = (df, dl, T); maps x(τ) → x'(0) fitted with T-interaction terms (`linT`), for τ = 0, 0.10, 0.15, 0.20, 0.25 s into the step.
Decision at the step start (foothold + timing), then in-swing re-decisions of the foothold (timing fixed) toward the same partial-convergence
target x* + ρ(x − x*), until `commitMargin` (0.16 s) before the planned touchdown.

**Identification:** `tools/g2walk_ident.js` — open-loop random steps (`--mode ol`) and CLOSED-LOOP identification (`--mode cl`: Controller A
deciding at the step start only, seeded dither on its decisions, so the data lie where it operates).

| data | transitions | residual (τ = 0 / 0.15 / 0.25) | A eigenvalues (τ = 0) |
|---|---|---|---|
| v2 open-loop (600 runs) | 466 near nominal | 3.4 / 2.4 / 2.4 cm inward | +3.1, −4.3 |
| v2 + closed-loop round 1 | 1653 | 5.2 / 2.9 / 2.8 cm | +2.6, −4.3 |
| v5 closed-loop (600 runs) | 1052 | 5.3 / 3.1 / 2.6 cm | +2.9, −3.4 |

Residual sources examined (closed-loop, τ = 0.15): achieved foothold, swing / double-support durations, yaw state, COM position + velocity,
pelvis state together explain only 2.5 → 2.0–2.2 cm. The rest is not in these states.

**The sideways budget:** |A_ll| / B_ll ≈ 4.3 at the step start — 1 cm of sideways error costs ≈ 4.3 cm of width; the usable width range
(0.17 boot limit … 0.34) absorbs ≈ ±2 cm of error per step, about the per-step noise. The first closed-loop runs failed by sideways width
saturation (bound-to-bound widths).

**The start (fixed):** the first step from the 32 cm standing stance decides the first state. Fitted from the closed-loop data (600 first
steps, residual **0.5 cm**): x(1) = c + B u0; the first step (df 0.24, dl 0.351, T 0.448) lands step 1 at the nominal state.

## 4. The forward capability boundary (C8) — measured

Swing failure (re-contact < 0.2 s after liftoff, or no liftoff) vs the PREVIOUS step (3668 steps, open + closed-loop identification):

| previous achieved step length | swing failure |
|---|---|
| 0.20–0.26 m | 7 % |
| 0.26–0.30 m | 19 % |
| 0.30–0.34 m | 60 % |
| 0.34–0.42 m | 72–75 % |
| > 0.42 m | 89 % |

By speed at the step start: 0.30–0.45 m/s 13 %, 0.45–0.60 m/s 54 %, > 0.6 m/s 85–90 %.

**Mechanisms traced:**
1. *Toe scuff in mid-swing:* the swing foot hangs toes-down (heel 20 cm up, toe 0.3–3.5 cm) and the toe meets the turf at ≈ 60 % of the
   swing. The clearance guard used the COMMANDED pitch. `P.clrActual` (actual pitch) fixes the scuff but delays the landing approach — the
   foot landed **+6.9 ± 10.3 cm** beyond its target (vs +0.2 ± 5.2 without). **Fix `P.clrActualUntil: [0.5, 0.2]`:** the actual pitch counts
   only through mid-swing (closed-loop execution error back to 1–4 cm).
2. *The trailing leg at full extension:* the hip is ≈ 0.87 m above the ankle and the leg 0.927 m long, so a FLAT trailing foot can be at
   most ≈ 0.30–0.32 m behind the hip. Once the body is further ahead, the trailing toe cannot be lifted: in a traced failure the foot
   pivoted to vertical (heel 30 cm up) with the toe dragging under up to 1.2 BW and the swing never left the ground. Lowering the pelvis is
   limited by the trailing ankle's 20° dorsiflexion range. A human avoids this with terminal-stance heel rise (toe rocker at the MTP joints,
   0.15–0.18 m ahead of the ankle); on this body the rigid boot pivots at its tip, **0.277 m** ahead of the ankle, so lifting the heel
   under full body weight needs ≈ 212 N·m against the ankle's 150 N·m plantar-flexion limit (V1.1, Harbo et al. evidence). In double
   support (load shared) a heel rise is possible; in single support it is not.
   - `walk.dsExtEnd` (end the double support early at a measured trailing-leg extension) and an earlier pre-swing heel rise
     (`preSwingExt0`, `preSwingHeelH`) were added; neither changed the open-loop failure rate measurably.
   - **This is new evidence relevant to the toe-joint question** (the user's condition: "unless new evidence establishes it as
     necessary"). Not acted on.

## 5. Controller B (SIMBICON-style) — first runs

Foothold relative to the COM = f0 + c_d·d + c_v·v per axis, fixed T, re-evaluated continuously through the swing (SIMBICON servoes the swing
hip continuously). Grids over the lateral and forward gains (54 + 54 runs): **best 6 / 14 and 5 / 16 steps.** The failure: forward runaway
(speed 0.06 → 1.2 m/s; steps shrinking 0.33 → 0.03 m as swings failed — the C8 mode) with small forward velocity gains; sideways alternating
widths with larger ones.

## 6. Controller A status (2026-10-01 night)

With inner loop v5 (v2 + `dsExtEnd` + `clrActualUntil` + `lateBlend`), the v5 closed-loop maps and the measured first step: steps 1–2 land on
the predicted state (e.g. predicted 0.090 / 0.070, actual 0.068 / 0.070). Best so far **9 steps** (0.43 m/s, nominal step 0.22 m, step length
bounded at 0.30). Failures: an over-large late in-swing retarget (+18 cm late) the swing cannot execute → the body runs ahead → a step at the
length bound → C8 swing failure.

## 7. Later iterations (2026-10-01 night) — what moved, what did not

Evaluation from here on: **6 deterministic starts** (first foot R / L × start 0.50 / 0.55 / 0.60 s), 30 steps, fall-aware.

| configuration (Controller A unless noted) | mean / min / max upright steps |
|---|---|
| v5, maps m5a, bias adaptation | 7.7 / 6 / 10 |
| + in-swing until 0.30 s, commit 0.12 s before touchdown | 9.5 / 4 / 15 |
| + nominal width 0.28 | **11.0 / 8 / 17** |
| v6 (DS sideways tracking), maps m6a | 4.2–4.7 |
| v7 (v5 + walking reach limit 0.96), maps m7a | 8.0–10.0 |
| v7 + forward ankle feedback (kXiAlong 0 / 0.3 / 0.6) | 5.0–5.3 |
| explicit forward target x*_f 0.06 / 0.08 / 0.10 | 7.5 / 6.7 / 5.0 (worse than the model's own x*) |
| Controller B on v5 (80-run gain grid, measured first step) | best 7 |
| Controller B, zero sensing delay (diagnostic) | best 6 |

**Online refinement (adopted, opt-in `ctrl.adapt`):** the maps' constant term is corrected by the exponentially averaged prediction error
(γ 0.3, |b| ≤ 6 cm per axis), logged per step. It removed the slow backward drift (x_f −0.006 → −0.24 over 8 steps without it).

**The walking pelvis is nearly at the straight-leg height.** The bind pose has straight legs (hip joint 1.012 m); walking carries the hip at
0.97–1.00 m, the hip-to-ankle vertical is 0.88–0.91 m against a 0.924 m leg. The support layer's height band keeps every stance leg within
**99.5 %** of full extension (`BAL.reachExt`) — so the trailing leg ENDS every double support straight (measured 0.98–1.00 at every step
start). `walk.reachExt` (opt-in, double support only) carries the pelvis lower: 0.94–0.97 at the step start, trailing heel 4–5 cm (was
1–3). A plain pelvis drop (`P.pelvisDrop`) made toe scuffs worse.

**Failure classes (best configuration, 6 starts):** C8 swing failures from a fully extended trailing leg (4/6), backward stalls (x_f < 0: the
walker cannot step backward — 2/6); with nominal width 0.24, sideways range exhaustion (x_l 0.10 → widest step 0.40 → x_l 0.01 → narrowest
step 0.17 → x_l 0.31).

**The swing failure is an early-swing TOE SCUFF.** Traced (v7): after liftoff the heel rises 2.6 → 9.9 cm while the toe tip stays 0–1 cm off
the turf; at 11 % of the swing the toe touches and the executor takes it as the touchdown (u 0.26) — the step collapses. The rigid boot
pivots on its tip, so the toe is the last point to leave the turf.

**DIAGNOSTIC (not adopted): a human-sized foot collider** (`opts.diagFootWidth 0.11`, `opts.diagFootToe 0.20` — width 11 cm, toe tip 0.20 m
ahead of the ankle instead of 16.4 cm / 0.277 m; heel, masses, inertias unchanged). Closed-loop identification, same inner loop v7, same
design, 600 runs each:

| | real boot | diagnostic foot |
|---|---|---|
| swing failures | 50 % | **18 %** |
| after a previous step ≥ 0.32 m | 74 % | **14 %** |
| at ≥ 0.45 m/s | 61 % | 23 % |
| at 0.30–0.45 m/s | 21 % | 6 % |
| upright steps per identification run | 4.41 | 5.35 |

Controller A on the diagnostic foot without re-tuning its nominal gait stalled backward in all 6 starts (5–6 steps) — the shorter foot moves
the CoP roll and the forward operating point; that test is inconclusive. The swing-failure comparison is not (it does not depend on the
controller's tuning).

## 8. Final iterations and stop (2026-10-01 night)

- **v8 = v7 + higher early swing lift (`P.swingLiftH 0.20`):** swing failures 43 % → 14 % (lift 0.13: 32 %, 0.16: 22 %). Earlier swing
  dorsiflexion, the toe-off heel height, shorter / longer toe pivot: no gain.
- Controller A on v8 (maps m8a): **11.2 / 9 / 13** over six starts (`eval/G2W_A8.json`). Failure in all six: FORWARD drift → a step at the
  length limit → C8 swing failure → runaway.
- **Closed-loop step-to-step map of the walking (47 pairs): eigenvalues +1.25 (forward), −0.44 (sideways).**
- Tried against the forward drift, none better than 11: a relaxed step cap (0.34 / 0.38), a lower timing floor (0.30 s), a forward authority
  factor from the closed-loop map, a nominal step start (in-swing decides the foothold), Controller A's own ankle term (CoP shift from the
  predicted next forward state — active only once placement saturates), maps identified in the controller's own in-swing mode with a
  dithered target (worse: 5–6 — endogeneity of the final foothold), earlier horizontal swing completion (forward scatter 5.3 → 3.1 cm but
  shorter walks).
- Controller B on v8 (80-run grid): best 9, typically 5–7 (`eval/G2W_B8.json`: 6.0 / 5 / 7).
- Stopped: see G2B_WALKER_REVIEW.md (decisions: the foot — collider / toe segment; the walking pelvis height; Controller A as the path).
