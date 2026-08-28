# RC8 DEPLOYMENT — CAL11 FOOTBALL + ANIM2 RENDERER (2026-08-24)

Deployed 0.1.0-rc8 over RC7 at ~/TouchlineRC1 (port 8100, ngrok blighted-chop-overhand.ngrok-free.dev).
Package: engine 0.7 / **v0.7-cal11** (C1 box-arrival runs + C2 post-BEAT exploitation) / players-v3-4attrs /
**anim2 (Renderer Milestone 2) as DEFAULT** (?renderer=anim1 and ?renderer=circles preserved as explicit fallbacks). Curve deferred.

- Backups: DB ~/TouchlineRC1/data/backup-touchline-pre-rc8-20260824-201444.db (sha cd83dcfb9f77d5af, identical to live at backup); app rollback ~/TouchlineRC1/app-rc7-backup. DB integrity_check ok pre+post; schema v1 unchanged.
- Hash proofs: deployed engine.py/calibration.py/players.json byte-identical (cmp) to cal11-checkpoint-20260824; deployed touchline.html byte-identical to the validated anim2 M2 working tree (plus the two documented deployment-only changes below). Only server.py diff vs working tree = APP_VERSION line.
- Deployment-only changes (integration fixes, presentation/config only):
  1. Default renderer flipped 'anim1' -> 'anim2' (one line; e2e tests updated to pin their modes; 43/43 green).
  2. Camera negative-scale guard: when the pitch container collapses (view switch/FT panel) the camera eased toward a negative scale producing a one-frame canvas error; draw() now skips collapsed frames and cam scale is floored. Found in hosted smoke, fixed in working tree + deployed + staged copies identically; stress-tested (view-switch loop, zero page errors).
- Digest matrix (#16): same seed/config -> local cal11 full-run, hosted full-run (via tunnel), circles-pattern (6s no-frames), anim1-pattern (6s frames), anim2-1x (18s frames), anim2-4x (72s frames) all = **35e95791fa6d8f38fdfa23c3** (0-2, 3113 events). Renderer modes and playback speeds provably cannot touch football.
- Hosted battery: anim2 default active (canvas, 0 legacy markers); STANDARD pacing 11.7 sim-s/s (validated 11.5); pause exact; 2x/4x = 2.0/4.0 at 61 FPS; tactics/instructions/substitution accepted live; refresh-reconnect (paused->resume, monotonic); real process kill -> reconnecting (buffer-drain only) -> restart -> recovered live monotonic; kickoff->HT->2nd half->FT (0-2) with rc8/cal11 persistence stamps; production mock gate allow_mock=false.
- cal11 presence: digest identity to local cal11 is bit-exact proof; behavioral markers on a deployed ledger: 28 box entries with 6 box shots, post-BEAT follow-up faster, dribble outcome probability vocabulary unchanged (no forced dribbling: post-BEAT next actions 11 CARRY / 9 PASS).
- Season: save-e6sdbd31mt5gn04o state byte-identical pre/post; MW01-07 original stamps intact (MW07 = rc7/cal10, digest b8117f970e058eced0389156); MW08-LIV-BRE unplayed, no persisted row — initializes under cal11+anim2 when the user starts it.
- Incident log: the mid-battery production process received SIGTERM when a timed-out test harness killed its process group (the restarted server was its child); relaunched detached. Counts as an extra successful crash-recovery cycle; no data loss (WAL + replay recovery).
- Cleanup: all disposable live rows abandoned; 0 live rows; active_matches 0.
