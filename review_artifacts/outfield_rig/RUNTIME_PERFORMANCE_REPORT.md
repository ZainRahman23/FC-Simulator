# Runtime / performance / scalability / storage report (2026-09-23)

Review page: `review_artifacts/outfield_rig/OUTFIELD_STAGE_REVIEW.html` (tables generated from `verification/*.json`).
Tools: `sandbox/visual/tools/anim3d/of_bench.js` (population benchmark on the live scene), the scratch pacing probe of the playable
page (`play_perf.json`), the GLB breakdown (parsed from the asset), `match.js` frame statistics (`S.frameStat`, `?fps=`).
All browser numbers are from headless Chrome (ANGLE Metal) on the development Mac; headless Chrome's rAF cadence is ~31.6 ms
(≈ 32 fps) whatever the load, so **absolute fps in these tables is a headless artefact; the per-stage millisecond costs are the
measurement.** The in-page HUD of the playable page now shows the real display cadence.

## 1. Where the cost comes from (measured)

| stage | 1 generic body | 22 generic bodies | 1 Courtois (as shipped) | notes |
|---|---|---|---|---|
| stand-in simulation / mover | 0.02 ms | 0.15 ms | — | the real simulation step is ~0.01 ms/tick (gate: sprite 0.013 ms) |
| animation graph + retarget + IK + skin matrices | 0.12 ms | 0.78 ms | 0.12 ms (gait) / ~1 ms (GK solver) | 35 µs per body; the GK graph solve is 0.8–2 ms per tick (survey) |
| render submission (JS → GL) | 0.09 ms | 0.12 ms | **25 ms** | the shipped Courtois path re-created two framebuffers, a depth renderbuffer and resized the GL canvas EVERY frame (the ROI size changes as the body moves) |
| GPU (timer query) | 1.6 ms | 1.7 ms | 6.1 ms | 22 generic bodies ≈ 53 k triangles; one Courtois = 102 k triangles at ROI × 2 × 2 (ssaa) |
| page 2D pass (environment, markings, goal, net) | ≈ 5 ms | ≈ 6.4 ms | ≈ 5 ms | the 2D canvas at DPR 2 (3000 × 1900 px) is the largest fixed cost of every frame |

Sustained runs (22 generic bodies × 120 s, 11 Courtois × 90 s): no accumulating frame-time degradation; JS heap oscillates with GC
(20–60 MB) and does not grow monotonically; no runaway allocation on the generic path. The Courtois path before the fix allocated
GPU objects every frame (not visible in the JS heap).

## 2. Frame pacing — findings

- The frame loop is `requestAnimationFrame`-driven: it renders at the display refresh. On a 120 Hz ProMotion MacBook that is 120
  frames per second, each with the full 2D environment pass at DPR 2 plus the keeper solve and render: **twice the work the 60 Hz
  simulation needs**. There was no cap. This is the most likely reason the development Mac heated up during the playable test.
- The simulation is stepped by accumulated real time (`ptStep` × PT_DT); the presentation cadence never changes simulation results.
- The playable harness's Mixed view renders the character twice per frame (the page pass at RES for the ROI, then again at 2·RES for
  the composite) and rebuilt the HUD DOM every frame. (Measured split in the table below.)
- Added: `?fps=60` (`S.fpsCap`) skips `draw()` when the display runs faster than the cap (simulation stepping untouched), and
  `S.frameStat` (rAF intervals, frames drawn / seen) shown in the playable HUD. Headless cannot show the real cadence; the HUD does.
- No hidden / offscreen frames, no capture or profiling code runs during normal play (the perf counters are a few `performance.now()`
  calls); the review overlays are opt-in (`--dbg`).

## 3. The 30-draw Courtois path — breakdown and what was done

