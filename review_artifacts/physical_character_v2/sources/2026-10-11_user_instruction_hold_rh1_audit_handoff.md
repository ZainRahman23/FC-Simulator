# User instruction, 2026-10-11 00:13 BST (verbatim)

Context: after the RH1 results (verdict C, commit fa5915b2).

---

Hold here. Do not modify RH1, V2, RUN-1, qualification criteria, collision architecture, or the simulation.
Preserve the current RH1 result exactly as evidence, including the 50/54 qualification outcome and all raw outputs.
Before stopping, do only documentation/consolidation work if necessary:
1. Make sure the RH1 candidate specification, exact differences from the frozen V2 body, qualification results, and all four failing rows are reproducible from committed files.
2. For each of the four failures, record whether the frozen/current record-matched runner R0 passes or fails the same exact test under the same harness, without changing any criterion.
3. Preserve the RUN-1 handoff measurements that motivated RH1.
4. Clearly separate:
   - RH1-introduced failures,
   - failures shared with R0,
   - previously accepted exceptions,
   - unresolved rigid-foot/promotion compatibility issues.
5. Produce a short RH1_AUDIT_HANDOFF.md containing only facts and provenance—no new architecture proposal and no threshold changes.
Do not attempt another body variant. Do not relax any gate. Do not implement an articulated toe. Do not resume PI-1. Do not run collision experiments unless needed solely to reproduce an already-existing result.
We are having the accumulated architecture independently reviewed. Stop after the evidence package is clean and reproducible and wait for my next instruction.
