# CROSSOVER_L/R — crossover

- kind: loop
- status: needed (shuffle frames stand in above 2.2 m/s)
- directions: east, south
- files: `anim/crossover_right/<dir>/<i>.png`

## Keyframes (minimum key poses, in order)

1. cross-step in front
2. open stride
3. recover step
4. open stride

## PixelLab call

```
animate_character(character_id="0808086b-027d-4114-a53a-efd11a8178f9", mode="v3", frame_count=8,
  animation_name="gk_crossover", directions=["east", "south"],
  action_description="goalkeeper fast crossover run to his right: the far leg crosses in front, long lateral strides, body turned slightly toward the direction of travel, arms pumping, gloves open, looping cycle")
```

Identity line (append if the model drifts): *Goalkeeper GK_BASE_V1 (frozen identity): tall lean athletic man, cropped black hair, olive skin, neon-green long-sleeve goalkeeper jersey, black shorts, black socks with a green band, black boots, white goalkeeper gloves. Same face, build and kit in every frame. No ball, no goal, no pitch, no text, no logos, transparent background.*

## Simulation mapping

State(s) `CROSSOVER_L/R` in `gkAnimUpdate`; the CONTACT keyframe is aligned to the simulation contact/arrival (`contact` position in the manifest); frames before it are phase-mapped over `execTime`, frames after it play in LAND/RISE. The runtime never uses this clip to decide anything physical.

## Acceptance checks

- no ball anywhere; gloves visible in every frame; frame 0 = SET pose; body stays on the pivot (bbox centre drift < ~20 px unless the action requires it)
- for dives: takeoff foot visible on the push-off frame; landing on forearm/side, never a standing snap
- for loops: first and last frames tile without a pop
