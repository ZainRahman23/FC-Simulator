# SET — set

- kind: state (8 rotations)
- status: authored — PixelLab create_character_state on f4838361 (id 0808086b…)
- directions: all 8 directions authored
- files: `assets/visual_v1/originals/character_f4838361/set/<direction>.png`

## Keyframes (minimum key poses, in order)

1. SET stance (single pose, all 8 rotations)

## PixelLab call

```
animate_character(character_id="0808086b-027d-4114-a53a-efd11a8178f9", mode="v3", frame_count=8,
  animation_name="gk_set", directions=["east", "south"],
  action_description="goalkeeper ready stance: feet slightly wider than the shoulders, knees flexed, hips lowered, slight forward lean, elbows out, open gloves at hip height, head up watching the ball")
```

Identity line (append if the model drifts): *Goalkeeper GK_BASE_V1 (frozen identity): tall lean athletic man, cropped black hair, olive skin, neon-green long-sleeve goalkeeper jersey, black shorts, black socks with a green band, black boots, white goalkeeper gloves. Same face, build and kit in every frame. No ball, no goal, no pitch, no text, no logos, transparent background.*

## Simulation mapping

State(s) `SET` in `gkAnimUpdate`; the CONTACT keyframe is aligned to the simulation contact/arrival (`contact` position in the manifest); frames before it are phase-mapped over `execTime`, frames after it play in LAND/RISE. The runtime never uses this clip to decide anything physical.

## Acceptance checks

- no ball anywhere; gloves visible in every frame; frame 0 = SET pose; body stays on the pivot (bbox centre drift < ~20 px unless the action requires it)
- for dives: takeoff foot visible on the push-off frame; landing on forearm/side, never a standing snap
- for loops: first and last frames tile without a pop
