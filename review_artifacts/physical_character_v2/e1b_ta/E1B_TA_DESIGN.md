# T-A: capture-timed abort put-down (configuration version PSTAR3)

**Authority:** user decision 2026-10-05 (`../sources/2026-10-05_user_decision_ta_capture_timed_putdown.md`).

**Evidence:**
- `../p15_capture/P15_EVIDENCE_COMPARISON.md`;
- `../p15_capture/P15_CAPTURE_ANALYSIS.md`;
- `../p15_capture/research/`.

**Status:** code at the commit that adds this file; option `abortCapture`, default off. With it off, the code is bit-identical:
- KV0 identical, suite 58 / 58, V1 guard OK;
- PSTAR2's official runs reproduce hash-identically (V2-REF none 23 / 23, P15 21 / 21, YAW 23 / 23).

**PSTAR3** = PSTAR2 (PSTAR + `footYaw` + `lcPutDown`) + `abortCapture: true`.

## 1. What T-A does, in the five contact notions

| notion | PSTAR2 | **PSTAR3 (T-A)** | evidence |
|---|---|---|---|
| commanding toward contact | BLF quintic to the anchor over the fixed 0.302 s bandwidth time | the **same BLF quintic to the same anchor** (in place; no step), over the **smoothest duration the capture model allows**; re-checked every tick and re-planned **only shorter**, from the current reference state | IHMC flamingo (straight down, in place); IHMC / Griffin speed-up (only increases); BLF re-plan from the reference |
| anticipating contact | none: acceptance intent arrives with the λ return, about 0.15 s after contact | the abort plan **wants** the landed foot loaded once in contact (an intent flag to the lifecycle). The λ / ξ_ref return still starts at the first contact (H9) | BLF planned-vs-estimated contact; IHMC flamingo plan re-initialisation. The naive λ-at-abort harms the heavy body (§4 of the analysis) |
| measured physical contact | lifecycle TOUCHDOWN from Jolt contact | **unchanged** | — |
| accepting load | LOAD_ACCEPT after the request reaches 5 % for 0.05 s, then a 0.1 s ramp; stance floor 10 % | LOAD_ACCEPT after **measured contact sustained for the existing 0.05 s `acceptDebounce`** (intent present); the ramp is the **longest the capture model allows** in [0.10, 0.225] s; **no quiet-standing floor** during the abort transition, restored continuously (min-jerk of the λ return) | IHMC: support on the measured switch, no floor; PyPnC: 0.225 s load ramp |
| declaring support | s ramp → SUPPORT | **unchanged** (continuous in s) | — |

**No support or load is credited before sustained measured contact.** Before LOAD_ACCEPT the landed foot's support weight s = 0 and its load share = 0. The validation checks this per tick (TA-1).

## 2. The online capture model (`ctrl/v2_capture.js`)

This is a port of the validated offline model (`../p15_capture/tools/p15_model.mjs`):
- **Port check:** identical predictions on identical inputs, 32 / 32 (`tools/port_check.mjs`).
- **Its own geometry from the measured state** predicts all 32 recorded diagnostic outcomes (32 / 32).

The model:
- **Axis:** the controller's lateral axis (from its heading), oriented toward the landed foot. The line through ξ along it is sliced with the stance and landed usable regions.
  - If it misses either region, in place cannot capture: verdict "step required".
  - Measured: slicing along the raw ξ − p direction was optimistic on one knife-edge run (31 / 32), so it was not used.
- **Dynamics:** ξ̇ = ω(ξ − p), Euler at the controller dt, horizon 2.5 s; falls if ξ passes the landed foot's outer edge by 5 cm (as the validated model).
- **CoP:**
  - before acceptance, at most the stance region's edge;
  - after acceptance, the landed region grows from its centroid with s = smoothstep((t − t_acc)/T_r);
  - landed share ≤ min(s, 1 − floor), with floor = `minShare`·mj(u_return), the T-A floor rule.
- **Balance law:** p* = ξ + kξ(ξ − ξ_ref) − ξ̇_ref/ω, with ξ_ref the λ-weighted centroid line and the λ return min-jerk over `abortDur` from the first contact.
- **Inputs:** the controller's previous-tick state (ξ, ω, heading, usable regions), i.e. the measured physical state.
- **Arithmetic only**, so deterministic and browser = Node.

