# V2-G1: passive physics report (after decisions C1–C7)

**Status: B. G1 NOT YET PASSED.** Every remaining failure is reduced to one of four measured causes. Four decisions are needed (D1–D4 below; also in `DECISIONS.md`).

- No anatomical or approved specification value was changed. V1 is untouched (guard OK).
- **G2 not started. Nothing pushed.** The review server is running on :8172.
- All work is committed locally on `prototype/physical-character-v2`.

**Supporting files:**
- `G1_CRITERIA.md`: criteria **v2**, pre-registered and committed before the final run;
- `G1_TABLES.md`: every number, generated from `json/` (§ refers to it);
- `json/g1_results.json`: the final gate run;
- `json/g1_boot.json`: the C3 experiment v2 (v1 is kept as `json/g1_boot_v1.json`);
- `json/boot_face_model.json` and `../calc/boot_face_model.py`: the boot contact mechanism;
- `json/g1_margins*.json`: the measured engine-stop margins (gate and candidate);
- `json/g1_browser.json`: the browser = Node check;
- `shots/`: the review stills.

## 0. Verdict in one page

**G1 establishes (passes):**
- **Passive joint tissue = the specified law, applied exactly.**
  - Rig: 34/34 tests.
  - After the drive fixes (§ 2), Jolt's applied motor impulse equals the intended implicit law to 1.3e-3 N·m, even on twisted 2-DOF joints, where it previously did not.
- **Couplings exactly as specified (5c):**
  - hip-flexion onset 80 / 100 / 120°;
  - ankle DF 20 / 27.5 / 35°;
  - screw-home [−3, 2] → [−30, 20]°;
  - hip ER −45 → −40°.
- **No unexplained energy, no hidden support:**
  - 74 gate runs; contact-free gain 0.000 J;
  - free flight: the COM accelerates at g within 1.2e-4 m/s² over 7,690 airborne steps;
  - no world constraint, root force, body damping or sleeping.
- **Momentum (C6 floor-based):** linear 4.4–6.5e-6, angular 2.7–3.0e-3 on all six bodies. The free-body floor is 1.5e-3 / 5.6e-3 / 1.3e-2 at 1 / 3 / 6 rad/s.
- **Determinism:**
  - ×3 across two processes: 17/17 scenarios bit-exact (per-tick hash, contact sequence, joint extrema, fall timing);
  - snapshot / restore: 4/4;
  - browser = Node: 10/10 curated scenarios bit-identical (§ 8).
- **C7 high-speed envelope: 8/8.** No missed turf collision, no tunnelling or missed limb collision (exact geometry), no catastrophic joint failure. The tests cover 10–20 m/s limbs and bodies: dive, side fall, head-first, 15 m/s drop, kick into the turf, kick into a shin at about 20 m/s, goal post, and leg into leg at about 20 m/s.
- **Engine stop never reached on V2-REF** (the C2 margins were measured there). impact15 (the C7 EXTREME test) passes every check on V2-REF.

**What still fails, by cause:**

| cause | failures | decision |
|---|---|---|
| **1. Boot contact generation.** Jolt drops the boot's deepest point when its chosen face lies within 21 mm; the coarse approved polytope makes that happen in about 1 % of orientations, up to 31 mm. | V2-REF: 1.4a (leanB 10.4, leanL 10.4, shoulderFirst 11.1, singleLeg 13.9 mm); 1.4b (singleLeg 13.9, awkward 6.1 mm at rest); 1.4d (perturb: forearm into boot, 24.5 mm). V1-matched: perturb, singleLeg 1.4a. Long-legs: leanL 1.4a. | **D1** |
| **2. Impact rebound at 60 iterations.** Warm-started impulses at a hard impact are not converged. | dropA 1.2a / 1.2b: 0.72 J (V2-REF), 0.73 J (V1-matched). | **D2** |
| **3. End-stop compliance** (my [ENG] value under C2: 100 % capacity 3° past the limit). Loaded joints pass by up to 20–25°, depending on body and rate. | 1.3b engine-stop ticks on the variants, V1-matched and other rates (for example long-legs awkward: elbow 114 ticks); 1.3d (V1-matched singleLeg 1.35° at rest). | **D3** |
| **4. Test definitions.** | 8 timestep (partly chaos); 1.4h arm part (V2-165-62); 1.4b at 5.0007–5.0008 mm (slop convergence); impact15 HS.4 on V1-matched (25 mm). | **D4** |

