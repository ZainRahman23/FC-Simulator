# G3 → G4 interface audit: what changes when the foot actually leaves the turf (pre-G4 runway, item 6)

**Scope:** the validated G3 stance controller (`ctrl/v2_stand.js` with `G3_STAND`), the actuator layer, the passive layer, the supervisor, and the sensing. Static code reading plus a diagnostic harness.

**Not a swing controller.** In the harness (`tools/liftoff_probe.mjs`), the lift is an **external, ledgered** upward force on the unloaded leg in the G3 U:R swing-ready hold (7.0–8.0 s), then released.

**Evidence:** `evidence/liftoff/`.

## Empirical result (V2-REF, k = 0)

| lift force | applied to | lift | what happened |
|---|---|---|---|
| 20 N | foot | 58 mm | the sensed "load" reads the force (**sensor artifact**, below); unloaded flag off during the lift; the foot floats; the hold re-armed **in the air**; **falls** at the scenario's return to bilateral |
| 30 N | shank (sensor pure) | 49 mm | unloaded flag correct; the hold is soft (≈ 600 N/m vertical); touchdown → **flag chatter** (4 transitions in 60 ms) and a 9 N·m one-tick knee torque step; **foot relocated** |
| 60 N | shank | 182 mm | re-contact with **1 boot piece touching** → **55 N·m one-tick knee torque step**; flag chatter; 30 N·m steps; **falls** |
| 100 N | shank | 984 mm | the leg is flung; 158 N·m step at re-contact; falls |

**The stance controller cannot position an airborne foot, and its contact-reacquisition path produces torque discontinuities.** This is the V1-style transition hazard.

## Hazards (each confirmed in code; ✓ = also confirmed empirically)

| # | assumption that breaks at foot lift | where | effect when the foot leaves the turf | severity |
|---|---|---|---|---|
| H1 ✓ | **Posture IK targets the foot's current pose for a "loaded" foot** ("foot where it is") | `compute` → `legIK(…, unl ? hold : null)` | an airborne foot flagged loaded has **no position stiffness**; it floats with any force | high |
| H2 ✓ | **Hold pose = the foot pose at the instant the load fell below 1 % BW** | `holdUnloaded` (`hold[n] = st[foot]`) | if the flag re-arms while airborne, the hold is an **airborne pose** (stale target); the foot is held in the air | high |
| H3 ✓ | **Unloaded / reloaded hysteresis on sensed load (1 % / 3 % BW)** switches, in one tick: the ankle mode (held with free-leg gains ↔ feed-forward only, K = 0), the IK target (hold ↔ current), and inverse-statics load assignment | `compute` rows; `unl` | **flag chatter at touchdown** and **one-tick torque steps** of 9–158 N·m at re-contact | high |
| H4 ✓ | **The sensed foot load is the residual foot wrench** (momentum change − gravity − ankle constraint impulse) | `g1_ankle.js` (`Jc`) | correct for ground contact, **but any other force on the foot reads as load**: self-contact with the other leg (likely in swing), diagnostic forces | medium |
| H5 | **Support membership by touching pieces** (`contactSupport`: any piece touching → in support) and **the support region = the whole usable foot region** | `inSup`, `footPoly` | at touchdown with 1 piece touching, the support polygon jumps to the full foot and the CoP may be commanded where there is no contact | high |
| H6 ✓ | **Heading = mean forward vector of both feet**, including an airborne foot | `hd` | a rotating swing foot rotates the pelvis yaw target and the balance frame (measured 1–2° heading wander with a lifted foot) | medium |
| H7 | **Balance reference midpoint = the midpoint of both ankles** | `mid`, `xiRef` | a swinging ankle moves the COM / DCM target during single support | high |
| H8 | **Pelvis height target = mean ankle height + h_ref** (capped by `ikFeasible`) | `pP[1]` | lifting one foot raises the stance pelvis target by half the lift; the cap uses the (possibly stale) hold pose | medium |
| H9 ✓ | **Supervisor abort = smooth return to bilateral (λ → 0.5 over 0.6 s)** | `supervised` | in single support the abort shifts weight onto a foot that is not on the ground (the fall in the 20 N probe) | high |
| H10 | **The twist policy "current" leaves an airborne leg's axial twist uncontrolled** | posture IK | swing-foot yaw floats within ±10° (k = 0), so touchdown yaw is uncontrolled | medium |
| H11 | **Posture gains are stance gains** (sized for half body weight), and the hold stiffness is low at the foot (≈ 600 N/m) | `gain[k]` | a swing leg would track poorly under its own inertia; swing needs explicit trajectory + inverse-dynamics feed-forward | medium |
| H12 | **One-tick sensing latency** (sensed loads / contacts from the previous step) | `G2Sim._sense` | at touchdown the controller acts one tick late; combined with H3 this produces the steps | low–medium |

**Not hazards (checked):**
- the actuator layer and passive layer have **no** contact or load dependence (state-only);
- the inverse-statics force share of a foot out of support is forced to 0 (`inSup` → t = 0 / 1);
- the hip strategy is shared by **load** (> 25 %), not contact;
- the energy ledger is closed and includes external work (the probes' ledger residuals stayed within the existing L-row tolerance until the falls).

## What G4 must provide at the boundary (design inputs; no implementation here)

1. **A swing-foot state** distinct from "loaded" and "held":
   - an explicit foot trajectory target (position + yaw) with its own gains and inverse-dynamics feed-forward;
   - never "current pose" while airborne (H1, H2, H11).
2. **Load acceptance as a continuous blend**, over ~50–100 ms, of target, gains and load share, driven by **sensed normal load** with debounce, not by a one-tick flag (H3, H12).
3. **Support geometry from the touching pieces** (contact patch), not the whole region, during partial contact (H5).
4. **Single-support references from the stance foot only:** heading, balance midpoint and pelvis height (H6–H8).
5. **A single-support abort** = "put the foot down where it can bear load", not "return to bilateral" (H9).
6. **Swing-foot yaw control** (H10): requires the twist-policy decision.
7. **Self-contact guard** on the load sensor (H4).
