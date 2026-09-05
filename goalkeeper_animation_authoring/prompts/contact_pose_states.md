# Contact poses as PixelLab character STATES (Animation V1.1 route)

Why: a clip generated from a text prompt gives one side view; a character **state** gives the pose in the 8 standard rotations with the identity preserved by construction (same character, `use_color_palette_from_reference: true`). The runtime lays the pose along the save vector by choosing the rotation whose MEASURED screen body axis is closest to the projected save vector (mirror for a LEFT lead).

```
create_character_state(character_id="0808086b-027d-4114-a53a-efd11a8178f9",   # GK_BASE_V1 SET state
  state_name="Contact <FAMILY> R", override_width=160, override_height=160, use_color_palette_from_reference=True,
  edit_description="<pose text below> Same face, hair, kit, boots and gloves.")
```

Generated 2026-09-04 (all four accepted as review candidates, none approved yet):

| family | state id | pose text |
|---|---|---|
| LOW_COLLAPSE | e7573bd9-3208-40e8-a707-6cc331fcb929 | low collapse save pose, no ball: dropped sideways to his right onto his right hip and thigh, right knee folded under him, left leg extended for balance, torso leaning low to the right, both arms extended down and to the right along the ground with the open white gloves together palms out at ground level, head turned down toward his gloves; body stays close to the ground, not flying |
| MEDIUM_DIVE | f4017b8d-a214-4b08-8aa8-f63873ad701e | medium diving save pose in mid-air, no ball: airborne diving to his right with the body horizontal at hip height, chest facing forward, right shoulder leading, both arms extended straight to the right with the open white gloves together palms out, hips following, legs trailing left with the left knee slightly bent, feet off the ground, head looking along the arms |
| HIGH_DIVE | 7a3cf57d-e6ab-4403-9fd4-478f8efa8da6 | high diving save pose in mid-air, no ball: launching diagonally upward to his right, body along a rising diagonal, right arm reaching high up to the right with the open glove leading and fingers spread, left arm bent across the chest, right shoulder above the hips, hips trailing lower, legs extended down-left behind, feet off the ground, head tilted up to the glove |
| FULL_STRETCH | 7ba58feb-f648-4d07-bd52-5cfe27c4e73e | full-stretch desperate diving save pose in mid-air, no ball: laid out at absolute maximum extension diving to his right, whole body one straight line from toes to right fingertips along a slightly rising diagonal, right arm fully outstretched with the open glove at the tip and fingers spread, left arm stretched back along the body, legs straight and together trailing far left, feet pointed, head turned to the glove, straining expression |

Delivery: `curl` the 8 rotations to `review_artifacts/gk_anim_v1_1/poses/<family>/<direction>.png`, run `python3 sandbox/visual/tools/gk_anim/gk_measure_pose.py <dir> <family>_anchors.json --sheet …`, register in `GK_POSES_CANDIDATES.json`, review on `gk_anim_review.html`. Once a pose is APPROVED move it under `assets/visual_v1/goalkeeper/poses/` and list it in `GK_ANIM_V1.json` `poses` with `approved: true`.

Known limit (measured, see `review_artifacts/gk_anim_v1_1/CANDIDATE_POSES.md`): PixelLab's east/west rotations of a lying/airborne pose put the body along the facing axis (a side view) instead of turning the pose in 3-D, so a body laid along the screen-vertical (what a west-facing keeper's dive needs) is not among the 8 rotations for the horizontal families (LOW_COLLAPSE, MEDIUM_DIVE). Those views need hand-authored keyframes; the canonical poses for them are in `review_artifacts/gk_anim_v1_1/pose_specs/`.
