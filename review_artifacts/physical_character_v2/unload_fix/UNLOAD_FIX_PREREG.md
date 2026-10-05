# B1 + B3 unload fix: preregistered validation (frozen BEFORE any production change)

**Authority:** `../sources/2026-10-05_user_decision_implement_b1_b3.md`.
- Implement B1 and B3 exactly as proposed in `../e1a/E1A_UNLOAD_INVESTIGATION.md` §8, subject to this validation.
- No Option A (release-on-request).
- The 1 % load-based release is unchanged.
- E1b unauthorised.

**Status:** committed before any production code changes.
- No criterion, dataset or threshold below is changed after a result exists.
- A later defect is recorded as an erratum next to the frozen text.
- The failed E1a evidence (`../e1a/official/`) is preserved unchanged.
- The default behaviour stays behind default-off flags until qualification is complete.

**Architectural rule** (applies to every item):
- The controller or lifecycle may withdraw or redirect control authority.
- It may never kinematically lift, teleport, pin, detach or force a foot.
- The physics decides motion and contacts.
- Checked in every run: authority writes = 0, external impulse = scheduled test impulse only, and the foot displacement across a release (§3, A4).

## 1. The two changes (exact definitions; both default off; no tuned parameter)

### B1 (controller option `ffLockedAxis`, default false): locked-axis-consistent feed-forward

**Scope:** joints with **one locked swing axis, an actuated twist (x) and one actuated swing**. In this skeleton that is the knees (locked z, "varus") and the elbows (locked z, "carry"); no other joint has the structure.
- The **ankle** is different: an unactuated free twist and two actuated swings. Projection onto two actuated swing rows already reproduces both swing generalized forces exactly, because both rows lie in the plane ⊥ x̂. So the ankle gets no correction.

**Identity:**
- The relative rotation is q = q_swing ⊗ q_twist(t) (Jolt pyramid swing–twist, constraint space), with the locked swing held at 0.
- The free swing DOF then moves about **j_sy = rot_x(−t)·ŷ = (0, cos t, −sin t)** in body-2 axes. This is the geometry the passive layer already uses (`sim/v2_passive.js`, G1 locked-axis rows).
- The twist DOF moves about **x̂**.
- The actuated rows apply τ = τ_x x̂ + τ_y ŷ. The locked axis has no actuator; the constraint does no work on admissible motion.
- The required generalized forces of the controller's statics torque T are **Q_tw = T·x̂** and **Q_sy = T·j_sy**.
- Hence **τ_x = T·x̂** (unchanged) and **τ_y = (T·j_sy)/cos t = T·ŷ − tan t·(T·ẑ)**.

**In the controller:**
- t = the twist from the constraint-space decomposition of the joint's current relative rotation (the same `ev.qs` the controller already uses).
- The correction replaces only the y-row feed-forward of those four joints.
- The posture-PD rows are unchanged. Their cos² t effective-stiffness factor (≥ 0.98 at |t| ≤ 8°) is reported, not changed.
- Singular only at |t| = 90°. The knee twist is bounded by its limits (≤ about 30°), the elbow pronation by its own.

### B3 (controller option `shareCap`, default false): requested share bounds commanded share below the unloaded level

