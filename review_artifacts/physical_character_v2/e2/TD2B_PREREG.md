# TD2B: next TD2 iteration (certified possible-contact window, search-preserving escalation, physics-rate invariance): PREREGISTRATION

**Authority:** `../sources/2026-10-07_user_decision_TD2_next_iteration.md` (verbatim).

**Preserved permanently as FAIL, not reinterpreted:** `TD2_PREREG.md` (d14d34f [published as 3bb6752] / 5015dc6 [published as d285f10]), `TD2_RESULTS.md`, `evidence_td2/` (1,824 runs). This includes TD-10 (≤ 10 ms touchdown time) and its failure. TD2's frozen harness and module behaviour stay reproducible: `ctrl/v2_td2.js` keeps its TD2 constants as defaults, and TD2B is passed explicitly.

**Unchanged:**
- the normal TD2 architecture: validated AB swing → raised terminal approach → settle → bounded terrain-normal search → measured Jolt contact → E2 acceptance / hand-back → lifecycle contact hold / load acceptance;
- the 30 mm apex; AB / AB2;
- 1A unused, 1B rejected;
- the execution-feasibility certifier;
- the 25 % BW engineering contract;
- every threshold, capacity and gain; T-1; recovery issue C.

**Frozen in two steps:**
1. This document is committed before any TD2B code.
2. Before any battery run: the implementation (default-off, configuration `PSTAR5CHABTDB`, `e2td: "search2"`), `tools/td2b_val.mjs`, `tools/td2b_eval.mjs`, `TD2B_RUN_LIST.json`, `scripts/run_td2b_val.sh`. Smoke results and forced details are disclosed in §9.

**Derivation script and output:** `evidence_td2b_design/td2b_derivation.mjs`, `td2b_derivation.json`.

**Inputs, pre-existing design-stage evidence only:**
- TD2's turf-off qualification of the amended timeline (432 cases; the motion before contact is bit-identical to the turf-on run);
- the FB battery's AB records;
- the E2 / E1a tolerances;
- the timestep.

**Disclosure:** I have seen TD2's battery results, including the per-rate maxima and the 18.8 ms touchdown-time spread in `TD2_RESULTS.md`. None of them enters any value below.

## 1. Decision 1: the certified possible-contact window

