# Corrected-knee qualification v2: results

**Inputs:**
- **Preregistration:** `QUALIFICATION_V2_PREREG.md`, frozen at commit **56a87b8**, before any run of this sequence.
- **Evidence:** `evidence/qual/` (scripts, logs, results; large files gzipped).
- **Configuration under test:** `v2k` central + k 0.13 + reference twist + lifecycle (`E1_PREREGISTRATION_V2_CONFIG.md`).

**Status:**
- **E1a NOT run.** Nothing pushed.
- The v1 preregistration, its results and FAIL verdicts, the old knee and all historical evidence are unchanged.

## 0. Bottom line

**E1a is NOT READY TO AUTHORISE. One item blocks it, exactly the one preregistered as expected to fail:** the G1 V1-matched "upright" passive collapse into a splayed-leg rest on the hip's combined end range.
- Row 1.S′ / 1.3d: 2.09° at hip_L.rot vs the 1.5° tolerance.
- The perturbed ensemble: V1-matched upright fails 15 / 15, so the systematic-scenario rule fails, although the overall rate (5.3 %) is within its 8.1 % bound.

**Everything else qualifies on frozen code:**
- corrected-knee mechanics (with the superseding criteria, and controls that still discriminate);
- E1a-envelope knee behaviour on all 8 bodies;
- G0, G2 and G3 in the adopted configuration (G3 with K′, and J2a 81 / 81 re-measured with the lifecycle);
- the twist battery;
- energy, determinism and browser = Node (adopted and default configurations);
- timestep at 180 / 240 / 480 Hz;
- yaw-decomposition observability.

## 1. Process record (nothing hidden)

| item | what happened |
|---|---|
| freeze | Battery run from a scratch copy of 56a87b8 (clean worktree). Q0a at start: 4 / 4 default-path G3 hashes = `hash_head.txt`; suite 52 / 52; `guard_v1` OK |
| **tool bug during the run** | The KV6c tool's new hard-limit report (added at the freeze) had a line comment inserted mid-statement, so every KV6c job failed to start (SyntaxError). **Fixed in commit ed59b3b** (tool only; no criterion, parameter or simulation change), per prereg Q8. Dev check: without the new options the fixed tool reproduces the official 097dcb7 KV6c output exactly. The 15 KV6c jobs (Q2a, Q2b, Q6b) were re-run on ed59b3b. No other item used the tool |
| evaluation-script bug | My first Q0b comparison keyed G3 jobs by key / human / group, so it collided on the ablation variants and flagged 32 "differences". Keyed by the full job definition, all 332 G3 jobs are identical (329 hashes + 3 snapshot results). Script fixed (`evidence/qual/scripts/eval_q.mjs`); no data changed |
| browser checks | Served from the worktree on 8172 at ed59b3b (viewers identical to 56a87b8; only the KV6c tool differs) |
| G2 row D display | It prints "browser undefined/undefined" because the evaluator's text expects other fields. The gate logic uses `allPass` (6 / 6 true); the accepted browser file has the same shape |
| not re-measured (declared in the prereg) | G2 2.5 / G3 S2 controller cost (`final_pre_e1a/RATE_PERFORMANCE.md` §2) |

## 2. Results by item

