# Track A: mechanism (instrumented) and the frozen candidate definitions

**Status:** frozen at the commit that adds this file, before any candidate run.

**Preregistration:** `TRACK_A_PREREG.md` (34cb41a).

**Evidence:** `probe_drop1m.json`, `probe_drop1m_F0.json`, `probe_leanF.json`, `conv_drop1m_F1.json`, `conv_drop1m_F0.json`, `conv_leanF_F1.json`.

**Tools:**
- `tools/track_a_probe.mjs` (cache decoding, per-point attribution, single-step counterfactuals);
- `tools/track_a_convergence.mjs` (single-step iteration / sensor variants);
- `tools/track_a_lib.mjs` (state codec, energy).

## 1. Method validity

**C0:** restoring the full saved state before the jump step and re-running it reproduces the original step **bit-identically** (max |Δstate| = 0) in drop1m F1, drop1m F0 and leanF F1.

**The decoded cache matches Jolt's behaviour.** One instrumentation bug was found and fixed before any conclusion: the listener's `SubShapeID.GetValue()` is signed in JS (`>>> 0`).

## 2. drop1m F1 jump step (n = 110, t = 0.4583 s): +3.607 J

**The impulses.**
- **At impact (step 109)** the rear-foot pieces take the landing impulse. The solved non-penetration λ totals **202.3 N·s** over the foot points, up to 54.1 N·s per point (`foot_L` piece 2; `foot_R` piece 3 48.2 N·s).
- **The toe** pieces were speculative, with λ = 0.

**At step 110 these impulses are the warm-start offer** (matched points within 1 cm).
- The converged step needs only about 15 N·s.
- The foot points start the step slightly separating (v_n 0.03 – 0.23 m/s) and end it separating at **0.51 – 0.70 m/s**.

**Counterfactuals:**

| variant | ΔE of the step |
|---|---|
| original | +3.607 J |
| contact cache dropped | −4.288 J |
| toe↔turf λ zeroed | +3.607 J (they are zero) |
| foot↔turf λ zeroed | −4.288 J (= dropped) |

No single point explains it: each of 12 loaded points alone changes ΔE by 0.6 – 2.6 J.

**Convergence** (single step, same state):

| solve | 150 iterations (accepted) | 300 – 4800 iterations |
|---|---|---|
| warm | **+3.607 J** | −4.287 J |
| cold | −4.288 J | −4.287 J |

The warm-started 150-iteration solve is **not converged**: it is off by 0.90 m/s from the converged velocities.

**F0 at the same landing:**
- **Same kind of offer:** the foot also offers large impact impulses (e.g. 15.6 N·s on one point).
- **But the step is converged at 150 iterations:** warm and cold differ by 1.6e-3 in state and 4.6e-4 J, and 300 iterations differ by 2.7e-4 m/s.

## 3. leanF F1 event (n = 112, t = 0.4667 s): +0.741 J

**The body has rolled onto its toes.** The toe pieces carry 12.9 – 16.3 N·s per step and the rear foot carries none.

**The leaf's touching / load-bearing manifold set does not change** across n = 110 … 113: 8 toe manifolds throughout.

**Counterfactuals:**

| variant | ΔE of the step |
|---|---|
| contact cache dropped | −0.147 J |
| toe↔turf λ zeroed | −0.147 J |
| toe normal λ only | −0.283 J |
| toe friction only | +0.687 J |
| foot↔turf λ zeroed | +0.741 J (unchanged) |

**Convergence is very poor:**

| solve | 150 | 300 | 600 | 4800 iterations |
|---|---|---|---|---|
| warm | +0.741 J | +0.467 J | −0.082 J | −0.557 J |
| cold | −0.147 J | −0.004 J | **+0.193 J** | −0.468 J |

Warm and cold still disagree at 4800 iterations (Δv 0.09 m/s). Even a cold solve passes through positive-energy iterates.

