# RECEIVE-TURN-1.1 — human body motion around the authoritative receive-and-turn

**Status: presented for review — NOT frozen, NOT integrated.** The football action (technique, contact foot and surface, contact timing, ideal first-touch vector, Ball Control
error, ball state, exit direction, preferred-foot logic, feasibility, mirroring, curve B, bounded variance) is RECEIVE-TURN-1's, imported unchanged (`receive_turn1/rt_sim.js`).
The owner's instruction is saved verbatim in `sources/2026-10-19_user_instruction_receive_turn_1_1_human_motion.md`.

I cannot play video in real time: visual judgements here come from stills (the event strips and frames from the clips). The clips are for the owner.

Review page (local only): `review/RECEIVE_TURN11_REVIEW.html` · lab: `sandbox/visual/receive_turn11_lab.html` (served at :8361).

## 1. Architecture
"Simulation decides what happens. Animation visually explains what happened." The body (`receive_turn11/rt11_body.js`, `HumanTurnBody`) is built from a finished episode and
never writes back:
**RECEIVE-TURN-1 facts** (family, foot, surface, contact tick, ball at contact, impulse direction, exit line, planned root path, meeting / follow-up) →
**authored reference** `REF[family](angle)` (lead time, plant time, swing start, support-toe angle, shoulder lead, counter-rotation, exit lead, hip pre-turn, crouch, lean,
landing share, pivot range) → **footstep plan** (support step, contact foot open on its forefoot, contact swing through the CONTACT pose, landing = first exit step, support-foot
forefoot pivot with heel up, run steps on the path with toe-off, touches as exact via-points) → **rotation channels** (gaze → shoulders → hips → feet) → **procedural root**
(the simulation's path pulled toward the loaded foot) → **IK + grounding** (leg IK to each foot target, pivots exact about the rig's MTP joint, ground clearance) → FK → skin.

## 2. Preparation
Preparation starts 0.73 s before the contact on the 90° half-turn (0.55 s directional, 0.80 s through-stance): a head check toward the exit
(~-0.55 s), the shoulders open first, the hips follow (53° of the 90° turn is done before the contact; shoulders 72°), knees flex
(crouch up to 8.5 cm), the centre of mass shifts 0.26 m toward the support side.

## 3. Support / plant logic
The support foot steps to the simulation's stance point with its toe already turned into the turn (+6…+47° by family and angle) and plants
0.35 s before the contact (90°), 0.32 s (180°). After the contact it pivots on the ball of the foot (heel up), exact about the rig's MTP joint, then
lifts and steps through. Flat plants never move; pivots never move the ball of the foot (slip below).

## 4. Weight transfer
Each planted foot loads over 0.08 s after touchdown and unloads over 0.09 s before lift-off; the shares are continuous through flight phases (they pass from the foot that
unloaded to the next one to land). The weight is on the exit foot at +0.29 s (90°), +0.30 s (135°), +0.40 s (180°). The top-down
diagnostic and the 3D overlay fill the loaded foot by its share — it is always clear which leg bears the weight.

## 5. Hip / shoulder sequencing
Lead order head → shoulders → torso → hips → legs: the shoulders lead the hips before the contact (90°: shoulders 72° vs hips 53°; 135°: 98° vs
75°), a counter-rotation at the contact on large turns, and the hips drive through after it. Maximum hip–shoulder separation 12–32°;
fastest hip rotation 231–643°/s, always just after the contact.

## 6. Root motion
The root is the simulation's own planned path (`A.path.rootAt`) plus its meeting correction, pulled 38 % toward the loaded foot so the pelvis rides over the stance. If a planted
leg would over-reach, the PELVIS moves (and lowers ≤ 5 cm) — never the foot; both feet's corrections are computed from the same state (no left / right order) and fade over the
first / last 60 ms of a swing (no pelvis jump at lift-off / touchdown).

## 7. Foot-lock / IK
Planted feet are IK targets that do not move; forefoot pivots are exact rotations about the MTP joint; run steps rise onto the forefoot before toe-off. Planted legs reach
≤ 0.971 of leg length. Measured on the POSED skeleton only (`tools/rt11_contin.mjs`, the same code for both bodies): forefoot sliding on the turf ≤ 1.0 mm,
heel ≤ 2.0 mm in the turn phase.

