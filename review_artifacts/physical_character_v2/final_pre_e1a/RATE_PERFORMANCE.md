# Rate and performance (final pre-E1a stage, §9)

## 1. Does the thin 240 Hz margin, or the 180 Hz passive-fall artefact, create a realistic E1 risk?

**What the artefact is** (runway, `../pre_g4_runway/ANKLE_KNEE_AND_RATE.md`):
- End-range integration error of the stiff passive end-stop spring, near the semi-explicit stability limit.
- Worst event: 6.92 J at 180 Hz → 0.51 J at 240 Hz → 0 at ≥ 260 Hz.
- It converges with the timestep and is net dissipative over its window.
- **It appears only in pathological passive-fall states:** a joint driven deep into its end-stop by a fall.

**Where E1 could meet an end range:**
- the stance ankle's ab/adduction under a single-support yaw load;
- the swing leg's soft limits. These are excluded by construction: the soft-limit bounded IK never targets beyond them.

**Measurements on the E1-like conditions:**

| test | 180 Hz | 240 Hz | 480 Hz |
|---|---|---|---|
| boundary harness (30 N lift, drop 2.5 cm, 3 bodies × k 0 / 0.13): falls / chatter | 0 / 0 | 0 / 0 | 0 / 0 |
| same: energy-closure maximum per tick | 0.003–0.004 J | 0.002–0.003 J | 0.0006–0.0008 J |
| reference policy, PY4 (preregistered falsification, 3 bodies × k 0 / 0.13): decay class | DECAYING (6 / 6) | (battery) DECAYING | DECAYING (6 / 6) |
| reference policy, PY4: hip-rotation actuator work, 12–20 s | 0.000 J | 0.000 J | 0.000 J |

**Single-support yaw at 240 Hz** (`SINGLE_SUPPORT_YAW.md`):
- At k = 0.13 a 1 N·m·s impulse reaches 9.8° (max 11.1°). That is into the soft end range (±10°), well short of the hard limit (±15°) where the stiff end-stop acts.
- At k = 0 the stance ankle reaches 12.5–13.5°, which comes closer.
- E1b's preregistered 0.5 N·m·s gives about 5° at k = 0.13.

**Conclusion:**
- **No realistic E1 risk** from the 240 Hz margin or the 180 Hz artefact. Neither appears in any E1-like run, and the end-stop regime it lives in is not reached at k = 0.13.
- It stays documented debt for passive falls. Fix options, if ever needed: an implicit end-stop treatment, or ≥ 260 Hz (a physics-rate decision).
- Nothing was chased here.

## 2. Measured performance impact

Isolated benchmark (`tools/lc_bench.mjs`, run alone after all batches; V2-REF; G3 U:R single-support hold; controller + actuator computation per tick):

| configuration (V2-REF, G3 U:R single-support hold, 4,081 ticks after warm-up) | controller + actuators per tick: median | p95 | max |
|---|---|---|---|
| validated G3 controller | 0.1012 ms | 0.171 ms | 2.58 ms |
| G4 proposal (reference + lifecycle) | 0.1016 ms (+0.4 %) | 0.147 ms | 2.85 ms |
| validated, with the external lift | 0.0978 ms | 0.113 ms | 0.33 ms |
| G4 proposal, with the external lift | 0.0991 ms (+1.3 %) | **0.215 ms** | 0.40 ms |

- **The median cost is unchanged.**
- **The p95 rises while a foot is airborne.** The non-supporting leg's soft-limit bounded IK iterates (up to 30 LM steps) when its target is out of reach inside the soft box.
- **Stated so it is not hidden:** a per-tick worst case of about 0.4 ms for one character. A 22-player budget should assume it for any swing leg.
- **The single-sample maxima of about 2.6–2.8 ms appear in both configurations:** JIT / GC outliers.

**22-player view:**
- **Physics and the passive layer dominate:** 0.31–0.34 ms and 0.14–0.15 ms per character tick (runway measurements). The controller is about 0.1 ms.
- **The lifecycle's added cost:**
  - continuous blends;
  - one weighted heading / midpoint;
  - a scaled polygon;
  - the bounded IK only for a non-supporting leg. It is no fallback, so it costs at most 30 LM iterations when a target is out of reach.
- **Nothing in it scales worse than linearly in players**, and nothing allocates per contact.
- **Not scalable, and therefore kept offline:**
  - reachability certificates (seconds per target);
  - the bounded IK's converged Newton fallback (1–8 ms). The lifecycle explicitly disables it.
