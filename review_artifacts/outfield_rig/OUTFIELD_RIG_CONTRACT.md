# Outfield player skeletal foundation — rig / bind / morphology / retargeting contract (2026-09-23)

Scope of this stage: the shared skeletal and runtime architecture for future outfield players. No real players, no likenesses, no
production animation library. Code: `sandbox/visual/anim3d/of_rig.js` (skeleton, morphology, validation), `of_motion.js`
(diagnostic motion set, retargeting, contact solve), `of_scene.js` (line-up review + population benchmark on the live scene),
tools `sandbox/visual/tools/anim3d/of_validate.js` (node, headless rig validation) and `of_bench.js` (population benchmark).

Rule preserved throughout: **simulation decides what happens; animation visually explains what happened.** The outfield rig consumes
authoritative facts (root, facing, speed, later the action description) and never writes them.

## 1. What is shared, what is per player

| layer | shared across every player | per player |
|---|---|---|
| hierarchy | the 23-joint `SKEL_DEF` tree of the goalkeeper (root → pelvis → spine → chest → neck → head/hair; clavicle → upperArm → foreArm → hand ×2; thigh → shin → foot → toe ×2), the same joint NAMES and ORDER, the same parenting | — |
| coordinate conventions | character frame +x right / +y up / +z forward (right-handed); 3D world x = pitch x, y = height, z = −pitch y; bind = all eulers 0; every bone's local frame is WORLD-ALIGNED at bind (identity bind rotations) | — |
| bone dimensions | the reference fractions of height (`OF_SEG_REF`) | the morphology record: target stature H, segment RATIOS (thigh, shin, ankle, pelvis, spine, chest, neck, head, clavicle, upper arm, forearm, hand, hip width, clavicle offsets), per-bone girth (scalar or [side, fore-aft]) — the vertical chain is normalised so the stature is exact and the ratios are the player's |
| bind transforms | translations only (offsets along the parent), directions from `SKEL_DEF` | the offsets / lengths in metres derived from the morphology; inverse binds = exact inverses of the bind world matrices (identity check < 1e-9) |
| skinning rule | 4 influences, joint rings straddled 0.5 / 0.5, mid-segment single bone; material part per vertex (skin / hair / shirt / shorts / socks / boots / gloves) | girth multipliers per bone applied to the loft rings (the same builder, `skinBuildMesh`, now morphology-aware) |
| animation data | rotation-only eulers per bone + a pelvis offset in METRES authored at the reference leg length | the pelvis offset is rescaled by the player's LEG LENGTH (`legLen / OF_REF_LEG`), never by height |
| procedural correction | plants (foot locked in the world by leg IK, knee-forward pole), sole flattening, ground clamp, joint limits, discontinuity blends, reach cap | the contact heights (ankle height = the morphology's ankle segment; for a finished GLB character the measured sole depth) |
| appearance | shaders / material classes / the kit atlas machinery (the Courtois program) | the identity configuration (later): colours, kit, face, hair, boots — not part of this stage |

The GK solver (`gk_graph.js`) is goalkeeper-specific action logic and is NOT reused by the outfield rig; the reusable pieces are
`skelFK`, `skelInverseBind`, `skelSkinMatrices`, `skelIK2` (with the anatomical elbow fold limit), `skinBuildMesh` and the
plant / floor / flatten rules re-implemented compactly in `ofSolve`.

## 2. Morphology record

```
{ id, H,                          // target stature (m) — exact after normalisation
  seg: { thigh, shin, ankle, pelvisUp, spine, chest, neck, head, hair, clavicle, upperArm, foreArm, hand, foot, toe, hipW, clavX, clavY },  // fractions (ratios); missing keys = reference
  girth: { pelvis, thigh_R/L, shin_R/L, spine, chest:[side,foreAft], upperArm_R/L, foreArm_R/L, neck, head, … } }   // ring-radius multipliers
```
`ofDims` normalises the standing chain (thigh + shin + ankle + pelvisUp + spine + chest + neck + head) to H, so femur/tibia ratio,
torso length, arm length, shoulder width and hip width are free while the stature stays exact. `ofBuildSkeleton` returns the same
skeleton object shape the goalkeeper solver and renderer already consume (`bones[idx/off/dir/len/rad/part/parent/children]`, `byName`,
`H`, `invBind`, `contact.foot.soleBelowAnkleM`) plus `legLen`, `armLen`, `hipY`, `ankleH`, `morph`, `girth`.

## 3. Generic diagnostic bodies (stress fixtures, not players)

SHORT_COMPACT 1.66 m (short legs, long torso, wide, heavy), SHORT_LEAN 1.70, AVG_LEAN 1.80, AVG_ATHLETIC 1.83 (wide shoulders, heavy
thighs), TALL_LEAN 1.96 (long legs and arms, narrow), TALL_POWER 2.00 (long, wide, heavy). Measured on the built rigs: leg length
0.728 → 0.961 m, arm length 0.525 → 0.647 m, shoulder width 0.427 → 0.583 m, hip height 0.805 → 1.047 m, femur/tibia 1.061 → 1.098.
All six pass the bind validation (`ofValidateRig`): 23 bones in the shared order, finite joints, inverse-bind identity < 1e-9,
ankles at the ankle height, toe near the ground, exact stature, left/right symmetry < 1e-9, leg and shoulder ranges sane.

## 4. Retargeting rules (proved with the diagnostic motion set)

1. Poses are rotation-only → they apply to any morphology unchanged; the MORPHOLOGY is the retarget.
2. Metre-valued authored quantities (pelvis offsets) scale by the player's leg length, not by stature.
3. Locomotion: stride per step = 2 · legLen · sin(gait amplitude); cadence = authoritative speed / stride. A taller body takes longer
   strides at a lower cadence for the same simulation speed; the displacement is the simulation's.
4. Plants: the foot is locked in the world where the authored foot touches the pitch (no teleport), the lock blends in / out (never a
   cut; the blend is at most a quarter of the stance), the leg IK explains the displacement, the sole is flattened.
5. Pelvis follows the plants: the pelvis is lowered (never raised) by the least amount that keeps every planted foot within the leg's
   reach — the body's own legs dictate its hip height for the stride.
6. Reach cap: a plant the leg can no longer reach lets go with the residual EXPOSED; the leg is never stretched, the root never moved.
7. Ground clamp: a swinging foot under the pitch bends at the knee; only the body core lifts the pelvis.
8. Joint limits: the elbow fold limit (30° included angle) inside `skelIK2`; knee / elbow angles are reported per tick.
9. Discontinuity: the maximum joint motion per tick in the root frame is reported; the authoritative displacement is not a jump.

Measured (node validation, 240 ticks per motion, six bodies — `review_artifacts/outfield_rig/verification/of_validate.json`):
STAND / READY / SINGLE_LEG / PUNT: no slide, no penetration, no float, no discontinuity; RUN (6 m/s): slide ≤ 9 cm, over-reach ≤ 6 cm,
penetration ≤ 2 cm, float ≤ 9 cm; WALK (1.4 m/s): slide 12–19 cm and float 16–22 cm during the plant blend — the diagnostic walk gait
plants the heel from too high (an authoring-quality issue of the throw-away gait, not of the architecture; it is exposed, not hidden);
morphology signature drift under animation ≤ 0.1 mm (the body keeps its proportions); skin edge stretch up to 1.9× at deep knee
bends (READY / RUN) — the two-ring joint weighting of the diagnostic mesh tears at >100° flexion (a skin-weighting finding, see §6).

## 5. Contract with the Touchline renderer and the Mixed presentation

Outfield bodies render through the existing skinned program (`glRenderCharacters`, one draw per body, bone matrices = world ×
inverse bind) or, for a finished GLB character, through the character program in its render ROI (`gkCharRender`). Both take the
same skeleton object and the same skin matrices. The environment pass, the camera (`CAMERA_V1`) and the Mixed composition are
unchanged. The population benchmark composites all bodies in one full-canvas layer at the canvas density; the Courtois-clone
benchmark uses the per-character ROI path exactly as the goalkeeper does.

## 6. Findings that must be addressed before authoring the outfield library

- Skin weighting: the diagnostic loft straddles each joint with ONE 0.5/0.5 ring → edge stretch 1.5–1.9× at knees / elbows past ~100°.
  Production skins need 3-ring joint straddles (0.75/0.25 · 0.5/0.5 · 0.25/0.75) or dual-quaternion blending; the finished Courtois
  GLB already carries its own authored weights and does not show this.
- Foot roll: the plant locks the ANKLE; real gait rolls heel → toe. A toe-pivot in the last third of the stance (lock the toe, free the
  heel) is the next contact rule; it removes the walk's late-stance reach limit.
- Gait authoring: the diagnostic gait's heel strike is too high; the production walk / run cycles must be authored with the foot on the
  ground at the plant phase (the rules above then hold as they do for the run).
- Ready / athletic stance and single-leg plant hold exactly on every body; the punt keys (a goalkeeper distribution motion) retarget
  cleanly as a lower-body football movement.
