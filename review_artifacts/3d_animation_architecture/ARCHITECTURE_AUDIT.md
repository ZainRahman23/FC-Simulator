# Touchline — 3D / 2.5D skeletal animation prototype: ARCHITECTURE AUDIT

Branch `prototype/3d-animation-pipeline` (from `main` @ ff3a89f, safe checkpoint tag `checkpoint/sprite-baseline-2026-09-19`, pushed to `fc-simulator`). Audit date 2026-09-19. Repository is authoritative; every claim below cites a file and line range of the checkpoint.

Principle under test: **the simulation decides what happens; the animation system visually explains what happened.** Target shape:

```
FOOTBALL SIMULATION → ACTION / ANIMATION RESOLVER → ANIMATION GRAPH → AUTHORED BASE ANIMATION → PROCEDURAL ADJUSTMENT / IK
→ 3D SKELETAL CHARACTER → TOUCHLINE FIXED CAMERA → 2.5D / PIXEL-STYLED PRESENTATION
```

Diagram: `ARCHITECTURE_DIAGRAM.png` (and §6 ASCII).

---

## 0. Phase 0 — checkpoint verification (done)

| check | result |
|---|---|
| branch / HEAD | `main` @ `ff3a89f` (2026-09-14 "live_freeplay_hunt: --off …") |
| tracking branch | `fc-simulator/main` — was **56 commits behind** local (`origin/main` of the other remote 139 behind). Neither remote had the sprite build. |
| fix applied | fast-forward push `main` → `fc-simulator/main` (cad400a..ff3a89f) + annotated tag `checkpoint/sprite-baseline-2026-09-19` pushed. Verified `0 0` ahead/behind. `origin` (TouchlineSimulator repo) intentionally left as is — say if you want it mirrored. |
| intentionally untracked | `review_artifacts/` (4 GB of review sheets; documented as never committed), `sandbox/visual/gk_audit_page.html` (untracked review page, left alone), `.venv/`, `data_rc*/`, caches per `.gitignore`. |
| prototype branch | `prototype/3d-animation-pipeline` created from `ff3a89f`; **not pushed** (per instruction). |

Rollback at any time: `git checkout main` (or the tag). Nothing on `main` is touched by this experiment.

## 1. Current simulation → animation → render pipeline (as it actually is)

Two runtimes exist; only one has any animation resolver.

**(a) Production match view** — `server.py` → `sandbox/visual/match.js` `drawPlayer`
```
engine.py (cal11 brain, 1 Hz decisions) ─┐
                                         ├─ continuous.py HybridLab ─ world.py Body (60 Hz, authoritative x,y,vx,vy,facing, ball x,y,z)
server.py advance {frames:true} ─────────┘      → per-second keyframe rows [x, y, actCode, active, faceDeg] + ball sub-samples (server.py:596-653)
match.js sampleAt() interpolates rows → drawPlayer(): state = speed band (idle <0.5 / jog <5.2 / sprint), frame = floor(t·fps) % 8,
   facing = velocity heading (15° hysteresis) or engine face → sprite blit at sproj3(x,0,y) with foot anchor (match.js:1847-1916)
```
No action semantics, no kick or save animation reach this path. Keepers here are the body's simple model (`world.py _gk_contest` + the ballistic dive in `continuous.py:1055-1120`).

**(b) Single Player Test (playtest)** — the only place with an action resolver. The body is a verbatim JS port (`PT` constants, `ptStep`, match.js:2167-2173, 5569-5918); the goalkeeper V1 mechanics (Stage 1–4) exist **only here** (match.js:2564-4298).
```
ptStep (60 Hz):  input → locomotion limiter → facing slew → scheduled kick contact → carry touches
                 → ptGkUpdate (keeper perceive / predict / READ / PREPARE / COMMIT / SAVE, hand + leg-tip kinematics)
                 → ball step (gkTryContact swept TOI → gkApplyContact Stage-4 outcome) → frame / net
draw():          depth-sorted entities → ptDrawPlayerSprite (outfield: ptView → KICK_LIB / dribble libs)
                                        → ptDrawKeeper → gkAnimDraw → gkAnimUpdate (resolver) → blit sprite / baked sequence frame / save pose / diagnostic
```

## 2. The actual current goalkeeper pipeline

Runtime symbols, in order, with what is authoritative at each step:

