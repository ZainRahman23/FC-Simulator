# V2-G1: passive physics report

**Status: G1 FAIL. Stopped for your decisions.** 5 of 13 gate checks fail. Nothing is being changed until you decide.

- **No approved anatomical or specification value was changed.**
- One G0 construction defect was found and fixed under the defect policy: the gyroscopic force was off (G1-D1). G0 was rerun after the fix: PASS, with every hash and check value identical.
- The failures are not defects of the V2 body. They are interactions between Jolt's solver and contact model and three strict criteria inherited from V1. Each is demonstrated with a controlled experiment.
- Seven decisions are needed: G1-C1 … C7 (§ "Decisions needed"; also in DECISIONS.md).
- G2 not started. Nothing pushed.

**Supporting files:**
- `G1_CRITERIA.md`: the pre-registered criteria (commit 5e4548d, before the final run);
- `G1_TABLES.md`: every number, generated from `json/g1_results.json`;
- `json/g1_browser.json`: the browser = Node check;
- `shots/`: the visual review set.

## 0. Verdict in one page

**What G1 establishes (passes): the V2 body has valid passive mechanics.**
- **Passive joint tissue is exactly the specified law:** 34 / 34 rig tests.
  - The torque Jolt actually applies matches the spec formula (`v2_joints.passiveTorque`, independent of the layer) to ≤ 0.075 N·m at release on 28 end-range tests and 6 damping-only tests.
  - Always restoring; always returns into the soft range.
  - Never injects energy: largest step rise 5 × 10⁻¹¹ J.
- **Couplings are exactly as specified:**
  - hip-flexion onset 80 / 100 / 120° at knee 0 / 45 / 90°;
  - ankle DF 20 / 27.5 / 35°;
  - screw-home range [−3, 2] → [−30, 20]°;
  - hip ER −45 → −40°;
  - the hamstring cross torque flexes the knee.
- **No unexplained energy and no hidden support.**
  - Every contact-free step of every run (112 runs): largest gain 0.0067 J. Every residual is a loss, i.e. numerical dissipation of the implicit drive.
  - In free flight the COM accelerates at g within 1.4 × 10⁻⁴ m/s².
  - No constraint to the world; no root force; body damping 0; no sleeping.
- **Contacts behave as intended:**
  - disabled pairs: 0 manifolds in every run;
  - 43 distinct non-adjacent self-contact pairs occur (legs, arms ↔ trunk / thighs, foot ↔ foot) and stop the limbs: the 13 m/s leg-into-leg test has no pass-through;
  - standing releases touch only the boot soles, inside the plantar outline (0.00 mm outside) with normals of 0.00°.
- **Determinism is bit-exact:**
  - 17 / 17 scenarios ×3 across two processes (per-tick hash, contact sequence, joint extrema, fall timing);
  - snapshot / restore 4 / 4;
  - **browser = Node 10 / 10 curated scenarios**.
- **Finite and stable:** no NaN; frame continuity within the physical cap; worst hard-limit chatter 10 toggles per 0.5 s (at the limit, not over).
- **Cost:** about 0.19 ms per player per 240 Hz tick (Jolt 0.11 + passive layer 0.08). That puts 22 players at about 1.0 s of single-thread CPU per simulated second, against the spec's 3.2–4.8 s estimate (§20).

**What fails, and why (root causes, each demonstrated):**

