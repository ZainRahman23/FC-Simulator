# Locomotion V2 / RUN-1: morning report (draft, updated through the night)

> **10 Oct, afternoon:** this report describes the original RUN-1, now **RUN-1.0**, frozen in `run1_gait_orig.js`. The effort pass that followed your review, **RUN-1.1**, is in `RUN1_1_EFFORT.md` (reference, iterations E0–E6, results, regressions, next step).

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

## 6. Remaining weaknesses (honest list)

1. **Straight lines only.** Plants live in the root frame, so a heading change during stance would slide the planted foot. Turning, cutting, stop / start and walking are not implemented. Below 3.0 m/s the jog anchor is clamped and is not valid.
2. **Peak stance dorsiflexion ≈ 33°** at 5.5 m/s, against ≈ 27° measured.
   - It sits inside V2's hard − 5° box (40°), but above V2's pose-dependent *active* soft limit (≈ 27° at a 40° knee).
   - Every lever trades another measured quantity for it (iteration 14 note), and the difference is invisible from the gameplay camera.
3. **The touchdown knee flexes ≈ 840 °/s.** That is consistent with spring-mass leg compression, but faster than the ≈ 400–600 °/s commonly reported. It reads as a quick "give" on landing.
4. **Sprint hip extension** reaches −20.9° against the −20° planning box (inside the hard range; −23° measured at 4.4 m/s).
5. **Late-stance hover.** The boot mesh hovers up to ≈ 9 mm for a few ms at the very end of stance, as the toe-spring region leaves the turf.
6. **Hand ↔ hip clearance** is 14–17 cm between bone lines, against a radius sum of ≈ 14 cm, so the hand brushes past the hip at the sprint back-swing.
7. **Exactly periodic.** At constant speed there is no stride-to-stride variability. The only "life" is the constant L/R asymmetry.
8. **The pelvis axial-rotation phase** is a design choice: it rotates with the forward-driving thigh. The literature is ambiguous ("reversed vs walking"), and it is invisible at gameplay scale.
9. **Asset observations, not RUN-1.** These are present identically in V1 and in the existing runtime:
   - Vinícius's front shirt print ("Emirates / FLY BETTER") and crest render **mirrored**, while the back print reads correctly. A chirality check on Osimhen matches Astra's own reference render, so the camera is right and this is the asset.
   - The curled hands show dark openings in close-ups.
10. **The viewer's pitch is a procedural stand-in** (stripes and markings, no stadium bowl). The camera is CAMERA_V1 exactly; the environment is not the full match environment.

## 7. Joint / contact / continuity diagnostics

These are in §5, with the raw outputs in this folder:
- `continuity_const_5.5.txt/.json` and `continuity_ramp_3_7.8.txt/.json`;
- `mesh_contact.txt`, `clearance.txt`, `joint_limits.txt`;
- `cycle_report_5.5.txt` (the full stride table, the join slopes and the plant slip);
- `determinism.txt`, `neutrality_of_loco_regress.txt`.

**Final values** (5.5 m/s, 60 Hz):
- Continuity p99, in cm per tick²:

  | joint | RUN-1 | V1.3 |
  |---|---|---|
  | pelvis | 0.29 | 12.0 |
  | hands | 1.39 | 12.3 |
  | knees | 2.95 | 21.7 |
  | ankles | 5.90 | 13.4 |
  | toes | 6.98 | 14.1 |

- Contact slip: 0.000 cm.
- Mesh contact in stance: median 0.0 mm. V1.3: +17.0 mm, with a minimum of −6.0 mm.
- Peak rates: hip 636, knee 836, ankle 950, toe 1134 °/s.

## 8. CPU

Node v22 (V8), `run1_perf.cjs`, 1,500 frames after a 120-frame warm-up. The cost covers the gait, IK, FK and skin matrices, per frame.

| | 1 rig mean / p95 | 22 rigs mean / p95 | per rig |
|---|---|---|---|
| **RUN-1** | 0.032 / 0.051 ms | **0.60 / 0.72 ms** | 27 µs |
| V1.3 (`ofActorTick`) | 0.145 / 0.202 ms | 2.90 / 4.01 ms | 132 µs |
| V1 + LC-1 | 0.672 / 0.844 ms | 14.7 / 18.1 ms | 667 µs |

- **Speed changes** cost no solve per frame: the gait comes from the speed-grid cache, and each grid cell is solved once (≈ 5 ms the first time a speed band is used).
- **Allocations** are not yet optimised: a 7 MB heap delta over 1,500 frames × 22 rigs. GC pressure is the obvious next optimisation (preallocated matrices).
- **Simulation outcomes:** RUN-1 has no path into the simulation. No file outside the RUN-1 paths changed, and the existing V1 neutrality / determinism gate is IDENTICAL.

