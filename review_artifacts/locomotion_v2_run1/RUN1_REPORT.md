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

## 3. Biomechanics and references

Full table with sources: `RUN1_RESEARCH.md`. It separates measured values **[M]**, approximations **[A]**, animation-design choices **[D]** and Touchline-specific choices **[T]**. Key numbers at 5.5 m/s, for a 0.834 m leg:

**Timing**
- cadence 192 spm, step 1.72 m;
- contact 0.175 s, flight 0.137 s, toe-off at 28 % of the stride.
- Sources: Hamner & Delp 2013 (194 spm at 5 m/s); Takai 2025 (footballers: higher step rate, shorter steps).

**Stance knee**
- 22° at touchdown, 40° at mid-stance, 23° at toe-off.
- Sources: Sundström 2021 (21.6 / 51.5° at 4.4 m/s); Miyashiro 2019 (sprint ≈ 28 / 41 / 25°).

**Swing**
- Peak knee 115°: Fukuchi 2017 measured 108.7 / 119.1° at 3.5 / 4.5 m/s.
- Peak hip 62° relative to the pelvis, a thigh angle of 54° to vertical.
- Footballers lift the thigh less: Clark 2025, 65° vs 75.5° at top speed.
- Scissor timing follows Clark 2025.

**Foot**
- An 8° toe-up rear/mid-foot strike (Altman & Davis 2012).
- A steep toe-off: the shank leans ≈ 53° plus ≈ 24° of plantar-flexion (Miyashiro 2019).
- MTP extension is capped at 52° (V2 F1 range).

**Pelvis**
- 3.9 cm of bounce. **[T]** a grounded footballer, not a bouncy jogger; Brughelli 2011 also finds the bounce falls with speed.
- Tilt ± 2.2°, peaking at each toe-off (Schache 2003; Ota 2024). Obliquity ± 3.5°.
- Axial rotation ± 6° (Ota 2024), counter-phased to the thorax, which rotates ± 13° (Preece 2016a; Pontzer 2009).

**Arms and head**
- Arms are contralateral, each most forward near its own leg's toe-off. Forward 33° and back 45°.
- The elbow is at 84° ± 12° and closes in the forward swing.
- The wrist stays lateral of the midline (Hild 2005).
- The head keeps a residual 6° of yaw (Pontzer 2009) and a nod (Pozzo 1990).

**Speed anchors**
- Jog 3.0 m/s: 165 spm, 0.27 s contact, 13° rear-foot strike.
- Sprint 7.8 m/s: 249 spm, 0.12 s contact, a flat strike, 132° of knee recovery, 13° lean.

## 4. Iteration history

See `RUN1_ITERATIONS.md`, which records for each iteration the problem, the one change and the result.

**Visible improvements:**
- **0–2:** a feasible stance. The knee was still extending at toe-off and dragged the foot through the turf; the late stance became knee-driven, and C1 now holds at both contact events.
- **3:** a crouched "sitting" mid-stance was raised to a footballer's posture.
- **4:** a mirror-handed close camera had shown the shirt back from the front. Only the camera was wrong.
- **5:** "hands on hips" and "boxing" arms became driving arms, with the wrists kept lateral.
- **7:** a 74° MTP extension became a 52° cap with a toe-pad roll, a real push-off.
- **8–9:** jog and sprint anchors, plus acceleration and deceleration.
- **11:** the swing foot passed through the stance calf because of a sign error in the mid-swing abduction. It now clears the calf by ≥ 11 cm, and from behind the heel passes outside the stance leg.
- **12:** the head was a gyroscope; it now has a residual yaw, nod and roll.
- **13:** the hand traced a pendulum arc; its path now opens into a loop.

## 5. Diagnostics (all reproducible: `node sandbox/visual/run1/tools/<tool>`)

| check | tool | RUN-1 result |
|---|---|---|
| contact-point slip (heel / MTP / toe pad while planted) | `run1_continuity.cjs` | **0.000 cm** at constant speed; 0.01 mm / tick on the 3 → 7.8 → 3 m/s ramp. V1.3 shows 0.6–3.2 cm on this metric (0.0 on its own) |
| continuity (2nd difference of joint positions, p99, cm per tick², 60 Hz) | `run1_continuity.cjs` | pelvis 0.29, hands 1.29, knees 2.96, ankles 5.95, toes 7.0. V1.3: 12.0 / 12.3 / 21.7 / 13.4 / 14.1. V1 + LC-1: 0.58 / 2.55 / 11.1 / 8.5 / 9.8. At 240 Hz the RUN-1 values fall to about 1/16, the signature of a C1 signal |
| joins (stance ↔ swing) | `run1_report.cjs` | every leg channel C0 + C1 at toe-off and touchdown (Δ value < 0.003°, slopes equal) |
| penetration / swing clearance | `run1_continuity.cjs`, `run1_report.cjs` | penetration 0; lowest swing boot point 5.9 cm |
| inter-leg clearance | `run1_clearance.cjs` | swing foot to stance-leg line ≥ 11.2 cm, knees ≥ 19 cm apart (3.0–7.8 m/s) |
| joint ranges vs the V2 planning box (hard − 5°) | `run1_limits.cjs` | all inside except sprint hip extension, −20.9° vs −20° (inside the hard range; −23° measured) |
| determinism / RNG / clock | `run1_determinism.cjs` | bit-identical joint matrices across fresh runs (constant speed and ramp); no RNG or clock in the pose path |
| exported velocities | `run1_kinematics_check.cjs` | converge against finer references (0.40 → 0.061 → 0.023 m/s); the planted ankle is 0 within float32 world precision |
| simulation neutrality | `neutrality_of_loco_regress.txt` | no file outside the RUN-1 paths changed, and the existing V1 gate's neutrality and determinism are IDENTICAL. Its item-3 flag is a pre-existing corner-flag timer in `of_player.js` (since `e2c98ec`) |
| other rigs | (inline check) | all six real characters solve cleanly; cadence scales with leg length (Gabriel 1.90 m: 182 spm) |

(Sections 6 onward are filled in at the end of the night.)
