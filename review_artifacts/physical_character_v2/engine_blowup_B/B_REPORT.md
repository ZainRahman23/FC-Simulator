# Investigation B: the one-step energy blow-up — **root cause found in Jolt's narrow phase (GJK → EPA on the 100 m turf box); the accepted k = 0 plant is vulnerable** — STOPPED for decision

**Sources:**
- `../sources/2026-10-03_user_decision_b_engine_blowup_investigation.md` (approve B only);
- `../sources/2026-10-03_user_instruction_b_autonomous_two_hours.md` (continue autonomously; prohibited decisions listed).

**Status:**
- **Causal chain established at source level and confirmed by intervention.** Nothing adopted. No plant, gate, timestep, solver, turf, boot or tissue change.
- **The accepted k = 0 plant reaches the same pathology.** This potentially reopens G1; see §11.
- G1 / G2 / G3 are **not** silently repaired or redefined. G4 not started. Nothing pushed.

**Code** (all diagnostic, opt-in):
- `sandbox/visual/physchar2/tools/b_*.mjs`;
- `tools/b_native/` (a native Jolt v5.6.0 harness, with instrumentation and two opt-in diagnostic patches);
- permanent **observation-only** invariants in `gates/v2_g1.js` / `v2_g2.js` / `v2_g1_checks.js` (report-only rows 1.2e, 1.4j, 1.4k; physics bit-identical, verified by state hash).

**Evidence:** `json/`, `fixtures/`, `native/`, `logs/` in this folder.

---

## 0. Decision package (short)

**Strongest causal explanation.**
1. The turf is a static **100 m × 2 m × 100 m box**, and boot pieces are small convex hulls (5 mm convex radius) within the 20 mm speculative band.
2. **Entry into EPA.** For such a pair, Jolt v5.6.0's GJK declares an overlap even though the cores are 1–20 mm apart, and hands the query to **EPA**. It does so in one of two ways:
   - on the 100 m box, the **relative** termination test |v|² ≤ FLT_EPSILON·max|y|² fires (max|y| ≈ 71 m, so |v| ≤ 24.5 mm);
   - on smaller boxes, GJK's simplex numerically **"encloses the origin"** (a false enclosing tetrahedron). Both entries are traced.
3. **The core defect: EPA's final-triangle selection.** When a face of an irregular convex hull is nearly flush with a large flat face, EPA's polytope is a thin slab with the origin ~20 mm inside it.
   - EPA processes the true face but cannot certify convergence: plane distance and support distance agree only to ~1 µm (float32 resolution is ~7.6 µm at 71 m, ~1 µm at 4–14 m).
   - It then pops a slab face with the **opposite normal** at a numerically equal plane distance, frees the converged face, and finds that face's support point 2 m away (the box thickness). No new triangle is queued.
4. EPA leaves its loop on the **empty queue** ("exit E") and returns that unconverged, opposite-facing triangle. The penetration axis is **reversed**.
   - This occurs on turf boxes of every size tested (8 m to 400 m) and on a 0.1 m-thick box.
   - It needs an irregular hull: **0 reversals in 80 million flush poses of plain cuboids**, against ~1 per million poses for the boot pieces.
   - The opt-in diagnostic EPA patch P2 (return the triangle with the smallest support distance) removes every reversal in every test.
5. Jolt then gathers the turf's **supporting face for the reversed axis: the bottom face of the box, 2 m below the top**. The manifold's contact points lie on that face (y = −2.000 m), with per-point separations of about −2.05 m.
6. The **contact position solver** clamps each point's separation to −mMaxPenetrationDistance (−0.2 m) and corrects it with Baumgarte 0.2 per position iteration. The lever arm is the mid-point between the two contact points, ~1 m below the boot. The boot is **teleported 25–160 mm and rotated 45–173° in one step with no velocity change**.
7. The ankle is forced far beyond its anatomical hard limit and the engine stop, e.g. foot abduction to −57.3° (hard −15°) or inversion to 76° (hard 35°). The **passive end-range law + end-stop potential** of that forced pose is the "+182 J … +75,766 J".
8. The next steps release that potential as kinetic energy through the passive drive rows. Turf contact and damping dissipate it.

**Confidence:**
- **High** for the mechanism: deterministic; reproduced bit-for-bit natively; traced at source level; each link removed by a specific intervention; 12 independent simulation events plus 1 identity-preserving demonstration, all identical.
- **Medium** for a closed-form statement of *which* exact poses trigger it. It is a numerical knife-edge: ~3 µm windows in position, ~10⁻⁴° in yaw, ~1 per 10⁶ flush poses for boot-piece hulls, none for cuboids.
- **One earlier sub-hypothesis is falsified:** "the 100 m scale alone causes it". Smaller boxes reverse too, some more often. The scale explains the 100 m box's *entry* path, not the defect.

**Smallest reproducer:** **one** `CollideShape` query, one 19-point convex hull (boot piece 4, convex radius 5 mm) vs the 100 × 2 × 100 m box, at the exact float32 transform. It returns a reversed axis and the bottom turf face. Reproduced natively, bit-for-bit (`fixtures/q_*.json` / `.bits`, `tools/b_native/`).

**First invalid tick / state:** V1-matched singleLeg, 240 Hz, k = 0.15: step **922 → 923** (t = 3.8417 → 3.8458 s).
- Body at rest: KE 0.00 J.
- foot_L piece 4 lies 0.217 mm above the turf (mid-foot, lateral; the boot lies on its lateral side).

The k = 0 cases are in §2.

**Energy provenance:**
- **No impulse does work in the event step** (ΔKE = 0.000 J).
- **+183.40 J appears as ankle_L passive potential, created by the contact position correction** (ΔU from position correction; ΔPE −0.98 J).
- Position-level split: integration Δ(U + PE) ≈ 0; position-solver Δ(U + PE) = +182.43 J.

**k = 0 vulnerability: YES.** In **4 distinct runs out of 1,054 distinct monitored accepted-plant (k = 0) G1-scenario runs** (1,079 including one repeat), the identical event occurred:

| run | rate / solver | energy |
|---|---|---|
| V2-REF perturb @−1 µm | 720 Hz | +6,874 J |
| V1-matched awkward @+1 µm | 720 Hz | +2,241 J |
| V1-matched singleLeg @+1 µm | 720 Hz | +443 J |
| V1-matched singleLeg (iteration study) | **240 Hz**, 60 velocity iterations | +205 J |
| (the rate study re-ran the 720 Hz singleLeg case) | 720 Hz | +443 J, the same run again |

These are G1 scenarios with 1 µm lift perturbations, or an iteration count from the G1 study. They are not exact members of the accepted G1 run list, which happened not to trigger.
- **Identity-preserving demonstration:** the V2-REF drop1m resting state (untouched), with only the static turf slid 341 mm, gives **+34,300 J** in the next step. It is 1 of 30 accepted resting states that a ≤ 1 m turf shift drives into the event.
- The accepted plant also produces **benign tilted manifolds** in 7/254 accepted-configuration runs (an EPA sliver-triangle failure; speculative, no position correction).
- **G2 (620 runs) / G3 (332 runs) monitoring of the accepted plant: 0 invalid manifolds in 37.2 M turf contacts.** Standing, pushing and weight transfer did not trigger it; falls do.
- The accepted G1 run list, including its report-only iteration study, contains no reversed manifold.

**Jolt source-level explanation:** §10, with traces in `native/` and the exits instrumented.

**Ablations** (§7). The event is unchanged by:
- ankle stiffness off from the saved state (k = 0: +182.18 J vs +182.43 J);
- damping, hard stop, drives;
- warm start (all / joint / contact), velocity iterations 30 / 600, dt ½ or ⅓;
- gravity, friction, restitution, self-collision, constraint order.

At the saved state it is removed only by changing the contact query (plane / smaller / thinner turf box, single-hull or box boot, speculative 0, boot–turf contact off) or by disabling position correction (0 position iterations, Baumgarte 0). **Statistically, only the PlaneShape turf and the EPA patch remove it.** Smaller / thinner boxes, the single hull, convex radius 0 and speculative 0 all still reverse (§10a, §13b). Its magnitude scales with the position correction: 1 position iteration → 53 J, 4 → 5,267 J – 10.6 MJ; maxPenetration 0.02 m → 12 mm push.

