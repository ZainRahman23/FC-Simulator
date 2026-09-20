# Astra goalkeeper DISTRIBUTION reference — skeletal motions for releasing a held ball (deterministic, Touchline gameplay camera)

Each folder is ONE distribution motion (or a mirror / facing variant) rendered from the exact Touchline gameplay camera (CAMERA_V1,
1:1 pixels; the 500x450 clip starts at viewport (600,150)). Nothing here is final art: the skinned test character is a MOTION-AUTHORING
rig. The pixel artwork is to be authored from these references.

The RELEASE IS A SIMULATION EVENT. `manifest.json → plan` is the authoritative plan (kind, t0, tRelease / tDrop / tKick, the release /
drop / kick points in pitch metres, facing, target, hand side / foot); `events` are the authoritative moments as they happened
(RELEASE, or DROP + KICK for the punt) with the ball position and velocity; `releaseRecords` are the presentation's validation at those
ticks (rendered ball on the last held tick vs the authoritative point, hand-to-ball-surface, foot-to-ball-surface, facing sim vs
presentation, held flag after). Everything the artwork must respect: the ball leaves the hand ON the authoritative tick at the
authoritative point; before it, the ball is in the hands on the authored path; after it, the ball is the simulation's.

Per folder:
- `KEY_PHASES_strip.png` — every key phase / event at 3x (keeper crop), gameplay camera, clean.
- `gameplay_<tick>_<phase>.png` (1:1) and `_3x` keeper crops — clean.
- `close3d_<tick>_<phase>.png` — close zoom 3.5, normal 3D shading (biomechanics reference).
- `debug_<tick>_<phase>.png` — the close view with skeleton, target direction (cyan), authoritative release / kick point (yellow /
  orange rings), rendered in-hand ball path (green) vs simulation ball (white), hand / foot targets.
- `LOOP_gameplay_60fps.png` (APNG) + `LOOP_gameplay.gif` — real gameplay speed; `LOOP_close3d_slow4x.gif` — 4x slow close view.
- `manifest.json` — plan, events, release records, per key frame: phase, tick / time, roots, facing, held flag, simulation ball,
  rendered ball, hand / elbow positions, feet planted, per-bone pose eulers (deg) and per-joint world positions (pitch metres); phase
  timeline and per-tick roots / ball / hands over the loop window.

Conventions: pitch x east (goal line at x ≈ 105), y north→south, z up, metres; facing = world heading (deg). Authored RIGHT-handed /
right-footed; LEFT = exact mirror (poses, ball path, hand roles). Hand = the hand on the target's side of the keeper's frame at the
plan start (central → right); punt foot from the request. 60 ticks / s; every tick is a real simulation tick.
Review page: `review_artifacts/gk_distribution/GK_DISTRIBUTION_REVIEW.html`. Findings: `review_artifacts/gk_distribution/GK_DISTRIBUTION_FINDINGS.md`.
