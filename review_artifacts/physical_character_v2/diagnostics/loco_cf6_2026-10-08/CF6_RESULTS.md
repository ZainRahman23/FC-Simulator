# CF-6 walking-gait counterfactual — RESULTS

**Status:** COUNTERFACTUAL DIAGNOSTIC. Nothing here is adopted. TD2C / E2 untouched. No running. Production walking unchanged.

**Protocol:** `CF6_PREREGISTRATION.md`, frozen at commit 1e98e1d before any CF-6 code or run. No amendments.
- Harness: `sandbox/visual/physchar2/tools/loco_probe.mjs --cf=6` (default off, every CF-6 path gated `CF === 6`).
- Sources (verbatim, `../../sources/`): the CF-6 instruction, decision (a) + (c), the human walking calibration pack, and the resume instruction.

## 0. Short answer

**V2-REF walks continuously and sustainably at 0.10 m/s:**
- 60 / 60 physical steps, 59 consecutive genuinely continuous.
- P1 – P4 all pass. The gait converges to a periodic left / right cycle within 3 steps, and no metric accumulates.

**It fails the first human-referenced level (L1, 0.4 m/s) at step 2.** The 0.2 m/s bracket walks 8 physical steps (6 consecutive continuous, at 0.2045 m/s), then fails at step 9.

**Both failures have the same first blocker: the double-support handover between the two feet.**
- The lifecycle's fixed acceptance time uses up most of the transfer window, so the DCM ends short of its planned state.
- CF-4's CoP pin then lets that shortfall diverge while the gait waits for the trailing foot's passive release.
- The swing starts only on that measured release (Fz < 1 % BW, then the TOUCHING state):
  - at L1 the trailing foot left the ground flat (reach) without a TOUCHING state;
  - at 0.2 m/s its toe kept 1.05 – 14 % BW.
- Either way, no swing was commanded.

**Classification: A + B. No C.**
- During every divergence, actuator saturation was essentially zero (≤ 5 axis-ticks in any 1/60 s window) and joint hard-limit margins stayed above 5°.
- Saturation and the one hard-limit excursion appear only after the DCM was 0.3 – 0.8 m outside the support.

## 1. Runs (exactly as frozen; `scripts/run_cf6.sh`)

Common settings:
- V2-REF, left foot first, 240 Hz, PSTAR5CHABV, `V2_KNEE_MODEL=v2k V2_ANKLE_NEUTRAL_K=0.13`;
- start-up transfer 1.0 s; L1 timing: T_DS each 0.4104 s, T_SS 0.5396 s (transfer T_d 0.2979 s).

Bracketing (§4) after the L1 failure:
- **The L1 diagnosis was step-length related:** the foothold was pulled back 0.38 → 0.35 m for reach, and the trailing foot left the ground at the reach limit.
- So L1's cadence and timing were held, and the step became 60·v / 63.2 (0.19 m at 0.2 m/s; 0.095 m at 0.1 m/s).
- 0.2 m/s failed, so 0.1 m/s followed. CF-6 then stopped (§5).

| run | target m/s | V2 step m | steps | physical | max consecutive continuous | outcome | end hash |
|---|---|---|---|---|---|---|---|
| L1, stage A | 0.400 | 0.38 | 2 | 1 | 0 | **FAIL step 2** @ 5.871 s (UNLOAD): stance foot relocated 20.3 mm (G2) | 11b76a2f |
| bracket 0.2, stage A | 0.200 | 0.19 | 2 | 2 | 1 | clean | 73609c62 |
| bracket 0.2, stage B | 0.200 | 0.19 | 6 | 6 | 5 | clean | 54483a7a |
| bracket 0.2, stage C | 0.200 | 0.19 | 20 | 8 | 6 | **FAIL step 9** @ 12.350 s (UNLOAD): stance foot relocated 21.2 mm (G2) | 3a76175c |
| bracket 0.1, stage A | 0.100 | 0.095 | 2 | 2 | 1 | clean | 97779c2f |
| bracket 0.1, stage B | 0.100 | 0.095 | 6 | 6 | 5 | clean | d7bdfdea |
| bracket 0.1, stage C | 0.100 | 0.095 | 20 | 20 | 19 | **P1 – P4 pass** | 235cb44e |
| bracket 0.1, stage D | 0.100 | 0.095 | 60 | 60 | 59 | **P1 – P4 pass** | 01410720 |

