# LA CROQUETA — HOP/SWEEP V2 — handoff

## Where things are

- **Lab:** http://127.0.0.1:8361/sandbox/visual/croqhs_lab.html. Its first section is **LA CROQUETA — HOP/SWEEP V2 REVIEW**, and with no `?case` the page opens on its card in the REFERENCE-LIKE · REAR LOW camera. The VIDEO-GUIDED V1 review follows, unchanged.
- **Sandbox:** http://127.0.0.1:8361/sandbox/visual/croqhs_sandbox.html.
- **Code:** `sandbox/visual/croqhs/`, a copy of `croqvg/` (VIDEO-GUIDED V1, 4a549b8f).
- **Untouched:** `croqvg/` and `feint2ef/` are unchanged. Both run inside the Lab: `ENG.vg1` = V1 and `ENG.cur` = ADV-4.
- **Local only:** the characters are real players' models.

## Files that differ from croqvg

| File | What changed |
|---|---|
| `v_tech.js` | `croqHopOf()` / `CROQ_HS`: the one reference case (the right foot's ball to the left, at a jog). It is S-first:<br>· the load on the receiving foot under the body;<br>· the ball-side foot's sweep, from outside the ball;<br>· S unweights at +0.06;<br>· F plants under the body at +0.10 and pushes;<br>· S receives at +0.18 and lands on the ball;<br>· the exit stride, then S's exit touch on the laces;<br>· the authored posture (pelvis low, pitch, lean, head, arms per side).<br>V1's `CROQ_W` / `CROQ_R` ranges stay outside the jog ([0.8, 2.0] / [4.4, 6.2]). |
| `v_meta.js` | CROQUETA → `ids: CROQ_HS / CROQ_W / CROQ_R` (with the generic LAT fallback, as in V1). |
| `u_tc.js` | Three additions, all gated to `croqHS`:<br>(1) the ball-side foot meets the ball where it already is (ahead ±0.10 m of the template's point, across within 0.18 – 0.36 m);<br>(2) the approach's drift goes out and back (`bump`);<br>(3) the pelvis is keyed to that heading through the approach (`psiKeyed`). |
| `v_cases.js` | `CROQ_HSR`: the one card, three lanes (A = ADV-4 `eng: "cur"`, B = this build, C = V1 `eng: "vg1"`). The REF · JOG R → L marker moved out of the reference camera's way (visual only). |
| `u_viewer.js` | `ENG.vg1` (croqvg, with its own meta table).<br>The camera `rearlow`; `triorear` for three lanes.<br>The review section, ⇄ B → C → A, the ball / lane toggles, the three-row table (with the lowest pelvis), the default card and camera, the banner. |
| `tools/croq_integrity.mjs` | Three builds (V2 / V1 / ADV-4). |
| `tools/croq_diverge.mjs` | Against V1 by default (`--against`). |
| `tools/v_cpu.mjs` | Against V1. |
| `../croqhs_lab.html`, `../croqhs_sandbox.html` | The pages. |

`u_body.js`, `c_sim.js`, `u_sim.js` and `v_run.js` are unchanged from croqvg.

## Next on the owner's word

1. The 1× review and the decisions in `HOP_SWEEP_V2_REPORT.md` §7.
2. Then generalize: walk, run, mirror and other entry states.
