# Configuration version PSTARY (adopted 2026-10-05): the foot-yaw actuator, independently of P15

**PSTARY** = PSTAR (`../knee_correction/E1_PREREGISTRATION_V2_CONFIG_PSTAR.md`) + stand option **`footYaw: true`**.

**What `footYaw` is:** the active foot-yaw path (`../e1b_fix/E1B_FIX_DESIGN.md` §1):
- an actuator on the ankle's passive-only foot ab/adduction axis, from the actuator layer only;
- capacity 0.64 × the approved subtalar capacity (0.320 / 0.288 N·m/kg);
- shared budget with inversion, inversion first;
- driven by the existing ankle rows (support damping `ankleD` 2.0 N·m·s/rad).

The passive tissue law (k 0.13 N·m/°), anatomy and the spec capacity table are unchanged.

**Evidence:**
- E1b-17 fixed (56 / 56 yaw runs in the PSTAR2 validation; 3 / 3 + 29 / 29 + rate runs in the closing validation; capacity non-binding);
- **Y identity:** runs without an abort under PSTARY are hash-identical to PSTAR4, so the yaw-path validation carries over;
- **GY:** G0–G3 regression with the PSTARY flags passes V3.1–V3.10 (`evidence_regression_pstary/`).

**Selecting it:** `--config=PSTARY` (`tools/e1b_run.mjs`, `e1a_run.mjs`, evaluators). The default stays bit-identical (KV0).
