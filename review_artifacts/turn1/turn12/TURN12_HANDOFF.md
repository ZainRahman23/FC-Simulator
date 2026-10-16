# TURN-1.2 — frozen locomotion baseline: handoff (16 Oct 2026)

**Status.** The owner approved TURN-1.2 as the current development baseline and froze it (`../sources/2026-10-16_user_instruction_turn1_2_freeze_publish_handoff.md`). No locomotion, animation, resolver, threshold, braking, shuffle, pivot or visual change is allowed without a new owner instruction.

- **Branch:** `prototype/turn-1`.
- **Freeze tag:** `locomotion-turn12-baseline-1`.
- **Frozen files** (SHA-256): `freeze/TURN12_FREEZE_MANIFEST.tsv`.
- **Parameters:** `freeze/TURN12_PARAMS.json` (T1, the verbatim T12 block, P11 / LIB / MOD).
- **Reviewed result:** `TURN12_REPORT.md`, `review/TURN12_REVIEW.html`, `evidence/`.

## Lineage (all on `prototype/turn-1`, cut from `prototype/locomotion-v2-run1` = tag `locomotion-v2-straight-baseline-1` / RUN-1.3)

| Stage | Commits | Status |
|---|---|---|
| TURN-1: turning and cutting on RUN-1.3 | `6185b972` … `7b58d1a8` | **Preserved.** TURN-1.2's default behaviour and the reference for every non-reversal case. Evidence: `review_artifacts/turn1/evidence/`. |
| TURN-1.1: authored cut body layer | `382e915d`, `fd470196`, `f6e67250`, `bb97f42e` | **Preserved separately (research);** not the default. Evidence: `review_artifacts/turn1/turn11/` (84 / 84 hashes still match). |
| TURN-1.2: speed-dependent reversals | `a83e1996` (instruction), `ab8b4077` (engine), `634bf20d` (final tuning + review) | **Approved and frozen.** |
| Closeout | `8a5a8f13` (instruction), the docs commit carrying this file (tagged) | Documentation only; source unchanged since `634bf20d`. |

## Architecture

- **`sandbox/visual/turn1/turn1_loco.js`** (global `TURN1`, consumes the frozen `RUN1_V13`). The locomotion engine:
  - **Model:** stance-impulse COM dynamics (velocity changes only while a foot is on the turf; half-sine force profile per stance), fixed world-space plants, the swing warp onto aimed plants, pelvis facing separate from the velocity, the resolver.
  - **TURN-1.2:** opt-in per actor with `init.turn12: true`. Without the flag the engine is TURN-1 exactly (77 / 77 regression hashes of 7b58d1a).
- **`sandbox/visual/turn1/turn11_body.js`** (global `TURN11`). The presentation body layer.
  - TURN-1.2 attaches it with `TURN11.attach(A, { mode: "t12" })`: it then dresses **only** the reversal family (quick-braking posture, reorganisation stance, REVERSAL turn base, react, exit / acceleration, the reach guards).
  - Every other family keeps TURN-1's body bit for bit.
- **`turn1_scenarios.js`, `turn1_viewer.js`, `../turn1.html`** — the scenarios and the viewer: `?scn=<id>&body=t12|t1|t11&diag=1`, with the gameplay camera CAMERA_V1.
- **Tools:** `tools/t12_check.cjs` (families, metrics, identity, determinism), `t11_mirror.cjs` (`T12=1`), `t1_check.cjs`, `t11_check.cjs`.
- **Boundary.** Presentation only. TURN-1.2 is **not** the authoritative match locomotion: `match.js` and its limiter are untouched. The authority contract is to be settled when locomotion converges with BALL-PHYS for DRIBBLE-1. There is no ball.

**Constructing a TURN-1.2 player:**
```js
const A = TURN1.t1Make(skel, Object.assign({}, { v: 7.8, heading: 0, pos: [18, 34], foot: "R" }, { turn12: true }));
TURN11.attach(A, { mode: "t12" });
// fixed 1/240 s steps; input = the desired direction (rad, pitch frame) and speed (m/s)
TURN1.t1Step(A, { dir, v });              // dynamics + resolver + body state
const { pose, fk, skinMats } = TURN1.t1Evaluate(A);   // pose (presentation), FK joints, skinning matrices
```

**Frames:**
- **Pitch plane:** (x, y) in metres; heading θ has forward (cos θ, sin θ) and the player's right (−sin θ, cos θ); a positive Δθ is a RIGHT turn.
- **Rendered world (anim3d):** x = pitch x, y = up, z = −pitch y.

**Determinism.** The state at time t is a pure function of the input history on the fixed 240 Hz grid from t = 0. Nothing is random and nothing reads the wall clock. `TURN1.t1Replay(A, scn, t)` replays.

## Movement families (resolver output: `A.man.kind` / `.tech`, and the `"maneuver"` event)

