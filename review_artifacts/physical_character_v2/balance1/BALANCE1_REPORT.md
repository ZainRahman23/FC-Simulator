# BALANCE-1 report: M1b adoption + human balance system

**Instruction:** `sources/2026-10-12_user_instruction_overnight_m1b_adoption_balance1.md` (2f16fff4).

**Preregistration and freeze:** `BALANCE1_PREREGISTRATION.md`, `BALANCE1_FREEZE.json`. Frozen at **01653ab4**, before any battery run.

**Design history:** `BALANCE1_DESIGN_LOG.md`, D0–D12 with a design-stage disclosure.

**Literature:** `research/BALANCE_MUSCLE_AND_BENCHMARK_LITERATURE.md`.

**Evidence** (`evidence/`):
- `B1_Q_*` (battery) and `B1_V_*` (verdicts) for A and B × central / low / high bodies;
- `B1_DECISION.json`, `B1_COMPARE_*.json`, `B1_PERF_*.json`.

**Review:** http://127.0.0.1:8350/balance1/review/BALANCE1_REVIEW.html

PVP was not run. No tackle.

---

**1. Is M1b integrated?**

Yes. M1b is the canonical V2 muscle layer.

- **Code:** `sandbox/visual/physchar2/sim/v2_muscle.js` (`MuscleLayer`, `MuscleAxis`, `solveFloors`) and `spec/v2_muscles.js` (constants with provenance).
- **Force path:** excitation u± → electrochemical delay (2 steps; Nordez 2009) → activation (15 / 50 ms, the Ca²⁺ stage) → developed force (per-group τc,rise / τc,fall) → intrinsic mechanics → joint torque.
  - The intrinsic mechanics are force–length, a force–velocity window, short-range stiffness on developed force over the energy-consistent history arms (C), passive B and damping.
- **Equivalence:** the canonical axis reproduces the qualified MUSCLE-1 M1b model byte for byte on every MUSCLE-1 experiment (`CANONICAL_M1B_EQUIVALENCE.json`).
- **No torque bypass:** `compute()` accepts only `{uP, uM}` ∈ [0, 1] and throws on any torque, stiffness or damping field.
- **Inputs kept:** the tone floors T, the minimum-effort rest statics and the corrected capacities enter through the body's rest intent and the canonical intent → excitation allocator.
- **No silent generalisation:** an unparameterised muscle group throws.
- **State:** 448 floats per character.

**2. Which muscle groups and parameters were added?**

All are in `MUSCLE_GROUPS`. The τc values were inverted on the same 240 Hz cascade by `scripts/b1_groups_derive.mjs`, which reproduces the literature review's own table exactly.

**Labels:**
- [E] derived from measured data.
- [SENS] preregistered sensitivity range (central value used).
- [D] labelled assumption.

| Group | Rise / fall target (ms) | τc rise / fall (ms) | Label | Sensitivity τc range (rise / fall) |
|---|---|---|---|---|
| Hip abduction, adduction | 280 / 175 | 125.9 / 54.2 | rise [E], fall [SENS] | 88.8–181.1 / 17.1–95.3 |
| Hip flexion, extension | 300 / 175 | 135.2 / 54.2 | rise [E], fall [SENS] | 98.1–181.1 / 17.1–95.3 |
| Trunk extension | 320 / 200 | 144.4 / 68.5 | [SENS] | 88.8–226.9 / 17.1–120.9 |
| Trunk flexion, lateral bend, rotation | 300 / 200 | 135.2 / 68.5 | [SENS] | 88.8–204 / 17.1–120.9 |
| Neck flexion, extension, lateral bend | 240 / 220 | 107.4 / 79.4 | rise [E], fall [SENS] | 79.5–135.2 / 39–120.9 |
| Ankle inversion, eversion | 300 / 200 | 135.2 / 68.5 | [SENS] | 88.8–204 / 17.1–120.9 |
| Shoulder (all) | 220 / 150 | 98.1 / 39 | [SENS] | 65.4–135.2 / 2.7–79.4 |
| Elbow flexion / extension | 210 / 130, 230 / 140 | 93.5 / 25.4, 102.8 / 32.5 | [E] | ranges in the table |
| Hip, knee, neck axial rotation; forearm pronation / supination | as their families | | [D] | no data; posture axes only |