## 8. Contact sync
The contact foot reaches the CONTACT pose (the surface on the ball) at the authoritative contact tick: posed ankle error 0.0 mm in every case. It meets the ball 6 cm ahead
of the contact pose at −0.06 s, draws back with it (give 9 cm, through-stance 4.5 cm), follows through along the ball's actual new direction. The rejoin (the authoritative carry
launch) is an exact via-point of the swing: posed ankle vs the planned touch pose 0.0–14 mm (0 on every half-turn and through-stance turn; 6–7 mm
directional, 14 mm outside-of-foot where the leg is near full reach). The ball never follows the animation.

## 9. Directional motion
Subtle: hips 12° before / 18° after the contact at 30°, shoulders 22°, separation 12°; the receiving foot opens on its forefoot,
the touch goes across the body, the first exit step lands at +0.23 s.

## 10. Half-turn motion (the primary reference: 90°)
Open before the contact (53° of 90°), back-foot receive (R inside), the support foot plants toe-in at -0.35 s, the hips are aligned with the exit at
+0.12 s, the exit foot plants at +0.25 s, the weight is on it at +0.29 s, the ball is rejoined at +0.65 s. At 120–135° the pre-rotation grows
(71°, 75°), the support toe turns further in and a counter-rotation appears.

## 11. Outside-of-foot motion
Only where the simulation deems it feasible (slow passes, the review uses 4 m/s): the body steps off the ball line to make room (0.36 m of COM shift — the largest
of all families), the contact foot turns in (toe down 6°, raised so the toe clears the turf by ≥ 8 mm), 32° before / 58° after the contact.

## 12. Through-stance motion (150° / 180°)
A sequence of foot plants, not a root spin: the support foot plants (-0.32 s), the contact leg swings across (or behind) the standing leg on a routed
path, contact, the hips drive through (643°/s peak) while the support foot pivots on its forefoot (~115°), the contact foot lands as the step-through
(+0.36 s), the weight transfers (+0.40 s), the support foot lifts and steps out. The ball vector (the touch) and the body vector differ by design.
180°: 33° before / 147° after the contact.

