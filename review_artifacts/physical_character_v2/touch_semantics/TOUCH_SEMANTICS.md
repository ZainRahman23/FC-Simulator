# Semantics of a released, still-touching foot: Phase 1–2 findings (diagnostic; nothing adopted)

**Authority:** `../sources/2026-10-05_user_instruction_autonomous_runway_touching_foot.md`.

**Tools:**
- `tools/touch_lab.mjs` (diagnostic lab);
- default-off controller switches in `ctrl/v2_stand.js`: `lcTouch` {frame, gains, vert, seat}, `shareCapC`, `touchRest`.

The default path is bit-identical (KV0 4 / 4 after every edit). Raw lab outputs live in the scratch tree and are summarised here (`evidence/`).

## 1. The question

What should govern a foot that:
1. has been intentionally unloaded;
2. is no longer a support foot (lifecycle s = 0);
3. still touches the turf;
4. has no lift command yet?

In locomotion this is the pre-swing / "resting" state between unloading and liftoff, and again after touchdown before load acceptance.

## 2. What the current lifecycle does, and why it lifts the foot (causal)

For such a foot (`ctrl/v2_stand.js`, non-supporting branch):
- **Target:** the contact anchor horizontally and in orientation. **The target height follows the foot's own height** (deliberately, so that it "never presses").
- **Leg frame:** the pelvis frame with height min(posture target, actual).
- **Gains:** hip and knee use the **stance posture gains** while in contact (a = 0).

**Consequence:**
- The IK is re-solved every tick for the foot where it is, so the posture PD produces **no vertical force**. The vertical equilibrium of a zero-load touching foot is **neutral**.
- Any small upward force lifts it: joint damping resisting the leg's motion as the body moves, servo lag, the leg moving with the pelvis frame.

**Measured trigger:** after the transfer the pelvis settles upward 0.4–0.6 mm over about 1 s (debt D-3). The released foot rose with it (0.06 → 0.58 mm) until its sole crossed the 0.5 mm "touching" definition. Then followed spontaneous LIFTOFF → AIRBORNE and TOUCHDOWN ↔ AIRBORNE cycling with no lift command.
- **Early release** (B3 / B3c, 6.47 s) meets the settling; **late release** (B1 only, about 7.7 s) mostly misses it.
- **This is pre-existing:** the original configuration also showed it whenever release was early (the unload-fix dataset).

## 3. Separating the factors (`touch_lab`, V2-REF L unless stated)

| factor | evidence | role |
|---|---|---|
| B1 | removes the mapping residual (unload-fix CS1–CS5) | lets the foot be released at all at 2.5 cm |
| B3 / B3c (share cap) | leak removal exact; **both formulations engage abruptly.** B3c is mathematically continuous, but its cap rises 25 × r above loadOff, so it binds within about 10 ms of the request crossing 1 % | moves release earlier (6.47 s vs about 7.7 s) and adds a load step (16.6 → 4.5 N in about 50 ms) |
| release timing | early release + settling → cycling (6 lift-offs); late release → 0 | exposes the hold defect; not its cause |
| pelvis settling (D-3) | +0.4–0.6 mm over about 1 s after the transfer; planned bumps of ±2 / ±5 / ±10 mm reproduce the effect in a graded way | the disturbance |
| posture control in contact | the posture gains + the min frame hold the leg configuration, so the foot rides with the pelvis | the transmission path |
| contact geometry | the 0.5 mm touching definition; the foot tilts on rises | the threshold the drift crosses |
| lifecycle thresholds | loadOff (release), bounceDebounce (TOUCHDOWN → AIRBORNE) | unchanged throughout |
| commanded lift | works from a correct hold (§5) | — |

## 4. Candidate holds compared (cap arms: N = B1 only; A = B1 + B3; C = B1 + B3c)

### Graded post-release pelvis disturbance, 2.5 cm

Cells are lift-offs (runs with ≥ 1) / max foot load / max rise / max drag:

| hold | no bump | ±2 mm | ±5 mm | ±10 mm |
|---|---|---|---|---|
| current (target follows the foot) | 6 lift-offs with early release | lift-offs at +2 mm | lift-offs | lift-offs, drag up to 10.6 mm |
| `vert: anchor` (surface target) | 0 | 0 | lift-off at +5 mm | lift-off at +10 mm |
| `lcFrameH: target` (posture-target frame) | 0 | 0 | 0 (drag 3.2 mm on sinks) | lift-offs on −10 mm (N); drag 5.8 mm |
| `frame: actual` + surface | 0 | 0 | — | **presses 22–33 N on sinks** (servo lag, stiff gains) |
| `gains: swing` (+ surface) | 0 | — | — | **lifts and presses on sinks** (11–18 N, 2–4 mm) |
| `seat` only (0.25 / 0.5 %) | 0 | 0 | lift-off (0.25 %) / 14.7 N press spikes (0.5 %) | lift-offs at +10 mm |
| **surface target + seat (vs)** | **0** | **0** | **0** | **0** |

