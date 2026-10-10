# User decision 2026-10-10 (≈02:10 BST) — choose option C (a minimal moving stand-in slide leg), tightly constrained; D-1 … D-8 and every existing criterion unchanged (including the ≥ 6-tick lead and HG-T, not waived); preregister the tackler extension separately, verify it, rerun the gate, then (only if all three cases have valid ≥ 6-tick frames) run the preregistered three-case carrier slice exactly as approved; record the 39 / 38 correction prominently (verbatim)

Received in the Claude Code session, in reply to `promotion_carrier/slice/PCS1_STOP_KP_RECHECK.md` (fbdb6f5). Reproduced verbatim below.

---

Choose C, but constrain it very tightly.
Do not relax D-5, waive HG-T, promote through a failed gate, or drop rx_planted_leg.
The finding is that the current two-rigid-piece stand-in tackler cannot represent the authoritative slide during the required pre-contact promotion interval because its slide leg freezes at promotion while the simulation's slide leg continues extending. Fix that representation mismatch rather than weakening the experiment.
Design and preregister the smallest possible articulated stand-in tackler extension:
- Only the tackler's slide leg needs to change.
- Before contact, its geometry must follow the existing recorded simulation slide-leg trajectory exactly, including extension/sweep over time.
- Derive this trajectory entirely from the existing authoritative tackle record. Do not invent new tackle motion, IK, targeting, control, balance or outcome logic.
- The tackler remains a stand-in, not a full V2 physical character.
- Do not tune its trajectory against the desired collision outcome.
- The same mechanism and mapping must be used for rx_miss, rx_free_leg, and rx_planted_leg.
- The runner/carrier implementation already built remains frozen.
- All D-1 through D-8 decisions and all existing compatibility criteria remain unchanged, including the ≥6 simulation-tick promotion lead.
The critical architectural requirement is:
Before authoritative contact, the stand-in's moving slide leg may be prescribed from the simulation trajectory. At the physical collision itself, the contact response must be solved physically and must not be overwritten or cancelled by that prescription.
Therefore explicitly define and test how the prescribed slide-leg motion relinquishes authority at contact. There must be no teleport, velocity reset, impulse cancellation or outcome-specific switch at handoff.
Before running the carrier slice:
1. preregister this tackler extension separately;
2. verify that its slide-leg geometry matches the authoritative simulation through the complete ≥6-tick lead-to-contact window;
3. rerun the full existing promotion gate unchanged for all three cases;
4. require valid ≥6-tick promotion frames for rx_miss, rx_free_leg, and rx_planted_leg;
5. verify presentation/gameplay hashes remain unchanged;
6. verify the near miss remains a near miss and the two contact cases reproduce the same intended contacted body region/timing within the existing tolerances.
Hard stop: if this minimal moving stand-in still cannot produce a valid ≥6-tick frame for all three cases, stop and report. Do not introduce another amendment, relax a criterion, alter collision geometry, tune the trajectory, or run carrier physics.
If all three pass, proceed immediately with the already-preregistered three-case carrier slice exactly as approved. Do not broaden scope.
Also preserve and prominently record today's correction: the previously proposed frames 39/38 were incorrectly described as passing the full gate because HG-T had been omitted from the extracted valid flag. Do not overwrite the original evidence.
Commit locally according to the existing project rules and stop for my review after either the gate hard-stop or completion of the three-case slice.
