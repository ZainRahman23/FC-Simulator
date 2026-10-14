# SP2C report: 3D folded-leg tuck and active physical follow-through

This report covers the instruction `sources/2026-10-14_user_instruction_sp2c_3d_tuck_active_follow_through.md` (14 Oct 2026, about 15:53 BST). The work is commit-local and stopped for the owner's visual review.

- **Review page:** `review/SP2C_REVIEW.html` (served at :8350/sp2c/review/SP2C_REVIEW.html).
- **Log:** `SP2C_LOG.md`, the full sequence including the failed attempts.
- **Evidence:** `evidence/` (`SP2C_opts.json`, `SP2C_eval.json`, `sp2c_rollover.json`, `obstacle/obstacle_summary.json`, `sp2c_tuck_best.json`).
- **Records:** kept outside Git, in `_preserved_2026-10-14_evidence_outside_git/sp2c/`.

**Fixed throughout:**
- **Friction:** the TEMPORARY development value **F37.5**. Non-stud body/turf friction is multiplied by 0.375 after TCF-1, using `sp2a/fsweep/scripts/fs_contact.mjs` unchanged; stud traction is unchanged. F37.5 is not adopted into V2 and was not tuned in this mission.
- **Unchanged:** entry speed, physical root trajectory, body specification, ground model, C3, the authoritative simulation, RUN-1, ball physics, recipient mechanics, SP2A and FSWEEP.
- **Runs:** every result below comes from three RUN-1 run-ins (tackler 4.5 / 5.0 / 5.5 m/s), each simulated for 6 s.

## 1. What SP2C is

SP2C is **SP2A, unchanged in structure**, plus a small set of option groups, each answering one diagnosed problem (`scripts/sp2c_cand.mjs`). It keeps SP2A's structure: the RUN-1 run-in; the authored ballistic final flight from the last toe-off; physics from the plant touchdown; SP2's physical tackle; A7 contact authority; and A6 regional yielding, failure and whole-body fallback. The values below are from `evidence/SP2C_opts.json`.

| group | problem it answers | what it does |
|---|---|---|
| **fold** | the folded leg is not tucked before contact; the knee sits outside the body; the foot hangs | From the plant push-off (0.086 s) the fold hip flexes, abducts and rotates externally (62° / +12° / −25°), the knee folds (138°), and the ankle plantarflexes and inverts (−43° / +11°). The tuck is reached at 0.29 s, **before** first fold-side contact (≈ 0.42 s), and held. This replaces SP2A's post-landing morph. |
| **trunk** | the universal late roll-over (§2) | Lateral counter-lean toward the tackling side (lumbar 29.5°, thoracic 17.9°, reached by 0.3 s), a slight lumbar flexion (+5°), neck 16°. |
| **seat** | pelvis organisation on the turf | Pelvis orientation objective through the fold hip while the fold leg is on the turf (pitch −5°, roll 25°, gain 56), held to 6 s. |
| **arms** | trunk roll and balance | Fold-side arm extended back and low (shoulder −80° / 20°, elbow 0°); tackling-side arm out (35° / 51°, elbow 13°). |
| **tack** | the tackling leg after the strike | Kept extended and low (hip 65°, knee 4°). |
| **auth** | authority disappearing after contact | Regional authority after the first fold-side contact **evolves to a held level** instead of SP2A's decay to 0.35–0.6: 1.0 → (+0.06 s) 0.77–0.96 → (+0.3 s) tackling leg 0.54, folded leg 0.92, trunk 0.83, arms 0.60 / 0.82, held. Regional yield, failure and fallback remain the only routes to loss of control. |
| **tEnd 6 s** | the passive ending when the timeline ends | Every target, the seat objective and the authority run to 6 s; nothing switches off at 1.7 s. |
| **recover** | a statue-like pose held after the slide | A **state-triggered** recovery phase (new opt-in `sp2_ctrl` `opts.recover`). When the body's own horizontal COM speed falls below 0.8 m/s, the targets blend over 0.8 s into a recovery posture: arms lowered, trunk forward over the legs, head up, fold leg tucked, tackling leg extended. It triggers at 2.29 / 2.51 / 2.79 s at the three speeds. |

**No root control:** no group contains a root, COM, translation or propulsion objective. Every change is a joint target, an orientation objective realised through a joint, or an authority level. Over the slide, the horizontal contact impulse equals the horizontal momentum change to within **≤ 0.008 N·s** in every run, so contacts are the only horizontal force.

