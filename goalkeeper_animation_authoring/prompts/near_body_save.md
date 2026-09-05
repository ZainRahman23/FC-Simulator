# NEAR_BODY_SAVE_L/R — near_body_save

- kind: action (contact = one glove beside the body)
- status: needed (temporary: SET pose + procedural glove at the simulation hand)
- directions: east, south (mirror for left)
- files: `anim/near_body_save_right/<dir>/<i>.png`

## Keyframes (minimum key poses, in order)

1. ready stance
2. arm firing sideways
3. glove extended beside the body (CONTACT)
4. return

## PixelLab call

```
animate_character(character_id="0808086b-027d-4114-a53a-efd11a8178f9", mode="v3", frame_count=8,
  animation_name="gk_near_body_save", directions=["east", "south"],
  action_description="goalkeeper standing reflex save to his right with EMPTY gloves and no ball: from the ready stance he pushes one open glove out sideways at hip-to-shoulder height beside his body, the other arm balancing, feet planted, slight lean toward the glove, then returns to the stance")
```

Identity line (append if the model drifts): *Goalkeeper GK_BASE_V1 (frozen identity): tall lean athletic man, cropped black hair, olive skin, neon-green long-sleeve goalkeeper jersey, black shorts, black socks with a green band, black boots, white goalkeeper gloves. Same face, build and kit in every frame. No ball, no goal, no pitch, no text, no logos, transparent background.*

## Simulation mapping

State(s) `NEAR_BODY_SAVE_L/R` in `gkAnimUpdate`; the CONTACT keyframe is aligned to the simulation contact/arrival (`contact` position in the manifest); frames before it are phase-mapped over `execTime`, frames after it play in LAND/RISE. The runtime never uses this clip to decide anything physical.

## Acceptance checks

- no ball anywhere; gloves visible in every frame; frame 0 = SET pose; body stays on the pivot (bbox centre drift < ~20 px unless the action requires it)
- for dives: takeoff foot visible on the push-off frame; landing on forearm/side, never a standing snap
- for loops: first and last frames tile without a pop
