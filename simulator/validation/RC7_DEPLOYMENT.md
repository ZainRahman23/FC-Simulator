# RC7 DEPLOYMENT — ANIMATED MATCH RENDERER M1 (2026-08-24)

Deployed 0.1.0-rc7 over RC6 at ~/TouchlineRC1 (port 8100, ngrok blighted-chop-overhand.ngrok-free.dev). Football unchanged: v0.7-cal10.

- Live PID after deploy+restart-test: see /tmp/rc7live.pid (94307 at deploy time).
- DB backup: ~/TouchlineRC1/data/backup-touchline-pre-rc7-20260824-025946.db (sha256 e97a0768…, identical to live at backup time).
- Rollback: ~/TouchlineRC1/app-rc6-backup (kill PID → rm app → mv app-rc6-backup app → restart; DB backward-compatible, schema v1 unchanged).
- Football freeze proof: deployed engine.py/calibration.py/players.json byte-identical (cmp) to simulator/checkpoints/cal10-checkpoint-20260823; sha256 587a2ec7ac1cb38f2f09 / 823bdbcab1e609bd1684 / 14bbe398203d9ba60106.
- Parity/neutrality (fixture RC7-PARITY/NEUTRAL, seed 909090909, LIV-v-WHU kickoff config, both coach-AI): local full-run, local frames-ON interactive, hosted full-run, hosted frames-ON interactive → all four digests = 8ccbe6051555af0d8cc913ec (2700 events, 3-0). Frames-ON runs streamed 5400/5400 frames across 30 substitutions.
- Deployment-only fix (found in verification, applied to working tree + deployed build): frame-sampler roster was built from player *states* at request start; bench players get a state only when subbed on, so an AI substitution entering mid-batch crashed the advance endpoint (500, KeyError). Fix: roster = sorted(states ∪ bench) — the constant full squad — so indices are stable all match. Client already tolerates inactive/absent entries. Digest-neutral (proof above); 42/42 app battery re-run post-fix. No other renderer/football change; APP_VERSION stamp is the only other diff vs the validated M1 tree.
- Hosted browser battery (disposable saves save-86pd29humt72zcti, save-rc7-verify): anim default ON (canvas, 0 legacy markers), ?debug=1 panel, ?renderer=circles fallback (22 markers, no canvas), kickoff, pause exact, 1x/2x/4x = 6.0/12.0/24.0 sim-s per real-s, tactics/instructions/substitution accepted live, refresh-reconnect (paused→play, same match), REAL production restart mid-match (reconnecting w/ frozen playhead → MATCH_RECOVERED → live, monotonic clock), halftime, FT 0-1, result persisted with rc7/cal10 stamps. Zero page errors.
- User season save-e6sdbd31mt5gn04o: state byte-identical pre/post (MW01–MW06 with original cal5–cal10 stamps); MW07-AVL-LIV unconsumed. Mock gate: allow_mock=false.
- Orphaned live test rows (incl. stale ones from earlier RC verifications) abandoned via API; 0 live rows, active_matches 0.
