# Autonomous runway report: the released-but-touching foot (2026-10-05)

- **Authority:** `../sources/2026-10-05_user_instruction_autonomous_runway_touching_foot.md`.
- **Branch:** `prototype/physical-character-v2`, local commits only. **Nothing pushed. E1b not started. E1a not rerun.**

## Bottom line

**I found the cause of the touching-foot defect and fixed it.**
- **Cause:** the released, touching foot's target height followed the foot itself, and its leg frame was the min(target, actual) pelvis height. Together these gave the foot zero vertical stiffness, so pelvis settling lifted it. It then cycled TOUCHDOWN ↔ AIRBORNE without any lift command.
- **Fix:** the candidate **C = B1 + touchRest** holds the foot's vertical target at the surface, with a small seating force.
- **Evidence:** across 1,447 runs (8 bodies, both feet, five drops, three unloading rates, pelvis bumps, 180 / 480 Hz) C has **zero** spontaneous contact losses. B1 alone loses contact in 122 of 352 matched runs.

**C is still not qualified.** It fails its preregistered validation (R1, R3, R7) and, run as information, one G0–G3 row (G2 2.2b). Each failure is diagnosed causally (below):
- **R1:** pre-existing straight-leg stance dynamics, not touch semantics.
- **R3:** the 0.5 mm boundary hover sits exactly on the 0.5 mm touch-sensing gap.
- **R7 and G2 2.2b:** the resting foot is dragged about 1 mm when the body moves fast. This is touchRest's remaining design issue.

**Why I stopped:** each remaining item needs a substantive design or scoping decision from you.

## 1. Discoveries

1. **Touching-foot defect mechanism** (`TOUCH_SEMANTICS.md`): the target height follows the foot, and the leg frame is min(target, actual) pelvis height. Together they give zero vertical stiffness, so pelvis settling (debt D-3) lifts the foot through the 0.5 mm contact gap.
2. **touchRest works for the hold:** 0 spontaneous contact losses in every B1TR run (P, L, XB, HZ, D, W), including ±2 / ±5 mm pelvis bumps.
3. **Delivered resting load is 0.14–0.39 % BW**, not the nominal 0.5 %. The leg's stiff vertical position servo absorbs most of the seat force; the surface-anchored target does the stabilising (`TOUCHREST_RESULTS.md` §3).
4. **The lifecycle's "touch" is a proximity sense** (contact point separation ≤ 0.5 mm). A 0.5 mm boundary hover therefore measures threshold straddling, not the transition.
5. **Straight-leg fast transfer:** on nearly straight legs, the zero-share foot's load dips to about loadOff, rebounds to 30–45 N, then decays with τ ≈ 1 s. Release then takes up to 2.4 s after a 2 s ramp. The original configuration does this too.
6. **Resting-foot drag:** a foot resting with 1–2 N (friction capacity about 0.4–0.8 N) slides about 1 mm when the body moves fast. This happens at 2 s unloading and in 25–30 N·s lateral pushes.
7. **Swing-servo accuracy** (relevant to E1a-3):
   - 5 mm hover error max 1.85–2.67 mm at 2.5–3 cm drops, but 3.7–4.9 mm at a 1 cm drop (clearance down to 0.78 mm).
   - Liftoff comes 0.25–0.38 s after the 0.4 s lift command.
8. **B1 alone is clean in G0–G3:** G2 symmetry 12 / 12; boundary harness "stood"; G1 hash-identical; G3 17 / 17.

## 2. Causal chains

| observation | chain |
|---|---|
| spontaneous lift-off (old hold) | target height follows the foot + min frame → zero vertical stiffness → pelvis settles +0.4–0.6 mm → foot rides up → crosses the 0.5 mm gap → LIFTOFF / AIRBORNE / TOUCHDOWN cycling |
| R1 late release | fast transfer on straight legs → lateral COM / load dynamics → the dip just misses loadOff → rebound → slow decay → release more than 2 s after the ramp |
| R3 bounce | 0.5 mm target equals the 0.5 mm touch gap; servo error band (mm) straddles it → one debounced re-touch (≥ 60 ms; no chatter). The seat makes the foot leave the turf at all more often (with seat, 17 / 48 fail; without seat, only 12 / 48 even leave the turf). C2 test: a continuous seat ramp gives 18 / 48, so the seat step is not the cause |
| R7 drift | 2 s unloading → release 0.3 s before the transfer ends → body still moving → 0.3–0.5 N servo drag exceeds μ·N of a 1 N foot → ≈ 1 mm loop. B1 alone: up to 4.09 mm |
| G2 2.2b | touchRest keeps the released foot in frictional contact during strong lateral pushes → foot slip +0.1–1.1 mm → L / R land on different sides of G2's 20 mm relocation threshold (20.1 vs 19.2 mm). No capacity change |
| boundary-harness relabel | external 30 N shank lift with no swing command: the surface target / seat resists it → airborne excursion 24.7 vs 16.4 mm (over 20 mm) |

