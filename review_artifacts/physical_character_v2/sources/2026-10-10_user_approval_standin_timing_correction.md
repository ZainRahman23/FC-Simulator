# User decision 2026-10-10 (≈03:00 BST) — approve the one-line AST-1E stand-in spring-target timing correction (end-of-step → start-of-step pose); re-run checks 2 – 6 unchanged; if they pass, run the three-case carrier / PI-1 slice exactly as approved and do not stop merely on the known 17.9 mm record-derived discontinuity row (record and attribute it); report ten items per case; separate collision/body failures from handoff / carrier / stand-in / record / apparatus; verdict on the core architecture; no recovery-to-animation work or new slice without approval (verbatim)

Received in the Claude Code session, in reply to `promotion_carrier/slice/AST1E_STOP_TRACKING.md` (5e990e0). Reproduced verbatim below.

---

Approve the one-line stand-in timing correction.
Treat this as a correction to AST-1E's stand-in drive timing, not a relaxation of any criterion. Change only the stand-in spring target from the end-of-step pose to the start-of-step pose as diagnosed. Do not change any cap, gain, geometry, trajectory, collision rule, gameplay outcome, runner/carrier code, V2 code, or existing threshold.
Re-run checks 2–6 unchanged. Preserve the 10 mm geometry/tracking criterion exactly.
If those checks pass, proceed with the three-case carrier/PI-1 slice exactly as previously approved. Do not stop merely because the already-known 17.9 mm record-derived tackler-discontinuity row fails; record that failure and attribute it to the source record's abrupt frame-43 slide-leg stop, as already predicted. Do not weaken or modify that criterion. I want the physical experiment to continue so long as no other preregistered hard-stop condition is triggered.
For the actual slice, report separately for all three cases:
1. whether promotion itself is continuous;
2. whether the physical runner remains coherent before contact;
3. actual physical contact body part, point, timing, direction and impulse;
4. displacement and momentum caused by the collision;
5. support/recovery-authority use;
6. whether the runner corrects, stumbles or falls, and why;
7. whether the near miss remains physically untouched;
8. whether the physical outcome agrees with the authoritative simulation outcome;
9. determinism and animation-ON/OFF/gameplay-hash neutrality;
10. CPU cost.
Most importantly, distinguish failures of the collision/body from failures of the handoff, carrier, stand-in, source record, or test apparatus. Do not tune anything to obtain the expected outcomes.
If the three cases actually run, stop after the results and give me a clear verdict on whether we have now demonstrated the core architecture:
cheap authoritative locomotion → seamless promotion → genuine rigid-body interaction → physically caused correction/stumble/fall
Do not begin recovery-to-animation work or another development slice without my approval.
