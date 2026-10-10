# Locomotion V2 — STRAIGHT-LINE BASELINE (frozen 10 Oct 2026)

**The decision (user, 10 Oct, after approving the archival captures).**
- Freeze the current four-regime straight-line locomotion as the Locomotion V2 straight-line baseline, with the continuous speed-conditioned blending between the regimes.
- Freeze the exact implementation used for the approved captures.
- Keep RUN-1.0, RUN-1.1 and RUN-1.2 as historical references, without rewriting their history.
- Freeze and document the locomotion-side state interface for the Physical Character V2 handoff. Physical Character V2 consumes it; nothing on that side is built here.
- No acceleration, curves, turning, match integration or further locomotion development.

## 1. What is frozen

| | |
|---|---|
| **Baseline implementation** | `sandbox/visual/run1/run1_gait_v13.js`, API `RUN1_V13`, version string `"RUN-1.3 @ bdab1f5f"`. Between its BEGIN / END markers it is `run1_gait.js` at **bdab1f5f**, byte for byte (git blob `010212622e05…`, 56 355 bytes). That is the file that rendered the approved archival captures. |
| **State contract** | `sandbox/visual/run1/lv2_state.js` (`LV2_STATE`, **LV2-STATE-1**), specified in `LOCOMOTION_V2_STATE_CONTRACT.md` |
| **Freeze commit / tag** | the commit that adds this document, tagged **`locomotion-v2-straight-baseline-1`** (local tag; pushed with the next daily publication) |
| **Archival record** | `video/LOCOMOTION_V2_FINAL_LADDER.mp4` (canonical, labeled), `video/LOCOMOTION_V2_FINAL_LADDER_UNLABELED.mp4` (blind viewing), `video/LOCOMOTION_V2_VERSION_HISTORY.mp4` (history), `video/VIDEO_CAPTURES.md` |

**The accepted ladder.** One continuous, speed-conditioned system; the regimes are fitted parameter anchors, not clips.

| regime | speed | parameter key | origin |
|---|---|---|---|
| **LOW** | 3.0 m/s | `JOG` (anchors at 3.0 and 4.0) | RUN-1.1's jog, unchanged |
| **JOG** | 5.5 m/s | `RUN` | RUN-1.2 |
| **FAST RUN** | 7.8 m/s | `SPRINT` (held 7.8–8.0) | RUN-1.2 |
| **ALL-OUT** | 9.5 m/s | `ALLOUT` | RUN-1.3 |

**The blending (frozen as is):**
- **Parameters** blend piecewise-linearly in the authoritative speed between the anchors 3.0 · 4.0 · 5.5 · 7.8 · 8.0 · 9.5 m/s.
- **Every 0.25 m/s grid cell** from 2.5 to 10.0 m/s is one solved gait: stance solve, C1 swing curves, planted plants. Any speed interpolates its two cells.
- **There is no mode switch.** Outside 3.0–9.5 m/s the end parameters hold. Above 9.5 the extra speed comes from step length only.

**Historical references, untouched:**

| file | version | commit |
|---|---|---|
| `run1_gait_orig.js` | RUN-1.0 | 3caa5d58 |
| `run1_gait_v11.js` | RUN-1.1 | 83a457db |
| `run1_gait_v12.js` | RUN-1.2 | cddaf890 |

- `tools/run1_frozen_check.cjs` proves each verbatim block is byte-identical to its commit and pose-identical to that commit's file loaded alone.
- No history was rewritten.

**The evolving file.** `run1_gait.js` equals the baseline at the freeze, verified at every speed from 2.5 to 10 m/s and on ramps. Future locomotion work happens there or in new versions, never in `run1_gait_v13.js`.

## 2. Scope: straight-line locomotion only

**Frozen:** steady straight-line running at any speed in the ladder, the transitions between the regimes under a speed change, and the presentation pose, contacts and plants that go with it.

