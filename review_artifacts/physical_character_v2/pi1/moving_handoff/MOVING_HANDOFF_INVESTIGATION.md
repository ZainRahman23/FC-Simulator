# Moving-runner handoff: read-only investigation (HG-A v2 adopted)

**Authority:** `../../sources/2026-10-09_user_decision_adopt_hga_v2_investigate_moving_handoff.md` (f6265b5).

**Constraints honoured.** Nothing was changed: the running animation, V2 / F0 / F1, V1.3, Jolt, the 30 / 10 mm limits and tackle outcomes are as they were. No new compatibility amendment, no Revision 3, and no PI-1 qualifying run.

**What was run** (all diagnostic):
- kinematic analyses of the presentation;
- presentation exports with presentation-only switches, with gameplay hashes verified identical;
- 732 short physics runs of the existing REV2 plant with no tackle.

**Records.** The scratch copies of the V1.3 AIR records were lost when the session restarted. They were regenerated with the frozen exporter against a clean archive of V1.3 at 5042230. All 26 gameplay hashes and contact lists are identical, and the 6 committed LOCO files match field for field.

## 1. HG-A v2: adopted and versioned

`../hga/HGA_V2_ADOPTED.md` (cf144e8) supersedes v1 (f8cd44a). It notes v1 in the REV2 prereg (§12) and in DECISIONS.md.

**Why v1 was replaced.** v1 required the presentation's instantaneous COM velocity to equal the authoritative velocity. That quantity is non-physical (§2), and its gait-cycle mean already matches the authority to ≤ 0.015 m/s. Its 0.05 m/s was a borrowed fidelity tolerance.

**What v2 requires.**
- Total horizontal momentum = M·v_auth exactly, written as one uniform shift.
- Relative velocities and L about the COM are unchanged; pose and position are untouched.
- \|s\| ≤ 0.180 m/s, derived from PR-2's 3 mm per frame.

**A correction, not a relaxation:** v1 tolerated 3.7 N·s of momentum error; v2 tolerates none.

## 2. Where the presentation's discontinuities come from (item 6)

### 2.1 How running is presented

A code read (`anim3d/of_loco.js`, `anim3d/of_motion.js` in the V1.3 tree) found:
- **No authored clips for running.** The pose is computed each tick from continuous curves of the simulation's `gaitPhase` (`ofLocoCycle`). Five speed parameter sets are interpolated linearly, with no cross-fades. So there is no keyframe stepping and no clip interpolation.
- **Root:** horizontal = the simulation's x, y exactly.
- **Pelvis height** = rig hip height + **pose term** − **plant-IK pelvis drop** + **ground-clamp lift**. Verified per frame against the bone matrices; residual ≤ 0.1 mm.
  - **Pose term.** In stance, forward kinematics put the lowest sole point on the pitch, with a **hard heel → toe switch at s = 0.62**. In flight, a "bob" interpolates from the last stance height to a landing estimate. The landing estimate ignores pelvis pitch, roll and thigh abduction. **At heel strike the stance value replaces the flight value with no blend:** running has no double support, so the gradual hand-over never runs.
  - **Drop.** It lowers the pelvis to keep locked feet within reach. It is rate-limited but still moves up to 20 mm per tick.
  - **Ground clamp.** In every real rig the root bone carries `part: "shirt"`. It therefore scores −12 mm on every tick, giving a constant +12 mm lift. On ticks where a leg-floor IK runs instead, the lift is skipped: **a 12 mm whole-body drop for that tick** (5 – 7 times per jog window). This is a presentation bug.
- **Plant IK:**
  - a lock is **immediate** (weight 1 at once);
  - the **toe pivot** switches its target in one tick;
  - release has three triggers, one of them a reach cap with hard-coded constants;
  - "contact" also counts toe mode, and flagged-contact feet are **not stationary by design**.
- **Stride clock mismatch.** The simulation's stride clock uses leg length 0.865 m (`PT.LEG_REF`). The runner's rig (vinicius) is 0.834 m, so the plant IK has to absorb a 3.7 % stride mismatch every step.

### 2.2 Measurements

**Method.** Each component was switched off in turn through presentation-only `OF_GAIT` values; gameplay hashes stayed identical for all 6 cases × 5 variants (`evidence/presdiag_gameplay_hashes.json`). "Flight" means three consecutive frames with the gait's own flight flag (`evidence/pres_sources.json`).

