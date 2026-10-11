# TRC-1: the tackler drawn on its own physics

**Status:** done; waiting for the owner's visual review.
- **Scope:** presentation only (CXA-1 M1). Source instruction: `sources/2026-10-11_user_approval_tackler_render_correction.md` (commit 3b864663).
- **Review page:** `trc1/review/TRC1_REVIEW.html`. Locally: `http://127.0.0.1:8350/trc1/review/TRC1_REVIEW.html`.

## What changed, and what did not

**Changed: only how the tackler is drawn.** There is a new render rule, **MC-1P** (`scripts/trc1_retarget.mjs`):
- **Rotations:** each Gabriel bone keeps MC-1's rotation, taken from its carrier V2 body (q_b = R_B · Z0_B⁻¹).
- **Limb bones:** each is rigidly attached to its carrier body *at the V2 joint* (hip, knee, ankle, shoulder, elbow).
- **Trunk bones:** these use the same convention relation as the runner.
- **Stretch:** each limb bone is stretched only along its own axis, so its tip lands on the next V2 joint. The wrist target is the distal end of the V2 forearm capsule.
- **Pelvis:** the pelvis bone is scaled laterally to the V2 hip spacing.
- **Bridges:** the neck and clavicles are re-aimed every frame.
- **Mesh:** the mesh, skin weights, textures and materials are Gabriel's, unchanged.

**Unchanged:**
- V2 physics, colliders, mass and inertia;
- solver, filtering and controllers;
- the PVP / ABI records, RUN-1, simulation state and outcomes.

The runner keeps MC-1, which was already exact for R0 ← vinicius. **Every view re-renders the committed records:** nothing was re-simulated, and every record's final hash is unchanged. No physics, record or tool file outside `trc1/` was modified; the only other tracked change is the DECISIONS entry.

## 1 · Joint audit (before adopting the mapping)

`scripts/trc1_joint_audit.mjs` → `evidence/TRC1_JOINTS_*.json` covers every rendered frame of each trustworthy window.

**Method:**
- **Position error:** the rendered bone origin vs the V2 joint centre on the child body.
- **Orientation:** the rendered segment axis vs the physical joint-to-joint segment, and the rendered foot frame vs the physical foot.

**Tackler joint position error, mm (median / max over the window):**

| record (window) | rule | hips | knees | ankles | shoulders | elbows | wrists |
|---|---|---|---|---|---|---|---|
| PVP-1A-DX (1–62) | before, MC-1 | 66.6 / 70.2 | 73.2–74.8 / 79.7 | 69.3–85.3 / 86.7 | 63.1–68.3 / 84.2 | 51.0–55.3 / 70.6 | 51.6–56.0 / 70.2 |
| | **after, MC-1P** | **0.00 / 0.00** | **0.00 / 0.00** | **0.00 / 0.00** | **0.00 / 0.00** | **0.00 / 0.00** | **0.00 / 0.00** |
| ABI-1 CF1 A / B / C (1–60) | before | 66.5 / 66.6 | 72.5–74.5 / 75.4 | 69.2–84.2 / 86.7 | 67.0–68.2 / 92.6 | 83.4–83.6 / 107.6 | 89.2–89.4 / 112.8 |
| | **after** | **0.00** | **0.00** | **0.00** | **0.00** | **0.00** | **0.00** |
| S-IMPACT 0.75× A / B / C (1–260) | before | 66.5 / 66.6 | 73.1–75.1 / 75.4 | 69.5–85.0 / 86.7 | 116.9–122.4 / 131.2 | 135.6–136.8 / 147.2 | 140.7–142.9 / 153.2 |
| | **after** | **0.00** | **0.00** | **0.00** | **0.00** | **0.00** | **0.00** |

The no-contact controls (DX C0, ABI A C0) are the same: 50–100 mm before, 0.00 after.