Notes:
- Step 1 always starts from standing and is never continuous by definition. The maximum possible is N − 1.
- At 0.2 m/s, step 8 is not counted as continuous only because step 9 was never commanded, so its "next decision / next liftoff" instants do not exist.

**Not run:**
- the right-foot-first runs;
- light / short, heavy / tall and long-legs.

§5 of the frozen protocol: "If V2-REF fails L1, bracketing (§4) follows and CF-6 stops." Your instruction asked for those bodies, and both legs where useful. Running them now needs your decision (see §9).

**Determinism:** all 8 runs were executed twice with identical end hashes (`analysis/determinism.txt`).

## 2. Realised gait (P1 – P4, `analysis/cf6_analysis.txt`)

Timing uses the pack's H-style 20 N vertical-force contact, logged per tick, with event-anchored strides (§8). V2-REF's mass is 78.91 kg, so 20 N = 2.6 % BW.

| quantity | bracket 0.1 (60 steps) | bracket 0.2 (8 steps, then fail) | L1 (step 1 only) |
|---|---|---|---|
| realised speed | **0.1008 m/s** (P2 pass) | 0.2045 m/s (P2 pass; P1 / P3 fail) | — |
| cadence | **65.8 steps/min** (step period 0.9125 s) | 67.3 (0.892 s) | — |
| step length at touchdown | **0.0922 m** (plan 0.095) | 0.172 – 0.178 m (plan 0.19) | 0.313 m (plan 0.38 → 0.35 after pull-back) |
| double support, each | 0.279 s | 0.304 – 0.429 s (mean 0.342) | — |
| combined DS, % of stride | **30.6 %** | 38.4 % (34.3 – 47.0) | — |
| stance / swing, % of stride | 65.3 / 34.7 | 69.2 / 30.8 | — |
| single support (20 N) | **0.633 s** | 0.549 s (0.483 – 0.583) | — |
| swing in the air (lifecycle liftoff → contact) | 0.438 s; contact at 91 % of T_SS from the command | 0.421 – 0.433 s; 86 – 87 % | 0.375 s; 83 % |
| min clearance, φ 0.2 – 0.8 | 7.06 – 7.09 mm | 5.16 – 5.38 mm | 2.25 mm |
| touchdown speed down / horizontal | 36 / 52 mm/s | 51 – 81 / 58 – 214 mm/s | 138 / 75 mm/s |
| foothold error vs plan | 2.8 – 3.0 mm | 12.4 – 16.0 mm | 37.7 mm |
| landing lateral error vs walking frame | ≤ 0.9 mm | ≤ 1.8 mm | — |
| stance slip | 0.64 – 1.04 mm | 1.06 – 5.61 mm | 20.3 mm at the failure |
| DCM error: transfer / swing | 10.5 – 13.1 / 10.9 – 11.3 mm | 28.8 – 35.7 / 23.3 – 32.4 mm | 95 / 83 mm |
| capture margin at touchdown (DCM vs both-feet hull) | 86.9 – 88.8 mm | 70.5 – 89.6 mm | 63.0 mm |
| single-support VRP clamped | never | never | never |
| saturation per cycle: all / ankle inversion (axis-ticks) | 6 – 7 / 4 – 5 | 37 – 93 / 7 – 28 | 101 in the failing transfer (collapse, §5) |
| leg hard-limit margin, min | 8.96° | 4.61° | 0.69° (knee_L at touchdown, reach) |
| Δτ0 max | 13.5 – 15.6 N·m | 38.6 – 79.5 N·m | 267 N·m (collapse) |
| energy-closure residual per step | 0.065 – 0.073 J | 0.070 – 0.150 J | — |
| pelvis yaw | alternates ± 3.3° per step, no drift | ± 7.1° per step | — |
| foot yaw drift L / R | −0.36 … 0 / 0 … +0.30° | −0.57 … +0.09 / −0.11 … +0.60° | — |
| stance width | 172.3 – 174.2 mm (W0 172.2) | 170.8 – 176.5 mm | — |
| heel rise: trailing-foot tilt in late stance / at liftoff | 0.62° / 0.53° | 0.81 – 3.30° / 0.73 – 1.88°; 5.42° at step 9 | 2.2° (foot lifted flat) |
| contact rebound at touchdown (20 N) | 13 – 17 ms | 4 – 108 ms | — |
| accumulation (§7 thirds rule, 16 metrics) | **none** (all 16 testable) | none (7 eligible steps) | untestable |

