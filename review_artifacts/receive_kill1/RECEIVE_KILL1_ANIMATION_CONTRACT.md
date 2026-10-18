# RECEIVE-KILL-1 animation contract

**What this is:** what a production animation clip must provide for each KILL action. The simulation decides everything that matters to the ball. The clip only shows it.

**Placeholder:** today the body is procedural (`sandbox/visual/receive_kill1/rk_body.js`). It meets this contract and is presentation only.

All heights are the **ball centre** in metres. The receiver is the character rig: 1.76 m, hip joint 0.92, knee 0.49, ankle 0.088. Ball radius 0.11.

**Status:** calibration values, not locked.

## Rules for every action

1. **The simulation owns the contact.** It chooses:
   - the surface;
   - the side;
   - the CONTACT tick;
   - the contact point;
   - the stance shift;
   - the ideal post-contact ball state;
   - the executed state (Ball Control).

   The clip receives these and must put the named surface on the ball at the CONTACT tick.
2. **One authoritative contact.**
   - The ball is changed by exactly one kernel `schedule()` at the CONTACT tick.
   - The kernel checks the ball is within 6 cm of the planned contact point and cancels the launch otherwise.
   - The clip never moves the ball, never parents it, and never adds a second touch.
3. **Presentation is passive.**
   - The body is not in the ball's world during the action, so animation on or off cannot change the outcome. This is verified: `rk_det.mjs`, 14/14.
   - The surface should visually meet the ball within about 3 cm. The placeholder: foot overlap up to 2.7 cm, thigh exact, chest 2 cm, head 1 cm (`evidence/rk_body_contact.txt`).
4. **Ball Control never changes the clip.**
   - The same ball and surface play the same preparation and contact pose at every rating.
   - Only the ball's post-contact state differs.
   - Timing belongs to the action (later: Dribbling and Agility), never to Ball Control.
5. **Time-warping.**
   - The clip's CONTACT marker is warped onto the simulation's CONTACT tick.
   - The preparation may be stretched or compressed within the action's safe window (below).
   - The cushion and recovery play at authored speed.

## Shared phases (seconds relative to the CONTACT marker)

| Phase | Window | What the body does |
|---|---|---|
| Ready | before −(prep + 0.32) | Ready stance: knees soft, feet 0.28 m apart, toes out 8°, head on the ball. |
| Shuffle | −(prep + 0.32) … −(prep + 0.10) | Small repositioning step to the action's stance. Up to 1.2 m (`plan.shiftMax`); the leading foot first. |
| Preparation | −prep … 0 | The surface is presented on the ball's path; the support leg loads. |
| **CONTACT** | 0 | The surface on the ball, at the contact point. |
| Cushion | 0 … +0.16 | The surface gives with the ball along its incoming direction: foot back 9 cm (instep also down 8 cm), thigh down 12°, chest a further 8° of lean and 5 cm back, head down 4 cm. |
| Recovery | +0.21 … +0.76 | Back to the ready stance, playing foot near the settled ball. |

## FOOT_KILL

The FOOT_KILL variants share the shared phases above.

