# User instruction (2026-10-05, after E1b FAIL E1-4) — verbatim

(Supplied as pasted text in the user's message.)

> Continue from the current stopping point.
> Goal: close E1b legitimately, then prepare E2 using the established reuse-first locomotion architecture. Do not start broad new bottom-up invention if an established solution already covers the problem.
> The external research has identified PyPnC, IHMC humanoid control, and the Bipedal Locomotion Framework (BLF) as the most relevant immediate references, with DCM/LIPM as the preferred baseline once we reach walking.
> 1. Resolve the two E1b failures
> Investigate and resolve:
> A. E1b-17 stance-ankle yaw oscillation
> - Do not tune passive ankle stiffness merely to make the criterion pass.
> - Determine what established humanoid locomotion controllers use for stance-foot/leg yaw regulation under load.
> - Prefer an evidence-backed active finite-torque path if that is the missing mechanism.
> - Preserve the distinction between passive tissue and active control.
> - Test across all body variants, both sides, perturbations and relevant rates.
> B. E1b-7 abort put-down
> - Replace the one-tick target drop with an established smooth swing-foot/put-down trajectory concept.
> - Inspect BLF's SwingFootPlanner and comparable implementations before designing our own.
> - The abort must remain simulation-authoritative: bounded joint control requests a touchdown trajectory; physics determines whether/when touchdown actually occurs.
> - Do not weaken the 10 N·m torque-step criterion merely to pass.
> 2. Apply the reuse-first rule
> Before inventing any new locomotion mechanism, explicitly ask:
> 1. Is this already solved in PyPnC, IHMC, BLF or another established implementation?
> 2. Can we adapt its equations/state semantics/controller architecture to our finite-torque Jolt body?
> 3. What Touchline-specific difference prevents direct adaptation, if any?
> Use external implementations as architectural/equation references where licensing permits; do not blindly transplant code.
> In particular preserve the established distinction between:
> planned support / touching / load-bearing / airborne.
> Do not infer physical liftoff merely because the controller entered swing. Jolt/contact state remains authoritative.
> 3. Re-run E1b
> Preregister any necessary corrected/new criteria before the official run.
> Run the full relevant regression, determinism, browser=Node, body-variant and perturbation checks.
> Do not hide existing failures by retuning unrelated parameters.
> If E1b passes legitimately, record and commit it locally.
> 4. Then prepare E2 — do not immediately invent a stepping controller
> E2 is our first short physical step.
> Before implementing E2, perform a focused implementation study of the reusable pieces we need:
> - BLF SwingFootPlanner / equivalent swing trajectory;
> - PyPnC support/load-transfer managers;
> - IHMC low-load/barely-loaded-foot treatment;
> - DCM/LIPM foot-placement and COM planning concepts relevant to the first step.
> Map each to our existing controller rather than replacing working G0–E1 mechanisms.
> Produce:
> external mechanism → exact problem it solves → Touchline equivalent → adaptation required → invariant/regression risks
> Then design the smallest E2 vertical slice:
> stable double support → weight transfer → pre-swing → physical liftoff → short forward swing → physical touchdown → load acceptance → stable double support.
> Use an established smooth swing trajectory rather than hand-authoring arbitrary interpolation.
> Do not start continuous walking yet.
> 5. Stop conditions
> You may investigate, implement, preregister, test and iterate on the two E1b issues without asking me about every intermediate engineering choice where established evidence clearly determines the answer.
> Stop for my decision if:
> - solving E1b requires changing approved anatomy or passive-tissue evidence;
> - it requires weakening a meaningful physical criterion;
> - it changes previously accepted G0–G3 behaviour materially;
> - multiple materially different architectures remain plausible with no evidence-based winner;
> - or E1b still fails after the evidence-backed approaches have been exhausted.
> If E1b passes, continue through the E2 research/design/preregistration stage, but stop before the first official E2 implementation/run and show me the proposed architecture and frozen criteria.
> Keep all work local. Do not push.
> The objective is no longer to independently rediscover locomotion fundamentals. Reuse established locomotion knowledge wherever compatible; spend original engineering effort only on the Touchline-specific integration.
