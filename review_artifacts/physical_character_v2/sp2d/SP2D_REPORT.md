# SP2D report: controlled torso descent onto the folded side / back + physical arm post

This report covers the instruction `sources/2026-10-14_user_instruction_sp2d_lowered_torso_arm_post.md` (14 Oct 2026, about 17:18 BST). The work is local and stopped for the owner's visual review.

- **Review page:** `review/SP2D_REVIEW.html` (served at :8350/sp2d/review/SP2D_REVIEW.html).
- **Log:** `SP2D_LOG.md`.
- **Evidence:** `evidence/` (`SP2D_opts.json`, `SP2D_eval.json`, `reference_sp2d_measures.json`, `SP2D_summary.json`).
- **Records and search logs:** kept outside Git, in `_preserved_2026-10-14_evidence_outside_git/sp2d/`.

**Fixed throughout:**
- **Friction:** **F37.5**, the temporary development value: non-stud body friction ×0.375, studs unchanged. It was not recalibrated.
- **Unchanged:** the recipient, C3, the simulation, RUN-1, SP2A, FSWEEP and SP2C.
- **Runs:** every result comes from three run-ins (4.5 / 5.0 / 5.5 m/s), each simulated for 6 s.

## 1. Reading of the brief

The brief says "controlled torso lowering toward the tackling-side/back-side" and asks for "the balance-side arm" to post. The evidence it points to agrees on one geometry:

- **The reference:** the folded leg, the posting hand and the side the slider lies on are all the **same (near) side**. That relation holds independently of REFERENCE2's left/right shirt-reading caveat.
  - The hand reaches the turf beside or behind the hip at +0.24…+0.27 s.
  - He is lying on that side at +0.30 s.
  - The posting arm ends extended past the head along the turf.
  - The other arm stays up over the body.
- **A (SP2A):** its torso descends toward the folded side, as the brief wants (it then rolls onto its chest).
- **SP2C's "floating" balance arm:** this is the folded-side (left) arm, which SP2C holds extended about 80° backward at shoulder height.

**SP2D therefore:**
- lowers the torso **backward onto the folded-side flank and back**;
- turns the chest open toward the **tackling side**, so the back, not the chest, meets the turf;
- posts with the **folded-side (left) arm**;
- lifts the tackling-side arm up and over the body.

If you meant the mirror image, the same machinery runs it with the signs reversed.

## 2. What SP2D is (`scripts/sp2d_cand.mjs`)

SP2D is **SP2C's candidate with SP2C's state-triggered seated recovery removed.** It keeps the compact pre-contact fold-leg tuck, the boot organisation and the held regional authority. Instead of SP2C's held upright counter-lean, it adds an authored, physically tracked descent.

- **Trunk / head:** from 0.43 s (ground entry) to 1.37 s the targets move continuously (smoothstep):
  - spine extension (lumbar −3°, thoracic −7°);
  - SP2C's +30° counter-lean released to a lean toward the folded side (lumbar −7°, thoracic −3°);
  - the chest turned toward the tackling side (thoracic +22°);
  - neck flexion +34°, carrying the head.
  - The seat objective (pelvis orientation through the fold hip) follows the same schedule, to pitch −34° and roll +71° onto the folded side.
- **Posting arm (left):**
  - Reaches down to the turf beside and behind the hip by 0.77 s (shoulder abduction 21°, extension 21°, elbow 4°).
  - Then opens along the turf to abduction 106° / extension 29° by 1.97 s.
  - Arm authority after contact is 0.82: it is finite, so the shoulder and elbow yield to the contact.
  - The hand and forearm keep the temporary low body friction.
- **Tackling-side arm:** goes up over the body (shoulder flexion 78°, abduction 22°, elbow 44°).
- **No control of the body's path:** there is no anti-roll torque and no root, COM or propulsion objective. Contacts are the only horizontal force: the closure is ≤ 0.003 N·s at 5.0 m/s.

**Search history:**
- Searches D-S1 → D-S2 → D-S3 (CMA-ES, cost `costSP2D` in `scripts/sp2d_search.mjs`): SP2C's preserved terms plus a descending trunk band, the post (timing, load share ≥ 6 %, braking ≤ 10 %, shoulder 120–150°), torso contact in the late slide, never chest-down, a side/back end posture, head protection, and no passive fallback.
- **The key finding on the way** (log §3): the arm only takes load when the trunk leans toward the **folded side**, with the chest turned open. Leaning back or toward the tackling side leaves the posting arm on the high side, and the upper body is then held up by the trunk muscles alone until it tips over (D0–D2: about 1 % hand load).

## 3. The critical test: A | SP2C | SP2D | REFERENCE

Times are from the first fold-side turf contact; values at 5.0 m/s unless a range covers the three speeds. The reference is measured in the image plane (±10–15°). It slides at about 7.5 m/s and lies down within 0.3 s, so compare the order of events, not the clock.

