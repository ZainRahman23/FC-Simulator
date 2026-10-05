# T-A (configuration PSTAR3): validation results

**Frozen inputs:** `E1B_TA_PREREG.md` and code at **7369b1f**.

**Runs:**
- a clean `git archive` copy of 7369b1f, 21:03–21:12 (`evidence/commit.txt`);
- G0–G3 regression from a clean copy of 610aad0 (7369b1f + a tool-only erratum).

**Evaluation:** the frozen tools. The T-A checks tool crashed on a tooling defect (erratum E1bTA-e1, §4); it was re-run on the same runs.

## 0. Bottom line

**VALIDATION FAIL, for substantive reasons. E1b is not closed and PSTAR3 is not adopted. Per your instruction I stopped without tuning.**

- **T-A is a large step forward.** Every one of the 23 P15 aborts (8 bodies × L / R, 180 / 240 / 480 Hz, repeat) is now caught with the original foothold, and **no run falls**. E1b-7 passes in all 28 set-E runs, including the three P15 aborts (9.70 / 9.78 / 8.25 N·m). No support or load is ever credited before sustained measured contact (TA-1 PASS).
- **But the lightest body (V2-165-62) is beyond the feet-in-place envelope for this push:**
  - T-A's own capture model, working from the measured state after the push, says **"step required"**;
  - physically, catching it needs **all** its weight on the landed foot, and its lateral momentum then **lifts the old stance foot off the ground** (240 Hz both sides, 180 Hz) or slides it at about zero load (480 Hz);
  - that foot ends up 6.8–7.9 mm away, so E1b-18's stance-slip limit (5 mm) fails.
- **Elsewhere:** borderline acceptance torque steps where the model, flagging too little time, forced the minimum 0.10 s ramp (V2-long-legs 10.23 / 10.21 N·m), and one 480 Hz tick above the rate-scaled limit.
- **This is the case you anticipated:** for the lightest body the correct recovery is a **capture-aware step**, which belongs to stepping / E2.

| part | result |
|---|---|
| **E** official E1b (28) | **FAIL, only E1b-18 on V2-165-62 L P15** (stance slip 6.86 mm > 5). Everything else passes, including **E1b-7 (27 runs)**, E1b-17 (3), E1b-16, E1b-11 (23 / 23) |
| **A** E1a (10) | **PASS** |
| **X** extended (133) | X-U 7 / 7, X-P5 52 / 52, X-Y 29 / 29, X-DET 2 / 2 **PASS**. **X-P15 FAIL:** V2-165-62 R E1b-18 (slip 6.78 mm); V2-long-legs L / R E1b-7 (10.23 / 10.21 N·m). **X-RATE FAIL:** V2-165-62 L E1b-18 at 180 / 480 Hz (7.12 / 7.88 mm); V2-REF L 480 Hz E1b-7 (one tick 6.61 N·m > the rate-scaled 5). X-SENS: no failures |
| **TA** mechanism checks | **PASS** (after erratum E1bTA-e1). TA-1 authority (no support or load before sustained measured contact), TA-2 durations / rule, TA-4 engagement |
| **W** browser = Node | **3 / 3**; W_P15 exercises T-A |
| **G** G0–G3 | **PASS** (V3.1–V3.10, browser 10 / 6 / 4) |

## 1. P15 reporting (the four classes, as preregistered)

