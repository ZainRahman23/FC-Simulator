# V2-G0: anatomy and static construction (report)

**Status: G0 PASS.**
- Every check passes on all 8 bodies (6 population / reference + 2 morphology variants), plus 4 global checks.
- **STOPPED for your visual inspection.** G1 not started. No standing, no balance, no stepping, no walking. Nothing pushed.

**Review page:** <http://127.0.0.1:8172/sandbox/visual/physchar2/viewer/index.html>
- The server is left running: `python3 -m http.server 8172`, from the V2 worktree root.
- Restart it with: `cd "/Users/zainrahman/Downloads/FC Simulator worktrees/physical-character-v2" && python3 -m http.server 8172 --bind 127.0.0.1`.

**Reproduce** (from `sandbox/visual/physchar2/`):
- `node tools/g0_run.js` runs every check (exit 0 = pass).
- `node tools/g0_report_tables.mjs` regenerates the tables.
- `tools/g0_capture.sh` re-captures the stills.

## History

| step | commit | result |
|---|---|---|
| First G0 run | `9aacdf3` | FAIL on two specification contradictions, no implementation failures. **C1:** the head sphere was +15.5 mm outside the head-breadth tolerance. **C2:** population bands were applied to the ±2 SD morphology variants. |
| Resolutions (your decision, 2026-10-02) | this commit | Only these two were applied: C1 AP head capsule; C2 explicit population / morphology-variant distinction. See `DECISIONS.md` and `sources/2026-10-02_user_decision_g0_resolutions_c1_c2.md`. **No other specification value was changed.** |

## 1. Final results

| body | kind | checks |
|---|---|---|
| V2-REF 1.82 m / 78 kg | population | **46 / 46** |
| V1-matched 1.90 / 78 | population | **46 / 46** |
| 1.65 / 62 · 1.75 / 70 · 1.90 / 85 · 1.98 / 92 | population | **45 / 45** each |
| long legs (legScale 1.05) · short legs (0.95) | morphology variant | **45 / 45** each (COM / inertia reported, not banded) |
| global: ×3 determinism, topology identity, pinned Jolt build, V1 guard | — | **4 / 4** |
| **Browser = Node** | — | **8 / 8** bodies: identical spec, engine-state and readback hashes (headless Chrome) |

The 46th check on V2-REF and V1-matched is the agreement with the approved Python calculation, which exists for those two bodies.

**Headline numbers (V2-REF, exact runner output):**

| quantity | value |
|---|---|
| Mass | 78.910 kg (body 78.000 + equipment 0.910). Every segment = de Leva fraction × M, error 0. |
| Standing arms-down COM | 0.5569 H (population band 0.55–0.58 H). Canonical COM 2.1 mm ahead of the ankle line. |
| Whole-body inertia, arms down, no equipment | pitch 13.22 · roll 13.96 · yaw 1.102 kg·m² (band 11–14 / 11–14 / 1.0–1.5). Recomposed from the Jolt readback: 1.0e-7 rel. |
| Requested morphology | stature exactly 1.820 m; leg 0.4760 H; C7 0.8605 H |
| Head collider (C1) | AP capsule r 0.0801 m, cylinder half-length 0.0237 m. AP and lateral extents 0.0 mm from ANSUR head length / breadth. Top 9.1 mm below the vertex. |
| Boot hull | 29.35 × 11.27 cm. Heel 6.63 cm behind / tip 22.72 cm ahead of the AJC. MTP1 14.51 cm ahead. AJC 9.10 cm up. Soles on the stud plane to 0.00 mm. |
| Skeleton round trip | 1.7e-18 m / 0 rad |
| Mapping chain at the 7 reference poses | 2.5e-16 m |
| Joint axes | 35 / 35 anatomical-direction probes |
| Canonical-pose limit margin | 5.00° minimum (elbow) |
| Singularity margin | 55.1° minimum |
| Jolt readback | mass 7.7e-8 rel; inertia 2.4e-7 rel; COM 1.0e-7 m; frames 2.8e-7; limits 5.8e-8 rad; constraint-space rotation exact |
| Zero-gravity step | Δpos 1.2e-10 m |
| Collider clearance | no interpenetration at any of the 7 reference poses |

**Morphology variants** (reported values, consistency checks pass):

| variant | COM | pitch / roll / yaw (kg·m²) | leg |
|---|---|---|---|
| long legs | 0.5675 H | 12.90 / 13.61 / 1.056 | 0.4998 H |
| short legs | 0.5462 H | 13.58 / 14.35 / 1.154 | 0.4522 H |

Both: stature exact, C7 at 0.8605 H, engine-recomposed COM / inertia ≤ 1.2e-7 rel.

## 2. The two applied resolutions

### C1: head collider

| | |
|---|---|
| Before | sphere r 0.0525 H |
| After | **front-to-back capsule**: r = head breadth / 2 = 0.044 H, cylinder half-length = (head length − head breadth) / 2 = 0.013 H, axis anterior–posterior |
| Reason | represent the head's different anatomical length (0.114 H) and breadth (0.088 H) within the existing approved tolerance (−15…+5 mm). **The tolerance was not widened.** |
| Placement | **Implementation note:** the capsule takes the original sphere's placement **rule** (top 0.005 H below the vertex, AP centre +0.0055 H), not its old centre point. With r 0.044 H, the old centre would have put the head top 24.6 mm below the vertex, failing 0.6d. |
| Unchanged | head mass and inertia (colliders carry no mass) |
| Amended | spec §11, §15.2, §15.5, §18; calc; JSON |

### C2: population bands vs morphology variants