**Reading the after values:**
- **0.00 means below 0.005 mm.** The attachment is exact by construction, so the audit checks the implementation.
- **Segment axes, after:** 0.00° for thighs, shanks, upper arms and forearms.
- **Bone tips vs the next joint, after:** 0.00 mm. Gabriel's limb bones are collinear with the V2 joint chain in the reference pose, so the axial stretch alone lands every tip.
- **Before, the error was almost a pure translation plus a length mismatch:** axis errors were ≤ 0.25° on the legs and ≤ 1.34° on the upper arms. Before and after use identical bone rotations, and the foot frame is 0.00° in both.
- **Runner, for reference** (MC-1, unchanged): legs ≤ 0.44 mm; arms 6–16 mm (shoulder 8.7 / 14.1, elbow 10.4–11.5 / 16.2, wrist 6.2–6.4 / 13.1). This is MC-1's trunk forward kinematics. It is out of scope here and was not changed.

**Appearance cost of the mapping:** these are constant scales of Gabriel's bones, and the mesh follows them.

| | scale | why |
|---|---|---|
| **pelvis width** | **× 0.588** | Gabriel's hip joints are 323 mm apart; the V1-matched tackler body's are 190 mm. The runner's R0 has 305 mm, equal to its rig. **This is the one visible change: narrower hips.** |
| thigh / shank | × 0.926 / × 1.036 | V2 446 / 458 mm vs rig 482 / 442 mm |
| upper arm / forearm | × 0.895 / × 0.969 | V2 307 / 293 mm vs rig 343 / 303 mm |
| clavicles (per frame) | × 0.77–0.78, re-aimed ≈ 17° | the V2 shoulders sit narrower than Gabriel's |
| neck (per frame) | × 1.00–1.02, re-aimed 4.8–7.8° | |
| toe | now 37.8 mm ahead of the boot colliders (L and R) | before: L 51 / 77 mm ahead; R 14–43 mm *behind*. Runner: 54 mm |

If the narrow hips are unwanted, the alternative is to keep Gabriel's pelvis and accept a hip-joint mismatch of ≈ 66 mm per side. Correct joints and Gabriel's exact silhouette cannot both be had: his rig is not the tackler's body.

## 2 · Remaining mesh overlap while the colliders stay valid (not fixed)

`scripts/trc1_mesh.mjs` → `evidence/TRC1_MESH_*.json.gz`, summarised in `evidence/TRC1_SUMMARY.json`.

**Method:**
- It uses CXA-1's skinning and visible-intersection test.
- **One fix, applied to before and after alike:** inside / outside is decided by the closest feature's angle-weighted pseudonormal (Bærentzen & Aanæs), and only certified nearest surfaces count.
- **Robust depth** is the 10th-deepest vertex of either footballer inside the other's skinned surface. A hit counts for the anatomy of the penetrating vertex and of the penetrated surface.

**Validation, and a numeric erratum for CXA-1** (`evidence/TRC1_SIGNCHECK_*.json`; `trc1_mesh.mjs --signCheck --verifyDeep 0.015`). For every tested vertex in every window frame of DX, CF1 A and 0.75× A (before and after), I compared CXA-1's interpolated-normal sign with the TRC-1 test. Every disagreement, and every agreed "inside" vertex ≥ 15 mm deep, was arbitrated by 7-ray parity through the whole other mesh.

- **CXA-1's extra "inside" vertices are all false.** DX had 509 such vertices and CF1 666 (before); after the correction the counts are 141 (DX) and 427 (CF1). 7-ray parity puts **all** of them outside.
- **The TRC-1 test has 7 false positives in the DX before frames and none elsewhere.** All 7 are refuted by parity.
- **Effect on CXA-1:** the false positives inflated CXA-1's robust "visible intersection" series in about two-thirds of the frames. DX was reported as 20.1–68.7 mm in the window; the corrected range is **16.0–43.3 mm**. CF1 was 23.5–80.7 mm; corrected **17.3–43.4 mm**. CXA-1's "25–81 mm" should read **≈ 16–43 mm robust**, or 31–54 mm for the deepest parity-confirmed vertex.
- **CXA-1's conclusion is unchanged:** the meshes interpenetrate in every frame while the colliders touch. The CXA-1 files were not edited; this paragraph is the erratum.
- **Deep agreed vertices are mostly real.** Most are confirmed by parity (after: 59 / 67 in DX, 205 / 205 in CF1 A, 182 / 202 in 0.75×). The refuted ones are isolated, e.g. the "40.7 mm" single vertices at DX steps 44–48.
- **So the tables quote two things:** the robust depth, which a few stray vertices cannot move, and the deepest **parity-confirmed** vertex.

