# E2: pre-official steps — identity, planning gates, smoke. STOPPED before the official run (PG-1 fails)

**Order followed** (`E2_PREREGISTRATION_v2.md`):
1. implement default-off (`E2_IMPLEMENTATION.md`) — done;
2. KV0 / PSTAR4 identity — **pass**;
3. planning certification with the implemented law — **PG-1 FAIL**, PG-2 and PG-3 pass;
4. declared smoke (non-test) — done.

**Not done:** freeze, official stages 1–7. No official E2 run exists.

**Decision rule:** "E2 PASS requires PG-1 … 3". PG-1 fails, so no official stage can pass as frozen. Any fix changes a provisional seed or a frozen criterion, which is the user's decision.

## 1. Identity

All identical (`E2_IMPLEMENTATION.md` §4; `evidence_identity/`):
- KV0;
- PSTAR4 runs;
- PSTAR5 on non-stepping and class-A runs (none, PF, PR, YAW, V2-REF P15).

## 2. Planning gates, implemented planner and law (`evidence_pg/`)

**PG-1 — FAIL. 32 / 32 commanded decisions (8 bodies × L / R × forward / lateral) are NO_CERTIFIED_ONE_STEP.**

| certificate component | nominal foothold, every body / side |
|---|---|
| timed capture (2-D, measured margins) | certified (slack ≥ 0.5 s: the stance foot alone captures) |
| plan VRP inside the realisable region | certified |
| body-certified reach | certified: forward 35 / 35 nodes; lateral 30 / 35 (29 short-legs, 35 long-legs), as the offline audit |
| swing path (11 IK samples) | certified |
| **clearance (swept boot geometry − bandwidth envelope ≥ 5 mm for φ ∈ [0.2, 0.8])** | **fails at every node: margin 3.0 mm (forward) / 3.2 mm (lateral) at φ = 0.20; envelope 3.1 / 2.9 mm** |

- **Cause:** with the frozen seeds (T = 0.60 s, apex 25 mm at α = 0.5), the reference sole is only 6.0 mm above the turf at φ = 0.20.
- **Planning-only check:** the certificate would pass at φ = 0.20 only with an apex of about 40 mm or more (35 mm gives 4.3 mm; 50 mm gives 6.2 mm), or with the window starting at φ ≈ 0.23 for 25 mm.

**PG-2 — 4 / 4 obligations CERTIFIED_ONE_STEP:**

| obligation | foothold (anchor frame) | T | T_r | slack |
|---|---|---|---|---|
| O-1 V2-165-62 L 240 Hz | 4 cm out, 1 cm back | 0.2066 s | 0.10 s | 14.2 ms |
| O-2 R 240 Hz | same | 0.2066 s | 0.10 s | 14.2 ms |
| O-3 L 180 Hz | same | 0.2072 s | 0.10 s | 12.2 ms |
| O-4 L 480 Hz | same | 0.2056 s | 0.10 s | 15.1 ms |

- Same foothold and timing as the planning-only audit.
- The slack is 12–15 ms here versus 53–64 ms in the audit. The audit's 1-D model had no final transition. With the implemented R3 (0.6 s Hermite to the new midpoint) the binding constraint for delays beyond the slack is the R3 plan VRP leaving the realisable region, not capture: the DCM itself is captured with far more margin.

**PG-3 — pass:** every chosen recovery foothold and path is certified online.

## 3. Smoke (non-test; physical, Jolt-authoritative)

### SMK-1D — V2-REF, left swing, 0.07 m forward (clearance certificate logged, not enforced)

14 / 16 criteria pass. (SMK-1, with the certificate enforced, is NO_CERTIFIED: no step, return to double support, stood.)

