# MEDIUM_DIVE_L/R (+ FULL_STRETCH mid) — medium_dive

- kind: action (contact = lead glove at hip-to-chest height, body horizontal)
- status: authored east, side view (group ccc434ed)
- directions: east authored (side view); south needed; goal-line version needed
- files: `anim/medium_dive_right/<dir>/<i>.png`

## Keyframes (minimum key poses, in order)

1. ready stance
2. load (knees bend)
3. push-off
4. airborne, arms extended (CONTACT)
5. landing on the side

## PixelLab call

```
animate_character(character_id="0808086b-027d-4114-a53a-efd11a8178f9", mode="v3", frame_count=8,
  animation_name="gk_medium_dive", directions=["east", "south"],
  action_description="goalkeeper medium diving save to his right with no ball: from the ready stance he loads his knees, pushes off the near leg, body horizontal at hip height in the air, both arms extended to his right with the open gloves leading, then lands on his side")
```

Identity line (append if the model drifts): *Goalkeeper GK_BASE_V1 (frozen identity): tall lean athletic man, cropped black hair, olive skin, neon-green long-sleeve goalkeeper jersey, black shorts, black socks with a green band, black boots, white goalkeeper gloves. Same face, build and kit in every frame. No ball, no goal, no pitch, no text, no logos, transparent background.*

## Simulation mapping

State(s) `MEDIUM_DIVE_L/R (+ FULL_STRETCH mid)` in `gkAnimUpdate`; the CONTACT keyframe is aligned to the simulation contact/arrival (`contact` position in the manifest); frames before it are phase-mapped over `execTime`, frames after it play in LAND/RISE. The runtime never uses this clip to decide anything physical.

## Acceptance checks

- no ball anywhere; gloves visible in every frame; frame 0 = SET pose; body stays on the pivot (bbox centre drift < ~20 px unless the action requires it)
- for dives: takeoff foot visible on the push-off frame; landing on forearm/side, never a standing snap
- for loops: first and last frames tile without a pop
