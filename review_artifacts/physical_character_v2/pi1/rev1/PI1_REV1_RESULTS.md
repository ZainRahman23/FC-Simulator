# PI-1 compatibility revision 1: results. HARD STOP: the three natural contact classes still cannot be represented. PI-1 not run

**Authority:** `../../sources/2026-10-09_user_decision_pi1_compat_revision_knee_rigidfoot_tackler.md`.

**Preregistration:** `PI1_REV1_PREREG.md` (c437d0c), frozen before any PM-2 / RF-1 code or REV1 test. No amendment followed.

**Unchanged:** V2, F0 / F1, Jolt, the 30 mm / 10 mm limits, V1.3 (5042230) and its records, and every frozen threshold.

## 1. Tackler criterion (item 4): RETAINED as gating

**Origin.**
- The user's D1C requirement "neither body requires a pose discontinuity to reproduce the interaction".
- I operationalised it in PI1_COMPAT_GATE CG-7 as "no sub-step jump beyond velocity·dt + 10 mm".
- **Disclosed:** the gate implements it as the change in per-sub-step displacement (≤ 10 mm), not literally.

**What the 17.9 mm is.** The far-rule slide leg stops extending abruptly (0.12 s after launch), and the extension speed is missing from the primitive's reported velocity.

**Material?** Yes (`tackler_proxy_diag.mjs`, `tackler_diag_*.json`). PI-1's stand-in tackler is rigid with its shape frozen at k_p, but the leg keeps extending and sweeping (up to 75°, until 0.24 s after launch) after promotion. Against the simulation's own runner segments, the stand-in's first contact:
- **changes segment and timing:**
  - rx_planted_leg: shin_L → foot_L at +7.5 ticks;
  - rx_behind_standing: LEG → shin_R becomes TUCK → foot_R at +12 ticks;
  - rx_rear_diag: toe_L → shin_L at +7.75 ticks;
- **or disappears:** sl_win, sl_from_behind, sl_left.

Leg endpoints at contact differ by 112 – 1,050 mm. Where the leg has stopped by k_p, the stand-in is exact: rx_square, rx_glancing, rx_late_stance, sl_loose.

**Decision and diagnosis.** It stays **gating, unchanged**.
- The rigid stand-in cannot represent the V1.2 far-rule slide.
- The 10 mm metric is only a weak proxy for that: the sweep is smooth. rx_early_stance passes at 0.9 mm, yet its stand-in leg is off by up to 102 mm.

## 2. Knee (item 1): PM-2 designed and tested, NOT adopted

**The cause of the 4.5 – 7.5 rad/s spin** (F-1). It is not R-K's arithmetic but the **presentation**:
- its plant-solve IK bends the knee up to 5.5° out of its hinge plane while a foot is planted, and switches on and off within one frame (e.g. +4.43° → 0 at toe-off);
- near a straight knee, 1° out of the hinge tilts the leg plane by ≈ 4°;
- the presentation's knee also oscillates 15° ↔ 47° frame to frame in late stance (2nd differences up to 200 mm).

R-K maps a hinge knee onto that plane, so it turns these steps into thigh spin.

**PM-2** (minimum inertia-weighted displacement fit): tested on every pre-contact frame of the 26 records, 2,604 frames; `mapping_test_pm2_summary.json`.

| class | R-K: frames failing MC-1 / MC-2 / MC-3 | PM-2: MC-1 / MC-2 / MC-3 | peak \|Δω\| R-K → PM-2 |
|---|---|---|---|
| jog (1,273) | 0 / 119 / 299 | **270 / 192 / 536** | 16.1 → 8.3 rad/s |
| run (261) | 0 / 1 / 95 | 109 / 64 / 183 | 8.6 → 8.6 |
| sprint (864) | 6 / 2 / 397 | 209 / 116 / 447 | 7.7 → 8.7 |
| standing (206) | 0 / 0 / 22 | 0 / 0 / 22 | 1.4 → 0.8 |