| # | failing criteria | root cause | evidence |
|---|---|---|---|
| R1 | 1.2 energy, 1.5 | **Constraint warm-start overshoot at impacts.** At touchdown Jolt re-applies the previous step's large impulses as the starting guess; 10–30 iterations cannot undo them. Up to 42.5 J in one step (drop1m, 30 it). | Passive layer off: same (62.9 J), so not the passive layer. Warm start off: gone, but joint separation doubles. **60 iterations: gone** (+10–20 % cost). |
| R2 | 1.2, 1.3 | **Rigid engine hard stops.** In violent passive collapses, knees / ankles / spine reach the engine stops at the anatomical hard limit. Jolt's rigid-limit correction injects 1–5 J per step and overshoots 3–6.6°. | Stops widened 20° with the passive law unchanged: injection 0.12 J max, but joints travel 12.7° past the anatomical hard limit. Jolt SixDOF has no soft rotation limits. |
| R3 | 1.4 turf transient | **Boot hull vs Jolt's one-face manifold.** When the boot rolls onto an edge, the deepest vertex lies on another face of the hull and gets no contact point. The contact cache and manifold reduction worsen it, so the edge sinks 12–31 mm. | Contact points logged against the hull vertices; the turf shape makes no difference. Split hull + reduction off + cache off: 23–31 → 10–13 mm. |
| R4 | 1.4 turf at rest | **Head AP capsule vs Jolt's capsule face heuristic.** For tilts under about 25° Jolt contacts the turf on the capsule's side line, so the end cap rests up to 7.5 mm deep and rolls slowly before settling. | Controlled placement test. A sphere pair (same AP extent and breadth) gives a resting head sink of 0.5 mm. |
| R5 | 1.4 rest | **Spec contradiction:** penetration slop 5 mm (§15.4) means anything that once went deeper rests at about 5 mm, against turf ≤ 3 mm and self "0" at rest (1.4). | Feet rest at 4.7–5.0 mm everywhere. Slop 2 mm is worse in transients. |
| R6 | 1.1 | **Float32 engine + first-order gyroscopic step:** linear drift 4–6 × 10⁻⁶, angular 2.9 × 10⁻³, against 1 × 10⁻⁶. | A single free rigid body has a 2.5 × 10⁻³ floor. |
| R7 | 1.4 first touch, part of 8 | **15 m/s at 240 Hz** moves 62.5 mm per step against a 20 mm speculative distance: first touch 48 mm. | 720 Hz: 0.3 mm. CCD on all bodies breaks joints (26 mm). Speculative 0.065 m: bodies rest 30 mm deep (harmful). |

The best diagnostic package (not adopted) shows how far these remedies go:
- **Package P** (60 iterations + split boot + reduction / cache off + sphere-pair head) at 240 Hz: 2 / 15 contact scenarios pass every criterion.
- **At 720 Hz:** 5 / 15 pass. The remainder is almost entirely R2 (hard-stop energy) and R5 (slop vs rest).
- So **no engine setting alone makes G1 pass.** R2, R5, R6 and R7 need your decision on specification values.

## Decisions needed (nothing applied)

| # | decision | options (measured) | my recommendation |
|---|---|---|---|
| **G1-C1** | Solver budget (spec 1.5 allows only 10/15/20/30 velocity iterations) | 30 it: 2/17 pass; 60 it removes the warm-start impact injection (worst step 42.5 → 1.6 J) at 0.114 → 0.136 ms/tick lying | **Admit 60 velocity iterations** as the G1 reference |
| **G1-C2** | Engine hard stops (§13.1.4 places the rigid engine stop exactly at the anatomical hard extreme) | (a) keep it and judge hard-stop engagement by a bounded per-event criterion (≤ 2 J and ≤ 6° per event, every event reported); (b) add a stiff end-stop term to the passive potential beyond the anatomical hard limit and move the engine stop a few degrees outward (a soft stop, energy-honest by construction, needs a stiffness value) | **(b)**, if you want to keep strict energy honesty; (a) is the cheaper fallback |
| **G1-C3** | Boot collider representation (§12.2: one convex hull) | split into 2 convex pieces with the identical outer surface, plus Jolt manifold reduction off and pair cache off: boot transients 23–31 → 10–13 mm (still > 10 mm in some standing falls) | **Approve the split + engine settings**; then decide whether 10 mm transient stays |
| **G1-C4** | Head collider (C1 approved an AP capsule) | sphere pair at the capsule's segment ends: identical AP extent and breadth, 3.7 mm waist inside the −15…+5 mm head tolerance; resting head sink 7.2 → 0.5 mm | **Sphere pair** (amends C1's representation, not its dimensions) |
| **G1-C5** | Slop vs rest penetration (§15.4 vs §22 1.4) | rest criteria = slop (turf ≤ 5 mm, self ≤ 5 mm); or slop 3 mm (2 mm measured worse) | **Rest criteria = slop**, slop stays 5 mm |
| **G1-C6** | Momentum precision (1.1: 1e-6) | engine floor: linear ≤ 2e-5, angular ≤ 5e-3 over 2 s | **Engine-floor tolerances**; 1e-6 reserved for a future double-precision native build |
| **G1-C7** | 15 m/s first touch at 240 Hz (1.4) | 720 Hz physics (first touch 0.3 mm, about 3× cost); or re-scope to "no tunnelling" for whole-body impacts and keep 3 mm for the ball's CCD gate (R2) | Your call. It is tied to the deferred D7 runtime decision. |

