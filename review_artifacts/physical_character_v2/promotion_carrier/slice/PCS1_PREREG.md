# PCS-1: promotion-carrier vertical slice (three cases, 3 m/s). PREREGISTRATION (frozen before any PCS-1 code or run)

**Date:** 10 Oct 2026.

**Sources:**
- design `../PROMOTION_CARRIER_INVESTIGATION.md` (da6b226);
- user approval `../../sources/2026-10-10_user_approval_carrier_slice.md` (2c39acf, verbatim): decisions D-1 … D-8, the critical criterion with nine requirements, and the hard stops.

**Question (verbatim):** "Can a runner moving at 3 m/s be promoted several ticks before a slide tackle, continue locomoting coherently without contact, then receive a real physical leg collision whose effect is not erased by the locomotion carrier?"

**Preserved unchanged and read-only:** every SLP, PI-1, REV2, LC-1, V1.3 and V2 file and its evidence.
- LC-1 is used only through its official exports, copied byte-for-byte into `../evidence/records/` (SHA-256 in `SHA256SUMS`). They are hashed again after all runs.
- New code lives only under `promotion_carrier/slice/scripts/`. `pi1_rev2_sim.mjs`, `physchar2/*`, the V1.3 files and the LC-1 branch are imported, never modified.

**Structural facts checked before freezing** (read-only; no slice code ran):
- **Skeletons.** The simulation-owned CHARCOLLIDE skeleton (`ptRxCharSkel(PT_CHARCOLLIDE.profiles.vinicius)`) has the same 23 bones, in the same order, as the records' presentation skeleton.
- **Authoritative acceleration.** It is exactly 0 before contact in all three records; at contact it carries the simulation's own response (`../evidence/auth_accel.txt`).
- **Record length.** The records have 260 rows. The slide primitives exist from row 30 to row 168 – 188, beyond every horizon below.

---

## 1. Cases and promotion (D-4, D-5, D-7)

**Exactly three cases.** The records are the LC-1 exports (LOCO mode, `OF_CONT` on), the same gameplay as V1.3 (LC-7).

| case | class (REV2 §4) | gameplay contacts (event tick, sub-step → τ) | promotion frame k_p | τ_p = k_p + 1 | lead (ticks) |
|---|---|---|---|---|---|
| rx_miss | NEAR MISS | none; closest approach τ_ref = 60.5 | 47 | 48 | 12.5 |
| rx_free_leg | RECOVERABLE | 51 / 1 → 50.25, foot_L (swing), CORRECTION, J 2.82; then 60 / 3 → 59.75, toe_R (swing), STUMBLE, J 3.63 (decisive, A1) | 39 | 40 | 10.25 |
| rx_planted_leg | PLANTED-LEG FALL | 49 / 3 → 48.75, shin_L (planted), FALL, J 144.13 | 38 | 39 | 9.75 |

**Rule (D-5).**
- k_p = the latest frame that passes the full REV2 handoff gate HG (with HG-A v2, as computed by `locomotion_continuity/scripts/lc_valid.mjs`, `valid_on_rx.json`) **and** has a lead ≥ 6 simulation ticks before the first predicted contact (rx_miss: the closest approach).
- Lead = τ_ref − τ_p, where τ_ref = event tick − 1 + sub / 4 (the REV2 convention).
- The table's frames follow from that file. They are re-derived and re-checked by the harness (`HG` rows recomputed at k_p); a mismatch stops the slice.

**Note, disclosed.** All three frames precede the PI-1 predictor's trigger (d_pred ≤ 0.25 m first at rows 51, 41 and 39). D-5 sets the lead by the predicted contact time; the production trigger is not part of this slice.

**Handoff (unchanged from REV2 + HG-A v2).**
- The F0 body comes from the LC-1 presentation pose at k_p (PI-1 mapping, RK knee, foot reconciliation).
- Velocities: PI-1 §6.2 backward differences, plus the HG-A v2 uniform horizontal shift to M·v_auth.
- One declared write: 28 authority writes, none afterwards.

---

## 2. The plant

The REV2 plant (`pi1/rev2/scripts/pi1_rev2_sim.mjs`) is used unchanged except for the four carrier terms below, implemented in a subclass `PI1CarrierSim`:
- G2 world (G1 world, passive tissue, contacts, ActuatorLayer);
- 240 Hz, 150 / 2 iterations; plane turf; v2k knee; ankle K 0.13;
- stand-in AST-1;
- posture-tone gains, stance / swing blend by physical foot contact, and gravity statics, all exactly as REV2;
- B caps and gains, and the B release rule.