- **Unchanged (MUSCLE-1 qualified):** plantarflexion, dorsiflexion, knee extension.
- **Knee flexion:** stays MUSCLE-1's [D] value (88.8 / 45.3). The literature refinement (107.4) lies inside its sensitivity range.
- **Sensory delays** (literature §19.2; steps rounded up):

| Channel | Latency | Steps | Label |
|---|---|---|---|
| COM → ankle / knee muscles | 100 ms | 24 | [D on MODEL] |
| COM → hip muscles | 75 ms | 18 | |
| Upper-body orientation offsets | 75 ms | 18 | |
| Proprioceptive orientation rate | 30 ms | 8 | [MODEL], Goodworth & Peterka 2009 |
| Vestibulocollic (head) | 22 ms | 6 | [M] |
| Leg / posture | 100 ms | 24 | |

**3. What remains unparameterised or weakly parameterised?**
- **No human relaxation data** for hip, trunk, ankle frontal-plane or shoulder muscles. The neck has one indirect value. All falls are [SENS].
- **No evoked torque twitch** for any hip, trunk, neck or ankle frontal-plane group. Rises come from voluntary rapid-torque curves or fibre type. The trunk is the weakest ([SENS] 200–500 ms).
- **Axial rotations** (hip, knee, neck, forearm): [D].
- **Short-range yield angle θ_y** outside the ankle: [D] (PPR-1).
- **Tendon saturation** of short-range stiffness at high force: not modelled.
- **Motor noise** cv 0.025: [D].
- **No sensory noise model.** The literature gives perception thresholds only.
- **Gravitational mode stiffness and low-frequency intrinsic share** used by B's internal model: measured on this body [E], not human data.

**4. Which architecture won?**

**B**, by the preregistered rule (`B1_DECISION.json`).

**Both variants share:**
- one continuous whole-body controller (`b1_ctrl.mjs`) on the M1b body, commanding only excitation (net-torque intent → canonical allocator);
- objectives:
  - the COM relative to the support, AP and ML, through the legs' static COM-force Jacobian;
  - upper-body orientation as gravity-load offsets: HAT about the hips, lumbar subtree, thoracic subtree;
  - the head (vestibulocollic);
  - per-leg support length (knees);
  - support symmetry (differential ankle; D11);
  - weak posture only on axial hip / knee rotation and the arms;
- gains: Peterka / Pasma normalised (kP 1.3–1.33, kD 0.45 s, kI 0.17 s⁻¹) × measured or derived gravitational stiffness.

**B adds** a limited internal model of the ML COM mode:
- the delayed observation is propagated over each channel's own delay with the efference copy (the controller's own commanded COM force through the canonical hip-abductor / plantarflexor cascade) and the known mode dynamics;
- it is re-anchored on every new delayed observation;
- it has no knowledge of the disturbance.

**How B met the rule:**
- **No regression:** it passes every criterion A passes.
- **Material gain:** ML sway distance to the human central falls from 1.67 to 0.88 mm (−47 %); mean moderate-push settle time falls from 3.46 to 2.70 s. A's moderate lateral pushes ring and do not settle; B's settle in 2.5 s.
- **Not superhuman:** thresholds 0.59 / 0.42 of the zero-delay limit; sway above the band floors; every over-limit push falls; no earlier first command.

**5. Is it causally delayed?**

Yes, proven in the final qualification (P5, all 16 pushes, both variants):
- Commands are bit-identical to the undisturbed twin until the disturbance enters the shortest channel's delayed observation.
- The first command difference is at 29.2 ms: onset + 1 + 6 steps, the vestibulocollic channel.
- The first excitation / activation difference is never earlier.

How causality is enforced:
- Every command is logged with the physical step index behind each channel's observation.
- `control()` never receives the simulation state. It reads only frozen per-channel views of a ring filled from the physical state.
- B's prediction uses only delayed observations and its own past commands.

**6. Is superhuman torque prevented?**

Yes, by construction and by measurement:
- **Construction:** the controller cannot command torque. Every change passes the delay, activation and contraction lags.
- **Measurement:** both-ankle AP corrective-torque max 25-ms rate, same pushes (`B1_COMPARE_B.json`):

| Push | S2 + old P2 (N·m/s) | M1b + BALANCE-1 (N·m/s) |
|---|---|---|
| Forward small | 775 | 210 |
| Forward moderate | 1,366 | 400 |
| Backward small | 345 | 170 |
| Backward moderate | 808 | 364 |

