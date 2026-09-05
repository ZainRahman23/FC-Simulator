# HIGH_DIVE_L/R (+ FULL_STRETCH high) — high_dive

- kind: action (contact = lead glove high, full extension)
- status: authored east, side view (group 2a8b8cbd)
- directions: east authored (side view); south needed; goal-line version needed
- files: `anim/high_dive_right/<dir>/<i>.png`

## Keyframes (minimum key poses, in order)

1. ready stance
2. load
3. push-off (takeoff foot visible)
4. full extension, glove high (CONTACT)
5. landing on forearm/side

## PixelLab call

```
animate_character(character_id="0808086b-027d-4114-a53a-efd11a8178f9", mode="v3", frame_count=8,
  animation_name="gk_high_dive", directions=["east", "south"],
  action_description="goalkeeper high full-stretch diving save to his right with no ball: loads on flexed knees, plants and pushes off the left leg, body launches fully horizontal in the air with the hips elevated, right arm extended high with the open glove leading, left arm trailing, legs counterbalancing, then lands on the forearm, side and hip")
```

Identity line (append if the model drifts): *Goalkeeper GK_BASE_V1 (frozen identity): tall lean athletic man, cropped black hair, olive skin, neon-green long-sleeve goalkeeper jersey, black shorts, black socks with a green band, black boots, white goalkeeper gloves. Same face, build and kit in every frame. No ball, no goal, no pitch, no text, no logos, transparent background.*

## Simulation mapping

State(s) `HIGH_DIVE_L/R (+ FULL_STRETCH high)` in `gkAnimUpdate`; the CONTACT keyframe is aligned to the simulation contact/arrival (`contact` position in the manifest); frames before it are phase-mapped over `execTime`, frames after it play in LAND/RISE. The runtime never uses this clip to decide anything physical.

## Acceptance checks

- no ball anywhere; gloves visible in every frame; frame 0 = SET pose; body stays on the pivot (bbox centre drift < ~20 px unless the action requires it)
- for dives: takeoff foot visible on the push-off frame; landing on forearm/side, never a standing snap
- for loops: first and last frames tile without a pop