With the carrier switched off, the subclass must reproduce the REV2 plant bit for bit (row K4b).

### 2.1 Reference R(τ): the simulation's own leg law (D-1)

**Law pose at time τ.**
- The pose is the simulation's own runner pose: `ptRxBody` → `ptRxBodyChar` of the V1.3 simulation code, loaded read-only in a node vm (`pi1/trackB/scripts/charcollide_sim.mjs`).
- Its full-skeleton FK world matrices are captured by wrapping `skelFK` inside the vm. The wrapper returns the original result unchanged.
- **Row rule** (identical to the simulation's own sub-step bodies `simBody`): for τ ∈ (r, r + 1], the state is row r (x, y, vx, vy, facing, gaitPhase = `rows[r][8..13]`, legLen) with the time offset dt = (τ − (r + 1)) / 60.
- No row after r is read while physics advances through (r, r + 1] (PI-1 §6.3).
- The derivative stencils (§2.3) use the **same row** as their centre point, at offsets ± h. This is the simulation's own constant-velocity / stride-clock extrapolation of that row.

**Render frame.** World matrix = T(x, y, dir) · FK.
- T maps character-local (x right, y up, z forward) to render coordinates: render = (x + f_x·l_z − f_y·l_x, l_y, −(y + f_y·l_z + f_x·l_x)).
- This is `ptRxBodyChar`'s own `toP` followed by `sim2r`.

**V2 reference bodies S_T(τ).**
- Mapping: the PI-1 mapping without foot reconciliation, `rawRotations(bones, bind, world, { rk: true })` then `project` (the hard-box clamp, reported).
- Joint reference q_T,k(τ) = `passive.qcs(jd[k], S_T rotations)`, the same convention as the posture driver's `ev.qs`.

**Reference pelvis:** S_T's pelvis COM position and orientation.

### 2.2 C-Q: posture targets (D-1, "initialised continuously from the promoted pose")

**Targets.**
- q*_k(τ) = q_T,k(τ) · slerp(1, Δ₀,k, w_b(τ)), where:
  - Δ₀,k = conj(q_T,k(τ_p)) · q_prom,k, with q_prom the promoted (physical) joint configuration at τ_p;
  - w_b(τ) = 1 − smoothstep((τ − τ_p) / 6), so **T_b = 0.10 s**.
- The posture driver's target for the step τ_n → τ_n+1 is q*(τ_n+1). This is the same timing as REV2's B target.
- At the authoritative FALL transition, REV2's rule applies unchanged: targets frozen at the physical pose; C-V and C-ID stop.

### 2.3 C-V: target-rate feed-forward

**Rate and torque.**
- ω*_k(τ) = 2·vec(conj(q*_k(τ − h)) · q*_k(τ + h)) / (2h), with h = 1/240 s, in the joint's child-frame axes (the convention of the posture error e).
- τ_vff,k,i = (D + dt·K)·ω*_k,i, the PI-1 §8 form, added to τ0. K and D are the REV2 posture gains of that step.

**Scope:** every motorised axis, from promotion to the FALL transition.

### 2.4 C-ID: target inverse dynamics for limbs not in ground contact (D-3)

**Inertial Newton–Euler of the reference motion.**

τ_ID,j = Σ_{i ∈ sub(j)} [ (c_i − p_j) × m_i·a_i + I_i^w·α_i + ω_i × (I_i^w·ω_i) ]

All terms are evaluated on S_T and its central differences (h = 1/240 s, same row):
- c_i and a_i: COM position and acceleration;
- ω_i and α_i: angular velocity and acceleration;
- I_i^w = R_i·I_i·R_iᵀ, with V2's own masses and inertias;
- p_j: the reference joint point.

**Gravity is excluded.** It stays with REV2's statics.

**Projection:** τ_ID,j is projected on the **reference** joint axes (reference child rotation × F2), so the per-axis command is a pure function of the authoritative record.

**Joints:**
- **legs:** hip, knee and ankle, weighted by w_ID,X(τ). This weight is a linear ramp (rate 1 / 0.03 s, the posture driver's BLEND) toward the law's own swing indicator `!legs[X].planted` at τ. It is **never** the physical contact state.
- **arms:** shoulder and elbow, weight 1.
- **trunk and neck:** none ("limbs" only).

**Logged** separately from every other torque.

### 2.5 C-T: the SLP-2 uniform field (D-6)

**Force:** F_i = α_A·m_i·a_T on every body at its COM (`addForceAt`), applied before each step. This is the SLP-2 law unchanged, with a 2-D horizontal a_T.

**Inputs:**
- a_T for (r, r + 1] = (v_r − v_{r−1})·60 (render frame), the PI-1 §7 "A form";
- α_A = 1 while the row has no reaction **and** r < r_c = (first gameplay contact event tick − 1); 0 from then on, permanently.

So the field is off from the interval in which the simulation records its first contact. Its first non-zero response acceleration appears one row later (rows 51 / 49), so the field never applies it.

### 2.6 B (D-2)

**Unchanged:** the SupportLayer class, caps (274.95 N horizontal; 81.80 N·m), gains (2 Hz, ζ = 1, REV2 inertia), and release (completely at the authoritative FALL, REV2 timing).

**Changed only:**

| | change |
|---|---|
| target position (x, z) | the reference pelvis COM, with the promotion offset decaying over T_b exactly as in C-Q |
| target velocity | its central difference |
| target orientation | the reference pelvis orientation (same offset rule), as R*·R_pel0⁻¹ in constraint space |
| target angular velocity | its central difference |
| vertical axis | **released** for the whole promotion: motor state Off. It never applies force. |

### 2.7 States (REV2 §6, causal readings)

| state | rule |
|---|---|
| PRE | from τ_p |
| IMPACT | from the first physical contact (A2 detector); ends when no physical contact has occurred for 0.10 s |
| RECONCILE | after IMPACT, or for the near miss once the envelope has passed (d_pred > 0.25 m and the distance increasing); a new physical contact returns to IMPACT; T_rec = 0.5 s counted from the latest entry |
| FALL | from the authoritative FALL transition |

The states change no control. Controls depend only on FALL (§2.2, §2.6). The states define evaluation windows.

### 2.8 No-tackler counterpart

The same case, record, k_p, handoff, plant and step count, with every stand-in primitive offset by +500 m in z (the lead_drift construction). The stand-in exists and is driven identically but cannot touch the runner.

### 2.9 Horizon

Physics runs from τ_p until the later of:
- the end of the state machine (DG met, T_rec expired, or FALL handoff / contact + 1.5 s);
- the last physical contact + 0.30 s.

It is capped at the record's slide end. The no-tackler counterpart runs the same number of steps. Physics after demotion is reported only.

### 2.10 Measurement additions (read-only)

- **Ankle probes:** `gates/v2_g1_ankle.js AnkleProbe`, both feet. They are read-only momentum balances, used for foot loads (DG(d), PR-4) and per-foot contact impulses.
  - REV2 runs with probes off. K4b verifies that probes change nothing.
- **Energy ledger additions:** work of B, of C-T, and of the stand-in contact impulses at the manifold points.

---

## 3. Logging (the critical criterion's record; every step, from τ_p to the horizon)

**Per driven joint and axis:**
- τ_stat (REV2 gravity statics);
- τ_vff;
- τ_ID;
- the servo part K·e − (D + dt·K)·ω;
- the requested torque;
- the applied actuator torque (impulse readback);
- capacity and saturation;
- K and D;
- e;
- ω_rel.

**Per body:** COM position and velocity, angular velocity.

**Per foot:** probe impulse, turf manifold, contact-point slip.

**Stand-in:** contact impulse per step (A2 momentum balance), attributed to the runner body of the deepest manifold.

**Carrier:**
- q*, ω*, the A forces, B targets, B impulses, α_A, w_b, w_ID;
- a SHA-256 of the carrier command stream (q*, ω*, τ_ID, A forces, B targets);
- a hash of the full posture command (K, D, τ0 per axis);
- the runner state hash chain.

**Timers** (criterion 9; performance.now, excluding logging):
- carrier (C-T + B target computation);
- gait targets (law evaluation, mapping, projection, offsets, stencils);
- inverse dynamics;
- recovery support (B target setting);
- physics (Jolt step, passive tissue, actuators, posture servo);
- measurement / probes, reported separately.

---

## 4. Criteria (frozen)

### 4.1 Pre-contact coherence (hard stop)

**Applies:** every whole tick from τ_p + 1 through the first physical contact (contact cases) or through the RECONCILE entry (rx_miss).

**Set:** the frozen contact-coherence set (`pi1/moving_handoff/scripts/drift_summarise.mjs` STATE), unchanged thresholds:

| row | requirement |
|---|---|
| RC-4h | physical pelvis height ≥ 0.85 × the LC-1 presentation's |
| RC-4t | pelvis tilt vs the presentation ≤ 20° |
| CG-4sim | every leg body COM within 0.10 m (horizontal) of the simulation's own segment axis |
| CG-2 (lenient) | physical foot state (≤ 5 mm planted / ≥ 15 mm air) = the simulation's planted flag; 5 – 15 mm passes |
| P-12 | no hard-limit excursion |
| NM-2 slip | ≤ 10 mm |

**NM-2 slip reading, fixed before any run.** Slip = the horizontal displacement of the foot's **material contact points**:
- per step, the mean over that foot's boot ↔ turf manifold points of |v_h(foot material point)|·dt, where the point velocity = v + ω × (p − c);
- accumulated per stance (contact steps, gaps ≤ 2 steps bridged);
- the maximum per stance.

**Why.** lead_drift's sole-centroid speed counts a foot **rolling** about a fixed contact point as slip. For the held postures it was built for, the two readings agree. A locomoting foot rolls every stance. The sole-centroid value is reported alongside.

**B budget over the same interval (NM-2 B rows):** mean |axis| / cap ≤ 0.25 on every active axis (x, z, three rotations), and saturated on ≤ 5 % of steps.

### 4.2 The critical criterion: "the locomotion gait driver itself must not erase the collision"

Each contact case is compared with its no-tackler counterpart (§2.8). t_c = the first step with any runner ↔ stand-in manifold (speculative included).

| # | requirement | test (gating unless marked) |
|---|---|---|
| 1 | before contact, gait-driver commands identical | the full posture command (K, D, τ0 per axis), the carrier command stream and the runner state hash are **bit-identical** at every step before t_c |
| 2 | the driver does not increase its authority in response to collision displacement | **(a)** the carrier command stream (q*, ω*, τ_ID, A forces, B targets, α_A, w_b, w_ID) is bit-identical at **every** step of the run, before and after contact. This holds by construction: it reads only the record. **(b)** K, D and capacity of every axis are recomputed from the logged physical foot-contact blend and joint state; they must equal the logged values (no hidden dependence). **(c) Reported:** every step where the contact run's K or D exceeds the counterpart's, with its cause (a foot-contact change, REV2's unchanged gain schedule). |
| 3 | collision momentum stays visible, not cancelled on the following ticks | **(a)** ΔJ_A ≡ 0 (from 2a). **(b) RC-3, retained threshold:** over [first A2 contact, + 0.10 s], B's linear impulse difference opposing the transferred impulse ≤ 0.5 × the transferred impulse; likewise B's angular impulse vs the contact's angular impulse about the COM. Applied to each contact event of rx_free_leg. **(c) RC-2 (struck limb, vs the counterpart):** in the first contact step the struck body's Δv ≥ 0.2 m/s within 45° of the contact normal; within 0.15 s the struck foot deviates ≥ 30 mm from its counterpart position. **(d) Reported:** ΔP(t), ΔL(t) and the ledger (contact, B, turf, A) over [t_c, t_last + 0.25 s]; the retained fractions at + 0.05 / 0.10 / 0.25 s. |
| 4 | the clip returns toward the gait only through the approved finite authority and ordinary actuator limits | B force never beyond its caps (≤ 1e-3 N, I-1); ActuatorLayer over-capacity count = 0; no authority write after promotion (PR-5); 2a holds |
| 5 | the planted-leg fall overwhelms that authority and produces the simulation-authoritative fall | **FL-1:** physical contact within ± 1 tick of the simulation's contact, on the mapped body (REV2 CG-1 / CG-3 reading). **FL-2:** B force identically 0 from the FALL transition; C-T, C-V and C-ID zero from then on; no write. **FL-3:** pelvis COM ≤ 0.35 m within 1.5 s of contact, and the §9.2 handoff reached before the simulation's recovery start (the record's FALL reaction `tRec` = tUp − recoverT[family], 1.8974 s → τ = 60·t = 113.8). **FL-5** reported. |
| 6 | rx_miss indistinguishable from its no-tackler baseline after promotion / demotion | runner state hash and posture command bit-identical at every step between the two versions; identical DG outcome and residuals |
| 7 | presentation ON / OFF gameplay-hash identical | the records' gameplay hashes are identical across OFFNP / OFF / FULL / LOCO (the export summaries) and equal V1.3's; the AIR files' SHA-256 are unchanged after all runs; the record object is deep-frozen in the harness |
| 8 | deterministic | every run twice, in separate processes: identical per-step hash chains and identical outputs (DT-1 / DT-2). DT-3 (the three contact runs in one process) is reported. |
| 9 | CPU reported per component | §3 timers: medians per 240 Hz step and per 60 Hz tick, sequential runs (the second run of each pair), Node 22 / Apple M4. Browser and mobile are not measured, and the report says so. |

### 4.3 Contact correspondence (REV2 §4 with A1, A2, E1; code reused unchanged from `scan_rev2.mjs` / `scan_lc.mjs`)

- CG-1, CG-2 (at the decisive sub-step), CG-3, CG-4 (contact point), CG-5, CG-6 (approach velocity, E1), CG-8;
- NM (rx_miss: no physical contact; the predictor fires);
- AST-C1 (stand-in tracking ≤ 10 mm before contact);
- the 10 mm tackler discontinuity.

### 4.4 Integrity rows

| row | requirement |
|---|---|
| K0 | the law provider's leg / foot / toe segments equal the recorded `simBody` (≤ 1e-9 m) at every row and sub-step used; the law skeleton's bind matrices equal the record's (≤ 1e-9) |
| K4b | carrier off (C-Q / C-V / C-ID / C-T off, B as REV2, probes on) reproduces the REV2 plant (probes off) bit for bit over the same horizon, at each case's k_p |
| PR-5 | 28 writes, none afterwards |
| I-1 | B caps never exceeded (≤ 1e-3 N); state finite |

### 4.5 Reported, not gating

- **PR-1 … PR-4 at promotion.** PR-2 v2 is expected to fail in every promotion: LC-1 found its velocity part, 20 – 49 mm, comes from the PI-1 §6.2 60 Hz backward differences. That is a handoff-initialisation matter recorded separately, not a carrier one.
- **DG (REV2 §7)** for rx_miss and rx_free_leg: reached within T_rec, time to demotion, residuals, blend needed. DG compares with the LC-1 presentation, while the carrier follows the simulation's law, so their gap is reported as such.
- **RC-4, RC-6, FL-6, NM-4**; the energy ledger (Σ+ residual); the sole-centroid slip.
- Stance-leg ground impulse opposing the hit (the physical bracing share); legs' net horizontal impulse over PRE; actuator saturation; target hard-box clamp; ID and velocity feed-forward magnitudes.

### 4.6 Answer rule

**Yes** only if, in all three cases:
- §4.1 holds;
- the §4.3 rows hold;
- §4.2 items 1 – 8 hold;
- §4.4 holds.

Otherwise **no**, with every failing row and its attributed cause.

**Attribution classes:**
- the carrier / gait driver;
- the reference (the simulation's law);
- the handoff / presentation (LC-1);
- the stand-in;
- the V2 body (joints, actuators, contact model);
- measurement.

A failure counts against V2 only if it is shown to arise from the V2 body itself and not from the temporary gait driver (user instruction).

---

## 5. Run order and stop rules

**Order:**
1. K0 and K4b, all three cases, before any carrier run.
2. Then rx_miss, rx_free_leg, rx_planted_leg. For each case:
   1. the contact run a;
   2. the no-tackler run a;
   3. the contact run b;
   4. the no-tackler run b (sequential; CPU from the b runs).

**Hard stops (user):**
- §4.1 fails in any case: stop at that case.
- Criterion 2a or 3b fails (the carrier or gait driver materially cancels collision momentum): stop.
- K0 or K4b fails, or the k_p re-check mismatches: stop before any carrier run.
- **Never:** increase any authority, cap or gain; change the simulation outcome or collision geometry; add a gait mechanism (foot placement, balance, stance-force shaping, swing re-timing); add a case, speed or sweep. If passing would need any of these, stop and report.

**Fixed constants, no per-case values, no tuning:** T_b = 0.10 s; h = 1/240 s; ID ramp 0.03 s; the +500 m offset; all REV2 and PI-1 constants.

**Not run:**
- FL-4's perturbation battery (excluded by D-7: no sweeps);
- REV2 §9 robustness;
- any other record.

## 6. Outputs

- `PCS1_RESULTS.md`;
- per-run logs (gzip JSON) and evaluation JSON under `evidence/`;
- the CPU table;
- a browser replay of the three cases: physical body vs the simulation's legs vs the LC-1 presentation, contact vs no-tackler;
- `DECISIONS.md` entry. No push.

## 7. Amendments

None at freezing.
