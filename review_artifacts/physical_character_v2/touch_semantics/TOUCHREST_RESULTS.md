# Touch-rest candidate C: validation results (frozen criteria, nothing loosened)

**Inputs:**
- **Authority:** `../sources/2026-10-05_user_instruction_autonomous_runway_touching_foot.md`.
- **Frozen inputs:**
  - preregistration and implementation freeze: `TOUCHREST_PREREG.md`, commit **63543e8**, before any official run;
  - §4 regression tooling: commit 7b0ecf6 (Addendum A).
- **Official run:**
  - 2,146 runs from a clean scratch copy of 63543e8 (tree clean: `evidence/tree_status.txt`), 8 parallel workers, 05:49–06:19;
  - browser = Node check on the 3 W runs;
  - evaluator `tools/touchrest_eval.mjs`, exactly as frozen.
- **Evidence:** `evidence/` holds `results_all_2146.tgz`, `eval.log` / `eval.json`, `browser_W.json`, `results_W/`, `run_log_2146.txt` and `commit.txt`.
- **Diagnostics:** listed in §3. Run after the verdict and not part of the validation.

## 0. Bottom line

**VALIDATION FAIL.**
- **Failed criteria:** R1 (2 / 240), R3 (17 / 144) and R7 (150 / 480).
- **TS2 fails** only because it requires R1 / R3 / R4 to pass. Its own evidence holds: 122 of 352 B1-only runs lose contact after release with no lift command, and none of the matched B1TR runs do.
- **Every other criterion passes:** R2, R2c, R4, R5, R6, R6x, R8, R9, R10, R11, R12, TS1, TS3.

**Consequences (prereg §4 / §5):**
- Candidate C is **not qualified**.
- The §4 G0–G3 regression is not an adoption step for C.
- **E1a is not rerun.**
- E1b is not started.

The causes of the three failures are separable (§3):

| failure | where | cause | attributable to touchRest? |
|---|---|---|---|
| **R1**: release later than ramp end + 2 s | 2 runs: V2-short-legs L / R, **no pelvis drop**, **2 s** unloading (2.40 s late). V2-165-62 at 1.99 s | Pre-release load dynamics of a straight-legged stance. After a fast transfer, the zero-share foot's load dips to about loadOff, rebounds to 30–45 N, then decays with τ ≈ 1 s | **No.** TS1: B1TR = B1 before release. The original configuration is also late (V2-short-legs: 2.18 s). B1 moves V2-165-62 off a knife-edge (minimum 6.3 N vs 6.0 N against loadOff 6.17 N) |
| **R3**: 0.5 mm boundary hover (≤ 1 AIRBORNE entry, no bounce) | 17 / 48 runs at 0.5 mm. All 1 mm runs and all 48 5 mm E1a-sequence lifts pass | **Mainly a defect of the candidate:** the seat force is switched off **in one tick** when the swing command appears (`!f.swing`). The foot jumps free, overshoots, grazes back and bounces once (≥ 60 ms, so not chatter by the frozen definition) | **Yes (mainly).** The same 48 cases: surface target without seat 2 / 48; B1 only 4 / 48 (all from its own pre-lift hold defect) |
| **R7**: displacement across release ≤ 0.5 mm | 150 / 160 released runs with **2 s** unloading (max 1.43 mm). Ramps 4 / 8 s: 0 / 320 (max 0.20 mm) | With a 2 s transfer, release comes before the body has stopped moving. The resting foot carries only 1–2 N, so its friction capacity is ≈ 0.4–0.8 N; servo drag of 0.3–0.5 N slides it about 1 mm in the first 0.5 s | **No (reduced by it).** B1 only: 152 / 160 over 0.5 mm, max 4.09 mm. The same drift appears with an actual-height frame |

## 1. Criterion table (`evidence/eval.log`)

| # | result | values |
|---|---|---|
| R1 | **FAIL** 238 / 240 | Release time − ramp end: −0.86 to 2.40 s. Post-release: no contact loss, LOAD_ACCEPT or chatter in all 240. Load max 9.09 N (≤ loadOn). Resting load 0.85–3.04 N (0.14–0.39 % BW). Failing: V2-short-legs L / R d0 2 s (late release only) |
| R2 | PASS 720 / 720 | No false release at r ≥ 2 %. The 240 ramp-4 runs are hash-identical to the unload-fix B1 runs |
| R2c | PASS | 240 / 240 r = 0.5 % runs released; post-release rules hold in all |
| R3 | **FAIL** 127 / 144 | 5 mm lifts: liftoff 0.25–0.38 s after the command; every sequence correct. The 17 failures are 0.5 mm hovers: 2 AIRBORNE entries, 1 bounce, final SUPPORT, no chatter |
| R4 | PASS 64 / 64 | Pelvis bumps ±2 / ±5 mm after release: no contact loss; load max 9.06 N |
| R5 | PASS | 128 pushes: all recovered (ORIG the same); no fall, no extra release or re-acceptance, no chatter, slip ≤ 20 mm |
| R6 | PASS 1447 / 1447 | Closure ≤ 0.024 J / tick, Σ+ ≤ 0.111 J. Applied Δτ ≤ 6.92 N·m; Δτ0 ≤ 6.97 N·m. Over-capacity 0; saturation ≤ 0.17 %. Authority writes 0; impulse 0 |
| R6x | PASS 128 / 128 | Impulse = the scheduled push; closure ≤ 0.014 J / tick |
| R7 | **FAIL** 330 / 480 | All failures are 2 s unloading (max 1.43 mm); ramps 4 / 8 s ≤ 0.20 mm |
| R8 | PASS 1344 / 1344 | Stance slip ≤ 0.320 mm |
| R9 | PASS 32 / 32 | 180 / 480 Hz: release, no contact loss, 5 mm sequence, energy |
| R10 | PASS 3 / 3 | Determinism pairs bit-identical |
| R11 | PASS 3 / 3 | Browser = Node: 30008210, 0d6c1145, 782ad402 |
| R12 | PASS 9 / 9 | ORIG reproduces the official E1a runs (hashes at 1–9 s); not released by 9 s |
| TS1 | PASS 240 / 240 | touchRest does nothing before release (hash-identical to B1 at every 1 s mark) |
| TS2 | **FAIL (formal)** | The defect exists without touchRest (P-B1 70 / 240, L-B1 4 / 48, XB-B1 48 / 64); matched B1TR runs: 0. Fails only because R1 / R3 did |
| TS3 | PASS 32 / 32 | touchRest alone does not remove the mapping residual (TR-only releases at ≥ 2.5 cm: 0 / 32) |

