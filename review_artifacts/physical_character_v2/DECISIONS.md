# Physical Character V2: decision record

## 2026-10-02: specification approved, G0 authorised

Source: `sources/2026-10-02_user_decision_v2_approved_build_g0.md` (verbatim).

| # | decision (spec §24.1) | resolution |
|---|---|---|
| D1 | Baseline body | **APPROVED:** 1.82 m / 78 kg as the reference / generated baseline, not a universal player size. The parameterised height / weight architecture is preserved. The V1-matched 1.90 / 78 instance is kept for comparisons. |
| D2 | Core 14 bodies; H / F1 as leaf extensions | **APPROVED** (core topology for G0) |
| D3 | Knee axial rotation, forearm pronation / supination | **APPROVED** (as written) |
| D4 | V2-F0 rigid boot foot | **APPROVED.** No physical forefoot yet. The render foot → toe hierarchy is kept. The forefoot capability test before running / sprinting is preserved: articulation must earn promotion from measured need. |
| D5 | Coordinate contract (left-handed, Unity numeric) + chirality test | **APPROVED** (as written) |
| D6 | V2 branch from the V1 freeze tag | **APPROVED** (as written; done) |
| D7 | 22-player runtime: browser WASM vs native / server Jolt | **DEFERRED: unresolved production-architecture decision.** It must not block G0 / G1. |
| D8 | Body damping 0, optional explicit aero drag | **APPROVED** (as written) |
| D9 | Equipment mass included | **APPROVED** (as written) |
| D10 | Athlete strength evidence | **APPROVED** where supported by the cited literature, with provenance preserved. Motors are never run continuously at maximum voluntary torque. The actuator architecture keeps velocity-dependent capability and activation behaviour. |

**Standing rule:** if implementing G0 exposes a concrete contradiction in the specification, STOP and report. Never change the specification silently.

## 2026-10-02 — V2-G0 built and validated; STOPPED on two specification contradictions (decisions pending)

See `g0/G0_REPORT.md` §2. Nothing was changed in the specification to make these pass.

| # | contradiction | recommended resolution (awaiting the user) |
|---|---|---|
| C1 | Head sphere r = 0.0525 H is +15.5 mm outside the head-breadth tolerance (§15.1: −15…+5 mm) while inside it for head length; no sphere satisfies both | replace with an AP capsule r = 0.044 H, cylinder half-length 0.013 H |
| C2 | §22 0.12 applies population COM / inertia bands to the ±2 SD proportion variants; the short-legged body (correctly) falls outside | apply population bands to population-proportion bodies only; check variants for internal consistency |

## 2026-10-02 — C1 and C2 RESOLVED (user decision; source `sources/2026-10-02_user_decision_g0_resolutions_c1_c2.md`)

**C1 — head collider: APPROVED front-to-back (AP) capsule.**
- **Change:** r = head breadth / 2 = 0.044 H; cylinder half-length = (head length − head breadth) / 2 = 0.013 H; axis anterior–posterior. ANSUR II head length 0.114 H, breadth 0.088 H.
- **Reason:** the physical head must represent the head's different anatomical length and breadth while staying inside the existing approved head tolerance (§15.1: −15…+5 mm). The original sphere (r 0.0525 H) was −8.2 mm vs head length but +15.5 mm vs head breadth, and no sphere can satisfy both. **The tolerance was not widened.**
- **Placement:** the capsule takes the original sphere's placement RULE (top 0.005 H below the vertex, AP centre +0.0055 H), not its old centre point. Keeping the old centre with r = 0.044 H would have dropped the head top 24.6 mm below the vertex, failing G0 0.6d.
- **Unchanged:** head mass and inertia (colliders never contribute mass).
- **Amended:** spec §11 body table, §15.2, §15.5, §18; calc/v2_spec.py; PHYSICAL_CHARACTER_V2_SPEC.json.

**C2 — population bands vs morphology variants: APPROVED, made explicit (spec §22 0.4 / 0.5 / 0.12 amended).**
- **Two kinds of body, never mixed.** Every variation-set body carries `kind`.
- **`population`** (normally proportioned population / reference bodies: V2-REF, the stature / mass series, V1-matched):
  - must pass every G0 criterion, INCLUDING the population COM band (0.4a) and inertia band (0.5).
- **`morphology-variant`** (deliberately extreme morphology / stress tests, e.g. ±2 SD leg length):
  - population bands do NOT apply; their COM and inertia are reported (0.4a-R, 0.5-R, report-only);
  - they must pass their own internal-consistency checks:
    - requested morphology realised exactly (0.4c);
    - total mass (0.2a) and segment mass allocation (0.2b, 0.2c);
    - COM / inertia calculation consistency, spec composition vs independent recomposition from the engine readback (0.5b);
    - bilateral geometry where intended (0.8c);
    - valid joints and colliders (0.6–0.11);
    - deterministic construction (0.1, 0.1b).
- **Why:** a population-mean band cannot be a pass criterion for a body deliberately built 2 SD from the mean. The test must never be ambiguous about which bodies it bands.

## 2026-10-03: V2-G0 visually approved, V2-G1 built; G1 STOPPED (decisions pending)

Source: `sources/2026-10-02_user_decision_g0_approved_build_g1.md` (verbatim). G1 criteria were pre-registered in `g1/G1_CRITERIA.md` (commit 5e4548d) before the final run. Full evidence is in `g1/G1_REPORT.md` and `g1/G1_TABLES.md`.

**G1-D1: G0 construction defect found and FIXED (defect policy: an unambiguous implementation defect).**
- **Defect:** the Jolt adapter built every body with `mApplyGyroscopicForce = false` (the Jolt default).
  - Jolt then keeps a free body's angular velocity constant instead of its angular momentum, so Euler's rigid-body equations are violated.
  - Demonstrated on a single free asymmetric rigid body: |ΔL|/|L| = 1.53 over 2 s without the term, 2.5e-3 with it.
  - On the V2 isolated test, angular-momentum drift falls from 1.4e-2 to 2.9e-3.
- **Fix:** `core/v2_jolt.js` sets `mApplyGyroscopicForce = true` (G0_WORLD.gyroscopic).
  - No anatomical or specification value changed.
  - G0 was rerun: PASS, every spec / engine-state / readback hash and every check value identical.
- **Also added to the adapter (G0 never calls them, G0 hashes identical):**
  - the approved per-sub-shape friction policy of §15.4 (G0 used a flat 0.5 and never exercised friction);
  - contact facts per manifold;
  - drive access for the passive layer;
  - snapshot / restore;
  - diagnostic-only switches (CCD mode, warm start, contact cache, manifold reduction, turf shape, slop / speculative overrides), all defaulting to the approved settings.

**G1 decisions needed (nothing below has been applied) — RESOLVED by the user 2026-10-03 (C1–C7, below):**

| # | finding (demonstrated) | spec items involved | recommendation |
|---|---|---|---|
| G1-C1 | **Solver budget.** None of 10/15/20/30 velocity iterations passes (1.5). At impacts, Jolt's constraint warm-starting re-applies the previous step's impulses and injects up to 42–54 J in one step (30 it). Warm-start off removes it but doubles joint separation. **60 iterations removes it**, at +10–20 % cost. | §22 1.5 (iteration set), §19 | Admit 60 velocity iterations as the G1 reference |
| G1-C2 | **Engine hard stops.** In violent passive collapses (standing collapse, leans, 1 m drop) knees, ankles and the spine reach the rigid engine stops. Jolt's rigid-limit correction then injects 1–5 J per step and overshoots 3–6.6° (60 it). Widening the stops 20° (passive law unchanged) removes the injection, but joints then travel 12.7° past the anatomical hard limit. Jolt SixDOF has no soft rotation limits. | §13.1.4 (hard-stop placement), §13.3, §22 1.2 / 1.3 | Your choice: (a) keep rigid stops at the anatomical extreme and judge hard-stop engagement by a bounded per-event criterion; or (b) add a stiff end-stop term to the passive potential between the anatomical hard limit and an engine stop moved a few degrees outward |
| G1-C3 | **Boot contact.** Jolt builds each manifold from one supporting face. When the approved single-hull boot rolls onto an edge, the deepest vertex sits on another face and gets no contact point. The body-pair contact cache and manifold reduction make it worse, so the boot edge sinks 12–31 mm. | §12.2 (single convex hull), §15.4, §22 1.4 | Split the hull into 2 convex pieces (identical outer surface) and turn manifold reduction and the pair cache off. Measured: 23–31 mm → 10–13 mm, still above 10 mm in some standing falls. |
| G1-C4 | **Head contact.** For the approved AP capsule (short segment, large radius), Jolt's capsule face heuristic (cCapsuleProjectionSlop) contacts the turf on the cylinder side line while the end cap rests up to 7.5 mm deep. The head also rolls slowly before settling. | C1 (approved head capsule), §22 1.4 | Represent the head as two spheres of the capsule radius at the segment ends: identical AP extent and breadth, a 3.7 mm waist inside the head tolerance. Measured resting head sink 7.2 → 0.5 mm. |
| G1-C5 | **Slop vs rest.** Penetration slop 5 mm (§15.4) means Jolt never corrects the last 5 mm of a contact, so any contact that once went deeper rests at about 5 mm. That contradicts turf ≤ 3 mm at rest and self "0" at rest (1.4). Slop 2 mm measured worse in transients. | §15.4, §22 1.4 | Rest criteria = the slop (turf ≤ 5 mm, self ≤ 5 mm); keep slop 5 mm |
| G1-C6 | **Momentum precision.** The pinned build is float32. Jolt's gyroscopic step is first-order and its angular error is set by the single-body floor. Measured: linear 4–6e-6, angular 2.9e-3; a single free rigid body has a 2.5e-3 floor. | §22 1.1 (1e-6) | Tolerances at the engine floor: linear ≤ 2e-5, angular ≤ 5e-3 over 2 s. Keep 1e-6 for a future double-precision native build. |
| G1-C7 | **15 m/s first touch.** Discrete contact: first touch 48 mm. 720 Hz physics: 0.3 mm. CCD on every body breaks joints (separation 26 mm). Distal-only CCD does not help. A 0.065 m speculative distance fixes first touch but makes bodies rest 30 mm deep. | §19 (240 Hz), §22 1.4 | Your choice: 720 Hz physics (about 3× cost), or re-scope 1.4's 15 m/s criterion to "no tunnelling" for whole-body impacts at 240 Hz and keep the 3 mm first-touch requirement for the ball's CCD gate |

