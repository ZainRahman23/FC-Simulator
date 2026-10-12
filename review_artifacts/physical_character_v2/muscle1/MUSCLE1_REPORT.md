# MUSCLE-1 report: the physical muscle / actuator layer

**Outcome.** A reduced physiological actuator, **M1b**, passes its frozen preregistration: ankle 16 / 16, knee 14 / 14.

**The first candidate, M1, failed one criterion and is preserved.** Its first-tick force change was 1.11 % against a 1 % limit. The threshold was my preregistration error, but the cause is physiological: M1 had no electrochemical latency. M1b adds that latency (8.33 ms) and changes nothing else.

**What M1b does:**
- A neural command develops and relaxes force at human rates.
- An externally stretched, already-loaded muscle resists immediately, with S2's stiffness.
- The energy ledger closes; muscle history behaves as in humans.

**Stopped for your decision.**

**Unchanged:** PVP (sealed), the tackle, the slide, P2 (not retuned, no successor), RUN-1, the simulation, outcomes, colliders, the solver / timestep, S2 and P2 qualification results, and the canonical V2 spec.

| Document | File |
|---|---|
| Instruction (verbatim) | `sources/2026-10-12_user_instruction_muscle1_validate_physical_muscle_actuator_layer.md` (4b8e6654) |
| Audit | `muscle1/MUSCLE1_AUDIT.md` |
| Design | `MUSCLE1_DESIGN.md` |
| Preregistration | `MUSCLE1_PREREGISTRATION.md` (+ `MUSCLE1_FREEZE.json`) |
| Successor amendment | `MUSCLE1_AMENDMENT_M1B.md` (+ `MUSCLE1B_FREEZE.json`) |
| Literature | `research/FORCE_PRODUCTION_LITERATURE.md` (223 refs) |
| Evidence | `evidence/` |

## Answers

**1. Was Astra's actuator diagnosis correct?**

- **For CURRENT V2's canonical actuator: yes, exactly as stated.**
  - Activation sets only the torque envelope. Inside it, the implicit motor delivers the controller's request in one 4.17 ms tick.
  - Downward changes are never rate-limited.
  - The excitation runs 25 % above the request, so the envelope stays ahead.
- **For PPR-3's S2 actuator: the stated mechanism does not exist.** In S2, activation directly sets generated force (drive = a·capIso), and there is no request servo.
- **The conclusion still holds for S2,** for a different reason: S2 has no force-development stage either. Its force follows the command through a single 15 ms lag.
- **Verdict:** not materially wrong. Correct for CURRENT V2; mechanistically different but same conclusion for S2 (audit §4).

**2. What exactly is physiologically wrong with CURRENT V2's force-production path?**

- **It has no contraction dynamics.**
- V2 took Thelen 2003's activation constants (15 / 50 ms). In Thelen's model those are followed by tendon and contractile-element dynamics, which slow force development. V2 dropped that stage.
- **CURRENT V2 on top of that delivers torque by servo.**

| Isometric ankle step | 10–90 % rise | 90–10 % fall |
|---|---|---|
| CURRENT V2 | 3–14 ms | one tick (3.3 ms) |
| S2 | 33 ms | 110 ms |
| Human plantarflexors | 250–450 ms | 120–250 ms |

CURRENT V2 is "substantially faster than human" by the preregistered definition (finding A7).

**3. How much of PPR-3's excessive torque rise came from P2 versus the actuator?**

Moderate forward push, both ankles (`MUSCLE1_AUDIT.md` §3; `evidence/MUSCLE1_AUDIT.json`).

**In PPR-3** the actual torque rose at 1,122 N·m/s:

| Component | Share of the actual slew |
|---|---|
| P2's command (974 N·m/s) passed through activation, which kept 95 % of it | 82 % |
| Intrinsic mechanics (strain element, passive) | +20 % |
| Damping / window | −2 % |
| Servo | none in S2 |

**With identical commands through M1b** (Experiment C):
- active torque slew 256 N·m/s, i.e. 26 % of the command;
- total torque slew 313 N·m/s, inside the human plausibility range of 372 ± 267 (Robinovitch 2002, a weak reference). S2's 1,123 is above that range's mean + 2 SD.
- the large push goes from 3,645 → 864 N·m/s;
- the knee behaves the same way: moderate forward 1,272 → 245.

**So:**
- **P2 requested the fast change.** A fast neural command is not itself unphysiological: EMG can rise in tens of ms.
- **The superhuman physical rise is the actuator's.** A human-like force-production layer turns the same command into human-range torque rates.

**4. Can MUSCLE-1 produce human-like command→force timing?**

Yes (M1b, all amplitudes; amplitude-independent, as in humans).

| Muscle group | Rise / fall | Human range (rise / fall) |
|---|---|---|
| Plantarflexors | 325 / 175 ms | 250–450 / 120–250 ms |
| Dorsiflexors | 200 / 250 ms | 150–250 / 230–360 ms |
| Knee extensors | 200 / 160 ms | 165–235 / 120–200 ms |

