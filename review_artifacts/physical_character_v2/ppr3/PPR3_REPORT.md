# PPR-3 report: the physiological standing foundation

**Outcome: stop condition B.** The decision needed is architectural, and it is yours (§5).

| Layer | Result |
|---|---|
| **S2** (the physiological substrate) | **qualified 18 / 18** on its frozen battery |
| **S2 + P2** (S2 + continuous delayed postural control) | **FAILED 10 / 14** on its frozen battery |
| **P2b** (labelled successor, three literature variants) | **unstable before any push**; abandoned at design stage |

**What works:**
- S2 + P2 stands undisturbed for 60 s with motor noise. It starts cleanly, does not creep, recovers small and moderate forward and backward pushes, and still loses balance to large pushes.
- Every disturbance-dependent command is provably delayed: on all 12 pushes the commands are bit-identical to the twin world for 29.17 ms.

**What fails:**
- Small lateral pushes do not settle, and moderate lateral pushes topple it.
- Human-matched pushes do not settle.
- The no-step thresholds are not human. Forward it is over-robust (1.00 × the zero-delay limit; human ≈ 0.44–0.56); laterally it is fragile (0.32 ×).
- The causes are diagnosed (§4): the controller is stable only while its torque develops faster than human torque. Restore physiological torque dynamics and this controller class becomes unstable.

**Kept throughout:**
- PPR-1 and PPR-2 are preserved unchanged.
- PVP stayed sealed: no PVP-1A-DX, ABI or tackle was run or viewed.
- Nothing prohibited was modified.
- The canonical V2 spec is unchanged.

The instruction is saved verbatim in `sources/2026-10-11_user_instruction_ppr3_complete_physiological_standing_foundation.md` (f7cef6b3).

---

## 1. What was built

**Standing entry** (`fixture/PPR3_STANDING_ENTRY.json`, `scripts/ppr3_entry.mjs`):
- the PVP runner's posture, with both feet flattened (PVP stood them 4.43° on their medial edges) and the body lowered so the soles touch the turf (PVP hovered 0.5 mm);
- zero velocity;
- body weight is carried within 4 steps;
- no settling rig.

**S2** (`scripts/ppr3_body.mjs`, `params/PPR3_S2_CANDIDATE.json`; design in `PPR3_DESIGN.md`):
- **A:** excitation is fixed from entry. There is no state feedback in the body.
- **A2:** rest statics. The COP is under the COM, and the inward pair between the feet is set by minimum squared activation:
  - 16 N per foot, against PPR-2's 78;
  - hip abductor tone comes out at 4.0 %, against measured gluteus medius 3.6 %. This was not targeted.
- **T:** joint-specific ready-stance tone floors from EMG (`research/STANDING_TONE_LITERATURE.md`).
- **B:** PPR-2's literature passive elasticity.
- **C:** a persistent eccentric (strain) element as a Maxwell body, matching the literature's persistence fractions (`research/ECCENTRIC_PERSISTENCE_DAMPING_LITERATURE.md`):
  - persistent arm 0.15;
  - slow arm 0.30, τ 0.5 s;
  - fast arm 0.55, τ 20 ms.
- **Bidirectional short-range-stiffness cap** (R⁺ + R⁻).
- PPR-1's θ_y and ζ 0.2.

**P2** (`scripts/ppr3_ctrl.mjs`, `params/PPR3_P2_CANDIDATE.json`; design in `PPR3_P2_DESIGN.md`). Continuous delayed feedback on past sensed state, running every step from t = 0. Causal by construction: the control function only ever sees a frozen view of delayed samples.

| Channel | Delay | Gains |
|---|---|---|
| COM PID | 100 ms | Peterka-type gains, scaled to each sway mode's measured gravitational stiffness; ML four-bar = 1.70 × mg/h |
| Segmental hip / lumbar / thoracic posture | 75 ms | K_P 1.3, K_D 0.45 s × the static load sensitivity to the supported mass's offset |
| Neck posture | 25 ms | as the trunk channels |
| Knee squat mode | 75 ms | K_P 0.2, K_D 0.45 s × 57.3 N·m/rad (measured squat-mode gravitational stiffness) |
| Joint posture on null axes | 75 ms | K = 0.85 × the entry short-range stiffness, ζ 0.2 |

Motor noise: force CV 2.5 % (Tracy 2005).

## 2. Results

### 2.1 S2 alone (frozen battery `scripts/ppr3_s2_qualify.mjs` / `ppr3_s2_eval.mjs`; `evidence/PPR3_S2V_CANDIDATE.json`)

