# LOW_COLLAPSE_L/R (+ FULL_STRETCH low) — low_collapse

- kind: action (contact = lead glove at ground level beside the body)
- status: authored east, side view (group 872ea258)
- directions: east authored (side view — forward axis); south needed; goal-line version needed
- files: `anim/low_collapse_right/<dir>/<i>.png`

## Keyframes (minimum key poses, in order)

1. ready stance
2. near knee drops
3. collapse onto the hip, arms extending
4. gloves at ground level (CONTACT)
5. lying on the side

## PixelLab call

```
animate_character(character_id="0808086b-027d-4114-a53a-efd11a8178f9", mode="v3", frame_count=8,
  animation_name="gk_low_collapse", directions=["east", "south"],
  action_description="goalkeeper low collapse save to his right with no ball: from the ready stance he drops his near knee and collapses sideways onto his hip, both arms extended low to his right with the open gloves leading along the ground, then lies on his side")
```

Identity line (append if the model drifts): *Goalkeeper GK_BASE_V1 (frozen identity): tall lean athletic man, cropped black hair, olive skin, neon-green long-sleeve goalkeeper jersey, black shorts, black socks with a green band, black boots, white goalkeeper gloves. Same face, build and kit in every frame. No ball, no goal, no pitch, no text, no logos, transparent background.*

## Simulation mapping

State(s) `LOW_COLLAPSE_L/R (+ FULL_STRETCH low)` in `gkAnimUpdate`; the CONTACT keyframe is aligned to the simulation contact/arrival (`contact` position in the manifest); frames before it are phase-mapped over `execTime`, frames after it play in LAND/RISE. The runtime never uses this clip to decide anything physical.

## Acceptance checks

- no ball anywhere; gloves visible in every frame; frame 0 = SET pose; body stays on the pivot (bbox centre drift < ~20 px unless the action requires it)
- for dives: takeoff foot visible on the push-off frame; landing on forearm/side, never a standing snap
- for loops: first and last frames tile without a pop
