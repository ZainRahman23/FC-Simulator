# SP2D log: controlled torso descent + physical arm post

The instruction is `sources/2026-10-14_user_instruction_sp2d_lowered_torso_arm_post.md` (≈ 17:18 BST, 14 Oct 2026).

**Fixed throughout:**
- **Friction:** F37.5 (temporary, not recalibrated).
- **Unchanged:** the recipient, C3, the simulation, RUN-1, SP2A, FSWEEP and SP2C.
- **Runs:** three run-ins, 6 s each.

## 1. Which way the torso lowers, and which arm posts

The instruction says "toward the tackling-side/back-side" and "the balance-side arm". The evidence it points to:

- **Reference** (`slide_phys2/REFERENCE2_ANALYSIS.md` §1/§4, re-checked on the annotated key frames and new 3× / 4× gridded crops in this mission):
  - The near-side leg is the folded leg. The near-side hand posts beside or behind the hip at +0.24…+0.27 s.
  - The slider lies down **on that same near / folded side** at +0.30 s, with the posting arm extended past the head along the turf.
  - The other arm stays up over the body.
  - This relation (fold leg, posting hand and lying side all on the same side) does not depend on REFERENCE2's left/right shirt-reading caveat.
- **"A" (SP2A):** its torso descends toward the folded side, which is the side it then rolls over onto its chest.
- **SP2C's floating arm:** the folded-side (left) arm is extended about 80° backward at shoulder height (`shoulder_L.flex −80°`). It is the arm visibly floating behind the player.

**Reading adopted:**
- The torso lowers backward onto the **folded-side flank / back**.
- The chest is turned open toward the **tackling side** (thoracic / lumbar rotation +), so the back, not the chest, meets the turf. This is how "tackling-side/back-side" is read.
- The **folded-side (left) arm** posts and opens along the turf.
- The tackling-side arm goes up and over the body.

This reading is stated in the report. If the owner meant the mirror image, the same machinery runs it with the signs reversed.

## 2. Reference measurements (`evidence/reference_sp2d_measures.json`)

All values are in the image plane, ±10–15°.

| real t after first contact | trunk from vertical | posting-arm opening (upper arm vs trunk) | event |
|---|---|---|---|
| −0.03 s | 8° | – | |
| 0.00…0.07 s | 13–18° | – | knee glide |
| 0.10…0.23 s | about 30° | – | the thigh rolls; the hip lands at 0.20–0.24 s |
| +0.27 s | 37° | 32° | **hand on the turf** (+0.24…+0.27 s) beside / behind the hip |
| +0.30 s | 69° | 78° | **lying on the folded side** |
| +0.37 s | 75° | 97° | the body slides past the hand |
| +0.43 s | 82° | 129° | |
| +0.50 s | 83° | 133° | |
| +0.57 s | 84° | 132° | |
| +1.13 s | | | get-up onset |

The reference opens the posting shoulder to **≈ 130–135°** in the image plane, consistent with the owner's "≈ 140°".

## 3. Candidates

- **D0** (`scripts/sp2d_cand.mjs`): SP2C without its recovery + a smoothstep descent (0.5 → 1.6 s) + the left arm reaching then opening.
  - **Trunk** at +0.25 / +0.5 / +1.0 / +1.5 / +2.0 s: 25 / 28 / 67 / 76 / 90°.
  - **Contacts:** hand at +0.70 s, torso at +1.7 s. Never chest-down, no failures. Ends side / back, chest up.
  - **Problems:**
    - The hand carries only **0.6 %** of the turf normal impulse: it touches, it does not post.
    - The upper body between +0.6 and +1.4 s is held up by the trunk muscles alone (a V-sit), then tips onto the turf at about 2.0 s.
    - The trunk leaned back and slightly toward the **tackling** side (side component −18°), which put the left arm on the high side.
- **D1 / D2** (earlier, straighter post; arm authority 0.8–0.9): still about 1 % load. Same diagnosis.
- **D3 / D4 / D5:** the descent leans toward the **folded** side (lumbar / thoracic lat −10…−25) with the chest opened (thoracic rot +30…+35).
  - **Post:** the hand now carries **8–9 %** of the turf normal impulse (braking share about the same), from about +0.6 s.
  - **Ending:** torso on the turf at +1.1…+1.2 s; never chest-down; ends on the back / folded side.
  - **Problems:**
    - The trunk falls fast between +0.5 and +1.0 s (about 30° → 95°).
    - The head touches the turf (0.2 % share).
    - The lumbar spine sits 2–3° past its stop.
    - At 4.5 m/s, D5 does not post.
- **Search D-S1** (25 parameters, from D0): it learned to lean toward the folded side, but its arm stayed at about 1 % load. Stopped at generation 6.
- **Search D-S2** (from D5): adds a heavier trunk-band weight, a not-head-down bound (≤ 100° at the stop / 6 s), a no-slam term (≤ 45° in 0.25 s), and a stricter head term (> 0.5 %).

**Tooling fix:** the SP2C and SP2D search workers now run their message handler only in their own workers (`workerData.tool`). Before the fix, importing `sp2c_search.mjs` for its cost function inside an SP2D worker also installed SP2C's handler. SP2C results are unaffected.

## 4. Searches D-S2 / D-S3 and the final candidate

**D-S2** (from D5; 25 parameters; 8 generations):
- Cost: 19.6 → 6.43.
- **Achieved:** the trunk descends continuously, the hand posts at +0.5…+0.6 s, the torso lands at +1.1…+1.45 s, never chest-down, and it ends on the folded side / back.
- **Fell short:** the hand load was only 2 % at 4.5 / 5.0 m/s, and the shoulder peaked at about 160°.

**D-S3** (from the D-S2 best; 15 parameters: arm, lateral / rotation, seat roll, descent end, lumbar extension; 15 generations):
- **Cost changes:**
  - the post-load weight was raised (80 × the shortfall below a 6 % share);
  - the posting shoulder must peak in 120–150°.
- **Cost:** 6.43 → **5.71** (generation 13): `evidence/SP2D_opts.json`.

**Final evaluation** (`scripts/sp2d_final.mjs` → `evidence/SP2D_eval.json`; A, SP2C and SP2D at three speeds; records in `_preserved_…/sp2d/records/`):
- **SP2D:**
  - posts at +0.49…+0.53 s with 6.3–8.6 % of the turf normal impulse;
  - shoulder peaks at 148–154°;
  - torso on the turf at +1.38…+1.44 s;
  - never chest-down; upright for 0–0.1 s;
  - no failures or fallback;
  - ends on the folded side / back;
  - slide 4.53 / 5.65 / 6.84 m;
  - no sustained joint-limit excursion;
  - deterministic: `f37fd281cd600dc8` ×2.
- **A:** chest-down at +0.72…+1.0 s.
- **SP2C:** upright for 1.6–2.1 s.

**Renders:**
- `render/sp2d_render.sh` → `review/video/` (A | SP2C | SP2D rows).
- `render/sp2d_compose_reference.sh` + `render/sp2d_ref_track.py` → `review/local_reference/` (gitignored). The reference crop follows the slider using REFERENCE2's auto tracks.

**Page:** `render/sp2d_review_build.mjs` → `review/SP2D_REVIEW.html`. **Report:** `SP2D_REPORT.md`.
