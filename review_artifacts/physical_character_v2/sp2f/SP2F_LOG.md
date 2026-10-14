# SP2F log: continuous controlled recline + persistent sliding arm post

The instruction is `sources/2026-10-14_user_instruction_sp2f_continuous_recline_sliding_post.md` (≈ 21:03 BST, 14 Oct 2026).

**Fixed throughout:**
- **Friction:** F37.5, unchanged.
- **Unchanged:** the tackle entry, folded leg, boot, C3 and the recipient. No calibration was done and no get-up was built.
- **Runs:** three run-ins, 6 s each.

Times are given after the first fold-side contact.

## 1. SP2E's fall-over (`scripts/sp2f_diag.mjs`: every 8 ms; trunk angle / rate / acceleration, pelvis roll / rates, arm, hand, targets, authority)

At 5.0 m/s:

| when | event | cause |
|---|---|---|
| +0.00…+0.11 s | trunk jolt to 301°/s | authored arm swing from SP2C's back-held pose to the post pose, plus fast-start trunk targets (up to 730°/s of target change), on top of the landing |
| +0.12 s | hand hits the turf at 2 BW | |
| +0.20…+0.57 s | **hand off the turf**, lifted to 15 cm | the authored arm-opening target |
| +0.30…+0.60 s | pelvis rolls over its edge (29° → 82°, roll rate up to 121°/s) | gravity past the unstable threshold; the targets change ≤ 38°/s |
| +0.62 s | **torso slams into the turf** (tipping 402°/s, −6600°/s²) | the end of the unsupported fall |

SP2D has the same structure later: a peak trunk rate of 133°/s at +1.24 s, and the hand off the turf at +1.40…+1.65 s.

## 2. The sliding post (opt-in `slide_phys2/scripts/sp2_ctrl.mjs` `opts.post`)

**Behaviour:**
- From the forearm's first sensed turf contact, the posting shoulder and elbow targets and reference rates fade out over `blendS`, while their damping is kept.
- The arm presses the hand down with `pressN`, applied as Jacobian-transpose joint torques. Optionally the press builds over `pressRampS`.
- There is no world-space target and no anchoring term. It scales with the regional authority.

**Regression:** SP2 `792ce24e…` and SP2A `3062e3e2…` unchanged; SP2E `5ef761b9…` unchanged.

**Presentation additions:** `sp_clip --wireBodies` and `sp_wire` exports, for the torso + pelvis + arm-only view.

## 3. Candidates (`scripts/sp2f_cand.mjs`, `scripts/sp2f_eval.mjs`; 5.0 m/s unless noted)

- **F0** (minimum-jerk recline 0.18 → 1.6 s, post 120 N):
  - no late spike (peak trunk rate 112°/s);
  - after +0.31 s the hand slides 3.8 m continuously;
  - the shoulder opens 30° → 123° by itself.
  - **Problems:** the hand bounces twice after the first touch; the trunk is upright for 0.24 s; fold hip 9.5° past its stop.
- **F1–F4:**
  - the immediate press removes some of the bounce;
  - a 200 N press holds the torso up (rejected);
  - a fast recline end gives a late impact spike.
- **G / H:**
  - a reach spanning contact (0.30 → 0.85 s) gives the first touch at +0.15–0.18 s with **no gaps** and a 1.1–1.5 BW peak.
  - **Problem:** a 9–10° fold-hip excursion at landing remains in every variant.
- **I / J (hip-excursion diagnosis):**
  - The in-air recline cancels SP2C's counter-lean. That counter-lean rolls the pelvis onto the folded side for landing by angular-momentum exchange (22–31° roll against 12–15° without it). Without it the folded thigh lands under the body, and its external rotation is forced to 52°.
  - A strong pelvis-roll objective (gain 400) at full strength on landing does the same. At gain 86 (J5) the hip is clean, but the body barely rolls.