| ID | Criterion (intrinsic windows: ankle 40 ms; knee, hip, trunk 30 ms) | S2 | Pass |
|---|---|---|---|
| E1–E4 | Entry: load within 4 steps; penetration 0.007 mm; separation 0.004 mm; COP within 1.7 mm of the COM; pelvis 0.04 mm; COM 0.08 mm; drift 0.25° | clean | ✓ |
| I1a / I1b | Ankle K vs Vlutters 2015 / Sakanaka 2021 | 0.78–1.21 × / 0.53–0.83 × | ✓ |
| I2 | Ankle quasi-static | 0.30 mgh (band 0.13–0.75) | ✓ |
| I3 | Hip quasi-static, per side | 108 N·m/rad (band 24–111; top edge) | ✓ |
| I4 | Knee quasi-static | 99 N·m/rad (≥ 17) | ✓ |
| I5 / I6 | Lumbar flexion / lateral, fast | 151 (55–164) / 77 (≥ 55) | ✓ |
| P1 / P2 | Small pushes resisted but compliant (0.41–0.91°, no yield); continuum | ✓ | ✓ |
| R1 / R2 | Release: no growing oscillation | ✓ | ✓ |
| C1 | Eccentric hold fraction at 100 / 300 / 1000 ms | 0.465 / 0.367 / 0.224 (bands 0.25–0.60 / 0.15–0.45 / 0.08–0.35) | ✓ |
| INT, DET | Integrity; bit-identical | ✓ | ✓ |

**Open-loop (diagnostic):** S2 alone leaves a 10 mm envelope at **1.43 s** and is down by ≈ 3–3.5 s. CURRENT V2 leaves at 0.34 s.

S2 is "loaded, not locked": compliant, resisting, persistent but relaxing, and it needs feedback to stand, as a human does.

### 2.2 S2 + P2 (frozen battery `scripts/ppr3_p2_qualify.mjs` / `ppr3_p2_eval.mjs`; `evidence/PPR3_P2V_CANDIDATE.json`)

| ID | Result | Pass |
|---|---|---|
| U1 | Stood 60 s with motor noise | ✓ |
| U2 | First 250 ms with P2 running: load 710–740 → 722–728 N; penetration 0.007 mm; COP–COM offset 2.1 mm; pelvis 0.08 mm; COM 0.27 mm; drift 0.30° | ✓ |
| U3 | No creep: last 10 s vs 1–2 s: joints 2.14°, pelvis −0.15 mm, COM 4.1 mm | ✓ |
| U4 | COM sway RMS 1.86 mm AP / 0.62 mm ML (band 1.0–12.9 / 0.43–6.0) | ✓ |
| U5 | Separation 0.011 mm, penetration 0.007 mm over 60 s | ✓ |
| **P1** | Small pushes: forward / back recovered (peak 15 / 17 mm, settle 0.68 / 0.70 s). **Left / right not settled** (peak 40 mm at 0.30 s, still 21 / 19 mm off at 4 s) | ✗ |
| **P2** | Moderate: forward / back recovered (26 / 27 mm, settle 0.89 / 1.02 s). **Left / right fall: the far foot unloads at 0.40 s** | ✗ |
| P3 | Large pushes all lose no-step balance (COM beyond the base at 0.23–0.25 s) | ✓ |
| P4 | Continuum strict in every direction | ✓ |
| P5 | Causality on all 12 pushes: commands bit-identical until 29.17 ms (onset + 1 + 6 steps); activation not before | ✓ |
| P6 | First body-joint neural torque at 79 ms (≥ 60; ≤ 200 for moderate pushes) | ✓ |
| **M1** | Rietdyk-form 20 N·s / 350 ms: forward peak 83 mm at 0.875 s; lateral 35 mm at 0.42 s; **neither settled by 3.5 s** | ✗ |
| **T1** | Thresholds: forward 24.3 N·s = **1.00 × J_lim** (band 0.35–0.80); left 20.0 N·s = **0.32 ×** | ✗ |
| DET | a574337d3809985b ×2; 4178181c7f012d8b ×2 | ✓ |

### 2.3 Chronology: the moderate forward push, 9.7 N·s at t = 2 s (`evidence/PPR3_P2Q_CANDIDATE.json` `P.runs["fwd.moderate"].chronology`)

