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

### PS-1: pre-swing / contact-boundary investigation → candidate P\*; final validation preregistered (`preswing/PRESWING_INVESTIGATION.md`, `preswing/PRESWING_VALIDATION_PREREG.md`)

**Research:** biomechanics, plus humanoid and animation controllers (`preswing/research/`).
- A lightly loaded foot in contact should be held by contact and friction, not servoed.
- The leg's joint PD needs a contact-consistent velocity reference, so the moving pelvis does not drag the foot through joint damping.

**Candidate P\*:**
- B1;
- touchRest;
- `lcVff: "lin"` (contact-consistent desired-velocity feed-forward from the linearised bounded-IK rate, damped with the solver's μ0);
- `lcTouch.reseed`;
- the min(target, actual) leg frame.

**Measured against C:**
- turn slip 8–13 → ≤ 1.9 mm;
- 20 mm hover error 6.5 → 0.9 mm (C fails E1b-3);
- external-lift matrix 0 falls, Δτ ≤ 11 N·m;
- G2 2.2b 12 / 12.

**Refuted and kept:**
- backward-difference / follow feed-forward;
- IK re-solve rate;
- passivity bound;
- minimum damping in contact;
- the actual-pelvis frame (reproduces strut counterexample 6);
- the no-plan intent rules (`nullWanted` fall; `nullAccept` 1-piece slide).

**R3:** spatial hysteresis is not justified (slow crossings do not flicker). The boundary test is redesigned (slow crossing + clear dwell), and the servo improvement is justified by E1b-3.

**R1:** pre-existing lever-rule share leak during slow COM convergence; not contact semantics. It matters for G4 allocation design but does not block E1.

**G2, no plan:** the landed foot stays resting (semantic gap, documented).

**Prereg:**
- 924 runs + external-lift matrix + G0–G3; criteria V1–V15.
- Visible criteria changes for your review: V3 = R7's threshold on contact-point slip; REL0 reported; V6 replaces R3.

Not pushed.

### PS-2: P\* passes its preregistered validation (V1–V15) → adopted as configuration version PSTAR; E1a to be rerun as frozen (`preswing/PRESWING_RESULTS.md`)

**Official run:** abdd3da (924 runs, 32-run external-lift matrix, browser); G0–G3 on 9ef02bf.

**Result: all 15 criteria pass.**
- Release and rest on 8 bodies × both feet × 5 drops × 3 ramps.
- Partial loads never released.
- Contact-point slip ≤ 0.04 mm.
- Lifts: 1 / 1 / 0 sequence; the redesigned boundary holds (1.99 mm dwell after a slow gap crossing).
- Hover error: 5 mm ≤ 1.28 mm; 20 mm ≤ 0.89 mm.
- Fast motion over the released foot: slip ≤ 1.9 mm (C: ≤ 9.1 mm); no falls.
- Energy, torque continuity and limits; 180 / 480 Hz; determinism; browser = Node.
- External-lift matrix: 0 falls.
- G0–G3: G1 hash-identical, G2 11 / 11, G3 17 / 17, J2a 81 / 81, browser.

**Adoption:**
- **Adopted** (configuration version **PSTAR** for E1 and later): `ffLockedAxis` + `touchRest` + `lcVff: "lin"` + `lcTouch.reseed`.
- **Defaults stay OFF**, so the default gate path is bit-identical (KV0).

**B1 on its own merits:**
- A verified fix. Alone it fails G3 I2: it makes the pre-existing touching-hold defect reachable.
- So it is adopted only together with the hold.

**E1a configuration:** `knee_correction/E1_PREREGISTRATION_V2_CONFIG_PSTAR.md`. The harness gains a config-version option only (6413a6b); the default reproduces the official E1a run.

**Your visible decisions to review:**
- V3 replaces R7's quantity: contact-point slip instead of origin displacement; same 0.5 mm threshold.
- The REL0 straight-leg deadline is reported, not gating.
- V6 replaces R3.

Not pushed.

### E1-3: E1a rerun with configuration PSTAR → E1a PASS (`e1a/E1A_PSTAR_RESULTS.md`)

**Run:** frozen protocol, criteria and harness; configuration-version option only. Clean copy of 3da5e5e.

**Result:**
- All E1a-1 … 17 pass on 8 bodies + the mirrored run; determinism 21 / 21.
- Hover error ≤ 1.3 mm (limit 3); clearance ≥ 4.4 mm.
- Torque steps ≤ 6.2 N·m.
- Touchdown 0.25 mm from the foothold, impact ≤ 0.2 % BW.
- One LOAD_ACCEPT; load tracking ≤ 0.007.
- No abort.

**Erratum E1-3:** E1a-10's soft-limit sub-check was vacuous because of a harness capture-index defect. An independent corrected measurement gives ≥ 0.88° inside the soft limits. The verdict is unchanged.

**Next:** E1b, under its existing preregistration (tooling committed earlier, 9ef02bf).

Not pushed.

### E1-4: E1b (configuration PSTAR) → FAIL on E1b-7 (3 aborts) and E1b-17 (V2-REF yaw); everything else passes (`e1a/E1B_RESULTS.md`)

**Run:** frozen prereg, operational definitions and tools (9ef02bf); clean copy of d499453; 28 runs.

**PASS:**
- All unperturbed E1b-1 … 14: 8 bodies + mirrored, 20 mm lift, 1.5 s hover, hover error ≤ 0.9 mm.
- Determinism.
- E1b-16: all 5 N·s pushes and the yaw impulse recovered, no abort.
- E1b-18: the 15 N·s abort puts the foot down in ≤ 0.1 s and returns to bilateral.

**FAIL E1b-7 (P15):**
- The supervisor's abort clears the swing target in one tick: a 20 mm target step, 114–218 N·m τ0. This is pre-existing (H9) and newly exercised.
- A diagnostic continuous put-down (`lcAbortRamp`, default off) gives τ0 ≤ 29.4 N·m, applied ≤ 13.1 N·m (one body > 10).

**FAIL E1b-17 (V2-REF):**
- The stance-ankle yaw mode is under-damped (±6–8°, about 2 s period) in all bodies.
- This is the pre-declared active-ankle-yaw-path decision (E1 prereg §6), not a tuning change.

**Errata E1b-e1:** the evaluator summary's label collision hid nothing (knee criteria 27 / 27 per run).

**Status:** stopped for your decisions (active ankle-yaw path; abort put-down). G4 not started.

Not pushed.

## 2026-10-05: Close E1b, reuse-first (`sources/2026-10-05_user_instruction_close_e1b_prepare_e2_reuse_first.md`)

### E1-5: E1b fix, configuration PSTAR2 → VALIDATION FAIL; E1b still fails; stopped for decision (`e1b_fix/E1B_FIX_RESULTS.md`)

**Research (reuse-first):** `e1b_fix/research/` (yaw path review, swing / put-down study of BLF / IHMC / PyPnC / Cheetah / OCS2) and `e2/research/E2_REUSE_STUDY.md`.

**Design** (`e1b_fix/E1B_FIX_DESIGN.md`, a89c307; default off; KV0 identical):
- **footYaw:** an actuator on the passive-only foot ab/adduction axis.
  - Capacity 0.64 × the approved subtalar capacity, i.e. 0.320 / 0.288 N·m/kg.
  - Shared budget with inversion, inversion first.
  - Driven by the existing ankle rows (D = ankleD 2.0).
- **lcPutDown:** a BLF quintic from the current reference state to the contact anchor.
  - Duration 0.302 s, from the 4 Hz servo bandwidth.
  - Physics decides touchdown.

**Prereg** 99c71e9. **Validation:** E (official E1b), A (E1a), X (133 extended runs), W, G.

**Result:**
- **E1b-17 fixed:** 56 / 56 yaw runs, +3 s values 0.13–0.95°.
  - It works through active damping: peak about 1.1 N·m, capacity non-binding, sensitivity identical.
- **The put-down descent is smooth:** 0.9–2.2 N·m.
- **But 13 / 23 P15 aborts now fall.** Touchdown comes at +0.3 s, support at +0.5 s, and the DCM escapes the bilateral hull. The causal diagnostic points to the put-down alone.
- **A second, pre-existing E1b-7 source:** post-abort load acceptance under a large DCM error, about 10 N·m per tick (PSTAR V2-198-92: 12.69, previously masked).
  - This corrects E1-4's single-cause E1b-7 diagnosis.
- **Passing:** A, X-U, X-P5, X-Y, X-DET, W 3 / 3, G (V3.1–V3.10), each after the tooling errata where marked.

**Errata (tooling, mechanical, originals kept):**
- E1bF-e1: the YAWN scheduled impulse was missing.
- E1bF-e2: the W relative path.
- E1bF-e3: the regression file rename.

None changes set E.

**Decision options:** P1 capture-timed put-down / P2 earlier acceptance intent / P3 abort acceptance profile / P4 recovery step / P5 criterion decision; or partial adoption of footYaw alone. Multiple materially different architectures remain with no evidence-based winner (stop condition).

PSTAR2 is not adopted. No E2 implementation, preregistration or run.

Not pushed.

### P15-1: P15 capture / reuse study → in-place architecture selected by evidence; timing design needs your decision (`p15_capture/`)

**Source:** `sources/2026-10-05_user_instruction_p15_capture_evidence_reuse.md`. No code, criterion or parameter changed. Diagnostic runs only.

**Research:**
- IHMC code (`p15_capture/research/IHMC_EMERGENCY_SWING.md`):
  - walking: speed-up + capture-region step adjustment + **full support on the measured foot-switch tick**;
  - **`FlamingoStanceState`** (one foot lifted, ICP outside the stance foot but inside the two-foot hull): a **straight-down in-place touchdown**, support on the measured switch.
- BLF / walking-controllers / PyPnC / literature (`research/LITERATURE_CAPTURE.md`):
  - timing + location adaptation (Griffin / Khadiv);
  - planned contact drives states, measured contact only advances;
  - PyPnC 0.225 s load ramp;
  - no stack pre-loads before measured contact;
  - humans side-step.

**Capture analysis** (`p15_capture/P15_CAPTURE_ANALYSIS.md`): a lateral LIPM with the controller's constraints predicts 32 / 32 outcomes.
- P15 is beyond the 0-step envelope: ξ is 1.2–4.4 cm outside the stance foot at push end.
- **In place is physically recoverable for all 8 bodies:** latest touchdown 0.44–0.96 s if support follows contact.
- The failure comes from the **acceptance pipeline**:
  - an intent delay of about 0.15 s (the λ min-jerk reaching `wantShare`);
  - the quiet-standing 10 % stance floor capping the landed foot at 90 %;
  - the fixed 0.1 s ramp.
- The naive P2 (λ return at the abort) harms the heavy body. P4 (step) is not required once acceptance follows measured contact (V2-165-62: 1.5 cm at the 0.29 s touchdown, 0 at 0.20 s).

**Touchline-specific constraint:** the post-abort E1b-7 transient is the stance hip **abductor** releasing about 1.2 N·m/kg (erratum E1bF-e4: `hip_*.z` = abduction). Heavy bodies need a slower load ramp (≥ 0.15 s for ≤ 8 N·m / tick), while the light body then needs touchdown ≤ 0.23–0.25 s.

**Selected:**
- in-place BLF quintic put-down;
- acceptance intent from the abort plan (LOAD_ACCEPT still on measured contact + the existing debounce; the λ / ξ_ref return still at contact);
- no 10 % floor during the abort recovery;
- no timeout contact.

**Open (your decision):** the timing design.
- T-A: capture-timed online (recommended).
- T-B: fixed emergency timings.
- T-C: in-place now, stepping in E2.

**Recommended:** P15 outcome labels (fixed-foothold / step required / step / fall). Information only.

**Correction:** an interim message said 11 / 16 put-down runs fell; the count is 10 / 16.

Not pushed.

## 2026-10-05: T-A capture-timed put-down (`sources/2026-10-05_user_decision_ta_capture_timed_putdown.md`)

### TA-1: T-A (configuration PSTAR3) → VALIDATION FAIL for substantive reasons; E1b not closed; stopped (`e1b_ta/E1B_TA_RESULTS.md`)

**Implemented** (7369b1f; `abortCapture`, default off; KV0 identical):
- an online capture model (a port of the validated P15 model, 32 / 32);
- the smoothest (descent, ramp) predicted to recover, equal-fraction split, with a 0.04 s margin (descent 0.20–0.302 s, ramp 0.10–0.225 s);
- speed-up-only re-plans before contact; the longest feasible ramp after measured contact;
- the abort plan's intent, still needing sustained measured contact;
- the quiet-standing floor removed for the abort transition;
- verdict "step required" when no feasible pair exists;
- preregistered before any official run (10 mm smoke disclosed).

**Result:**
- **All 23 P15 aborts are caught with the original foothold; 0 fall.**
- E1b-7 passes in all 28 set-E runs. TA-1 authority (no load before sustained measured contact) PASS. A, X-U / P5 / Y / DET, W 3 / 3 and G0–G3 PASS.
- **FAIL:**
  - E1b-18 on **V2-165-62** (L / R, 180 / 480 Hz): stance foot 6.8–7.9 mm. Its own capture model said "step required" after the push (the abort fires 4–29 ms before the push ends). Catching it needs full weight transfer, and its momentum lifts or slides the old stance foot.
  - E1b-7 V2-long-legs 10.23 / 10.21 N·m (forced 0.10 s ramp after a "step required" flag).
  - V2-REF 480 Hz, one tick over the rate-scaled 5 N·m.
- **P15 classes:** recovered without changing foothold 11 / 23, step required 12 / 23 (all physically caught), stepping 0, fell 0.

**Correction:** the P15 study's "original foothold recovers all eight bodies" was too strong. The LIPM had no friction / unloading limit, started at the push end, and assumed a permanent floor removal. Correction notes were added to `p15_capture/`.

**Erratum E1bTA-e1:** `e1bta_checks.mjs` mid-line comment (tool crash), fixed and re-run on the same runs.

**Decision needed:**
1. split P15 into in-place-recoverable vs "step required" (T-A verdict) → deferred to E2 stepping; or
2. keep P15 unchanged → E1b waits for E2 capture-aware stepping; or
3. classify the old-stance-foot lift-off as a support change.

PSTAR3 not adopted. No E2 work.

Not pushed.

## 2026-10-05: Close E1b, adopt foot-yaw, prepare E2 (`sources/2026-10-05_user_decision_p15_split_close_e1b_e2_prep.md`)

### EC-1: foot-yaw actuator adopted independently, configuration PSTARY (`e1b_close/CONFIG_PSTARY.md`)

- **Evidence:** Y identity (no-abort runs hash-identical to PSTAR4, 5 / 5) + GY G0–G3 regression PASS + the yaw-path validation (E1b-17, X-Y, X-RATE yaw).
- **Configuration:** PSTAR + `footYaw`.

### EC-2: E1b CLOSED with configuration PSTAR4; P15 split; STEP_REQUIRED → E2 obligations (`e1b_close/E1B_CLOSE_RESULTS.md`)

**Prereg** ca4aad6.

**P15 split** (user Decision 1): class A / B by T-A's capture verdict at the end of the disturbance.

**Corrections, evidence-based and not tuned:**
- **T-A rule revision 2:** no timing margin after measured contact. Revision 1 double-counted it and forced the minimum ramp, which caused the V2-long-legs E1b-7.
- **RATE-set applied-torque limit × max(1, 240/hz):** impact responses are rate-independent (6.17 / 6.43 / 6.61 N·m at 180 / 240 / 480 Hz), which explains the V2-REF 480 Hz item.

**Result:**
- E1b closing evaluation PASS: class A 19 / 19 recovered without changing foothold (E1b-7 ≤ 9.86 N·m, slip ≤ 3.38 mm); class B 4 STEP_REQUIRED (V2-165-62), integrity pass; 0 falls.
- E1a, TA, W 3 / 3, G4 PASS.
- The frozen evaluators' "FAIL" consists only of the 4 class-B E1b-18 items.

**Obligations:** `e2/E2_OBLIGATIONS.md`.

### E2-0: E2 architecture and criteria frozen for review (`e2/E2_DESIGN.md`, `e2/E2_PREREGISTRATION.md`); NOT implemented

**Research:** `e2/research/E2_REUSE_STUDY.md`, `FOOT_PLACEMENT_SPEC.md`; BLF swing study.

**Architecture** (reuse-first; all default-off; base PSTAR4):
- a step sequencer advanced by measured lifecycle events;
- quasi-static DCM (d = 0) during swing;
- BLF via-apex swing (0.60 s, apex 0.025 m, landing velocity 0);
- **IHMC error-based capture-aware placement ported unchanged in substance** (one-step capture region + safety heuristics + reach octagon + projection, deadband 0.02 m), with T = remaining swing + acceptance latency;
- `xiRef2D` (2-D λ-weighted reference);
- `recoveryStep` (class-B aborts take a capture-aware step);
- T-A acceptance for recovery steps.

**Test set:** forward 0.10 m and lateral 0.08 m steps (8 bodies × L / R), rates, perturbed steps, the 4 obligations (R-B), class-A regression, DET, W, E1 and G0–G3.

**Criteria:** E2-1 … 16, R-1 … 6.

**Awaiting review before any implementation.**

Not pushed.

## 2026-10-06: E2 audit corrections (`sources/2026-10-05_user_instruction_e2_audit_corrections.md`)

### E2-1: E2 architecture and preregistration revised (v2); planning-only prerequisites done; FROZEN FOR REVIEW, not implemented (`e2/E2_DESIGN_v2.md`, `e2/E2_PREREGISTRATION_v2.md`)

**Revised per the audit:**
- planning primitive = (foothold, timing, support / load plan), with the full capture horizon and explicit partial loading, and explicit CERTIFIED_ONE_STEP / NO_CERTIFIED_ONE_STEP;
- a minimal PyPnC-structured DCM reference layer feeding the existing law;
- reach from Touchline's IK certifier (no Valkyrie constants);
- foothold from timed safe capture region ∩ certified reach ∩ valid geometry, with measured margins;
- explicit BLF quintic swing, C2 re-targeting, bounded contact handling;
- one planner for commanded and recovery steps;
- the added validation checks.

**Prerequisites** (`e2/research/E2_TIMING_LOAD_ASSUMPTIONS.md`, `E2_REACH_AND_SNAPSHOTS.md`; tools `tools/e2_plan_lib.mjs`, `tools/e2_plan_audit.mjs`; evidence `e2/evidence_planning/`):
- **Measured timing chain:** liftoff 154–171 ms after the E1b lift command; touchdown leads the reference by 13–25 ms; contact → accept 0.050 s; realised-load lag ≤ 8 ms.
- **Measured margins:** CoP shortfall 2.3 / 15.2 / 4.0 mm (single support / ramp / full); landing 1.64 mm + bandwidth term.
- **Per-body h / ω**, with model-assumption deviations logged.
- **Reach:** forward 0.10 m and lateral 0.08 m nominals plus paths certified for all 8 bodies × L / R. Snapshot reach to 0.12–0.13 m.
- **The four STEP_REQUIRED snapshots:**
  - NO_CERTIFIED_ONE_STEP under the current λ-return reference;
  - CERTIFIED_ONE_STEP under DCM-plan tracking (4 cm outward, T ≈ 0.207 s, T_r 0.10 s, slack 53–64 ms, path certified).

**Disagreements / clarifications reported** (`E2_DESIGN_v2.md` §7):
- apex was already 50 % (0.6 = IHMC's touchdown-acceptance gate);
- E1a-8 is a ledger closure, not "energy never increases";
- v1 never required bitwise identity across rates;
- certification depends on the not-yet-validated DCM law (gate PG-2);
- stance-foot lift-off is outside the planning model.

Awaiting review. No E2 implementation or physical step.

Not pushed.

### E2-2: E2 v2 implemented (PSTAR5, default-off); identity PASS; planning gate PG-1 FAILS → STOPPED before the official run (`e2/E2_IMPLEMENTATION.md`, `e2/E2_PRE_OFFICIAL_RESULTS.md`)

**Authority:** user authorization 2026-10-06 (`sources/2026-10-06_user_authorization_e2_implementation.md`).

**Implemented** (one planner `ctrl/v2_footstep.js`; DCM layer `ctrl/v2_dcm.js`; apex swing `ctrl/v2_swing.js`; sequencer `ctrl/v2_step.js`; option `e2` in `ctrl/v2_stand.js`; class-B hook in `gates/v2_g3.js`; harness / evaluator / planning gates / W tools).
- Open choices, all fixed before any physical run: commanded T_ds 4 s (E1b); recovery R3 0.6 s (abortDur); C4 apex-knot solve; commanded acceptance by E1b's request rule; the planner's clearance certificate = E2-3's planning counterpart.
- 10 implementation defects were found in development / smoke and corrected (`E2_IMPLEMENTATION.md` §3).

**Identity:** KV0 identical; PSTAR4 identical; PSTAR5 inert on non-stepping and class-A runs.

**Planning gates (implemented law):**
- **PG-1 FAIL** — 32 / 32 commanded decisions NO_CERTIFIED_ONE_STEP. Only the clearance certificate fails: margin 3.0 / 3.2 mm at φ 0.20 against 5 mm with the frozen seeds (T 0.6 s, apex 25 mm).
- **PG-2** — 4 / 4 obligations CERTIFIED: 4 cm out, 1 cm back, T ≈ 0.206 s, T_r 0.10 s, slack 12–15 ms (the R3 VRP bound).
- **PG-3** — pass.

**Smoke (non-test):**
- **SMK-1D** (0.07 m forward, certificate not enforced): 14 / 16 pass. Placement 2.8 mm, stance slip 0.017 mm, DCM prediction 1.2 / 2.5 mm. E2-3 fails (clearance 1.1 mm at φ 0.20, liftoff at φ 0.19; tracking 11.6 mm max / 7.4 mm RMS). E2-5 fails (0.064 m/s horizontal approach).
- **SMK-R** (V2-165-62 R P15 180 Hz): recovered by stepping. R-2 fails (old stance lift-off, 4 mm); R-4 fails (55 % BW, 0.19 m/s); R-5 fails (torque step at re-acceptance; p* outside 194 ms, the DCM diverging faster than the LIPM after the push).
- **W:** browser = Node for both.

**Classification:** none is an implementation defect.
- PG-1 / E2-3 clearance: a bad preregistered assumption (window start vs seeds and measured liftoff).
- Tracking / approach and the recovery items: model / plant deficiencies.

**Stopped for decision** (`E2_PRE_OFFICIAL_RESULTS.md` §5).
- Recommendation: A1 (airborne-phase swing fractions) + B1 (vertical-first lift, xy re-planned at measured liftoff) for commanded steps.
- Recovery architecture (C) deferred.

No official E2 run. Not pushed.

### E2-3: A1 + B1 implemented (PSTAR5B); planning gate still FAILS (clearance at φ 0.80) → STOPPED before the official run (`e2/E2_PREREG_AMENDMENT_A1B1.md`, `e2/E2_A1B1_RESULTS.md`)

**Authority:** user decision 2026-10-06 (`sources/2026-10-06_user_decision_e2_A1_B1.md`): A1 + B1; thresholds, apex and window unchanged.

**Implemented (option `e2: 2`):**
- A1: swing fractions from the measured, confirmed liftoff;
- B1: vertical lift phase first, then the commanded swing from the measured liftoff state, T = 0.60 s from liftoff, re-certified online; total step ≈ 0.77 s, not compressed;
- two implementation defects from the diagnostic smoke corrected: I-11 (re-anchoring differenced by the swing velocity feed-forward), I-12 (early-contact acceptance ignored the planner's priorities).

**Identity:** KV0; PSTAR5 records (including the recovery smoke, unchanged); PSTAR4; PSTAR5B on E1b — all identical. Browser = Node.

**PG-1 FAIL:** 32 / 32 commanded decisions NO_CERTIFIED. The clearance certificate fails at φ 0.80: margin 2.4 mm forward / 2.8 mm lateral. With the 25 mm apex, BLF's spline puts the reference at 5.4 mm there. My previous report omitted that the descent end failed too.

**Diagnostic smoke (non-test, 0.07 m, certificate not enforced):** 13 / 16 pass.
- E2-3 fails: clearance 3.3 mm at φ 0.20; RMS 5.6 mm. The 4 Hz swing servo, without acceleration feed-forward, lags the reference by about 6 mm.
- E2-5 fails: 0.064 m/s horizontal approach.

**Stopped for decision.** The remaining levers change architecture or constants:
- D1: swing acceleration feed-forward plus a predicted-response clearance certificate (**recommended**);
- D2: swing servo bandwidth;
- D3: longer T seed (insufficient alone).

No official E2 run. Not pushed.

### E2-4: D1 swing acceleration feed-forward implemented and verified; independent servo validation FAILS → STOPPED (`e2/SWING_ACCEL_FF_DESIGN.md`, `e2/SWING_SERVO_VALIDATION_PREREG.md`, `e2/SWING_SERVO_VALIDATION_RESULTS.md`)

**Authority:** user decision 2026-10-06 (`sources/2026-10-06_user_decision_e2_D1.md`): D1 only; no change to thresholds, apex, T, bandwidth or semantics.

**Implemented (option `swingAccFF`, PSTAR5C, default off):**
- the computed-torque inertial term of the swing subtree (resolved acceleration through the IK chain's 6 × 6 foot Jacobian; Newton–Euler in the statics' wrench form, weight (1 − s));
- the planner's tracked-clearance certificate with a preregistered validation-derived allowance.

**Verified:**
- Newton–Euler = independent Lagrangian within 0.0006 %;
- KV0 and PSTAR4 / 5 / 5B identity.

**Preregistered battery** (192 runs: 8 bodies × legs × 180 / 240 / 480 Hz × ON / OFF × 2 sequences): **does not validate.**
- V-1 fails: RMS ratio 0.6 – 0.9.
- V-2 fails: β_OFF ≈ −0.4 … 0.8, β_ON ≈ −0.5.
- V-3 fails: representative RMS 4.0 – 6.6 mm with feed-forward.
- V-4 fails: energy closure also fails without feed-forward; some liftoff-tick continuity / saturation items.
- V-5 and V-6 pass.

**Cause:**
- The dominant residual is a consistent ~30 % shortfall of the existing velocity feed-forward (about 20 ms effective delay, rate-independent; 93 % of the variance on H5), plus the liftoff gain blend.
- The acceleration term overcompensates (phase lead).
- Allowance: rise 10.8 mm / descent 4.1 mm. The frozen trajectory cannot certify. (Caveat: the preregistered representative trajectories rise 1.8× more than the E2 swing.)

**Stopped.** Recommended next: a diagnostic-only investigation of the velocity-feed-forward shortfall.

No E2 run. Not pushed.

### E2-5: swing velocity-lag diagnosis (diagnostic only; nothing changed) (`e2/SWING_LAG_DIAGNOSIS.md`)

**Authority:** user decision 2026-10-06 (`sources/2026-10-06_user_decision_lcvff_diagnostic.md`).

**Instrumented the whole command path** (`tools/swing_lag_diag.mjs`, `swing_lag_analyze.mjs`) on constant-velocity, sinusoid and chirp trajectories; floating vs fixed pelvis; 3 bodies, both legs, 240 / 480 Hz, liftoff start.

**Rejected:**
- Jolt / actuator realisation: measured torque = the implicit law to 1e-4 N·m;
- the velocity feed-forward arithmetic (exact);
- IK conversion / frames: converged-target rates ×0.99 – 1.00 of the Jacobian-ideal.

**Cause:** the velocity feed-forward's desired joint velocity is a one-step Levenberg–Marquardt rate with the solver's initial damping μ0 = 0.01. At swing poses the smallest Gauss–Newton eigenvalue is 0.010 – 0.012, so knee / hip rates come out at ×0.31 – 0.34 for vertical foot motion (×0.86 – 0.88 forward); predicted = measured.
- The drag residual gives ≈ (1 − k)·64 ms: about 45 ms vertical, about 6 ms forward; the pooled ~20 ms / "~70 %" in E2-like swings.
- Counterfactual (that one solve with terminal damping): the lag vanishes.

**Secondary:** missing inertial feed-forward (D1's target; D1's overcompensation is explained by the drag); liftoff gain blend; pelvis coupling only amplifies an existing joint lag.

**Predicted:** corrected rate + D1 = 0.3 – 1.4 mm RMS (counterfactual).

**Smallest correction:** singularity-robust variable damping in that rate solve (or an analytic resolved rate for E2 swings). Scope (general vs E2-only) is the user's decision.

**Warning:** the 25 mm apex leaves 0.4 mm of certificate slack at φ 0.8; the corrected servo's descent deficit is 0.5 – 2.6 mm.

Not applied. Not pushed.

## 2026-10-06 (overnight): E2 estimator correction, handoff, planning gate (`sources/2026-10-06_user_instruction_overnight_e2_autonomous.md`)

### E2-6: velocity-feed-forward rate correction adopted for E2, scoped to the commanded-target term; general variable damping on both terms REFUTED (`e2/VFF_RATE_CORRECTION.md`)

**Kind:** implementation correction (option `vffRate: "sr"`, default off), within the instruction's authority (Decision 1).

**Mathematics:**
- the target-motion part of lcVff's desired joint velocity is solved with singularity-robust variable damping (Nakamura & Hanafusa; Chiaverini), written in the solver's own Marquardt form;
- μ = μmin + (μ0 − μmin)·max(0, 1 − λmin/ε²), with ε = 0.01;
- ε comes from a 45,458-problem conditioning study against the exact per-tick IK displacement: undamped exact (≤ 1.3 %) for σ_min ≥ 0.03, which covers every airborne / commanded pose; fails only at the straight knee.

**Refuted (kept as diagnostic `srAll`):** the same damping on the pelvis-motion term as well.
- External-lift harness: 4 falls and τ0 steps up to 11,553 N·m.
- Cause: an explicit, delayed pelvis-velocity loop through the leg's weak direction.

**General vs E2-only:** general (the estimator is a shared component), scoped to the open-loop term.
- Every path without a commanded target is bit-identical: external lift 12 / 12, KV0, identity.
- Configurations: PSTAR4S = PSTAR4 + it; PSTAR5BS / 5CS.

**Prior regressions under PSTAR4S:**
- E1b closing PASS: 428 / 429 verdicts identical, one improvement;
- E1a PASS;
- T-A checks PASS;
- G0 – G3 PASS;
- browser = Node;
- pre-swing P\*: see `VFF_RATE_CORRECTION.md` §8a.

**Not decided here:** PSTAR4 stays the certified E1 configuration. Whether PSTAR4S replaces it as the E1 baseline is the user's decision.

**Effect on E2 smoke steps (D1 off):** tracking RMS 5.6 → 3.6 – 4.1 mm; vertical error now lag-shaped and small (−1 / +2 mm).

### E2-7: contact-to-swing handoff — one continuity correction; the gain blend left unchanged (`e2/E2_HANDOFF.md`)

**Kind:** implementation correction (option `e2reanchorVel`, default off; configurations PSTAR5BH / PSTAR5CH), within the instruction's authority (Decision 2).

**Defect:** I-11 dropped the target-motion velocity feed-forward for the one re-anchor tick at liftoff. Under the corrected rate that is a one-tick 23 N·m τ0 dip at the knee (applied Δτ 9.6 N·m).

**Correction:** the new reference's own pose one tick before its start (its polynomial at u = −dt) replaces the previous target for that tick. Liftoff applied Δτ: 9.6 → 0.8 N·m (D1 off), 8.0 → 1.4 (D1 on). Tracking unchanged.

**Not changed, with evidence:** the contact → swing gain blend. Swing gains in contact (counterfactual) change tracking by ≤ 0.2 mm RMS (≤ 0.01 with D1).

**Liftoff transient:** inertial (forward lag up to 5.8 mm at +0.15 s without D1; 1.7 – 2.1 mm with D1), not a handoff defect.

**Identity:** KV0; PSTAR4 / 5 / 5B / 5BS unchanged.

### E2-8: servo re-validation (S2) DOES NOT VALIDATE; PG-1 0 / 32; corrected physical step measured → STOPPED, BLOCKED ON PLANNING DECISION (`e2/SWING_SERVO_VALIDATION_RESULTS_S2.md`, `e2/E2_OVERNIGHT_REPORT.md`)

**Preregistered battery** (amendment S2, written before any run; 192 runs; PSTAR5BH OFF / PSTAR5CH ON):
- representative RMS with D1: 1.3 – 2.0 mm (first battery 4.0 – 6.6); peaks ≤ 5.8 mm;
- V-3, V-5, V-6 pass; V-1, V-2, V-4 fail.

**Cause of each failure, diagnosed and not re-interpreted:**
- V-1: elevated trajectories beyond the short bodies' reach;
- V-2: the pelvis-motion residual on return / lateral segments;
- V-4:
  - energy Σ+ accumulation ∝ dt over long runs, equally without D1;
  - activation-limited hip reversal at 180 Hz;
  - box-switch Δτ0 steps at elevated poses.
- **No allowance is set.**

**PG-1: 0 / 32** with the bandwidth envelope (PSTAR5BH; margin 2.42 / 2.80 mm at φ 0.80) and with the S2 rule's allowance as a what-if (margin 2.23 mm).
- The frozen reference is 5.40 mm above the turf at φ 0.80, so any allowance above 0.40 mm fails.
- A window-consistent allowance is ≈ 0.75 mm.

**PG-2:** 4 / 4 CERTIFIED (unchanged). **PG-3:** pass.

**Physical smoke matrix** (non-test, 96 runs, PSTAR5CH, certificate not enforced):
- tracking RMS 0.84 – 1.76 mm;
- E2-3 92 / 96 (clearance 4.96 – 4.98 mm at φ 0.80 for V2-165-62 forward);
- E2-5 78 / 96 (impact peak 26 – 43.5 % BW: forward, heavier bodies, rate-dependent peak);
- E2-9 94 / 96;
- all other criteria 96 / 96.

**Clearance at φ 0.80:** reference 5.7 – 5.85 mm; vertical error +0.5 … +2.4 mm (lag, helps); foot tilt −0.7 … −1.2 mm.
- The tilt is caused by the ankle's passive damping, which is 33 % of the ankle servo's damping.
- Counterfactual `vffPassive`: +0.5 – 0.8 mm clearance but higher impact. Not adopted.

**Decisions needed (not taken):**
- A: apex / window (recommendation 30 mm apex);
- B: E2-5 impact metric / landing approach;
- C: servo-battery criteria under the corrected estimator;
- D: PSTAR4S as the E1 baseline.

No official E2 run. Not pushed.

## 2026-10-06: E2 apex 30 mm (`sources/2026-10-06_user_decision_e2_apex30.md`)

### E2-9: amendment A30 recorded (apex 25 → 30 mm, versioned); PG-1 does NOT certify (0 / 32) → STOPPED; servo-validation v2 PROPOSED (`e2/E2_PREREG_AMENDMENT_A30.md`, `e2/E2_A30_PG1_RESULTS.md`, `e2/SWING_SERVO_VALIDATION_V2_PROPOSAL.md`)

**Decision taken (user):** A1, the nominal apex is 30 mm.
- Recorded as the versioned trajectory `A30` (`E2TRAJ`, `--traj=A30`; default v2 bit-identical) and a preregistration amendment, before any A30 run.
- Everything else unchanged: T, knot timing, measured-liftoff semantics, thresholds, controller.
- The amendment documents the measured φ-resolved tracking uncertainty: 0.75 mm worst at φ 0.75 – 0.80 in both the independent S2 battery and the E2 matrix. The budget is 1.60 mm at φ 0.8 (0.40 at 25 mm).
- It also corrects the overnight report: the window-restricted per-phase allowance is 2.24 mm, not 0.75.

**PG-1 (A30): 0 / 32.**
- The gate (PSTAR5CH): the planner refuses, because no validated tracked allowance exists.
- Envelope model: margin 3.41 – 3.62 mm.
- S2 rule what-if: 3.46 mm. Window per-phase what-if: 4.39 mm.
- Only the φ-resolved offline check would certify (5.87 mm, margin 0.87).
- The swing is path-certified for all bodies.
- Geometry is no longer limiting; the gate is servo validation.

**Touchdown (existing 25 mm data, analysis only):**
- the instantaneous peak scales with the solver step (480 / 180 Hz ratio up to 2.30);
- 10 ms window-mean load does not (≤ 0.95);
- recommended: E2-5 impact as the max 10 ms-window-mean load ≤ 25 % BW. **Not adopted.**

**Proposed, not adopted:** SV-2, an E2-envelope-representative servo battery.
- Ground-ending E1a-length step pairs, corridor-edge and harder reachable cases, a reachability pre-check;
- V-2 gating on |β_ON| only;
- a φ-resolved allowance in the evaluator's convention.

No 30 mm touchdown matrix, smoke or official run. Not pushed.

## 2026-10-06: SV-2 servo battery (`sources/2026-10-06_user_decision_sv2_battery.md`)

### E2-10: SV-2 frozen and run; DOES NOT VALIDATE → STOPPED; allowance not entered, PG-1 and the touchdown matrix not run (`e2/SWING_SERVO_VALIDATION_V2_PREREG.md`, `e2/SWING_SERVO_VALIDATION_V2_RESULTS.md`, `e2/TOUCHDOWN_A30_ANALYSIS_PLAN.md`)

**Frozen before any run** (84b92b1 [published as 7bde433]):
- one E2-shaped ground-ending step per run;
- reachability pre-check with the planner's certifier: C-L11 rejected for 7 bodies;
- 876 runs;
- four separate verdicts.

The touchdown analysis plan (S1 rule, sourced 10 ms rationale) was committed before the evaluation was read.

**Result:** the representative set R passes everything. Otherwise:

| item | result | where and why |
|---|---|---|
| T-1 | FAIL | C-F7 0.26, C-L5 0.28 (≤ 0.25). The residual is vertical and D1-insensitive |
| I-2 | FAIL (52) | touchdown foot-flat transients 6 – 21 ms after contact, beyond the E1a-7 onset window (C-F13, H), and C-L11 |
| I-3 / I-4 | FAIL (6 / 4) | C-L11 on V2-long-legs: a servo runaway at φ ≈ 0.8 near the reach boundary, also with D1 off; certified reachable but not executable |
| I-6 | FAIL (84) | landed-foot contact loss after long fast landings (H-D, H-F15), and C-L11 |

T-2, T-3, I-1, I-5 and I-7 pass. Tracking RMS with D1 is 1.3 – 2.3 mm, rate-stable.

**Allowance:** computed for the record, NOT VALID.
- The descent-end bin is 1.65 mm (raw 1.6004).
- What-if PG with these bins: 0 / 32, margin 4.977 mm at φ 0.80, short by 0.023 mm.

**Touchdown at 30 mm** (SV-2 data, reported):
- the 10 ms mean is rate-robust (ratios ≤ 1.08);
- but forward 0.10 m landings exceed 25 % BW at 180 Hz (8 / 16, up to 27.8 %), and 0.13 m at every rate.

**Corrections:**
- the 25 mm touchdown analysis (E2-9) used integer-tick windows, so its numbers are superseded by the exact-window recomputation;
- the "≥ 2 ticks" justification was wrong.

**Decisions pending (user):**
1. reachability scope (execution feasibility);
2. the touchdown and descent-end mechanism: the vertical residual makes contact early and fast;
3. T-1 axis and gating;
4. the φ 0.80 clearance margin under the round-up.

Not pushed.

## 2026-10-06: vertical-residual diagnosis (`sources/2026-10-06_user_decision_vertical_residual_diag.md`)

### E2-11: descent-end / touchdown vertical residual DIAGNOSED (diagnostic only; nothing adopted) (`e2/VERTICAL_RESIDUAL_DIAGNOSIS.md`)

**Method:**
- 884 matched diagnostic runs: fixed / floating / replayed pelvis, turf removed, D1 on / off, vertical-only vs full vs harder trajectories, 180 / 240 / 480 Hz, mechanism counterfactuals.
- Default-off hooks, with the default path verified bit-identical (KV0, E2 hashes, SV-2 record, suite 58 / 58).

**Cause M1: floating-base pelvis-motion coupling** (the ankle-height error and the whole T-1 vertical residual).
- The velocity feed-forward's pelvis-motion term keeps damping μ0, so the leg's damping drags the foot with the pelvis's vertical velocity.
- Kinematic pelvis replay reproduces it exactly. An undamped pelvis term removes it.
- D1 fed the measured pelvis acceleration does not help.

**Cause M2: uncompensated passive ankle damping** (the orientation error, 0.5–1.9 mm of the lowest point).
- 0.2 N·m·s/rad at about 0.85 rad/s, balanced by the proportional term: 0.99° predicted vs 0.94° measured.
- Present with or without a moving pelvis.

**Also established:**
- Servo remainder 0.1–0.4 mm, partly rate-dependent.
- No contact anticipation: turf-off is bit-identical until geometric contact.
- The reference itself is consistent: it ends exactly on the turf.

**Touchdown chain:**
- Contact speed ∝ δ^0.62 (r 0.90, 315 touchdowns), so contact is early and fast.
- M2's tilt gives edge-first contact, then a foot-flat slap (I-2).
- M1 makes the landing leg arrest the pelvis. Most of the 10 ms "impact" is premature load: 22.3 → 10.2 % BW with the pelvis term kept through contact.
- Contact retention also depends on the hand-back start state and the post-contact hold.

**T-1:** meaningful as frozen. C-F7 0.259 → 0.009 and C-L5 0.275 → 0.088 with the causes removed. No amendment.

**Reachability:** V2-long-legs at ≥ 0.095 m lateral. The body's motion during the swing drives the knee target to its 70° soft limit, so the bounded IK fails and the torque runs away. It is clean with the pelvis pinned. The certifier needs execution feasibility (predicted pelvis trajectory, soft-limit margin, torque feasibility). Not changed.

**Proposed, not implemented (smallest principled correction):** in the general swing servo's velocity feed-forward,
- (A) the pelvis-motion term with singularity-robust damping, weighted by the airborne weight a;
- (B) the passive joint damping (the `vffPassive` form; your standing instruction keeps it diagnostic-only).

Both are needed together. Worst binding-bin deviation −1.11 → −0.37 mm; approach speed 0.093 → 0.046 m/s.

**Side effects needing decisions:**
- the flat landing raises the lateral-step load in the swing-only scope;
- contact retention needs touchdown design.

**Separate decision:** touchdown and descent design (the δ^0.62 law, hand-back, post-contact hold, the 25 % BW concept).

The φ 0.80 failure is preserved. Not pushed.

## 2026-10-06: A + B implementation and factorial validation (`sources/2026-10-06_user_decision_AB_touchdown.md`)

### E2-12: A + B implemented (default off); validation DOES NOT VALIDATE → STOPPED at stage 2 (`e2/AB_VALIDATION_PREREG.md`, frozen 54629de [published as 1a65417]; `e2/AB_VALIDATION_RESULTS.md`)

**Implemented (default off, bit-identical when off):**
- **A** (`vffPelvisAir`): the pelvis-motion part of a commanded swing's velocity task gets the same singularity-robust damping as the target part, weighted by airborne weight × commanded-swing weight.
- **B** (`vffPassiveRef`): passive ankle damping compensated once, on the reference rate.
- Recording-only torque ledger.

Identity: KV0, E2 hashes, SV-2 record and suite all identical. The external-lift harness is 12/12 bit-identical with A + B.

**Battery: 1,728 runs (4 configurations × 8 bodies × 2 legs × 3 rates × 9 trajectories).**

Passed:
- T-1, frozen: every id passes under AB (BASE fails C-F7 / C-L5, reproducing SV-2).
- Causal confirmations C-1…C-3: T-1 collapses by A, not B; tilt is removed by B; β_y is reduced by A.
- Tilt −90 %.
- Worst binding-window deviation −1.60 → −0.60 mm.
- Energy, margins, rate stability, ledger closure, identity and integrity (H-set I-6 78 → 32).

Failed:
- **AB-4a / 4b:** 7 runs (V2-198-92, R-L, both legs, all rates) exceed the commanded-torque continuity limit by 0.7–6 % within −2 … +5 ticks of contact. Cause: the hip's velocity feed-forward × the contact gain blend × the hand-back, i.e. the touchdown transition. A raises it from 82 % of the limit to just above it.
- **AB-7:** R-L β_y falls only 47 % (required 50 %). A is only partly active for about 90 ms after liftoff while the airborne weight ramps; after φ 0.2, A reaches the pinned-pelvis level.

Decisions pending (user). Touchdown coordinator not started. Not pushed.

## 2026-10-06: AB2, touchdown coordinator, execution feasibility (`sources/2026-10-06_user_decision_AB2_coordinator.md`)

### E2-13: AB2 VALIDATES (A + B qualified as swing mechanisms); touchdown coordinator STOPPED at design (substantive conflict); execution-feasibility extension implemented and verified

**AB2** (`e2/AB2_VALIDATION_PREREG.md` frozen 28f2632 [published as 3c46742]; `e2/AB2_VALIDATION_RESULTS.md`): the versioned amendment with ownership split by lifecycle / measured-contact semantics.
- 1,728 / 1,728 runs, bit-identical to the AB battery (preserved as FAIL).
- Every item passes: airborne-window β_y −56 … −74 %; swing continuity clean; no regression outside the contact transition; T-1 unchanged.
- The contact transition (AB: 6 / 0 / 8 runs R / C / H) remains the coordinator's requirement.

**Touchdown coordinator** (`e2/TOUCHDOWN_COORDINATOR_DESIGN_STOP.md`): a default-off draft (`ctrl/v2_touchdown.js`, `SupportLifecycle.setHold`, `tools/td_val.mjs`), checked on design-verification smoke runs. Not preregistered, validated or adopted.

The conflict: within T = 0.6 s, the apex knot at T / 2, the validated A + B acceleration / jerk envelope and the validated uncertainty band (u_dn 1.53 + contact margin 0.5 mm), no C2 final approach can simultaneously:
- complete tangential motion before the band;
- bound normal approach speed low (best ≈ 60 mm/s);
- stay inside the validated jerk envelope.

Also:
- heavy lateral steps contact with ≈ 0.4 rad/s pelvis-driven foot rotation;
- near-contact continuity is driven by the pelvis feed-forward × the contact gain blend.

Options pending (user): timing (longer T / earlier knot / contact-seeking placement from the band top), capability (pelvis angular-acceleration feed-forward; a higher-jerk servo validation), a near-contact transition design, the requirement level.

**Execution feasibility** (`e2/EXECUTION_FEASIBILITY.md`):
- `certifyExecution`: nominal-path gating (soft-limit reach, conditioning, rates, torque vs capacity / headroom, self-collision, swept clearance, final posture) plus pelvis-envelope flagging.
- `tools/exec_qualify.mjs`: closed-loop replay qualification.
- 240 Hz sweep: 144 / 160 qualified, no false rejection. All 16 rejections are C-L11, including the V2-long-legs counterexample, rejected by the replay before runtime.
- Not yet wired into `plan()`.

Stopped before PG-1 / official E2 as instructed. Not pushed.

## 2026-10-06/07: 1A / 1B (`sources/2026-10-06_user_decision_1A1B_touchdown_timing.md`)

### E2-14: 1A DOES NOT VALIDATE (one item), 1B DOES NOT VALIDATE → stopped before the touchdown coordinator

**Preregistration** (`e2/FB1A_TR1B_PREREG.md`):
- design and criteria in d6d4868 [published as c4c7061];
- freeze in 452cc60 [published as 0150ce8] with amendments A1 – A3 (A3 disclosed the smoke prediction that 1B fails).

**Results** (`e2/FB1A_TR1B_RESULTS.md`, `e2/evidence_fb/`): 2,160 / 2,160 runs; G passes (identity; determinism vs AB2 864 / 864).

**1A** (`d1FloatBase`: floating-base angular terms in D1's task conversion; α̂ only while genuinely airborne).
- Correct: 1A-0's added error ≤ 10⁻⁶ against a like-for-like control.
- The full AB2 contract passes, as does 1A-3.
- **Fails 1A-2(a), set H:** max foot angular speed at the first touching tick 0.464 vs AB 0.363 rad/s; the median improves.
- Diagnosis: on fast H-T45 swings that tick already carries the contact impulse (pivot spike), and AB's spike falls one tick later. Before the impact the configurations do not differ (post-hoc).
- Behavioural effects are small and mixed.

**1B** (`lcTransition: "cmd"`: complete approach / accommodation laws blended at command level under an E1a-7-certifying governor).
- Construction checks pass: identity before engagement, closure, 0 transition-caused violations.
- **Fails 1B-3 / 1B-5 / 1B-7:**
  - transition-region violating runs R 6 → 10, H 8 → 42 (max commanded 64.4 N·m);
  - 6 new rebounds;
  - landed-foot slip up to 10.4 mm.
- All violating ticks are the approach law's own change: swing damping × A's singularity-robust pelvis rate kept through the impact (the `srAll` mechanism). The per-factor a-blend had partly absorbed it.

**Corrected attribution** (prereg §0):
- the near-contact commanded rate is swing damping × q̈\* (pelvis rotation + reference) before contact, and the impact jolt after it;
- the gain blend contributes ≤ 4.5 N·m / tick;
- the coordinator draft's foot pitch was ankle activation-bound saturation.

**Options pending (user):**
- 1A: amend the measure to the last contact-free tick, or do not adopt;
- 1B: put A's singularity-robust treatment out of the terminal regime before the possible-contact band (inside the coordinator design), or share the pelvis-motion rate;
- whether to proceed to the coordinator on the AB baseline.

Not pushed.

## 2026-10-07: overnight runway, TD2 touchdown coordinator (`sources/2026-10-07_user_decision_overnight_runway_coordinator.md`)

### E2-15: 1A not adopted, 1B rejected (user); TD2 designed, preregistered, qualified and validated → DOES NOT VALIDATE (clean inside its certified window) → stopped before the prerequisite gates

**Design study** (`e2/TD2_DESIGN_STUDY.md`): finite candidates compared offline.
- Rejected: C0 the AB baseline; C1 the corridor (infeasible); C5 the clock; C6 the creep.
- **Selected C2:** the validated swing to the foothold + band height, then a bounded rest-to-rest search, until measured contact; E2 acceptance / hand-back; lifecycle accommodation.

**Preregistration and freeze** (`e2/TD2_PREREG.md`; d14d34f [published as 3bb6752] / 5015dc6 [published as d285f10], A1 – A5):
- the parameters were re-derived from a turf-off qualification of the new trajectory region (Decision 4): h_B 2.80 mm, D_max 2.70 mm, τ_s 0.205 s, τ_c 0.1459 s;
- a 0.085 s tangential-settling interval was added (Decision 2);
- the escalation was made E2-style smooth.

**Results** (`e2/TD2_RESULTS.md`; 1,824 runs):
- **Nominal and late, 864 runs: all clean:**
  - 0 E1a-7 violations (AB 14);
  - impact ≤ 11.9 % BW (AB ≤ 60 %; 261 runs > 25 %);
  - horizontal contact speed ≤ 34 mm/s (AB 176 runs > 50);
  - 0 rebounds;
  - the AB2 contract kept.
- **Fails:**
  - early (turf at the band top: bit-identical to AB; predicted);
  - beyond (the escalation's E2-style T_min drop: 28 / 96 violating runs; counterfactual TD2-step escalation clean 18 / 18);
  - TD-10 touchdown-time rate stability (up to 18.8 ms vs 10 ms, from the servo's rate-dependent deviation × 42 – 73 ms / mm at low contact speed).

**Decisions pending (user):**
- uncertified early-contact scope;
- the escalation continuation as a TD2 step (E2 S-LATE semantics);
- the touchdown-time rate criterion.

Not pushed.

## 2026-10-07: TD2B, the next TD2 iteration (`sources/2026-10-07_user_decision_TD2_next_iteration.md`)

### E2-16: TD2B DOES NOT VALIDATE (out-of-envelope early terrain only); clean inside the certified window, for beyond / noground, and on physics-rate invariance

**Preregistration** (`e2/TD2B_PREREG.md`; 13d2d09 [published as b6fe3c0]; freeze 9cab1a9 [published as 2200cd9]):
- certified window from contact geometry + qualified tracking + terrain uncertainty (h_B 2.85, D_max 2.75, τ_s 0.21 s);
- early / late terrain ±0.05 mm inside the window; earlyOOE +10 mm under E2 §2a;
- escalation = continued bounded search to the planner's turf; noground = explicit failure;
- TD-10 replaced by derived cross-rate bounds.

**Results** (`e2/TD2B_RESULTS.md`; 2,688 runs):
- **Pass:** nominal, earlyC, lateC, beyond and noground: 0 E1a-7 violations, impact ≤ 14.3 % BW, no rebounds; B-10 physics-rate invariance.
- **Fail: earlyOOE** — B-9 integrity in 170 runs, B-11 handling in 16 (aborts / falls). Mechanism:
  1. a collision at ≈ 180 mm/s;
  2. E2 hand-back overshoot 3.3 – 4.3 mm into the turf;
  3. an unreachable IK target;
  4. D1 evaluated at a singular configuration, so the commanded torque explodes (to 10¹⁸ N·m).
- Counterfactual: no D1 for unreachable targets removes every Σ+, abort and fall (24 / 24).

**Decisions pending (user):** a D1 robustness guard (versioned controller correction); the earlyOOE requirement.

TD2 stays a FAIL. Not pushed.

## 2026-10-07: D1 guard and TD2C (`sources/2026-10-07_user_decision_D1guard_TD2C.md`)

### E2-17: D1G + TD2C preregistered (freeze step 1, before any code)

**Preregistration:** `e2/D1G_TD2C_PREREG.md`.

**D1G** (a versioned controller correction, default off):
- D1 is used only when the leg's IK target is reached (residual ≤ 1e-6), J_f is conditioned (λ_min(J_fᵀJ_f) ≥ IK.srEps², the certifier's gate) and the result is finite.
- Otherwise the last valid D1 fades out over the lifecycle's release time (0.10 s), with a ramp back in from zero.
- It is bit-identical when never engaged.
- Design evidence: with reachability alone, the remaining D1 spikes occur at reached but ill-conditioned targets (λ_min 5e-6 … 3e-5).

**Independent validation DG-0 … DG-7:**
- default identity;
- bit-identical equivalence on AB, in-window TD2C and SV-2 servo-on runs;
- a reach-stress set without terrain (finite, bounded commands, energy);
- a controller-level L / R mirror test;
- determinism and rate consistency;
- exact transition law, with the guard-attributable step within the E1a-7 commanded bound.

**TD2C** = TD2B (unchanged) + D1G, with the three event classes:
- TOUCHDOWN: full contract;
- LATE_TOUCHDOWN: search / escalation contract;
- UNEXPECTED_OBSTACLE: handling U-1 … U-7 (energy, finite bounded commands, stability, no fabricated support, authoritative collision, explicit classification, safe outcome under E2 §2a; abort / fall allowed);
- plus TOUCHDOWN_FAILED.

Obstacle heights +5 / +10 / +20 mm. The U-1 collision-window energy reading is disclosed, with the strict verdict reported.

TD2 and TD2B stay FAIL. Not pushed.

### E2-18: D1G validation DOES NOT VALIDATE as preregistered → stopped before TD2C

**Battery:** `e2/D1G_RESULTS.md`; frozen 3914a0c [published as 19eb4d5]; 774 jobs.

**Pass:**
- DG-0 identity;
- DG-1 (c): 432 / 432 SV-2 servo-on runs bit-identical with the guard (6 engaged = the already non-executable V2-long-legs C-L11);
- DG-2 (i – iii, v): finite, no over-capacity, exact guard bound, every stress engaged;
- DG-3 (b), DG-4 (a, b);
- DG-6: exact law, guard step ≤ 6.2 N·m, held D1 ≤ 116 N·m.

Guard off vs on: commands 10²⁰ – 10²¹ → ≤ 4.2 · 10³ N·m; Σ+ 2,500 → ≤ 0.9 J.

**Fail:**
- **DG-2 (iv):** 26 runs above B_cmd, caused by the servo's joint-rate feed-forward (vffServo ≈ 21 rad/s × D at straight-leg unreachable targets), not D1. The no-D1 counterfactual is unchanged; suppressing the rate feed-forward on invalid ticks gives ≤ 1 kN·m.
- **DG-5:** 43 runs, rate-dependent (180 Hz 37, 240 Hz 6, 480 Hz 0). Unaffected by removing D1 or the rate feed-forward; accrued while the leg is held at end range. Consistent with TD-15 / Phase G.
- **DG-3 (a):** 4 / 4,056 samples where the bounded IK lands in different basins for mirrored inputs at a reach-boundary fold. The guard rule is leg-agnostic.

**Stop rule applied:** TD2C not run; D1G not adopted.

**Decisions pending:** rate feed-forward guard vs B_cmd reading; the 180 Hz end-range energy (TD-15) scope; the IK mirror fold.

Not pushed.

## 2026-10-08: rate-feed-forward guard and combined qualification (`sources/2026-10-08_user_decision_rate_ff_guard_combined_qualification.md`)

### E2-19: DVG (D1G v2) preregistered (freeze step 1, before any repository code)

**Preregistration:** `e2/DVG_PREREG.md`. D1G v1 stays FAIL and unadopted; B_cmd is not redefined.

**DVG:**
- One validity verdict and one fade weight per leg, for **all** IK-derived feed-forward: D1, the joint-rate feed-forward ω\* and the B reference rate.
- **Verdict:** V1 reached, V2 conditioned, V3 finite, V4 the certifier's torque feasibility at the **commanded** coordinate rate (the actuator's force–velocity envelope).
- **Fade:** from the last valid terms (or, entering invalid, from the applied ones). The weight step is slew-limited so the guard's own step is ≤ ½ of the E1a-7 commanded bound.
- **Domain:** every commanded-target tick. It is bit-identical when never engaged.

**Combined qualification CQ-0 … CQ-6:**
- identity;
- bit-identical equivalence (AB, SV-2, E1a / E1b);
- reach stress against the capacity / rate semantics (finite, over-capacity 0, applied joint rates inside the force–velocity envelope);
- mirror and L / R;
- determinism;
- energy E1a-8, with failures attributed to TD-15 only against a paired no-feed-forward reference (excess ≤ 0.05 J);
- the exact transition law, with the guard step ≤ the E1a-7 commanded bound.

**Item 2:**
- The 180 Hz hold-phase build-up is independent of D1, of the guard and of the rate feed-forward: it persists with no IK-derived feed-forward at all, and that reference itself exceeds Σ+ 0.5 J. It is pre-existing integration debt, TD-15-consistent.
- D1G's per-tick spikes were partly caused by the unguarded rate feed-forward; they are not debt.
- TD-15 gates any later certification of that regime; it is not investigated now.

**Item 3:** confirmed:
- identical equations, and soft-limit tables exactly mirrored on 8 bodies;
- the reached side is an interior solution, while the stalled side parks the knee on its soft bound and reports unreached (conservative);
- 72 L / R pairs show no outcome bias.

**TD-17 (debt):** bounded-IK branch selection at a soft-bound fold (active-set path dependence). It is not gated in CQ or TD2C.

Not pushed.

### E2-20: DVG combined qualification DOES NOT VALIDATE as preregistered → stopped before adoption and TD2C

**Battery:** `e2/DVG_RESULTS.md`; frozen 7de6c00 [published as d3f9bcc] (erratum E1); 1,522 jobs. The first run (b08b77a [published as 6b7ab90]) was aborted unevaluated.

**Pass:**
- CQ-0 identity; CQ-1a (AB 432 / 432 bit-identical); CQ-1c (E1a / E1b 38 / 38 bit-identical, incl. P15);
- CQ-2 (finite, 0 over-capacity, joint-rate commands ≤ 0.35 × force–velocity limit);
- CQ-3b, CQ-4;
- CQ-5 (24 energy failures, all attributed to TD-15 against the no-feed-forward reference);
- CQ-6 (exact law, guard step ≤ 0.66 × bound, incl. after target release).

Guard off vs on: commands 10¹⁷ – 10²¹ → ≤ 1.35 kN·m; Σ+ up to 2,499 J → ≤ 0.89 J.

**Fail:**
- **CQ-1b:** SV-2 C-L11 on V2-long-legs (out of the executable envelope) at 180 Hz: I-4 saturation 4.26 → 5.17 % (one knee axis, 33 ms, during the fade). Meanwhile I-2 applied (0 violations), I-3 and the blow-up are resolved.
- **CQ-3a:** one mirror mismatch that the classifier missed as an IK fold. The knee is 4.5 · 10⁻¹⁰ rad inside its soft bound and the exact `atBound` flag is false: a mechanical tool defect.

**Decisions pending:** CQ-1b judgement for out-of-envelope runs; the CQ-3a erratum; then adoption → TD2C → E2 sequence.

Not pushed.

## 2026-10-08 — Publication rewrite of the 33 unpublished commits (user decision; source `sources/2026-10-08_user_decision_publication_rewrite.md`)

- **PUB-1:** the generated archive `e2/evidence_smoke_H/runs_records_240_REF_165.tgz` (105,822,358 B, > GitHub's 100 MiB limit) is removed from the unpublished history `e519c8f` [published as `d202cac`] … `6e03afe` [published as `e5ea11f`] only. No Git LFS. Nothing published is rewritten.
- **PUB-2:** 33 commits replayed one for one: same trees minus that path, same order, parents, author and committer identities and dates; original messages plus provenance trailers. Old → new map, verification and regeneration: `PUBLICATION_REWRITE_2026-10-08.md` / `.tsv`. The new head of the rewritten tail is `e5ea11f` (old head `6e03afe`).
- **PUB-3:** the archive is kept locally outside Git (SHA-256 `765df83e…`), and regenerable with `e2/scripts/run_smoke_matrix_H.sh` on `9578ccf`. The matrix's compact evidence stays committed.
- **PUB-4:** references to rewritten commits now carry `old [published as new]`; run logs keep their original hashes, with `commit.published.txt` beside them.
- **PUB-5:** evidence storage. Raw per-run record archives (`runs_records_*.tgz`) are git-ignored, and any generated archive of 50 MB or more stays outside Git under the policy in `EVIDENCE_STORAGE_POLICY.md`. A local pre-commit size guard is in `tools/git-hooks/`.
- No simulation result, criterion or code path changed.

## 2026-10-08 — E2-21: DVG2 qualification PASS (after evaluator erratum E1); DVG adopted (user instruction `sources/2026-10-08_user_instruction_overnight_dvg2_td2c_e2.md`)

- **DVG2** (`e2/DVG2_PREREG.md`, frozen `d426ceb`) re-qualified the unchanged DVG implementation. The DVG CQ stays FAIL as recorded.
  - CQ-3a's fold classifier corrected to margin ≤ IK.h, with a mirror-equivalence safeguard for newly classified folds.
  - CQ-1b split by the frozen execution-feasibility certifier: class A keeps the frozen gate; class B gets the physical-safety gates B-1 … B-8, with continuous saturation ≤ 50 ms (E2-11 / I-4 continuous bound = τ_deact), and the 5 % fraction reported only.
- **Result** (`e2/DVG2_RESULTS.md`): **PASS**.
  - Classification: 48 class-B cases, all C-L11; the 240 Hz verdicts are identical to the 6 Oct sweep.
  - The 6 engaged V2-long-legs C-L11 runs are class B and pass B-1 … B-8: saturation 5.2 % / ≤ 33 ms; safety items {I-6} ⊂ unguarded {I-3, I-6}; certifier still NOT QUALIFIED.
  - CQ-3a: the gated CQ mismatch is now a mirror-equivalent fold.
  - Every other item passes; 1,496 / 1,496 end hashes identical to the CQ battery.
- **Erratum DVG2-E1** (`3e1c33c`, evaluator): class-B gates read the SV-2 evaluator's per-run metrics one level too high, so the first evaluation was FAIL (CQ-1bB). It is preserved; the same records were re-evaluated after the fix.
- **Reported (TD-17):** 7 of the 13 exact-flag folds are robust to perturbation (branch difference at the fold). There is no closed-loop L / R difference (CQ-3b 96 / 96).
- **Adopted:** DVG (`d1Guard: 2`) in PSTAR5CHABV / PSTAR5CHABTDV. Next: TD2C amendment A5 and the TD2C battery.

## 2026-10-08 — E2-22: TD2C (with DVG) DOES NOT VALIDATE as preregistered (U-1 only) → STOPPED before E2 integration / PG-1 / official E2

- **Battery** (`e2/TD2C_RESULTS.md`; frozen `de464a8`, A5): 3,552 / 3,552 runs.
  - **Pass:** C-1 … C-10 (the full touchdown contract), C-6x classification, U-2 … U-7 (every obstacle run RECOVERED), TD-G2 / G3, DG-6 / DG-4b.
  - **Fail: U-1 in 54 runs, all obs20 (+20 mm)**: 180 Hz 48, 240 Hz 6, 480 Hz 0. All fail (a) Σ+ > 0.5 J; 18 (180 Hz) also fail (c), a window's cumulative closure above +0.05 J.
- **Diagnosis** (post-hoc, labelled):
  - The excess lies entirely in the collision window.
  - The first contact force precedes the sensed onset by one tick, so the frozen window (A2.8) misses the impact's dissipation tick. Measured from it, the collision never rises above its pre-impact energy (net −0.35 J).
  - The positive closure ticks accompany IK-derived feed-forward held across the impact: R0 Σ+ 0.14 J; guard off 0.98 J; DVG 0.77 J.
  - Reading: a timestep-proportional ledger closure error at a stiff impact (the TD-15 class). DVG reduces it rather than causing it.
- **SV-2R** (diagnostic only, per its prereg): would validate, all T / I items 432 / 432; allowance 1.75 … 0.55 mm, not entered.
- **Decisions needed:** U-1 for the out-of-envelope +20 mm obstacle at 180 / 240 Hz:
  - keep as frozen and investigate the impact ledger;
  - versioned U-1 (window from the first contact-force tick; net non-generation or a TD-15 attribution rule);
  - a controller change at impact.
- **Known risk for official E2:** the R-B recovery touchdown fails R-4 / R-5 on the final configuration (SMK-R diagnostic).

## 2026-10-08 — ARCHITECTURE PIVOT: simulation-authoritative supported physical character; CF-6 closed as evidence (`sources/2026-10-08_user_decision_pivot_supported_locomotion_slp1.md`)

- **CF-6 closed exactly as evidence** (`diagnostics/loco_cf6_2026-10-08/CF6_CLOSURE.md`):
  - nothing in the CF-6 folder, the preregistration (1e98e1d), the results (b6edadc) or the replays (7651a25) is altered;
  - CF-1 … CF-6 remain historical evidence.
- **Recorded reading:**
  - CF-6 demonstrated 59 consecutive genuinely continuous steps at 0.10 m/s, with convergence and no accumulating physical instability.
  - The higher-speed failures occurred in the gait / planning / control layer. They did not establish a C-class structural body limitation.
  - The 0.10 m/s motion is not production-quality walking. It is evidence about repeated physical support stability.
- **Stopped:**
  - autonomous-gait development (no CF-7; the CF-6 report's next-experiment options are not run);
  - autonomous speed increase.
- **New production locomotion architecture:**
  - The football simulation / movement layer owns the authoritative world trajectory, velocity, acceleration, facing and intended action.
  - V2 remains the physical character (body, masses / inertias, articulated colliders, joints and limits, contacts, actuators / capacities, feet, ground interaction).
  - An artificial support / locomotion-authority layer drives it along the prescribed trajectory while keeping it upright. It is not a football decision-maker and never changes football outcomes.
  - Contacts stay live while supported.
  - Intended hierarchy: strong support when unobstructed; physical reaction with support retained (small disturbance); displacement / stride disruption / stumble (moderate); support breaks and the articulated body falls (large or badly placed); later recovery reacquires support.
  - **No "impulse > X = ragdoll" rule.**
- **First task:** the SLP-1 (Supported Locomotion Prototype 1) design / preregistration only, then stop for approval. SLP-1 asks:
  - can V2-REF be externally driven through realistic-speed straight-line locomotion (≈ 1.2 / 3 / 6 m/s) while remaining a genuine contactable articulated body;
  - can a small disturbance matrix produce sensible retained- vs lost-support behaviour without autonomous balance;
  - what is the CPU cost compared with autonomous V2.
- **Constraints:**
  - default-off; regression preserved; no new randomness;
  - no V2 physical-parameter changes for appearance;
  - no football-simulation changes;
  - no TD2C / E2 resumption (they remain at E2-22);
  - no running / tackling / recovery / animation / production-walking work beyond SLP-1;
  - daily publication rule unchanged; today's work not pushed early.

## 2026-10-09 — SLP-1 STOPPED at its calibration step (preregistered stop rule), matrix not run (`slp1/SLP1_RESULTS.md`; approval `sources/2026-10-08_user_approval_slp1_with_amendments.md`)

- **Protocol:** frozen 49785b7, plus amendments 1 – 2 recorded before any evidence run (a38e8fa).
  - Amendment 1: shank disturbance-point candidates.
  - Amendment 2: leg IK at the reference pelvis, after smoke run 0 showed the measured-pelvis frame leaves the legs straight.
- **Calibration (§4.1):** no support frequency in {1, 2, 4} Hz met A1 – A6 at all three speeds. Stop rule fired: "ordinary undisturbed motion requires forces beyond the frozen caps".
  - Walk 1.2 m/s: tracked, but the support was saturated on 68 – 93 % of ticks (pelvis pitch / roll torque); posture collapsed; support carried 74 – 88 % of body weight.
  - Jog / run: the forward cap was saturated in the speed ramp → lag → recoverability margin exceeded → α decay → fall.
- **Classification:** primarily locomotion authoring (the driver gives the legs neither pelvis-orientation control nor propulsion), plus one architecture-level tension (recoverability-derived caps also carrying ordinary locomotion). No V2 body limit.
- **Held:** support integrity (no writes, caps respected); α-driven loss without state reset; determinism 9 / 9; regression 106 / 106 and components 58 / 58.
- **CPU:** no saving (walk 933 – 952 vs autonomous 892 µs per step); the driver's IK dominates.
- **Decision needed** (nothing started): A authoring fix (SLP-1b), B decouple ordinary authority from the recoverability bound, or C both. No LOC-1 / TD2C / E2 / further development.

## 2026-10-09 — SLP-1b (option A; `sources/2026-10-09_user_decision_slp1b_option_a.md`) STOPPED at calibration under the user's stop condition (`slp1/SLP1b_RESULTS.md`)

- **Amendment:** `SLP1b_AMENDMENT.md`, frozen 1137244, versioned driver "1b".
  - B1: stance legs use the controller's validated posture "ik" frame; swing legs use the actual frame.
  - B2: foothold shift a_ref / ω² for propulsion.
  - B3: half-sine stance forces for flight gaits.
  - B4: support tracks the scheduled-force oscillation.
  - Caps unchanged. SLP-1 preserved (version "1" reproduces its hashes).
- **Calibration:** D0 × f {1, 2, 4} × walk / jog / run, each twice, all identical pairs. No configuration meets A1 – A8.
  - walk falls at 2.42 / 6.91 s, or (4 Hz) is dragged with the support 100 % saturated and the legs carrying 9 %;
  - jog falls at 2.08 – 2.17 s; run falls at 2.61 – 2.73 s.
- **Why:**
  - Before the first forward-cap saturation (≈ 0.4 – 1.0 s after gait start), the legs carry 78 – 123 % of body weight and hold the pelvis (pitch ≤ 1.5° in walk / jog), but supply little propulsion (the support gives 52 – 88 % of the positive forward impulse).
  - Through-COM leg forces need a COM lead that the path-holding support suppresses; momentum lag then turns touchdowns into braking, the forward cap saturates, the capped pelvis push against foot braking pitches the body past the 81.8 N·m cap, and it collapses.
  - Jog / run stance loads decay after impact, and the support carries the flights.
- **Classification:** architecture (with balance removed, the support is the sole momentum corrector, and recoverability-derived caps are too small for ordinary stabilisation), plus authoring gaps (start-up propulsion, no trajectory-consistent COM lead, stance-force realisation). No V2 body limit.
- **CPU:** 827 – 951 µs per step vs 892 autonomous; no saving.
- **Matrix / impactor:** not run.
- **Awaiting user decision:** separate the ordinary-stabilisation caps from the recoverability bound (option B), and / or the authoring items.

## 2026-10-09 — Architecture clarification: separate A (locomotion authority), B (physical support / recoverability) and C (leg / skeletal locomotion); SLP-1 / SLP-1b preserved as failed experiments; design SLP-2 first (`sources/2026-10-09_user_decision_slp2_separation_design.md`)

- **Not adopted:** option B "as currently framed" (raising the recovery caps until they propel the body). The caps stay conceptually tied to disturbance recovery.
- **Clarified:** authoritative football locomotion may supply ordinary translation directly.
  - The legs explain the motion: plants, leg motion, pelvis orientation, contacts. They are not required to generate the net forward impulse.
  - A collision must not silently change a decided football outcome, and the locomotion authority must not erase a collision response.
- **Next:** the SLP-2 architecture draft only (`slp2/SLP2_ARCHITECTURE_DRAFT.md`), then stop for approval. No TD2C / E2, autonomous gait, polish, tackles, recovery or running development.

## 2026-10-09 — SLP-2 STOPPED at calibration (user stop rules: support budget exceeded; B carrying ordinary locomotion); matrix not run (`slp2/SLP2_RESULTS.md`; approval `sources/2026-10-09_user_approval_slp2.md`)

- **Frozen:** 03455b8; no amendments. Production-contract clarification recorded in §0 (calibration experiment; D report-only; not the gameplay contract).
- **A** (uniform whole-body field α·m_i·a_T) delivered exactly the authoritative momentum in every run (94.69 / 236.7 / 473.46 N·s = M·v). It read no state, applied no torque, wrote nothing, and cost ≈ 3 – 7 µs per step.
- **Legs (C) braked net −202 to −369 N·s:**
  - impulsive braking at touchdown;
  - stance braking growing with the lag (inverted-pendulum positive feedback);
  - no flight launch in jog / run (B carried 300 – 650 N in flights).
- **B** absorbed the braking (+216 … +395 N·s) until its forward cap, then pitch collapse.
- **A9** (mean |B| ≤ 25 % of caps) and **A10** failed at all speeds and frequencies. Walk falls or is dragged; jog falls at 2.38 – 2.60 s; run at 2.85 – 2.93 s. 9 / 9 deterministic pairs.
- **Classification:** A / B separation validated for translation; failure = C contact realisation under decision 3; no V2 body limit. SLP-1 / 1b preserved (hashes reproduced). CPU 819 – 944 vs 892 µs per step.
- **Awaiting user:** C contact quality (LOC-1-type), a restricted refinement of decision 3, or ending the SLP series.