**Notes on the table:**
- The swing lands early: contact is accepted at ≥ 60 % of T_SS, and the realised contact came at 83 – 91 % of T_SS from the swing command. That is why the realised cadence (65.8 / 67.3) is above the planned 63.2, and the step slightly short of plan.
- At 0.1 m/s, single support by the 20 N definition (0.633 s) is longer than the foot's time in the air (0.438 s). After the transfer, the trailing foot rests below 20 N for ≈ 0.19 s before the lifecycle releases it and the swing lifts it.

## 3. Momentum through touchdown

Momentum survives through every touchdown, in every run.

| run | forward COM at touchdown | per-cycle minimum | where the minimum occurs |
|---|---|---|---|
| 0.1 | 105 – 108 mm/s (≈ v̄) | 73 – 76 mm/s (C_min 25 mm/s) | trailing-foot unloading / liftoff |
| 0.2 | 220 – 241 mm/s (> v̄) | 116 – 140 mm/s (C_min 51 mm/s) | trailing-foot unloading / liftoff |
| L1, step 1 | 277 mm/s | — | — |

- Touchdown is the fastest part of the cycle at both speeds. Forward COM rises through the late swing and peaks around acceptance.
- At L1 the momentum was lost after touchdown, during UNLOAD (0.23 m/s at 4.88 s → 0 at 5.13 s → −0.53 m/s at the failure; §5). It was not lost at touchdown.

## 4. Convergence

- **0.1 m/s converges.**
  - It settles on a periodic, mirror-symmetric left / right limit cycle within 3 steps.
  - From step 4 to step 60, every per-step metric repeats to the printed precision: forward COM at touchdown 107.8 mm/s, transfer DCM error 12.8 mm, saturation 4 + 3 axis-ticks, hard margin 9.9°, slip 0.97 mm.
  - The thirds rule finds no accumulation in any of the 16 metrics.
- **0.2 m/s stays bounded but does not converge.**
  - Across 7 eligible steps no metric accumulates by the thirds rule, but the per-step scatter is large (saturation 37 – 93, slip 1.1 – 5.6 mm).
  - The failure is a threshold event, not a preregistered trend.
  - Observation, not a preregistered test: in the last four transfers the trailing foot's minimum residual load during unloading was 0.00, 0.01, 0.64 and then 1.05 % BW. The last one is above the 1 % release threshold.
- **L1 diverges within the first transfer after step 1.**

## 5. Failure diagnoses (first blocker) and A / B / C

Read-only timelines (`analysis/fail_timeline_*.txt`, from `scripts/fail_timeline.mjs`):
- they are regenerated with the unmodified harness and accepted only on identical per-second and end hashes (6/6 and 12/12);
- they time-resolve saturation and hard-limit margins at 1/60 s, which the per-step records only aggregate.

### L1, 0.4 m/s, step 2

1. **Step 1.**
   - The nominal 0.38 m foothold was infeasible from the predicted touchdown pelvis (bounded IK), so it was pulled back to 0.35 m.
   - The foot contacted at 83 % of T_SS, 37.7 mm short, giving a step of 0.313 m at touchdown.
   - The landing knee was 0.69° from its hard limit and clearance was 2.25 mm. Both are reach symptoms.
2. **Transfer (from the touchdown at 4.567 s).**
   - The landed foot reached SUPPORT only after 0.229 s (acceptance debounce + ramp): 77 % of T_d = 0.298 s.
   - Of the 161 mm the Hermite plan asked the DCM to travel (from 125 mm behind the new stance centroid to 36 mm ahead), it covered ≈ 71 mm. DCM error peaked at 95 mm.
   - At the plan's end the DCM was ≈ 54 mm **behind** and ≈ 57 mm **inside** the left stance centroid (planned: 36 mm ahead, 15 mm inside).