| speed | variant | flight: implied horizontal force (BW) | flight: extra vertical force (BW; 0 = free fall) | flight: torque about COM (N·m) | COM vs authority (m/s, p50) | presented legs vs the simulation's legs (mm, p50) | valid promotion frames |
|---|---|---|---|---|---|---|---|
| 3 m/s (rx_miss, rx_planted_leg, rx_glancing) | shipped | 1.70 – 1.87 | −8.1 … −8.8 | 346 – 477 | 0.27 – 0.32 | 82 – 92 (p90 232 – 246) | 11 / 149 |
| | plant locks off | 0.35 – 0.37 | −8.0 … −8.6 | 162 – 175 | **0.056 – 0.067** | **13 – 16** | **66 / 149** |
| 5.5 m/s (rx_lateral) | shipped / locks off | 1.15 / 0.43 | −2.3 / −2.1 | 733 / 608 | 0.30 / 0.25 | 45 / 16 | 9 / 9 |
| 7.5 m/s (rx_sprint, rx_airborne) | shipped / locks off | 0.58, 0.20 / 0.58, 0.20 | −5.7, −8.4 / same | 668 – 751 / 574 – 751 | 0.39 / 0.31 – 0.37 | 22 – 37 / 14 – 17 | **0 / 0** |

**Pelvis-height steps** of ≥ 15 mm occur in 20 – 50 frames per window, up to 72 mm per frame (the pose-term component alone reaches 86 mm). Most come from the **pose term**, in stance, in flight and at transitions: for example 44 of 50 at sprint and 18 of 24 at jog. The rest come from the drop (≤ 20 mm) or the 12 mm ground-clamp quirk.

**Attribution by the requested categories:**

| source | finding |
|---|---|
| authored base motion | none for running |
| interpolation | none for running; only the idle blend below 0.65 m/s |
| **root / pelvis motion** | horizontal exact. The vertical pose term has unblended switches: the main vertical defect at every speed, and the only blocker of valid frames at 7.5 m/s. |
| **plant IK** | immediate lock, toe-pivot switch, releases, drop. The main horizontal-momentum, internal-velocity and leg-vs-simulation defect at 3 – 5.5 m/s: with locks off, valid frames go from 20 to 75 of 302. |
| foot correction | the drop and the ground clamp: secondary, plus the 12 mm root-bone bug |
| skeleton mapping | not a source: RF-1 off gives the same COM signal (REV2) |
| finite differences | rounding floor 2.4e-6 m/s (positions recorded to 1e-8 m). The 2nd-order backward estimator amplifies position jumps: it disagrees with the centred estimate by 1.7 – 3.9 m/s per body (shipped). It does not create them. |
| other | stride clock vs rig leg length (3.7 %), absorbed by the plant IK |

**Correction of my own interim statement.** Mid-run I said that with locks off the vertical "goes from −8 to about 0, free fall". That was wrong. The first classification used the plant-lock flags, which do not exist when locks are off, so stance frames were counted as flight. With the gait's own flight flag, the vertical defect is −6 … −9 BW in **every** variant (table above).

## 3. What a physically correct promotion should inherit (item 2)

**Principle (as for HG-A v2).** The simulation owns global locomotion, which is the stride-mean motion of the COM. The presentation may supply only **gait-relative** motion. Every inherited quantity must obey conservation for the support state at k_p:
- in **flight**: horizontal momentum constant, vertical ballistic (−g), and L about the COM constant;
- in **stance**: changes only through the contact foot, which does not move.