| stage | runtime code | authority |
|---|---|---|
| SET / TRACKING (pre-shot) | `ptGkUpdate` Stage 1 (match.js:4152-4165): `gkPosition` (distance×angle surface) + `gkMove`; `gk.state = SET | TRACKING`; `gk.facing = atan2(ball − gk)` | simulation |
| shot recognition | rising edge of `t.kick.kicked` (4121): `shotT0`, `latency = gkReactionLatency` | simulation |
| READ | `gkStage3Move` (3707-3712): coast only, `phase = READ`, `predict = gkPredict`, `reach = gkReachEval` | simulation |
| PREPARE | one capped step to `prepTarget` (3722-3750), `phase = PREPARE` | simulation |
| COMMIT | `gkTryCommit` (3604-3646): sub-tick `t0`, `execTime` from `gkActionTime` (causal arm/body model), frozen `target`, `feet`, `handOrigin`, `tier`, `action`, `envNorm`, `commitTick` | simulation |
| SAVE (flight) | `gkStage3Move` committed branch (3652-3690): `u = (now − t0)/execTime`, `e = smoothstep(u)`; hand `handNow = lerp(handOrigin → target, e)`; root travels `footFrac 0.45` (`GK_DIVE`) of the way, i.e. **the simulation root moves during the dive**; lead-leg tip for low dives | simulation |
| CONTACT | `gkTryContact` (3772-3838): swept TOI over HAND / TORSO / LEG+ / LEG− / LEGTIP volumes, 12 substeps; `gkApplyContact` (3998-4105): CATCH / SUPPORTED CATCH / CHEST CATCH / GATHER / CONTROLLED PARRY / WEAK PARRY / FINGERTIP / BODY BLOCK / FOOT / LEG SAVE; writes `gk.contact {tickT, volume, point, outcome, surface, normal…}` and the ball | simulation |
| after execEnd | root frozen at its final position (`gk.x/y` no longer written; 3660), hand frozen at target; ball continues | simulation |
| **anticipation/load, plant, push-off, flight frames, landing, recovery** | **presentation only**: `gkAnimUpdate` (4724-4868) derives `phase = load/push (u < 0.30) / extend (u < 0.8) / contact`, then `LAND` (0.45 s) → `RECOVER` (0.60 s) → `SET` timers after `endT = max(execEnd, contactT)`; the finer labels (WEIGHT_SHIFT, CROUCH, PLANT_LOAD, PUSH_OFF, TOE_OFF, FLIGHT…) exist only as **u-ranges in the baked sequence asset** (`GK_ANIM_V1.json` `sequences.*.pre[]`, e.g. LEFT_FAR F03 PLANT_LOAD u 0.10–0.16) | presentation (data) |
| presentation root | `gkAnimSeqPres` (4413-4425): `d(t) = V0·τ·(1 − e^(−t/τ))` along the dive direction after `endT`, cosine-eased back to the simulation root by `tEnd` (τ 0.4, tLand 0.55, tEnd 1.05 per sequence); shadow follows | presentation |
| art selection | `gkAnimResolve` (clip variants, mirror, side/dir approximation) → contextual save-pose pick `gkAnimContextualPick` (scored from committed geometry, frozen per commit) → `gkAnimSeqPick` (sequence keyed to the pose) → diagnostic figure when art is missing | presentation |
| anchoring / IK | `gkAnimGloves` + `gkAnimPlace` (4882-4900): whole-frame translation toward the projected simulation hand, capped `corrMaxPx 12` (≈0.23 m), residual flagged `WRONG_CLIP`; frame-selection IK ±1 frame among height variants | presentation |
| rendering | `gkAnimBlit` (4872-4881): nearest-neighbour blit, mirror, integer snap; `sproj3` projection; shadow ellipse; debug overlay `gkAnimOverlay` | rendering |

**Runtime vs tooling.** In runtime code: everything above. Tooling only (Python/Puppeteer under `sandbox/visual/tools/gk_anim/`): the **component rigs** (`rig/gk_rig.py`: parts cut from sprites by polygons, posed per part, composed down a joint hierarchy, rendered nearest-neighbour), the sequence authoring/bake scripts (`library/author_*.py`, `bake_seq.py`: write PNG frames + per-frame anchors JSON into `assets/visual_v1/goalkeeper/sequences/`), pose measurement, the neutrality gate (`gk_anim_gate.js`), sheets/GIFs. **The runtime never poses parts; it only selects and translates baked frames.** So the described chain "SET → load → plant → push-off → flight → contextual contact → landing → recovery → SET" is real, but its articulation lives in offline bakes; at runtime it is frame selection by `u` and by seconds-after-`endT`.