The parameters were found by search: S2 (27 parameters) and S4 (14 parameters around the S2 best), each over 3 run-ins × 6 s at F37.5. The cost is `costSP2C` in `scripts/sp2c_search.mjs`. It scores knee placement in the pelvis at contact and +100 ms; fold toe/sole share and studs; face-down (graded by time); lying back; head on the turf; the 6 s posture; shin compactness; glide shares; slide ≥ 3.5 m; SP2's tackle terms; and joint limits.

## 2. Why every SP2A / FSWEEP run rolled face-down (`scripts/sp2c_rollover.mjs`)

Each factor the brief names was changed **alone** on SP2A at F37.5. Cells give the time first face-down, at 4.5 / 5.0 / 5.5 m/s.

| factor (changed alone) | 4.5 | 5.0 | 5.5 |
|---|---|---|---|
| none (SP2A) | 1.15 s | 1.20 s | 1.37 s |
| motor authority held at 1.0 | 1.18 s | 1.25 s | 1.80 s |
| arms limp after contact | 1.14 s | 1.27 s | 1.53 s |
| arm posted wide | 0.97 s | 1.01 s | 1.19 s |
| SP2C folded-leg geometry | 1.51 s | 1.35 s | 1.25 s |
| **trunk counter-lean doubled** | **never** | **never** | **never** |
| no trunk counter-lean | 0.82 s | 0.80 s | 0.82 s |
| tackling leg low | 1.15 s | 1.19 s | 1.48 s |
| pelvis (seat) objective ×4 | 1.54 s | never | never |
| no seat objective | 1.08 s | 1.10 s | 1.11 s |
| head held up | 1.14 s | 1.20 s | 1.36 s |
| all targets held to 6 s | 1.07 s | 1.07 s | 1.26 s |

**Diagnosis:** the roll-over is a **lateral trunk/pelvis organisation** defect.
- After the fold side lands, the trunk's counter-lean toward the tackling side is too weak to keep the COM over the fold-side base, and the pelvis-orientation control is too weak to hold the roll.
- The body tips over the fold side and then onto its front. The roll ledger shows the support forces acting on the far side of the COM.
- **Minor contributor:** the disappearing authority.
- **Missing in function:** the arm post. SP2A's posted arm carries about 1% of the load, and making it limp changes nothing.
- **Not the cause:** head control, the tackling leg, and the timeline end.

The fix is general behaviour (counter-lean, pelvis organisation, held authority). There is no anti-roll torque and no speed-specific exception.

**Interaction found on the way** (log §4): tucking the knee under the pelvis **narrows the fold-side base**. With the tuck alone, every single fix failed: the body went supine or prone. Only the joint organisation found by S2/S4 stays seated at all three speeds.

## 3. Results at F37.5

5.0 m/s unless noted. SP2A at F37.5 vs SP2C at F37.5.

