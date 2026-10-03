# User decision, 2026-10-03: G1 decisions D1–D4 (verbatim)

Approve D1a, D2a, D3a and all of D4, with the following clarifications.
D1a — boot contact
Adopt the 10-piece decomposition of the exact same approved external boot geometry for the current V2 physics baseline.
This is a collision-manifold representation change, not an anatomical change.
Preserve and verify:
- identical external boot dimensions;
- identical ankle position;
- identical mass;
- identical COM;
- identical inertia;
- identical semantic foot → toe mapping.
Record the measured +19% physics cost.
Also retain the observed three-frame contact miss of the thinner pieces in the 20 m/s kick-to-shin test as an explicit unresolved high-speed contact issue. Do not distort normal foot geometry to solve that test and do not enable indiscriminate CCD.
D2a — solver
Adopt 150 velocity iterations as the V2 G1 validation baseline, because the controlled experiment shows that this removes the measured false hard-landing rebound.
Record clearly that:
150 iterations is a validated correctness configuration, not yet the accepted production-performance configuration.

Create a future optimization/debt item to determine whether equivalent correctness can later be obtained more cheaply through solver/substep/contact/constraint configuration or the eventual native physics path.
Do not reduce the iteration count during G1 merely for performance.
D3a — passive anatomical end stops
Keep the current evidence-backed 3° end-stop formulation.
Do not adopt the 3× stiffer version because its measured 23–70 J false-energy injection is unacceptable.
For G1, allow up to 1.5° settled excursion beyond the anatomical ROM boundary as numerical/compliance tolerance.
Important:
- anatomical ROM itself remains unchanged;
- the 1.5° is not a new human anatomical limit;
- report actual excursions rather than merely pass/fail;
- emergency Jolt-stop margins remain separately measured;
- later active-control gates should normally avoid driving into this tolerance region.
D4 — approve all four test-definition corrections
Timestep study: compare mechanically meaningful distributions/ranges/spread and invariant properties rather than requiring chaotic passive falls at different rates to end in nearly identical final poses.
Preserve genuine rate effects such as the measured 1 m drop contact-timing difference and the 360 Hz lean-forward landing difference; report them rather than averaging them away.
Self-collision: remove the arm→trunk impact requirement where the approved anatomical shoulder ROM physically prevents the test from creating that impact. Retain valid reachable non-adjacent self-collision tests, including leg→leg.
Resting turf: interpret the ≤5 mm criterion with an explicit small numerical comparison tolerance sufficient for results such as 5.0008 mm. Do not materially increase the physical 5 mm penetration allowance.
15 m/s impact: retain as a diagnostic/report-only extreme test, not a G1 pass criterion, consistent with the previously approved realistic-player collision envelope decision.
Now integrate these decisions into the specification, DECISIONS.md, criteria and implementation.
Then:
1. rerun G0 completely;
2. rerun G1 completely on V2-REF;
3. rerun the V1-matched body;
4. rerun all required population/morphology variants;
5. rerun passive-joint tests;
6. rerun determinism/browser-vs-Node;
7. rerun timestep sensitivity under the revised definition;
8. rerun contact tests using the 10-piece boot;
9. report actual anatomical excursions and emergency-stop usage;
10. measure the new total performance cost.
In particular, verify that the 10-piece decomposition does not create internal seams/contact artifacts during ordinary foot-ground loading.
Preserve the seven joint/passive-tissue bugs you discovered in the decision/history record, including their causes and fixes. Do not allow them to disappear from the research history merely because they are now corrected.
If a remaining G1 failure has a demonstrated implementation bug or an already-approved interpretation, diagnose/fix/rerun as appropriate.
If another failure requires changing approved anatomy, physical topology, fundamental authority rules, or presents materially different viable architectural choices, stop for my decision.
If G1 passes:
- commit locally;
- do not push;
- update the G1 report and review artifacts;
- leave the review server running;
- give me the final numerical results and the most informative review scenarios;
- explicitly list remaining technical debt, especially 150-iteration solver cost and high-speed compound-foot contact.
Then STOP. DO NOT START G2.