| t after onset | Event |
|---|---|
| 0 | the pelvis pulse begins (50 ms) |
| 4.17 ms | body state differs from the twin; first joint ≥ 0.01° |
| 12.5 ms | first joint ≥ 0.1°. **P2 has not seen anything yet** |
| 29.17 ms | **first P2 command difference.** Its sensed indices are [COM 463, hip / lumbar / thoracic 469, neck **481**, knee 469, joint 469]: only the 25 ms neck channel has sampled a post-push state. The first activation difference is at the same step |
| 37.5 ms | first command difference > 0.1 N·m |
| 75 ms | first neural torque > 0.1 N·m (neck) |
| 79 ms | lumbar and knee |
| 104 ms | ankle |
| 108 ms | hip |
| 146 ms | ankle torque rising fastest: **908 N·m/s** (both ankles) |
| 0.50 s | COM peak 26 mm |
| 0.89 s | settled within 10 mm |

The same order holds on every push (P5). The first command difference is always at 29.17 ms.

### 2.4 What P2 adds: the S2-replay twin

The S2-replay twin is the same push with P2's own **undisturbed** command sequence replayed, so it has no feedback.

| Push | S2 + P2 (1 s) | S2 replay |
|---|---|---|
| fwd small 6.1 N·s | peak 15 mm, recovering | XcoM loss 0.64 s |
| fwd moderate 9.7 | 26 mm, recovering | loss 0.44 s |
| back small 7.3 / moderate 11.6 | 17 / 27 mm | loss 0.58 / 0.39 s |
| left / right small 15.6 | 40 mm, far foot down to 21–26 N | loss 0.50–0.51 s |
| left / right moderate 24.9 | foot unload, falls | loss 0.33 s |

Without feedback S2 survives no push at all past ≈ 0.4–0.6 s, and undisturbed it departs at 1.4 s. **Every second of standing and every recovery comes from P2.**

### 2.5 Human capability

| Measure | V2 S2 + P2 | Human | Verdict |
|---|---|---|---|
| COM sway RMS | 1.86 AP / 0.62 ML mm | 4.1–4.3 / 1.7–2.0 (Foulger 2025) | alive, but ≈ 0.4 × human |
| COM sway frequency | 1.37 Hz | COP median ≈ 0.3 Hz (Yamamoto 2015) | **≈ 4 × too fast**: a stiff, high-bandwidth loop |
| COP RMS | 4.9 AP / 5.6 ML mm | 5.1 / 3.3 (soccer players, wide stance; Thompson 2017) | AP human, ML 1.7 × |
| COP velocity | 110 mm/s (contact-solver jitter even after smoothing) | 6–10 mm/s | not usable (reported, not judged) |
| Intrinsic ankle / hip / knee / trunk | §2.1 | as cited | inside ranges (hip at the top edge) |
| Damping | ζ 0.2: ankle ≈ 1, hip ≈ 8, lumbar ≈ 10 N·m·s/rad | 0.3–2 / 2–14 / 10–40 | inside |
| Response latency (body joints) | neural torque 79 ms (lumbar, knee), 104 ms (ankle) | EMG 100 ± 20 ms (60–145); active torque 99 ± 13 ms (ankle) | ankle human; trunk / knee torque ≈ 20 ms early (no electromechanical lag) |
| Ankle torque rise | 908 N·m/s (moderate push); 3,404 N·m/s (large) | 372 ± 267 N·m/s; peak 116 ± 32 N·m (Robinovitch 2002, lean-release) | **superhuman** |
| Load transfer | small lateral push unloads the far foot to 21–26 N | a 0.25 × limit push is well inside the human feet-in-place range (≈ 0.44–0.56 ×) | **fragile** |
| Recovery | forward 83 mm at 0.875 s, unsettled at 4 s | 56–70 mm at 0.5–0.6 s; done in 2–3 s (Rietdyk 1999) | too slow, underdamped |
| No-step threshold | forward 1.00 ×, lateral 0.32 × J_lim | ≈ 0.44–0.56 × | **both wrong, in opposite directions** |

## 3. Specification evidence: B, C, T, P (ablations on the S2 battery: `evidence/PPR3_S2V_*.json`)