- Spec §22 0.4 / 0.5 / 0.12 are amended.
- Every variation-set body carries `kind`.
- **`population`** bodies must pass the population COM band (0.4a) and inertia band (0.5).
- **`morphology-variant`** bodies:
  - report those values (`0.4a-R`, `0.5-R`, report-only);
  - must pass their own internal-consistency checks, as for every other body:
    - requested morphology realised exactly (new 0.4c);
    - total mass (0.2a) and segment allocation (0.2b, 0.2c);
    - COM / inertia calculation consistency (new 0.5b: whole body recomposed independently from the Jolt readback = spec composition);
    - bilateral geometry (0.8c);
    - valid joints and colliders (0.6–0.11);
    - deterministic construction (0.1, 0.1b).
- 0.4c and 0.5b run on **every** body.

## 3. Implementation choices to keep in view (unchanged from the first G0 report; none alters an approved value)

| # | item | what was done |
|---|---|---|
| I1 | Engine hard limits | Tight hull of every anatomical hard extreme in the ROM-centred frame (stop never undercuts an anatomical extreme). Largest widening from swing–twist coupling: 29.4° (shoulder abduction axis). |
| I2 | Shoulder angles | Measured from the arm hanging; T-pose = abduction 90° |
| I3 | Geometric offsets | Spec metres at V2-REF implemented as fractions of H (identical at V2-REF) |
| I4 | Jolt `mMaxAngularVelocity` | 100 rad/s, so physiological segment speeds are never clipped |
| I5 | Passive-only foot ab/adduction | 10 N·m at the ±15° stop [ENG] |
| I6 | Pose-dependent couplings | Implemented as data and laws; parameters fitted at G1 |
| I7 | Friction per sub-shape | Materials recorded; friction is first exercised at G1 |
| I8 | Solver iterations | Jolt defaults until G1's convergence study |
| I9 | Render toe (F0) | Bisection keeps the toe tip on the turf, clamped 0–60°, about the foot's lateral axis |
| I10 | Hand collider | Ends at the knuckles (as specified) |
| I11 | Elbow canonical margin | Exactly at the 5° threshold |
| I12 | Neck AIM twist | 27 % measured about the neck bone's own axis |
| I13 | Viewer camera | Left-handed look-at: the image is anatomically correct (seen from the front, the character's right is on your left) |

## 4. What to inspect on the review page (focus buttons)

| focus button | what it shows |
|---|---|
| **pelvis / hips** | the single Unity `hips` bone at mid-HJC, between the two physical hip joint centres (constraints, not bones) |
| **knee axes** | flexion axis (green) at each physical knee centre; limit cone with a joint row clicked |
| **foot / ankle / toe** | the AJC inside the rigid boot hull; heel 6.6 cm behind, MTP1 14.5 cm and tip 22.7 cm ahead; `foot` → `toe` (render toe, procedural) |
| **shoulder** | `spine_03` → `clavicle` → `upperArm` at the physical shoulder centre; deltoid sphere; axes and limit cone |
| **spine mapping** | neutral pose: `spine_01` on the physical lumbar joint, `spine_02` on the thoracic joint, `spine_03` on the thorax, `neck` on C7 |
| **proportions** | front view with dimensions |

Also available:
- poses: T-pose (canonical), neutral anatomical, and the five G0 reference poses;
- the body selector, covering all 8 bodies;
- left / right labels (blue L, red R) and every toggle you listed;
- numeric tables for bodies, joints and bones;
- G0 running live, with the browser = Node verdict.

## 5. Stills (`g0/shots/`)

Re-captured after C1:

| still | shows |
|---|---|
| `01_three_quarter` | default ¾ view |
| `02_front_dimensions` | front view with dimensions |
| `03_back` | back view |
| `04_right_side` | right side |
| `05_focus_pelvis_hips` | pelvis / hips |
| `06_focus_knee_axes` | knee axes |
| `07_focus_foot_ankle_toe` | foot / ankle / toe |
| `08_focus_shoulder` | shoulder |
| `09_focus_spine_mapping` | spine mapping |
| `10_neutral_front` | neutral pose, front |
| `11_deep_squat_side` | deep squat, side |
| `12_top` | top view |

---

# Appendix — generated tables

### Generated body table (V2-REF)

| # | body | bones driven | segment length (m) | mass kg (body + equipment) | COM from proximal joint (m) | I_xx / I_yy / I_zz about COM (kg·m²) | off-diagonal max | colliders | parent joint |
|---|---|---|---|---|---|---|---|---|---|
| 0 | pelvis | hips, root(derived) | 0.1523 | 8.803 (8.713 + 0.09) | (0.000, 0.059, 0.000) | 0.0614 / 0.0696 / 0.0764 | 0.0e+0 | box | — (root) |
| 1 | abdomen | spine_01 | 0.2253 | 12.737 (12.737 + 0.00) | (0.000, 0.124, 0.031) | 0.0948 / 0.1416 / 0.1502 | 0.0e+0 | box | lumbar |
| 2 | thorax | spine_02(aim), spine_03, clavicle | 0.2512 | 12.649 (12.449 + 0.20) | (0.000, 0.125, 0.040) | 0.0817 / 0.1722 / 0.2032 | 0.0e+0 | box + capsule | thoracic |
| 3 | head | neck(aim), head | 0.2539 | 5.413 (5.413 + 0.00) | (0.000, 0.127, 0.031) | 0.0346 / 0.0238 / 0.0320 | 0.0e+0 | capsule + capsule | neck |
| 4 | upperArm_L | upperArm_L, upperArm_twist_L | 0.2945 | 2.114 (2.114 + 0.00) | (-0.170, 0.000, 0.000) | 0.0046 / 0.0133 / 0.0149 | 0.0e+0 | sphere + tapered | shoulder_L |
| 5 | forearm_L | lowerArm_L, forearm_twist_L, hand_L | 0.2811 | 1.739 (1.739 + 0.00) | (-0.190, 0.000, 0.000) | 0.0021 / 0.0253 / 0.0264 | 0.0e+0 | tapered + capsule(hand) | elbow_L |
| 6 | upperArm_R | upperArm_R, upperArm_twist_R | 0.2945 | 2.114 (2.114 + 0.00) | (0.170, 0.000, 0.000) | 0.0046 / 0.0133 / 0.0149 | 0.0e+0 | sphere + tapered | shoulder_R |
| 7 | forearm_R | lowerArm_R, forearm_twist_R, hand_R | 0.2811 | 1.739 (1.739 + 0.00) | (0.190, 0.000, 0.000) | 0.0021 / 0.0253 / 0.0264 | 0.0e+0 | tapered + capsule(hand) | elbow_R |
| 8 | thigh_L | upperLeg_L, thigh_twist_L | 0.4277 | 11.075 (11.045 + 0.03) | (0.000, -0.175, 0.000) | 0.2187 / 0.0449 / 0.2187 | 0.0e+0 | tapered | hip_L |
| 9 | shank_L | lowerLeg_L, calf_twist_L | 0.4386 | 3.457 (3.377 + 0.08) | (0.000, -0.194, 0.001) | 0.0398 / 0.0070 / 0.0414 | 1.5e-4 | tapered | knee_L |
| 10 | foot_L | foot_L, toe(proc) | 0.2785 | 1.269 (1.069 + 0.20) | (0.000, -0.049, 0.063) | 0.0067 / 0.0071 / 0.0018 | 6.6e-5 | hull(boot) | ankle_L |
| 11 | thigh_R | upperLeg_R, thigh_twist_R | 0.4277 | 11.075 (11.045 + 0.03) | (0.000, -0.175, 0.000) | 0.2187 / 0.0449 / 0.2187 | 0.0e+0 | tapered | hip_R |
| 12 | shank_R | lowerLeg_R, calf_twist_R | 0.4386 | 3.457 (3.377 + 0.08) | (0.000, -0.194, 0.001) | 0.0398 / 0.0070 / 0.0414 | 1.5e-4 | tapered | knee_R |
| 13 | foot_R | foot_R, toe(proc) | 0.2785 | 1.269 (1.069 + 0.20) | (0.000, -0.049, 0.063) | 0.0067 / 0.0071 / 0.0018 | 6.6e-5 | hull(boot) | ankle_R |

Totals: 78.910 kg (body 78.000 + equipment 0.910); canonical COM (0.0000, 1.0581, 0.0021) m.

### Joint table (V2-REF)

Constraint-space limits in degrees (ROM-centred frames; x = twist, y / z = pyramid swing). Capacity = isometric torque limit of the structural motor in the + / − constraint direction (motors OFF in G0). Passive τ at hard = end-range torque at the hard limit (− / + side).

| joint | bodies | anatomical joint | centre (m) | axis: + motion / − motion | hard [lo, hi] | soft [lo, hi] | capacity + / − N·m | passive τ at hard N·m | ROM centre (anat.) | damping N·m·s/rad |
|---|---|---|---|---|---|---|---|---|---|---|
| lumbar | pelvis → abdomen | L3–L5 lumbar spine (lumped) | (0.000, 1.110, -0.031) | x: right axial rotation / left axial rotation | [-10.0, 10.0] | [-7.0, 7.0] | 70 / 70 | 17.6 / 17.6 | flex 17.5 | 1 |
| | | | | y: flexion / extension | [-47.5, 52.5] | [-42.5, 42.5] | 156 / 234 | 39.0 / 58.5 |  |  |
| | | | | z: right lateral bend / left lateral bend | [-30.6, 30.6] | [-25.5, 25.5] | 117 / 117 | 29.3 / 29.3 |  |  |
| thoracic | abdomen → thorax | T9–T12 thoracolumbar + thoracic (lumped) | (0.000, 1.335, -0.040) | x: right axial rotation / left axial rotation | [-40.0, 40.0] | [-35.0, 35.0] | 70 / 70 | 17.6 / 17.6 | flex 7.5 | 1 |
| | | | | y: flexion / extension | [-27.5, 32.5] | [-22.5, 22.5] | 156 / 234 | 39.0 / 58.5 |  |  |
| | | | | z: right lateral bend / left lateral bend | [-25.1, 25.1] | [-20.1, 20.1] | 117 / 117 | 29.3 / 29.3 |  |  |
| neck | thorax → head | C0–C7 cervical spine lumped at C7/T1 | (0.000, 1.586, -0.031) | x: right axial rotation / left axial rotation | [-80.0, 80.0] | [-70.0, 70.0] | 16 / 16 | 3.9 / 3.9 | flex -5.0 | 0.3 |
| | | | | y: flexion / extension | [-65.0, 65.0] | [-55.0, 55.0] | 31 / 54 | 7.8 / 13.5 |  |  |
| | | | | z: right lateral bend / left lateral bend | [-45.1, 45.1] | [-40.1, 40.1] | 37 / 37 | 9.4 / 9.4 |  |  |
| shoulder_L | thorax → upperArm_L | glenohumeral + girdle (lumped; centre fixed in the thorax) | (-0.198, 1.472, 0.000) | x: internal rotation / external rotation | [-80.0, 120.0] | [-70.0, 106.1] | 37 / 55 | 9.2 / 13.6 | flex 32.2, abd 53.1 | 0.3 |
| | | | | y: flexion / extension | [-100.0, 92.0] | [-92.0, 89.6] | 74 / 90 | 18.5 / 22.4 |  |  |
| | | | | z: abduction / adduction | [-82.6, 112.6] | [-67.5, 106.0] | 66 / 109 | 16.6 / 27.3 |  |  |
| shoulder_R | thorax → upperArm_R | glenohumeral + girdle (lumped; centre fixed in the thorax) | (0.198, 1.472, 0.000) | x: internal rotation / external rotation | [-120.0, 80.0] | [-106.1, 70.0] | 55 / 37 | 13.6 / 9.2 | flex 32.2, abd 53.1 | 0.3 |
| | | | | y: flexion / extension | [-100.0, 92.0] | [-92.0, 89.6] | 74 / 90 | 18.5 / 22.4 |  |  |
| | | | | z: abduction / adduction | [-112.6, 82.6] | [-106.0, 67.5] | 109 / 66 | 27.3 / 16.6 |  |  |
| elbow_L | upperArm_L → forearm_L | humeroulnar flexion + radioulnar pronation/supination | (-0.493, 1.472, 0.000) | x: pronation / supination | [-85.0, 90.0] | [-77.0, 85.0] | 11 / 10 | 2.7 / 2.5 | flex 70.0 | 0.15 |
| | | | | y: flexion / hyperextension | [-75.0, 80.0] | [-70.0, 75.0] | 76 / 48 | 19.1 / 12.1 |  |  |
| | | | | z: locked | 0 | 0 | — | — |  |  |
| elbow_R | upperArm_R → forearm_R | humeroulnar flexion + radioulnar pronation/supination | (0.493, 1.472, 0.000) | x: pronation / supination | [-90.0, 85.0] | [-85.0, 77.0] | 10 / 11 | 2.5 / 2.7 | flex 70.0 | 0.15 |
| | | | | y: flexion / hyperextension | [-75.0, 80.0] | [-70.0, 75.0] | 76 / 48 | 19.1 / 12.1 |  |  |
| | | | | z: locked | 0 | 0 | — | — |  |  |
| hip_L | pelvis → thigh_L | hip (femoral head) | (-0.091, 0.957, 0.000) | x: internal rotation / external rotation | [-50.0, 45.0] | [-35.0, 35.0] | 78 / 94 | 19.5 / 23.4 | flex 52.5, abd 7.5, rot -5.0 | 0.5 |
| | | | | y: flexion / extension | [-77.7, 87.3] | [-67.8, 67.3] | 211 / 281 | 52.7 / 70.2 |  |  |
| | | | | z: abduction / adduction | [-45.4, 53.4] | [-33.5, 43.6] | 183 / 191 | 45.8 / 47.8 |  |  |
| hip_R | pelvis → thigh_R | hip (femoral head) | (0.091, 0.957, 0.000) | x: internal rotation / external rotation | [-45.0, 50.0] | [-35.0, 35.0] | 94 / 78 | 23.4 / 19.5 | flex 52.5, abd 7.5, rot -5.0 | 0.5 |
| | | | | y: flexion / extension | [-77.7, 87.3] | [-67.8, 67.3] | 211 / 281 | 52.7 / 70.2 |  |  |
| | | | | z: abduction / adduction | [-53.4, 45.4] | [-43.6, 33.5] | 191 / 183 | 47.8 / 45.8 |  |  |
| knee_L | thigh_L → shank_L | tibiofemoral flexion + tibial axial rotation | (-0.091, 0.530, 0.000) | x: tibial internal rotation / tibial external rotation | [-30.0, 40.0] | [-20.0, 30.0] | 27 / 27 | 6.8 / 6.8 | flex 70.0 | 0.3 |
| | | | | y: flexion / hyperextension | [-75.0, 85.0] | [-70.0, 70.0] | 164 / 281 | 41.0 / 70.2 |  |  |
| | | | | z: locked | 0 | 0 | — | — |  |  |
| knee_R | thigh_R → shank_R | tibiofemoral flexion + tibial axial rotation | (0.091, 0.530, 0.000) | x: tibial internal rotation / tibial external rotation | [-40.0, 30.0] | [-30.0, 20.0] | 27 / 27 | 6.8 / 6.8 | flex 70.0 | 0.3 |
| | | | | y: flexion / hyperextension | [-75.0, 85.0] | [-70.0, 70.0] | 164 / 281 | 41.0 / 70.2 |  |  |
| | | | | z: locked | 0 | 0 | — | — |  |  |
| ankle_L | shank_L → foot_L | talocrural + subtalar (orthogonal approximation) | (-0.091, 0.091, 0.000) | x: foot adduction (toes medial) / foot abduction (passive only) | [-15.0, 15.0] | [-10.0, 10.0] | — | 10.0 / 10.0 | df -12.5, inv 2.5 | 0.2 |
| | | | | y: dorsiflexion / plantarflexion | [-47.5, 57.5] | [-37.5, 32.5] | 47 / 203 | 11.7 / 50.7 |  |  |
| | | | | z: inversion / eversion | [-32.9, 32.8] | [-22.8, 22.7] | 35 / 39 | 8.8 / 9.8 |  |  |
| ankle_R | shank_R → foot_R | talocrural + subtalar (orthogonal approximation) | (0.091, 0.091, 0.000) | x: foot adduction (toes medial) / foot abduction (passive only) | [-15.0, 15.0] | [-10.0, 10.0] | — | 10.0 / 10.0 | df -12.5, inv 2.5 | 0.2 |
| | | | | y: dorsiflexion / plantarflexion | [-47.5, 57.5] | [-37.5, 32.5] | 47 / 203 | 11.7 / 50.7 |  |  |
| | | | | z: inversion / eversion | [-32.8, 32.9] | [-22.7, 22.8] | 39 / 35 | 9.8 / 8.8 |  |  |

### Semantic skeleton + physics → render mapping (V2-REF, canonical T-pose)

| # | bone | parent | Unity | class | driven by | T-pose position (m) | +Y_local (toward child) |
|---|---|---|---|---|---|---|---|
| 0 | root | — | unmapped | DERIVED | pelvis | (0.000, 0.000, 0.000) | (0.00, 1.00, 0.00) |
| 1 | hips | root | Hips ✱ | DIRECT | pelvis | (0.000, 0.957, 0.000) | (0.00, 0.98, -0.20) |
| 2 | spine_01 | hips | Spine ✱ | DIRECT | abdomen | (0.000, 1.110, -0.031) | (0.00, 1.00, -0.04) |
| 3 | spine_02 | spine_01 | Chest | AIM | thorax | (0.000, 1.335, -0.040) | (0.00, 1.00, 0.00) |
| 4 | spine_03 | spine_02 | UpperChest | DIRECT | thorax | (0.000, 1.460, -0.040) | (0.00, 1.00, 0.07) |
| 5 | neck | spine_03 | Neck | AIM | head | (0.000, 1.586, -0.031) | (0.00, 0.98, 0.18) |
| 6 | head | neck | Head ✱ | DIRECT | head | (0.000, 1.702, -0.010) | (0.00, 1.00, 0.00) |
| 7 | clavicle_L | spine_03 | LeftShoulder | DIRECT | thorax | (-0.020, 1.513, 0.086) | (-0.88, -0.20, -0.42) |
| 8 | upperArm_L | clavicle_L | LeftUpperArm ✱ | DIRECT | upperArm_L | (-0.198, 1.472, 0.000) | (-1.00, 0.00, 0.00) |
| 9 | upperArm_twist_L | upperArm_L | unmapped | DEFORM | upperArm_L | (-0.346, 1.472, 0.000) | (-1.00, 0.00, 0.00) |
| 10 | lowerArm_L | upperArm_L | LeftLowerArm ✱ | DIRECT | forearm_L | (-0.493, 1.472, 0.000) | (-1.00, 0.00, 0.00) |
| 11 | forearm_twist_L | lowerArm_L | unmapped | DEFORM | forearm_L | (-0.662, 1.472, 0.000) | (-1.00, 0.00, 0.00) |
| 12 | hand_L | lowerArm_L | LeftHand ✱ | DIRECT | forearm_L | (-0.774, 1.472, 0.000) | (-1.00, 0.00, 0.00) |
| 13 | clavicle_R | spine_03 | RightShoulder | DIRECT | thorax | (0.020, 1.513, 0.086) | (0.88, -0.20, -0.42) |
| 14 | upperArm_R | clavicle_R | RightUpperArm ✱ | DIRECT | upperArm_R | (0.198, 1.472, 0.000) | (1.00, 0.00, 0.00) |
| 15 | upperArm_twist_R | upperArm_R | unmapped | DEFORM | upperArm_R | (0.346, 1.472, 0.000) | (1.00, 0.00, 0.00) |
| 16 | lowerArm_R | upperArm_R | RightLowerArm ✱ | DIRECT | forearm_R | (0.493, 1.472, 0.000) | (1.00, 0.00, 0.00) |
| 17 | forearm_twist_R | lowerArm_R | unmapped | DEFORM | forearm_R | (0.662, 1.472, 0.000) | (1.00, 0.00, 0.00) |
| 18 | hand_R | lowerArm_R | RightHand ✱ | DIRECT | forearm_R | (0.774, 1.472, 0.000) | (1.00, 0.00, 0.00) |
| 19 | upperLeg_L | hips | LeftUpperLeg ✱ | DIRECT | thigh_L | (-0.091, 0.957, 0.000) | (0.00, -1.00, 0.00) |
| 20 | thigh_twist_L | upperLeg_L | unmapped | DEFORM | thigh_L | (-0.091, 0.743, 0.000) | (0.00, -1.00, 0.00) |
| 21 | lowerLeg_L | upperLeg_L | LeftLowerLeg ✱ | DIRECT | shank_L | (-0.091, 0.530, 0.000) | (0.00, -1.00, 0.00) |
| 22 | calf_twist_L | lowerLeg_L | unmapped | DEFORM | shank_L | (-0.091, 0.310, 0.000) | (0.00, -1.00, 0.00) |
| 23 | foot_L | lowerLeg_L | LeftFoot ✱ | DIRECT | foot_L | (-0.091, 0.091, 0.000) | (0.00, -0.38, 0.93) |
| 24 | toe_L | foot_L | LeftToes | PROC | foot_L | (-0.091, 0.038, 0.130) | (0.00, 0.00, 1.00) |
| 25 | upperLeg_R | hips | RightUpperLeg ✱ | DIRECT | thigh_R | (0.091, 0.957, 0.000) | (0.00, -1.00, 0.00) |
| 26 | thigh_twist_R | upperLeg_R | unmapped | DEFORM | thigh_R | (0.091, 0.743, 0.000) | (0.00, -1.00, 0.00) |
| 27 | lowerLeg_R | upperLeg_R | RightLowerLeg ✱ | DIRECT | shank_R | (0.091, 0.530, 0.000) | (0.00, -1.00, 0.00) |
| 28 | calf_twist_R | lowerLeg_R | unmapped | DEFORM | shank_R | (0.091, 0.310, 0.000) | (0.00, -1.00, 0.00) |
| 29 | foot_R | lowerLeg_R | RightFoot ✱ | DIRECT | foot_R | (0.091, 0.091, 0.000) | (0.00, -0.38, 0.93) |
| 30 | toe_R | foot_R | RightToes | PROC | foot_R | (0.091, 0.038, 0.130) | (0.00, 0.00, 1.00) |

### Hashes (all bodies; identical in Node and headless Chrome)

| body | H m | M kg | spec hash | engine post-step state hash | engine readback hash | checks pass |
|---|---|---|---|---|---|---|
| V2-165-62 | 1.65 | 62 | `2fc1171f` | `aa46c502` | `3cd69055` | 45/45 |
| V2-175-70 | 1.75 | 70 | `a89bf594` | `bbb73448` | `8d15cc89` | 45/45 |
| V2-REF | 1.82 | 78 | `7843eefe` | `54f413c9` | `54add0b4` | 46/46 |
| V2-190-85 | 1.9 | 85 | `ab84bbe3` | `26a6bd66` | `4eaeb429` | 45/45 |
| V2-198-92 | 1.98 | 92 | `d544af79` | `bcb5cd8e` | `3d384f6d` | 45/45 |
| V2-long-legs | 1.82 | 78 | `b1c7c059` | `0cf363b2` | `951ed393` | 45/45 |
| V2-short-legs | 1.82 | 78 | `bea02504` | `f038548c` | `7e6d7ba2` | 45/45 |
| V1-matched | 1.9 | 78 | `b80a6563` | `26a6bd66` | `2f7d88fb` | 46/46 |

### Every G0 check, every body

| check | V2-165-62 | V2-175-70 | V2-REF | V2-190-85 | V2-198-92 | V2-long-legs | V2-short-legs | V1-matched |
|---|---|---|---|---|---|---|---|---|
| **0.1** spec generation deterministic (×3 identical hash) | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.2a** total mass = M + equipment | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.2b** segment mass sum = M (body only) | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.2c** every segment = de Leva fraction × M (relative error) | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.3a** inertia tensors symmetric | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.3b** inertia tensors positive definite (min principal moment) | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.3c** triangle inequality I_a + I_b ≥ I_c with margin | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.4a** standing arms-down COM height, barefoot-equivalent (no equipment) — population band | PASS | PASS | PASS | PASS | PASS | — | — | PASS |
| **0.4b** canonical COM AP within ±1 cm of the ankle line | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.5** whole-body inertia about COM in the literature band (Santschi 1963, recalled; scaled ∝ M·H²) — population band | PASS | PASS | PASS | PASS | PASS | — | — | PASS |
| **0.4c** requested morphology realised exactly (stature, leg length × legScale, trunk refit keeping C7, arm lengths × armScale) | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.6a** inter-HJC distance | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.6b** inter-SJC distance within ±10 % of the spec value | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.6c** generated stature: vertex landmark − sole = H | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.6d** collider stature: top of the head collider vs vertex | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.6e** segment lengths = profile fractions (leg = 0.476 H, thigh / shank / upper arm / forearm) | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.7a** semantic hierarchy valid (31 bones, unique, one root, parent-first, twist branches are leaves, no hip_L/R or heel bones) | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.7b** Unity Humanoid mapping complete (15 required + Touchline-required Chest/UpperChest/Neck/Shoulders/Toes), unique, hierarchy-consistent; root unmapped | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.7c** every bone has one driver class; every body drives ≥ 1 bone | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.7d** skeleton round trip: canonical bodies → 31 bones reproduce §6 positions and local-axis frames | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.7e** physics→render mapping consistent at the 7 reference poses (rigid bind chain; DIRECT bones exact) | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.7f** AIM twist split about the bone axis: spine_02 = 50 % of the thorax twist; neck = 27 % of the head twist | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.7g** DEFORM twist branch: thigh_twist carries 50 % of a 20° hip axial rotation | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.7h** PROC toe (rigid F0 foot): 0° at canonical; heel raised 20° → toes dorsiflex so the render toe tip lies on the turf | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.8a** chirality: anatomical right at +X; facing pitch +x (ψ = h + 90°) puts the right foot at pitch y > 0 (south); render foot_R = physical foot_R | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.8b** no mirrored-coordinate mistake: a deliberately mirrored copy FAILS the chirality test | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.8c** bilateral symmetry: bones / bodies / joint motions mirror exactly (q → (x, −y, −z, w), p → (−x, y, z)) | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.9a** canonical pose inside every joint's hard limits (margin) | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.9b** swing–twist singularity margin over every joint's full engine box | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.9c** joint axes: every anatomical motion moves the body in its anatomical direction, both sides (35 probes) | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.9d** every anatomical ACTIVE extreme inside the engine hard limits (hard limits = tight hull of the anatomical hard extremes) | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.9e** passive end-range law: 0 inside the soft range, opposes excursion, equals 25 % of the opposing isometric capacity at the hard limit | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.9f** actuator capacity functions: f(0)=1, eccentric plateau, zero at ω₀; activation τ 15 ms; knee-extension 180/300°/s ratios vs Fousekis 0.70/0.57 | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.10a** colliders vs anthropometric surfaces (§15.1 tolerances: limbs −10…+3, trunk −20…+5, head −15…+5 mm) | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.10b** boot hull dimensions = specification (length, ball width, heel behind / tip ahead of the AJC, sole on the stud plane) | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.5b** COM / inertia calculation consistent: whole body recomposed from the Jolt readback = spec composition (canonical) | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.11a** Jolt bodies: mass, full inertia tensor, COM read back = spec | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.11b** Jolt bodies: zero linear / angular damping; max angular velocity 100 rad/s; no sleeping | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.11c** Jolt joints: constraint frames (F1 on parent, F2 on child) and positions read back = spec | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.11d** Jolt joints: rotation limits = spec; translations fixed; knee / elbow locked axis fixed | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.11e** Jolt joints: constraint-space rotation at canonical = predicted Cm⁻¹·P(canonical) | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.11f** Jolt motors exist structurally, OFF, directional torque limits = isometric capacity, Coulomb friction 0 | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.10c** ground alignment: boot soles on the stud plane y = 0; every other collider clear of the turf | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.11g** static construction: one zero-gravity step at the canonical pose produces zero motion | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.10d** no collider interpenetration between allowed pairs at the 7 reference poses (Jolt contact query) | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS |
| **0.S** agreement with the approved calculation (PHYSICAL_CHARACTER_V2_SPEC.json, rounded to 4–5 decimals) | — | — | PASS | — | — | — | — | PASS |
| **0.4a-R** standing arms-down COM height — REPORTED (morphology variant: population band not applicable, spec §22 0.12 / C2) | — | — | — | — | — | PASS | PASS | — |
| **0.5-R** whole-body inertia about COM — REPORTED (morphology variant: population band not applicable, spec §22 0.12 / C2) | — | — | — | — | — | PASS | PASS | — |

| global check | result | value |
|---|---|---|
| **0.1b** V2-REF ×3 fresh builds: identical spec hash, engine readback hash and post-step state hash | PASS | 54f413c9/54add0b4/7843eefe  54f413c9/54add0b4/7843eefe  54f413c9/54add0b4/7843eefe |
| **0.12** topology identical across the 8-body variation set (names, order, parents, joints, bones, classes); kinds: V2-165-62=population, V2-175-70=population, V2-REF=population, V2-190-85=population, V2-198-92=population, V2-long-legs=morphology-variant, V2-short-legs=morphology-variant, V1-matched=population | PASS | 1 distinct topology |
| **0.E** vendored Jolt build = V1's pinned build (sha256) | PASS | 011233a5fff762d6… |
| **0.V1** V1 frozen: runtime + evidence identical to the freeze tag | PASS | guard_v1: OK — V1 runtime + evidence identical to checkpoint/physchar-v1-final-research |

### V2-REF check values (exact runner output)

- **PASS 0.1** spec generation deterministic (×3 identical hash) — 7843eefe 7843eefe 7843eefe [identical]
- **PASS 0.2a** total mass = M + equipment — 78.91 [78 + 0.91 ± 1e-9]
- **PASS 0.2b** segment mass sum = M (body only) — 78 [78 ± 1e-9]
- **PASS 0.2c** every segment = de Leva fraction × M (relative error) — 0.00e+0 [≤ 1e-12]
- **PASS 0.3a** inertia tensors symmetric — 0.00e+0 [≤ 1e-12]
- **PASS 0.3b** inertia tensors positive definite (min principal moment) — 1.761e-3 kg·m² [> 0]
- **PASS 0.3c** triangle inequality I_a + I_b ≥ I_c with margin — 3.72 % (forearm_L) [≥ 1 %]
- **PASS 0.4a** standing arms-down COM height, barefoot-equivalent (no equipment) — population band — 0.5569 H [0.55–0.58 H] — with equipment 0.5537 H; canonical T-pose COM y = 1.0581 m
- **PASS 0.4b** canonical COM AP within ±1 cm of the ankle line — 0.21 cm [|z| ≤ 1 cm] — x = 2.1e-18 m
- **PASS 0.5** whole-body inertia about COM in the literature band (Santschi 1963, recalled; scaled ∝ M·H²) — population band — pitch 13.22 · roll 13.96 · yaw 1.102 kg·m² [pitch/roll 11.0–14.0, yaw 1.00–1.50] — independent de Leva assembly (research pass, 1.82 m / 78 kg): 13.2 / 14.0 / 1.1
- **PASS 0.4c** requested morphology realised exactly (stature, leg length × legScale, trunk refit keeping C7, arm lengths × armScale) — stature 1.8200 m, leg 0.4760 H (legScale 1), C7 0.8605 H, HJC→C7 0.3455 H [exact]
- **PASS 0.6a** inter-HJC distance — 0.1000 H = 0.182 m [0.09–0.11 H]
- **PASS 0.6b** inter-SJC distance within ±10 % of the spec value — 0.2180 H = 0.397 m [0.218 H ± 10 %]
- **PASS 0.6c** generated stature: vertex landmark − sole = H — 1.820000 m [1.82 m exact] — stature closure (HJC + de Leva trunk + head − H) = 1.9 mm
- **PASS 0.6d** collider stature: top of the head collider vs vertex — -9.1 mm [−15 … +5 mm]
- **PASS 0.6e** segment lengths = profile fractions (leg = 0.476 H, thigh / shank / upper arm / forearm) — leg 0.8663 m (0.4760 H), thigh 0.4277, shank 0.4386, upper arm 0.2945, forearm 0.2811 [exact] — SJC 36.4 mm below the Drillis acromion height
- **PASS 0.7a** semantic hierarchy valid (31 bones, unique, one root, parent-first, twist branches are leaves, no hip_L/R or heel bones) — 31 bones, root 'root' [31 / valid]
- **PASS 0.7b** Unity Humanoid mapping complete (15 required + Touchline-required Chest/UpperChest/Neck/Shoulders/Toes), unique, hierarchy-consistent; root unmapped — 22 mapped (15/15 required, 7/7 Touchline-required) [complete]
- **PASS 0.7c** every bone has one driver class; every body drives ≥ 1 bone — min bones per body 1 [≥ 1]
- **PASS 0.7d** skeleton round trip: canonical bodies → 31 bones reproduce §6 positions and local-axis frames — 1.73e-18 m / 0.00e+0 rad [≤ 1e-9]
- **PASS 0.7e** physics→render mapping consistent at the 7 reference poses (rigid bind chain; DIRECT bones exact) — 2.48e-16 m (neutral lowerArm_L→hand_L) [≤ 1e-9 m] — root→hips translation is free by design
- **PASS 0.7f** AIM twist split about the bone axis: spine_02 = 50 % of the thorax twist; neck = 27 % of the head twist — spine_02 10.0000° (expect 10.0000° of a 20° thoracic rotation); neck 7.9761° (expect 7.9761° of a 30° cervical rotation about vertical) [≤ 1e-9°]
- **PASS 0.7g** DEFORM twist branch: thigh_twist carries 50 % of a 20° hip axial rotation — 10.0000° [10°]
- **PASS 0.7h** PROC toe (rigid F0 foot): 0° at canonical; heel raised 20° → toes dorsiflex so the render toe tip lies on the turf — canonical 0°, heel-up 12.81°, tip y 0.00 mm [0° · > 0° · |tip y| ≤ 1 mm]
- **PASS 0.8a** chirality: anatomical right at +X; facing pitch +x (ψ = h + 90°) puts the right foot at pitch y > 0 (south); render foot_R = physical foot_R — upperLeg_R x = 0.091, facing x 1.000, right foot pitch y = 0.091 [all true]
- **PASS 0.8b** no mirrored-coordinate mistake: a deliberately mirrored copy FAILS the chirality test — mirrored copy rejected [rejected]
- **PASS 0.8c** bilateral symmetry: bones / bodies / joint motions mirror exactly (q → (x, −y, −z, w), p → (−x, y, z)) — bones 0.0e+0 m / 0.0e+0 rad · bodies 0.0e+0 · +20° motions 2.2e-16 (shoulder abd) [≤ 1e-12 m / 1e-9 rad]
- **PASS 0.9a** canonical pose inside every joint's hard limits (margin) — 5.00° (elbow_L y) [≥ 5°]
- **PASS 0.9b** swing–twist singularity margin over every joint's full engine box — 55.1° (shoulder_L) [≥ 20°]
- **PASS 0.9c** joint axes: every anatomical motion moves the body in its anatomical direction, both sides (35 probes) — 35 / 35 [all]
- **PASS 0.9d** every anatomical ACTIVE extreme inside the engine hard limits (hard limits = tight hull of the anatomical hard extremes) — all inside [all inside] — largest widening beyond (anatomical limit − centre) from swing–twist coupling: 29.4° (shoulder_L abd)
- **PASS 0.9e** passive end-range law: 0 inside the soft range, opposes excursion, equals 25 % of the opposing isometric capacity at the hard limit — all joints [all]
- **PASS 0.9f** actuator capacity functions: f(0)=1, eccentric plateau, zero at ω₀; activation τ 15 ms; knee-extension 180/300°/s ratios vs Fousekis 0.70/0.57 — ratios 0.736 / 0.550; a(15 ms) = 0.632 [0.74 / 0.55 (spec fit)]
- **PASS 0.10a** colliders vs anthropometric surfaces (§15.1 tolerances: limbs −10…+3, trunk −20…+5, head −15…+5 mm) — bideltoid (deltoid spheres) 0.2 mm; head capsule AP half-extent vs head length / 2 0.0 mm; head capsule lateral half-extent vs head breadth / 2 0.0 mm; pelvis box vs hip breadth / 2 0.0 mm; thorax box vs chest depth / 2 0.0 mm; thorax box vs Drillis chest breadth 0.174 H / 2 -8.2 mm; abdomen box vs waist depth / 2 0.0 mm; head axis AP true [within tolerance]
- **PASS 0.10b** boot hull dimensions = specification (length, ball width, heel behind / tip ahead of the AJC, sole on the stud plane) — length 29.35 cm, width 11.27 cm, heel 6.63 cm behind / tip 22.72 cm ahead of the AJC, AJC 9.10 cm up, MTP1 14.51 cm ahead [spec 29.35 × 11.27 cm ± 5 mm]
- **PASS 0.5b** COM / inertia calculation consistent: whole body recomposed from the Jolt readback = spec composition (canonical) — mass 2.4e-8 rel · COM 1.2e-8 m · inertia 1.0e-7 rel [≤ 0.00001 rel / 0.000001 m]
- **PASS 0.11a** Jolt bodies: mass, full inertia tensor, COM read back = spec — mass 7.7e-8 rel · inertia 2.4e-7 rel · COM 1.0e-7 m [≤ 0.00001 rel / 0.000001 m]
- **PASS 0.11b** Jolt bodies: zero linear / angular damping; max angular velocity 100 rad/s; no sleeping — damping 0, maxAngVel Δ 0.0e+0 [0 / 100 rad/s]
- **PASS 0.11c** Jolt joints: constraint frames (F1 on parent, F2 on child) and positions read back = spec — 2.75e-7 [≤ 1e-5]
- **PASS 0.11d** Jolt joints: rotation limits = spec; translations fixed; knee / elbow locked axis fixed — 5.8e-8 rad, fixed axes true [≤ 0.000001 rad]
- **PASS 0.11e** Jolt joints: constraint-space rotation at canonical = predicted Cm⁻¹·P(canonical) — 1.49e-7 rad [≤ 0.00001 rad]
- **PASS 0.11f** Jolt motors exist structurally, OFF, directional torque limits = isometric capacity, Coulomb friction 0 — state OFF true, limit Δ 1.2e-5 N·m, friction 0 [OFF / exact / 0]
- **PASS 0.10c** ground alignment: boot soles on the stud plane y = 0; every other collider clear of the turf — sole -0.00 mm; lowest other 11.5 cm (shank_L) [|sole| ≤ 0.5 mm; others ≥ 3 cm]
- **PASS 0.11g** static construction: one zero-gravity step at the canonical pose produces zero motion — Δpos 1.2e-10 m, Δrot 0.0e+0 rad, |v| 0.0e+0 [≤ 0.000001 m / 0.000001 rad] — turf contacts: foot_L, foot_R
- **PASS 0.10d** no collider interpenetration between allowed pairs at the 7 reference poses (Jolt contact query) — none [depth ≤ 1 mm] — canonical: clear; neutral: clear; quietStance: clear; lunge: clear; deepSquat: clear; singleLeg: clear; armsForward: clear
- **PASS 0.S** agreement with the approved calculation (PHYSICAL_CHARACTER_V2_SPEC.json, rounded to 4–5 decimals) — mass 1.8e-15 kg · COM 4.7e-5 m · inertia 4.8e-6 · skeleton 5.0e-5 m · colliders 1.0e-17 m [≤ 0.0001 kg / 0.00015 m / 0.00002 kg·m²]