## 13. 30 → 180° adaptations
| case | family | contact | turn | hips before / after | shoulders before | max separation | max hip rate | support plants | hips aligned | weight on exit foot | rejoin | plant slip mm | snap mm | v1 snap mm | contact reach: COM→ball m · leg ext. | COM prep m |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| d30 | directional | L inside | 30° | 12° / 18° | 22° | 12° | 231°/s | -0.26 | +0.07 | +0.27 | +0.55 | 0.0 | 6.5 | 86 | 0.41 · 0.93 | 0.10 |
| d60 | directional | L inside | 60° | 23° / 37° | 37° | 19° | 370°/s | -0.26 | +0.12 | +0.27 | +0.58 | 0.0 | 9.5 | 135 | 0.41 · 0.93 | 0.07 |
| h90 | half-turn | R inside | 90° | 53° / 37° | 72° | 28° | 367°/s | -0.35 | +0.12 | +0.29 | +0.65 | 0.0 | 14 | 147 | 0.27 · 0.87 | 0.26 |
| h120 | half-turn | R inside | 120° | 71° / 49° | 92° | 31° | 427°/s | -0.37 | +0.14 | +0.29 | +0.66 | 0.0 | 9.0 | 166 | 0.27 · 0.88 | 0.21 |
| h135 | half-turn | R inside | 135° | 75° / 60° | 98° | 32° | 469°/s | -0.38 | +0.16 | +0.30 | +0.67 | 0.0 | 13 | 172 | 0.27 · 0.88 | 0.20 |
| x135 | through-stance | L inside | 135° | 26° / 109° | 37° | 26° | 586°/s | -0.32 | +0.26 | +0.35 | +0.70 | 0.0 | 8.1 | 108 | 0.13 · 0.93 | 0.10 |
| t150 | through-stance | L inside | 150° | 28° / 122° | 40° | 27° | 608°/s | -0.32 | +0.28 | +0.37 | +0.70 | 0.0 | 8.4 | 96 | 0.13 · 0.93 | 0.10 |
| t180 | through-stance | L inside | 180° | 33° / 147° | 45° | 29° | 643°/s | -0.32 | +0.33 | +0.40 | +0.73 | 0.0 | 8.3 | 94 | 0.13 · 0.92 | 0.10 |
| o90 | outside-of-foot | R outside | 90° | 32° / 58° | 45° | 23° | 468°/s | -0.28 | +0.16 | +0.34 | +0.63 | 0.0 | 7.7 | 171 | 0.38 · 0.86 | 0.36 |
| m30 | directional | R inside | -30° | -12° / -18° | -22° | 12° | 231°/s | -0.26 | +0.07 | +0.27 | +0.55 | 0.0 | 6.5 | 86 | 0.41 · 0.93 | 0.10 |
| m60 | directional | R inside | -60° | -23° / -37° | -37° | 19° | 370°/s | -0.26 | +0.12 | +0.27 | +0.58 | 0.0 | 9.5 | 135 | 0.41 · 0.93 | 0.07 |
| m90 | half-turn | L inside | -90° | -53° / -37° | -72° | 28° | 367°/s | -0.35 | +0.12 | +0.29 | +0.65 | 0.0 | 14 | 147 | 0.27 · 0.87 | 0.26 |
| m120 | half-turn | L inside | -120° | -71° / -49° | -92° | 31° | 427°/s | -0.37 | +0.14 | +0.29 | +0.66 | 0.0 | 9.0 | 166 | 0.27 · 0.88 | 0.21 |
| m135 | half-turn | L inside | -135° | -75° / -60° | -98° | 32° | 469°/s | -0.38 | +0.16 | +0.30 | +0.67 | 0.0 | 13 | 172 | 0.27 · 0.88 | 0.20 |
| m150 | through-stance | R inside | -150° | -28° / -122° | -40° | 27° | 608°/s | -0.32 | +0.28 | +0.37 | +0.70 | 0.0 | 8.4 | 96 | 0.13 · 0.93 | 0.10 |
| m180 | through-stance | R inside | -180° | -33° / -147° | -45° | 29° | 643°/s | -0.32 | +0.33 | +0.40 | +0.73 | 0.0 | 8.3 | 94 | 0.13 · 0.92 | 0.10 |
| mo90 | outside-of-foot | L outside | -90° | -32° / -58° | -45° | 23° | 468°/s | -0.28 | +0.16 | +0.34 | +0.63 | 0.0 | 7.7 | 171 | 0.38 · 0.86 | 0.36 |
| pl90 | half-turn | R inside | 90° | 53° / 37° | 72° | 28° | 367°/s | -0.35 | +0.12 | +0.29 | +0.65 | 0.0 | 14 | 147 | 0.27 · 0.87 | 0.26 |
| pl135 | half-turn | R inside | 135° | 75° / 60° | 98° | 32° | 469°/s | -0.38 | +0.16 | +0.30 | +0.67 | 0.0 | 13 | 172 | 0.27 · 0.88 | 0.20 |
| tf180 | through-stance | L inside | 180° | 33° / 147° | 45° | 29° | 643°/s | -0.32 | +0.33 | +0.40 | +0.73 | 0.0 | 8.3 | 94 | 0.13 · 0.92 | 0.10 |
| tf180L | through-stance | R inside | -180° | -33° / -147° | -45° | 29° | 643°/s | -0.32 | +0.33 | +0.40 | +0.73 | 0.0 | 8.3 | 94 | 0.13 · 0.92 | 0.10 |

## 14. Left / right mirroring
176/176 pairs mirror exactly, joint for joint: a right-footed receiver's +θ turn vs a left-footed receiver's −θ turn, and a two-footed receiver's ±θ (15–180°,
6 / 12 / 18 m/s, BC 50 / 99, outside-of-foot at 6 m/s): the same family, the opposite foot, every posed joint mirrored within 3.8 µm (one float32 ulp of the rig's FK)
over 15312 poses. Two right-foot biases were found and removed on the way: the ready stance had the right foot 2 cm ahead for everyone (now the turn-side foot is
2 cm back), and the pelvis reach correction processed the right foot first (now order-free). The left-preferred receiver at +90 / +135° uses the same back foot (R) as the
right-footer — that is RECEIVE-TURN-1's selection (the half-turn's back foot); its preference shifts the LEFT turns.

## 15. BC 99 reference
All the cases above are BC 99, typical draw: the touch is almost exactly the ideal one, the body's path to the rejoin needs ≤ 0.02 m of correction.

## 16. BC 90 / 80 / 70 / 50 adaptations
The technique, contact foot, contact timing and the rotation are the plan's at every rating; the touch is the same keyed draw scaled by curve B; the body follows the ACTUAL ball.

**90° half-turn, seed 12** (matched draw)

