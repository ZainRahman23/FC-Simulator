# ITS-1 STOPPED at PF-0 (activation validity), per the preregistered stop rule. No struck run was made.

- **Preregistration:** `ITS1_PREREG.md` (cb886b14, frozen before any ITS-1 code or physics).
- **Contract:** `ITS1_CONTRACT.md`.
- **Source:** `../sources/2026-10-10_user_decision_interaction_time_physics_pivot.md` (2c6900de).

**Rule applied (prereg §7, PF-0):** "If any state fails, STOP before any struck run and identify the failing subsystem."

**What ran:**
- **Official:** the four control runs (no impulse), one process each; outputs in `evidence/runs_a/`; evaluation in `evidence/ITS1_PF0.json`.
- **Afterwards, labelled STOP diagnostics** (controls only, nothing adopted, no threshold changed; `evidence/stop_diag/<switch>/`): single-factor counterfactuals behind a default-off switch. The default path was re-run after the switch code was added and reproduced all four official controls bit-identically.
- **One implementation smoke run** (A-ctl, to scratch) preceded the official runs. It is identical to the official A-ctl (output hash 95517c08c02ee514).

## 1. PF-0 result (W_valid = the first 0.15 s after initialization)

| state (case, τ_0, stance) | V-1 geometry | V-2 velocity construction | V-3 activation (first 0.05 s) | V-4 validity (0.15 s) | PF-0 |
|---|---|---|---|---|---|
| **S-A** (rx_free_leg, 59.50, L, early stance) | ✓ | ✓ (residual 4e-13) | ✓ pos-corr 0.026 mm; Σ+ 0 J; normal impulse 5.07 ≤ 6.04 N·s per step | ✓ manifold 100 %, slip 4.9 mm, pelvis ≥ 1.00 × | **PASS** |
| **S-A2 / S-Cair** (rx_free_leg, 50.00, R, late stance) | ✓ | ✓ | ✓ (2.06 N·s) | **✗ slip 18.8 mm** (> 10); manifold 94 %; pelvis 0.894 × | **FAIL** |
| **S-B** (rx_planted_leg, 48.50, L, early stance) | ✓ | ✓ | **✗ normal impulse 8.80 N·s per step** (> 6.04 = 2·M·g·dt); **Σ+ 0.5115 J** (> 0.5) | ✓ slip 1.5 mm | **FAIL** |
| **S-B2** (rx_glancing, 65.50, L, touchdown) | ✓ | ✓ | **✗ normal impulse 17.93 N·s per step; Σ+ 0.6955 J** | **✗ slip 12.0 mm** | **FAIL** |

**Initialization facts (E-1 … E-3), all recorded per run:**
- **E-1:** zero projection clamp at every state.
- **E-2 grounding shift:** −2.8 / −19.8 / +4.3 / +13.9 mm (S-A / S-A2 / S-B / S-B2). S-A2's −19.8 mm is the rigid boot reaching the turf at toe-off.
- **E-3 KE-metric correction:** 106 / 136 / 27 / 44 J away from the law's own velocity field. Most of it is the law's non-physical vertical: its COM vertical velocity is +1.62 / +1.79 / +0.57 / +0.78 m/s, set to 0 by c3.
- **Difference from the presentation pose at τ_0:** maximum joint-position difference 73 mm (V1.3) and 104 mm (LC-1) at S-A.

## 2. Attribution (STOP diagnostics; controls only)

