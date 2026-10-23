# BODY FEINT V2 — EXIT FOOT — handoff

- **Lab:** http://127.0.0.1:8361/sandbox/visual/feint2ef_lab.html. Its first section is **BODY FEINT V2 — EXIT-FOOT REVIEW**.
- **Sandbox:** http://127.0.0.1:8361/sandbox/visual/feint2ef_sandbox.html.
- **Code:** `sandbox/visual/feint2ef/`, a copy of `feint2vg/` (PREVIOUS VIDEO-GUIDED V2, 7853a88f).
- **Untouched:** `feint2vg/` and `feint2/` are unchanged. `feint2vg/` runs inside the Lab as lane A (`ENG.vg`), and `feint2/` remains as `ENG.prev`.
- **Local only:** the characters are real players' models.

| File | What changed |
|---|---|
| `v_tech.js` | `bodyFeintOf`, the free / exit foot only:<br>the decisive swing's waypoints: the tuck behind toward the fake (to the midline, toe a little that way), the hold through the lie, the release after the hips, the outside to the ball's inner side, the toe left free on the way in;<br>the exit foot's landing at the ball (`rel: "B"`), where its outside touched;<br>the centre-of-mass heading's return 0.02 s earlier (the pelvis reverses before the foot releases) |
| `v_cases.js` | `BF_VG`: two lanes per case. A = VIDEO-GUIDED (previous, `eng: "vg"`), B = EXIT-FOOT. |
| `u_viewer.js` | `ENG.vg`<br>two-lane comparisons<br>the EXIT-FOOT REVIEW section (cameras FRONT HIGH, the default · REAR CLOSE · OVERHEAD CLOSE · GAMEPLAY · …)<br>**⇄ A \| B at this moment**<br>`?eng=vg` |
| `../feint2ef_lab.html`, `../feint2ef_sandbox.html` | the pages |

## Tools (`feint2ef/tools/`)

| Command | What it measures |
|---|---|
| `node feint_foot.mjs [--build ../ \| ../../feint2vg/] [--case …] [--rows 1 --every 2]` | the free foot through the lie: across from the pelvis, toe direction, the contact's surface / nearest face / gap, and per phase (approach / lie / release / landing) the per-tick step and toe-turn rate |
| `node feint_sync.mjs [--build …] [--case …]` | the order: the lie's deepest, the pelvis's reversal, the free foot's release, the touch |
| `node feint_integrity.mjs` | the six cases against PREVIOUS VIDEO-GUIDED: the free foot, plus SLIDE / JUMP / CROSS / KNEE / FLOAT / SWAP, the pelvis step, spikes, possession |

`feint_measure`, `feint_shape`, `feint_rapid`, `v_cpu` (against `feint2vg`) and `v_browser` (with ⇄) work as before.

## Evidence (`evidence/`)

- **Feint:** `feint_integrity.*`, `sync.txt`, `shape.txt`, `feint_measure.*`, `rapid_input.*`, `exit_angle_sweep.txt`.
- **Regression:** `cases.*`, `extreme_ball_on` / `_off`, `battery.txt`, `determinism.txt`, `body_torture_18.txt`, `torture_page_40.txt`, `intent_torture.txt`, `cpu.txt`.
- **Browser:** `browser.json`.

## Next on the owner's word

1. The 1× review, and the decisions in `EXIT_FOOT_REPORT.md` §8.
2. The rapid-input carry events remain, as in VIDEO-GUIDED: they are in the ordinary carry.
