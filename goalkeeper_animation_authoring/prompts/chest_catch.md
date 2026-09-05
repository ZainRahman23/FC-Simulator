# CHEST_CATCH / SUPPORTED_CATCH — chest_catch

- kind: action (contact = gloves meet in front of the sternum)
- status: authored east + south, ball-free (group c2e03d1b)
- directions: east, south (west mirror); north needed
- files: `anim/chest_catch/<dir>/<i>.png`

## Keyframes (minimum key poses, in order)

1. ready stance
2. gloves forward, fingers spread (CONTACT)
3. absorb into the sternum
4. hug, head down

## PixelLab call

```
animate_character(character_id="0808086b-027d-4114-a53a-efd11a8178f9", mode="v3", frame_count=8,
  animation_name="gk_chest_catch", directions=["east", "south"],
  action_description="goalkeeper chest catch mime with EMPTY gloves and absolutely no ball in the picture: from the ready stance he brings both open gloves forward at chest height, fingers spread, then pulls them in to his sternum and hugs his forearms across his chest as if securing a ball against his body, knees flexed, head down looking at his gloves")
```

Identity line (append if the model drifts): *Goalkeeper GK_BASE_V1 (frozen identity): tall lean athletic man, cropped black hair, olive skin, neon-green long-sleeve goalkeeper jersey, black shorts, black socks with a green band, black boots, white goalkeeper gloves. Same face, build and kit in every frame. No ball, no goal, no pitch, no text, no logos, transparent background.*

## Simulation mapping

State(s) `CHEST_CATCH / SUPPORTED_CATCH` in `gkAnimUpdate`; the CONTACT keyframe is aligned to the simulation contact/arrival (`contact` position in the manifest); frames before it are phase-mapped over `execTime`, frames after it play in LAND/RISE. The runtime never uses this clip to decide anything physical.

## Acceptance checks

- no ball anywhere; gloves visible in every frame; frame 0 = SET pose; body stays on the pivot (bbox centre drift < ~20 px unless the action requires it)
- for dives: takeoff foot visible on the push-off frame; landing on forearm/side, never a standing snap
- for loops: first and last frames tile without a pop
