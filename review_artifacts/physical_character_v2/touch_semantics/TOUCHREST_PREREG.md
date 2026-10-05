# Touch-rest candidate: preregistered validation (frozen BEFORE the official runs)

**Inputs:**
- **Authority:** `../sources/2026-10-05_user_instruction_autonomous_runway_touching_foot.md`.
- **Evidence for the choice:** `TOUCH_SEMANTICS.md` (diagnostic Phase 1–2; checkpoint 1ce8cd2).

**Status:**
- Committed before any official run of this validation.
- Criteria, dataset and thresholds are not changed after results; a later defect is recorded as an erratum next to the frozen text.
- The failed E1a evidence and the B1 + B3 results are preserved unchanged.
- The default path stays bit-identical (all flags default off).

**Architectural rule:**
- The controller or lifecycle may withdraw or redirect authority; it may never lift, teleport, pin, detach or force a foot.
- Physics decides contact.
- Checked per run: authority writes 0; external impulse = the scheduled test impulse only; foot displacement across release.

## 1. Candidate configuration C

**C = the adopted pre-E1a configuration** (v2k central knee, ankle k 0.13, G3 stand + `ikRefTwist` + `lifecycle`) **+ `ffLockedAxis` (B1) + `touchRest`**:
- **B1** (`UNLOAD_FIX_PREREG.md` §1): the locked-axis-consistent knee / elbow flexion feed-forward. Unchanged; bench-verified (`unload_fix/`).
- **touchRest** (`TOUCH_SEMANTICS.md` §6):
  - A non-supporting foot without a swing command targets its contact anchor with the **vertical target at the anchor height (the surface)**.
  - While in contact it rests with a seating force of **loadOff / 2** of body weight. That is the midpoint of the lifecycle's own "unloaded" band [0, loadOff); with loadOff = 0.01 it is 0.5 % BW.
  - The force goes through its own leg's feed-forward, scaled (1 − s)(1 − a).
  - The other foot's commanded force is reduced by the same amount.
- **B3 / B3c are excluded.** Both engage abruptly in practice; the leak is 0.05–0.2 % BW with B1 (`TOUCH_SEMANTICS.md` §3).

## 2. Dataset (manifest `manifest.json`; `tools/touchrest_manifest.mjs`)

**Scenario family:** `gates/v2_unload.js`.
- Settle; planned pelvis drop d (1–3 s).
- The stance share 0.5 → 1 − r over a transfer of **duration `ramp`** from t = 3 s, supervised.
- Hold to the end, which is the ramp end + 4 s (for lifts, + 9 s).
- Optional protocol: a pelvis bump, or the E1a lift / hover / replace / load-acceptance sequence.

**Arms:**
- **B1TR** = C (the candidate);
- **B1** = adopted + B1 (diagnostic);
- **TR** = adopted + touchRest (diagnostic);
- **ORIG** = adopted (diagnostic).