Observation, not a decision: with the knee straight, the coupled hamstring resistance at 100° hip flexion is only 0.93 N·m. The end-range law spreads 25 % of capacity over the 80°→140° range. A future evidence-based passive fit should check this; nothing was tuned.

## 2026-10-03 — C1–C7 applied; G1 rerun under the autonomous instruction; G1 NOT YET PASSED (4 decisions: D1–D4)

Sources (verbatim):
- `sources/2026-10-03_user_decision_g1_c1_c7.md`
- `sources/2026-10-03_user_instruction_autonomous_g1.md`

Criteria v2 were pre-registered in `g1/G1_CRITERIA.md` and committed before the final evidence run. Evidence:
- `g1/G1_REPORT.md`
- `g1/G1_TABLES.md`
- `g1/json/g1_results.json`
- `g1/json/boot_face_model.json`
- `calc/boot_face_model.py`

### C1–C7: how each decision was applied, and what changed in the criteria

| # | decision | applied as | criterion change and measured justification |
|---|---|---|---|
| C1 | 60 velocity iterations is the validation baseline | `G1_WORLD.velSteps = 60`. Every phase runs at 60. | 1.5 becomes a report: the spec set 10/15/20/30 is still measured. **Measured (final run): none of 10/15/20/30 passes with 2× margin.** |
| C2 | anatomical end-stop with measured per-joint margins; ROM not redefined | **End-stop:** `PASSIVE.endStopDeg 3`, `endStopTorqueFrac 1.0`. The passive potential adds a linear spring beyond the anatomical hard limit, reaching 100 % of opposing capacity 3° past it. **Margins:** the Jolt stop sits at anatomical ± `ENGINE_MARGIN`, measured by `tools/g1_margins.js`. The procedure: Jolt stops 40° out of the way, the V2-REF scenario envelope at the baseline (impact15 excluded), and a 2/5/10 rad/s rig. Rule: max(2°, ⌈1.5 × overshoot + 1°⌉). **Re-measured three times**, because the passive drive changed (G1-D5 … D8). The installed table is the third measurement. | 1.3b: was "hard-limit excursion ≤ 3°"; now "the emergency stop is never reached (0 ticks)", with anatomical overshoot reported. 1.3d (≤ 0.5° beyond the anatomical hard limit at rest) is unchanged. **Why:** with the end-stop the anatomical limit is a soft passive boundary, so the rigid Jolt stop is a numerical safety net (G1-C2). |
| C3 | do not adopt the split boot without a contact-manifold experiment; stop if foot geometry would change | **Experiment:** `tools/g1_boot.js`, 3 representations × 5 settings × (8 loaded-boot rig cases + 11 full-body falls), `g1/json/g1_boot.json`. **Adopted** as the experiment's best (identical external geometry): R2 (two convex pieces, rear / front at 55 %) + S3 (manifold reduction off, pair cache off). It dominates R1 on every boot metric: falls 34–40 → 10.7 mm transient; toe loading 24.1 → 3.6 mm. It does not pass 1.4a everywhere. **Root cause found afterwards: decision D1.** **Correction:** the rig's edge and toe cases are not resting tests. A loaded boot rolled 20° with its COM 19 cm up tips over, and is still moving in the "settled" window (0.5 m/s, 4 rad/s) in every representation. Their "settled" values are end states, not rest. | none |
| C4 | two-sphere head; rerun G0 | `spec/v2_colliders.js`: r 0.044 H at ±0.013 H AP. G0 rerun: PASS, 8/8 bodies. | none |
| C5 | resting tolerance = the 5 mm slop; separate metrics | 1.4a (turf, transient) and 1.4b (turf at rest ≤ 5 mm); 1.4d (self, transient) and 1.4e (self at rest ≤ 5 mm); 1.4c (disabled pairs); 1.4i (new: unintended initial interpenetration ≤ 1 mm). | 1.4b "≤ 3 mm" and 1.4e "0" → 5 mm. **Why:** Jolt never corrects the last slop (§15.4 value 0.005 m). Measured resting contacts settle at 4.7–5.0 mm, so the old values contradicted the approved contact configuration (G1-C5). |
| C6 | floor-based momentum tolerances if the free-body tests support them; keep raw values | 1.1a ≤ 2e-5 linear, 1.1b ≤ 5e-3 angular. Raw values are reported, plus the free-body floor table (row 1.1f). | **Free-body floor:** one rigid body, no constraints, no contact, float32, gyroscopic on, 240 Hz, 2 s. Angular 1.5e-3 at 1 rad/s, 5.6e-3 at 3 rad/s, 1.3e-2 at 6 rad/s; linear 0. **Multi-body isolated test:** linear ≈ 6e-6, angular 2.85e-3 at a peak body ω of 4.4 rad/s. The floor is speed-dependent, so 5e-3 is supported for the isolated test as run. A faster isolated test would need a speed-scaled bound. |
| C7 | no global 720 Hz, no indiscriminate CCD; a credible no-tunnelling envelope; keep 240 Hz; ball separately | **impact15** (15 m/s whole body) is the EXTREME test: HS.1–HS.4 + 1.R, with first touch (1.4g) reported. **Envelope:** 8 scenarios (`HS_ORDER`): dive, side fall, head-first, 15 m/s drop, kick into the turf, kick into a shin proxy at about 20 m/s, goal-post impact, leg into leg at about 20 m/s. Checks: finite, no missed turf collision, no tunnelling / missed limb collision (exact geometry), no catastrophic joint failure. **The ball** is deferred to its own gate. | 1.4g → report for impact15; the envelope (7.HS) is added. |

### G1 causal fixes (demonstrated defects, fixed under the autonomous instruction; nothing anatomical, no criterion)

Each fix states its causal chain, the controlled experiment and the re-check. All are in `sim/v2_passive.js` or `core/v2_jolt.js`.

- **G1-D2: predictive linearisation.**
  - **Chain:** linearising the end-range law at the start of the step let a joint cross into the stiff end-stop within one step for free. Measured: thoracic U +9.2 J in one step, net +1.1 J.
  - **Fix:** linearise at the predicted rotation q0·exp(ω·dt).
- **G1-D3: one-sided restoring limits.**
  - **Chain:** the linear model can pull a joint toward its stop when the joint moves back out further than predicted.
  - **Fix:** the drive may restore with the full law but carries at most the damper in the other direction. Restoring sign from the active end. (Refined by G1-D8.)
- **G1-D4: chord slope when compressing, both slopes anchored at the predicted point.**
  - **Chain:** the end-range law is convex, so a tangent under-resists a joint moving deeper. Measured: knee drive work −0.86 J against ΔU +1.52 J in one step.
  - **Fix:** chord slope when compressing, tangent when releasing. A first version anchored the chord at the current point; that created a hysteresis loop with the biarticular cross torques, pumping about 15 mW into a shank limit cycle (upright, 6–12 s). Anchoring both slopes at the predicted point removed it.
- **G1-D5: drive rows on the LOCKED axis of the knee and elbow.**
  - **Chain:** when a 2-DOF joint is twisted by t, its swing DOF moves about (0, cos t, −sin t) in body-2 axes. With no row on the locked axis, only cos²t of the end-range torque and of the swing damping was applied. Measured: perturb knee_R at −37° rotation, drive work −0.88 J against ΔU +1.50 J in one step.
  - **Fix:** every joint with passive tissue drives all three body-2 rows. The component along the locked direction is absorbed by the lock.