3. **Unloading (from 4.88 s).**
   - CF-4's pin holds the commanded CoP on the stance centroid (ξ_ref = ξ, ξ̇_ref = ω(ξ − c)). It has no DCM feedback, so a DCM behind and inside the centroid diverges backward and inward.
   - Forward COM fell from 0.23 m/s to 0 by 5.13 s and to −0.53 m/s at the failure. Lateral COM reached +1.2 m/s.
4. **No swing.**
   - The trailing right foot was lifted off the ground flat during UNLOADING: 1.1 mm clearance at 4.90 s, 8.6 mm by 5.15 s, tilt ≤ 2.2°.
   - The cause was reach: 0.355 m foot separation with the pelvis moving forward.
   - The lifecycle went UNLOADING → LIFTOFF → AIRBORNE without TOUCHING, so CF-6's swing trigger (TOUCHING = measured release) never fired.
   - The foot later dropped back (TOUCHDOWN at 5.38 s, 0.14 – 0.36 BW) as an unaccepted contact.
5. **Failure.** The left stance foot slid 20.3 mm at 5.871 s: G2 "relocated".

**Saturation and limits:**
- Brief bursts only: 10 – 13 axis-ticks at the impact (4.58 – 4.62 s) and 13 at the unload switch (4.88 s).
- **Essentially zero from 4.90 to 5.65 s**, while the divergence developed (5 axis-ticks at 5.07 s, 2 at 5.40 s).
- Hard-limit margins stayed above 5° from 4.77 s until 5.78 s.
- The ankle_R excursion to −1.60° is at the failure instant, with the DCM 0.42 m behind and 0.81 m lateral.

### Bracket 0.2 m/s, step 9

1. **Every transfer from step 2 on ended the same way.**
   - The DCM was 7 – 12 mm behind the stance centroid (planned 18 mm ahead) and 26 – 34 mm inside (planned 15).
   - Transfer DCM error was 29 – 36 mm; touchdown → SUPPORT took 0.204 – 0.254 s of T_d = 0.298 s.
2. **Steps 2 – 8 kept walking anyway.**
   - The trailing foot dropped below 1 % BW and was released 0.117 – 0.142 s after the plan's end.
   - The swing started, and the ankle-first single support (VRP up to 63 mm behind the centroid, never clamped) drove the DCM forward again.
3. **Step 9.**
   - The trailing left foot showed emergent heel rise (tilt 5.42°), but its toe pieces kept **1.05 – 14 % BW**, above the lifecycle's 1 % release threshold. The lifecycle state stayed SUPPORT.
   - There was no release and no swing.
   - The pin let the DCM diverge inward toward the trailing foot (lateral COM −1.34 m/s) and backward (forward COM passed 0 at 11.57 s).
   - The left foot then took 0.14 – 0.46 BW as the body fell onto it. The right stance foot slid 21.2 mm at 12.350 s.

**Saturation and limits:**
- **Essentially zero saturation from 11.18 to 12.17 s** (2 axis-ticks at 11.67 s). After that, 4 – 8 per window as the fall develops.
- Hard margins stayed at or above 7.1° until 12.20 s.
- ankle_L went negative from 12.30 s (−1.1 to −1.5°), with the DCM 0.83 – 0.89 m lateral, 50 ms before the failure.

### First limiting mechanism and classification

The first limiting mechanism as speed rises is **the double-support handover**. Its components scale with the DCM travel each step needs (≈ 36 / 72 / 161 mm at 0.1 / 0.2 / 0.4 m/s):