| | what it must be | the presentation today |
|---|---|---|
| **A. horizontal** | M·v_auth exactly, as HG-A v2 | the gait-cycle mean matches (≤ 0.015 m/s); instantaneous values do not, which is irrelevant under v2 |
| **B. vertical** | The simulation has no vertical state; its stride mean is 0. Inherit the **genuine gait's** vertical COM velocity: the derivative of a pelvis/COM height path that is continuous in position **and** velocity, **ballistic in flight**, compatible with the planted foot in stance, and zero over a stride. Neither the presentation's finite difference nor zero (C3) is correct: zero is wrong in genuine flight. | COM \|v_y\| median 1.5 m/s, up to 5 – 8 m/s. At valid frames it is −4.3 … +2.9 m/s. Flight implies −6 … −9 BW extra, in every variant, including the procedural gait alone. **It cannot be copied.** |
| **C. angular** | L about the COM changes only through contact torque and is conserved in flight. For straight running its stride mean is 0. The whole-body yaw rate must equal the authoritative facing rate (the "angular motion" of the REV2 instruction, not implemented so far). The gait-relative counter-rotation of arms and legs comes from the genuine gait. | L median 10 – 26 kg·m²/s. Flight-frame changes imply 162 – 751 N·m, even in the procedural gait alone. **Not a valid source as is.** |
| **D. internal velocities** | The genuine gait-relative segment velocities: the continuous-time derivative of the gait at the authoritative phase and speed, with joint constraints satisfied, not finite differences taken across IK switches. Running is procedural in gaitPhase, so this derivative is well defined in principle. | The shipped and procedural-only presentations differ by 1.5 – 3.8 m/s (p50; p90 6 – 11 m/s) and 9 – 13 rad/s per body at the same frame: plant-IK artefacts |

**Consequence for HG-A v2.** HG-A v2 correctly preserves whatever internal motion it is given. Today that input carries the artefacts in B – D.

## 4. PR-2 (item 3)

**Origin.** PI-1 prereg §11 (6ef7e1e), PR-2: "no velocity discontinuity: over the first rendered frame (k_p → k_p + 1), every rig joint's displacement within 3 mm of **stream A's displacement**". Stream A is the presentation's own motion over the **same** frame. It protects against a visible velocity pop at promotion: 3 mm per joint per frame is 0.18 m/s.

**The REV2 reading is my error.** REV2 changed the reference to the **last presented frame** (k_p − 1 → k_p), to avoid reading a future presentation frame. But REV2 §1 already allows the ordinary presentation trajectory as a **read-only reference**. Only presentation targets were forbidden.

**Why the REV2 reading is wrong for a moving body.** Comparing the first physical displacement with the previous displacement measures the second difference across the switch: joint acceleration × Δt².
- 3 mm corresponds to 10.8 m/s² (1.1 g). Any running limb exceeds that; a swinging foot reaches tens of g.
- Data: in all **208** moving runs, neither reading is within 3 mm (REV2 reading p50 36 – 37 mm; PI-1 reading p50 45 – 54 mm).
- **The presentation fails it against itself** on every running frame (own one-frame change p50 50 – 61 mm, p10 – p90 10 – 141 mm; worst joints ankles and knees).
- Standing controls: p50 0.7 mm.

**What the continuity test should compare** (3 mm unchanged; still "no visible pop"):

| option | verdict |
|---|---|
| (c) predicted next presentation state | the right kind of comparison: the physical displacement over k_p → k_p + 1 vs the presentation's displacement over the **same** frame (PI-1's original reading), so both include the genuine acceleration |
| refinement of (c) | the reference must be the **genuine continuation** of the visible motion. Where the rendered next frame itself contains a presentation discontinuity (an IK switch), that pop belongs to the presentation and is recorded separately, not charged to the handoff. |
| (a) interpolated presentation state | needed only if promotion happens between frames; then position continuity is checked against the interpolated presentation at the exact time |
| (b) current rendered pose | at a frame boundary this is P-1 … P-8 (position). It is not a velocity test. |

## 5. Long-lead drift (item 4)

**Setup.** HG-A v2 initialization and the exact REV2 plant:
- posture tone holding the promoted joint configuration;
- B tethering the pelvis to the authoritative root (2 Hz; caps 275 N horizontal, +1161 / −193.5 N vertical);
- stance gains from physical contact.

The stand-in tackler is built but placed 500 m away; fallTau is null.

**Coherence** is measured with frozen tolerances only:
- RC-4: pelvis height ≥ 0.85 × the presentation's, tilt ≤ 20°;
- CG-4: every leg segment within 0.10 m of the **simulation's** own segment axis, which is what decides contacts;
- CG-2: physical foot state = the simulation's planted state;
- P-12: no hard-limit excursion;
- NM-2: planted-foot slip ≤ 10 mm.

NM-2's B-load rows are interval fractions and are reported per run. DG and CG-4 against the presentation are reported as visual measures.

