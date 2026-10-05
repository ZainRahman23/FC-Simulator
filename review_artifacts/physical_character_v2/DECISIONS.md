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

### G3-F1 — OPEN FINDING (TD-11, user decision): transverse-plane compliance at the passive ankle ab/adduction

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

### G3-A11: final run 1 → run 2 (recorded openly; criteria v1 unchanged)

**Run 1 (299 jobs, 0 errors): 11/19 before rows O and P were measured.** Every evaluation is kept in `g3/json/run1/`.
- **Rows A, B, C failed on a measurement artifact.**
  - What happened: on the first physics step after release (t = 0.0042 s), the boot probe's per-piece touch flags lag the contact by one step. Both boots read 0 touching pieces while already carrying 76 N each.
  - Effect: the contact-loss accumulator counted 1 tick (0.00417 s) on one foot in every run. Rows E and F test hold windows, so they were unaffected.
- **Correction (measurement only):** the class, contact-loss and unloaded accumulators start at t ≥ 0.5 s. This is the same window as the seam audit; G2-A10 handled its CoP window the same way.
- **Run 2:** physics hashes 299/299 identical to run 1. Rows A, B and C pass.
- **Genuine misses, unchanged between runs and reported as FAIL (no post-hoc tuning):**
  - **Row I:** V2-short-legs near-single-support min 0.9487 / 0.9483 (< 0.95).
  - **Row J:** Δ slip 0.76 / 0.60 mm (> 0.5) in the two fastest T7 ramps, where a foot slides. The accepted G2 plant shows up to 1.5 mm in mirrored sliding pushes, so the tolerance was set too tight. This is my criterion-design error and is not corrected.
  - **Row S:** controller cost 0.152 ms in run 2, 0.168 ms in run 1 (> 0.15), with 9 processes in parallel.
- **Label correction:** the transverse-plane finding was filed as "TD-3" in the pre-registration commit. TD-3 already exists (passive-layer cost), so the finding is renamed **TD-11** in the criteria, DECISIONS and tables. No criterion changed.

**Minimality finding (report-only ablations).**

| Ablation | Result |
|---|---|
| Final configuration minus **contactSupport** | Bit-identical in T3, T5, U:R and 9 disturbed cases (outward / inward pushes, fast ramps). No foot ever loses contact in G3: even at 0 N the opposite foot keeps all 8 pieces touching. |
| Final configuration minus **holdUnloaded** | Engages (5.6 s in U:R, briefly in outward pushes and fast ramps) but has no material effect. Outward 10 N·s slip 12.8 vs 13.5 mm without, lift 4.7 vs 4.2 mm, tilt 7.7 vs 6.8°. U:R metrics identical. |

- D2 (drift of the unloaded foot) and D3 (airborne foot in the polygon) were measured with the G2 controller *before* D5 (infeasible IK) was found. With ikFeasible, the IK holds the light foot with stiffness, so D2 was most likely a symptom of D5.
- Both options remain in the final-run configuration; nothing was changed after the run.
- **User decision:** remove both and re-run, or keep them as guards for G4, where a foot will leave the turf.

### G3-A12: browser ≠ Node on one scenario — root cause (G2-era controller math), confirmed fix NOT applied; regression comparator bug

**What failed.** Row O: T5, U:R and T3 are bit-identical, but **T8 hold R push R 10 differs** (browser 75d36a75 vs Node 99648bf9). Node is self-consistent: fresh process, pooled workers and ×3 determinism all agree.

**How it was located** (viewer diagnostic `?tickhash=<key>&dump=<n0>-<n1>`):
- The first divergence is at tick 1008 (t = 4.20 s).
- At that tick every body state is bit-identical, but the left-leg IK result differs at 1e-16: residual 1.3887339e-11 vs 1.3887019e-11. The hip / knee commands therefore differ at 1e-13.

**Cause:**
- `ctrl/v2_stand.js` uses `Math.hypot` in the IK residual, the line-search acceptance (`en < err`), `norm2`, the allocation loop and the polygon distance, plus `Math.atan2` for the heading yaw. This is G2-era code; G3's `ikFeasible` adds one more `Math.hypot`.
- JavaScript does not specify either function to be bit-identical across engines. `core/v2_math.js` restricts `Math.*` to measurement / display and provides `dlen` / `datan2` for physics.
- G2's browser check passed 6/6 because its curated set did not hit such an input.

**Confirmed.** A temporary patch replacing the 11 `Math.hypot` and 3 `Math.atan2` calls with deterministic equivalents made browser = Node on all 2880 ticks of the case. The patch was reverted (`ctrl/v2_stand.js` == `871ab62`), and the final-run hashes were re-verified.

**Not applied — user decision.** The fix changes the accepted G2 controller's results at the last-bit level, which means new G2 hashes, a G2 re-validation and a G3 run 3. **Recommended before G4.**

**Regression comparator bug.** The G3 regression script first read G2's 3 snapshot jobs, stored as top-level `hashA` / `hashB` / `exact`, as missing hashes and reported 617/620. Compared on the right fields, the result is **620/620 identical**. The script is fixed, and the note is kept in `g3/json/g3_regression.json`.

### G3 result (final run 2): **V2-G3 NOT PASSED — 15/19** (pre-registered criteria v1); STOPPED for review

**Passing rows:**

| Row | Test | Result |
|---|---|---|
| A | T0 bilateral baseline | 0.500 |
| B, C | strong transfers and cycle | 0.838 / 0.846, RMS 0.014–0.015 |
| D | 5 repeated cycles | no drift growth (Δ 0.02 mm, 0.07°) |
| E | near-single-support 10 s, both sides | min 0.9536 / mean 0.9678 |
| F | unloading the opposite foot | ≤ 1 % BW for 5.3 s, 0 contact loss, 0.26 mm |
| G | speed 4 / 2 s | clean |
| H | perturbations | 32/32 at 5 N·s, 18/18 inward ≤ 15, 0 false aborts |
| K | excessive requests | fall physically |
| L | authority, energy, capacity | exact |
| M | CoP across seams | smooth (≤ 0.65 mm per tick) |
| N | determinism and snapshot | ✓ |
| P | earlier gates | G0 ✓, G1 ✓, G2 620/620 |
| Q | force-plate twin | ≤ 4.1e-6 |

**Failing rows:**
- **I:** V2-short-legs 0.9487 / 0.9483 < 0.95.
- **J:** sliding fast-ramp slip Δ 0.76 / 0.60 mm > 0.5. The plant's own sliding asymmetry reaches 1.5 mm at G2, so the tolerance was set too tight.
- **O:** browser = Node 3/4 (G3-A12).
- **S:** controller cost 0.152 ms > 0.15 with 9 parallel processes; 0.038 ms single-process.

**Open decisions for the user:**
1. Determinism fix (G3-A12).
2. G3-F1 / TD-11 ankle axial compliance.
3. Accept rows I / J / S as reported, or instruct fixes.
4. Minimality: keep or remove contactSupport / holdUnloaded.

**Status:**
- G4 not started. Nothing pushed.
- Review server :8172, page `viewer/g3.html`.
- Report `g3/G3_REPORT.md`, tables `g3/G3_TABLES.md`.

## 2026-10-03 — G3 resolution / diagnostic pass D1–D6 (user decision; source `sources/2026-10-03_user_decision_g3_resolution_pass.md`)

G3 is **not** declared passed and G4 is not started. Full report: `g3/G3_RESOLUTION_REPORT.md`.

### G3-R1 (D1): deterministic controller math — implemented, G2 re-validated

**The change:**
- `ctrl/v2_stand.js`: 11 `Math.hypot`, 3 `Math.atan2` and 2 `Math.asin` replaced by `dnorm` / `datan2` / `dasin`.
- `ctrl/v2_stance.js`: 1 `Math.hypot` replaced.
- `dnorm` and `dasin` added to `core/v2_math.js`.
- Same quantities, no other logic. No compensation of controller behaviour.

**Re-validation:**
- G0 passes; G1 is unchanged (227 hashes).
- **G2 PASS 13/13**, with outcomes 620/620 identical to the accepted run and all hashes new. In recovered runs foot slip changed ≤ 0.012 mm.
- Browser = Node 6/6; snapshot 3/3.
- **The first post-fix G2 run evaluated 12/13:** row 2.5 measured 0.190 ms with extra diagnostic processes running. That evaluation is kept. The isolated benchmark shows no cost from the deterministic math (T5 0.0358 → 0.0364 ms). The clean re-run gives 0.115 ms: PASS.
- **G3 final run 3** (criteria v1 unchanged): **16/19**. Row O now passes (4/4). I, J and S fail, preserved.

**Audit, not fixed:** `sim/v2_passive.js:115` uses `Math.hypot` in the G1 passive layer. Same hazard class; it changes G1 → user decision.

### G3-R2 (D2): the ankle twist is a modelling defect of the passive-only ankle ab/adduction — diagnosis only, no change

**What the twist is:**
- One coordinate, the passive ab/adduction: shank axial rotation on the planted foot.
- Knee rotation ≤ 0.4°; the hip counter-rotates ≈ 10°.
- The ground's vertical moment at the ankle equals the passive torque, so the tissue is the only yaw path.
- It appears in both loaded and unloading legs and peaks during transitions.

**How it behaves:**
- Neutral free play inside ±10°: the leg wanders ±7–14° for ≥ 6 s after a release.
- It is the same in accepted G2.
- It becomes more compliant near single support: 13.7–14.1° at 0.5 N·m, and 15.6–17.8° at 2 N·m, past the 15° hard limit.

**Primary literature contradicts both magnitude and stiffness:**
- humans show ≈ 7–8° talocrural over a whole walking stance, and ≈ 4° opposed under static single-leg load;
- an unloaded talocrural joint carries 1.5 N·m at 7–10°;
- loaded joints stiffen.