## 3. Parameters (fixed here; preregistered in `E1B_TA_PREREG.md`)

| parameter | value | basis |
|---|---|---|
| descent maximum | 0.302 s | servo bandwidth rule (unchanged, `E1B_FIX_DESIGN.md` §2.2) |
| descent minimum `TputMin` | **0.20 s** | Khadiv et al. 2020: minimum step duration (T ∈ [0.2, 0.6] s) |
| ramp minimum `TrMin` | **0.10 s** | the lifecycle's validated `accept` |
| ramp maximum `TrMax` | **0.225 s** | PyPnC Atlas contact-transition ramp α·T_ds = 0.5 × 0.45 s |
| timing safety margin | **0.04 s** | the largest LOAD_ACCEPT timing discrepancy of the validated model |
| split rule | **equal fraction:** T_put = clamp(k·0.302, 0.20, 0.302), T_r = clamp(k·0.225, 0.10, 0.225), largest k on a 0.01 grid from 1.00 down to max(0.20/0.302, 0.10/0.225) | one scale factor, so neither duration is favoured |
| model constants | kξ, `minShare`, `acceptDebounce`, `abortDur`, dt from the controller / lifecycle / supervisor; horizon 2.5 s; fall test 5 cm | as validated |

## 4. Algorithm (deterministic)

1. **Abort tick (airborne foot with a swing target):**
   - Plan the descent: the largest k such that the model, with touchdown at T_put(k) + margin and acceptance at touchdown + `acceptDebounce`, ramp T_r(k), predicts recovery → verdict **"in place"**.
   - If none: verdict **"step required"**; execute T_put = 0.20 s, T_r = 0.10 s (best-effort in place, never presented as an in-place success).
2. **Each tick before contact:**
   - Re-check the current plan from the current measured state (remaining time + margin).
   - If no longer predicted to recover, search k downward from the current k for the first feasible **strictly shorter** remaining descent, and re-plan the BLF quintic from the current reference state (C2).
   - If none, verdict → "step required" (late).
   - Durations never lengthen.
3. **Each tick after measured contact, before LOAD_ACCEPT:**
   - The ramp is the **longest** T_r on a 0.005 s grid in [0.225, 0.10] such that the model, with acceptance at the remaining debounce + margin, predicts recovery.
   - If none: T_r = 0.10, verdict → "step required" (late).
   - **Frozen at the LOAD_ACCEPT entry.**
4. **During the abort transition** (abort → λ return complete):
   - the lifecycle receives the intent (landed foot wanted) and that foot's ramp duration;
   - the allocation's quiet-standing floor is scaled 0 (before contact) → mj(u_return) → 1 (unchanged at the end).
5. **Hand-back, the λ return, the yaw path and everything else:** as PSTAR2.

## 5. What T-A does not do

- No recovery step: P15 keeps its foothold.
- No contact or support before Jolt reports it (no timeout contact).
- No change to the lifecycle's constants, the passive ankle tissue, `minShare` outside the abort transition, or the yaw path.
- No one-tick drop.
- **Scope:** lateral (between-feet) capture. AP divergence beyond the "line misses a foot" check is not modelled, and the P15 cases are lateral.

## 6. Declared smoke check (before the preregistration was frozen)

PSTAR3, V2-REF L, **10 mm** lift (not the 20 mm protocol; in no set), P15. Purpose: the mechanisms engage.

- Verdict "in place".
- k 1 → 0.86 over 14 speed-up re-plans (the push was still acting at the abort), T_put 0.26 s; T_r 0.225 s.
- Contact +0.246 s, LOAD_ACCEPT +0.296 s (exactly one debounce).
- λ return complete +0.85 s.
- Largest applied Δτ after the abort 4.77 N·m. Recovered.
- T-A checks TA-1 / 2 / 4 pass.

**Two tool defects found by the smoke run, fixed before freezing (no parameter changed):**
1. The TA-1 debounce window was one tick early. It now uses the ticks the lifecycle counts; the per-tick data show contact on all 12 ticks.
2. A mid-line comment swallowed a declaration in `e1bta_checks.mjs`.
