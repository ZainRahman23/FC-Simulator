# Track A results: the toe / contact-warm-start energy injection. Mechanism identified; no clean local fix. CLOSED as an engine-solver limitation; rigid foot (F0) retained

**Preregistration:** `TRACK_A_PREREG.md` (34cb41a).

**Mechanism and frozen candidates:** `TRACK_A_MECHANISM_AND_CANDIDATES.md` (c94ff5d).

**Authority:** `../../sources/2026-10-09_user_decision_trackA_toe_solver_trackB_pose_compatible_pi1.md`.

**Nothing adopted.** F1, its parameters, every G1 criterion, the accepted Jolt configuration and every F0 path are unchanged. All code is process-local in `tools/track_a_*.mjs`.

## 1. Mechanism

**Measured with the actual impulses.**
- **Method:** Jolt's own contact cache, decoded through `StateRecorderJS` (v5.6.0 layout), plus single-step counterfactual restores.
- **Validity:** a full restore reproduces each event step bit-identically.

**The cause.** The separate 0.198 kg toe makes the support subsystem **severely ill-conditioned** for Jolt's sequential-impulse velocity solver:
- turf contacts on the toe have effective mass 0.027 – 0.155 kg;
- they are coupled through the stiff MTP joint to a 1 kg foot that carries the whole body.

**What goes wrong.** At the accepted 150 iterations the solve is **not converged** whenever the load path changes rapidly. Warm starting supplies the initial iterate, and the non-converged remainder of a stale warm start appears as positive work.

| event | stale warm start | evidence |
|---|---|---|
| drop1m F1, n = 110 (+3.607 J) | The landing impulses of step 109 on the **rear foot**: 202 N·s offered against about 15 N·s needed. The toe's cached λ are 0. | Zeroing foot↔turf λ: −4.288 J. Zeroing toe↔turf λ: unchanged. Warm 300 – 4800 iterations or cold: −4.287 J. **F0 at the same landing converges at 150** (warm vs cold Δ 4.6e-4 J). |
| leanF F1, n = 112 (+0.741 J) | The **toe**'s own load impulses (12.9 – 16.3 N·s per step) while the body rolls over its toes. **No** change in the load-bearing contact set. | Zeroing toe↔turf λ: −0.147 J. Zeroing foot↔turf λ: unchanged. Not converged warm **or cold** even at 4800 iterations (Δv 0.09 m/s); cold 600 iterations is +0.193 J. |

**Hypotheses** (preregistration §4):

| id | hypothesis | verdict |
|---|---|---|
| H2 | load transfer / non-convergence with the light toe | **supported** |
| H1 | stale speculative λ | refuted |
| H3 | re-matching error | refuted |
| H4 | friction alone | refuted at drop1m, contributory at leanF |
| H5 | joint warm start as the carrier | refuted |

## 2. Candidates

The development check is the preregistered §6.1 subset: F1, accepted configuration, G1 rows.

The emulation itself was checked first. A per-step save and restore of the unmodified cache gives **bit-identical hashes** to the plain runs (drop1m 3334b509, leanF ff679626, singleLeg c3de8700).

