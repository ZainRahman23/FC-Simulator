# PPR-2 audit of PPR-1's suspect criteria (read-only)

PPR-1's preregistration, criteria and verdict are unchanged: B FAILED 12 / 23. This audit asks only whether each suspect criterion was physically justified, and proposes corrected criteria **before** any PPR-2 qualification runs.

**Data:**
- `ppr1/evidence/PPR1_PROBES_B.json`, `PPR1_DESIGN_TABLE.json`, `PPR1_EVAL.json`;
- V2's own gate criteria, `g1/G1_CRITERIA.md`.

## 1. PR1: "yield ratio ≥ 1.5 for both signs" at ankle, knee, hip and lumbar

**What the physics requires.** An activated joint yields when the muscles that the motion **stretches** reach their eccentric or short-range limit. Pushing the other way, the joint first **unloads** the tonically active muscles. The torque can then change by roughly the whole tonic torque, plus the antagonists' small reserve, before any limit is met. So the response stays elastic for much larger torques. A stance ankle pushed into plantar flexion is also blocked by the ground.

| case (B) | tonic torque | elastic range toward the probe | 40 / 30 N·m probe | yield ratio | verdict |
|---|---|---|---|---|---|
| lumbar flexion, − (into extension) | −22.5 N·m (extensors) | unloads the extensors: ≈ 25 N·m before the flexor side yields | 30 N·m | **1.00** | **elastic, physically correct.** The criterion was wrong |
| ankle_R dorsi / plantar flexion, − (foot pushed into the turf) | −10 N·m | the sole contacts the ground; the motion is blocked | 40 N·m | **0.93** | **ground-blocked, physically correct.** The criterion was wrong |
| ankle +, knee ±, hip ±, lumbar + | — | stretched side | — | 1.69–3.07 | yield, as expected |

**Verdict: not physically justified as written.**