**Robust visible interpenetration, mm (median / max over the window):**

| record (window) | colliders: deepest | before (MC-1) | **after (MC-1P)** | deepest parity-confirmed vertex, before → after |
|---|---|---|---|---|
| PVP-1A-DX (1–62) | 1.19 mm | 30.1 / 43.3 | **0 / 11.7** | 54.2 → **23.7** (step 9) |
| ABI-1 CF1 A (1–60) | 3.30 | 31.0 / 43.4 | **9.8 / 15.3** | 52.5 → **25.8** (step 34) |
| ABI-1 B = C (1–60) | 3.52 | 30.9 / 43.4 | **9.7 / 16.0** | not separately validated (same contact as A) |
| S-IMPACT 0.75× A (1–260, every 4th step) | 2.97 | 32.1 / 41.9 | **8.7 / 13.8** | 51.5 → **25.2** (step 88) |
| S-IMPACT 0.75× B = C | 2.89 | 29.6 / 41.9 | **6.8 / 12.9** | not separately validated |

**By anatomy, after (before in brackets), robust median / max in mm:**

| record | boots | shins / calves | thighs | pelvis / torso | arms | head |
|---|---|---|---|---|---|---|
| PVP-1A-DX | **0 / 11.7** (30.1 / 43.3) | 0 / 8.9 (11.6 / 38.3) | 0 / 0 (0 / 0) | 0 / 0 (0 / 0) | 0 / 0 | 0 / 0 |
| ABI-1 A | **9.8 / 15.3** (31.0 / 43.4) | 0 / 8.7 (12.8 / 37.8) | 0 / 0 | 0 / 0.4 (0 / 6.5) | 0 / 0 | 0 / 0.4 (0 / 6.5) |
| ABI-1 B = C | **9.7 / 16.0** (30.9 / 43.4) | 0 / 8.7 (12.8 / 37.8) | 0 / 0 | 0 / 0 (0 / 6.2) | 0 / 0 | 0 / 0 (0 / 6.2) |
| 0.75× A | **8.7 / 13.8** (32.1 / 41.9) | 0 / 7.6 (13.3 / 36.2) | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |

**What still overlaps (after):**
- the tackler's left boot × the runner's right boot / heel: robust ≤ 9.0 (DX), 15–16 (ABI), 13–14 (0.75×) mm;
- the tackler's left boot × the runner's right shank: robust ≤ 7.6–8.9 mm.

Nothing else overlaps in these records.

**PVP-1A-DX over time:**
- The robust overlap after the correction is 0 at steps 0–2.
- It is 3.5–11.7 mm during the heel sweep, at steps 3–31 (12–129 ms), with a peak of 11.7 mm at step 9 (37.5 ms).
- It is 0 from step 32 to the window end.
- The audit flagged 1–2 vertices 30–41 mm deep at steps 44–48, while the colliders are 8–11 mm apart. Ray parity refutes them: they are outside. The real overlap there is ≤ 16 mm on 1 vertex, and the robust depth is 0.

**Envelope** (anatomy outside its own colliders, p95 at DX step 30):
- **Tackler after:** boots 60–62 mm, shanks 27–28, thighs 52–62, upper arms 34–35, forearms 80, head 63, thorax 27.
- **Tackler before:** shanks 50–80, thighs 79–91 (inflated by the render offset).
- **Runner** (unchanged): boots 55, shanks 26, thighs 70–74.

## 3 · First contact: visual vs physics

**At every impulse-carrying Jolt contact in the window**, I measured the signed separation of the two contacting bodies' meshes within 80 mm of the contact point. Negative means overlap.

| record | Jolt contact created from config step → impulse step | pair | colliders | meshes at that contact: before → **after** | first visible mesh overlap: before / after |
|---|---|---|---|---|---|
| PVP-1A-DX | 2 → 3 | tackler foot_L × runner shank_R | 9.33 mm apart (speculative) | −29.9 → **−6.3 mm** | step 0 (46 mm, colliders 38 mm apart) / **step 2** |
| ABI-1 A / B / C | 2 → 3 | same | 9.33 mm | −32.0 → **−6.2 mm** | step 0 / **step 2** |
| S-IMPACT 0.75× | 3 → 4 | same | 5.95 mm | −32.9 → **−11.0 mm** | step 0 / **step 2** (2.5 mm) |