**Where the production body stands.** `world.py` has no keeper phases, no hand kinematics, no contact volumes. Everything the vertical slice needs is in the playtest keeper. That is the honest scope: the slice proves the presentation architecture on the playtest keeper; porting the keeper mechanics to the Python body is a separate (gameplay) workstream and is **not** part of this experiment.

## 3. Simulation / presentation boundary — classification of the existing code

| layer | what it holds today | symbols (match.js unless noted) | verdict |
|---|---|---|---|
| **A. SIMULATION / GAMEPLAY** | keeper root x,y,vx,vy; facing; ball x,y,z,v; SET position; predicted crossing; reach envelope; commit record (t0, execTime, target, feet, handOrigin, tier, action, envNorm, bestEffort, gather); `handNow`, `legTipNow`, `bodyNow`, `diveU`; swept contact TOI; contact record (tickT, point, volume, surface, outcome, normals, quality); ball response; held ball | `GK_CFG/GK_REACH/GK_ACTION/GK_DIVE/GK_BODY/GK_GATHER/GK_CONTACT`, `ptGkUpdate`, `gkStage3Move`, `gkTryCommit`, `gkTryContact`, `gkApplyContact`, `gkHeldBallStep`; `world.py Body` for outfield | untouched by the experiment |
| **B. ANIMATION SEMANTICS** | action family (LOW_GATHER / CHEST_CATCH / SUPPORTED_CATCH / HIGH_CATCH / NEAR_BODY_SAVE / FOOT_SAVE / LOW_COLLAPSE / AIRBORNE_DIVE), side (RIGHT/LEFT), goalSide, height class, expression (intensity, latFrac, vertDemand, extension, launch), save angle; phases SET/IDLE/footwork/READ/PREPARE/load-push/extend/contact/hold/LAND/RECOVER; u; endT; commit-freeze of facing; presentation-root law | `gkAnimClassify` (4513-4552), the state/phase half of `gkAnimUpdate` (4724-4790), `gkAnimSeqPres`, `GK_ANIM` taxonomy thresholds, `GK_ANIM_MIRROR/DIVES/SIDED` | renderer-independent in substance; currently **entangled** in one function with C (sequence/pose/clip resolution) |
| **C. PRESENTATION IMPLEMENTATION (sprite)** | clip variant resolution, mirror/side/dir approximation, contextual pose scoring, sequence frame pick by u / seconds, IK-window frame choice, hand-led whole-frame translation, save-pose orientation along the save vector, baked frame anchors, diagnostic stick figure | `gkAnimResolve`, `gkAnimResolvePose`, `gkAnimContextualPick`, `gkAnimSeqPick`, art-resolution half of `gkAnimUpdate` (4790-4868), `gkAnimGloves`, `gkAnimPlace`, `gkAnimDrawDiagnostic`, sequence/pose/clip branches of `gkAnimDraw` (4933-5060), `GK_ANIM_V1.json` | replaceable |
| **D. RENDERING** | world→screen projection, rail travel, zoom, depth scale, DPR; sprite blit + mirror; shadow ellipse; depth sort; ball sprite; debug overlays | `buildFrozenBasis/fproj3/sproj3/depthScale` (538-582), `gkAnimBlit`, `draw()` entity sort (6486-6560), `drawBallAt`, `gkAnimOverlay` | camera/projection/sort **kept**; blit replaced per backend |

Extraction verdict: A is already clean (the animation reads `gk.*` and never writes; the ON/OFF gate proves it). B is real but not isolated: the same function decides the phase **and** picks sprite frames. The proposed change is to make B a pure `ActionDescription` (a JSON-able object) that any backend consumes.

## 4. What must remain untouched

- `world.py`, `continuous.py`, `engine.py`, `server.py` (gameplay, ball, outcomes, keyframes).
- Keeper mechanics Stage 1–4 (match.js 2564-4298) including `gkTryContact/gkApplyContact` — the contact tick, point, volume and outcome are facts the presentation must meet, never move.
- `ptStep` and every simulation constant; the neutrality contract (animation ON/OFF/backend byte-identical traces).
- Camera CAMERA_V1 (`AUTHOR_DEFAULTS`, `buildFrozenBasis`, `sproj3`, `depthScale`), the rail, zoom, depth sort.
- All approved sprite assets and the sprite backend as the default.
- Playtest controls and the review pages.

