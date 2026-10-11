# PPR-2 report: the physiological standing body

**Decision: C.** Quiet standing fundamentally needs a continuous, delayed, low-bandwidth balance controller on top of the physiological substrate.

**The candidate substrate S\* did not qualify: 36 / 45 frozen criteria.** So there was **no PVP replay**, and PVP-1A-DX stays sealed.

**The B and C body-spec extensions are needed** by the pre-stated test: S_A fails I1a where S\* passes.

**The remaining substrate defect is identified and is not architectural.** The pre-disturbance tone model, "rest statics + 2 % co-contraction", leaves:
- the hip with ≈ 17 N·m/rad of intrinsic stiffness per side, against a human ≈ 48–74;
- the lumbar spine almost limp in lateral bending.

As a result the open-loop body sits back into a squat, the trunk tipping back over the hips, 2–3 × faster than a human's hip and trunk would diverge [E].

**PPR-1 is preserved unchanged** (B FAILED 12 / 23, commit 06591e7d).

Commits:
- instruction f1f24783;
- design, audit, preregistration and freeze **e454b068**, committed before any candidate battery run;
- results: this commit.

Review: http://127.0.0.1:8350/ppr2/review/PPR2_REVIEW.html

Labels: [M] measured human, [E] derived, [D] design, [S] V2 spec. Everything in §4–§6 is measured in V2 unless labelled.

---

## 1. The three findings, kept separate

| | Finding | Kind | Status |
|---|---|---|---|
| **A** | Pre-contact activation must be a function of the pre-contact state only | control law | **Corrected.** Excitation is fixed at entry and there is no regulator. Struck vs unstruck activation is bit-identical over 300 ms (PPR-1 B: 0.0195 drift) |
| **A2** | The frozen tone must be the static load **of a body at rest** | control law | **New finding, corrected.** SnapshotTone's PostureDriver statics are a forward-accelerating leg-line force: ankle 10.0–10.6 N·m against 20.7–21.7 at rest, knee 7.2–7.5 against 1.0–1.3. Every compliant body (PPR-1's B included) began falling at t = 0 |
| **B** | V2 has no mid-range passive elasticity (ankle, knee, hip, lumbar, neck) | body spec | **Needed.** Literature values, untuned (§2) |
| **C** | The short-range / eccentric reserve is strain-based, not velocity-gated | actuator law (plateau e unchanged) | **Needed at the ankle.** Its plateau scales with activation, so it is tiny wherever activation is tiny (§5) |

**The PVP entry is not a loaded equilibrium** (`PPR2_CRITERIA_AUDIT.md` §5). The runner hovers 0.5 mm, both feet are rolled 4.43° onto their medial edges, and the statics are leg-line. Any compliant body flattens its feet in the first ≈ 30 ms (≈ 5° of frontal ankle rotation, ≈ 4 mm of pelvis drop). This overlaps PVP contact (step 3) and was present in PPR-1's window.

## 2. B and C, from biomechanics and isolated tests

**B values** (`PPR2_CANDIDATE_S.json`, per side): ankle dorsiflexion 46 N·m/rad (Loram 2007a [M]), knee 17 (Riener & Edrich [E]), hip 19 [E], lumbar flexion 10, neck 1.6 / 2.4 [M]. Each acts about its anatomical slack angle. V2 already has this mechanism (the G3-R7 neutral-zone term, used today only for ankle fabd and the toe), so B is a **parameter extension**, not new architecture.

**C:** V2's plateau of 1.20–1.35 × isometric is adequate per the literature (slightly generous for soleus). V2's window, however, erases the strain force at zero velocity, whereas physiologically it persists up to yield, then plateaus (Rack & Westbury 1974; Lin & Rymer 1993).

**Isolated ankle (I1, both legs, K/mgh, end of a 41.7 ms ramp at the measured angle).** Each laws row is the stiffness, with its ratio to the human value in brackets:

