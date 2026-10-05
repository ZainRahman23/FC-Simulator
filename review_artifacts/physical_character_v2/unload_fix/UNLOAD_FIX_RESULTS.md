# B1 + B3 unload fix: results

**Inputs:**
- **Preregistration:** `UNLOAD_FIX_PREREG.md` (commit **312ede8**, before any production change), erratum E-1 and the development record (both before the official runs).
- **Implementation freeze:** **4b2fb93** (flags default off; KV0 4 / 4 bit-identical; suite 56 / 56).
- **Official runs:** a clean scratch copy of 4b2fb93. Evidence: `evidence/` (all 2,182 run results in `results_all_2182.tgz`, evaluator output, bench, browser check, post-release diagnostic traces).

**Status:**
- **B1 + B3 NOT qualified and NOT adopted.** The flags stay default off.
- **E1a not rerun. E1b not started.**
- The failed E1a evidence (`../e1a/official/`) is unchanged. Nothing pushed.

## 0. Bottom line

**What worked:**
- **B1 is a correct, exactly verified fix.** It removes the large residual it was designed to remove.
- **B3 removes exactly the small share leak.** Causal separation (CS1–CS5) is clean.
- No false release, legitimate shares preserved, perturbations no worse, energy and torque continuity fine, deterministic, browser = Node.

**Why the candidate (B1B3) fails** its preregistered acceptance on **A1** (the released foot must stay TOUCHING) and **A4** (foot displacement across release ≤ 0.5 mm):
- At every drop ≥ 1 cm, once released, the unloaded foot **leaves the turf by itself**. It cycles LIFTOFF → AIRBORNE → TOUCHDOWN → AIRBORNE … 2–10 times with no lift command (16 / 16 runs per drop).
- The cause is a **pre-existing lifecycle defect**: the TOUCHING hold has no vertical reference. In contact its target height follows the foot, so the slow post-transfer pelvis settling (debt D-3) carries the released foot up to the 0.5 mm "touching" threshold.
- It also appears without the fix wherever release happens early: original 2 / 16 at 1 cm; B1-only 2 / 16 at 2–3 cm; B3-only 7 / 16 at 1 cm.
- **B3 makes it systematic.** As specified, B3 engages abruptly when the request crosses loadOff (the commanded share steps from about 2.6 % to about 0.8 % of body weight). That triggers release at exactly 6.47 s, while the pelvis is still settling, and it also produces the 0.4–1.1 mm displacements.

**Consequence:** under the stop rule ("substantive new physical failure"), qualification stops here.
- The G0–G3 regression (V3) was **not run**.
- Re-running E1a with configuration B would also be futile: in the identical pre-lift phase the foot never stays TOUCHING the 0.5 s that E1a's unload step requires (§6).

## 1. Process record (nothing hidden)

| item | what happened |
|---|---|
| prereg | 312ede8: B1 / B3 definitions, V1 bench, V2 dataset (manifest, 2,182 runs), A1–A7, CS1–CS5, V3, adoption rules |
| erratum E-1 (before any run) | The specified release-suppression `loadOff = −1` would also have disabled B3, which reads loadOff. Suppression is instead a diagnostic transition hook; loadOff is unchanged |
| development smoke checks (before freeze) | Two harness / implementation bugs found and fixed: **(1)** the ankle stiffness is baked into the spec at generation, and my runner generated the spec before setting k = 0.13, so it ran k = 0; found by the A7 reproduction check. **(2)** B1 used `Math.tan`, breaking browser = Node; replaced by the project's deterministic `dtan`. The post-release cycling was already visible in the smoke and **recorded before the official runs**; no criterion changed |
| official runs | 2,182 / 2,182 complete; bench run on the frozen tree |
| tool change after freeze | `tools/twist_policy_battery.mjs` gained a default-off `V2_XSTAND` passthrough for V3.7. Not used (V3 not run); committed as tool-only |

## 2. V1: B1 bench (frozen code) **PASS**