- **G1-D6: Jolt clamps drive targets (engine-interface defect).**
  - **Chain:** `SixDOFConstraint::SetTargetOrientationCS` clamps the target onto the joint limits (`ClampSwingTwist`: locked axes → 0, limited axes → inside the engine stop). The passive offset written into the target was therefore silently replaced. Measured on a −30°-twisted knee: intended (0, −7.2, −12.4)°, applied (5.5, 10.9, 7.0)°. The knee motor sat at its torque bound at 200 iterations, so this was not solver convergence.
  - **Fix:** the target is the current rotation. The stored target and Jolt's own constraint-space rotation are read back to get Jolt's exact error C. The offset goes into the target angular velocity, ω_t = k·(δ + C)/(c + dt·k), which Jolt never clamps; Jolt's converged motor law (SpringPart / AngleConstraintPart source) is then exactly λ/dt = k·δ − (c + dt·k)·Jv.
  - **Verified:** λ/dt equals the intended law within 1.3e-3 N·m (twisted knee) and 4e-11 N·m (pronated elbow). perturb's energy rise above its running minimum after first contact: 0.785 → 0.006 J.
- **G1-D7: chord cap.**
  - **Chain:** the per-row chord Δτᵢ/φᵢ blows up when a row barely moves while a coupled row compresses. Measured: knee z-row K = 1.1e5 N·m/rad, torque −1039 N·m.
  - **Fix:** the chord is capped by the largest tangent stiffness of any term the row moves. For a convex law the secant never exceeds the tangent at the deeper end.
- **G1-D8: the one-sided limit never cuts the law torque.**
  - **Chain:** at a large combined swing with two active ends and a non-diagonal Jacobian, the end-sign rule contradicted the gradient on a row. Measured: drop1m, hip_R at θcs (48, 74, −53)°: gradient +28.2 N·m on y, clamped to 0.4 N·m. The applied torque was no longer −∇U and injected about 17 W for 0.12 s (+1.25 J).
  - **Fix:** the bounds always admit the law torque τᵢ, and the explicit remainder is never zeroed. The rule still cuts the linear model's extrapolation toward the stop.
  - **Rejected alternatives (measured):**
    - restoring sign = sign(τᵢ): unstable; the ankle / knee chattered at the step rate, leanF +28 J;
    - one-sided only where both signs agree: joints reach the engine stop in upright / leanL / leanR.
- **Adapter bug (fixed):** undefined config values overrode the defaults. That would have re-enabled manifold reduction in some diagnostics. They are now filtered.
- **Rejected earlier (measured, kept as negative results):**
  - the "armed" stop: it cancelled the law torque inside the limit (upright +2.98 J);
  - contact-only warm start off: dropA fixed, the suite worse;
  - joint-only warm start off: dropA 0.10 J, but leanF +1.56 J, 5.4 mm separation, 5.1 mm resting self-contact;
  - constraint solve order (priorities): no effect on dropA;
  - 2 → 4 or 8 position iterations: no effect on the boot sink, which is not a solver effect.

### Check clarifications (measurement only)

- 1.4f counts only touching points (separation ≤ 1 mm). Speculative points are not touches.
- impact15 runs 10 s, like every fall. At 6 s it was still settling; at 10 s it is at rest.

### Result of the final evidence run (2026-10-03, pre-registered criteria v2)

**G1 NOT YET PASSED**, with 4 failing gate rows.

| result | rows |
|---|---|
| **FAIL** | 1.S: V2-REF 10/17 scenarios |
| **FAIL** | 1.S′: V1-matched 12/17 |
| **FAIL** | 6: variants 31/40 |
| **FAIL** | 8: timestep |
| **PASS** | 1.6a / 1.6b: determinism ×3 across two processes, 17/17, and snapshot / restore 4/4 |
| **PASS** | 5 / 5c: passive rig 34/34 and couplings |
| **PASS** | 7.HS: C7 envelope 8/8 |
| **PASS** | V1 frozen |
| **PASS** | Jolt build |

Every remaining failure traces to one of the causes D1–D4 below. Evidence: `g1/G1_REPORT.md` and `g1/G1_TABLES.md` (§ 1, 2, 7, 9, 13, 16, 17, 18).

### Decisions needed (nothing below has been applied)

| # | demonstrated cause | gate failures it explains | options (measured) | recommendation |
|---|---|---|---|---|
| **D1** | **Boot contact generation.** See the detail below the table. | V2-REF: leanB, leanL, singleLeg, shoulderFirst (1.4a); singleLeg, awkward (1.4b); perturb forearm-into-boot 24.5 mm (1.4d). V1-matched: perturb, singleLeg (1.4a). Long-legs: leanL (1.4a). | **(a)** The identical hull as 10 convex pieces (AP 5 × ML 2) with S3 (reduction off, cache off).<br>• model: max miss 1.2 mm;<br>• Jolt held sweep: max 4.1 mm;<br>• falls: turf ≤ 6.8 / 2.7 mm;<br>• physics +19 % (0.204 vs 0.171 ms/tick);<br>• more contact points, so the impact rebound grows at 60 iterations (2.6 J; needs D2);<br>• with Jolt's default contact settings, many-piece boots are unusable (12 pieces explode in falls);<br>• **in the 20 m/s kick-into-shin envelope test the thinner pieces miss contact for 3 steps (HS.3), where the 2-piece boot misses none.**<br>**(b)** Keep 2 pieces and accept edge sinks up to about 15 mm (a criterion change; not supported by any floor).<br>**(c)** Change the boot geometry (not evaluated; out of authority). | **(a)**. Then decide whether the shin-kick miss is acceptable or should be mitigated, for example with a 12-piece boot, which was not run in the envelope. |
| **D2** | **Impact solver budget.** At 60 velocity iterations, warm-started impulses at a hard impact are not converged within the step and rebound. | dropA on V2-REF and V1-matched (1.2a / 1.2b: 0.72 / 0.73 J). | **(a)** 150 velocity iterations as the validation baseline.<br>• clean in every tested case: DX-150 worst rise 0.04 J; the candidate shows no gated energy failure on any body;<br>• physics +55 % (0.266 vs 0.171 ms/tick); 22 players: 2.25 vs 1.75 CPU s per simulated s, or 2.36 with D1.<br>**(b)** Warm start off: the rebound is gone, but rest and turf criteria get worse (DX-W0: 7/15).<br>**(c)** Keep 60 and change 1.2a / b. Not justified: this is a budget limit, not a numerical floor. | **(a)** |
| **D3** | **End-stop compliance** (the [ENG] value chosen when implementing C2). See the detail below the table. | Variants and V1-matched: 1.3b (engine-stop ticks; for example long-legs awkward elbow 114, 198-92 elbow 29–30, shoulder abduction 4–33). V1-matched singleLeg: 1.3d. Timestep: other-rate engine ticks. | **(a)** Keep the 3° stop. Measure the emergency-stop margins over the whole validation set (every body, every rate, the envelope): 1.3b then holds by construction, with no independent hold-out. Tie 1.3d to the end-stop's compliance (for example ≤ 1.5°, the deflection at 50 % of capacity). Measured maximum: 1.35°.<br>**(b)** I make the drive carry a stiffer stop, then re-evaluate (engineering work; not ready).<br>**(c)** Keep 1.3b and 1.3d as they are. G1 cannot pass. | **(a)** now; (b) as a later refinement if you want the ROM tighter at rest |
| **D4** | **Test-definition items.** See the list below the table. | 8; 1.4h (V2-165-62); 1.4b (two runs at 5.0007–5.0008 mm); impact15 V1-matched HS.4 (25 mm). | As in each item below. | As in each item below. |

**D1 detail.** Jolt builds each boot manifold from the hull face whose normal best matches the contact. When that face lies within 21 mm of the contact plane, Jolt keeps its points and drops the deepest point (verified in the Jolt 5.6.0 source; reproduced exactly by `calc/boot_face_model.py` and in Jolt). The approved polytope has 27 vertices and long heel-to-toe edges, so the boot misses its deepest point:

| representation | misses > 10 mm | worst miss |
|---|---|---|
| single hull | 1.6 % of orientations | 35 mm |
| adopted 2-piece boot | 1.0 % of orientations | 31 mm |

In Jolt (held sweep, 200 orientations) the worst sink is 14.7 mm for both. Solver iterations do not change it: forks of one identical state give 12.4–12.5 mm at 60–250 velocity / 2–8 position iterations.

**D3 detail.** Loaded joints pass the 3° end-stop by up to 20–25° (knee rotation, neck flexion, elbow). How far depends on the body and the rate, so margins measured on V2-REF do not cover the variants or the other rates. Static loads leave joints resting up to 1.35° past the anatomical limit. A 3× stiffer stop (100 % at 1°) removes both effects, but the implicit drive cannot carry it at 240 Hz: 23–70 J injections, ankle +33 J in one tick.