**Option A recommended:** a neutral-zone stiffness for the passive-only axis. It is an approved-tissue change → user decision.

### G3-R3 (D3): the 95 % threshold

- **Origin:** the brief's example number, adopted as an engineering definition. It is neither evidence-derived nor swing-derived. It equals the spec's 5 % BW event threshold, whereas the spec's liftoff rule is ≤ 2 % BW.
- **Short-legs:** 0.9487 / 0.9483 occurs at the first tick of the hold window (convergence). The steady state is 0.9685 (REF 0.9690). The other foot carries 5.13 % BW on 8/8 pieces with friction demand 0.006. On request it unloads to ≤ 0.71 % BW.
- **Correction:** my run-2 "steady state 0.6 % lower" was wrong (it came from the hold mean).
- **Recommendation (not applied):** define near-single-support by the unloaded-foot requirement, i.e. a settled ≤ 5 % BW plus on-request ≤ 2 % BW.

### G3-R4 (D4): mirror floor

| measure | non-sliding | sliding |
|---|---|---|
| self-symmetry | 6.5e-5 mm | — |
| mirrored pairs | ≤ 0.046 mm (G2), ≤ 0.077 mm (G3) | ≤ 1.52 mm (G2), ≤ 1.45 mm (G3) |
| last-bit sensitivity | 0.004–0.005 mm | 0.07–0.19 mm |

- The plant has a deterministic L/R asymmetry only when a foot slides. Solver ordering is suspected; this is unverified.
- The controller is mirror-exact.
- **Recommendation (not applied):** non-sliding ≤ 0.1 mm; sliding = same class and ≤ 2 mm; plus controller-decision symmetry.

### G3-R5 (D5): performance

The isolated reproducible benchmark (`tools/g3_bench.mjs`; warm-up; 7 trials; per-tick median / p95 / p99):

| | mean | median | p95 | p99 |
|---|---|---|---|---|
| G3 controller | 0.036–0.043 ms | 0.032–0.041 ms | 0.042–0.053 ms | 0.151–0.163 ms |
| G3 controller + actuators (G2 scope) | 0.047–0.054 ms | — | — | — |

- **Not over the 0.15 ms averaged budget.**
- The gate figures of 0.152–0.173 ms are 9-process contention.
- **Ambiguity reported for decision:** spec §20 defines neither measurement conditions nor scope, and G2's row included actuators while G3's row S did not. The budget is unchanged.

### G3-R6 (D6): both mechanisms kept

Complete G3 gate set plus boundary cases, 190 jobs per configuration:

| removed | outcome classes | effect |
|---|---|---|
| contactSupport | 190/190 identical | Zero change in non-falling runs, but it changes failure dynamics whenever a foot has left the turf (up to 0.58 s more balancing on the true support). It is required by brief §12. |
| holdUnloaded | 189/190 identical | `UP:R:B:5` recovered → relocated. Without it, a push while the foot is unloaded drags that foot 53–230 mm instead of 31–67 mm. |

- My run-2 "minimality" note was based on nominal scenes only. It is corrected: **recommend keeping both**.
- **New boundary finding:** 5–10 N·s pushes relocate a fully unloaded foot by 31–67 mm. This is G4 design input.

**Status:**
- G3 NOT PASSED (run 3: 16/19).
- Decisions pending: rows I / J / S criterion or methodology; TD-11 option; the G1 passive-layer determinism fix.
- G4 not started. Nothing pushed.

## 2026-10-03 — Resolution report accepted; next pass D1–D7 (user decision; source `sources/2026-10-03_user_decision_g3_resolution_accepted_ankle_criteria_v2.md`)

### G3-R1b (D1 for G1): passive-layer deterministic norm — applied, G1 re-validated

**The change:** `sim/v2_passive.js:115`. `pl = Math.hypot(φ)` → `dnorm(φ)`. This is the norm of the per-step rotation increment used by the predictive linearisation.
- It is the same forbidden-math issue: `Math.hypot` is not specified to be cross-engine exact.
- It computes the same quantity, and `Q.axis` and the other passive-layer maths were already deterministic, so intended mechanics are unchanged.
- No other G1 change.

**Re-validation:**

| check | result |
|---|---|
| G0 | pass |
| G1 | **PASS (0 failing checks)**. 32 of 74 primary runs have new hashes (117 of 227 hashes overall). Qualitative outcomes 74/74 identical; per-run check changes 0. Physical metrics move only as last-bit chaos in falling runs: final COM ≤ 8 cm in falls, unexplained energy ≤ 0.033 J, rest penetration ≤ 0.39 mm. |
| G1 browser = Node | 10/10 |
| Heel-rise regression (`tools/g1_heel.mjs --out=…`) | impact impulse and pitch at the end of the free rise identical in all 13 variants; heel peak ≤ 1.2 mm |
| G2 (620) | outcomes 620/620 identical; 162 new hashes; recovered slip ≤ 2e-5 mm |

**Artifacts:**
- `g1/accepted_baseline_zeroNeutralAnkle/`: the accepted G1, preserved.
- `g1/postD1G1/` and `g2/postD1G1/`: the comparisons.
- `g1/json/` is now the post-fix G1.
- `g2/postD1_zeroNeutralAnkle/`: the post-D1 G2 baseline, preserved.
- `g3/json/run3/`: G3 run 3, preserved.

### G3-R7 (D2): ankle neutral-zone law — primary-source verification BEFORE selection

The question: which stiffness do primary sources support for our coordinate?

**Our coordinate:** the passive-only `fabd` axis, i.e. rotation of the rigid foot about the foot vertical ≈ the tibial long axis. In ISB terms this is foot internal/external rotation (= ab/adduction) of the whole talocrural + subtalar complex.

[FT] = full text read, [AB] = abstract only.

| source | what it measures | condition | stiffness (secant) | maps to our coordinate? |
|---|---|---|---|---|
| Hattori 2022 [FT] | calcaneus vs tibia, subtalar FREE, internal rotation | cadaver, 5 N, 15–30° plantarflexion | 1.7 N·m → 11.8–13.7° = **0.12–0.14 N·m/°** | **yes** (whole complex) |
| Watanabe 2012 Int Orthop [FT] | calcaneus vs tibia, internal rotation | in vivo, unloaded, knee 90° | 1.7 N·m → 11.7–15.4° = **0.11–0.15 N·m/°** | **yes** (skin artefact → underestimates stiffness) |
| Rasmussen 1982 [FT] | talus vs tibia | cadaver, unloaded | 1.5 N·m → 7° IR / 10° ER = 0.21 / 0.15 | talocrural sub-joint only (series → whole complex softer) |
| Li 2023 [FT] | foot vs tibia with the **subtalar screwed fixed**, external rotation only | 150 N, knee fixed | 0.43 ± 0.09 at 4 N·m | **no**: talocrural + syndesmosis |
| Villamar 2022 [FT] | **inversion / eversion** | in vivo, ≈ 3× stiffer 0 → 50 % BW | — | **no**: different axis |
| Stormont 1985, Tochigi 2006, Watanabe 2012 Clin Biomech [AB] | — | load | load stiffens | direction only; no internal/external magnitude |

**Conclusions:**
- Near-neutral the complex is most flexible (Chen 1988), so the near-neutral slope is ≈ **0.1 N·m/° (0.05–0.15)**.
- **0.3–0.5 N·m/° does NOT remain supported for this coordinate.** It is 2–4× the measured whole-complex value, and reaching it requires cross-axis load extrapolation, which the user forbade.
- The evidence DOES justify a stiffness for this coordinate, so this is not the stop condition.

**Preregistered selection (before any run with the law):**
- **k = 0.10 N·m/°** (5.73 N·m/rad).
- Linear inside the approved ±10° soft range, saturating beyond it, so the approved end range keeps its shape and stiffness.
- Internal = external rotation; L = R.
- Unloaded basis; load stiffening is NOT modelled (no verified internal/external magnitude). This is an open item.
- Sensitivity: k = 0.05 / 0.15 (evidence range), plus **0.3 / 0.5 reported separately as unsupported what-ifs**, never candidates.

### G3-R8: the ankle neutral-zone law causes a material G1 regression at every stiffness — NOT adopted; STOPPED for the user's decision

**Selected-law validation (k = 0.10, preregistered in `a028bed`):**

| gate | result |
|---|---|
| G0 | pass (incl. new row 0.9n) |
| **G1** | **FAIL, 2 rows** |
| G1 row 1.S′ | V1-matched settled-pose excursions 1.68° / 1.78° > 1.5° |
| **G1 row 8** | 720 Hz leanF member +1e-5: **one-step +450 J** explosion at the right ankle |
| G1, other changes | passive-fall postures changed in 7/74 runs at 240 Hz |
| Heel rise (V0) | unchanged |
| G2 | outcomes 620/620 identical |
| G3 v2 | E2 / F2 pass; I2 (unloaded-foot drag 5.4–7.1 mm) and D (pelvis-yaw wander Δ 12.85°) fail |

**Mechanisms:**
1. **The blow-up is inside one engine step.**
   - The passive drive before it is ≤ 0.2 N·m.
   - The body rests or lands with shank and foot on the turf, at combined large plantarflexion + inversion.
   - The historical ankle never settles into that configuration.
   - The same mode appears at k = 0.15 in V1-matched singleLeg at **240 Hz** (+182 J).
2. **The spring couples the leg twist into the light foot** (5.9° foot yaw = the drag). Below ≈ 0.15 N·m/° the leg is not re-centred against the posture control.

**Sensitivity (report-only):**

| k (N·m/°) | G1 failing rows | G3 support rows |
|---|---|---|
| 0.05 | 1.S′ | E2 / F2 / I2 / D all fail |
| 0.15 | 1.S′ (incl. +182 J at 240 Hz) | all pass (twist 1.3°) |
| 0.3 | 1.S, 1.S′, 6 | all pass |
| 0.5 | 1.S′, 8 (blow-ups up to +45,983 J) | all pass |