| set | definition | runs |
|---|---|---|
| **P** | B1TR: 8 bodies × feet L / R × drops {0, 1.0, 2.0, 2.5, 3.0} cm × final requests r ∈ {0, 0.5, 2, 3, 5} % × unloading ramps {2, 4, 8} s | 1200 |
| P-B1 | B1: zero share × the same bodies, feet, drops, ramps | 240 |
| P-TR | TR: zero share × bodies, feet, drops, ramp 4 s | 80 |
| **L** | B1TR: lifts after release; drops {1.0, 2.5, 3.0} cm × lift heights {0.5 mm (2 s hover), 1 mm (2 s hover), 5 mm (0.5 s hover, the E1a sequence)}; all bodies, both feet | 144 |
| L-B1 | B1: 5 mm lift; drops {1.0, 2.5, 3.0} cm | 48 |
| **XB** | B1TR and B1: pelvis bump after release, dz ∈ {+2, −2, +5, −5} mm at t = 8.0 s (ramp 4 s, d = 2.5 cm) | 64 + 64 |
| **XP** | B1TR and ORIG: thorax push 100 ms, lateral, toward / away from the unloading foot, 2.5 / 5 N·s, at 6.46 s (the release boundary) and 8.0 s (after release); d = 2.5 cm, ramp 4 s | 128 + 128 |
| **HZ** | B1TR at 180 and 480 Hz: d = 2.5 cm, zero share, with the 5 mm lift; all bodies, both feet | 32 |
| **D** | B1TR ×2: zero share (V2-REF L, 2.5 cm); 5 mm lift (V2-REF L); push toward 5 N·s at 8.0 s (V2-REF L) | 6 |
| **W** | B1TR browser = Node: zero share V2-REF L and R; 5 mm lift V2-REF L | 3 |
| **O** | ORIG: zero share, 2.5 cm, ramp 4 s, the 8 bodies L + V2-REF R (the harness's E1a reproduction check) | 9 |

Total **2146** runs.

## 3. Acceptance criteria (candidate B1TR; thresholds from existing definitions, not from data)

| # | set | criterion | origin |
|---|---|---|---|
| **R1** | P, r = 0 (240) | foot n **released by ramp end + 2 s**. After release, until the end: **no contact loss** (never LIFTOFF or AIRBORNE), no LOAD_ACCEPT, no chatter (no state re-entered within 60 ms, either foot). Post-release sensed load max ≤ loadOn; mean over the last 2 s strictly between 0 and loadOff (resting and still unloaded) | E1a's time-out (2 s after the ramp); lifecycle constants; E1a-6 |
| **R2** | P, r ∈ {2, 3, 5} % (720) | foot n **never released** (no false release); **hash-identical** to the unload-fix B1 runs where the same scenario exists (ramp 4 s, end 11 s): touchRest is inactive while a foot is supported | lifecycle semantics; touchRest scope |
| **R2c** | P, r = 0.5 % (240) | release permitted. If released, the R1 post-release rules apply | — |
| **R3** | L (144) | **Before the lift command:** no contact loss after release. **5 mm lift:** exactly one AIRBORNE entry after the command, exactly one TOUCHDOWN, no TOUCHDOWN → AIRBORNE bounce, exactly one LOAD_ACCEPT, final SUPPORT, no chatter. **0.5 / 1 mm (boundary) lifts:** no chatter, ≤ 1 AIRBORNE entry, ≤ 1 TOUCHDOWN, no bounce, final SUPPORT | E1a-6 sequence; a boundary test that chatter is not just moved |
| **R4** | XB (64) | after release, under bumps of ±2 and ±5 mm: **no contact loss**; post-release load max ≤ loadOn | — |
| **R5** | XP (128) | **(a)** no fall in any 2.5 N·s case. **(b)** Outcome class no worse than ORIG for the same case. **(c)** After each push, ≤ 1 LOAD_ACCEPT and ≤ 1 release of foot n; no chatter. **(d)** Stance slip ≤ 20 mm when not fallen | G3 H1; the earlier unload-fix A3 |
| **R6** | P, L, XB, HZ, D, W (B1TR) | **energy:** closure increment ≤ +0.05 J every tick; Σ positive ≤ 0.5 J per run. **Torque continuity** (t ≥ 0.5 s): applied Δτ ≤ 10 N·m per tick (≤ 25 at a contact-onset tick and the next); Δτ0 ≤ 30 N·m. **Actuator limits:** over-capacity events 0. **No forcing:** authority writes 0; external impulse 0 | E1a-7 / -8 / -9 |
| R6x | XP (B1TR) | energy as R6; impulse = the scheduled push; authority 0 | G3 L |
| **R7** | P, released runs (B1TR) | foot-n horizontal displacement over [t_rel − 0.1, t_rel + 0.5] s ≤ 0.5 mm | unload-fix A4 (unchanged) |
| **R8** | P and L (B1TR) | stance-foot slip ≤ 1.0 mm | E1a-4 |
| **R9** | HZ (32) | at 180 and 480 Hz: R1's release + no-contact-loss rules and R3's 5 mm-lift sequence rules hold; energy as R6 | rate robustness |
| **R10** | D | the three pairs are bit-identical | E1a-11 |
| **R11** | W | browser hash = Node hash at every 1 s mark and the end, 3 / 3 | gate browser rows |
| **R12** | O | hash-identical to the official E1a runs at 1–9 s; not released by 9.0 s | harness reproduction |

### Causal separation (diagnostic arms)

| # | criterion |
|---|---|
| **TS1** | touchRest does nothing before a release: in every B1TR run of set P, the hashes at each 1 s mark **before the release** equal those of the matching B1 run (r = 0, all ramps) |
| **TS2** | the hold defect exists without touchRest and touchRest removes it. **At least one** B1 run in P-B1 ∪ L-B1 ∪ XB-B1 shows a contact loss after release before any lift command. **Zero** of the matching B1TR runs do (R1 / R3 / R4) |
| **TS3** | touchRest does not remove the mapping residual. In P-TR at d ≥ 2.5 cm the release outcome by ramp end + 2 s equals the unload-fix ORIG outcome for the same body / foot / drop (no release) |

## 4. Regression (G0–G3) for configuration C (only if §3 passes)

Same items and pass rules as the unload-fix V3 (`../unload_fix/UNLOAD_FIX_PREREG.md` §4), with the flags `ffLockedAxis` + `touchRest`:
- KV0 + suite (incl. new R11 regressions for touchRest);
- G0;
- G1 (no controller: hash-identical to qualification v2);
- G2;
- G3 v3.3 with K′, J2a 81 / 81 with the flags, browser O;
- twist battery C1′ … C7′;
- KV6c 8 bodies;
- boundary harness 180 / 240 / 480 Hz;
- KV10 yaw decomposition.

**Stop rule:** a substantive new physical failure attributable to the candidate stops the task (no adoption).

## 5. Then E1a (only if §3 and §4 pass)

- Version configuration C in `../knee_correction/E1_PREREGISTRATION_V2_CONFIG_C.md`.
- The E1a harness and evaluator change only their configuration assertion.
- **The protocol, criteria, thresholds and timing are unchanged.**
- Rerun E1a exactly as frozen, and evaluate every criterion. If it fails, diagnose causally; nothing is tuned from its outcome.
- If it passes: repeat / perturbation / body-variant robustness checks. **E1b is not started.**

## Development record (recorded at the freeze, before the official runs)

**Smoke checks** (not evidence): 7 manifest entries (P ramp 2, L 0.5 / 5 mm, XB +5 mm, XP 2.5 N·s, HZ 180, O) plus browser = Node on two W runs, incl. the lift protocol.
- All behaved as the mechanism predicts: release, no contact loss, lift sequence 1 / 1 / 1, browser 2 / 2.

**Code changes since checkpoint 1ce8cd2:**
- The bump / lift protocol moved into `gates/v2_unload.js`. Existing scenarios stay hash-identical to the unload-fix dataset (checked on 2 runs).
- New runner `tools/touchrest_char.mjs`, manifest generator and evaluator.
- Suite 58 / 58, incl. R11.a–b.
- KV0 identical.
