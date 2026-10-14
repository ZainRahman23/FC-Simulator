# SP2E log: early side/back descent + early physical arm post

The instruction is `sources/2026-10-14_user_instruction_sp2e_early_descent_early_post.md` (≈ 18:21 BST, 14 Oct 2026). SP2D's direction is approved.

**Fixed throughout:**
- **Friction:** F37.5, unchanged and not recalibrated.
- **Unchanged:** SP2D (kept as evidence), C3, the recipient and the simulation. No get-up was built.
- **Runs:** three run-ins, 6 s each.

Times are given after the first fold-side contact.

## 1. Why SP2D is slow (`scripts/sp2e_diag.mjs`, 12.5 ms series; SP2D at 5.0 m/s)

| | +0.10 s | +0.20 s | +0.25 s | +0.30 s | +0.50 s | +1.00 s |
|---|---|---|---|---|---|---|
| trunk from vertical | 25° | 27° | 26° | 23° | 34° | 57° |
| trunk side component (+ = toward the folded side) | −23° | −25° | −23° | −18° | −7° | +31° |
| pelvis roll | 26° | 24° | 24° | 23° | 23° | 39° |
| posting hand above the turf | 0.42 m | 0.10 m | 0.11 m | 0.13 m | 0.04 m | 0 |

1. **The counter-lean is still on.** SP2C's counter-lean toward the **tackling** side is still commanded through the landing. The descent toward the folded side has to undo it first.
2. **The schedules are slow.** The trunk targets and the pelvis-roll objective follow a smoothstep from contact to +0.95 s.
3. **The arm waits.** The posting hand is only 10 cm above the turf at +0.2 s, but it waits for the slow descent.

## 2. Candidates (`scripts/sp2e_cand.mjs`, `scripts/sp2e_eval.mjs`; 5.0 m/s unless noted)

`sp2e_cand.mjs` is SP2D's targets with exposed timing:
- `commit`: before contact, release the counter-lean and open the chest;
- `descent`: trunk targets, with a fast-start profile;
- `pelvis`: the seat objective's roll / pitch timing and gain;
- `arm`: reach / open timing;
- `auth`: regional authority during the descent;
- `settle`: once lying, the spine relaxes.

