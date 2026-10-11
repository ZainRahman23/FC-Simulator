# ABI-1 pre-run freeze (implementation hashes before any contact run)

**Frozen:** at the commit that adds this file. **No N2 (contact) run of B or C has been made.** The only B / C runs so far are the disclosed no-contact checks K1 / K2 (`evidence/prerun/PRECHECK.json`, `ABI1_AMENDMENTS.md`).

**Basis:**
- preregistration `ABI1_PREREGISTRATION.md` (frozen 7cf107fe);
- amendment AM-1 (V2 on body states, a wording defect; claim unchanged).

**Execution:**
- `scripts/abi1_execute.sh <runs dir>`: primary + repeats + S-DX / S-TONE / S-DELAY / S-ABL, ib_verify before / after, evaluations, S-CPU.
- S-IMPACT runs only after the primary results are committed (§9).

## Implementation (sha256 prefix · git blob prefix)

| file | sha256 | blob |
|---|---|---|
| `scripts/abi1_ctrl.mjs` | 12182a68826622ae | 8b5b821f2ea6 |
| `scripts/abi1_plant.mjs` | 270272429345bd5f | d9605efb3f44 |
| `scripts/abi1_run.mjs` | 3d695927cc1a58ab | b9010cd8e344 |
| `scripts/abi1_metrics.mjs` | 36f21195e3fc6653 | efcb1156561f |
| `scripts/abi1_eval.mjs` | 69018695f2bda4a1 | f3b342bc81b5 |
| `scripts/abi1_execute.sh` | b65255b4c787737b | 5662fec19133 |
| `scripts/abi1_cpu.mjs` | 319b9ef08766e715 | 65e802ce774c |
| `scripts/abi1_precheck.mjs` | d9911fa2a2a912c5 | 816476d5e968 |
| `render/abi1_clip_prep.mjs` | 07f5d99c85d76c8e | b013745c7a18 |

**Bound inputs** (unchanged since the preregistration): the frozen PvpPlant `pvp1a_sim.mjs` (blob d1a49666ac74), V2 `v2_stand.js` (d2de3d73f7e4), `v2_support.js` (ef3084bfbb8d), `v2_actuation.js` (ebd5f5d317a0), `v2_actuators.js` (077659b0843d), PostureDriver (16404332cf3b), and the fixtures CF1 (33486a48b3a0) and DX (629f54606f3b).

## Implementation decisions fixed here (within the preregistered equations)

- **Command timing.** The command issued after step n reads frame n − 29 and acts during step n + 1. Frames are built in the plant's `_record` from the record's runner states and per-foot turf impulses, keys exactly {n, S, F}.
- **Zero increments.** A row whose increment is exactly 0 is left untouched (bit-identical to A).
- **The V2-G2 area centroid** (`v2_stand.js` `centroid`, not exported there) is reproduced with the same expression.
- **The swing reference** is evaluated at (n + 1 − t_trig)·h, the time of the physics step the command drives. The stance → swing gain weight decreases by h / BLEND per command, as in the PostureDriver.
- **Foothold → foot origin:** the usable-region centroid (foot-local) is rotated by the reference orientation at the sole height y0.
- **Leg IK:** the runner's own StandController `legIKBounded` with its default bounds (R4-tested), in the actual pelvis frame (pelvis body origin and rotation).
- **The touchdown hold** captures the leg's current joint rotations. The leg keeps those targets with stance gains and the full law torque after the blend; it does not return to the tone's entry targets.
- **The tone scale (S-TONE)** is applied to the runner's tone K and D once at entry; the entry actuator plan is recomputed.
- **CPU:** the controller cost = `cpu.ctl` (inside the plant's tone time) + `cpu.sense` (inside the measurement time).