| run set | runs | coherent for (ticks) p50 / p90 / max | coherent through contact or horizon | first failures |
|---|---|---|---|---|
| fixed leads 1, 2, 4, 8, 12 ticks and trigger, 22 moving cases, init v2 | 130 | 1 / 2 – 5 (per lead) / 6 | L1 1/22, L2 3/22, L4 1/22, L8 – trigger 0 | support (CG-2), legs vs simulation (CG-4), P-12, RC-4 |
| **fully valid frames** (every REV2 row + HG-A v2), init v2 / smooth / vertical removed | 78 each | **1 / 4 / 6**; 2 / 4 / 6; 2 / 4 / 6 | **0 / 78** for each init | CG-2 (50), CG-4 vs simulation (41) |
| standing controls (fixed leads) | 18 | — | 15 / 18 | — |

DG's 10 mm hand-back without a blend fails after 1 tick in every moving run. B is saturated on p50 100 % of steps, with mean load 0.5 – 0.99 of its caps (NM-2 allows ≤ 25 % mean and ≤ 5 % saturated).

**Probe evidence** (`scripts/cause_probe.mjs`; 6 valid frames):
- **The swing legs stop swinging.** Swing-foot speed relative to the pelvis falls from 1.5 – 3.7 m/s to 0.3 – 0.9 m/s within 2 – 4 ticks. The gait needs 2 – 10 m/s.
- **The legs leave the gameplay legs.** rx_early_stance k48: legs vs simulation go from 82 to 500 mm in 8 ticks.
- **B fights the body.** Its vertical target is the promotion height. It saturates at +1161 N, holding the runner up because the legs do not, or at −194 N, unable to stop an imported upward velocity.
- **The stance foot is dragged.** Where B drags the pelvis forward over a frozen stance leg, the planted foot slides 22 → 186 mm (rx_miss k54).

**Cause attribution:**

| cause | finding |
|---|---|
| **A. Missing locomotion: primary** | Posture tone freezes the promoted configuration. Nothing swings the next leg, places a foot or pushes off. Coherence is lost in 1 – 6 ticks from **every** initialization, including smoothed and vertical-removed. |
| **B. Controller behaviour: secondary** | B is a standing-support pelvis tether. It holds the pelvis at the promotion height with asymmetric caps. It also pulls the **pelvis** velocity to the root velocity, which conflicts with HG-A v2's COM semantics (the pelvis departs by \|s\| plus its gait-relative motion), so it saturates continuously. **DG(c)** still compares against the presentation's COM velocity: the same flaw as HG-A v1. |
| **C. V2 body limitation: none found** | Hard-limit excursions (19 / 78 runs, v2) come from imported momentum plus frozen posture. The mapped presentation stays within V2's range of motion. |
| **D. Presentation initialization artefact: secondary but real** | The imported vertical velocity roughly doubles the vertical divergence (peak \|pelvis Δy\| p50 142 mm with v2 vs 90 mm smoothed vs 94 mm vertical-removed; max 339 vs 151 vs 147). At jog, the presented legs start 50 – 320 mm from the simulation's legs (plant IK), so contact correspondence fails at once regardless of physics. |

## 6. The production question (item 5)

**Coherent interval.** From fully valid frames, the promoted moving body stays coherent for **1 – 2 ticks typically, at most 6** (≤ 0.1 s). With the shipped presentation, no promotion stays coherent through contact.

**Lead PI-1 actually needs.**
- The predictor fires 6 – 15.5 ticks before contact, but that does not force early promotion: PS-2 promotes at the **latest valid frame**.
- Valid frames recur **once per step at a fixed gait phase**: every ≈ 11 ticks at 7.5 m/s, ≈ 13 at 5.5 m/s, ≈ 15 at 3 m/s.
- The latest valid frame (HG-T included) comes 1 – 11.5 ticks before contact: rx_rear_diag 1, rx_glancing 1.75, rx_miss 5.5, rx_lateral 6, rx_front_diag 6.5, rx_early_stance 8.5, sl_loose 9.25, rx_square 11.5.
- Without HG-T: 4.25 – 21.75 ticks (rx_planted_leg 21.75).
- **There is none in any 7.5 m/s record.**

**Is the interval sufficient? No,** except possibly where a valid frame happens to fall within 1 – 2 ticks of contact. Even those two cases failed at t = 1:
- rx_glancing: the shipped presentation's legs were already 159 mm from the gameplay legs;
- rx_rear_diag: support disagreed with the simulation's planted state (CG-2).

**This is not hidden by shortening the prediction window.** The window is not the problem; the supply of valid frames and A are.