| Family | When | What |
|---|---|---|
| CURVE | `a ≤ arcLimit(s)` (50° at 3 m/s → 25° at 9.5 m/s) | TURN-1 arc steering, per stance, no maneuver |
| TURN1_CUT | TURN-1's planner, not reassigned | Side-step on the outside foot, or a crossover ≤ 70° on the inside foot when ≥ 0.2 s sooner; TURN-1's braking strides |
| TURN1_PIVOT | `a ≥ 135°` (or ≥ 110° on the inside foot when sooner), not reassigned | TURN-1's reversal plant. **Compact:** it plants on the next touchdown once a braking stance leaves the speed ≤ its entry speed + 0.6 m/s (event `"compact"`). Also applies to a cut re-planned out of an aborted reversal, on the outside foot. |
| BRAKE_TURN | the brake family, with no base rotation needed | Quick braking (BRAKEQ) → turn plant (PLANT, tech TURN) → EXIT → ACCEL |
| BRAKE_SHUFFLE_TURN | the brake family, with rotation needed or speed left | Quick braking → 1–3 reorganisation steps (REORG) → turn plant on the **outside** foot → EXIT → ACCEL |

**Brake-family selection (exact).** It is taken only if both hold:
1. `a ≥ aLarge(s) − aBand`, with `aLarge` = 118° at 5 m/s, 110° at 6.5, 105° at 8, 102° at 9.5, and `aBand` = 10°;
2. `s − sEntry(a) ≥ 3.6 m/s`, where `sEntry` is TURN-1's angle–velocity table (7.2 at 45°, 6.0 at 60°, 4.3 at 90°, 3.4 at 120°, 3.0 at 135°, 2.4 at 180°).

**Inside the band `aLarge ± 10°`:** TURN-1's own plan for the request is evaluated on a clone, and its braking-stance count `nB` (stride-phase dependent) keeps TURN-1 unless `nB + 3x ≥ 4`, where `x = (a − (aLarge − 10°)) / 20°`.

**Reversal plan (from the current state; `t12Retarget`):**
- **Braking:**
  - **Speed targets:** quick stances until the hand-over speed `sTurn`: 3.2 m/s at 110°, 2.7 at 135°, 2.5 at 150°, 2.2 at 180°.
  - **Stance shape:** contact `min(1.05 × run, 0.70 m / s, 0.16 s)`; flight `clamp(0.42 × run, 0.028, 0.07)`; ΔV ≤ 0.88 × 17.5 m/s² × contact.
  - **Tolerance:** stop 0.6 m/s early when shuffles follow (0.15 m/s otherwise).
- **Shuffle count:** `k = max(⌈R / 50°⌉, ⌈(v − sTurnPlant) / (17.5 × 0.85 × 0.13)⌉)`, capped at 3. Here `R = a − 105°`, but only if `R ≥ 20°` (otherwise 0, and no speed-based shuffles).
  - **Turn-plant entry speed `sTurnPlant`:** 2.6 / 2.0 / 1.8 / 1.5 m/s at 110 / 135 / 150 / 180°.
  - **Step shape:** contact 0.13 s, flight 0.032 s, 10 cm wider than running, the yaw opened by `R·j/k`.
  - **Outside foot:** if the turn plant would land on the inside foot, use one braking stance fewer (when the shuffles can absorb the speed), else one shuffle more.
- **Turn plant:**
  - **Contact:** 0.19 / 0.21 / 0.23 s at 110 / 150 / 180°.
  - **Exit velocity:** 2.7 / 2.2 / 1.9 m/s in the new direction.
  - **Pivot:** `min(85°, (a − R) × 0.55)` about the toe pad.
- **Then:** TURN-1's EXIT step and its ACCEL steps (`man.exitUntil` = plant + 3).

## Contact timing and continuous input

- **Stride clock** `A.clk`: `seg` 0 = R stance, 1 = flight → L, 2 = L stance, 3 = flight → R; `x` = progress through the segment; `T` = its duration. Stances strictly alternate; there is no double support.
- **Every touchdown gets a stance plan** `A.st` `{ P0, V0, dV, tc, tf, role }` at the moment it lands. Roles: RUN, ARC, ACCEL, BRAKE, PLANT, EXIT (TURN-1) and BRAKEQ, REORG (TURN-1.2).
- **Events** `A.events` (time first):

  | Event | Fields |
  |---|---|
  | `["TD", foot, role, |ΔV|]` | a touchdown |
  | `["TO", foot]` | a toe-off |
  | `["maneuver", kind, tech, deltaDeg, plantFoot, tPlant − t (, nBrake, nReorg)]` | a maneuver is planned |
  | `["plantTO", foot]` | the turn plant's toe-off |
  | `["maneuverEnd"]` | the maneuver is finished |
  | `["cancel", deg]` | a request cancelled |
  | `["replan", deg]` | a request re-planned |
  | `["compact", foot]` | a compact pivot or cut |

