# User decision, 2026-10-05: T-A capture-timed put-down (verbatim)

Choose T-A: capture-timed put-down.
Implement the evidence-selected architecture behind default-off flags:
- preserve the validated foot-yaw actuator;
- preserve the BLF-derived smooth put-down trajectory;
- at abort, compute the available capture time from the measured physical state;
- choose the smoothest descent and post-contact load-acceptance ramp that fit inside that recoverability window, with a preregistered safety margin;
- fix the allocation/split rule before any official run; do not derive parameters by searching for the pass boundary;
- the abort plan may express intent to accept load before touchdown, but Jolt measured contact remains authoritative: no support/load may be physically credited before sustained measured contact;
- remove the quiet-standing 10% minimum-load floor from this abort transition where the evidence says it is inappropriate; do not change it globally without evidence;
- use an abort-specific smooth load ramp sufficient to satisfy the torque-step requirement;
- do not reintroduce the one-tick drop;
- do not alter passive ankle tissue;
- do not use a recovery step for P15, since the capture analysis shows the original foothold can recover all eight bodies with timely support.
Before the official run, preregister:
1. the capture-time calculation;
2. safety margin;
3. deterministic rule for splitting available time between descent and load acceptance;
4. minimum/maximum permissible descent and ramp durations;
5. behavior when insufficient capture time remains;
6. all E1b acceptance criteria and regression requirements.
The insufficient-time behavior is important: do not force an impossible in-place recovery. Classify it explicitly as step required for future capture-aware E2 recovery.
Then run the complete E1b validation across bodies, sides, rates, perturbations, P15 cases, repeatability, browser=Node and G0–G3 regressions.
Keep P15 reporting separated into:
- recovered without changing foothold;
- step required;
- recovered by stepping (future E2);
- fell.
Do not weaken P15.
If T-A legitimately passes E1b, adopt the validated E1b mechanisms and close E1b. Then proceed to the E2 research/design/preregistration stage only, using the reuse-first architecture already identified (PyPnC/IHMC/BLF and DCM/LIPM/capture concepts). Do not run E2 yet.
Stop and report the proposed E2 architecture and frozen criteria for review before implementation.
If T-A fails for a substantive reason, stop rather than tuning it to the observed failures.
Keep everything local. Do not push.