**Over every impulse-carrying contact in the window:**

| record | contacts | before: median / deepest | after: median / deepest | contacts > 20 mm, before → after |
|---|---|---|---|---|
| DX | 44 | −46.2 / −51.1 | **−16.9 / −23.7** | 43 → 10 |
| ABI-1 A | 47 | −43.7 / −52.5 | **−16.5 / −22.9** | 46 → 8 |
| 0.75× A | 54 | −40.0 / −51.5 | **−16.7 / −25.2** | 54 → 22 |

**The deepest visual overlap is now on the same pair of bodies as Jolt's contact** in 25 / 26 (DX), 32 / 34 (ABI A) and 35 / 37 (0.75× A) of the impulse frames. Before, it was 14 / 26, 22 / 34 and 25 / 37.

**One contact at the DX window end shows a visible gap instead:** the tackler's head reaches the runner's pelvis (config step 62 → impulse step 63, 13.8 N·s), and the meshes there are +12.2 mm apart. There the colliders (head sphere, pelvis box with a 30 mm convex radius) are larger than the meshes. In ABI-1 the same contact is −1.0 / +0.9 mm.

## Six answers

**1. Does correcting the tackler's rendering remove most of the apparent phasing?**

**Yes.** The robust visible interpenetration falls by 65–73 % at its peak:
- DX: 43 → 12 mm;
- ABI: 43 → 15–16 mm;
- 0.75×: 42 → 13–14 mm.

Its median falls from ≈ 30 mm to 0 (DX) and to 7–10 mm (ABI, 0.75×).
- **Shins:** 38 → ≤ 9 mm. **Pelvis / torso / head:** 6.5 → ≤ 0.4 mm.
- **Timing:** before, the meshes already interpenetrated 46 mm at the entry frame, while the colliders were 38 mm apart. Now the first visible overlap occurs at the very configuration from which Jolt creates the contact.
- **What remains** is local: the tackler's boot against the runner's heel / ankle.

**2. How much visible overlap remains solely because the meshes extend beyond the physical collision envelopes?**

**All of what remains.** The tackler is now drawn exactly on its physics (0.00 mm), and the colliders penetrate ≤ 1.19 mm (DX) / ≤ 3.52 mm (ABI), so any deeper mesh overlap is envelope:
- **DX:** robust ≤ 11.7 mm (median 0), and only during the heel sweep (steps 3–31).
- **ABI A / B / C:** ≤ 15–16 mm (median ≈ 10).
- **0.75×:** ≤ 13–14 mm (median 7–9).
- **At the contact sites:** median ≈ 17 mm, worst 23–25 mm.
- **By anatomy:** boots carry the whole robust maximum; shins / calves ≤ 9 mm; thighs, pelvis / torso, arms and head ≈ 0 (≤ 0.4 mm).
- **Deepest parity-confirmed vertex:** 23.7 (DX), 25.8 (ABI A) and 25.2 mm (0.75× A), down from 51–54 mm.
- **Pixels:** ≈ 0.2–0.3 px at the gameplay camera in the review's capture (players ≈ 25 px tall), so sub-pixel. It is visible only in the 8× / 16× close-ups (≈ 1–3 px).

**3. At actual first contact, does the visual contact now occur approximately where the physics contact occurs?**

**Yes:** same step, same anatomy, within the envelope thickness.
- **Same step and pair:** the meshes first touch at config step 2, the configuration from which Jolt builds the first speculative contact. It is the same pair, the tackler's left boot against the runner's right shank / heel. (In 0.75×, one step, 4 ms, earlier than the step-3 contact.)
- **Overlap at the contact point:** 6.3 mm (DX) / 6.2 mm (ABI) / 11.0 mm (0.75×), down from 30–33 mm.
- **Position:** the visible surfaces sit ≈ 2–6 cm from the collider contact point, because the boot and shin meshes lie outside their inscribed colliders.

**4. Can we now visually trust the first 250 ms of PVP-1A-DX?**

