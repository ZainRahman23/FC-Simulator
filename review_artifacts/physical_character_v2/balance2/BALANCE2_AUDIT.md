# BALANCE-2 audit: the forward weakness, and the decision gate (§1–§10)

**Scope.**
- Everything here is diagnostic. It runs on the frozen BALANCE-1 B system: canonical M1b, `b1_ctrl.mjs`, `params/B1_B.json`, the PPR-3 standing entry. None of those files changes.
- BALANCE-1 (implementation, preregistration, push cases, results, videos, thresholds) is historical evidence (§1). Its freeze manifest `balance1/BALANCE1_FREEZE.json` still verifies.
- Labels: [M] measured in the simulator; [L] literature (with access codes in `research/BALANCE2_FORWARD_REFERENCE_LITERATURE.md`); [E] derived.

**Evidence files:** in `evidence/`, plus the literature audit in `research/`.

| File | Contents |
|---|---|
| `B2_GEOMETRY.json` | §3 standing geometry |
| `B2_PASSIVE_ENVELOPE.json` | §5 passive envelope |
| `B2_PHASES_FWD12_B.json` | §6 12 N·s phases |
| `B2_CONTROLS.json` | §7 controls |
| `B2_THRESHOLDS_B1B_ORIGINAL_STANCE.json` | §7/§8 thresholds in four directions |
| `B2_RIETDYK_FORWARD.json` | §8 the 20 N·s / 350 ms push |
| `B2_P4PRIME_ON_BALANCE1_POSTHOC.json` | §9 |
| `research/BALANCE2_FORWARD_REFERENCE_LITERATURE.md` | §2, primary-source audit |

---

## 2. The human forward reference (16–23 N·s)

**Verdict: not a valid target for this fixture** [L/E]. The band was assembled from four sources, none a 50 ms feet-in-place threshold.

| Source as used | What the primary source says | Effect on comparability |
|---|---|---|
| Emmens 2020, 0.11 mg forward, 200 ms | First-estimate threshold under "maintain balance in a natural way (with or without stepping)". Stepping was allowed, a counting task was added, trials with a lot of heel lift were discarded. Feet side by side, arms crossed, 10 young, 1.80 m, 75 kg [FT] | A **natural-stepping** threshold: about 0.3 of capacity (duration-corrected), not a feet-in-place limit |
| Robert 2018, "F50 = 2434/t_p + 7.69" | That curve is **one subject's** fit (subject 14). The group fit is 2379/t_p + 8.79. Tested durations were 150–3000 ms, so ≤ 100 ms is extrapolation. Waist pull under "try not to step"; 22 young [FT, HAL manuscript] | Wrong attribution (numerically small). The 50 ms value is model-dependent (±20 %) |
| Rietdyk 1999, "≤ 0.23 m/s forward" and "20 N·s / 350 ms" | The J Biomech paper is **medio-lateral only**. A-P data are in thesis Ch. 3: random manual pushes, pelvis 19.7 N·s over 367 ms on 10 men (86 kg, 1.82 m), mostly **recovered** [FT] | A sub-threshold mean, so a **lower bound** on capacity, not a threshold. Planes were mixed |
| Sturnieks (lateral/AP ratios) | Older adults (80 y) [FT] | Not a young-adult reference |

**Comparability item by item** (literature §3).
- **Body:** young adults, 1.74–1.82 m, 70–86 kg. No athletes, no footballers, no boots or studs (unknown footwear for Robert and Emmens).
- **Stance:** feet together or side by side, hip width at most; the fixture uses 0.42 m. Arms crossed (Emmens) or not reported; the fixture's arms are free.
- **Push:** pelvis or waist level (as in the fixture), 150–370 ms (the fixture: 50 ms), step-to-plateau or manual profiles.
- **Outcome rule:** step / no step (Robert, Emmens) or feet-in-place requested (Rietdyk). Toe rise was observed (Robert, CoPmax 0.153 m).
- **Normalisation:** thresholds were normalised for **mass only**. Robert reports % BW; the old band then scaled to 73.9 kg. Nothing was normalised for foot / support geometry or pulse duration.
- **Strategy:** mixed; toe rise at the limit (Robert).