| | BC 50 | BC 70 | BC 80 | BC 90 | BC 99 |
|---|---|---|---|---|---|
| class | ADJUSTED | ADJUSTED | IMMEDIATE | IMMEDIATE | IMMEDIATE |
| touch direction error | +18.8° | +14.7° | +11.6° | +6.6° | +2.1° |
| extra correction | 0.39 m | 0.27 m | 0.20 m | 0.10 m | 0.03 m |
| rejoins | +0.73 s | +0.70 s | +0.69 s | +0.67 s | +0.65 s |
| rejoined by | R | R | R | R | R |
| hips aligned | +0.12 s | +0.12 s | +0.12 s | +0.12 s | +0.12 s |
| snap (turn) | 18 mm | 17 mm | 10 mm | 13 mm | 14 mm |

**135° half-turn, seed 11** (matched draw)

| | BC 50 | BC 70 | BC 80 | BC 90 | BC 99 |
|---|---|---|---|---|---|
| class | ADJUSTED | ADJUSTED | IMMEDIATE | IMMEDIATE | IMMEDIATE |
| touch direction error | -31.3° | -23.7° | -18.1° | -9.9° | -2.9° |
| extra correction | 0.45 m | 0.32 m | 0.24 m | 0.13 m | 0.04 m |
| rejoins | +0.67 s | +0.67 s | +0.67 s | +0.67 s | +0.67 s |
| rejoined by | R | R | R | R | R |
| hips aligned | +0.16 s | +0.16 s | +0.16 s | +0.16 s | +0.16 s |
| snap (turn) | 14 mm | 14 mm | 14 mm | 13 mm | 13 mm |

**150° through-stance, seed 30** (matched draw)

| | BC 50 | BC 70 | BC 80 | BC 90 | BC 99 |
|---|---|---|---|---|---|
| class | ADJUSTED | ADJUSTED | ADJUSTED | IMMEDIATE | IMMEDIATE |
| touch direction error | -3.5° | -2.8° | -2.2° | -1.3° | -0.4° |
| extra correction | 0.56 m | 0.40 m | 0.33 m | 0.17 m | 0.05 m |
| rejoins | +0.32 s | +0.27 s | +0.78 s | +0.75 s | +0.71 s |
| rejoined by | L (follow-through) | L (follow-through) | L | L | L |
| hips aligned | +0.28 s | +0.28 s | +0.28 s | +0.28 s | +0.28 s |
| snap (turn) | 4.2 mm | 3.8 mm | 17 mm | 13 mm | 8.0 mm |

**180° through-stance, seed 19** (matched draw)

| | BC 50 | BC 70 | BC 80 | BC 90 | BC 99 |
|---|---|---|---|---|---|
| class | ADJUSTED | ADJUSTED | ADJUSTED | IMMEDIATE | IMMEDIATE |
| touch direction error | -12.6° | -10.1° | -8.2° | -4.9° | -1.5° |
| extra correction | 0.65 m | 0.45 m | 0.33 m | 0.25 m | 0.06 m |
| rejoins | +0.35 s | +0.29 s | +0.25 s | +0.74 s | +0.74 s |
| rejoined by | L (follow-through) | L (follow-through) | L (follow-through) | L | L |
| hips aligned | +0.33 s | +0.33 s | +0.33 s | +0.33 s | +0.33 s |
| snap (turn) | 5.3 mm | 5.1 mm | 5.1 mm | 7.7 mm | 7.7 mm |

On the large turns a short touch at BC 50–80 stays at the feet and is rejoined by the contact foot's own follow-through (+0.25…+0.35 s, before the hips align); at BC 90–99 the
exit stride rejoins it at ~+0.74 s.