**Rate / iteration:** events occur at **240, 360 and 720 Hz** and at **30, 60 and 150 velocity iterations**. They persist under refinement. Not a timestep or iteration convergence failure: a discrete contact-generation defect.

**Candidate fixes** (§13; none adopted), ranked by what they correct:

| rank | candidate | what it corrects | evidence | regression implication |
|---|---|---|---|---|
| 1 | **Turf = PlaneShape** | removes GJK / EPA from every turf contact; the axis is the plane normal by construction | **0 invalid manifolds** in every sweep (G1 set at k = 0 / 0.15 / 0.5, k = 0 perturbation set where the box had 3 events, iteration study); all saved-state events gone | contact architecture change; outcomes of chaotic falls change; ordinary contact metrics unchanged in distribution; **G1 → G2 → G3 re-run** |
| 2 | **Patch Jolt EPA** (P2: return the best triangle, not the last) | the algorithmic defect itself, for every convex pair | 175 M flush poses × 5 turf geometries: 2,110 → **0**; all fixtures corrected; no new reversals | engine fork (rebuild WASM with emsdk); upstream; bit-level changes, so **full re-run**; also fixes self-contact / obstacle pairs |
| 3 | **Listener guard** (mark a provably invalid turf manifold as a sensor) | neutralises the bad manifold, not its cause | all 3 k = 0 events, both k = 0.5 and the k = 0.15 events neutralised; 251 / 254 k = 0 runs bit-identical | small adapter change; the defect still occurs (a correct contact can be lost for that step); re-run G1 |
| 4 | Smaller mMaxPenetrationDistance (0.02 m) | limits the consequence only | +45,983 → +0.82 J; reversals remain | changes deep-penetration recovery for all contacts; re-run G1 |
| — | ~~Smaller turf box~~ | **falsified** | 8 m and 20 m boxes produce *more* reversals (up to 546 per 5 M poses vs 3 on the 100 m box) | — |
| — | ~~Single-hull boot / zero convex radius / speculative 0~~ | **falsified** | each still reverses statistically | would also reverse the approved D1a boot decision |

**Recommended next decision:** decide the turf representation. My recommendation:
- **PlaneShape turf** (it matches spec §15 "ground plane y = 0" literally);
- **plus** the turf-manifold validity invariant gated in G1;
- then a full G1 → G2 → G3 re-validation of the accepted plant;
- report the EPA defect upstream;
- only then re-open the ankle-law question.

---

## 1. Smallest deterministic reproducer (reduction ladder, same mechanism at every level)

| level | what remains | event? (from the exact saved pre-event state) |
|---|---|---|
| full body | G1 V1-matched singleLeg, 240 Hz, 150 / 2 iterations, k = 0.15 | tick 923, +182.43 J, foot 75.86 mm / 44.57° |
| R1 | pelvis + left leg | identical (75.86 mm / 44.57°, piece 4 reversed) |
| R2 | left leg | identical |
| R3 | shank + foot + ankle | identical |
| R4 | **the boot alone, no joint** | identical manifold; 79.91 mm / 49.83° |
| R5 | **one narrow-phase query**: boot compound vs the turf box | piece 4 reversed, bottom face |
| R6 | **one convex hull (piece 4) vs the box** | reversed (axis +Y in the foot → turf convention), depth −0.217 mm, turf face y = −2 m |
| R7 | native Jolt v5.6.0 (cross-platform deterministic) | **bit-identical** reversed result |

**The same ladder on an accepted-plant (k = 0) event:** V1-matched singleLeg @+1 µm, 720 Hz, tick 1360. R0–R4 are identical (90.6 mm / 68.7°, piece 6), and R6 / R7 reproduce. `json/reduce_*.json`.

**Thirteen events (12 simulation events + 1 identity-preserving demonstration), one mechanism.** Rows 1, 3, 5–8 and 11, plus the accepted-plant rows, reproduce as single native queries (8 fixtures).

| # | k (N·m/°) | run | rate / iterations | t (s) | one-step ΔE | boot piece | gap (mm) |
|---|---|---|---|---|---|---|---|
| 1 | **0** | V2-REF perturb @−1 µm | 720 / 150 | 0.7236 | +6,874 J | foot_L 6 (forefoot lateral) | 3.30 |
| 2 | **0** | V1-matched awkward @+1 µm | 720 / 150 | 1.0681 | +2,241 J | foot_L 8 (toe lateral) | 1.19 |
| 3 | **0** | V1-matched singleLeg @+1 µm | 720 / 150 | 1.8889 | +443 J | foot_L 6 | −0.002 |
| 4 | **0** | V1-matched singleLeg | **240** / 60 | 8.7375 | +205 J | foot_L 6 | — |
| 5 | 0.075 | V2-long-legs drop1m | **240** / 150 | 2.2125 | +16,526 J | foot_R 0 (heel medial) | −0.009 |
| 6 | 0.10 | V2-REF leanF @+10 µm | 720 / 150 | 1.8556 | +450 J | foot_R 5 (mid lateral) | 0.100 |
| 7 | 0.125 | V2-REF drop1m @−10 µm | 360 / 150 | 1.2139 | +23,717 J | foot_L 6 | 9.10 |
| 8 | 0.15 | V1-matched singleLeg | **240** / 150 | 3.8458 | +182 J | foot_L 4 (mid lateral) | 0.217 |
| 9 | 0.15 | V2-REF upright @−1 µm | 240 / **30** | 2.8708 | +307 J | foot_L 6 | — |
| 10 | 0.15 | V2-REF awkward @+1 µm | 240 / **60** | 0.8458 | +56,079 J | foot_L 0 | — |
| 11 | 0.5 | V2-REF leanF @+10 µm | 720 / 150 | 9.6792 | +45,983 J | foot_R 1 (heel lateral) | 4.93 |
| 12 | 0.5 | V2-REF leanF | 720 / 150 | 1.9375 | +18,246 J | foot_L 3 (mid lateral) | −0.045 |
| 13 | **0** | **V2-REF drop1m resting state, turf slid 341 mm (identity-preserving)** | 240 / 150 | rest | **+34,300 J** | foot_L 4 | 0.008 |

**Not in this table:** the historical k = 0.5 **180 Hz +142–161 J** events. They have **no invalid manifold**: the energy enters during velocity integration (ankle_R potential 24 → 194 J; explicit passive torques +49 J), and the next step loses −161 J. They belong to the separate 180 Hz passive-layer mechanism (§8).

## 2. First bad tick

**k = 0.15 case.**
- Last healthy step: 921 → 922. First bad step: **922 → 923** (t 3.8458 s).
- Before the event the body has been at rest for ≥ 40 ms: KE 0.00 J, all segment speeds ≤ 0.4 mm/s.

**k = 0 cases:**
- perturb, 720 Hz: step 520 → 521, mid-fall, KE 30 J;
- awkward, 720 Hz: 768 → 769, KE 7.6 J;
- singleLeg, 720 Hz: 1359 → 1360, KE 0.21 J.

So the event happens **at rest and in motion**.

## 3. Where the unexplained energy first appears

- **Body pair:** turf (static box) ↔ foot_L boot piece 4.
- **No body's kinetic energy rises in the event step.** The energy appears as **passive potential of ankle_L**: 0.000 → 183.406 J.
  - It is created by the position solver's displacement of foot_L (75.9 mm, 44.6°) and shank_L (1.0 mm, 1.1°).
  - Velocity integration contributes ΔU = −0.002 J; the position correction contributes ΔU = +183.405 J.
- **k = 0 singleLeg:** ankle_L 0 → 444.19 J. Foot abduction 2.8° → **−57.3°**; inversion 23.2° → 0.7°; DF −30.5° → −10.0°.

