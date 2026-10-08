# CF-6 walking-gait counterfactual — PREREGISTRATION (FROZEN before any CF-6 code or run)

**Status:** frozen at the commit that adds this file. No CF-6 implementation code and no CF-6 run existed at freezing.
- Any later change is a recorded amendment (§11), never a silent edit.
- Diagnostic / counterfactual only: not adopted, not production walking. TD2C / E2 untouched. No running.

**Sources (verbatim, `../../sources/`):**
- `2026-10-08_user_instruction_cf6_walking_gait.md` (the CF-6 protocol);
- `2026-10-08_user_decision_cf6_option_a.md` (decision (a) + (c), no (b));
- `2026-10-08_cf6_human_walking_calibration_pack.md` (the external research package, "the pack");
- `2026-10-08_user_instruction_cf6_resume_with_research.md` (incorporate, ladder, freeze, implement, run).

## 1. Question

Is CF-5's slow stepping a limit of V2's physical character, or only the absence of walking-specific gait mechanisms? How far toward the human walking regime can the unchanged V2 body climb once the permitted mechanisms exist?

## 2. Mechanisms added (the only changes; harness only, `tools/loco_probe.mjs --cf=6`, default off)

CF-6 runs its own **walking sequencer** in the harness for CF-6 steps; the E2 StepSequencer and planner are not used for them. It drives the unchanged controller only through its existing interfaces:
- the swing target + analytic reference (`lc.setSwingTarget`, `swingRef`, exactly as E2's `setTarget`);
- the request fields (λ, ξ_ref, ξ̇_ref);
- the lifecycle's measured events.

**M1 — Walking-aware capture / foothold planning:**
- **Periodic DCM plan.** CF-5's closed form, the LIPM with the VRP at the stance centroid in single support:
  - σx = s / ((E − 1) + T_d·ω·(E + 1)/2), σy = W0 / ((E + 1) + T_d·ω·(E − 1)/2);
  - E = (1 + ω·dt)^N over T_s = release lag + T_SS, with release lag = lifecycle debounce + release ramp = 0.1125 s;
  - T_d = the transfer duration (§4).
  - The DS end state handed to CF-4's unchanged transfer is ξ_E = c + σx·ŵ + σy·û, ξ̇_E = ω(ξ_E − c).
- **Swing terminal state, ankle first** (CF-5 rule):
  - at the swing decision, one constant VRP r = (ξ_T − E_τ·ξ0)/(1 − E_τ), clamped into the stance region (inset by PLAN_MARGINS.copSS), steers the measured DCM ξ0 to the periodic touchdown state ξ_T = c + σx·E·ŵ + σy·E·û over the planned single support (E_τ over T_SS).
  - The touchdown DCM the clamped r actually achieves moves the foothold forward by whatever the stance foot could not absorb.
  - No tuned gain: the propagation is the LIPM's own explicit-Euler growth.
- **Foothold.** The planned step is c_stance + s·ŵ at CF-3's ± W0/2, plus that ankle-first residual. It must pass the walking feasibility checks:
  - (i) the bounded leg IK (soft box + CF-2 coupled ankle law; the planner's `ikFeasible`) reaches a flat foot at the foothold from the predicted touchdown pelvis. The pelvis is predicted from the current pelvis plus the LIPM-predicted COM displacement under r, at the posture height and orientation;
  - (ii) `landingValid`: no overlap with the stance foot, gap ≥ FS.gapMin = 10 mm, no crossover.
  - An infeasible foothold is pulled back along ŵ on a 1-cm grid to the nearest feasible one.
  - If none exists in (0, s_max], the step is a **CF-6 planner refusal** (recorded, not a physical failure).
- **No stop-step certificate.** Nothing requires that the body could stop on the step. E2's 0.07 – 0.13 m corridor and E2's PD-only swing-time bound T_min(d) are not used. Tracking and clearance are measured physically.
- **Heading and width:**
  - CF-3's walking frame (direction = bisector of the two feet's initial headings, origin = the initial feet midpoint) with width W0 = each body's own initial separation;
  - **landing yaw = walking-frame yaw + that foot's own initial toe-out** (its initial heading minus the bisector). E2's `candPose` instead kept the anchor's yaw, the source of CF-3 – CF-5's toe-out creep.

**M2 — Explicit unloading (CF-4 mechanism):**
- At the accepted touchdown, CF-4's Hermite transfer runs from the measured DCM to ξ_E over T_d. λ follows its VRP with floor 0, so the trailing foot's planned share reaches 0.
- After it, the commanded CoP is placed on the new stance centroid (ξ_ref = ξ, ξ̇_ref = ω(ξ − c)) until the unchanged lifecycle releases the trailing foot (measured Fz < 1 % BW, its debounce and ramp). The swing is commanded at that measured release.
- **Push-off is not added.** Heel rise / toe rotation may emerge physically on the existing rigid foot and its 10 contact pieces; it is measured (§6), never prescribed (user decision (c)). A push-off mechanism would need an amendment and the user's decision.

**M3 — Walking swing-leg trajectory:**
- **Path:** one existing `stepSegment` (`ctrl/v2_swing.js`) from the released foot's anchor pose (at rest) to the foothold pose, over T_SS from the swing command.
- **Apex knot** at T_SS / 2, height max(anchor, landing) + 0.030 m (Touchline E2 apex decision, `sources/2026-10-06_user_decision_e2_apex30.md`).
- **Landing pose:** flat (the anchor's turf pitch / roll) with M1's heading yaw.
- **Knee flexion, foot clearance and toe departure** come only from the existing bounded swing IK and servo (swingAccFF analytic reference, DVG, CF-2). No vertical-only lift phase.
- **Acceptance:** E2's rule. The first measured contact at ≥ 60 % of T_SS is accepted. Earlier contact is not accepted (target held).
- **Late contact:** the foothold is held ≤ 0.3 s past the planned touchdown, then **failed touchdown** (no re-plan in CF-6).
- **Hand-back** as E2: re-target to the landed pose over max(remaining, lifecycle accept), cleared at a = 0.

**Start-up:** the first transfer from quiet stance uses CF-5's validated 1.0 s. Step 1 starts from standing and is never counted as an inherited step.

**Run end:** CF-5's tail. After step N lands, step N + 1's transfer / unloading / decision / lift run, and the run stops at its measured liftoff.

## 3. Unchanged V2

- Body morphology, masses, inertias; joints with their hard and soft limits.
- Actuators and capacities (e.g. V2-REF hip flex / ext 211 / 281, knee ext 281, ankle PF / DF 203 / 47, inversion / eversion 39 / 35 N·m).
- Contact model, friction, Jolt at 240 Hz, energy accounting.
- The balance law (kξ = 1/3), the G3 allocation, the posture law and its **constant posture height** (decision: no pelvis-height mechanism).
- The support lifecycle and every constant; the swing servo (4 Hz, ζ 0.8) and its validated corrections.
- DVG, PSTAR5CHABV, CF-2's coupled ankle law, the supervisor, the physical-step definition, determinism.

## 4. The ladder (derived from the pack; `scripts/ladder_table.py`, `ladder_table.json`)

**Rules** (no fitting, no tuning):
- **Speed** v_k = the pack's five reference speeds (§D): 0.400, 0.600, 0.800, 1.11760, 1.34112 m/s. Identical for all bodies. Hof's v/√(gL) with L = hip-joint height is reported for comparison only.
- **Reference step** s_ref = the pack's mean step length:
  - S (Smith & Lemaire 2018 / Smith 2019): 0.38 / 0.45 / 0.52 m, **M**;
  - C (Tudor-Locke et al. 2019, CADENCE-adults), kinematic equivalents: 0.634 / 0.708 m, **D**, *not directly measured step lengths*.
- **V2 step** s = min(s_ref, s_max). s_max = V2's flat-foot step-length limit at the validated posture height (`scripts/reach_limit.mjs`: the planner's own IK feasibility, CF-2 active, both legs leading and trailing from one pelvis position): **V2-REF 0.40, light / short 0.38, heavy / tall 0.42, long-legs 0.42 m**. Decision (a): human step lengths beyond the reachable envelope are not forced.
- **V2 cadence** C = 60·v / s steps/min (the pack's accounting identity).
- **Support timing.** Combined double support (% of the stride) = the pack's speed-specific value:
  - S-derived 43.2 / 35.5 / 31.1 %, **D**, at 0.4 / 0.6 / 0.8 m/s;
  - H (Hebenstreit et al. 2015) 28.8 / 27.4 %, **F/D**, at 1.11760 / 1.34112 m/s.
  - H is not extrapolated below 0.6 m/s. S and H are not averaged; at 0.6 m/s H's 32.0 % F is recorded alongside S's 35.5 %.
  - V2: stride T = 120 / C; each DS interval = (DS % / 2)·T (the two intervals taken equal: H's loading-response and pre-swing regressions differ by 0.1·v %); single support = swing = T_SS = 60/C − T_DS; transfer T_d = T_DS − release lag (minimum one physics tick).
  - **Stated limitation:** the pack has no phase-fraction evidence for elevated cadence at a fixed speed. Applying the speed-specific fraction to V2's stride is the preregistered mapping.

| level | v m/s | V2 step m (s_ref) | V2 cadence steps/min (human mean ±1 SD) | T_DS each / T_SS s (human SS ±1 SD) | DS % (source) |
|---|---|---|---|---|---|
| L1 | 0.400 | 0.38 all bodies (0.38 M) | 63.2 (57.6 – 72.0) | 0.410 / 0.540 (0.48 – 0.62) | 43.2 (S D) |
| L2 | 0.600 | REF 0.40, 165 0.38, 198 / LL 0.42, reach-limited (0.45 M) | 90.0 / 94.7 / 85.7 (73.2 – 87.6) | 0.237 / 0.430; 0.225 / 0.409; 0.249 / 0.452 (0.44 – 0.56) | 35.5 (S D; H 32.0 F) |
| L3 | 0.800 | same, reach-limited (0.52 M) | 120.0 / 126.3 / 114.3 (85.2 – 98.4) | 0.156 / 0.345; 0.148 / 0.327; 0.163 / 0.362 (0.41 – 0.51) | 31.1 (S D) |
| L4 | 1.11760 | same, reach-limited (0.634 D) | 167.6 / 176.5 / 159.7 (99.7 – 111.9) | 0.103 / 0.255; 0.098 / 0.242; 0.108 / 0.268 (n/a) | 28.8 (H F/D) |
| L5 | 1.34112 | same, reach-limited (0.708 D) | 201.2 / 211.8 / 191.6 (107.5 – 119.7) | 0.082 / 0.217; 0.078 / 0.206; 0.086 / 0.227 (n/a) | 27.4 (H F/D) |

**Known constraints recorded before any run** (not pass / fail):
- **Lifecycle timing.** From L2 upward the planned DS interval is shorter than the lifecycle's own minimum acceptance + release time: debounce 0.0125 + release ramp 0.10 + accept debounce 0.05 + accept ramp 0.10 = 0.2625 s.
- **Cadence beyond the human evidence.** From L3 upward V2's cadence exceeds the pack's ±1 SD range. From L4 it exceeds anything in the pack: the highest observed cadence is 127 steps/min (C, 3 mph), and U's prescribed +20 % is 130.4 steps/min at 1.3 m/s.
- These are V2 envelope consequences of decision (a), to be tested, not assumed.

**Bracketing** (diagnostic location only, not human-referenced). If V2-REF fails L1, at most two further speeds locate V2's limit between CF-5's demonstrated 0.053 m/s and 0.4 m/s: 0.2 m/s first, then 0.3 (if 0.2 passes) or 0.1 (if it fails). Each holds L1's DS fraction (43.2 %, the nearest evidence point; an extrapolation outside the pack's tabulated values) and changes one factor, chosen by the L1 failure's causal diagnosis:
- for a timing-related cause (swing tracking, lifecycle, DCM timing), the step stays 0.38 m and cadence falls with speed;
- for a step-length-related cause (reach, swing distance, foothold), cadence stays 63.2 steps/min and step length falls with speed.

## 5. Test procedure

- **Hardware and runs.** 240 Hz, PSTAR5CHABV, Tst0 = 1.0 s start-up. Every final run is executed twice; end hashes must be identical.
- **V2-REF first, at each level k:**
  - A (2 steps) → B (6) → C (20), left foot first;
  - then D (60) if C is clean;
  - then C with the right foot first.
- **Then light / short, heavy / tall and long-legs** at level k, C (20), left first. Their A / B outcomes are read as prefixes of the deterministic C run.
- **Climbing.** A body climbs to k + 1 only if it passed k. At its first failing level it stops climbing and the failure is diagnosed (§8). If V2-REF fails L1, bracketing (§4) follows and CF-6 stops.

## 6. Recorded per step and per run

**Speed and gait geometry:**
- Realised mean speed (walking-frame landing advance / touchdown interval);
- cadence (touchdown intervals);
- step length: at each touchdown, the forward distance between the landed and the stance foot along ŵ (the pack's definition: successive opposite-foot contacts).

**Support timing:**
- Stance / swing / single / double support with the pack's H-style contact threshold, **vertical force 20 N** per foot, logged per tick;
- percentages of the complete stride.

**Clearance:**
- The lowest boot point during φ 0.2 – 0.8 of the swing.
- Cross-checked against MTC references (Winter 1992: 12.9 mm, variability ~4 mm; Schulz 2011: 8.5 ± 5.0 slow, 10.2 ± 4.5 preferred, 14.6 ± 6.0 mm fast). These are a plausibility cross-check only; the definitions differ (MTC = toe event; ours = all boot points in the window).

**Touchdown:** vertical and horizontal foot speed; the 60 % gate events; early / late / failed contacts; contact losses.

**Momentum:** forward COM velocity at decision, liftoff, 0.1 s before touchdown, touchdown, after acceptance, next decision, next liftoff, and the per-cycle minimum (CF-5).

**Balance:** DCM / capture point and its errors; the walking capture margin (DCM against the hull of both feet at touchdown); the single-support VRP r and any clamping; foothold error against the plan and against the walking frame.

**Envelope and stability:**
- Joint hard-limit margins; actuator saturation per cycle (ankle inversion separately); Δτ0; energy-closure residual;
- stance-foot slip; pelvis yaw drift; foot yaw drift (L / R); stance width;
- **heel rise / toe rotation:** stance-foot tilt in late stance, swing-foot tilt at measured liftoff, touching pieces.

**Accumulation:** whether each metric accumulates step to step (§7 rule).

## 7. Pass / fail (per body, start leg, level)

A level is **passed** iff all of (P1) – (P4) hold.
- **(P1) Sustained genuine walking.** ≥ 20 consecutive physical steps (the established Touchline definition), with every eligible step (2 … 20) genuinely continuous by CF-5's criteria. C_min = max(10 mm/s, 0.25·v̄); forward COM ≥ C_min at the seven instants and > 0 at every tick.
- **(P2) Commanded speed achieved.** Realised mean speed within ± 20 % of v_k. This is the V2 command-tracking tolerance, not a human threshold. A body that walks continuously but slower is reported as walking at its realised speed, with "target not achieved".
- **(P3) Physical invariants (never relaxed):**
  - no fall; stance slip < 20 mm (G2 "relocated");
  - leg hard-limit margin > 0; finite state;
  - no supervisor abort; no CF-6 planner refusal; no failed touchdown.
- **(P4) No accumulation.** Each metric is tested over the eligible steps. The metrics: transfer and swing DCM error, capture margin at touchdown, foothold error, landing lateral error, stance slip, touchdown vertical speed, ankle-inversion and total saturation per cycle, hard-limit margin, Δτ0, energy-closure residual, pelvis yaw drift, foot yaw drift L / R, stance width.
  - **Thirds rule** (means m_A, m_B, m_C; σ_B = the SD within the middle third). A metric **accumulates** iff all three hold:
    - (m_B − m_A)(m_C − m_B) > 0;
    - |m_C − m_B| ≥ 0.5·|m_B − m_A|;
    - |m_C − m_A| > 2σ_B + floor.
  - **Resolution floors:** 1 mm for lengths and DCM errors; 0.5 mm for slip; 5 mm/s for touchdown speed; 2 axis-ticks for saturation; 0.2° for margins and yaw; 1 N·m for Δτ0; 0.005 J for energy; 2 mm for width.

**Human comparison** (descriptive only, never pass / fail). Realised step length, cadence, DS % and single support are compared with the pack's ranges at v_k, quoted with the pack's labels and caveats: cohort means ±1 SD are descriptive; sample extrema are not maxima; regressions are cohort fits. The comparison is reported, never tuned toward.

## 8. Classification of the first blocker (as instructed)

- **A — missing walking / gait functionality.** Examples: a lifecycle whose fixed acceptance / release time exceeds the gait's double support; reach limited by the absence of a COM-height or heel / toe mechanism; no swing re-planning.
- **B — a correctable controller / planner limitation.** Examples: swing-servo bandwidth or tracking; DCM tracking lag; allocation residual; a supervisor false abort; a CF-6 planner rule.
- **C — an unavoidable limitation of the underlying body, joints, actuators or contact model, after the permitted gait mechanisms are present.** Examples: actuators saturated at capacity with no feasible plan avoiding it; joint hard limits reached; contact-model instability; energy-closure growth; falls caused by the body.

**V2-vs-V3 stop rule:** a genuine C is stopped and reported as V3 evidence, not repaired. Missing gait functionality (A) or a correctable controller / planner limitation (B) is not V3 evidence.

## 9. Visual evidence

If any CF-6 run reaches ≥ 20 genuinely continuous physical steps, an authoritative replay is made by CF-5's verified regeneration:
- the unmodified harness re-executed with a passive state recorder;
- accepted only on identical per-second and end hashes;
- shown in the CF-5 replay page (same camera and playback controls) for V2-REF and the fastest clean 20+ step walk.

## 10. Regression and isolation

- `--cf=0..5` must reproduce every earlier study's end hash and record after the CF-6 code is added.
- All CF-6 paths are gated `CF === 6`.

## 11. Amendments

None at freezing.