- Human lean-release reference: 372 ± 267 N·m/s. P7 passes.
- Peak ankle torque is 52 N·m at the moderate forward push (human ≤ ≈ 95).

**7. Does it stand naturally?**

Yes, within the measured limits.
- **Settled entry (U2):** load within ±10 % / ±1 % of body weight; penetration 0.007 mm; COP–COM 2.1 mm; joint drift 0.2°.
- **60 s with motor noise:** no fall (U1); no creep (U3: largest joint-mean shift 0.58°); contact clean (U5).
- **Joint SDs:** ankle 0.27, knee 0.39, hip 0.22, neck 0.49° against human 0.21 / 0.18 / 0.30 / 0.31 (U6 passes).
- **Caveat:** the clips show a quiet but rather still stance. AP COM sway is about a quarter of human (next answer).

**8. Is the sway human-like?**

Partly.

| Measure | B | Human | Notes |
|---|---|---|---|
| COM RMS AP / ML | 1.09 / 0.97 mm | 4.1–4.3 / 1.7–2.0 mm | inside the preregistered ×0.25–3 band (U4), but AP near its floor |
| COP RMS (100 ms average) AP / ML | 2.9 / 5.6 mm | 4.6 ± 2.2 / 3.1 ± 0.9 mm | ML on the high side |
| COM AP crossing frequency | 0.72 Hz | COP median ≈ 0.3 Hz | too high |

- Probable reason: motor noise only, with no sensory noise and no slow sensory drift. Not tuned.
- A: COM ML 3.52 mm; raw COP ML 22 mm.

**9. Are small disturbances recovered?**

Yes, all four directions (P1), without a step.

| Push | COM peak | Time of peak | Settled | Human |
|---|---|---|---|---|
| Forward 6.5 N·s | 22 mm | 0.59 s | 0.95 s | 21–30 mm expected |
| Backward 4 N·s | 12 mm | | 0.71 s | |
| Lateral 7.5 N·s | 22 mm | 0.34 s | 0.64 s | |

**10. Are moderate disturbances recovered?**

Not all. P2 fails, in the forward direction only.

| Push | Outcome | COM peak | Time of peak | Settled |
|---|---|---|---|---|
| Backward 8.5 N·s | recovered | 26 mm | 0.38 s | 1.85 s |
| Left / right 15 N·s | recovered | 48 mm | 0.39 s | 2.5 s |
| Forward 12 N·s | **not settled within 4 s**; no fall | 69 mm | 1.5 s | — |

**What happens in the forward push:**
- The COM reaches 51 mm at 0.5 s, which is human-like.
- It then hangs about 60–68 mm forward for 1.5 s, with the COP held at about 65 mm. The controller asks for only 1.33 × gravity at that displacement.
- Integral action then swings it back past upright to −49 mm, a 70 % overshoot.

**Two contributing causes:**
- **(a) The character's short forward base.** The toe edge is 103 mm ahead of the entry COM and the zero-delay forward limit is 24.3 N·s, so 12 N·s is 84 % of this body's measured threshold. For humans it is 52–75 %.
- **(b) The human-normalised low-frequency gain** leaves little net stiffness at large amplitude, and the integrator overshoots after long excursions.

**No successor was built.** Fixing (a) needs a stance or anatomy decision (a stop condition). Fixing (b) has no evidence-based parameter I could use without a gain search.

**11. Does lateral work?**

Yes, with B.
- Small, moderate and limit lateral pushes do not fall. The limit push (23 N·s) is not settled within 4 s, and the unloaded foot nears 27 N.
- **Moment share:** the hips supply 87 % of the corrective ML moment (73 vs 10.5 N·m), against human 85–90 %. This emerged without being targeted.
- **Lateral threshold:** 25.9 N·s, against human 20–26 at hip width (low confidence; this stance is 0.42 m).
- **Over-limit (32.5 N·s):** a foot unloads, and it falls.
- **Variant A:** the moderate lateral push rings and does not settle. B's ML prediction is what makes lateral work at the literature delays.

**12. Do large disturbances topple it?**

Yes. Every over-limit push falls (P3):

| Push | Falls at |
|---|---|
| Forward 28 N·s | 0.32 s |
| Backward 19.5 N·s | 1.63 s |
| Left / right 32.5 N·s | 0.68 s |

