# PI-1 replacement cases on slide-contact V1.2: compatibility gate and pose compatibility. STOPPED for review (gate fails)

**Decision:** `../sources/2026-10-09_user_decision_d1c_replace_cases_compat_gate.md`.

**Thresholds:** `PI1_COMPAT_GATE.md`, fixed **before** any V1.2 record existed (ab9a626) and applied unchanged.

**Result:**
- **V1.2 supplies the three categories from one baseline.** The existing simulation rules produce them; nothing was moved or tuned.
- **But no V1.2 contact case passes the compatibility gate,** and the boot / foot discrepancy is a genuine incompatibility (class **C**).
- Per your instruction: **stop.**
  - The PI-1 preregistration is **not** amended.
  - Promotion physics is **not** implemented.
  - V2, D-1, the presentation asset, collision geometry and the simulation are untouched.

## 1. Baseline and what it supplies

**Baseline:** **e2c98ec**, the accepted slide-contact state.
- `pt_react` / `pt_defend` / `pt_squad` are byte-identical to the V1.2 commit d539e7a.
- The merge adds presentation only.
- Used through a detached scratch worktree.

**Exporter:** `scripts/air_export_v12.cjs`.
- Records every V1.2 slide primitive (LEG, THIGH, TUCK, TUCKSHIN, BODY, TRUNK) and the simulation's runner segments at each contact sub-step, plus the slide state and contact history.
- Covers all 19 rx fixtures (definitions unchanged since f5f6076) plus the near miss.
- **Gameplay hashes are identical across OFF / FULL / LOCO** for every case.

| category | fixture (selection rule §5) | authoritative outcome (V1.2) |
|---|---|---|
| near miss | rx_miss: the frozen rule gives off = **+1.01 m**. On V1.2 the slide touches the runner up to +0.90 m. My exporter's 1.00 m search cap was an implementation limit, not part of the rule. | no contact; closest surface 0.109 m; predictor fires (row 50) |
| recover (swing) | rx_free_leg | LEG → shin_L (swinging) at squad 49.5, h 0.206 m → **CORRECTION**, J 10.4 N·s |
| fall (planted) | rx_planted_leg | LEG → shin_L (**weight-bearing**) at squad 49.0, h 0.116 m → **FALL SIDE**, J 101.3 N·s |

**The slide technique differs between them.**
- The contact cases use V1.2's BLOCK slide with the left leg tackling.
- The near-miss offset puts the ball beside the line, which selects a SWEEP slide with the right leg.
- That is simply V1.2's rule applied to each geometry.

## 2. The compatibility gate (`scripts/compat_gate.mjs`; `v12/compat_gate_primary.json`, `compat_gate_all.json`)

**Method:**
- The gameplay contact (the simulation's own primitives and runner segments at the contact sub-step) is compared with the exact D-1 body posed from the LOCO presentation.
- The pose uses the R-K knee retarget; R-B is applied to toe-contact feet.
- The simulation's unperturbed path after the contact comes from its **own** `ptRxBody`, loaded read-only from the baseline into a sandbox.
- Both geometries are written out per sample.

| criterion | rx_free_leg (recover) | rx_planted_leg (fall) |
|---|---|---|
| CG-1 segment | simulation shin_L, at its **ankle end** (s = 1.00); D-1 first contact **boot, 124 mm from the ankle joint** (limit 30 mm) → **fail** | simulation shin_L, 3.5 cm above its ankle; D-1 first contact **boot instep, 65 mm from the ankle joint** (the shank reaches only 5 mm) → **fail** |
| CG-2 support (both legs) | pass: L swing (D-1 sole 72 mm up), R planted | pass: L planted (D-1 sole −2 mm), R airborne (126 mm) |
| CG-3 timing | pass (+0.25 tick) | pass (+0.75 tick) |
| CG-4 location | pass (21 mm horizontal) | pass (42 mm) |
| CG-5 overlap order | region = shank (CG-1 accepted no adjacency): simulation 16.8 mm vs D-1 shank none → **fail**. The D-1 boot takes 43.6 mm (ratio 2.6 if counted). | simulation 108.6 mm (unperturbed) vs D-1 shank 5 mm → **fail**. The D-1 boot takes 91 mm (ratio 0.84 if counted). |
| CG-6 approach | pass (normals 15.5°, relative velocity 6.8°) | pass (5.5°, 5.8°) |
| CG-7 pose continuity | **fail**: 3 toe-pivot frames; foot_R velocity 0.47 m/s | **fail**: 6 frames (toe pivot, heel strike); foot_R velocity 1.26 m/s |
| CG-8 self-collision | pass (closest 53 mm, forearm↔thigh) | pass (57 mm) |

**Near miss:** NM passes. There is no contact in either representation, and the D-1 body stays ≥ 0.100 m from every slide primitive. Pose class: C (below).

**The other 16 fixtures** (`compat_gate_all.json`): **none passes.**
- **Closest:** **rx_lateral** (5.5 m/s; LEG → swinging foot_L → CORRECTION). It passes CG-1 … CG-6 and CG-8:
  - same segment, both feet airborne;
  - +0.5 tick;
  - 35 mm apart;
  - overlap 110 vs 86 mm;
  - 21° / 4°.
  
  It fails only CG-7: 2 toe-pivot frames in which the presentation's right toe is on the pitch while the rigid V2 boot is 49 – 65 mm above it.
- **No planted-leg FALL of a locomoting runner passes.**
- The standing-player fixtures (rx_facing_front, rx_behind_standing) are not locomotion. Even so, rx_facing_front fails CG-4: the simulation's foot capsule reaches 0.27 m to the rendered toe tip, the D-1 boot ≈ 0.22 m, and the contact points are 162 mm apart.

**Also flagged under CG-7 (secondary):** the slide LEG's endpoint changes its per-sub-step displacement by 17.9 mm when the leg extension (5.3 m/s, not part of the primitive's reported velocity) ends. Positionally it is continuous. Taken literally, the fixed wording calls this a failure; it does not decide the outcome.

