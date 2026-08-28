# CONTINUOUS FOOTBALL RUNTIME — MILESTONE REPORT (body only; STOPPED before integration)
Date: 2026-08-25 · Everything isolated under sandbox/ · nothing deployed · cal11 untouched.

1. FREEZE PROOF: pre/post hashes byte-identical for engine.py (4d8ac52d864fcc6adaeb),
   calibration.py (6fb2036c6cff41edefab), players.json (14bbe398203d9ba60106), server.py,
   web/touchline.html; cal11 checkpoint cmp-identical; live RC8 healthy (0.1.0-rc8/v0.7-cal11);
   DB integrity ok; no fixture consumed; AnimR4/production renderer untouched.
2. FILES CREATED (all new, isolated): sandbox/{CFR_REFERENCE_SPEC.md, cfr.js, scenarios.js,
   index.html, CFR_MILESTONE_REPORT.md}. Zero production files modified.
3. REFERENCE STUDY: CFR_REFERENCE_SPEC.md classifies every OpenSWOS principle
   ADOPT/ADAPT/REJECT/DEFER with sources (linear friction, restitution+sticky-settle, radius
   possession, kicker exclusion, touch-ahead dribbling, restart states, camera slew, clock
   separation = ADOPT; locomotion inertia/facing = Touchline-native ADDITIONS SWOS lacks;
   SWOS AI/skill/8-way/arcade pace = REJECT; spin, pitch tables, slides, full GK machine = DEFER).
   OpenSWOS is MIT (attribution in cfr.js header); nothing from unlicensed swos-port.
4. ARCHITECTURE: World tick (fixed 60 Hz) → TestAI (disposable) → intents → actIntents (the
   ONLY control surface: MOVE_TO/PASS/SHOOT/CARRY/TAKE_ON/PRESS/COVER/SHAPE/PURSUE/HOLD) →
   Locomotion → body separation → BallPhysics → BallInteraction → out-of-play →
   RestartManager. Renderer reads state; physics never depends on FPS.
5. BALL: x,y,z,vx,vy,vz; g 9.81; linear decel 4.2 ground / 0.8 air; restitution 0.55 with
   XY-keep 0.80 and sticky-settle; kick families SHORT/DRIVEN/LONGG/THROUGH/CUTBACK/LOFT/
   CROSS/CLEAR/SHOT/PUNT/THROWIN/HEADER at real speeds (lofted solved by real gravity:
   25 m lob ≈ 1.9 s hang, 4.4 m apex). Every velocity change is a logged contact; every
   placement is a logged dead-ball restart. Continuity checker samples EVERY frame.
6. LOCOMOTION: accel 4.8 / brake 6.5 m/s², vmax 7.2-8.75 by role/scenario, carrier ×0.875,
   run-back ×0.625; sharp turns force braking (overcommit → RECOVER emerges); facing slews
   slower at speed; soft body-radius separation. Measured (5-min 11v11): med 2.0 m/s,
   p95 6.7, max 8.40 (=cap), accel p99 6.5 (=brake cap). No snapping anywhere.
7. CONTROL: radius 0.9 m (GK hands 1.6 m, fast-shot hands-width 0.8 m); relative-velocity
   gates: <5.5 clean first touch (settles ahead of body), <12 imperfect touch (killed but
   loose), else deflection; kicker exclusion 0.45 s; carrying = touch impulses every
   0.38-0.5 s knocking 1-3 m ahead (never parented); ball can genuinely get away (>4.2 m).
8. TAKE-ONS: physical sequences with defender REACTION LATENCY (press point refreshes each
   0.3 s). Measured: fast-vs-slow — separation 0.96→4.2 m and growing after the knock
   (defender physically turns+chases, never re-teleports); slow-vs-fast — defender stays
   glued (~0.9 m): consequence is pace-emergent; equal-pace inside cut buys a transient
   ~1.8 m via the reaction window. No probabilities anywhere — pure geometry.
