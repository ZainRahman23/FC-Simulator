# User instruction 2026-10-08 — CF-6: incorporate the research package, define the ladder, freeze, implement, run (verbatim)

Received in the Claude Code session of 8 Oct 2026, with the calibration pack (`2026-10-08_cf6_human_walking_calibration_pack.md`). Reproduced verbatim below.

---

The external CF-6 research package is now supplied. Treat the attached/pasted CF-6 HUMAN WALKING CALIBRATION PACK as the external evidence package you were waiting for.
First, audit it carefully before using it. Preserve its distinction between M = measured, D = derived, and F = fitted regression, and preserve all of its caveats. Do not turn descriptive cohort means, ±SD ranges, sample extrema, or fitted relationships into arbitrary pass/fail thresholds. Do not silently fill any remaining evidence gaps.
In particular, note that the research finds:
- no universal literature-defined boundary for “slow” or “normal-slow” walking;
- direct healthy-adult experimental coverage through the slow-speed region we care about;
- shorter-step/higher-cadence walking is physically demonstrated, including deliberate cadence increases at fixed speed;
- double-support proportion increases as walking speed falls and therefore must not be represented by one universal fixed percentage;
- minimum toe-clearance evidence is suitable as a plausibility cross-check, not a universal clearance target;
- step/stride, cadence and support-phase definitions must remain exactly as defined in the research package.
Now resume the CF-6 process from exactly where you stopped.
1. Incorporate and cite the external research into the existing CF-6 preregistration draft.
2. Define the speed/cadence/step-length/support-time ladder from the evidence, rather than guessing values. Start in the experimentally supported slow region and progress toward ordinary walking. You may use the report's five suggested reference speeds as the evidence scaffold, but they are reference points rather than automatic pass/fail constants.
3. Preserve my already-recorded decision: option (a), shorter steps at higher cadence. Do not add pelvis lowering/rising as a new mechanism. Heel rise/toe rotation may emerge from existing physics but must not be artificially introduced merely to make the test pass.
4. Freeze and commit the completed preregistration before writing CF-6 implementation code.
5. Then implement CF-6 exactly under the previously approved protocol, changing only the permitted walking/gait mechanisms already specified in that protocol.
6. Run it progressively. Do not begin with a huge battery. First prove the low-speed cases and then climb the evidence-supported ladder. At each level test enough consecutive genuine physical steps to expose accumulation rather than merely demonstrating one successful step.
7. Record actual realised speed, cadence, step length, stance/swing/double-support timing, minimum clearance, touchdown behaviour, capture-point/CoP behaviour, joint margins, saturation, torque, energy, slip, contact stability, and whether errors remain bounded or accumulate.
8. Explicitly compare the simulated gait with the human-reference ranges, but do not tune merely to make it human-like. We are testing V2, not fitting it to the literature.
9. At the first meaningful blocker, diagnose it causally as:
   - A: missing walking/gait functionality;
   - B: correctable controller/planner limitation; or
   - C: unavoidable underlying body/joint/actuator/contact limitation.
The V2-vs-V3 stop rule remains unchanged. Missing gait functionality or a correctable controller/planner problem is not evidence for V3. Evidence for V3 requires a genuine C-type limitation after the permitted gait mechanisms are present.
Most importantly, we now want to push substantially beyond CF-5's ~0.05 m/s crawl. Determine how far V2 can climb toward the human walking regime before a genuine physical/controller limit appears. Do not assume it can reach 0.4 m/s, and do not force it to. Measure where it actually stops.
If an early ladder level fails, do not blindly continue to higher speeds. Diagnose the first failure under the preregistered A/B/C framework and stop where the protocol requires.
Keep TD2C/E2 untouched during this CF-6 experiment. This is still the bounded locomotion investigation we approved, not production walking and not permission to redesign unrelated systems.
At the end give me:
- highest genuinely continuous walking speed reached by each body;
- realised cadence and step length there;
- maximum consecutive genuine continuous steps;
- whether momentum survives through touchdown;
- whether the gait converges, remains bounded, or deteriorates with repeated use;
- first limiting mechanism for each body;
- A/B/C classification with evidence;
- comparison against the human-reference ladder;
- whether anything now constitutes actual evidence for V3;
- exact commits/files/evidence produced.
Do not relax criteria, alter the research-derived references after seeing results, or redesign around a failure without stopping for my decision.
Proceed.