**As a depiction of the physics: yes, to within ≈ 1 cm at the boots.** The tackler is where its physics is, the contact appears when and where it happens, and the bodies the viewer sees touching are the bodies that touch.

**Remaining caveats:**
- ≤ 12 mm of boot-into-heel overlap during the heel sweep (close-ups only);
- the known DX entry-pose self-penetration (tackler integrity untrusted from step 1, PVP-1A-DX);
- the head-to-pelvis contact at the window boundary (step 62 → 63), which shows a 12 mm gap.

This answers only "is the picture faithful". What the picture shows is question 5.

**5. Does the earlier "mannequin / stiff response" assessment still hold with correctly aligned bodies?**

**Yes.** The correction moves where the tackler is drawn (51–153 mm), but adds or removes no motion:
- Both rules use the same bone rotations (axis differences ≤ 1.3°).
- The runner's drawing was already exact at hips, knees and ankles, and is unchanged.

In the corrected close-ups the runner stays upright with straight legs while the heel sweep drags his right foot, and the tackler slides sitting upright. That is the physics response ABI-1 diagnosed for 0–250 ms (frozen non-yielding tone plus physiological latency), not a rendering artifact. The corrected view removes the phasing distraction, so the stiffness is now easier to judge, not less evident.

**6. Is the collider-envelope mismatch serious enough to justify a future V2 body revision, or can contact-time rendering deformation / skin correction handle it?**

**Visually, rendering correction can handle it.** A V2 body revision is not justified on visual grounds by this evidence:
- The remaining overlap is small (robust ≤ 16 mm; ≤ 25 mm at contact sites).
- It is local (boot × heel / ankle, boot × shin), sub-pixel at the gameplay camera, and its sites and timing are known exactly from the contact manifolds.

A contact-time skin correction would suit this: a local push-out of the boot / heel / shin vertices along the contact normal near active contacts, ≤ ≈ 25 mm, faded in and out. It must also allow the opposite sign, a ≤ 12 mm visible gap where the colliders are larger than the mesh (head / pelvis at the DX window end).

**Two non-visual reasons might still justify revising the body later**, and they deserve their own owner decision (CXA-1 M2):
- **(a) The F0 boot collider is a sole-only slab** ≈ 70 mm below the visible boot top. A boot landing on the visible instep makes no contact until it reaches the shank or the sole, which matters for stamps and boot-on-boot tackles, not for this heel sweep.
- **(b) The V1-matched tackler's hips are 190 mm apart**, against 305–323 mm in both rigs. This forces the 0.59 pelvis squeeze above.

Neither is fixed here.

## Files

- **Tools:**
  - `scripts/trc1_retarget.mjs`: MC-1 and MC-1P.
  - `scripts/trc1_joint_audit.mjs`
  - `scripts/trc1_mesh.mjs`
  - `scripts/trc1_summary.mjs`
  - `render/trc1_clip_prep.mjs`
  - `render/trc1_capture.cjs`
- **Evidence:**
  - `evidence/TRC1_JOINTS_{DX_N2,DX_C0,CF1_A,CF1_B,CF1_C,CF1_A0,V075_A,V075_B,V075_C}.json`
  - `evidence/TRC1_MESH_{DX_N2,CF1_A,CF1_B,CF1_C,V075_A,V075_B}.json.gz` (V075_C is bit-identical to B)
  - `evidence/TRC1_SIGNCHECK_{DX_N2,CF1_A,V075_A}_{before,after}.json`: inside / outside validation by ray parity.
  - `evidence/TRC1_SUMMARY.json`
- **Review:**
  - `review/TRC1_REVIEW.html`
  - `review/capture_index.json`
  - `review/video/*.mp4`: 9 views × {mesh, mesh + colliders}.
  - The lossless frames are outside Git (`review/frames.OUTSIDE_GIT.md`, with SHA256SUMS).
- **Erratum preserved:** ABI-1 EXT after step 60 (250 ms) is not evidence, because its filtered torso pairs genuinely phased (`abi1/ABI1_ERRATUM_CXA1.md`). EXT is not re-rendered.

**Reproduce:** run from the worktree root with `V2_KNEE_MODEL=v2k LV2_ARCHIVE=<frozen tag archive>`. The command lines are in each script header.
