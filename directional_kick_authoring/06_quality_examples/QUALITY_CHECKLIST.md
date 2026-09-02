# Pixel-Quality Acceptance Checklist

These are the hard-won lessons from the approved **east** POWER/INSIDE/LACES/OUTSIDE/CHIP
development. Every returned frame is checked against them. CONTACT frames are reviewed **both
clean and enlarged (nearest-neighbour)**.

## Limb continuity
- [ ] Continuous **thigh → knee** (no break at the joint)
- [ ] Continuous **knee → shin**
- [ ] **Knee present** and readable as a joint (not a straight tube, not missing)
- [ ] Intact **sock** volume
- [ ] Continuous **sock → ankle**
- [ ] **Boot attached** to the ankle (no floating boot)
- [ ] No **ankle gap**
- [ ] No **independent ankle kink** (ankle bends with the leg, not on its own)

## Boot
- [ ] **Volumetric / readable** boot (reads as a 3D foot, not a flat shape)
- [ ] **Rounded** boot silhouette
- [ ] **No black blob** (interior shading/highlight, not a solid black lump)
- [ ] No **toe-up** POWER contact (POWER boot is moderately plantar-flexed, laces leading)

## Mechanics / identity
- [ ] **Correct striking surface** for the technique (INSIDE / LACES / OUTSIDE / CHIP)
- [ ] **Correct support foot** (physical LEFT), grounded/braced
- [ ] **Physical RIGHT leg is the kicker** — always, regardless of screen side
- [ ] Knee **leads**, shin drives through, ankle **locked** at contact (POWER/LACES)
- [ ] No jump-kick (support foot stays grounded through contact for POWER)

## Global
- [ ] **Consistent proportions** across all frames and all directions
- [ ] **Readable at gameplay scale** (≈ the un-zoomed 140-canvas size)
- [ ] Facing matches the idle rotation for that direction (torso/shoulder/pelvis/head)
- [ ] No **floating pixels** / disconnected alpha islands
- [ ] **No ball painted into the sprite** (ball is composited separately by the engine)

## Occlusion is allowed
Correct occlusion is expected — do NOT expose a joint that the perspective would hide (e.g. the
back-view N kicking leg is largely behind the torso; show heel/sole, not an invented laces face).
Do not distort anatomy just to make every joint visible.

## GOOD reference
`GOOD_*_CONTACT.png` in this folder are crops of the approved east CONTACT frames — the target
quality bar. Match this density, shading, and silhouette discipline.

## See also
`../06_quality_examples/REJECTED/` — failed PixelLab/scripted experiments, kept for history only.
**DO NOT AUTHOR FROM THEM.**