## 2. The E1a regime (reported, not a criterion)

**P and L subsets** (B1TR, d 2.5 cm, ramp 4 s, i.e. E1a's protocol values):
- **Zero-share runs (16):** release 0.42 s before to 0.99 s after the ramp end (time-out at 2 s); 0 contact losses; displacement ≤ 0.20 mm.
- **5 mm lifts (16):** 16 / 16 correct sequences. Hover clearance min 3.03 mm; servo error max 2.67 mm. E1a-3 limits are ≥ 3 mm clearance on 80 % of the hover and ≤ 3 mm error, so the margins are thin but inside.

None of the three failures occurs at E1a's protocol values. This does **not** qualify the candidate: the frozen rule requires the whole validation to pass.

## 3. Causal diagnosis (diagnostics after the verdict)

**Tools:**
- `tools/touchrest_trace.mjs` (per-tick trace of one entry);
- `tools/touchrest_char.mjs` on diagnostic manifests (scratch);
- a δ / resting-load probe.

### R1: late release from a straight-legged stance with fast unloading (pre-existing)

**Load on the unloading foot (V2-short-legs L, no drop, 2 s ramp ending at 5.0 s):** 101 N (4.3 s) → 13 N (4.7 s) → **45 N (5.1 s)**, then decays with τ ≈ 1 s → 8.3 N (7.3 s). Release at 7.40 s.
- The same scenario with a 1 cm drop releases at 4.66 s, at the first dip below loadOff.
- **Original configuration:** release 2.18 s after the ramp end (V2-short-legs; also over 2 s); V2-165-62 at −0.26 s.
- **With B1:** V2-165-62 at 1.99 s. The dip minimum sits on the loadOff knife-edge (6.3 vs 6.0 N; loadOff 6.17 N), and the rebound decides.
- **What it is:** the controller's lateral COM / load dynamics after a fast transfer on nearly straight legs. It is not touch semantics and not the lifecycle thresholds. Not investigated further (outside the touching-foot scope).

### R3: 0.5 mm boundary hover (mainly the candidate's own discontinuity)

touchRest applies its seat only when there is no swing command. When the lift command appears:
1. The seat force (≈ 3.9 N nominal through the leg's feed-forward) is removed in one tick, a step.
2. The leg jumps the foot free; it lifts off, overshoots, grazes back (TOUCHDOWN), bounces once after 60–150 ms, then rests on the turf for the rest of the hover.

**Same 48 cases with the seat removed** (surface target only): 2 / 48 failures (V2-long-legs, a 17 ms re-touch). **With B1 only:** 4 / 48 (all from its pre-lift hold defect; otherwise the foot never leaves the turf on a 0.5 mm command).

**Below the candidate:** a 0.5 mm hover is inside the swing servo's accuracy band. Measured over all bodies, 5 mm hover servo error max:
- 1.85–2.67 mm at 2.5–3 cm drops;
- **3.7–4.9 mm at 1 cm** (clearance min 0.78–2.26 mm; B1-only the same).

### R7: drift of the resting foot during a fast transfer (pre-existing, reduced)

**Trace** (V2-REF L, 2.5 cm, 2 s): release at 4.675 s, 0.33 s before the ramp end.
- Through UNLOADING the foot does not move (≤ 0.08 mm).
- In TOUCHING it carries 0.9–1.0 N with 0.3–0.5 N horizontal force (friction coefficient 0.4 by default), and slides on a ≈ 1 mm loop over the next 0.5 s while the body completes the transfer.
- B1 alone slides more (1.58 mm).
- An actual-height leg frame (`lcTouch.frame "actual"`) gives the identical 0.898 mm drift in that window.

**Delivered resting load** (finding F4): the seat is nominally loadOff/2 (3.87 N for V2-REF), but the measured resting load is 1–3 N (0.14–0.39 % BW). B1 alone already rests at 1.7 N.
- The seat is mostly absorbed by the leg's stiff vertical position servo: the stabilising element is the surface-anchored vertical target, and the seat is a small bias on it.
- `TOUCH_SEMANTICS.md` §6 describes the intended force, not the delivered one. This is recorded here.

## 4. Records

- Failed evidence preserved unchanged.
- The prereg is not modified (the diagnostics above are post-verdict).
- Default path: KV0 identical; suite 58 / 58.
- Commits: 63543e8 (freeze), 7b0ecf6 (regression tooling), and this record.