After your decisions I would rerun G0 + G1 on the decided settings and report. I would not proceed to G2.

## 1. G1 pass / fail

**FAIL: 5 of 13 gate checks.**

Passing:
- 1.6a determinism;
- 1.6b snapshot / restore;
- 1.6c browser = Node;
- 5 passive rig;
- 5c couplings;
- V1 frozen;
- pinned engine;
- 1.7 (report only).

Failing:
- 1.5 iteration study;
- 1.S V2-REF (1/17 scenarios pass every criterion);
- 1.S′ V1-matched (2/17);
- 6 variants (4/40);
- 8 timestep.

Full matrix: `G1_TABLES.md` §1–2.

## 2. Scenarios

There are 17 curated scenarios: each tests something the others do not. ★ = in the viewer's curated set.

- ★ **upright:** quiet upright release.
- **leanF / leanB:** 5° about the ankle line (★ leanF).
- **leanL / leanR:** a mirror pair (★ leanL).
- **perturb:** an angular perturbation.
- ★ **singleLeg:** single-support release.
- **V1 Gate A A–E re-authored in V2 anatomical angles:**
  - dropA;
  - ★ sideFirst;
  - shoulderFirst;
  - rotating;
  - ★ awkward.
- ★ **flatSupine:** 0.5 m drop with a roll.
- ★ **drop1m:** 1.0 m feet-first drop.
- ★ **impact15:** 15 m/s into the turf.
- **isoMomentum:** no gravity / contact; end-range release plus a tumble.
- ★ **isoSelfCol:** leg into leg at 13 m/s and arm into trunk, no gravity.

Falls run 7 s; impacts and isolated tests run 2 s. Every scenario is a pose plus a placement plus a velocity field. After release, only gravity, inertia, the joints, the passive tissue and contact act. Nothing scripts the fall.

## 3. Joint-limit extrema

The worst excursions past the engine hard limit (V2-REF, constraint space; `G1_TABLES.md` §3):

| joint axis | worst excursion | scenario |
|---|---|---|
| elbow flexion | −8.7° | impact15 |
| ankle inv / ev | −6.3° | perturb |
| ankle DF | −6.3° | singleLeg |
| ankle ab / adduction | −6.0° | perturb |
| shoulder IR | −4.1° | upright |
| lumbar flexion | −3.3° | leanB |
| hip rotation | −2.7° | perturb |
| neck flexion | −2.6° | leanB |
| knee flexion | −1.8° | drop1m |

Every axis returns inside its limits at rest: the resting hard-limit excursion is 0.00° on every V2-REF scenario. Lumbar lateral bend spends the most ticks at its hard limit (1,437 summed) when the body lies on its side. Worst chatter: 10 toggles per 0.5 s (thoracic lateral bend, ankle ab / adduction).

## 4. Contact / penetration

**Turf.** Transient penetration up to 23–31 mm in standing falls (boot edge, R3) and 48 mm at 15 m/s (R7). At rest:
- 4.7–5.0 mm for the feet (slop, R5);
- 5–7.5 mm for the head capsule (R4).

**Self-contact.**
- Transient ≤ 8.9 mm (V2-REF) and ≤ 10.6 mm (short-legs variant).
- Resting self-contacts up to 5 mm (slop).
- Participants and first-touch times per scenario: `G1_TABLES.md` §4.

**Disabled pairs:** 0 manifolds everywhere.

