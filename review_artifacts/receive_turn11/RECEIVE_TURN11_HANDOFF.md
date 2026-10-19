# RECEIVE-TURN-1.1 — handoff

**State:** presented for owner review, NOT frozen, NOT integrated. Next in the owner's queue (verbatim in `sources/2026-10-19_user_instruction_queue_1_integration_queue_2_moving.md`):
QUEUE #1 — integrate RECEIVE-KILL + RECEIVE-TURN into RECEIVE-CONTROL (stop / test / report), then QUEUE #2 — receiving while moving.

## What is where
- `sandbox/visual/receive_turn11/rt11_body.js` — `HumanTurnBody(E, M4, skel, prep, ep)`: the human body around a RECEIVE-TURN-1 episode (`prepareTurn` + `runTurn` from
  `receive_turn1/rt_sim.js`, imported unchanged). `poseAt(tAbs, ballLocal)` → `{ skin, J, pose, S, psi, feet, w, twist, crouch }`; `ev` = the event times; `diagnostics(ballAt)`.
  Same constructor and `poseAt` contract as RECEIVE-TURN-1's `TurnBody` — a drop-in replacement for any consumer of the authoritative receive facts.
- `sandbox/visual/receive_turn11/rt11_lab.js` + `sandbox/visual/receive_turn11_lab.html` — the lab (body toggle, body / football top view, cameras, `RTL.setRel / events /
  evalCase / bodyProbe`).
- `sandbox/visual/receive_turn11/tools/` — metrics, continuity, neutrality, mirror, Chrome = Node, regression, capture, clip lists, strip composer, review / report builders.
- `review_artifacts/receive_turn11/` — report, status, evidence, clips (main / bc / tech), screens, review page (local only).

## Rebuild
```
node sandbox/visual/receive_turn11/tools/rt11_metrics.mjs review_artifacts/receive_turn11/evidence/human_metrics.json
node sandbox/visual/receive_turn11/tools/rt11_neutral.mjs review_artifacts/receive_turn11/evidence/animation_neutrality.json
node sandbox/visual/receive_turn11/tools/rt11_mirror.mjs  review_artifacts/receive_turn11/evidence/mirror.json
PUPPETEER_NODE_MODULES=<dir> node sandbox/visual/receive_turn11/tools/rt11_chrome.cjs review_artifacts/receive_turn11/evidence/rt11_chrome_node.json <profile>
node sandbox/visual/receive_turn11/tools/rt11_regress.mjs 1 12 review_artifacts/receive_turn11/evidence/regression.json
S=<scratch with node_r + ffmpeg> zsh sandbox/visual/receive_turn11/tools/rt11_clips.sh sandbox/visual/receive_turn11/tools/clip_lists/rt11_main_list.txt <out> 4   (bc, tech lists likewise)
node sandbox/visual/receive_turn11/tools/rt11_review_build.mjs && python3 sandbox/visual/receive_turn11/tools/rt11_report_build.py
```

## For integration (QUEUE #1)
- The body consumes only the episode's facts; it never writes back. Neutrality, Chrome = Node and the mirror check must stay green after any move.
- The left / right mirror is exact only because (a) the ready-stance stagger is turn-side relative, (b) the pelvis reach correction is order-free. Keep both.
- Measure foot continuity with `tools/rt11_contin.mjs` (posed skeleton only) — target-side measures miss boundary snaps.