| item | measured |
|---|---|
| liftoff / touchdown | measured LIFTOFF → AIRBORNE +0.117 s (φ 0.19); TOUCHDOWN at φ 0.99 (−4 ms vs plan); one LOAD_ACCEPT (+1.25 s, when the request reached wantShare); SUPPORT after 0.229 s (T_r 0.225) |
| placement | 2.8 mm / 0.09° at the first SUPPORT tick; final step 7.27 × −0.06 cm vs 7.00 × 0 |
| stance foot | peak 0.017 mm, path 0.056 mm, yaw 0.004° |
| balance | ξ margin ≥ 4.2 cm in the swing |
| DCM prediction error | 1.2 mm at touchdown, 2.5 mm at LOAD_ACCEPT, 0.4 mm at the end |
| impact | 10.2 % BW; no rebound; no chatter |
| torque continuity | max 2.9 N·m applied |
| saturation | none |
| E2-17 | VRP and p* never outside the support |
| final state | |ξ − terminal| 0.4 mm; pelvis yaw 0.04° |
| **E2-3 FAIL** | tracking max 11.6 mm / RMS 7.4 mm (limits 10 / 5); clearance 1.1 mm at φ 0.20 (limit 5) |
| **E2-5 FAIL** | horizontal approach 0.064 m/s (limit 0.05, provisional) |

**Mechanism:**
1. **The foot cannot follow the reference while it is still touching.** For 0–0.108 s after the command it is unloaded but in contact: contact-mode gains, with the frame height at min(target, actual). The reference has already risen 5.6 mm and moved forward when the foot leaves the turf at φ 0.19, so the error at liftoff is 6.3 mm. During the airborne-weight blend the 4 Hz swing servo catches up and overshoots: the foot runs up to 6 mm high and ahead during the descent, and is still returning at contact (0.064 m/s).
2. **Clearance at φ 0.20 is about 1 mm because liftoff itself happens at φ 0.19.** The measured clearance first reaches 5 mm at φ 0.34. On 20–80 % of the *airborne* phase instead, the minimum would be 7.0 mm.
3. **Tracking with the servo fully engaged** (airborne weight a = 1) is still max 10.9 mm / RMS 6.6 mm.

### SMK-R — V2-165-62, right lift, P15 at 180 Hz (recovery path)

- Class decision "step required" → CERTIFIED_ONE_STEP (4 cm out, 1 cm back, T 0.207 s, T_r 0.10 s, slack 12.2 ms).
- **Recovered by stepping:** landed 6.2 mm from the certified foothold; one TOUCHDOWN, LOAD_ACCEPT after sustained contact (50 ms), SUPPORT after 0.100 s; bilateral 0.39 s after the abort; DONE.
- R-1, R-3, R-6 pass. R-2, R-4, R-5 fail.

| item | measured |
|---|---|
| **R-2 FAIL** | the old stance foot lifted (SUPPORT → LIFTOFF → AIRBORNE → TOUCHDOWN → re-accepted); peak 4.0 mm |
| **R-4 FAIL** | impact 55 % BW (limit 25 %); horizontal approach 0.19 m/s (limit 0.05) |
| **R-5 FAIL** | 14.8 N·m torque step (old-stance hip) at its re-acceptance; p* outside the support > 5 mm for 194 ms (limit 20 ms) |
| prediction error | 19.1 / 2.9 / 0.5 mm (within 30 / 30 / 15) |
| saturation | longest 44 ms (within 50) |

