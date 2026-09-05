# RECOVER — recover

- kind: action
- status: authored east + south via the PixelLab 'getting-up' template (group aac6752a); south frame 4 dropped (back of the head)
- directions: east, south
- files: `anim/recover_getting_up/<dir>/<i>.png`

## Keyframes (minimum key poses, in order)

1. sitting/kneeling
2. one foot planted
3. push up
4. ready stance

## PixelLab call

```
animate_character(character_id="0808086b-027d-4114-a53a-efd11a8178f9", mode="v3", frame_count=8,
  animation_name="gk_recover", directions=["east", "south"],
  action_description="template 'getting-up' (5 frames) — or custom: goalkeeper gets up from lying on his side: rolls to a knee, plants a foot, pushes up into the ready stance, gloves coming up to hip height")
```

Identity line (append if the model drifts): *Goalkeeper GK_BASE_V1 (frozen identity): tall lean athletic man, cropped black hair, olive skin, neon-green long-sleeve goalkeeper jersey, black shorts, black socks with a green band, black boots, white goalkeeper gloves. Same face, build and kit in every frame. No ball, no goal, no pitch, no text, no logos, transparent background.*

## Simulation mapping

State(s) `RECOVER` in `gkAnimUpdate`; the CONTACT keyframe is aligned to the simulation contact/arrival (`contact` position in the manifest); frames before it are phase-mapped over `execTime`, frames after it play in LAND/RISE. The runtime never uses this clip to decide anything physical.

## Acceptance checks

- no ball anywhere; gloves visible in every frame; frame 0 = SET pose; body stays on the pivot (bbox centre drift < ~20 px unless the action requires it)
- for dives: takeoff foot visible on the push-off frame; landing on forearm/side, never a standing snap
- for loops: first and last frames tile without a pop