**D4 items:**
- **(a) Timestep study (8).** At a fixed rate, µm-level initial perturbations move the final COM by up to 0.11 m; the tolerance against 720 Hz is 0.15 m, so the comparison is partly measuring chaos. There are also genuine rate effects:
  - drop1m first-contact timing converges with rate (27.8 / 18 / 8 ms at 180 / 240 / 360 Hz; the limit is 25 ms);
  - leanF at 360 Hz lands supine, where every other rate lands prone.
  - **Recommendation:** keep integrity and timing at every rate, and compare posture / COM against the same-rate perturbation spread.
- **(b) isoSelfCol arm (1.4h).** Within the approved shoulder ROM the arm cannot strike the trunk at speed from the scenario start. Abduction stops it about 4° short; three alternative starts were tested. It passes only by a 0.07 mm graze, and V2-165-62 gets no graze.
  - **Recommendation:** remove the arm part from 1.4h and test arm-into-trunk loading in the envelope, as a fall onto the arm.
- **(c) 1.4b at the slop.** Two rests at 5.0007 / 5.0008 mm (asymptotic convergence to the slop) fail ≤ 5 mm by under 1 µm.
  - **Recommendation:** evaluate "≤ slop" at 0.01 mm precision.
- **(d) impact15.** V1-matched shows a 25 mm transient joint separation, against the 20 mm HS.4 threshold.
  - **Recommendation:** make impact15 report-only. C7 placed 15 m/s whole-body impacts outside the credible envelope, and the envelope passes 8/8.

**If D1a + D2a + D3a + D4 are approved**, the decision candidate (10-piece boot + 150 iterations, its own margins) already passes 63/74 body-scenarios. Its remaining failures:
- 1.3b, which D3a's margin scope removes;
- 1.3d (0.86–1.14°), which is ≤ 1.5° under D3a;
- 1.4h, D4b;
- impact15 HS.4, D4d;
- the shin-kick HS.3 (D1 caveat).

The timestep study has not been run on the candidate.

## 2026-10-03 — D1–D4 APPROVED (user decision; source `sources/2026-10-03_user_decision_g1_d1_d4.md`) and integrated

### How each decision was applied

| # | decision (as approved) | applied as | verification / record |
|---|---|---|---|
| **D1a** | 10-piece decomposition of the exact same approved boot geometry: a collision-manifold representation change, not anatomy | See the detail below the table. | See the detail below the table. |
| **D2a** | 150 velocity iterations is the G1 validation baseline | `gates/v2_g1.js` `G1_WORLD.velSteps = 150`. The iteration study adds 150. | **150 iterations is a validated CORRECTNESS configuration, not the accepted production-performance configuration.** Debt item TD-1. The count is not reduced during G1 for performance. |
| **D3a** | keep the evidence-backed 3° end-stop; reject the 3× stiffer stop; ≤ 1.5° settled excursion as compliance tolerance; ROM unchanged; report actual excursions; emergency-stop margins measured separately | See the detail below the table. | The anatomical ROM is unchanged; the 1.5° is not an anatomical limit. Later active-control gates should normally avoid this region. |
| **D4a** | timestep: compare distributions / spread and invariants; preserve and report genuine rate effects | Each rate scenario runs at every rate as an ensemble of 5 starts (lift 0, ±1 µm, ±10 µm). **Gated:** invariants for every member; no genuine rate effect at 240 Hz. Genuine effects at 180 / 360 Hz are reported. | Definition pre-registered in `g1/G1_CRITERIA.md` v3 |
| **D4b** | remove the arm → trunk requirement where the shoulder ROM prevents the impact; keep leg → leg | 1.4h requires leg ↔ leg; arm ↔ trunk is reported | Measured: the arm stops about 4° short of the trunk on every body. Three alternative starts give at most a 0.3 mm end-range touch. |
| **D4c** | resting ≤ 5 mm with an explicit small numerical comparison tolerance | 1.4b and 1.4e: ≤ 5 mm + 0.01 mm comparison tolerance; the value is reported to 0.1 µm | Measured rests at 5.0007 / 5.0008 mm (asymptotic slop convergence). The physical allowance is unchanged. |
| **D4d** | 15 m/s impact = diagnostic, report-only | impact15: every check evaluated and reported, none gated | Consistent with C7 (realistic-player envelope) |

**D1a detail.**
- **Applied as:**
  - `spec/v2_colliders.js` `splitHullGrid(bootHull, BOOT_GRID)`: AP 0.2/0.4/0.6/0.8 × ML 0.5, 10 pieces of 15–30 points each.
  - Each piece keeps the approved 5 mm convex radius, with Jolt hull tolerance 1e-5 m.
  - Manifold reduction and pair cache stay off.
  - The old 2-piece splitter (`splitHullAP`) is kept for history.
- **Verified against the previous spec on all 8 bodies:**
  - support function of the union vs the approved hull: Δ = 0 in 4000 directions;
  - mass, COM, inertia and ankle origin: Δ = 0;
  - every other body and joint identical;
  - semantic mapping: all 31 bone bindings identical (foot / toe → foot body).
- **New G0 check 0.10e:** 10 pieces, |Δsupport| = 0, Σ piece volume = hull volume to 2e-7.
- **Defect found and fixed while integrating:** with Jolt's default 1 mm hull tolerance, the pieces lost seam-section vertices (Σ volume −0.28 %, slivers of up to 1 mm missing at the internal seams). At a tolerance of 1e-5 the Jolt pieces equal the specified pieces.
- **Cost:** +19 % physics, measured at equal iterations (0.204 vs 0.171 ms/tick lying on the turf).
- **Seam verification:** see `g1/G1_REPORT.md`.
- **Known unresolved issue (debt TD-2):** the shin-kick contact miss. Not solved by distorting the foot or by indiscriminate CCD.

**D3a detail.**
- **Applied as:**
  - `PASSIVE.endStopDeg 3` kept;
  - `TOL.hardRestDeg 1.5` (1.3d), with the actual excursion and joint reported;
  - `tools/g1_margins.js` measures the emergency-stop margins over **the whole validation set** (240 runs: V2-REF and V1-matched all scenarios but impact15; 4 variants × essential; timestep ensembles 4 rates × 5 starts; C7 envelope), using the unchanged rule.
- **Largest overshoots beyond the anatomical limit, with the resulting margins:**

  | joint, direction | overshoot | run | margin |
  |---|---|---|---|
  | neck flexion | 24.5° | drop1m at 720 Hz | 38° |
  | knee rotation | 22.9° | long-legs awkward | 36° |
  | ankle abduction | 16.6° | short-legs awkward | 26° |

- **Rejected (measured):** a 100 %-at-1° stop removes the excursions but injects 23–70 J at 240 Hz (ankle +33 J in one tick).

### Research history: passive-tissue / drive defects found in G1 (permanent record; all fixed; do not remove)

Found by controlled experiments during G1 (2026-10-03). Each is described in full under "G1 causal fixes" above. They stay in the record although corrected.

| id | defect (where) | cause (measured) | fix |
|---|---|---|---|
| G1-D2 | start-of-step linearisation of the end-range law (`sim/v2_passive.js`) | a joint crossed into the stiff end-stop within one step without resistance: thoracic U +9.2 J in one step, net +1.1 J | linearise at the predicted rotation q0·exp(ω·dt) |
| G1-D3 | two-sided linear passive drive | the linear model could pull a joint toward its stop when it moved back out more than predicted | one-sided restoring limit (the damper is allowed both ways) |
| G1-D4 | tangent stiffness when compressing; the first chord was anchored at the current point | the tangent under-resists a convex law (knee drive work −0.86 J vs ΔU +1.52 J); the current-point anchor created a hysteresis limit cycle (about 15 mW, shank) | chord when compressing, tangent when releasing, both anchored at the predicted point |
| G1-D5 | no drive row on the locked axis of the knee and elbow | a twisted 2-DOF joint got only cos²t of its end-range torque and damping (perturb knee −37°: drive work −0.88 J vs ΔU +1.50 J) | every joint with passive tissue drives all three body-2 rows |
| G1-D6 | the passive offset was written into the Jolt drive target (`core/v2_jolt.js`, engine interface) | `SetTargetOrientationCS` clamps targets onto the joint limits (locked axis → 0), silently replacing the offset: intended (0, −7.2, −12.4)°, applied (5.5, 10.9, 7.0)° | target = current rotation; offset carried by the target angular velocity ω_t = k(δ + C)/(c + dt·k) (verified λ/dt = law within 1.3e-3 N·m) |
| G1-D7 | per-row chord stiffness unbounded | a barely-moving row coupled to a compressing one gave K = 1.1e5 N·m/rad (−1039 N·m) | chord capped by the largest coupled tangent stiffness |
| G1-D8 | the one-sided limit could cut the law torque | at a large two-end swing the end-sign rule clamped a real gradient component (hip +28 N·m → 0.4 N·m), injecting about 17 W for 0.12 s | the bounds always admit the law torque |

**Rejected alternatives (negative results, kept):**
- the armed stop (+2.98 J);
- the torque-sign one-sided rule (step-rate chatter, +28 J);
- the hybrid rule (engine-stop contacts);
- the 3× stiffer end-stop (23–70 J).

