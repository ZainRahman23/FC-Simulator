# P2b: design-stage exploration after P2 failed (not frozen, not qualified, abandoned)

P2 failed its frozen qualification 10 / 14 (`evidence/PPR3_P2V_CANDIDATE.json`, commit f53b7917). That result is preserved and is not re-scored here.

Under the preregistration's decision rule 2, a labelled successor may be made only for an identified causal failure, with an independently justified change. This note records the one attempt, and why it stopped.

## 1. The diagnosed causes (from the P2 qualification evidence)

1. **P2's torque develops faster than human torque.**
   - In the design (`PPR3_P2_DESIGN.md` §5, iteration 9) the explicit EMG → torque filter was removed, because with it the loop was unstable. V2's own activation dynamics (15 / 50 ms first order) became the only EMG → force element.
   - The human references give an effective state → torque lag of ≈ 0.2 s at sway frequencies, and a lean-release torque rise of 372 ± 267 N·m/s (Robinovitch 2002; `research/POSTURAL_TIMING_CONTROL_LITERATURE.md`).
   - The forward threshold, 1.00 × the zero-delay limit (human ≈ 0.44–0.56), is the consequence: P2 can deliver ankle torque almost as fast as an ideal controller.
2. **There is no COM acceleration feedback.**
   - Welch & Ting 2008 / 2009 and Pasma 2017 both found it necessary for physiological delays. Without it, their fitted delays collapsed to non-physiological values.
   - Without that phase lead, the lateral mode, on its four-bar with a 100 ms delay, is underdamped:
     - small lateral pushes peak at 40 mm and are still 21 mm off after 4 s;
     - the moderate lateral push unloads the far foot at 0.40 s.

## 2. The change tried (literature values; no tuning)

| Variant | COM channel | EMG → torque filter | Source |
|---|---|---|---|
| C1 | P2 + K_A 0.13 s² | critically damped 2nd order, 15 rad/s | Pasma 2017 K_A. Filter in the 12–17 rad/s band (van der Kooij & Peterka 2011: 16.8 rad/s, ζ 0.99) |
| C2 | C1 + K_D 0.87 s | as C1 | Pasma 2017 K_D |
| C3 | K_D 0.87 s, K_A 0.13 s² | 1.48 Hz (9.3 rad/s), ζ 1.3 | Pasma 2017 as fitted |

- ML gains are × 1.70, the measured ratio of the four-bar's gravitational stiffness to mg/h, exactly as in P2.
- Everything else is the frozen P2 candidate, without motor noise.

**Code:**
- `explore/ppr3_ctrl_p2b.mjs` = the frozen `scripts/ppr3_ctrl.mjs` + `explore/P2B_ctrl_additions.patch`:
  - an optional K_A term on the delayed COM velocity's six-step difference;
  - a filter damping-ratio option;
  - ring retention + 8 samples, so the six-step difference exists.
- For the frozen P2 candidate the additions are inert. The frozen `scripts/ppr3_ctrl.mjs` is unchanged and still matches `PPR3_P2_FREEZE.json`.
- The 12 review-clip runs were regenerated on the frozen file and reproduce bit for bit.

## 3. Result: all three are unstable before any push

`explore/p2b_impulse.mjs` → `explore/P2B_IMPULSE_RESULTS.json` (twin worlds, 2 N·s forward and 4 N·s lateral, noise-free; `undisturbed` = the unpushed twin's own drift from the entry).

**Undisturbed and noise-free, every variant diverges from the entry by itself** (a growing oscillation):

| Variant | COM shift from entry at 4 / 6 / 8 s |
|---|---|
| C1 | 3.0 / 11.4 / 71.7 mm |
| C2 | 23.4 / 102.3 / 108.5 mm |
| C3 | 1.0 / 2.7 / 23.5 mm |

Twin-world ΔCOM after the pushes grows to 39–429 mm by 6 s.

**Pushes from the qualification battery were not run** on any P2b variant.

## 4. Why this stops instead of continuing to iterate

The three variants span the literature's own range for this controller class (P2's PID + K_A, through fully Pasma-fitted). Each restores a physiologically slow torque path, and each is unstable on S2 before any disturbance.

So the controller class itself is the limit:
- independent per-channel PID loops, summed through a static Jacobian transpose, with physiological delays;
- on a 3-D multi-segment body standing on a frontal-plane four-bar.

**With physiologically slow torque it does not stabilise this body. With fast torque it stabilises but is superhuman forward and fragile laterally.**

Choosing between these is architectural:
- where muscle contraction (EMG → force) dynamics live, in the V2 body spec or in P2;
- and whether P2 becomes a model-based, multi-joint delayed controller, e.g. a state estimator / predictor with coordinated output, as in human models of multi-segment standing.

That is PPR-3 stop condition B. `PPR3_REPORT.md` §decision sets out the options.