**Why PM-2 failed.**
- PM-2 lowers the peak spin, but its inertia term makes the twist lag the leg plane. The error moves into shank direction and position (ankle error up to 37 mm).
- Under the adoption rule fixed in advance, **PM-2 is not adopted and R-K stays.**
- **Disclosure:** I called PM-2 "free of constants". It is not. Weighting the twist change per frame against displacement implicitly fixes a one-frame time scale.

**What any mapping can achieve** (F-2).
- With V2's hinge knee (no varus DOF), knee and ankle can absorb ≈ 1.5° + 2.2° of leg-plane step at a bend of ≈ 80°, within 10 mm and with ≤ 4 mm/frame of position change (P-14).
- A ≈ 4.5° single-frame toe-off step (≈ 3.3°/frame absorbable) therefore cannot be absorbed by **any** causal mapping within P-4 + P-14 + P-15.
- **The remaining options:**
  - a knee varus DOF (a V2 anatomy change; a hard stop);
  - smoothing the presentation's plant-IK switches (a presentation change, not approved);
  - not requiring the physical body to match the presentation on every lead-in frame (§5).

## 3. Rigid foot (item 2): RF-1 implemented and tested

**At the promotion frame it helps.** Candidates with an eligible promotion frame k_p: **10 / 26** (Track B: 6). Among them, rx_planted_leg's toe-pivot promotion frame is reconciled by a 6 – 12° pitch.

**Transitions** (every frame as a promotion frame; R-K knee; `mapping_test_rf1_rk_summary.json`). Clean transitions:

| class | clean |
|---|---|
| jog | 3 / 1,273 |
| run | 9 / 261 |
| sprint | 52 / 864 |
| standing | 89 / 206 |

**Causes:**
- **Toe pivot — a genuine rigid-foot limit.** The presented ankle is too high for F0's boot to reach the turf at any pitch: the lowest point is ≥ **22.9 mm** at row 50 of rx_free_leg (`rf1_pitch_curve.mjs`). No ankle-ROM clamp is active. A promotion there leaves the physical stance foot unsupported 23 – 60 mm up, so the body would drop: a root pop that cannot be handled presentation-side.
- **Heel strike — a specification gap.** y = 0 is unreachable: the best pitch gives −2.6 mm, which is inside P-9's band. RF-1 as specified targets exactly y = 0, so it keeps −10.9 mm. Disclosed; not changed after the fact.
- **TR-1 (rendered foot).** The reconciled physical-foot target jumps when the presentation's contact flag changes (up to 24°/frame), and the blend carries that.
- **P-17 momentum.** The backward difference of the per-frame reconciled foot injects angular momentum at those changes.

## 4. Gate rerun on V1.3 unchanged (item 5): 0 of 26 pass (`compat_gate_rev1_rx.json`, `compat_gate_rev1_def.json`)

**Near miss: 0 / 5.** Every window fails on runner pose. rx_miss, rx_sprint, rx_heavy, rx_light and rx_airborne each show some combination of:
- knee / IK spin (P-15);
- toe pivot (P-9 / P-11);
- rendered-foot blend (TR-1);
- momentum (P-16 / P-17).

rx_airborne additionally fails ROM and position rows.

**Recoverable / STUMBLE: 0 / 4.**

| candidate | tackler leg step | other failures |
|---|---|---|
| **rx_behind_standing** | 17.9 mm | **none**: promotion frame and window 0 / 12 pass |
| rx_standing | 17.9 mm | TR-1 at 4 / 12; CG-1, CG-2 |
| rx_free_leg | 17.9 mm | P-17 at k_p; window (P-15, P-9, TR-1, P-17); CG-4 |
| rx_rear_diag | 19.6 mm | P-10 / P-11 at k_p; window; CG-2, CG-4 – 6 |

**Planted-leg FALL: 0 / 8.**