| switch (one factor) | S-A | S-A2 | S-B | S-B2 |
|---|---|---|---|---|
| none (official) | PASS | slip 18.8 mm | 8.80 N·s per step; Σ+ 0.51 J | 17.9 N·s per step; Σ+ 0.70 J; slip 12.0 mm |
| **ctrlOff** (posture-tone commands zero) | PASS (pelvis 0.878 ×) | PASS (pelvis 0.851 ×) | PASS (0.16 N·s per step) | manifold 53 % |
| **noC3** (vertical COM velocity left at the law's) | foot leaves the turf (manifold 3 %) | manifold 0 % | 6.77 N·s per step | manifold 6 %, slip 16.6 mm |
| **lift0** (stance boot exactly on the turf) | PASS (slip 8.2 mm) | slip 30.1 mm | 8.69 N·s per step; Σ+ 0.65 J | 13.5 N·s per step; Σ+ 0.83 J; slip 7.5 mm |
| **footFlat** (stance sole rotated horizontal about the ankle) | 9.36 N·s per step | another body below the turf; slip 52 mm | 10.24 N·s per step | 10.05 N·s per step; slip 1.1 mm |

**What the stance leg carries over W_valid** (official run, as a fraction of M·g·dt):

| state | mean | peak | pelvis drop | with ctrlOff |
|---|---|---|---|---|
| S-A | 0.90 | 1.68 | 0 | 0.04 mean, pelvis drop 118 mm |
| S-A2 | 0.18 | 0.68 | 107 mm | — |
| S-B | 1.00 | 2.91 | 0 | 0.05 mean, pelvis drop 118 mm |
| S-B2 | 1.14 | 5.94 | 0 | — |

**The ctrlOff passes are not valid states.** With the posture tone off, the leg carries almost nothing and the body free-falls (pelvis −115 … −151 mm in 0.15 s, i.e. ½gt²).

## 3. Failing subsystem, per state

**S-B (early stance; question B's authoritative case): controller ↔ initialized state.**
- The REV2 posture tone holds frozen targets with stance gains and damping. That makes the stance leg nearly a strut against the initialized stance-leg rates (knee 4.8 rad/s, ankle 6.5 rad/s): the joint motion that a fixed foot and a hip moving forward at 3 m/s require.
- The result is a vaulting load of 2.9 BW in steps 3 – 4 and an energy residual of +0.51 J.
- It is not the grounding (lift0: unchanged) or the foot orientation (flat: worse).
- Keeping the law's vertical velocity reduces the load but does not remove it, and it launches the other states off the turf.
- Without the tone the leg does not support the body at all.
- **Criterion note (not acted on):** V-3's per-step load limit, 2·M·g·dt, is PI-1's PR-4 "promotion makes no collision impulse" value, inherited unchanged. Peak vertical ground reaction in ordinary running is commonly about 2 – 3 BW, so for a running stance state this limit may be the wrong instrument. The energy row (+0.51 vs 0.5 J) fails as well, marginally. **Both stand as frozen.** Whether to change them is the user's decision.

**S-B2 (touchdown, up 0.0095; question B replication): initializer geometry at heel strike, plus the controller.**
- The rigid boot is pitched at heel strike (it penetrated 13.4 mm, so the body was lifted 13.9 mm).
- **Impact:** the zero-foot-twist constraint freezes the boot on its heel. The tone and gravity then rotate it flat, a foot slap of 17.9 N·s (5.9 BW) in step 8, dissipating 8.9 J. footFlat reduces it to 10.1 N·s.
- **Slip:** in step 1, with the boot 0.5 mm above the turf, the stance-ankle torque saturates (fraction 1.0). The foot moves before contact, then slides 11 mm (lift0: 7.5 mm; footFlat: 1.1 mm).
- **What this means:** the initializer treats the touchdown collision as finished, but a pitched rigid boot at heel strike is still mid-collision.

**S-A2 (late stance; the airborne member of C): state selection, plus the controller.**
- The support is ending: the rigid boot stands on its toe edge after a −19.8 mm whole-body shift. This is the toe-pivot mismatch, which here does affect the experiment.
- The frozen late-stance posture pivots the body over the toe edge. The leg carries 0.18 BW, the pelvis drops 107 mm, and the toe slides 18.8 mm, mostly after 0.10 s (4.9 mm at 0.10 s).
- With the tone off the slip is 2.5 mm, but the body free-falls.

**S-A (early stance; question A's authoritative case): valid.**
- The peak load is 1.68 BW. The stance ankle's frontal axis passes its anatomical hard limit by up to 1.45° (it stays within the engine margin) while the ankle actuators saturate. This is reported; it is not a PF-0 row.

## 4. Consequences for the three questions

| question | status |
|---|---|
| **A** (swinging leg) | S-A is a valid interaction state, but the frozen rule forbids struck runs after any PF-0 failure. **Not run.** |
| **B** (planted leg) | **Not run.** Both authoritative planted-leg contacts sit at early stance (up 0.055) and touchdown (up 0.0095). Activation there produces an impact larger than the frozen limit. |
| **C** (matched) | **Not run.** Its airborne member (S-Cair = S-A2, late stance) is invalid, and so is its planted member (S-B). |

## 5. What did not contaminate the experiment

- No locomotion machinery: no carrier, no A field, no B support, no stand-in, no gait reference after initialization.
- The posture targets were frozen at initialization in every run, with no outcome-dependent switching.
- Authority writes: 28 at initialization; 0 afterwards.
- No PI-1 locomotion row was used.
- The simulation records are unchanged: `ib_verify.mjs` gives 59 pass, 1 note, 0 fail after all runs, and the harness confirms each record's SHA-256 after each run.
- No `Math.random` / `Date` in the ITS-1 physics path. Wall-clock timing is used only for CPU logging.

## 6. Determinism and CPU (controls)

**Determinism:** all four official controls, re-run in separate processes after the diagnostic switch code was added, give identical per-step state digests at every step (241 / 241 / 361 / 361) and identical output hashes.

**CPU** (Node 22, Apple M4, single thread, unoptimised):

| component | per 240 Hz step |
|---|---|
| physics | 643 – 683 µs |
| — Jolt step | ≈ 290 µs |
| — passive tissue + actuator application | ≈ 300 – 330 µs |
| — actuator plan | ≈ 34 µs |
| — posture driver | ≈ 18 µs |
| diagnostics (G1 measurement 97 – 125, ankle probes 42 – 51, harness 72 – 85) | 216 – 261 µs |

- A W_resp-length interaction (0.15 s, 37 steps) costs ≈ 24 – 25 ms of physics CPU.

## 7. Decisions needed (nothing started)

1. **The activation-load and energy rows (V-3) for running-stance states.** Keep PI-1's PR-4 2·M·g·dt limit and PR-3 0.5 J, or set physically grounded values, before any rerun.
2. **The interaction-time controller.** The binding element is the frozen-target posture tone. A versioned alternative would be one that does not oppose the initialized joint velocities over the response interval, for example targets advanced by the initialized joint rates, or stance-leg damping chosen for impact rather than standing. This is a new mechanism and needs its own preregistration. It is not locomotion machinery, but it is a controller change.
3. **Touchdown states.** Either initialize the heel-strike foot as still in collision, or exclude touchdown-instant contacts (S-B2) from the first slice.
4. **C design.** Replace the late-stance airborne member with the same initialized state's swing leg: struck R shank (airborne) vs L shank (planted) in S-B, same instant, same impulse. Or choose another airborne state.
5. **Optionally**, run question A alone on S-A (valid), as an amendment.

**Smallest next step (recommended, not started):** decision 2 together with decision 1, as one amendment (ITS-1 A1).
- Freeze an interaction-time stance tone that leaves the initialized joint velocities unopposed for the response window.
- Fix the V-3 rows for running stance.
- Re-run PF-0 on all four states before any struck run.
- Adopt decision 4's single-state C design in the same amendment, so that C no longer depends on the late-stance state.