- **Forward limit push (19.5 N·s)** also falls. The forward threshold is 14.4 N·s: 0.59 of the zero-delay limit, the upper end of the human fraction, but below the human absolute 16–23 N·s. This is the same forward weakness as answer 10.
- **Backward limit push (13.5 N·s)** recovers (peak 44 mm).
- **P4 (the continuum) fails as written,** but only in the forward direction. There the limit and over-limit pushes both fall, so their "peak excursions" are arbitrary post-fall distances (1,684 vs 1,567 mm). Backward and lateral increase strictly. This is a flaw in my own criterion definition: it is not defined for two falling levels. It was preregistered as written, so it stays failed.
- **The Rietdyk-form forward push** (20 N·s over 350 ms) exceeds the forward threshold and falls (M1 fails). The lateral one recovers: 53 mm at 0.52 s, settled at 2.55 s.

**13. Is the response coordinated?**

Yes, as a whole-body response, with three deviations from human (listed last).

**Order of neural onset** (developed-force change):

| Joint group | Onset | Channel |
|---|---|---|
| Lumbar | 50–54 ms | proprioceptive rate |
| Thoracic | 58–75 ms | |
| Hip | 58–112 ms (lateral 58–75) | |
| Neck | 83–129 ms | |
| Knee | 113–125 ms | |
| Ankle | 117–129 ms | |
| Arms | later | |

- **Human reference:** first postural EMG 70–110 ms; torque onset 100–160 ms.
- **AP:** hip torque ≈ 45 % of ankle torque.
- **ML:** hip-dominated load transfer.
- **Upper body:** trunk and hips move together.

**Deviations from human:**
- Knee flexion is only 2–3° (human 4–5°).
- The head turns about twice as fast as the thorax. Humans keep the head with the trunk.
- AP sway is low (answer 8).

**14. Is there frozen-pose behaviour?**

No per-joint servo to a pose.
- The objectives are the COM over the support, segment-group orientations in space (gravity-scaled), per-leg support length and support symmetry.
- The weak posture loop (0.85 × entry short-range stiffness, ζ 0.2) acts only on axial hip / knee rotation and the arms. Spine axial rotations have no controller (D12).
- Joints move freely in coordinated patterns, such as the ankle–hip anti-phase in quiet standing.
- The integral terms slowly return orientations and the COM to upright (kI 0.17 s⁻¹). That is an orientation set-point, not a joint pose.

**15. Is there hidden instantaneous feedback?**

None.
- **Immediate responses** come only from the muscles' intrinsic mechanics (short-range stiffness, force–velocity, passive B, damping), which are body properties qualified in MUSCLE-1.
- **Earliest neural change:** the 29.2 ms command change on the vestibulocollic channel. Neural torque appears from about 50 ms, at the lumbar group via the 30 ms proprioceptive-velocity channel.
- **P6:** the tiered criterion passes. The PPR-3 form (≥ 60 ms everywhere) fails because of this literature [MODEL] channel. That is reported, and it was disclosed in the preregistration.

**16. Energy and momentum?**

- **Muscle work over the first second** (positive / negative):

| Push | Positive | Negative |
|---|---|---|
| Moderate forward | +11.7 J | −10.3 J |
| Moderate lateral | +12.5 J | −15.3 J |
| Over-limit forward | +76.2 J | −39.9 J |

- **Muscle layer:** MUSCLE-1's energy-consistent strain law (ledger residual ≤ 2e-15; no energy created) is unchanged.
- **Momentum:** the push impulse is absorbed through the COM trajectory (peaks and timing in answers 9–12).
- **Not done:** a separate whole-body energy and momentum ledger. It is not in the frozen battery.

**17. CPU, determinism and state?**

| Item | Value |
|---|---|
| Muscle layer | 29 µs per 240 Hz step |
| BALANCE-1 controller | 19 µs per step |
| Solver, 1 character (unchanged) | 349 µs per step |
| V2 passive model | 210 µs per step |
| Instrumentation | 210 µs per step |
| 22 players, muscle + controller | ≈ 1.06 ms of the 4.17 ms step (solver and passive model not included) |
| Muscle state | 448 floats |
| Controller state | ≈ 2.2 k floats, mostly the 32-sample sensor ring (reducible) |
| Muscle snapshot / restore | 7.2 / 7.8 µs |

