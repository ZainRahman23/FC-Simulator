# Configuration version PSTAR4 (adopted 2026-10-05): the configuration that closes E1b

**PSTAR4** = PSTAR + **`footYaw: true`** + **`lcPutDown: true`** + **`abortCapture: 2`**.

| option | what | design / evidence |
|---|---|---|
| `footYaw` | active foot-yaw path | `CONFIG_PSTARY.md` |
| `lcPutDown` | abort put-down along a BLF quintic from the current reference state to the contact anchor (in place); physics decides touchdown | `../e1b_fix/E1B_FIX_DESIGN.md` §2 |
| `abortCapture: 2` | T-A capture-timed abort, rule revision 2: online capture model; smoothest descent / ramp predicted to recover (descent 0.20–0.302 s, ramp 0.10–0.225 s, margin 0.04 s before contact only); speed-up-only re-plans; abort-plan acceptance intent (LOAD_ACCEPT still needs sustained measured contact); quiet-standing floor removed for the abort transition only; verdict "step required" when no in-place plan exists | `../e1b_ta/E1B_TA_DESIGN.md`, `research/TA_RULE_AUDIT.md` |

**E1b status:** **closed** by `E1B_CLOSE_RESULTS.md` under `E1B_CLOSE_PREREG.md`.

**P15 is split** by T-A's verdict at the end of the disturbance:
- class A (in-place recoverable): 19 / 19 recovered without changing foothold;
- class B (STEP_REQUIRED): 4 runs (V2-165-62), now E2 obligations.

**Selecting it:** `--config=PSTAR4`. The default stays bit-identical (KV0); PSTAR / PSTAR2 / PSTAR3 runs reproduce.
