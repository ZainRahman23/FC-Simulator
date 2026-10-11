# IFM-1 architecture decision (one page, for your ruling)

**Basis:**
- Run 3 of the approved preregistration.
- Evidence and observations: `IFM1_RESULTS.md`.

**Scope:**
- Four impact cells, two bodies, 3.0 m/s, one across-camera direction.
- 0–50 ms primary window.

**Status:**
- **Nothing is adopted.**
- Visual review is pending.
- Every entry carries the frozen HANDOFF_FAILED label.
- The global failures remain: RH1 verdict C, the R0/RH1 shared G1/G3 failures, and the never-waived G0 exemption.

## 1. Which interaction domains earn V2?

**None yet.**

**What the measurements give:**
- Three of four native-contact cells are mechanically valid for 0–50 ms: PL, SH and TP, on both bodies.
- Their responses are detectable, causal and repeatable bit for bit.

**What blocks them:**
- **Camera visibility.** At the normal gameplay camera, no response differs from the no-hit control by more than 0.68 px in that window. The 2 px screening marker is never reached.
  - The cause is scale: the runner is about 30 px tall.
  - Impacts ⊥ travel move along the camera's depth axis, at 0.65 px per 100 mm.
- **Handoff.** No cell counts as a RUN-1-to-physics transition, because the frozen handoff label fails everywhere.

**Decision rule:**
- If your visual review agrees with the screening, the preregistered conclusion is **"little gameplay-camera value: reduce or reject the physical scope for these events."**
- If you see value the screening misses, PL, SH and TP are the candidates.
- **SW is excluded.** Native contact fails integrity at step 1 (angular ledger at 27.7 rad/s segment spin).

## 2. Which domains need native ongoing contact?

| domain | needs native ongoing contact? | evidence |
|---|---|---|
| **Planted leg (PL)** | **yes** | Removing contact after the first step (X) loses 33 mm / 2° and changes the support pattern |
| **Toe-pad stance (TP)** | **yes** | X loses 42.5 mm / 3.5° |
| **Deltoid (SH)** | **no** | X ≡ N within 8.7 mm / 1.6°; the first step dominates |

**The SH first-step-wrench shortcut (W) failed.** This is a replay-carrier problem, not a body problem:
- Applying the impulse to the light upper arm alone, before the solve, implies about 206 rad/s.
- That is clipped at the world's 100 rad/s limit.
- The clipped share, ≈ 1.55 N·m·s, matches the W residual.
- This is post-hoc, from existing records only.

**Consequence:** an initial-disturbance architecture is only plausible for local, first-step-dominated hits, and only with a carrier that injects inside the solve. That carrier is untested.

## 3. Does RH1 help?

**No measurable help in IFM-1.**
- R0 and RH1 agree within 2.1 mm / 0.8° in every cell, and within 0.23 px at the camera.
- RH1's entry is closer to RUN-1 in world space (8 vs 18 mm; 20 vs 31 mm), but both are sub-pixel.
- The only status difference is PL W, decided by a 0.0003 N·s threshold margin.
- **RH1 stays INVALID (verdict C).** It shares R0's G1/G3 failures.

## 4. Does F0 limit coverage?

**Not for the one toe-pad state tested.** F0 entered it validly at 3.0 m/s, and TP's native response is valid.

**Coverage is still unproven:**
- Only one toe state was tested.
- The RH1 audit records RF-1-invalid late toe-pad instants at other speeds.
- The S-TOE control unloads quickly toward toe-off.

**Not justified by this evidence:**
- adding a toe;
- ruling F0 out.

## 5. Single next proposed integration test (only if your visual review does not reject the scope)

**INT-1: read-only live-match observer for native planted-leg contact.**

**What it is:** attach IFM-1's native PL path, unchanged, as an observer to the real football tick stream (the IB-1 runner).

**What it measures, in one experiment:**
- **(a) Live neutrality.** Per-tick hashes of complete gameplay state, events and RNG, identical across animation OFF, RUN-1-only and observer modes; plus input truncation. This turns LIVE_NEUTRALITY_NOT_TESTED into a result.
- **(b) In-match value.** Gameplay-camera value for real camera directions and distances, which IFM-1 could not cover.
- **(c) Live cost.** Per-event CPU in the live loop, including MC-1's 27 ms activation.

**Why PL:** it is the football-relevant domain where native ongoing contact was shown to matter and primary mechanics are valid.

**What it adds:** no collision production code, no recovery, no RH1 adoption, no threshold change.

**If your review finds no visible value, no integration test is proposed.** The physical scope for these events should shrink instead.