**Reference:** generalized forces computed **numerically** (central finite difference of the child's world rotation through the actual pyramid swing–twist parameterization), independently of the closed form. The domain is the preregistered one.

| joint | poses × torques | V1.1 max \|ΔQ\| / max(1, \|T\|) (≤ 1e-9) | V1.2 naive miss = sin t·(T·ẑ) (identity) | V1.3 mirror (≤ 1e-12) |
|---|---|---|---|---|
| knee_L | 273 × 40 | 2.5e-11 | 2.6e-11 (min nonzero miss 0.019 N·m) | 4.6e-14 |
| knee_R | 273 × 40 | 2.5e-11 | 2.4e-11 | 6.1e-14 |
| elbow_L | 273 × 40 | 1.2e-11 | 2.8e-11 | 2.3e-14 |
| elbow_R | 273 × 40 | 1.5e-11 | 2.7e-11 | 3.0e-14 |

V1.4 (flag-off identity): KV0 4 / 4 bit-identical; suite 56 / 56, incl. R10.a–d.

## 3. V2: unloading characterization (B1B3 candidate)

| # | result | values |
|---|---|---|
| **A1** zero share: released by 9.0 s, TOUCHING afterwards, load < loadOn, no LOAD_ACCEPT, no chatter | **FAIL 16 / 80** | Released in 80 / 80 at 6.475–6.479 s, with load afterwards ≤ 5.6 N and no chatter. But **only at 0 cm does the foot stay TOUCHING**. At every drop ≥ 1 cm, 16 / 16 per drop leave the turf spontaneously (2–10 AIRBORNE entries) |
| A2a r ∈ {2, 3, 5 %}: no false release | PASS 240 / 240 | the foot never leaves SUPPORT |
| A2b r ≥ loadOff: B1B3 hash-identical to B1 | PASS 240 / 240 | B3 is inactive for legitimate shares |
| A2c r = 0.5 %: commanded ≤ request below loadOff | PASS 80 / 80 | max commanded 0.99 % at the boundary tick; release permitted |
| A3 perturbations near the release boundary | PASS 128 / 128 | all recovered (ORIG also 128 recovered); no falls; ≤ 1 re-acceptance / release per push; no chatter; slip ≤ 20 mm |
| **A4** energy / torque continuity / no forcing | **FAIL 275 / 400** | **Passing terms:** closure ≤ 0.0139 J per tick; Σ+ ≤ 0.071 J; applied Δτ ≤ 7.56 N·m; Δτ0 ≤ 9.0 N·m; authority writes 0; external impulse 0. **Failing term: foot displacement across release up to 1.10 mm** (> 0.5 mm in 125 runs, 11 / 16 even at 0 cm) |
| A4x perturbation safety | PASS 128 / 128 | closure ≤ 0.0139 J per tick, Σ+ ≤ 0.094 J, impulse = scheduled |
| A5 determinism | PASS 2 / 2 pairs | — |
| A6 browser = Node | PASS 2 / 2 | 6a92bd0d / 6a92bd0d; 3dc29b29 / 3dc29b29 |
| A7 the original arm reproduces the official E1a failure | PASS 9 / 9 | hash-identical at 1–9 s; no release |

## 4. Causal separation (set R, release suppressed; all bodies, both feet) **PASS: CS1–CS5**

| drop | R_ORIG | R_B1 | R_B3 | R_B1B3 | f_PD ORIG | f_PD B1 | F_leak (B1) | locked-axis term |
|---|---|---|---|---|---|---|---|---|
| 0 cm | 0.32–0.47 N | 0.70–1.50 | 0.32–0.47 | **0.00–0.02** | 0.955–0.961 | 0.000–0.002 | 0.73–1.60 N | 0.8–1.3 N·m |
| 1.0 cm | 2.01–2.28 | 0.59–1.24 | 2.01–2.28 | 0.03 | 0.933–0.966 | 0.015–0.044 | 0.61–1.32 | 2.1–2.8 |
| 2.0 cm | 6.20–7.43 | 0.45–0.91 | 6.20–7.43 | 0.02–0.03 | 0.842–0.868 | 0.004–0.009 | 0.46–0.96 | 3.9–5.9 |
| 2.5 cm | **7.72–9.50** | **0.39–0.81** | 7.72–9.50 | **0.00–0.03** | 0.812–0.838 | 0.002–0.006 | 0.41–0.85 | 4.6–7.0 |
| 3.0 cm | 9.06–11.36 | 0.35–0.72 | 9.06–11.36 | 0.00–0.02 | 0.787–0.813 | 0.002–0.004 | 0.36–0.76 | 5.2–8.0 |

- **CS1:** f_PD ≤ 0.092 with B1, against ≥ 0.787 without it. The PD no longer carries the locked-axis term.
- **CS2:** B1 removes ≥ 50 % of the residual at d ≥ 2 cm: 6.2–11.4 N → 0.35–0.91 N.
- **CS3:** B3 holds the commanded share ≤ the request at every tick below loadOff. It removes exactly the leak: \|(R_B1 − R_B1B3) − F_leak\| ≤ 0.014 % BW.
- **CS4:** B3 alone leaves f_PD unchanged (Δ ≤ 0.001).
- **CS5:** R_B1B3 ≤ 0.005 % BW at all drops.

So **B1 removes the large mapping residual, and B3 removes only the small leak**, as required.

## 5. What fails, and why (diagnostic; `tools/unload_post_release_diag.mjs`, `evidence/post_release_diag/`)

**Foot-load trajectory around release** (V2-REF, left foot, 2.5 cm, B1B3; the original arm in brackets at the same times):

| t | state | load of foot n | requested / commanded share |
|---|---|---|---|
| 6.0 s | SUPPORT | 50.1 N (44.0) | 5.18 % / 7.09 % |
| 6.2 s | SUPPORT | 30.8 N (27.6) | 2.90 % / 4.46 % |
| 6.4 s | SUPPORT | 17.8 N (16.7) | 1.33 % / 2.64 % (leak above loadOff; B3 inactive) |
| **6.475 s** | **UNLOADING** | 16.6 → 4.5 N within about 50 ms | request crosses 1 % → **B3 clamps the commanded share 2.6 → 0.8 %** |
| 6.58 s | TOUCHING | 0 N | — |
| 6.6 – 6.9 s | TOUCHING | 0 N; **foot rises 0.06 → 0.42 mm**; pelvis rises 0.4 mm as it settles (error 0.59 → 0.19 mm) | — |
| **6.975 s** | LIFTOFF → AIRBORNE | 0 N; sole clearance **0.513 mm**, just above the 0.5 mm touching definition | **no lift command** |
| 7.0 – 11 s | TOUCHDOWN ↔ AIRBORNE cycling | 0 N; clearance oscillates 0.40–0.61 mm around the threshold | — |
| (original arm) | (SUPPORT throughout) | (8.5–8.7 N plateau: the official deadlock) | — |

**Mechanism:**
- After release the lifecycle's contact hold has **no vertical reference**: "in a contact state with no commanded swing target … the target height follows the foot". This was designed so that the hold never presses a resting foot.
- The leg frame's height is min(posture target, actual pelvis). It is the actual pelvis while the pelvis settles upward from below its target.
- So the rising pelvis carries the zero-load foot up by about 0.5 mm, exactly the touching threshold.
- At 0 cm the pelvis error is about 0.03 mm, nothing rises, and the foot stays TOUCHING (16 / 16).

**Counterfactual** (the lifecycle's own existing diagnostic switch, one at a time):
- `lcFrameH: "target"` (frame fixed at the posture-target height): **no loss of contact; the foot stays TOUCHING** (clearance 0, load 0–0.07 N).
- `"actual"` reproduces the cycling.
- The lifecycle's documentation records that the "target" option was rejected earlier because it lifted the foot when the pelvis was *above* target. **Neither frame choice anchors the foot vertically**: the hold follows whichever way the frame moves.

**Attribution, from all four arms:**
- Spontaneous post-release liftoff is **pre-existing**. It occurs whenever release happens while the pelvis is still settling: original 2 / 16 at 1 cm, B1-only 2 / 16 at 2–3 cm, B3-only 7 / 16 at 1 cm.
- **B1B3 makes it systematic** (16 / 16 at every drop ≥ 1 cm). B3's clamp engages abruptly at the loadOff crossing, so release happens at the earliest possible instant (6.47 s), before the pelvis has settled. B1 alone releases later (6.55–8.56 s) and smoothly.
- The **A4 displacements** (0.4–1.7 mm) occur only in the arms with B3 (and in the original arm at 1 cm). The B1-only and original arms at the other drops stay at 0.0–0.4 mm. They are associated with the same abrupt, early release.

## 6. Adoption, E1a, G0–G3

**B1 + B3 not adopted** (prereg §5 requires V1, V2 and V3 to pass).
- No configuration-B addendum was written, the E1a harness was not changed, and E1a was not rerun.
- **E1a with configuration B would fail again at the unload step.** Its pre-lift phase is identical to the B1B3 zero-share 2.5 cm runs (A7 proves the harness equivalence). In those runs the foot is TOUCHING only from 6.58 to 6.98 s and then cycles TOUCHDOWN / AIRBORNE. E1a's unload condition (TOUCHING continuously ≥ 0.5 s from t ≥ 7 s) is never met.

**G0–G3 (V3) not run** (stop rule).
- **Known:** with the flags off, the default path is bit-identical (KV0 4 / 4), the suite passes 56 / 56, and `guard_v1` is OK. G1 contains no controller, so B1 / B3 cannot affect it.
- **Not known:** the G2 / G3 effect of B1 (stance knees and the **elbows**) and of B3.

## 7. The smallest unresolved blocker now

**Post-release vertical hold of a touching, unloaded foot.**
- After release, the TOUCHING hold has no vertical anchor, so post-transfer pelvis motion (D-3) lifts the foot through the 0.5 mm contact definition. The result is spontaneous liftoff and TOUCHDOWN ↔ AIRBORNE cycling with no lift command.
- It is pre-existing.
- It is made systematic by B3's abrupt engagement and the resulting early release.

**Alternatives** (all need your approval; none applied):

| | option | assessment |
|---|---|---|
| H1 | **Give the contact hold a vertical reference to the turf** (e.g. the contact anchor's height, force-limited so it never presses, or a small bounded seating force), with its own preregistered validation | Addresses the defect itself, which also exists without B1 / B3. Must avoid the documented failure modes of both earlier frame choices. Lifecycle design work |
| H2 | **Revise B3 to engage continuously** (no step at loadOff), e.g. cap the commanded share at the request with a continuous blend as the request approaches loadOff | Removes the abrupt release and the A4 displacements. Requires a physically justified blend, not one fitted to this dataset |
| H3 | **Keep B1, drop B3** | B1 alone releases on every body at every drop (6.55–8.56 s; displacement ≤ 0.38 mm), but still cycles in 2 / 16 at 2–3 cm because of the same hold defect. Not preregistered as a candidate; would need its own qualification |
| H4 | Reduce the slow post-transfer pelvis settling (D-3) | Treats the trigger, not the missing vertical reference |

**Recommendation:**
1. **H1 is required whatever happens to B3.** A released foot must stay on the turf until a lift is commanded.
2. Pair it with **H2** (or H3), preregistered in one validation.
3. **Keep B1:** it is a verified fix of a genuine controller bug and also affects stance accuracy generally (subject to the V3 regression, which should run with whichever revised candidate is chosen).
4. E1a remains blocked until then. E1b stays unauthorised.

## 8. Debt (carried; updated)

- **D-2** posture-authority withdrawal: unchanged.
- **D-3** slow pelvis settling: **now directly implicated** as the trigger of the post-release liftoff.
- **TD-16** hip combined end-range review: unchanged.
- **Elbow:** B1 corrects the elbow's locked-axis mapping too (bench verified). Its G2 / G3 consequences are untested because V3 was not run.
- **New: B3 boundary discontinuity.** The clamp engages with a step of about 1–1.5 % BW in commanded foot force when the request crosses loadOff.
- **New: TOUCHING-hold vertical anchoring** (the blocker above).