**Contact geometry:** a sole point counts as touching at ≤ d_c = 0.5 mm separation (the probe's manifold rule). The potential-contact points are the hull points within the window of the lowest point.

**Qualified tracking uncertainty** of the terminal approach (approach end + settling dwell; qualification iii, all bodies / legs / rates / trajectories):
- downward u_dn = 2.265 mm;
- upward u_up = 0.311 mm.

**Terrain-height uncertainty:** Δ_T = 0.05 mm (resting lowest-point spread on Touchline's flat turf, 0.012 mm, rounded up to the 0.05 mm step).

**Window**, in terms of the commanded reference's lowest boot point above the planned turf. Contact is possible when ref_low ≤ d_c + δ_T + dev, with dev ∈ [−u_up, u_dn] and δ_T ∈ [−Δ_T, Δ_T]:
- earliest ref_low = d_c + Δ_T + u_dn = 2.815 mm;
- latest ref_low = d_c − Δ_T − u_up = 0.139 mm.

**Contact-safe regime** = the bounded search: after the approach (tangential and orientation complete at T) and after the tangential-settling interval. The band top lies at or above the window's earliest edge, so no certified contact can occur before the search.

**Parameters** (same rules as TD2 A2; Δ_T now enters the band explicitly):

| parameter | value |
|---|---|
| h_B | ⌈2.815⌉ = **2.85 mm** |
| D_max | ⌈2.85 − 0.139⌉ = **2.75 mm** (search end 0.10 mm above the foothold) |
| τ_s | **0.210 s**; peak 24.55 mm/s. Binding: the E2-5 impact bound 1.875 · D / 24.8 mm/s = 0.208 s |
| τ_c | **0.1499 s** |
| τ_d | **0.085 s** (qualified, unchanged) |
| planned touchdown | T + 0.2349 s |

This differs from TD2's normal architecture only by the band (+0.05 mm, Δ_T), the depth (+0.05 mm) and τ_s (+5 ms).

**Terrain conditions:**

| condition | terrain | commanded foothold dz | class |
|---|---|---|---|
| **earlyC** (certified early) | +Δ_T = 0.05 mm higher than planned | −0.05 mm | inside the window |
| **nominal** | 0 | 0 | inside the window |
| **lateC** (certified late) | −Δ_T = 0.05 mm lower | +0.05 mm | inside the window |
| **earlyOOE** | 10 mm higher | −10 mm | out of envelope. 10 mm is E2's own out-of-envelope terrain magnitude (S-LATE), mirrored. Not chosen from TD2's offsets. The reachability pre-check sees the planner's foothold (dz 0); the planner does not know the terrain |
| **beyond** | 10 mm lower | +10 mm | E2's S-LATE: the planner's turf is the real turf |
| **noground** | none: the swing foot's turf is removed from the measured liftoff (`cfg.diagNoGround`, a deep hole); commanded foothold +10 mm | +10 mm | out of envelope: explicit touchdown failure |

**Semantics:**
- **Inside the window:** every touchdown criterion is gated.
- **earlyOOE** is classified and tested with **E2 §2a handling semantics**: early contact is not accepted before the 60 % gate (or certification); no fall; no unplanned support change; outcome reported per case. Its touchdown quality and E1a-7 are **reported, not gated**.

  The official E2 applies its own §2 criteria to its own S-LOW / S-LATE probes; that is unaffected.

## 2. Decision 2: escalation that preserves the search invariants

**Rule (versioned):**
1. Normal search exhausted.
2. E2's late hold: until the planned touchdown + 0.3 s (frozen E2 rule).
3. **Failed touchdown** (E2 semantics: re-plan from the measured state, footholds on the planner's turf, dz 0).
4. **The bounded search continues:**
   - from the current reference (at rest at the first search end);
   - normal coordinate only, tangential target and landing orientation held;
   - down to the planner's turf window's late edge, the planner's foothold + (h_B − D_max) = +0.10 mm;
   - a rest-to-rest quintic of depth D_e with the **normal search's peak speed**: τ_e = ⌈1.875 · D_e / v_peak⌉ (5 ms).
5. Measured contact → E2's acceptance / hand-back from the current reference state (as normal).
6. No contact by the escalated search's end + 0.3 s → **explicit touchdown failure (out of envelope)**:
   - the target is held at the search end;
   - no further descent; no contact or support is declared;
   - the stance keeps the load (no λ transfer);
   - the run ends 2 s later.
7. If D_e ≤ 0 (the commanded foothold is already at the planner's turf), step 4 is skipped: explicit failure at step 3.

The previous E2-style T_min drop (≈ 13 mm in ≈ 0.1 s) is **not retained**.

**Offline reachability** (`td2b_derivation.json`, before implementation):
- E2's S-LATE envelope D_e = 10 mm → τ_e = 0.765 s; peak 24.5 mm/s, 0.099 m/s², 1.34 m/s³. All inside the validated late-descent envelope (0.217 m/s, 2.63 m/s², 49.5 m/s³).
- The deepest pose is the planner's own certified foothold + 0.10 mm, whose reach is certified at dz 0.
- Time to an explicit failure: T + 1.60 s, in quasi-static single support.
- **The required beyond-terrain envelope (S-LATE) is reachable under the search invariants.** Terrain below the planner's turf (noground) is **not** reachable, and is classified as an explicit touchdown failure.

## 3. Decision 3: physics-rate invariance (replaces TD-10; TD2's ≤ 10 ms and its failure stay historical)

For every (body, leg, trajectory, condition) with a contact (earlyC, nominal, lateC, beyond), each quantity Q is compared at 180 and 480 Hz with 240 Hz: |Q(hz) − Q(240)| ≤ B.

Each B is derived (`td2b_derivation.json`) from:
- (i) existing physical tolerances;
- (ii) timestep discretisation (dt_max = 1/180 s);
- (iii) qualified tracking uncertainty.

| quantity (at the last contact-free tick unless stated) | B | derivation |
|---|---|---|
| potential-contact normal speed | **30.78 mm/s** | search-reference speed change for a contact-height shift equal to the qualified cross-rate deviation range (1.16 mm) anywhere in the window + the qualified cross-rate range of (actual − reference) descent speed (4.58 mm/s) + one tick of search acceleration |
| tangential speed (potential-contact points, and foot horizontal) | **62.53 mm/s** | both magnitudes lie in [0, the qualified search-phase envelope] |
| placement (foot origin at first SUPPORT vs foothold) | **3.0 mm** | E2-15's physical-convergence tolerance (frozen) |
| orientation: tilt error | **0.339°** | qualified search-phase envelope |
| angular speed | **0.2268 rad/s** | qualified search-phase envelope |
| yaw at first SUPPORT | **2.0°** | E2-4 tolerance |
| 10 ms impulse-derived load (max exact 10 ms window in [t1, t1 + 100 ms]) | **0.2761 BW** | AB sensitivity 4.456 BW per m/s × the speed bound + one tick's impulse allocation of a contract-bounded (0.25 BW) peak |
| cumulative impulse (first 50 ms) | **1.742 N·s + 0.25 · BW · dt_max** | AB sensitivity 56.6 N·s per m/s × the speed bound + one tick of a contract-bounded peak |
| penetration | **2.0 mm** | E2-5 tolerance |
| rebound | **equal** (absolute: none) | E2-5 |
| landed-foot slip, t1 → SUPPORT | **3.0 mm** | E2-15 tolerance |
| torque / rate continuity | E1a-7 at every rate (rate-scaled) | E2-9 / E2-15 |
| time from measured contact to effective support (first SUPPORT) | **0.1267 s** | the hand-back lasts max(remaining search time, accept) ∈ [accept, τ_s], so a spread ≤ τ_s − accept = 0.110 s, plus 3 debounce / ramp threshold crossings × dt_max |

**Reported diagnostically:** touchdown time (search-start relative) per rate and its cross-rate spread.

## 4. Matrix and harness

**`tools/td2b_val.mjs`:** a versioned copy of `tools/td2_val.mjs` (the same AB2 / SV-2 timeline), with the TD2B parameters, conditions and escalation above. For noground and for an explicit failure, the λ return is not started.

**Configurations:** PSTAR5CHAB (AB, nominal) and PSTAR5CHABTDB.

| block | runs |
|---|---|
| AB nominal | 432 |
| TDB nominal / earlyC / lateC / earlyOOE / beyond (432 each) | 2,160 |
| TDB noground (8 × 2 × 3 × {R-F, R-L}) | 96 |
| **total** | **2,688** |

8 bodies × 2 legs × 180 / 240 / 480 Hz × 9 trajectories.

**Archived records:** 240 Hz V2-REF (left) and V2-198-92 (both legs).

## 5. Criteria (TD2B validates iff all pass)

**Definitions** as in `TD2_PREREG.md` §3, with:
- the search start = liftoff + T + τ_d;
- the PCI = [min(search start, t_nc), first SUPPORT).

**Identity, determinism, regressions:**

| # | criterion |
|---|---|
| B-G1 | KV0 IDENTICAL; PSTAR5B 99c29491; PSTAR5CH b62309f5; SV-2 3dd9f13d; AB 240 R-F b63184da (`ab_val`, `td2_val`, `td2b_val`); component regressions 58 / 58; **TD2 regression:** `tools/td2_val.mjs` reproduces TD2-battery records (TD nominal V2-REF L 240 R-F and TD late V2-198-92 R 480 H-D: end hashes equal to `evidence_td2`) |
| B-G2 | AB nominal end hashes equal to the FB battery's (432 / 432) |
| B-G3 | all 2,688 runs present; runtime reachability exclusions identical to AB's for the in-window conditions and beyond (earlyOOE / noground exclusions reported) |

**The swing contract and the coordinator:**

| # | criterion | scope |
|---|---|---|
| B-1 | the AB2 swing contract on TDB nominal (as TD-1) | |
| B-2 | design premise: first touch at or after the search start | nominal, earlyC, lateC |
| B-3 | potential-contact downward speed ≤ 1.875 · D / τ_s + 37.5 = 62.1 mm/s; E2-5 foot downward ≤ 0.15 m/s and horizontal ≤ 0.05 m/s | nominal, earlyC, lateC, beyond |
| B-4 | exactly one TOUCHDOWN; no rebound; no re-entry < 60 ms; impact (instantaneous, 100 ms) ≤ 25 % BW; penetration ≥ −2 mm | nominal, earlyC, lateC, beyond |
| B-5 | zero E1a-7 violations over the whole run | nominal, earlyC, lateC, beyond, noground |
| B-6 | LOAD_ACCEPT once; LA → SUPPORT ≤ accept + 0.1 s; no abort; both SUPPORT at the end | nominal, earlyC, lateC, beyond |
| B-7 | placement ≤ 10 mm, yaw ≤ 2° (E2-4) | nominal, earlyC, lateC, beyond |
| B-8 | the commanded reference never below the active search floor before contact (the first search floor, or after escalation the planner's foothold + 0.10 mm) | all TDB |
| B-8a | **beyond:** the escalation occurs; contact only in the escalated search | beyond |
| B-8b | **noground:** no swing-foot TOUCHDOWN at any time; escalated search run to its floor; explicit failure declared; no abort; the stance foot SUPPORT on every row from the step command; the swing foot never SUPPORT | noground |
| B-9 | energy E1a-8; over-capacity 0; saturation ≤ 5 % / ≤ 50 ms (R / C) | all |
| B-10 | **physics-rate invariance:** every bound of §3, every pair 180 / 480 vs 240 Hz | earlyC, nominal, lateC, beyond |
| B-11 | **earlyOOE handling (E2 §2a):** contact accepted only at ≥ 60 % of the swing (or certified); no fall / abort; no unplanned support change (the stance foot SUPPORT on every row from the step command until the landed foot's SUPPORT; the landed foot reaches SUPPORT only through LOAD_ACCEPT); both SUPPORT at the end | earlyOOE |

**Reported, not gated:**
- earlyOOE touchdown quality and E1a-7;
- touchdown time per rate;
- every TD2 report item (contact speeds, impact forms, impulses, slip, deviation in the new region, phases);
- the escalation's timing and contact speeds.

## 6. Stop rules

Any failure → stop, diagnose, no tuning.

**If TD2B validates**, proceed autonomously:
1. the E2 sequencer / planner integration of TD2B (default-off; identity; non-test smoke);
2. the swing / servo re-qualification needed for the PG-1 clearance allowance: SV-2's frozen criteria (§§1 – 5) and §6 allowance rule on PSTAR5CHABTDB, preregistered as a versioned run with its criteria unchanged;
3. PG-1;
4. the remaining frozen E2 prerequisites;
5. the official E2 exactly as preregistered.

If E2 passes: stop before repeated stepping / E3.

## 7. Known before freezing

- TD2's results and diagnostics (`TD2_RESULTS.md`).
- The derivations above.
- No TD2B run exists at this commit.

## 8. E2 integration

As in TD2 (A4): implemented from this design only after TD2B validates, with identity checks, before any PG-1 / E2 run.

## 9. Amendments (dated 2026-10-07; before any battery run, committed with the freeze)

**A1. Evaluator scope of B-8.**
- The search-floor bound applies to the **search phases** (first search, escalated search), as §5 states ("the active search floor").
- The first evaluator version also applied it to approach rows. In beyond / noground the commanded foothold is 10 mm up, so the early swing lies below that floor; the result was a false flag in smoke.
- Corrected before the freeze.

**A2. Design-verification smoke** (11 runs, V2-REF L 240 R-F in every condition, plus V2-long-legs L 180 H-T45 nominal, V2-198-92 L 180 R-L beyond, V2-198-92 L 480 H-D earlyOOE and R-L noground; disclosed):
- **AB:** b63184da.
- **nominal / earlyC / lateC:** contact 143 – 153 ms into the search at 23 – 31 mm/s; impact 4.6 – 5.8 % BW; 0 E1a-7 violations.
- **beyond:** escalation, then contact in the escalated search at ≈ 9 mm/s; impact 2 – 3 % BW; 0 violations.
- **noground:** no contact, explicit failure, stance held, 0 violations.
- **earlyOOE:** contact in the approach at 175 mm/s; impact 73 % (V2-REF) and 237 % BW (V2-198-92 480 H-D); rebound.

  **V2-198-92 L 480 H-D earlyOOE blew up** (B-9: closure 0.23 J / tick, Σ+ 0.73 J; commanded Δτ0 up to ≈ 10¹⁴ N·m, applied ≤ 227 N·m; foot slid 22 cm). The mechanism:
  1. E2's existing hand-back starts from the fast-descending approach reference and overshoots ≈ 3.8 mm below the landed anchor.
  2. On this near-reach diagonal step the IK target becomes unreachable (residual up to 6.5 · 10⁻³).
  3. The resolved-acceleration feed-forward (D1) and the rate terms are evaluated at the straight-knee singularity and explode in the command; the actuators clamp the applied torque.

  This is a pre-existing controller robustness defect, exposed only by out-of-envelope early terrain.

- **The preregistration is not changed:** B-9 stays gated on every run. **Prediction:** B-9 may fail for some earlyOOE cases (heavy bodies, near-reach steps), and the stop rule then applies.

**A3.** No other change. TD2's regression is reproduced exactly with the parameterised module: TD nominal V2-REF L 240 R-F c76cadc7; TD late V2-198-92 R 480 H-D 56717579.