| | 0.24° | 0.48° | 0.97° | 2.0° | 4.1° |
|---|---|---|---|---|---|
| human (Vlutters 2015 power law) [E] | 0.98 | 0.81 | 0.67 | 0.55 | 0.45 |
| CURRENT V2 | 11.6 (at 0.15°) | 11.4 | 11.3 | 11.5 | 10.7 |
| S_A (A + A2) | 1.46 | 1.46 (**1.81 ×**, fails) | 1.06 | 0.72 | 0.51 |
| **S\* (A + A2 + B + C)** | 1.17 (1.20 ×) | 1.17 (1.44 ×) | 0.83 (1.24 ×) | 0.57 (1.03 ×) | 0.44 (0.98 ×) |

At 71 ms (Sakanaka 2021 window) S\* gives 1.06 / 1.02 / 0.54 at 0.17 / 0.35 / 0.78°, i.e. **1.08 / 1.29 / 0.89 ×** human. S_A's hold collapses to 0.32 at 0.72°, and to 0.02 at 3.6°.

## 3. Qualification (frozen at e454b068; PVP-independent; SOLO runner in the PVP entry pose)

| criterion | S\* (candidate) | S_A (reference) | CURRENT V2 (reference) |
|---|---|---|---|
| **total** | **36 / 45 FAIL** | 31 / 45 | 41 / 45 |
| QS1 standing envelope exit ≥ 0.45 s | ✗ 0.26 s (hip_L flexion 3°) | ✗ 0.43 s (lumbar 3°) | ✗ 0.41 s (COM 10 mm) |
| QS2 e-folding ≥ 0.175 s (λτ ≤ 1) | ✗ **0.125 s** | ✗ 0.102 s | ✓ 0.265 s |
| QS3 leaves the envelope ≤ 4 s (not superhuman) | ✓ | ✓ | ✓ |
| I1a / I1b ankle vs human | ✓ / ✓ | ✗ / ✓ | ✗ / ✗ (10–15 ×) |
| I2 knee ≥ 17 N·m/rad | ✓ 126 / 74 | ✓ | ✓ 292 |
| I3 hip 30–91 N·m/rad | ✗ **16.6 / 16.7** | ✗ 237 / 234 | ✗ 109 |
| S1 small: no collapse, bounded sway | ✓ fwd / back; ✗ **left / right** (pelvis −15 / −14 mm, lumbar lateral 23°) | ✗ fwd, left, right | ✓ |
| S2 not rigid (≥ 0.2°) | ✓ all | ✓ | ✓ |
| S3 small: transient settles by 300 ms | ✓ fwd (0.998); ✗ back, left, right (1.06–1.58) | ✗ all 4 | ✓ |
| S4 small: no loss | ✓ all | ✓ | ✓ |
| M1 moderate: substantial sway or yield | ✓ all | ✗ left, right | ✓ |
| M2 moderate: no loss within 300 ms | ✗ **fwd** (XcoM crosses at 287 ms) | ✗ fwd | ✓ |
| L1 large: loss of no-step balance | ✓ all (29–33 ms) | ✓ | ✓ |
| C1 continuum small < moderate < large | ✓ all 4 | ✓ | ✓ |
| R1 / R2 release | ✓ / ✓ (no measurable oscillation) | ✓ | ✓ |
| E1 energy ledger (planted feet) | ✓ (worst −1.27 J, lateral moderate) | ✓ | ✓ |
| INT1 / INT2 separation | ✓ 0.71 mm / ✓ ≤ 0.072 mm | ✓ | ✓ |
| DET | ✓ bit-identical | ✓ | ✓ |

## 4. Diagnosis of S\*'s failures (post-qualification diagnostics; the verdict is not changed)