| component | triangles | vertices | share | material class |
|---|---|---|---|---|
| face (`refined_skin_48`, vertex colours) | 35,184 | 105,552 | 34 % | refined vertex colour |
| hair (3 prims) | 27,968 | 83,904 | 27 % | refined vertex colour |
| eyes / irises (9 prims) | 11,328 | 33,984 | 11 % | refined eye |
| body skin | 7,104 | 21,312 | 7 % | body skin blend |
| shorts / cloth / navy / stitch (5) | 9,152 | 27,456 | 9 % | default / textured |
| gloves / latex / cuff / pads / rubber (5) | 5,968 | 17,904 | 6 % | glove latex / gear rubber |
| jersey / sock / boot / sole / trim (5, atlas) | 5,432 | 16,296 | 5 % | textured (one 512² atlas, 27 KB) |
| ink lines | 800 | 2,400 | 1 % | ink |
| total | 102,168 | 306,504 | | 72 B/vertex → 22.1 MB of GPU attributes |

Why 30 draws: one draw per material primitive (29) + the presentation ball; then a 4-sample resolve quad and a present quad. All 29
primitives already used ONE program with two per-primitive uniforms.

Done (verified pixel-identical on real captured frames against the committed code, and on 20 review-layer frames):
1. **Merged draw** (`GK_CHAR.merged`, default on; `?gkMerged=0` restores): one VAO + a per-vertex material index selecting class / base
   colour from uniform arrays — 30 draws → 2 (character + ball). Same fragment math.
2. **Grow-only render targets and canvas** (`GK_CHAR.growOnly`, default on; `?gkGrow=0` restores): the two framebuffers, the depth
   renderbuffer and the GL canvas are allocated to the next multiple of 64 and reused; viewport / scissor select the ROI, the resolve
   and present passes sample the exact sub-rectangle (`uScale`). This removes the per-frame allocation that dominated the shipped
   path (25 ms of submission for ONE character).

Still per character on this path: an FBO clear, the skinned pass at ROI × density × ssaa, one resolve, one present, one 2D composite.
The GPU cost is the vertex count (61 % face + hair) and the 4× supersampled ROI, not the draw count.

What can eventually be shared / merged / reduced (not done, architecture only): the resolve + present of N characters into one
layer pass (one FBO for all ROIs); face / hair as a shared-topology mesh family with per-player deltas at a density matched to the
touchline camera (the whole keeper is ~60 base px tall); one atlas per kit shared by all players wearing it; the environment pass
cached between frames when the camera does not move.

## 4. Population benchmarks (generic bodies, live scene, DPR 2)

| bodies | anim + IK | submission | GPU | page draw | draws | triangles |
|---|---|---|---|---|---|---|
| 1 | 0.12 ms | 0.09 ms | 1.59 ms | 5.1 ms | 1 | 2,408 |
| 2 | 0.15 | 0.09 | 1.64 | 5.1 | 2 | 4,816 |
| 5 | 0.25 | 0.10 | 1.65 | 6.0 | 5 | 12,040 |
| 11 | 0.44 | 0.10 | 1.68 | 6.4 | 11 | 26,488 |
| 22 | 0.78 | 0.12 | 1.71 | 6.5 | 22 | 52,976 |
| 22 sustained 120 s | 0.76 | 0.12 | 1.73 | 6.4 | 22 | 52,976 |

Scaling is linear in the animation stage (35 µs per body) and flat everywhere else: a full 22-player outfield on the diagnostic
mesh density costs less than one shipped Courtois. The Courtois-clone populations (final path) are in the review page table.

### Courtois-clone populations (the finished-character path, live scene, DPR 2)

| Courtois clones | anim + IK | submission before → after the grow-only fix | GPU before → after | page draw | draws (merged) | triangles |
|---|---|---|---|---|---|---|
| 1 | 0.13 ms | 25.1 → **0.10 ms** | 6.1 → 2.1 ms | 5.1 ms | 1 | 102,168 |
| 2 | 0.09 | 28.1 → 0.16 | 7.9 → 2.5 | 4.5 | 2 | 204,336 |
| 5 | 0.15 | 32.0 → 0.20 | 10.7 → 3.6 | 4.7 | 5 | 510,840 |
| 11 | 0.30 | 39.3 → 0.26 | 15.6 → 5.9 | 4.9 | 11 | 1,123,848 |
| 22 | 0.52 | 54.3 → 0.39 | 24.9 → 10.1 | 5.2 | 22 | 2,247,696 |
| 11 sustained 90 s | 0.28 | → 0.26 | → 5.9 | 4.8 | 11 | stable (heap 56 → 59 MB) |

