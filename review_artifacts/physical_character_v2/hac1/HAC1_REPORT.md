# HAC-1 report: Hybrid Active-Physics Character V1 (night mission, 15 Oct 2026)

**Instruction:** `sources/2026-10-15_user_instruction_night_mission_hybrid_active_physics_character_v1.md` (≈ 04:15 BST, saved at `d0497c5`).

**Review page:** `:8350/hac1/review/HAC1_REVIEW.html` (videos, diagnostics, tables).

**Log:** `HAC1_LOG.md`, which records the candidate history in order, including every failed candidate.

**Evidence** in `evidence/`:
- `HAC1_analysis.json`: counterfactuals against the twins;
- `HAC1_expectations.json`: the regression battery;
- `HAC1_cpu.json`.

I cannot play video in real time; I reviewed the renders as frame strips.

```
UNDISTURBED HYBRID RUN: PASS
BRUSH RECOVERY: PASS
BUMP RECOVERY: PARTIAL
STRONG CONTACT RESPONSE: PASS
PROCEDURAL RECOVERY STEP: PARTIAL
CONTINUOUS ACTION VIABILITY: PASS
REGIONAL ANIMATION AUTHORITY: PASS
UNPHYSICAL PELVIS FORCE REMOVED/REPLACED: PARTIAL
TACKLED SUPPORT LEG OVERRIDES RUN: PASS
RUN STOPS WHEN PHYSICALLY IMPOSSIBLE: PARTIAL
SLICED-OUT RESPONSE CAN EMERGE WITHOUT SCRIPTED TACKLE FALL: PARTIAL
ACTIVE FALL/PROTECT RESPONSE: PARTIAL
NO-CONTACT TWIN REMAINS VALID: YES
DETERMINISM: PASS
CPU VIABLE FOR MATCH-SCALE DEVELOPMENT: PARTIAL
FULL PHYSICS-GENERATED RUNNING REQUIRED: NO
HYBRID ARCHITECTURE RECOMMENDED FOR TOUCHLINE: YES
READY FOR OWNER VISUAL REVIEW: YES
```

**The three biggest defects visible at 1×:**
1. The tackled recipient still runs on when the tackle meets a freshly loaded boot (EARLY): the boot is not swept (friction holds it), he keeps running for ≈ 0.5 s and only goes down when the tackler's body reaches his feet. Even at the canonical phase he stumbles and pitches forward over the tackler rather than having the legs taken from under him.
2. A pushed runner shows almost no visible reaction: BRUSH and BUMP drift 13–33 cm off line, but the stride, trunk and arms look the same as the twin's, with no visible stagger and no visible recovery step (the hip offsets are 3–7°). The recovery happens, but it is mostly the support's velocity regulation and is not readable as a recovery.
3. The falls (STRONG push, tackles) are slow folds onto the hands and knees rather than a footballer's tumble: the body sinks and curls forward with the arms out (the protect intent) instead of carrying its running momentum into the fall.

## What was built (`hac1/scripts/`)

The runner law is `hac_runner.mjs` (`HacRunner`). It is deterministic and has no random numbers. It reads only its own body, RUN-1, and its own previous-step contacts.

**1. Continuous action viability.** V ∈ [0, 1] is the minimum of three physical margins.

| Margin | Input | Bounds |
|---|---|---|
| **Placement feasibility** of the next recovery step | The free foot's required hip offset (flexion / abduction) against its range | flexion ±25°; abduction 30°; adduction 15° |
| | The cross-over margin beyond RUN-1's own foot line | 5 cm |
| | The angular rate still needed before RUN-1's touchdown | ≤ 500 °/s |
| | The reach beyond RUN-1's own | — |
| **Height** at that touchdown | Ballistic if the expected stance has been lost, held if supported | drop 0.12 → 0.30 m |
| **Trunk organisation** | Pelvis or thorax tilt plus 0.15 s of tilt rate | 32 → 58° |

- **Filtering:** V falls with τ 0.04 s and recovers with τ 0.35 s.
- **Fall commitment C** has a dead band: it rises (τ 0.10 s) below V 0.30, decays (τ 0.8 s) above 0.65, and holds in between. This is the hysteresis: a runner near the boundary does not flicker.
- **Weights:** locomotion weight = 1 − C. The arms leave RUN earlier, as V drops through 0.85 → 0.45, toward balance and brace.
- **No collision-size term.** Contact enters V only through the physical state it creates. The same tackle geometry therefore gives a recovery at one support phase and a fall at another (section C).