**Root cause: tone, not architecture.** S\*'s pre-disturbance excitation is u± = (rest statics)/capIso + 0.02. On any axis whose static load is near zero, one or both sides carry only the 0.02 co-contraction. Their strain reserve is (e − 1)·0.02·capIso ≈ **0.15–1 N·m**, with an elastic range of **0.03–0.5°** (`evidence/PPR2_DIAG_RESERVE_SSTAR.json`):

| axis | reserve +/− (N·m) | elastic range +/− | passive (B) |
|---|---|---|---|
| hip flexion | 0.97 / 4.8 | 0.17° / 0.83° | 19 |
| lumbar lateral | 0.55 / 0.55 | 1.5° / 1.5° on K = 21 N·m/rad | none |
| knee flexion | 1.06 / 0.90 | 0.54° / 0.46° | 17 |
| ankle dorsiflexion | 0.15 / 4.9 | 0.03° / 0.94° | 46 |

**What this does:**
- **QS1 / QS2 and I3: hip and trunk.** The leading open-loop mode is **hip extension**: the trunk tips back over the hips while the knees flex and the ankles dorsiflex, a sit-back squat.
  - At 0.26 s: hip −3.0°, knee +1.2°, ankle +1.0°. At 0.50 s: hip −11.5°, knee +7.5°, ankle +7°.
  - Meanwhile the pelvis drops but the COM stays over the feet (3.5 mm forward at 0.67 s).
  - Hip extension is resisted only by the flexor side, toned at the 0.02 co-contraction: reserve 0.97 N·m, elastic range 0.17°. The extensors' fixed drive keeps pulling.
  - After the start-up the hips sit on that yield plateau, so they offer only B: 17 N·m/rad each, ≈ 34 for the pair. The human intrinsic value is 95–147 (Kiemel 2008 [M]), against an upper-body gravitational stiffness of ≈ 150–170 [E].
  - The open-loop trunk folds with **e-folding 0.125 s**, i.e. λτ = 1.40 for τ = 0.175 s. That sits *on* the theoretical delayed-PD limit (√2), so even an ideal human-latency controller could barely hold it.
  - A human's hip and trunk, with ≈ 3–4 × this stiffness, would diverge ≈ 2–3 × more slowly [E].
- **S1 lateral (within τ as well).** A small (15.9 N·s) lateral pelvis push bends the lumbar spine 2.6° at 50 ms, 10.4° at 175 ms and 23° at 300 ms (`evidence/PPR2_DIAG_TIMELINE_SSTAR.json`). The lumbar lateral stiffness of 21 N·m/rad is below the trunk's own gravitational stiffness of ≈ 90 N·m/rad [E]. Woodhull-McNeal 1986 [M] found the trunk muscles *continuously* active in relaxed standing ("guy wires").
- **S3 and M2.fwd lie beyond τ.** Inside τ (0–175 ms):
  - the joint-speed settling ratio is 0.79–0.97 in every direction;
  - the moderate forward push still has a +27 mm XcoM margin at 175 ms; it crosses only at 287 ms.

  Past τ, a human's delayed responses act and the substrate alone keeps going: S\*'s relative COM velocity after a small push is the same at 300 ms as at its peak. **This is a limitation of the battery I preregistered.** Its 300 ms window runs past the loop delay. It is reported, not changed.
- **Not a V2 architecture limit.** V2's actuators co-contract on every axis, and integrity, separation and determinism all pass. What is missing is the *level* of physiological pre-disturbance co-activation at the hip and trunk. No quiet-stance %MVC data were found for the thigh, hip or trunk (literature gap, STANDING_SUBSTRATE_LITERATURE §9).

**S_A** shows the trade-off from the other side. Its PPR-1 slip rule lets the elastic force use the whole co-contraction window (≈ 4 N·m), so its hip is 3 × too stiff (235 N·m/rad). It still fails standing (e-folding 0.10 s, lumbar), lateral pushes and the ankle curve.

## 5. Measurements requested (S\*; full numbers in `evidence/`)