| Variant | Score | What changed |
|---|---|---|
| S2 candidate | 18 / 18 | exit 1.43 s |
| **no T** (2 % floors) | 17 / 18 | **I6 lumbar lateral 47 < 55**; knee 99 → 55; hip 108 → 95; exit 1.21 s |
| **T low** (range ends) | 16 / 18 | E4 start-up drift 0.66°; I6 54.6 |
| **T high** | 15 / 18 | I1a ankle 1.51–1.60 ×; I3 hip 121 > 111; I5 lumbar 178 > 164 |
| **no C** (Hill only) | 13 / 18 | E4; I1a / I1b ankle 0.36–0.77 ×; I6; C1 = 0; exit 0.93 s |
| **C = PPR-2 indefinite hold** | 13 / 18 | I2 0.89 mgh; I3 402; I5 185; R1; C1 = 1.0 |
| **no B** | **18 / 18** | hip quasi-static 108 → 65; ankle I1a 0.95–1.45 ×; I2 0.25 |
| CURRENT V2 | 9 / 14 | ankle 10–21 × human; start-up COM 6.3 mm; exit 0.34 s |

- **T (revised joint-specific standing tone): supported, bounded on both sides.** It is a neural / feed-forward setting (excitation), not a body property.
- **C (persistent eccentric resistance): supported, as the relaxing Maxwell form.** Both the no-persistence and the indefinite-persistence alternatives fail. It is a body property (actuator law).
- **B (mid-range passive elasticity): literature-supported, not shown necessary.** This battery cannot distinguish it at standing amplitudes. It is a body property, and V2's existing neutral-zone term could carry it without new architecture.
- **P (continuous delayed postural control): the architecture is supported. The current controller is not adoptable.**
  - Supported: it stands; it is causal by construction and by test; it is separate from the body; it is required (§2.4).
  - Not adoptable: it fails human capability (§2.5).
  - It is a controller property.

## 4. Why PPR-3 stops (diagnosis, and the successor attempt)

**Diagnosis of the P2 failures (evidence §2):**
1. **Torque develops too fast.**
   - The explicit EMG → torque filter had to be removed during design to stabilise the loop (`PPR3_P2_DESIGN.md` §5, iteration 9). V2's 15 / 50 ms activation is the only lag left.
   - Result: ankle torque rises 2.4–9 × faster than human; forward balance holds up to the mechanical limit (T1 1.00 ×); sway runs at ≈ 4 × human frequency.
2. **There is no COM acceleration feedback and the lateral mode is underdamped.**
   - Welch & Ting and Pasma both needed acceleration feedback to fit physiological delays.
   - The lateral mode is a four-bar with 1.70 × mg/h gravitational stiffness, behind a 100 ms delay.
   - Result: lateral pushes ring, unload the far foot, and fail at 0.32 × the limit.

**The labelled successor P2b** (`explore/P2B_EXPLORATION.md`, `explore/P2B_IMPULSE_RESULTS.json`):
- It restores the physiological torque path (a 2nd-order EMG → torque filter) and adds acceleration feedback.
- Three literature variants span the range from P2 + K_A to fully Pasma-2017-fitted.
- **All three diverge from the entry undisturbed and noise-free**: COM 23–109 mm off by 8 s.
- No battery push was run on them.

**Conclusion.** This controller class has two regimes on this body:
- with physiologically slow torque it is unstable;
- with fast torque it is stable but superhuman forward and fragile laterally.

The class is independent per-channel delayed PID loops, summed through a static Jacobian transpose. Further gain iteration would be tuning, which the instruction forbids.

## 5. The decision needed (yours)

**1. Where do muscle contraction (EMG → force) dynamics belong?**

The literature puts ≈ 0.1–0.3 s of effective lag between neural command and ankle torque at sway frequencies. V2's activation (15 / 50 ms) supplies little of it.

| Option | What it means | Consequence |
|---|---|---|
| **(a) body spec (recommended)** | a muscle contraction-dynamics stage (excitation → activation → force: twitch / tendon) as a V2 actuator property | Every controller, and every non-PPR behaviour, inherits physiological torque development. Superhuman torque becomes impossible by construction |
| (b) inside P2 | the filter lives in P2 | Keeps V2 unchanged, but any other controller could still command torque instantly |

**2. Which controller class does P2 become?**

| Option | What it means | Consequence |
|---|---|---|
| **(a) model-based delayed multi-joint controller (recommended)** | State estimation from delayed multisensory input, with an internal-model predictor bridging the delay; coordinated output, e.g. full-state feedback on the sway modes, ankle / hip / four-bar | The standard account of human multi-segment standing. It is still causal: it acts on past sensed state plus its own efference copy |
| (b) independent PID loops plus acceleration feedback | P2's class, retuned | Already shown unstable here once torque is physiological |

Option 2(a) needs its own design and preregistration, on the **same frozen S2 + P2 battery**. The criteria would be unchanged, so P1, P2, M1 and T1 stay the bar.