**Collider display note.** The G0 debug view draws the trunk boxes' triangle export with sharp corners. Jolt collides with the 3 cm convex-radius rounding, so the true corners sit up to about 20 mm inside the drawn ones. No physics consequence; noted, not changed.

## 5. Energy / momentum accounting

- **Ledger:** E = KE + PE + passive elastic energy U, and the damping loss Σ c·|ω_rel|²·dt is measured every step.
  - Contact-free steps never gain energy (≤ 0.0067 J, the float floor).
  - Every positive residual sits on contact or hard-stop steps (R1, R2).
- **Passive work (rig):** E falls exactly by damping; zero gain.
- **Isolated momentum (spec 1.1):**
  - linear 5.9 × 10⁻⁶ relative, angular 2.9 × 10⁻³ (R6);
  - through 13 m/s self-collisions: linear 4.2 × 10⁻⁶, angular 4.1 × 10⁻².

Full table: `G1_TABLES.md` §5.

## 6. Passive-joint validation

- 34 / 34 rig tests pass.
- The L / R mirrored tests (knee, ankle, shoulder) give identical magnitudes with mirrored signs.
- Inside the soft range, the applied torque equals −c·ω (no elastic term).
- Two rig tests touched an adjacent limb (hip adduction, shoulder spin), so their energy line is report-only.
- Table: `G1_TABLES.md` §6.

## 7. Variant results

These bodies ran the 10 essential scenarios with no per-body tuning: 165 cm / 62 kg, 198 cm / 92 kg, long legs and short legs (plus V1-matched on every scenario).

- **All are mechanically valid:**
  - finite;
  - deterministic;
  - exclusions hold;
  - self-collision and isolated tests pass.
- **They fail the same criteria as V2-REF,** for the same reasons. Magnitudes scale with mass and size (worst step energy rise 29 J for 62 kg, 54 J for 92 kg).
- Isolated self-collision passes on every body.
- Matrix: `G1_TABLES.md` §7.

## 8. Determinism

- 17 / 17 scenarios bit-identical across 3 runs in 2 processes: per-tick hash, per-60-tick hashes, contact sequence, joint extrema and fall timing.
- Snapshot / restore bit-exact on 4 scenarios (two restores each).
- Browser = Node on all 10 curated scenarios: full runs in headless Chrome against Node.
- No cross-runtime floating-point differences were found. The same WASM build and the deterministic JS maths give identical bits.

## 9. Timestep sensitivity (180 / 240 / 360 / 720 Hz, 30 iterations)

- **Integrity at 720 Hz:** the integrity checks pass for every tested scenario. At 180–360 Hz, joint separation and hard-limit overshoot exceed 5 mm / 3° in the violent collapses.
- **Same outcome at every rate:** upright, leanB and isoMomentum keep the same final posture and the same first non-foot contact. Fall timing is within 1.4 ms of 720 Hz; final COM within 0.085–0.16 m.
- **Near-identical:** flatSupine and sideFirst end within 0.02 m of the 720 Hz COM. Their first-contact body or posture label differs at the lowest rates.
- **Chaotic falls** (leanF, awkward, drop1m) diverge in final posture. Sensitive dependence is expected for a passive multi-body fall and is not a defect.
- **drop1m energy does not converge with rate.** The warm-start overshoot is about 42 J at both 240 and 720 Hz. It is an iteration effect (R1), not a timestep effect.
- Table: `G1_TABLES.md` §9.

## 10. Performance (diagnostic)

One player, single-threaded WASM, measured alone:

| item | cost per tick |
|---|---|
| 14 free bodies | 0.010 ms |
| + 13 joints | 0.09 ms |
| lying on the turf (contacts) | 0.11 ms (30 it) / 0.14 ms (60 it) |
| JS passive layer | 0.08 ms |
| G1 instrumentation | about 0.02 ms |

- 22 players at 240 Hz need about 1.0 s (30 it) or 1.1 s (60 it) of single-thread CPU per simulated second.
- V1.1 Gate A recorded 0.04–0.13 ms per tick. V1 had sleeping, no passive layer and hinge knees. V2 at 0.3–0.5 ms per tick under the 8-way parallel gate load is not information-matched; the alone-measured numbers above are the ones to use.
- Table: `G1_TABLES.md` §11.

