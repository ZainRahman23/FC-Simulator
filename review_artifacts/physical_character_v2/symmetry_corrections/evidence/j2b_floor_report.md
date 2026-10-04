Jobs: 1027 (0 errors); base runs 933; repeats identical 94/94.

| class | n | median | p90 | p99 | max (mm) | recommended (≥ 2 × max, 1–2–5) | max driven by |
|---|---|---|---|---|---|---|---|
| A | 443 | 0.0314 | 0.0591 | 0.0868 | 0.1063 | **0.5** | V2-175-70 quiet stance (self) {"kind":"quiet","seconds":10} δ=0 |
| B | 301 | 0.1374 | 1.0844 | 2.0733 | 2.1048 | **5** | V2-REF push during transfer T8:ramp:R:FR:10 δ=0.000001 |
| C-non-sliding | 21 | 0.0290 | 0.0570 | 0.0656 | 0.0686 | **0.2** | V2-REF push during transfer T8:hold:R:F:20 δ=0.000001 |
| C-sliding | 168 | 0.8529 | 6.2722 | 12.7778 | 14.8387 | **50** | V2-short-legs push at the smallest failing impulse {"kind":"push","dir":"R","J":25} δ=0.0001 |

Timing (C): abort Δ ≤ 1 ticks, fall Δ ≤ 5 ticks ({"0":111,"1":52,"2":9,"3":9,"4":4,"5":4}); one-sided falls 0; class mismatches 0. Recommended timing compatibility: ≤ 10 ticks.

Outliers (> 3 × class p99): none

| family | n | classes | median | p90 | p99 | max (mm) |
|---|---|---|---|---|---|---|
| swing-ready | 56 | A | 0.0431 | 0.0559 | 0.0676 | 0.0737 |
| near-single-support | 56 | A | 0.0543 | 0.0729 | 0.0831 | 0.0864 |
| transfer-fast | 70 | B | 0.7433 | 1.2110 | 1.2394 | 1.2676 |
| quiet stance (self) | 24 | A | 0.0432 | 0.0863 | 0.0965 | 0.1063 |
| sagittal push at the boundary (self) | 48 | A | 0.0271 | 0.0419 | 0.0463 | 0.0482 |
| push at the largest recovered impulse | 168 | B/A | 0.0412 | 0.1728 | 1.0844 | 1.1696 |
| push just below the boundary | 168 | B/A | 0.0347 | 0.0943 | 0.1374 | 0.2075 |
| push at the smallest failing impulse | 84 | C-sliding | 1.9886 | 9.2406 | 12.9692 | 14.8387 |
| transfer | 28 | A | 0.0297 | 0.0540 | 0.0602 | 0.0993 |
| push during transfer | 210 | B/C-sliding/A/C-non-sliding | 0.0429 | 0.9959 | 2.0733 | 2.1048 |
| short pelvis push (50 ms) | 21 | A/C-sliding | 0.0434 | 5.8307 | 5.8575 | 6.2722 |

| body | A max | B max | C non-sliding max | C sliding max (mm) |
|---|---|---|---|---|
| V2-165-62 | 0.0965 | 0.4154 | — | 1.9619 |
| V2-175-70 | 0.1063 | 0.9248 | — | 0.8529 |
| V2-REF | 0.0993 | 2.1048 | 0.0686 | 12.7778 |
| V2-190-85 | 0.0891 | 0.7830 | — | 2.1656 |
| V2-198-92 | 0.0806 | 1.2676 | — | 1.8449 |
| V2-long-legs | 0.0660 | 0.8204 | — | 8.9140 |
| V2-short-legs | 0.0863 | 0.5530 | — | 14.8387 |
| V1-matched | 0.0747 | 1.1696 | — | 5.0423 |

| class | situations | base median | change at δ = 1e-6 m/s (median / max) | change at δ = 1e-3 m/s (median / max) |
|---|---|---|---|---|
| A | 77 | 0.0333 | 0.0074 / 0.0669 | 0.0090 / 0.0579 |
| B | 43 | 0.1557 | 0.0145 / 0.2928 | 0.0597 / 0.5628 |
| C-non-sliding | 3 | 0.0360 | 0.0072 / 0.0086 | 0.0155 / 0.0447 |
| C-sliding | 24 | 0.8529 | 0.0281 / 2.4542 | 0.1399 / 7.4798 |

Sliding: correlation log(posDiff) ~ log(slide) 0.63; ~ contact transitions 0.49.

| slide (mm) | n | median | p99 | max (mm) |
|---|---|---|---|---|
| 0–0.1 | 0 | — | — | — |
| 0.1–1 | 443 | 0.0314 | 0.0868 | 0.1063 |
| 1–10 | 231 | 0.1652 | 2.0733 | 2.1048 |
| 10–100 | 70 | 0.0830 | 0.9925 | 0.9959 |
| 100–∞ | 0 | — | — | — |

Attribution (42 base pairs; mirror trial re-run in a world with swapped L/R creation order):

| swapped | class | n | median, normal order | median, swapped | median ratio | max, swapped (mm) |
|---|---|---|---|---|---|---|
| bodies | A | 17 | 0.0377 | 0.037543 | 1.1724 | 0.078982 |
| bodies | B | 16 | 0.2339 | 0.193023 | 0.8976 | 1.058384 |
| bodies | C-sliding | 9 | 1.8131 | 2.438118 | 0.9291 | 6.184073 |
| joints | A | 17 | 0.0377 | 0.035280 | 0.9696 | 0.052493 |
| joints | B | 16 | 0.2339 | 0.237073 | 1.0013 | 1.258082 |
| joints | C-sliding | 9 | 1.8131 | 1.600737 | 0.9599 | 9.092364 |
| all | A | 17 | 0.0377 | 0.035306 | 1.0604 | 0.050880 |
| all | B | 16 | 0.2339 | 0.186778 | 0.9164 | 1.073632 |
| all | C-sliding | 9 | 1.8131 | 2.428455 | 0.8747 | 5.855188 |