**How the bad contact overextends the tissue (Q5), per captured event.**
- Anatomical hard ROM of the ankle (spec): foot ab/adduction ±15°, DF −60 … +45°, inversion −30 … +35°.
- The angles are the ankle's anatomical angles before / after the single event step (position solver only).

| run | joint | before | after the event step | passive U before → after |
|---|---|---|---|---|
| V2-REF perturb @−1 µm, 720 Hz, **k = 0** | ankle_L | fabd 3.5, DF 37.4, inv 32.3 | **fabd −80.8, DF 24.4, inv 108.4** | 0.7 → 6,877 J |
| V1-matched awkward @+1 µm, 720 Hz, **k = 0** | ankle_L | fabd 8.6, DF −44.9, inv 19.5 | **fabd −72.4**, DF −17.6, inv −14.5 | 0.0 → 2,241 J |
| V1-matched singleLeg @+1 µm, 720 Hz, **k = 0** | ankle_L | fabd 2.8, DF −30.5, inv 23.2 | **fabd −57.3**, DF −10.0, inv 0.7 | 0.0 → 444 J |
| V1-matched singleLeg, 240 Hz, k = 0.15 | ankle_L | fabd −0.9, DF −49.1, inv 23.7 | fabd −22.3, DF −44.0, **inv 76.1** | 0.0 → 183 J |
| V2-REF leanF @+10 µm, 720 Hz, k = 0.10 | ankle_R | fabd −3.4, DF −47.5, inv 19.3 | **fabd −34.8**, DF −25.3, **inv 84.9** | 0.0 → 451 J |
| V2-REF leanF @+10 µm, 720 Hz, k = 0.5 | ankle_R | fabd 2.2, DF −50.9, inv 31.8 | **fabd 105.5**, DF −57.4, inv −2.6 | 0.2 → 45,983 J |
| V2-REF drop1m rest, turf slid 341 mm, **k = 0** | ankle_L | fabd −7.3, DF −26.8, inv −27.6 | **fabd −110.8, DF 116.8, inv 91.8** | → 34,302 J |

**Reading:**
- The rotation imposed by the contact position correction (45–173°) is far beyond any anatomical or engine limit.
- The energy is set by **how far past the hard limit** the pose lands. The end-range law is exponential beyond the soft limit, and the C2 end-stop is quadratic beyond the hard limit.
- So the magnitude is effectively random (183 J … 46 kJ) and unrelated to k.

## 4. Per-tick energy ledger (10 ticks before → 10 after)

**Method** (tool `tools/b_ledger_table.mjs`, data `json/ledger_*.json.gz`):
- Every impulse Jolt applied in the step is reconstructed from Jolt's own accumulated lambdas (point constraint, swing / twist limit parts, motor rows), on the axes Jolt used (replicated from the v5.6.0 source at the start-of-step pose).
- Gravity, the passive explicit torques and Jolt's gyroscopic step are added.
- The contact impulse of each body is the exact residual. Work is computed at the mid-step velocity.
- U and PE are split into **velocity integration** vs **position-solver correction**, using the predicted end-of-step pose from the final velocities.
- Restitution is 0 by configuration on every manifold.
- **Validation:** contact-free bodies have residual ≈ 0.

**V1-matched singleLeg, k = 0.15** (full 21-row table in `json/ledger_table_sl_k015.md`). Work in J per step:

| step → | ΔE | ΔKE | W contact | W joint point | W hard-stop parts | W passive drives | ΔPE integ. / pos-corr | ΔU integ. / pos-corr | largest position-solver move | sep (mm) |
|---|---|---|---|---|---|---|---|---|---|---|
| 913 … 922 (10 rows) | 0.000 | 0.000 | 0.000 | 0.000 | 0.000 | 0.001 | 0.001 / 0.000 | −0.002 / 0.000 | — | 0.00 |
| **923** | **+182.427** | **0.000** | 0.000 | 0.000 | 0.000 | 0.001 | 0.001 / **−0.978** | −0.002 / **+183.405** | **foot_L 75.86 mm / 44.57°** | **102.2** |
| 924 | −116.361 | +14.207 | −5.984 | 0.000 | 0.000 | +11.674 | 0.435 / 0.588 | −119.666 / −11.926 | foot_L 53.0 mm / 6.8° | 35.2 |
| 925 | −46.057 | +3.189 | −3.368 | −0.277 | 0.001 | +7.348 | 0.470 / 0.017 | −46.845 / −2.889 | foot_L 4.1 mm / 4.2° | 25.4 |
| 926 | −5.637 | −6.074 | −0.549 | −0.597 | 0.000 | −4.410 | 0.475 / 0.000 | 0.369 / −0.406 | foot_L 2.7 mm / 3.8° | 17.8 |
| 927 … 933 | −2.9 → −0.26 | negative | negative | ≈ 0 | 0 | small | — | — | ≤ 2.1 mm | 12.6 → 1.9 |

- **Warm-start** (previous accumulated joint lambdas, Σ|λ|) is 5.3 N·s, flat through the event. Warm start off from the saved state gives the same event (+182.44 J).
- **Speculative manifolds:** 15 of 26 at the event step. The reversed one is itself speculative (−0.217 mm).
- **Hard stops:** no engine limit part is active at the event step (only the locked knee / elbow varus rows, as always). ankle_L becomes active on the next step.

**The accepted-plant (k = 0) event has the same signature** (`json/ledger_table_k0_singleLeg.md`): event step ΔE +443.05 J, ΔKE −0.009 J, ΔU from position correction +444.19 J, foot_L 90.6 mm / 68.7°.

## 5. Pre / post state (k = 0.15 case; full arrays in `json/ledger_sl_k015.json.gz`)

| | before (tick 922) | after (tick 923) |
|---|---|---|
| foot_L COM (m) | (−0.2293, **0.0437**, 0.0475) | (−0.2291, **−0.0322**, 0.0479): **below the turf surface** |
| foot_L rotation | (−0.0393, −0.0945, 0.8640, 0.4929) | (−0.0612, −0.0370, 0.9886, 0.1323) |
| foot_L v / ω | 0.4 mm/s / 0.011 rad/s | 0.1 mm/s / 0.002 rad/s: **no velocity change** |
| ankle_L anatomical | fabd −0.9°, DF −49.1°, inv **23.7°** | fabd −22.3°, DF −44.0°, inv **76.1°** |
| ankle_L constraint space | twist −0.5°, swing-y −36.6°, swing-z −19.8° (swing ≈ 41°, far from singular) | twist 14.0°, swing-z −69.5° (beyond the −51.5° engine stop) |
| ankle_L limits | inversion 11° inside the 35° hard limit; no engine part active | 41° beyond the hard limit |
| joint separation | 0.0 mm | 102.2 mm |
| turf manifolds of foot_L | pieces 0, 2, 4, 6, 8 (the lateral row); all normals +Y; piece 6 touching (+0.008 mm); others speculative (2.6–8.0 mm) | — |
| **piece 4 manifold** | previous ticks: normal +Y, depth −0.216 mm, turf points at y = 0 | **normal −Y; turf-side points at y = −2.000 m; depth still −0.217 mm; per-point (p2 − p1)·n = −2.03 … −2.07 m** |
| other contacts | shank_L–turf 0.24 mm; shank_L–shank_R speculative −10 mm; shank_L–thigh_R 0.00 mm | unchanged |

## 6. Constraint / contact impulses

- **At the event step every velocity-level impulse is ≈ 0.** The body rests; the reversed speculative contact only forbids upward motion, which nothing attempts. All point constraints, limit parts and motor rows do work ≤ 0.001 J.
- **The event is entirely position-level:** Jolt's `ContactConstraintManager::SolvePositionConstraints` (§10, step 7).
- **Next step:** the passive drive rows of ankle_L do +11.7 J (DF row 2.2 J, inversion row 10.0 J). That is the forced pose's tissue potential returning as motion. The turf contact does −6.0 J.

## 7. Ablation matrix (each from the exact saved pre-event state; one change at a time; diagnostic only, none adopted)

`tools/b_ablate.mjs`; `json/ablate_sl_k015.json` (k = 0.15), `json/ablate_k0_singleLeg.json` (k = 0).

