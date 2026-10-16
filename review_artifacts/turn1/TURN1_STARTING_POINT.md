# TURN-1 — the locomotion starting point, reconstructed from the repository (16 Oct 2026)

Everything below was read from code and git history in this session, not from earlier hand-offs. Where history and code disagree, code wins.

## Branch lineage

| Branch / tag | Head | What it holds |
|---|---|---|
| `touchline-current` | `5b0d9b0` (chronicle; playable game `e2c98ec`) | The playable Touchline: Python match engine, FastAPI app, `sandbox/visual/match.html` playtest harness with the **Outfield Runtime** (`?ofPlay=1`). |
| `prototype/slide-contact-v1.3-charcollide` | `5042230` | CHARCOLLIDE-1: runner gameplay collision geometry derived from the character. |
| `prototype/locomotion-continuity-v1` | `9d57d46` | LC-1: presentation continuity layer over Outfield Locomotion V1. |
| `prototype/locomotion-v2-run1` | `4a226b1` = tag `locomotion-v2-straight-baseline-1` | **RUN-1.3**, the frozen straight-line baseline (the latest and best locomotion). |
| `prototype/physical-character-v2` | `ec79770` | V2 Jolt physical character research; consumes RUN-1 only through `git archive` of the tag. HYBRID-RUN-1 / HAC-1 frozen as research. |
| `prototype/turn-1` | this branch | TURN-1, cut from `prototype/locomotion-v2-run1`. |

## What exists for locomotion

**RUN-1.3** (`sandbox/visual/run1/run1_gait_v13.js`, frozen; `run1_gait.js` may evolve).
- **Scope:** straight-line football running on the real Vinícius rig. The ladder, named as the owner named it: LOW 3.0 · JOG 5.5 · FAST RUN 7.8 · ALL-OUT 9.5 m/s, with continuous speed-conditioned blending on a 2.5–10 m/s grid.
- **Construction:**
  - one periodic cycle (right touchdown at phase 0, left at 0.5);
  - the pelvis vertical from a closed-form stance-force model;
  - the stance foot a fixed point on the pitch, travelling back at exactly the root speed (no skating by construction), rolling heel → flat → toe pad, with leg IK;
  - the swing as C1 Hermite joint curves ending in the stance solution;
  - parametric trunk, arms and head.
- **Authority:** the simulation owns root position, speed and heading; RUN-1 owns the skeleton. The root heading is the travel direction.
- **Not covered:** acceleration posture, curves, turning, cutting, per-player speed, ball-carry.
- **State contract:** `run1/lv2_state.js` (LV2-STATE-1) exposes joint world transforms, velocities, contacts and plants for Physical Character V2.

**Outfield Locomotion V1** (`anim3d/of_loco.js`) + **LC-1** (`anim3d/of_loco_cont.js`) — what the match harness renders today.
- **Gaits:** IDLE / WALK / JOG / RUN / SPRINT as parameter sets, blended by the authoritative speed.
- **Direction:** the lower body plays along the movement direction, the trunk twists toward the facing, and a small "turn roll" comes from the velocity change.
- **Contact:** a plant / leg-IK contact solve; standing turns re-plant the feet.
- **What turning is in the game today:** a run cycle playing along a root that the simulation rotates. This is the "root rotation" look TURN-1 replaces.

**The authoritative locomotion law** (`sandbox/visual/match.js`, the port of `world.locomote`):
- **Limiter:** a direction-decomposed velocity limiter: acceleration `ACC × ACC_GAIN` = 8.5 m/s², braking `BRAKE_PLANT` 12 m/s², lateral `ACC_LAT` 10 m/s², `VMAX` 8.2 m/s.
- **Facing:** turns toward the velocity at 4–7 rad/s ("athletic hips").
- **Stride clock:** an authoritative stride clock and boot plan (`ptGaitStep`, using the shared `of_loco` law) drives Dribbling V1's carry touches.

**Camera.** CAMERA_V1 (`match.js`): 30 m high, 43 m behind the touchline, 22° pitch, 28° FOV, rail-following along x. It is reproduced exactly in the RUN-1 viewer and now in the TURN-1 viewer.

**Character scale.** Vinícius rig: 1.76 m, 23 bones; thigh 0.435 m, shank 0.399 m (leg 0.834 m); pelvis 0.922 m in bind; ankle 0.088 m; MTP 0.18 m ahead of the ankle. The real skinned mesh draws through `anim3d/of_char_gl.js`.

**Foot–ground representation.**
- **RUN-1:** a flat-foot ankle point on the turf, a heel contact point, a toe pad at the MTP + 8 cm, and MTP extension capped at 52°.
- **Physical Character V2:** a 10-piece boot on a Jolt `PlaneShape` turf.

**Physical-character coexistence.**
- V2 (Jolt) consumes RUN-1 as a kinematic intent: HYBRID-RUN-1 tracks it with finite authority; HAC-1 is frozen research.
- The match uses CHARCOLLIDE-1 gameplay colliders derived from the posed character.
- No locomotion code requires kinematic bodies that ignore collisions.

**Existing turning experiments.** None that turn the athlete. RUN-1 is straight-only by design. V1 rotates the root with a turn roll. HAC-1 found that a RUN-1 runner whose heading changes falls even alone when physically tracked: RUN-1 cannot execute a turn.

## Consequence for TURN-1

TURN-1 builds on **RUN-1.3, frozen, unmodified**, as the athletic source of the cyclic motion. It adds:
- world-space footstep planning;
- per-stance velocity changes;
- a step-role resolver;
- turn / cut body organisation.

It does not touch V1, LC-1, the authoritative locomotion law or the match. Integration into the match is a later decision, with the facts the simulation would need listed in `TURN1_REPORT.md`.
