# LOW_COLLAPSE / MEDIUM_DIVE / HIGH_DIVE / FOOT_SAVE for east/west facings — lateral_dive_goal_line

- kind: action
- status: NEEDED — highest priority; PixelLab text prompts failed twice (groups b9ba4520, 3a06e040 came back as side-view forward dives)
- directions: east (toward viewer = his RIGHT; away from viewer = his LEFT); west by mirror
- files: `anim/<family>_toward_viewer/east/<i>.png, anim/<family>_away_from_viewer/east/<i>.png`

## Keyframes (minimum key poses, in order)

1. ready stance (east)
2. load
3. airborne, body foreshortened along screen y
4. gloves leading toward the bottom edge (CONTACT)
5. landed, body along screen y

## PixelLab call

```
animate_character(character_id="0808086b-027d-4114-a53a-efd11a8178f9", mode="v3", frame_count=8,
  animation_name="gk_lateral_dive_goal_line", directions=["east", "south"],
  action_description="goalkeeper facing east (side view of the face) diving along his goal line TOWARD THE VIEWER: seen from a low top-down camera his body lays out down the screen, strongly foreshortened, head nearest the camera, arms reaching down-screen with the open gloves leading, feet farthest from the camera; no ball")
```

Identity line (append if the model drifts): *Goalkeeper GK_BASE_V1 (frozen identity): tall lean athletic man, cropped black hair, olive skin, neon-green long-sleeve goalkeeper jersey, black shorts, black socks with a green band, black boots, white goalkeeper gloves. Same face, build and kit in every frame. No ball, no goal, no pitch, no text, no logos, transparent background.*

## Simulation mapping

State(s) `LOW_COLLAPSE / MEDIUM_DIVE / HIGH_DIVE / FOOT_SAVE for east/west facings` in `gkAnimUpdate`; the CONTACT keyframe is aligned to the simulation contact/arrival (`contact` position in the manifest); frames before it are phase-mapped over `execTime`, frames after it play in LAND/RISE. The runtime never uses this clip to decide anything physical.

## Acceptance checks

- no ball anywhere; gloves visible in every frame; frame 0 = SET pose; body stays on the pivot (bbox centre drift < ~20 px unless the action requires it)
- for dives: takeoff foot visible on the push-off frame; landing on forearm/side, never a standing snap
- for loops: first and last frames tile without a pop
