# G2b walker — review: inner loop first, Controller A (measured response) vs Controller B (SIMBICON-style)

**2026-10-01 night. G2b NOT achieved — not promoted. G2c–e not started.** Everything below is opt-in; every approved gate is bit-identical
(A / B / C1 / C2 for V1 and V1.1, C3 29/29, D 7/7, G1 26/26, G2a 10/10; the Option-1 and characterisation review cases unchanged).

- **Interactive:** `http://127.0.0.1:8171/sandbox/visual/physchar/index.html?suite=G2` → side panel **"G2b walker — Controller A vs B"**,
  buttons W1–W6 (the magenta ghost is the comparison run).
- **Figures:** `fig/W1_survival.png` … `fig/W7_saturation_ledger.png`. **Contact sheets:** `sheets/A_best_side.png`, `sheets/B_side.png`.
- **Trail:** `WALKER_LOG.md` (every experiment, including what did not work). **Data:** `eval/*.json`, `json/`.

## In plain English

1. **Where I stopped.** Controller A now walks **9–13 steps from every one of six starts** (mean 11, best single run 17 in the iterations), up
   from 2–3 for the old G2b controller. Controller B, given the same improvements, manages 5–7 (best of an 80-run gain search: 9). Neither
   walks indefinitely. I am stopping because the remaining failure is the same in every run and I have measured where it comes from.
2. **Sideways balance is now under control.** The sideways part of Controller A's step-to-step loop is stable (errors shrink by about half
   each step and change sign: eigenvalue −0.44). Pushed sideways by 6 N·s, it recovers.
3. **Forward speed is not.** The forward part creeps: for about six steps the body walks at the intended pace, then each step it is a little
   too fast, and the error grows (eigenvalue +1.25). To slow down, the next foot has to go further forward. But once a step needs to be
   longer than about **0.30 m**, the trailing leg is already straight when it has to swing, the boot's toe cannot clear the turf, and the step
   fails. Below the pace window the body stalls and cannot step backward. So forward speed has to stay inside a window about **9 cm** wide
   (in capture-point terms), while each step adds about 3.4 cm of unexplained forward scatter.
4. **What makes that window so narrow is mostly the body.** The trailing leg straightens because (a) the pelvis is carried almost at the
   straight-legged height of the bind pose, and the support layer deliberately allowed the legs to reach 99.5 % of full extension; and
   (b) the 36 cm rigid boot pivots on its very tip, 0.277 m ahead of the ankle. A human foot rolls over the toe joints about 0.15–0.18 m
   ahead of the ankle, so the heel lifts early and the leg never locks. Lifting this boot's heel under full body weight needs about
   212 N·m against a 150 N·m ankle.
   - **Diagnostic:** with a human-sized foot collider (11 cm wide, toe tip 0.20 m ahead), not adopted, swing failures fell from 50 % to
     18 %, and after long steps from 74 % to 14 %.
   - **Within the current body:** a higher early swing lift brought the real boot to 14 %, and a walking reach limit (96 %) gives the
     trailing knee some flexion. That widened the window but not enough.
5. **Double support is now predictable.** It was the main source of unpredictability the characterisation found. It now lasts
   0.175–0.217 s (p10–p90), was 0.225–0.304 s. Two causes were fixed: the planner restarted the transfer 50 ms late (its view is 50 ms old),
   and it waited for the heel rocker.
