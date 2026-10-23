# BODY FEINT V2 — EXIT FOOT (23 Oct 2026)

**Status: stopped for the owner's 1× review. NOT frozen, NOT integrated.** Owner instruction, verbatim: `sources/2026-10-23_user_instruction_body_feint_v2_exit_foot.md`.

**Scope:** one focused lower-body pass on the VIDEO-GUIDED feint, the free / exit foot only. The upper body is untouched: trunk pitch and lean, shoulders, head, arms. One small synchronisation change was made to the pelvis/centre of mass (§3).

**I cannot play video in real time.** The reference was re-read frame by frame, and the renders were compared at 60 fps from FRONT HIGH, REAR CLOSE and OVERHEAD CLOSE.

## ▶ PLAYABLE (LOCAL ONLY)

**BODY FEINT V2 — EXIT-FOOT REVIEW:** http://127.0.0.1:8361/sandbox/visual/feint2ef_lab.html (the first section). Sandbox: `feint2ef_sandbox.html`.

- **Six cards:** jog / low speed / run × fake left → right and fake right → left.
- **Buttons on each card:**
  - ▶ **B · EXIT-FOOT V2**;
  - **A · VIDEO-GUIDED (previous)**: the committed `feint2vg/` build (7853a88f), run untouched;
  - **A | B side by side**, from the identical entry and input;
  - MIRROR, TRY, 1× / 0.5× / 0.25×.
- **Cameras, in the owner's priority order:** **FRONT HIGH** (the default, the reference's view) · **REAR CLOSE** · **OVERHEAD CLOSE** · **GAMEPLAY** · FRONT · SIDE CLOSE · BOTH LANES (the side-by-side default).
- **⇄ A | B at this moment:** switches between the two versions at the exact replay moment, in the same camera. Pause at the deepest point, press ⇄, and the feet compare frame for frame.

## 1. The reference again (example A, legs only; `VIDEO_STUDY.md` in body_feint_v2_vg)

t = 0 is the false-step plant; the touch is at +0.27:

| t (s) | What the free (exit-side) foot does |
|---|---|
| −0.13 … −0.08 | It is the penultimate plant, on the exit side. Its push launches the false step. |
| −0.03 | It leaves the ground on the exit side. |
| **+0.07 … +0.20** | It swings behind and **tucks in toward the body's midline: toward the fake**. It stays behind the fake leg, never across it. |
| +0.10 … +0.17 | **The hips reverse** while it is still tucked. |
| **+0.20** | **It releases** and comes through fast. |
| **+0.27** | **It lands at the ball's inner side: its OUTSIDE takes the ball** toward the exit. The fake foot is still down. |

So the order is foot tucks into the lie → hips reverse → free leg releases → outside-foot touch on the landing.

## 2. What PREVIOUS VIDEO-GUIDED V2 did with that foot (measured: `evidence/feint_integrity.txt`, `feint_sync.txt`)

- **It gave the exit away.** Through the lie the free foot hung **out on the exit side**: 0.21–0.27 m from the pelvis toward the exit, its toe turned **16–19° toward the exit**.
- **It released too early.** The swing started at −0.15 s (jog), **before** the hips reversed (−0.10). From the rear the foot was already beside the ball at −0.10.
- **The exit touch was already the outside of that foot**, with a 0.0 cm gap.
- **The landing jumped.** The foot landed on the travel line 0.03 s after an airborne touch. Its follow-through was planned after its own landing, so it jumped **9 cm in one tick** with the toe snapping **1160–1290°/s**, in every case. The same flaw is in PREVIOUS V2 (`feint2`).

## 3. What changed (`sandbox/visual/feint2ef/`, a copy of `feint2vg/`; only `v_tech.js`'s feint template, plus the Lab)

| | EXIT-FOOT V2 |
|---|---|
| **Free foot in the lie** | After its push it **tucks in behind the body toward the fake**: to the pelvis's midline, 0.05–0.08 m from it, against 0.21–0.27 m out on the exit side before. The toe is turned **4–10° toward the fake** (was 16–19° toward the exit). Never past the midline: the fake foot is about 0.4 m out on the other side, and leg clearance stays ≥ 0.12 m. |
| **Timing** | It starts tucking right after its push, before the lie peaks. It **holds until the hips have reversed**. |
| **Hips / centre of mass** | **The only upper-body-side change.** The heading toward the fake returns 0.02 s earlier, so the pelvis reverses first: jog −0.12 s, walk −0.13, run −0.10. Shift 0.11 → 0.10 m; trunk, shoulders, head and arms unchanged. |
| **Release** | Then the foot comes through explosively: jog −0.11 s, walk −0.12, run −0.09, **after the pelvis**. Its toe is left free on the way in, so it turns into the outside contact's own orientation at every pace. |
| **Outside-foot touch** | The foot arrives at the ball's inner side, and **its OUTSIDE takes the ball** into the exit (nearest boot face OUTSIDE, gap 0.0 cm, all six cases). The ball is untouched during the lie, as before. |
| **Landing** | **The foot lands where its outside met the ball** (the touch on the landing step, as in the reference). That removed the 9 cm jump and the toe snap. |