**Diagnostic** (`evidence/driftNP_*`). With a presentation free of plant-IK switches (locks off, feet skating, so diagnostic only):
- valid frames at jog appear within 0.5 – 1.75 ticks of contact;
- rx_planted_leg (leads 0.75, 1.75) and rx_glancing (0.75) **stay coherent through contact**, legs within 8 – 29 mm of the gameplay legs;
- rx_miss fails on support, because that variant has no contact flags at all.

So a short coherent interval *can* cover PI-1's need, but only if the presentation supplies valid frames right before contact.

## 7. Blockers kept separate (none modified)

**Earlier blockers:**

| # | blocker | status |
|---|---|---|
| B1 | physical boot vs gameplay foot (segment correspondence) | unchanged |
| B2 | the simulation's slider stop inside the retained 10 mm window | unchanged |
| B3 | still-extending slide leg (HG-T) | unchanged |
| B5 | standing-pose foot correction (P-5) | unchanged |
| B6 | rx_free_leg angular momentum (P-17) | unchanged |
| B7 | rigid-foot toe pivot | unchanged |
| — | stand-in articulation: two rigid segments, no extension | unchanged |
| B4 | long-lead drift | now explained (§5): cause A, with B and D |

**New, recorded, not acted on:**

| # | finding |
|---|---|
| N5 | the ground-clamp root-bone bug: 12 mm single-tick body drops |
| N6 | stride clock (0.865 m) vs rig leg length (0.834 m) |
| N7 | B's vertical target and caps, and pelvis-vs-COM targeting |
| N8 | DG(c) compares against the presentation's COM velocity, as HG-A v1 did |
| N9 | PR-2's REV2 reading (§4) |
| N10 | the authoritative angular (facing-rate) motion is still not implemented at promotion |

## 8. Decision table

| issue | actual cause | kind | must fix for PI-1? | smallest principled fix |
|---|---|---|---|---|
| HG-A v1 | conserved the wrong quantity | test | done | HG-A v2 (adopted) |
| vertical import (−4.3 … +2.9 m/s at valid frames) | pelvis-height pose term: unblended stance / flight / heel-toe switches, flight "bob"; plus the drop | presentation | yes, moving | pelvis-height path continuous in position and velocity, ballistic in flight |
| non-conserved L | plant-IK switches; procedural curve kinks and the pose term at high cadence | presentation | yes, moving | same correction; promotion inherits L from the genuine gait plus the authoritative facing rate |
| internal-velocity artefacts | immediate lock, toe-pivot switch, releases, drop | presentation | yes | continuous plant transitions |
| valid frames only once per step; none at 7.5 m/s | HG-A v2 bound and P-15 / P-17 fail on presentation momentum and IK artefacts | presentation | yes | the two fixes above |
| presented legs 82 – 92 mm (to 320 mm) from the gameplay legs at jog | plant IK; stride-clock mismatch | presentation | yes (contact correspondence) | plants consistent with the simulation's stride |
| PR-2 REV2 reading | my REV2 change: tests limb acceleration | test | yes, before moving PI-1 runs | compare with the presentation's genuine continuation over the same frame; 3 mm kept |
| long-lead drift | no locomotion during the lead | architecture (A) | yes, unless promotion is ≤ 1 – 2 ticks before contact | re-measure after the presentation fix. If still needed: a decision on finite-authority tracking of the **simulation's own runner-body** configuration during the lead. |
| B saturation; B's pelvis vs COM semantics | standing-support design | controller | yes (NM-2 / RC-4 B rows) | B on the authoritative COM path with the gait's vertical (decision) |
| DG(c) vs presentation COM velocity | the HG-A v1 flaw inherited | test | yes, for demotion | compare with authoritative momentum, as v2 |
| ground-clamp root bone | rig root carries a body part | presentation bug | minor | exclude the root from the clamp |
| B1 boot vs gameplay foot | geometry | V2 / V1.3 | yes (front strikes, near-miss touches) | separate decision |
| B2 slider stop | simulation slide law | simulation / test | yes (rx_side_standing) | separate decision |
| B3 still-extending leg | two-segment stand-in | test harness | yes (sl_from_behind) | stand-in extension |
| B5 / B6 | standing poses | presentation | only those cases | — |
| B7 toe pivot | rigid F0 | V2 | promotion frames only | frame selection (F1 closed) |

**The nine questions:**

