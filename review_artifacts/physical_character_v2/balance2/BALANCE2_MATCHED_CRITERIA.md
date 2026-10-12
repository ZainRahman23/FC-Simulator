# BALANCE-2 matched qualification criteria (B2M): preregistration (§12)

**Status.** Frozen (`BALANCE2_FREEZE_B2M.json`) before any candidate is run on the matched battery, including the unchanged BALANCE-1 B. BALANCE-1's battery, criteria and results are untouched historical evidence.

## 1. Why the BALANCE-1 AP criterion was mismatched

These points summarise `BALANCE2_AUDIT.md` §2 and §7 and `research/BALANCE2_FORWARD_REFERENCE_LITERATURE.md`.

1. **The forward band 16–23 N·s is not a 50 ms feet-in-place threshold.**
   - Emmens 2020 measured a natural-stepping threshold (stepping allowed): ≈ 0.3 of capacity.
   - Robert 2018's formula was one subject's curve, and its shortest tested pulse was 150 ms.
   - Rietdyk's A-P pushes (thesis Ch. 3) were sub-threshold and mostly recovered: a lower bound, not a threshold.
   - The ML paper was cited as forward evidence.
2. **The pulses differ.** The sources used 150–370 ms pulses. By the delayed-COP inverted-pendulum criterion, a longer pulse of equal impulse is easier: ×1.16–1.57 relative to 50 ms.
3. **Only mass was normalised.** The no-step limit scales with the COM-to-support-edge distance d. The sources' subjects had d ≈ 150 mm (dynamic toe reach); the fixture has d = 103 mm at its battery edge.
4. **Unequal difficulty across directions.** The mass-scaled human levels put the forward "moderate" push at 0.64 of the fixture's loaded-edge limit, against 0.29 backward and 0.24 lateral. At equal normalised difficulty, backward and lateral pushes fall where forward stands.
5. **The backward band (11–16 N·s) rests on the same natural-stepping source** (Emmens, backward 0.074 mg). It is mismatched in the same way and understates capacity.

The matched criterion is **not** a relaxation chosen because BALANCE-1 failed:
- the backward magnitudes **rise** (moderate 8.5 → 11.68 N·s; over-limit 19.5 → 26.07);
- the forward threshold band **narrows** from BALANCE-1's [8.5, 19.4] to [13.01, 18.22] and gains a lower bound that a weak controller would fail;
- new upper bounds in every AP direction reject superhuman robustness;
- a new human-overshoot criterion (P8) is added.

## 2. Derivation of the matched AP magnitudes [E]

**Method** (literature §1.3, §4).
- The no-step criterion of an inverted pendulum whose COP jumps to the front edge after an effective delay.
- Each human study's threshold is expressed as a duration-corrected fraction f of its own subjects' zero-delay limit.
- The "try not to step" datasets give f = 0.50–0.70: Robert 2018 at 150 ms, 0.60; Crenshaw & Kaufman 2014, 0.50–0.58 (range 0.42–0.62); Robert's long pulls, 0.69–0.70.
- Central f_c = **0.57** (literature §4.5 central).

**Matched threshold for a 50 ms rectangular pulse:** T = f · m · ω0 · d · 1.081.

| Quantity | Value | Basis |
|---|---|---|
| m | 73.91 kg | V2 spec |
| ω0 | √(g / 0.97997) = 3.1640 s⁻¹ | settled COM height, `B2_GEOMETRY.json` |
| d, forward | 102.95 mm | BALANCE-1 battery support margin of the settled entry: the same edge the frozen fall rule uses, and V2's analogue of the human dynamic reach (the boot rocker, reached by pitching) |
| d, backward | 124.76 mm | battery margin; heel edge |
| 1.081 | 50 ms duration factor | u/(1 − e^(−u)), u = ω0 · 0.05 |

| Direction | T (f = 0.57) | Band (f = 0.50–0.70) |
|---|---|---|
| Forward | **14.83 N·s** | [13.01, 18.22] |
| Backward | **17.98 N·s** | [15.77, 22.08] |

- **[ASSUMPTION] Backward:** no "try not to step" backward fraction was derived from primary sources. The forward f is applied, and this is labelled.
- **Lateral:** unchanged from BALANCE-1 (hip-width human data, low confidence; no matched lateral evidence).

**Levels:** BALANCE-1's own fractions of T (literature §19.3.3 centrals): small 0.325 T, moderate 0.65 T, limit T (informational), over-limit 1.45 T.

