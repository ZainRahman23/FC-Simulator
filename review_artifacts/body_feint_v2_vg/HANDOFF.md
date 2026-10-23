# BODY FEINT V2 — VIDEO-GUIDED — handoff

- **Lab:** http://127.0.0.1:8361/sandbox/visual/feint2vg_lab.html. Its first section is **BODY FEINT V2 — VIDEO-GUIDED REVIEW**.
- **Sandbox:** http://127.0.0.1:8361/sandbox/visual/feint2vg_sandbox.html.
- **Code:** `sandbox/visual/feint2vg/`, a copy of `feint2/` (PREVIOUS V2, 0c65eac3).
- **Untouched:** `feint2/` is unchanged and runs inside the Lab as lane A (`ENG.prev`). `adv4/`, `cruyff_chop1/`, `vocab1/` and the locked `tc_baseline_88573ef0*` are unchanged too.
- **Local only:** the characters are real players' models.
- **The reference recording** (third-party EA FC 26 footage) is not committed. Its analysis is in `VIDEO_STUDY.md`, and the before-tuning comparison in `COMPARISON.md`.

| File | What changed |
|---|---|
| `v_tech.js` | `bodyFeintOf(o)` rewritten from the reference: the lie's keys, `armE` / `armF` (the exit and fake arm postures), `armW`, `headDrop`, the wider false step, the fake foot planted through the touch, the free leg's path behind (`pelvis` waypoints), the softer collecting touch, the exit stride routed in front of the planted exit foot (`swingIn`), the ball on the exit side (`B`), the brake |
| `u_body.js` | the authored arm posture per side (abduction / flexion / elbow) blended over the cycle's arm by `armW`; the head's drop (`headDrop`) — zero for every other action |
| `u_tc.js` | the new channels' defaults and their mirror mapping (`armE` → the exit side's arm)<br>the trimmed entry's ball window (`bfball`)<br>the trimmed entry's facing / heading from the entry line (`bftrim`)<br>the walking trimmed entry ≤ 50° (`bfball`)<br>the slower turn for large exits (`bfturn`)<br>the posture blend ≥ 0.18 s when control leaves a feint (`bfblend`, also recorded in `adopt()` as `bfLeave`) |
| `u_sim.js` | the carry's demand channels respect `bfLeave` (`bfblend`) |
| `v_cases.js` | `BF_VG`: the owner's six cases, each with three lanes (PREVIOUS V2 · VIDEO-GUIDED · OLD) |
| `u_viewer.js` | the VIDEO-GUIDED REVIEW section<br>lanes with their own engine (`eng: "prev"`) and spacing<br>cameras FRONT HIGH (the reference's view), REAR CLOSE, THREE LANES<br>`?eng=prev` |
| `../feint2vg_lab.html`, `../feint2vg_sandbox.html` | the pages (titles; the section's styles) |

## Tools (`feint2vg/tools/`)

| Command | What it measures |
|---|---|
| `node feint_measure.mjs` | the curated feint cases: timings, the lie, speeds, integrity |
| `node feint_shape.mjs [--build ../ \| ../../feint2/] [--case …] [--req BODY_FEINT]` | the reference's cues on any build's posed body (trunk pitch / lean, head drop, the arms, the free foot, the false step, the lowest speed) |
| `node feint_integrity.mjs` | the owner's integrity list for the six cases, this build against PREVIOUS V2 |
| `node feint_rapid.mjs` | rapid input |
| `node feint_pose.mjs` | the posed body's shape through one case |
| `node v_cpu.mjs` | CPU, against `feint2` |
| `v_browser.cjs` | the browser test: the VIDEO-GUIDED REVIEW's cards and three-lane tables included |

Everything else is as in `feint2/tools`. `ABL=` switches: `bfball`, `bftrim`, `bfturn`, `bfblend` (plus `bfdrift`, `bfseq`, `bfflight`, `cycle9` and the earlier ones).

## Evidence (`evidence/`)

- **Feint:** `feint_measure.*`, `feint_shape.txt`, `feint_integrity.*`, `rapid_input.*`, `exit_angle_sweep.txt`, `latency.txt`.
- **Regression:** `cases.*`, `extreme_ball_on` / `_off`, `body_torture_18.txt`, `torture_page_40.txt`, `determinism.txt`, `battery.txt`, `intent_torture.txt`, `cpu.txt`.
- **Browser:** `browser.json` (no images committed).

## Not done / next on the owner's word

1. The 1× review, and the four decisions in the report §9.
2. The remaining rapid-input carry events (report §5): carry floats below 3 m/s after chained requests, and the carry's far-foot crossing under over-fast alternation. Both are in the carry's own gait.