**NOT frozen, and not part of this baseline:**
- acceleration and deceleration as locomotion regimes. RUN-1 has only a filtered acceleration lean; no start, stop or acceleration mechanics.
- curved running;
- turning and cutting. The baseline assumes the heading is constant; its yaw rate is 0.
- per-player speed characteristics: top speed, acceleration, stride and cadence by attribute;
- ball-carry and dribbling locomotion;
- any other locomotion extension: backpedal, sidestep, jumps, stumbles;
- a simulation-locked stride clock (Physical Character V2's precondition H-1; open, §5);
- match integration, physics integration, and Physical Character V2's side of the handoff.

## 3. Final frozen-baseline regression (`baseline/final/`)

Run once at the freeze, on the working tree that is committed as the freeze. The outputs are in `baseline/final/`.

| area | result | file |
|---|---|---|
| **Frozen copies** | RUN-1.0, RUN-1.1, RUN-1.2 and the baseline: verbatim blocks byte-identical to 3caa5d58 / 83a457db / cddaf890 / bdab1f5f, and pose-identical to each commit's own file. 36 / 36 identity rows IDENTICAL. | `frozen_and_identity.txt` |
| **Baseline = the evolving file** | Pose hash IDENTICAL at 2.5 / 3.0 / 3.5 / 4.0 / 4.75 / 5.5 / 6.5 / 7.0 / 7.8 / 7.9 / 8.0 / 8.25 / 8.5 / 9.0 / 9.25 / 9.5 / 10.0 m/s and on the 3 → 9.5 and 6 → 9.5 m/s ramps | the same |
| **RUN-1.3 = RUN-1.2 at ≤ 8.0 m/s** | IDENTICAL, constant speeds and a 3 → 8 m/s ramp | the same |
| **Determinism** | Replay ≡ replay and incremental ≡ incremental, at constant 5.5 and 9.5 m/s and on the 3 → 7.8 → 3 and 6 → 9.5 → 6 m/s ramps. Replay ≡ incremental at constant speed. No RNG or clock. | `determinism.txt` |
| **Simulation neutrality** | 0 files changed outside the RUN-1 paths vs 9d57d460. The V1 regression gate output is line-for-line identical to the previous sessions'; its item-3 flag is the pre-existing corner-flag timer (`of_player.js:194`, unchanged since e2c98ec7). | `neutrality_of_loco_regress.txt` |
| **Foot planting** | Contact-point slip 0 at constant 3.0 / 5.5 / 7.8 / 9.5 m/s, ≤ 0.01 mm/tick on both ramps. Boot mesh: stance median 0.0 mm, never below the stud plane; swing minimum ≥ 0.0 mm (3.0 / 5.5 / 7.8 / 8.5 / 9.5 m/s). Pivot material velocity while planted ≤ 0.02 mm/s (state contract HT-3). | `continuity_*.txt`, `mesh_contact.txt`, `state_contract_check.txt` |
| **Joint limits** | 3.0–10.0 m/s, 11 speeds: all channels inside V2's planning box except **hip extension −20.1° at 4.0–4.25 m/s** (inherited from RUN-1.1, 0.1° past the box, inside the hard limit). Knee ≤ 142° (box 150), elbow 50–130° (145), shoulder −59.6° (−60), ankle inversion ≤ 17.8° (25). | `joint_limits.txt` |
| **Clearance** | Swing foot to stance leg ≥ 16.9 cm (ALL-OUT 21.5 cm), knees ≥ 19.0 cm. Hands: no penetration at 3.0 / 5.5 / 7.8 / 9.5 m/s. | `clearance.txt`, `hand_clearance.txt` |
| **Smoothness** | p99 per tick², no pops anywhere (max ≈ p99). At 5.5 m/s: pelvis 0.52, knees 2.52, ankles 5.71, toes 7.12, hands 1.42 cm. At 9.5 m/s: 0.67 / 4.58 / 11.1 / 13.3 / 4.55 cm, against V1.3's 18.9 / 20.1 / 29.5 / 36.9 / 22.8. | `continuity_*.txt` |
| **Performance** | Node, 22 rigs, mean / p95 per frame: the frozen baseline 0.59 / 0.70 ms at 5.5 m/s and 0.57 / 0.68 ms at 9.5 m/s; on a speed sweep 1.10 / 1.17 ms; V1.3 3.03 / 4.13 ms. Grid solve ≈ 43–53 ms per cell, lazily at first use. State-contract query ≈ 0.23 ms; `queryAt` ≈ 0.9–1.3 ms, constant in match time. | `perf_node.txt`, `grid_solve_cost.txt`, `state_contract_check.txt` |
| **State contract LV2-STATE-1** | 21 / 21 PASS: purity, cost, input echo, provenance, sub-tick query, float64 pose, velocities vs an independent difference (≤ 5 × 10⁻⁹ m/s at constant speed; 0.09 mm/s max on the ramp), pivots, analytic pelvis vertical, COM mean, touchdown step, determinism | `state_contract_check.txt` / `.json` |
| **Archival captures vs the frozen baseline** | Both clips' lanes, replayed on `run1_gait_v13.js` itself: MATCH, every lane-frame (bit-identical, or last-bit V8 rounding ≤ 0.016 float32 ulp). The three MP4s decode to 420 frames / 7.000 s with every frame matching its source. | `video_*_vs_frozen_baseline.json` |
| **Legacy `r1Kinematics`** | Unchanged numbers (kept in the frozen file; superseded by LV2-STATE-1) | `kinematics_check_legacy_r1Kinematics.txt` |
| **Ladder metrics** | Same definitions as RUN1_2 / RUN1_3 | `regime_metrics_ladder.txt` |

## 4. The archival videos and the frozen baseline

- **Clip 1** (`LOCOMOTION_V2_FINAL_LADDER.mp4`, with `_UNLABELED`) shows only RUN-1.3 lanes, so it **is the frozen baseline**. The independent replay of the clip's lanes run on `run1_gait_v13.js` itself matches the captured matrices of every lane-frame: `baseline/final/video_FINAL_LADDER_vs_frozen_baseline.json`.
  - 973 of 1680 lane-frames are bit-identical.
  - The rest are within 0.016 float32 ulp at matrix scale: last-bit rounding between Chrome's and Node's V8, not a different pose.
- **Clip 2** (`LOCOMOTION_V2_VERSION_HISTORY.mp4`):
  - **The RUN-1.2 = RUN-1.3 cell** is the frozen baseline at 5.5 m/s, verified the same way: 1151 of 1680 lane-frames bit-identical, the rest ≤ 1.1 × 10⁻¹³.
  - **The V1, RUN-1.0 and RUN-1.1 cells** are the preserved historical implementations, unchanged files. They are historical references, not the baseline.
- **The captures and the baseline are the same code.** The captures were rendered by `run1_gait.js` blob `010212622e05`; the baseline's verbatim block is that same blob, and `run1_gait.js` has not changed since.

## 5. Known limitations carried into the freeze

**Locomotion behaviour (visible or measurable):**
1. **Straight line only** (§2). Any heading change is the simulation's and is not represented in the gait.
2. **RUN-1 runs its own gait clock**, not simulation-locked. At 3.0 m/s RUN-1 runs 2.75 steps/s with duty 0.344, against the simulation's stride clock of 3.21 / 0.420 (the Physical Character V2 draft, H-1).
   - Support agreement with the simulation's planted flags is therefore not guaranteed.
   - The contract exposes the clock and its source. Who owns the clock is an open decision on the handoff side.
3. **Touchdown is "set down", not struck.** The fixed plant gives zero foot ground speed at contact. Real feet arrive at ≈ 2.4–3.7 m/s and stop within ~25 ms. The sweep relative to the body matches; the impact abruptness does not.
4. **Heel-rise onset is a velocity kink.** Found at the freeze; not visible in review. The stance foot stays exactly flat until the prescribed knee curve needs more leg than a flat foot allows, then the heel lifts at a finite rate:

| speed | foot-pitch rate steps | knee rate steps |
|---|---|---|
| 3.0 m/s | 0 → 38 °/s | 35 → 63 °/s |
| 5.5 m/s | 0 → 36 °/s | −8 → +13 °/s |
| 7.8 m/s | 0 → 9 °/s | 438 → 420 °/s |
| 9.5 m/s | 0 → 89 °/s | −53 → +25 °/s |

   The pose is continuous, but its velocity is not. The contract declares it an event, like touchdown and toe-off.
5. **A touchdown position step between grid speeds.** The swing end and the stance start differ by up to 0.044 mm (0.015 mm at 5.6, 0.004 mm at 8.9 / 9.4). It is 0 at the grid speeds 5.5 / 7.8 / 9.5: the lerp of separately solved cells.
6. **A replay-path partial-step plant transient on speed changes.** A touchdown inside the replay's uncommitted partial step takes its plant from the partial step's gait. Until the grid commits that step (≤ 4.17 ms), the plant re-derives per frame: ≤ 0.1 mm at 1.6 m/s². It is the "≤ 0.01 mm/tick ramp slip" in the continuity reports. The contract treats the plant as fixed.
7. **Two integration paths.** Replay (fixed 1/240 s grid from t = 0) and incremental (one advance per frame) are each deterministic but differ on speed ramps. Whatever the runtime renders is authoritative for that runtime; `queryAt` follows the actor's own path.
8. **Hip extension −20.1° at 4.0–4.25 m/s**, 0.1° beyond V2's planning box and inside the hard limit. Inherited from RUN-1.1 (−20.5°) and disclosed in its erratum.
9. **Arm range at ALL-OUT is 113°**, below sprinters' 118–135°. V2's shoulder extension box (−60°) is the limit; the elbow opening behind carries the rest.
10. **ALL-OUT rear-thigh extension is −29°**, between track (−28°) and team-sport (−34°) athletes.
11. **Distal smoothness.** At ALL-OUT, the ankles, toes and hands are 28–59 % rougher per tick than RUN-1.2 stretched to the same speed, because the limbs move faster. There are no pops (max ≈ p99), and they remain ⅓–⅕ of V1.

**Evidence, data and assets:**

12. **No replayable full-body reference at ≥ 5 m/s.** The JOG, FAST RUN and ALL-OUT targets are literature values, labelled measured or extrapolated in RUN1_2_REGIMES.md and RUN1_3_ALLOUT.md.
13. **The pelvis travels at exactly the root speed.** The whole-body COM oscillates about it, with a stride mean equal to the root speed (the handoff draft's open decision 2).
14. **Most of each stance is on the toes.** Heel-up and toe pad make up 69–83 % of stance, which a rigid foot cannot follow (the handoff draft's open decision 3).
15. **Asset issues, unchanged:** Vinícius's mirrored front print, the hand-mesh openings.

**Historical records (no effect on the baseline):**

16. **The legacy exporter `r1Kinematics` is unchanged inside the frozen file.** It replays from t = 0, mutates and restores the actor, and exports float32 world matrices. It is **superseded by LV2-STATE-1** for any handoff use.
17. **The RUN-1.2 vs RUN-1.1 erratum:** ≤ 0.12 mm between grid cells below 4 m/s (RUN1_2_REGIMES.md).

## 6. How to view and consume

- **Viewer:** `cd ~/Downloads/"FC Simulator worktrees"/locomotion-v2-run1 && python3 -m http.server 8317 --bind 127.0.0.1`, then **http://127.0.0.1:8317/sandbox/visual/run1.html**.
  - It opens on the Ladder preset. Its RUN-1.3 lanes run `run1_gait.js`, identical to the baseline at the freeze.
  - Blind test: `?blind=1`. Diagnosis: `?lanes=diag`.
- **Physical Character V2:** `LOCOMOTION_V2_STATE_CONTRACT.md`, pinned to the tag.
