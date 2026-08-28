# ANIMR3 CHECKPOINT — state at course-correction (2026-08-25)

Status: AnimR3 (?renderer=anim3, staging working tree only) frozen mid-validation per user instruction.
cal11/RC8/live/season untouched throughout. anim2 remains the deployed default.

## Forensic Case #1 verdict (anim2, MW08 prefix db767af41846 seed 789335328, replayed deterministically)
B+C+D (presentation reconstruction + buffer/timing + camera). Zero authoritative deficiency.
- 94 hard ball teleports/min (worst 81.7 m/frame); 82% of passes never rendered a flight (107/597)
- 35% of consecutive actions < 0.35 s apart; goals presented in 0.8 s / 0.5 s at 23-33x
- median playhead rate 26.6x (design 12x) - deficit controller races between flight-holds, discarding choreography
- camera 44 m width, 6.8/22 players visible; feed spoils events by median 3.0 s
Root causes: rate-modulated continuous playhead + single-flight hold + event-drop guard (S0-2) + launch-overrides-launch + 44 m camera + feed keyed to snap arrival.

## AnimR3 built so far (compiled segment timeline)
Architecture: authoritative events+frames -> deterministic compiler -> ordered presentation segments
(strike/flight/settle/carry/duel/pickup/link/reset/goalhold/scramble/mark) -> sequential playhead ->
players pursue authoritative interp at the playhead sim position under human speed caps -> 60 FPS draw
(borrows AnimR2 pitch/player/ball drawing). Feed/score/stats commit at the presentation playhead
(measured sync offset -0.03 s). Broadcast camera 78-79 m (18.5/22 players visible, min 13).

Measured on MW08 prefix (63 sim-min):
- 100% of passes render a visible flight (594/595); goals presented over 6.9 s and 9.6 s with net-hold
- player speeds med 8.1 m/s p99 13 (capped); zero waiting leaks (wall == compiled durations)
- profiles: STANDARD ~10.2-10.6 min/90; QUICK ~8.5-9.0; EXTENDED ~14.8-15.2 (readability floors documented)

## OPEN DEFECT (diagnosed, NOT yet fixed - next session's first target)
Flight ORIGIN bug: compiler uses authBallW(e.timestamp) as flight origin, but 1 Hz frames are sampled
AFTER the event's engine second - the ball has already arrived. Compiled origin==dest (planned flight
distance median 0.9 m), so durations floor at 0.18 s while the RENDERED flight covers the real distance
from the presented ball -> apparent speeds ~107 m/s med and 1487 frames >3 m. Fix is one line
(origin = authBallW(t-1) / striker position) plus re-measure. Residual action-gap 39% <0.35 s likely
shares this root (flights too short to sequence).

Artifacts: rforensic/{mw08_start.json, mw08_replay.json, anim2_trace.json, anim3_trace.json,
anim3_trace2.json, metrics.py, ANIMR3_CHECKPOINT.md}. Staging server :8299 (data_rc_anim3).