**2. Support integrity and lost support.**
- **What integrity measures:** a support foot that slips (contact-point slip speed 0.8 → 2.0 m/s) or is displaced from its landing point (0.15 → 0.35 m) during the planted part of its stance loses its share of the support.
- **When support counts as lost:** the expected stance was planted and then lost, or it was missed by more than 60 ms.

**3. Recovery foot placement.**
- **The shift:** the free foot's landing point relative to the COM moves by Δp = c·Δv against RUN-1's own landing. c = 0.15 s laterally, and 0 forward, because the support already regulates speed.
- **How it is applied:** as hip offsets in RUN-1's pelvis frame, ramped over the first 35 % of the swing and rate-limited, all within the bounds above.
- **Emergency step:** if the expected support is lost, the free foot may land earlier than RUN-1's touchdown. It takes RUN-1's own touchdown pose, so RUN-1's leg cycle is re-timed, not replaced. The earliest time is bounded by the foot's height ÷ 2.5 m/s + 60 ms.
- **Swing-foot clearance:** in mid-swing, a foot lower than RUN-1's gets extra hip and knee flexion (200 °/m beyond 3 cm, ≤ 20°).

**4. Regional authority.**
- **Per region** (legL, legR, trunk, armL, armR), two quantities:
  - **α**, contact and error authority: HYBRID-RUN-1's law, measured against the blended target;
  - **w**, the RUN-intent weight.
- **Joint targets** = slerp(PROTECT, RUN-1 + recovery, w).
- **Stiffness** = max(α, 0.45 × (1 − w)). A failing athlete keeps muscle tone instead of going limp.

**5. Active protect intent.**
- chin tuck (neck 22°), mild trunk flexion;
- arms toward the fall direction (brace / post; sideways: abduction on the falling side);
- legs near-extended (hips 15°, knees 20°).

**6. Support.**
- **Base:** HYBRID-RUN-1's gait-support pair and pelvis moment, every term × the locomotion weight (pair mode).
- **When the fall commits,** the support, the supported moment and the animation moment all vanish. Nothing holds a falling athlete up.
- The fully physical alternatives remain as options (section D).

**7. Fixtures** (`hac_scenes.mjs`):
- the HYBRID-RUN-1 scenes;
- SH2 and SH3;
- **PUSH:** a prescribed lateral impulse at the upper arm. This is the push-recovery protocol; see section B for why.
- **PVP phases:** the same frozen tackle meets the struck foot at 20 % (EARLY), 59 % (CANON) and 87 % (UNLOAD) of its stance, by shifting only the recipient's RUN-1 start frame.

**Entry state** (`hac_entry.mjs`): RUN-1's entry velocities are made angular-momentum consistent. One rigid rotation is removed so the body starts with RUN-1's stride-average angular momentum. Without this the physical body spins (yaw −3.4 kg·m²/s → ≈ 100°/s).

## Results

### A · No contact

- **Falls:** none, to the end of RUN-1's data, in NC and the three tackle twins.
- **Viability:** 1.00 throughout.
- **Placement offsets:** ≤ 1°.
- **Hash:** `c251f503` (NC).

### B · Shoulder-type disturbances

**Why a push and not a second runner.** RUN-1 is a straight-line gait. A runner whose intent heading changes falls even **alone**: B's veer-in-and-straighten intent of the two-runner fixture falls at 1.2–2.9 s in every variant. This is also true under the original HYBRID-RUN-1 runner, where B alone falls at 2.90 / 2.10 / 1.58 s. HYBRID-RUN-1's B "ran on" only because A held it up. A sideways shoulder charge (SH3) is not executable either. So the clean, repeatable disturbance is the standard push-recovery protocol: a lateral impulse on the upper arm over 0.1 s at 0.75 s. Its magnitudes bracket the shoulder contacts measured in HYBRID-RUN-1 (47 / 77 / 102 N·s).