| measure | SP2A F37.5 | SP2C F37.5 |
|---|---|---|
| first fold-side contact | 0.417 s | 0.417 s |
| **folded knee in pelvis at contact** (x, y, z) m; fold hip at x = −0.095 | (−0.187, −0.305, 0.313): 9 cm **outside** the hip | **(−0.105, −0.372, 0.247): under the hip**, 8 cm more medial, 7 cm less forward |
| knee in pelvis at +100 / +250 / +500 ms / +1 s / end of slide | x −0.01 / +0.04 / +0.02 / +0.03 / +0.08 (under the body) | x **+0.03 / +0.02** / −0.11 / −0.11 / −0.12 (crosses the midline by about 3 cm for about 150 ms, then sits under the hip) |
| folded knee flexion at contact / +100 ms / +250 ms / +500 ms / end | 146 / 144 / 115 / **81** / 80° | 127 / 139 / 133 / **114** / 115° |
| fold hip flexion / abd / rot at contact (targets 62 / +12 / −25) | 45 / +14 / −13 | 34 / +1 / −15 (**lags the targets**; reached by +100 ms) |
| fold ankle df / inv at contact (targets −43 / +11) | −19 / −9 | −21 / +35 (plantarflexion **not reached**; during the slide the turf holds it near −3° / +27°) |
| fold boot sole-down cos at contact (< 0 = studs away) | −0.38 | **−0.58**, and −0.40 through the slide |
| fold toe / heel height at contact | 1.1 / **20.4** cm (the foot hangs) | 2.7 / 7.8 cm |
| fold toe + sole share of turf load, landing → +0.5 s | 0 | **0** |
| stud engagement during the slide (fold / tackling) | 0 / 0 N·s | **0 / 0 N·s** |
| slide braking by region | knee 29%, **torso 26%**, hip 18%, thigh 12%, boot sides 6%, shin 3%, arms 6% | **hip/pelvis 49%**, shin 18%, knee 17%, boot sides 8%, thigh 7%, torso 0%, arms 0% |
| pelvis roll +0.5 s / +1 s | 51° / 111° (rolling over) | 35° / 34° |
| trunk up-axis y at +1 s / end of slide | 0.00 / 0.03 (face-down) | **0.94 / 0.96** (upright) |
| head height at +1 s / end of slide | 0.005 / 0.02 m (on the turf from 1.27 s) | **0.73 / 0.74 m** (never on the turf) |
| first face-down | 1.20 s | **never** (all three speeds, 6 s) |
| state at 6 s | prone (face-down) | **seated, trunk upright, arms lowered, head up** |
| slide path / stop | 5.48 m / 2.79 s | 5.49 m / 2.80 s |
| fold hip `hip_L.x` (axial rotation; hard stop 45° external) | 9.1° past the stop for 1.24 s | **1.2° past the stop for 5.2 s** (end-range loading while sitting on the folded leg) |
| other limit excursions ≥ 0.5° | ankle_R.z 1.8° / 21 ms, elbow_L.y 1.5° / 13 ms | thoracic.z 2.4° / 29 ms, knee_L.x 1.9° / 150 ms, **ankle_L.x 1.4° / 79 ms** (landing), lumbar.z 1.0° / 33 ms |
| peak 29 ms regional load | thigh 4.7 BW, hip 2.8 BW | **hip/pelvis 5.7 BW** (4.9–7.9 across speeds; a harder hip landing), thigh 3.5 BW |
| regional authority after contact | decays to 0.35–0.6 | held: tackling leg 0.54, folded leg 0.92, trunk 0.83, arms 0.60 / 0.82 |
| recovery trigger | – | 2.51 s (v<sub>h</sub> < 0.8 m/s) |

**Across speeds, SP2C:**
- seated at 6 s in all three runs, never face-down, head never on the turf;
- slide 4.45 / 5.49 / 6.93 m (SP2A F37.5: 4.26 / 5.48 / 6.94);
- knee in pelvis at contact x −0.110 / −0.105 / −0.100;
- fold-hip end-range 1.6 / 1.2 / 1.1°;
- determinism: re-run hash `8a26adefa40049ee` identical.

