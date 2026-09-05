# Goalkeeper animation authoring pack (PixelLab) — GK Animation V1

Repeatable spec for producing animation clips of the **frozen** goalkeeper GK_BASE_V1 without ever redesigning him.

## Identity rules (never violated)

- Generate every clip **on the existing character states**: SET `0808086b-027d-4114-a53a-efd11a8178f9` (preferred — frame 0 of a v3 clip is the SET pose) or idle `f4838361-d1db-460a-aa81-87b5b626ce5f`. Never `create_character` for the goalkeeper again.
- Identity line to keep in every prompt: *Goalkeeper GK_BASE_V1 (frozen identity): tall lean athletic man, cropped black hair, olive skin, neon-green long-sleeve goalkeeper jersey, black shorts, black socks with a green band, black boots, white goalkeeper gloves. Same face, build and kit in every frame. No ball, no goal, no pitch, no text, no logos, transparent background.*
- Reject any frame with a ball, a different kit, a back-of-head frame in a south clip, or a missing glove.

## Parameters

```
{
 "character_id": "0808086b-027d-4114-a53a-efd11a8178f9 (SET state of f4838361-d1db-460a-aa81-87b5b626ce5f)",
 "mode": "v3",
 "frame_count": 8,
 "size": "128 (canvas 148 for animations; 140 for south)",
 "view": "low top-down (inherited)",
 "cost": "2 generations per direction"
}
```

## Direction policy

- Author **east** and **south**. The runtime derives west = mirror(east), and mirrors a south clip for the other side (a horizontal flip turns his RIGHT into his LEFT in every view).
- Diagonals (NE/SE/NW/SW) use the 45° neighbour and are flagged DIR-APPROX; author them only if the flag bothers review.
- North is rare (ball beyond the by-line); author last.
- Lateral actions are authored to the keeper's **RIGHT**; the runtime resolves LEFT by mirror (south) or reversed/side-approx (east) until dedicated art exists.
- **East/west lateral dives are the open problem**: see `prompts/lateral_dive_goal_line.md`.

## Delivery checklist (per clip direction)

1. `curl` the 9 frames into `assets/visual_v1/originals/character_f4838361/anim/<clip>/<direction>/<i>.png`.
2. View them (`clips/*.png` sheets); reject per the rules above (keep rejected sets outside the repo).
3. Add/adjust the row in `sandbox/visual/tools/gk_anim/gk_build_manifest.py` (`use` = frames in play order, `contact` = position of the contact pose, `hold`, `ik` mode, `note`).
4. Run `python3 sandbox/visual/tools/gk_anim/gk_build_manifest.py` (measures per-frame anchors, rewrites `GK_ANIM_V1.json`).
5. Reload the match page → `S.gkAnim.clips` lists the clip; run the strips/pose-sheet tooling for review.

## Animation V1.1 (2026-09-04): save art rebuilt from physical action

The V1 side-view dive clips (low_collapse, medium_dive, high_dive) are RETIRED from live selection (`live: false` in the manifest; files kept for comparison). Replacement art starts from CONTACT poses generated as character states (`prompts/contact_pose_states.md`), reviewed on `sandbox/visual/gk_anim_review.html`, and only then animated. Canonical key poses per family (SET, LOAD, PUSH, EXTEND, CONTACT, DESCEND, LAND) reconstructed from the physical traces: `review_artifacts/gk_anim_v1_1/pose_specs/`.

## Files

| file | action | status |
|---|---|---|
| `prompts/set.md` | SET | authored — PixelLab create_character_state on f4838361 (id 0808086b…) |
| `prompts/idle.md` | IDLE | needed (temporary: 1-px breathing bob on the idle rotation) |
| `prompts/shuffle.md` | SHUFFLE_L/R | authored east + south (group ba999c22) |
| `prompts/crossover.md` | CROSSOVER_L/R | needed (shuffle frames stand in above 2.2 m/s) |
| `prompts/step_forward_backward.md` | STEP_FORWARD / STEP_BACKWARD | needed (shuffle frames stand in) |
| `prompts/low_gather.md` | LOW_GATHER | authored east + south, ball-free (group 3f2dbaef) |
| `prompts/chest_catch.md` | CHEST_CATCH / SUPPORTED_CATCH | authored east + south, ball-free (group c2e03d1b) |
| `prompts/near_body_save.md` | NEAR_BODY_SAVE_L/R | needed (temporary: SET pose + procedural glove at the simulation hand) |
| `prompts/foot_save.md` | FOOT_SAVE_L/R | authored east (group 965090b7; frames 5–6 high kick dropped) |
| `prompts/low_collapse.md` | LOW_COLLAPSE_L/R (+ FULL_STRETCH low) | authored east, side view (group 872ea258) |
| `prompts/medium_dive.md` | MEDIUM_DIVE_L/R (+ FULL_STRETCH mid) | authored east, side view (group ccc434ed) |
| `prompts/high_dive.md` | HIGH_DIVE_L/R (+ FULL_STRETCH high) | authored east, side view (group 2a8b8cbd) |
| `prompts/lateral_dive_goal_line.md` | LOW_COLLAPSE / MEDIUM_DIVE / HIGH_DIVE / FOOT_SAVE for east/west facings | NEEDED — highest priority; PixelLab text prompts failed twice (groups b9ba4520, 3a06e040 came back as side-view forward dives) |
| `prompts/land.md` | LAND | needed (LAND uses the dive clip's last frames) |
| `prompts/recover.md` | RECOVER | authored east + south via the PixelLab 'getting-up' template (group aac6752a); south frame 4 dropped (back of the head) |

`RESULTS_LOG.md` records every generation made (ids, verdicts); `prompts/contact_pose_states.md` the V1.1 pose-state route.