- **Onset** (2 % of the change): 14–21 ms. Human EMD is 8.5–30 ms.
- **First tick:** zero change.
- **Ramps:** no overshoot; the steady state equals the command.
- **Knee flexors:** reported only, because their parameters are borrowed from the extensors (no human data).

**5. Can it simultaneously preserve immediate mechanical resistance?**

**Yes, and better than S2.**
- **Stretch stiffness at the end of a 41.7 ms ramp** = S2's (M1b / S2 0.998–0.999 at the ankle, 0.994–0.999 at the knee). Ankle Vlutters ratio 0.82–1.19.
- **First-tick stretch response:** 1.00 of the intrinsic response. S2 manages only 0.78 / 0.19 at the ankle, because its window clipped the loaded plantarflexors for one tick. That is a mechanical defect found in this audit and corrected in M1b.
- **C1 relaxation fractions:** unchanged (0.465 / 0.367 / 0.223).
- **Quick release:** recoils immediately and is stable.

**The timing was not bought by softness.** At steady state developed force equals activation, so standing mechanics are identical to S2's. Only command-driven transients are slower.

**6. What is the minimum state required?**

Per actuator axis, both muscle groups:

| State | Count | What it represents |
|---|---|---|
| activation a± | 2 | already in V2 |
| developed force f± | 2 | **new**: contraction dynamics |
| strain-arm forces | 3 | replace S2's three strains |
| 2-step excitation delay line | 2 × 2 | electrochemical latency |
| bookkeeping | 2 | — |

That is 13 floats per axis, against S2's 7.

**Considered and excluded** (`MUSCLE1_DESIGN.md` §3):
- an explicit tendon length;
- contractile-element length / velocity;
- fibre-type activation;
- fatigue.

**7. What do the existing 15 / 50 ms dynamics actually represent, and should they remain?**

- They are Thelen 2003's **activation** (Ca²⁺ excitation–contraction coupling) constants, a model parameter.
  - In CURRENT V2 they only bound the envelope.
  - In S2 they are the whole force-production lag.
- **Keep them, as the activation stage only.** The contraction lags τc were derived *given* 15 / 50 ms, so latency is counted once. No human measurement isolates activation by itself (literature §12.1).

**8. Which S2 mechanisms survive without double-counting?**

| Mechanism | Survives? |
|---|---|
| **T** (tone) | Yes, unchanged. Steady state f = a, the same tonic force |
| **B** (passive) | Yes. Activation-independent; still "not shown necessary" (PPR-3) |
| **Damping** | Yes, now on stiffness from developed force |
| **Minimum-effort statics** | Yes |
| **Short-range caps** | Yes, corrected: one reserve, available within the step for a non-shortening side, never stacked on force–velocity |
| **15 / 50 ms activation** | Yes, as activation only |
| **C** | Yes as a phenomenon, **with a redesigned law** (Q9) |

Stiffness is counted once (M1b / S2 0.994–0.999), and latency once (τc is the remainder after activation).

**9. Is C energy / history consistent?**

**S2's C law is not.**

- **It creates energy.** It is a secant law, τ_E = K(activation)·strain. Raising activation after a stretch increases the stored strain force with no motion:
  - 0.026 J created against a 0.028 J stretch input (BC1);
  - small amounts even from force–length changes.
- **It restores abolished enhancement.** After 0.5 s at zero excitation, reactivation brings back 51 % of the pre-deactivation strain torque (BC2). Humans lose residual force enhancement when force reaches zero (Herzog 2018).
- **Verdict:** an artificial history brake, rejected.

**The redesign is consistent:**
- arms hold forces;
- stretch loads them incrementally;
- detachment dissipates them when developed force falls;
- newly attached bridges are unstrained.

Results: zero energy created; ledger residual ≤ 2 × 10⁻¹⁵ J; enhancement after reactivation 0.04 %. With constant activation it is identical to S2's arms.

**Caveat:** my preregistered BC1 *ratio* test did not discriminate. S2 also passes it, because the relaxing arms absorb energy on the return. The creation shows in the exact ledger, not in that ratio.

**10. Does the model generalize to the second joint?**

**Yes.** The knee passes all 14 judged rows with the same equations and knee-specific τc (extensors 88.8 / 45.3 ms):
- rise 200 ms, fall 160 ms;
- stiffness = S2's;
- first-tick stretch response 1.00;
- energy and history consistent;
- replay valid.

The knee flexors' τc are borrowed from the extensors (literature gap). That is labelled [D].

**11. What should future controllers command?**

