# Locomotion V2 / RUN-1 — overnight work log

Track: a fresh production-locomotion track for straight-line football running on the current skeletal character.
It is **presentation only**. The simulation owns root translation. RUN-1 owns the visible skeleton.
It does not continue the physical-running research (PI-1 / LC-1 / carrier), and it runs no Jolt or V2 physics.

## Baseline and isolation

| item | value |
|---|---|
| session start | Sat 10 Oct 2026 04:44 BST (still the 9 Oct development day until 06:00) |
| branch | `prototype/locomotion-v2-run1` (new, local) |
| worktree | `~/Downloads/FC Simulator worktrees/locomotion-v2-run1` |
| baseline commit | `9d57d460` (head of `prototype/locomotion-continuity-v1`: V1.3 CHARCOLLIDE simulation baseline + environment + LC-1 presentation layer, `OF_CONT.on` default) |
| Locomotion V1 | `anim3d/of_loco.js` + `of_motion.js`, untouched. The simulation consumes `ofLocoParams` / `ofLocoCycle` / `OF_BOOT` / `skelFK` (CHARCOLLIDE legs, boot plan), so they are frozen |
| V2 anatomy source | `prototype/physical-character-v2` @ `15b0d5c6`: `physchar2/spec/v2_joints.js` (ranges), `v2_pi1_runner.js` (the V2 runner body generated from the vinicius rig), `PHYSICAL_CHARACTER_V2_SPEC.md` §11 |
| representative player | the real rendered **Vinícius** character (`assets/characters/outfield/vinicius/`, 1.76 m, thigh 0.4349 m, shank 0.3987 m, ankle 0.088 m, MTP 0.1805 m ahead and 0.031 m up, heel 0.0808 m behind, tip 0.2752 m ahead). The PI-1 V2 runner body was generated from this same rig, so the V2 proportions and the rendered mesh agree |

The new files are all under `sandbox/visual/run1/`, `sandbox/visual/run1.html` and `review_artifacts/locomotion_v2_run1/`.
No existing file is modified.

## Log

- **04:44–05:15 Orientation.** I read the memory, the repo history, the V1 gait (`of_loco.js`), the rig hierarchy (`skeleton.js`, `of_rig.js`, `of_character.js`), the renderers (`gl_renderer.js`, `of_char_gl.js`), CAMERA_V1 (`match.js buildFrozenBasis`), and the V2 spec (via a read-only agent).
  - What the simulation consumes from anim3d was mapped by a read-only agent. Those pieces stay frozen.
  - A biomechanics research agent was started.
- **05:15–05:55 Gait core v0 (`run1/run1_gait.js`).** It has:
  - a spring-mass pelvis;
  - a foot-space stance (fixed plant, heel→flat→MTP roll, analytic leg IK);
  - joint-space swing Hermite curves whose ends match the stance's values and slopes;
  - trunk counter-rotation, arms and a head stabiliser.
- **Tools.** `run1/tools/run1_load.cjs` loads the page's globals in a node vm. `run1/tools/run1_report.cjs` gives a numeric cycle table, join continuity, slip and reach.
- **Iterations 0–2 (numeric, before any render).** See `RUN1_ITERATIONS.md`.