### Breadth sweep of the leading candidates

3 bodies (V2-REF L, V2-165-62 R, V2-198-92 L) × drops 0 / 3 cm × bumps 0, ±5, ±10 mm × arms N / C = 30 runs per cell:

| hold | runs with spontaneous lift-off | max load | max rise (contact kept) | max drag |
|---|---|---|---|---|
| vs25 | 0 / 60 | 11.3 N | 2.5 mm | 4.4 mm |
| **vs50** | **0 / 60** | 11.9 N | 2.8 mm | 3.1 mm |
| vs75 | 0 / 60 | 9.7 N | 2.9 mm | 1.9 mm |
| fvs50 (actual frame) | 0 / 60 | **30.9 N** | 2.8 mm | 3.1 mm |
| gvs50 (swing gains) | 0 / 60 | 11.1 N | 2.7 mm | 3.7 mm |
| tgt | 4 / 60 | 9.1 N | 1.5 mm | 7.0 mm |
| v | 12 / 60 | 9.1 N | 1.3 mm | 4.7 mm |

- **The outcome is insensitive to the seat level over 0.25–0.75 % BW.** The value is not critical, and it is not chosen by score.
- The "max rise with contact kept" on ±10 mm rises is foot tilt (heel or toe) while pieces stay on the turf.

## 5. Commanded lift from each hold (the E1a sequence, diagnostic; 2.5 cm; 4 body / foot cases × arms N, C)

| hold / arm | lift reached? | liftoff after command | hover clearance (target 5 mm) | servo error | touchdown impact | load acceptance |
|---|---|---|---|---|---|---|
| current / C (early release) | **no**: spontaneous cycling, never TOUCHING 0.5 s | — | — | — | — | — |
| current / N | yes | 0.26 s | 3.3–4.8 mm | ≤ 2.6 mm | 0–1 N | 1×, SUPPORT |
| vs50 / N and C | **yes, all 8** | 0.24–0.28 s | 3.0–4.8 mm | ≤ 2.6 mm | 1.8–3.3 N | 1×, SUPPORT |

**Boundary (dangerous) cases:** commanded micro-hovers at 0.25 / 0.5 / 0.75 / 1 / 2 mm for 2 s (V2-REF L, V2-198-92 R, with and without the hold candidate).
- **No chatter** in any case (no state re-entered within 60 ms).
- ≤ 1 AIRBORNE entry and ≤ 1 TOUCHDOWN.
- Torque steps ≤ 6.4 N·m.

During a commanded hover the hold candidate is inactive by construction (seat off with a swing command), so it does not move chatter to another threshold.

## 6. The proposed semantics (candidate `touchRest`)

A **non-supporting** foot (s < 1) **without a swing command** is a limb **resting on the surface**:
1. **Target:** its contact anchor (horizontal position, orientation / yaw), with **the vertical target at the anchor's height, i.e. the surface**. It is never "wherever the foot happens to be".
2. **While in contact:** a **seating force** of loadOff / 2 of body weight, through its **own leg's feed-forward** (finite actuators; the ground reaction is physical). It is scaled (1 − s)(1 − a), so it fades in as support is released and out as load is accepted or a lift begins. The other foot's commanded force is reduced by the same amount, so the commanded total stays M·g.
3. **With a swing command:** the existing swing servo, with the seat off.

**Why each part:**
- **The surface reference:** the foot is meant to stay on the surface, so its vertical reference must be the surface and not the leg's configuration, which moves with the body.
- **The seat force:** a zero-load contact is neutrally stable, so any arbitrarily small disturbance decides it. A small positive resting force makes contact stable.
- **Its size:** loadOff / 2 is the midpoint of the lifecycle's own "unloaded" band [0, loadOff), so the foot remains "unloaded" by the lifecycle's definition. It also lies at the top of this project's measured resting band of a touching unloaded foot (0.2–0.5 % BW, contact-gap check).

**What it does not do:**
- no world-space writes, pinning, external force or contact override;
- no lifecycle threshold change;
- physics decides contact. A strong enough body motion still lifts the foot, and a commanded lift still lifts it.

**Locomotion semantics** (coherent across states):
- SUPPORT / LOAD_ACCEPT / UNLOADING: the stance path, continuous in s.
- TOUCHING / LIFTOFF / TOUCHDOWN with no command: resting on the anchor.
- AIRBORNE or commanded: the swing servo.
- Touchdown re-anchors where the foot landed (existing), and the rest resumes as a → 0.
- The pre-swing foot of gait (trailing foot unloading, still on the ground, before toe-off) is the same state.

**B3 / B3c are not part of the candidate** (§3):
- both engage abruptly in practice;
- the leak they remove is 0.05–0.2 % BW with B1;
- B1 + touchRest releases and holds correctly without them.

The leak remains as documented debt.