**If D1a + D2a + D3a + D4 are approved:** the measured candidate (10-piece boot + 150 iterations, its own margins) already passes 63/74 body-scenarios. What remains is covered by D3a / D4, plus one D1 caveat (§ 1, D1).

## Decisions needed (nothing applied)

The full table with evidence is in `DECISIONS.md` ("Decisions needed").

| # | question | recommended |
|---|---|---|
| **D1** | How the boot reaches Jolt: keep the approved hull's 2 pieces (edge sinks up to about 15 mm), or the identical hull as **10 convex pieces** with manifold reduction off + pair cache off (max sink 4.1 mm, turf ≤ 6.8 / 2.7 mm in falls, physics +19 %)? Caveat: in the 20 m/s kick-into-shin test the thinner pieces miss contact for 3 steps (HS.3); the 2-piece boot misses none. | 10 pieces; then decide on the shin-kick caveat |
| **D2** | Validation baseline **150 velocity iterations** (impact rebound gone in every tested case; physics +55 %; 22 players 2.25 / 2.36 CPU s per simulated s, versus 1.75), or keep 60 and live with impact rebounds (no numerical-floor argument exists)? | 150 |
| **D3** | End-stop compliance: keep the 3° stop and (i) measure the emergency-stop margins over the whole validation set (every body, rate, envelope) and (ii) tie 1.3d to the stop's compliance (≤ 1.5° at rest = 50 % of capacity; measured maximum 1.35°)? Or have me make the drive carry a stiffer stop first? A 3× stiffer stop removes the ticks but injects 23–70 J at 240 Hz today. | keep 3°, (i) + (ii) |
| **D4** | (a) Timestep: compare posture / COM against the same-rate perturbation spread (µm perturbations move the final COM up to 0.11 m), keeping integrity + timing at every rate. (b) Drop the arm part of 1.4h (an arm-trunk impact at speed is impossible within the approved shoulder ROM from the test start) and test arm loading in the envelope. (c) Evaluate 1.4b "≤ slop" at 0.01 mm. (d) impact15 report-only (outside the C7 credible envelope). | all four |

## 1. The four causes, with the evidence

### D1: boot contact generation (C3 follow-up)

**What is wrong is the contact generation, not the solver.**

**Mechanism** (Jolt 5.6.0 source):
- `ConvexHullShape::GetSupportingFace` picks the face whose normal best matches the contact.
- `ManifoldBetweenTwoFaces` keeps that face's clipped points if any lie within speculative + manifold tolerance (21 mm). It falls back to the deepest (EPA) point only if none survive.
- The solver acts on the manifold points.

So when the chosen face does not contain the piece's deepest vertex, the boot sinks until that face reaches the turf.

**Reproduced three ways:**
1. **Lone boot in Jolt** at the singleLeg rest orientation: it free-falls through the turf for 8 ticks while Jolt reports the growing depth, then stops at 12.3 mm. The contact point sits 13.3 mm above the true lowest vertex.
2. **Offline model** of the face rule (`calc/boot_face_model.py`): it gives 11.0 / 12.3 mm for the two pieces at that orientation, exactly Jolt's values.
3. **Jolt held sweep** (loaded boot, rotation locked, 200 random orientations): max sink 14.7 mm.

Solver settings do not change it. From one identical mid-run state, 60–250 velocity and 2–8 position iterations all give 12.4–12.5 mm.

**Representations (identical external geometry; § 17–18):**

| boot | model: misses > 10 mm / worst | Jolt held sweep: worst | falls (S3): turf max / rest | falls passing |
|---|---|---|---|---|
| single hull (approved) | 1.6 % / 35 mm | 14.7 mm | 35.2 / 5.4 mm | 3/11 |
| 2 pieces (adopted, C3) | 1.0 % / 31 mm | 14.7 mm | 13.9 / 13.9 mm | 5/11 |
| 4 pieces | 1.4 % / 31 mm | 12.6 mm | 10.5 / 6.1 mm | 4/11 |
| **10 pieces (AP 5 × ML 2)** | **0 % / 1.2 mm** | **4.1 mm** | **6.8 / 2.7 mm** | 6/11 (the rest are impact energy, D2) |
| 12 pieces (AP 4 × ML 3) | 0 % / 1.6 mm | 3.6 mm | 4.4 / 2.7 mm | 6/11 (impact energy) |