| intervention | k = 0.15 event step ΔE / boot move | k = 0 event | verdict |
|---|---|---|---|
| none (re-run) | +182.43 J / 75.9 mm | +443.05 J / 90.6 mm | bit-identical reproduction |
| **ankle neutral stiffness off** | **+182.18 J / 75.9 mm** | (already 0) | **unchanged: the stiffness is not the mechanism** |
| ankle damping off | +182.43 / 75.9 | — | unchanged |
| ankle engine hard stop off | +182.43 / 75.9 | +485.8 / 90.6 | unchanged |
| other ankle axes' end-range law off | −0.54 J / **75.9 mm** | — | **same teleport**; no potential to load (energy metric moves) |
| all passive drives off | −4.05 J / **75.9 mm** (sep 147 mm) | −4.33 J / **90.6 mm** | **same teleport**; energy reading depends on what the forced pose loads |
| restitution 0 | identical | — | unchanged (already 0) |
| friction 0 | +181.68 | — | unchanged |
| warm start off (all / joint-only / contact-only) | +182.44 / 182.43 / 182.44 | +443.05 | unchanged |
| self-collision off | +182.42 | +443.05 | unchanged |
| velocity iterations 30 / 600 | +182.43 / 182.43 | 443.05 / 443.05 | unchanged |
| timestep ½ / ⅓ from the saved state | +182.44 / 182.44 | +443.28 | unchanged |
| zero gravity | +182.65 | +442.82 | unchanged |
| constraint order leaf-last / root-last | +182.43 / 180.23 | — | unchanged |
| hip constraint disabled | +182.44 | — | unchanged |
| knee / ankle constraint disabled | +181.9 / +265.9 | — | unchanged step; worse afterwards |
| Jolt manifold reduction on | −1.99 J / **164 mm** | +1,242.7 J / 131 mm | still reversed; worse teleport |
| **speculative distance 0** | −0.10 / 0.01 mm | −0.015 / 0.01 mm | **eliminated** at this state (no speculative manifold for a 0.2 mm gap) |
| **boot–turf pair rejected** | −0.02 / 0.1 mm | −0.011 | **eliminated** (trivially) |
| **single-hull boot** (unsplit approved hull) | −0.02 / 0 | −0.008 | **eliminated** at this state |
| **box boot** | +0.07 / 3.2 mm | — | eliminated at this state |
| **turf = PlaneShape** | 0 / 0 | −0.007 / 0 | **eliminated** |
| **turf = 8 × 2 × 8 m box** | 0 / 0 | −0.007 / 0 | **eliminated** at this state |
| **turf = 100 × 0.1 × 100 m box** | 0 / 0 | −0.007 / 0 | **eliminated** at this state |
| **position iterations 0** | 0 / 0 (manifold still reversed) | −0.007 (still reversed) | **teleport removed; defect present** |
| position iterations 1 / 4 / 10 | +1.18 J, 51 mm / **+10,648,285 J**, 157 mm / +11,739 J, 191 mm | +53 J / +5,267 J | **scales with position correction** |
| **Baumgarte 0** | 0 / 0 (still reversed) | −0.007 (still reversed) | **teleport removed; defect present** |
| Baumgarte 0.05 | −0.45 J / 37 mm | — | reduced |
| mMaxPenetrationDistance 0.02 / 0.005 m | −0.14 J, 11 mm / −0.06 J, 4.4 mm | −0.15 J, 11.9 mm | **consequence limited, defect present** |

"Eliminated at this state" is not proof of immunity: the trigger is a knife-edge (§10). §13 tests candidates statistically.

## 8. Stiffness-trigger sweep (diagnostic; no value selected)

- **Set:** the G1 validation runs (17 scenarios × V2-REF / V1-matched, the essential set on the 4 G1 body variants, the D4a rate ensemble of 8 scenarios × 180 / 240 / 360 / 720 Hz × 5 lift perturbations, the high-speed envelope) **plus** the essential set on V2-175-70 and V2-190-85 (20 runs beyond the G1 scope). **254 runs per k.**
- All 7 accepted-plant runs with tilted manifolds are inside the G1 scope.
- Incidental, out of scope and not investigated: V2-190-85 drop1m reaches the engine stop (row 1.3b) at k = 0 with either turf. It is unrelated to the narrow phase.
- **Monitored:** every turf manifold's validity, every > 1 J one-step rise, the per-step passivity residual, and position-solver moves.

`tools/b_sweep.mjs`, `tools/b_summarize.mjs`; `json/sweep_*.json.gz`.

| k (N·m/°) | runs with invalid turf manifolds | reversed / tilted (manifold-ticks) | **narrow-phase events** | other > 1 J events | max one-step rise (J) |
|---|---|---|---|---|---|
| **0** (accepted) | 7 | 0 / 10 | 0 | 0 | 0.721 (180 Hz TD-1) |
| 0.01 | 3 | 0 / 4 | 0 | 1 (180 Hz) | 1.98 |
| 0.025 | 1 | 0 / 1 | 0 | 2 (180 Hz) | 1.54 |
| 0.05 | 7 | 0 / 7 | 0 | 3 (180 Hz) | 8.56 |
| 0.075 | 2 | 1 / 30 | **long-legs drop1m 240 Hz +16,526 J** | 5 (180 Hz) | 16,526 |
| 0.10 | 8 | 1 / 76 | **REF leanF @+10 µm 720 Hz +450 J** | 3 (180 Hz) | 450 |
| 0.125 | 1 | 1 / 0 | **REF drop1m @−10 µm 360 Hz +23,717 J** | 0 | 23,717 |
| 0.15 | 2 | 1 / 1 | **V1 singleLeg 240 Hz +182 J** | 2 (180 Hz) | 182 |
| 0.5 | §8a | | | | |

**Reading:**
- **No threshold and no dose–response.** Each nonzero k ≥ 0.075 has about one event in 254 runs, in a *different* scenario, body and rate each time.
- The magnitude is not monotone in k (16,526 J at 0.075; 182 J at 0.15). It is set by how far the forced pose drives a joint into its quadratic end-stop.
- Event timing changes **discontinuously**: different runs, not shifted times.
- Stiffness changes **which configurations are visited**: resting boots lying on a lateral face with the ankle inverted, slowly creeping. Each visited configuration is a fresh draw against a knife-edge trigger.
- **The accepted plant draws too.** k = 0 has 0/254 here, but **3/600** in the dense perturbation ensemble (§11) and 1 in the iteration study.
- An equal-denominator comparison is in §8a: 8 events at k = 0.15 vs 3 at k = 0, out of 600 identical runs.

**Other > 1 J events: a different, separate mechanism** (180 Hz only, k > 0 trajectories; `json/ledger_awk180_k015.json.gz`).
- V2-REF awkward / drop1m at **180 Hz**: +1.0 to +8.6 J, followed by larger losses (e.g. +3.6 J then −8.2 J).
- **Cause:** the passive end-range law under simultaneous triaxial end range at dt = 1/180. Example: ankle_R fabd 13–18°, DF 46–50°, inversion 29–37°, end-range torques to −347 N·m, row stiffness to 3,519 N·m/rad, 10–19 rad/s.
- The drive rows and potential gain energy in one step, then lose more in the next. No contact or manifold is involved.
- It occurs only at 180 Hz (a non-validation rate), none at 240 / 360 / 480 / 720 Hz. It is the same family as the known TD-1 180 Hz accuracy limit.
- **Not** the blow-up mechanism. It is recorded so it is not confused with it.

## 9. Timestep / solver-iteration results

**Rate study** (`json/sweep_rate.json.gz`): 4 scenarios + V1 singleLeg × 180 / 240 / 360 / **480** / 720 Hz × 5 lift perturbations.
- k = 0: 1 narrow-phase event (720 Hz).
- k = 0.15: 1 (240 Hz). Plus the 180 Hz end-range events.

**Iteration study** (`json/sweep_iter.json.gz`), 240 Hz, velocity iterations 30 / 60 / 150 / 300:

