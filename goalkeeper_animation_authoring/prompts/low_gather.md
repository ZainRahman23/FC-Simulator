# LOW_GATHER — low_gather

- kind: action (contact = gloves at the ground)
- status: authored east + south, ball-free (group 3f2dbaef)
- directions: east, south (west mirror); north needed
- files: `anim/low_gather/<dir>/<i>.png`

## Keyframes (minimum key poses, in order)

1. ready stance
2. knees bend, gloves drop
3. deep crouch, gloves at the ground (CONTACT)
4. scoop
5. clutch to chest, rising

## PixelLab call

```
animate_character(character_id="0808086b-027d-4114-a53a-efd11a8178f9", mode="v3", frame_count=8,
  animation_name="gk_low_gather", directions=["east", "south"],
  action_description="goalkeeper low gather mime with EMPTY gloves and absolutely no ball in the picture: from the ready stance he drops into a deep crouch, one knee going down behind the other as a barrier, both open gloves reaching down to the ground in front of his feet with the fingers pointing down, then he scoops his empty gloves up and clutches his forearms to his chest while rising")
```

Identity line (append if the model drifts): *Goalkeeper GK_BASE_V1 (frozen identity): tall lean athletic man, cropped black hair, olive skin, neon-green long-sleeve goalkeeper jersey, black shorts, black socks with a green band, black boots, white goalkeeper gloves. Same face, build and kit in every frame. No ball, no goal, no pitch, no text, no logos, transparent background.*

## Simulation mapping

State(s) `LOW_GATHER` in `gkAnimUpdate`; the CONTACT keyframe is aligned to the simulation contact/arrival (`contact` position in the manifest); frames before it are phase-mapped over `execTime`, frames after it play in LAND/RISE. The runtime never uses this clip to decide anything physical.

## Acceptance checks

- no ball anywhere; gloves visible in every frame; frame 0 = SET pose; body stays on the pivot (bbox centre drift < ~20 px unless the action requires it)
- for dives: takeoff foot visible on the push-off frame; landing on forearm/side, never a standing snap
- for loops: first and last frames tile without a pop