**Stiffness curves:**
- ankle: §2;
- knee elastic at 100 ms: 126 / 74 N·m/rad at ±0.57°, 37 / 29 at ±2.29°;
- hip: 17 at both amplitudes and signs, apart from the transient 123 at 71 ms for +2.29°.

**Damping:**
- No release test shows a measurable oscillation (all overdamped or non-returning).
- Viscous share of the torque change at 50 ms: ankle 0.06, knee 0.34–0.48, hip 0.82, lumbar 0.54.
- Intrinsic ζ is 0.2 by construction [D]. The hip is damping-dominated because its elastic part has yielded.

**Eccentric / concentric:**
- e± unchanged (V2 1.20–1.35 [S]).
- Realised: at a 4.17° platform stretch (end of ramp) the actuator increment per ankle is ≈ 10.4 N·m. Of that:
  - B ≈ 3.3 N·m;
  - muscle ≈ 7 N·m (strain plateau 4.9, co-contraction margin and the ramp's damping share).

**Torque and torque rate:** peak torque rate 204–817 N·m/s (knee) and 709–2,838 N·m/s (hip) in the isolated ramps. CURRENT V2: 3,900–13,000 (knee).

**Joint displacement:** maximum relative deflection is 3.4–3.9° for small AP pushes, 23° (lumbar lateral) for small ML pushes, 7.5–8.1° / 32° for moderate, and 34–60° for large.

**COM / support:**
- XcoM margin minimum: small AP 36–69 mm; small ML 138–145 mm.
- Large pushes lose no-step balance at 29–33 ms.
- At rest the COM is 60 mm ahead of the ankles (the human value is 58 ± 5 mm, Di Giulio 2019 [M]).

**GRF** (`evidence/PPR2_DIAG_GRF_*.json`):
- quiet-stance friction ≈ 77 N per foot (the wide stance's inward pair, as the rest statics assume);
- small lateral push: the loaded foot rises to 457 N and the other falls to 221 N;
- large lateral: the far foot falls to 12–20 N, and the total vertical peak is 1,117–1,438 N.

**Energy (small forward push):**
- external work 0.92 J;
- actuator work −4.40 J (absorbing, including gravity work during the drift);
- passive damping loss 0.30 J;
- ledger residual −0.07 J.

Large lateral pushes leave a residual of −26 J, but the ledger has no turf-contact term, so foot impacts and sliding appear as residual; these are not judged.

**Separation:** transient ≤ 0.71 mm (large lateral), at rest ≤ 0.072 mm.

**Stability duration:** standing-envelope exit at 0.26 s; departure e-folding 0.125 s; pelvis drop 10 / 25 / 50 mm at 0.42 / 0.58 / 0.72 s.

**Oscillation:** none measurable.

**Determinism:** bit-identical.

**CPU:** S\* ≈ 668 µs per step in total versus CURRENT V2's 653. The law adds ≈ 20 µs per step. The total is dominated by the Jolt step and the passive layer.

## 6. Standing: passive versus feedback, and the controller it needs (defined; not implemented)

**Passive mechanics plus fixed pre-activation cannot stand.** Every variant, CURRENT V2 included, leaves the standing envelope within 0.26–0.43 s. The literature agrees unanimously.

The open-loop failure mode in this 14° athletic crouch is **not ankle toppling** but hip/trunk folding and flexed-knee buckling. Small pushes are not arrested by the substrate either: the strain plateau covers only ≈ 0.6–1.1° of extra lean, and human reflex and long-latency responses at 50–100 ms supply the rest.

**Credible duration of the passive substrate:** up to the postural loop delay, τ ≈ 150–200 ms (Peterka & Loughlin 2004: 0.175 s), after any disturbance. Inside that window the human *is* the substrate. That covers the whole PVP window, 0–120 ms after contact.

**What the substrate must also provide, and S\* does not yet:** an open-loop divergence slow enough for a τ-delayed loop to hold, λτ ≤ 1.
- S\*: λτ = 1.40.
- A human, by the same calculation: ≈ 0.4–0.7 at the hip and trunk [E].

**The controller** (`PPR2_DESIGN.md` §8):
- **continuous from t = 0**, with no trigger;
- **inputs:** the COM relative to the base of support, trunk orientation and the key joint angles, each delayed by ≥ 150 ms and low-pass filtered (≲ 1–2 Hz). Corrections can be continuous or intermittent (≈ 2–2.6 per second);
- **gains** ≈ 1.3 mgh and 0.46 s·mgh at whole-body level;
- **output** only as slow modulation of each joint's excitation through the activation dynamics.

**Why it cannot become a zero-latency collision response:** its output at time t depends only on the state at t − τ. That is testable with the same struck-vs-unstruck bit-identical activation test used here, for t < t_contact + τ.

## 7. PPR-1's criteria (audit, read-only)

Proposed in `PPR2_CRITERIA_AUDIT.md` before any qualification, and applied in PPR-2:

| PPR-1 criterion | verdict | replacement in PPR-2 |
|---|---|---|
| PR1 (both-signs yield) | not justified | stiffness-versus-amplitude curves against human curves |
| PR2 (linear-fit damping share; R² 0.21, K < 0) | not justified | R1 / R2 plus the law's viscous share |
| 1 mm transient separation | not justified | 5 mm transient / 1 mm at rest (V2 spec) |
| QS3 (A as reference) | not justified | QS1–QS3 |

The PPR-1 verdict itself is unchanged.

## 8. Decision and next steps (for review)

**Decision C** (rule pre-stated in `PPR2_PREREGISTRATION.md` §5):
- there is no architecture-attributable failure: INT, DET and finiteness all pass;
- S\* leaves the standing envelope, so QS3 holds;
- B and C are needed: S_A fails I1a and S\* passes it.

**Proposed next phase** (owner decision; nothing started):
1. **Pre-disturbance co-activation spec for the hip, trunk (incl. lateral) and knee in the athletic stance**, from EMG literature (%MVC). Then re-qualify the substrate with the same frozen battery. The target is human intrinsic hip stiffness (95–147 N·m/rad for both hips) and λτ well below 1. A minor battery amendment is also needed: judge settling and moderate-push loss inside τ, and report 175–300 ms as context. That would be a new preregistration, not an edit of this one.
2. **Only then, the continuous delayed controller (C)** as its own preregistered phase. It must pass the struck-vs-unstruck activation identity for t < t_contact + τ.
3. **B as a V2 body-spec parameter** (neutral-zone stiffness per axis) when V2 next moves.
4. **The PVP entry fixture** (hover, edge-tilted feet, leg-line statics) needs an owner decision before any PVP replay. Every compliant body will flatten its feet during the collision.

## What surprised me

- **The frozen statics halve the ankle tone a body at rest needs.** The PostureDriver's leg-line force is the cause.
  - A compliant body falls from t = 0 under it: 10 mm of drift in 0.25 s, against ≈ 0.85 s with rest statics. PPR-1's B stood on these statics.
  - CURRENT V2's stiff pose spring absorbs the deficit at a lean of ≈ 1.3° [E].
  - Whether rest statics would change CURRENT V2's own 1.45 s fall was not tested, because CURRENT V2 is preserved unchanged.
- **The "start-up roll" was the feet going flat.** Both feet were written onto their edges.
- **Adding passive tissue made the ankle *less* stiff at small amplitude.** Tissue takes over part of the static load from muscle, and that muscle's short-range stiffness had been ≈ 50 % above human values.
- **The open-loop collapse is a sit-back squat, not an ankle topple.** It is hip extension with the knees buckling.
  - Driving it is a fixed extensor tone that nothing on the flexor side opposes.
  - It is fast enough (λτ = 1.4) that the tone model, rather than the controller, is the next bottleneck.
- **My own battery's 300 ms window was longer than the loop delay that bounds what any passive substrate can be judged on.**