| class | runs |
|---|---|
| **recovered without changing foothold** (verdict in place, E1b-18 pass, landed foot ≤ 10 mm from its anchor) | **11 / 23**: V2-198-92 (4), V2-190-85 (2), V1-matched (2), V2-short-legs (2), V2-REF 480 Hz (1) |
| **step required** (T-A's verdict, at the abort or later) | **12 / 23**: V2-165-62 (4), V2-175-70 (2), V2-REF (4: L, R, repeat, 180 Hz), V2-long-legs (2). **All 12 were nevertheless caught physically**; the 4 V2-165-62 runs fail E1b-18 (stance foot moved > 5 mm), the other 8 pass it |
| **recovered by stepping** (future E2) | 0 (no stepping exists) |
| **fell** | **0** |

Where the verdict switched:
- **During the descent** (re-plans flagged): V2-165-62 (42 of 46 re-plans) and V2-175-70 (14 / 28). Both ran at the minimum durations (0.20 s / 0.10 s).
- **After measured contact** (no ramp ≥ 0.10 s predicted to recover with the margin): V2-REF, V2-long-legs. Ramp forced to 0.10 s.

## 2. Why: the push is still acting at the abort, and the lightest body is past the edge

**The abort fires 4–29 ms before the 15 N·s push ends** (`evidence/diag/online_at_pushend.log`, recomputed with the frozen online model):

| body | DCM outside the stance foot (abort → push end) | latest touchdown with the fastest ramp (0.10 s), no margin (abort → push end) |
|---|---|---|
| V2-165-62 | 2.1 → 4.4 cm | 0.42 → **0.21 s** |
| V2-175-70 | 1.9 → 3.3 cm | 0.45 → 0.30 s |
| V2-REF | 1.2 → 2.5 cm | 0.63 → 0.40 s |
| V2-198-92 | 0.9 → 1.2 cm | 0.77 → 0.68 s |

- **V2-165-62 is beyond the T-A envelope once the push completes.** Its latest feasible touchdown (0.21 s) is at the 0.20 s minimum descent before the 0.04 s margin. The per-tick re-check caught this and correctly switched the verdict.
- **The old stance foot leaves the ground.** Catching V2-165-62 in place moved 100 % of its weight to the landed foot (+0.33 s: 96 % BW; +0.36 s: 101 %). The old stance foot then lost contact (AIRBORNE at +0.40 s) and re-landed 6.6 mm away (+0.70 s). That is an involuntary change of support, not a feet-in-place recovery.
- **For comparison, the one-tick drop** (support at +0.29 s, 10 % floor) kept that foot down with a 4.78 mm slip, already at the limit.

## 3. Correction to `../p15_capture/`

`P15_EVIDENCE_COMPARISON.md` §4 and my report said the original foothold could recover **all eight bodies** with timely support. **That was too strong.** The offline LIPM envelope:
1. started from the push end without accounting for the abort firing earlier, while the push still acts. This matters for the online decision, not for the physics;
2. assumed the 10 % floor removed for the whole recovery. The T-A design restores it continuously over the λ return, which costs about 0.06 s for V2-165-62;
3. had **no friction or foot-unloading limit**. Catching the lightest body needs essentially full weight transfer, and the body's momentum then lifts or slides the other foot.

**Corrected statement:**
- All 8 bodies are caught with the landed foot on its original foothold. 7 of 8 keep both feet in place; V2-165-62's old stance foot lifts or slides 6.8–7.9 mm.
- 11 of 23 runs fall fully within the T-A envelope.
- For **V2-165-62** (and marginally V2-175-70 / V2-REF / V2-long-legs at the model's margin), the 15 N·s push in single support is at or beyond the feet-in-place envelope under E1b's smoothness and slip limits.
- The physically appropriate response for that body is a **capture-aware step**.

## 4. Errata (tooling; originals kept)

| id | defect | effect | correction |
|---|---|---|---|
| **E1bTA-e1** | `tools/e1bta_checks.mjs`: a mid-line comment (added after the smoke run) swallowed `if (!caps.length) continue;` | the tool crashed on the first run without a put-down (frozen output `evidence/ta_checks.log`) | comment moved (610aad0); re-run on the same runs → TA PASS (`evidence/ta_checks_erratum1.*`) |
| **reporting** | `tools/e1bfix_eval.mjs` prints "put-down T 0.302 s" (the duration at creation) | cosmetic: T-A's actual descent is in the T-A record (`Tput`) | none needed; the T-A table (§1) uses the record |

## 5. Decision needed (yours)

T-A did what it was built to do: the smoothest descent and ramp that fit the measured capture window, a correct "step required" verdict when the window closed, and physics authoritative throughout. The remaining failures are not tunable without weakening a criterion or choosing durations from the observed outcomes. Options:

1. **Treat P15 as two cases** (the distinction you raised):
   - *in-place-recoverable* bodies / conditions, where T-A recovers with the original foothold;
   - *step required*, classified by T-A's own capture verdict and deferred to E2's capture-aware stepping.

   This is a criterion change, needing your approval. The V2-long-legs and 480 Hz torque items would then still need resolving: both arise only where the model had flagged insufficient time.
2. **Keep P15 unchanged:** E1b cannot close until capture-aware stepping exists (E2), i.e. P15's beyond-envelope cases wait for E2.
3. **Treat the stance-foot lift-off as a support change** (the old stance foot re-landing elsewhere = a step) and classify it accordingly. This is a variant of 1.

**Not done:** no parameter, criterion, rule or duration changed after the results; no E2 work started.

## 6. G0–G3 regression (`scripts/regress_battery_pstar3.sh`)

**PASS as frozen** (no erratum). Clean copy of 610aad0, 21:14–21:47; evidence in `evidence_regression/`.

| item | result |
|---|---|
| V3.1 | KV0 identical, suite 58 / 58, V1 guard OK |
| V3.2 | bench identical |
| V3.3 | G0 51 / 52 (0.V1 guard) |
| V3.4 | G1 74 / 74 hash-identical |
| V3.5 | G2 11 / 11 |
| V3.6 | G3 v3.3 no failing rows; J2a 81 / 81 |
| V3.7 | twist battery |
| V3.8 | KV6c 8 / 8 |
| V3.9 | boundary harness 180 / 240 / 480 Hz |
| V3.10 | yaw decomposition |
| browser | G1 10 / 10, G2 6 / 6, G3 4 / 4 |

T-A changes no accepted G0–G3 behaviour.
