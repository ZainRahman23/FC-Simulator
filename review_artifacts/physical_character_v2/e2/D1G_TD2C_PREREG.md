# D1 guard (D1G) and TD2C: preregistration (freeze step 1, before any D1G or TD2C code)

**Authority:** `../sources/2026-10-07_user_decision_D1guard_TD2C.md` (verbatim).

**Historical record, unchanged:**
- TD2 stays FAIL (`TD2_PREREG.md`, `TD2_RESULTS.md`).
- TD2B stays FAIL under its frozen criteria (`TD2B_PREREG.md`, `TD2B_RESULTS.md`, `evidence_td2b/`, including the earlyOOE counterfactuals).

**Unchanged in this iteration:**
- TD2B's architecture and values (h_B 2.85 mm, D_max 2.75 mm, τ_s 0.210 s, τ_c 0.1499 s, τ_d 0.085 s, continued-search escalation, explicit failure);
- T-1, AB / AB2 as the qualified swing baseline, the execution-feasibility certifier, the 30 mm apex;
- 1A unused, 1B rejected; recovery issue C untouched;
- the 25 % BW contract;
- every threshold, gain and actuator capacity.

Everything is local; nothing is pushed.

**Plan:**
- **Part I:** the D1 guard, a versioned controller correction, and its independent validation (DG).
- **Part II:** TD2C, i.e. TD2B + the guard, with the three-class terrain classification.
- **Part III:** run order, the freeze, stop rules, predictions and disclosures.

---

# Part I. D1 guard

## I.1 The defect being corrected

D1 (`swingAccFF`, `StandController.prototype.swingAccWrench`) computes the swing subtree's inertial wrench by resolved acceleration:
- it solves J_f ẋ = [v − v_p; ω] and J_f ẍ = [a − A; α] − J̇_f ẋ with `solveN` on the 6 × 6 foot-pose Jacobian J_f, at the IK solution x of the swing target;
- with ẋ ∝ 1/σ and ẍ ∝ 1/σ³ near a singularity (σ = σ_min(J_f)), its output diverges as the leg approaches the straight-knee singularity;
- at an unreachable target the IK solution is a least-squares pose, usually at that singularity.

TD2B's earlyOOE runs exposed it: commanded torque up to 2 · 10¹⁸ N·m, energy injection, falls.

**Design evidence, post-hoc diagnostic** (`evidence_d1g_design/conditioning_diag.txt`; 3 TD2B earlyOOE cases at 180 Hz, recording every D1 evaluation):
- With the reachability-only guard (no D1 for an IK residual > 10⁻⁶), the remaining D1 spikes (4.3 · 10⁴, 2.0 · 10⁴, 9.7 · 10³ N·m) all occur at **reached** IK targets (residual ≈ 10⁻¹⁶) whose λ_min(J_fᵀJ_f) is 5.5 · 10⁻⁶ … 3.4 · 10⁻⁵, far below ε² = 10⁻⁴.
- D1 grows continuously as λ_min falls: 25 → 130 → 374 → 4.9 · 10³ → 9.7 · 10³ N·m.
- **Reachability alone is therefore not a sufficient validity rule. Conditioning is required.**

## I.2 Validity rule (general; from the existing machinery, nothing new or tuned)

A D1 evaluation for leg n at tick k is **valid** iff all three hold:

| # | condition | source in the existing machinery |
|---|---|---|
| V1 | **reached:** the swing target's IK residual `r.err` ≤ 10⁻⁶ (the same IK result whose x D1 uses) | "reached" of AB-9 and of `certifyExecution`'s reach item (err ≤ 1e-6) |
| V2 | **conditioned:** λ_min(J_fᵀJ_f) ≥ ε², with ε = `IK.srEps` = 0.01, J_f = the 6 × 6 matrix D1 itself inverts | `certifyExecution`'s conditioning gate λ_min(JᵀJ) ≥ IK.srEps²; `VFF_RATE_CORRECTION.md` §2 (the conditioning study: the one-step rate solve is exact within 4 % above σ_min 0.01, degrades below and fails at the straight-knee singularity). At a reached target J_f equals the IK chain's residual Jacobian, so λ_min is the certifier's own quantity (all six coordinates, since D1 inverts all six). Measured: λ_min(J_f) = the certifier's λ_min to three digits on every reached tick of the diagnostic |
| V3 | **finite:** `swingAccWrench` returned a result (it returns null for non-finite ẋ / ẍ) and every component of every joint wrench is finite | — |