**S2 does not need to change for either option.** Option 1(a) adds an actuator stage, which re-qualifies S2 on its battery.

## 6. Direct answers

**1. Can V2 now stand indefinitely enough for gameplay through physiological substrate + delayed control?**
**Undisturbed, yes:**
- 60 s with motor noise, no creep, clean start, alive (non-zero) sway.

**Not as a qualified architecture:**
- it is not robust to ordinary lateral disturbance;
- its sway is too small and ≈ 4 × too fast;
- its forward robustness is superhuman.

It is not ready for gameplay.

**2. Is the body mechanically compliant before feedback arrives?**
Yes. S2 qualified 18 / 18 inside the literature intrinsic windows:
- ankle 0.78–1.21 × Vlutters;
- hip 108, knee 99, lumbar 151 / 77 N·m/rad;
- small pushes resisted but compliant, with no yield.

In S2 + P2, the first 29 ms of every push is pure S2 mechanics, because the commands are bit-identical to the twin.

**3. Is all disturbance-dependent control demonstrably delayed?**
Yes.
- **By construction:** P2's control function receives only a frozen view of delayed samples, and every command is logged with the sample index each channel used.
- **By test:** on all 12 pushes, commands are bit-identical to the undisturbed twin until onset + 7 steps (29.17 ms). That is the neck's 25 ms delay applied to the first post-push state. Activation differs no earlier, and body-joint neural torque starts at ≥ 79 ms.
- **S2's excitation is constant** (component A).

**4. Are B, C and revised tone individually supported?**
- **T: yes**, bounded on both sides: no-T fails, low tone fails, high tone fails.
- **C: yes**, in its relaxing form: no-C fails, and PPR-2's indefinite hold fails.
- **B:** literature-supported, but **not shown necessary**: no-B passes 18 / 18.

**5. What does continuous postural control add?**
Everything beyond ≈ 1.4 s.
- Without feedback, S2 departs at 1.43 s undisturbed.
- The S2-replay twin loses balance from every push, small ones included, at 0.33–0.64 s.
- With P2, forward and backward small and moderate pushes recover in 0.7–1.0 s.

**6. Can the character still genuinely lose no-step balance?**
Yes:
- all four large pushes topple it at 0.23–0.25 s;
- the continuum is strict;
- the unrecoverable clip shows it.

But the forward threshold equals the zero-delay mechanical limit (1.00 ×), so forward it "saves everything it physically can", which is over-robust. Laterally it is fragile (0.32 ×).

**7. Are hip / trunk / knee mechanics now inside defensible human ranges?**
- **Intrinsic (S2): yes.** Hip 108 per side, at the top edge of 24–111; knee 99 (≥ 17); lumbar flexion 151 (55–164); lateral 77 (≥ 55). Damping is inside the ranges.
- **Closed loop: no.** Torque rise is superhuman, recovery is underdamped laterally, and the thresholds are out of range.

**8. Is there any frozen-pose behaviour left?**
Yes, three elements, all disclosed. None is SnapshotTone's PD, which S2 does not use.
- **(a) P2's joint-posture channel** on 10 null axes: axial rotations, shoulders, elbows.
  - It targets the entry configuration, delayed 75 ms, at 0.85 × the entry short-range stiffness.
  - It was added because motor noise random-walks axes that have no gravitational or task role.
- **(b) S2's persistent strain arm** (15 %, residual force enhancement).
  - It remembers displacement while activation is constant, and yields at the R± cap.
- **(c) P2's set-points** are the entry COM and segment offsets: a reference posture, as in human models.
  - S2's tonic target is computed once from the entry statics (feed-forward).

**9. Are there any hidden instantaneous feedback paths?**
None found in the neural path:
- by construction (frozen delayed view);
- by test (P5 on all 12 pushes);
- S2's excitation is constant.

What remains instantaneous is mechanical, and instantaneous in humans too: short-range stiffness, damping, strain arms, passive elasticity, the force–length capacity at the current angle, and contact.

The fast part not shown to be human is downstream of the delay: once P2's delayed command changes, V2's 15 / 50 ms activation turns it into torque faster than human muscle does (§5.1).

**10. What V2 specification changes should be adopted?**
My recommendation is below; nothing has been changed.

| Element | Recommendation | Kind |
|---|---|---|
| C, Maxwell strain arms + the bidirectional short-range-stiffness cap | adopt | body |
| T, ready-stance tone floors | adopt | neural / feed-forward setting |
| A2, minimum-effort rest statics | adopt | feed-forward law |
| B | optional, via the existing neutral-zone term; evidence neutral | body |
| P | adopt the architecture (continuous delayed control on past sensed state, causal by construction, separate from the body) but **not the current controller** | controller |
| Muscle contraction dynamics | add, if you choose option 1(a) | body |

