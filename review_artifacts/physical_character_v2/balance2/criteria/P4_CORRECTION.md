# P4′: the corrected continuum criterion (BALANCE-2 §9)

This corrects a **test**. It changes nothing in the character, and it does not alter BALANCE-1's result. The original P4 failure stands as historical evidence (`balance1/evidence/B1_V_B.json`, `B1_V_A.json`).

## 1. What P4 was meant to measure

BALANCE-1's preregistration (§5) names P4 "continuum". The intent is that the response grows with the disturbance, and that failure is genuine and graded rather than a switch. As written, P4 tested this with "COM peak excursion strictly increases small < moderate < limit < over-limit in every direction".

## 2. Why the original wording cannot measure it

- **Peak excursion is undefined once the body falls.** After a fall the body leaves its support. Its "peak excursion" within the 4 s window is then the distance travelled while falling, which depends on how the fall unfolds and is not a response magnitude. In BALANCE-1 B forward, "limit" (19.5 N·s) fell at 0.521 s and travelled 1,684 mm; "over" (28 N·s) fell at 0.317 s and travelled 1,567 mm. The larger push fell sooner, which is the graded property P4 wanted, yet it failed the test because its falling body ended up less far away.
- **Any two falling levels can therefore fail P4 for reasons unrelated to the continuum.** A larger push can also pass it for unrelated reasons.

## 3. The corrected rule (P4′; `criteria/b2_p4prime.mjs`)

Per direction, with the levels ordered by impulse:

| Part | Property | Test |
|---|---|---|
| (a) | Outcome order | Falls are upward-closed: no level falls while a larger level stands. |
| (b) | Graded response below failure | The peak COM excursion against the twin strictly increases across the non-falling levels. |
| (c) | Graded failure | The time from onset to failure is non-increasing across the falling levels (tolerance one step, 1/240 s). |
| (d) | Graded through the boundary | The \|COM excursion\| at a common pre-failure time t* strictly increases across all levels. t* = 250 ms, or 25 ms before the direction's earliest failure if that is earlier. |

Each part uses only quantities that are defined for every level at the time they are compared. "Non-falling" uses the frozen BALANCE-1 fall definition (`ppr3_battery.recovery`). It includes levels that stand but have not settled, because their peak excursion is still a response magnitude.

## 4. Alternatives considered and rejected

- **Peak excursion before the failure time.** For falling levels this saturates at the support-edge distance, so ties would be forced.
- **Dropping the falling levels from P4.** This would lose the graded-failure property, which is half of what "continuum" asks for.
- **Pelvis drop.** It is not graded below failure: it stays below 2 mm for every standing push.
- **A threshold on the ratio peak / impulse.** No evidence-based bound exists, so it was not invented.

## 5. Independence from outcomes (disclosure)

P4′ is written after BALANCE-1's results are known; it cannot be blind to them. It is derived from the preregistered intent ("continuum") and from the defect identified in BALANCE-1's own report, and it was not chosen by trying rules against candidates. Applied **post hoc and for information only** to BALANCE-1 B and A, it passes in every direction: forward falls at 0.521 s then 0.317 s, and the excursions at 250 ms are 17.8 < 32.9 < 56.0 < 83.8 mm. This does not change BALANCE-1's recorded P4 failure.

P4′ is frozen (sha256 in `BALANCE2_FREEZE_P4.json`) before any BALANCE-2 successor is evaluated with it.