Many-piece boots **require** manifold reduction off + pair cache off (S3). With Jolt's defaults:
- the 12-piece boot explodes in falls (5,251 J, 200 mm separation);
- the 10-piece boot creeps 3.4 mm under quiet loading.

The C3 rig's unheld edge / toe cases tip over (COM 19 cm above a 5.6 cm half-width), so they are not resting tests. The new held cases are.

### D2: impact rebound at 60 iterations (C1 follow-up)

This is a rigid-body solver effect, not the passive layer:

| dropA variant | energy rise |
|---|---|
| as gated | 0.717 J |
| passive layer off | 0.95 J |
| warm start off | 0 |
| contact-only warm start off | 0 |
| joint-only warm start off | 0.10 J |
| constraint solve order changed | 0.717 J (no effect) |

**Against the iteration count (§ 13):**
- The rise is not monotonic: at 100 iterations, drop1m gains 2.5 J.
- **150 iterations is clean** in every case tested: DX-150 worst 0.04 J; the candidate shows no gated energy failure on any body.
- With the 10-piece boot, more contact points make it worse at 60 iterations: 2.6–4.3 J.

**Cost** (measured alone; § 11):

| configuration | physics, ms/tick | 22 players × 240 Hz, CPU s per simulated s (including the 0.16 ms passive-layer JS) |
|---|---|---|
| 60 iterations (gate) | 0.171 | 1.75 |
| 150 iterations | 0.266 | 2.25 |
| 10-piece boot + 150 iterations | 0.286 | 2.36 |

### D3: end-stop compliance (C2 follow-up)

- **Margins were measured as approved:** overshoot tests, rule max(2°, ⌈1.5 × overshoot + 1°⌉), on the V2-REF scenario envelope at the baseline. Re-measured after each drive change; the installed table is the third measurement. The largest overshoots are knee rotation 20°, neck flexion 15–19° and ankle abduction 14°.
- **The margins hold for V2-REF: 0 engine-stop ticks.** On the other bodies and rates, overshoots exceed them:
  - long-legs awkward: elbow 114 ticks;
  - 198-92 upright / awkward: elbow 30 / 29;
  - V1-matched singleLeg: shoulder 33;
  - other rates: thoracic rotation, shoulder abduction, neck flexion.
- **At rest,** a joint statically loaded at its end-stop sits past the anatomical limit by load ÷ stiffness: up to 1.35° (V1-matched singleLeg) against 1.3d ≤ 0.5°.
- **A 3× stiffer stop** (100 % at 1°) removes the ticks and the rest excursion in all 8 cases tested, but the implicit drive cannot carry it at 240 Hz: 23–70 J energy injections in 6 of 8, ankle +33 J in one tick. Stiffening therefore needs more drive work; it is not a quick option.

### D4: test definitions

- **Timestep (8):**
  - Same-rate µm perturbations of the start move the final COM by up to 0.11 m; the 720 Hz comparison tolerance is 0.15 m.
  - Genuine rate effects also exist: drop1m first-contact timing converges with rate (27.8 / 18 / 8 ms at 180 / 240 / 360 Hz, limit 25 ms); leanF at 360 Hz lands supine, prone at every other rate.
  - Integrity fails at other rates only through 1.3b (D3).
- **isoSelfCol arm (1.4h):**
  - From the hanging arm, the sideways swing stops on the shoulder's adduction range about 4° before contact. It passes only by a 0.07 mm, 1-step graze, and V2-165-62 gets no graze.
  - A 45° abducted start, a 30°-flexed hugging start and a hanging hugging start all produce at most a 0.3 mm touch at end-range speed, and none on V2-198-92.
  - The approved shoulder ROM does not allow an arm-into-trunk impact at speed from rest.
- **1.4b:** V2-198-92 drop1m and V2-short-legs upright rest at 5.0008 / 5.0007 mm. That is the slop, approached asymptotically.
- **impact15:** V1-matched shows a 25 mm transient joint separation (the HS.4 threshold is 20 mm). V2-REF passes impact15 fully.

## 2. What was fixed under the autonomous instruction (demonstrated defects; DECISIONS.md G1-D2 … D8)