**11. What remains before PVP can be unsealed?**
1. Your decision on §5.
2. A controller that passes the unchanged S2 + P2 battery.
3. Adopting the S2 elements into the spec.
4. A decision on the PVP entry fixture: PPR-3 shows the hover / rolled-foot entry is what caused the start-up transients.
5. Only then a single PVP replay, as validation.

**12. CPU and determinism?**
- **CPU:** ≈ 0.65 ms of CPU per 4.17 ms simulation step for the whole runner (solver 0.36, V2 passive model 0.23). S2 + P2 is ≈ 0.04 ms of that (S2 alone 0.022). Instrumentation and measurement add 0.23 ms.
- **Determinism:** every rerun is bit-identical:
  - S2: 056d1e4f346494a2 / 40f6ae59e748e961;
  - S2 + P2: a574337d3809985b / 4178181c7f012d8b;
  - the 12 review-clip runs were regenerated on the frozen controller with identical hashes (`render/ppr3_save_runs.mjs`; hashes in the outside-Git `FINAL_HASHES.txt`).

**13. What surprised you?**
- The PVP start-up transient came entirely from the hovering, rolled-foot entry. A flat-footed entry carries body weight within 4 steps with no settling rig.
- Minimum-effort statics gave hip-abductor tone of 4.0 % against measured gluteus medius 3.6 %, without targeting it.
- The hard axis is lateral. With feet apart, the frontal sway mode is a four-bar with 1.70 × mg/h gravitational stiffness.
- The loop was stable only when torque was superhuman. Using Pasma's own fitted human values on this body made it unstable without any push.
- B made no measurable difference at standing amplitudes.
- S2 without feedback survives no push, not even small ones, past ≈ 0.5 s, which matches a human body whose passive stiffness is below mgh.

**14. Exact commits / files?**

Commits:
- f7cef6b3: instruction;
- 594a6d37: S2 design, criteria audit, literature, frozen S2 battery;
- ca7674b5: S2 results 18 / 18;
- 932cd113: P2 design and frozen S2 + P2 battery;
- f53b7917: S2 + P2 results 10 / 14;
- the closing commit: P2b exploration, visuals, review page, this report, DECISIONS.md.

Files are in `review_artifacts/physical_character_v2/ppr3/`:
- `PPR3_DESIGN.md`, `PPR3_CRITERIA_AUDIT.md`;
- `PPR3_S2_PREREGISTRATION.md` + `PPR3_S2_FREEZE.json`;
- `PPR3_P2_DESIGN.md`, `PPR3_P2_PREREGISTRATION.md` + `PPR3_P2_FREEZE.json`;
- `research/` (3 literature reviews);
- `scripts/`, `params/`, `fixture/`, `evidence/`;
- `explore/` (P2b);
- `render/`;
- `review/PPR3_REVIEW.html` + `review/video/`;
- this report.

Records and clip data are outside Git (`review/OUTSIDE_GIT.md`).

**15. Exact localhost visual-review URL?**
http://127.0.0.1:8350/ppr3/review/PPR3_REVIEW.html

## 7. Disclosures

**P2 design iterations.** Eleven, before the freeze, are listed in `PPR3_P2_DESIGN.md` §5. Only undisturbed standing and 2 / 4 N·s impulses were used. The U4 sway bands were set with the candidate's sway known; the human values × [0.25, 3] are stated there.

**Visual runs.** The clips are presentation only. They do not use the battery's t = 2 s onset: pushes start at **t = 0.5 s**, because CURRENT V2 and S2 alone fall by themselves at ≈ 2–3.5 s.
- In the push scenarios, the S2 panel is the S2-replay twin (P2's undisturbed commands, no feedback).
- In STAND it is S2 alone (constant tone).
- CURRENT V2 and S2 also fall undisturbed inside the clip windows. That is their open-loop behaviour, not the push.

**Code state.**
- The frozen `scripts/ppr3_ctrl.mjs` was briefly edited for P2b. The edits were moved to `explore/` and the file restored, so it matches `PPR3_P2_FREEZE.json` again.
- The P2 qualifying run was made on the frozen file before any edit.

**Not run:** PVP-1A-DX, ABI, any tackle, recovery stepping, RUN-1 integration, moving balance, fall / recovery animation.
