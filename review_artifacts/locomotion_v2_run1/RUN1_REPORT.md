# Locomotion V2 / RUN-1: morning report (draft, updated through the night)

## 1. Watch it

```
cd "$HOME/Downloads/FC Simulator worktrees/locomotion-v2-run1"
python3 -m http.server 8317 --bind 127.0.0.1
```

Then open **http://127.0.0.1:8317/sandbox/visual/run1.html**.

- **What you see.** The page autoplays RUN-1 and Locomotion V1 side by side.
  - The large view is the actual gameplay camera, CAMERA_V1.
  - On the right are close side views of RUN-1 (top) and V1 (bottom).
- **Speed.** 1× / 0.5× / 0.25× / 0.1×, plus a frame step.
- **Show.** RUN-1 only / both / V1 only. V1 can be the V1.3 presentation or V1 + LC-1.
- **Run.** Across, toward the camera, away, or diagonal, at 3.0 / 4.2 / 5.5 / 7.0 / 7.8 m/s or the 3 → 7.8 → 3 m/s ramp.
- **Game zoom.** 1× is the true game scale. Zooming in keeps the same camera and centres the runner.
- **Overlays.** Skeleton, contacts, pelvis / COM, foot trails.
- **Close views.** Choose the subject and angle (side, front, rear, front-¾, rear-¾, top).
- **⤓ State.** Exports the continuous RUN-1 state at the current time.
- **Keys.** Space, R, 1–4, `.`, S, C.

## 2. Motion architecture (`sandbox/visual/run1/run1_gait.js`)

One periodic cycle. RIGHT touchdown is at phase 0 and LEFT at 0.5. The pose is a closed-form function of the gait phase, plus a small presentation state: the plants and the acceleration lean.

| layer | construction |
|---|---|
| authority | The simulation owns the root: position, heading and speed. RUN-1 reads them and writes nothing back. It has no RNG and no clock, and it is advanced on a fixed 1/240 s grid, so the state at time t is a pure function of the input history. |
| pelvis | A spring-mass vertical: a half-sine stance force and a ballistic flight, in closed form, so height, velocity and acceleration are continuous (× 0.6, a grounded footballer). It sways ± 1.2 cm toward the stance foot. Tilt peaks at each toe-off; obliquity drops the swing side; axial rotation follows the thigh scissor. |
| stance (foot space) | A plant is made at each touchdown and fixed on the pitch; in the root frame it travels back by the root's own travel, so the foot cannot skate. The foot rolls heel contact → flat → MTP joint → toe pad (MTP extension capped at 52°, C1). Hip and knee come from an analytic two-bone IK on the spring-mass pelvis. The late stance is knee-driven: a prescribed knee curve, C1 from the flat-foot IK, is already flexing at toe-off, and the heel rise is solved from it. |
| swing (joint space) | Each leg channel is a piecewise cubic Hermite curve through a few authored keys: leg yaw, hip adduction, hip flexion in the leg plane, knee, ankle yaw / pitch / roll and toe. The keys are peak knee recovery, the knee hold, late-swing extension, peak hip drive, retraction, swing dorsiflexion, mid-swing abduction and internal rotation. **The end values and end slopes are the stance solution's at toe-off and at the next touchdown**, so every channel is C0 + C1 through both contact events by construction. |
| solve | Plant distance ↔ touchdown knee and pelvis height ↔ toe-off foot angle, by nested bisection (both relations are monotone). |
| trunk / arms / head | Lean, with an acceleration lean. The thorax counter-rotates the pelvis, 78 % of it in the thoracic spine. Arms swing contralaterally from the shoulder, with the elbow closing in the forward swing and the wrist kept lateral of the midline; a subtle constant L/R asymmetry is added. The head is stabilised toward the direction of travel, with a residual yaw, nod and roll. |
| speeds | Anchors: jog 3.0, run 5.5 and sprint 7.8 m/s, blended by the authoritative speed. The solved gait is cached on a 0.25 m/s speed grid and interpolated, so no solve runs per frame. |
| continuous state | `r1Kinematics` gives the gait phase, root, per-foot contact state and plant, joint world transforms, and joint angular and linear velocities. The velocities are a symmetric difference of the closed-form replay at t ± 0.5 ms. |
| rig | The real Vinícius character (23-bone anim3d hierarchy, translation-only bind), driven by world matrices built directly. The V2 joint ranges are the PI-1 V2 runner body's, which was generated from the same rig. |

(Sections 3 onward are filled in at the end of the night.)