| plant | narrow-phase events |
|---|---|
| k = 0 | **singleLeg, 60 iterations, +205 J** |
| k = 0.15 | **upright, 30 iterations, +307 J**; **awkward, 60 iterations, +56,079 J**; singleLeg, 150 iterations, +182 J |

The +24 J drop1m rises are the known low-iteration impact rebound (G1-C1), with no invalid manifold.

**Across all sweeps,** narrow-phase events appear at 240, 360 and 720 Hz and at 30, 60 and 150 iterations.

**From the saved state:** dt ½ / ⅓ and velocity iterations 30 / 600 leave the event identical. Position iterations change only its magnitude.

**Classification:**
- not timestep convergence (the event persists at every rate);
- not iteration convergence;
- a **discrete contact-generation defect** (a numerical knife-edge in the narrow phase), which **remains under refinement**.

## 10. Jolt source-level explanation (v5.6.0, the pinned version; traced natively)

**Native build.** Jolt v5.6.0 built with `CROSS_PLATFORM_DETERMINISTIC=ON`. The WASM build (`jolt-physics@1.1.0`) is scalar float32 with no SIMD and no FMA. The native build reproduces every fixture **bit-for-bit**: same axis, same depth to 10⁻⁶ mm.

**Instrumentation** (`native/jolt_v5.6.0_trace_and_P1_P2_instrumentation.diff`): `GJKClosestPoint::GetClosestPoints` exits, the `GetPenetrationDepthStepGJK` result, every EPA iteration and every EPA loop exit. Traces for all eight fixtures are in `native/trace_*.txt`.

### Step 1: the contact query

`PhysicsSystem::ProcessBodyPair` swaps the bodies so body 1 = the dynamic boot. It calls `CollisionDispatch` → `ConvexShape::sCollideConvexVsConvex(shape1 = hull piece, shape2 = turf box)` with `mMaxSeparationDistance` = the 20 mm speculative distance.

### Step 2: GJK step (`EPAPenetrationDepth::GetPenetrationDepthStepGJK`)

- GJK runs between the hull core (convex radius 5 mm excluded; inflated radius 25 mm) and the box.
- In `GetClosestPoints`, the termination `if (v_len_sq <= FLT_EPSILON * GetMaxYLengthSq())` declares overlap. The trace:
  > `RELATIVE test: |v| = 19.7826 mm ≤ √FLT_EPSILON · maxY = 24.4953 mm (maxY = 70.946 m)`
- maxY is the largest Minkowski support point: a box corner ~71 m away, because of the **100 m turf**.
- Status `Indeterminate` → **EPA**.
- Every one of the eight fixtures takes this path.
- With an 8 m box this threshold is ~2 mm, but GJK then enters EPA by a second route: **"origin inside tetrahedron"** for cores 1–7 mm apart (traced). So a smaller box does not avoid EPA.

### Step 3: EPA (`GetPenetrationDepthStepEPA`)

- It starts from GJK's 3-point simplex: three corners of the box's top face, |y| ≈ 70 m.
- The hull is a slab ~100 m wide and only a few cm thick: the box's width against the boot piece's extent.

**Trace (k = 0.15 fixture):**

| iteration | triangle normal | plane distance | support distance |
|---|---|---|---|
| 1 | (−0.86, 0.50, 0.12) | 3.5 mm | 35.98 mm |
| 2 | (−0.86, 0.50, 0.12) | 3.5 mm | 35.96 mm |
| 3 | (−0.86, 0.50, 0.12) | **19.782 mm** | 19.784 mm |
| 4 | (−0.86, 0.50, 0.12) | **19.782 mm** | 19.783 mm |
| 5 | **(+0.86, −0.50, −0.12)**: opposite | **19.783 mm** | **2,093.85 mm** |

- **Iterations 3–4 never certify convergence.** The test is `dist_sq − closestLenSq < closestLenSq · 1e-4`, i.e. ≈ 1 µm on a 20 mm distance. The plane distances come from centroids and normals of ~70 m vectors, whose float32 resolution is ~7.6 µm. At this scale the test cannot be met.
- **Iteration 5** pops the opposite slab face. Its squared plane distance (3.91358e-4) is 1.7×10⁻⁸ below `closest_dist_sq` (3.91375e-4), so it is processed:
  - `last = t`;
  - the converged top-face triangle is **freed**;
  - its support point is 2.09 m away, so it is far from converged;
  - `AddPoint(t, …, closest_dist_sq, …)` queues only triangles nearer than `closest_dist_sq`, so nothing is queued.
- **Exit E: "no next triangle in the queue"** for all eight fixtures.
- `last` is the unconverged opposite face, so `outV = (centroid·n / |n|²)·n` points the **wrong way**.
- No hull defect is flagged; `flip_v_sign` is not involved.
- The contact points come from that triangle's barycentric coordinates, which is why |p2 − p1| and the reported depth stay plausible.

### Step 4: faces

Back in `sCollideConvexVsConvex`: `shape2->GetSupportingFace(…, +penetration_axis)`. For a box, `AABox::GetSupportingFace` returns the face hit when moving along the direction. Reversed axis → **the box's bottom face, y = −2 m**.

### Step 5: manifold

`ManifoldBetweenTwoFaces` clips the piece's face against the bottom face. The contact points on body 2 lie at y = −2.000 m. In the listener's (turf, boot) order the normal is −Y.

### Step 6: velocity solve

The constraint is "no approach along −Y", i.e. the boot may not move up. At rest it applies no impulse, hence ΔKE = 0.

### Step 7: position solve (`ContactConstraintManager::sSolvePositionConstraint`)

- `separation = max((p2 − p1)·n + slop, −mMaxPenetrationDistance)` = max(−2.05 m + 0.005, −0.2) = **−0.2 m** per point.
- `λ = −m_eff·baumgarte·separation`, applied at the mid-point `0.5·(p1 + p2)` (~1 m below the boot, hence large rotation).
- Up to 4 points × 2 position iterations → the boot is moved 25–138 mm and rotated 45–127°.
- The ankle point constraint and limits are corrected only partially in the same 2 iterations, so the joint separates 31–150 mm.

### Step 8: our passive layer

It evaluates the end-range law + C2 end-stop at the forced pose. U grows exponentially beyond the soft limit and quadratically beyond the hard limit, hence 182 J … 56 kJ.

### Answers to your ten questions

1. **The geometric / configuration condition:**
   - A small, **irregular** convex hull with a face nearly flush with a **large flat convex face** (the turf box top), within the speculative band.
   - GJK misclassifies it as overlapping: through the relative test on the 100 m box, or a false enclosing tetrahedron on 4–20 m boxes. EPA's polytope is then a thin slab whose opposite face lies at a numerically equal distance.
   - Plain cuboids never triggered it (80 M poses). Boot pieces do, at ~1 per 10⁶ flush poses.
   - The specific trigger inside that region is a measure-small knife-edge:
     - ~3 µm wide in the piece's height;
     - 1–3 per 2,000 of 1 mm translations or 0.01° yaws of the same pose;
     - 4.4 % of micro-perturbations (≤ 3 µm) around a known event state.
   - Resting or slowly creeping boots on a flat face sample many nearby states, hence the exposure.
2. **Why the opposite triangle:**
   - EPA cannot certify convergence on the true face: the plane and support distances differ by float noise above the 10⁻⁴ relative tolerance.
   - The opposite slab face is popped next at a numerically equal plane distance; the converged face is freed.
   - The queue empties ("exit E"), and EPA returns the unconverged opposite face. The source path is identical in every traced reversed event (8 native fixtures) and on every box size.
   - In one thin-box case Jolt's hull-defect branch (`flip_v_sign`) was also involved.
3. **Why the bottom face:** the reversed axis selects the box face that faces the other way. For a 2 m-thick box that face is 2 m away. The position solver then sees −2 m separations and applies its clamped 0.2 m correction.
4. **Objectively invalid by Jolt's own conventions: yes.**
   - `CollideShapeResult::mPenetrationAxis` is "the direction to move shape 2 out of collision along the shortest path". The reversed axis would need ~2 m, against 19.8 mm the right way.
   - EPA returned a triangle that failed EPA's own convergence criterion (support 2.09 m vs plane 19.78 mm).
   - The manifold contradicts itself: reported depth −0.217 mm, per-point separations −2.05 m.
   - Our check (turf normal must be +Y, turf contact points on y = 0) is a correct reading of a flat turf top face. **Our configuration (the 100 m box) exposes a Jolt numerical limitation; the interpretation is not wrong.**
