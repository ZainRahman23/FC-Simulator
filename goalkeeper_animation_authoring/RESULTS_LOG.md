# Results log — GK Animation V1 authoring pass (2026-09-04)

Character: SET state `0808086b-027d-4114-a53a-efd11a8178f9` of GK_BASE_V1 `f4838361-d1db-460a-aa81-87b5b626ce5f`. All v3 custom, 8 frames + reference.

| clip | group | directions | verdict |
|---|---|---|---|
| gk_chest_catch (v1) | d446b433 | east, south | REJECTED: ball baked into frames 3–8 (kept outside the repo) |
| gk_chest_catch_noball | c2e03d1b | east, south | ACCEPTED → assets anim/chest_catch |
| gk_low_gather (v1) | cbf8b433 | east, south | REJECTED: ball baked in; stray ball at the canvas top (south f1) |
| gk_low_gather_noball | 3f2dbaef | east, south | ACCEPTED → anim/low_gather |
| gk_low_collapse_right | 872ea258 | east | ACCEPTED (side view; SIDE-APPROX for the lateral axis) → anim/low_collapse_right |
| gk_medium_dive_right | ccc434ed | east | ACCEPTED (side view) → anim/medium_dive_right |
| gk_high_dive_right | 2a8b8cbd | east | ACCEPTED (side view) → anim/high_dive_right |
| gk_foot_save_right | 965090b7 | east | ACCEPTED with frames 5–6 dropped (high kick) → anim/foot_save_right |
| gk_shuffle_right | ba999c22 | east, south | ACCEPTED → anim/shuffle_right |
| gk_recover_getting_up (template) | aac6752a | east, south | ACCEPTED; south frame 4 dropped (back of the head) → anim/recover_getting_up |
| gk_dive_toward_viewer | b9ba4520 | east | REJECTED: came back as a side-view forward dive (cannot depict the goal-line axis) |
| gk_dive_away_from_viewer | 3a06e040 | east | REJECTED: lying on the back with arms up, body still along screen x |

Generations used this pass: ≈ 34 (17 direction jobs × 2). Sheets: `review_artifacts/gk_anim_v1/clips/`.

## Animation V1.1 — 2026-09-04 (contact-pose candidates as character states)

| state | id | verdict |
|---|---|---|
| Contact LOW_COLLAPSE R | e7573bd9-3208-40e8-a707-6cc331fcb929 | CANDIDATE — good collapse read; horizontal/descending body in every rotation |
| Contact MEDIUM_DIVE R | f4017b8d-a214-4b08-8aa8-f63873ad701e | CANDIDATE — horizontal flying body; north rotation is a from-behind T-pose |
| Contact HIGH_DIVE R | 7a3cf57d-e6ab-4403-9fd4-478f8efa8da6 | CANDIDATE — rising diagonal, glove high; clearly distinct from MEDIUM |
| Contact FULL_STRETCH R | 7ba58feb-f648-4d07-bd52-5cfe27c4e73e | CANDIDATE — one straight line toes→fingertips; distinct from HIGH_DIVE |

Live verdict on the V1 clips (user, 2026-09-04): dive clips rejected (same pose at every height, forward lunge); shuffle and getting-up kept. Generations used this pass: 4 states (≈ 80–160).