**Mechanism:**
1. **Faster divergence than the LIPM plan (p* outside the support).** With the CoP held at the stance limit, the measured DCM diverged faster than the plan from the decision onward: 68 mm vs 48 mm at contact. The 15 N·s push leaves centroidal angular momentum and vertical COM motion (4.6 kg·m²/s, −0.057 m/s) that the LIPM ignores (`research/E2_TIMING_LOAD_ASSUMPTIONS.md` §1). So p* = ξ + kξ(ξ − ξ_ref) − ξ̇_ref/ω ran past the support and was clamped.
2. **Old stance foot unloaded (R-2, then R-5's torque step).** After contact the plan's VRP sits at the landed side's achievable limit. With T-A's floor rule (0 → 10 % over 0.6 s) the old stance foot is commanded only 3–5 % of the load and lifts off. This is the risk recorded in design §7.6: no stance-unloading / friction limit in the planning model.
3. **Impact and approach speed (R-4).** The 0.207 s swing is beyond the 4 Hz swing servo's tracking bandwidth (bound about 10 mm for this move), so the foot lags and then arrives fast: 0.19 m/s horizontal, 55 % BW.

### W
Browser = Node for SMK-1 and SMK-R, including the complete recovery-step path (`smoke/W_smoke_browser.json`).

## 4. Classification

| finding | class | what a fix would change |
|---|---|---|
| PG-1 / E2-3 clearance at φ 0.20 | **bad preregistered assumption.** The 20 % window start conflicts with the provisional seeds and with the measured liftoff timing (φ ≈ 0.19 here; E1b's profile 0.26), which was already known at preregistration | a criterion (window base or start) or a provisional seed |
| E2-3 tracking 10 mm / 5 mm RMS; E2-5 tangential 0.05 m/s | **model / plant deficiency of the swing at the frozen seeds:** contact-held liftoff plus 4 Hz servo catch-up / overshoot | criteria, or the trajectory design (e.g. vertical-first lift), or the swing servo (a physical / controller parameter) |
| R-2 old-stance lift-off | **model deficiency** (planning model lacks stance unloading / friction) | architecture: the recovery's load plan / floor |
| R-4 impact and speed | **plant / model:** the 0.2 s recovery swing exceeds the swing servo bandwidth | architecture or parameters (swing time bound, servo) |
| R-5 p* outside / torque step | **model deficiency** (LIPM ignores post-push angular momentum and vertical COM motion), plus R-2's re-acceptance | architecture (an angular-momentum-aware capture model), or the criterion |

**None of these is an implementation defect.** Implementation defects found during development and smoke were corrected before any official run (`E2_IMPLEMENTATION.md` §3).

## 5. What I need decided (nothing applied)

**A. Commanded-step clearance (blocks every commanded step via PG-1):**
- (A1) Measure E2-3 / E2-5 / §2a swing fractions on the airborne phase (measured liftoff → touchdown), consistent with the design's own horizon term "remaining liftoff delay + swing T". The planner's certificate would then use a predicted liftoff, from the measured smoke liftoff delay (0.117 s). On SMK-1D: clearance 7.0 mm.
- (A2) Raise the provisional apex seed (≥ about 40 mm for the planning certificate). Physically this alone does not fix E2-3 at φ 0.20, because liftoff occurs at φ 0.19.
- (A3) Start the window later (e.g. φ ≥ 0.35).

**B. Swing tracking / approach (E2-3, E2-5)**, independent of A. A1 does not fix the tracking max (10.9 mm with the servo fully engaged).
- (B1) A vertical-first lift: the xy quintic and apex re-planned from the measured liftoff, which is the design's "remaining liftoff delay + swing T" structure. This is a trajectory design change.
- (B2) Revise the thresholds (10 → e.g. 15 mm max, 5 → 8 mm RMS; tangential 0.05 → 0.10 m/s).
- (B3) Leave them, and accept E2-3 / E2-5 failures as the result.

**C. Recovery (R-2, R-4, R-5) — architectural:**
- the old stance foot's floor during the recovery transfer (e.g. keep ≥ 10 % until full support), re-certified with the planner;
- a lower bound on the recovery swing time from servo bandwidth (fewer impacts, less slack);
- whether E2-17's p* clause should apply to recovery steps, where the plant diverges beyond the LIPM plan by construction.

**My recommendation:**
- A1 + B1 for commanded steps. Both follow the design's own timing chain and keep every threshold.
- Defer C until the commanded step passes. C is a genuine architecture question for capture-aware recovery (stance unloading, angular momentum), and the four obligations should not drive commanded-step changes.