## 3. Changes, and why (all default OFF; KV0 identical after every edit; suite 58 / 58)

**`ctrl/v2_stand.js`:**
- `lcTouch {frame, gains, vert, seat}`: diagnostic switches for the factorials.
- `shareCapC`: continuous B3, a diagnostic alternative.
- **`touchRest`**: candidate C (surface vertical target + seat loadOff/2 through the leg's feed-forward, scaled (1 − s)(1 − a)).
- `touchRestRamp`: diagnostic correction C2, **refuted**, kept as a record.
- B1 `ffLockedAxis` is unchanged from the unload fix.

**Other code:**
- **`ctrl/v2_support.js`:** rest weight `rho` (read only by `touchRestRamp`). Official runs are hash-identical with it present.
- **`gates/v2_unload.js`:** bump / lift / E1a-sequence protocol shared by Node and the browser. Existing scenarios are hash-identical.
- **Tools:** `touch_lab`, `touchrest_char`, `touchrest_manifest`, `touchrest_eval`, `touchrest_regress_eval`, `touchrest_trace`, `touchrest_perf`; suite R11.a–b.

## 4. Before / after (matched runs: B1 alone → B1 + touchRest)

| metric | B1 only | C |
|---|---|---|
| contact loss after release, no command (P-B1 / L-B1 / XB) | 70 / 240, 4 / 48, 48 / 64 | 0 / 240, 0 / 144, 0 / 64 |
| drift across release, 2 s ramp | ≤ 4.09 mm (152 / 160 > 0.5) | ≤ 1.43 mm (150 / 160 > 0.5) |
| drift, 4 / 8 s ramps | ≤ 0.38 mm | ≤ 0.20 mm |
| resting load | 1.7 N (V2-REF) | 0.85–3.04 N |
| release time | unchanged (TS1: hash-identical before release) | unchanged |
| 5 mm lift sequence | correct (L-B1) | 48 / 48 correct |

## 5. Preregistered criteria and results

See `TOUCHREST_PREREG.md` (63543e8) and `TOUCHREST_RESULTS.md` §1.

| result | criteria |
|---|---|
| FAIL | R1 238 / 240; R3 127 / 144; R7 330 / 480; TS2 (formal) |
| PASS | R2 720 / 720 (no false release, hash-identical); R2c; R4 64 / 64; R5 128 / 128 (no worse than the original); R6 1447 / 1447; R6x; R8; R9 32 / 32; R10 3 / 3; R11 3 / 3; R12 9 / 9; TS1 240 / 240; TS3 32 / 32 |

No criterion was changed.

## 6. G0–G3 status (C, informational; `TOUCHREST_RESULTS.md` §5)

- **PASS:** KV0, suite, guard, bench; G0 (except 0.V1, checkout-only); G1 74 / 74 hash-identical; G3 17 / 17 (K′), J2a 81 / 81; twist battery (C1′ / C7′); KV6c; boundary harness by rule; yaw; browser G1 10 / 10, G2 6 / 6, G3 4 / 4.
- **FAIL:** G2 2.2b symmetry 9 / 12, caused by touchRest.
- **Relabelled:** boundary harness "stood" → "foot relocated", caused by touchRest.
- **B1 alone:** no regression found.

## 7. E1a

**Not rerun.** The candidate did not qualify, so prereg §5 does not permit it, and the official result E1-1 (FAIL, unload time-out) stands.

At E1a's own protocol values (2.5 cm, 4 s, 5 mm), C's data are clean but this is not a pass:
- 16 / 16 releases within the time-out;
- 0 contact losses;
- 16 / 16 correct 5 mm sequences;
- hover clearance ≥ 3.03 mm and error ≤ 2.67 mm, against E1a-3's 3 mm limits (thin margins).

## 8. Body / rate / perturbation / determinism

- **Bodies and sides:** 8 bodies × L / R, every set; mirrored runs symmetric.
- **Rates:** 180 / 480 Hz, 32 / 32.
- **Perturbations:** pushes of 2.5 / 5 N·s, toward / away, at release and after, 128 / 128 recovered (the original configuration the same); bumps ±2 / ±5 mm, 64 / 64.
- **Determinism:** repeat pairs bit-identical; browser = Node 3 / 3 (incl. the lift protocol).
- **Partial loads:** never released at r ≥ 2 % (720 / 720). Zero and 0.5 % loads release.

## 9. Performance

No measurable controller cost. Median 0.101 ms vs 0.102 ms (B1) per tick in the released / lift phases, and 0.113–0.114 ms in G3 U:R. The p95 noise of about ±0.1 ms is the same in every arm.

## 10. Remaining debt

1. Resting-foot horizontal drag under fast body motion: R7, G2 slip, boundary-harness excursion.
2. Delivered resting load below nominal: the seat is mostly absorbed.
3. The touch sense has no spatial hysteresis (0.5 mm proximity).
4. Swing-servo vertical accuracy: 3.7–4.9 mm error at a 1 cm drop; liftoff lag 0.25–0.38 s.
5. Straight-leg fast-transfer load rebound (release delay).
6. Lateral push classification sits at the 20 mm threshold even in qualification (19.1–19.6 mm at 25 N·s).
7. Earlier debt carried: D-3 pelvis settling; B3 share leak 0.05–0.2 % BW (B3 excluded); TD-16 hip end range; KC-4.

## 11. Implications for E1b / E2 / walking

- **The released-touching state is the pre-swing state of gait.** touchRest-style surface anchoring is the right family for it (it removes neutral vertical stability).
- **But walking moves the body fast over a resting trailing foot.** That is exactly where the friction-limited drag appears, so the horizontal semantics of a resting foot must be decided before gait.
- **E1b needs commanded clearance accuracy.** The swing servo's mm-level error and its lift lag will matter for low clearances.
- **Contact sensing for gait needs hysteresis or an equivalent design**, or scuffs will re-trigger touchdown.

## 12. Commits and files

**Commits (on top of UF-1 2ce81f3):** 1ce8cd2 (Phase 1–2), 63543e8 (prereg + freeze), 7b0ecf6 (regression tooling), ac3a3c4 (validation FAIL, TR-1), d2840a3 (C2 refuted, TR-1a), 072ffbb, 5acbeb1 (regression, TR-2), and this report.

**Files:**
- `touch_semantics/`: `TOUCH_SEMANTICS.md`, `TOUCHREST_PREREG.md`, `TOUCHREST_RESULTS.md`, `RUNWAY_REPORT.md`, `manifest.json`, `scripts/regress_battery.sh`, `evidence/`, `evidence_g/`.
- `DECISIONS.md`: TR-1, TR-1a, TR-2.

## 13. Decisions required

1. **Resting-foot horizontal semantics** (drives R7, G2 2.2b and gait). Choose one:
   - (a) accept about 1 mm friction-limited drag during fast body motion and rescope R7 / the G2 relocation row accordingly;
   - (b) authorise a design for a friction-aware / compliant resting hold (new control structure, likely a Cartesian horizontal impedance with an explicit force bound);
   - (c) keep the old follow-the-foot hold horizontally and only anchor vertically (untested combination).
2. **The R3 boundary test sits at the sensing threshold.** Choose one:
   - (a) redefine the boundary cases away from the 0.5 mm gap (1 mm already passes 48 / 48);
   - (b) add spatial hysteresis to the touch sense (a lifecycle sensing change);
   - (c) improve swing-servo accuracy first.
3. **R1:** accept the straight-leg fast-transfer release delay as pre-existing debt outside touch semantics, or authorise an investigation of the stance load rebound.
4. **B1:** consider adopting B1 on its own. It is a verified bug fix with no G0–G3 regression found, but it does not by itself make E1a's release reliable.
5. **E1a path:** after 1–3, a fresh preregistered validation (adding unseen conditions), the regression, and then E1a with a versioned configuration.

## 14. Convergence assessment

- **Converged:** the touching-foot vertical hold. The root cause is identified and the mechanism family validated: 0 contact losses across 1,447 runs incl. perturbations and rates.
- **Not converged:** the horizontal behaviour of a resting foot under fast body motion, and the sensing / servo accuracy at the contact boundary. These are design questions, not tuning.
- **Outlook:** at E1a's own protocol values the candidate looks ready, but the broad validation correctly shows it is not yet general.
- **Expected next cycle:** with decisions 1–3, one preregistered validation cycle should settle it.