**Proposed PR1′:**
- Yield ratio ≥ 1.5 only for probes that **stretch the tonically active side**: the sign that opposes the tonic torque.
- The opposite sign must stay **elastic** (ratio ≤ 1.3) while |T| is below the unloading range (|τ_tonic| + the antagonists' isometric reserve).
- Ground-blocked axes (the stance ankle pushed into the turf) are excluded and reported.

## 2. PR2: "damping share < 50 % at 50 ms" from a linear K–D fit

**What was measured.** A least-squares Δτ = −K·Δθ − D·Δω fit over the hold, applied to a joint that is **designed** to be nonlinear (elastic, then yielding).
- The fit quality for B's small probes was R² = 0.21–0.92.
- Two fits returned **negative** stiffness: ankle + K = −480, knee − K = −125.

A damping share computed from such fits is not a measurement.

**Verdict: not physically justified for a yielding joint.**

**Proposed PR2′:** damping is measured directly instead:
- (a) the intrinsic damping ratio from the free response after a sub-yield release (logarithmic decrement), against human ζ ≈ 0.2 [M];
- (b) the viscous share as D·ω / (total actuator torque change) computed from the law's own terms at 50 ms, reported per probe.

## 3. IMP1 / H4: "joint-anchor separation ≤ 1 mm"

**V2's own specification** (`g1/G1_CRITERIA.md`, spec §1.3):
- 1.3a: joint separation **transient ≤ 5 mm**;
- 1.3c: **at rest ≤ 1 mm**.

The separation falls with the simulation rate (G1: 5.3 / 2.5 / 1.1 / 0.4 mm at 180 / 240 / 360 / 720 Hz in its "awkward" scene). It is a constraint-solver accuracy figure, not anatomy.

**PVP-1A, and PPR-1 after it, applied the at-rest 1 mm value to violent transients:**
- B's 1.43–1.48 mm during 10 kg / 3 m/s impacts is a transient;
- A's 0.61 mm in the PVP window was below it only because A barely moves.

**Verdict: the 1 mm transient threshold is not justified.** It contradicts V2's own 5 mm transient criterion.

**Proposed corrected criterion:**
- transient ≤ 5 mm (spec 1.3a);
- at rest ≤ 1 mm (spec 1.3c, evaluated after settling);
- the actual maximum reported, with the joint and the speed.

## 4. QS3: "do not fall earlier than A − 0.25 s"

**A is not a physiological reference.** It is a zero-latency, critically damped, 1.5 × load pose spring, and it falls in 1.45 s anyway.

Tying a physiological body's standing to A's fall time rewards non-physiological stiffness and damping. A correct reference is the physical expectation for a body with **human** intrinsic properties (PPR-2 §4: a credible-duration analysis).

**Verdict: not physically justified.**

**Proposed:** replace QS3 with a credible-duration criterion derived from human intrinsic stiffness and the entry posture (the PPR-2 preregistration).

## 5. A finding outside the criteria: the PVP entry is not a loaded equilibrium

Three properties of the PVP-1A-DX runner entry are measured here (`ppr2/scripts/ppr2_substrate.mjs` `restStatics`, and the fixture poses). Each acts on every body; how visible it is depends on how compliant the body is.

**(a) The runner hovers 0.5 mm above the turf with no ground preload.** For ≈ 10 ms the feet carry far less than the ≈ 725 N body weight, and the load overshoots when it arrives (A: 0 → 146 → … → 1,173 N by step 8).

**(b) Both feet are rolled 4.43° onto their medial edges.** The sole normals are (0.0005, 0.997, ∓0.077); at release only the medial edge (z = ∓0.164 m) is loaded.
- A compliant ankle lets each foot settle flat in the first ≈ 30 ms: ≈ 5° of frontal ankle rotation and ≈ 4 mm of pelvis drop.
- A's stiff pose spring keeps the feet partly on their edges (1–2°).
- The ≈ 5° "start-up roll" reported earlier in PPR-2's exploratory runs is this flattening. It is not a spin of the unloaded foot, as first suspected.

**(c) The frozen statics are not a rest equilibrium.** SnapshotTone's bias is the PostureDriver feed-forward. That driver applies, at each sole centroid, a force directed through the COM: a linear-inverted-pendulum force whose forward components on the two feet do not cancel, which describes a body accelerating forward. For a body at rest, with the centre of pressure under the COM:
- ankle plantar-flexion demand ≈ 21 N·m per ankle; the bias supplies 10.0–10.6;
- knee bias 7.2–7.5 N·m extension against a rest demand of 1.0–1.3;
- hip flexion −8.1 against −8.9 to −9.2;
- spine, neck and arms are identical.

A stiff spring (A) absorbs the 11 N·m-per-ankle deficit at a ≈ 1.3° lean. A body with human intrinsic stiffness cannot: with the PostureDriver bias, PPR-2's exploratory substrate drifts 10 mm in 0.25 s; with rest statics, in ≈ 0.85 s.

**This overlaps the PVP contact**, which starts at step 3. It was present, unreported, in PPR-1's window, for both A and B. Its effect on PPR-1's verdict is not re-litigated here; it is recorded for PPR-2's qualification and replay. The replay uses the PVP-1A-DX fixture unchanged, so (a) and (b) will be present in it.

## Summary

| PPR-1 criterion | physically justified? | proposed correction |
|---|---|---|
| PR1 | no (both signs) | PR1′: stretched side yields, unloading side stays elastic, ground-blocked axes excluded |
| PR2 | no (linear fit on a nonlinear joint) | PR2′: log-decrement ζ, plus the viscous share from the law's own terms |
| IMP1 / H4, 1 mm | no (at-rest value used as a transient) | transient ≤ 5 mm, at rest ≤ 1 mm (V2 spec 1.3a / c) |
| QS3 (A as reference) | no | a credible-duration criterion from human intrinsic properties |
| H1 / H2 / H3 / PR3 | **yes**: they caught a real zero-latency path | kept (activation frozen until the latency) |
| QS1 / QS2 / QS4 / P1 | yes in intent | kept in form; thresholds re-derived from the human substrate analysis (PPR-2) |