- No obstacle-, terrain-, condition-, body- or leg-specific term: the rule reads only the leg's own IK result and J_f. It is identical for both legs.
- λ_min uses the existing deterministic cyclic-Jacobi `eigMinSym` (IEEE-deterministic).

## I.3 Transition law (continuous; one existing time constant)

**Per leg, a state machine with weight w ∈ [0, 1].** The contribution added to the statics torque is c = w · D (then × (1 − s) exactly as now).

| state | on a valid tick | on an invalid tick |
|---|---|---|
| **PASS** (w = 1; initial) | D = the fresh D1, **unchanged object, unchanged arithmetic** | → FADE: D_held := the last applied D (the previous tick's fresh D1); w −= dt / τ_g; c = w · D_held. With no previous D1 in this engagement → OFF |
| **FADE** | the fade completes regardless (no mid-fade re-entry; avoids a held → fresh switch at w > 0) | w −= dt / τ_g; c = w · D_held; at w ≤ 0 → OFF, c = 0 |
| **OFF** (w = 0) | → RAMP: w = dt / τ_g; c = w · D_fresh | c = 0 (no D1 command) |
| **RAMP** | w += dt / τ_g; c = w · D_fresh; at w ≥ 1 → PASS (c = the fresh D1 unchanged) | → FADE with D_held := the last fresh D1, from the current w |

- **τ_g = the lifecycle's `release` = 0.10 s:** the same continuous-weight ramp E2 already uses for the A / B commanded swing weight c (`dt / lc.o.release`). Not chosen from any result.
- **Ticks without a D1 evaluation** (no swing reference, or the leg not in commanded swing: `ffOn` false): no D1 is commanded, exactly as now. At the next evaluation the guard starts in PASS (the unguarded semantics).

**Properties by construction:**
- (a) On a run with no invalid D1 evaluation, the guard is a pass-through: **bit-identical** to the unguarded controller.
- (b) On guarded ticks |c| ≤ |D_held| per component, where D_held was computed from a valid (reached, conditioned, finite) solve; c = 0 in OFF.
- (c) The guard's own contribution to the per-tick change of c is |Δw| · |D| with |Δw| = dt / τ_g: a ramp whose slope |D| / τ_g is rate-invariant. The switch ticks themselves carry no step: FADE starts from the last applied value, RAMP starts from w = 0.
- (d) τ_g is in seconds: the fade length is ⌈τ_g / dt⌉ ticks at every rate.

**Option:** `d1Guard` (StandController), **default false = bit-identical**. It requires `swingAccFF` and the lifecycle (throws otherwise). λ_min is computed inside `swingAccWrench` only when `d1Guard` is on.

**Configurations** (`gates/v2_e2.js`): PSTAR5CHABG = PSTAR5CHAB + `d1Guard`; PSTAR5CHABTDC = PSTAR5CHABTDB + `d1Guard`.

**Recording** (read-only): per leg and tick, the state, w, validity (V1 / V2 / V3), λ_min, residual, and |D|. Exposed on the controller for the harnesses.

## I.4 Independent validation (DG): all frozen before any DG / TD2C run

The +10 mm counterfactual evidence stays preserved; **it is not used as qualification.** DG-2 below never involves a terrain obstacle.

| # | requirement (user) | test | gate |
|---|---|---|---|
| **DG-0** | default path unchanged | at the implementation commit, guard off: KV0 IDENTICAL; PSTAR5B 99c29491; PSTAR5CH b62309f5; SV-2 3dd9f13d; AB 240 R-F b63184da (`ab_val`, `td2_val`, `td2b_val`); 58 / 58; TD2 records c76cadc7 / 56717579; TD2B records reproduced by `td2b_val` (TDB nominal V2-REF L 240 R-F and TDB earlyOOE V2-198-92 L 480 H-D: end hashes equal to `evidence_td2b`) | all equal |
| **DG-1** | valid / reachable cases equivalent within the intended numerical tolerance (**tolerance: zero, bit-identical**) | guard ON vs the frozen records: **(a)** AB nominal 432 (PSTAR5CHABG in `td2c_val`) vs TD2B's AB records; **(b)** TD2C nominal / earlyC / lateC / beyond / noground 1,824 (PSTAR5CHABTDC) vs TD2B's TDB records; **(c)** SV-2 servo-on half, 438 runs (`swing_servo_val2` with the guard enabled on PSTAR5CH through a configuration wrapper; the frozen tool unchanged) vs `evidence_sv2` logs | every run with **zero invalid D1 evaluations**: end hash identical. Runs with an engagement: listed, and must pass their frozen contract ((a) the AB2 swing contract, B-1's evaluator; (b) the TD2C criteria of their class; (c) every per-run SV-2 item that run passed in the SV-2 battery) |
| **DG-2** | unreachable / singular cases cannot produce unbounded / non-finite commands (**not the obstacle**) | **reach stress set R**, `tools/d1g_val.mjs`, below; guard ON (PSTAR5CHABG) | per run: (i) every commanded τ0, applied τ and body state finite; (ii) over-capacity events 0; (iii) on every guarded tick c = w · D_held per component with w ∈ [0, 1) (FADE) and c = 0 (OFF), to 10⁻⁹ N·m; (iv) commanded \|τ0\| ≤ **B_cmd = 10 × the body's largest isometric axis capacity** (`jointAxisCapacities`; 3.6 N·m/kg × M, hip / knee extension) on every axis, every tick; (v) the stress reached the invalid region (≥ 1 invalid D1 evaluation), else the case is a test defect |
| **DG-3** | symmetric across legs | **(a) controller-level mirror test** (`tools/d1g_unit.mjs`, after `tools/b_ctrl_mirror.mjs`): at every 3rd tick of the swing and hold of the 8 bodies' DG-2 runs (left leg, 240 Hz, all three R conditions), the exact inputs of the left leg's D1 evaluation (body states, frame, target, reference) are mirrored (x → −x) into a mirror instance and evaluated for the right leg. **(b) closed loop**, DG-2: per (body, rate, condition), the L and R runs both engage | (a) validity flag (V1, V2, V3) identical on every sample; \|λ_L − λ_R\| ≤ 10⁻⁶ · max(λ_L, ε²); residual classes equal; mirrored \|D\| per axis equal within 10⁻⁶ relative (+ 10⁻⁶ N·m). Samples with λ within 10⁻⁶ relative of ε², or a residual within 10⁻⁶ relative of 10⁻⁶, are reported, not gated. (b) gated |
| **DG-4** | deterministic across 180 / 240 / 480 Hz | **(a)** same-rate repeats: 24 runs (DG-2 guard ON, 8 bodies × L × 3 rates, deep) repeated; **(b)** rate consistency over DG-2 and the TD2C obstacle class | (a) end hashes and the guard event logs identical; (b) per (body, leg, condition): engaged at one rate ⇔ engaged at all three rates (DG-2 gated; TD2C obstacle class reported); every complete FADE / RAMP lasts exactly ⌈τ_g / dt⌉ ticks (gated). The time of the first invalid evaluation and the OFF duration per rate are reported |
| **DG-5** | no new energy creation | DG-2 guard ON; TD2C in-window / beyond / noground under B-9; TD2C obstacle class under U-1 (Part II) | DG-2: E1a-8 strict (closure ≤ 0.05 J per tick, Σ+ ≤ 0.5 J) on every run |
| **DG-6** | the guard's transitions create no torque / rate discontinuity | every guarded or ramping tick of DG-2 and TD2C | (i) the exact law: \|Δw\| = dt / τ_g (10⁻¹²); c = w · D_held (FADE), c = w · D_fresh (RAMP), to 10⁻⁹ N·m; c on the first FADE tick = (1 − dt / τ_g) × the previous tick's c / w_prev, i.e. no step; (ii) the guard-attributable per-tick change \|Δw\| · \|D\| ≤ **the E1a-7 commanded bound 30 · 240 / hz N·m** on every axis |
| **DG-7** | no regression in AB2, E1 / E1b or qualified E2 swing behaviour | AB2: DG-1(a). E2 swing: DG-1(b) and (c). E1 / E1b: their protocols never supply a swing reference, so D1 (hence the guard) is never evaluated; their runners use configurations without `swingAccFF`. Verified structurally (code path) and by DG-0; the official E2's E1 set re-tests it under the E2 configuration | as DG-0 / DG-1 |

**Reach stress set R** (`tools/d1g_val.mjs`, a versioned copy of `td2b_val`'s timeline, AB swing; DG only):
- Commanded footholds deliberately **beyond leg reach** (the reachability pre-check is evaluated and recorded but not enforced, a stress harness only):
  - **deep:** 0.12 m below the turf;
  - **far:** 0.35 m forward on the turf;
  - **diag:** 0.20 m forward, 0.10 m outward, 0.08 m below.
- The swing foot's turf is removed from the measured liftoff (`diagNoGround`), so there is no contact, no impact and no terrain.
- AB swing (R-F timing: T 0.60 s, apex 30 mm), then the final target is held (zero reference velocity / acceleration) for 1.5 s; the run ends there. No λ return, so the stance keeps the load.
- 8 bodies × 2 legs × 3 rates × 3 conditions × {PSTAR5CHAB guard off (reference, reported), PSTAR5CHABG guard on (gated)} = **288 runs**.
- **Reported:** the guard-off counterparts; E1a-7 on guard-on runs; max \|D_held\|; the largest valid D1 per run; engagement counts and durations; outcome; tracking.

**Adoption rule.** If DG-0 … DG-7 pass, D1G is adopted as a general controller correction:
- `d1Guard: true` in every E2 configuration that uses `swingAccFF` from then on (PSTAR5CHABG, PSTAR5CHABTDC, and the E2 integration);
- the StandController default stays false, so non-E2 paths remain bit-identical.

If any DG item fails: stop and diagnose (TD2C not adopted, no prerequisite gates).

---

# Part II. TD2C

## II.1 Definition

TD2C = TD2B (values, approach, settle, search, escalation, explicit failure, E2 acceptance / hand-back, all unchanged) + D1G. Configuration PSTAR5CHABTDC.

## II.2 Three-class terrain classification (user Decision 2)

The controller cannot see the terrain. The **event** class is decided from the measured contact's phase, on the tick of the swing foot's first measured contact after liftoff, and logged explicitly by the commanding layer (the harness until E2 integration):

| event class | measured condition | contract |
|---|---|---|
| **TOUCHDOWN** (inside the certified possible-contact window) | first contact during the bounded search | full touchdown contract |
| **LATE_TOUCHDOWN** (below the window, within the late-search envelope) | first contact during the escalated search | bounded TD2 search / escalation contract |
| **UNEXPECTED_OBSTACLE** (above the certified early-contact window) | first contact **before the search start** (approach or settling interval), i.e. terrain above the window's early edge, given B-2's premise that in-window terrain is never touched before the search | unexpected-obstacle handling (II.4) |
| **TOUCHDOWN_FAILED** (below the late-search envelope) | no contact by the escalated search's end + 0.3 s | explicit failure (TD2B, unchanged) |

**Battery conditions** (terrain truth; the reachability pre-check sees the planner's foothold, dz 0, for the obstacle conditions):

| condition | terrain vs planned | expected class |
|---|---|---|
| earlyC / nominal / lateC | +0.05 / 0 / −0.05 mm | TOUCHDOWN |
| beyond | −10 mm (S-LATE) | LATE_TOUCHDOWN |
| noground | none (turf off from liftoff) | TOUCHDOWN_FAILED |
| **obs5 / earlyOOE / obs20** | **+5 / +10 / +20 mm** | **UNEXPECTED_OBSTACLE** |

- +10 mm is TD2B's earlyOOE (E2's out-of-envelope magnitude, mirrored).
- +5 and +20 mm are added so that the class is not qualified on one height. They are not chosen from any TD2C result; no TD2C run exists. **No obstacle height is required to meet the touchdown contract** or the 25 % BW bound.

## II.3 Criteria for TOUCHDOWN, LATE_TOUCHDOWN, TOUCHDOWN_FAILED (unchanged from TD2B)

| # | = TD2B | scope |
|---|---|---|
| C-1 … C-10 | B-1 … B-10 exactly, with TD2B's definitions, evaluator logic and frozen B-10 bounds | as in TD2B §5: in-window (nominal, earlyC, lateC), beyond, noground |
| C-6x | (new; classification) every in-window run is classified TOUCHDOWN, every beyond run LATE_TOUCHDOWN, every noground run TOUCHDOWN_FAILED; **no in-window / beyond / noground run is ever classified UNEXPECTED_OBSTACLE** | those conditions |

## II.4 Unexpected-obstacle handling (obs5, earlyOOE, obs20): replaces B-11, and B-9 for these conditions only

| # | requirement (user, minimum) | operational criterion (gated) |
|---|---|---|
| **U-1** | no unexplained / generated energy | (a) **Σ+ ≤ 0.5 J** over the run (E1a-8's cumulative bound). (b) Per-tick closure ≤ +0.05 J on every tick **outside** collision windows. (c) A **collision window** = [a swing-foot contact onset, + 50 ms] (the E2-5 / B-10 impulse window), for every onset after liftoff, with overlapping windows merged. Inside a window, a tick with closure > 0.05 J is admissible **only if the running cumulative closure from the window's first tick stays ≤ +0.05 J at every tick of the window**. That is, positive closure inside a collision may only return energy that the same collision had already removed (unaccounted impact dissipation); the collision never lifts the energy balance above its pre-collision value by more than one tick's E1a-8 tolerance. Anything else counts as generated energy → FAIL. **Reported** for every obstacle run: the strict per-tick E1a-8 verdict, each window's closure profile (impact-tick closure, positive ticks, cumulative maximum and final value) |
| **U-2** | finite, bounded controller commands | (a) every commanded τ0 and applied τ finite; (b) over-capacity events 0; (c) the D1 contribution obeys the guard bound (DG-2 (iii)); (d) commanded \|τ0\| ≤ B_cmd (DG-2 (iv)) on every axis, every tick |
| **U-3** | no numerical instability | every body position / velocity / orientation finite on every tick; every recorded IK residual finite; no commanded \|Δτ0\| > B_cmd in a tick |
| **U-4** | no fabricated support | every entry of the swing foot into TOUCHDOWN, LOAD_ACCEPT or SUPPORT occurs on a tick with measured Jolt contact on that foot (touch > 0); the landed foot reaches SUPPORT only through LOAD_ACCEPT; the harness never declares contact or support |
| **U-5** | physically authoritative collision | ledger `authorityWrites` = 0; external impulse / angular impulse (Jext, Hext) = 0. The collision, its forces and any penetration are Jolt's alone |
| **U-6** | explicit event classification | every obstacle run is classified UNEXPECTED_OBSTACLE on the tick of its first contact (time, φ, phase, contact speed logged); together with C-6x, the classification is exhaustive and exclusive over all conditions |
| **U-7** | safe abort / fall / recovery under E2 §2a semantics | (a) **§2a acceptance:** the contact is accepted only at ≥ 60 % of the swing (earlier contact waits for the gate). (b) Every run has exactly one explicit outcome from the existing classifiers: **RECOVERED** (no supervisor abort, no fall, both feet SUPPORT at the end), **ABORTED** (the supervisor's single-support abort fired: `g3.aborted`, time logged), or **FELL** (the existing fall detector: `g2acc.fallT`). (c) RECOVERED runs satisfy §2a's no-unplanned-support-change: the stance foot SUPPORT on every row from the step command until the landed foot's SUPPORT. (d) U-1 … U-5 hold in every outcome through the end of the run, including after an abort or a fall. **"No abort or fall" is not required** (user decision) |

**Reported, not gated, per obstacle height** (user: "reported rather than hidden"):
- impact: instantaneous peak, exact 10 ms window, 50 ms impulse (% BW / N·s);
- contact speeds (normal and tangential) and φ at contact;
- rebounds and re-entries;
- penetration;
- landed-foot and stance-foot slip;
- E1a-7 applied / commanded continuity (violating runs, worst ratio);
- saturation;
- guard engagements (count, duration, max \|D_held\|);
- outcome distribution;
- tracking at the end.

## II.5 Identity, determinism and completeness

| # | criterion |
|---|---|
| C-G1 | DG-0 |
| C-G2 | DG-1 (a) and (b) |
| C-G3 | all runs present; runtime reachability exclusions identical to TD2B's for in-window / beyond / noground; obstacle exclusions reported |

**TD2C validates iff** C-G1 … C-G3, C-1 … C-10, C-6x and U-1 … U-7 all pass, and DG-0 … DG-7 pass.

## II.6 Matrix

`tools/td2c_val.mjs`: a versioned copy of `tools/td2b_val.mjs` (frozen, unchanged), with:
- `--cfg` ∈ PSTAR5CHABG | PSTAR5CHABTDC;
- the conditions above (obs5, obs20 added);
- the explicit event classification;
- read-only recording of the guard state, contact onsets, the ledger's authority / external terms, per-tick command finiteness and \|τ0\| maxima.

Physics, timeline and commanding are otherwise identical, so DG-1 can compare end hashes.

| block | runs |
|---|---|
| AB nominal, guard (PSTAR5CHABG) | 432 |
| TDC nominal / earlyC / lateC / beyond | 4 × 432 = 1,728 |
| TDC noground (8 × 2 × 3 × {R-F, R-L}) | 96 |
| TDC obs5 / earlyOOE / obs20 | 3 × 432 = 1,296 |
| **TD2C total** | **3,552** |
| DG-2 reach stress | 288 |
| DG-1 (c) SV-2 servo-on with the guard | 438 |
| DG-4 (a) repeats | 24 |

8 bodies × 2 legs × 180 / 240 / 480 Hz × 9 trajectories where applicable.

**Archived records:** 240 Hz V2-REF (left) and V2-198-92 (both legs) of TD2C; all DG-2 runs.

---

# Part III. Order, freeze, stop rules, predictions

## III.1 Order

1. **This document (freeze step 1).** Committed before any D1G / TD2C code.
2. Implement D1G (default off) and the harnesses / evaluators / run lists. DG-0 at that commit. Design-verification smoke (disclosed; no criterion changes; amendments only before the battery and disclosed).
3. **Freeze step 2:** implementation + `tools/d1g_val.mjs`, `tools/d1g_unit.mjs`, `tools/d1g_eval.mjs`, `tools/td2c_val.mjs`, `tools/td2c_eval.mjs`, run lists, runner scripts.
4. DG-2, DG-3, DG-4 (a), DG-1 (c). **If any DG item fails: stop.**
5. The TD2C battery (also supplies DG-1 (a) / (b), DG-4 (b), DG-5, DG-6). Evaluate DG and TD2C.
6. **If both pass**, adopt D1G and proceed autonomously:
   1. E2 integration of TD2C (default-off; identity; non-test smoke);
   2. the swing / servo re-qualification for PG-1 (SV-2's frozen criteria and §6 allowance rule on the final configuration, preregistered as a versioned run, criteria unchanged);
   3. PG-1;
   4. the remaining frozen E2 prerequisites;
   5. the official E2 exactly as preregistered.

   If E2 passes: stop before E3 / repeated walking and report.

**Any substantive failure → stop, diagnose, no tuning.** Mechanical tool defects → erratum and re-evaluation on the same runs.

## III.2 Predictions (before any D1G / TD2C run)

- **DG-1:** no invalid D1 evaluation in AB, in-window, beyond, noground or SV-2 runs, hence every end hash identical. (The commanded / airborne swing's σ_min ≥ 0.03 measured in `VFF_RATE_CORRECTION.md`; the certifier keeps commanded swings at λ_min ≥ ε².)
- **DG-2:** guard-off runs blow up in the command (as in TD2B). Guard-on runs finite and within B_cmd.
- **DG-6 (ii) is the item at risk.** It fails if a last valid D1 exceeds the slope bound × τ_g = 30 · 240 N·m/s × 0.10 s = **720 N·m** (rate-independent). The diagnostic's last-valid values were 130 – 374 N·m. A fast swing reaching the conditioning boundary may exceed it.
- **TD2C in-window / beyond / noground:** identical to TD2B, hence C-1 … C-10 pass as in TD2B.
- **Obstacle class:**
  - the guard engages in many runs;
  - impact far above 25 % BW, rebounds and E1a-7 steps (reported);
  - U-1 (c) is at risk for obs20 (the hardest collision);
  - U-2 (d): the reachability-only counterfactual's largest non-D1 command was 1,389 N·m (V2-198-92), against B_cmd = 3,312 N·m for that body;
  - aborts / falls possible (allowed if classified and bounded).

## III.3 Disclosures (what was known when these criteria were written)

1. **TD2B results, diagnostics and counterfactuals** (`evidence_td2b/`), and the new conditioning diagnostic of I.1 (3 earlyOOE cases; post-hoc, labelled).
2. **U-1 (c) was written after seeing the closure profile of 4 TD2B counterfactual / frozen records** (`evidence_d1g_design/closure_profile.txt`). In the reachability-only counterfactual, per-tick closure +0.05 … +0.08 J appears 1 – 2 ticks after a −0.27 … −0.34 J impact tick, and the cumulative closure from just before contact never rises above its pre-contact value (11 / 24 heavy 180 Hz cases exceed 0.05 J in one tick; Σ+ ≤ 0.36 J in all).
   - **Under a strict per-tick E1a-8 reading those runs fail.**
   - I operationalise the user's "no unexplained / generated energy" as net non-generation within a collision plus strict E1a-8 elsewhere, and report the strict verdict alongside. **The user may reject this reading; the strict verdict will be visible in the results.**
3. **B_cmd (10 × the body's largest isometric capacity) is my engineering threshold** separating saturation-level commands from numerical blow-up, which measured 10⁴ – 10¹⁸ N·m in TD2B. Checked against the counterfactual only to state the prediction above; not adjusted.
4. **The added obstacle heights (+5, +20 mm)** were chosen as a bracket around E2's 10 mm magnitude. No run at those heights exists.
5. **No D1G or TD2C code or run exists at this commit.**

---

# Part IV. Amendments (dated 2026-10-07; before any DG / TD2C battery run, committed with freeze step 2)

## A1. Validity item V4: the execution certifier's torque-feasibility item (a design correction; disclosed)

**Finding (design-verification smoke, before any battery run; `evidence_d1g_design/smoke_A1.txt`):**
- With V1 – V3 only, the TD2B earlyOOE case V2-198-92 L 480 H-D under PSTAR5CHABTDC no longer creates energy (Σ+ 0.12 J; closure ≤ 0.006 J per tick).
- But the guard engaged only when λ_min fell below ε², and by then the **last valid D1 was ≈ 5,000 N·m**: the fade stepped 104 N·m per tick against the E1a-7 commanded bound of 15 N·m, and the command reached 6,715 N·m, above B_cmd.
- Traced (same smoke): over the 8 ticks before engagement, λ_min falls from 1.9 · 10⁻³ to 1.0 · 10⁻⁴ while the IK solution moves at up to 24 rad/s. D1 = 36 → 75 → 220 → 853 → 4,916 N·m.
- The resolved acceleration scales as ≈ |ẋ|²/σ³. **The conditioning gate ε = 0.01 is the rate solve's validity threshold, not D1's**, and a valid-by-V1–V3 D1 is not bounded.
- **I.2's rule as preregistered would therefore predictably fail DG-6 (ii) and U-2 (d).**

**Correction:** add the remaining per-tick item of the same execution-feasibility certifier (`certifyExecution`), whose items for a swing state are reach, conditioning, joint rate (no bound is configured in the qualification) and torque feasibility.

| # | condition | source |
|---|---|---|
| **V4** | **torque-feasible:** for every actuated axis of the leg, \|(gravity of the distal subtree + the D1 wrench) · axis\| ≤ the full-activation capacity at the IK target's anatomical angle and at the reference's coordinate rate max\|ẋ\| (D1's resolved rate), divided by (1 + `ACT.U_MARGIN`) | `certifyExecution`'s torque-feasibility item, the same expressions (gravity −9.81 m/s², `act.capFull`, the knee-angle term of the ankle, U_MARGIN 0.25). Evaluated at the tick's IK solution, frame and reference |
| V1 – V3 | unchanged | |

- **Valid = V1 ∧ V2 ∧ V3 ∧ V4.** The state machine, τ_g and every DG / U criterion are unchanged.
- The certifier admits the qualified swings with ratio ≤ 0.20 (`evidence_exec/sweep.txt`), so V4 has a 5× margin there. Measured in smoke: ratio ≤ 0.14 (nominal), ≤ 0.22 (V2-long-legs 180 Hz H-T45), with no engagement and end hashes identical to TD2B.
- **Consequence:** a held D1 cannot exceed capacity / (1 + U_MARGIN) + gravity. DG-6 (ii)'s 720 N·m limit is then not reachable by any body's capacity (max 3.6 N·m/kg × 92 kg / 1.25 = 265 N·m + gravity).
- **Same smoke with V4:** engagement at the first contact tick (ratio 1.28); held D1 ≤ 92 N·m; guard-attributable step ≤ 3.7 N·m; Σ+ 0.095 J; command ≤ 1,424 N·m (B_cmd 3,312); classified UNEXPECTED_OBSTACLE; RECOVERED.
- **Not a +10 mm special case:** the item is the certifier's own, applied to every D1 evaluation. DG-2's reach stress (no terrain) tests it independently.
- **This amendment was triggered by a smoke run of the obstacle condition.** I judge it a correction toward the user's instruction ("from the existing execution-feasibility / IK machinery"), not a tuning: no number is chosen, and every threshold is the certifier's. The user may judge otherwise. The V1 – V3-only rule's predicted failure is recorded here.

**Implementation** (`ctrl/v2_stand.js`):
- `StandController.prototype.d1Feasible`;
- the actuator layer is passed by the sim (`gates/v2_g2.js`: `ctrl.d1gAct = { act, uMargin: ACT.U_MARGIN }`, only when `d1Guard` is on).

## A2. Operational definitions (tools; no criterion change)

1. **Guard records** (`td2c_val`, `d1g_val`, `d1g_unit`): every non-PASS tick, every tick after one, every invalid tick, each with its preceding tick, carrying:
   - the state, w, V1 – V4, λ_min, residual, the torque ratio, the unscaled source wrench;
   - per swing-leg axis, the applied D1 part `d1x` and the source part `d1src`. These use the same per-axis mapping as the statics feed-forward, including the knee's locked-axis B1 mapping; ledger fields are recorded only with `d1Guard`.
2. **DG-6:**
   - (i) is checked as c = w · src per axis (FADE / RAMP) and c = 0 (OFF), to 10⁻⁹ N·m; FADE's source equals the preceding tick's source; the weight law of §I.3 to 10⁻¹².
   - (ii) uses the per-axis guard-attributable step |Δw| · |d1src|.
3. **Weight rounding floor:** the guard snaps w to 0 / 1 within 10⁻¹² of the end, so a fade / ramp lasts exactly τ_g / dt ticks. "Lasts" = from the first FADE (RAMP) tick to the first OFF (PASS) tick inclusive (DG-4 (b)).
4. **DG-3 (a) D1 comparison:** made on samples where both legs are **valid**. An invalid D1 is never commanded, and at an ill-conditioned solve rounding differences are amplified by construction: smoke, |ΔD| up to 4 · 10¹⁹ N·m on invalid samples vs 6.5 · 10⁻⁸ N·m on valid ones. Flags, λ and residual classes are compared on every sample (except near-threshold samples, which are reported).
5. **DG-1 (c):**
   - the guard count comes from the wrapper (`tools/d1g_wrap.mjs`, which prints the evaluations / invalid count after the frozen tool's own line);
   - engaged SV-2 runs are judged with the frozen SV-2 evaluator (`swing_servo_eval2`) on the guarded records, against `evidence_sv2/sv2_eval.json` (no newly failing item id for that run).
6. **Engaged AB runs (DG-1 (a)):** the AB2 per-run items of B-1's evaluator (AB-2, AB2-4a, AB-4c, AB-5, AB-9, I-1, I-4, I-5, I-7, L-1, L-2). The pooled items are B-1's own on TDC nominal.
7. **U-7 outcome:**
   - ABORTED if the supervisor abort fired;
   - else FELL if the existing fall detector fired;
   - else RECOVERED if both feet SUPPORT at the end;
   - else UNCLASSIFIED (fails).

   §2a acceptance: if a contact was accepted, at ≥ 60 %.
8. **U-1 windows** start at every swing-foot contact-onset tick (touch 0 → > 0) after liftoff. The cumulative closure is summed from the window's first tick.
9. **B_cmd per body** = 10 × max over joints and directions of `jointAxisCapacities(...).Nm`.

## A3. Design-verification smoke (disclosed; `evidence_d1g_design/smoke_A1.txt`)

- **Bit-identical end hashes with the guard on:**
  - AB nominal V2-REF L 240 R-F b63184da;
  - TDC nominal V2-REF L 240 / 180 / 480 R-F (787cc0c9 at 240);
  - TDC beyond V2-REF L 240 R-F; TDC noground V2-REF L 240 R-L 6f0f728f;
  - TDC nominal V2-long-legs L 180 H-T45 d7816939;
  - SV-2 V2-REF L 240 on R-F 3dd9f13d (0 invalid of 181).

  All with zero invalid evaluations.
- **Obstacle runs:**
  - earlyOOE V2-198-92 L 480 H-D, as A1;
  - obs20 V2-REF L 240 R-L: φ 0.757, 287 mm/s, 180 % BW, held D1 ≤ 63 N·m, Σ+ 0.14 J, window cumulative max 0.016 J, RECOVERED.
- **Reach stress V2-REF L 240** (deep / far / diag):
  - **guard off:** command 10¹⁷ – 10²⁰ N·m, closure up to 7.5 J per tick, Σ+ 47 – 87 J;
  - **guard on:** command ≤ 1.96 kN·m (B_cmd 2,808), closure ≤ 0.024 J per tick, **Σ+ 0.39 – 0.41 J** (bound 0.5: **DG-5 is at risk** on heavier bodies or other rates, accrued mainly while the leg is held against its limits), held D1 ≤ 90 N·m.
  - **deep falls with the guard off and on** (the posture's reach-feasibility pelvis lowering). Kept as preregistered; a fall does not exempt a run from DG-2 / DG-5.
- **Mirror test** (V2-REF far): 169 samples, flags identical, λ to 6 · 10⁻⁹ relative, torque ratio to 3 · 10⁻⁹ relative, valid-sample D1 to 6.5 · 10⁻⁸ N·m.
- **DG-0 at the implementation:** KV0 IDENTICAL, 58 / 58, 99c29491, b62309f5, 3dd9f13d, b63184da × 3, c76cadc7, 56717579, TD2B 787cc0c9 and 83369114 (the TD2B earlyOOE blow-up reproduced exactly with the guard off).

## A4. No other change

The criteria of Parts I – II, the conditions, heights, matrix and stop rules are unchanged.