## 17. Slip measurements
- Plant slip (the body's own plants, posed skeleton): **0.0 mm** (flat ankles and pivot MTP joints) in all 21 cases.
- Model-independent continuity (`rt11_contin.mjs`, posed joints only, the same for both bodies), turn phase: forefoot sliding on the turf ≤ 1.0 mm; foot snap
  (1-tick second difference) ≤ 14 mm, located at the ball touches (a strike). RECEIVE-TURN-1's body on the same episodes: snap 86–172 mm
  (its contact foot jumps ~0.16 s after the contact), forefoot sliding up to 99 mm (outside-of-foot).
- **Correction of an earlier claim.** Earlier in this milestone I reported "slip 0.0 mm" from a measure that only looked inside planted stretches. The posed-skeleton continuity
  measure then exposed real snaps at segment boundaries, all fixed: a pivot's end pose was not carried into the next segment (the foot jumped back up to 27 cm at lift-off);
  the rejoin-touch blend was already on at lift-off (23 cm jump); flight phases reset the weight share to 50/50 (pelvis jumped 10–17 cm); the reach correction switched off
  at lift-off; a 1 cm height step at the end of the give; the outside contact pose put the toe 7 mm into the turf.

## 18. Rotation before / after the contact
In the table (§13): directional 12–23° / 18–37°, half-turn 53–75° / 37–60°, outside-of-foot 32° / 58°, through-stance 26–33° / 109–147°.

## 19. Frame strips
Every case: a strip at the body's own event times — preparation begins, support foot plants, contact leg begins swing, BALL CONTACT, maximum hip rotation, body aligned with
the exit, exit foot plants, weight transfer onto the exit foot, rejoins the ball (`clips/main/e_*.jpg`); BC 99 and BC 50 strips for 90 / 135 / 150 / 180° (`clips/bc/be_*.jpg`).

## 20. Slow-motion clips
Close 3/4, encoded at 0.25× (`clips/main/s_*.mp4`); RECEIVE-TURN-1's body on the same actions (`clips/main/v1_*.mp4`); the BC sets at 0.5× (`clips/bc/`); the technique × angle grid
at 0.5× (`clips/tech/`, 54 clips: every family at 30–180°, right and left).

## 21. Gameplay clips
The gameplay camera in real time for all 21 cases (`clips/main/g_*.mp4`); overhead 0.5× for 90 / 135 / 150 / 180° and the outside turn (`clips/main/o_*.mp4`). Every clip carries
the body top-down diagnostic (numbered plants, pivots, swing paths, COM trail, posed hip and shoulder lines, the loaded foot).

## 22. ON / OFF neutrality
750/750 cases identical with the human body posed every 2nd tick vs not at all (technique, foot, surface, contact tick, executed launch, every launch, follow-up,
continuation, ball path) — 13 angles × right / left × 6 / 12 / 18 m/s × BC 30 / 50 / 70 / 90 / 99 × 2 seeds.

## 23. Determinism
Body deterministic 750/750 (324,750 poses re-posed identically). Chrome = Node 54/54 simulation fingerprints and 54/54 posed-joint hashes
(1e-7 m) through the lab's own chain.

## 24. Protected-system regression
- Protected / frozen files 386/386 identical (`evidence/frozen_sha256_start.txt` / `_end_check.txt`: DRIBBLE-V1, TURN-1.2, RUN-1, BALL-FEEL, tackle, RECEIVE-CONTROL-1.1, RECEIVE-KILL-1 / 1.1 / 1.2,
  and every committed RECEIVE-TURN-1 file).
- One process (`tools/rt11_regress.mjs`): DRIBBLE-V1 60/60 before == after and 48/48 = its frozen evidence; RECEIVE-CONTROL-1.1
  11/11; RECEIVE-TURN-1 18/18; with 390 turns and 163,760 human-body poses run between; D1 / RX / RXE unchanged: True.

## 25. Known limitations
- A procedural placeholder body on the real rig: the reference motion is authored as parameters per family and angle, not mocap.
- Shorts-mesh deformation where the legs cross (through-stance, ~+0.2 s) — a skinning artefact of the character mesh.
- The run-out after the rejoin is a generic stride: peak foot speed 18.5 m/s, IK reach kinks ≤ 29 mm near full extension; RUN-1 is the real locomotion.
- Rotation timing does not change with Ball Control (it is the technique's); only the touch and the body's path to the ball do.
- The rejoin at BC 50–80 on large turns is played by the contact foot's follow-through while the hips are still turning — plausible for a ball that stayed at the feet, worth a look.
- No Agility, no running receives, no physical body simulation (as instructed).

## 26. Review / lab links (local only — the character is a real player's model)
- Review: `http://127.0.0.1:8361/review_artifacts/receive_turn11/review/RECEIVE_TURN11_REVIEW.html`
- Lab: `http://127.0.0.1:8361/sandbox/visual/receive_turn11_lab.html` (`&body=v1` shows RECEIVE-TURN-1's body; `&top=ball` the football top view)
- Evidence: `review_artifacts/receive_turn11/evidence/` · tools: `sandbox/visual/receive_turn11/tools/`