| candidate (frozen definition) | drop1m | leanF | singleLeg | verdict |
|---|---|---|---|---|
| **Cand-1, cold leaf contacts** (the leaf's contact λ zeroed every step) | pass (rise 0) | **FAIL**: 1.2a / 1.2b +0.569 J at 0.4625 s; resting turf penetration 3.49 mm (was 0.06) | pass 1.2a / b; 1.4f as before | **fails** the development check |
| **Cand-2, topology-triggered leaf reset** (the user's named class; zeroed only when the load-bearing leaf manifold set changes) | pass (rise 0.0001) | **FAIL**: +1.611 J at 0.4625 s; 1.4b resting turf penetration 5.07 mm (`foot_L`); 1.4e 5.03 mm | pass 1.2a / b; 1.4f as before | **fails** the development check |
| Cand-3, more iterations for the island | — | — | — | **excluded by evidence:** leanF is not converged at 4800 iterations, and the whole-run 600-iteration diagnostic gave leanF +5.90 J |

**Why the remaining failures happen.** Both leanF failures occur in the toe-only support phase (t ≈ 0.35 – 0.45 s, only toe pieces touching). That is the ill-conditioned subsystem itself.
- Removing the leaf's warm start removes the carrier of the drop1m event, but not the non-convergence. A cold solve also passes through positive-energy iterates.
- Removing warm start from the support contacts also costs **resting-contact fidelity** (3.5 – 5.1 mm resting penetration), the same loss seen with the global diagnostic.

**Not run:** no candidate passed the development check, so no candidate was frozen. The validation battery (ensembles, ESSENTIAL, F0 identity, determinism, CPU) was **not run**, as the preregistration requires.

**Indicative wall time** of the JS emulation: +20 – 45 % per run. It is not a production cost, because a native per-body option would be needed anyway.

**Locality.**
- Both candidates are leaf-local by construction: inactive on F0 specs.
- Both are implementable in production only as a native per-body warm-start policy, which means a **custom Jolt build**, an engine change.
- Neither is principled as a cure. They treat the carrier, not the conditioning.

## 3. Conclusion A: is the articulated-toe energy problem locally / principally fixable?

**Not by any change to warm starting, and not within the accepted Jolt configuration.**
- The positive-energy steps are the non-converged remainder of Jolt's sequential-impulse solve on an ill-conditioned support subsystem. It is ill-conditioned because a physiologically light (0.198 kg) maximal-coordinate toe link carries body-weight contact loads through a stiff joint. Contact-lambda warm starting is only the carrier.
- **Invalidating or reinitialising the toe / foot warm-start data** removes the drop1m event but not leanF: +0.57 J cold; +1.61 J topology-triggered. It degrades resting support to 3.5 – 5 mm.
- **The topology-change trigger** cannot fire on the leanF event, because the load-bearing set does not change.
- **More iterations** do not converge it (4800).

Track A therefore closes, per the preregistration, as an **engine / solver limitation**. The rigid foot (F0) is retained as the fallback.

**The remaining routes are model-level, not warm-start policies:**
- a regularised (compliant) MTP constraint;
- a direct or reduced-coordinate solve for the foot chain;
- a toe heavy enough to be well conditioned, which is not physiological.

Each would be a new versioned design with its own preregistration.

## 4. Body limitation, or solver implementation issue?

The evidence points to a **limitation of the iterative maximal-coordinate contact solver** (Jolt's sequential impulses at the accepted iteration budget) **with light articulated contact links**:
- F0 (the same body without the light link) converges at the same landing;
- convergence, not geometry or joint limits, decides the outcome. The MTP stays within its hard limits, and the toe's mass and inertia within physiological bounds do not change the result (`../f1/f1_toe_variants.json` T3 / T4).

**It does not show:**
- a body / joint *design* limit of V2 (anatomy, ranges, mass distribution);
- that an articulated toe is impossible in principle.

**It does show:** that this solver class, at this budget, cannot carry a physiologically light toe through body-weight load changes. That is relevant to whether an articulated foot needs a different solve strategy in any future V2 / V3 design.

## 5. Evidence and reproduction (worktree root)

```
V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node sandbox/visual/physchar2/tools/track_a_probe.mjs drop1m 110 <out.json> [F0|F1]
V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node sandbox/visual/physchar2/tools/track_a_probe.mjs leanF 112 <out.json>
V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node sandbox/visual/physchar2/tools/track_a_convergence.mjs <drop1m|leanF> <110|112> <out.json> [F0|F1]
V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13 node sandbox/visual/physchar2/tools/track_a_candidates.mjs dev <out.json> identity,cold,topology
```

**Files** (this directory): `probe_drop1m.json`, `probe_drop1m_F0.json`, `probe_leanF.json`, `conv_drop1m_F1.json`, `conv_drop1m_F0.json`, `conv_leanF_F1.json`, `candidates_dev.json`.

**Concurrency:** Track B was running concurrently in another process. Only the indicative wall times can be affected, not any physics result. Every result is deterministic, as hashes show.