After the fix 22 Courtois-class characters cost ≈ 10 ms GPU + 5 ms page pass per frame on this GPU — inside a 60 Hz budget, and the
submission cost fell by two orders of magnitude. The GPU term scales with triangles (2.25 M at 22), which is the argument for a
lighter production mesh family.

### The playable page (headless, DPR 2, 3000 × 1900 canvas, keeper in a put-down fixture)

| configuration | rAF (headless) | page draw | keeper solve + render | Mixed composite (2nd render at 2·RES) | HUD DOM | draws |
|---|---|---|---|---|---|---|
| as shipped (Mixed, merged, grow-only) | 30.6 Hz | 6.15 ms | 0.39 ms | 0.49 ms | 0.08 ms | 2 |
| + `?fps=60` | 30.6 Hz (cap not binding in headless) | 6.13 | 0.37 | 0.47 | 0.07 | 2 |
| Mixed off | 31.7 Hz | 5.71 | 0.41 | 0 | 0.09 | 1 |
| per-primitive draws (`?gkMerged=0`) | 30.8 Hz | 6.13 | 0.39 | 0.49 | 0.07 | 30 |

The keeper (solve + character render + composite) is < 1 ms per frame on the final path; the 2D environment pass at DPR 2 is 6 ms;
the shipped path's cost was the per-frame reallocation and, on a 120 Hz display, running all of it twice as often as needed.

## 5. Recommended production character architecture

- One skeleton hierarchy (`SKEL_DEF`), per-player morphology records (ratios + girths), one rotation-only animation library scaled by
  leg length, one procedural solver: **shared** (proved on the six generic bodies).
- One skinned program with a per-vertex material index (the merged path), shared material classes, one atlas per kit, one skinned
  vertex buffer per **mesh family** (not per player): per-player identity = morphology config + kit / skin / hair parameters + (where
  unavoidable) a small face / hair delta. Instancing is NOT appropriate (every player has its own bone matrices and morphology);
  batching within one layer pass is.
- Render all characters of a frame into one layer FBO (per-ROI viewports), one resolve, one composite; grow-only allocations;
  presentation frame cap at the simulation rate; environment pass cached when static.
- Keep the Courtois-class density for close-up review tooling; at the touchline camera the visible detail budget is ~60 × 100 px per
  player, so the production mesh family should be an order of magnitude lighter than 306 k vertices.

## 6. Storage

| component | bytes | shared / per player |
|---|---|---|
| Courtois GLB (geometry 22.10 MB; atlas 27 KB; JSON 39 KB) | 22,135,988 | per player as delivered |
| Courtois rig + contact JSON | 15,150 | per player |
| runtime code (anim3d/*.js incl. outfield modules) | ≈ 440,000 | shared |
| animation data today (GK library + V6 clip) | 60,981 | shared |
| skeleton definition + morphology defaults | < 4,000 | shared |
| generic morphology record | ≈ 600 | per player |
| sprite goalkeeper assets (for scale) | 2,744,459 | shared |

Scaling model: naive (one Courtois-class GLB per player) 22 MB × N → 440 MB at 20, 2.2 GB at 100, 11 GB at 500, 22 GB at 1,000.
Shared-topology architecture: shared code + animation + 2 mesh families (≈ 1.5 MB each) + ≈ 40 kit atlases (27 KB) + per player 15 KB
config + ≈ 80 KB face / hair delta → ≈ 3.7 MB at 1, 5.5 MB at 20, 13 MB at 100, 51 MB at 500, 99 MB at 1,000. The only linear term
worth designing against is per-player geometry; everything else is shared.