### Technical-debt register (opened by D1a / D2a; status at G1)

| id | item | evidence | next step |
|---|---|---|---|
| **TD-1** | **150 velocity iterations is a correctness configuration, not a production one** | physics 0.266 vs 0.171 ms/tick at 60 iterations (2-piece boot); the cost of the adopted configuration is measured in the G1 report | Determine whether equivalent correctness (no false hard-landing rebound) can be obtained more cheaply: solver / substep / contact / constraint configuration (for example impact-aware warm-start handling, island velocity-step overrides, sub-stepping only on impact steps) or the eventual native physics path. Do not lower iterations without that evidence. |
| **TD-2** | **High-speed compound-foot contact** | the 10-piece boot misses contact steps against a static shin proxy at about 20 m/s (HS.3k); the 2-piece boot missed none | Investigate a targeted remedy for high-speed limb-on-limb contact without distorting foot geometry and without indiscriminate CCD (for example per-body speculative distance at speed, or distal-only motion-quality changes in a controlled experiment). Belongs to a later contact / tackle gate. |
| TD-3 | Passive-layer JavaScript cost | about 0.16 ms/tick per player, now the largest single cost | Vectorise / port with the runtime; no behaviour change |
| TD-4 | End-stop stiffness is bounded by the implicit drive at 240 Hz | the 1° stop injects 23–70 J | Only if a tighter settled ROM is wanted later: drive work, then re-measure |

### Result after D1–D4 (2026-10-03): **G1 PASS** (criteria v3 + the post-run v3.1 correction of row 8)

**Every gate row passes:**
- V2-REF 17/17, V1-matched 17/17, variants 40/40;
- determinism 17/17, snapshot 4/4, browser = Node 10/10;
- rig 34/34, couplings, C7 envelope 8/8;
- timestep (v3.1).

**Over all gated runs:**
- largest step energy rise 0.000 J;
- joint separation ≤ 4.88 mm;
- turf ≤ 6.9 / 2.68 mm (transient / rest);
- emergency-stop ticks 0;
- largest settled excursion 1.32° (V2-198-92 upright, shoulder flexion).

**Cost:** 0.458 ms/tick per player (2.42 CPU s per simulated s for 22 players), against 0.330 / 1.74 for the previous baseline. Full evidence: `g1/G1_REPORT.md`.

**Row 8, v3 vs v3.1 (recorded openly).** The pre-registered v3 evaluation failed on two items:
- the leanF landing distribution at 240 Hz vs 720 Hz;
- awkward joint separation at 180 Hz, 5.27–5.43 mm.

Controlled diagnostics:
- **leanF (30 starts per rate):** 240 Hz prone 18 / side 9 / supine 3; 720 Hz supine 29 / side 1. Bistable at both rates, with the rate shifting the odds.
- **awkward:** separation 5.3 / 2.5 / 1.1 / 0.4 mm at 180 / 240 / 360 / 720 Hz. 300 iterations at 180 Hz gives 5.6 mm.

Both are genuine rate effects of the kind D4a orders to be reported. v3.1 applies D4a's text:
- physical invariants gated at every rate;
- first-contact timing gated at 240 Hz;
- landing outcomes and the accuracy at other rates reported.

If v3.1 is not accepted, row 8 is the only open item.

**New debt items:**

| id | item | evidence | next step |
|---|---|---|---|
| TD-5 | Passive fall outcome class is rate-sensitive for bistable falls | leanF: 240 Hz mostly prone, 720 Hz almost always supine | Later fall / recovery gates treat the passive landing class as distributional and rate-sensitive |
| TD-6 | Joint-integrity accuracy below the validation rate | awkward at 180 Hz: 5.3–5.4 mm | Do not run the character below 240 Hz without re-validation |

TD-1 is extended: at 180 Hz, 150 iterations leaves a 0.83 J hard-landing rebound in drop1m.

## 2026-10-03 — Heel-rise investigation ACCEPTED; **V2-G1 ACCEPTED AS PASSED** (user decision; source `sources/2026-10-03_user_decision_g1_heel_rise_accepted_g1_passed.md`)

Before promoting G1, the user ordered a focused investigation of the drop1m heel rise. The instruction is in `sources/2026-10-03_user_instruction_g1_heel_rise_investigation.md`; the report is `g1/heel/HEEL_RISE_REPORT.md` (commit `dd9026a`).

**Finding (accepted):** the heel rise in the passive 1 m feet-first drop is mechanically explained. The collapsing leg transmits energy through the ankle *joint force* into an almost-unloaded foot whose toe stays planted. It is not explained by:
- active or passive ankle propulsion;
- end-stop energy injection;
- hidden support;
- a numerical launch.

**Key evidence**, free rise 0.458–0.679 s, heel 0 → 231 mm:
- **Work on the foot:** the shank force at the ankle supplies +2.75 J. The ankle rows remove −1.03 J (damping only; elastic law 0, stored energy 0, end-stop 0, emergency 0). The turf removes −0.21 J.
- **Unloaded feet:** less than 10 % of body weight until about 0.61 s; the centre of mass falls at 0.85 g.
- **Where the rise stops:** at the torque-free strut pose. The turf force passes 6.8 mm from the ankle at a pitch of 70.2°; the geometric pose for a vertical force is 70.84°.
- **Counterfactuals, all diagnostic and none adopted:**
  - ankle tissue / end-stop / all tissue off: identical until the heel is at 235–238 mm;
  - pose couplings off: bit-identical;
  - foot self-contact off: the rise persists;
  - boot representation: changes the magnitude by about 15 %;
  - 480 / 720 Hz and 300 iterations: free rise 232–236 mm, peak 236–240 mm (converged).

**What the user decided:**
1. **No simulation change** results from this investigation. **Do not tune the body to make this passive fall look more human.**
2. **The 1 m passive feet-first drop is a mechanical stress test of the passive plant, not a target model of a controlled human landing.** The test has no active anticipatory or eccentric landing control and no shoe or midsole compliance: the impact is rigid, with 54 kN in one tick, about 69× body weight. Its collapse is not a realistic human landing animation and must not be judged as one.
3. **The heel-rise investigation is supporting evidence** for the G1 passive-physics validation.
4. **The G1 technical debt is unchanged:** TD-1 … TD-6 as registered above. The investigation's modelling observations do not open new debt items:
   - the late phase after the second impact is rate- and iteration-sensitive (the TD-5 kind);
   - 960 Hz shows a 1.08 J impact-tick energy rise (outside the validated rate set).
5. **V2-G1 is accepted as passed.** This is the PASS as reported in `g1/G1_REPORT.md`, including the v3.1 evaluation of row 8 on which it rests.
6. **G2 is not started.** It waits for the user's explicit instruction. Nothing is pushed.

### Permanent instrumentation (user decision: preserve permanently; do not remove)

The user expects this to be reused for heel strike, toe-off, walking, acceleration, braking, planting, cutting and kicking.

| item | where |
|---|---|
| Heel-rise report | `g1/heel/HEEL_RISE_REPORT.md` |
| Foot / ankle measurement probe (AnkleProbe), measurement only. It provides:<br>• the exact foot contact wrench and centre of pressure;<br>• per-boot-piece contact state, depth and NNLS normal-impulse share;<br>• the ankle torque decomposition (drive applied, elastic law, end-stop part, damping, emergency stop, explicit remainder, contact moment about the ankle);<br>• mid-step work by source (shank point force, ankle rows, turf + self-contact residual), with verified closure | `sandbox/visual/physchar2/gates/v2_g1_ankle.js` |
| Investigation runner: the counterfactual set, whole-body momentum / turf-force / COM / kinetic-energy record, passive energy audit, SVG plots, summary | `sandbox/visual/physchar2/tools/g1_heel.mjs` |
| Diagnostic passive-joint switches `opts.diagJoint = { <joint>: { elastic, stop, damping } }`. Default none; never used by a gate; verified bit-identical when absent | `sandbox/visual/physchar2/sim/v2_passive.js` |
| Viewer probe overlay `?probe=L\|R`: CoP, turf force, CoP → ankle line, boot-piece contacts, readout panel | `sandbox/visual/physchar2/viewer/v2_g1_viewer.js`, `viewer/g1.html` |
| Counterfactual results: V0–V12 time series, summary, plots, stills | `g1/heel/` |

### G1 checkpoint (handoff for G2)

**Gate baseline:**
- Jolt 5.6.0 wasm-compat, 240 Hz;
- 150 velocity iterations, 2 position iterations, warm start on;
- manifold reduction off, pair cache off;
- 10-piece boot (AP 5 × ML 2, hullTol 1e-5);
- 3° end-stop.

**Validation:**
- criteria: `g1/G1_CRITERIA.md` (v3 + v3.1);
- evidence: `g1/G1_REPORT.md`, `g1/G1_TABLES.md`, `g1/json/`;
- supporting investigation: `g1/heel/`;
- research history and the debt register are in this file.

**Reference hashes (V2-REF, curated):**

