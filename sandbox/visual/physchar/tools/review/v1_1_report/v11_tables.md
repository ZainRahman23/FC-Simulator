### V1 preservation (every approved test re-run after all V1.1 code changes)

| gate | re-run | identical hashes to the approved evidence | deterministic |
|---|---|---|---|
| A — 5 drops | pres_gatea_V1.json | **5/5** | True |
| B — all 20 | pres_gateb_V1.json | **20/20** | True |
| C1 — all 59 | pres_gatec1_V1.json | **59/59** | True |
| C2 — 13 approved (+ new B_hold_R) | gatec2_V1.json | **13/13** | True |

### Gate A — passive drops (240 Hz, Gate A world, ×3)

| drop | body | turf pen mm | self pen mm | joint sep mm | limit ° | pop mm | E+ max J | sleep s | worst (self · limit · sep) | det |
|---|---|---|---|---|---|---|---|---|---|---|
| A | V1 | 5.75 | 0.19 | 1.644 | 8.65 | 0.45 | 2.625 | 1.633 | chest–thigh_R · knee_R · lumbar | True |
|  | V1.1 | 7.42 | 0.09 | 2.638 | 16.74 | 0.91 | 12.755 | 3.558 | thigh_L–thigh_R · elbow_R · thoracic | True |
| B | V1 | 7.9 | 0.23 | 4.436 | 5.59 | 0.69 | 0.598 | 1.517 | thigh_L–thigh_R · shoulder_R · shoulder_R | True |
|  | V1.1 | 11.9 | 5.02 | 5.033 | 16.44 | 1.49 | 1.071 | 1.871 | abdomen–upperArm_L · shoulder_R · shoulder_R | True |
| C | V1 | 5.09 | 5.47 | 3.757 | 4.21 | 1.27 | 0.242 | 1.283 | foreArm_L–thigh_L · shoulder_L · hip_R | True |
|  | V1.1 | 2.41 | 1.79 | 2.08 | 10.78 | 0.47 | 0 | 1.275 | foreArm_L–thigh_L · elbow_L · hip_L | True |
| D | V1 | 13.9 | 2.19 | 4.62 | 10.73 | 0.81 | 2.355 | 1.854 | shin_L–foot_R · elbow_L · ankle_R | True |
|  | V1.1 | 5.25 | 2.12 | 3.244 | 11.85 | 3.15 | 0.753 | 2.242 | thigh_L–thigh_R · elbow_L · thoracic | True |
| E | V1 | 4.15 | 0.23 | 3.894 | 12.26 | 1.39 | 0.956 | 1.604 | abdomen–upperArm_L · knee_R · ankle_R | True |
|  | V1.1 | 10.65 | 112.46 | 12.857 | 8.76 | 20.63 | 0 | 1.996 | head–foreArm_R · knee_R · elbow_R | True |

### Gate B — pose tracking · blocked limb · disturbance (240 Hz, ×3)

| test | body | err RMS ° | peak ° (joint) | sat ms | pelvis end mm / ° | extra | det |
|---|---|---|---|---|---|---|---|
| A | V1 | 1.76 | 7.1 (knee_L) | 0 | 12.8 / 1.73 |  | True |
|  | V1.1 | 1.72 | 7.1 (knee_L) | 0 | 12.6 / 1.81 |  | True |
| C | V1 | 6.13 | 13.0 (hip_R) | 546 | 66.2 / 13.61 |  | True |
|  | V1.1 | 2.76 | 7.8 (hip_R) | 287 | 10.8 / 1.39 |  | True |
| E | V1 | 7.25 | 10.5 (hip_R) | 2808 | 33 / 8.63 | post force max 885 N · while blocked: hip err 22.1°, hip sat 17 %, contact 122 N · recover ≤5° in 0.446 s | True |
|  | V1.1 | 7.09 | 10.5 (hip_R) | 2863 | 23.3 / 6.57 | post force max 650 N · while blocked: hip err 23.1°, hip sat 39 %, contact 247 N · recover ≤5° in 0.367 s | True |
| F_chest | V1 | 1.28 | 2.8 (neck) | 0 | 8.1 / 0.59 | peak RMS 2.76° · recovery 0.483 s · pelvis 30.6 mm | True |
|  | V1.1 | 1.16 | 2.2 (neck) | 0 | 7.5 / 0.58 | peak RMS 2.19° · recovery 0.45 s · pelvis 26.2 mm | True |