| item | result | evidence / values |
|---|---|---|
| **Q0a** default path | **PASS** | KV0 4 / 4 G3 hashes identical; suite 52 / 52 (R9.a–b incl.); `guard_v1` OK |
| **Q0b** the officially qualified knee | **PASS** | G1 74 / 74 run hashes, G3 332 / 332 jobs, perturbed sweep 300 / 300 runs identical to the official 097dcb7 runs in the same configuration |
| **Q1** mechanics | **PASS** | KV1a–e, a′; KV2a; **KV2b′** a, b (30 runs) and c (orders 0.85 / 0.65 / 1.10 / 3.83 / 2.35); KV3a; **KV3b′** (24 cycles); KV4a.1–2 (\|z\| ≤ 1.11); **KV4a.3′** (ratio 0.500, max step 0.027°); KV4b (42 / 42 within 0.001°); KV6a; KV6b (7.57°); KV7a (≥ 33.9°); KV7b (3.00°); KV8. The originals KV2b / KV3b / KV4a.3 are FAIL again (as recorded in v1) |
| Q1 controls | **discriminate** | Old knee: KV2b′ a, b in every run and c (0.72 / 0.72), KV3b′, KV4a.3′ (0.501). naive, inject and spring: KV2b′ and KV3b′ FAIL. Stepped: KV4a.3′ FAIL (ratio 1.000). G1-5′: corrected knee PASS, old PASS, naive FAIL |
| **Q2a** KV6c, adopted configuration, 8 bodies | **PASS** | 8 / 8 stood; slip 0.246–0.257 mm; \|θ − θ0\| ≤ 1.40° (initial pose; 0.09–0.11° from 1 s); flexion 3.6–29.7° (E1a-16 inside 8 / 8; E1a-17 forecast ≤ 3° 8 / 8); knee-axial work ≤ 0.016 J actuator / 0.003 J passive; **hips ≥ 27.4° from every hard limit** |
| **Q2b** determinism | **PASS** | V2-REF twice: byte-identical output |
| **Q2c** deep-family irrelevance | **PASS** | 8 members × 3 bodies: one hash per body; knees ≤ 29.71° |
| **Q3a** G0 | **PASS** (in scope) | every row; 0.V1 needs the git checkout: worktree guard OK |
| **Q3b** G1 full (G1-5′) | **FAIL: 1.S′ only** | **Row 5 passes under G1-5′.** 1.S, 6, 1.6a, 1.6b, 5c, **8 (timestep)**, 7.HS, 1.1f, 1.E pass. **1.S′: V1-matched upright 1.3d = 2.09° at hip_L.rot (≤ 1.5°)**; every other V1-matched scenario passes. KV7c holds: runs identical to the official ones, 22.0 × 1.5 + 1 = 34.0° ≤ 36.9° |
| **Q3c** G1 perturbed ensembles | **FAIL: systematic scenario** | 16 / 300 = **5.3 %** (≤ 8.1 % ✓); **V1-matched upright 15 / 15** (1.3d, hip); V1-matched singleLeg 1 / 15 (1.3a); no energy event, no invalid manifold |
| **Q3d** G2 (adopted) | **PASS** | 11 / 11 gating rows (2.1, 2.2a, 2.2b, 2.3, 2.4, S4, S5, F, D with browser 6 / 6, E) |
| **Q3e** G3 v3.3 (adopted, K → K′) | **PASS** | 17 / 17 gating rows. **J2a 81 / 81** (mirroring the lifecycle state; worst \|Δτ\| 3e-11 N·m); **K′ PASS** (λ 1.4 and 1.4-supervised fell; λ 1.2 feasible at +1.1 cm and stood; the original K FAILs, as recorded); O 4 / 4; L, N, Q pass |
| **Q3f** twist battery | **PASS** | Reference: every frozen criterion except C7 (V2-165-62, V2-198-92: unloaded-foot drag); **C7′ none, C1′ none**. "Current": C1′ fails on 5 bodies, plus C2 (6), C3 (7), C4 (6), C5 (2) and C6 (8) |
| **Q4** energy | **PASS** | G1 1.2a / b in every run; G2 E (residual ≤ −0.285 J); G3 L (≤ −0.286 J); KV2b′ a / KV3b′; twist C2 (PY4 hip work ≈ 0); boundary harness ≤ 8.4 mJ per tick |
| **Q5a** Node determinism | **PASS** | G2 D (×3, snapshot 3 / 3); G3 N (×3, snapshot bit-exact); Q2b |
| **Q5b** browser = Node, adopted | **PASS** | G1 10 / 10, G2 6 / 6, G3 4 / 4 |
| **Q5c** browser = Node, default | **PASS** | G1 10 / 10, G2 6 / 6, G3 4 / 4 against the accepted results |
| **Q6** timestep | **PASS** | KV8 and G1 row 8. KV6c at 180 / 480 Hz: all stood, ≤ 1.41°, flexion max identical to 240 Hz. Boundary harness 180 / 240 / 480 Hz × 3 bodies: stood, no chatter, closure ≤ 8.35 / 5.43 / 1.35 mJ per tick. PY4 180 / 480 Hz: DECAYING, hip work ≤ 1.5e-5 J |
| **Q7** yaw decomposition | **PASS** | 9 stance-leg decompositions (A both legs, B the stance leg; 3 bodies), all 5 contributions; telescoping exact; A closure ≤ 0.017°; **no masking flag**. A: pelvis 10.73° = ankle 9.79 + knee 0.20 + hip 0.74 (+ upper 0.95); old knee 9.80 / 0.19 / 0.75. B closure 0.76° (known method limit) |