| push | impulse | sideways speed +0.1 s | off line +0.5 / +1 / +2 s | sideways speed back to twin's | largest recovery-step hip offset | V min | outcome |
|---|---|---|---|---|---|---|---|
| BRUSH, from the right | 30 N·s | 0.33 m/s | 10 / 13 / 12 cm | 0.78 s | 3.1° | 1.00 | **runs on** |
| BUMP, from the right | 60 N·s | 0.64 m/s | 20 / 27 / 28 cm | 0.78 s | 4.3° | 1.00 | **runs on** |
| STRONG, from the right | 100 N·s | 1.04 m/s | 32 / 45 / 59 cm | – s | 7.1° | 0.00 | **falls +1.04 s** |
| BRUSH, from the left | 30 N·s | 0.30 m/s | 10 / 15 / 20 cm | 0.72 s | 3.7° | 1.00 | **runs on** |
| BUMP, from the left | 60 N·s | 0.61 m/s | 20 / 28 / 33 cm | 1.00 s | 6.7° | 1.00 | **runs on** |
| STRONG, from the left | 100 N·s | 1.04 m/s | 34 / 50 / 78 cm | – s | 10.8° | 0.00 | **falls +1.82 s** |

**Two runners** (HYBRID-RUN-1's fixture, secondary):
- **BRUSH:** both run on (HYBRID-RUN-1: A fell 2.25 s after the brush).
- **BUMP:** A falls 1.05 s after first contact. The "bump" there is a 0.5 s shove: upper arms in contact from 0.56 to 1.08 s.
- **STRONG:** both fall.

### C · Slide tackle (SP2F2 / SP2F3 unchanged; PVP-1 canonical geometry; three support phases, each with its twin)

| tackle | struck boot unloads (twin) | struck boot +100 ms: right / up (twin) | far boot down (twin) | pelvis +500 ms (twin) | lowest leg authority R · L | fall commitment after contact | outcome |
|---|---|---|---|---|---|---|---|
| F2 · EARLY 20 % | +0.171 s (+0.171) | 1 / 2 cm (-0 / 1 cm) | +0.192 s (+0.275) | 0.86 m (0.94) | 0.17 · 0.50 | +0.79 s | **down +0.99 s** |
| F3 · EARLY | +0.175 s (+0.171) | 5 / 0 cm (-0 / 1 cm) | +0.188 s (+0.275) | 0.83 m (0.94) | 0.15 · 0.18 | +1.00 s | **down +1.12 s** |
| F2 · CANON 59 % | +0.092 s (+0.092) | 11 / 12 cm (1 / 14 cm) | +0.104 s (+0.213) | 0.80 m (0.96) | 0.17 · 0.33 | +0.68 s | **down +0.68 s** |
| F3 · CANON | +0.104 s (+0.092) | 14 / 11 cm (1 / 14 cm) | +0.104 s (+0.213) | 0.82 m (0.96) | 0.16 · 0.22 | +0.70 s | **down +0.70 s** |
| F2 · UNLOAD 87 % | +0.025 s (+0.029) | 14 / 45 cm (8 / 32 cm) | +0.071 s (+0.075) | 0.92 m (0.93) | 0.37 · 1.00 | never | **runs on** |
| F3 · UNLOAD | +0.025 s (+0.029) | 14 / 45 cm (8 / 32 cm) | +0.067 s (+0.075) | 0.92 m (0.93) | 0.34 · 1.00 | never | **runs on** |

**What the phases show:**
- **The struck foot's load:** in every phase it unloads on the twin's own schedule. The tackle never removes support earlier than running does.
- **EARLY (freshly loaded):** the foot is not swept at all. It stays planted (slip ≈ 0, ≤ 5 cm in 100 ms), because ~1.4–2 BW × turf friction 1.2 holds it against this boot-on-boot contact. The recipient takes the hit, runs on for ≈ 0.5 s, and goes down later, when the tackler's sliding body reaches its feet.
- **CANON:** the foot is carried 11–14 cm sideways by +100 ms. The far foot comes down early (+104 ms vs the twin's +213 ms) in a stumble step, the struck leg loses authority (α 0.17), and the body pitches forward and is down at +0.68 / +0.70 s.
- **UNLOAD:** the foot is already leaving. The recipient absorbs it and runs on.
- **Reading:** identical geometry gives different results depending on the support state, but not the way the brief anticipated. A loaded foot resists. A sweep takes the legs only if it acts above the foot (shin / ankle) or if the tackler's body blocks the next step.

### D · The pelvis force: audit and status

**HYBRID-RUN-1 had three non-physical angular sources.**
1. The "animation-consistency" moment: external, ≤ 450 N·m, present in flight too.
2. The "supported" moment: also an external torque, ≤ 0.4 m × F_y; a 0.4 m lever is not a foot.
3. The gait-support pair. It spreads +F over the body by mass, which is a virtual pivot at the COM. An internal pair whose lines of action do not coincide carries a hidden moment of (r_com − r_foot) × F. That is also why HYBRID-RUN-1's foot placement could not affect balance.

**Attempted replacement: everything through joints and contact** (option `support.mode = "jt"`):
- **Support:** the stance leg's own joint torques, τ = −(p − c_j) × F. This works: the commanded ground reaction is realised.
- **Attitude:**
  - through the ground reaction's direction, with yaw from foot friction;
  - an angular-momentum-consistent entry;
  - free-leg aiming (yaw / full);
  - SIMBICON stance-hip control (world and relative);
  - torque transmission through the stance chain;
  - a ground-limited stance-foot moment pair;
  - a SLIP virtual leg;
  - support profiles aligned to the physical touchdown (shape / warp / half-sine).
- **Result:** over 20 candidates; **none ran longer than ≈ 2 s.**
- **Failure mechanisms found, in order** (HAC1_LOG §2):
  1. RUN-1's entry angular momentum spins the body.
  2. RUN-1's limb motion swings yaw momentum by ±4 kg·m²/s per stride, and pitch momentum averages +2.4 kg·m²/s.
  3. Touchdowns come 30–100 ms early and cascade: RUN-1's clock lifts the leg before its push-off ends.
  4. The ankle's inversion axis (≤ 79 N·m) rolls under the lateral ground reaction of a wide step.
  5. Speed drifts to 5.5 m/s.
- **Diagnosis:** making RUN-1 itself physically executable needs a SIMBICON-class balance controller (or an angular-momentum-consistent intent). That is physics-generated locomotion, outside this mission's boundary, so I stopped there rather than build it silently.

**What HAC-1 ships instead (PARTIAL):**
- The animation moment is no longer free. Every angular term, and the support itself, is scaled by the locomotion weight. When RUN stops being viable, all of them vanish. A falling or swept athlete is no longer held up: HYBRID-RUN-1's complaint ("after collision it becomes 3–5× more consequential") is removed for the failing case.
- While RUN is viable, the moments are still applied. They are logged and drawn.
- An explicit, budgeted variant (ICM, `opts.icm`) exists for measurement. Even 300 N·m did not stabilise the joint-torque runner.

### E · Performance (`HAC1_cpu.json`; Apple M4, single thread, Node, Jolt WASM, 240 Hz)

| world | wall per step | physics step | passive layer | HAC-1 law per character (total · viability · planning · tracking · support) |
|---|---|---|---|---|
| NC: 1 HAC-1 runner (+1 parked body) | 1.01 ms | 0.29 ms | 0.36 ms | 0.142 · 0.0012 · 0.0042 · 0.088 · 0.0059 ms |
| SH_BUMP: 2 HAC-1 runners | 1.40 ms | 0.54 ms | 0.42 ms | 0.112 · 0.0008 · 0.0026 · 0.069 · 0.0030 ms |
| PVP_F2: 1 HAC-1 runner + 1 M1b tackler (PVP-F2) | 1.62 ms | 0.58 ms | 0.43 ms | 0.096 · 0.0011 · 0.0028 · 0.051 · 0.0016 ms |

Per active character ≈ 0.6 ms per 240 Hz step (physics ≈ 0.27, the V2 passive-tissue layer ≈ 0.21, the HAC-1 law ≈ 0.10–0.14, actuators ≈ 0.01); viability 0.001 ms and recovery planning 0.003–0.004 ms are negligible; tracking (with inverse-dynamics feed-forward) is ≈ 0.05–0.09 ms. 22 players would need ≈ 3.2 s of single-core CPU per simulated second: the physics rate and the passive layer, not HAC-1, are the expensive parts (candidates: 120 Hz, activating physics only near interactions as the architecture already intends, a cheaper passive layer).

### F · Determinism

- Every battery scene runs twice in one process, and the two hash chains match (`hac_test.mjs`: 0 failures).
- Every frozen expectation (hash, falls, first contact) is checked.
- There are no random numbers.

## Authoritative-simulation boundary

**Where it runs now:** HAC-1 runs in its own Jolt world in `review_artifacts/`, not in the match simulation. Nothing changes a match.

**What would have to become authoritative simulation facts** if this system decides outcomes:
1. **Support state:** which feet carry load, support integrity, lost support.
2. **Viability V and fall commitment C** (and therefore whether a player falls), as simulation state with its own deterministic step.
3. **The resulting COM position and velocity, and the fallen or protecting state.**
4. **The recovery step actually taken:** where the foot lands, and when.
5. **Every non-contact force:** the support pair and the pelvis moments. Today they are part of the gait abstraction, so they must be simulation terms, not presentation.
6. **The parameters,** versioned with the simulation.

**Outcome neutrality (animation on / off):** the RUN-1 intent, its clock and the physical response must be computed identically whether or not anything is rendered. In this prototype they are: renders only read records.

**Not solved tonight:** the integration contract that carries these facts into the match simulation. It is the next architectural decision.

## Remaining blockers

1. **RUN-1 is not physically executable as authored** (angular momentum; yaw swing; mean pitch momentum). Fully physical support needs either a SIMBICON-class balance layer or an angular-momentum-consistent intent. *Owner decision:* which, if either.
2. **RUN-1 cannot turn or sidestep:** a turning or sidestepping intent falls even without contact. This blocks two-runner shoulder fixtures and any change of direction under contact.
3. **The tackle geometry sweeps an unloading foot but cannot take a loaded one.** A sliced-out fall needs the contact to act on the leg above the foot, or the tackler's body to block the next step. Both are tackle choices, and F2/F3 were not to be modified.
4. **The recovery step is small.** Placement offsets are ≤ 4–7°; the push recovery comes mostly from the support's lateral velocity regulation. The full capture-point gain (1/ω0) destabilised normal running and was halved (tuned).
5. **Fall / protect is minimal:** one brace pose, scaled by the fall direction. There is no fall library and no get-up.
6. **CPU:** ≈ 0.6 ms per active character per 240 Hz step, about 3.2 s of single-core CPU per simulated second for 22 players. The physics step and the passive-tissue layer dominate; the HAC-1 layer is ≈ 0.1 ms.

## Parameters and sources

| Value | Kind | Source |
|---|---|---|
| Capture-point gain 1/ω0 = √(h/g) | Literature-derived | Pratt et al. 2006 (capture point); Hof 2005, 2008 (XCoM, lateral foot placement) |
| Used at 0.15 s (≈ half) | Tuned | |
| Foot-placement-as-balance and stance-hip attitude | Literature-derived | Raibert 1986 (hopping / running: placement for speed, stance hip for attitude); Yin et al. 2007 (SIMBICON: torso via the stance hip, swing femur in world frame) |
| Virtual-force Jacobian-transpose support | Literature-derived | Pratt et al. 2001 (virtual model control); Coros et al. 2010 |
| Half-sine stance template | Literature-derived | the common running ground-reaction model (e.g. Clark & Weyand 2014) |
| Foot dimensions (lever 0.10 m, width 0.04 m) | Inferred | |
| Turf friction 1.2 | Measured in the model | V2 contact policy, boot \| turf |
| Slip / displacement thresholds (0.8 → 2.0 m/s; 0.15 → 0.35 m) | Measured (healthy stance: slip ≤ 0.5 m/s, displacement ≤ 0.13 m at toe-off) | this repository |
| The same thresholds as a swept-foot boundary | Inferred (swept foot: 2.1–2.6 m/s, 13–15 cm in 100 ms) | PVP-1 collision review |
| Viability bands (q 0.7 → 1.4; drop 0.12 → 0.30 m; tilt 32 → 58°) | Inferred, then tuned against the undisturbed run (V must stay 1.0) | |
| Commitment dead band (0.30 / 0.65) and time constants | Tuned | |
| Protect pose | Inferred | |

Nothing is frozen as canonical. Every threshold above is a development value.