**Matched expectation for this fixture** [E, literature §4].
- **Method:**
  - an inverted pendulum with a delayed jump of the COP to the front edge;
  - each study's threshold as a duration-corrected fraction of its own subjects' zero-delay limit;
  - the "try not to step" datasets give **f = 0.50–0.70** (Robert 150 ms 0.60; Crenshaw 0.50–0.58; Robert long pulls 0.69–0.70).
- **For a 50 ms pulse:** J = f · m · ω0 · d · 1.081 = **0.126–0.176 N·s per mm** of COM-to-front distance d (73.9 kg, ω0 3.15 s⁻¹).

## 3. The settled BALANCE-1 standing geometry (t = 2 s, the push onset) [M]

| Quantity | V2 (frozen B, settled) | Human, 1.76 m [L] |
|---|---|---|
| Height / mass | 1.76 m / 73.91 kg (73 + 0.91 kit) | — |
| Anatomical foot length | 269.3 mm = 0.153 H | 255–262 mm (0.145–0.149 H; SD ±15 mm): +0.5 SD |
| Heel → ankle joint centre | 59.2 mm (22 % FL) | ≈ 49–50 mm (19 %), derived |
| Ankle → 1st MTP | 140.3 mm | 137–140 mm |
| Ankle → toe tip | 210.0 mm (boot tip 220.0) | 207–212 mm |
| **COM ahead of the ankle** | **60.5 mm = 22.5 % FL** | 30–60 mm; COP ≈ 24 % FL ahead of the malleolus (Schieppati 1994, Fujimoto 2013) |
| COP ahead of the ankle | 62.0 mm | ≈ the COM in quiet stance |
| Physical (collider) support, per foot | Rigid 10-piece boot. The flat sole runs from the heel (−64.2 mm) to the **oblique MTP break** (MTP1 +140.3, MTP5 +110.4 mm from the ankle); a 12 mm toe spring ahead | Toes load-bearing; MTP joint flexes |
| **COM → loaded front edge** (MTP1 corner) | **80.3 mm** | 75–110 mm to the 1st MTP head |
| COM → load-weighted forefoot line (COP plateau in pushes) | ≈ 65 mm | — |
| COM → BALANCE-1 battery edge (includes points ≤ 5 mm above the turf) | 103.0 mm. Reached only after ≈ 10° boot pitch (≈ 35 mm heel lift, §5) | 100–105 mm static voluntary limit (0.40 FL) |
| COM → anatomical toe tip / boot tip | 149.5 / 159.5 mm | 145–185 mm (barefoot toe tip) |
| Human dynamic COP reach (toe rise) | — | ≈ 150 mm (Robert CoPmax, scaled) |
| COM → heel edge | 124.8 mm | ≈ 80–110 mm (derived) |
| Stance width (ankle centres) | 420.9 mm | hip width ≈ 17–25 cm in the reference studies |
| Foot yaw (toe-out) | 0.55° each | not reported in the threshold studies |
| Knee flexion / hip flexion (laboratory convention) | 14.2° / 8.3° | quiet stance knee ≈ 4.7° (Wang 2014); football ready stance: **no measured data** |
| Ankle dorsiflexion (shank tilt) | 9.8° | whole-body lean 0–2.5° (Leeuwis 2026) |
| Trunk (thorax) / pelvis tilt | 5.9° / 3.0° forward | — |
| Bilateral load | 50.3 / 49.7 % | even (no numeric source) |
| Ankle plantar- / dorsiflexor activation | 0.079–0.086 / 0.010 (floor). Active PF torque 13.5–14.7 N·m per ankle | soleus tonically active, TA silent (Schieppati 1994) |
| Passive / elastic ankle loading | passive B −8.0 N·m per ankle (plantarflexing); muscle elastic −0.3 to −0.4 N·m; total ankle torque 21–22 N·m per ankle | quiet ankle torque ≈ 50 N·m total (Robert's model) |

**Reading.**
- **Anatomy:** the foot is anatomically human. Its length is within individual variation, and the ankle → MTP1 and ankle → toe-tip distances match.
- **COM placement:** the COM sits where human quiet-stance COM sits relative to the foot (22.5 % vs ≈ 24 % FL ahead of the ankle).
- **Posture:** knee 14° and shank 10° are a semi-crouched athletic posture, not human quiet stance. It was inherited from the PVP runner's presentation pose (PPR-3 §2), not designed. It barely moves the COM relative to the foot, which is what matters (§5: a 2 cm COM height change moves the limit by 1 %).
- **Support representation** — the decisive difference. With the foot flat, V2's support ends at the MTP break, as a flat human foot's voluntary limit does (Słomka 2020: participants "were not able to cross" the 1st MTP line feet-flat). Humans then cross it "easily" with toe flexion or heel raise. Their forward limit of stability is 65 ± 5 % FL from the ankle (Fujimoto 2013), against V2's 52 %, and their dynamic COP reach is ≈ 150 mm (Robert). The rigid F0 boot has no toe-loading region: it can extend its support only by pitching the whole boot onto its toe spring. That needs ≈ 10° of pitch to reach 103 mm.

**Is 103 mm human-like?**
- As BALANCE-1 used it, 103 mm is the battery edge. It matches the human static voluntary limit (100–105 mm), but V2 reaches it only after a large heel lift.
- V2's flat-foot edge (80 mm) matches the human MTP-level / shod functional edge (75–110 / 80–90 mm).
- Neither is the toe-loaded dynamic reach that humans use near their limit (≈ 150 mm). The difference comes from the support representation, not the anatomy or the COM placement.

## 4. Anatomy vs stance vs support representation

| Layer | Finding | Action |
|---|---|---|
| **Anatomy** (segment lengths, foot length, joint positions) | Human (§3) | None. No evidence that it is wrong |
| **Stance / posture** | COM placement relative to the foot human-typical. Knee / ankle flexion athletic (inherited, not evidence-based), with negligible effect on the forward margin | **No stance correction** (§11 is not triggered: the stance is not what limits the forward margin). Reported as a presentation / realism note |
| **Support representation** (collider) | The rigid F0 boot has no toe loading. Flat-foot support ends at the oblique MTP break, and it extends only by whole-boot pitch on a 12 mm toe spring. Track A (9 Oct) closed the articulated toe F1 as an engine-solver limitation | **Identified, not changed.** A body-architecture decision for the owner |

## 5. Passive mechanical forward envelope (diagnostic) [M/E]

| Item | Value |
|---|---|
| Support polygon | Two rigid soles, each from the heel (−64.2 mm) to the oblique MTP break (+110.4 / +140.3 mm from the ankle), 420.9 mm apart. The rocker ahead rises 4 mm by +163 mm, 8 mm by +184 mm, 12 mm at the tip (+220 mm) |
| Static tipping boundary | COM 80.3 mm forward (5.1° lean about the ankle) to the loaded edge; 103 mm to the battery edge |
| Zero-delay point-mass limit | **18.8 N·s** at the loaded edge; 24.1 N·s at the battery edge; 35.0 N·s at the anatomical toe tip |
| Rigid "statue" tipping about the loaded edge, by push height | 20.6 N·s at the pelvis COM (0.97 m); 20.4 at the body COM (0.98 m); 17.0 at the abdomen; 14.3 at the thorax; 13.8 at the shoulder |
| Intrinsic-only body (tonic excitation frozen, no feedback) | **No standing equilibrium.** Unpushed, it drifts forward and crosses the loaded edge at ≈ 2.3 s. Intrinsic stiffness < gravitational (as PPR-3) |
| Sensitivity: COM placement | −20 / −10 / +10 / +20 mm → 23.5 / 21.1 / 16.4 / 14.1 N·s (the dominant lever) |
| Sensitivity: posture / knee flexion via COM height | ±2–4 cm → ±1–2 % |
| Sensitivity: foot toe-out | 0 / 5 / 10 / 15 / 20° → 18.8 / 19.8 / 20.5 / 21.0 / 21.2 N·s (the MTP1 corner moves forward) |
| Sensitivity: application height | Point mass: none. Rigid body: ∝ COM height / push height (pelvis ≈ COM: 1.0; shoulder: 0.68) |

**Why ≈ 14.4 N·s.** BALANCE-1's threshold is 0.77 of the loaded-edge limit (18.8) and 0.60 of the battery-edge limit (24.1). At the battery edge that is inside the human "try not to step" band (0.54–0.76 raw for 50 ms). The absolute number is small because d is small. V2's d is small because it has no toe loading, not because of its anatomy or its COM placement.

## 6. The 12 N·s forward case, decomposed [M] (`B2_PHASES_FWD12_B.json`)

| Phase | Time | What happens |
|---|---|---|
| 1 Passive | 0–29 ms | Pelvis accelerated; COM to 0.17 m/s. The trunk lags (thorax −3.3° at 100 ms). Intrinsic ankle stiffness moves the COP from 62 to 80 mm |
| 2 First delayed neural | Commands from 29 ms (head / orientation-rate channels). Neural force: lumbar 54 ms, hip 100 ms, ankle 121 ms | The COM channel (ankle, 100 ms; hip, 75 ms) starts the restoring force; plantarflexor activation 0.087 → 0.20 by 150 ms |
| 3 Peak correction | Heel unloaded 154 ms; COP at the forefoot 208 ms; ankle torque change plateaus at **≈ −50 N·m from 0.25 s** | COP reaches the forefoot line (≈ 125 mm from the ankle). The ankle can transmit no more. **Plantarflexor activation only 0.25–0.30**: 70 % muscle reserve unused |
| 4 Forward hold | **0.28–2.67 s (2.39 s)** | Heels lifted up to 16 mm, boots pitched up to 6.4°. COP pinned at the forefoot (mean 127 mm), COM just behind it (mean 116 mm). Ground shear ≈ 0, so no net restoring force. The controller's commanded COM force (60–78 N, P-dominated, integral growing to 16 N) cannot be delivered: the COP has no room left. Hip / trunk contribute ±15 N·m (static-Jacobian pattern, no hip strategy) |
| 5 Reversal | COM velocity reverses 1.51 s; heels re-land 2.67 s | The COM falls slowly backward off the forefoot pivot (COM slightly behind the COP). **With the heels up nothing can brake it**: the COP cannot move behind the forefoot until the heels touch. At re-landing the COM moves backward at 0.13 m/s, and the controller still commands net backward force (+8.6 N = delayed P +29, integral +16, D −37) |
| 6 Backward overshoot | Peak −48.7 mm at 3.42 s (**70 % of the forward peak**) | Heels down; dorsiflexors (activation 0.52) and the hips (+18 N·m) brake. The integral (+14.6 N) still opposes the return |
| 7 Settling | Not within 4 s (−28.7 mm at 4 s) | The tail is the recovery from the overshoot, slowed by the integral |

**Diagnosis** (each candidate cause in the brief):

| Candidate cause | Verdict |
|---|---|
| Insufficient correction | **No.** The ankle torque change is COP-limited, not muscle-limited |
| Correction too late | **No.** Latencies are human (first neural force 54–121 ms) |
| Muscle-force timing | **No.** Same reason |
| Insufficient restoring stiffness near the support limit | **Yes.** Geometric (G): with the COP at the forefoot edge, the restoring acceleration ω²(x_COM − x_COP) ≈ 0 |
| Excessive integral / long-duration action | **Yes, secondary (C).** The integral winds up while the command cannot be delivered (saturation without anti-windup), then drives the backward overshoot and slows the return |
| Poor whole-body coordination | **Yes, secondary (C).** No transition to a hip strategy when the ankle strategy saturates (Horak & Nashner 1986; Kuo & Zajac 1993). The COM map always uses the static Jacobian |
| Bad state estimation | **Partly.** The COM channel's 100 ms delay keeps the proportional drive positive while the COM is already returning; B has no AP prediction |

## 7. Forward vs backward / lateral at matched normalised difficulty [M] (`B2_CONTROLS.json`)

Difficulty = J / the zero-delay limit at that direction's **loaded** edge (forward 18.8, backward 29.2, left 62.1 N·s).

| Push | Difficulty | Outcome | COM peak | Overshoot | Support use | Foot lift |
|---|---|---|---|---|---|---|
| fwd 12 (BALANCE-1 moderate) | **0.64** | stands, not settled | 69 mm @ 1.51 s | 0.70 | COP at the edge 0.33 s | heels up 2.39 s |
| back 8.5 (BALANCE-1 moderate) | 0.29 | recovered 1.85 s | 26 mm | 0.54 | 0.60 | none |
| left 15 (BALANCE-1 moderate) | 0.24 | recovered 2.50 s | 48 mm | 0.02 | 0.45 | none |
| fwd 5.47 (= back-moderate difficulty) | 0.29 | recovered 0.92 s | 19 mm | 0.27 | 0.50 | none |
| fwd 4.53 (= lateral-moderate difficulty) | 0.24 | recovered 0.88 s | 15 mm | 0.29 | 0.42 | none |
| back 18.64 (= fwd-moderate difficulty) | 0.64 | **falls** | — | — | edge 0.80 s | toes up |
| left 39.71 (= fwd-moderate difficulty) | 0.64 | **falls** | — | — | — | foot unloads |

**No-step thresholds, frozen protocol** (`B2_THRESHOLDS_B1B_ORIGINAL_STANCE.json`):

| Direction | Threshold | Fraction of loaded-edge limit | Human band |
|---|---|---|---|
| Forward | 14.36 N·s | 0.77 | (BALANCE-1 band 16–23) |
| Backward | 18.19 N·s | 0.62 | (BALANCE-1 band 11–16) |
| Left | 25.88 N·s | 0.42 | — |
| Right | 27.34 N·s | 0.45 | — |

**What backward and lateral do that forward does not: nothing different on the control side.**
- At equal normalised difficulty, forward behaves like or better than the others. Backward and lateral fall at the difficulty the forward moderate push survives.
- Each direction's moderate push gives the same ankle / knee / hip / spine moment shares (0.43–0.48 / 0.21–0.25 / 0.14 / 0.16–0.18 sagittal; hips 0.88 in ML). Latencies are the same.
- **The difference is the push size relative to the support.** Mass-scaled human magnitudes put the forward moderate push at 0.64 of its support limit, against 0.29 backward and 0.24 lateral. The forward support margin is 80 mm, against 125 mm backward and 261–266 mm laterally.
- **Inverted direction ratio.** V2's backward / forward threshold ratio is 1.27, against 0.67–0.91 in humans. This is a support signature, since humans have the toes forward.

**One defect is general, not forward-specific: AP overshoot.** It is 0.27–0.29 (forward, 0.24–0.29 difficulty) and 0.54 (backward moderate), against 0.12–0.14 in humans (Rietdyk thesis, 0.7–0.8 cm on 5.6–6.4 cm; Zelei 2021 ankle releases overshoot-free). ML is 0.02.

## 8. The 20 N·s forward ("Rietdyk-form") fall [M/E] (`B2_RIETDYK_FORWARD.json`)

**Observed.**
- **At 20 N·s over 350 ms:** heels up from 0.33 s, COP onto the boot tip, COM beyond the battery edge at 0.72 s (fall by the frozen rule).
- **Observed recoverable impulse for this pulse form:** **16.3 N·s** (bracket 16.17–16.41). For the 50 ms pulse it is 14.36.

**The reference.**
- Rietdyk's A-P pelvis pushes averaged 19.7 N·s over 367 ms on 86 kg / 1.82 m men, and were mostly recovered. That makes them a lower bound, not a threshold.
- Matching by mass alone gives 16.9 N·s at 73.9 kg (Δv 0.229 m/s).
- Matching by the duration-corrected fraction (lower bound 0.22–0.30) at V2's geometry gives **9.0–12.2 N·s** (battery edge d = 103 mm, rectangular 367 ms factor 1.69).

**Expected recoverable impulse for V2 with this pulse form** [E].
- f = 0.50–0.70, × m·ω0·d, × the 350 ms factor 1.65.
- **19.9–27.8 N·s** at d = 103 mm (battery edge); **15.5–21.6 N·s** at d = 80 mm (flat-foot loaded edge); **12.5–17.5 N·s** at d ≈ 65 mm (the load-weighted forefoot line the COP actually plateaus at).
- The observed 16.3 N·s sits inside the flat-foot bands and below the battery-edge band.

**Verdict.**
- A 20 N·s / 350 ms forward fall is **not abnormal for a body whose usable forward support is the flat-foot MTP line**. It would be abnormal for a body with the battery edge (or human toe support) available at the same delay.
- The uncertainty is dominated by which edge corresponds to the humans' CoPmax: ±35 % across the three d values, plus ±20 % from the model.
- One controller-relevant feature: V2's tolerance rises only ×1.14 from 50 to 350 ms. The LIP model gives ×1.53, and Robert's humans rise faster than the model. **V2 does not use a sustained push's extra time.** The COP is already pinned at the forefoot by 0.30 s, and the hip strategy (which humans add near the limit) is absent.

## 9. P4

See `criteria/P4_CORRECTION.md` and `criteria/b2_p4prime.mjs`. P4 compared post-fall "peak excursions", which are undefined. P4′ tests outcome order, graded response below failure, graded failure (time to fall) and a graded pre-failure excursion. It is frozen before use on any successor. Applied post hoc to BALANCE-1 for information, it passes in all directions. The original P4 failure stands.

## 10. Decision gate: classification **X (mixed)**, with evidence

| Code | Share | Evidence |
|---|---|---|
| **Q — qualification / reference mismatch** | **Dominant for the recorded failures** | The forward band 16–23 N·s is invalid (§2): natural stepping, sub-threshold pushes, a single-subject extrapolated curve, 150–370 ms pulses, mass-only normalisation. At V2's geometry the matched 50 ms expectation is 13–18 N·s (d = 103 mm); V2's 14.4 lies inside. The forward "moderate" push sits at 0.64 of the support limit, against 0.29 / 0.24 for backward / lateral (§7). The "Rietdyk-form" test used a sub-threshold, wrongly sourced magnitude (§8). P4 was undefined for two falls (§9) |
| **G — support representation** (not anatomy, not stance) | **Dominant for absolute forward capacity** | Anatomy and COM placement are human (§3). The rigid F0 boot has no toe loading: flat-foot support ends at the MTP break (80 mm; the COP plateaus ≈ 65 mm ahead of the COM), against the human toe-loaded limit (65 % FL from the ankle, dynamic reach ≈ 150 mm). The backward / forward threshold ratio is inverted (1.27 vs 0.67–0.91) |
| **C — controller strategy** | **Secondary, real** | Near the forward limit: saturation without anti-windup (integral grows while the COP is pinned), no ankle → hip transition, a 2.39 s forefoot perch, an unbraked descent off the forefoot, 70 % overshoot. Sustained pushes are not exploited (×1.14 vs ×1.53). General AP overshoot is 0.27–0.54 against 0.12–0.14 in humans |
| **M — muscle / body mechanics** | **Not limiting** | Plantarflexor activation ≤ 0.30 in the hold; latencies and force development are human (BALANCE-1 P6 / P7) |

**What follows.**
- **§11 (stance): not triggered.** The stance does not limit the forward margin; its COM placement is human-typical.
- **Support representation: not changed.** Changing the boot is a canonical body change. The forward support's realism is put to the owner as a body / support-representation decision.
- **§12 (criterion): triggered.** A matched forward and backward battery, derived from the evidence and preregistered before any candidate runs on it. Backward is included because its old band rests on the same natural-stepping source (Emmens); this **raises** the backward bar. The unchanged BALANCE-1 B is evaluated on it first.
- **§13 (controller): triggered for the C defects.** Near-limit ankle → hip coordination with saturation-aware integral action, and AP overshoot. A successor must be preregistered after the matched battery is frozen, and must not be tuned on it.