### Gate C1 — unsupported balance (240 Hz, ×3)

| test | body | outcome | max class | recovery s | COM exc cm | ξ min cm | trunk max ° | quiet sway mm | ankle effort % | hip peak effort | sat ms | det |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| SV_static | V1 | STOOD | RECOVERABLE_IN_PLACE | — | 0.1 | 12.2 | 4 | 0.48 | 10 | 0.04 | 0 | True |
|  | V1.1 | STOOD | RECOVERABLE_IN_PLACE | — | 0.1 | 12.1 | 4 | 0.42 | 9.8 | 0.22 | 0 | True |
| QS20 | V1 | STOOD | RECOVERABLE_IN_PLACE | — | 0.1 | 12.2 | 4 | 1.03 | 10 | 0.04 | 0 | True |
|  | V1.1 | STOOD | RECOVERABLE_IN_PLACE | — | 0.1 | 12.1 | 4 | 0.91 | 9.8 | 0.22 | 0 | True |
| PF30 | V1 | RECOVERED | RECOVERABLE_IN_PLACE | 0.329 | 4.7 | 12 | 5.5 | — | — | 0.13 | 0 | True |
|  | V1.1 | RECOVERED | RECOVERABLE_IN_PLACE | 0.329 | 4.7 | 12.1 | 5.5 | — | — | 0.57 | 0 | True |
| PF60 | V1 | RECOVERED | RECOVERABLE_HIP | 2.417 | 16.7 | -0.4 | 9.7 | — | — | 0.4 | 0 | True |
|  | V1.1 | RECOVERED | RECOVERABLE_HIP | 2.396 | 16.6 | -0.4 | 9.6 | — | — | 1 | 59 | True |
| PB30 | V1 | RECOVERED | RECOVERABLE_HIP | 1.287 | 7.3 | 0.3 | 5.9 | — | — | 0.21 | 0 | True |
|  | V1.1 | RECOVERED | RECOVERABLE_HIP | 1.329 | 7.5 | 0.2 | 5.9 | — | — | 0.45 | 0 | True |
| PB35 | V1 | FELL | GROUNDED | — | 135.2 | — | 93.3 | — | — | 1 | 421 | True |
|  | V1.1 | FELL | GROUNDED | — | 138 | — | 93.3 | — | — | 1 | 287 | True |
| PR30 | V1 | RECOVERED | RECOVERABLE_HIP | 0.287 | 5.3 | 0.1 | 4.3 | — | — | 1 | 138 | True |
|  | V1.1 | RECOVERED | RECOVERABLE_HIP | 0.254 | 4.9 | -0.5 | 4.4 | — | — | 0.82 | 83 | True |
| PR45 | V1 | RECOVERED | RECOVERABLE_HIP | 2.833 | 14.4 | 4.1 | 4.9 | — | — | 1 | 479 | True |
|  | V1.1 | RECOVERED | RECOVERABLE_HIP | 0.833 | 16.1 | 5.6 | 4.9 | — | — | 1 | 338 | True |
| PR50 | V1 | FELL | GROUNDED | — | 168.6 | — | 93.7 | — | — | 1 | 5600 | True |
|  | V1.1 | RECOVERED | RECOVERABLE_HIP | 0.946 | 17.6 | 3.4 | 5.1 | — | — | 1 | 1943 | True |
| G_fall | V1 | FELL | GROUNDED | — | 164.8 | — | 91.6 | — | — | 1 | 382 | True |
|  | V1.1 | FELL | GROUNDED | — | 166.1 | — | 91.6 | — | — | 1 | 552 | True |
| H_ice_quiet | V1 | STOOD | RECOVERABLE_IN_PLACE | — | 0.1 | 12.2 | 4 | 0.4 | 10 | 0.04 | 0 | True |
|  | V1.1 | STOOD | RECOVERABLE_IN_PLACE | — | 0 | 12.1 | 4 | 0.32 | 9.7 | 0.23 | 0 | True |
| H_ice_push | V1 | RECOVERED | STEP_NEEDED | 0.529 | 7.7 | 12.2 | 5.2 | — | — | 0.12 | 0 | True |
|  | V1.1 | RECOVERED | STEP_NEEDED | 0.529 | 7.7 | 12.1 | 5.2 | — | — | 0.38 | 0 | True |

