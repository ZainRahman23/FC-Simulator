# HG-A v2: proposed replacement for REV2's HG-A (PROPOSED, NOT ADOPTED). Frozen before it is applied to any candidate

**Status.** A proposal for the user's decision under `../../sources/2026-10-09_user_instruction_hga_momentum_investigation.md`. It is not a compatibility amendment, it is not REV3, and it changes nothing in REV2. The only use made of it before the user decides is the diagnostic count in item 6 of that instruction, which keeps every other REV2 gate unchanged.

**Disclosure.** When I wrote this I already knew the per-frame HG-A values from the REV2 diagnostics (0.002 – 1.21 m/s; `../rev2/diagnostics/hga_values_per_frame_*.json`) and the kinematic decomposition (`evidence/summary.txt`). I had not computed, before this commit, how many frames or candidates any tolerance admits. The tolerance below is derived only from requirements frozen before REV2.

## 1. What it replaces

**REV2's HG-A (f8cd44a §2).** At k_p:

  |v_COM,h(presentation, mapped) − v_auth,h| ≤ 0.05 m/s

The residual is removed by one uniform horizontal shift of all bodies, never more than 0.05 m/s. In effect HG-A requires the presentation's instantaneous centre-of-mass velocity to already equal the authoritative velocity. The 0.05 m/s comes from P-16, which is a mapping-fidelity tolerance: physical vs presentation COM velocity, "no injected momentum" (PI1_COMPAT_GATE §3, with no basis stated).

## 2. HG-A v2 (horizontal)

Let:
- M be the total physical mass;
- v_i, ω_i be the REV2 / PI-1 §6.2 initial velocities (2nd-order backward difference of the mapping, propagated through the tree), unchanged;
- v_COM = Σ m_i v_i / M;
- v_auth be the authoritative root velocity at k_p.

**The single declared write** (unchanged in form from REV2: one uniform horizontal shift, part of the 28 counted writes):

  s = (v_auth − v_COM)_h,  v_i ← v_i + s for every body; ω_i unchanged; positions unchanged; no vertical shift.

**The criterion.** Every row must hold.

| row | requirement | tolerance | origin of the tolerance |
|---|---|---|---|
| **HG-A2.1 momentum** | the promoted body's total horizontal linear momentum = M · v_auth,h | ≤ 1e-6 m/s (numerical; it holds by construction) | the architecture: simulation owns global locomotion (§3) |
| **HG-A2.2 internal motion preserved** | angular momentum about the COM, and every velocity relative to the COM, are unchanged by the write | ≤ 1e-9 (identity for a uniform shift) | the user's requirement that the relative articulated velocities and the angular momentum are preserved |
| **HG-A2.3 visibility of the correction** | \|s\| ≤ 3 mm per 60 Hz presentation frame, i.e. **\|s\| ≤ 0.180 m/s** | 0.180 m/s | PI-1 PR-2 (frozen 6ef7e1e): "every rig joint's displacement [over the first rendered frame] within 3 mm". A uniform velocity change s moves every joint's first-frame displacement by exactly s · (1/60 s), so the declared correction alone may not exceed 3 mm / (1/60 s). P-14 (≤ 0.25 m/s per body) is looser, so PR-2 binds. |
| **unchanged** | P-1 … P-17, HG-T and HG-D, exactly as REV2. P-16 keeps its meaning: the mapping, before the declared write, injects ≤ 0.05 m/s relative to the presentation. | — | — |

**Scope.** Horizontal only, as REV2's HG-A was. The simulation's locomotion state is planar (x, y, v_x, v_y). No vertical authoritative momentum exists to match, so the vertical COM velocity stays the presentation's.

**This is an open point, recorded separately in the findings:**
- the presentation's vertical COM velocity is not physically consistent;
- no REV2 row bounds it;
- HG-A v2 does not address it.

## 3. Why (conservation argument; independent of how many fixtures pass)

1. **Internal forces cannot change total linear momentum** (Newton's third law). Only external forces can: ground reaction, gravity, contact.
   - "Presentation supplies pose and internal articulated motion" therefore means the presentation's contribution to total momentum is zero by definition: Σ m_i u_i = 0 for the internal velocities u_i.
   - "Simulation owns global locomotion" means total horizontal momentum = M · v_auth.
   - A requirement on the presentation's own instantaneous COM velocity tests a quantity the presentation has no authority over.
2. **The authority's velocity is a stride-mean quantity.**
   - The presentation's COM, averaged over complete gait cycles, matches it within 0.0002 – 0.015 m/s.
   - So the instantaneous deviation the presentation shows is not a disagreement about locomotion.
3. **The presentation's instantaneous whole-body state is not a conserved physical state.** In its own flight frames the implied external horizontal force is 0.7 BW (median) and the implied torque about the COM is 870 N·m (median). Both must be zero in flight. A handoff criterion must not depend on it.
4. **The only physically real cost of enforcing (1)** is the uniform velocity change s on every body, which is visible as s · Δt per frame. Its tolerance is therefore the existing visible-continuity tolerance (PR-2), not the mapping-fidelity tolerance (P-16).

## 4. Diagnostic count procedure (item 6; not a qualifying run)

**Procedure.** The REV2 scan exactly as run (`../rev2/scripts/scan_rev2.mjs`: the same records, mapping, selector window, stand-in, physics and every CG criterion), with one change: in the PS-2 selector, HG-A is replaced by HG-A2.3. HG-A2.1 / HG-A2.2 hold by construction, and are verified numerically at k_p.
- The selector stays "the latest k in W at which every row holds".
- The write is REV2's own shift construction, now allowed up to 0.180 m/s.

**CG-6.** Reported both as run and under E1, the approach velocity. The count uses E1, the correct reading of the frozen criterion. Any difference is listed.

**Output.** Counts per class; nothing is frozen as a representative. PI-1 is not run.
