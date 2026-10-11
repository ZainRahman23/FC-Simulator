# CXA-1: collision-exclusion audit of PVP-1A-DX (read-only)

**Source:** `sources/2026-10-11_user_instruction_collision_exclusion_audit.md` (`f1933adb`).

**Nothing was fixed or changed.** No controller, passive compliance, stepping, slide, V2, solver setting, collision geometry, threshold, record or simulation was touched. ABI work is stopped.

**Review page:** http://127.0.0.1:8350/cxa1/review/CXA1_REVIEW.html

## Verdict

**The physical collision shapes do not phase.** In the committed PVP-1A-DX run, in CF1 (ABI-1's input) and in ABI-1's primary runs, the two V2 bodies keep rigid collision exclusion for the whole trustworthy window, and beyond it:
- penetration ≤ 1.2 mm (DX), ≤ 3.3 mm (CF1) and ≤ 3.5 mm (ABI B / C). That is below Jolt's 5 mm penetration slop and the 10 mm integrity threshold;
- no contact is dropped, no shape crosses another, and no pair is filtered.

**What looks like phasing is presentation.** It is a collision-envelope mismatch with two parts:
1. **The tackler is drawn in the wrong place.** Its rendered skeleton sits **54–87 mm** away from its physics skeleton, because Gabriel's rig is driven by a V1-matched body with different proportions.
2. **Both bodies' visible meshes extend well beyond their colliders.** V2's limb colliders are deliberately **inscribed**, and the F0 boot collider is only a low sole slab.

As a result, the rendered footballers interpenetrate by **≈ 25–80 mm in every frame of the window, even before any collider has touched.**

**One exception is real phasing, and it is my own:**
- **ABI-1's EXT diagnostic filtered the non-leg cross pairs by design.** From step 61 (254 ms) the tackler's head, thorax, abdomen and arms pass through the runner's legs and pelvis by up to **154 mm**.
- ABI-1's EXT window failed to stop there, because filtered pairs never create contacts. **ABI-1's EXT results after step 60 are physically invalid** (erratum `abi1/ABI1_ERRATUM_CXA1.md`).

## Method

**Geometry** (`scripts/cxa1_geom.mjs`, `cxa1_audit.mjs`):
- **Separation.** For every recorded state (entry + each 1/240 s step) and every runner-shape × tackler-shape pair (39 × 39 V2 shapes), the exact signed separation is computed. Separated pairs use a GJK distance.
- **Penetration.** Overlapping pairs use the minimum-translation depth: the minimum support of the Minkowski difference over 642 directions, refined to < 1e-5 rad. It is checked exactly against analytic sphere / capsule / box cases.
- **Per pair:** witness points, separating normal and relative normal velocity.
- **Shapes** use V2's own support functions. Boot hulls use their specified points, so depths at hull corners are conservative by ≤ ~2–3 mm.

**Jolt cross-check:**
- The record's manifold at step n + 1 was detected, and its depth reconstructed, from exactly the state recorded at step n. So every geometric overlap is matched to Jolt's manifold, normal and friction impulses, depth, point count and speculative contacts.
- **Agreement with Jolt's own depths:** mean 0.008 mm, max 0.20 mm (DX, 16 penetrating manifolds); mean 0.20 mm, max 1.7 mm (CF1).

**Per pair:**
- overlap episodes, maximum depth and duration;
- depth increasing while the solver pushes;
- normal flips;
- **side crossing**: the separating normal before and after an episode in opposite half-spaces.

**Filtering** (`cxa1_filter.mjs`): Jolt's group-filter table queried for every body pair of the world the plant builds, plus object layers, motion quality and contact settings.

**Creation-order swap** (`cxa1_order_runs.mjs`, labelled diagnostic): the same N2 runs with the tackler created first (the existing diagnostic copy of the frozen plant). The default order reproduces the committed records bit for bit (DX `e5751b0cbdd7c2b9`, CF1 `20c6161b170403f8`).

**Meshes** (`cxa1_mesh.mjs`):
- Both meshes are skinned exactly as the review renders them (render rule MC-1 §2(4); 4 influences).
- **Envelope:** each vertex's signed distance to its own carrier body's colliders, including the parent and children bodies.
- **Visible intersection:** vertices of one footballer lying inside the other's skinned surface (nearest surface, interpolated skinned normal), reported robustly as the 10th-deepest vertex.
- **Supporting tools:** `cxa1_render_offset.mjs` (rendered vs physical joint centres) and `cxa1_boot_extent.mjs` (boot mesh vs boot hulls).

## Numbers

| record | window | max collider penetration in window (all steps) | steps over 5 mm slop | overlapping pairs without a contact | crossings | max approach per step (pairs within 20 mm) |
|---|---|---|---|---|---|---|
| **DX** (committed PVP-1A-DX) | 1–62 | **1.19 mm** (1.86) | 0 | 0 | 0 | 15.4 mm |
| **CF1** (ABI-1 input) | 1–60 | **3.30 mm** (3.30) | 0 | 0 | 0 | 15.1 mm |
| DX, order swapped | 1–62 | 1.65 mm (2.76) | 0 | 0 | 0 | 15.4 mm |
| CF1, order swapped | 1–60 | 2.78 mm (2.78) | 0 | 0 | 0 | 15.1 mm |
| ABI-1 B / C primary | 1–60 | 3.52 mm | 0 | 0 | 0 | 15.1 mm |
| ABI-1 S-IMPACT 0.75× A / B | 1–260 | 3.04 / 2.94 mm | 0 | 0 | 0 | 13.4 mm |
| **ABI-1 EXT A / B / C** (filtered) | 1–60 · after 60 | 3.3–3.5 mm · **133 / 139 / 154 mm** | 0 · ≈ 200 | 0 · ≈ 200 | **yes** | 15.1 mm |
| ABI-1 S-IMPACT 2.0× A | 1–40 | **13.6 mm** (thigh_L ↔ tackler upperArm_L) | 10 | 0 | 0 | 36.7 mm |

**Scale.** The deepest DX overlap, 1.19 mm, is the runner's boot hull #1 against the tackler's boot hull #0. That is 5.6 % of the hull's half-thickness (21 mm) and 24 % of the solver's slop.

**Jolt contact settings** (from the world itself):
- speculative contact distance 20 mm, penetration slop 5 mm, Baumgarte 0.2;
- 150 velocity and 2 position iterations at 240 Hz;
- **discrete** motion for all 28 bodies (no CCD).

Jolt deliberately leaves penetration below the slop uncorrected, so overlaps of ≈ 1–3 mm are the solver's normal resting depth, not phasing.

**Visible intersection and envelope** (DX / CF1 windows):

| quantity | value |
|---|---|
| visible mesh interpenetration, 10th-deepest vertex | DX max **69 mm** (step 26); CF1 max **81 mm** (step 31). **Every** frame of both windows has ≥ 10 vertices > 10 mm inside the other footballer |
| at step 1, before any collider contact | already 35–38 mm |
| tackler rendered skeleton vs physics skeleton | hips **67 mm**, knees **73–78 mm**, ankles **69–87 mm**, shoulder 65 mm, elbow 54–59 mm |
| runner rendered skeleton vs physics skeleton | hips / knees / ankles **0 mm**; shoulder 2–8 mm; elbow 10–11 mm |
| cause of the tackler offset | Gabriel's rig (thigh 482 mm, shank 442 mm) drawn from a V1-matched physics body (thigh 446 mm, shank 458 mm). The render rule MC-1 positions bones by the rig's own forward kinematics from the V2 hip midpoint, which is exact only for a body built from its own rig (R0 ← vinicius) |
| runner's visible boot vs its 10 boot hulls (foot frame) | the hulls are a sole slab, 88 → 15 mm below the ankle. The boot mesh is **24 mm wider each side**, **55 mm longer at the toe**, 17 mm at the heel, and extends **≈ 70 mm higher**: the instep, upper and collar have no foot collider. 79 % of the boot's vertices lie > 5 mm outside |
| mesh outside its own colliders, p95 | runner boots 55 mm, shins 26 mm, thighs 66–74 mm, pelvis 65 mm, head 58–60 mm; tackler boots 71–82 mm, shins 48–83 mm, thighs 78–92 mm (these include its render offset) |
| why | V2's limb colliders are **inscribed** in the visible body by construction (CHARCOLLIDE-1 A1: the largest inscribed sphere at each end), and F0 is a sole-only rigid boot. When two inscribed colliders touch, the meshes must overlap by roughly the sum of both local overhangs |

**The decisive "follow-through", geometrically:**
- **Steps 7–30 (DX):** the contact is the tackler's left boot hulls against the **back and top of the runner's right boot heel**.
  - Normals point runner → tackler: backward (−0.45 … −0.81), upward (+0.30 … +0.79) and to the runner's outside.
  - The contact points sit 59–65 mm above the turf.
  - It carries 61.6 N·s, with ≤ 1.2 mm penetration and no crossing.
  - It pushes the runner's planted foot **659 mm along the turf** (lift ≤ 42 mm).
- **This corrects my earlier description.** It is a heel sweep from behind and above, not a boot "riding under the planted foot".
- **The shin strike** (steps 3–5, 5.0 N·s) is legitimate contact too.

## Direct answers

### 1. Do any physical collision shapes actually phase through one another?

**Not in any run with the frozen contact set:** DX, CF1, both order swaps, ABI-1 primary, S-IMPACT ≤ 1.5×. The maximum is 3.5 mm, always below the 5 mm solver slop.

**Yes in two places, neither of them the PVP-1A-DX run:**
- **ABI-1 EXT, by my diagnostic design:** non-leg pairs were filtered.
- **S-IMPACT 2.0×, by the timestep:** 13.6 mm.

### 2. If yes: which shapes, when, by how much, for how long?

**ABI-1 EXT A / B / C:**
- It starts at step 61 (254 ms): tackler head ↔ runner pelvis, 1.4–7.6 mm, growing to 13–14 mm by step 62.
- It then spreads to thorax / abdomen / upper arm ↔ thigh_L / shank_L / pelvis: **up to 133 / 139 / 154 mm** (A at step 174, B 165, C 116).
- It persists for ≈ 200 steps, to the end of the record.

**S-IMPACT 2.0×:**
- runner thigh_L ↔ tackler upperArm_L, 13.6 mm at step 30, resolved over 14 steps;
- 10 steps above the 5 mm slop; 2 above 10 mm.

### 3. Does either shape cross from one side of another to the other?

**Frozen contact set: never.** Zero side crossings and zero normal flips in any episode.

**ABI-1 EXT: yes.** For example, thigh_L ↔ thorax and thigh_L ↔ upperArm_L exit on the opposite side.

### 4. Are contacts dropped while geometry still overlaps?

**No.** Every geometric overlap in every frozen-contact-set run has a Jolt manifold built from that exact configuration, with 0 uncached overlapping steps.

The only uncached overlaps are ABI-1 EXT's filtered pairs, by design.

### 5. Does the solver know about the overlap but fail to resolve it?

**It knows, and it resolves.** Jolt's manifold depth equals the geometric depth (mean difference 0.008 mm, DX), and every episode resolves.

Depth occasionally grows by fractions of a millimetre while the solver is pushing. That is expected: Jolt corrects penetration only beyond its 5 mm slop (Baumgarte 0.2, 2 position iterations), and no episode comes near the slop.

### 6. Is collision filtering responsible?

**No, for the PVP-1A-DX contact.**
- All **196 / 196** cross-character body pairs are enabled in Jolt's filter table.
- Only the 32 within-character spec pairs are disabled.
- Every body is on the same moving layer.
- The plant's validate callback accepts every pair in N2.

**Filtering is responsible only for ABI-1 EXT's phasing**, which is my own diagnostic.

### 7. Is timestep / contact detection responsible?

**Not at the real collision.**
- The fastest approach of any pair within 20 mm is ≤ 15.4 mm per step. That is inside the 20 mm speculative contact distance, so contacts are created before the shapes meet (≈ 220 speculative contacts per window).
- It becomes a limit only above ≈ 1.5× impact (25 mm per step), and fails at 2.0× (37 mm per step → 13.6 mm penetration).
- With discrete motion (no CCD), that is the boundary of the 240 Hz step.

### 8. Is the visible phasing instead caused by the mesh extending outside the collision envelopes?

**Yes. That is the cause**, together with the tackler's render offset.
- The rendered footballers interpenetrate by up to **69 mm (DX) / 81 mm (CF1)** in every frame of the window, and already by 35–38 mm at step 1, while the colliders touch at ≤ 1.2 / 3.3 mm.
- **The anatomy outside the collision representation:**
  - the whole boot above the sole (instep, upper, collar, ≈ 70 mm), the toe (+55 mm), the heel (+17 mm), and 24 mm on each side;
  - calf and shin mass beyond the inscribed shank capsules (p95 26 mm);
  - the thighs and shorts beyond the inscribed thigh capsules (p95 66–74 mm);
  - the hair and head (p95 ≈ 60 mm).
- **On the tackler, add the 54–87 mm skeleton offset.**

### 9. How much of the previously observed "sustained contact" remains legitimate?

**All of it, at the collider level:**
- the 5.0 N·s shin strike;
- the 61.6 N·s sustained boot contact (steps 7–30, DX);
- the later head → pelvis contact (frozen set).

They are genuine, continuously resolved contacts with ≤ 1.9 mm penetration and no crossing.

**What changes is the description and its authority:**
- the boot pushes the runner's heel from behind and above. It does not ride under the foot;
- the 659 mm foot displacement is a real slide of the foot along the turf;
- the head → pelvis contact is still non-authoritative (the simulation has no such contact).

### 10. Can we trust the PVP-1A-DX collision as an input for active-balance research?

**As physics, yes, inside the windows already defined.** The collision exclusion is valid, with two caveats that are not player-v-player phasing:
- the DX tackler is untrusted from step 1, because its own entry pose self-penetrates (forearm in thigh);
- CF1's tackler carries an integrity marker at steps 19–28.

**ABI-1's physical findings in W1 and at S-IMPACT 0.75× stand.** Both were audited: ≤ 3.5 mm, no filtered pairs.

**ABI-1's EXT findings after step 60 do not stand.** The tackler's torso was phasing through the runner.

**Not as a visual input.** Every visual judgement so far is confounded by the tackler's 5–9 cm render offset and the inscribed-collider envelope: the mannequin reading, "boot under the foot", and the A / B / C comparison. They must be re-made once the presentation is corrected.

## Causal mechanisms and the smallest principled fixes (design only; nothing implemented)

### M1. The tackler is rendered 54–87 mm from its physics

The render rule MC-1 §2(4) assumes the rendered rig and the V2 body share one skeleton. That is true for R0 ← vinicius, false for V1-matched ← gabriel.

**Smallest fix (presentation only, no physics change):** render the tackler from its physical bodies with the rig's bone lengths rescaled to the V2 segment lengths, i.e. stretch the gabriel skeleton onto the V1-matched joint centres.

**Production alternative:** build the tackler's V2 body from its own rig, as R0 was built. That is a versioned body spec with re-run gates.

### M2. Visible anatomy lies outside the inscribed colliders and the sole-only boot

**What the fix would need:** contact-relevant colliders fitted to the visible surface:
- a full-height boot including the toe and upper;
- leg segments fitted to the actual cross-section (elliptical or multi-capsule).

Both are a versioned body-spec change that alters contact geometry relative to the simulation's capsules. They would need the CG and V2 gates re-run, and a decision on the F0 foot's turf behaviour.

**Presentation-only alternative:** contact-aware skin deformation at contact, which would not change physics.

### M3. ABI-1 EXT's filtered pairs phase

**Fix:**
- an EXT-type window must end at the first geometric overlap of a filtered pair, not at the first contact;
- or EXT should not filter at all, and the tackler's post-contact motion should be made authoritative instead.

EXT is withdrawn as evidence after step 60.

### M4. The discrete-step limit above ≈ 1.5× impact

Only relevant to the S-IMPACT 2.0× level. **Fix if ever needed:** linear-cast CCD for the distal limb bodies (V2 already has the `ccd: "distal"` option), or a smaller step. Not needed for the real collision.

**Recommended order, for your decision:**
1. Fix M1 in the presentation only, so the review visuals show where the tackler physically is.
2. Re-view the existing runs.
3. Then decide on M2 (collider envelope) before any further balance work.

## Files

**Tools:** `cxa1/scripts/`:
- geometry and audit: `cxa1_geom`, `cxa1_audit`;
- meshes: `cxa1_mesh`;
- runs and checks: `cxa1_filter`, `cxa1_order_runs`, `cxa1_render_offset`, `cxa1_boot_extent`;
- compilation: `cxa1_summary`.

**Render:** `cxa1/render/cxa1_clip_prep.mjs`, `cxa1_capture.cjs`.

**Evidence:** `cxa1/evidence/`:
- every audit (`CXA1_*.json.gz`) and the mesh audits;
- the filter check;
- `render_offset_DX.txt`, `boot_extent_DX.txt`;
- `CXA1_SUMMARY.json`.

**Outside Git:** the order-swap run records and the lossless frames (pointers in `evidence/` and `review/`).
