# BALANCE-2 successor C3: design log (development set only)

**Instruction.** The owner decided on 12 Oct 2026 at 22:12 that rigid boot-tip support is not legitimate toe support (`sources/2026-10-12_user_instruction_balance2_c3_legitimate_support.md`).

- C3 keeps C2's legitimate improvements, and the controller must respect the current rigid foot's legitimate support envelope.
- C3 must not compensate for the missing toe articulation through controller strength, altered fall criteria, enlarged support geometry or anatomy changes.
- C2 and its results are preserved unchanged as evidence.

## D0. Declared before any C3 development run

### What "legitimate support" means on this foot

Evidence: `BALANCE2_AUDIT.md` §3–4, `evidence/B2_GEOMETRY.json`, `scripts/c3_support.mjs`.

- The rigid F0 boot has a **flat sole** from the heel (−64.2 mm from the ankle) to the oblique MTP break (MTP1 +140.3, MTP5 +110.4 mm).
- Ahead of the break is a **raised toe spring / tip**, 3–12 mm above the sole plane.
- Pivoting about the heel edge or the MTP edge keeps every loaded point on the flat sole. That is legitimate.
- A loaded point on the raised tip is rigid boot-tip support, which the owner has ruled not legitimate.
- **Measurement** (`scripts/c3_support.mjs`): the boot-tip load share is the load on points more than 1 mm above the sole plane and ahead of the forefoot boundary, divided by the load on both feet, per step. The legitimacy tolerance is 2 %.
- **Tool check** (`evidence/C3_SUPPORT_TOOLCHECK.json`, preserved review records):
  - quiet standing, small, backward and lateral pushes: 0;
  - C2 at 12 N·s: 0, with a 5.0° heel lift pivoting on the MTP edge;
  - **C2 at 14 N·s: 1.00** (from 0.61 s, 0.93 s on the tip);
  - B at 12 and 14 N·s: 0.88 and 1.00;
  - C2 at 21.5 N·s: 1.00.
- **Consequence:** C2's frozen-rule recovery at 14 N·s, inside the matched forward band, already depends on boot-tip support. C2 is not adopted as the recipient.

### The envelope C3 must respect

This is C2's own body-schema envelope, unchanged (`successor/params/C2.json` `b2.support`, `B2_GEOMETRY.json`):
- the COP shift (F + K_i·x)/(M·g/h) stays within **[−124.76, +64.8] mm** of the entry COM;
- 124.76 mm is the heel edge;
- 64.8 mm is the oblique flat-foot MTP pivot line, mean of MTP1 79.8 and MTP5 49.9; the measured COP plateau is ≈ 65 mm;
- the implied maximum ankle moment, 90.9 N·m, matches Kim 2009's maximum allowable flat-foot torque, 93.2 ± 12.8 N·m.

C2 used this envelope only in its internal model. Its command could exceed the envelope, and the excess pitched the boot onto its tip.

### The one mechanism added: a support-envelope governor

Implemented in `c3/c3_ctrl.mjs`, mode set by `p.c3.governor`.
- **What it governs:** the AP COM command, in all rows of the COM map together, so the coordination pattern is kept.
- **The bound:** the largest command whose modelled consequence stays inside the envelope at the propagated AP offset. It uses C2's own efference-copy muscle model.
- **What it never does:** it never raises a command, never reverses one, and never acts on ML or on any other objective.
- **What is unchanged:** no gain, delay, channel or support constant changes.

Three candidate modes are fixed in advance; there is no other search.

| ID | Mode | Bound |
|---|---|---|
| R0 | C2 (no governor) | Reference, now with the legitimacy measurement |
| Gc | `command` | The command itself is clamped to the envelope (the C2 design log D5 "V5cap" analogue on all COM rows) |
| Ga | `activation` | The modelled activation stays inside the envelope over the horizon |
| Gf | `force` | The modelled developed force stays inside the envelope over the horizon. The command may lead the force, as muscle lag requires |

**Governor constants** (numerical, not tuned):
- horizon 120 steps (0.5 s), more than 3 × the slowest modelled time constant (146.7 ms);
- 20 bisection iterations;
- tolerance 0.01 N.

### Development set

C2's frozen DEV (`scripts/b2_dev.mjs`), disjoint from B2M, plus legitimacy metrics on every case and every bisection level (`scripts/c3_dev.mjs`):
- 100 ms pulses: fwd 5 / 10, back 6 / 12, left 12 N·s;
- fwd 12 N·s at 50 ms;
- forward and backward bisections at 100 ms;
- 20 s quiet standing.

### Selection rule

1. **Eligible:** boot-tip load share ≤ 0.02 in every DEV case that the frozen rule scores as not a fall, at every non-fall level of both bisections, and in quiet standing.
2. Among the eligible modes, choose the highest DEV forward 100 ms threshold.
3. Ties within 0.2 N·s go to the lower worst DEV overshoot.
4. If no mode is eligible, C3 cannot be built within this architecture. That is reported; no further mechanism is invented without a new declaration.

### Hip-map defect (C2 design log D6)

- Preserved and documented, not repaired.
- No hip transfer is a C3 candidate.
- A hip strategy would need the HAT-map correction plus new trunk-loop gains, which the owner excluded unless separately preregistered and necessary.