## 5. Sprite-specific systems (what the 3D backend replaces or bypasses)

`GK_ANIM_V1.json` (states/clips/save_poses/contextual_poses/sequences), per-frame anchors, `gkAnimResolve*`, `gkAnimContextualPick`, `gkAnimSeqPick`, `gkAnimGloves/Place` (2-D pixel IK), `gkAnimBlit`, mirroring and DIR/SIDE approximation, `pixel_scale`, `corrMaxPx`, the baked-rig authoring toolchain. Kept intact for the SPRITE backend; not called by the SKELETAL_3D backend.

## 6. Proposed renderer-independent animation layer

```
  ┌──────────────────────── A. SIMULATION (authoritative, untouched) ────────────────────────┐
  │ gk root/vel/facing · commit {t0, execTime, target, feet, handOrigin} · handNow · legTip │
  │ contact {tickT, point, volume, outcome} · ball · held · SET/READ/PREPARE/COMMIT/SAVE    │
  └───────────────────────────────┬──────────────────────────────────────────────────────────┘
                                  │ read-only, once per rendered frame
  ┌───────────────────────────────▼──────────────────────────────────────────────────────────┐
  │ B. ACTION DESCRIPTION  (pure function of A + frozen commit)                             │
  │  { family, side, goalSide, heightClass, expr{intensity, extension, launch, latFrac},    │
  │    phase ∈ {SET, IDLE, FOOTWORK, READ, PREPARE, LOAD, PUSH, FLIGHT, CONTACT, HOLD,      │
  │             LAND, RECOVER}, u, tSinceEnd, endT, commitFacing, commitDir,                 │
  │    simRoot, handTarget (=handNow), legTip, contactPoint, contactSurface, presRoot }      │
  └───────────────────────────────┬──────────────────────────────────────────────────────────┘
                                  │ same object to every backend
          ┌───────────────────────┴────────────────────────┐
  ┌───────▼────────── C1. SPRITE BACKEND ─────────┐  ┌──────▼──────── C2. SKELETAL_3D BACKEND ───────────┐
  │ clip/pose/sequence resolution, 2-D hand-led   │  │ ANIMATION GRAPH: state × phase → clip + time map   │
  │ placement, mirror, baked frames               │  │ AUTHORED CLIP (bone-space keys) → FK pose          │
  └───────┬───────────────────────────────────────┘  │ PROCEDURAL: contact-time warp, glove IK (2-bone),   │
          │                                          │ torso lean, plant lock, ground clamp, pres root      │
          │                                          └──────┬─────────────────────────────────────────────┘
  ┌───────▼──────────────────────────────────────────────────▼────────────────────────────────┐
  │ D. RENDERING — shared CAMERA_V1 (sproj3 == GL projection), rail travel, zoom, depth sort,  │
  │    shadow; sprite: canvas blit · 3D: low-res WebGL target → nearest upscale → composited   │
  └───────────────────────────────────────────────────────────────────────────────────────────┘
```
Rules: B never writes A; C never writes A or B; D never writes anything. Both backends consume the identical B object per tick, so `simulation(sprite) == simulation(3D)` by construction and is proven by the gate.

Implementation note for the slice: `gkAnimUpdate` already computes the B fields. To avoid refactoring approved sprite code in the prototype, the 3D backend calls `gkAnimUpdate` (as `gkAnimDraw` does) and reads only the semantic fields (`state, family, side, u, phase, cls, dir`), plus `gk.committed/contact/handNow`. A later `refactor:` commit can lift those fields into `buildActionDescription()` and make the sprite path consume it too — a mechanical split, no behaviour change.

## 7. Proposed animation graph (goalkeeper; the kick graph follows the same shape)