| | A (SP2A) | SP2C | **SP2D** | REFERENCE |
|---|---|---|---|---|
| trunk from vertical at +0.25 / +0.5 / +1.0 / +1.5 s | 18 / 38 / 90 / 87° (falls) | 25 / 21 / 20 / 21° (held upright) | **24 / 35 / 59 / 98°** (continuous), lying 91–95° | 13–18 → 30 → 37 (+0.27) → 69 (+0.30) → 82–84° |
| posting (folded-side) shoulder: at the post → peak | 48° → 78° (no post) | ≤ 94° (floating) | **49° → 152°** (148–154° across speeds), 133–142° at rest | 32° → 130–135° |
| hand / forearm on the turf | brushes (≈ 1 % of the load) | never | **+0.49…+0.53 s; 6.3 / 8.1 / 8.6 % of the turf normal impulse; braking 6.5 / 8.3 / 9.9 %** | +0.24…+0.27 s |
| torso on the turf | +0.71…+0.99 s, **chest-first** (torso 21–28 % of the load) | never | **+1.38…+1.44 s** (late slide; light, < 2 %) | +0.30 s (on the folded side) |
| pelvis roll | → 100° (over onto the chest) | ≈ 35° held | 30–40° early → **≈ 86° at rest** (on the folded side) | onto the folded side |
| passive / ragdoll-like | **yes**: authority decays to 0.35, then it collapses | no (held, static) | **no**: no regional failure, no fallback, authority held ≥ 0.54 | – |
| artificially seated / upright (trunk < 35° after +0.6 s) | 0 s | **1.6–2.1 s** | **0–0.1 s** | – |
| chest-down | **+0.72…+1.00 s** | never | **never** (all speeds) | never |
| state at 6 s | prone (face-down) | seated upright | **on the folded side / back, chest up** (belly-up component 0.68–0.75, folded side down 0.65–0.73), posting arm overhead along the turf, tackling-side arm over the body | lying on the folded side, then gets up from +1.13 s |
| slide | 4.26 / 5.48 / 6.94 m | 4.45 / 5.49 / 6.93 m | **4.53 / 5.65 / 6.84 m** | ≈ 7.5 m |

**Desired progression:**
- **ground entry:** folded leg, thigh and hip establish the slide;
- **early slide:** the torso lowers backward toward the folded side, and the arm reaches down (+0.5 s);
- **mid slide:** the hand/forearm posts with real load (0.2–0.35 BW), the shoulder opens, and the torso keeps lowering;
- **late slide:** the side/back reaches the turf (+1.4 s);
- **end:** an organised side/back resting posture.

This progression is met at all three speeds.

**Kept from SP2C:**
- **Folded leg at first contact (5.0 m/s):** knee in the pelvis at (−0.108, −0.371, 0.248) m; sole-down −0.58; toe 2.6 cm; no stud engagement by either boot.
- **Load and braking over the slide:** thigh 37 %, hip 23 %, shin 12 %, knee 9 %, posting forearm/hand 8.5 %, upper arm 3 %, boot sides 6 %, torso 0.8 %.
- **Joint limits:** no sustained excursion. SP2C's fold-hip end-range loading (1.1–1.6° for about 5 s) disappears, because lying on the side unloads the folded leg. Brief landing excursions remain: knee_L.x 2.4° / 0.15 s, ankle_L.x 1.5° / 0.08 s, thoracic.z 1.6° / 0.03 s, ankle_R.z 1.4° / 0.01 s, lumbar.z 0.9° / 0.11 s.

**Determinism:** SP2D at 5.0 m/s re-run gives `f37fd281cd600dc8` both times.

## 4. Not achieved, stated plainly

1. **Slower than the reference.** The reference posts at +0.25 s and is lying at +0.30 s. SP2D posts at +0.5 s and is lying (trunk above 70°) at +1.05…+1.17 s. That follows your "mid-slide" progression for a 2.4 s slide at 5 m/s, but it is about 3× slower than the 7.5 m/s broadcast.
2. **Shoulder opening peaks at 148–154°**, against the reference's measured 130–135° (your "≈ 140°"). It rests at 133–142°.
3. **The torso contact is light** (< 2 % of the normal impulse). The side/back is low to the turf and touches it, but the lying weight rests mostly on the thigh/hip and the posting upper arm and forearm.
4. **The arm's braking equals its load share** (6.5–9.9 %). It slides at the temporary low body friction. It is not a large brake, but it is not negligible either.
5. **The ending rests on the side / back.** It is not a get-up. A get-up skill would start from here.
6. **Direction interpretation** (§1): folded side / back with the chest open to the tackling side, rather than a literal "tackling side". Please confirm.

**Tooling:** the SP2C and SP2D search workers now install their message handler only in their own workers (`workerData.tool`). SP2C results are unaffected. No library or simulation change was made for SP2D.

## 5. For your review

1. Is the direction right: lowering onto the folded side / back with the folded-side arm posting?
2. The pace: keep the mid-slide descent, or move closer to the reference's very early lie-down?
3. The shoulder opening (about 150°) and the arm's braking share.
4. Then: the get-up skill from this resting posture; the narrow friction calibration.

The running recipient is not started.