The passive-joint rig passes 34/34 at every k, so the implementation equals the spec law.

**Status:**
- **Not adopted.** The spec default is restored to the accepted historical plant (k = 0). The law stays implemented, selectable via `V2_ANKLE_NEUTRAL_K` for diagnostics.
- **Not switched to 0.15** (that would be choosing by G3 score, and 0.15 also fails G1).
- Final validation under criteria v2 halted.
- **New debt:**
  - TD-12: one-step engine divergence at the ankle in shank–foot–turf loops, exposed by axial ankle stiffness;
  - TD-13: the twist-following posture control leaves the leg-twist mode unrestored at low stiffness.
- **Recommendation:** B (investigate the engine-level divergence: a G1 physics-integrity question), then C (an evidence-backed load-dependent law).

Report: `g3/G3_ANKLE_LAW_STOP_REPORT.md`. Evidence: `ankle_law_k010_validation/`, `ankle_law_sensitivity/`.

## 2026-10-03 — Investigation B: the one-step energy blow-up (user decision "approve B only", then autonomous continuation)

**Sources:**
- `sources/2026-10-03_user_decision_b_engine_blowup_investigation.md`;
- `sources/2026-10-03_user_instruction_b_autonomous_two_hours.md`.

**Report:** `engine_blowup_B/B_REPORT.md`. **Evidence:** `engine_blowup_B/`.

### B-1: root cause — a Jolt v5.6.0 narrow-phase failure on the 100 m turf box (not the ankle law, not an engine joint)

**Mechanism** (12 simulation events + 1 identity-preserving demonstration, k = 0 … 0.5, 240 / 360 / 720 Hz, 30 / 60 / 150 iterations, all identical):
1. A boot hull piece sits in the 20 mm speculative band of the 100 × 2 × 100 m turf box.
2. GJK's relative termination test (|v|² ≤ FLT_EPSILON·max|y|², with max|y| ≈ 71 m: a 24.5 mm threshold) declares an overlap and hands the query to EPA.
3. EPA's polytope is a slab ~100 m wide and a few cm thick. Float32 resolution (~7.6 µm at 71 m) cannot certify convergence on the true face.
4. EPA pops the opposite slab face at a numerically equal distance, frees the converged face, and leaves its loop on the empty queue ("exit E").
5. The returned penetration axis is reversed. The turf's supporting face becomes the box's **bottom** face (y = −2 m).
6. Jolt's contact position solver clamps the −2 m separations to −0.2 m (mMaxPenetrationDistance) at Baumgarte 0.2. The boot is teleported 25–160 mm and rotated 45–173° in one step with **no velocity change**.
7. The ankle is forced far beyond its anatomical and engine limits, and the passive end-range + end-stop potential of that pose is the "+182 J … +56 kJ".

**Proof:**
- the reduction ladder down to one hull vs one box;
- bit-exact native reproduction with traces of every GJK / EPA decision;
- the saved-state ablation k → 0 leaves the event unchanged;
- two opt-in diagnostic Jolt patches each remove the reversal on all fixtures. P2 (EPA returns the best, not the last, triangle) also takes the near-event scan from 1,634 to 0 and adds none in 300k random / flush poses.

**Not** our implementation bug. It is a Jolt limitation / bug, exposed by our configuration (a 100 m convex turf with small boot pieces) and amplified by Jolt's position-correction defaults.

### B-2: the accepted k = 0 plant is vulnerable — **G1 potentially reopened** (not repaired, not redefined)

- Monitored accepted-plant G1-scenario runs:
  - 4 distinct reversed-manifold blow-ups in 1,054 runs: +6,874 J, +2,241 J and +443 J at 720 Hz; +205 J at **240 Hz with 60 iterations**;
  - 7 of 254 accepted-configuration runs contain benign tilted invalid manifolds.
- **Direct demonstration:** the V2-REF drop1m resting state, untouched, with only the static turf slid 341 mm (a physically identical state) → the next step reverses the manifold, teleports the boot 160 mm / 173° and adds **+34,300 J**.
- G2: 620 jobs, 16.3 M turf manifolds checked, **0 invalid**, state hashes identical to the accepted post-D1G1 baseline.
- G3: 332 jobs, 20.9 M turf manifolds checked, **0 invalid**.
- G1's own iteration study (102 runs): no reversed manifold.
- Equal-denominator perturbation set (600 identical runs): k = 0 → 3 events, k = 0.15 → 8 (up to +75,766 J). Stiffness raises the frequency; the mechanism is the same.
- The accepted G1 run list passes as measured, but G1's physics-integrity claim does not hold in general.

### B-3: permanent observation-only invariants (report-only rows; physics bit-identical, verified by state hash)

`gates/v2_g1.js` `INV_TOL`, `_posCorr`, `_passivity`, turf check in `_contacts`; `gates/v2_g2.js`; `gates/v2_g1_checks.js`:
- **1.2e passivity:** ≤ 0.05 J per step. Derived from G1 D2's measured 0.04 J and the healthy sweep maxima (0.0089 J at 240 Hz). False positives: 0 of 1,838 healthy runs at 240 / 360 / 480 Hz; 1 of 361 at 720 Hz (0.069 J, a genuine self-contact / point-constraint residual).
- **1.4j turf-manifold validity:** zero tolerance.
- **1.4k position-solver teleport:** ≤ 5 mm. Healthy accepted floor 2.32 mm over 951 runs.

They remain report-only until the user gates them.

### B-4: diagnostic tools and opt-in patches (none adopted)

- Tools: `tools/b_lib.mjs`, `b_capture`, `b_reduce`, `b_ablate`, `b_narrow`, `b_flipscan`, `b_sweep`, `b_summarize`, `b_ledger_table`, `b_k0reach`, `b_k0resim`, `b_k0turf`, `b_monitor_preload`, `tools/b_native/` (`b_query`, `b_scan`, `scan_poses`, `dump2bits`, `README.md`).
- Native Jolt instrumentation and the P1 / P2 patches are runtime-opt-in, in a native diagnostic build only. **The vendored WASM is unchanged.**

### B-5: corrections recorded openly

1. **TD-12 wording superseded.** It was recorded as "one-step engine divergence at the ankle in shank–foot–turf loops, exposed by axial ankle stiffness" (G3 stop report §10). It is in fact a **turf-contact narrow-phase defect, independent of the ankle law; the ankle is only where the potential appears.** New wording:
   > TD-12: Jolt narrow-phase reversed / tilted turf manifolds on the 100 m turf box (GJK relative termination → EPA unconverged reversed triangle); present in the accepted plant.
2. **Diagnostic-code bugs found and fixed during the investigation** (no effect on any reported result after the fix):
   - `b_reduce` freed constraints by removal: memory error; now disables them;
   - per-query Jolt temporaries exhausted the WASM heap: now reused;
   - a `//` comment in `b_scan` silently disabled the P1 / P2 / trace switches for a few runs; those runs were discarded and every native scan re-run;
   - `b_reduce` scaffolding typo.
3. **Claim correction in the draft report:** the accepted-plant event count was first written as "5 of ~2,800"; it is **4 distinct runs of 1,054**.
4. **Production note (not changed):** `V2JoltWorld.setPose` allocates two Jolt temporaries per call. Harmless in production (initial conditions only); diagnostics use reused temporaries.

### B-6: autonomous continuation — falsification and candidate evidence (user instruction 2026-10-03; no production decision taken)

- **The core defect is EPA's final-triangle selection, not the 100 m scale alone.**
  - GJK enters EPA through the relative test (100 m box) or a false enclosing tetrahedron (4–20 m boxes).
  - EPA exits on the empty queue ("exit E") with an unconverged opposite-facing triangle. A sliver-triangle "exit A" variant gives the accepted plant's tilted manifolds.
- **Falsified:**
  - a smaller turf box: 8 m / 20 m boxes give *more* reversals, 332 / 1,656 per 35 M poses vs 20 for the 100 m box;
  - convex radius required (no: 0 still reverses);
  - speculative contact required (no: penetrating poses still reverse);
  - compound decomposition required (no: the unsplit hull reverses);
  - any convex shape (no: cuboids show 0 in 80 M poses; irregular hulls are needed).
- **Opt-in diagnostic EPA patch P2** (return the best triangle): 2,110 → **0** reversals over 175 M flush poses × 5 turf geometries; all 8 fixtures corrected. A first version kept a stale `flip_v_sign` (1 thin-box case); fixed and recorded.
- **P1** (no GJK relative test) is not viable: it creates new reversals.
- **PlaneShape turf** (diagnostic SetShape, not adopted): **0 invalid manifolds** in every sweep, including the k = 0 perturbation set where the box had 3 events. Ordinary-contact metrics unchanged in distribution; chaotic-fall outcomes change.
- **Listener guard** (diagnostic): all events neutralised; the defect still occurs.
- **mMaxPenetrationDistance 0.02 m** (diagnostic): consequence < 1 J; the defect remains.
- **Second, separate mechanism** recorded: at **180 Hz only** and in k > 0 trajectories, the passive layer's explicit remainder and linearisation under extreme triaxial end range gain energy in one step (up to +161 J) and lose more in the next. No contact is involved. It is not the blow-up class. It is a known-rate accuracy limit (TD-1 family); flagged.
- Accepted Jolt v5.6.0 is the latest release. EPA is unchanged on Jolt master, so there is no upgrade path; an upstream issue draft is in `engine_blowup_B/UPSTREAM_JOLT_ISSUE_DRAFT.md` (**not sent**).

### Decision requested (not taken)