5. **How the bad contact leads to tissue overextension:** the position solver rotates the boot about a lever arm ~1 m long by 45–127° in one step. The 2 position iterations cannot restore the ankle, so it ends far beyond both the anatomical and the engine limits, where the passive potential is enormous.
6. **Where the energy is first created:** in the **contact position solve** of the event step, as elastic potential of the passive tissue at a pose reached without work (ΔKE = 0). No velocity impulse injects it.
7. **Why stiffness changes the probability / trajectory:**
   - It changes which rest poses and slow creeps occur (boots lying on a side face, inverted ankles), i.e. which configurations are sampled.
   - It does not change the narrow phase: the saved-state k = 0 ablation is identical.
   - The accepted plant hits the same defect in its own trajectories: 4 distinct runs (§11).
   - Event frequency is higher with stiffness but of the same order: 8 vs 3 of 600 identical runs at k = 0.15 vs k = 0 (§8a); k = 0 overall 4 in 1,054.
8. **Compound boot decomposition:** **not required.** A single convex hull vs the box reproduces it, and the triggering pieces were all single hulls from the grid. It may raise the frequency: more, smaller, flat-faced pieces near the turf. The single-hull counterfactual sweep is in §13.
9. **Turf representation: required, but not through its size alone.**
   - **Any convex box turf** exposes it, because EPA is used for box–hull contacts. Statistically, over 5 M flush poses per hull:

     | turf box (m) | reversals per 5 M poses |
     |---|---|
     | 100 × 2 × 100 | 2–6 |
     | 100 × 0.1 × 100 | 2–5 |
     | 400 × 2 × 400 | 9–21 |
     | 20 × 2 × 20 | 0–546 |
     | 8 × 2 × 8 | 0–104 |

   - Box thickness sets the *consequence*: the bottom face at −2 m gives a clamped −0.2 m correction; a 0.1 m box gives ~−0.1 m.
   - Box size sets the *entry* path (relative test vs false tetrahedron). It does not remove the defect.
   - **Only a PlaneShape removes the mechanism structurally.** Jolt's convex-vs-plane collision is analytic: the axis is the plane normal by construction, with no GJK or EPA.