**Effective mass at the toe contact points:** 0.027 – 0.155 kg, against the rear foot's 0.05 – 0.93 kg, while the toes carry several body weights of impulse.

## 4. Mechanism (statement)

**The cause.** The separate light toe (0.198 kg) makes the support subsystem severely **ill-conditioned** for Jolt's sequential-impulse velocity solver. In that subsystem, turf contacts with tiny effective mass (≥ 0.027 kg) are coupled through the stiff MTP joint to the 1 kg foot and the whole leg. With 150 iterations the solve is **not converged** whenever the load path changes rapidly:
- drop1m: the step after the impact;
- leanF: rolling over loaded toes.

**Warm starting is the carrier, not the root.** It sets the initial iterate. When the cached impulses are stale, the 150-iteration iterate keeps part of them as positive work:
- drop1m: 202 N·s of landing impulse on the rear foot, while 15 N·s is needed;
- leanF: the toe's own load impulses.

**F0 has no light link and converges** in 150 iterations at the same landing.

**Hypotheses:**
- **H2** (load transfer / non-convergence with the light toe): **supported**.
- **H1** (stale speculative toe λ): **refuted**. The toe's cached λ at drop1m is 0, and at leanF it is load-bearing, not speculative.
- **H3** (point re-matching): **refuted**. Matched points lie within the preserve distance with consistent normals; the stale λ is magnitude-stale, not misassigned.
- **H4** (friction alone): **refuted** for drop1m (normal-only zeroing ≈ full) and **contributory** for leanF.
- **H5** (joint warm start): **not the carrier**. Zeroing the contact cache alone removes both rises.

## 5. Candidates (frozen definitions; at most 3)

All candidates act **only** on F1's articulated leaf: manifolds between the turf and `foot_L` / `foot_R` / `toe_L` / `toe_R` of a spec with `human.f1`.
- **Implementation:** a per-step contact-cache filter (save the read cache → zero the leaf's cached non-penetration and friction λ → restore), applied before each `Step`.
- **F0 specs:** the filter is inactive, so F0 is bit-identical by construction (verified in the battery).
- **Production:** a JS emulation of a per-body warm-start policy. Production would need it as a native per-body option, which means a custom Jolt build.

| id | definition | causal justification | prediction from §2 – §3 |
|---|---|---|---|
| **Cand-1, cold leaf contacts** | Every step, the leaf's contact λ start from zero. | Removes the carrier in both events (= C3 at drop1m, = C2 at leanF). | drop1m step: −4.29 J. leanF step: −0.15 J. **Risk:** resting support on the feet converges worse (the global contact-warm-start-off diagnostic raised resting penetration to 3.7 – 5 mm), and cold iterates can also be positive (leanF cold 600 iterations +0.19 J). |
| **Cand-2, topology-triggered leaf reset** (the user's named class) | The leaf's λ are zeroed **only** on a step whose read cache has a different set of load-bearing leaf manifolds (λ > 0) from the previous step's. | Stale information arises when the load-bearing contact topology changes. | drop1m: fires at n = 110 (the load-bearing set changed at impact), so fixed. **leanF: does not fire** (set unchanged through n = 110 … 113), so **predicted FAIL**. |
| Cand-3, more velocity iterations for the leaf's island | — | Excluded without a run by existing evidence: leanF is not converged at 4800 iterations (§3), and the whole-run 600-iteration diagnostic raised leanF to 5.90 J (`../f1/f1_energy_diag.json`). | — |

**Acceptance:** exactly `TRACK_A_PREREG.md` §6.
- **Development check first:** G1 drop1m, leanF and singleLeg on F1.
- **If a candidate passes the development check:** it is frozen (committed), then the full battery runs: D4a ensembles, ESSENTIAL F1, F0 bit-identity, determinism ×2, CPU.

**Not attempted (model changes, outside the time box):**
- regularising the MTP joint (a compliant constraint);
- a reduced-coordinate articulated foot solver.

Both would change the body / joint model, not the warm-start policy.