| | INSIDE | SOLE | INSTEP (laces cushion) | OUTSIDE |
|---|---|---|---|---|
| Ball-centre height | 0.10–0.62 | 0.10–0.24 | 0.14–0.62 | 0.10–0.35 |
| Natural height / half-width (difficulty) | 0.11 / 0.38 | 0.11 / 0.12 | 0.30 / 0.28 | 0.11 / 0.25 |
| Max incoming speed | 34 m/s | 14 m/s | 26 m/s | 24 m/s |
| Arrival bearing (+ = from the foot's own side) | −100° … +40° | ±90° | ±50° | +20° … +110° |
| Descent slope (−vz/vh) | −0.6 … 1.2 | −0.3 … any | ≥ 0.36 (≥ 20°, a dropping ball) | −0.4 … 1.0 |
| Nominal contact (fwd, side) | 0.46, 0.08 | 0.40, 0.12 | 0.44, 0.12 | 0.22, 0.34 |
| Contact surface | Medial arch; foot turned 70° out, medial side to the ball | Sole on the ball's top-front; toe up 24° | Laces under the ball; toe pointed 40° | Lateral side; foot turned 75° in |
| Preparation (`prep`) | 0.32 s | 0.30 s | 0.34 s | 0.32 s |
| Ideal result | Ball rolls back to the settle point 0.40 m ahead, 0.09 m to the foot side (a few cm of give); a raised contact puts the ball down there | Ball dead under the sole (settle point = contact point) | Exit −0.4 m/s vertical, settles at 0.40 / 0.12 | Ball settles at 0.30 / 0.28 |
| Surface limit (capability) | Full absorption to 20 m/s, then 4 % of the excess returns | 9 m/s, 6 % | 10 m/s, 6 % | 12 m/s, 6 % |
| Uncushioned rebound (cap) | Boot e = 0.48 | 0.48 | 0.48 | 0.48 |
| Error shape (rebound / lateral / third) | 1.0 / 0.6 / 0.25 (pop-up only) | 0.7 / 0.5 / 0.35 (pop-up only); run-through ×1.3 (under the sole) | 1.0 / 0.6 / 0.5 | 1.0 / 0.9 / 0.3 (pop-up only) |
| Post-contact body | Foot back down beside the ball; weight centred | Foot rests on the ball, then steps beside it | Foot follows the ball to the turf | Foot back under the hip |

## THIGH_KILL

| Item | Value |
|---|---|
| Ball-centre height | 0.70–1.15 m. Natural 0.95 (the top of a thigh raised 45–90° sits above the hip joint). |
| Max incoming speed | 24 m/s |
| Arrival | Bearing −60° … +70° (+ = the thigh's side). Descent slope ≥ −0.2 (not rising fast). |
| Nominal contact | 0.32 m ahead, 0.13 m to the thigh's side |
| Contact surface | Top of the thigh, radius 0.094 m. Hip flexion θ is solved so that ball = hip + s·u(θ) + (0.094 + R)·n(θ), with u = (sin θ, −cos θ) and n = (cos θ, sin θ), clamped to 25–100°. Support knee bends 5 cm. |
| Preparation | 0.40 s |
| Ideal result | Exit +0.5 m/s vertical (a small pop), then drops and settles 0.55 m ahead, 0.12 m to the side. The ball is never held in the air. |
| Surface limit | 10 m/s into the surface, then 7 % of the excess. Uncushioned rebound e = 0.35 (body). |
| Error shape | 0.9 / 0.5 / 0.35. Rebound axis = up, tilted 19° toward the passer. Run-through ×0.4. |
| Cushion and post-contact body | Thigh lowers 12° with the ball, then the foot returns to the turf. The ball bounces once or twice in front. |

## CHEST_KILL

| Item | Value |
|---|---|
| Ball-centre height | 1.05–1.58 m. Natural 1.32 (the sternum contact). |
| Max incoming speed | 28 m/s |
| Arrival | Bearing ±70°. Descent slope −0.3 … 2.2 (up to ~65°). |
| Nominal contact | 0.24 m ahead, centred |
| Contact surface | Sternum front: chest joint + (0, 0.13 up, 0.115 forward). |
| Lean | The trunk leans back so the chest faces the ball: tan(lean) = clamp(0.18 + 0.55 · slope, 0.18, 1.0). The pelvis moves (knees, hips forward, on the toes) so the sternum reaches the contact point (`rk_body.js` two-pass). Arms open about 66°. |
| Preparation | 0.45 s |
| Ideal result | Exit −0.4 m/s vertical (cushioned down), then falls in front and settles 0.60 m ahead. The ball does not stick to the chest. |
| Surface limit | 12 m/s, then 7 %. Uncushioned rebound e = 0.35. |
| Error shape | 1.0 / 0.6 / 0.6. Rebound axis = the chest normal (forward, tilted up by the lean). Run-through ×0.3. |
| Cushion and post-contact body | Chest withdraws 5 cm and leans 8° more over 0.16 s, then returns upright. The ball's first bounce is about 0.4 m. |

## HEAD_CUSHION

| Item | Value |
|---|---|
| Ball-centre height | 1.58–2.25 m. Natural 1.74 standing; above 1.92 needs a jump (difficulty `aJump`). |
| Max incoming speed | 22 m/s |
| Arrival | Bearing ±60°. Descent slope −0.3 … 1.6. |
| Nominal contact | 0.20 m ahead, centred |
| Contact surface | Forehead: head joint + (0, 0.075 up, 0.095 forward). The neck extends toward the ball (the gaze). Pelvis rise: on the toes up to 7 cm, then a jump (both feet leave the turf). |
| Preparation | 0.40 s |
| Ideal result | Exit +1.4 m/s vertical (a cushioned pop), then drops about 1 m in front and settles there. The head never stops the ball dead. |
| Surface limit | Only 6 m/s is absorbed fully, then 12 % of the excess — the surface that retains the most. Uncushioned rebound e = 0.45. |
| Error shape | 1.0 / 0.9 / 0.6. Rebound axis 51° up. Run-through ×0.3. |
| Cushion and post-contact body | Head gives 4 cm down, then lands from the toes or the jump. |

## Safe timing adjustment

The clip may be warped so its CONTACT marker lands on the simulation's tick. The warp limits are a **proposal for the animation team**: the placeholder plays its preparation at the fixed `prep` and does not exercise them.

| Action | Preparation (authored) | Safe warp |
|---|---|---|
| FOOT INSIDE / OUTSIDE / SOLE | 0.30–0.32 s | ±30 % |
| FOOT INSTEP | 0.34 s | ±25 % |
| THIGH | 0.40 s | ±25 % |
| CHEST | 0.45 s | ±20 % |
| HEAD | 0.40 s | ±20 % (a jump must not be compressed below 0.32 s) |

Beyond the safe warp, the planner chooses another tick or another surface. It never moves the ball to fit the clip.

## Selection inputs the clip may rely on

The plan provides:
- `surface`, `side`;
- `kc` (the CONTACT tick);
- `contact` (the ball-centre point, stance frame);
- `stance` (the shift);
- `incoming` (speed, descent, bearing);
- `ideal.frame.n` (the rebound / cushion axis);
- `chestLean` (CHEST).

All are decided before the clip starts and do not depend on Ball Control.