| component | evidence | class |
|---|---|---|
| Fixed lifecycle acceptance consumes the transfer window | touchdown → SUPPORT 0.20 – 0.25 s of T_d 0.298 s, at every speed | **A** (§8: "a lifecycle whose fixed acceptance / release time" constrains the gait's double support) |
| DCM tracking lag on the transfer | 13 → 29 – 36 → 95 mm, i.e. 35 – 60 % of the required travel left undone | **B** (DCM tracking lag) |
| The post-transfer CoP pin has no DCM feedback | divergence starts exactly at the plan's end, with a DCM behind or inside the centroid; at 0.1 m/s the DCM ends 1 mm ahead, so the pin's drift is forward and harmless | **B** (CF-4 / CF-6 controller rule) |
| Swing start depends on the passive release (< 1 % BW, TOUCHING) | L1: flat liftoff by reach, no TOUCHING; 0.2: toe load 1.05 – 14 % BW, never released | **B** (CF-6 trigger rule), on top of **A** (no trailing-foot departure / toe-off initiation; flat-foot reach at the fixed posture height, decision (a)) |

**No C.** In each failure:
- saturation was essentially zero and margins were wide while the state diverged;
- energy closure was bounded;
- the stance foot slid only after the body was falling.

None of §8's C examples is present before the divergence.

**A design gap in my preregistration, stated plainly:**
- Your item 2 asked that the trailing foot be unloaded "rather than waiting for the old < 1 % residual-load release condition".
- Frozen M2 unloads deliberately (planned share → 0), but still starts the swing only at the unchanged lifecycle's measured release. I kept that to leave the lifecycle unchanged (§3).
- The 0.2 m/s run failed exactly there. That is a limitation of the CF-6 design (B), not of the body.

**Watch item (not a failure, not C).** From 0.1 to 0.2 m/s:
- saturation rises 6 – 7 → 37 – 93 axis-ticks per cycle (ankle inversion 4 – 5 → 7 – 28);
- Δτ0 rises 15 → 39 – 79 N·m;
- touchdown down-speed rises 36 → 51 – 81 mm/s;
- clearance falls 7.1 → 5.2 mm;
- touchdown rebounds reach 108 ms.

All of these are bounded over 7 steps, but they climb steeply with speed.

## 6. Human-reference comparison (descriptive only, never tuned toward)

The pack's lowest tabulated speed is 0.4 m/s, and V2 sustained only 0.1 m/s. **At 0.1 and 0.2 m/s there is no human reference in the pack.** The 0.4 m/s values are the nearest evidence point, quoted with the pack's labels: S = Smith & Lemaire 2018 / Smith 2019; M = measured; D = derived. Cohort means ± 1 SD are descriptive.

| quantity | human at 0.4 m/s (pack) | V2 L1 plan | V2 at 0.2 m/s (8 steps, failed) | V2 at 0.1 m/s (sustained) |
|---|---|---|---|---|
| speed | 0.4 m/s | 0.4 | 0.2045 (51 % of L1) | 0.1008 (25 %) |
| step length | 0.38 ± 0.04 m (S M) | 0.38 | 0.175 m (46 %) | 0.092 m (24 %) |
| cadence | 64.8 ± 7.2 steps/min (S D) | 63.2 | 67.3 | 65.8 (inside the ± 1 SD band; held by the bracketing design) |
| combined DS | 43.2 % (S D) | 43.2 | 38.4 % | 30.6 % |
| single support | 0.55 ± 0.07 s (S M) | 0.540 | 0.549 s | 0.633 s (above + 1 SD) |
| clearance (plausibility only; definitions differ) | MTC: Winter 12.9 mm; Schulz slow 8.5 ± 5.0 mm | — | 5.2 – 5.4 mm | 7.1 mm |
| Hof v / √(gL), L = hip height 0.936 m | 0.132 | 0.132 | 0.067 | 0.033 |

**Reading:**
- V2's sustained walk has a human-like slow cadence with a quarter-length step.
- Its speed is a quarter of the slowest human reference. Its double support is shorter than the human 0.4 m/s value, and its single support longer.
- None of L1 – L5 was reached.

## 7. V3

**Nothing in CF-6 is evidence for V3.**
- Both failures are in the gait layer (A + B).
- At 0.1 m/s the body walks 60 steps with no accumulation, 6 – 7 saturated axis-ticks per cycle, a 9° hard margin and a 0.07 J per-step energy residual.

**This weakens the V3 case, but only modestly.** The body has not yet been exercised at a human walking speed: the gait layer fails before the body is tested there. The steep rise in saturation from 0.1 to 0.2 m/s (§5) is the thing to watch if a later experiment gets past the handover.

## 8. Harness and analysis notes

- **Regression (§10).**
  - `--cf=0..5` was re-executed with the CF-6 harness after its last edit.
  - 106 / 106 end hashes matched the committed evidence of the probe and CF-1 … CF-5.
  - The CF-3 / CF-4 / CF-5 records matched field for field (18 / 29 / 11), with wall time and decision-log ms stripped. See `analysis/regression_cf0-5.txt`.
- **Timing segmentation.**
  - The first segmentation in `cf6_analysis.py` (per-foot 20 N intervals, gaps < 50 ms merged) gives valid strides at 0.1 m/s.
  - At 0.2 m/s, touchdown rebounds of up to 108 ms split strides into 0.125 s pseudo-strides (stance 52.6 %, single support 0.305 s: invalid).
  - The primary segmentation is now event-anchored, so a rebound cannot split a stride:
    - each step starts at the swing foot's first 20 N onset after its measured liftoff;
    - its double support ends at the trailing foot's last 20 N release before that foot's measured liftoff.
  - It reproduces the 0.1 m/s values exactly (30.6 %, 65.3 / 34.7 %, 0.633 s). Both are reported in `analysis/cf6_analysis.*`.
  - This changes stride segmentation only. No criterion, threshold or reference changed.
- **Earlier analysis fix (before results).** The fz20 log is read from the run block, and contact flicker is merged with the lifecycle's own 50 ms bounce debounce.

## 9. Visual evidence

Authoritative replays by verified regeneration:
- the unmodified harness is re-executed with a passive state recorder;
- each replay is accepted only on identical per-second and end hashes (0.1 m/s: 58 / 58, end 01410720; 0.2 m/s: end 3a76175c);
- `../../../../sandbox/visual/physchar2/tools/cf5_pose_record.mjs`, generalised to CF-6, wrote `replay/*.json.gz`.

They play in the CF-5 replay page with the same camera and playback controls. Serve the worktree root first: `python3 -m http.server 8172`.

- V2-REF, fastest clean 20+ step walk (0.10 m/s, 60 steps): `http://localhost:8172/sandbox/visual/physchar2/viewer/cf5_replay.html?run=cf6_B0.1_V2-REF_s60`
- V2-REF, 0.2 m/s attempt (8 steps, failure at step 9): `…/cf5_replay.html?run=cf6_B0.2_V2-REF_s20`
- CF-5 reference (unchanged): `…/cf5_replay.html?run=V2-REF_s20`

Only V2-REF was run, so it is both "V2-REF" and "the fastest clean 20+ step walk".

## 10. Smallest next experiment (not begun)

- **Faster walking:** blocked. The handover fails at 0.2 m/s.
- **Running:** not warranted.

**Options for your decision:**
1. **A one-mechanism CF-6 amendment** (recommended if you want the 0.4 m/s answer before returning).
   - Start the swing when the planned unload completes, with a commanded release instead of the passive < 1 % BW measured release. This is your original item 2.
   - Re-test bracket 0.2 m/s and then L1 on V2-REF under the unchanged frozen criteria.
   - It touches the lifecycle's release semantics, so it needs your decision.
   - If 0.2 m/s then passes, L1 would show whether the transfer's DCM lag (A acceptance timing + B tracking) is the next limit.
2. **Return to TD2C / E2.** CF-6 found no C, so on current evidence the V2-vs-V3 question does not call for V3.
3. **Cheap completeness runs under the frozen design**, also your decision:
   - the right-foot-first C;
   - the other three bodies at the 0.1 m/s bracket.

## Files

- `CF6_PREREGISTRATION.md` (frozen, 1e98e1d) and this file.
- `evidence/` — 8 run records: per-step data, the 60 Hz trace, per-second hashes, and the 20 N contact log.
- `replay/` — 2 verified full-body replays.
- `analysis/`:
  - `cf6_analysis.txt` / `.jsonl` (P1 – P4, timing, momentum, accumulation);
  - `determinism.txt`, `regression_cf0-5.txt`;
  - `fail_timeline_L1_V2-REF.txt`, `fail_timeline_B0.2_V2-REF.txt`.
- `scripts/`:
  - `run_cf6.sh` (reproduces every run);
  - `cf6_analysis.py`, `fail_timeline.mjs`;
  - `envelope.mjs`, `reach_limit.mjs`, `ladder_table.py` / `.json`.
- Harness: `sandbox/visual/physchar2/tools/loco_probe.mjs` (CF-6 code, gated).
- Replay tooling and page (presentation only):
  - `sandbox/visual/physchar2/tools/cf5_pose_record.mjs`;
  - `sandbox/visual/physchar2/viewer/cf5_replay.html`, `v2_cf5_replay.js`.
