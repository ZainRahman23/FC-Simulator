# ABI-1 amendments (after the preregistration freeze 7cf107fe, before the pre-run freeze; no contact run had been made)

## AM-1: V2 operationalised on body states (wording defect in the preregistration; the criterion's claim is unchanged)

**Found by** the disclosed pre-run check K1 (`scripts/abi1_precheck.mjs`, no contact). B-C0's frozen per-step hash equals A-C0's through step **29**, not step 30 as §7.2 V2 states.

**Cause.**
- The frozen PVP-1A record hash (`pvp1a_sim.mjs` `_record`) includes every character's actuator activation state `act.state()`.
- The activation is advanced by the command issued *after* step n (the actuator `compute` inside the tick), before step n is recorded.
- The first non-zero increment is issued after step 30 (it reads frame 1). It therefore changes step 30's recorded activation, and so its hash, while the body states are untouched until step 31.

**Measured** (K1 + `bodycmp`):
- body states identical through step **30**;
- full hash identical through step **29**;
- first non-zero Δτ at command step **30**.

This is exactly the design.

**Amended V2:**
- all 28 bodies' recorded states (pos, rot, com, v, w) identical to A's through step **d + 1 = 30**;
- **and** the frozen per-step hash identical through step **d = 29**.

**Unchanged:** the controller, every parameter and every other criterion. The evaluator implements the amended V2.

## Pre-run checks (disclosed; no contact)

- **K1:** B-C0 and C-C0, 60 steps.
  - finite;
  - identical to A as above;
  - no step triggered;
  - max |Δτ| 3.60 N·m (quiet-stance correction of the entry settling);
  - frame keys exactly {n, S, F}.
- **K2:** C's swing, touchdown and hold code path, exercised without the tackler: mode C0, with a synthetic sensing fault that reports foot_R unloaded for frames 1–40.
  - phases SWING (trigger at 32 = fault frame 3 + 29) → HOLD at 72 → IDLE, then further steps;
  - finite; no non-foot turf contact; max IK residual 0.016.
  - The motion is a code-path test, not evidence.