10. **Classification:**
    - **A Jolt v5.6.0 narrow-phase numerical limitation / bug** (EPA can return an unconverged, reversed triangle; GJK's relative termination hands precise contacts to EPA at large scales);
    - **exposed by our configuration** (a 100 m-scale convex turf with small boot pieces);
    - **amplified** by Jolt's position-correction defaults (mMaxPenetrationDistance 0.2 m, Baumgarte 0.2);
    - **made visible** by our steep passive end-range potential.
    - It is **not** our implementation bug: the passive layer, ankle law, controller and constraint frames are all exonerated by ablation.

## 11. Can the accepted k = 0 plant reach it? **Yes: G1 potentially reopened**

| test | result |
|---|---|
| k = 0 ablation from the k = 0.15 saved state | **identical event** (+182.18 J): the defect needs no stiffness |
| G1 validation set at k = 0 (254 runs, monitored) | 0 reversed; **7 runs with tilted invalid manifolds** (n_y 0.02–0.33, normals toward the box's far corners; speculative, no position correction, no energy effect). The same narrow-phase failure, benign by chance |
| **dense perturbation ensemble at k = 0** (10 scenarios × V2-REF / V1-matched × 15 lift perturbations 1 µm – 100 µm × 240 / 720 Hz = 600 runs) | **3 reversed-manifold blow-ups: +6,874 J, +2,241 J, +443 J** (all 720 Hz); 0 / 300 at 240 Hz |
| iteration study at k = 0 (240 Hz) | **+205 J at 60 velocity iterations** (V1 singleLeg, 240 Hz) |
| rate study at k = 0 | the 720 Hz singleLeg event again |
| G1's own iteration study (the accepted run's 102 report-only runs, k = 0) | **no reversed manifold**; 3 runs with tilted ones; its > 1 J rises are the known low-iteration impact rebounds |
| **turf slid ≤ 1 m under each of 30 accepted resting states** (V2-REF / V1-matched; x / z in 1 mm steps; the simulation's own narrow phase; `tools/b_k0turf.mjs`) | **1 of 30 states** (V2-REF drop1m) → stepped: **+34,300 J** in one step (boot 160 mm / 173°, ankle fabd −110.8°, DF 116.8°, inversion 91.8°, joint separation 221 mm, ΔKE 0) |
| identity-preserving transforms of **78 accepted resting states** (all 8 bodies; vertical ±300 µm in 1 µm steps; x / z ±1 m in 1 mm steps; yaw ±10° in 0.01° steps; both boots; ~1.0 M narrow-phase queries; `tools/b_k0reach.mjs`) | **2** reversed-capable transforms: V2-REF drop1m (foot_L piece 4, x + 341 mm) and V2-long-legs upright (foot_L piece 0, z + 836 mm) |
| re-simulating that transform with the body actually placed there (`tools/b_k0resim.mjs`) | not triggered (the float32 knife-edge does not survive re-placing 20 bodies); 30 resting states searched with actual readbacks: 0 |
| **G2 (620 runs) and G3 (332 runs) of the accepted plant, monitored in an isolated mirror** | **0 invalid manifolds in 37.2 M turf contacts** (§11a) |

**Reading:**
- The accepted plant is **not robust**: the defect lives in the contact query, not in the ankle law.
- Its accepted G1 run list happened not to sample a trigger. Lightly perturbed variants of the same approved scenarios do, at 720 Hz and, with 60 iterations, at 240 Hz.
- **The G1 approval stands as measured, but G1 had no detector for this class, and the plant can produce physically impossible one-step energy injections of up to tens of kJ.**
- **I have not repaired or redefined G1.**

## 12. Classification

| class | verdict |
|---|---|
| our implementation bug | **no**: no V2 code path is involved in creating the invalid manifold; passive layer, controller, ankle law and joint frames are exonerated by ablation |
| Jolt behaviour | **yes**: EPA returns an unconverged, reversed triangle on empty-queue exit; GJK's relative test feeds it near-touching contacts on large shapes. Reproduced in pure Jolt with one hull and one box |
| invalid configuration | **contributing**: a convex box as the ground routes every boot contact through GJK / EPA. That is the code path with the defect, for every box size tested (8–400 m). The 100 m box's scale additionally makes GJK's relative test the entry. Jolt provides a PlaneShape, whose analytic convex-vs-plane collision has no EPA |
| unresolved | the closed-form trigger condition inside the knife-edge region (characterised statistically instead) |

## 13. Candidate fixes (not selected; each is architectural or an engine change, so it needs your decision)

Each is tested counterfactually against:
- the minimal reproducer;
- all known events;
- ordinary valid contact (G1 contact behaviour);
- the accepted plant;
- body variants;
- rates and iterations.

| candidate | what it corrects | reproducer and events | statistical / accepted plant | regression implication |
|---|---|---|---|---|
| **A. Turf = PlaneShape** (spec §15 "ground plane y = 0"; `PlaneShape::sCollideConvexVsPlane` is analytic: axis = plane normal, support point opposite the normal, no GJK / EPA) | **the cause, structurally**, for every turf contact | all saved-state events eliminated (k = 0.15 and k = 0) | §13a sweeps | new contact geometry for every turf contact: full-hull support, like today's EPA path. **Re-run G1, G2, G3.** Plane bounding box ±50 m covers the pitch; edges inconsistent beyond it (Jolt note) |
| **B. Patch Jolt EPA** (diagnostic P2: return the triangle with the smallest support distance seen, not the last; clear the defect flag when substituting) | **the algorithmic defect** for all convex pairs, every box size | 8 / 8 fixtures corrected (same depth as the true face) | near-event set 41,616 queries: 1,634 reversed → **0**; flush 200,000 and random 100,000: 0 → 0; statistical battery (7 hulls × 5 turf geometries × 5 M): §13b | engine fork: rebuild the WASM (emsdk); upstream report; G1–G3 re-run (bit-level change). A first P2 version kept a stale `flip_v_sign` (1 thin-box case); fixed and recorded |
| B′. Patch GJK (P1: absolute tolerance only) | one entry path into EPA | 8 / 8 fixtures corrected, but contact depth changes (rounded-hull path) | near-event 0, but **creates new reversed cases** (1 / 100k random, 1 / 200k flush) via a degenerate GJK tetrahedron → EPA | **not viable alone** |
| **C. Listener guard** (mark a turf manifold with normal_y < 0.5 or turf points off y = 0 as a sensor) | neutralises the bad manifold; not its cause | the k = 0 tilted case: hash unchanged (the manifold was inert) | §13a | contact pipeline change (V2 adapter); cheap; also catches tilted manifolds |
| ~~D. Smaller turf box~~ | **falsified** | eliminated at the saved states (knife-edges move) | **8 m / 20 m boxes: up to 104 / 546 reversals per 5 M flush poses** (100 m box: 2–6) | not a fix |
| E. mMaxPenetrationDistance 0.2 → 0.02 m | **limits the consequence** (≈ 12 mm push, ≤ 0.2 J) | events reduced, not removed | §13a | also limits legitimate deep-penetration recovery (impacts) |
| F. Position iterations 0 / Baumgarte 0 | removes the teleport | removed | — | not acceptable (joint drift, penetration recovery) |
| G. Single-hull boot | changes which pieces exist | eliminated at the saved states | §13a | reverses the approved D1a boot decision (deep-point misses) |

## 14. Consequences for G1 / G2 / G3

- **G1:**
  - The accepted run list passes as measured.
  - **The accepted plant can produce one-step energy injections of +205 J to +6,874 J** (4 distinct runs observed) in lightly perturbed G1 scenarios, including 240 Hz with 60 iterations.
  - G1's physics-integrity claim therefore does not hold in general.
  - I recommend treating **G1 as reopened** pending the turf decision, and adding the turf-manifold invariant as a gate.
- **G2 / G3:** standing feet are near-flush boot pieces at the turf: the trigger class. See the monitored results (§11a).
  - Any turf or contact change (A, C, D, E) **requires re-running G1, G2 and G3** (contact geometry changes outcomes).
  - An EPA patch (B) also requires re-runs: bit-level changes wherever EPA was used.
- **The ankle law (G3-R7 / R8):**
  - Mechanism 1 of the stop report ("engine divergence at the ankle") is now explained. It is **not** an ankle or engine-joint defect.
  - The law's G1 failures from blow-ups must be re-evaluated **after** the turf decision.
  - Its 1.S′ settled-pose and G3 coupling findings (mechanism 2) are unaffected.

## 15. Permanent regression / invariants (implemented, observation-only, report-only until you gate them)

`gates/v2_g1.js` (`INV_TOL`, `_posCorr`, `_passivity`, turf-manifold check in `_contacts`); `gates/v2_g2.js` (teleport check in `G2Sim.tick`); `gates/v2_g1_checks.js` (rows 1.2e, 1.4j, 1.4k, `reportOnly`). State hashes are verified bit-identical with and without them.

| invariant | tolerance and derivation (from healthy runs, never from failures) | false-positive rate on healthy runs | detects |
|---|---|---|---|
| **1.4j turf-manifold validity**: every turf manifold has normal_y ≥ 0.5 and turf-side points within 2 mm of y = 0 | geometric: zero tolerance | 0 false positives by construction; it **does** flag the accepted plant's benign tilted manifolds (true positives of the same defect) | the root cause, every instance |
| **1.2e passivity**: no step gains > 0.05 J of E = KE + PE + U (passive G1 runs) | G1 D2's measured worst step at the validation solver budget was 0.04 J; healthy sweep maxima: 0.0089 J (240 Hz, 1,419 runs), 0.0052 (360), 0.0002 (480), 0.069 (720) | **240 / 360 / 480 Hz: 0 of 1,838**; 720 Hz: 1 of 361 (0.069 J, a shoulder point-constraint / self-contact convergence residual: a genuine small non-passive step, not weakened for); 180 Hz: flags the known TD-1 rebound and the end-range events (true positives of known defects) | every reversed-manifold event run in the sweeps (13 / 13) and smaller non-passive steps |
| **1.4k position-solver teleport**: no body moved > 5 mm beyond its velocity integration in one step | healthy accepted-plant floor max 2.32 mm (951 runs, 180–720 Hz; 240 Hz max 0.88 mm) | 0 on healthy accepted runs; it flags the high-speed shin-kick envelope (17.3 mm, the known D1a missed-contact issue) | all events (72–138 mm), including teleports that load no potential |
| **narrow-phase regression fixtures** (`fixtures/`, `tools/b_narrow.mjs`, native `b_query`, `b_scan`) | expected today: reversed (they document the defect) | — | any candidate fix must make all 8 fixtures and the near-event scan pass |

---

## 10a. Tests designed to falsify the explanation (and their outcomes)

| hypothesis tested | test | outcome |
|---|---|---|
| the ankle stiffness creates the defect | k → 0 from the saved state; k = 0 sweeps | **falsified**: identical event at k = 0; 4 distinct accepted-plant events |
| an ankle / joint-constraint pathology (swing-limit singularity, conflicting constraints, contact + limit conflict) | reduction to the boot alone; ankle stop off; joints disabled | **falsified**: the boot alone reproduces it |
| velocity-solver convergence / warm start / iteration count | warm start off (all / joint / contact); velocity iterations 30 / 600; iteration study | **falsified**: unchanged; events at 30 / 60 / 150 iterations |
| timestep convergence | dt ½ / ⅓ from the saved state; 180–720 Hz study | **falsified**: unchanged; events at 240 / 360 / 720 Hz |
| restitution / friction / speculative bias in the velocity solve | restitution 0, friction 0; ledger | **falsified**: zero velocity-level work in the event step |
| the 100 m scale alone (float32 at 71 m) | the same generator against 8, 20, 100 and 400 m boxes and a 0.1 m-thick box | **falsified as the sole cause**: smaller boxes reverse too (8 m up to 104, 20 m up to 546 per 5 M); scale only selects GJK's entry route |
| the hull's convex radius is required | convex radius 0 (5 M poses × 3 hulls) | **falsified**: 4–8 reversals per 5 M |
| speculative contact is required | speculative 0, penetrating poses only (5 M × 3 hulls × 2 turfs) | **falsified**: 0–3 reversals per 5 M |
| the 10-piece compound decomposition is required | the unsplit approved hull (10 M poses × 2 bodies × 2 turfs) | **falsified**: 8–9 per 10 M (100 m box); 1,734–1,878 per 10 M (20 m box) |
| any convex shape vs a large box | plain cuboids, 4 sizes, with and without convex radius (80 M flush poses) | **not supported**: 0 reversals; irregular hulls are needed |
| GJK's relative test is the defect | P1 (absolute GJK tolerance only) | **partly**: removes the event fixtures but creates new reversals (1 / 100k random, 1 / 200k flush) via a degenerate GJK tetrahedron → EPA |
| **EPA's final-triangle selection is the defect** | P2 (best, not last, triangle) on 8 fixtures, 41,616 near-event, 300,000 flush / random poses, 7 hulls × 5 turfs × 5 M | **supported**: every reversal removed (after one recorded P2 flag fix) |
| our validity interpretation is wrong | Jolt's own contract for `mPenetrationAxis` and EPA's own convergence criterion | **falsified**: the result violates both; the manifold contradicts its own depth |
| the position solver is only incidental | position iterations 0 / Baumgarte 0 / maxPenetration 0.02 m | **supported**: the reversed manifold is harmless without position correction; the magnitude scales with it |

## 11a. Accepted-plant G2 / G3 monitoring

Run in an isolated mirror with `tools/b_monitor_preload.mjs` (observation only); the accepted artifacts are untouched.

| gate | jobs | steps | turf manifolds checked | invalid | identity |
|---|---|---|---|---|---|
| **G2** (`tools/g2_run.js`, all groups) | 620 | 856,106 | 16,317,680 | **0** | state hashes **617 / 617 identical** to the accepted post-D1G1 baseline (3 bookkeeping jobs unmatched) |
| **G3** (`tools/g3_run.js`, all groups incl. T9U) | 332 | 1,054,187 | 20,879,129 | **0** | (the committed g3 json predates the approved passive determinism fix, so hashes differ as for G2) |

**Reading:**
- In quiet stance, pushes, weight transfer and single support, the boot soles are loaded, flush and nearly stationary. No reversed or tilted manifold occurred in 37 M checks.
- The G1 events all occur with boots lying on a side face (falls) or in impacts. That is consistent with the knife-edge statistics: a standing foot repeats almost the same configuration and therefore samples few distinct states.
- **This does not prove standing is immune.** The flush-face scans show sole-like faces can reverse at ~1 per 10⁶ poses. Walking (G4+), with constantly changing contacts, will sample far more states.


## 8a. Equal-denominator stiffness comparison; k = 0.5 sweep

**Perturbation set** (10 scenarios × V2-REF / V1-matched × 15 lift perturbations 1 µm – 100 µm × 240 / 720 Hz = 600 runs; identical runs for both k):

| k (N·m/°) | runs with reversed manifolds | narrow-phase events | largest | reversed / tilted manifold-ticks |
|---|---|---|---|---|
| **0** (accepted) | 3 | **3** (perturb, singleLeg, awkward; all 720 Hz) | +6,874 J | 3 / 19 |
| 0.15 | 8 | **8** (singleLeg ×3, leanL ×2, perturb ×2, awkward; 7 at 720 Hz, 1 at 240 Hz) | **+75,766 J** | 15 / 3 |

(One further 720 Hz +228 J rise at k = 0.15 is the step after a reversed manifold in the same run: the aftermath, not a new mechanism.)

**Reading (Q7):**
- The stiffness raises the event frequency about 2.7× in this set (8 vs 3 of 600). That is suggestive, not strongly significant (Poisson p ≈ 0.1).
- It is consistent with the observed trajectories: k > 0 leaves boots resting on a lateral face with the ankle inverted, so more near-flush irregular-face states are sampled.
- **The mechanism is the same, and the accepted plant has a nonzero rate of its own.**

**k = 0.5, G1 set:**
- 2 narrow-phase events: V2-REF leanF 720 Hz +18,246 J (foot_L piece 3); leanF @+10 µm 720 Hz +45,983 J (foot_R piece 1).
- 15 events of the 180 Hz passive-layer mechanism (≤ 161 J, no invalid manifold), including the historical +142–161 J.

## 13b. Native statistical battery: unpatched Jolt vs the diagnostic EPA patch P2

`tools/b_native/b_genscan.cpp`; `logs/genscan_*.log`.
- **Poses:** a face of the hull exactly parallel to the turf, gap −5 … +10 mm, random yaw, random position within the box.
- **Hulls:** the 7 boot hulls from the event fixtures.
- **Volume:** 5 M poses per hull × turf, 175 M poses in total.

| turf box (m) | poses | reversed, unpatched | reversed, P2 |
|---|---|---|---|
| 100 × 2 × 100 (production) | 35 M | 20 | **0** |
| 100 × 0.1 × 100 | 35 M | 16 | **0** |
| 400 × 2 × 400 | 35 M | 86 | **0** |
| 20 × 2 × 20 | 35 M | 1,656 | **0** |
| 8 × 2 × 8 | 35 M | 332 | **0** |
| **total** | **175 M** | **2,110** | **0** |

**Further native tests:**

| test | result |
|---|---|
| unsplit single-hull boot, V2-REF / V1-matched (10 M poses each) | 100 m box: 9 / 8 reversed; 20 m box: 1,878 / 1,734 |
| plain cuboids, 4 sizes, convex radius 0 / 5 / 10 mm (80 M poses) | **0** reversed |
| convex radius 0, 3 hulls (15 M) | 4–8 per 5 M |
| speculative distance 0, penetrating poses, 3 hulls × 2 turfs (30 M) | 0–3 per 5 M |
| P2 on the 8 fixtures, the 41,616 near-event queries, 300,000 random / flush poses | **0** |

The accepted plant's tilted manifolds (EPA exit A, a sliver triangle toward a box corner) are also corrected by P2.

## 13a. Candidate sweeps (G1 set, 254 runs per k; diagnostic, none adopted)

| candidate | k = 0.5 | k = 0.15 | k = 0 | reading |
|---|---|---|---|---|
| none (reference) | 2 narrow-phase events (+18,246 J, +45,983 J); 15 events of the 180 Hz mechanism (≤ 161 J) | 1 narrow-phase event (+182 J) | 0 events; 7 runs with tilted manifolds | — |
| **A. PlaneShape turf** | **0 invalid manifolds**; only the 180 Hz mechanism remains (≤ 141 J) | **0 invalid**; 1 event of the 180 Hz mechanism (6.9 J) | **0 invalid**, max rise 0.79 J (180 Hz TD-1) | removes the class in every sweep |
| **C. listener guard** | reversed manifolds still generated but neutralised (ΔE −0.29 / 0 J); only the 180 Hz mechanism remains | event neutralised (0 J) | identical except the guarded inert manifolds | removes the consequence; the defect remains (invalid manifolds still occur) |
| G. single-hull boot | 1 tilted / off-face manifold (inert); no narrow-phase event in this sweep | — | — | trajectory changed; the statistical test shows the single hull **does** reverse (§13b) |
| D. 20 m box | 0 invalid in this sweep | — | — | **sweep absence is not elimination**: the statistical test shows *more* reversals (§13b) |
| E. mMaxPenetrationDistance 0.02 m | reversed manifolds still generated (2 + 1 tilted); consequences +0.82 J and −0.32 J instead of +45,983 J and +18,246 J | — | — | **limits the consequence to < 1 J; the defect remains** (flagged by 1.2e / 1.4j) |

**Against the accepted-plant events and other conditions:**

| test | box (reference) | **PlaneShape** | **listener guard** |
|---|---|---|---|
| perturbation set, k = 0 (600 runs) | 3 reversed-manifold blow-ups (+443 … +6,874 J) | **0 invalid manifolds, 0 events, max rise 0.21 J** | invalid manifolds still generated (17 runs); **all 3 events neutralised**; max rise 0.069 J |
| iteration study 30 / 60 / 150 / 300 at 240 Hz, k = 0 and 0.15 (200 runs) | 4 narrow-phase events | **0 invalid**; only the known low-iteration impact rebound (≈ 24 J at 30 iterations, G1-C1) | — |
| G1 set, k = 0: state hashes vs baseline | — | outcomes change (13 postures) | 251 / 254 identical (3 runs touched by a guarded tilted manifold) |

**Ordinary-contact comparison, PlaneShape vs the box at k = 0** (254 runs, G1 rows evaluated per run; same-worker baseline `json/sweep_g1_k0_baseline_metrics.json.gz`):
- runs with any gating-row failure: 20 vs 21;
- rows only with the plane: 1.2a / 1.2b (drop1m @+10 µm, 180 Hz: the TD-1 rebound), 1.R (sideFirst, 360 Hz), 1.4b (hsPost, 5.05 mm vs 5 mm);
- rows only with the box: 1.R ×2, 1.3d ×1;
- 13 chaotic falls end in a different posture;
- resting turf penetration median 0.26 vs 0.23 mm (p95 1.85 vs 2.11, max 5.05 vs 4.99); maximum joint separation distribution identical (median 1.12 / p95 4.39 / max 22.75 mm).

So: no systematic regression in ordinary contact, but outcomes change, so **G1 → G2 → G3 must be re-run** before any acceptance.

*(§8a is completed below.)*
