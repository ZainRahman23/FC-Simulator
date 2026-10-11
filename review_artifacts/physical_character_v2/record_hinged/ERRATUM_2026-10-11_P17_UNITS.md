# Erratum (2026-10-11): P-17c values were labelled as a fraction of the LIMIT; they are a fraction of the REFERENCE

**Found:** while binding IFM-1 inputs (IFM-1 preregistration §2: "Do not conflate a percentage of a limit with percentage error against the reference momentum").
**Append-only:** no evidence, value, threshold or verdict changes. `RH1_RESULTS.md`, `RH1_PREREG.md` and `DECISIONS.md` are left as written; this note corrects their wording.

**The definition (frozen, unchanged):**
- P-17c passes when |ΔL| ≤ 0.10 × max(|L*|, 1.0 kg·m²/s). Source: `pi1/trackB/scripts/pcg_f0.mjs` TOL `Lrel: 0.10, Lfloor: 1.0`; `RH1_PREREG.md` §3.
- The handoff evaluator's reported `P17frac` is |ΔL| / max(|L*|, 1.0) (`record_hinged/scripts/rh1_handoff_eval.mjs`, `row.kinC.P17frac`). It is **relative to the reference momentum**. On that scale the limit is 0.10.

**What was mislabelled:**

| place | as written | correct reading |
|---|---|---|
| `RH1_RESULTS.md` §2 item 9 | "max fraction of its limit 0.057 / 0.038 / 0.038 / 0.049 … ≤ 1" | \|ΔL\| = 5.7 / 3.8 / 3.8 / 4.9 % of max(\|L*\|, 1) = **57 / 38 / 38 / 49 % of the P-17c limit** (limit = 10 %) |
| `DECISIONS.md` 2026-10-10 RH1 entry | "P-17c ≤ 0.057 of its limit" | ≤ 0.057 of the reference = ≤ 57 % of the limit |
| `RH1_PREREG.md` §5 table header | "\|ΔL\| relative max (P-17c fraction of 10 %)" | the listed values (0.038 / 0.049) are \|ΔL\| / max(\|L*\|, 1), not fractions of the 10 % limit |
| my reply of 2026-10-10 | "angular momentum L: within 0.049 of its limit" | 4.9 % of the reference, 49 % of the limit |

**Pass / fail unchanged:** every P-17c value is below its limit (largest: 57 % of the limit at LOW). The margin is about ten times smaller than the mislabelled wording implied.