### Gate C2 — every test under the four configurations (240 Hz, ×3)

| test | V1 | V1.1 raw | V1.1 + R1·R2 | V1.1 + R1·R2 + D1 (diagnostic) |
|---|---|---|---|---|
| A_shift | 6 shifts DONE | 6 shifts DONE | 6 shifts DONE | 6 shifts DONE |
| B_lift_R | DONE | REJECTED (weight transfer not achieved: swing load 85 N) | REJECTED (weight transfer not achieved: swing load 57 N) | DONE |
| B_hold_R | DONE | REJECTED (weight transfer not achieved: swing load 85 N) | REJECTED (weight transfer not achieved: swing load 57 N) | DONE |
| B_lift_L | DONE | REJECTED (weight transfer not achieved: swing load 83 N) | REJECTED (weight transfer not achieved: swing load 57 N) | DONE |
| C_lat_R | DONE | REJECTED (weight transfer not achieved: swing load 85 N) | REJECTED (weight transfer not achieved: swing load 57 N) | DONE |
| D_fwd_R | DONE | REJECTED (weight transfer not achieved: swing load 85 N) | REJECTED (weight transfer not achieved: swing load 57 N) | FAILED (balance lost during ACCEPT (STEP_NEEDED) — C2 do) |
| E_bwd_R | DONE | REJECTED (weight transfer not achieved: swing load 85 N) | REJECTED (weight transfer not achieved: swing load 57 N) | DONE |
| F_onfoot | DONE | REJECTED (weight transfer not achieved: swing load 85 N) | REJECTED (weight transfer not achieved: swing load 57 N) | DONE |
| F_cross | DONE | REJECTED (weight transfer not achieved: swing load 85 N) | REJECTED (weight transfer not achieved: swing load 57 N) | DONE |
| G_far | DONE | REJECTED (weight transfer not achieved: swing load 85 N) | REJECTED (weight transfer not achieved: swing load 57 N) | FAILED (balance lost during ACCEPT (STEP_NEEDED) — C2 do) |
| G_far_side | DONE | REJECTED (weight transfer not achieved: swing load 85 N) | REJECTED (weight transfer not achieved: swing load 57 N) | DONE |
| H_uneven | DONE | REJECTED (weight transfer not achieved: swing load 85 N) | REJECTED (weight transfer not achieved: swing load 57 N) | DONE |
| I_block | FAILED_BLOCKED (swing foot 14 cm behind its trajectory for 150 m) | REJECTED (weight transfer not achieved: swing load 85 N) | REJECTED (weight transfer not achieved: swing load 57 N) | FAILED_BLOCKED (swing foot 20 cm behind its trajectory for 150 m) |
| J_repeat | DONE · REJECTED (weight transfer not achieved: swing load 91 N) · DONE · DONE · DONE · DONE | REJECTED (weight transfer not achieved: swing load 85 N) · REJECTED (weight transfer not achieved: swing load 109 N) · REJECTED (weight transfer not achieved: swing load 111 N) · DONE · DONE · DONE | REJECTED (weight transfer not achieved: swing load 57 N) · REJECTED (weight transfer not achieved: swing load 111 N) · REJECTED (weight transfer not achieved: swing load 98 N) · FAILED (balance lost during ACCEPT (STEP_NEEDED) — C2 do) · **FELL** | DONE · DONE · DONE · DONE · DONE · DONE |

### Single-leg stance (B_hold_R: shift onto L, lift R 8 cm, hold 20 s)

