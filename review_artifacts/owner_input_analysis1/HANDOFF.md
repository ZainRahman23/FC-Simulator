# HANDOFF — OWNER INPUT ANALYSIS V1 (24 Oct 2026)

**State:**
- The analysis and the design are finished; **nothing is implemented**.
- No gameplay file changed.
- Committed locally on `prototype/left-stick-intent-v1`, not pushed (the owner's earlier instruction: no push unless a standing rule requires it).
- Stopped for the owner's review.

**Read first:** `OWNER_INPUT_ANALYSIS.md`, then `INTENT_RECOGNIZER_V1_DESIGN.md`. The owner's decisions are in §8 of the design.

## Where things are

| what | path |
|---|---|
| the owner's instruction (verbatim) | `sources/2026-10-24_user_instruction_owner_input_analysis.md` |
| the owner's dataset (21 real attempts) | `../left_stick_lab1/recordings/owner_2026-10-24_session1_21attempts.json` |
| the gesture description (pure; the page uses it) | `sandbox/visual/lsi1/lsr_gesture.js` |
| the canonical-gate probe (offline re-simulation) | `sandbox/visual/lsi1/tools/lsr_owner_probe.mjs` |
| the analysis → text and the page's JSON | `sandbox/visual/lsi1/tools/lsr_owner_analysis.mjs` → `evidence/owner_analysis.txt`, `data/owner_input_analysis.json` |
| the page | `sandbox/visual/lsi1_owner_analysis.html` + `sandbox/visual/lsi1/oa_page.js` |
| the page's and the lab's browser check | `sandbox/visual/lsi1/tools/oa_browser.cjs` → `evidence/oa_browser.txt` |

## Serve and open (LOCAL ONLY)

```sh
cd ~/"Downloads/FC Simulator worktrees/left-stick-intent-v1" && python3 -m http.server 8362 --bind 127.0.0.1
# TOUCHLINE — OWNER INPUT ANALYSIS V1
open http://127.0.0.1:8362/sandbox/visual/lsi1_owner_analysis.html
# the lab, with the pad away from the screen edge (for mouse recordings)
open "http://127.0.0.1:8362/sandbox/visual/lsi1_lab.html?pad=centre"
```

## Regenerate (from the worktree root)

```sh
D=review_artifacts/left_stick_lab1/recordings/owner_2026-10-24_session1_21attempts.json; E=review_artifacts/owner_input_analysis1
node sandbox/visual/lsi1/tools/lsr_verify.mjs $D > $E/evidence/owner_verify.txt
node sandbox/visual/lsi1/tools/lsr_owner_probe.mjs $D --out $E/evidence/owner_probe.json --step 4 > $E/evidence/owner_probe.txt      # ≈ 3 min
node sandbox/visual/lsi1/tools/lsr_owner_analysis.mjs $D --probe $E/evidence/owner_probe.json --tests review_artifacts/left_stick_lab1/evidence/lsr_recorder_tests.json --json $E/data/owner_input_analysis.json > $E/evidence/owner_analysis.txt
```

**A new owner session:**
- The lab keeps attempts in the browser (IndexedDB on 127.0.0.1:8362). Use ATTEMPTS → EXPORT, and put the file in `review_artifacts/left_stick_lab1/recordings/`.
- Run the three commands on it. `lsr_owner_analysis.mjs` accepts one dataset at a time; merge files first if needed.
- The page reads `?data=<path to an analysis JSON>`.

## The one change to the lab

LEFT-STICK INPUT LAB V1 has a pad placement option, and nothing else changed:
- **pad at left:** the default, unchanged.
- **pad at centre:** `?pad=centre` or the top-bar selector.

**Why:** with the pad 12 px from the window's left edge, the owner's mouse was pinned at the screen edge 1.38 stick radii from the centre in 14 of 20 gestures.

The placement is recorded with each attempt as `input.padPos`. The raw stream is relative to the pad's centre either way.

## Not done (by instruction)

The recognizer, gesture thresholds in code, input buffering, automatic Body Feint or Croqueta, ratings and defenders. No change to Body Feint, Croqueta LEG-WAVE V4, carry, gait, Agility, Technical Control, B4/B5, support, ball physics or the vocabulary.

## Next

1. The owner reviews the analysis and decides the five §8 points.
2. Record the comparisons in `OWNER_INPUT_ANALYSIS.md §11`, on the target device, with G marks.
3. Only then build Intent Recognizer V1, and replay every recording through it offline first.