## 11. G0 defects discovered / fixed

**G1-D1: gyroscopic force.** It was off in the G0 Jolt adapter, which violates Euler's equations for free rotation.
- **Fixed** in `core/v2_jolt.js`.
- **Demonstration:** a single free asymmetric body loses 153 % of its angular momentum over 2 s without the term and 0.25 % with it.
- **G0 rerun:** PASS, every hash and value identical.
- **Also recorded as an amendment in spec §19** (implementation, not a value).

No other G0 construction defect was found. Masses, inertias, joint frames, limits, passive torque directions and collider geometry all behaved as built. The boot and head findings (R3, R4) are contact-model interactions with the approved shapes, not construction errors, so they are decisions (C3, C4), not fixes.

## 12. Commit

On `prototype/physical-character-v2`:

- `5e4548d`: criteria pre-registration.
- The next commit: the G1 build, results and this report.

Local only, not pushed.

## 13. Review

**URL:** http://127.0.0.1:8172/sandbox/visual/physchar2/viewer/g1.html

**Viewer controls:**
- play / pause, restart, slow motion (1×, 0.25×, 0.1×, 0.02×), single-tick stepping and a timeline scrubber;
- cameras: front, side, ¾, top, follow.

**Overlays:**
- physical bodies and the semantic skeleton;
- colliders, joint centres, joint axes, and the limit box of a selected joint;
- contact points coloured by depth, contact normals, penetration labels;
- total and segment COMs, linear / angular velocities.

**Selectors:** the configuration selector can replay diagnostic package P at 240 Hz or 720 Hz for comparison. These are not adopted.

**Smallest useful visual review set** (`shots/`):

| still | what it shows |
|---|---|
| `g1_01_upright_hardstop_collapse` | the moment R2 happens: knees fully flexed, ankle at its hard stop |
| `g1_02_leanF_boot_edge_sink` / `g1_03_…_packageP` | R3, the left boot lying on its edge 20.9 mm under the turf; the same scenario and time under diagnostic package P (the motion differs; run maximum 11.7 mm vs 23.3 mm) |
| `g1_04_drop1m_touchdown` | the R1 touchdown step |
| `g1_05_sideFirst_impact`, `g1_06_awkward_midfall` | contact participants, velocities |
| `g1_07_impact15_first_touch` | R7 |
| `g1_08_isoSelfCol_leg_contact` | non-adjacent self-collision at 13 m/s, no pass-through |
| `g1_09_flatSupine_head_rest` | R4, the capsule end cap resting into the turf |

## What was built (G1)

- **`sim/v2_passive.js`:** the passive joint tissue.
  - One conservative potential: end-range law plus four couplings.
  - Torques are its exact gradient, folded into Jolt's implicit spring-damper motor rows (stiffness = linearised end-range stiffness, damping = spec viscous coefficient, zero stiffness inside the soft range).
  - Any explicit remainder is applied as equal-and-opposite torques.
  - Stateless.
- **`sim/v2_geom.js`:** exact collider geometry queries.
- **`gates/v2_g1.js`:**
  - the 17 scenarios;
  - `G1Sim`, the tick-by-tick simulation and all measurements, shared by Node and the browser.
- **`gates/v2_g1_tests.js`:** passive rig, couplings, snapshot / restore, performance breakdown.
- **`gates/v2_g1_checks.js`:** pre-registered criteria.
- **`gates/v2_g1_dx.js`:** diagnostic remedies, not adopted.
- **`tools/g1_run.js`:** the parallel runner, all phases in about 55 s on 8 workers.
- **`tools/g1_report_tables.mjs`**, **`tools/g1_capture.sh`**.
- **`viewer/g1.html`**, **`viewer/v2_g1_viewer.js`**.
- **`core/v2_jolt.js`:** G1-D1 plus the G1 surface.
- **G0 stays as approved.** G0 viewer and G0 runner unchanged; G0 PASS with identical hashes. V1 is untouched (guard OK).