## 3. The blocker: smallest unresolved item

**What:** in G1's V1-matched "upright" passive collapse (actuators off) with the corrected knee:
- the evidence-calibrated reference path rotates the tibiae internally as the knees buckle, so the planted feet turn the femurs outward;
- the body collapses splayed and comes to rest on the hip's combined flexion–abduction–rotation end range.

**The rest exceeds G1's settled tolerance** (`evidence/qual/hip_margin_diag.log`):
- hip rotation **2.09° (L) / 1.48° (R) beyond** the hard limit;
- the swing-z axis 2.9 / 1.4° inside its limit;
- up to 6.2° beyond during the collapse.

**What it is not:**
- not a knee defect (the knee rests inside its envelope);
- not dependent on the provisional deep-flexion parameters (it splays in 15 / 15 members of every deep-flexion cell);
- not caused by k (present at k = 0, 1.53°).

**Why it matters only to G1:**
- In E1a-like support in the adopted configuration (U:R single support + 2.5 cm pelvis drop; the 8-body pelvis drop), **the hips stay ≥ 27.4° from every hard limit on every axis.**
- E1a-10 (no joint beyond its hard limit at any tick) would fail any E1a run that approached it.

**Alternatives:**

| | option | effect | cost / risk |
|---|---|---|---|
| **A** | **Your scoping decision:** record 1.S′ V1-matched upright (and its perturbed systematic) as a known G1 exception that **does not gate E1a**, with no change to the tolerance, the hip or the knee. It is carried as debt that must close **before any stage that certifies passive falls or collapse** (G4 falls / ragdoll) | E1a becomes authorisable on the evidence above | A gating G1 row is knowingly open; E1a-10 guards E1a itself |
| **B** | An **evidence-first review of the hip's combined end range** (rotation limits and end-stop behaviour in deep flexion + abduction). The splayed rest loads them at about 45–72 N·m. Then re-run G1 | May resolve the G1 row properly | Touches approved anatomy (needs your approval); hours to days; could change other G1 / G2 outcomes |
| C | Change the knee's low-flexion path or pick deep-flexion parameters to avoid the splay | — | **Not acceptable:** selection by G1 score, against your instruction and the evidence |
| D | Loosen 1.3d, or revert to the old knee | — | Rejected by your instruction |

**Recommendation: A now, B scheduled.**
- The finding is genuine and stays recorded, but its mechanism lies outside E1a's envelope.
- The only element it loads, the hip's combined end range, is neither approached by E1a (≥ 27° margin) nor permitted in E1a (E1a-10).
- B is the correct way to close the G1 debt. It is a separate approved review, not something to fold into E1a.
- I have **not** applied A. It is your decision.

## 4. If you choose A

- E1a runs exactly as preregistered:
  - criteria: `E1_PREREGISTRATION_V2.md`, frozen;
  - configuration: `E1_PREREGISTRATION_V2_CONFIG.md`, frozen;
  - code: ed59b3b, or a later commit that changes no simulation path.
- **Still only after your explicit approval.**