9. VOCABULARY exercised in the 5-min 11v11: 35 kicks, 69 controls, 82 loose touches,
   78 dribble touches, 39 tackle pokes, 14 take-on knocks, 37 bounces, 15 deflections,
   2 GOALS, GK catch/parry/hold/distribute, clearance via CLEAR family.
10. RESTARTS (all verified with visible choreography + logged placements):
    KICKOFF (setup→place→take), THROW_IN, CORNER (attackers/defenders into box positions),
    GOAL_KICK, FREE_KICK, GOAL→AFTERMATH(2.5 s)→physical run-back at ×0.625→KICKOFF.
    scn22 sequence observed: OPEN→GOAL_AFTERMATH→KICKOFF_SETUP→KICKOFF_TAKE→OPEN.
11. TEST AI: ~90 lines of disposable geometry (pursue/press/cover/shape, carrier
    shoot/pass-openness/carry/take-on choices, one runner, GK hold+distribute). Deterministic
    via keyed hash kh(seed,tick,pid,tag) — NOT the future brain; in no way related to cal11.
12. DETERMINISM: same seed ⇒ bit-identical world after 3600 ticks; chunked ticking
    (1200×3 vs 3600) identical ⇒ FPS-independent by construction; different seed diverges;
    zero Math.random.
13. PERFORMANCE: 61 FPS live; frame avg 0.33 ms, p95 0.6, p99 0.9; heap +8.9 MB over a
    5-minute match (bounded metric buffers). Headless physics ≈ 300 s simulated in ~11 s.
14. CONTINUITY: 0 violations across the entire battery (12 ball scenarios + take-ons +
    restarts + 5-min 11v11); max single-frame ball move 0.47 m (=a 28 m/s shot, physical).
15. SPEEDS: ball flight med (open play) ~8-9 m/s rolling, kicks 9-31 m/s by family;
    players within human bounds above. 1x = real speed everywhere.
16. PRIMITIVE MATCH DURATION: at 1x a 90-minute match takes 90 real minutes by definition
    (world clock = match clock; matchScale exists but is set to 1 this milestone).
    Time-in-5-min sample: open play ~87%, restarts ~13% (13 dead-ball sequences).
    Compression is deliberately unsolved per mandate §14.
17. KNOWN LIMITATIONS: primitive AI bunches around the ball at times and shoots from
    range; headers/aerial duels minimal (balls are chested/controlled, no jump model);
    no slides/fouls (FREE_KICK exercised via scenario); corners delivered to a zone, no
    marking contests; GK never dives laterally (lunge = fast approach), penalties absent;
    walls minimal; fatigue absent by design.
18. SANDBOX URLS (server running, python3 -m http.server 8302 in sandbox/):
    A. Scenario laboratory: http://localhost:8302/index.html  (24 scenarios, seed box, Restart)
    B. Primitive 11v11:     same page — scenario "24. Primitive 11v11 match" (default)
    C. Camera comparison:   "Camera: BROADCAST/TACTICAL" button (broadcast ≈ 80 m width)
    D. Physics debug:       "Debug: ON" button — ball x/y/z, v, state, last contact;
       click any player for x/y, v, facing, loco/contact state; world tick/clocks/seed/
       restart state; violations counter; fps.
19. SCREENSHOTS: simulator/validation/renderer/cfr_{11v11,match_broadcast,match_tactical,
    takeon,cross_aerial,goalreset_debug}.png
20. BRAIN/BODY RECOMMENDATION (design only): keep issueIntent() as the single seam. cal11's
    action-choice output maps 1:1 onto the intent vocabulary (PASS(target,family),
    TAKE_ON(side), runs = MOVE_TO with effort-derived speed); its probability mathematics
    should eventually SELECT intents while the body resolves execution physically — which
    is exactly the outcome-vs-execution conflict documented in
    CONTINUOUS_WORLD_ARCHITECTURE_STUDY.md §4: the integration decision (steered outcomes
    vs physics-resolved outcomes vs cadence changes) is the user's next call, NOT taken here.
STOPPED. No integration, no cal12, no deployment, no production changes.
