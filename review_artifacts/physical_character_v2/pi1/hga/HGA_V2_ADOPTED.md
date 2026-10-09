# Criterion HG-A, version 2: ADOPTED 9 Oct 2026

**Authority:** `../../sources/2026-10-09_user_decision_adopt_hga_v2_investigate_moving_handoff.md` (f6265b5). It says: "This is a correction of what the handoff should conserve, not a relaxation intended to make PI-1 pass."

**Supersedes:** HG-A v1 (`../rev2/PI1_REV2_PREREG.md` §2, f8cd44a).

**The text adopted:** the proposal frozen at 192816b (`HGA_V2_PROPOSAL.md`), unchanged.

## Version history

| version | definition | status |
|---|---|---|
| v1 (f8cd44a) | \|v_COM,h(mapped presentation, 2nd-order backward difference) − v_auth,h\| ≤ 0.05 m/s at k_p; the residual removed by one uniform horizontal shift ≤ 0.05 m/s | **superseded.** REV2 results stay as recorded under v1. |
| **v2** (192816b) | below | **adopted** for every future scan and PI-1 run |

## HG-A v2 (verbatim from 192816b, §2)

**Inputs.**
- M: the total physical mass.
- v_i, ω_i: the PI-1 §6.2 initial velocities (2nd-order backward difference of the mapping, propagated through the tree).
- v_COM = Σ m_i v_i / M.
- v_auth: the authoritative root velocity at k_p.

**The single declared write:** s = (v_auth − v_COM)_h; then v_i ← v_i + s for every body. ω_i are unchanged, positions are unchanged, and there is no vertical shift.

| row | requirement | tolerance |
|---|---|---|
| HG-A2.1 momentum | promoted total horizontal linear momentum = M · v_auth,h | ≤ 1e-6 m/s (holds by construction) |
| HG-A2.2 internal motion preserved | angular momentum about the COM and every velocity relative to the COM unchanged by the write | ≤ 1e-9 (identity) |
| HG-A2.3 visibility of the correction | \|s\| ≤ 3 mm per 60 Hz frame = **0.180 m/s**, from PI-1 PR-2 (frozen 6ef7e1e). This tolerance is derived, not fitted to fixtures. | 0.180 m/s |

**Everything else** — P-1 … P-17, HG-T, HG-D — is unchanged. P-16 remains the pre-shift mapping-fidelity row.

## Why v1 was replaced (`HGA_INVESTIGATION.md`, 09d67d9)

1. **v1 tested the wrong quantity.** It required the presentation's *instantaneous* COM velocity to equal the authoritative velocity.
   - Internal (articulated) motion cannot change total momentum.
   - In an architecture where the simulation owns global locomotion and the presentation supplies only pose and internal motion, the promoted body's total momentum must be the authority's, whatever the presentation's instantaneous COM does.
2. **The presentation already agrees with the authority where agreement is meaningful.** Its COM velocity averaged over complete gait cycles matches v_auth within ≤ 0.015 m/s. Its frame-to-frame COM velocity is not a physical state: in flight it implies 0.7 BW of horizontal force and 871 N·m of torque about the COM (medians).
3. **v1's tolerance was a mapping-fidelity number used as a visibility number.** The 0.05 m/s came from P-16 (physical vs presentation COM velocity, no stated basis). The only real cost of enforcing the authority's momentum is a uniform velocity change on every body, so its tolerance belongs with the visible-continuity requirement (PR-2's 3 mm per frame).
4. **v2 is stricter than v1 on the physics.**
   - v1 accepted up to 0.05 m/s of momentum error (3.7 N·s) and was otherwise silent on momentum.
   - v2 requires the momentum exactly. It bounds only the visible cost of the exact correction.

## What v2 does not cover (open; under the 9 Oct ≈19:40 investigation)

- vertical translation (the presentation's vertical COM velocity is imported unbounded; finding N1);
- whole-body angular momentum beyond "unchanged by the write" (the presentation's own L is not conserved frame to frame; N1);
- internal joint / segment velocities (they include presentation jitter);
- PR-2's reference frame (N2).

v2 also does not resolve blockers B1 – B7.