### What the gate shows

**Timing, support state and approach direction agree in every locomoting contact case.**

**The struck location does not.** The simulation's runner contact model (`ptRxBody`) is not derived from the rendered / physical leg:
- its default 0.865 m leg (the runner's actual 0.834 m is not used);
- its own swing lift law, not the presentation's swing pose;
- a 0.05 m-radius foot capsule from the ankle (0.08 m) to a 0.27 m toe tip;
- V1.2 calibrated the **slider** to the rendered slide, but **not** the runner's leg segments, only the foot length.

**Consequences:**
- **Recover case:** the simulation strikes the swinging leg at the **ankle**; at that point in space the promoted body has its **forefoot**.
- **Fall case:** the simulation strikes the **lower shin**; the promoted body is struck deep (91 mm) but at the **boot instep**, 65 mm from the ankle.
- In both cases the interaction is a deep, correctly timed, correctly directed hit on the distal leg. The fixed anatomical-correspondence limit (30 mm from the shared joint) rejects it.

## 3. The two pose-compatibility issues (§4 rules; all results in the gate JSONs)

**Knee bend: class B (solved deterministically, nothing changed).**
- R-K (thigh and shank aligned to the rig's hip – knee – ankle plane, the V2 knee a pure hinge) puts the V2 knee and ankle centres on the rig's within **0.004 mm** in every evaluated frame (originally up to 37.6 mm).
- Limb direction residual is 0.001°. Thigh / shank twist about the long axis is ≤ **6.5°** in every case except rx_lateral, which reaches ≤ 8.6° (limit 10°).
- It was a mapping requirement, not an incompatibility.

**Boot / foot: class C (genuine incompatibility).**
- **Toe pivot.**
  - In late stance the presentation's foot is **two segments**: foot plus a toe bone lying flat on the pitch while the heel rises. Its boot reaches 0.27 m from the ankle to the toe tip.
  - The D-1 V2 boot is **one rigid body** (V2-F0) reaching ≈ 0.22 m.
  - With the presented foot rotation, the V2 boot sits up to 45 – 65 mm above the pitch.
  - R-B needs 5.8 – 15.6° of extra pitch (limit 5°) and adds 25 – 42 mm of rendered toe penetration (limit 10 mm). In several frames even 40° does not reach the pitch.
  - Applying R-B frame by frame also breaks the velocity tolerance: foot_R reaches 0.47 – 1.26 m/s against 0.25.
- **Heel strike.** The V2 boot's heel is 6 – 11 mm **below** the pitch where the rig's heel touches (limit −5 mm).
- **When this matters:** whenever the predictor trigger, or a demotion frame, falls in a toe-pivot or heel-strike frame of a contacting foot. It does for rx_planted_leg's trigger (row 39: right foot in toe pivot, 8.1° needed).

## 4. Stop

The gate fails (§2) and the pose gate fails (§3, class C). Under your instruction: stop for review, with nothing tuned to pass.

## 5. Options I see (nothing started; each needs your decision)

1. **Map the runner's gameplay contact segments to the rendered / physical leg** (the new pivot §5.2a rule, applied to the runner). Derive the simulation's runner capsules (leg length, swing pose, ankle height, foot extent) from the presentation pose or the D-1 geometry instead of `PT.LEG_REF` and the stride law.
   - This is a simulation change, so it means a new baseline, and gameplay outcomes may change.
   - Then re-record and re-gate.
2. **Make the D-1 foot correspond to the rendered boot.** The boot length and heel come from the record, and possibly a toe body (V2-F1, spec §12.3, the documented alternative to the rigid boot).
   - This is a V2 / D-1 change, which you have held back.
   - It would address the toe-pivot / heel-strike class C, and the 0.22 vs 0.27 m foot-extent part of the location mismatch.
3. **Revisit the anatomical-correspondence criterion** (CG-1 / CG-4). It was fixed at 30 mm from the shared joint.
   - With a distal-leg region rule (shank and boot together), rx_planted_leg would show a deep, timely, correctly directed hit (91 vs 109 mm).
   - This is your call. I have not changed a fixed threshold after seeing the data.
4. **Operational rule for promotion / demotion timing:** promote and demote only at pose-compatible frames, i.e. not in toe pivot or heel strike, with a minimum lead before contact.
   - It works around class C; it does not resolve it.
   - The physical body would still meet toe-pivot targets during PRE that it cannot reach.

**My reading:** option 1 is the principled fix for the contact gate, and it is what the new architectural rule requires. Option 2 is the principled fix for the foot. Both are representation changes, so they need your approval.

## 6. Evidence (committed locally; nothing pushed)

- **Fixed thresholds:** `PI1_COMPAT_GATE.md` (ab9a626).
- **Scripts:** `scripts/air_export_v12.cjs`, `compat_lib.mjs`, `compat_gate.mjs` (reproduce: `node …/compat_gate.mjs <airDir> <out> <cases> <e2c98ec worktree>`).
- **Records** (`v12/air/`, OFF / FULL / LOCO): the five gated cases (rx_miss, rx_free_leg, rx_planted_leg, rx_lateral, rx_facing_front), plus `air_summary.json` (all 19 fixtures' contacts and hashes) and `rx_miss_selection.json`. The other fixtures' records are deterministic and regenerable with the exporter.
- **Gate results:** `v12/compat_gate_primary.json`, `v12/compat_gate_all.json`.