| fix | causal chain (measured) | effect |
|---|---|---|
| G1-D2 predictive linearisation | start-of-step linearisation let a joint enter the stiff stop for free: thoracic +9.2 J of U in one step, net +1.1 J | removed |
| G1-D3 one-sided restoring limit | the linear model could pull a joint toward its stop | removed |
| G1-D4 chord when compressing, anchored at the predicted point | the tangent under-resists convex compression (knee drive work −0.86 J vs ΔU +1.52 J); a chord anchored at the current point made a 15 mW limit cycle | removed |
| **G1-D5 drive rows on the locked axis** (knee varus, elbow carrying angle) | a twisted 2-DOF joint got only cos²t of its end-range torque and damping (perturb knee at −37°: drive work −0.88 J vs ΔU +1.50 J) | full gradient and damper |
| **G1-D6 Jolt clamps drive targets** (engine interface) | `SetTargetOrientationCS` clamps targets onto the joint limits, silently replacing the passive offset: intended (0, −7.2, −12.4)°, applied (5.5, 10.9, 7.0)° | offset encoded in the target velocity; λ/dt = law within 1.3e-3 N·m; perturb 0.785 → 0.006 J |
| G1-D7 chord cap | the per-row chord blew up on a barely-moving row (K = 1.1e5 N·m/rad, −1039 N·m) | capped by the tangent |
| **G1-D8 the one-sided limit never cuts the law torque** | at a large two-end swing the end-sign rule clamped a real gradient component (hip +28 N·m → 0.4), injecting 17 W for 0.12 s | law torque always admitted |

**Rejected alternatives (negative results kept):**
- the armed stop: +2.98 J;
- torque-sign one-sided rule: step-rate chatter, +28 J;
- hybrid rule: engine-stop contacts;
- contact-only / joint-only / full warm start off: suite worse;
- constraint priorities: no effect;
- 4 or 8 position iterations: no effect on the boot sink;
- a 3× stiffer end-stop: 23–70 J.

**Also fixed:** an adapter bug where undefined configuration values overrode defaults.

**Check clarifications** (measurement, not tolerance):
- 1.4f counts only touching points;
- impact15 runs 10 s, like every fall.

## 3. Criteria changed by decisions C1–C7 (each recorded with its evidence in DECISIONS.md)

| criterion | v1 | v2 | decision and measured justification |
|---|---|---|---|
| 1.5 | min of 10/15/20/30 with 2× margin | report; baseline 60 | C1. Measured: none of 10/15/20/30 qualifies (8, 5, 8, 8 of 17 pass) |
| 1.3b | hard-limit excursion ≤ 3° | engine stop never reached; anatomical overshoot reported | C2 |
| 1.4b / 1.4e | ≤ 3 mm / "0" at rest | ≤ 5 mm (the slop) | C5. Jolt never corrects the last slop; rests settle at 4.7–5.0 mm |
| 1.4i | — | no initial unintended overlap > 1 mm | C5 (separate metric) |
| 1.1a / 1.1b | 1e-6 | 2e-5 / 5e-3 | C6. The free-body floor table (§ 15) |
| 1.4g | ≤ 3 mm first touch at 15 m/s | report (impact15 EXTREME) | C7 |
| 7.HS | — | the no-tunnelling envelope, 8 tests | C7 |

## 4. Scenarios (V2-REF, gate baseline; § 2)

| scenario | criteria passed | failing |
|---|---|---|
| upright | 19/19 | |
| leanF | 18/18 | |
| leanB | 17/18 | 1.4a 10.4 mm (D1) |
| leanL | 17/18 | 1.4a 10.4 mm (D1) |
| leanR | 18/18 | |
| perturb | 18/19 | 1.4d 24.5 mm forearm into boot (D1) |
| singleLeg | 17/19 | 1.4a / 1.4b 13.9 mm (D1) |
| dropA | 16/18 | 1.2a / b 0.717 J (D2) |
| sideFirst | 18/18 | |
| shoulderFirst | 17/18 | 1.4a 11.1 mm (D1) |
| rotating | 18/18 | |
| awkward | 17/18 | 1.4b 6.1 mm (D1) |
| flatSupine | 18/18 | |
| drop1m | 18/18 | |
| impact15 | 22/22 | (EXTREME) |
| isoMomentum | 13/13 | |
| isoSelfCol | 13/13 | |