| Level | Forward | Backward | Lateral (unchanged) |
|---|---|---|---|
| small | 4.82 | 5.84 | 7.5 |
| moderate | 9.64 | 11.68 | 15.0 |
| limit (informational) | 14.83 | 17.98 | 23.0 |
| over-limit | 21.50 | 26.07 | 32.5 |

**M1′, Rietdyk-matched forward push.**
- The thesis A-P pelvis push: 19.7 N·s over 367 ms on 86 kg / 1.82 m men, mostly recovered. Its duration-corrected fraction is 0.22–0.30 of the subjects' limit (literature Table B1; central 0.26).
- On this fixture: 0.26 × m·ω0·d × 1.691 (367 ms factor) = **10.58 N·s over 88 steps** (range 8.96–12.21).
- The ML M1 push is unchanged (20 N·s over 84 steps).

**Sensitivity disclosed, not used.**
- At d = 80.3 mm (the flat-foot loaded edge), T would be 11.6 N·s.
- At the anatomical toe tip (149.5 mm), T would be 21.5 N·s.
- The choice of d is the support-representation question (`BALANCE2_AUDIT.md` §4) and is put to the owner. The battery edge is used because it is the edge of the frozen fall definition.

## 3. Battery (`scripts/b2_qualify.mjs`)

| Element | Definition |
|---|---|
| Common protocol | BALANCE-1, unchanged: SOLO (PVP sealed); 240 Hz; PPR-3 standing entry; controller running from t = 0; onset step 480; 50 ms pelvis-COM pulse; 4 s window; undisturbed twin; frozen recovery / fall definitions; motor noise as frozen |
| U | Quiet standing 60 s |
| P | 4 directions × 4 levels (§2). Each run reports overshoot and near-limit effort |
| M | M1′ forward 10.58 N·s / 88 steps; ML 20 N·s / 84 steps |
| T | No-step thresholds in all four directions (7-step bisection over [0, 1.5 × the BALANCE-1 zero-delay limit]) |
| D | Bit-identical reruns: 4 s standing; matched moderate forward push |

## 4. Criteria (`criteria/b2_eval.mjs`)

- **Unchanged from BALANCE-1:** U1–U6, P5 (causality), P6 (tiered latency), P7 (torque slew), DET.
- **Changed:**

| ID | Change |
|---|---|
| P1 / P2 / P3 | Matched AP magnitudes (lateral unchanged) |
| P4 → P4′ | Frozen earlier: `criteria/P4_CORRECTION.md` |
| P8 (new) | For small and moderate pushes in every direction, COM overshoot ≤ 0.26 × peak (human ≈ 0.12–0.14, Rietdyk thesis; Zelei 2021: ankle releases overshoot-free; band × 2) |
| M1 → M1′ | Forward magnitude matched; recovered; peak [24, 120] mm; time to peak [0.25, 1.0] s; settled by 3.5 s |
| T1 → T1′ | Forward [13.01, 18.22], backward [15.77, 22.08], left / right [21.8, 49.8] N·s |

## 5. What B2M does not judge

- **Whether V2's forward support should be longer.** This is the body / support-representation decision: the rigid F0 boot has no toe loading. If the owner changes the support, d changes and the AP magnitudes rescale (0.126–0.176 N·s per mm).
- **Absolute human forward capacity.** A human with human toe support has d ≈ 150 mm and an extrapolated 50 ms threshold of 20.5 ± 3.3 N·s (Robert per-subject).

## 6. Independence and disclosures

- **Formula-derived magnitudes.** Every magnitude, band and threshold comes from the literature audit and the settled-geometry measurements, by the formulas above. None was tuned against a candidate.
- **Prior exposures of the BALANCE-1 B system** near these levels (BALANCE-2 audit, diagnostic):
  - forward pushes of 4.53 and 5.47 N·s (recovered, overshoot 0.27–0.29);
  - backward 8.5 (recovered, overshoot 0.54);
  - backward 18.64 (fell);
  - four-direction thresholds 14.36 / 18.19 / 25.88 / 27.34 N·s;
  - the 350 ms forward threshold of 16.3 N·s.

  B is therefore expected to fail P8 on the backward moderate push. P8 is included because the audit identifies overshoot as a human-likeness defect, independently of which candidate passes.
- **Order.** The unchanged BALANCE-1 B is evaluated on B2M first (§11's principle: know what the corrected test alone changes before changing control). A BALANCE-2 controller successor may then be built only for the diagnosed C defects, with its own preregistration, and evaluated on this frozen B2M without changes to it.
