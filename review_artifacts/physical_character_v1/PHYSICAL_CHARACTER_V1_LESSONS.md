# Physical Character V1: lessons (what not to forget when building V2)

This is lessons only, not a V2 design. Evidence and detail: `PHYSICAL_CHARACTER_V1_FINAL_HANDOFF.md`.

## Architecture

1. **Physical authority works and is worth its cost.** A torque-limited Jolt humanoid as the only spatial state, with no root forces, teleports or scripted outcomes, gave honest contact (same-step response, first touch ≤ 1.8 mm), honest recovery (D6) and honest failure. Keep the invariant from day one; every later hack would hide the evidence you need.
2. **One actuator arbiter with a ledger.** Modules request torques; none owns strength. The ledger (external impulse, damping, motor work) found real bugs. The friction observer that "measured" μ 0.037 while another body pushed the foot was one of them.
3. **Separate intent from truth.** Planned contacts are attempts. Only sensed contact achieves them, and history is never repaired. The contact-event lifecycle (PROPOSED → … → ACHIEVED / MISSED / INTERRUPTED) is the right interface for walking and later for football actions. Football actions will constrain the locomotion plan; they must still fail physically.
4. **Anatomy and ROM must come from evidence before control work.** V1.1's anatomy pass changed which placements were reachable. Controllers tuned on the wrong body are wasted.
5. **Keep the render skeleton separate from the physics body.** Hips is the render pelvis; there are no hip_L / R bones; a render toe is not a physical toe; T-pose canonical; one topology for every player (`g2_stepper/RENDER_SKELETON_CONTRACT.md`).

## Walking: what V1 established

6. **The failure that matters is stride-level speed creep, not a single bad step.** Judge walking by stride-average speed and phase-matched state between equivalent contact events. Within-stride COM velocity oscillation is normal; never flatten it.
7. **Braking comes from long steps with a long double support.** The good gait: DS ≈ 0.30 s, the COM ≈ 25–28 cm behind the landing foot at touchdown. A short, quick gait cannot brake: within ±12 cm of the controller's own decision, no step slows the walk above ≈ 0.55 m/s. Prevent creep; you cannot correct it late.
8. **Gait initiation needs state feedback.** A fixed steady-state nominal gait falls within 5 steps from standing. The first steps must be short (≈ 0.10–0.22 m commanded).
9. **The double support is the control lever and the source of unpredictability.** It has the largest CoP authority. Ending it on an event roughly doubles the step response's non-smooth part (velocity 1.4 → 2.9 cm/s, timing 10 → 25 ms vs touchdown). Plan transitions; don't let them happen.
10. **Lookahead helps, case by case.** Two-step search beats one-step (+5.6 steps) by preserving continuation options, not by steering a state variable. A learned terminal value or a fitted linear policy does not capture it. "Can land" ≠ "can continue".
11. **Swing execution was not the binding limit once the swing had an internal model** (pelvis-rate prediction). Don't rewrite the swing without matched-state evidence.
12. **Foot geometry was not the walking fix.** F1 / F2 / F2h never beat the rigid boot at matched states. An articulated toe helps stance but breaks a swing generator built for a rigid boot.

## Methodology (the part most worth keeping)

13. **Determinism plus hashes as the regression currency.** Every gate is ×3 deterministic and browser = Node. Keep approved baselines frozen and re-verify after every change: V1 stayed reproducible bit for bit through all of V1.1–G2.
14. **The deterministic simulator as a perfect-model oracle is the most informative diagnostic, but test its fragility.** A 0.1 mm command rounding moved an oracle walk between 13 and 34 steps. Long oracle walks are not evidence of robustness unless they survive perturbation.
15. **Exact snapshot / restore** (Jolt SaveState plus an identity-preserving controller clone) makes oracles, matched-state benches and data collection 5–20× cheaper. Validate it bit for bit against replays before trusting it.
16. **Compare at matched states, count fall-aware, and separate commanded from achieved.** Several early conclusions were artefacts:
    - the "20/20 steps" included post-fall steps;
    - the combined CoP was read during double support;
    - commanded 0.40 m was compared with achieved 0.26 m steps.
17. **Instrument the impulse per stride, including the engine's own damping.** The "missing" 38 % of the impulse was Jolt's linear damping.
18. **Measure what a smooth model can possibly do before training one.** A per-state in-sample fit gives the floor. V1's surrogate (4.5 cm) sat 3× above that floor (1.3–1.8 cm), and the floor itself was set by an event-terminated phase.
19. **Write corrections down.** Three confident conclusions were later overturned by better experiments. Each is recorded with its evidence in `g2_stepper/DECISION_RECORD.md`:
    - "the plant is controllable by lookahead";
    - "the swing is the limit";
    - "stepping cannot brake".

## Traps

20. **Global linear step-to-step maps get worse with more data** (mU1 14.7 → mU8 4.5 upright steps). The step map is local and non-smooth.
21. **Hard limits are a hidden resistance path.** Jolt SixDOF rotation limits cannot be soft; account for them in the ledger.
22. **The physics is the performance bottleneck.** ≈ 0.25 s CPU per simulated second per character in Node / WASM. The step planner is ~1 % of that. 22 real-time characters need a different budget, not a cheaper planner.
23. **Independent research (Astra) is evidence and opinion.** Where it conflicts with a repository measurement, the measurement wins. Furkan's Stepper source was never recovered: adopt the abstraction (explicit future contact / limb intentions), not an imagined implementation.
24. **Don't make a physically justified outcome "fail" because it looks undramatic** (D6). Don't rescue an honest boundary (the G1 30 N·s mid-swing fall).
