# STEP_FORWARD / STEP_BACKWARD — step_forward_backward

- kind: loop
- status: needed (shuffle frames stand in)
- directions: east, south
- files: `anim/step_forward/<dir>/<i>.png, anim/step_backward/<dir>/<i>.png`

## Keyframes (minimum key poses, in order)

1. left foot forward
2. feet level
3. right foot forward
4. feet level

## PixelLab call

```
animate_character(character_id="0808086b-027d-4114-a53a-efd11a8178f9", mode="v3", frame_count=8,
  animation_name="gk_step_forward_backward", directions=["east", "south"],
  action_description="goalkeeper small forward steps in the ready stance: short quick steps toward the ball staying low, gloves up, head still, looping cycle (backward: the same cycle stepping back without turning)")
```

Identity line (append if the model drifts): *Goalkeeper GK_BASE_V1 (frozen identity): tall lean athletic man, cropped black hair, olive skin, neon-green long-sleeve goalkeeper jersey, black shorts, black socks with a green band, black boots, white goalkeeper gloves. Same face, build and kit in every frame. No ball, no goal, no pitch, no text, no logos, transparent background.*

## Simulation mapping

State(s) `STEP_FORWARD / STEP_BACKWARD` in `gkAnimUpdate`; the CONTACT keyframe is aligned to the simulation contact/arrival (`contact` position in the manifest); frames before it are phase-mapped over `execTime`, frames after it play in LAND/RISE. The runtime never uses this clip to decide anything physical.

## Acceptance checks

- no ball anywhere; gloves visible in every frame; frame 0 = SET pose; body stays on the pivot (bbox centre drift < ~20 px unless the action requires it)
- for dives: takeoff foot visible on the push-off frame; landing on forearm/side, never a standing snap
- for loops: first and last frames tile without a pop