The turf representation; my recommendation is PlaneShape. Then:
- gate 1.4j;
- G1 → G2 → G3 re-validation of the accepted plant;
- an upstream Jolt report;
- only then the ankle-law question.

Candidates and their regression implications: report §13.

## 2026-10-03 — Flat-plane turf adopted; G1 reopened and re-validated (user decision; source `sources/2026-10-03_user_decision_flat_plane_turf_reopen_g1.md`)

### FP-1: the production turf is a Jolt `PlaneShape` (candidate 1), subject to full regression validation
- `core/v2_jolt.js` `TURF`: plane y = 0, normal +Y, half-extent 100 m. Convex-vs-plane collision is analytic (`PlaneShape::sCollideConvexVsPlane`: no GJK / EPA, no finite bottom or side face).
- **Unchanged:** surface height, coordinates, gravity, friction / restitution (same listener and turf material), boot / body geometry, joint topology, human parameters, solver and contact settings.
- **Kept as diagnostic history only:** the 100 × 2 × 100 m box (`cfg.turf = "box"`; `B_TURF=box`, the default for the Investigation B tools, so every reproducer still reproduces). The box-era artifacts are in `box_turf_history/`.
- **Not done, per the decision:**
  - no Jolt patch (the EPA patch P2, the 175 M-pose evidence and the upstream draft are preserved, unsent);
  - no listener guard (fix 3) and no maxPenetration change (fix 4);
  - no ankle stiffness, no G4.
- **Reinterpretation recorded:** ankle stiffness changed the trajectories enough to expose a pre-existing collision defect more frequently.

### FP-2: G1 criteria v4 (pre-registered, `68693b9`)
- **1.4m turf-contact validity** (gating: every non-extreme scenario, an invariant at every D4a rate, and HS.5 in the C7 envelope). Every turf manifold lies on the playable surface (turf-side points within 0.1 mm of y = 0, inside the half-extent), with its normal out of the surface (n_y ≥ 0.999). Violations are reported with tick, body, piece, normal, points and state; **nothing is deleted or modified**.
- **1.4n turf envelope** (gating at 240 Hz): depth ≤ 10 mm; position-solver move of a turf-touching body ≤ 5 mm.
- 1.2e passivity and 1.4k teleport: permanent report-only diagnostics.
- Tolerances were set from healthy flat-plane development runs. The box-era 0.05 J and 5 mm were retained (45× and 3× margins).
- **ID correction:** Investigation B's turf row "1.4j" collided with the existing isoSelfCol row 1.4j. It is renamed **1.4m**.

### FP-3: G1 v4 PASS on the flat plane (`e17bc73`; `g1/G1_REVALIDATION_FLAT_PLANE.md`)
- **G1 checks:** 0 failing gate checks; 1.S 17/17, 1.S′ 17/17, variants 40/40, determinism, snapshot, browser 10/10, rig 34/34, timestep invariants incl. 1.4m, envelope 8/8.
- **Reversed-manifold evidence:**
  - all 19 recorded reversed-manifold states are clean on the plane (box controls +182 … +75,766 J);
  - 174,914 local-perturbation queries, 1,181 monitored runs (97.6 M manifolds) and 225 M native poses: 0 invalid.
  - The GJK → EPA → bottom-face chain is structurally absent from the plane code path.
- **Plane vs box:** no systematic difference over 254 paired runs. Heel-rise V0 is identical. Physics −7 %.

### FP-4: G2 PASS on the flat plane, no material behaviour change (`13b0848`; `g2/G2_REVALIDATION_FLAT_PLANE.md`)
- **Run:** 620/620, 12/12 behavioural rows. Row R is superseded by the approved plant change; the v2 P2 replacement is in `g3/json/g3_earlier.json`.
- **Against the accepted box-turf G2:** 0 outcome changes and 0 push-boundary changes.
- **Follow-ups:**
  - the S4 yaw slip difference is near-threshold stick-slip (`tools/b_g2_yaw.mjs`);
  - the L-sweep per-foot CoP jump is one transient at 114 N foot load (`tools/b_g2_cop.mjs`).
- **Controller:** not tuned.

### FP-5: technical debt after the flat-plane re-validation
- **TD-12** (reversed turf manifolds) is **resolved for turf contacts** by the plane. The Jolt EPA defect remains for convex–convex pairs (self-contact, obstacles); no reversed self-contact manifold has been observed.
- **TD-14 (new):** at 720 Hz, a self-contact convergence residual (upper-arm ↔ abdomen plus the shoulder point constraint) gives ≤ 0.21 J one-step rises in 5 V1-matched awkward ensemble members. Report-only diagnostic.
- **TD-15 (new, from B-6):** the 180 Hz passive-layer explicit-remainder / linearisation gain under extreme triaxial end range. Seen only in k > 0 trajectories, and net dissipative over 2 steps.
- **Out of scope:** V2-190-85 drop1m reaches the engine stop (1.3b) with either turf. V2-190-85 is not a G1 body.

### FP-6: corrections and tooling caveats recorded openly
- **`//` comments placed mid-line in this codebase's one-line declarations twice swallowed code:**
  - the `g1_run.js` INV line: the first final G1 run crashed with a SyntaxError and was re-run;
  - `g3_earlier.mjs`: `g1b` became undefined and it crashed.
  - **`node --check` does not catch these for the ESM `.js` files**; comments now go on their own line.
- **`b_plane_events` probe:** the first version compared the face height with 0 while the plane was lifted, so it raised 4,014 false "off-surface" flags. Fixed to compare with the lifted height; re-run.
- **An ad-hoc G2 slip ranking first paired repeated `eval` / `sensing` jobs without their `eval` field**, giving nonsense pairs. It was caught before reporting. `tools/b_g2_compare.mjs` keys on group × human × scenario × eval × rep and asserts uniqueness.

