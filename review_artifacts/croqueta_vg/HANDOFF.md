# LA CROQUETA — VIDEO-GUIDED — handoff

## Where things are

- **Lab:** http://127.0.0.1:8361/sandbox/visual/croqvg_lab.html. Its first section is **LA CROQUETA — VIDEO-GUIDED REVIEW**, and with no `?case` the page opens on its first card.
- **Sandbox:** http://127.0.0.1:8361/sandbox/visual/croqvg_sandbox.html.
- **Code:** `sandbox/visual/croqvg/`, a copy of `feint2ef/` (the Body Feint EXIT-FOOT build, f8a0e374).
- **Untouched:** `feint2ef/`, `feint2vg/` and `feint2/` are unchanged. `feint2ef/` runs inside the Lab as lane A (`ENG.cur`: CURRENT ADV-4).
- **Local only:** the characters are real players' models.

## Files that differ from feint2ef

| File | What changed |
|---|---|
| `v_tech.js` | `croquetaOf()` / `CROQ_VG`: the video-guided croqueta template. There are three paces: `CROQ_W` (walk, the reference's), `CROQ_J` and `CROQ_R`. It holds:<br>· the set-up: a braking plant beside the ball, the receiving foot planted wide;<br>· the body leading the first touch: the COM heading turns toward the exit 0.14 s before the touch, the speed braked to vSet;<br>· the left inside's sweep from the planted foot;<br>· the first foot down beside the receiving foot (`rel: "stance"`);<br>· the receive beyond the body's line (+0.27 s × pace, the ball 8° into the receiving lane);<br>· the receiving foot's exit touch two steps on (6° back toward the midline);<br>· the authored posture: pitch, side lean, crouch, head drop, and arms per side (armW / armE / armF). |
| `v_meta.js` | CROQUETA → `ids: CROQ_W / J / R`, `gen: "LAT"`, `genFallback: true` (ADV-4's generic transfer as the fallback only), status REVIEW, MANUAL (so not in AUTO_TECH). `intentOf` passes `genFallback`. |
| `u_tc.js` | Five additions, all gated to the croqueta:<br>(1) the leave-blend (`bfLeave`) extends to `croqVG` templates;<br>(2) stance `at.rel: "stance"` (across from an earlier template stance, along from the body);<br>(3) contact `aim.off` (degrees off the exit line);<br>(4) the croqueta's set touch is refused with the ball on the receiving foot's side;<br>(5) `genFallback`: the generic candidates only when no template instance exists, and an entered fallback runs on. |
| `u_sim.js` | The demand-channel blend's `fromBF` also covers `CROQ_*`. |
| `v_run.js` | A request maps through `sim.intentOf` when the sim has one (another build's meta table). |
| `v_cases.js` | Six `REF ·` cases (walk / jog / run × L → R, R → L) and `CROQ_VGR` (the A \| B pairs: A = CURRENT ADV-4, `eng: "cur"`). |
| `u_viewer.js` | `ENG.*.intentOf` (each engine's own meta: CURRENT's lane plays ADV-4's croqueta, 12/12 identical to its own runner).<br>Cameras: `rearhigh` (slow yaw, replay-like), `triorear`, `toplane` (fixed overhead).<br>The ball toggle (SHOWN / DIM / HIDDEN) and the lane guide (`croqOverlay`).<br>The review section, ⇄, the A \| B table (`cqMetrics`), the banner, the default camera and case. |
| `../croqvg_lab.html`, `../croqvg_sandbox.html` | The pages. |

`u_body.js` and `c_sim.js` are unchanged.

## Tools (`croqvg/tools/`)

| Command | What it does |
|---|---|
| `node croq_probe.mjs [--build ../ \| ../../feint2ef/] [--case "REF · JOG L → R"] [--every 6] [--span 0.6]` | Per tick, from the first croqueta contact: root, pelvis, head, feet and ball across (+ = exit), ball ahead, speed, lean, pelvis height |
| `node croq_integrity.mjs [--build …] [--only …] [--json f]` | The six cases on both builds: the rhythm, the transfer, v_extreme's classes, foot steps, toe turns, pelvis and root steps, spikes, clearance, contacts (surface, nearest face, gap), possession |

Everything else (`v_cases_run`, `v_battery`, `v_extreme`, `v_det`, `v_bodytort`, `c_torture`, `v_intent_torture`, `feint_*`, `v_cpu`) works as before.

## Next on the owner's word

1. The 1× review, and the decisions in `CROQUETA_VG_REPORT.md` §8.
2. Freeze or integrate nothing before then.