## 5. Joint limits, contacts, energy, passive validation, variants

See G1_TABLES.md:
- § 3: joint extrema per axis;
- § 4: contacts;
- § 5: energy / momentum;
- § 6: rig;
- § 7: variants.

**Variants: 31/40.** The failures are 1.3b (D3), 1.4a / 1.4b (D1 and the D4c slop convergence) and 1.4h (D4b).

## 6. C3 boot experiment (reported separately, as requested)

§ 17–18 and D1 above.

- **R2 + S3 was adopted** as the experiment's best (the hull of the union is the approved hull). It is clearly better than R1 on every metric: falls 35 → 14 mm; toe loading 24 → 3.6 mm.
- **The root cause found afterwards** shows that no 2- or 4-piece split can meet 1.4a everywhere. Only finer grids (10–12 pieces) remove the defect.
- **Correction to my earlier C3 reading:** the rig's edge / toe "settled" values were end states of a tipping boot, not rest.

## 7. C7 envelope (reported separately, as requested)

All 8 envelope scenarios pass HS.1–HS.4 at the gate baseline (§ 14). Reported values:
- deepest limb overlap: 43 mm (boot into the shin proxy at 20 m/s; contact was detected every step);
- self overlap: 42.8 mm (leg into leg at 20 m/s);
- turf first touch: ≤ 5.9 mm;
- engine-stop ticks: in hsPost (20), hsSide (8), hsKickTurf (3);
- anatomical overshoot: up to 20.9° (hsDrop15);
- energy rise: 0.00 J in every envelope test.

The ball's CCD is left to its own gate (C7).

## 8. Determinism and browser = Node

- ×3 across two processes: 17/17 identical (per-tick hash, contact sequence, joint extrema, fall timing).
- Snapshot / restore: 4/4 bit-exact.
- Browser = Node (headless Chrome, swiftshader, one fresh browser per curated scenario, full runs): **10/10 curated scenarios bit-identical** (`json/g1_browser.json`; driven over the DevTools protocol in real time, because `--virtual-time-budget` stalled the page).

## 9. Timestep sensitivity (§ 9)

| rate | status |
|---|---|
| 180 Hz | upright integrity fails on 1.3b (D3); drop1m timing 27.8 ms > 25 ms |
| 240 Hz | stable in all 8 scenarios |
| 360 Hz | leanF lands supine (prone elsewhere); leanF integrity fails on 1.3b (D3) |
| 720 Hz | drop1m integrity fails on 1.3b (D3) |

- The final COM against 720 Hz exceeds 0.15 m in upright, leanF, leanB, drop1m and awkward. That is the same order as the same-rate perturbation spread (D4a).
- sideFirst and isoMomentum are fully consistent.

## 10. Performance (diagnostic; § 11)

- **One player at the gate baseline:** 0.17 ms of physics plus 0.16 ms of passive-layer JS per tick.
- **22 players at 240 Hz:** 1.75 CPU s per simulated s.
- **Candidate** (10 pieces + 150 iterations): 2.36.
- The passive-layer JS (0.16 ms) is now the largest single cost. It is unoptimised, and a later gate can vectorise it.

## 11. G0 status

G0 was rerun after:
- the C4 head;
- each margin re-measurement.

Result: **PASS, 8/8 bodies**, every check.

## 12. Commit

Local only, on `prototype/physical-character-v2`; see `git log`. Not pushed.

## 13. Review

The review page is `http://127.0.0.1:8172/sandbox/visual/physchar2/viewer/g1.html`. The configuration selector offers:

| entry | what it shows |
|---|---|
| gate baseline | the approved configuration |
| DECISION CANDIDATE | 10-piece boot + 150 iterations, with its own margins |
| diagnostic | the approved single hull |
| diagnostic | the 10-piece boot at 60 iterations |
| diagnostic | 150 iterations |
| diagnostic | warm start off |

The C7 envelope scenarios are in the scenario list. Stills are in `shots/`:
- **g1_01 / 02:** singleLeg's boot resting 13.9 mm deep (gate) versus the candidate;
- **g1_03 / 04:** perturb's forearm in the boot, gate versus candidate;
- **g1_05:** the dropA rebound tick;
- **g1_06 … 11:** touchdown, mid-fall, impact15 first touch, the shin-kick envelope test, leg into leg, rest.