| scenario | hash |
|---|---|
| upright | `28eaa640` |
| leanF | `de35686e` |
| leanL | `40332389` |
| singleLeg | `5a491ea6` |
| drop1m | `958b785c` |
| sideFirst | `eebe5e01` |
| awkward | `c6cfa410` |
| flatSupine | `003aace3` |
| impact15 | `f4e35f0b` |
| isoSelfCol | `5d464bfe` |

Browser = Node holds for all ten.

**Review:** `python3 -m http.server 8172` from the worktree root, then `http://127.0.0.1:8172/sandbox/visual/physchar2/viewer/g1.html`.

**Standing rules for the next gate:**
- G2 starts only on the user's instruction.
- Every change is justified here.
- The research history and the debt register are never removed.
- Nothing is pushed without approval.

## 2026-10-03 — V2-G2 started (user instruction; source `sources/2026-10-03_user_instruction_g2_active_standing.md`): design decisions and development findings

V1's C1 standing work was studied as evidence only (`g2/V1_C1_STUDY.md`). Nothing below is ported from V1 code. Every mechanism was re-derived and measured on the V2 plant.

**No G0 / G1 plant defect was found.** The plant is unchanged:
- `core/v2_jolt.js` gains an *opt-in* actuator constraint and test-force calls;
- `gates/v2_g1.js` gains an optional scenario object and passes the actuator flag through;
- the default G0 / G1 paths are untouched, and the G1 curated hashes are verified unchanged.

### G2-A1: actuator mechanism (implementation of spec §14)

**Problem:** spec §14 asks for an implicit Jolt motor that solves within the §14 capacity limits, with a ledger that separates active from passive work. The G1 passive tissue already occupies the joint's motor rows. A single row carrying passive + active torque can only be bounded by an *estimate* of the passive part, so the active torque could exceed capacity by that estimate's error.

**Decision:** a **parallel actuator constraint** per joint:
- a SixDOF between the same two bodies, every axis free, rotational motors only;
- on the joint's own ROM-centred frames, so the row axes are identical to the joint's;
- its motor limits are exactly [−τ_cap,−, +τ_cap,+];
- its impulse readback is the exact active torque.

Capacity integrity (2.3) holds by construction, and the ledger is exact. The joint's passive rows (G1) are untouched.

**Verified:**
- the target orientation is stored unclamped (free axes);
- the PD is encoded through the target angular velocity, as in G1;
- cost about +0.3 ms/tick at 150 iterations, i.e. 13 more constraints (reported under TD-1).

**Activation:** an excitation per axis-direction from the PD request, u = min(1, 1.25·|τ_req|/τ_cap + 0.02 tone). Activation follows Thelen 2003 (15 / 50 ms). Limits = a·τ_cap(θ, ω), with Anderson 2007 g_θ for hip / knee / ankle sagittal; ankle plantar-flexion is reduced with knee flexion (Billot 2022); the other axes are flat (spec).

### G2-A2: quiet-stance reference (`ctrl/v2_stance.js`)

**Values:**
- feet under the hips (heel centres 16.6 cm apart at 1.82 m);
- toe-out 7° per foot by hip external rotation (McIlroy & Maki 1997, ≈ 17 cm / 14°, recalled) [H];
- knees 4°, hips 3° [H];
- neutral spine and head [ENG];
- arms hanging, shoulder abduction 6°, elbows 12° [H];
- COM 4 cm anterior of the mid-ankle point (spec 2.1 band 2–6 cm) [H]→[CTRL].

**Solved, not chosen:** ankle DF / inversion for flat feet (residual tilt 1e-14) and the whole-body lean (pelvis pitch ≈ 2.8°, ankle DF ≈ 3.8° at V2-REF) for the COM target, per body.

The pose is a **preference**: the ankles are never posture-servoed, and balance overrides the pose.

### G2-A3: controller architecture (`ctrl/v2_stand.js`)

1. **State** (exact simulation state; the consumed variables are listed in the code, `CONSUMED`): COM, its velocity, height; ξ = c + v/ω0; the foot poses → the measured usable region.
2. **Balance objective:** ξ → ξ_ref.
3. **Desired CoP:** p* = ξ + kξ(ξ − ξ_ref), clamped to the support region.
   - LIPM ground force through the COM.
   - Load split by the lever rule, with each foot's CoP allocated so that the load-weighted CoPs reproduce p*.
   - The CoP actually commanded is the *achievable* one; the residual r = p*_raw − p is reported.
4. **Commands:**
   - feed-forward joint torques from the static equilibrium of each joint's distal subtree, under effective gravity g − A and the desired foot wrenches (inverse statics with d'Alembert terms; for the ankles this *is* the balance torque);
   - plus posture preferences (below).
   - Gains are body-scaled: K = κ·m_sup·g·L, D = 2ζ√(K·m_sup·L²).

### G2-A4: the controllable CoP region is measured, not assumed

**Method:** slow (1 cm/s) ramps of the balance target in 8 directions on V2-REF (G2 step 2).

**Result:** the onset of foot rotation lies exactly on the edge of the **loaded flat-contact hull** (boot pieces 0–7, Jolt contact points at zero separation):
- forward 13.2 cm ahead of the ankle on the CoP's line; the hull's front edge slants from 11.4 cm laterally to 14.5 cm medially;
- heel −6.1 cm;
- lateral ≈ 3.5 cm at mid-foot under single-foot load.

The toe-spring pieces 8–9 sit 3.5–11 mm above the turf and are **not usable** until the foot pitches. The region used is that hull with a 5 mm control margin [ENG].

**Smoothness:** within the region, the CoP crosses the compound-piece boundaries with no contact-set change and ≤ 2.7 mm per-tick net-CoP change.

### G2-A5: posture preference for the legs (three designs measured)

1. **Joint-space PD toward the fixed reference angles:** **fights lateral balance.** Lateral sway with fixed feet changes the hip abduction angles, so the achieved lateral CoP ran up to 2× past the command, and the unloading foot rolled onto its toe (lean-ramp R / L).
2. **Task-space pelvis wrench through the legs:** fixes (1), but a **lightly loaded leg goes limp** and its foot is dragged (lateral 15 N·s: 31–76 mm slide).
3. **Adopted — "ik":** hips and knees servo toward the leg configuration that keeps each foot where it *is*, with the pelvis at its reference orientation and height and its *current* horizontal position (leg inverse kinematics each tick). Horizontal COM motion belongs to balance alone. The ankles are free.
   - Result: sagittal pushes recover with 0 mm slip.

### G2-A6: minimum foot load share 0.10 in double support

Measured: the ξ law asked for full load transfer under a lateral 15 N·s push. The unloaded foot then lifted 13 mm and moved 75 mm, an *involuntary relocation*.

Each foot now keeps ≥ 10 % of body weight in double support [ENG]. Lateral reach is kept through the per-foot CoP shift.

### G2-A7: DCM gain kξ = 1/3 (human evidence)

The closed-loop ankle stiffness is (1 + kξ)·mgh, so kξ = 1/3 gives **1.33 mgh** (Peterka 2002, ≈ 1.3 mgh; recalled, as cited in V1 C1) and a velocity gain of ≈ 0.43 mgh·s.

Measured on V2-REF (recovered / not, N·s):

| kξ | F | B | L / R | diagonals | recovery time |
|---|---|---|---|---|---|
| 1 | 20 / 25 | 15 / 20 | 15 / 20 (20 slides) | — | 0.35–1.3 s |
| 1/3 | 15 / 20 | 15 / 20 | 20 / 25 | 20–25+ | 1.3–2.2 s |

kξ = 1/3 is adopted: it is human-evidenced and gives the more balanced envelope. Forward capability is lower (the CoP is used less aggressively).

### G2-A8: hip / trunk strategy and arm counter-motion: evaluated, **not adopted** (G2 steps 7–8)

