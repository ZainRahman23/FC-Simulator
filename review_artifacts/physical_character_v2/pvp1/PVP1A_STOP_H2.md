# PVP-1A: HARD STOP H2, TACKLER_FIT_BLOCKED (official result; before any two-character stepping)

**Preregistration:** `PVP1A_PREREGISTRATION.md` (frozen d7fb69a1).

**Inputs:** `PVP1A_INPUTS.json`, status BOUND:
- ib_verify 59 / 1 / 0;
- gameplay hash a2678624, recomputed from the consumed record;
- contact configurations equal;
- both character assets equal at the tag and at 5042230.

**Fixture:** `fixture/PVP1A_FIXTURE.json` (geometry only, no Jolt object; deterministic: a repeat run is identical).

**No two-character Jolt world was stepped for PVP-1A.**

## Result

| item | value | frozen gate |
|---|---|---|
| runner entry (MC-1 on the static LOCO pose) | valid: grounding 4.42 mm, both boots +0.50 mm, no range excess, no self-overlap, velocities 0 | ≤ 10 mm, inside the hard ranges |
| activation instant | τ 51.0 (cross clearance 37.7 mm, shank_R ↔ foot_L) | clearance ≥ 1 mm |
| **G-T1** boot forward point vs the LEG tip b + 0.07 û | **15.2 mm** | ≤ 10 mm |
| **G-T1** boot hull centroid vs the LEG line | **17.0 mm** | ≤ 10 mm |
| G-T2 knee_L / ankle_L vs the LEG line | 15.9 / 11.2 mm | ≤ 30 mm ✓ |
| **G-T3** worst fitted joint vs its primitive line | **hip_R vs TUCK, 55.7 mm**. Also ankle_R vs TUCKSHIN 36.0, hip_L vs THIGH 30.1 | ≤ 30 mm |
| G-T4 grounding shift | 0.54 mm | ≤ 30 mm ✓ |
| joints at a hard limit | ankle_L dorsiflexion (−60°, fully pointed), ankle_L forefoot abduction, hip_R rotation | reported |

**→ H2: TACKLER_FIT_BLOCKED.** PVP-1A stops here as frozen. **Status: BLOCKED.** There is no architectural verdict.

## The block is a geometric infeasibility, not an optimiser artefact

`scripts/pvp1a_fit_feasibility.mjs` → `evidence/PVP1A_FIT_FEASIBILITY.json`:
- It minimises **only the gate violations**, from the frozen-objective optimum plus 36 fixed starts.
- **The best achievable worst ratio is 1.39.** No V1-matched pose inside the hard ranges satisfies G-T1…G-T4.
- At that best pose: boot centroid 13.9 mm (limit 10), hip_R–TUCK 40.8 mm (limit 30), boot forward point 13.1 mm (limit 10).

**Measured causes:**
1. **Hip spacing.** The simulation's slide primitives put the left thigh line (THIGH) and the tucked right thigh line (TUCK) **0.265 m** apart at the hips. V1-matched's hip centres are **0.190 m** apart. Both hips can never be within 30 mm of their lines. This is an irreducible mismatch of about 37 mm per side.
2. **Boot.** The LEG primitive is one capsule (r 0.07 m) from the knee to beyond the toe. V1-matched reaches its tip only with the ankle at the plantarflexion limit (knee-to-boot-front 0.706 m vs 0.710 m). That pointed boot's centroid cannot also lie on the LEG axis within 10 mm.
3. **Thigh length.** THIGH is 0.480 m (gabriel's rig thigh 0.482 m); V1-matched's thigh is 0.447 m.

**Classification:** *tackler reconstruction / collision-geometry mismatch with the authoritative simulation.*
- The simulation's tackler is a parametric slide model (PT_DEF.slide: legFrom, legLat, reachAhead 1.12 m, footR, the r 0.06–0.16 m capsules).
- It is **not anatomically consistent with any V2 body**. The V2 population hip half-widths are 0.091–0.095 m; the primitives imply about 0.13 m.
- This is neither a V2 joint limit nor a physics result.

**Implementation history before the freeze (geometry only; disclosed):**
1. The first fit passed radians to a degree API. It was fixed.
2. The fit ignored the turf (a tucked foot was 20 cm below ground). A turf / grounding term was added to serve the frozen G-T4.
3. One start became 36 deterministic starts.

No gate, window or criterion changed.

## What follows

Per your instruction ("a failed criterion is the beginning of diagnosis… isolated diagnostic runs"), the physics is investigated as **PVP-1A-DX**. It is a separately named diagnostic, protocol `PVP1A_DX_PROTOCOL.md`, frozen before it runs. It cannot change this status.