| quantity | V1 (approved controller) | V1.1 + R1·R2 + D1 | V1.1 raw / + R1·R2 |
|---|---|---|---|
| hip joint-centre half spacing d | 16.2 cm | 9.2 cm | 9.2 cm |
| free-leg COM lateral offset e (statics) | 0.0 cm | 2.64 cm | 2.64 cm |
| static hip abduction demand τ0 (upright trunk) | 124 N·m (88 % of 140) | 74 N·m (53 %) | 74 N·m |
| planned trunk lean (to bring τ to the 70 % target) | 13.4° | 0.0° | 0.0° |
| request outcome | DONE | DONE | REJECTED (weight transfer not achieved: swing load 85 N, ξ margin on t) |
| held (s) / held to plan | 20.45 / True | 20.45 / True | never lifted |
| measured stance-hip abduction torque mean / max | 97.6 / 99.5 N·m | 69.1 / 71.4 N·m | — |
| … as % of the hip Z limit · vector effort · saturated | 69.7 % · 73.9 % · 0 % | 49.3 % · 54.7 % · 0 % | — |
| COM lateral of the stance ankle mean (min…max) | 0.1 (0…1.3) cm | 0 (0…1) cm | — |
| pelvis roll mean (min…max) | -0.01° (-0.19…0.02) | 0.5° (0.35…0.87) | — |
| trunk lateral lean (measured, mean) | 13.3° | 0° | — |
| ξ margin mean / min | 8.1 / 7.2 cm | 8.1 / 7.2 cm | — |
| saturation during the request (joint: ms) | ankle_L 1479, ankle_R 54 | hip_L 2133, ankle_L 1233, ankle_R 67 | hip_L 4 |
| joint-limit margin (joint) | 4.9° (ankle_R) | 0.1° (ankle_R) | 8.6° (ankle_L) |

### Ankle and placement (V1 vs V1.1 + R1·R2 + D1 — the only V1.1 configuration that lifts a foot)

