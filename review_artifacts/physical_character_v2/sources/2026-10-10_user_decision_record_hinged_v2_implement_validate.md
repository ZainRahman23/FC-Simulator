# User decision 2026-10-10 (≈21:53 BST) — approve the recommended direction: D1 adopt the record-hinged runner as a NEW versioned V2 body spec (14 bodies; masses / COMs / inertias / colliders / ranges preserved; lower-back, upper-back, elbow joint centres from the frozen runner record; hip/knee/ankle exactness preserved; existing validated spec not rewritten); D2 adopt the mapping contract (mass/inertia-weighted pose fit; projection of the frozen runner's analytical bone velocities; P / L per the contract; V2's mass model authoritative); D3 correct P-14…P-17 where the frozen reference is physically wrong (preregistered, old results preserved, tolerances retained); D4 no physical clavicle; preregister anatomy / corrected rows / mapping equations / thresholds / expected FAST RUN + ALL-OUT measurements / regression and stop criteria; build the new runner; rerun the COMPLETE V2 body validation suite; validate at LOW / JOG / FAST RUN / ALL-OUT (12 reported items) and instantiate at frozen RUN-1 states without stepping collision physics; verdict A / B / C; stop (verbatim)

Received in the Claude Code session as the whole message (pasted text), in reply to the V2 upper-body representation report (edfa2b8f). Reproduced verbatim below.

---

I approve the recommended direction, with the following decisions.
D1 — Adopt the record-hinged runner as a new V2 body-spec version.
Keep V2 at 14 physical bodies. Preserve the existing masses, centres of mass, inertias, colliders and joint ranges unless a subsequent validation failure demonstrates that one specifically must change.
Derive the lower-back, upper-back and elbow joint centres from the frozen runner record as proposed. Preserve the already-exact hip/knee/ankle transfer.
This is a new versioned V2 specification. Do not rewrite or silently modify the existing validated V2 spec.
D2 — Adopt the proposed mapping contract.
Use the mass/inertia-weighted pose fit and project the frozen runner's actual analytical bone velocities onto V2.
Do not reconstruct velocities from rendered-frame differences or by simply copying bone rotations.
Preserve total linear momentum and angular momentum according to the mapping contract, and keep V2's own mass model authoritative for V2 COM/P/L.
D3 — Correct P-14 through P-17 where the frozen reference is physically wrong.
First preregister/document each correction and preserve the old result for history.
A test comparing a V2 body's centre of mass with a presentation joint centre is not a valid physical correspondence test if those are genuinely different locations. Likewise correct the P-17 arm-inertia-axis swap.
Do not relax any numerical tolerance merely to obtain a pass. Correct what quantity is being compared, then retain the existing tolerances wherever they remain dimensionally and physically meaningful.
D4 — Do not add physical clavicle articulation.
Accept clavicle, neck, wrist and toe motion as presentation/skinning articulation where they satisfy the mapping contract's conditions: negligible relevant momentum/energy, geometric effect contained within the physical collider representation, and no visible handoff discontinuity above the accepted limit.
Do not add bodies merely to reproduce the presentation skeleton one-to-one.
Now implement only this V2 body-spec/mapping revision.
Before doing so, freeze/preregister:
- the exact proposed record-hinged anatomy;
- corrected P-14–P-17 definitions;
- mapping equations;
- unchanged thresholds;
- expected FAST RUN and ALL-OUT handoff measurements;
- regression/stop criteria.
Then build the new versioned V2 runner and rerun the complete V2 body validation suite, not just the handoff rows.
This is important because moving the back joints 30–39 mm changes static gravity loading by approximately 10 N·m at each back joint. I do not consider the new body valid until the existing V2 physical-body gates have been rerun against the new version.
Validate at LOW, JOG, FAST RUN and ALL-OUT and explicitly report:
1. body integrity and self-collision;
2. all joint-limit margins;
3. actuator/capacity implications;
4. quiet-standing/static support behaviour where applicable;
5. mass, COM and inertia preservation;
6. pose-fit errors;
7. per-body velocity errors;
8. total linear-momentum error;
9. angular-momentum error;
10. visible handoff discontinuity;
11. lower-body transfer accuracy;
12. CPU cost.
Also test whether the new V2 body can be instantiated at valid frozen RUN-1 states at all four regimes without stepping collision physics afterward. This remains a state-transfer/body-validation exercise, not PI-1.
Do not modify RUN-1, LV2-STATE-1, the simulation, gameplay collision geometry, stride clocks or locomotion.
Do not run tackles, recovery/falls, PI-1 or build the full promotion bridge yet.
At the end give me one verdict:
A. RECORD-HINGED V2 VALID + HANDOFF STATE READY
B. RECORD-HINGED V2 VALID + HANDOFF STATE NOT READY
C. RECORD-HINGED V2 BODY INVALID
If A, stop. Do not proceed into collision testing without my approval.