**Contacts win** (`scripts/sp2c_obstacle.mjs`: SP2A's obstacle test on SP2C at F37.5, 5.0 m/s):

| obstacle | tackling leg effect | other | slide | end state |
|---|---|---|---|---|
| glancing 5 kg box | local yield 776 steps | folded knee deflected 37° | 4.55 m | organised |
| 20 kg box square in the path | ankle 36° | yield 452 | 3.43 m | organised |
| immovable post | hip 51°, knee 87° deflected; **regional failure** at 0.68 s | yield 204; no whole-body fallback | 1.11 m | ends near face-down (belly −0.50) |

A severe disruption can still overwhelm the organisation. A slide whose tackle is not disrupted does not end face-down.

## 4. What is not achieved, stated plainly

1. **The tuck targets lag at contact.** The tuck starts at the push-off and is commanded to be complete 0.13 s before contact. The knee is in place at contact, but at that instant hip flexion is 34° of 62°, knee 127° of 138°, and ankle plantarflexion −21° of −43°. This is the same M1 activation and limb-lag finding as SP2A. A tuck that starts during the plant stance (searched down to 0.0 s) did not help.
2. **Plantarflexion is not held on the turf.** Once the boot touches, contact holds the ankle near neutral (−3°), inverted 27°. The boot lies on its lateral border with the studs away (sole-down −0.40) and carries 8% of the braking through its sides and upper. It is not a brake and not a spear, but the "foot folded with the shin" picture is only partly met.
3. **The folded knee crosses the pelvis midline by about 3 cm at +100–250 ms** as the pelvis lands on the leg, then returns under the hip.
4. **Fold hip end-range: 1.1–1.6° past the 45° external-rotation stop for as long as the player sits on the folded leg.** No organisation lever removed it (log §7): rotation target, pelvis roll, flexion, authority and recovery keys all left it at 1.5–6°. It is a body-spec boundary of side-sitting, reduced from SP2A's 6–10°.
5. **Brief limit excursions at landing:** ankle_L.x 1.4–1.5° for 67–96 ms, knee_L.x 1.9–2.8° for 0.11–0.17 s, thoracic.z ≤ 3° for ≤ 37 ms.
6. **The arms balance but never post.** No hand or forearm turf contact in any SP2C run. The arm targets that best keep the body organised are balance positions: fold arm extended back and low, tackling arm out. A wide or lateral post made SP2A's roll worse (§2).
7. **The end of the slide is a seated recovery, not a get-up.** Every recovery that drew the tackling leg in, even to a 40° knee, tipped the body onto its front at 3.6–5.3 s (log §6). The extended tackling leg is the tackling-side outrigger of the seated base. A real get-up needs a weight-bearing hand plant and a deliberate weight transfer: a separate skill.
8. **The hip lands harder:** a 29 ms hip/pelvis peak of 4.9–7.9 BW, against SP2A's thigh 3.7–4.7 BW.

**Library changes** (all opt-in and inert when absent; SP2 `792ce24ee2a3c678` and SP2A `3062e3e24694aaf0` re-verified):
- `slide_phys2/scripts/sp2_ctrl.mjs`: `opts.recover`, the state-triggered recovery phase.
- `slide_phys1/render/sp_clip.mjs`: the intent ghost for `mode: "sp2c"`.

## 5. Owner decisions

1. Accept the SP2C organisation: pre-contact tuck, trunk counter-lean, held authority, seated recovery.
2. Accept the fold hip resting about 1–1.5° into its external-rotation stop while seated, or ask for a body-spec review of that stop. Changing the stop is outside this mission.
3. Whether the arms must visibly post. That needs the post to carry weight without re-creating SP2A's roll.
4. Whether a get-up (hand plant + weight transfer) should follow as its own skill.
5. Then the narrow final friction calibration around F35–F40, now that the ending no longer contaminates the slide-distance judgement.

## 6. Verdict

PRE-CONTACT 3D TUCK: **PARTIAL**: starts at the push-off and the knee is in place at contact, but hip, knee and ankle lag their targets there.
FOLDED KNEE PLACEMENT: **PASS**: under the fold hip at contact (8 cm more medial than SP2A) and through the slide; a 3 cm midline crossing for about 150 ms after landing.
FOLDED ANKLE/BOOT TUCK: **PARTIAL**: studs away and no hanging heel, but the plantarflexion is pushed back to neutral on the turf.
TOE/STUD CLEARANCE: **PASS**: fold toe/sole load share 0; no stud engagement by either boot during the slide.
LATERAL LEG/THIGH/HIP SLIDING SURFACE: **PASS**: hip/pelvis about 50%, shin + knee + thigh 33–42%, torso 0%.
ACTIVE FOLLOW-THROUGH: **PARTIAL**: organised and muscularly held through the slide, with a state-triggered recovery; but the arms balance without posting, and the ending is a seated recovery, not a get-up.
PASSIVE RAGDOLL-LIKE ENDING REMOVED: **YES**: never face-down, head never on the turf, seated upright at 6 s at all three speeds.
JOINT LIMITS: **PARTIAL**: fold-hip external rotation 1.1–1.6° past the stop while seated (SP2A 6–10°); brief ankle, knee and thoracic excursions at landing.
PHYSICAL SLIDE PRESERVED: **YES**: 4.45 / 5.49 / 6.93 m against SP2A's 4.26 / 5.48 / 6.94 m at F37.5; contacts are the only horizontal force (closure ≤ 0.008 N·s); deterministic.
VISUALLY BETTER THAN SP2A: **YES** (my assessment, for your visual review).
READY FOR FINAL FRICTION CALIBRATION: **YES**, once you approve the SP2C organisation: the face-down roll and torso drag that contaminated the distance judgement are gone.
READY FOR RUNNING RECIPIENT: **NO — WAIT FOR OWNER VISUAL REVIEW**
