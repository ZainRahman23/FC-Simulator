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

**G1 decisions needed (nothing below has been applied):**

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