**Hip strategy:** whole-body angular-momentum rate L̇ = M·g·(ŷ × r), applied only on the CoP residual r, through the stance hips, and only through loaded legs (an unloaded hip swept its leg's foot 49 cm).

| variant | effect |
|---|---|
| Continuous | +5 N·s backward, but backward-left 25 recovered → fell. The trunk over-rotated 27–33° and reversed its own gain. |
| Bounded "flywheel" (fades over 10° of pelvis deviation) | no gain anywhere |

**Arm counter-motion** (shoulders, same law, bounded by 60° of arm deviation): **no measurable change** in any direction. Arms do not materially expand the no-step envelope.

The ankle strategy plus load transfer is the minimum mechanism the measurements support. A time-optimal bounded flywheel strategy is future work.

### G2-A9: sensing (report-only)

The controller consumes exact state. V2 specifies no numerical latency or noise.
- 100–150 ms observation latency of the balance state: stable in quiet stance.
- A seeded Ornstein–Uhlenbeck motor-noise torque on the ankles gives human-magnitude COM sway (3–9 mm RMS), but CoP speed 84–253 mm/s at ≈ 3 Hz (human < 1 Hz). It is a crude model, reported but not adopted.
- **Noiseless quiet stance has ≈ 0 sway:** the model has no neural noise.

### Development push boundaries, V2-REF (thorax 100 ms, final configuration)

**V2-REF:** F 15 / 20, B 15 / 20, L = R 20 / 25, FR 20 / 25, BL 25 recovered.

**Physical limits identified:**
- **Forward / backward:** the measured CoP region edge. The thorax push adds about 0.27 m × J of pitch angular momentum; righting the trunk costs ≈ 2 cm of extra CoP excursion.
- **Lateral:** ankle eversion capacity (≈ 35 N·m at full activation) at the foot's outer edge, and the hip abductors' activation rise.

**Variants** scale with size, ≈ constant in Δv = J/M ≈ 0.20–0.24 m/s:
- V2-165-62: F / B fall at 15;
- V2-198-92: recovers 20 in all four directions.

**Other development results:**
- angular impulses ≤ 10 N·m·s (yaw / pitch / roll) recover;
- the 10 initial offsets settle;
- determinism and snapshot / restore are bit-exact;
- controller 0.042 ms mean / 0.157 ms p99 per tick.

These were development measurements. **The gate is judged by `g2/G2_CRITERIA.md` v1 (pre-registered) on the final run.**

### G2-A10: final run 1 → fixes → final run 2 (recorded openly; criteria v1 unchanged)

Run 1 was evaluated against the pre-registered criteria. 11 of 13 rows were evaluable and two failed. Both failures are my implementation errors, not criterion or plant matters. Run 1's checks and tables are kept in `g2/json/run1/`.

1. **2.2b symmetry, V2-190-85:** left 20 N·s, right 25 N·s (at 25 N·s the left run slid 21 mm and the right 19 mm, either side of the 20 mm threshold).
   - **Root cause:** an L/R asymmetry in the controller. The per-foot CoP allocation offered the leftover shift to the left foot first: an index-order dependence, with 10× amplification on a lightly loaded left foot versus 1.1× on a loaded one.
   - **Fix (unambiguous implementation defect):** an order-independent common shift over every foot that can still move toward the target.
2. **F (CoP sweep):** an identical 100.9 mm "jump" in all six sweeps.
   - **Root cause:** the runner's measurement window started at t = 0 (the release-and-settle tick) instead of at the ramp (t = 1 s), which is what the criterion and its development basis cover.
   - **Fix:** the window starts at the ramp.

**Run 2:** the full validation was rerun with the criteria unchanged; **13 / 13 rows pass**.

**Superseded development numbers.** The allocation fix changed the controller, so run 2's report-only evaluation supersedes the development numbers in G2-A7 / A8:
- hip strategy (continuous / bounded) and arm counter-motion: **no boundary change** in any direction;
- kξ = 1: right 25 N·s (gate 20), otherwise identical;
- kξ = 0.5: identical.

kξ = 1/3 is retained as pre-registered (human-evidenced stiffness). The lateral trade-off is listed as an open question.

### G2-A11: result — **V2-G2 PASS** (pre-registered criteria v1, final run 2); STOPPED for review

Full evidence: `g2/G2_REPORT.md`, `g2/G2_TABLES.md`, `g2/json/`.

**Measured no-step boundaries.** Thorax, 100 ms; recovered / not recovered, N·s:

| body | F | B | L = R | FL = FR | BL = BR |
|---|---|---|---|---|---|
| V2-REF | 15 / 20 | 15 / 20 | 20 / 25 | 20 / 25 | 25 / 30 |

Across bodies the sagittal boundary is Δv ≈ 0.20–0.25 m/s in body-normalised units.

**V1 comparison.** At V1's application point (pelvis COM, 50 ms), V2-REF recovers 25 / 30 in every direction; V1 C1 recovered F 60 / 65, B 30 / 35, R 45 / 50. The difference is explained by V1's box boot: toe edge 22 cm vs V2's 9 cm ahead of the COM projection. V1 also had a hip strategy, engine damping and Coulomb joint friction. V2 performs at its own ankle-only ceiling.

**Debt register additions:**

| id | item | evidence | next step |
|---|---|---|---|
| TD-1 (extended) | +13 actuator constraints in the 150-iteration solve | ≈ +0.3 ms per tick single-thread | production-solver study, keeping the exact capacity bound |
| TD-7 | no numerically specified sensing latency / noise model | noiseless sway ≈ 0; a crude motor-noise model gives human sway magnitude but a too-fast CoP | physiological model before sway realism is judged |
| TD-8 | engineering constants in balance | minimum foot share 0.10; CoP margin 5 mm; excitation headroom 25 % / tone 2 %; κ 1.5 / ζ 0.7; ankle damping 2 N·m·s/rad | revisit at G3 (weight transfer requires full unloading) |
| TD-9 | hip / trunk strategy not adopted | no robust gain | time-optimal bounded flywheel if a later gate needs a wider no-step envelope |
| TD-10 | ankle plantar-flexion vs knee flexion | linear from one data point (Billot 2022) | calibrate at the capacity gate |

**Status:**
- **G3 (weight transfer) is not started.** It waits for the user's instruction.
- Nothing pushed.
- Review server :8172, page `viewer/g2.html`.

## 2026-10-03 — **V2-G2 ACCEPTED** (user, in the G3 instruction: "V2-G0, G1 and G2 are accepted"); V2-G3 started (source `sources/2026-10-03_user_instruction_g3_weight_transfer.md`)

- G2 is accepted as reported in `g2/G2_REPORT.md`: final run 2, the pre-registered criteria v1, and the run-1 corrections G2-A10.
- The G2 technical debt (TD-1 extended, TD-7…TD-10) remains open.
- **Open question from G2 (kξ = 1/3 vs 1):** no instruction was given. kξ = 1/3 stays.
- **The G2 controller, actuators and measured CoP region form the G3 baseline.**
- **Spec §22 G3 table vs the user's G3 brief.** The brief governs where they differ:
  - spec 3.3 "lift one foot 5 cm, hold 10 s" is replaced by the brief's near-single-support hold *without* active lifting ("Do not actively lift it yet");
  - spec 3.1 (rates 0.5 / 1.0 / 2.0 s, load tracking RMS, slip ≤ 2 mm), 3.2 (fore–aft transfer), 3.4 (per-foot wrench vs force-plate twin) and 3.5 (perturbed starts) are adopted into the G3 test matrix where consistent with the brief;
  - every threshold is measured first, then pre-registered.

## 2026-10-03 — V2-G3 development: plant characterisation, mechanisms (each with its measured deficiency), evaluations, and one open finding

Everything below was measured on V2-REF with the accepted G2 plant and controller. Each G3 addition is an **option of `ctrl/v2_stand.js`, off by default**. With the options off, the G2 controller is bit-identical: the G2 regression sample stays 38/38 identical after every change, and the final run re-runs all 620 G2 jobs (criteria row P). The G3 configuration is `G3_STAND` in `gates/v2_g3.js`.

### G3-A1: G2 plant characterisation (brief §4), before any change

Method: a slow lateral target ramp (1 cm/s to 11 cm) with the G2 controller and its foot floor set to 0.

| Quantity | Measured |
|---|---|
| Right-foot load vs COM lateral position | Linear: 0.80 at ≈ 7 cm; 1.0 with the COM over the right foot (≈ 9.2 cm) |
| CoP | Tracks the command |
| Pelvis and thorax roll | ≤ 1.5° |
| Stance hip abduction torque | ≈ 75 N·m, i.e. ≈ 41 % of its 183 N·m capacity (spec single-leg estimate ≈ 70 N·m) |
| Stance knee torque | ≈ 18 N·m |

Measured deficiencies of the G2 controller for G3:
- **D1:** the G2 foot floor (minShare 0.10) caps any transfer at 90 %.
- **D2:** once fully unloaded, the left foot lost contact (0/8 pieces), hovered at +4 mm and drifted 23 mm by t ≈ 17.5 s. Its leg IK target is "the foot where it is", so it followed its own drift.
- **D3:** the G2 support polygon still counted the airborne foot.

### G3-A2: transfer request

- λ_R(t) is a min-jerk profile. It sets the balance target's lateral position to the quasi-static COM for that load split: the λ-weighted point between the feet's region centroids.
- The foot floor relaxes to the requested share: min(0.10, λ) and min(0.10, 1 − λ).
- **What measured deficiency required this?** D1.
- The request is an objective only; the physics decides the load. T11 confirms it: λ 1.2 / 1.4 falls.

### G3-A3: contactSupport and holdUnloaded

- **contactSupport:** the support region and load split use only feet with ≥ 1 touching boot piece, sensed each tick from the boot-piece contact probe.
- **holdUnloaded:**
  - Trigger: a foot below 1 % BW is held at the pose it had when it unloaded. It is released above 3 % BW (hysteresis).
  - How it is held: leg IK to that stored pose, plus an ankle PD with the gains of a joint carrying only its distal subtree.
  - What it is not: no new target, no relocation, no lift (brief §2).
- **What measured deficiency required this?** D2 and D3.
- Result: in full unloading (λ = 1.0) the opposite foot carries 0 N, keeps all 8 pieces touching, and moves 0.3 mm.

### G3-A4: DCM reference feed-forward (dcmFF)

- **What measured deficiency required this?** The static-target law lagged a 4 s ramp: load 0.83 at the end of the ramp, tracking RMS 0.128.
- Mechanism: the DCM tracking law for a moving target, p* = ξ + kξ(ξ − ξ_ref) − ξ̇_ref/ω0 with ξ_ref = x_ref + ẋ_ref/ω0. It reduces exactly to G2's law when the target is still.
- **First version: rejected after measurement.**
  - What it did: ẋ_ref and ẍ_ref came from backward differences of the measured target.
  - Why that failed: the target is built from the ankle midpoint and foot heading, so the second difference at 240 Hz amplified sub-millimetre rocking of the barely loaded foot by ≈ 240²/ω0² ≈ 5800.
  - Effect: on the return from the right hold, the load collapsed 0.95 → 0.49 in 0.1 s, the body fell, and pelvis yaw reached −102°.
- **Adopted version:** the rates come analytically from the request: λ̇ and λ̈ times the lateral centroid separation.
- Result: full R/L near-single-support cycle with tracking RMS 0.019; holds 0.954/0.965 (R) and 0.953/0.964 (L).

### G3-A5: ikFeasible (posture IK)

- **What measured deficiency required this?**
  - The geometry: a lateral COM shift of ≥ 7 cm at the fixed G2 pelvis height left both hips ≈ 9 cm lateral of their ankles, which needs ≈ 4.5 mm more leg than the 4° reference knee flexion gives. Newton could not reduce the residual, which grew to 137 mm-equivalent.
  - The failure path: `legIK` returned the current configuration, which made the hip posture error exactly 0.
  - The symptom: the 3.4 N·m hip-rotation feed-forward yawed the pelvis freely, creeping to −9.5° with τ ≈ 1.5 s, then snapping back 14° in 0.4 s when the other foot reloaded.
- Mechanism: the pelvis height target drops to the highest height at which both legs keep their reference hip–ankle length (the pendulum arc of a lateral shift, a few mm).
- Result: IK residual 0 throughout; pelvis yaw ≤ 1.7° and back to 0.1°.

### G3-A6: continue / abort supervisor (brief §17)

- **First rule: rejected after measurement.** "ξ outside the stance foot while |λ − 0.5| > 0.05" fired at the start of every ramp, where ξ is legitimately between the feet. It aborted every perturbation run, even 5 N·s.
- **Adopted rule:**
  - When it applies: only once the stance share is ≥ 0.85, the point from which the plan relies on the stance foot alone.
  - Trigger: the required CoP p* lies more than 1 cm outside the stance foot's region for 20 ms.
  - Response: the request returns to bilateral over 0.6 s, so the other foot reloads.
- **Abort path, measured comparison:**
  - With the planned min-jerk feed-forward, inward pushes slipped: L 15/20/25 slipped 7/11/18 mm; FL 10–20 slipped 6–12 mm.
  - Without it (DCM feedback only), the same cases moved 0–3 mm.
  - The cause: a rest-to-rest plan assumes the COM starts at rest, but on an abort it is already moving.
  - Adopted: **no feed-forward on the abort path**. An immediate target switch measured equivalent (0–4 mm), so it is a parameter variant, not a competing architecture.
- No abort occurs in any unperturbed transfer of ≥ 1 s.

### G3-A7: twist-DOF posture reference (ikRefTwist) — evaluated, **not adopted**

- What it does: the IK solves the knee axial rotation and the passive ankle ab/adduction at their reference values instead of their current ones (null-space posture).
- **Measured worse:** whole-body static yaw stiffness under a constant pelvis torque fell from 2.8 N·m/° bilateral (0.8–1.0 near-single) to 0.1–0.3 N·m/°.
- Why: the hips then hold the legs to the pelvis, so the pelvis rotates with the legs on the passive ankles.
- The G2 form ("current" values) is kept. In it the hips hold pelvis yaw and the legs absorb the twist.

### G3-A8: leg-load gain scheduling (gainSched) — evaluated, **not adopted**

- Leg posture gains scaled by each leg's sensed load share (the G2 law with the actually supported mass) made no measurable improvement: yaw and slip unchanged, tracking RMS 0.019 → 0.022.

### G3-A9: knee, hip and arm strategies (brief §9–10) — evaluated, **not adopted**

- **Knee strategy** (reference knee flexion 10 / 15 / 20°): hold load 0.954 → 0.958–0.962. But an outward 10 N·s push during the hold goes from recovered with slip to a fall. No net benefit.
- **Hip strategy** (bounded 10° and unbounded) and **arm counter-motion:** no outward or AP push boundary extended. Falls show 41–89° trunk lean, and arm counter-motion turns outward 10 N·s from recovered into a fall. This matches G2-A8.
- **Measured need for a new mechanism: none.**
  - Nominal transfers: pelvis roll ≤ 0.5°, trunk lean ≤ 0.5°.
  - The outward-push limit in near-single-support is physical. The capture-point margin inside the stance foot is ≈ 3 cm, so J_max ≈ 0.03 m · M · ω0 ≈ 7.7 N·s. Development grid: 5 recovers, 10 recovers with slip, 15 falls (step required).

### G3-A10: seam audit window

The largest single-tick per-foot CoP jump was 103 mm. It was at t = 0.0125 s, the boots' initial contact settle, identically on both feet. The seam audit therefore starts at t ≥ 0.5 s; G2 used t ≥ 1 s for the same reason. Afterwards, crossings are smooth (≤ 0.13 mm per tick in the cycle test).

### G3-F1 — OPEN FINDING (TD-3, user decision): transverse-plane compliance at the passive ankle ab/adduction

**What it is.** The ankle's foot ab/adduction axis (the foot's vertical axis, `LIMB_DOWN_FRAME` x) is passive-only by approved anatomy.