| candidate | change | established | trunk +0.2 / +0.3 s | pelvis roll +0.3 s | note |
|---|---|---|---|---|---|
| E0 | SP2D schedules compressed (descent 0.40→0.80, pelvis 0.40→0.75, arm from 0.30), commit | +0.53 s | 26 / 40° | 23° | hand touches at contact (arm moving before contact) |
| E1–E3 | arm from contact, descent / pelvis to 0.62 / 0.58 s, pelvis gain 250–400 | +0.49…0.50 s | 27–29 / 39–40° | 20–22° | shoulder peak 140–145° with SP2D's arm targets (SP2D 152°) |
| E4–E6 | + earlier commit (0.18→0.38 s, lumbar lat −5°, chest rot 25°); E5 trunk authority 0.95; E6 smaller open | +0.55 s | 30 / 39–40° | 22° | shoulder 114–136°; knee / ankle / elbow landing excursions appear |
| E7–E10 | stronger / earlier commit, descent from 0.32 s | +0.53…0.60 s | 33 / 40–42° | 19–26° | **pelvis roll at +0.1…0.3 s does not change** |
| E11–E14 | pelvis gain 800 + roll 85°; folded-leg authority 0.55 / 0.35 during the descent | +0.50…0.54 s | 37 / 42–44° | 20–23° | **pelvis gain ×3–9 and folded-leg authority do not move the early roll**: it is landing-limited |
| E15–E16 | coordinated strong early spine bend (extension −20…−25 + folded-side lat) | +0.40…0.45 s | 68–74 / 83–96° | 21–26° | as fast as the reference, but **falls over onto the back** (trunk 120–126° at +0.5 s, torso 14–16 %), folded hip 4–5° sustained |
| E19–E22 | side-dominant spine bend (lat −25…−28, extension small, chest rot 15–25) | +0.56 s / none | 53–54 / 61–69° | 19–21° | **rolls chest-down at +0.58…0.66 s** (A's failure) |
| search E-S1 | CMA, 13 interpretable parameters (descent end + targets, pelvis gain / roll, arm reach / open, folded-leg authority), 15 generations; cost `costSP2E` (`scripts/sp2e_search.mjs`) | +0.41 / +0.41 / +0.46 s | 56 / 65° (5.0) | 32° | best `g14_5`; thoracic spine 2.8° past its stop for about 4.7 s when lying (extension kept) |
| F1–F4 | less extension in the descent; softer elbow; less chest opening | +0.44…0.55 s | 30–40 / 33–46° | 23–28° | sustained thoracic excursion gone, but slower |
| F5–F7 | E-S1 best + `settle` (spine relaxes 0.9→1.3 s) ± softer elbow / chest rot 33° | +0.40…0.48 s | 46–75 / 62–82° | 23–32° | **F6 chosen**: no sustained excursion; established +0.44 / +0.43 / +0.48 s |

**Answer to "accelerate SP2D":**
- **Compression alone stops at +0.5 s.** It moves "established" from about +1.1 s to about +0.5 s, and no further.
- **The early pelvis roll is set by the landing.** The pelvis is already on the turf at +0.1 s. A 3–9× pelvis-objective gain and folded-leg authority from 0.35 to 0.92 leave the roll at 20–26° through +0.3 s.
- **Faster needs the trunk to move the COM.** The trunk has to move the COM outboard early (back and toward the folded side, chest open), so that gravity rolls the pelvis.
- **Too much extension** sends the body over onto its back.
- **Too much side lean with too little chest opening** rolls it chest-down.
- **The balance** (E-S1 → F6) uses moderate extension (lumbar −10°, thoracic −8°), little residual lateral bend, a 33° chest opening, the pelvis objective at gain 620 rolling to 83°, and the posting arm reaching from contact. It is followed by a spine settle once lying.

## 3. SP2E (`evidence/SP2E_opts.json`) and the final evaluation (`scripts/sp2e_final.mjs` → `evidence/SP2E_eval.json`)

**SP2E settings:**
- **commit** 0.18 → 0.38 s: lumbar lat −15°, thoracic lat −10°, thoracic rot 30°.
- **descent** 0.40 → 0.58 s, fast-start: lumbar −10°, thoracic −8°, lumbar lat −5°, thoracic lat −3°, thoracic rot 33°.
- **pelvis** objective 0.38 → 0.55 s: roll 83°, gain 620.
- **posting arm:** reaches from 0.45 s to 0.57 s (abduction 29°, elbow 25°), opens to abduction 114° by 0.89 s; arm authority 0.82.
- **folded-leg authority** 0.59 during +0.06…+0.6 s.
- **settle:** spine to lumbar −2°, thoracic +2° over 0.9 → 1.3 s.

**Results** (4.5 / 5.0 / 5.5 m/s):

| | SP2E | SP2D |
|---|---|---|
| hand first touch | +0.09 / +0.12 / +0.15 s | |
| meaningful hand load | +0.06 / +0.09 / +0.13 s | |
| established | +0.44 / +0.43 / +0.48 s | +1.09 / +1.11 / +0.93 s |
| shoulder peak | 134 / 144 / 138° | 148–154° |
| hand share of normal / braking | 9.9 / 8.8 / 9.8 % · 10.2 / 9.1 / 10.1 % | |
| torso load share | 11–12 % | 1–2 % |
| slide | 4.26 / 5.58 / 7.02 m | 4.53 / 5.65 / 6.84 m |

- **Chest and posture:** never chest-down; never upright.
- **Control:** no failure or fallback; authority ≥ 0.54.
- **No root propulsion:** closure ≤ 0.003 N·s.
- **Determinism:** `5ef761b9b36ad111` ×2.

**Renders:**
- `render/sp2e_render.sh` → `review/video/` (A | SP2C | SP2D | SP2E rows; SP2D | SP2E pairs; speeds).
- `render/sp2e_compose_reference.sh` → `review/local_reference/` (REFERENCE | A | SP2C | SP2D | SP2E; crop follows the slider; gitignored).

**Page:** `render/sp2e_review_build.mjs` → `review/SP2E_REVIEW.html`. **Report:** `SP2E_REPORT.md`.

**Records and search logs:** `_preserved_2026-10-14_evidence_outside_git/sp2e/`.
