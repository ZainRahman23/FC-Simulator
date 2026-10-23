# LA CROQUETA — LEG-WAVE V4 — handoff

## Where things are

- **Lab:** http://127.0.0.1:8361/sandbox/visual/croqlw_lab.html. Its first section is **LA CROQUETA — LEG-WAVE V4 REVIEW**. With no `?case`, the page opens on its card in the REFERENCE-LIKE · REAR LOW camera.
  - The X-SWEEP V3 review follows as "the previous pass"; its B lane now runs the committed V3 build itself.
  - The VIDEO-GUIDED V1 review follows after that.
- **Sandbox:** http://127.0.0.1:8361/sandbox/visual/croqlw_sandbox.html.
- **Code:** `sandbox/visual/croqlw/`, a copy of `croqxs/` (X-SWEEP V3, f7645d10).
- **Untouched:** `croqxs/`, `croqhs/`, `croqvg/` and `feint2ef/` are unchanged. They run inside the Lab as `ENG.xs3`, `ENG.hs2`, `ENG.vg1` and `ENG.cur`.
- **Local only:** the characters are real players' models.

## Files that differ from croqxs

| File | What changed |
|---|---|
| `v_tech.js` | `croqLWOf()` / `CROQ_LW`: V3's `croqXOf` unchanged up to the first touch. After it:<br>· the right inside carries the ball inward (a waypoint at +0.05);<br>· the right foot comes down at +0.10 just behind the ball, on its own side of the ball's path;<br>· the left foot's whole path is authored (four body-relative waypoints at +0.06 / +0.09 / +0.12 / +0.15): outward first, a steady forward ramp, no waypoint on the ball;<br>· the receive is a cushion: the left inside takes the ball from 4.5 to 2.2 m/s (V3 sent it on at 3.1).<br>V3's `CROQ_XS` stays in the file, unused. |
| `v_meta.js` | CROQUETA → `ids: CROQ_LW / CROQ_W / CROQ_R`. |
| `lw_geom.js` | **New:** the leg wave, build-independent:<br>· each leg's angle seen from behind;<br>· the landmarks L0 – L6;<br>· both legs at each landmark;<br>· both feet's continuity (velocities, per-tick and per-frame displacement, acceleration, lead over the ball).<br>The Lab and `tools/croq_legwave.mjs` both use it. |
| `v_cases.js` | `CROQ_LWR`: the one card, with two lanes: A = V3 (`eng: "xs3"`) and B = this build.<br>`CROQ_XSR`'s B lane now runs `xs3`. |
| `u_viewer.js` | `ENG.xs3` (croqxs, with its own meta table).<br>The LEG-WAVE V4 review section:<br>· its cameras (REAR LOW, REAR CLOSE, OVERHEAD CLOSE, GAMEPLAY first);<br>· ⇄ A \| B;<br>· the ball / lane toggles;<br>· L0 – L6 (each a paused frame);<br>· ◀ / ▶ one frame, ◀ / ▶ one landmark;<br>· **L1 → L5 LOOP 0.25×** (the replay's new `seg` loop);<br>· the leg-wave table and the live wave plot under the info box.<br>The default card; the banner. |
| `tools/croq_legwave.mjs` | **New:** the leg-wave report (`--all` = V4 / V3). |
| `tools/croq_integrity.mjs` | Five builds (V4 / V3 / V2 / V1 / ADV-4). |
| `tools/croq_xgeom.mjs` | V4 / V3 / V2. |
| `tools/croq_diverge.mjs`, `tools/v_cpu.mjs` | Against V3. |
| `../croqlw_lab.html`, `../croqlw_sandbox.html` | The pages. |

`u_tc.js`, `u_body.js`, `c_sim.js`, `u_sim.js` and `v_run.js` are unchanged from croqxs.

## Next on the owner's word

1. The 1× review: step L1 → L5 frame by frame, with the ball hidden.
2. The decisions in `LEG_WAVE_V4_REPORT.md` §8, especially the right leg's `/` against the 0.1 s it has.
3. Then generalize: walk, run, mirror and other entry states. Not before.