| Ankle ab/adduction angle | Passive torque (G1 tissue: end-range only, soft range = active ROM ±10°) |
|---|---|
| 0–10° | **0 N·m** |
| 12° | 3.4 N·m |
| 15° (hard limit) | 10 N·m |
| 17° | 29.7 N·m |

No actuator spans that axis; the DF and inversion axes are horizontal for a flat foot. So inside ±10° the leg's axial rotation relative to a planted foot is held only by damping.

**What it causes:**
- In every G3 transfer the legs twist toward the ≈ 10–11° tissue engagement: ±9.7° at mid-ramp in a 4 s ramp, relaxing to ≈ 1.5° while still. The hip rotators counter-rotate ≈ 10°.
- Pelvis yaw stays ≤ 2° in 4 s transfers, because the IK hip targets hold it. It reaches 5.8° at 2 s ramps, 8.3° at 1 s ramps, and 6–8° under pushes.
- A constant yaw torque on the pelvis always settles the ankle at its ≈ 10–11° engagement.

**Not introduced by G3.** The accepted G2 controller shows the same mode under bilateral pushes: ankle ab/adduction excursion 10.5–13.6°, hip rotation ≈ 9°, pelvis yaw up to 6.9°. G2 did not audit this axis.

**Not changed.** Fixing it means changing approved anatomy, passive tissue or actuator capability, so it is reported for the user's decision. Options:
- a load-dependent neutral-zone stiffness for the ankle's axial rotation (the mortise is rotationally stiff when loaded);
- a small foot ab/adduction actuator;
- re-axing the ankle so a 2-DOF talocrural/subtalar model carries no free axial play.

**Why it matters before G4:** single support during a step will load this axis far harder.

### Development measurements of the final G3 configuration (exploratory, pre-registration input)

- **Speed envelope** (λ 0.95, mirror-identical R/L):
  - 4 s and 2 s ramps: clean;
  - 1 s: stands, but the hold lags (0.92);
  - 0.5 s and 0.25 s: fail physically. The ankle inversion actuator reaches 85–88 % of capacity, and the unloading foot slides ≈ 6 mm and tilts 3°.
  - This matches the LIPM limit: a min-jerk 9 cm shift in T needs a CoP offset of ≈ 5.77 · 0.09 / (ω0² T²) ≈ 19 cm at 0.5 s, beyond the support.
- **Perturbation during the near-single-support hold** (thorax, 100 ms, supervised, no abort feed-forward):
  - F / B: 15 recovers, 20 falls. These are the G2 bilateral boundaries, because the stance foot length governs.
  - Outward: 5 recovers, 10 recovers with slip, 15 falls.
  - Inward: recovers up to 25.
- **Full unloading** (λ = 1.0): stance load 0.999, opposite foot 0 N with 8 pieces still touching, held still for 4.3 s; clean return.
- **Body variants:** all 7 non-REF bodies complete the 97 % cycle (hold min 0.948–0.958).
- **Repeated cycles (T4):** pelvis drift 4.0 mm and yaw offset 2.7° after cycle 1, unchanged through cycle 5.