| candidate | tackler leg step | other failures |
|---|---|---|
| rx_glancing | none | P-17 at k_p; window (P-15, P-9 / P-11, TR-1, P-17) |
| rx_facing_front | 17.9 mm | CG-1 (the D-1 body is first struck on the boot, 92 mm from the ankle) |
| rx_side_standing | 17.9 mm | window (P-9, TR-1, P-17) |
| rx_planted_leg / rx_jog | 17.9 mm | window (P-15, P-9, P-17); CG-1, CG-3, CG-5 |
| rx_lateral | 17.9 mm | window; CG-1, CG-3, CG-4 |
| rx_front_diag | 12 mm | window; CG-2 – 4 |
| sl_from_behind | 21.3 mm | P-7 / P-15 at k_p; window; CG-1, CG-4 |

**Hard stop** (PI1_REV1_PREREG §7; the user's "all three natural contact classes still cannot be represented"). **PI-1 not run; nothing amended.**

## 5. The architectural question

> Can our intended production architecture — cheap simulation-authoritative locomotion, authored / skeletal presentation during ordinary play, temporary promotion into an articulated physical body for meaningful contacts — successfully handle a real slide-tackle sequence without the presentation or physics altering the simulation's decision?

**Not demonstrated. The full near miss → recover → fall sequence has not yet passed its compatibility gates.**

**What is demonstrated:**
- **Simulation authority is never altered by presentation.**
  - The V1.3 gameplay hashes are identical across OFF / FULL / LOCO (26 / 26), and repeat exports are identical.
  - The legacy path reproduces V1.2 exactly.
  - The predictor is read-only.
- **Gameplay collision geometry can be derived from the character** and inscribed in its physical body (V1.3), and the simulation then produces all three outcome classes naturally.
- **The promotion frame itself can be made pose- and contact-compatible** with rigid-foot reconciliation in 10 / 26 real candidates.

**What blocks it.** Two separate blockers, one per side of the contact. Both must be removed before the three classes can pass.

1. **Runner side, the lead-in.** The frozen CG-7 requires the physical body to match the presentation on **every** frame from promotion to contact. But the presentation's own stance mechanics are not physically realisable by V2's hinge knee and rigid foot within the tolerances:
   - plant-IK switches that step the knee plane ≈ 4.5° in one frame;
   - toe pivot beyond the rigid boot's reach;
   - late-stance knee oscillation.

   No causal mapping can absorb the knee steps (F-2). This blocks every near miss and 7 of 8 falls.
   - **The smallest fix:** a decision on what lead-in compatibility means in an architecture where the physical body is rendered once promoted. One option is to gate the promotion frame plus physically simulated tracking during the lead-in, instead of per-frame kinematic matching. The other is to smooth the presentation's plant-IK switches.
   - **Toe pivot at the promotion frame itself stays a genuine rigid-foot limit either way.** It would need promotion to avoid toe-pivot frames, which you ruled out, or an articulated toe, which Track A closed at the solver.
2. **Tackler side.** PI-1's rigid stand-in cannot represent the V1.2 slide leg's extension and sweep after promotion. This blocks all four recoverable candidates and 7 of 8 falls; only rx_glancing's slide leg had stopped by k_p.
   - **The smallest fix:** a stand-in whose leg follows the simulation's own slide-leg law kinematically. This is physics-side only, with no change to the simulation or V1.3.

**Neither blocker shows a V2 body limitation in the poses that matter, and neither alters a simulation decision.**
- The rigid foot's toe pivot is the one genuine body-representation limit found.
- The knee incompatibility comes from presentation discontinuities meeting a hinge knee.

## 6. Process notes and errors (disclosed)

- **Two syntax slips** in my REV1 scripts. A mid-line `//` comment swallowed a brace (it had happened once before). Caught before any run.
- **The "R-K" mode** of the new mapper first approximated R-K. It was replaced by the exact frozen R-K before the rerun.
- **CG-7's implemented tackler metric** differs from its text (§1). Disclosed; kept for comparability.
- **The RF-1 y = 0 gap** at heel strike (§3).
- **PM-2's implicit time scale** (§2).
- **Not run** (scope; nothing would change the class result): the report-only "closest approach" RF-1 variant. The heel-strike example (−2.6 mm, inside the band) is shown instead.