| test | body | requested → feasible (corr.) | touchdown centre · landing err | stance DF max / limit (min margin, at stop) | swing DF max / limit (min margin, at stop) | outcome |
|---|---|---|---|---|---|---|
| B_lift_R | V1 | (0.161, 0.087) → (0.161, 0.087) (0 cm) | (0.168, 0.067) · 2.1 cm | 8.1° / 20° (11.9°, 0 ms) | 15.1° / 20° (4.9°, 0 ms) | DONE |
|  | V1.1+R+D1 | (0.160, 0.086) → (0.160, 0.086) (0 cm) | (0.161, 0.089) · 0.3 cm | 16.1° / 30° (13.9°, 0 ms) | 19.2° / 30° (10.8°, 0 ms) | DONE |
| B_lift_L | V1 | (-0.162, 0.087) → (-0.162, 0.087) (0 cm) | (-0.166, 0.075) · 1.2 cm | 8.1° / 20° (11.9°, 0 ms) | 16.3° / 20° (3.7°, 0 ms) | DONE |
|  | V1.1+R+D1 | (-0.161, 0.086) → (-0.161, 0.086) (0 cm) | (-0.162, 0.088) · 0.2 cm | 16.1° / 30° (13.9°, 0 ms) | 19.3° / 30° (10.7°, 0 ms) | DONE |
| C_lat_R | V1 | (0.261, 0.087) → (0.217, 0.087) (4.4 cm) | (0.204, 0.032) · 5.6 cm | 11.1° / 20° (8.9°, 0 ms) | 15.3° / 20° (4.7°, 0 ms) | DONE |
|  | V1.1+R+D1 | (0.260, 0.086) → (0.243, 0.086) (1.7 cm) | (0.231, 0.014) · 7.3 cm | 21.7° / 30° (8.3°, 0 ms) | 25.1° / 30° (4.9°, 0 ms) | DONE |
| D_fwd_R | V1 | (0.161, 0.287) → (0.161, 0.271) (1.5 cm) | (0.155, 0.240) · 3.1 cm | 11.4° / 20° (8.6°, 0 ms) | 15° / 20° (5°, 0 ms) | DONE |
|  | V1.1+R+D1 | (0.160, 0.286) → (0.160, 0.286) (0 cm) | (0.152, 0.258) · 3 cm | 21° / 30° (9°, 0 ms) | 19.6° / 30° (10.4°, 0 ms) | FAILED |
| E_bwd_R | V1 | (0.161, -0.063) → (0.161, -0.016) (4.7 cm) | (0.158, 0.064) · 8.1 cm | 9° / 20° (11°, 0 ms) | 16.6° / 20° (3.4°, 0 ms) | DONE |
|  | V1.1+R+D1 | (0.160, -0.064) → (0.160, -0.064) (0 cm) | (0.162, -0.031) · 3.3 cm | 19° / 30° (11°, 0 ms) | 25.3° / 30° (4.7°, 0 ms) | DONE |
| F_onfoot | V1 | (-0.163, 0.087) → (0.032, 0.087) (19.5 cm) | (0.003, 0.092) · 2.9 cm | 8.1° / 20° (11.9°, 0 ms) | 15.8° / 20° (4.2°, 0 ms) | DONE |
|  | V1.1+R+D1 | (-0.164, 0.086) → (0.033, 0.086) (19.7 cm) | (0.027, 0.027) · 5.9 cm | 16.1° / 30° (13.9°, 0 ms) | 25.1° / 30° (4.9°, 0 ms) | DONE |
| F_cross | V1 | (-0.239, -0.013) → (0.032, 0.054) (27.9 cm) | (0.003, 0.077) · 3.7 cm | 8.1° / 20° (11.9°, 0 ms) | 16.7° / 20° (3.3°, 0 ms) | DONE |
|  | V1.1+R+D1 | (-0.240, -0.014) → (0.033, 0.054) (28.1 cm) | (0.031, -0.014) · 6.9 cm | 16.1° / 30° (13.9°, 0 ms) | 25.2° / 30° (4.8°, 0 ms) | DONE |
| G_far | V1 | (0.161, 1.287) → (0.161, 0.271) (101.5 cm) | (0.155, 0.240) · 3.1 cm | 11.4° / 20° (8.6°, 0 ms) | 15° / 20° (5°, 0 ms) | DONE |
|  | V1.1+R+D1 | (0.160, 1.286) → (0.160, 0.348) (93.9 cm) | (0.155, 0.323) · 2.5 cm | 22.5° / 30° (7.5°, 0 ms) | 21.2° / 30° (8.8°, 0 ms) | FAILED |
| G_far_side | V1 | (0.961, 0.087) → (0.217, 0.087) (74.4 cm) | (0.204, 0.032) · 5.6 cm | 11.1° / 20° (8.9°, 0 ms) | 15.3° / 20° (4.7°, 0 ms) | DONE |
|  | V1.1+R+D1 | (0.960, 0.086) → (0.243, 0.086) (71.7 cm) | (0.231, 0.014) · 7.3 cm | 21.7° / 30° (8.3°, 0 ms) | 25.1° / 30° (4.9°, 0 ms) | DONE |
| H_uneven | V1 | (0.161, 0.337) → (0.161, 0.271) (6.5 cm) | (0.147, 0.307) · 3.8 cm | 12.3° / 20° (7.7°, 0 ms) | 15° / 20° (5°, 0 ms) | DONE |
|  | V1.1+R+D1 | (0.160, 0.336) → (0.160, 0.336) (0 cm) | (0.153, 0.354) · 1.9 cm | 21.8° / 30° (8.2°, 0 ms) | 20.9° / 30° (9.1°, 0 ms) | DONE |
| I_block | V1 | (0.161, 0.387) → (0.161, 0.271) (11.5 cm) | — · — cm | 8.1° / 20° (11.9°, 0 ms) | 15.5° / 20° (4.5°, 0 ms) | FAILED_BLOCKED |
|  | V1.1+R+D1 | (0.160, 0.386) → (0.160, 0.348) (3.9 cm) | — · — cm | 16.1° / 30° (13.9°, 0 ms) | 21.2° / 30° (8.8°, 0 ms) | FAILED_BLOCKED |

*V1.1 raw / + R1·R2 (transfers rejected, no lift): stance-ankle dorsiflexion during the transfer*

| test | config | stance DF max / limit (margin) | swing load at rejection |
|---|---|---|---|
| B_lift_R | V1.1 raw | 14.7° / 30° (15.3°) | 85 N |
| B_lift_R | V1.1 + R1·R2 | 16.1° / 30° (13.9°) | 57 N |

### Performance (mean ms per 60 Hz frame = 4 physics steps + sensing + controller, Node, one process)

| gate | V1 | V1.1 | V1.1 + R1·R2 | V1.1 + R1·R2 + D1 |
|---|---|---|---|---|
| A | 0.211 | 0.306 | — | — |
| B | 0.613 | 0.612 | — | — |
| C1 | 0.694 | 0.685 | — | — |
| C2 | 1.088 | 1.163 | 1.228 | 1.129 |

**Determinism:** 182/182 result rows deterministic across their repeats (×3 for every comparison set).