- **K (the fix):** the pelvis objective's strength builds over 0.35 s after landing (its gate onset; 0.03 s before).
  - **K4** (recline 0.25 → 1.3 s): hand at +0.26 s, continuous, peak 0.66 BW, shoulder 32° → 122°; no hip excursion; established at +0.76 s.
  - **Problem:** an early quicker segment (≤ 145°/s at +0.46 s).
- **L / M:**
  - **L4** (recline 0.20 → 1.5 s, press 150 N): post-landing peak 112°/s, acceleration RMS 468.
  - Starting the sagittal recline earlier does not change the trunk at +0.1…0.25 s.
- **Speeds:**
  - L4 and M4 at 4.5 m/s **roll chest-down late** (+1.1…1.6 s).
  - **N3** (roll target 75°, thoracic rotation 36°) is clean at 4.5 m/s (peak 98°/s) and at 5.0 / 5.5 m/s.
- **P / X / Y / Z / S** (residual-unevenness hunt):
  - The early quicker segment (+0.30…0.45 s, about 110–125°/s) and the slow-down near 41° (+0.55…0.70 s) persist with every pelvis onset, press blend, press ramp and trunk-authority hold. They also persist with no press at all.
  - `sp2f/track.mjs`: the spine tracks its targets to within a few degrees, so this is not catch-up. It is the pelvis rolling over the folded thigh (hip abduction −15° → +16°).
  - A higher press props the trunk (the pause); no press over-reclines it past horizontal and loads the folded hip.
  - A later or gentler recline start brings back an SP2D-style late fall (Q).
  - The arm's quick descent at landing is inertia (a reach started at contact makes it faster).
  - **N3 kept.**

## 4. SP2F = N3 (`evidence/SP2F_opts.json`), final evaluation (`scripts/sp2f_final.mjs` → `evidence/SP2F_eval.json`)

**Settings:**
- recline: sine curve 0.20 → 1.5 s (lumbar −10°, thoracic −4°, lumbar lat −5°, thoracic lat −3°, lumbar rot 2.5°, thoracic rot 36°, neck 34°);
- pelvis objective: roll 75°, pitch −30°, gain 400, onset 0.35 s;
- arm: reach 0.30 → 0.85 s (abduction 30°, flexion −30°, elbow 15°), then the post (blend 0.15 s, press 150 N, authority 0.7);
- tackling-side arm: up / over the body.

**Results** (4.5 / 5.0 / 5.5 m/s):

| | SP2F | comparison |
|---|---|---|
| post-landing peak trunk rate | 98 / 107 / 143°/s | SP2E 263 / 239 / 324; SP2D 148 / 133 / 164 |
| peak tipping | 139 / 112 / 162°/s | SP2E 373 / 402 / 395 |
| acceleration RMS | 547 / 442 / 573 | SP2E 835 / 1027 / 1068 |
| hand first contact | +0.10 / +0.22 / +0.28 s | |
| hand contact afterwards | **continuous** | |
| hand sliding distance | 3.25 / 3.75 / 4.70 m | |
| hand peak normal | 1.25 / 0.64 / 0.78 BW | |
| hand braking share | 12–18 % | SP2E 9–10 % |
| established | +0.88 / +1.04 / +1.24 s | |
| slide | 4.10 / 5.38 / 6.75 m | SP2D 4.53 / 5.65 / 6.84 |

- **Never** chest-down; no failure or fallback.
- **Determinism:** `7838fc5374221646` ×2.

**Renders:**
- `render/sp2f_render.sh` → `review/video/`: SP2D | SP2E | SP2F; clean 1×; side / rear 3/4 / front 3/4 at 0.25×; a diagnostic view; torso + pelvis + arm-only views at 1× / 0.25× (side, rear 3/4); speeds.
- `render/sp2f_compose_reference.sh` → `review/local_reference/` (REFERENCE | SP2D | SP2E | SP2F; gitignored).

**Page:** `render/sp2f_review_build.mjs` → `review/SP2F_REVIEW.html`. **Report:** `SP2F_REPORT.md`.

**Visual review:** I cannot play video in real time. I reviewed 30 fps consecutive frame strips of the 1× focus view, plus the traces.