- **Maneuver** `A.man`:
  - **Fields:** `kind` (CUT / PIVOT / REVERSAL), `tech` (SIDESTEP / XOVER / PIVOT / BRAKE_TURN / BRAKE_SHUFFLE_TURN), `delta` (rad, + = right), `thIn`, `sg`, `phase` (PRE → PLANT → POST), `plantIdx`, `plantFoot`, `roles` (by touchdown index), `nBrake`, `nReorg`, `tPlant`.
  - **Lifetime:** `null` outside maneuvers.
- **Continuous input:**
  - **TURN-1 maneuvers (PRE):** TURN-1's rules apply.
  - **REVERSAL before the turn plant (phase PRE):**
    - **Cancel:** a request within 0.8 × arcLimit of the original line; TURN-1 running then re-accelerates.
    - **Re-plan:** a request moved > 25° or to the other side is resolved afresh at the current speed, so it may become a TURN-1 cut. The committed touchdown keeps its braking role.
    - **Retarget:** a smaller move rebuilds the remaining roles.
  - **Commitment point:** the turn-plant touchdown. After it, the exit direction may still move ±20°.
  - **Any touchdown < 0.09 s ahead keeps its role** (TURN-1's reaction rule).

## Interfaces for DRIBBLE-1 (all exact with the TURN-1.2 layer attached)

**`TURN1.t1State(A)`.** The facts at the current step; velocities by a forward difference over one 240 Hz step of a clone. It returns:
```
{ t, frame,
  feet: { R|L: { ankle, toeTip, heel, ball, world (4×4), vel: { ankle, toeTip, ball }, angVel,
                 stance, stanceFrac, swingFrac, role,
                 plant: { pitch:[x,y], yaw, since } | null,                  // the planted foot (fixed world point)
                 nextTouchdown: { t, inS, pitch:[x,y], yaw, role } | null } },   // a swinging foot's aimed plant and time
  pelvis: { pos, vel, yaw, yawRate }, com: { pitch, vel, speed, acc },
  direction: { desired, desiredSpeed, actual, facing, gaze },
  support: "R" | "L" | "flight", stride: { seg, segFrac, phase, touchdowns },
  turn: { mode, technique, phase, requested, plantFoot, sinceDecision } | { mode: <role> } }
```

**`TURN1.t1Predict(A, horizon = 0.4, every = 4)`.**
- **What:** where each foot will be over the next `horizon` seconds if the input does not change, from a deterministic lookahead on a clone.
- **Returns:** `[{ t, support, com, R|L: { ankle, toeTip, ball, stance } }]`.
- **Verified:** with the layer attached it matches the later replay to 0.000 mm.

**`TURN1.t1Clone(A)`.** An independent copy, layer state included; advancing it with the same input reproduces the original exactly.

**Stance and swing ground truth:**
- **Stance foot** `A.legs[F]`: `{ stance:true, plant:{ pos, yaw, pivot? }, tTD, role }`.
- **Swing foot:** `{ stance:false, w (0 → 1), tTDf (forecast touchdown time), tgt:[x, y, yaw] (aimed plant), tgtRole }`.
- **Contact geometry:** the RUN-1 roll is heel → flat → toe pad, with heel-first touchdowns on BRAKE / BRAKEQ / PLANT. A pivot rotates the foot about its toe pad.

**For a future touch intent (guidance only, not implemented):** a swing-path offset in the layer that is zero at toe-off and at touchdown (as the layer's free-leg offsets are) leaves every plant and all of the movement unchanged.

## Accepted V1 limitations

1. **SPRINT 90° and the low edge of the sprint band keep TURN-1's long braking strides,** including a final low-ΔV stride before the cut. This is TURN-1 kept by design.
2. **The shuffle vocabulary is minimal:** quick, wide, toe-turned alternating steps on TURN-1's alternating stride clock. There is no split-step hop and no same-foot double contact; in a 180° reversal the second shuffle step mostly re-orients the base.
3. **No walk gait below 2.5 m/s** (a RUN-1.3 limit). LOW 3 m/s stands in for walking. The JOG 150° / 180° pivots keep TURN-1's own low exit posture.
4. **Inherited from TURN-1:**
   - the retarget stress case `CONT_PRE_RETARGET` keeps a one-frame toe tilt (accepted; invisible at the gameplay camera);
   - plant forces are dramatised (≈ 17.5 m/s² mean stance capacity);
   - RUN-1.3's deliberate subtle arm asymmetry (≈ 27 mm joint mirror residual, identical in TURN-1).

## Final verification at closeout

The source is unchanged since `634bf20d`. Fresh runs:
- **TURN-1 regression:** 77 / 77 hashes equal to 7b58d1a.
- **TURN-1.1:** 84 / 84 equal to its evidence.
- **`t12_check.cjs`:** output **byte-identical** to the reviewed `evidence/TURN12_check.json` (28 / 28 TURN-1 cases bit-identical, 3 compact, 0 nondeterministic).
- **`t11_mirror.cjs` (`T12=1`):** output byte-identical to `evidence/TURN12_mirror.json` (exact in 28 pairs).
- **Review videos:** rendered from this source; the one clip affected by the final tuning commit, `REV_ABORT_RUN`, was re-rendered after it.
