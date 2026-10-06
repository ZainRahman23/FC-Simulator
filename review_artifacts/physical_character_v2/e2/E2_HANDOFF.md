# Contact-to-swing handoff (Decision 2 of the overnight instruction): diagnosis and the one correction made

**Authority:** `../sources/2026-10-06_user_instruction_overnight_e2_autonomous.md`, Decision 2.

**Order:** isolated after the estimator correction (`VFF_RATE_CORRECTION.md`). Steady airborne tracking is analysed there; the release transient here.

**Evidence:** `evidence_handoff/`, and `evidence_vffrate/smoke/` for the counterfactual legend.

## 1. What the handoff does today (established design, inspected)

**Lifecycle** (`ctrl/v2_support.js`):
- the airborne weight a rises only in confirmed AIRBORNE (smoothstep over `release` = 0.1 s);
- over that ramp, a non-supporting hip / knee blends from G3's contact-mode hold gains to the 4 Hz swing servo: hip K 96 → 1,896 N·m/rad, knee D 82 → 19 N·m·s/rad;
- the leg frame's height blends from min(target, actual) to the actual pelvis height;
- the ankle uses swing gains in every state.

**B1 sequencing** (`ctrl/v2_step.js`, amendment A1 / B1):
1. the E1b lift reference is commanded first, while still in contact;
2. at the measured, confirmed AIRBORNE the swing segment starts once from the measured foot state (position, velocity, the lift reference's acceleration). It is re-anchored once, not continuously reset.

**I-11 rule:** that one re-anchor tick skipped the target-motion part of the velocity feed-forward. Differencing the re-anchor jump had produced an 88.6 N·m spike.

## 2. Candidate handoff defects, measured

Non-test smoke steps (V2-REF forward 0.07 m L / lateral 0.06 m R, 240 Hz, `--diag=noclear`) with counterfactual switches on matched runs:

| candidate | test | effect on tracking | effect on actuator continuity | verdict |
|---|---|---|---|---|
| **weak-gain interval** (contact gains during unloading and the 0.1 s blend) | `lcTouch.gains: "swing"` = swing gains also in contact, no blend (B, D, G vs A, C, F) | RMS 4.08 → 3.88 mm (D1 off); 1.10 → 1.09 (D1 on); max unchanged | liftoff Δτ 9.6 → 4.5 N·m, only because the dropped feed-forward term (next row) is multiplied by the contact-mode knee D | **not a significant tracking cause; no change** |
| **discontinuous release reference: the velocity feed-forward's re-anchor dropout (I-11)** | per-tick ω\* / τ0 trace (`evidence_handoff/liftoff_trace_*.txt`) | none measurable (one tick) | knee ω\* 0.274 → −0.002 → 0.259 rad/s; τ0 25.1 → 1.5 → 22.9 N·m; **applied Δτ 9.6 N·m** (commanded 23.6), against 3.0 / 12.7 under the old estimator, whose term was attenuated | **defect: corrected (§3)** |
| liftoff transient error (forward lag up to 5.8 mm at +0.15 s) | D1 on vs off (C vs A) | peak 5.8 → 1.7 mm (forward); RMS 4.1 → 1.1 | — | **inertial** (acceleration at swing start), not a handoff defect. D1's target |
| stale stance objective / incompatible grounded motion | lift-phase error before AIRBORNE: ≤ 1 mm; no swing target is pressed into the turf (B1 lift reference is vertical, from the anchor) | — | pre-liftoff applied Δτ ≤ 0.4 N·m | none found |
| frame-height blend | continuous in a; included in the traces above | — | no step | none |

**Steady state vs transition kept apart:**
- the liftoff rows (first 0.15 s after AIRBORNE) are reported separately from the airborne tracking;
- with D1 the transient is 1.7 – 2.1 mm, against 1.1 – 1.4 mm RMS over the swing.

## 3. The correction: continuous target-motion rate through the re-anchor (implementation correction)

**Option** `e2reanchorVel` (default off; needs `e2`). Configurations PSTAR5BH = PSTAR5BS + it, PSTAR5CH = PSTAR5CS + it.

**What it does:**
- At the re-anchor tick the sequencer supplies the **new reference's own pose one tick before its start**: `stepPrev(sg, dt)`, the segment's polynomials evaluated at u = −dt.
- The target-motion rate is solved against that pose instead of being dropped.
- So ω\* is the new reference's own rate, continuous with its measured-state start.
- The reference is not reset to the measured state on any other tick, and no gain changes.

**Before → after, matched smoke steps** (`evidence_handoff/`):

| run | liftoff ±3 ticks, applied Δτ max | commanded Δτ0 max | tracking RMS / max |
|---|---|---|---|
| forward, PSTAR5BS → 5BH | 9.6 → **0.8** N·m (knee) | 23.6 → 3.3 | 4.08 / 5.78 → 4.10 / 5.78 mm |
| forward, PSTAR5CS → 5CH | 8.0 → **1.4** | 21.6 → 4.7 | 1.10 / 1.81 → 1.09 / 1.81 |
| lateral, PSTAR5BS → 5BH | 9.6 → **0.8** | 23.6 → 3.3 | 3.56 / 5.71 → 3.58 / 5.71 |
| lateral, PSTAR5CS → 5CH | 8.1 → **1.4** | 21.6 → 4.7 | 1.41 / 2.27 → 1.39 / 2.27 |

**Identity:** PSTAR5B SMK-B1D 99c29491 and PSTAR5BS 31bfbb11 are unchanged by the code. The option is off in every configuration except the H pair; E1 paths carry no `e2`.

**Regressions affected:** only E2 configurations, because the option needs `e2`. The PSTAR4S prior regressions (`VFF_RATE_CORRECTION.md` §8) are unaffected by it.