- **Excitation per muscle group** (u±), or a net-torque intent that **the body** converts to excitation at its own fixed capacities (S2's `solveFloors`).
- **Never a desired physical torque** (CURRENT V2's path; bypasses force development) **or activation** (skips Ca²⁺ dynamics).
- The delay line, a and f are character state. No action-specific controller can bypass them, whether running, kicking, tackling or goalkeeping.
- **Consequence:** P2 was designed for a fast actuator. P2b showed that this controller class goes unstable when torque is physiological. The next balance controller must be designed on M1b (your "coordinated delayed no-step balance" milestone).

**12. Should the muscle dynamics become canonical V2 character state?**

**Yes**, if you accept M1b: the 13 floats per axis, included in the snapshot and hash.

The evidence supports the full set:
- realistic force development;
- realistic relaxation;
- immediate mechanics;
- no double counting;
- energy closure;
- two joints;
- determinism;
- cost.

**13. What exact V2 specification changes would eventually be required?** (Recommendation; nothing applied.)

1. **Actuator law.**
   - Replace the request-servo path with: excitation → 2-step delay → activation (15 / 50 ms) → developed force (τc,rise / τc,fall per muscle group) → active torque f·capIso(θ).
   - The window follows the reserve rule of design §4.2.
   - Keep V2's implicit motor for the mechanical terms.
2. **Short-range stiffness on developed force** (S2's θ_y constants), with the bidirectional cap from developed force.
3. **C as force-based strain arms** with detachment / attachment (S2's fractions and time constants).
4. **The S2 neural settings:** tone floors T; minimum-effort statics. B optional.
5. **Controller contract:** excitation or a torque intent inverted by the body. SnapshotTone / PD servo retired for physical characters.
6. **τc table for the remaining muscle groups** (hip, trunk, neck, shoulder, elbow, ankle inversion / eversion), from literature. **This is a gap:** only the ankle and knee were reviewed.
7. **To decide:** tendon saturation of stiffness at high force (an explicit series element) before high-force actions such as kicks, sprints and tackles. At near-maximal activation the lumped stiffness exceeds human tendon-limited values.
8. **Snapshot / hash:** include the new state.

**14. CPU, determinism and state / snapshot cost?**

| Item | Value |
|---|---|
| M1b CPU per axis-step | 0.54 µs (S2: 0.32; CURRENT V2: 0.27) |
| M1b per character (35 axes) | **19 µs per step**, ≈ 3 % of PPR-3's measured 0.65 ms runner step |
| Determinism | every run bit-identical (5a507b69e3dfd8a6 twice). M1, S2, CURRENT V2 and M1a reproduce identically across runs |
| State | 13 floats per axis, against S2's 7: **+210 floats per character** |

**15. What surprised you?**

1. **Astra's mechanism lives only in CURRENT V2.** S2 already let activation govern force. Yet S2 was still almost as fast, because nothing slowed force after activation.
2. **About 87 % of PPR-3's torque slew was requested by P2.** Through a human-like muscle the same request becomes 26 %. The "superhuman corrective torque" was mainly the actuator's.
3. **S2's window silently clipped the immediate stretch response** of the loaded plantarflexors for one tick (19 % of intrinsic at a moderate stretch). Only the single-axis fixture showed it.
4. **S2's C law creates energy** when activation rises (about 94 % of the stretch input), and remembers enhancement through deactivation.
5. **M1b changes nothing at standing steady state,** yet slows command-driven force about 10×.
6. **The often-cited "40 ms first-order" muscle filter (Welch & Ting) was assumed, not fitted.** Fitted human values are 0.2–0.6 s.
7. **My own error:** I set A4's 1 % threshold without checking the 1.11 % that my design script had already printed.

**16. Exact commits / files?**

Commits (local, not pushed):

| Commit | Content |
|---|---|
| 4b8e6654 | instruction |
| 77630dc8 | audit, literature, design, preregistration and freeze, PPR-3 captures |
| 6c68177b | M1 results (FAIL, A4) |
| ee2c1460 | M1b amendment and freeze |
| bae8ceae | M1b results (PASS) |
| closing commit | this report, review page, DECISIONS.md |

Files are under `review_artifacts/physical_character_v2/muscle1/`:
- `MUSCLE1_AUDIT.md`, `MUSCLE1_DESIGN.md`, `MUSCLE1_PREREGISTRATION.md`, `MUSCLE1_AMENDMENT_M1B.md`, `MUSCLE1_REPORT.md`;
- `MUSCLE1_FREEZE.json`, `MUSCLE1B_FREEZE.json`;
- `params/MUSCLE1_CANDIDATE.json`, `params/MUSCLE1B_CANDIDATE.json`;
- `scripts/m1_{capture,kit,models,fixture,experiments,eval,audit,design_derive}.mjs`;
- `evidence/` (captures of the frozen PPR-3 runs with P2's exact command histories; `CAPTURE_INDEX.json`; audit; M1 and M1b results and verdicts);
- `research/FORCE_PRODUCTION_LITERATURE.md`;
- `render/m1_review_build.mjs`, `review/MUSCLE1_REVIEW.html`.

**17. Exact localhost review URL?**

http://127.0.0.1:8350/muscle1/review/MUSCLE1_REVIEW.html

## Your decision

1. **Adopt M1b** (Q12–13) as V2's physical actuator layer, plus the controller boundary (Q11).
2. **Then the next milestone you named:** coordinated delayed no-step balance, designed on the M1b body. P2 / P2b's PID class is not expected to carry over.
3. **Optional before that:**
   - the τc review for hip, trunk and the other groups (Q13.6);
   - the tendon-saturation decision (Q13.7).

**Not started:** P2 successor, PVP, tackle, stepping, RUN-1 integration.
