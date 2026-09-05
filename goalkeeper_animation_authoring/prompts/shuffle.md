# SHUFFLE_L/R — shuffle

- kind: loop (odometer-driven)
- status: authored east + south (group ba999c22)
- directions: east, south (west/left derived by mirror; left on east = reversed order)
- files: `anim/shuffle_right/<dir>/<i>.png`

## Keyframes (minimum key poses, in order)

1. push off the far foot
2. feet apart mid-step
3. feet together
4. second step

## PixelLab call

```
animate_character(character_id="0808086b-027d-4114-a53a-efd11a8178f9", mode="v3", frame_count=8,
  animation_name="gk_shuffle", directions=["east", "south"],
  action_description="goalkeeper lateral shuffle: quick sideways steps to his right staying low in the ready stance, feet never crossing, gloves up at hip height, head still, looping cycle of two side-steps")
```

Identity line (append if the model drifts): *Goalkeeper GK_BASE_V1 (frozen identity): tall lean athletic man, cropped black hair, olive skin, neon-green long-sleeve goalkeeper jersey, black shorts, black socks with a green band, black boots, white goalkeeper gloves. Same face, build and kit in every frame. No ball, no goal, no pitch, no text, no logos, transparent background.*

## Simulation mapping

State(s) `SHUFFLE_L/R` in `gkAnimUpdate`; the CONTACT keyframe is aligned to the simulation contact/arrival (`contact` position in the manifest); frames before it are phase-mapped over `execTime`, frames after it play in LAND/RISE. The runtime never uses this clip to decide anything physical.

## Acceptance checks

- no ball anywhere; gloves visible in every frame; frame 0 = SET pose; body stays on the pivot (bbox centre drift < ~20 px unless the action requires it)
- for dives: takeoff foot visible on the push-off frame; landing on forearm/side, never a standing snap
- for loops: first and last frames tile without a pop