6. **The twist (yaw) is not solved.** The whole-body twisting momentum is about 4× a human's, and the pelvis turns ≈ 26° per step (human
   ≈ 8–12°). I found where it comes from (the feet's twisting torques while the stance hips steer the pelvis heading, not the push/brake couple)
   but deferred it until there is a steady walk to tune it on.
7. **Correction:** in the plant report I quoted a human bound of "< 0.03" for the twisting momentum that I had not verified. The verified
   reference is 0.014 ± 0.003 m/s (normalised range, level walking).

## The decisions I need from you

1. **The foot.** The evidence says the rigid 36 cm boot is the main thing narrowing the forward window. Options, in increasing order of change:
   - **(a) A collider that matches a real foot** (≈ 28–30 cm long, ≈ 10–11 cm wide), the visible boot mesh unchanged. Diagnostic effect
     measured above. This is a body change, so it is your call.
   - **(b) A toe segment** (a 15th body: an MTP hinge, toes a separate short box). This is the human mechanism (toe rocker, heel rise in
     terminal stance) and the one that lets a human take long steps. It is the change you said needs new evidence; this is that evidence.
   - **(c) Neither:** accept slower, shorter-stepped walking as the capability of this body, and I keep working the forward loop inside
     the narrow window (execution precision, speed regulation). Possible, but I would expect long walks to stay fragile.
2. **The walking pelvis height.** The support layer keeps the legs at up to 99.5 % extension (the standing design). For walking I added an
   opt-in 96 % reach limit. A lower walking pelvis is more human (bent-knee loading response) but makes the swing foot scuff more. Should the
   walking pelvis be planned lower as part of the gait (with the swing re-tuned), or stay as it is?
3. **Keep Controller A as the main path?** A beats B everywhere I measured. B is implemented as the smallest fair SIMBICON-style law, with an
   honest gain search.

## Technical

### 1. Inner loop (what changed, opt-in)

| change | option | effect (measured) |
|---|---|---|
| double-support plan evaluated ahead by the feedback delay | `walk.dsLead` | the landed foot is no longer unloaded on the hand-over tick |
| load (≥ 35 % BW), not the heel rocker, ends double support | `walk.dsFlat: false` | DS 0.175 / 0.188 / 0.217 s (was 0.225 / 0.233 / 0.304) |
| early DS end at 96 % trailing-leg extension | `walk.dsExtEnd` | C8 safety (small effect) |
| swing clearance from the actual foot pitch, through mid-swing only | `P.clrActual`, `P.clrActualUntil [0.5, 0.2]` | toe scuffs ↓; the full-swing version made the foot land +6.9 ± 10.3 cm long |
| walking reach limit in double support | `walk.reachExt 0.96` | trailing leg 0.94–0.97 at the step start (was 0.98–1.00), heel 4–5 cm up (was 1–3) |
| higher early swing lift | `P.swingLiftH 0.20` | swing failures 43 % → 14 % (closed-loop identification) |
| late foothold changes blended | `P.lateBlend` | (Option-1 mechanism, now used by the in-swing re-decision) |

Measured and **not adopted:** whole-sole CoP for the settling foot, no post-hand-over soften, double-support sideways tracking (longer DS,
more swing failures, worse walking), compliant pelvis yaw (worse yaw), forward ankle feedback against the LIPM reference (worse), a lower
walking pelvis (more scuffs), earlier swing dorsiflexion, longer/shorter toe pivot, earlier horizontal swing completion.

### 2. Controller A — measured-response foothold + timing (`pc_walker.js`)

- **State:** the sensor's capture point relative to the stance foot (forward, inward-mirrored) at the decision instant.
- **Inputs:** forward foothold, width, single-support duration.
- **Maps:** x(τ) → x′, fitted with T-interaction terms for τ = 0, 0.10, 0.15, 0.20, 0.25 s into the step (closed-loop identification:
  Controller A + seeded dither, 600 runs per inner-loop version, `tools/g2walk_ident.js`, `analysis/fit_maps.py`). Residuals 2.3–3.4 cm from
  0.10 s on.
- **Decision:** at the step start (foothold + timing), then re-decided through the swing from the latest state with the map of that
  instant, toward the same partial-convergence target x* + ρ(x − x*) (ρ 0.4), until 0.12 s before the planned touchdown.
- **Solve:** a small constrained least-norm problem in all three inputs together (forward and sideways are coupled).
- **Online refinement:** the maps' constant term only, bounded ±6 cm, γ 0.3, logged per step.
- **Start:** the first step from standing is the measured one that lands step 1 on the nominal state (residual 0.5 cm).

**Closed-loop step-to-step map** (from the walking itself, 47 step pairs): A_cl = [[+1.26, +0.39], [−0.04, −0.45]], **eigenvalues +1.25
(forward), −0.44 (sideways)**, residual 3.4 / 3.3 cm. Design target: 0.4 on both.

### 3. Controller B — SIMBICON-style (Yin, Loken & van de Panne 2007)

- **Law:** foothold relative to the COM = f0 + c_d·d + c_v·v per axis, with fixed single-support duration.
- **Re-evaluation:** continuously through the swing (SIMBICON servoes the swing hip continuously).
- **Shared with A:** the same inner loop, swing and landing.
- **Gain search:** 80-run grid per inner-loop version.
- **Result:** 5–7 steps per start (best 9). It fails by a forward runaway by step 3–4, plus a growing sideways alternation.

### 4. Comparison (six deterministic starts, 30 steps requested, fall-aware)

| | old G2b (Option 1) | Controller B | Controller A |
|---|---|---|---|
| upright steps (mean / min / max) | 2.5 / 2 / 3 | 6.0 / 5 / 7 | **11.2 / 9 / 13** |
| per start (R@.50 .55 .60, L@.50 .55 .60) | 2 2 2 3 3 3 | 7 6 6 6 6 5 | 10 9 13 12 11 12 |
| speed | 0.10–0.16 m/s | 0.44–0.66 m/s | 0.45–0.69 m/s (nominal 0.4 — the forward drift) |
| step-to-step stability | amplifying | runaway forward, sideways alternating | sideways stable (−0.44), forward +1.25 |
| perturbation (6 N·s sideways at step 4) | — | — | absorbed (11 vs 13 steps) |
| foothold execution (achieved − target) | — | — | forward +6 ± 5 cm, width +2 ± 3 cm |
| transverse WBAM range per stride | 0.041 m/s | 0.053 m/s | 0.060 m/s (human 0.014 ± 0.003) |
| pelvis yaw range per step (median) | 17° | 21° | 26° (human ≈ 8–12°) |
| external-impulse ledger residual (max) | 0.02 N·s | 0.03 N·s | 0.04 N·s — no hidden force |
| determinism | identical hashes on re-run | identical | identical |

### 5. The forward capability boundary (C8), measured

Swing failure vs the previous step length (closed-loop identification, 600 runs each, `fig/W4_c8_boundary.png`):

| previous step | real boot (v7) | + higher swing lift (v8) | DIAGNOSTIC human-sized foot (v7) |
|---|---|---|---|
| < 0.20 m | 35 % | 14 % | 25 % |
| 0.20–0.26 m | 18 % | 6 % | 6 % |
| 0.26–0.32 m | 43 % | 14 % | 8 % |
| ≥ 0.32 m | 74 % | 27 % | 14 % |

**Mechanism (traced):**
- The swing starts from a trailing leg at 97–100 % extension.
- The rigid boot pivots on its tip; the heel rises (2.6 → 9.9 cm) while the toe stays 0–1 cm off the turf.
- At ≈ 11 % of the swing the toe touches, the executor takes it as the touchdown, and the step collapses.

**Pass tests P1–P9:** not reached (P1 needs 30 steps from 6 starts; the best is 13). The P6 physical-integrity part holds (ledger ≤ 0.05 N·s,
no root force or velocity writes, deterministic, gates bit-identical).

## Sources

- Silverman, Neptune et al., "Whole-body angular momentum during stair ascent and descent" (Gait & Posture; Table 1, level walking).
- Herr & Popovic 2008, "Angular momentum in human walking", J Exp Biol 211 (normalisation by mass × speed × height).
- Yin, Loken & van de Panne 2007, SIMBICON.
- Hof 2008 (foot placement relative to the extrapolated centre of mass); Wang & Srinivasan 2014 (mid-swing state predicts foot placement).
