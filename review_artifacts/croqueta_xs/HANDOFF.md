# LA CROQUETA — X-SWEEP V3 — handoff

## Where things are

- **Lab:** http://127.0.0.1:8361/sandbox/visual/croqxs_lab.html. Its first section is **LA CROQUETA — X-SWEEP V3 REVIEW**. With no `?case`, the page opens on its card in the REFERENCE-LIKE · REAR LOW camera. The VIDEO-GUIDED V1 review follows; its B lanes now run the committed V1 build itself.
- **Sandbox:** http://127.0.0.1:8361/sandbox/visual/croqxs_sandbox.html.
- **Code:** `sandbox/visual/croqxs/`, a copy of `croqhs/` (HOP/SWEEP V2, 753d0cc6).
- **Untouched:** `croqhs/`, `croqvg/` and `feint2ef/` are unchanged. All three run inside the Lab:
  - `ENG.hs2` = V2;
  - `ENG.vg1` = V1;
  - `ENG.cur` = ADV-4.
- **Local only:** the characters are real players' models.

## Files that differ from croqhs

| File | What changed |
|---|---|
| `v_tech.js` | `croqXOf()` / `CROQ_XS`: the one reference case (the right foot's ball to the left, at a jog) as the X-shaped sweep:<br>· the right leg's wide out-and-forward waypoint, toe out, before its inside comes onto the ball;<br>· the three lateral channels (whole-trunk `side`, trunk `bend`, pelvis `proll`) swinging from the right bow through the centre (+0.08) to the left bow;<br>· the left foot unweighting at +0.02 and opening out and forward from the pelvis;<br>· the pelvis yawing toward the exit by the receive;<br>· the first touch launched ≈ 10° back from straight across.<br>V2's `CROQ_HS` stays in the file, unused. V1's `CROQ_W` / `CROQ_R` still cover walk and run. |
| `v_meta.js` | CROQUETA → `ids: CROQ_XS / CROQ_W / CROQ_R`. |
| `u_tc.js` | (1) the lateral band of the ball-side foot's meeting point is per template (`lineBand`; V2's 0.18 – 0.36 is the default);<br>(2) two new body channels, `bend` and `proll`. They default to 0 and are mirrored with the side like `side` / `trunk`. Only a template that keys them carries them. |
| `u_body.js` | `bend`: the spine (55 %) and the chest (45 %) bend sideways over the pelvis.<br>`proll`: the pelvis's own roll.<br>Both are 0 unless keyed, so every other pose is unchanged; the regression shows this. |
| `x_geom.js` | **New:** the X-shape's landmarks and measurements, build-independent. The Lab and `tools/croq_xgeom.mjs` both use it. |
| `v_cases.js` | `CROQ_XSR`, the one card with three lanes:<br>· A = V2 (`eng: "hs2"`);<br>· B = this build;<br>· C = V1 (`eng: "vg1"`);<br>· ADV-4 (`eng: "cur"`) alone.<br>`CROQ_VGR`'s B lanes now run `vg1`, so the V1 review shows V1. |
| `u_viewer.js` | `ENG.hs2` (croqhs, with its own meta table).<br>The X-SWEEP V3 review section: its cameras, ⇄ B → A → C, the ball / lane toggles, the 11 landmark buttons (each a paused frame), and the X-shape table under the info box for each lane.<br>The default card; the banner. |
| `tools/croq_xgeom.mjs` | **New:** the X-shape report (`--all` = V3 / V2 / V1). |
| `tools/croq_integrity.mjs` | Four builds (V3 / V2 / V1 / ADV-4). |
| `tools/croq_diverge.mjs`, `tools/v_cpu.mjs` | Against V2. |
| `../croqxs_lab.html`, `../croqxs_sandbox.html` | The pages. |

`c_sim.js`, `u_sim.js` and `v_run.js` are unchanged from croqhs.

## Next on the owner's word

1. The 1× review (ball hidden) and the decisions in `X_SWEEP_V3_REPORT.md` §8.
2. Then generalize: walk, run, mirror and other entry states. Not before.
