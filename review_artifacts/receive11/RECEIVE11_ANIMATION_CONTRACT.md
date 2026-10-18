# Receive action contract: simulation and authored animation

RECEIVE-CONTROL-1.1, 18 October 2026. This contract is for future production animation assets. The simulation selects and resolves a receive action **without** any asset. `receive11/rx_body.js` is a procedural placeholder that meets this contract today. A production clip must meet the same contract to replace it.

## The rule

The simulation decides; the animation shows what was decided.

- An asset never chooses the family, foot, surface, contact time, ball velocity or exit.
- The outcome is identical with animation on or off. This was checked in 33/33 runs (`evidence/determinism_node.json`).
- During an action the receiver's colliders are taken out of the ball's world. The action's single authoritative contact is the only interaction with the ball.
- At the handoff, the collider history restarts from TURN-1.2's own pose. Presentation is never read.

## What every receive family exposes

The data lives in `receive11/rx_actions.js` (`FAMILIES`). All angles and lateral offsets are authored for the **right** contact foot, in player-local space:
- forward = 0°, right = +90°, back = 180°, left = −90° / 270°;
- local positions are `[ahead, lateral]` in metres, + lateral = right.

The left foot is the exact mirror: lateral → −lateral, angle → −angle.

| Field | Meaning | Example (THROUGH_TURN) |
|---|---|---|
| `id`, `label` | Family identity | `THROUGH_TURN`, "through-stance turn (far foot inside)" |
| `kind` | `ordinary`, `turning`, or `any` (the kill): which side of the 90° / 270° boundary it serves | `turning` |
| `rta` | Valid `|receiveTurnAngle|` range (deg) | 90–181 |
| `intents` | Receive intents served (`go`, `kill`) | `go` |
| `feet` | Contact foot rule: `either`, `near` (turn side), `far` (away from the turn) | `far` (left turn → right foot) |
| `surfaces` | Contact surfaces in preference order | INSIDE, then SOLE |
| `contact` | Candidate ball positions at the CONTACT marker (local, right foot) | `[0.30, 0.02]` across, `[0.14, 0.05]` behind |
| `stand` | Standing foot's plant at the contact (local). The simulation may move it back, forward or wider so the ball's path clears it. | `[0.04, −0.19]` |
| `face` | Body preparation: the facing at the contact (`ball`, `lead` or `turn` mode, share k, max) | turn: 22 % of the turn, ≤ 35° |
| `vContact` | Body speed at the contact as a share of TURN-1's angle–velocity trade-off (sEntry): the turn cost | ×1.0 |
| `follow` | Contact foot lands this long after the contact (s) | 0.17 |
| `txMin` | Shortest contact → handoff (s) | 0.46 |
| `exitV` | Handoff speed by turn angle (m/s) | 90° 4.0 · 135° 3.2 · 180° 2.8 |
| `reconnect` | Where the ideal touch sends the ball | on the new line, `HANDOFF_AHEAD(speed)` ahead, crossing it `RECONNECT_TAU` after the handoff |
| `crouch` | Presentation: knee bend around the contact (m) | 0.07 |

## What the simulation hands the animation, per action

The action object built in `rx_core.js evalCand` and `beginAction` gives:

- **Entry state** (k0): root position, velocity and facing. For a running receiver this is a TURN-1.2 touchdown. A standing receiver is in the ready stance.
- **Root/body path**:
  - preparation: a cubic Hermite from the entry state to the contact state; a standing receiver holds first, then moves;
  - exit: a Hermite from the contact to the handoff state (once the launch is authoritative, the exit is re-solved on the actual ball);
  - facing: smootherstep keys, with the preparation rotation in the last 0.45 s before contact and the exit rotation from contact to handoff;
  - the root is authoritative, so the animation must follow it exactly.
- **Body rotation**: `rotPre` (deg before the contact) and `dRot` (after), each signed.
- **Footwork** (`steps`): every touchdown (foot, time, stance duration) from the start to the handoff.
  - index `m` is the standing foot's plant (`Spl`, `ySpl`); it pivots on the forefoot through the turn;
  - the contact foot swings between `m−1` and `m+1`;
  - the handoff touchdown is TURN-1.2's actor's own plant;
  - the previous stance ends one flight before it.
- **CONTACT marker**: tick `kc` (time `tc`), the contact foot `F` and surface, and the ball centre at the marker (`c`).
  - The surface must face the ball at `kc`.
  - The foot's yaw is `yawF`, and the impulse direction is `ideal.vOut − vin`.
  - The marker is a simulation event. An animation clip must place its own contact frame on it.
- **Exit state** (kh): position on the exit line, heading = exit direction, speed ≥ 2.5 m/s (TURN-1.2's slowest gait), a foot just landed.
  - This is the TURN-1.2 actor DRIBBLE-V1 continues with.
  - A clip must end in that actor's pose; the placeholder blends into it over the last 0.14 s.
- **Ball path (for clearance)**: the ideal post-contact ball runs straight from `c` toward `X`. A clip must keep its legs off that path.

## Safe timing adjustment

- **Preparation**: the contact is scheduled 0.26–1.05 s after the action start. For a standing receiver it can be up to 2.6 s after the pass, with a hold before the move.
- **Step intervals**: 0.17–0.50 s. The standing foot lands 0.05–0.24 s before the contact, and the contact foot leaves the ground at least 0.14 s before it.
- **Root accelerations**: ≤ 9.5 m/s² peak before the contact (5.5 from a standing start), ≤ 9 m/s² mean after it.
- **Rotation**: ≤ 620°/s peak.
- **Retiming**: a clip may be time-warped inside these limits so its contact frame lands on `kc`. If no clip can meet the ball, the simulation picks another family or the receive fails. The ball is never moved to fit an animation.

## Mirroring

Every family is authored once (right contact foot) and mirrored by the sign of the lateral component. The mirror test (`evidence/mirror.json`) runs a case and its mirror image with a two-footed player and execution error off. It confirmed 10/10 pairs: the same family, mirrored foot and side, the same surface, the same contact and handoff ticks, a mirrored ideal touch, and a body path mirrored to 1e-13 m. One pair is self-symmetric.

## Determinism

- **Execution draws**: keyed by `seed | "RECEIVE" | player | receive event (index @ contact tick) | "receive-execution-v1" | dimension | draw index`. They are never keyed by frame, render time or presentation state.
- **Engine independence**: the action plan, the ideal touch and the launch use the ball kernel's deterministic `dsin` / `dcos`.
- **Chrome vs Node**: the receive phase was bit-identical in Chrome and Node in 20/20 cases. Every remaining last-bit difference starts after the handoff, inside frozen DRIBBLE-V1 / TURN-1.2.