### FP-7: G3 (criteria v2, k = 0) on the flat plane: 18/19, row J2 fails; STOPPED for the user's decision on J2 (`g3/G3_REVALIDATION_FLAT_PLANE.md`)
- **Configuration:** pre-registered addendum `5f91cb1` (flat plane, ankle k = 0; the v2 rows are unchanged). This is the first evaluation of criteria v2.
- **Passing rows:** every support-state and safety row (A, B, C, D, E2, F2, G, H, I2 8/8, K, L, M, N, O, P2, Q) and **S2** (isolated: 0.046 ms controller + actuators).
- **Against box run 3:** 0 outcome changes / 308. Integrity: 0 invalid turf manifolds over 324 G3 runs.
- **J2 fails literally, identically on the box:**
  - commanded-CoP Δ before sliding > 0.1 mm in 79/81 pairs. This includes 0.104 mm measured in the shared phase, where both trials are the same physical run (2 × the common state's 0.052 mm lateral offset);
  - the 14 falling excess-push pairs exceed 2.0 mm (12–924 mm) after the loss of balance.
- **Direct probe (`tools/b_ctrl_mirror.mjs`):** the controller is mirror-equivariant to numerical tolerance up to the fall (commanded CoP 1.7e-4 mm, λ 5.6e-17, torques ≤ 7e-4 N·m).
- **Falling pairs:** identical abort ticks, falls ≤ 1 tick apart, Δpos ≤ 0.27 mm up to the abort.
- **Cause:** the J2 operationalisation (written by me in criteria v2) compares two physical runs and bands falls. It is not a plane or controller defect.
- **Options put to the user:** A (recommended) J3: a direct controller probe plus the D4 floor numbers, with falls banded up to the abort; B keep J2 (G3 cannot pass without an engine change); C accept with J2 as an explained deviation.
- **Observation (new, minor):** after a fall, with leg-IK targets 0.46–2.3 m out of reach, the leg IK is not mirror-exact (torque differences up to 654 N·m from 0.15 s after the fall). It affects no gate. Noted for G4 swing-leg IK.
- **Ankle re-investigation:** **not started** (the user decision requires a clean G1 → G3). Its plan is drafted (`ankle_plane/ANKLE_REINVESTIGATION_PREREG.md`, DRAFT).
- **Probe correction recorded:** the first version of `b_ctrl_mirror` snapshot the controller state after the previous tick, so it injected the sensed foot loads one tick stale. It also kept a mirrored polygon's reversed winding. Both were fixed before any result was used.

## 2026-10-03/04 — G3 row J2 split into J2a / J2b (criteria v3; user decision `sources/2026-10-03_user_decision_j2_split_ankle_reinvestigation.md`)

### FP-8: criteria v3 pre-registered (`97a0c5d`); evaluated: NOT PASSED 19/20 (J2a); STOPPED for a decision (`g3/G3_V3_EVALUATION.md`)
- **J2a floor:** 27,709 states, ≤ 4-ulp input perturbations, 0 discrete flips. Tolerance = max(10 × floor, 100·ε·scale).
- **J2b passes 81/81** (0.086 / 1.28 / 0.27 mm).
- **J2a fails 0/81**, with no discrete mismatch and a bit-exact self-check. Three genuine controller mirror defects:
  1. the usable foot regions: `hull2` keeps an exactly collinear vertex on the left boot only, and the radial inset makes it a 4.8 µm region difference; up to 1.66 mm CoP / 1.7 N·m in BR pushes;
  2. the leg IK: one-sided FD Jacobian plus a hard 1e-9 threshold;
  3. `Q.rot`'s unit-quaternion formula on Jolt's non-unit (float32) orientations: 3e-7 rad axis distortion, different on L and R.
- **Diagnostic package** (`tools/b_sym_patch.mjs`: region + central-difference IK + 1e-12 IK tolerance + orientation normalisation): J2a within every controller-output tolerance on all 81 pairs. G2 619/620 outcomes and 0 boundary changes; G3 rows pass; S2 0.046 → 0.065 ms; G2 in-run 2.5 0.109 → 0.212 ms.
- **But J2b then fails 2/81** (0.126 mm vs 0.1; 2.08 mm vs 2.0). The old left-only region bias partly offset the plant's own L/R floor; the region fix alone raises paired differences by a median 1.2–1.3×.
- **My errors recorded:**
  - `sigmaErr` was gated at 2.2e-14 although it is a metric artifact of non-unit quaternions (~1e-6);
  - the first floor smoke test perturbed supervisor time stamps;
  - the first hold-angle metric (2·acos) read ‖q‖² < 1 as 5e-4 rad.
- **Post-fall IK** stays non-equivariant even with the package. Pre-fall equivariance holds in every reachable state tested; near-reach-limit swing targets are untested.
- **Options put to the user:** 1 (recommended) adopt the fixes, correct `sigmaErr`, re-measure the J2b floor by D4's method for explicit approval, measure G2 2.5 isolated or optimise the IK; 2 keep D4 numbers (blocked); 3 keep the controller (J2a deviation); 4 region + norm only with an IK-tolerance torque floor.
- **The ankle re-investigation has not started.**

## 2026-10-04 — Option 1: controller symmetry corrections, independent J2b floor, near-reach IK (user decision `sources/2026-10-04_user_decision_option1_controller_symmetry.md`)

### FP-9: corrections adopted (`e9bcf96`); validation done; STOPPED for decisions (`symmetry_corrections/SYMMETRY_CORRECTIONS_REPORT.md`)
- **The three corrections:**
  1. **canonical foot regions:** strictly convex hull, collinear points ≤ 1 nm removed, CCW from min z. The old regions had ≤ 0.72 mm notches at exactly collinear sole points; the corrected region contains the old one (+0.11 … +0.29 % area);
  2. **leg IK:** central-difference Levenberg–Marquardt (μ0 1e-2), converged to 1e-12, gradient stop when unreachable. Chosen over 10,880 problems × 8 bodies;
  3. **quaternions:** every Jolt-sourced orientation normalised at the boundary.
- **Permanent component regressions:** `tools/v2_component_regressions.mjs`, 14/14.
- **v3.1 erratum** (`39c9ad0`): `sigmaErr` not gated (category error recorded, v3 unchanged); J2a tolerances re-derived from the corrected controller's floor by the same rule.
- **J2a:** 0/81 → **79/81**. The remaining 2 pairs are IK stop-threshold coincidences (1e-12 rad → 2.4e-8 N·m vs a 1.2e-10 tolerance). A diagnostic one-step polish gives 81/81 (not adopted).
- **G2:** 619/620 outcomes identical and 0 boundary changes. The one change is a report-only kξ 0.5 job at its own boundary (region or quaternion fix). CoP-sweep jump 3.48 → 0.54 mm. Browser 6/6.
- **G3:** 323/324 outcome classes identical. The one change is the report-only arms variant (region fix). 10 abort shifts, all from the region fix (nominal T7 0.75 s: +1 tick on both sides). Browser 4/4.
- **Independent J2b floor** (1,027 runs; repeats 94/94 identical): A max 0.106, B 2.10, C (no slide) 0.069, C (sliding) 14.8 mm (G3 abort windows ≤ 0.42 mm); abort Δ ≤ 1 tick, fall Δ ≤ 5 ticks.
  - **Not** explained by Jolt creation / solver / contact order: swapped-order worlds give ×0.87–1.17.
  - It is chaotic amplification of rounding-level differences, growing with sliding.
  - Rule-based recommendation for approval: **A 0.5 mm, B 5 mm, C-no-slide 0.2 mm, C-slide 50 mm (1 mm for the abort-window subset), timing ≤ 10 ticks.**
- **Isolated cost:** controller + actuators 0.046 → 0.129–0.135 ms (budget 0.15); IK 0.023 → 0.107 ms per tick. Not optimised (within budget, per the decision).
- **Near-reach IK:** reachable ≤ 1e-12, unreachable classified exactly (residual = shortfall), 0 L/R classification mismatches in 10,880, mirror ≤ 3e-15 m (≤ 1e-8 at the boundary). Concerns for G4: no joint limits (hyperextended branch from ±5° starts in ~5 %), singular full extension (12 iterations, 1e-8), unconverged post-fall solves.
- **G1 FAILS 2 rows** after the quaternion correction: 1.S′, V1-matched leanR elbow 1.93° vs 1.5°; row 8, upright @ 360 Hz, 1 engine-stop tick. These are **pre-existing chaotic marginality**: the old code failed the same scenarios in perturbed runs, and over 854 perturbed runs the corrected plant has 43 per-run failures vs 53 for the old code. Decision requested.
- **Diagnostics added:**
  - `cfg.mirrorOrder` (swapped L/R creation order; default off, bit-identical);
  - `tools/j2b_floor.mjs`, `tools/j2b_report.mjs`, `tools/ik_study.mjs`;
  - the polish option in `tools/b_sym_patch.mjs`.
- **Errors caught on the way:**
  - the R1.d region test first demanded an unchanged area (wrong: the requirement is no reduction);
  - the R2 threshold was tighter than a rounded 4-term norm;
  - `mirrorOrder` was first not forwarded by G1Sim (caught by an invalid-value test before use).

## 2026-10-04 — Overnight pre-G4 work (user instruction `sources/2026-10-04_user_instruction_overnight_pre_g4.md`)

### FP-10: symmetry package final; G3 v3.2 all rows pass but NOT DECLARED (J2b not meaningful); ankle / 180 Hz not started; STOPPED at the pre-G4 decision point (`PRE_G4_OVERNIGHT_REPORT.md`)

- **Adopted** (`833ec4a`):
  - convex mirror-exact usable regions + exact inside test (projection Lipschitz 201.7 → 1.000);
  - narrow quaternion scope (the plant is bit-identical to the historical G1);
  - IK post-convergence polish;
  - staged FK (bit-identical, −25 % IK).
- **G3 v3.2 pre-registered** (`5b9d756`). J2b tolerances by the procedure (`8e57a3e`, before the gate run):
  - your provisional 0.25 / 5 / 1 mm were rejected by the 2× margin; the rule gives **A 0.5 / B 10 / C 2 mm, 5 ticks**;
  - **meaningfulness NOT met:** 0 of 3 injected 5 % / 2 mm asymmetries detected;
  - **J2a detects all three** by 9–12 orders of magnitude.
- **Results:** G0 PASS; G1 PASS (browser 10/10); G2 PASS (row 2.5 → isolated benchmark 0.093 ms; 0 outcome changes vs `13b0848`).
- **G3 v3.2:** 20/20 rows pass, including J2a 81/81 and J2b 81/81. **Not declared.**
- **G3 changes vs `7eb6248`:** 0 outcome changes (an earlier "1 change" was a pairing artifact, corrected). 22 abort-timing changes, reproduced 22/22 by reverting the region alone.
- **IK for G4** (`f7b8a0c`):
  - 1,336 of 16,704 geometrically reachable G4-style targets are anatomically invalid in the production IK (hip rotation / ankle DF);
  - solutions are unique and mirror-exact;
  - validated runs need 0 beyond-limit solves before any abort;
  - opt-in `legIKBounded` (default off; R4 tests) is not adopted, a G4 decision; its unreachable fallback pose is not converged.
- **Performance:** controller + actuators 0.093–0.103 ms (isolated); the IK is ≈ 86 % of the controller; no further optimisation.
- **Not started:** ankle (Phase F) and 180 Hz (Phase G), because G3 is not declared. The pre-registration draft is updated (k = 0 / 0.11 / 0.13 / 0.15). G4 not started. Nothing pushed.
- **Decisions for the user:**
  1. J2b: (a) J2a as the gate with J2b reported, (b) a re-defined J2b with re-preregistration, or (c) other;
  2. the G4 foothold-IK policy;
  3. then the ankle.

## 2026-10-04 — User decision: J2 Option (a); IK research; Phase F ankle + Phase G 180 Hz (`sources/2026-10-04_user_decision_j2a_gate_ankle_ik_research.md`)

### FP-11: G3 criteria v3.3 — J2a the normative symmetry gate, J2b a permanent diagnostic; **G3 PASS 20/20** (`g3/G3_CRITERIA_v3.3.md`)
- **Why:** a test-design correction backed by the pre-registered test-of-the-test.
  - J2a detects all three injected asymmetries by 9–12 orders of magnitude.
  - J2b cannot both keep a margin above the measured floor and detect them.
  - Not a relaxation: every row also passes under v3.2.
- **The change:** J2b is reported by class (distributions, maxima, abort timing, mismatches) and never gates. Every other row is v3.2's.
- **Result:** G3 **PASS** 20/20 (19 gating, J2b reported).
  - J2a 81/81.
  - J2b diagnostic: A max 0.203 / B 2.46 / C 0.460 mm; abort Δ 0.
- **History preserved:** v1 … v3.2 files, evaluators and results are unchanged.

### FP-12: anatomical-IK research (Decision 2) and the ankle reinvestigation (Phase F / G); STOPPED for decisions (`PRE_G4_REPORT_ANKLE_IK.md`)

**IK** (`ik_anatomical/`):
- Ground-level footholds at foot yaw within ±30°: 0 of 2,256 invalid.
- The invalid 8 % is ±45° yaw with a non-turning pelvis (a pelvis yaw ≤ 20° resolves 1,023 of 1,208), plus flat feet held in the air (ankle DF).
- The opt-in bounded IK's fallback is refined by projected Newton (KKT ≤ 4.4e-9) and gated by R4.g (26/26). Not adopted.
- A foothold-reachability contract (L1 / L2 / L3) is proposed for approval.

**Ankle** (pre-registration `4b544ca`; `ankle_plane/ANKLE_RESULTS.md`):
- **No candidate meets the pre-registered requirements** with the validated controller: B, C and D fail for 0.11 / 0.13 / 0.15; E, F and G also fail for 0.11 / 0.13.
- **Mechanism:**
  - an actuator-powered leg-twist limit cycle created by the posture IK's "twist DOFs at current" policy (present at k = 0);
  - a prone-rest knee-axial end-range interaction at every k > 0 (perturbed G1: V1-matched perturb 13–14 / 15 vs 2 / 15).
- **Phase G:** 180 Hz-only end-range integration error. It converges with dt, is net dissipative, is present at k = 0, and occurs only in passive-fall stress states. Not a foundational defect; H passes.
- **Diagnostic `ikRefTwist`** at k = 0.13 / 0.15: every controller-dependent requirement met; yaw stiffness ≈ 2k; G1 knee-axial still fails.
- **Nothing adopted.** Decisions put to the user: the twist-DOF policy → the knee-axial question → a re-pre-registered ankle run; the foothold contract.

## 2026-10-04 — Pre-G4 research runway (user instruction `sources/2026-10-04_user_instruction_pre_g4_research_runway.md`)

### FP-13: runway complete; nothing adopted; G4 not started; STOPPED with the consolidated decision report (`PRE_G4_DECISION_REPORT.md`)

**Twist** (`pre_g4_runway/TWIST_MECHANISM_AND_POLICY.md`):
- **Root cause:** the posture IK holds the twist DOFs at their current values. So the hip-rotation target follows the leg twist, and the hip spring pumps energy into it: the stiffness term does +19 to +32 J per hip over 8 s, at a phase lag of 47–57°.
- Rate, activation and heading are falsified as causes.
- Across 8 bodies × 5 disturbances: "current" is non-decaying in 25 / 40; reference / blend 0.5 / drift τ 2 s in 0 / 40.
- Both a reference-like policy and k ≈ 0.13–0.15 are needed in double support.
- **No policy fixes single-support yaw anchoring.** The stance ankle's passive-only axial path is the only net yaw anchor.

**Knee:** the ankle ab/adduction and knee axial end ranges, loaded in series in a prone rest at 145° flexion. The evidence is "recalled".

**Rate:** the 180 Hz error converges (0.51 J at 240 Hz; 0 at ≥ 260 Hz) and is net dissipative.

**Reachability** (`pre_g4_runway/REACHABILITY_STRESS_AND_TAXONOMY.md`):
- The branch-and-bound certificate is implemented (`tools/ik_cert_core.mjs`). Its soundness is falsification-tested and guarded by the permanent R6.
- 1,336 / 1,336 invalid targets are PROVEN-INFEASIBLE as defined.
- **But the definition decides:** with the held twist DOFs free in their unloaded ranges, 94.7 % are FEASIBLE (all ground and 5 cm targets).
- The instantaneous-twist definition is knife-edge: a ≤ 1° change flips 17.5 %, and ≤ 10° flips 83 %.
- E2 needs a pelvis drop of ≥ 2.5 cm.

**Interface** (`pre_g4_runway/G3_G4_INTERFACE_AUDIT.md`): 12 hazards. 8 are confirmed empirically with an external-lift harness; H8 was checked and is masked in G3.

**G4 design** (`pre_g4_runway/G4_FIRST_EXPERIMENTS.md`): E1a / E1b lift → hover → replace (criteria S1–S13), and E2 short step. Both are proposals.

**Status:**
- Permanent regressions: R5.a–d and R6.a–e; suite 35/35.
- All controller options are diagnostic and default-off; the default path is bit-identical.
- **Recommendation:** not ready for G4 experiment runs. Ready for G4 preparation after the twist-policy, single-support yaw-anchor and boundary-component decisions.

## 2026-10-04 — Final pre-E1a resolution stage (user instruction `sources/2026-10-04_user_instruction_final_pre_e1a_resolution.md`)

### FP-14: resolution complete; recommendation DO NOT AUTHORISE E1a; nothing adopted; E1 not run (`final_pre_e1a/FINAL_PRE_E1A_REPORT.md`)

**Twist policy** (preregistered, d22a1e7; `final_pre_e1a/TWIST_POLICY_RESULTS.md`):
- **Strictly no policy is eligible.**
- **Reference** meets every criterion on all 8 bodies at k = 0.13, except HO3 on V2-165-62. That is a capacity fall under every policy, "current" included: a preregistration flaw, not re-scored.
- "current" is rejected: an energy source, adopts twist, oscillates.
- Drift is falsified. Blend creeps on heavy bodies.
- **No policy meets the semantics at k = 0.**

**Single-support yaw** (`SINGLE_SUPPORT_YAW.md`):
- The passive stance-ankle ab/adduction is the only anchor in our model.
- Human resistance is distributed, including an **active subtalar path our orthogonal ankle omits**.
- Unloaded stiffness is 0.10–0.15 N·m/°; loaded small-angle stiffness is unmeasured.
- Recommended **architecture D**. The runway's 5° / ≥ 1 N·m/° target is withdrawn.

**Knee** (`KNEE_AXIAL_CONCLUSION.md`):
- The ROM is about twice too wide, the limits are flexion-blind, and the zero is fixed.
- **The k > 0 prone-rest G1 blocker is a knee-envelope artefact:** 13 / 15 → 0 / 15 with a literature-shaped envelope.
- But that unfitted envelope breaks other G1 rows: awkward knee engine stops, C7, lean energy events.
- A zero-shift-only variant fixes the prone rest too, but its limits sit beyond the unmoved Jolt emergency stop.
- **Perturbed G1 failure rates at k = 0.13:** current knee 11.3 %, `lit1` 15.0 %, `shift` 16.3 %, vs the accepted 5.0 %. Both diagnostic knees fail awkward 15 / 15.
- **Not live in E1a / E1b.**

**Ankle law** (preregistered, 1926df6; `ANKLE_LAW_RESULTS.md`):
- k ≈ 0.13 is evidence-supported and meets every controller-level requirement.
- **It fails G1 under every available knee model**, so it is not adopted. k = 0 remains, and no law is sufficiently validated.

**Boundary components** (`BOUNDARY_COMPONENTS.md`):
- The support / contact lifecycle is built (default off) with R7 unit regressions.
- The external-lift harness, 88 runs on the frozen code: 0 falls, 0 chatter, torque steps only at touchdown, energy OK, rate-robust. Eight counterexamples were fixed.
- G2 passes. **G3 13 / 15:** I2 (touching-foot drift 5 mm on long legs at standing height) and K (excessive request stands).

**Contract:** finalised (`REACHABILITY_CONTRACT_FINAL.md`).

**E1:** preregistered and frozen (`E1_PREREGISTRATION.md`). 5 mm is a genuine liftoff; a 2.5 cm pelvis drop.

**E2:** needs a planned drop of ≥ 2 cm (lateral 10 cm).

**Rate:** no E1 risk. **Performance:** +0.4 % median.

**G0–G3:** the accepted baseline is bit-identical; suite 44/44.

**Smallest blocker:** a passive leg-axial model with nonzero ankle neutral stiffness that keeps G1 valid:
1. a fitted knee envelope;
2. a perturbed-rate comparison;
3. your decisions on the knee revision, the G1 rest-tolerance interpretation, reference semantics, and enabling the lifecycle.

## 2026-10-04 — Knee axial research review (user instruction `sources/2026-10-04_user_instruction_knee_axial_research_review.md`)

### KR-1: review delivered; nothing adopted; no code changed; no simulation run (`knee_axial_review/KNEE_AXIAL_MODEL_REVIEW.md`)

**Evidence:**
- Four tagged primary-literature reports (`knee_axial_review/literature/`).
- Spot-checked against Seiferheld 2026 S4 and Blankevoort 1988 Fig. 5.
- Supporting calculations only (`knee_axial_review/evidence/`).

**Findings:**
- **The current knee axial model is 2.6–4× too wide at physiological torques** (64–66° total at 5 N·m at every flexion vs in vivo bone-level 16° at 0°, about 23° at 30°, about 24–26° at 90°).
  - Its screw-home term is nearly inert: soft-onset only, so the range at a given torque changes by 2° from 0° to 90°.
  - Its zero is fixed.
- **Moving neutral θ0:** 0 → about 15° by 90–120° → about 20° (11–30°) at 145–150°. This corrects the earlier "30° at 150°".
- **Envelope:** narrowest at extension (in vivo mainly ER), plateau 30° → ≥ 120°, probably narrower beyond about 125° (low confidence).
- **Torque–rotation:** a J-curve, no wall below about 25 N·m.
- **Weight-bearing:** stiffens strongly (cadaver), but is unmeasured in vivo.
- **Planted-leg yaw:** belongs mainly to the hip, the shoe–ground pivot and the foot chain.

**Recommendation (proposal; needs approval under the anatomy / joint-limit rule):**
- θ0(φ) = the Walker curve to 120°, rising to about 20° at 150°;
- per-side widths from θ0 (plateau: soft IR 3 / ER 1.5°, hard IR 14 / ER 24°), with ER ×0.5 at extension and a deep-flexion factor of 0.6 (0.3–1.0);
- the existing law shape with a knee-specific torque at hard of about 15 N·m (≈ 0.55 × capacity) and the existing 3° end-stop;
- a conservative potential formulation;
- the old screw-home coupling disabled;
- engine stops moved with the envelope;
- a separate active box;
- no compression term until the stance test V6 requires one;
- validation V0–V11, to be preregistered.

**E1a:** the evidence supports changing the knee before E1a (ankle-law blocker, the stance knee at 4–25° flexion, θ0 for reference semantics, order of work). **It does not by itself authorise E1a.**

## 2026-10-04 — Corrected knee before E1a (user instruction `sources/2026-10-04_user_instruction_knee_correction_before_e1a.md`)

### KC-1: v2k built (default off), preregistered, qualified on frozen code; strictly NOT QUALIFIED; E1a NOT run (`knee_correction/KNEE_CORRECTION_RESULTS.md`)

**Commits:** parameterization + preregistration 0267291 (before implementation); frozen implementation 097dcb7 (official run on it, scratch tree).

**The knee mechanics validate:**
- conventions and L/R mirroring;
- the law equal to its independent spec;
- generalised-power and closed-loop conservation (the naive moving-rest-angle variant leaks 19 J per loop);
- the plant within 0.001° of the law;
- the reference path followed (7.6° of screw-home emerges);
- the end-stop at bound + 3.00°;
- the Jolt stop ≥ 31° away;
- 180 / 240 / 480 Hz;
- E1a pelvis drop 12 / 12: knee tracks θ0 within 1.4° through 3.6–29.7° flexion.

**Strict FAILs:**
- KV2b, KV3b and KV4a.3: preregistration threshold flaws. KV2b and KV3b leave dissipative residuals that the accepted plant shares. Errata E1–E3.
- G1 row 5: the knee-flexion damping-rig premise; the deviation is exactly the designed flexion reaction (erratum E4).
- G1 1.S′ / KV9c: V1-matched upright collapses into a splayed-leg rest on the hip end range (1.5–2.3° vs 1.5°), systematic at the central parameters. **It depends on the provisional deep-flexion parameters:** θ0(150°) ≈ 11° or width ×0.3 gives 0.0–0.7 % with no systematic scenario. **Not adopted** (that would be selection on the test).

**Gains vs the old knee (same run):**
- G1 perturbed rate 4.3 / 5.3 % (old 5.0 / 11.3 %); the prone-rest blocker is gone.
- G2 and G3 15 / 15 at k = 0.
- E1a configuration: G2 passes; G3 14 / 15 (only lifecycle row K); I2 now passes.

**Yaw decomposition:** the knee masks nothing. The passive foot-axial joint is the model's dominant yaw compliance with either knee, the existing single-support yaw-anchor question.

**E1a: NOT ready.** Your decisions:
1. errata E1–E4;
2. the deep-flexion parameters / the splayed-rest G1 finding;
3. ankle k = 0.13;
4. reference semantics + lifecycle (row K).

Then freeze `E1_PREREGISTRATION_V2.md` §2. Nothing adopted; not pushed.

## 2026-10-04 — Close the decisions before E1a (user instruction `sources/2026-10-04_user_instruction_close_decisions_before_e1a.md`)

### KC-2: decision audit and superseding preregistration (`knee_correction/DECISION_CLOSURE.md`, `QUALIFICATION_V2_PREREG.md`, `E1_PREREGISTRATION_V2_CONFIG.md`)
**Four preregistration failures**, each audited; the original FAILs stay recorded and the v1 preregistration is unchanged:
- KV2b, KV3b, KV4a.3 and G1 row 5 are superseded by KV2b′, KV3b′, KV4a.3′ and G1-5′.
- Each is derived from its invariant (no elastic creation + timestep consistency; one-sided cycle energy; continuity by refinement; the designed flexion reaction).
- Each discriminates: the corrected and the old knee pass; the naive / inject / spring / stepped adversarials fail.

**Splayed-leg hip rest:** a genuine finding.
- The evidence-calibrated reference path (≤ 120°) turns the femurs outward during the buckle, so the body collapses splayed onto the hip's combined end range.
- It occurs in 15 / 15 members of all 35 deep-flexion cells. The provisional deep parameters only move the hip excursion (0.56–2.26°, median 1.25°) across the 1.5° tolerance. **This corrects the KC-1 reading "depends on deep flexion".**
- The literature cannot separate δ150 −4 or w150 0.3 from the central values, so deep flexion stays a provisional uncertainty family.
- The family is irrelevant to E1a: the pelvis drop is bit-identical across members, knees ≤ 29.7°.

**Ankle k = 0.13:** adopted as the passive unloaded tissue value only (AL criteria); not a yaw-stability device. The active subtalar yaw path is absent from the reduced ankle (E1b-17).

**Reference twist semantics:** adopted, with voluntary heading via the active command. C7 (unloaded-foot drag) and C1 (HO3 capacity fall) are superseded by C7′ / C1′ with discrimination (ice-turf plant flagged; "current" still fails C1′).

**Row K:** an obsolete premise. λ 1.2 is feasible on every body (target 1.1 cm inside the stance foot), so K′ uses the feasibility rule. A silent-rescue controller fails K′.

**Configuration frozen** for qualification and E1a: `v2k` central + k 0.13 + reference + lifecycle.

Qualification tooling added (default-off; KV0 4 / 4, suite 52 / 52). **E1a not run; not pushed.**

### KC-3: qualification v2 on frozen code: everything qualifies except the preregistered hip-rest G1 finding → E1a NOT READY, one blocker (`knee_correction/QUALIFICATION_V2_RESULTS.md`)
**Frozen at 56a87b8.** A tool bug in the KV6c report found during the run was fixed in ed59b3b (tool only); Q2a / Q2b / Q6b were re-run on it.

**PASS:**
- Q0: KV0 4 / 4, suite 52 / 52, guard OK. G1 74 / 74, G3 332 / 332 and sweep 300 / 300 identical to the official 097dcb7 runs.
- Q1: mechanics with KV2b′ / KV3b′ / KV4a.3′; the old knee passes; the adversarials fail.
- Q2: KV6c 8 / 8 bodies within 1.40° of θ0; deep family bit-identical.
- Q3a G0.
- Q3d G2 11 / 11.
- Q3e G3 17 / 17, with K′ and J2a 81 / 81 re-measured with the lifecycle.
- Q3f twist battery: reference meets C1′ / C7′ and the rest.
- Q4 energy.
- Q5 browser = Node: adopted 10 / 6 / 4, default 10 / 6 / 4.
- Q6 timestep 180 / 240 / 480 Hz.
- Q7 yaw decomposition: no masking flag.

**FAIL (predicted in the prereg, not waived):**
- Q3b G1 1.S′: V1-matched upright 1.3d 2.09° at hip_L.rot.
- Q3c: V1-matched upright 15 / 15, although the rate is 5.3 % ≤ 8.1 %.

**Why it does not touch E1a:** E1a-like support keeps the hips ≥ 27.4° from every hard limit, and E1a-10 forbids any joint beyond its hard limit.

**Recommendation for the user:**
- A: scope the finding as a non-E1a-gating G1 exception (no tolerance, hip or knee change), carried as debt before any passive-fall certification;
- B: schedule an approved evidence-first review of the hip's combined end range.

Not applied. **E1a not run; not pushed.**

## 2026-10-05 — User decision: Option A + mandatory Option B; configuration adopted; E1a authorised (`sources/2026-10-05_user_decision_option_a_authorise_e1a.md`)

### KC-4: the splayed-leg hip rest is a recorded, NON-E1a-GATING G1 exception (Option A); the combined hip end-range review is MANDATORY follow-up (Option B)
**What is recorded:**
- G1 row 1.S′ (V1-matched upright, 1.3d 2.09° at hip_L.rot vs 1.5°) and the perturbed-ensemble systematic failure (V1-matched upright 15 / 15) are **preserved as FAIL** (`knee_correction/QUALIFICATION_V2_RESULTS.md`, `evidence/qual/q3/`; the closure-stage map `knee_correction/evidence/audit/splay_map/`).
- They are scoped as **not gating E1a only**.
- This is **not**:
  - an acceptance that the hip excursion is anatomically correct;
  - a tolerance change;
  - permission to tune around it.
- **Frozen, unchanged:** the hip, the knee, the 1.5° tolerance and the deep-flexion parameters.

**TD-16 (mandatory, Option B): evidence-first review of the hip's combined flexion–abduction–rotation end range** (limits and end-stop behaviour in deep flexion + abduction, which the splayed rest loads at about 45–72 N·m).
- It must be resolved **before any stage claims to certify passive falls or collapse behaviour** (e.g. G4 falls / ragdoll).
- Its outcome may touch approved anatomy, which needs the user's approval.

### KC-5: adopted pre-E1a configuration (user acceptance)
**Accepted as reported:**
- the corrected-knee architecture (`v2k` central);
- k = 0.13 as the passive ankle tissue value, for its evidentiary reason and not as a whole-body yaw fix;
- reference twist semantics, with voluntary heading kept as an active command;
- the support / contact lifecycle;
- the versioned corrections KV2b′ / KV3b′ / KV4a.3′ / G1-5′, with the original FAILs preserved;
- the corrected G3 row K (K′);
- deep flexion kept as an uncertainty family, not outcome-selected.

**Not masked:** the unresolved active single-support ankle / subtalar yaw-path limitation (E1b-17).

**E1a authorised:**
- the frozen `E1_PREREGISTRATION_V2.md` + `E1_PREREGISTRATION_V2_CONFIG.md`, on the qualified configuration;
- no change to criteria, configuration, controller, anatomy, gains, thresholds, target, timing or lifecycle after any E1a outcome.

**Not authorised:** E1b, E2 or anything later.

### E1-1: E1a run on frozen c3b09d1 → E1a FAIL: the unload step never releases support (`e1a/E1A_RESULTS.md`)
**Result:** all 10 runs (8 bodies, the mirrored run, the repeat) hit the preregistered unload time-out. No lift was ever commanded.
- **FAIL:** E1a-1/2/3/5/6/9/12/13 (consequences of no lift), and therefore E1a-15.
- **PASS:** E1a-4/7/8/10/11/14/16/17.

**Cause:**
- The lifecycle releases support only below 1 % BW.
- At the preregistered 2.5 cm planned drop, the to-be-lifted foot at zero requested share keeps 1.02–1.25 % BW (flat 7–9 s) on every body.
- That load is applied by the actuated support leg (passive torques ≈ 0).

**Diagnostic factors** (pre-lift only, no lift, not E1a):
- released at drops ≤ 2.0 cm;
- released with the old knee, or with "current" twist semantics;
- not released at k = 0.

**Validation gap:** pre-E1a lifecycle tests at the planned drop used an external lift, which forced release.

**Nothing tuned.** The rest of the E1a chain is untested, not failed.

**Recommendation (not applied):**
- isolate the support-path term producing the residual;
- then an approved, versioned, intent-gated release (symmetric with acceptance), with preregistered validation;
- then re-run E1a unchanged.

E1b not authorised and not started. Not pushed.

### E1-2: E1a unload blocker, causal investigation (diagnostic only; nothing adopted; `e1a/E1A_UNLOAD_INVESTIGATION.md`, source `sources/2026-10-05_user_instruction_e1a_unload_causal_investigation.md`)
**Root cause:** a latent support-controller bug.
- The knee flexion feed-forward lacks the locked-axis twist term −tan t·(T·ẑ). This is the geometry the passive layer already handles (its G1 locked-axis rows).
- Under the corrected knee's reference path the stance knee is twisted about 7.1° and carries about 47.5 N·m frontal moment.
- So it is 5.9 N·m short. The stance posture PD compensates with about a 1° error, leaving the pelvis 0.94 mm low.
- The zero-share leg, still in SUPPORT, servos to the same pelvis target and presses that deficit into the turf at about 8.3 N/mm: 8.75 N, 1.13 % BW.
- The lifecycle releases only below 1 % BW and the controller withdraws authority only after release, so it deadlocks.

**Causal evidence (counterfactuals, one at a time):**
- Adding only the missing term gives 0.12 N, a stance PD of −5.05 → +0.13 N·m, and release. The 8-body table, dose-response with drop and old-knee / current-twist explanations all fit (twist 0° / 4.0°).
- Left knee posture PD removed: 1.03 N. IK from the actual pelvis height: 0.62 N.
- No effect from the passive, contact, twist-servo or orientation terms.

**Second mechanism:** commanded-share leakage. The lever rule assigns 0.25–0.67 % BW to a zero-request foot; the request relaxes the floor but does not cap the share. Capping it on top of the missing term gives 0.15–0.36 N on all bodies (0.04–0.36 N across drops 0–3 cm) and release at 6.5–7.3 s.

**Classification:**
- bug (primary) + posture-strut amplifier + lifecycle circularity;
- not unavoidable contact.

**Recommendation (NOT implemented):**
- B = B1 (locked-axis-consistent feed-forward, `ffLockedAxis`, default off) + B3 (requested share caps the commanded share below `loadOff`, `shareCap`, default off);
- keep the load-based release; no intent release (A);
- B2 (posture-authority withdrawal) deferred as debt D-2.

Preregistered validation V1–V4 is proposed in the report.

**Tracer development errors (recorded):**
- an ablation dispatch bug, found by an identity check;
- two badly designed layered ablations (25 runs), marked VOID.

KV0 identical. E1a not rerun; E1b unauthorised; not pushed.

## 2026-10-05 — Unload fix B1 + B3: preregistered, implemented behind default-off flags, characterised — NOT qualified (`sources/2026-10-05_user_decision_implement_b1_b3.md`)

### UF-1: B1 + B3 not adopted; new smallest blocker = post-release vertical hold (`unload_fix/UNLOAD_FIX_RESULTS.md`)
**Sequence:**
- prereg 312ede8 (erratum E-1 + development record before the runs);
- implementation freeze 4b2fb93 (flags default off; KV0 4 / 4; suite 56 / 56);
- 2,182 official runs.

**B1 bench PASS** (knees + elbows; numerical generalized-force reference ≤ 2.5e-11; naive miss = sin t·(T·ẑ); mirror ≤ 6e-14).

**Causal separation PASS (CS1–CS5):**
- B1 removes the mapping residual: 7.7–9.5 → 0.4–0.8 N at 2.5 cm; f_PD 0.81 → 0.005.
- B3 removes only the share leak (exact to 0.014 % BW).
- B1B3 residual ≤ 0.005 % BW.

**Other passes:** A2 (no false release; legitimate shares hash-identical), A3, A5, A6, A7.

**FAIL A1 / A4 (as frozen):**
- At drops ≥ 1 cm the released, zero-load foot leaves the turf by itself (TOUCHDOWN ↔ AIRBORNE cycling, 16 / 16).
- Displacement across release is up to 1.1 mm.

**Cause:**
- A pre-existing TOUCHING-hold defect: no vertical reference (target height follows the foot), so post-transfer pelvis settling (D-3) lifts the foot to the 0.5 mm contact threshold. It is also seen without the fix wherever release happens early.
- B3's abrupt engagement at loadOff makes release earliest (6.47 s) and so makes the defect systematic.

**Outcomes:**
- Stop rule applied: V3 (G0–G3) not run; no adoption; E1a not rerun (its unload condition would not be met either); E1b not started.
- **Recommendation:** H1 contact-hold vertical reference (required) + H2 continuous B3 (or H3: drop B3); keep B1; one preregistered validation incl. V3.
- **Debt:** B3 boundary discontinuity, TOUCHING-hold vertical anchoring (new); D-3 now implicated.

Not pushed.

## 2026-10-05 — Touch semantics: candidate C (B1 + touchRest) preregistered and validated — NOT qualified (`sources/2026-10-05_user_instruction_autonomous_runway_touching_foot.md`)

### TR-1: candidate C fails its preregistered validation; E1a not rerun (`touch_semantics/TOUCHREST_RESULTS.md`)

**Sequence:**
- Phase 1–2 diagnostics (`touch_semantics/TOUCH_SEMANTICS.md`, checkpoint 1ce8cd2);
- prereg + implementation freeze 63543e8;
- regression tooling 7b0ecf6;
- 2,146 official runs plus browser.

**FAIL:**
- **R1** 238 / 240: 2 straight-legged, 2 s unloads released 2.40 s after the ramp end.
- **R3** 127 / 144: 17 0.5 mm boundary hovers bounce once.
- **R7** 330 / 480: 2 s unloads drift 0.5–1.43 mm after release.
- **TS2:** formal fail only.

**PASS:** R2, R2c, R4, R5, R6, R6x, R8–R12, TS1, TS3. These cover no false release, bumps, pushes, energy, torque continuity, limits, determinism, browser = Node, 180 / 480 Hz, and the E1a-reproduction check.

**Causes:**
- **R1:** pre-existing straight-leg load rebound after a fast transfer; the original configuration fails the same way.
- **R3:** mainly the candidate's own one-tick seat removal at the lift command (2 / 48 without the seat).
- **R7:** pre-existing friction-limited drift of a 1–2 N resting foot during a fast transfer; touchRest halves it.

**Finding F4:** the delivered resting load is 0.14–0.39 % BW, not the nominal 0.5 %.

**Outcomes:**
- C not adopted; E1a not rerun; E1b not started.
- None of the failures occurs at E1a's protocol values (reported, not a pass).
- Decisions required: see the results file and the morning report.

Not pushed.

### TR-1a: correction to TR-1's R3 cause (after the C2 diagnostic)

**C2 test:** the seat with a continuous rest-weight ramp (`touchRestRamp`, default off, diagnostic) gives R3 18 / 144 in a 384-run lab, against C's 17. So the one-tick seat removal is **not** the cause; TR-1's R3 line is superseded.

**Mechanism:**
- The 0.5 mm boundary hover is commanded exactly at the lifecycle's 0.5 mm touch-sensing gap.
- The swing servo's mm-level error band straddles that gap: one debounced re-touch / bounce, no chatter.
- The seat only raises how often the foot leaves the turf at all.

**Status:** C2 is kept as a refuted, default-off record. `touch_semantics/TOUCHREST_RESULTS.md` §0 / §3 revised.

Not pushed.

### TR-2: G0–G3 regression of C (informational): FAIL on G2 2.2b; attributed to touchRest

**Run:** after TR-1's FAIL, as information; frozen battery and evaluator.

**PASS:** V3.1–V3.4, V3.6–V3.10:
- G1 hash-identical to qualification v2;
- G3 17 / 17, J2a 81 / 81;
- browser all;
- KV6c; yaw.

**FAIL V3.5 (G2 2.2b symmetry 9 / 12):**
- touchRest raises the maximum foot slip of 25–30 N·s lateral pushes by 0.1–1.1 mm.
- L / R then straddle G2's 20 mm relocation threshold.
- No capacity change: falls are identical in all arms. B1 alone is 12 / 12.

**Boundary harness:** passes by rule, but its outcome label changes to "foot relocated" (airborne excursion 24.7 vs 16.4 mm under the external lift), also from touchRest.

**Performance:** no measurable controller cost.

**Common root with R7:** the surface-anchored, lightly seated resting foot is dragged when the body moves fast.

**B1 alone shows no regression.**

Not pushed.

## 2026-10-05 — Pre-swing / contact-boundary runway (`sources/2026-10-05_user_instruction_preswing_contact_boundary_runway.md`)

### TR-3: erratum to TR-1 / TR-2 causes (frozen verdicts unchanged)

**R7:** the resting foot under C does not slide.
- The contact point stays fixed; utilisation is 0.3–0.5 against boot–turf μ 1.2.
- The foot rocks about it (tilt ≤ 0.4°, yaw ≤ 0.45°); R7's origin metric measured that rotation.
- B1 alone does slide, at zero load after its spontaneous liftoff.

**G2 2.2b:** the "slip" is the released foot's airborne excursion during push recovery (both configurations).
- The real difference: C never re-accepts the landed foot. With no plan in G2, acceptance is load-only, the documented deadlock; the old hold's pressing used to break it.

**Status:** both findings are now inputs to the pre-swing design.

Not pushed.