- **Measured on:** Apple M4, node v22.19.0 (`B1_PERF_*.json`).
- **Determinism:** reruns are bit-identical (DET):
  - B standing 5e165af305ba9e66 ×2, push f03d1c3e9046acbe ×2;
  - A 12098e34709f9e59, 773363fddac74512.
- The timing wrappers did not change the final hash.
- The review-clip runs are hashed in `FINAL_HASHES.txt` (outside Git).

**18. What failed, and what did you learn?**

**Design stage (D0–D12):**
- Two plumbing bugs masked the posture channel. The fix: non-finite output now throws.
- S2's secant strain law was a hidden, activation-scaled pose spring that P2 relied on.
- The fitted lateral "effectiveness" compensation destabilised the loop at real delays.
- The legs' differential (pelvis-yaw) lean had no objective and diverged slowly. It had been present since pre-literature designs.
- Velocity feedback on a viscous mode is destabilising (support symmetry: kD 0).
- The weakest loop (posture on spine axial rotations) drove a 25-s lateral wander.
- Segment-frame orientation objectives did not help.

**Final battery:**
- P2 forward;
- P4 (my criterion flaw plus forward falls);
- M1 forward.

**Lessons:**
- Diagnose noise-free before blaming noise.
- Every null space needs an objective or a physical reason.
- Human-normalised gains do not transfer to modes with different dynamics.
- A preregistered continuum criterion must handle falls.

**19. What surprised you?**
- The hips took 87 % of the lateral moment without being asked to.
- The long lateral wander came from the weakest, least important loop.
- The pelvis-yaw divergence was invisible in every probe until run noise-free for 60 s.
- Literature delays (75 ms hip channel) plus B's limited prediction were enough for lateral. A 50 ms guess had looked necessary before the literature came back.
- With human-level push magnitudes, **forward** became the weak direction, not lateral as in PPR-3.

**20. What remains before PVP?**
1. **Your decision on the forward deficiency:**
   - (a) stance / anatomy: forward base margin and COM placement over the foot (a stop condition for me);
   - or (b) an evidence-based amplitude-dependent strategy for near-limit forward pushes: a hip strategy that scales with magnitude, anti-windup.
2. **A P4 amendment:** the continuum among non-falling levels, plus the order of falls.
3. **Head–trunk coordination:** cervicocollic and head-on-trunk objective (Honegger).
4. **A sensory-noise model,** for sway amplitude and frequency.
5. **Knee participation.**
6. **Formal adoption** of the muscle force path and BALANCE-1 into the V2 spec. §14A is written as a proposal, nothing applied.
7. **PVP set-up:** the entry fixture, and then a single out-of-sample PVP replay as validation.

**21. Commits and files**

**Commits:**
- **2f16fff4** instruction, verbatim;
- **6ac988ef** canonical muscle layer (M1b adopted) with the equivalence proof;
- **01653ab4** FREEZE (muscle groups, controller A/B, battery, preregistration, design log);
- results + review + this report (next commit).

**Key files (`review_artifacts/physical_character_v2/balance1/`):**
- `scripts/`: b1_ctrl, b1_body, b1_run, b1_qualify, b1_eval, b1_decide, b1_compare, b1_perf, b1_groups_derive, b1_probe, b1_linear;
- `params/` (A, B, body, sensitivity bodies);
- `evidence/`;
- `render/` (b1_save_runs, b1_review_build);
- `review/BALANCE1_REVIEW.html` + `review/video/` (32 MP4s, 71 MB);
- the review clip records and clip data are outside Git (`review/OUTSIDE_GIT.md`).

**Canonical code:** `sandbox/visual/physchar2/sim/v2_muscle.js`, `spec/v2_muscles.js`.

**Not touched:** PVP, slide, Astra's worktree, RUN-1, authoritative simulation, tackle outcomes, collision geometry.

**22. URL:** http://127.0.0.1:8350/balance1/review/BALANCE1_REVIEW.html

---

**RECIPIENT STATUS: B. PROMISING BUT BALANCE NOT YET QUALIFIED**

- **At the central body, the adopted variant B passes 13 / 16:** U1–U6, P1, P3, P5, P6, P7, T1, DET.
- **It fails P2, P4 and M1,** all in the forward direction.
- **Sensitivity:**
  - U1, P1, P3 and P5 hold at both muscle-lag ends.
  - P2 forward fails at both ends.
  - U6 fails at the fast end (knee and neck SD 0.70–0.72°).
- PVP was not run. Stopping for review.
