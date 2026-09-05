# FOOT_SAVE_L/R — foot_save

- kind: action (contact = boot extended)
- status: authored east (group 965090b7; frames 5–6 high kick dropped)
- directions: east authored; south needed; goal-line version needed (see lateral_dive_goal_line)
- files: `anim/foot_save_right/<dir>/<i>.png`

## Keyframes (minimum key poses, in order)

1. ready stance
2. weight to the left foot
3. right leg extended low, boot turned (CONTACT)
4. leg back

## PixelLab call

```
animate_character(character_id="0808086b-027d-4114-a53a-efd11a8178f9", mode="v3", frame_count=8,
  animation_name="gk_foot_save", directions=["east", "south"],
  action_description="goalkeeper reflex foot save with no ball: staying upright in the ready stance he quickly extends his right leg out to the side, boot turned to block a low ball at ankle height, arms out for balance, then pulls the leg back — the leg stays LOW, never above knee height")
```

Identity line (append if the model drifts): *Goalkeeper GK_BASE_V1 (frozen identity): tall lean athletic man, cropped black hair, olive skin, neon-green long-sleeve goalkeeper jersey, black shorts, black socks with a green band, black boots, white goalkeeper gloves. Same face, build and kit in every frame. No ball, no goal, no pitch, no text, no logos, transparent background.*

## Simulation mapping

State(s) `FOOT_SAVE_L/R` in `gkAnimUpdate`; the CONTACT keyframe is aligned to the simulation contact/arrival (`contact` position in the manifest); frames before it are phase-mapped over `execTime`, frames after it play in LAND/RISE. The runtime never uses this clip to decide anything physical.

## Acceptance checks

- no ball anywhere; gloves visible in every frame; frame 0 = SET pose; body stays on the pivot (bbox centre drift < ~20 px unless the action requires it)
- for dives: takeoff foot visible on the push-off frame; landing on forearm/side, never a standing snap
- for loops: first and last frames tile without a pop