```
                 ┌──────────┐  speed>0.05   ┌──────────┐
   ball far ───▶ │  IDLE    │◀────────────▶ │ FOOTWORK │ (shuffle/crossover/step, odometer-driven)
                 └────┬─────┘               └────┬─────┘
                      ▼ ball near                ▼ shot (kick impulse rising edge)
                 ┌──────────┐  latency      ┌──────────┐ one step  ┌──────────┐
                 │   SET    │─────────────▶ │   READ   │─────────▶ │ PREPARE  │
                 └──────────┘ (head tracks) └────┬─────┘           └────┬─────┘
                       ▲                         └──────── commit ──────┘
                       │                                     ▼
                       │            SAVE FAMILY SUBGRAPH (family from ActionDescription)
                       │   AIRBORNE_DIVE(side, heightClass, extension)  |  LOW_COLLAPSE  |  FOOT_SAVE  |  LOW_GATHER  |  CHEST/SUPPORTED/HIGH_CATCH  |  NEAR_BODY
                       │            LOAD(u 0–0.16) → PUSH(0.16–0.31) → FLIGHT(0.31–u_c) → CONTACT(tick) → HOLD(if held)
                       │                                                                    │
                       │                       LAND (0.45 s) ──▶ RECOVER (0.60 s) ─────────┘   (catch: RISE 0.40 s)
                       └────────────────────────────────────────────────────────────────────────
```
- Clip time is **not** wall time: pre-contact clips are sampled by the simulation's `u`; the CONTACT key is pinned to the contact tick; post-contact clips by seconds after `endT` (exactly the sprite sequence contract, now with continuous interpolation instead of 12 discrete frames).
- Blend rules: SET↔FOOTWORK crossfade 0.1 s; READ = SET pose + head look-at; any → save subgraph is a hard switch at the commit tick (commit freeze); LAND/RECOVER → SET crossfade over the last 0.15 s.
- Parameters the graph reads from B: `side` (mirror the clip on the character's lateral axis), `heightClass` + `extension` (blend between LOW / MID / HIGH variants of one dive clip: two authored extremes suffice), `launch` (how much the body leaves the ground), `latFrac` (root travel), `u`, `tSinceEnd`.

## 8. Proposed skeleton hierarchy (21 bones, stylised football player)

```
root (ground point = simulation root; yaw = commit facing)
└─ pelvis (z 0.44 H)                         legs (each side):
   ├─ spine (lower)   z 0.44→0.62 H          pelvis ─ thigh_L/R (hip ±0.10 H lateral) ─ shin ─ foot ─ toe
   │  └─ chest        z 0.62→0.82 H
   │     ├─ neck ─ head (crown ≈ 1.00 H)
   │     ├─ clavicle_L ─ upperArm_L ─ foreArm_L ─ hand_L
   │     └─ clavicle_R ─ upperArm_R ─ foreArm_R ─ hand_R
```
Lengths as fractions of height H (taken from `GK_BODY`/`GK_CFG`/`POSE_SPECS.md` so the visible body matches the collision anatomy): hip 0.44 H, shoulder 0.82 H, hand rest 0.78 H (`handReachFrac`), torso 0.55 m at 1.83 m, arm span 0.72 m (upper 0.32, fore 0.28, hand 0.12 — `GK_DIVE.handR`), thigh 0.24 H, shin 0.24 H, foot 0.14 H, stance half-width 0.20 m (`footSpread`), torso half-width 0.20 m. Root is separate from pelvis so root motion (A) and body motion (B/C) never mix. Toe bones exist for kick contact surfaces later; fingers are not bones (glove is a mesh attachment). This covers running, turning, kicking, tackling, dives, catches, jumps, landing and recovery; a tail/cloth/hair bone is an optional leaf.

## 9. Simulation root vs presentation root — explicit contract

- `simulationRoot` = `(gk.x, 0, gk.y)` — the only position gameplay, contact, camera tracking and depth sorting ever use. Never written by presentation (already true; enforced by the gate).
- `presentationRoot` = `simulationRoot + Δ(t)` where Δ is produced by the graph under **rules**, not by clip root motion:
  1. **Pre-commit**: Δ = 0 (SET/footwork play in place; footwork strides are odometer-driven by real root travel, no moonwalk).
  2. **Dive**: horizontal Δ = 0 — the authored dive's root motion is discarded and the simulation's own root path (footFrac travel) is used; vertical Δz = authored jump height × `launch` (the simulation has no keeper z; presentation owns height).
  3. **Post-execEnd**: Δ = continuation `V0·τ·(1−e^(−t/τ))` along the dive direction, eased back to 0 by `tEnd` (same law and constants as the sprite `pres`, so both backends agree by construction).
  4. **Bounds**: |Δ_xy| ≤ 0.6 m, Δz ≥ 0; Δ must be 0 whenever phase returns to SET/IDLE; if a new shot arrives, Δ resets at the commit tick.
  5. Shadow and depth-sort key follow `presentationRoot`? No — **depth key stays the simulation root** (avoids sort popping); only the shadow follows presentation. (Sprite path does the same.)
  6. Nothing in A ever reads `presentationRoot`.
- The kick system will inherit the same rule set (approach/plant root motion replaced by the body's locomotion; only small Δ for plant/recovery).

## 10. Authored animation strategy

- Authored = **bone-space keyframes** (JSON) with named phase keys, not baked pixels. First clip: `GK_FAR_DIVE` with keys SET → LOAD → PUSH → TOE_OFF → FLIGHT → REACH (contact) → APEX → LAND → ABSORB → RISE → SET, authored to the keeper's RIGHT; LEFT = lateral mirror of the bone keys (a skeleton mirror is exact, unlike sprite mirroring which swaps facing).
- Height variants: two extremes (LOW-MID reach at z ≈ 0.9 m, TOP reach at z ≈ 2.6 m) blended by `heightClass/vertDemand`; `extension` scales the arm/leg stretch keys (moderate vs full, as the sprites' "moderate" variants).
- Prototype authoring: hand-set Euler keys in the clip file (I am the animator). Production: the same JSON schema is what a DCC/GLTF import would produce; retargeting to the shared skeleton keeps clips reusable across body types.
- One trunk per family, contextual branches only where biomechanics differ (the sprite library's lesson: 16 sequences reduced to 1 trunk/facing/side + get-ups). In 3D the facing is free, so trunks collapse further: one far-dive trunk, mirrored, height-blended.

## 11. IK / procedural strategy ("IK corrects good animation")

| correction | input from A/B | method | bound |
|---|---|---|---|
| contact-time warp | `u`, contact tick | remap clip phase so the REACH key lands on the contact tick (before contact: on execEnd) | monotonic, ≤ 25 % rate change |
| glove IK | `handNow` (sim hand; equals the contact surface at the contact tick) | 2-bone analytic (shoulder–elbow–wrist), pole from the authored elbow, weight 0 at LOAD → 1 at FLIGHT/CONTACT | reach clamp; residual reported; never scales bones |
| torso / clavicle assist | residual after IK | rotate chest toward the target by ≤ 20°, clavicle ≤ 10° | bounded |
| head look-at | ball position | during READ/PREPARE/FLIGHT | ≤ 60° |
| plant lock | phase LOAD/PUSH | push-off foot pinned to its world position at commit until TOE_OFF | exact |
| ground clamp | pose | feet/knees never below z=0; hips ≥ 0.25 m when grounded | exact |
| landing | LAND/RECOVER | lead hand/forearm/hip meet the ground along the dive axis; presentation root continuation | exact |
The simulation is never asked to move the target to fit the pose; when the reach is impossible the residual is displayed (as today's `WRONG_CLIP`), never hidden.

## 12. Contact synchronisation

Contact is a simulation fact: `gk.contact.tickT` (60 Hz, sub-tick TOI inside `gkTryContact`), `point`, `volume`. The backend guarantees that at the render frame containing that tick the drawn glove centre is at `handNow` (IK weight 1) — visual error measured in the same units as today (`errPx`, `errM`, `touchGapM`, see `gkAnimDraw` 5063-5089) and logged. Early contacts (ball meets the moving hand at u < 1, as in the chosen scenario, u 0.886) hand the REACH key to the contact tick immediately; the remaining flight keys are skipped — same rule as the sprite path.

## 13. Foot planting · 14. Landing / recovery

Foot planting: SET/footwork feet ride the odometer; LOAD/PUSH pin the push-off foot; TOE_OFF releases; FLIGHT feet follow the clip; LAND clamps to ground; RECOVER walks the feet back under the pelvis before SET. Landing/recovery use the sprite timers (`landDur 0.45`, `recoverDur 0.60`, `riseDur 0.40`) so state labels stay identical across backends.

## 15. Customisation architecture (not built in the slice, but not blocked by it)

- **One shared skeleton** (§8) for outfield and keeper; per-player **proportional scaling** by bone (height, limb length, shoulder width) applied to bind pose — clips are rotation-only so they retarget for free; foot/hand targets are world-space so IK absorbs proportion changes.
- **Modular mesh parts** attached to bones: head/face, hair, torso (shirt), arms (sleeves), hands (gloves or skin), shorts, socks, boots — each a separate draw group with its own material; kits are palette/material swaps (no re-authoring).
- **Palette-limited materials** (Option D) make skin tone / kit colours a uniform swap, and match the pixel language.
- Attachment sockets (hand, head, back) for props.
- Prototype: capsule/box "part" meshes per bone with a material per part group (skin, hair, shirt, shorts, socks, boots, gloves) — proves the separation of motion from appearance without a mesh pipeline.

## 16. Rendering options evaluated

| option | what | pros | cons | verdict |
|---|---|---|---|---|
| A. stylised low-poly, direct | draw at backing resolution | crisp, simplest | reads as "3D game", not Touchline; anti-aliased edges fight the sprite world | not as default |
| **B. low-res render + nearest upscale** | render the character layer at 1/2–1/3 VIEW res, `drawImage` with smoothing off | chunky pixels matching the sprite density (sprite art ≈ 0.34 VIEW px per art px at zoom 1, i.e. drawn slightly below native), cheap | pixel grid is screen-aligned, not object-aligned (sprites also are) | **primary** |
| C. render-to-texture per character | each character into its own small texture at authored density (e.g. 1 texel = 0.055 m like the art) then blitted as a billboard | object-aligned pixel density independent of depth, exactly like a sprite; per-character LOD free | 22 textures/frame, more draw passes | **evaluate second** (best pixel-identity candidate) |
| **D. quantised palette shading** | flat shading with 3–4 lighting bands and per-material palette ramps | reproduces the sprite palette look, kit swaps trivial | needs an outline pass for readability | **combine with B/C** |
| E. software rasteriser to canvas 2D | own triangle rasteriser at 320×180 | zero WebGL, integrates with canvas blits | slower, more code, no depth buffer shortcuts | rejected |
Selected for the slice: **B + D** with C available as a switch (`GK3D.mode`), plus a 1-px outline. All render into an offscreen WebGL canvas that is composited by `drawImage` at the keeper's depth slot, so occlusion order with posts/net/ball is unchanged.

## 17. Recommended 3D technology / dependency

Candidates:

| candidate | size | skinning | IK | RTT | fits stack (no bundler, static server, canvas 2D world) | maintain |
|---|---|---|---|---|---|---|
| three.js (vendored, pinned) | ~680 KB min ESM | yes (SkinnedMesh, AnimationMixer, GLTF) | CCDIK helper | yes | yes, one file | high |
| Babylon.js | ~4 MB | yes | yes | yes | heavy | high |
| PlayCanvas engine | ~1.5 MB | yes | partial | yes | editor-centric | medium |
| Godot / Unity web | 10–30 MB | yes | yes | yes | replaces the stack | no |
| **raw WebGL2 (own mini-lib)** | ~0 KB (≈ 800 lines in-repo) | rigid-per-bone now; linear-blend skinning is ~40 lines later | own 2-bone analytic | yes | perfect | ours |

Decision for the slice: **no external dependency**. A skeleton of 21 bones, a generated capsule mesh per bone, a flat/quantised shader and a mat4 helper are small, fully deterministic and keep the experiment reversible (delete one folder). Three.js is the recommended library **if and when** the slice is approved and real authored meshes/GLTF clips enter the pipeline (skinning, asset import, retargeting); it would be vendored under `sandbox/visual/vendor/three/` at a pinned version, loaded as one ES module, no bundler. Nothing in the layer B/C design depends on either choice.

## 18. Browser / runtime performance analysis (targets 22 players + ball + stadium)

- Geometry: 21 capsule parts × ~120 tris ≈ 2.5 k tris per character; 22 characters ≈ 55 k tris — trivial for WebGL2 (budget millions).
- Draw calls: rigid-part rendering = 21 calls/character (462 total) or 1 call/character with skinning; both fine; instancing not needed.
- Animation: FK 21 mat4 per character, 2× 2-bone IK, ≈ 0.02 ms each in JS.
- Render target: at 1/3 VIEW (427×240) the fill cost is negligible; even full backing (2560×1440 at DPR 2) is fine for one character layer; per-character RTT (option C) ~ 22 × 96² texels.
- Shadows: keep the existing ellipse shadows (cheap, consistent with sprites); no shadow maps.
- LOD: far characters can drop to fewer segments or to the sprite backend per character (the backend switch is per entity).
- The existing canvas-2D world (stadium, ground homography, nets) is the frame-time owner today (`S.perfT`); the character layer adds one `drawImage` of the GL canvas per character or per frame.
- Measured numbers for the slice are reported in `PROTOTYPE_FINDINGS.md` (G).

## 19. Migration risks

1. Look drift — the 3D keeper may not read as the same game; mitigated by B+D, outline, matching pixel density, and A/B under the real camera before any adoption decision.
2. Semantics entanglement — lifting B out of `gkAnimUpdate` could alter sprite behaviour; mitigated by the gate (hash-identical traces) and by not refactoring in the slice.
3. Authoring cost moves, not disappears — someone must author bone clips; but one clip serves all facings/sides/heights, versus 16 baked sequences.
4. Contact fidelity — IK reaching beyond arm length must show a miss, not stretch; residual logged.
5. Performance at 22 characters — analysed above; measured for N copies in the slice.
6. Tooling drift — puppeteer harnesses assume the sprite HUD; the 3D backend keeps the same debug overlay API.

## 20. Rollback strategy

Everything lives on `prototype/3d-animation-pipeline`; `main` and the tag are untouched. Within the branch the backend defaults to SPRITE; the 3D code is in `sandbox/visual/anim3d/` (new files) plus a small dispatch in `ptDrawKeeper`, a debug-panel control and script tags. Deleting the folder and reverting the dispatch commit restores the checkpoint exactly. No asset is modified.

## 21. Exact first vertical slice

Scenario: built-in `GK_SCENARIOS[42]` "S4 K2 high tip-up (POWER 28 m/s under the bar)" — a real POWER shot through the production charge path (origin (86,34), aim (105,32.5), c 0.66, K2 band). Deterministic (zero RNG). Measured trace (`review_artifacts/3d_animation_architecture/trace_scenario42.json`):

| fact | value |
|---|---|
| keeper SET | (101.987, 33.996), facing west (ball side) |
| shot impulse | tick 27 (t 0.45) |
| commit | tick 38, t0 0.6413 (sub-tick), execTime 0.4613 s, action DIVE-HIGH, tier HIGH/FULL-STRETCH, envNorm 0.941 |
| target / handOrigin | (101.985, 32.738, z 2.679) / (101.987, 33.996, z 1.482) |
| classification | AIRBORNE_DIVE, side RIGHT (keeper's right = north = up-screen, GOAL_LEFT), height TOP, intensity 0.89, extension 0.93, launch 1.0 |
| sprite art | sequence RIGHT_FAR pre-frames F02…F08 by u, contact pose DIVE_NORTH_MEDHIGH at the contact tick (**WRONG_CLIP: raw 52.9 px, capped 12, residual 40.9 px**), post frames F11…F17 with presentation root up to +0.37 m, SET at t ≈ 2.15 |
| contact | tick 62, tickT 1.05, u 0.886, volume HAND, point (101.874, 32.747, 2.671), outcome WEAK PARRY (through) |
| simulation root | travels y 33.996 → 33.430 (footFrac 0.45 of 1.258 m) during the dive, then frozen |

Slice = the SKELETAL_3D backend rendering this exact simulation through SET → LOAD → PUSH → FLIGHT → CONTACT → LAND → RECOVER → SET with the glove on `handNow` at tick 62, under CAMERA_V1, composited into the existing frame, with an A/B switch, a trace gate proving identical simulation, and the review captures A–H.

## 22. Staged implementation plan

1. `docs: audit animation presentation architecture` — this document + diagram + scenario trace.
2. `refactor: isolate presentation backend interface` — `GK_BACKEND` switch (URL `?gkBackend=3d`, debug-panel select, key `8` in the playtest), `ptDrawKeeper` dispatch, script includes; sprite path byte-identical when SPRITE.
3. `prototype: add skeletal goalkeeper renderer` — `anim3d/m4.js` (math), `skeleton.js` (hierarchy, FK, mirror), `gl_renderer.js` (WebGL2, CAMERA_V1-identical projection, low-res target, quantised shading, outline, bone/IK debug lines), capsule part meshes, SET pose.
4. `prototype: add goalkeeper animation graph` — `gk_far_dive_clip.js` (authored keys), `gk_graph.js` (phase mapping, contact-time warp, height/extension blend, presentation root, plant lock, ground clamp, landing/recovery).
5. `prototype: add contact target ik` — glove 2-bone IK + torso assist + residual metric; contact-tick guarantee.
6. `tools: 3d backend gate + captures` — `tools/anim3d/gk3d_gate.js` (per-tick sim trace incl. ball velocity, both backends), capture/compose scripts, `PROTOTYPE_FINDINGS.md`, review sheets/GIFs.
Stop after 6 for review. Not in scope: kicks, outfield, other save families, production body, asset conversion.
