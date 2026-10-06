# E2 overnight report (2026-10-06)

**Authority:** `../sources/2026-10-06_user_instruction_overnight_e2_autonomous.md`. Everything is local; nothing pushed; no official E2 run.

## E2 STATUS: BLOCKED ON PLANNING DECISION

The estimator defect and the liftoff discontinuity are corrected, causally verified and regression-clean. The corrected swing now tracks the frozen trajectory to about 1 – 2 mm.

What remains is the frozen swing **trajectory geometry at the clearance window's end (φ 0.8)** and the **touchdown it implies**:
- the reference is 5.40 mm above the turf at φ 0.8;
- accurate tracking lands it at φ ≈ 0.88 with 0.05 – 0.13 m/s.

The planning gate cannot certify it: PG-1 is 0 / 32 under every servo model available. The preregistered servo validation does not validate either, for partly battery-design reasons (§7).

---

## 1. What changed (all default-off; KV0 and every prior configuration bit-identical)

| change | kind | option / configurations | commit |
|---|---|---|---|
| velocity-feed-forward rate: singularity-robust variable damping on the commanded-target term | implementation correction | `vffRate: "sr"`; PSTAR4S, PSTAR5BS, PSTAR5CS | 6c30e64 |
| continuous target-motion velocity feed-forward through the B1 re-anchor (replaces I-11's one-tick dropout) | implementation correction (handoff) | `e2reanchorVel`; PSTAR5BH, PSTAR5CH | 4a2807e |
| the tracked-clearance allowance is keyed to the servo configuration it was validated on | safeguard | `FS.clearAllow.servo` | 4a2807e |
| variable damping also on the pelvis-motion term | **REFUTED**, kept as diagnostic | `vffRate: "srAll"` | 6c30e64 |
| passive-damping feed-forward | **diagnostic counterfactual, not adopted** | `vffPassive` | this report's commit |

**Tools added:**
- `rate_cond_preload.mjs`, `rate_cond_analyze.mjs` (conditioning study);
- `e2_swing_track.mjs` (signed tracking and clearance decomposition);
- `e2_apex_whatif.mjs` (planning-only);
- `e2_allow_whatif_preload.mjs` (PG what-if);
- `e2_run` diagnostic `--xstand` / `--diagAllow` (smoke plus `--diag=noclear` only);
- swing tools `--vff=sr` / `--handoff=1`;
- `e2_eval`'s judge accepts the S / H records (rules unchanged).

## 2. The velocity-estimator root cause (proved)

**Mechanism:** `lcVff "lin"` makes ω\* from one Levenberg–Marquardt step with the solver's initial damping μ0 = 0.01. In each eigen-direction of JᵀJ that scales the rate by λ / (λ + μ0(1 + H_ii)).

**At swing poses** (knee about 35°):
- the "lift the foot" direction has λ = 0.010 – 0.012 ≈ μ0;
- so ω\* comes out at ×0.27 – 0.37 vertical and ×0.84 – 0.97 forward;
- the uncompensated damping acts as a lag of (1 − k)·64 ms.

**Conditioning study** (`VFF_RATE_CORRECTION.md` §2): 45,458 rate problems against the exact per-tick IK displacement.
- μ0 loses 22 – 73 % of the rate at every swing pose.
- The undamped rate is exact (≤ 1.3 %) wherever σ_min ≥ 0.03, which covers every airborne / commanded pose.
- It fails only at the straight-knee singularity (σ_min < 0.001: errors 10² – 10⁵).

**Proof by correction:** with the corrected rate, ω\* = ω_id (×0.99 – 1.00), and the joint lag of the commanded motion is 0 – 2 ms on all bodies, rates and pelvis modes (§4).

## 3. Estimator solution chosen and why

**Formulation:** singularity-robust damped least squares with variable damping (Nakamura & Hanafusa; Chiaverini), in the solver's own Marquardt form:

μ = μmin + (μ0 − μmin)·max(0, 1 − λmin/ε²), with ε = 0.01 from the conditioning study.

- The validated μ0 is used exactly at the singularity; the resolved rate elsewhere.
- λmin comes from a deterministic Jacobi eigen-solve.

**Scope:** general, but only for the **commanded-target term** (rT, an exogenous feed-forward).
- The first, all-terms version (`srAll`) **destabilised the external-lift harness**: 4 falls, τ0 steps to 11,553 N·m.
- Mechanism: the pelvis-motion term (rP) is closed loop. Making it exact feeds a one-tick-delayed copy of the measured pelvis velocity through the leg's stiff weak direction (Cartesian damping ~D/σ²). μ0 had been bounding that loop gain.
- Scoped to rT, every path without a commanded target is bit-identical: external lift 12 / 12, 776 / 776 pre-swing runs.

**E2-only analytic alternative** (J⁻¹·v_ref), compared:
- the same rate for the target term (≤ 1.3 % vs exact);
- it needs the same singularity guard;
- it exists only where an analytic reference is supplied, so E1 lifts and aborts would keep the defect.

So the general scoped correction was chosen, because the prior regressions showed it safe (§5).

## 4. Before / after tracking

**Stage diagnostics** (V2-REF L 240 Hz, floating; `evidence_vffrate/lag/`):

| | lin (before) | sr (adopted) |
|---|---|---|
| vertical 2 Hz, foot | ×0.86, **42.9 ms** | ×1.09, 9.7 ms (the rest is the pelvis-motion term) |
| knee ω\*/ω_id, vertical | ×0.27 | ×0.86 (target part ×1.00) |
| constant velocity down, knee joint lag | 37.6 ms | 1.4 ms |
| constant velocity forward, foot | 0.3 ms | −4.2 ms (one-tick measurement convention, ∝ dt) |

**Real E2 swing, non-test smoke steps** (V2-REF, 0.07 m forward / 0.06 m lateral, 240 Hz). Tracking and clearance in the frozen evaluator's convention; signed vertical error e_z time-matched:

| configuration | tracking RMS / max (mm) | e_z rising / descending (mean, mm) | clearance min φ ∈ [0.2, 0.8] |
|---|---|---|---|
| PSTAR5B (before) | 5.6 / 8.4 – 9.3 | −4.0 / +4.0 … +4.9 | 3.29 / 3.53 at φ 0.20 (forward / lateral) |
| PSTAR5BH (rate + handoff, D1 off) | 3.6 – 4.1 / 5.7 – 5.8 | −0.5 … −1.1 / +1.8 … +1.9 | 4.05 / 5.41 at φ 0.80 |
| PSTAR5CH (+ D1) | **1.1 – 1.4 / 1.8 – 2.3** | −0.7 … −1.0 / +1.5 … +1.9 | **5.18 / 6.01 at φ 0.80** |

**Preregistered servo battery** (192 runs, amendment S2; `SWING_SERVO_VALIDATION_RESULTS_S2.md`), representative RMS:
- with D1: 4.0 – 6.6 → **1.3 – 2.0 mm**; peaks 10.7 – 11 → **3.1 – 5.8 mm**;
- without D1: 4.7 – 7.7 → 3.2 – 5.5 mm.

**Error pattern:** the residual is now **a pure lag**, low while rising and high while descending, in every run of the 96-run matrix (§9). Not low both ways, so there is no geometric / orientation bias in the vertical error.

## 5. Prior-regression results (PSTAR4S = PSTAR4 + the correction; frozen batteries, clean committed copies)

| battery | result | vs PSTAR4 |
|---|---|---|
| E1b official set E | only the class-B V2-165-62 P15 item fails, as under PSTAR4 | 428 / 429 verdicts identical; one change = improvement (V2-REF P15 E1a-4 FAIL → PASS) |
| E1a set A | PASS | 135 / 135 identical |
| extended set X | only the class-B P15 runs fail, as under PSTAR4 | class-B stance slip 6.8 – 7.9 → 5.2 – 6.3 mm |
| **E1b closing evaluation** | **PASS** | same |
| T-A checks, browser = Node | PASS | same |
| **G0 – G3** (V3.1 – V3.10) | **PASS** | KV0 identical; G1 74 / 74 hashes identical; G2 / G3 / J2a / external lift / browser pass |
| **pre-swing P\* validation** (V1 – V15, the validation of lcVff itself) | **PASS** | 776 / 776 non-lift runs hash-identical to the official validation; lifts changed |
| KV0; PSTAR4 / 5 / 5B identity | identical | after every edit |

**Behaviour changes, none failing a criterion:**
- lift hover error improved;
- touchdown impact of lifts 0 → up to 14.9 % BW (limit 25), explained in `VFF_RATE_CORRECTION.md` §8a;
- abort put-down contact earlier: +0.20 → +0.15 s.

**Not decided by me:** PSTAR4 remains the certified E1 configuration; adopting PSTAR4S as the E1 baseline is listed in §12.

## 6. Liftoff handoff: diagnosis and result (`E2_HANDOFF.md`)

| candidate | finding |
|---|---|
| weak-gain interval (contact → swing gain blend over 0.1 s) | exists. Counterfactual (swing gains also in contact): ≤ 0.2 mm RMS without D1, ≤ 0.01 with D1. **Not a cause; left unchanged** |
| velocity feed-forward dropout at the B1 re-anchor (I-11) | **defect**: a one-tick 23 N·m τ0 dip at the knee (applied Δτ 9.6 N·m). **Corrected** (`e2reanchorVel`): 9.6 → 0.8 N·m (D1 off), 8.0 → 1.4 (D1 on); tracking unchanged |
| liftoff transient error (forward, up to 5.8 mm at +0.15 s) | **inertial**: 1.7 – 2.1 mm with D1 |
| stale stance objective / incompatible grounded motion / frame blend | none found (pre-liftoff Δτ ≤ 0.4 N·m; lift error ≤ 1 mm) |

## 7. PG-1 planning result: FAIL (0 / 32)

| servo model in the certificate | PG-1 | margin at the binding point |
|---|---|---|
| PSTAR5BH: bandwidth envelope (servo without D1) | **0 / 32** | 2.42 / 2.80 mm at φ 0.80 (envelope 2.98 / 2.60) |
| PSTAR5CH: tracked allowance | **not certifiable**: the preregistered servo validation (S2) does not validate, so no allowance may be set | — |
| PSTAR5CH what-if with the S2 rule's allowance (rise 4.80, apex 6.66, descent 3.17 mm) | **0 / 32** | 2.23 mm at φ 0.80 |

**Binding point:** the frozen planning reference is **5.40 mm above the turf at φ 0.80**. Every certificate needs allowance ≤ 0.40 mm there.

**Servo validation S2 failures, diagnosed:**
- V-1 on reach-saturated trajectories of the shorter bodies;
- V-2 on return / lateral segments, whose OFF error carries the pelvis-motion residual (γ ≈ 0.25 × the no-feed-forward lag);
- V-4:
  - energy Σ+ over long runs (∝ dt; equally without D1);
  - activation-limited hip reversal at 180 Hz (6 – 9 %, 39 – 56 ms);
  - box-switch Δτ0 steps at elevated poses.
- V-3, V-5, V-6 pass.

## 8. Corrected physical commanded step (DIAGNOSTIC non-test smoke matrix; `evidence_smoke_H/`)

**Matrix:** PSTAR5CH, 8 bodies × both legs × forward 0.07 m / lateral 0.06 m × 180 / 240 / 480 Hz = 96 runs. Certificate logged, not enforced. Frozen E2 criteria applied for information:

| criterion | pass | failures |
|---|---|---|
| E2-1, 2, 4, 6, 7, 8, 10, 11, 12, 13, 14, 17, 18 | 96 / 96 each | — |
| E2-3 (tracking ≤ 10 / 5 mm; clearance ≥ 5 mm over φ 0.2 – 0.8) | 92 / 96 | V2-165-62 forward 240 / 480 Hz (L, R): clearance **4.96 – 4.98 mm** at φ 0.80. Tracking RMS 0.84 – 1.76 mm, max ≤ 2.98 everywhere |
| E2-5 (touchdown) | 78 / 96 | **impact peak 26 – 43.5 % BW** (limit 25): forward steps of the heavier bodies, mostly at 480 Hz. Approach speed within limits (down ≤ 0.13 m/s, horizontal ≤ 0.04 m/s) |
| E2-9 (torque steps) | 94 / 96 | V2-198-92 forward 480 Hz: 10.65 N·m at the touchdown slap |

**Touchdown mechanism:**
- Contact happens at φ 0.87 – 0.91. The reference's final 15 % lies within 2 mm of the turf while descending at about 0.05 – 0.1 m/s.
- The foot is pitched 0.6 – 1.1°, so it strikes on two pieces and slaps flat. The peak is the one-tick stop.
- Rate dependence: V2-198-92 forward peak 22.7 / 28.3 / 43.5 % BW at 180 / 240 / 480 Hz, with the 50 ms impulse falling slightly (3.48 / 3.13 / 3.01 N·s). The peak metric scales with the solver step.
- Under PSTAR5B the lagging servo arrived late and slow (9.4 % BW).

## 9. Clearance decomposition (96-run matrix, my time-matched convention; the evaluator's is 0.3 – 0.5 mm lower at φ 0.8 because the reference descends at 0.12 m/s there)

| φ | reference geometric clearance | vertical tracking e_z | foot tilt / yaw (swept-foot remainder) | measured lowest boot point |
|---|---|---|---|---|
| 0.20 | 9.0 – 9.8 mm | −1.1 … −2.1 (rising: low = lag) | −0.0 … −0.5 | 6.95 – 7.93 mm |
| 0.80 | 5.71 – 5.85 mm (planner's prediction 5.40) | +0.5 … +2.4 (descending: high = lag) | **−0.73 … −1.18** | 5.26 – 7.26 (evaluator 4.96 – 6.49) |

- No contact or scuff before φ 0.6 in any run (E2-3 touching rows 0).
- **The previous φ 0.20 inconsistency is gone physically** (≥ 6.95 mm): A1 / B1 plus the corrected servo.
- The descent end φ 0.80 binds:
  - geometric 5.4 – 5.85 mm;
  - the vertical error helps (+);
  - the swept-foot tilt costs 0.7 – 1.2 mm.
- **The tilt is a control effect, identified causally.** The ankle's passive viscous damping (0.2 N·m·s/rad) is 33 % of its swing-servo damping (0.6), and the velocity feed-forward does not cancel it: a ≈ 21 ms foot-orientation lag.
- Counterfactual `vffPassive` (`evidence_passive_cf/`): tilt 0.6 – 1.1° → 0.32 – 0.34°, φ-0.8 clearance +0.5 – 0.8 mm (4.96 → 5.79, 5.18 → 5.82, 5.34 → 5.85). But the flat foot lands on the whole sole at once, and **impact rises**: 19.4 → 27.3, 21.8 → 25.7, 28.3 → 30.3 % BW, despite lower approach speed.
- Not adopted: it trades one criterion for another and would need its own E1 regressions.

**Planning allowance vs physics:**
- The S2 rule's descent allowance (3.17 mm) comes from the **in-air stop at φ → 1** of hover-ending battery segments, outside the certificate window and outside E2's regime (E2 ends in contact at φ ≈ 0.88).
- Inside [0.75, 0.80] the battery's worst downward deviation is **0.75 mm**, and the E2 matrix's is about 0.5 mm (time-matched).
- **So even a window-consistent allowance (≈ 0.75 mm) exceeds the frozen trajectory's 0.40 mm budget.** This is case **B** (geometry), with an A-type rule-binding issue on top.

## 10. PG-2 / recovery

- **PG-2:** 4 / 4 obligations CERTIFIED_ONE_STEP under PSTAR5B, PSTAR5BH and the PSTAR5CH what-if. Same foothold (4 cm out, 1 cm back), T 0.2055 – 0.2072 s, slack 12.2 – 15.6 ms. `evidence_pg_H/pg2_obligations/`.
- **Recovery smoke SMK-R** (V2-165-62 R P15 180 Hz), diagnostic only, recovery policy untouched (`evidence_recovery_diag/`):

| item | PSTAR5B | PSTAR5BH |
|---|---|---|
| R-1 | PASS | PASS |
| R-2 old stance lift | FAIL (4.0 mm, 2 entries) | **PASS** (2.5 mm, 0 entries) |
| R-3 landing vs plan | PASS 6.2 mm | **FAIL 26.7 mm** |
| R-4 impact / speed | FAIL 55 % BW, 0.19 m/s | FAIL 64 % BW, 0.08 m/s |
| R-5 | FAIL | FAIL |
| R-6 | PASS | PASS |

- The earlier findings stand: old stance-foot unloading, the 0.2 s swing vs servo, and E2-17 / CoP semantics for recovery.
- Recovery is a separate decision. PSTAR5CH's recovery smoke cannot run until a validated allowance exists: the liftoff re-certification needs one.

## 11. PG-3

Pass: every chosen recovery foothold and path is certified online (path all FEASIBLE, 4 / 4). For commanded steps PG-3 is moot while PG-1 returns NO_CERTIFIED.

## 12. Remaining blocker and the decision needed

**Blocker:** the frozen commanded-step swing (25 mm apex at T/2, BLF two-quintic, 5 mm clearance required to φ 0.8, touchdown planned at φ 1.0) is not robustly feasible for an accurate servo:
1. At φ 0.8 the reference leaves ≤ 0.40 mm for tracking plus foot tilt. The corrected servo needs ≈ 0.75 mm by any window-consistent measure, 3.17 mm by the preregistered phase rule.
2. Accurate tracking lands the foot at φ ≈ 0.88 with 0.05 – 0.13 m/s, and the solver-step impact peak exceeds 25 % BW for heavier bodies at 240 / 480 Hz.

The servo itself is no longer the limiting factor in the E2 regime.

**Decision A — the commanded-step trajectory / window (pick one):**

| option | what | evidence (`evidence_pg_H/apex_whatif.txt`) |
|---|---|---|
| **A1 (my recommendation)** | raise the apex to **30 mm** | reference at φ 0.8 = 6.52 mm (6.70 with the corrected liftoff delay 0.133 s): covers the window-consistent 0.75 mm allowance plus a ≈ 0.8 mm robustness margin. Descent speed at 1.5 mm rises only 0.055 → 0.059 m/s |
| A1-min | apex 26.5 – 27.5 mm | zero to small margin over 0.75 mm. Not robust |
| A1-rule | apex ≈ 37 mm | needed if the preregistered descent allowance (3.17 mm, from the in-air stop at φ → 1) is kept as is |
| A2 | keep 25 mm; end the clearance window at φ 0.75 | reference 8.84 mm there. The last 25 % is the landing approach: a criterion change |
| A3 | redefine the allowance's descent phase to the certificate window (φ ≤ 0.8) | allowance 0.75 mm. **Still fails at 25 mm**, so it only works together with A1-min / A1 |

**Decision B — touchdown (E2-5) with an accurate servo:**
- (B1) define the impact metric rate-independently (e.g. the 50 ms impulse, which is rate-stable, or a filtered peak);
- (B2) a landing-approach design: lower contact speed at contact height, e.g. a final approach segment or a touchdown velocity seed;
- (B3) accept E2-5 impact failures for heavy bodies at 240 / 480 Hz as the result.
- **My recommendation:** B1 together with B2 measured on smokes. A1 alone does not cure it (higher apex → slightly faster final descent).

**Decision C — the servo-validation criteria under the corrected estimator:** V-1 / V-4 failures are battery-design effects:
- elevated trajectories beyond the short bodies' reach;
- the dt-proportional Σ+ over long runs;
- the allowance's phase binning.

Options: (C1) re-preregister a battery matched to the E2 regime (my original caveat), or (C2) keep it and accept that D1 cannot be certified by it. The physical activation-limited saturation at 180 Hz and the box-switch Δτ0 steps would remain real findings either way.

**Decision D — E1 baseline:** adopt PSTAR4S, regression-clean (§5), as the E1 baseline replacing PSTAR4, or keep E1 on PSTAR4 and use the correction in E2 only. E2 is built on it either way.

**Not decided, smaller:**
- `vffPassive` (ankle passive-damping feed-forward: +0.5 – 0.8 mm clearance, but worse impact peaks under the current metric);
- the pelvis-motion term (stable formulation would be an architecture step; residual γ ≈ 0.25 without D1, ≈ 0.05 – 0.08 with D1). Not escalated: the residual is small with D1, and no anchored-vs-floating evidence shows it matters for the E2 criteria.

## 13. Local commits (on `prototype/physical-character-v2`; none pushed)

| commit | contents |
|---|---|
| 6c30e64 | estimator correction (vffRate "sr"), conditioning study, srAll refuted, identity |
| b3eaecf | servo prereg amendment S (superseded before any run) + regression scripts |
| 4a2807e | handoff correction (e2reanchorVel), servo-keyed allowance, PSTAR4S E1b / E1a / G0 – G3 regressions, prereg S2 |
| d97862f | e2_eval configuration check for S / H records |
| 9578ccf | pre-swing P\* regression PASS; DECISIONS E2-6 / E2-7 |
| this report's commit | servo S2 results, PG-1 / PG-2, smoke matrix, decomposition, passive-damping counterfactual, report, DECISIONS E2-8 |

## 14. Evidence and documents

| file | contents |
|---|---|
| `VFF_RATE_CORRECTION.md` | defect, mathematics, conditioning, choice, srAll, regressions §8 / §8a |
| `E2_HANDOFF.md` | Decision 2 |
| `SWING_SERVO_VALIDATION_PREREG_AMENDMENT_S2.md`, `SWING_SERVO_VALIDATION_RESULTS_S2.md` | servo re-validation |
| `evidence_vffrate/` | conditioning records and σ bins, lag stage analyses, external lift lin / srAll / sr, smoke counterfactuals, identity |
| `evidence_handoff/` | liftoff traces 5B / 5BS / 5BH, H smokes |
| `evidence_regression_pstar4s/` | `e1close/`, `g/`, `preswing/` |
| `evidence_servo_H/` | 192 runs plus evaluation |
| `evidence_pg_H/` | PG-1 5BH and what-if, PG-2 obligations, apex what-if |
| `evidence_smoke_H/` | 128-run matrix: logs, tracking / clearance / criteria JSON, records subset |
| `evidence_passive_cf/`, `evidence_recovery_diag/` | counterfactual and recovery diagnostics |
| `scripts/` | every battery runner |