**Rule:**
- When a transfer request exists and a foot's requested share r_n is below the lifecycle's existing unloaded level `loadOff` (fraction of body weight; 0.01, the lifecycle's own constant), that foot's commanded share is clamped so that it does not exceed r_n.
- Implemented on the controller's load split t (left share): `t ≤ r_L` when r_L < loadOff; `t ≥ 1 − r_R` when r_R < loadOff.
- The remainder goes to the other foot. The per-foot CoP distribution and the hip strategy (r) act as before.

**What B3 does not do:**
- It does not command any lift.
- It does not change any lifecycle constant.
- It does not touch a foot whose requested share is ≥ loadOff.

## 2. Bench validation V1 (B1)

**Domain:**
- knees (L, R) and elbows (L, R);
- twist t ∈ {−10, −9, …, +10}°;
- flexion (free swing) ∈ {0, 5, …, 60}° (elbow {0, 10, …, 120}°);
- locked swing = 0;
- 40 random statics torques T per pose (seeded; |T| ≤ 100 N·m, with a frontal component in every sample).

**Independent reference:**
- The generalized forces Q_c = T·j_c.
- j_c is computed **numerically**: the central finite difference (h = 1e-5 rad) of the joint's world child rotation, R_parent·F1·pyr(·)·F2⁻¹, with respect to each free coordinate.
- It does not use the closed form.

| # | criterion | threshold |
|---|---|---|
| V1.1 | the B1 rows (the controller's own exported function) reproduce Q_tw and Q_sy, with the rows' torque mapped through the same j_c | ≤ 1e-9 × max(1, \|T\|) N·m |
| V1.2 discrimination | the naive projection (τ_y = T·ŷ) misses Q_sy by exactly sin t·(T·ẑ) | identity holds within the same tolerance, and the miss is nonzero whenever t ≠ 0 and T·ẑ ≠ 0 |
| V1.3 | the B1 rows are mirror-equivariant: an L/R reflected pose and torque give mirrored rows | ≤ 1e-12 relative |
| V1.4 | flag off: the controller's feed-forward is bit-identical to the current code | identical |

## 3. Unloading characterization V2 (a separate dataset, not E1a)

### 3.1 Scenario family

- **Shared module:** `gates/v2_unload.js`, used by both the Node runner and the browser check.
- **Configuration:** the adopted pre-E1a configuration (`v2k` central, ankle k 0.13, G3 stand + `ikRefTwist` + `lifecycle`) plus the arm's flags.

**Timeline:**
- 0–1 s settle.
- Planned pelvis drop d (min-jerk, t0 = 1 s, dur 2 s).
- Transfer: the stance foot's requested share σ goes 0.5 → σ_end, min-jerk over 3–7 s, supervised (G3 supervisor defaults).
- Hold to the end, with **σ_end = 1 − r**.
- End: 11 s; 12 s for perturbation runs.
- The unloading foot is "n"; its requested share is r_n = 1 − σ.

**Factors:**

| factor | levels |
|---|---|
| body | all 8 (V2-REF, V2-165-62, V2-198-92, V2-175-70, V2-190-85, V2-short-legs, V2-long-legs, V1-matched) |
| unloading foot | L and R (both feet) |
| drop d | 0, 1.0, 2.0, 2.5, 3.0 cm (the specified range) |
| final request r | 0 (zero share), 0.5 % (below loadOff), 2 %, 3 %, 5 % (legitimate small nonzero shares, ≥ loadOff) |
| arm | **ORIG** {} · **B1** {ffLockedAxis} · **B3** {shareCap} · **B1B3** {ffLockedAxis, shareCap} |

### 3.2 Run sets

| set | definition | runs |
|---|---|---|
| **P** production | all factors, the lifecycle as is | 8 × 2 × 5 × 5 × 4 = **1600** |
| **R** residual measurement | zero share only; the lifecycle's release suppressed (`lifecycle: {loadOff: −1}`). A measurement mode for the support-state residual, never a candidate | 8 × 2 × 5 × 4 = **320** |
| **X** perturbation / release boundary | zero share, d = 2.5 cm, arms ORIG and B1B3. Thorax push 100 ms, lateral, **toward** or **away from** the unloading foot, J ∈ {2.5, 5} N·s, at t_p ∈ {**6.46 s** (σ = 0.990, analytic: just before release), **8.0 s** (σ = 1, after release in B1B3)} | 8 × 2 × 2 × 2 × 2 × 2 = **256** |
| **D** determinism | V2-REF L, 2.5 cm, zero share, B1B3; and V2-REF L, 2.5 cm, push toward 5 N·s at 8.0 s, B1B3; each ×2 | 4 |
| **W** browser = Node | V2-REF L and V2-REF R, 2.5 cm, zero share, B1B3: headless Chrome (`viewer/unload.html?check=1`) vs the Node result | 2 |

### 3.3 Measurements (per run)

- The lifecycle state sequence of both feet; release time t_rel (the first SUPPORT → UNLOADING of foot n).
- Requested and commanded share per foot, per tick.
- Measured normal loads (the probe; the sensed load).
- Stance-knee flexion posture PD and the locked-axis term tan t·(T·ẑ) at the same tick.
- Pelvis height target − actual.
- Stance-foot slip.
- Per-tick energy-ledger closure increment.
- Applied-torque and τ0 changes per tick; contact onsets.
- Authority writes; external impulse.
- Foot-n displacement across the release.
- Running state hash at every 1 s; full-rate load trajectory in [t_rel − 0.5, t_rel + 0.5] s.

### 3.4 Acceptance criteria

**B1B3, the candidate:**

| # | set | criterion | origin of the threshold |
|---|---|---|---|
| A1 | P, r = 0 (80 runs) | foot n **released by 9.0 s**; afterwards TOUCHING through the end with sensed load < loadOn; **no LOAD_ACCEPT after release**; **no chatter** (no state re-entered within 60 ms, either foot) | 9.0 s = E1a's unload time-out (prereg §2); loadOn = lifecycle constant; 60 ms = E1a-6 |
| A2a | P, r ∈ {2, 3, 5 %} (240 runs) | foot n **never released** (SUPPORT throughout): **no false release** | lifecycle semantics: a foot with a request ≥ loadOff is meant to carry it |
| A2b | P, r ∈ {2, 3, 5 %} | each B1B3 run **hash-identical** (every 1 s mark and the end) to the corresponding B1 run. B3 must be inactive when both requests are ≥ loadOff: legitimate shares are preserved | B3 definition |
| A2c | P, r = 0.5 % (80 runs) | commanded share of foot n ≤ 0.005 at every tick where its requested share is below loadOff. Release is permitted (the lifecycle's own rule) | B3 definition |
| A3 | X (B1B3, 128 runs) | **(a)** no fall or step in any 2.5 N·s case. **(b)** In every case B1B3's outcome class is no worse than ORIG's for the same case: no new physical failure. **(c)** After each push, foot n enters LOAD_ACCEPT at most once and is released again at most once; no state re-entered within 60 ms. **(d)** Stance slip ≤ 20 mm in every non-falling case | (a)–(c) the user's requirement / E1a-6; (d) G3 H1 recovery standard |
| A4 | P (B1B3, 400 runs) | **energy:** closure increment ≤ +0.05 J every tick; Σ positive ≤ 0.5 J per run. **Torque continuity** (t ≥ 0.5 s): applied Δτ ≤ 10 N·m per tick (≤ 25 N·m at a contact-onset tick and the next); Δτ0 ≤ 30 N·m. **No forcing:** authority writes 0; external impulse 0; foot-n horizontal displacement over [t_rel − 0.1, t_rel + 0.5] s ≤ 0.5 mm | E1a-7 / E1a-8; the no-forcing rule |
| A4x | X (B1B3) | energy closure and authority / impulse as A4 (impulse = the scheduled push to 1e-9 relative); Δτ reported only (a push is itself a step input) | G3 row L |
| A5 | D | both pairs bit-identical (all hashes) | E1a-11 |
| A6 | W | browser hash = Node hash, 2 / 2 | G-gate browser rows |
| A7 | P, ORIG, d = 2.5 cm, r = 0, foot L | **reproduces the official failure:** no release by 9.0 s on all 8 bodies (and foot R on V2-REF), with state hashes identical to `../e1a/official/` at every 1 s mark up to 9 s. The harness consistency check | — |

**Causal separation** (set R, zero share, all bodies and both feet, d ≥ 1.0 cm unless stated). Definitions:
- R_arm = the support-state residual of foot n (mean sensed load, last 0.5 s).
- f_PD = \|stance-knee flexion posture PD\| / \|tan t·(T·ẑ)\| (mean, last 0.5 s; evaluated where \|tan t·(T·ẑ)\| ≥ 1 N·m).
- F_leak = the commanded-share force of foot n (share × M·g; mean, last 0.5 s).

| # | criterion |
|---|---|
| CS1 (B1 removes the mapping residual) | f_PD ≤ 0.10 in **B1** and **B1B3**; f_PD ≥ 0.50 in **ORIG** and **B3** |
| CS2 (the large residual is B1's) | R_ORIG − R_B1 ≥ 0.5 · R_ORIG, for d ≥ 2.0 cm |
| CS3 (B3 acts on the leak only) | commanded share of foot n = 0 at every tick with r_n < loadOff in **B3** and **B1B3**. \|(R_B1 − R_B1B3) − F_leak,B1\| ≤ 0.25 % BW (B3 removes approximately the leak it suppresses, no more) |
| CS4 (B3 alone does not remove the mapping residual) | f_PD (B3) within ±0.15 of f_PD (ORIG) |
| CS5 (combined) | R_B1B3 ≤ 0.5 % BW (the resting-contact band of a touching unloaded foot, `../final_pre_e1a/E1_PREREGISTRATION.md` §1), at all drops including 0 cm |

ORIG, B1 and B3 are **diagnostic arms**. Only B1B3 is a candidate; its acceptance is A1–A6 + CS1–CS5.

## 4. Regression V3 (configuration under test = adopted + `ffLockedAxis` + `shareCap`)

| # | item | pass rule |
|---|---|---|
| V3.1 | KV0: flags off, the default path | 4 / 4 G3 hashes = `hash_head.txt`; the component suite all pass, including new regressions R10 (flags default off; B1 function = identity V1.1 on a sample; B3 clamp semantics; mirror) |
| V3.2 | bench | V1 (§2); the knee bench / rig `--crit=v2` unchanged (passive layer untouched: identical output) |
| V3.3 | G0 (`V2_KNEE_MODEL=v2k`) | every row (0.V1: worktree guard) |
| V3.4 | G1 full (v2k, k 0.13, `V2_KNEE_CRIT=v2`) | no controller in G1. **Every run hash identical to qualification v2** (`../knee_correction/evidence/qual/q3/g1_results_qual.json.gz`); verdicts as there (1.S′ remains the recorded KC-4 exception) |
| V3.5 | G2 v1, adopted + flags | every gating row (D with the re-measured browser) |
| V3.6 | G3 v3.3, adopted + flags | every gating row with K′; **J2a 81 / 81 re-measured with the flags**; O browser 4 / 4 |
| V3.7 | twist battery, reference + flags, 8 bodies × 12 scenarios, k 0.13 | reference meets C1′, C1q, C2–C6, C7′ (as qualification v2) |
| V3.8 | KV6c, 8 bodies, adopted + flags + lifecycle | as qualification v2 Q2a: no fall, slip ≤ 0.5 mm, \|θ − θ0\| ≤ 2.0° |
| V3.9 | boundary harness, 3 bodies × 180 / 240 / 480 Hz | no fall, no chatter, closure ≤ +0.05 J per tick |
| V3.10 | KV10 yaw decomposition, scenarios A / B, 3 bodies | telescoping exact, A closure ≤ 0.3°, no masking flag |

**Stop rule:** a substantive new physical failure attributable to B1 or B3 stops the task (no adoption). Examples:
- a previously passing gating row now failing;
- a fall, chatter or energy event;
- a false release.

A regression failure is not reinterpreted.

## 5. Adoption and E1a (only if V1, V2 (B1B3) and V3 all pass)

1. **Adopt and version:** `E1_PREREGISTRATION_V2_CONFIG_B.md`, configuration B = the current addendum + `ffLockedAxis` + `shareCap`. The flags stay default-off in code; configuration B selects them.
2. **Re-freeze E1a** without changing any behavioural criterion, protocol step, threshold or timing. The harness and evaluator change only their configuration assertion: they require configuration B.
3. **Rerun E1a exactly as originally intended:** 8 bodies L-lift, the mirrored V2-REF R-lift, and the V2-REF repeat; evaluated with the frozen criteria.
4. **If liftoff occurs**, the preregistered sequence continues (lift → hover → replace / touchdown → load acceptance) and every criterion is evaluated.
5. **If E1a fails at a new stage**, it is preserved and the task stops for review. Nothing is tuned from the E1a outcome.
6. **E1b is not started** unless E1a passes, and not without your authorisation.

## 6. Carried debt (not solved here unless it invalidates qualification)

- posture-authority withdrawal (D-2);
- slow pelvis settling (D-3);
- hip combined end-range review (TD-16);
- any elbow consequence beyond the mapping correction itself.

## Erratum E-1 (recorded 2026-10-05, BEFORE any characterization run; no result existed)

**The flaw:** §3.2 set R specified release suppression as `lifecycle: {loadOff: −1}`. B3 reads the lifecycle's `loadOff` (§1). With −1, B3 would be inactive in every R run, so the B3 / B1B3 residual arms would not test B3, which invalidates CS3–CS5.

**Correction (measurement mode only):** release is suppressed by a diagnostic hook in `gates/v2_unload.js`. It blocks the lifecycle's SUPPORT → UNLOADING / LIFTOFF transition and leaves `loadOff` (0.01) and every other constant unchanged.

**Unchanged:** the runs, factors, criteria and thresholds. Set R remains a measurement mode, never a candidate.

## Development record (before the official runs; recorded at the implementation freeze)

**Development smoke checks** (4 manifest runs on V2-REF plus the bench). Not official evidence; the official runs repeat everything on the frozen code.

**Harness bug found by the A7 smoke:**
- The ankle neutral-zone stiffness is baked into the body spec at generation (`spec/v2_joints.js`).
- The runner generated the spec before setting the 0.13 override, so the smoke runs carried k = 0 and the original arm did not reproduce the official E1a hashes.
- **Fixed:** `unloadSpec()` sets the override before generating the spec, and `unloadSim()` asserts the spec's ankle k. After the fix, the original arm is hash-identical to the official E1a run at 1–9 s.

**Implementation fix found by the A6 smoke:**
- B1 used `Math.tan`, which broke browser = Node (Node and Chrome run different V8 versions).
- **Fixed:** the codebase's deterministic `dtan` (`core/v2_math.js`), the project convention for anything that feeds physics. After the fix, browser = Node.

**Observed in the smoke (correct configuration; criteria unchanged in response):**
- B1B3, V2-REF L, 2.5 cm, zero share: release at 6.475 s.
- After release, the unloaded foot did not remain TOUCHING. With no lift command it cycled TOUCHING → LIFTOFF → AIRBORNE → TOUCHDOWN → AIRBORNE … about 6 times by 11 s, without chatter under the 60 ms definition.
- If the official runs reproduce this, A1 ("TOUCHING through the end") fails as frozen.

**B1 bench smoke:** V1.1–V1.3 pass on all four joints.