1. **Is HG-A v2 now sound?** Yes, as the conservation rule for horizontal translation. It does not certify the quality of the internal motion it preserves, and B and DG(c) still target the presentation or pelvis instead of the authoritative COM.
2. **What should promotion inherit vertically?** The genuine gait's vertical COM motion: continuous, ballistic in flight, compatible with stance, zero stride mean. Not the presentation's finite difference, which cannot be copied, and not zero.
3. **What should it inherit angularly?** Whole-body yaw rate from the authoritative facing rate, plus the genuine gait-relative angular momentum. The presentation's L is not conserved in flight, so it cannot be copied.
4. **Is PR-2 testing the correct thing?** Its intent, yes. Its REV2 reading, no: it tests limb acceleration. Compare with the presentation's genuine continuation over the same frame; 3 mm kept.
5. **Why does the runner drift at longer leads?** The promoted body has no locomotion: posture tone freezes the legs and B only tethers the pelvis. Secondarily, B's standing-support design and the imported presentation artefacts. No V2 limit is involved.
6. **How long can it stay physical before contact without becoming invalid?** 1 – 2 ticks typically, at most 6 (≤ 0.1 s), from fully valid frames.
7. **Is that sufficient for PI-1's real lead?** Not with the current presentation: the latest valid frame is 1 – 22 ticks before contact, or there is none at 7.5 m/s. It can be sufficient if valid frames exist within ~1 – 2 ticks of contact (diagnostic §6).
8. **Does any result indicate a genuine V2 body limitation?** No new one. The rigid-foot toe pivot (B7) remains the only one.
9. **The single smallest next change.** A **general locomotion-presentation continuity correction**: remove the unblended discrete switches in the pelvis-height path and in the plant-IK transitions, and fix the ground-clamp root-bone bug.
   - Judge it on general continuity measures over ordinary locomotion at all speeds: flight-phase conservation, per-tick jerk, leg agreement with the simulation's body. Not on PI-1 fixtures or windows.
   - Then rerun this investigation unchanged.
   - It will not by itself give long-lead coherence (A). What it should do is supply valid frames close enough to contact for the 1 – 2-tick interval.
   - The PR-2 reference correction and the B / DG(c) semantics are small definition corrections required before moving PI-1 runs, but they are not the next blocker.
   - Not implemented.

## 9. Process notes and errors (disclosed)

- **Memory exhaustion.** The plant has no world teardown and leaks wasm memory per step. Runs were moved to one process per run; the first attempt's log is kept (`evidence/drift_leads_FIRST_ATTEMPT_OOM.log`).
- **Flight classification error** in the source attribution: plant-lock flags were used, which are absent with locks off. Fixed (gait's own flag), and the affected interim statement is withdrawn (§2.2).
- **Instantaneous B rule.** NM-2's B-load rows are interval fractions. The harness's built-in "first failure" applied them per tick; the summaries use state criteria and report B per run.
- **Harness changes before the final runs:** the horizon cap (tackle records stop at contact or +30 ticks), the simulation-body metrics and the list mode. The fixed-lead set was rerun with the final harness; the physics is unchanged.
- **Non-causal evaluation.** The smoothed init and the procedural-only presentation are evaluation devices only. The presentation-only switches are diagnostics: plants-off feet skate, so it is not a candidate presentation.
- **CG-2 reference.** CG-2 uses the simulation's planted state (authoritative). The presentation's own lock flags agree with it only 70 – 77 % of the time at 5.5 – 7.5 m/s.

## 10. Files

**Scripts** (`scripts/`):
- `lead_drift.mjs`: the drift harness;
- `drift_summarise.mjs`;
- `cause_probe.mjs`;
- `hg_valid_frames.mjs`;
- `pres_diag_export.cjs`: diagnostic exporter; the frozen exporter plus diagnostics and presentation-only `--gait`;
- `pres_sources.mjs`;
- `inherit_sources.mjs`.

**Evidence** (`evidence/`):
- run summaries `drift*_rows.json`, `drift_summary.txt`;
- all raw runs, compressed: `moving_handoff_runs.tgz`, 1.3 MB;
- `hg_valid_frames_*.json`;
- `pres_sources.*`, `inherit_sources.*`;
- `presdiag_gameplay_hashes.json`, export logs.

**Raw diagnostic presentation records** (20 MB): regenerable with `pres_diag_export.cjs` at V1.3 5042230; not committed.