## 9. Files and commits

**Branch** `prototype/locomotion-v2-run1`, from `9d57d460`.
- 21 commits before 06:00 on 10 Oct, pushed in the 06:00 housekeeping (head `affc30b0`).
- Later commits are local and will be pushed at the next daily rule.

**New files only:**
- `sandbox/visual/run1.html`: the viewer page.
- `sandbox/visual/run1/run1_gait.js`: the gait core and runtime (`r1Make` / `r1Advance` / `r1Evaluate` / `r1Replay` / `r1Kinematics`).
- `sandbox/visual/run1/run1_viewer.js`: the viewer.
- `sandbox/visual/run1/tools/`:
  - `run1_load.cjs`, `run1_report.cjs`, `run1_capture.cjs`;
  - `run1_continuity.cjs`, `run1_clearance.cjs`, `run1_limits.cjs`, `run1_meshcontact.cjs`;
  - `run1_paths.cjs`, `run1_kinematics_check.cjs`, `run1_determinism.cjs`, `run1_perf.cjs`.
- `review_artifacts/locomotion_v2_run1/`:
  - `RUN1_REPORT.md` (this file), `RUN1_ITERATIONS.md`, `RUN1_RESEARCH.md`, `RUN1_WORKLOG.md`;
  - `captures/` with its MANIFEST, and the diagnostic outputs.

**Housekeeping** (the daily rule at 06:00):
- `touchline-current` `e57bf98d`: the 9 Oct chronicle, plus 4 owner screenshots.
- Pushed:
  - `touchline-current`;
  - `prototype/physical-character-v2` (`0ddba2b2..c647f4c9`);
  - new remote branches `prototype/slide-contact-v1.3-charcollide`, `prototype/locomotion-continuity-v1` and `prototype/locomotion-v2-run1`.
- The follow-up `git ls-remote` verification was **blocked by the auto-mode permission classifier**. The push output and the local tracking refs match the pushed heads. Please confirm on GitHub, and confirm you are happy that the three local branches are now public on the remote.

## 10. Is RUN-1 visually better than Locomotion V1?

**Yes, materially.** I am judging from the same mover, rig and camera (captures 01–04, 10; continuity and mesh contact):

- **A real running stride.** V1 takes short, bent-legged, nearly flightless steps. RUN-1 has a clear flight, a hip-extended push-off that rolls onto the toe pad, high heel recovery, knee drive and late-swing retraction into a soft touchdown. The ankle traces the egg-shaped loop of human running; V1's ankle and toe paths have corners and notches (`10_motion_paths…`).
- **Grounded feet.** The planted boot sits on the turf, not 17 mm above it or dipping into it, and never slides.
- **Smoothness.** Every joint is 4–7× smoother frame to frame, and continuous through both contact events by construction.
- **A human upper body.** Thorax counter-rotation, driving arms that stay lateral of the midline, and a stabilised head that is not a gyroscope.
- **Narrow running base.** The feet land near the line of travel, as real runners' do, instead of on two wide tracks.
- **Cost.** About 5× cheaper.

At the true gameplay scale (1×, ≈ 30 px tall) the difference is mostly rhythm and leg scissor, and it is visible. At 2.5× – 4× it is obvious.

## 11. Recommended next (not started)

1. **Your visual review** in the viewer: 1× and 2.5× gameplay camera, at 1× and 0.25×. Then decide whether this construction becomes the production locomotion.
2. **World-space plants and curved running.** Store each plant in pitch coordinates and add a turn / lean layer (the curve radius from the authoritative heading rate). This is the prerequisite for cuts.
3. **Integration behind a flag** in the match presentation (`ofActorTick`'s LOCO branch, e.g. `?run1=1`), driven by the simulation's own root and stride clock. Keep the shared law (`ofLocoCycle` / `OF_BOOT`) untouched for the simulation, or re-derive the simulation's boot plan from RUN-1 deliberately, as a separate, gated gameplay change.
4. **Walk / jog-to-stop / start** and the low-speed anchor (< 3 m/s).
5. **Allocation-free evaluation** (preallocated matrices), then a 22-rig browser benchmark including GPU skinning.
6. **The interaction bridge.** `r1Kinematics` already exports the continuous state (joint transforms, angular and linear velocities, contact state) for ITS-1-style activation.
