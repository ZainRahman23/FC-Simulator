# AB2 (A + B swing-contract amendment): VALIDATES — A + B frozen as qualified SWING mechanisms

**Authority:** `../sources/2026-10-06_user_decision_AB2_coordinator.md`.

**Preregistration:** `AB2_VALIDATION_PREREG.md`, frozen in 28f2632 [published as 3c46742] before any AB2 run; the battery ran on that commit.

**Evidence:** `evidence_ab2/`. Records are omitted as duplicates; see `RECORDS_NOTE.txt`.

**The original AB battery and its FAIL verdict stand unchanged** (`AB_VALIDATION_RESULTS.md`).

**Run:** 1,728 / 1,728, 0 reachability exclusions.

**Determinism:** every AB2 record's hash sequence is identical to the AB battery's record of the same run (`determinism.txt`, 1,728 / 1,728).

## Verdict: every item passes

**T-1:** frozen, unchanged; passes every id.

**AB2-7, A's compensation over the genuinely airborne window** (from the first tick with lifecycle AIRBORNE and a = 1; mean φ 0.154, H-T45 0.205):

| id | β_y BASE → AB | reduction |
|---|---|---|
| R-F | 0.390 → 0.100 | −74 % |
| R-L | 0.229 → 0.101 | −56 % |
| C-F7 | 0.371 → 0.096 | |
| C-F13 | 0.419 → 0.105 | |
| C-L5 | 0.276 → 0.094 | |

**Liftoff-transient diagnostic** (not gated): β_y 0.29 – 0.37 (BASE) → 0.25 – 0.31 (AB). As diagnosed, A is only partly active while a ramps; increasing it earlier would approach the contact regime where the refuted variant was unstable.

**AB2-4a, swing continuity:** no E1a-7 violation from the measured liftoff up to the solver step containing the first measured contact, in any AB run.

**AB2-4b, no regression:** runs with E1a-7 violations outside the contact transition are BASE 0 / 0 / 0 → AB 0 / 0 / 0 (R / C / H).

**Contact transition** [step containing first contact, SUPPORT) — owned by the coordinator, reported, **not exempted**:

| config | R | C | H |
|---|---|---|---|
| BASE | 0 / 96 (max commanded 30.6) | 10 / 144 | 36 / 192 |
| A | 0 / 96 (37.8) | 0 / 144 | 2 / 192 |
| B | 10 / 96 (34.5) | 22 / 144 | 89 / 192 |
| **AB** | **6 / 96 (40.6)** | **0 / 144** | **8 / 192** |

Applied-torque steps stay ≤ 10.3 N·m under AB. **These remain the coordinator's requirement.**

**Unchanged from AB, all passing:**
- orientation: tilt −88 … −94 %;
- binding-window clearance: −1.60 → −0.60 mm;
- energy, soft-limit margin through contact, rate stability, integrity, ledger, identity before the step command;
- causal confirmations C-1 … C-3.

## Consequence

A (`vffPelvisAir`) and B (`vffPassiveRef`) are **qualified swing mechanisms**: configuration PSTAR5CHAB, implementations unchanged since 54629de [published as 1a65417]. Their contact-transition continuity is not qualified; it is the coordinator's requirement. See `TOUCHDOWN_COORDINATOR_DESIGN_STOP.md` for why the coordinator stage stopped.
