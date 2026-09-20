# Astra goalkeeper motion reference — skeletal motion library (deterministic, Touchline gameplay camera)

Each folder is ONE canonical motion (or a facing / mirror variant of it) rendered from the exact Touchline gameplay camera
(CAMERA_V1, 1:1 pixels; the 500x450 clip starts at viewport (600,150)). Nothing here is final art: the skinned test character is a
MOTION-AUTHORING rig. The pixel artwork is to be authored from these references.

Per folder:
- `manifest.json` — motion id, family, fixture, commit record (target, tier, execTime), contact (tick, point, volume, outcome, held),
  world facing, per key frame: phase, tick / time, simulation root, presentation root, reach / lead hand, two-hand flag, simulation
  hand target, leg tip, ball position, glove residual, feet planted, pelvis world position, per-bone pose eulers (deg) and per-joint
  world positions (pitch metres); phase timeline; ball path; per-tick roots.
- `KEY_PHASES_strip.png` — every key phase at 3x (keeper crop), gameplay camera, clean.
- `gameplay_<tick>_<phase>.png` — clean gameplay frame (1:1) and `_3x` keeper crop.
- `overlay_<tick>_<phase>_3x.png` — the same frame with skeleton, contact target / glove IK, simulation root (red cross) vs
  presentation root (violet ring), feet (green planted / orange airborne).
- `close3d_<tick>_<phase>.png` — close zoom 3.5, normal 3D shading (biomechanics reference; not the game look).
- `LOOP_gameplay_60fps.png` (APNG, exact 16.667 ms/frame) and `LOOP_gameplay.gif` — the whole action at real gameplay speed.

Coordinate conventions: pitch x east (goal line at x ≈ 105), pitch y north→south, z up, metres. The keeper's facing is the world
heading in degrees (atan2(dy, dx)). `reachHand` is the keeper's anatomical side; screen left/right follows from the facing.
Timing: 60 ticks per second; every tick is a real simulation tick. The simulation is the authority for contact tick, contact point
and outcome; the skeleton only visually explains them (glove residual = distance from the drawn glove centre to the simulation hand).
Harness note: every folder is rendered on a FRESH page (no state leaks between fixtures). Fixture 54 (moving keeper, synthetic
shot) registers no shot on a fresh page — its folder shows the FOOTWORK only (the same fixture commits to a CHEST_CATCH at tick 60
when fired after fixture 42 on one page, as the neutrality gates do); use fixture 11 (real shot, moving keeper) for footwork into a
save, and fixtures 33 / 45 for the chest catch itself.
See `INDEX.json` for the list. Review page: `review_artifacts/gk_motion_library/GK_MOTION_LIBRARY_REVIEW.html`.