## 4. Before / after (jog FAKE LEFT → RIGHT unless stated)

| | PREVIOUS VIDEO-GUIDED V2 | EXIT-FOOT V2 |
|---|---|---|
| Free foot across in the lie (+ = exit side) | +0.22 m | **+0.06 m** (walk +0.08, run +0.05) |
| Free foot's toe in the lie (+ = toward the exit) | +18° | **−5° … −10°** (toward the fake) |
| Pelvis reverses / free foot releases | −0.10 / **−0.15** (foot first) | **−0.12 / −0.11** (hips first) |
| Exit touch | OUTSIDE, gap 0.0 cm | OUTSIDE, gap 0.0 cm |
| Largest per-tick foot step | 9.0 cm (the landing) | 3.6 cm (walk 3.0, run 4.8, at the release) |
| Fastest toe turn | 1164–1291°/s (a snap) | ≤ 258°/s at a jog, ≤ 635°/s at a walk, ≤ 366°/s at a run |
| Upper body (pitch / lean / head / arms) | 23° / 29° / 19 cm / out | unchanged |
| Request → touch / useful exit | 1.02 / 1.15 s | 1.02 / 1.15 s |
| Speeds | 3.2 → 1.7 → 3.2 | 3.2 → 1.7 → 3.2 |

## 5. Integrity

**The six curated cases** (`evidence/feint_integrity.txt`):

| | Leg crossings | Foot jumps | Plant slides | Knee pops | Floats | Foot swaps | Ankle snaps (toe turn > 900°/s) | Free-foot discontinuity (largest step / tick) | Ball contact | Possession |
|---|---|---|---|---|---|---|---|---|---|---|
| **EXIT-FOOT V2** | 0/0 | 0/0 | 0/0 | 0/0 | 0/1–0/2 | 0/0 | **none**: ≤ 635°/s | **≤ 4.8 cm** (run release) | OUTSIDE, gap 0.0 cm | 0 missed, 0 exits |
| PREVIOUS VIDEO-GUIDED V2 | 0/0 | 0/0 | 0/0 | 0/0 | 0/1–0/2 | 0/0 | **6 of 6**: 658–1291°/s | **9.0 cm** (the landing) | OUTSIDE, gap 0.0 cm | 0 missed, 0 exits |

Counts are normal-visible / slow-motion. Leg clearance through the tuck stays ≥ 0.12 m. Torso / shoulder spikes: 0. Pelvis step ≤ 0.4 cm / tick.

**Exit angles 15–90°**, 4 stride phases each (`evidence/exit_angle_sweep.txt`): no visible event at a jog, a walk or a run.

**Rapid input** (28 runs, `evidence/rapid_input.txt`): body normal 13 / slow 72, spikes 80, 0 planted-foot turns, 0 exits, 0 missed. PREVIOUS VIDEO-GUIDED: 13 / 75 · 80. The remaining visible events are the same ordinary-carry ones (floats below 3 m/s, the far-foot crossing under over-fast alternation). As instructed, the carry was not modified.

**Regression** (every non-feint line compared with PREVIOUS VIDEO-GUIDED's evidence):

| Check | Result |
|---|---|
| Curated cases, extreme ball on / off, battery, determinism | identical |
| Body torture 18 × 60 s | 254 / 328 identical |
| Possession torture 40 seeds | 10 losses, 0 missed, identical apart from CPU |
| 361 random manual requests | 0 exits, 0 missed |
| Determinism | 18 / 18 + 18 / 18 |
| CPU | 118.6 vs 115.9 ms per simulated s (+2 %). The worst tick varies run to run (PREVIOUS: 17.9 / 26.2 ms in two runs). |
| Browser | 0 console errors · 0 HTTP errors · 170 feint-section buttons · 9 cameras · frame step · the six A \| B tables · ⇄ at the same moment (0.86 s, engine switched) · the sandbox request PLAYED |

**Shared code:** none changed. Only the feint template (`v_tech.js`) and the Lab differ from PREVIOUS VIDEO-GUIDED.

## 6. Mirror

Same template; every number in `feint_integrity` matches for each pair:
- **FAKE RIGHT → EXIT LEFT:** the left foot tucks toward the right, then the outside of the left foot takes it left.
- **FAKE LEFT → EXIT RIGHT:** the right foot tucks toward the left, then the outside of the right foot takes it right.

The toe numbers differ by 2–4° between the two directions, from the rig's own asymmetry.

## 7. Limitations

- The free foot's lift behind is about 0.3 m; the reference's heel comes higher.
- At a run the lie is shorter, so the tuck is brief.
- The rapid-input carry events (§5) are unchanged: they are in the ordinary carry, and were not touched.

## 8. Owner decisions

1. At 1×: does the whole player sell the fake (support foot, free foot, knees, pelvis, torso, shoulders, arms, head), then reverse sharply into the outside-foot exit as one elastic action?
2. The tuck's depth: to the midline as built, or a touch further toward the fake? It cannot go much further without crossing behind the fake leg.
3. Freeze nothing yet: the next pass on your word.
